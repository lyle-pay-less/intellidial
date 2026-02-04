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
  const NEVER_CONNECTED_MS = 10 * 60 * 1000; // 10 min — call created but never ended (e.g. never connected)
  const QUEUED_TIMEOUT_MS = 15 * 1000; // 15 seconds — calls should start immediately, not stay in "queued"

  for (const contact of callingWithCallId) {
    const callId = contact.vapiCallId!;
    const call = await getCall(callId);
    console.log("[Sync Calls] Checking call:", {
      callId,
      contactId: contact.id,
      contactPhone: contact.phone,
      callStatus: call?.status,
      callCreatedAt: call?.createdAt,
      callStartedAt: call?.startedAt,
      callEndedAt: call?.endedAt,
      callEndedReason: call?.endedReason,
      contactUpdatedAt: contact.updatedAt,
    });
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
    const createdAt = call.createdAt ? new Date(call.createdAt).getTime() : 0;
    const isEnded = call.status === "ended" || endedAt != null;
    const isQueued = call.status === "queued";
    
    // For queued calls, check how long since call was created
    // Use createdAt from VAPI if available, otherwise fall back to contact.updatedAt
    let queuedDurationMs = 0;
    if (isQueued) {
      if (createdAt > 0) {
        queuedDurationMs = Date.now() - createdAt;
      } else if (contact.updatedAt) {
        const contactUpdatedAt = new Date(contact.updatedAt).getTime();
        queuedDurationMs = Date.now() - contactUpdatedAt;
      } else {
        // If we have no timestamp, assume it's been queued for a while (use a large value)
        queuedDurationMs = QUEUED_TIMEOUT_MS + 1;
      }
    }
    const stuckInQueue = isQueued && queuedDurationMs > QUEUED_TIMEOUT_MS;
    
    console.log("[Sync Calls] Queue check:", {
      callId,
      isQueued,
      createdAt: call.createdAt,
      contactUpdatedAt: contact.updatedAt,
      queuedDurationMs: Math.round(queuedDurationMs / 1000) + "s",
      stuckInQueue,
    });
    
    // For started calls, check age from start time
    const callAgeMs = startedAt > 0 ? Date.now() - startedAt : 0;
    const isStale = callAgeMs > STALE_CALL_MS;
    const neverConnected = !isEnded && !isQueued && callAgeMs > NEVER_CONNECTED_MS;

    // If stuck in queue, mark as failed with detailed error
    if (stuckInQueue) {
      const errorDetails = [];
      errorDetails.push(`Call stuck in "queued" status for ${Math.round(queuedDurationMs / 1000)}s`);
      errorDetails.push(`Phone: ${contact.phone} (normalized: +27844050294)`);
      errorDetails.push(`VAPI Call ID: ${callId}`);
      errorDetails.push(`Assistant ID: ${call.assistantId || 'unknown'}`);
      
      // Check for common failure reasons
      let failureReason = `Call never started. ${errorDetails.join(' | ')}. `;
      
      // Check if call ended with "customer-did-not-answer" but never started (indicates Twilio issue)
      const endedReason = (call.endedReason ?? "").toLowerCase();
      if (endedReason === "customer-did-not-answer" && !call.startedAt) {
        failureReason += `CRITICAL: Call shows "Customer Did Not Answer" but START TIME is N/A - this means Twilio never actually dialed. `;
        failureReason += `This is almost always caused by LOW TWILIO BALANCE. `;
        failureReason += `Your Twilio account has $0.79 available - this is likely insufficient. `;
        failureReason += `Add funds to your Twilio account at console.twilio.com. `;
      } else {
        failureReason += `Possible causes: `;
        failureReason += `1) Low Twilio account balance (check Twilio dashboard), `;
        failureReason += `2) Twilio phone number not properly configured, `;
        failureReason += `3) VAPI/Twilio connectivity issue. `;
      }
      failureReason += `Check VAPI dashboard (dashboard.vapi.ai/calls) for call ID ${callId} to see detailed error.`;
      
      await updateContact(contact.id, {
        status: "failed",
        callResult: {
          attemptedAt: contact.updatedAt ?? new Date().toISOString(),
          failureReason,
        },
        vapiCallId: null,
      });
      console.error("[Sync Calls] Call stuck in queue:", {
        callId,
        contactPhone: contact.phone,
        queuedDurationMs,
        vapiStatus: call.status,
        assistantId: call.assistantId,
        endedReason: call.endedReason,
        warning: "Check Twilio balance - low balance can cause calls to queue but never connect",
      });
      synced++;
      continue;
    }

    if (!isEnded && !isStale && !neverConnected && !stuckInQueue) continue;

    if (!isEnded && (isStale || neverConnected)) {
      await updateContact(contact.id, {
        status: "failed",
        callResult: {
          attemptedAt: call.startedAt ?? new Date().toISOString(),
          failureReason: neverConnected
            ? "Call did not connect (no answer or provider issue). Check the phone number format (e.g. +27… for South Africa)."
            : "Result unavailable — the call may have completed; we couldn't retrieve final status/transcript (call was too old to sync).",
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
    
    // Special case: "customer-did-not-answer" with no start time means Twilio never dialed
    // This is almost always due to low Twilio balance
    const neverActuallyDialed = !startedAt && (
      endedReason === "customer-did-not-answer" || 
      endedReason === "no-answer" ||
      endedReason === "failed"
    );
    
    const isFailed = FAILED_END_REASONS.has(endedReason) || neverActuallyDialed;

    const captureFieldKeys = (project.captureFields ?? []).map((f) => f.key).filter(Boolean);
    const capturedData = mapStructuredOutputsToCapturedData(
      call.artifact?.structuredOutputs,
      captureFieldKeys
    );
    let failureReason: string | undefined;
    if (isFailed) {
      if (neverActuallyDialed) {
        failureReason = `Call never actually dialed. Ended reason: "${call.endedReason || 'unknown'}". `;
        failureReason += `This usually means LOW TWILIO BALANCE - your account has $0.79 which may be insufficient. `;
        failureReason += `Add funds to your Twilio account at console.twilio.com. `;
        failureReason += `Check VAPI dashboard (dashboard.vapi.ai/calls) for call ID ${callId} to confirm.`;
      } else {
        failureReason = call.endedReason || "Call ended";
      }
    }
    
    const callResult = {
      durationSeconds: isFailed ? 0 : durationSeconds,
      transcript: call.artifact?.transcript ?? undefined,
      recordingUrl: call.artifact?.recording?.url ?? undefined,
      attemptedAt,
      ...(capturedData ? { capturedData } : {}),
      ...(failureReason ? { failureReason } : {}),
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
