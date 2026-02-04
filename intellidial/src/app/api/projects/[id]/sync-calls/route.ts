import { NextRequest, NextResponse } from "next/server";
import {
  getProject,
  listContacts,
  updateContact,
  incrementOrgUsage,
} from "@/lib/data/store";
import { getOrgFromRequest } from "../../getOrgFromRequest";
import { getCall, mapStructuredOutputsToCapturedData } from "@/lib/vapi/client";

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
 * GET /api/projects/[id]/sync-calls
 * Poll VAPI for contacts with status "calling" and vapiCallId; fetch each call and update contact when ended.
 * Used when webhook is not reachable (e.g. local dev without ngrok). Returns { synced: number }.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getOrgFromRequest(_req);
  if (!org) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const project = await getProject(projectId, org.orgId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { contacts } = await listContacts(projectId, { limit: 5000 });
  const callingWithCallId = contacts.filter(
    (c) => c.status === "calling" && c.vapiCallId?.trim()
  );
  const callingNoCallId = contacts.filter(
    (c) => c.status === "calling" && !c.vapiCallId?.trim()
  );
  let synced = 0;

  // Unstick contacts that are "calling" but have no VAPI call ID (e.g. never saved or old bug)
  for (const contact of callingNoCallId) {
    await updateContact(contact.id, {
      status: "failed",
      callResult: {
        attemptedAt: contact.updatedAt ?? new Date().toISOString(),
        failureReason:
          "Result unavailable — the call may have completed; we couldn't retrieve transcript/recording (no call ID saved).",
      },
    });
    synced++;
  }

  const STALE_CALL_MS = 2 * 60 * 60 * 1000; // 2 hours

  for (const contact of callingWithCallId) {
    const callId = contact.vapiCallId!;
    const call = await getCall(callId);
    if (!call) {
      await updateContact(contact.id, {
        status: "failed",
        callResult: {
          attemptedAt: new Date().toISOString(),
          failureReason:
            "Result unavailable — the call may have completed; we couldn't retrieve transcript/recording (provider may have purged the call).",
        },
        vapiCallId: null,
      });
      synced++;
      continue;
    }

    const endedAt = call.endedAt ?? null;
    const startedAt = call.startedAt ? new Date(call.startedAt).getTime() : 0;
    const isEnded = call.status === "ended" || endedAt != null;
    const isStale = startedAt > 0 && Date.now() - startedAt > STALE_CALL_MS;

    if (!isEnded && !isStale) continue;

    if (!isEnded && isStale) {
      await updateContact(contact.id, {
        status: "failed",
        callResult: {
          attemptedAt: call.startedAt ?? new Date().toISOString(),
          failureReason:
            "Result unavailable — the call may have completed; we couldn't retrieve final status/transcript (call was too old to sync).",
        },
        vapiCallId: null,
      });
      synced++;
      continue;
    }

    const endTs = endedAt ? new Date(endedAt).getTime() : 0;
    const durationSeconds =
      startedAt && endTs && endTs >= startedAt
        ? Math.round((endTs - startedAt) / 1000)
        : 0;
    const attemptedAt = endedAt ?? call.startedAt ?? new Date().toISOString();
    const endedReason = (call.endedReason ?? "").toLowerCase();
    const isFailed = FAILED_END_REASONS.has(endedReason);

    const captureFieldKeys = (project.captureFields ?? []).map((f) => f.key).filter(Boolean);
    const capturedData = mapStructuredOutputsToCapturedData(
      call.artifact?.structuredOutputs,
      captureFieldKeys
    );
    const callResult = {
      durationSeconds: isFailed ? 0 : durationSeconds,
      transcript: call.artifact?.transcript ?? undefined,
      recordingUrl: call.artifact?.recording?.url ?? undefined,
      attemptedAt,
      ...(capturedData ? { capturedData } : {}),
      ...(isFailed ? { failureReason: call.endedReason || "Call ended" } : {}),
    };

    await updateContact(contact.id, {
      status: isFailed ? "failed" : "success",
      callResult,
      lastVapiCallId: call.id,
      vapiCallId: null,
    });
    if (project.orgId) {
      const minutesDelta = (durationSeconds || 0) / 60;
      await incrementOrgUsage(project.orgId, 1, minutesDelta);
    }
    synced++;
  }

  return NextResponse.json({ synced });
}
