# Leads gen — start here

Run the **find-emails** flow for Tier 1 & Tier 2 (recruiters, SDR, lead qual agencies, etc.).

---

## 1. Get a Hunter.io API key

- Sign up at [hunter.io](https://hunter.io) and get an API key from [hunter.io/api](https://hunter.io/api).
- Add to your **project `.env`** (in `doctor/`, not inside `leads_gen/`):

```env
HUNTER_API_KEY=your_key_here
```

---

## 2. Get company names and build your list

You need **company_name** + **website** (and **segment**) for each row. See **`HOW_TO_GET_COMPANY_NAMES.md`** for where to get them (Apollo, LinkedIn, Clutch, Google, or an Apollo API script).

Then edit **`companies_to_enrich.csv`** in this folder. Columns:

| Column         | Description                          |
|----------------|--------------------------------------|
| `segment`      | e.g. `recruiters`, `lead_qual_agencies`, `sdr_teams` |
| `company_name` | Company name                         |
| `website`      | Full URL or domain (e.g. `https://agency.com`)      |

- Start with **50–100 companies** from Tier 1 (recruiters + lead qual agencies).
- Get companies from LinkedIn, Clutch, Apollo company search, or your own list.
- One row per company. The script will find contacts (and verify emails) for each.

---

## 3. Run the script

From the **`doctor`** folder (project root):

```bash
python leads_gen/find_emails.py
```

- Reads `leads_gen/companies_to_enrich.csv`.
- For each row: gets domain → calls Hunter domain-search → picks contacts by job title → verifies each email.
- Writes **`leads_gen/enriched_leads.csv`** with: `segment`, `company_name`, `website`, `contact_name`, `job_title`, `email`, `verification_status`.

Use only rows where `verification_status` is `valid` (or `catch_all` if you accept that) when sending.

---

## 4. Next steps

- **Generate emails:** Use `LEADS_GEN_PLAN.md` — our offer + their segment/role → subject + body.
- **Send safely:** Same doc — warm-up, sending infra, caps, unsubscribe.
- **Plans:** `TARGET_MARKET_REFINEMENT.md`, `TIER1_TIER2_EMAIL_PLAN.md`.
