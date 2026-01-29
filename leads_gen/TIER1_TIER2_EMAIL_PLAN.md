# Tier 1 & Tier 2 — Target Segments + Find-Emails Plan

We run outreach for **Tier 1** and **Tier 2** only. This doc defines who to find (job titles, company types) and how we’ll get their emails before we send anything.

---

## 1. Segments we’re targeting

| Tier | Segment | Focus |
|------|---------|--------|
| **1** | Recruiters & staffing | Tech recruiters, volume staffing, RPOs |
| **1** | Sales / SDR teams | SMB, growth-stage; outbound B2B |
| **1** | Local / multi-location | Franchises, multi-site clinics, retail; HQ/ops |
| **1** | Lead qual / appointment setting | Agencies or in-house BDR teams |
| **2** | Market research / panel | Phone surveys, research calls |
| **2** | Real estate | Where cold calling is allowed |
| **2** | SaaS / tech | Customer research, feedback calls |

---

## 2. Who to find (ICP per segment)

For each segment: **job titles** and **company type/size** so we know who to search for and enrich.

### Tier 1

**2.1 Recruiters & staffing**

| | |
|---|---|
| **Job titles** | Head of Recruitment, Recruitment Manager, Talent Acquisition Lead, Staffing Manager, Managing Director (agency), Principal/Partner (recruitment firm), RPO Lead |
| **Company type** | Recruitment agencies, staffing firms, RPOs, tech recruiters |
| **Size** | 5–200 employees; or solo/small teams with high volume |
| **Signals** | Hiring posts, “we’re hiring” on site, LinkedIn recruiter activity |

**2.2 Sales / SDR teams**

| | |
|---|---|
| **Job titles** | VP Sales, Head of Sales, Sales Director, SDR Manager, Head of Growth, Outbound Lead |
| **Company type** | B2B SaaS, sales-led companies, SMBs with outbound motion |
| **Size** | 20–500 employees; sales team 2–50 |
| **Signals** | Outbound tools (Apollo, Outreach, etc.), job posts for SDRs/BDRs |

**2.3 Local / multi-location**

| | |
|---|---|
| **Job titles** | Operations Manager, Regional Manager, Head of Operations, Franchise Operations, Multi-Site Manager |
| **Company type** | Franchises, multi-location clinics (dental, medical, vet), retail chains, multi-branch services |
| **Size** | 10–500 locations or 50–2000 employees |
| **Signals** | “Locations” or “Find us” with many sites; franchise/network language |

**2.4 Lead qual / appointment setting**

| | |
|---|---|
| **Job titles** | Founder, CEO, Sales Director, Head of Demand Gen, Appointment Setting Lead |
| **Company type** | Lead gen agencies, appointment-setting agencies, B2B demand-gen shops |
| **Size** | 5–100 employees |
| **Signals** | “Appointment setting,” “lead qualification,” “outbound” on website |

### Tier 2

**2.5 Market research / panel**

| | |
|---|---|
| **Job titles** | Research Director, Head of Research, Project Director (research), Operations Manager |
| **Company type** | Market research firms, panel providers, survey/phone research vendors |
| **Size** | 20–500 employees |
| **Signals** | “Phone surveys,” “CATI,” “market research” |

**2.6 Real estate**

| | |
|---|---|
| **Job titles** | Broker/Owner, Team Lead, Director of Sales, Head of Prospecting |
| **Company type** | Real estate agencies, teams doing cold calling for listings/leads |
| **Size** | 5–200 agents |
| **Signals** | Check local rules (DNC, consent); target regions where cold calling is allowed |

**2.7 SaaS / tech (customer research)**

| | |
|---|---|
| **Job titles** | Head of Product, VP Customer Success, Research Lead, Head of Voice of Customer |
| **Company type** | B2B SaaS, product-led or sales-led tech companies |
| **Size** | 50–500 employees |
| **Signals** | “Customer interviews,” “user research,” “feedback” |

---

## 3. Combined “who to find” list (for search/enrichment)

Use these when building lead lists and when configuring enrichment (e.g. Apollo, Hunter).

**Job titles (one list):**

- Head of Recruitment, Recruitment Manager, Talent Acquisition Lead  
- Staffing Manager, Managing Director, Principal, Partner (recruitment)  
- VP Sales, Head of Sales, Sales Director, SDR Manager, Head of Growth, Outbound Lead  
- Operations Manager, Regional Manager, Head of Operations, Franchise Operations, Multi-Site Manager  
- Founder, CEO, Sales Director, Head of Demand Gen (agencies)  
- Research Director, Head of Research, Project Director (research)  
- Broker/Owner, Team Lead, Director of Sales (real estate)  
- Head of Product, VP Customer Success, Research Lead, Head of Voice of Customer  

**Company keywords / filters:**

- Recruitment agency, staffing, RPO, tech recruiting  
- B2B SaaS, outbound sales, SDR team  
- Franchise, multi-location, multi-site, [industry] chain  
- Lead gen agency, appointment setting, demand gen agency  
- Market research, panel, phone surveys, CATI  
- Real estate agency, real estate team  
- B2B SaaS, customer success, product research  

---

## 4. Find-emails plan (sources → enrich → verify)

Same flow for Tier 1 and Tier 2; we just filter by segment when building lists.

### Step 1: Build company list (per segment)

| Source | How | Output |
|--------|-----|--------|
| **LinkedIn** | Search by industry + company size; or use Sales Nav / Apollo company search | Company name, URL, size, industry |
| **Directories** | Clutch, G2 (agencies); industry directories (franchises, recruiters) | Company name, website, sometimes contact |
| **Apollo / Hunter / Clearbit** | Company search by filters (industry, size, keywords) | Company name, domain, employee count |
| **Our own scrape** | If we have a script: e.g. “recruitment agencies + city” → list of sites | Company name, website |

**Output:** One list per segment (or one master list with a “segment” column). Columns: company_name, website, segment, employee_count, country/region.

### Step 2: Get contacts (enrichment)

| Tool | Use | Output |
|------|-----|--------|
| **Apollo** | Search by job title + company domain or name | Name, title, email, LinkedIn |
| **Hunter** | Domain + role; or bulk find emails for domain | Email, first/last name, position |
| **Clearbit** | Company domain → people by role | Name, email, title |
| **LinkedIn** | Manual or Sales Nav: find people at those companies with target titles | Name, title; then enrich email via Apollo/Hunter |

**Output:** Rows: company_name, segment, contact_name, job_title, email, linkedin_url (optional). One decision-maker (or 2) per company for first campaign.

### Step 3: Verify emails (before send)

| Tool | Use |
|------|-----|
| **Hunter** | Email verification API |
| **NeverBounce / ZeroBounce** | Bulk verify; remove invalid/catch-all where possible |

**Rule:** Only send to verified or high-confidence emails. Remove bounces from list and from future sends.

### Step 4: Volume and order

- **Start:** 50–100 leads per segment (e.g. 50 recruiters, 50 SDR teams).  
- **Order:** Tier 1 first (recruiters + lead qual agencies are easiest; then SDR, then multi-location). Then Tier 2.  
- **After first batch:** Scale the segment that replies best.

---

## 5. Checklist before we run “find emails”

- [ ] Pick 1–2 segments to start (e.g. Recruiters + Lead qual agencies).  
- [ ] Define geography (e.g. US, UK, or “English-speaking”).  
- [ ] Sign up for at least one enrichment tool (Apollo free tier, Hunter, etc.).  
- [ ] Build company list (50–100 companies) for chosen segment(s).  
- [ ] Enrich contacts (name, title, email).  
- [ ] Verify emails.  
- [ ] Export to CSV/sheet for email gen + send.

---

## 6. Next steps after we have emails

1. **Generate email** — Use LEADS_GEN_PLAN.md: our offer + their segment/role → subject + body.  
2. **Send safely** — Same doc: warm-up, sending infra, caps, unsubscribe.  
3. **Track** — Opens, replies, bounces; refine segment and copy.

---

*Summary: Tier 1 + Tier 2 are locked. This doc defines who to find (titles, company types) and the find-emails flow (company list → enrich → verify). Run that first; then generate and send.*
