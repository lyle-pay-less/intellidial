/**
 * Pipeline: take parsed enquiry (name, phone, vehicle link) and
 * create contact, fetch vehicle context, update project, place outbound call.
 * Result is stored by the existing call-ended webhook when the call finishes.
 */

import { getProject, updateProject, createContacts } from "@/lib/data/store";
import { fetchVehicleListingHtml } from "@/lib/vehicle-listing/fetch-html";
import { extractFullTextFromHtml, isGeminiConfigured } from "@/lib/gemini/client";
import { ensureProjectAssistantId } from "@/lib/vapi/ensureAssistant";
import { createOutboundCall, getPhoneNumberIdForCall } from "@/lib/vapi/client";
import type { ParsedEnquiry } from "./parse-email";

export type PipelineResult =
  | { ok: true; callId: string; contactId: string }
  | { ok: false; error: string };

/**
 * Run the full pipeline for a forwarded enquiry.
 * Requires DEALER_FORWARDING_PROJECT_ID and project must exist and have orgId.
 */
export async function runForwardedEnquiryPipeline(
  projectId: string,
  enquiry: ParsedEnquiry
): Promise<PipelineResult> {
  try {
    const project = await getProject(projectId);
    if (!project) {
      return { ok: false, error: "Project not found" };
    }
    const orgId = (project as { orgId?: string }).orgId;
    if (!orgId) {
      return { ok: false, error: "Project has no orgId" };
    }

    // 4. Create contact (back office)
    const created = await createContacts(projectId, [
      { phone: enquiry.phone, name: enquiry.name },
    ]);
    const contactId = created[0]?.id;
    if (!contactId) {
      return { ok: false, error: "Failed to create contact" };
    }

    // 5. Fetch vehicle context from link (same as refresh-vehicle-context)
    if (!isGeminiConfigured()) {
      return { ok: false, error: "Gemini is not configured (GEMINI_API_KEY)" };
    }
    const url = enquiry.vehicleLink.startsWith("http")
      ? enquiry.vehicleLink
      : "https://" + enquiry.vehicleLink;
    const fetchResult = await fetchVehicleListingHtml(url);
    if (!fetchResult.ok) {
      return { ok: false, error: `Could not load listing: ${fetchResult.error}` };
    }
    const extractResult = await extractFullTextFromHtml(fetchResult.html);
    if (!extractResult.ok) {
      return { ok: false, error: extractResult.error };
    }

    await updateProject(projectId, {
      vehicleContextFullText: extractResult.text,
      vehicleContextUpdatedAt: new Date().toISOString(),
    });

    // 6. Ensure assistant (with new vehicle context) and place call
    let phoneNumberId: string;
    try {
      phoneNumberId = getPhoneNumberIdForCall();
    } catch {
      return { ok: false, error: "VAPI phone number not configured (VAPI_PHONE_NUMBER_ID)" };
    }

    const assistantId = await ensureProjectAssistantId(projectId, orgId);
    const callId = await createOutboundCall({
      assistantId,
      phoneNumberId,
      customerNumber: enquiry.phone,
      customerName: enquiry.name,
    });

    return { ok: true, callId, contactId };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
