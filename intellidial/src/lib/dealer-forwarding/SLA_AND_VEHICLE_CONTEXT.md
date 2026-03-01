# Enquiry pipeline: SLA and vehicle context

## SLA

- **Target:** Call the lead back as fast as possible after an enquiry, with **consistent** performance.
- **Behaviour:** The Resend inbound webhook returns **200 immediately** after validating the payload so Resend does not retry. The pipeline (create contact, fetch vehicle context, update project, place outbound call) runs **in the background** via `after()`. This avoids multi-hour delays from webhook retries.
- **Monitoring:** Each pipeline run logs **per-step timings** (`geminiUrlContext`, `fetchHtml`, `geminiExtract`, `ensureAssistant`, `createCall`, etc.) and which method was used (`vehicleContextMethod: 0` = Gemini URL context, `1` = Playwright fallback).

## Full context for the agent

- The voice agent must be able to **answer any question** about the vehicle ad (specs, price, mileage, features, etc.). So we need **full listing context**, not a best-guess subset.
- **We do not trade off agent quality for speed:** we use the same extraction instruction for both the fast path (Gemini URL context) and the fallback (Playwright + Gemini extract) so the agent gets the same depth of content either way.

## Vehicle listing fetch: what we do and why

### Primary path: Gemini URL context (~15-20s)

- We use `extractVehicleContextFromUrl()` which calls Gemini's `urlContext` tool: Gemini fetches and reads the page itself, then extracts full vehicle text in **one API call**. No browser needed.
- This replaces the previous two-step process (Playwright 85s + Gemini extract 13s = ~98s) with a single ~15-20s call.
- Uses `gemini-2.5-flash` (the `urlContextModel`) which supports URL fetching natively.
- The extraction instruction is the same as the fallback path: preserve every piece of information, all spec sections, no summarisation.

### Fallback: Playwright + Gemini extract

- If Gemini URL context fails (e.g. site blocks Gemini's crawler, API error), we fall back to the original path: Playwright fetches the full JS-rendered page, then Gemini extracts text from the HTML.
- Playwright discovers and clicks spec sections from the page (no hardcoded labels) and is capped at 45s (`VEHICLE_FETCH_SLA_MS`).
- We log when the fallback is used so we can monitor how often the fast path works.

### Parallelisation

- `createContact` and vehicle context fetch run **in parallel** (they have no dependency on each other). This saves ~3-5s compared to running them sequentially.

### ensureAssistant

- VAPI assistant update has a 500ms propagation delay (reduced from a duplicated 2x1.5s = 3s).

## Summary

| Goal              | How we achieve it |
|-------------------|--------------------|
| Fast callback     | Gemini URL context as primary (~15-20s vs 98s); createContact runs in parallel; ensureAssistant delay reduced to 500ms. |
| Full context      | Same extraction instruction for both paths: all specs, no summarisation. Fallback to Playwright if URL context fails. |
| Consistent perf   | One fast primary path; deterministic fallback; per-step timings and method logged. |
| Observability     | Per-step timings in logs; `vehicleContextMethod` field; warning when fallback is used. |
