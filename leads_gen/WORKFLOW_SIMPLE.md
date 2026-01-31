# Leads workflow — simple (fully automated)

No manual writing. Scripts + APIs do everything.

---

## Steps

1. **Apollo** — Get companies (name, website) by ICP, then people + emails per company. API or export → CSV.
2. **Zero Bounce** — Send the email list to the API; get back status (valid / catch_all / invalid). Script keeps only valid (and optionally catch_all).
3. **Email generation** — Script (e.g. `generate_emails.py`) calls Gemini per row; outputs subject + body for each lead. No copy‑paste.
4. **Instantly** — Import the CSV (or use API). Send; use Instantly for warm‑up, caps, tracking, follow‑ups.

**Tools:** Apollo → Zero Bounce → Gemini (script) → Instantly.

---

## In this repo

- **Company list:** `companies_to_enrich.csv` (from Apollo export or API).
- **Enrichment + verification:** Wire Apollo for contacts, Zero Bounce API for verification → `contacts_verified.csv`.
- **Email generation:** `generate_emails.py` reads verified CSV, calls Gemini, writes `emails_ready.csv` (subject + body per lead).
- **Send:** Import `emails_ready.csv` into Instantly (or use their API).

You run the scripts and move the CSVs (or we wire the steps). No manual writing at any step.
