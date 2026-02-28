wh# Pilot Fit Evaluation Plan — HubSpot SA Companies

**Goal:** Use the 70 company profile URLs to decide who is a **good fit for the Intellidial pilot** — no manual reading of every page. One AI pass per page, structured output, final company file with verdict and reasoning.

---

## 1. Approach (recommended)

| Step | What | How |
|------|------|-----|
| **Input** | 70 URLs | `hubspot_marketplace_sa_companies.json` (or Excel) |
| **Per URL** | Full page content | Playwright: load profile page, extract main text (main/body, ~8–10k chars) |
| **Evaluate** | One URL at a time | Send page text + URL to **Gemini** (2.5 if available, else 1.5) with a single, detailed prompt |
| **Output** | Structured per company | JSON: name, url, fit_verdict, score, why_fit, why_not, key_signals |
| **Final file** | Company file | Excel/CSV: Company name, URL, Fit (Good / Maybe / Poor), Score, Why fit, Why not, Key signals |

**Why one URL at a time?**

- Keeps context focused (full page fits in one call).
- Easier to retry failures.
- Clear per-company result; no mixing of companies in one response.

**Why Gemini?**

- You already use it for enrichment; same API key, same Playwright flow.
- Good at following a structured prompt and returning JSON.
- Gemini 2.5 (when available) gives stronger reasoning; 1.5 Flash is fine and faster.

---

## 2. What “good fit for the pilot” means

Use the same idea as your existing scoring (HubSpot depth, outbound/sales, agency, size, geography), but let the model read the **whole page** and reason, not just keywords.

**Good fit signals (prioritise):**

- **Outbound / sales focus:** SDR, cold calling, outbound sales, lead gen, sales development, pipeline.
- **Agency / partner:** Agency, consultancy, implementation partner, RevOps — they run outbound for multiple clients.
- **HubSpot depth:** Already on HubSpot marketplace; look for implementation, Sales Hub, CRM, workflows.
- **Geography:** South Africa, Cape Town, Johannesburg, Durban, “SA” — we’re targeting SA.
- **Size:** Mid-size to enterprise (teams, not solo) — more likely to pilot and scale.

**Poor fit signals:**

- Pure design/creative only, no sales or outbound.
- Only marketing/inbound, no cold outbound or SDR.
- Not SA-focused (e.g. UK-only with no SA mention).
- Very small (solo) with no team or outbound offering.

**Maybe:**

- Some overlap (e.g. HubSpot + SA) but unclear on outbound/agency; or mixed signals.

---

## 3. Prompt design (for Gemini)

Give the model:

1. **Context:** “We are evaluating HubSpot Solutions Marketplace (South Africa) partners for an **Intellidial pilot** (AI outbound/sales dialer).”
2. **Input:** Full page text + the profile URL.
3. **Task:**  
   - Read the **entire** page (services, about, location, clients, tools).  
   - Decide: **Good fit / Maybe / Poor fit**.  
   - Score 1–10 (10 = ideal pilot target).  
   - Explain in 2–4 bullets **why** they are or aren’t a good fit.  
   - List **key signals** from the page (quotes or facts) that support the verdict.
4. **Output format:** Strict JSON so we can parse and put in Excel:

```json
{
  "name": "Company Name",
  "url": "https://...",
  "fit_verdict": "Good fit" | "Maybe" | "Poor fit",
  "score": 7,
  "why_fit": "2-4 bullet points if good/maybe",
  "why_not": "2-4 bullet points if poor/maybe",
  "key_signals": ["signal 1", "signal 2", ...]
}
```

One prompt per page; one JSON object per company.

---

## 4. Final company file (output)

**Columns (Excel/CSV):**

| Column | Description |
|--------|-------------|
| Company name | From page or existing list |
| URL | Profile URL |
| Fit | Good fit / Maybe / Poor fit |
| Score | 1–10 |
| Why fit | Short bullets (why they’re a good pilot target) |
| Why not | Short bullets (concerns or poor-fit reasons) |
| Key signals | Main evidence from the page |
| (Optional) | HubSpot depth, Outbound, Agency, Size, Geo — if you want to keep your 5 criteria |

**Also:** A JSON file with the same structure for programmatic use (filtering, re-ranking, merging with CRM).

---

## 5. Script flow (summary)

1. Read `hubspot_marketplace_sa_companies.json`.
2. For each company (url, name, description):
   - Fetch page text with Playwright (same as enrichment script).
   - Build prompt: context + “Good fit” definition + page text + “Return only this JSON.”
   - Call Gemini (REST or SDK); parse JSON from response.
   - Append result to list (name, url, fit_verdict, score, why_fit, why_not, key_signals).
   - Small delay between requests (e.g. 1–2 s) to avoid rate limits.
3. Write:
   - `pilot_fit_evaluation.json` (full results).
   - `pilot_fit_evaluation.xlsx` (company file for humans).

**Optional:** Filter Excel to “Good fit” (and maybe “Maybe”) only for a shortlist.

---

## 6. Run order

1. **Ensure you have the 70 URLs** in `hubspot_marketplace_sa_companies.json` (you do).
2. **Run evaluation script** (e.g. `evaluate_pilot_fit_gemini.py`).
3. **Open** `pilot_fit_evaluation.xlsx` — sort by Score or Fit, use “Why fit” / “Why not” to decide who to contact first.

---

## 7. If you want to tweak

- **Stricter “Good fit”:** In the prompt, say “Only use ‘Good fit’ if they clearly do outbound/SDR or run outbound for clients.”
- **Gemini 2.5:** When available, switch model to `gemini-2.5-flash` or `gemini-2.5-pro` in the script for better reasoning.
- **More columns:** Add “Contact priority” (1–5) or “Suggested next step” and ask the model to fill them in the same JSON.
