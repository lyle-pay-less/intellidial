/**
 * Pipeline: take parsed enquiry (name, phone, vehicle link) and
 * create contact, fetch vehicle context, build prompt, place outbound call.
 * Result is stored by the existing call-ended webhook when the call finishes.
 *
 * SLA strategy (target: 30s callback):
 * 1. Playwright (primary) — full JS render, clicks spec tabs → best content quality.
 * 2. Gemini URL context (fallback) — if Playwright fails/blocked.
 * 3. System prompt is passed at call time via assistantOverrides, NOT by updating
 *    the VAPI assistant. This eliminates the ~40s VAPI PATCH bottleneck.
 * 4. createContact, vehicle fetch, and updateProject run in parallel where possible.
 */

import { getProject, getDealer, updateProject, createContacts } from "@/lib/data/store";
import { fetchVehicleListingHtml, stripHtmlToText } from "@/lib/vehicle-listing/fetch-html";
import { extractVehicleContextFromUrl } from "@/lib/gemini/client";
import { ensureProjectAssistantId } from "@/lib/vapi/ensureAssistant";
import { createOutboundCall, getPhoneNumberIdForCall, enrichBusinessContextWithDealer } from "@/lib/vapi/client";
import { buildSystemPrompt } from "@/lib/vapi/prompt-builder";
import type { PromptProject } from "@/lib/vapi/prompt-builder";
import type { ParsedEnquiry } from "./parse-email";

export type PipelineResult =
  | { ok: true; callId: string; contactId: string }
  | { ok: false; error: string };

/**
 * Fetch vehicle context: Playwright + fast HTML strip (primary), URL context (fallback).
 * HTML-to-text strip runs in ~10ms, replacing the 22-50s Gemini extract step.
 */
async function fetchVehicleContext(
  url: string,
  timings: Record<string, number>
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  let t = Date.now();
  const fetchResult = await fetchVehicleListingHtml(url);
  timings.fetchHtml = Date.now() - t;

  if (fetchResult.ok) {
    t = Date.now();
    const text = stripHtmlToText(fetchResult.html);
    timings.htmlStrip = Date.now() - t;
    if (text.length > 200) {
      timings.vehicleContextMethod = 0; // 0 = Playwright + HTML strip
      console.log("[Pipeline] Playwright + strip succeeded in %dms (fetch: %dms, strip: %dms, chars: %d)", timings.fetchHtml + timings.htmlStrip, timings.fetchHtml, timings.htmlStrip, text.length);
      return { ok: true, text };
    }
    console.warn("[Pipeline] Stripped HTML too short (%d chars) — trying URL context", text.length);
  } else {
    console.warn("[Pipeline] Playwright failed in %dms: %s — trying URL context", timings.fetchHtml, fetchResult.error);
  }

  // Fallback: Gemini URL context (no browser needed)
  t = Date.now();
  const urlResult = await extractVehicleContextFromUrl(url);
  timings.geminiUrlContext = Date.now() - t;
  if (urlResult.ok) {
    timings.vehicleContextMethod = 1; // 1 = Gemini URL context fallback
    console.log("[Pipeline] URL context fallback succeeded in %dms", timings.geminiUrlContext);
    return urlResult;
  }
  console.error("[Pipeline] Both Playwright and URL context failed. URL context: %s", urlResult.error);
  return { ok: false, error: `All vehicle fetch methods failed. Last: ${urlResult.error}` };
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

    const url = enquiry.vehicleLink.startsWith("http")
      ? enquiry.vehicleLink
      : "https://" + enquiry.vehicleLink;

    let phoneNumberId: string;
    try {
      phoneNumberId = getPhoneNumberIdForCall();
    } catch {
      return { ok: false, error: "VAPI phone number not configured (VAPI_PHONE_NUMBER_ID)" };
    }

    // Phase 1: fetch vehicle context + create contact + get dealer (all independent, parallel)
    t = Date.now();
    const [contactResult, vehicleResult, dealer] = await Promise.all([
      createContacts(projectId, [
        { phone: enquiry.phone, name: enquiry.name, email: enquiry.email },
      ], { skipDuplicates: true }),
      fetchVehicleContext(url, timings),
      project.dealerId ? getDealer(project.dealerId, orgId) : Promise.resolve(null),
    ]);
    timings.phase1_parallel = Date.now() - t;

    const contactId = contactResult[0]?.id;
    if (!contactId) {
      return { ok: false, error: "Failed to create contact" };
    }
    if (!vehicleResult.ok) {
      console.error("[Pipeline] vehicle context failed — timings: %o", timings);
      return { ok: false, error: vehicleResult.error };
    }

    // Phase 2: build system prompt with vehicle context + dealer info
    let businessContext = project.businessContext ?? "";
    if (dealer) {
      businessContext = enrichBusinessContextWithDealer(businessContext, dealer);
    }
    const promptProject: PromptProject = {
      ...project,
      businessContext,
      vehicleContextFullText: vehicleResult.text,
    };
    const systemPrompt = buildSystemPrompt(promptProject);

    // If project has no assistant yet, create one first (one-time setup)
    let assistantId = project.assistantId?.trim() || "";
    if (!assistantId) {
      t = Date.now();
      assistantId = await ensureProjectAssistantId(projectId, { orgId, project: { ...project, vehicleContextFullText: vehicleResult.text } });
      timings.ensureAssistant = Date.now() - t;
    }

    // Phase 3: place call (with prompt override) + persist vehicle context to Firestore (parallel)
    t = Date.now();
    const [callId] = await Promise.all([
      createOutboundCall({
        assistantId,
        phoneNumberId,
        customerNumber: enquiry.phone,
        customerName: enquiry.name,
        systemPrompt,
      }),
      updateProject(projectId, {
        vehicleContextFullText: vehicleResult.text,
        vehicleContextUpdatedAt: new Date().toISOString(),
      }),
    ]);
    timings.phase3_callAndSave = Date.now() - t;

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
