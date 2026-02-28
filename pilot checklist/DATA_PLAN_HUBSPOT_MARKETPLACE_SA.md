# Data Plan: HubSpot Marketplace South Africa — Full List + Ranking

**Objective:** Get the **complete list** of companies on the [HubSpot Solutions Marketplace (South Africa)](https://ecosystem.hubspot.com/marketplace/solutions/south-africa), **enrich** each with enough context to score them, then **score and rank** for the Intellidial pilot. No manual copy-paste; repeatable and automatable.

---

## 1. What data we need

| Stage | Data | Use |
|-------|------|-----|
| **1. Raw list** | Company name, one-line description, profile/site URL (if any) | Input for enrichment |
| **2. Enrichment** | Per company: location (SA/city), agency vs end-client, outbound/sales/lead gen focus, size/positioning | Input for scoring |
| **3. Score** | 5 criteria × 1–5 each (HubSpot depth, outbound/sales, agency, size, geography) | Ranking + tiers |
| **4. Output** | One table: all companies, scores, tier, suggested contact order | `hubspot_marketplace_sa_target_ranking.md` (and optional CSV) |

---

## 2. Why the marketplace page is hard

- **JS-rendered:** Content loads after React/app runs. Plain HTTP fetch often gets an empty or partial HTML and times out.
- **No simple API:** HubSpot doesn’t expose a public “list solutions by country” API in their docs.
- So we need either: **headless browser** (see content after JS) or **scraper that runs JS** (e.g. Firecrawl).

---

## 3. Options to get the raw list

### Option A: Firecrawl (recommended)

**Why it fits:** Handles JS-rendered pages, returns markdown or structured data, supports **Extract** with a schema so we get a list of companies in one go.

**Steps:**

1. **Scrape** the marketplace URL  
   - Call Firecrawl **scrape** on `https://ecosystem.hubspot.com/marketplace/solutions/south-africa`.  
   - Use default options (they wait for JS).  
   - Get back **markdown** (or HTML).  
   - If the page is a list of cards, the markdown will contain company names and descriptions; we then parse or use Extract on that content.

2. **Or Extract in one go**  
   - Call Firecrawl **extract** with:
     - `urls: ["https://ecosystem.hubspot.com/marketplace/solutions/south-africa"]`
     - `prompt`: “This page lists HubSpot solution partners in South Africa. Extract every company/solution listed. For each: company name, short description (one line), and link to their profile or website if visible.”
     - `schema`:  
       `{ "type": "object", "properties": { "companies": { "type": "array", "items": { "type": "object", "properties": { "name": { "type": "string" }, "description": { "type": "string" }, "url": { "type": "string" } }, "required": ["name"] } } }, "required": ["companies"] }`
   - Result: structured list of companies without manual parsing.

**Requirements:** Firecrawl API key ([firecrawl.dev](https://firecrawl.dev)), e.g. in `.env` as `FIRECRAWL_API_KEY`.

**Fallback if Extract fails (e.g. page too complex):** Use **scrape** only, get markdown, save to a file, then run a **second Extract** on that file/content with the same prompt and schema (Firecrawl can accept pasted content in some flows; or use a small local script to parse markdown into the same schema).

---

### Option B: Playwright (no Firecrawl)

**Why:** You already use Playwright in `leads_gen` (see LEADS_GEN_FLOW.md). No new API key; runs in your repo.

**Steps:**

1. **Script:** Node or Python (Playwright).  
   - Open `https://ecosystem.hubspot.com/marketplace/solutions/south-africa`.  
   - Wait for selector that appears when cards are loaded (e.g. `[data-testid="solution-card"]` or a class like `.solution-card` — inspect the page to get the right selector).  
   - Extract for each card: name, description, link.  
   - Output: JSON or CSV, e.g. `hubspot_marketplace_sa_companies.json`.

2. **Inspect the page:** In browser DevTools, find the wrapper of one “solution card” and the inner elements for name/description/link so the script is reliable.

**Requirements:** `playwright` installed, browser installed (e.g. `npx playwright install chromium`).

---

### Option C: HubSpot ecosystem API (if it exists)

- Search HubSpot developer docs for “Solutions Directory API” or “marketplace API” or “partner list API”.  
- If there is an endpoint that returns solutions filtered by country (e.g. South Africa), use it to get the list; then skip browser/scrape.  
- So far we don’t have evidence this exists; worth one quick check before relying on it.

---

## 4. Enrichment (per company)

We need, per company: **location** (SA/city), **agency vs end-client**, **outbound/sales/lead gen focus**, and rough **size/positioning** so we can score.

**Option A: Firecrawl Extract per company**

- For each company we have a **website URL** (from marketplace or from a quick “company name + HubSpot South Africa” search):
  - Call **extract** with that URL and a prompt like:  
    “Extract: (1) Primary location (city and country). (2) Is this company an agency/consultancy that serves multiple clients, or an end-client brand? (3) Do they mention outbound sales, SDR, cold calling, lead generation, or sales development? (4) Rough size or positioning (e.g. small agency, enterprise).”
  - Schema: `{ location, is_agency, outbound_sales_focus, size_or_positioning }`.
- Pros: Structured, consistent. Cons: One request per company (rate limits, cost).

**Option B: Web search per company**

- For each company name: run a search (e.g. “{name} South Africa HubSpot outbound sales”) and parse the snippet/summary for location, agency, outbound.  
- Can be automated with a search API (e.g. SerpAPI, Brave Search API) or with Firecrawl **extract** with `enableWebSearch: true` and a single prompt that takes the company name and returns the same fields.

**Option C: Reuse existing list + one bulk Extract**

- Use the list we already built from mo.agency + Huble + web search (in `hubspot_marketplace_sa_target_ranking.md`).  
- Add any **new** names we get from Option A/B/C in step 3.  
- Run **one** Firecrawl extract with `enableWebSearch: true` and prompt: “For each of these companies [list names], find: country/city, agency vs end-client, whether they do outbound/sales/lead gen. Return a list with one object per company.”  
- Use that to fill in missing enrichment and to double-check existing rows.

---

## 5. Scoring and ranking

- **Input:** Enriched list (name, description, location, agency?, outbound?, size?).  
- **Rules:** Same 5 criteria (1–5): HubSpot depth, outbound/sales, agency, size, geography. Sum = total (max 25). Tiers: 20–25 = Tier 1, 15–19 = Tier 2, 10–14 = Tier 3, &lt;10 = Tier 4.  
- **Output:**  
  - Update `hubspot_marketplace_sa_target_ranking.md` with one master table (all companies, sorted by score), tier sections, and suggested contact order.  
  - Optional: export same data to `hubspot_marketplace_sa_ranking.csv` for Apollo/Excel.

Can be done in the same Python script that does scrape/extract + enrichment, or in a second script that reads the enriched JSON/CSV and writes the markdown.

---

## 6. Recommended end-to-end flow (Firecrawl-first)

| Step | Action | Tool | Output |
|------|--------|------|--------|
| 1 | Get full company list from marketplace page | Firecrawl **extract** (or **scrape** then parse/extract) | `companies.json` (name, description, url) |
| 2 | Enrich each company (location, agency, outbound, size) | Firecrawl **extract** with `enableWebSearch: true` on list of names, or per-URL extract | `companies_enriched.json` |
| 3 | Score each company (5 criteria), sort, assign tier | Python (or same script as step 2) | In-memory list / CSV |
| 4 | Write master table + tiers + contact order | Python | `hubspot_marketplace_sa_target_ranking.md` (and optional CSV) |

**Fallback if Firecrawl is down or you don’t have a key:** Use Playwright (Option B) for step 1 only; then do enrichment via web search (manual or scripted) and keep steps 3–4 the same.

---

## 7. Can Firecrawl help? (short answer)

**Yes.** Firecrawl is a good fit because:

1. **Scrape** handles the JS-rendered marketplace page and returns usable content (markdown/HTML).  
2. **Extract** can turn that page (or the scraped content) into a structured list of companies in one call.  
3. **Extract** with `enableWebSearch: true` (or per-URL) can enrich each company for location, agency, outbound.  
4. One pipeline (e.g. Python + Firecrawl SDK) can do: list → enrich → score → write MD/CSV with no manual steps.

---

## 8. Next steps

1. **Get a Firecrawl API key** from [firecrawl.dev](https://firecrawl.dev) and add `FIRECRAWL_API_KEY` to `.env`.  
2. **Run the script** in `scripts/fetch_hubspot_marketplace_sa.py` (see below): it will call Firecrawl for step 1 (and optionally 2), then score and write the ranking doc.  
3. **If the marketplace page blocks or times out:** Use the Playwright alternative (script in same folder) to get the raw list, then run the rest of the pipeline (enrich + score) on that list.  
4. **Inspect the marketplace page** once in the browser to confirm the selectors (for Playwright) or that the scraped markdown clearly contains card titles/descriptions (for Firecrawl).

---

## 9. Scripts in this folder

| Script | Purpose | Requires |
|--------|---------|----------|
| **fetch_hubspot_marketplace_sa_playwright.py** | Scrape all pages; extract cards (name, description, url). Output: `hubspot_marketplace_sa_companies.json`. | `pip install playwright`, `python -m playwright install chromium` |
| **enrich_hubspot_companies_with_gemini.py** | For each URL in the JSON: fetch page with Playwright, send text to Gemini API, extract real company name + description. Updates the JSON. | `pip install google-generativeai python-dotenv`, `GOOGLE_API_KEY` or `GEMINI_API_KEY` in `.env` |
| **fetch_hubspot_marketplace_sa.py** | Score companies and write ranking MD. Use `--from-json` to score existing JSON (no Firecrawl). | `python-dotenv`; optional `firecrawl-py` + `FIRECRAWL_API_KEY` if not using `--from-json` |

**Run Firecrawl pipeline (recommended):**
```bash
cd "pilot checklist"
python fetch_hubspot_marketplace_sa.py
```
Output: `hubspot_marketplace_sa_companies.json`, `hubspot_marketplace_sa_target_ranking.md`.

**If you don’t have Firecrawl:** Run the Playwright script to get the raw list, then add a small step to score that JSON (reuse the `score_company` + `write_ranking_md` logic from the Firecrawl script).
