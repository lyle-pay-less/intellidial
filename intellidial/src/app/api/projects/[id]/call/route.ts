import { NextRequest, NextResponse } from "next/server";
import {
  getProject,
  getOrganization,
  getHubSpotIntegration,
  listContacts,
  updateContact,
} from "@/lib/data/store";
import { getOrgFromRequest } from "../../getOrgFromRequest";
import { ensureProjectAssistantId } from "@/lib/vapi/ensureAssistant";
import {
  isVapiConfigured,
  isPhoneNumberConfigured,
  getPhoneNumberIdForCall,
  createOutboundCall,
} from "@/lib/vapi/client";
import { getContactById } from "@/lib/integrations/hubspot/client";

/**
 * POST /api/projects/[id]/call
 * Initiate real outbound call(s) via VAPI.
 * Body: { contactId: string } for single, or { contactIds: string[] } for queue.
 * Returns 503 if VAPI or phone not configured (UI can fall back to simulation).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const project = await getProject(projectId, org.orgId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const orgDoc = await getOrganization(org.orgId);
  if (!orgDoc) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const callsLimit = orgDoc.callsLimit;
  const minutesLimit = orgDoc.minutesLimit;
  if (callsLimit != null || minutesLimit != null) {
    const callsUsed = orgDoc.callsUsed ?? 0;
    const minutesUsed = orgDoc.minutesUsed ?? 0;
    if (callsLimit != null && callsUsed >= callsLimit) {
      return NextResponse.json(
        { error: "Usage limit reached. Upgrade your plan." },
        { status: 402 }
      );
    }
    if (minutesLimit != null && minutesUsed >= minutesLimit) {
      return NextResponse.json(
        { error: "Usage limit reached. Upgrade your plan." },
        { status: 402 }
      );
    }
  }

  if (!isVapiConfigured() || !isPhoneNumberConfigured()) {
    return NextResponse.json(
      {
        error:
          "Real calling is not configured. Set VAPI_API_KEY and VAPI_PHONE_NUMBER_ID in your environment, or use simulation.",
      },
      { status: 503 }
    );
  }

  let contactIds: string[];
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof body?.contactId === "string" && body.contactId.trim()) {
      contactIds = [body.contactId.trim()];
    } else if (Array.isArray(body?.contactIds) && body.contactIds.length > 0) {
      contactIds = body.contactIds.filter(
        (c: unknown) => typeof c === "string" && c.trim()
      ) as string[];
    } else {
      return NextResponse.json(
        { error: "Provide contactId (string) or contactIds (string[])" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { contacts } = await listContacts(projectId, { limit: 5000 });
  const byId = new Map(contacts.map((c) => [c.id, c]));
  let toCall = contactIds
    .map((cid) => byId.get(cid))
    .filter(
      (c): c is NonNullable<typeof c> =>
        c != null && c.projectId === projectId && c.optOut !== true
    );

  // Two-way sync: respect HubSpot "do not call" Lead Statuses (e.g. Do not call, Not contacted)
  const integration = await getHubSpotIntegration(org.orgId);
  const dontCallLeadStatuses = integration?.enabled
    ? integration.settings?.dontCallLeadStatuses
    : undefined;
  if (dontCallLeadStatuses && dontCallLeadStatuses.length > 0) {
    const afterHubSpotCheck: typeof toCall = [];
    for (const contact of toCall) {
      if (!contact.hubspotContactId) {
        afterHubSpotCheck.push(contact);
        continue;
      }
      const hsContact = await getContactById(org.orgId, contact.hubspotContactId);
      const leadStatus = hsContact?.properties?.hs_lead_status;
      if (leadStatus && dontCallLeadStatuses.includes(leadStatus)) {
        continue; // Skip: HubSpot says do not call
      }
      afterHubSpotCheck.push(contact);
    }
    toCall = afterHubSpotCheck;
  }

  if (toCall.length === 0) {
    return NextResponse.json(
      {
        error:
          "No contacts to call. They may be opted out, or their Lead Status in HubSpot is set to do not call.",
      },
      { status: 404 }
    );
  }

  try {
    const assistantId = await ensureProjectAssistantId(projectId, { orgId: org.orgId });
    const phoneNumberId = project.agentPhoneNumberId?.trim() ?? getPhoneNumberIdForCall();
    console.log("[Call API] Using phone number ID:", phoneNumberId);
    const callIds: string[] = [];

    for (const contact of toCall) {
      await updateContact(contact.id, { status: "calling" });
      try {
        const callId = await createOutboundCall({
          assistantId,
          phoneNumberId,
          customerNumber: contact.phone,
          customerName: contact.name,
        });
        console.log("[Call API] VAPI call created:", { 
          callId, 
          contactId: contact.id, 
          phone: contact.phone,
          normalizedPhone: contact.phone.startsWith("+0") ? "+27" + contact.phone.slice(2) : contact.phone,
          assistantId,
          phoneNumberId,
        });
        
        // Immediately check call status to catch early failures
        try {
          const { getCall } = await import("@/lib/vapi/client");
          const immediateStatus = await getCall(callId);
          console.log("[Call API] Immediate call status check:", {
            callId,
            status: immediateStatus?.status,
            startedAt: immediateStatus?.startedAt,
            endedAt: immediateStatus?.endedAt,
            endedReason: immediateStatus?.endedReason,
          });
        } catch (statusErr) {
          console.warn("[Call API] Could not check immediate status:", statusErr);
        }
        
        callIds.push(callId);
        await updateContact(contact.id, { vapiCallId: callId });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("[Call API] Failed to create call:", {
          contactId: contact.id,
          phone: contact.phone,
          error: errorMessage,
        });
        await updateContact(contact.id, {
          status: "failed",
          callResult: {
            attemptedAt: new Date().toISOString(),
            failureReason: errorMessage,
          },
        });
        // Continue with other contacts instead of returning early
        // This allows batch calls to proceed even if one fails
      }
    }

    if (callIds.length === 0) {
      return NextResponse.json(
        { error: "Failed to create any calls. Check phone numbers and VAPI configuration." },
        { status: 502 }
      );
    }

    return NextResponse.json({ callIds });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Phone number not configured")) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    if (message.includes("Failed to create agent") || message.includes("Project not found")) {
      return NextResponse.json({ error: message }, { status: message.includes("Project not found") ? 404 : 502 });
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}