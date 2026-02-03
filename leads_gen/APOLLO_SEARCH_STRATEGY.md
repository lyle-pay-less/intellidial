# Apollo Search Strategy — Tier 1 Priority Targets

**Goal:** Use Apollo.io to find 200–300 high-quality leads (companies + decision-makers) for our first outbound campaign.

**Target segments:** Recruiters & Staffing, Lead Qualification / Appointment Setting Agencies (both Tier 1, low risk, high ROI).

---

## Step 1: Company Search (get company names + websites)

### Search 1: Recruiters & Staffing Agencies (100 companies)

**Apollo → Search → Companies**

| Filter | Value |
|--------|-------|
| **Industry** | Staffing & Recruiting, Human Resources Services |
| **Keywords** | "recruitment agency" OR "staffing agency" OR "tech recruiting" OR "RPO" |
| **Company size** | 5–200 employees |
| **Location** | United States (or UK, or both — start with one) |
| **Technologies (optional)** | LinkedIn Recruiter, Greenhouse, Lever (shows active recruiting) |

**Export:** Company name, website (domain), employee count, location.  
**Label:** Add a column `segment` = `recruiters` in your CSV before enrichment.

---

### Search 2: Lead Gen / Appointment Setting Agencies (100 companies)

**Apollo → Search → Companies**

| Filter | Value |
|--------|-------|
| **Industry** | Marketing & Advertising, Business Services, Outsourcing/Offshoring |
| **Keywords** | "appointment setting" OR "lead generation" OR "lead qualification" OR "outbound agency" OR "demand generation" |
| **Company size** | 5–100 employees |
| **Location** | United States (or UK, or both) |
| **Technologies (optional)** | Apollo.io, Outreach, SalesLoft (shows they do outbound) |

**Export:** Company name, website, employee count, location.  
**Label:** Add a column `segment` = `lead_qual_agencies`.

---

### Search 3 (optional): Sales / SDR Teams (50–100 companies)

**Apollo → Search → Companies**

| Filter | Value |
|--------|-------|
| **Industry** | Computer Software, SaaS, IT Services, B2B |
| **Keywords** | "B2B SaaS" OR "outbound sales" OR "sales-led" |
| **Company size** | 50–500 employees |
| **Location** | United States |
| **Departments** | Sales (5–50 people) |

**Export:** Company name, website, employee count.  
**Label:** `segment` = `sdr_teams`.

---

## Step 2: People Search (get decision-makers)

For each company list (Recruiters, Lead Qual Agencies), find **1–2 decision-makers** per company.

### Option A: Apollo People Search (recommended)

**Apollo → Search → People**

| Filter | Value (for Recruiters segment) |
|--------|-------------------------------|
| **Company** | Upload your company list (or search by domain one at a time) |
| **Job Titles** | "Head of Recruitment" OR "Recruitment Manager" OR "Talent Acquisition" OR "Managing Director" OR "Founder" OR "CEO" (for small agencies) |
| **Seniority** | Manager, Director, VP, C-Level, Owner |
| **Location** | Same as company search |

**For Lead Qual Agencies:**

| Filter | Value |
|--------|-------|
| **Job Titles** | "Founder" OR "CEO" OR "Sales Director" OR "Head of Demand Gen" OR "VP Sales" |
| **Seniority** | C-Level, VP, Owner, Founder |

**Export:** Name, job title, company, email, LinkedIn URL.

Apollo will give you direct emails for many contacts. For the rest, you'll see "personal email" or "work email likely pattern" — those you can verify with Hunter or NeverBounce.

---

### Option B: Hunter domain-search (after getting company list)

If you already have the company list (from Step 1), use your existing script:

```bash
python leads_gen/find_emails.py
```

- Reads `companies_to_enrich.csv` (segment, company_name, website).
- For each row: calls Hunter domain-search → picks contacts by title → verifies email.
- Outputs `enriched_leads.csv`.

**Job title filters in script (edit if needed):**
- Recruiters: "head of recruitment", "recruitment manager", "talent acquisition", "managing director", "founder", "ceo"
- Lead Qual: "founder", "ceo", "sales director", "head of demand", "vp sales"

---

## Step 3: Email Verification

Even if Apollo gives you an email, verify it to avoid bounces.

**Tools:**
- **Hunter Email Verifier API** (you already have this in `find_emails.py`)
- **NeverBounce / ZeroBounce** (bulk verify if you have 200+ emails)

**Rule:** Only send to emails with status `valid` or `catch_all` (use catch_all cautiously; they might bounce).

Remove `invalid`, `unknown`, and `disposable` emails from your list.

---

## Step 4: Combined output (ready for email gen)

After enrichment + verification, you should have a CSV like this:

| segment | company_name | website | contact_name | job_title | email | verification_status | linkedin_url |
|---------|--------------|---------|--------------|-----------|-------|---------------------|--------------|
| recruiters | TechRecruit Partners | techrecruit.com | Sarah Johnson | Head of Recruitment | sarah@techrecruit.com | valid | linkedin.com/in/sarahj |
| lead_qual_agencies | OutreachPro | outreachpro.com | Mike Chen | Founder & CEO | mike@outreachpro.com | valid | linkedin.com/in/mikechen |

Keep only rows where `verification_status` = `valid` (or `catch_all` if you accept the risk).

---

## Search volume and order

### Phase 1 (first batch)
- **Recruiters:** 50 companies → ~50–100 contacts (1–2 per company)
- **Lead Qual Agencies:** 50 companies → ~50–100 contacts

**Total:** 100–200 verified leads for first campaign.

### Phase 2 (scale what works)
- If recruiters respond well: scale to 200 total (add 100 more).
- If lead qual responds well: scale to 200 total.
- Add SDR teams (Search 3 above) if both are working.

---

## Apollo tips and tricks

### 1. Use "Technologies" filter to find active companies
- **Recruiters:** Companies using LinkedIn Recruiter, Greenhouse, Lever → active hiring.
- **Lead Qual / SDR:** Companies using Apollo, Outreach, SalesLoft, Instantly → they do outbound already (they'll understand the value faster).

### 2. Use "Departments" filter for size
- Filter by "Sales" or "Operations" department size to find companies with teams (not solo founders who can't afford SaaS yet).

### 3. Use "Recent Funding" filter (optional)
- Companies that raised in the last 12 months are often scaling → more budget, more pain (hiring, outbound, ops).

### 4. Export limits and credits
- Apollo free tier: limited exports per month.
- If you hit the limit: use LinkedIn Sales Navigator (company search + manual copy) or upgrade Apollo to Pro for one month to get your first 200–300 companies.

### 5. Avoid over-filtering
- Don't set too many filters at once or you'll get zero results.
- Start broad (e.g. Industry + Size + Location), then refine with Keywords.

---

## Checklist before running Apollo searches

- [ ] Sign up for Apollo.io (free tier is enough for first 100 companies; upgrade if needed).
- [ ] Decide geography: US, UK, or both (start with one for consistent outreach timing).
- [ ] Run **Company Search 1** (Recruiters) → export 50–100 companies.
- [ ] Run **Company Search 2** (Lead Qual Agencies) → export 50–100 companies.
- [ ] Add `segment` column to each CSV.
- [ ] Combine into one `companies_to_enrich.csv` (or keep separate and run enrichment twice).
- [ ] Run **People Search** (Apollo) or `find_emails.py` (Hunter) to get decision-makers.
- [ ] Verify emails (Hunter or NeverBounce).
- [ ] Output: `enriched_leads.csv` with verified contacts ready for email generation.

---

## After you have verified leads

1. **Generate emails** — Use AI (GPT-4, Claude, Gemini) with prompt: "Our offer: AI phone research. Segment: [recruiters/lead_qual]. Role: [title]. Write 3-sentence cold email."
2. **Send safely** — Warm-up (Instantly, Lemwarm), caps (50–100/day max per domain), unsubscribe link, track opens/replies.
3. **Follow up** — Day 3 and Day 7 if no reply; same AI prompt with "follow-up" context.

---

## Example Apollo search URLs (bookmark these)

**Recruiters & Staffing:**
```
https://app.apollo.io/#/companies?industryTagIds[]=5567cd4773696439b10b0000&employeeRanges[]=5,200&organizationLocations[]=United States
```

**Lead Gen Agencies:**
```
https://app.apollo.io/#/companies?industryTagIds[]=5567cd4773696439b1170000&employeeRanges[]=5,100&q_keywords=appointment%20setting%20OR%20lead%20generation
```

*(These are example structure — actual Apollo URLs will have filter IDs once you set them in the UI. Bookmark your configured searches.)*

---

## Summary

| Step | Tool | Output |
|------|------|--------|
| 1. **Company search** | Apollo (or LinkedIn, Clutch) | `companies_to_enrich.csv`: segment, company_name, website |
| 2. **Contact enrichment** | Apollo People Search OR `find_emails.py` (Hunter) | contact_name, job_title, email |
| 3. **Email verification** | Hunter / NeverBounce | verification_status (keep only `valid`) |
| 4. **Email generation** | GPT-4 / Claude / Gemini + prompt | subject, body (personalized per segment/role) |
| 5. **Send** | SendGrid / Instantly (with warm-up) | Track opens, replies, bounces |

**Start:** Recruiters (50) + Lead Qual Agencies (50) → 100–200 verified leads → first campaign → scale what responds best.

---

*This is your Apollo search strategy. Update Apollo filter values (industry IDs, keywords) as you refine your ICP and see what responds.*
