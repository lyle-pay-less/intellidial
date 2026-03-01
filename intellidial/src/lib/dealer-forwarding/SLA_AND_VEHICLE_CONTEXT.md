# Enquiry pipeline: SLA and vehicle context

## SLA

- **Target:** Call the lead back as fast as possible after an enquiry, with **consistent** performance.
- **Behaviour:** The Resend inbound webhook returns **200 immediately** after validating the payload so Resend does not retry. The pipeline (create contact, fetch vehicle context, update project, place outbound call) runs **in the background** via `after()`. This avoids multi‑hour delays from webhook retries.
- **Monitoring:** Each pipeline run logs **per‑step timings** (`fetchHtml`, `geminiExtract`, `ensureAssistant`, `createCall`, etc.) so we can see where time is spent and keep total time within target.

## Full context for the agent

- The voice agent must be able to **answer any question** about the vehicle ad (specs, price, mileage, features, etc.). So we need **full listing context**, not a best‑guess subset.
- **We do not trade off agent quality for speed:** we use the same, deterministic path every time so that when Playwright succeeds, context is complete.

## Vehicle listing fetch: what we do and why

- **Primary path: Playwright**
  - We **always try Playwright first** (no “fast path” based on fetch + heuristics).
  - Playwright loads the real page, handles cookies, opens “Detailed specifications” and expands all sections. We discover sections from the page (e.g. click all role="tab" elements) so we don't rely on hardcoded labels that could miss content on other sites; only if the page doesn't use tabs do we fall back to a short list of common section names. That keeps full context without hardcoding one site's structure.
  - **Why not “fetch first, skip Playwright if content looks good”?**  
    We have **no data** that plain fetch returns the same content as the fully rendered page. Character counts are similar across pages, so length/keyword checks do not reliably indicate “full context”. Using them would risk partial context and inconsistent behaviour. One consistent path (Playwright first) gives predictable performance and guaranteed full context when Playwright succeeds.

- **SLA cap**
  - The vehicle fetch step is capped at **45 seconds** (`VEHICLE_FETCH_SLA_MS` in `fetch-html.ts`). If Playwright does not finish in time, we **fall back to plain fetch** and log that context may be partial. We still attempt the call so the lead gets a callback; the agent may not have every spec.

- **Fallback**
  - If Playwright fails (timeout, error) we use **fetch** as fallback so we still have some HTML for Gemini. We log when this happens so we can monitor how often we run in “partial context” mode.

## Summary

| Goal              | How we achieve it |
|-------------------|--------------------|
| Fast callback     | Webhook returns 200 immediately; pipeline runs in background; vehicle fetch capped at 45s. |
| Full context      | Playwright first: full JS render, expanded specs; no heuristic “fast path” that might skip context. |
| Consistent perf   | Same code path every time (Playwright → fallback to fetch only on failure/timeout). |
| Observability     | Per‑step timings in logs; warning when we fall back to fetch (partial context). |
