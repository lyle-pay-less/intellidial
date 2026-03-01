/**
 * Pipeline: take parsed enquiry (name, phone, vehicle link) and
 * create contact, fetch vehicle context, update project, place outbound call.
 * Result is stored by the existing call-ended webhook when the call finishes.
 *
 * SLA + vehicle context: see SLA_AND_VEHICLE_CONTEXT.md in this folder.
 * Primary path: Gemini URL context (one API call, ~15-20s).
 * Fallback: Playwright + Gemini extract (if URL context fails).
 * createContact and vehicle fetch run in parallel to save time.
 */

import { getProject, updateProject, createContacts, updateContact } from "@/lib/data/store";
import { fetchVehicleListingHtml } from "@/lib/vehicle-listing/fetch-html";
import { extractFullTextFromHtml, extractVehicleContextFromUrl, isGeminiConfigured } from "@/lib/gemini/client";
import { ensureProjectAssistantId } from "@/lib/vapi/ensureAssistant";
import { createOutboundCall, getPhoneNumberIdForCall } from "@/lib/vapi/client";
import type { ParsedEnquiry } from "./parse-email";

export type PipelineResult =
  | { ok: true; callId: string; contactId: string }
  | { ok: false; error: string };

/**
 * Fetch vehicle context: try Gemini URL context first (fast, no browser).
 * Falls back to Playwright + Gemini extract if URL context fails.
 */
async function fetchVehicleContext(
  url: string,
  timings: Record<string, number>
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  let t = Date.now();
  const urlResult = await extractVehicleContextFromUrl(url);
  timings.geminiUrlContext = Date.now() - t;
  if (urlResult.ok) {
    timings.vehicleContextMethod = 0; // 0 = Gemini URL context
    console.log("[Pipeline] Gemini URL context succeeded in %dms", timings.geminiUrlContext);
    return urlResult;
  }
  console.warn("[Pipeline] Gemini URL context failed in %dms: %s — falling back to Playwright", timings.geminiUrlContext, urlResult.error);

  t = Date.now();
  const fetchResult = await fetchVehicleListingHtml(url);
  timings.fetchHtml = Date.now() - t;
  if (!fetchResult.ok) {
    return { ok: false, error: `Could not load listing: ${fetchResult.error}` };
  }

  t = Date.now();
  const extractResult = await extractFullTextFromHtml(fetchResult.html);
  timings.geminiExtract = Date.now() - t;
  if (!extractResult.ok) {
    return { ok: false, error: extractResult.error };
  }
  timings.vehicleContextMethod = 1; // 1 = Playwright + Gemini extract
  console.log("[Pipeline] Playwright fallback succeeded in %dms (fetch: %dms, extract: %dms)", timings.fetchHtml + timings.geminiExtract, timings.fetchHtml, timings.geminiExtract);
  return extractResult;
}

/**
 * Run the full pipeline for a forwarded enquiry.
 * Each step is timed so we can diagnose where slowness occurs.
 */
export async function runForwardedEnquiryPipeline(
  projectId: string,
  enquiry: ParsedEnquiry
): Promise<PipelineResult> {
  const pipelineStart = Date.now();
  const timings: Record<string, number> = {};

  try {
    let t = Date.now();
    const project = await getProject(projectId);
    timings.getProject = Date.now() - t;
    if (!project) {
      return { ok: false, error: "Project not found" };
    }
    const orgId = (project as { orgId?: string }).orgId;
    if (!orgId) {
      return { ok: false, error: "Project has no orgId" };
    }

    if (!isGeminiConfigured()) {
      return { ok: false, error: "Gemini is not configured (GEMINI_API_KEY)" };
    }
    const url = enquiry.vehicleLink.startsWith("http")
      ? enquiry.vehicleLink
      : "https://" + enquiry.vehicleLink;

    // Run createContact and vehicle context fetch in parallel (no dependency between them)
    t = Date.now();
    const [contactResult, vehicleResult] = await Promise.all([
      createContacts(projectId, [
        { phone: enquiry.phone, name: enquiry.name, email: enquiry.email },
      ], { skipDuplicates: true }),
      fetchVehicleContext(url, timings),
    ]);
    timings.createContact = Date.now() - t;

    const contactId = contactResult[0]?.id;
    if (!contactId) {
      return { ok: false, error: "Failed to create contact" };
    }
    if (!vehicleResult.ok) {
      console.error("[Pipeline] vehicle context failed — timings: %o", timings);
      return { ok: false, error: vehicleResult.error };
    }

    t = Date.now();
    await updateProject(projectId, {
      vehicleContextFullText: vehicleResult.text,
      vehicleContextUpdatedAt: new Date().toISOString(),
    });
    timings.updateProject = Date.now() - t;

    let phoneNumberId: string;
    try {
      phoneNumberId = getPhoneNumberIdForCall();
    } catch {
      return { ok: false, error: "VAPI phone number not configured (VAPI_PHONE_NUMBER_ID)" };
    }

    t = Date.now();
    const assistantId = await ensureProjectAssistantId(projectId, orgId);
    timings.ensureAssistant = Date.now() - t;

    t = Date.now();
    const callId = await createOutboundCall({
      assistantId,
      phoneNumberId,
      customerNumber: enquiry.phone,
      customerName: enquiry.name,
    });
    timings.createCall = Date.now() - t;

    timings.total = Date.now() - pipelineStart;
    console.log("[Pipeline] Completed in %dms — timings: %o", timings.total, timings);

    return { ok: true, callId, contactId };
  } catch (e) {
    timings.total = Date.now() - pipelineStart;
    const message = e instanceof Error ? e.message : String(e);
    console.error("[Pipeline] Failed after %dms: %s — timings: %o", timings.total, message, timings);
    return { ok: false, error: message };
  }
}
