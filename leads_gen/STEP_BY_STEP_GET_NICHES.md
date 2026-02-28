# Step-by-step: Get the niches you need (Apollo + research)

**What you already have in `leads_gen/`:**

| File | What it does |
|------|----------------|
| **RESEARCH_SA_COMPANIES.md** | Manual ways to get SA company names (Google Maps, LinkedIn, directories, associations, Google operators). Includes a **Quick Research Checklist** with 10 industries. |
| **APOLLO_SEARCH_STRATEGY.md** | Apollo company + people search for **US/UK**: Recruiters, Lead Qual Agencies, SDR teams. Tier 1 targets, filters, and export steps. |
| **APOLLO_HIGH_VOLUME_OUTBOUND_SEARCH.md** | Apollo **South Africa** focus: 10 ready-made searches (lead gen, telemarketing, market research, onboarding, follow-up, appointment reminders, data verification, property, BPO, lead qualification). Each has filters, keywords, and a `segment` label. |
| **TARGET_MARKET_REFINEMENT.md** | How to score segments (easy to implement, low risk, time saver, etc.). Tier 1 = Recruiters, SDR; Tier 2 = Market research, etc. Use this to **choose which niches to run first**. |

You do **not** have a single “master niche list” file yet — the niches are spread across these docs. This guide ties them together and gives a clear sequence.

---

## Step 1: Decide geography and priority niches

**Geography:**

- **South Africa** → Use **APOLLO_HIGH_VOLUME_OUTBOUND_SEARCH.md** (all 10 searches are SA). Optionally add manual research from **RESEARCH_SA_COMPANIES.md**.
- **US / UK** → Use **APOLLO_SEARCH_STRATEGY.md** (Recruiters, Lead Qual Agencies, SDR teams).

**Priority niches (from your existing docs):**

| Source | Niches |
|--------|--------|
| **TARGET_MARKET_REFINEMENT.md** | Tier 1: Recruiters & staffing, Sales/SDR. Tier 2: Market research, etc. |
| **RESEARCH_SA_COMPANIES.md** (checklist) | Healthcare/Medical Aid, Recruitment/HR, Property, Debt Collection, Market Research, Insurance, Banking, E-commerce, Fitness, IT. |
| **APOLLO_HIGH_VOLUME_OUTBOUND_SEARCH.md** | lead_gen_appointment_setting, telemarketing, market_research, customer_onboarding, follow_up_feedback, appointment_reminders, data_verification, property_verification, bpo_outbound, lead_qualification. |

**Action:** Pick 2–4 niches to start (e.g. Recruiters + Lead qual + Market research). Write them down so you know which Apollo searches to run.

---

## Step 2: Set up Apollo

1. Sign up or log in at [apollo.io](https://apollo.io).
2. Set **location** to your target (e.g. South Africa or United States).
3. If you need more than ~100 exports/month, consider upgrading to Pro for a month.
4. (Optional) In **Settings**, add an **API key** if you plan to use a script later (see LEADS_GEN_PLAN.md).

---

## Step 3: Run Apollo company searches for your chosen niches

**If SA (high-volume outbound):**

1. Open **APOLLO_HIGH_VOLUME_OUTBOUND_SEARCH.md**.
2. For each niche you chose (e.g. Search 1 Lead gen, Search 3 Market research):
   - Go to **Apollo → Search → Companies**.
   - Apply the **filters** from that search (Industry, Keywords, Company size, Location = South Africa).
   - Run the search, review results.
   - Export **20–30 companies** (or up to 50 if you want a bigger list).
   - In your CSV, add a column **`segment`** and set it to the label in the doc (e.g. `lead_gen_appointment_setting`, `market_research`).
3. Either keep one CSV per niche or **combine** into one file, e.g. `companies_to_enrich.csv`, with columns: **segment, company_name, website** (and optionally employee count, location).

**If US/UK (recruiters + lead qual):**

1. Open **APOLLO_SEARCH_STRATEGY.md**.
2. Run **Search 1** (Recruiters) → export 50–100 companies → add `segment = recruiters`.
3. Run **Search 2** (Lead Qual Agencies) → export 50–100 companies → add `segment = lead_qual_agencies`.
4. Combine into one CSV with **segment, company_name, website**.

---

## Step 4: (Optional) Add companies from manual research

If Apollo doesn’t give enough for a niche (e.g. SA and Apollo is thin):

1. Open **RESEARCH_SA_COMPANIES.md**.
2. Use **Method 1 (Google Maps)** or **Method 2 (LinkedIn)** for the same industries (e.g. “recruitment agencies Johannesburg”, “market research South Africa”).
3. Copy company name + website into your CSV.
4. Add the **segment** column for that niche.
5. Append these rows to the same `companies_to_enrich.csv` (or equivalent) you use for Apollo.

---

## Step 5: Get decision-maker contacts (people/emails)

**Option A – Apollo People Search (recommended):**

1. In Apollo go to **Search → People**.
2. Use your company list (upload or filter by the companies you exported).
3. Filter by **job titles** (see APOLLO_SEARCH_STRATEGY.md for Recruiters vs Lead Qual titles) and **Seniority** (Manager, Director, VP, C-Level, Owner).
4. Export **name, title, company, email, LinkedIn**.

**Option B – Script (Hunter):**

1. Save your company list as `leads_gen/companies_to_enrich.csv` with columns: **segment, company_name, website**.
2. Run: `python leads_gen/find_emails.py`
3. Script uses Hunter to get contacts per domain; output goes to something like `enriched_leads.csv`.

---

## Step 6: Verify emails and finalise the list

- Use **Hunter**, **NeverBounce**, or **ZeroBounce** to verify.
- Keep only **valid** (and optionally **catch_all**) emails.
- Remove invalid/unknown/disposable.
- You now have a **per-niche** (or combined) list of companies + contacts ready for email gen / outreach.

---

## Quick reference: which file for what

| Goal | File to use |
|------|-------------|
| Manual ways to find SA companies | **RESEARCH_SA_COMPANIES.md** |
| Which niches to prioritise (scoring) | **TARGET_MARKET_REFINEMENT.md** |
| Apollo searches for US/UK (recruiters, lead qual, SDR) | **APOLLO_SEARCH_STRATEGY.md** |
| Apollo searches for SA (10 outbound-call niches) | **APOLLO_HIGH_VOLUME_OUTBOUND_SEARCH.md** |
| End-to-end flow (Apollo + Instantly + extras) | **LEADS_GEN_PLAN.md** |
| This step-by-step | **STEP_BY_STEP_GET_NICHES.md** (this file) |

---

## One-line summary

**Pick 2–4 niches from TARGET_MARKET_REFINEMENT + APOLLO_HIGH_VOLUME (SA) or APOLLO_SEARCH_STRATEGY (US/UK) → run those Apollo company searches → export with a `segment` column → get people/emails (Apollo People or `find_emails.py`) → verify emails → you have your niches as contact lists.**
