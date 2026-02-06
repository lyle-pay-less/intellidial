import { NextRequest, NextResponse } from "next/server";
import {
  getProjectByAssistantId,
  listContacts,
  updateContact,
  incrementOrgUsage,
  createNotificationForOrg,
} from "@/lib/data/store";
import { mapStructuredOutputsToCapturedData } from "@/lib/vapi/client";

/** VAPI end-of-call-report webhook body shape (subset we use). */
type VapiEndOfCallPayload = {
  message?: {
    type?: string;
    endedReason?: string;
    call?: {
      id?: string;
      assistantId?: string;
      customer?: { number?: string };
      startedAt?: string;
      endedAt?: string;
    };
    artifact?: {
      transcript?: string;
      recording?: { url?: string };
      structuredOutputs?: Record<
        string,
        { name?: string; result?: Record<string, unknown> | null }
      >;
    };
  };
};

/** Normalize phone for matching (same logic as outbound call). */
function normalizePhone(raw: string): string {
  let s = raw.trim().replace(/\s/g, "");
  if (s.startsWith("0")) s = "+27" + s.slice(1);
  else if (!s.startsWith("+")) s = "+27" + s;
  return s;
}

/** Ended reasons that indicate a failed call (no answer, busy, etc.). */
const FAILED_END_REASONS = new Set([
  "no-answer",
  "busy",
  "failed",
  "error",
  "canceled",
  "rejected",
  "timeout",
  "no-answer-timeout",
]);

/**
 * POST /api/webhooks/vapi/call-ended
 * Public webhook: VAPI POSTs here when a call ends (end-of-call-report).
 * Resolve project by assistantId, contact by project + customer number; update contact status/callResult.
 * Idempotent: use lastVapiCallId on contact to avoid double-updating on retries.
 * Always return 200 so VAPI does not retry; log and swallow errors per checklist 6.5.
 * TODO: When VAPI supports webhook signing, verify request signature before processing.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as VapiEndOfCallPayload | null;
    if (!body?.message?.type || body.message.type !== "end-of-call-report") {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const call = body.message.call;
    const artifact = body.message.artifact;
    const endedReason = body.message.endedReason ?? "";

    if (!call?.id || !call.assistantId) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const project = await getProjectByAssistantId(call.assistantId);
    if (!project?.orgId) {
      console.warn("[Webhook] call-ended: no project for assistantId", call.assistantId);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const rawNumber = call.customer?.number;
    if (!rawNumber?.trim()) {
      return NextResponse.json({ received: true }, { status: 200 });
    }
    const phone = normalizePhone(rawNumber);

    const { contacts } = await listContacts(project.id, { limit: 5000 });
    const contact = contacts.find((c) => normalizePhone(c.phone) === phone);
    if (!contact) {
      console.warn("[Webhook] call-ended: no contact for project + phone", project.id, phone);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (contact.lastVapiCallId === call.id) {
      return NextResponse.json({ received: true, idempotent: true }, { status: 200 });
    }

    const startedAt = call.startedAt ? new Date(call.startedAt).getTime() : 0;
    const endedAt = call.endedAt ? new Date(call.endedAt).getTime() : 0;
    const durationSeconds =
      startedAt && endedAt && endedAt >= startedAt
        ? Math.round((endedAt - startedAt) / 1000)
        : 0;
    const attemptedAt = call.endedAt ?? call.startedAt ?? new Date().toISOString();
    const isFailed = FAILED_END_REASONS.has(endedReason.toLowerCase());

    const captureFieldKeys = (project.captureFields ?? []).map((f) => f.key).filter(Boolean);
    const capturedData = mapStructuredOutputsToCapturedData(
      artifact?.structuredOutputs,
      captureFieldKeys
    );
    const callResult = {
      durationSeconds: isFailed ? 0 : durationSeconds,
      transcript: artifact?.transcript ?? undefined,
      recordingUrl: artifact?.recording?.url ?? undefined,
      attemptedAt,
      ...(capturedData ? { capturedData } : {}),
      ...(isFailed ? { failureReason: endedReason || "Call ended" } : {}),
    };

    await updateContact(contact.id, {
      status: isFailed ? "failed" : "success",
      callResult,
      lastVapiCallId: call.id,
    });

    if (project.orgId) {
      const minutesDelta = (durationSeconds || 0) / 60;
      await incrementOrgUsage(project.orgId, 1, minutesDelta);

      // Create notifications
      if (project.orgId) {
        if (isFailed) {
          // Failed call notification
          await createNotificationForOrg(
            project.orgId,
            "call_failed",
            `Call failed: ${contact.name || contact.phone}`,
            `Call to ${contact.name || contact.phone} (${contact.phone}) failed. Reason: ${endedReason || "Unknown"}`,
            {
              projectId: project.id,
              projectName: project.name,
              contactId: contact.id,
              contactPhone: contact.phone,
              contactName: contact.name ?? undefined,
              callId: call.id,
              failureReason: endedReason || "Call ended",
              durationSeconds: 0,
            }
          );
        } else {
          // Successful call notification
          const missingFields: string[] = [];
          if (captureFieldKeys.length > 0 && capturedData) {
            for (const key of captureFieldKeys) {
              if (!capturedData[key] || capturedData[key] === null || capturedData[key] === "") {
                missingFields.push(key);
              }
            }
          }

          if (missingFields.length > 0) {
            // Data missing notification
            await createNotificationForOrg(
              project.orgId,
              "data_missing",
              `Missing data: ${contact.name || contact.phone}`,
              `Call to ${contact.name || contact.phone} completed, but missing data for: ${missingFields.join(", ")}`,
              {
                projectId: project.id,
                projectName: project.name,
                contactId: contact.id,
                contactPhone: contact.phone,
                contactName: contact.name ?? undefined,
                callId: call.id,
                durationSeconds,
                missingFields,
                capturedData,
                transcript: artifact?.transcript,
                recordingUrl: artifact?.recording?.url,
              }
            );
          } else {
            // Call completed notification
            await createNotificationForOrg(
              project.orgId,
              "call_completed",
              `Call completed: ${contact.name || contact.phone}`,
              `Successfully completed call to ${contact.name || contact.phone} (${contact.phone}). Duration: ${Math.round(durationSeconds / 60)}m ${durationSeconds % 60}s`,
              {
                projectId: project.id,
                projectName: project.name,
                contactId: contact.id,
                contactPhone: contact.phone,
                contactName: contact.name ?? undefined,
                callId: call.id,
                durationSeconds,
                capturedData,
                transcript: artifact?.transcript,
                recordingUrl: artifact?.recording?.url,
              }
            );
          }
        }
      }
    }
  } catch (e) {
    console.error("[Webhook] call-ended error:", e);
  }
  return NextResponse.json({ received: true }, { status: 200 });
}
