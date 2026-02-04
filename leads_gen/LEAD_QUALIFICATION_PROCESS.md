# Lead Qualification Process — Zero Bounce, High Conversion

**Goal:** Only contact qualified leads with verified emails to maximize conversion and protect sender reputation.

**Target:** 2-5% lead → customer conversion (not 2% from unqualified leads)

---

## Core Principle: Quality Over Quantity

**Better to contact 500 highly qualified leads than 2,550 unqualified ones.**

- **Qualified lead:** Right company, right person, verified email, clear need
- **Unqualified lead:** Wrong company, wrong person, unverified email, unclear need

---

## Stage 1: Company Qualification (Before Apollo Export)

### ✅ Must-Have Criteria

| Criteria | Requirement | Why |
|----------|-------------|-----|
| **Industry Fit** | Lead gen, telemarketing, market research, appointment setting, recruitment | These companies make 50+ calls/day |
| **Company Size** | 10-200 employees | Too small = no budget. Too large = slow sales cycle |
| **Location** | South Africa (or your target market) | Local numbers, ZAR pricing, same timezone |
| **Call Volume** | Makes 50+ outbound calls/day (verify via website, LinkedIn, job postings) | Must have volume to justify cost |
| **Technology Signals** | Uses Apollo, Outreach, SalesLoft, dialer software, CRM | Shows active outbound operations |

### ❌ Disqualify If

- Company doesn't make outbound calls (e.g., only inbound support)
- Too small (< 5 employees) — likely can't afford R2,999+/month
- Too large (> 500 employees) — enterprise sales cycle (6+ months)
- Wrong industry (e.g., retail, restaurants) — not our ICP
- No website or LinkedIn presence — can't verify legitimacy

### Apollo Search Filters (Use These)

```
Industry: Marketing & Advertising, Business Services, Staffing & Recruiting
Keywords: "appointment setting" OR "lead generation" OR "telemarketing" OR "outbound calling"
Company Size: 10-200 employees
Location: South Africa
Technologies: Apollo.io, Outreach, SalesLoft, Instantly, Dialer software
```

**Export:** Company Name, Website, Employee Count, Location, Industry, Technologies

---

## Stage 2: Contact Qualification (Decision-Maker)

### ✅ Target Job Titles (Priority Order)

**Tier 1 (Best — Decision Makers):**
- Founder / CEO / Owner
- Managing Director
- Head of Sales / Sales Director
- VP Sales / VP Operations

**Tier 2 (Good — Can Influence):**
- Head of Recruitment / Talent Acquisition Manager
- Operations Manager / Head of Operations
- Demand Generation Manager
- Sales Manager / Team Lead

**Tier 3 (Avoid — Not Decision Makers):**
- Individual Contributor (SDR, Recruiter, Caller)
- Junior roles (Coordinator, Assistant)
- Support staff

### ❌ Disqualify If

- Not a decision-maker (can't approve R2,999+/month spend)
- Wrong department (e.g., IT, Finance — not responsible for calling operations)
- Generic email (info@, hello@, contact@) — no personal connection

---

## Stage 3: Email Verification (ZERO BOUNCE RULE)

### ✅ Email Verification Requirements

**MANDATORY:** Every email MUST be verified before sending.

| Status | Action | Notes |
|--------|--------|-------|
| **`valid`** | ✅ USE | Email exists and is deliverable |
| **`catch_all`** | ⚠️ USE WITH CAUTION | Domain accepts all emails (may bounce) |
| **`invalid`** | ❌ REJECT | Email doesn't exist — will bounce |
| **`unknown`** | ❌ REJECT | Can't verify — don't risk bounce |
| **`disposable`** | ❌ REJECT | Temporary email — not a real contact |
| **`role`** | ⚠️ USE IF QUALIFIED | info@, sales@ — only if decision-maker |

### Verification Tools

1. **Hunter.io Email Verifier** (already in `find_emails.py`)
   - API: `https://api.hunter.io/v2/email-verifier`
   - Status: `valid`, `invalid`, `catch_all`, `unknown`, `disposable`
   - **Cost:** ~R0.10 per verification

2. **Apollo Built-in Verification** (if using Apollo)
   - Apollo shows email confidence score
   - Use only emails with "High" or "Medium" confidence
   - Still verify with Hunter for critical campaigns

3. **NeverBounce / ZeroBounce** (bulk verification)
   - For 500+ emails at once
   - **Cost:** ~R0.05-0.10 per email
   - Better for large batches

### Verification Process

```python
# In find_emails.py - already implemented
verification_status = hunter_verify_email(email)

# Only keep if status is "valid" or "catch_all"
if verification_status not in ("valid", "catch_all"):
    SKIP_THIS_LEAD
```

### Pre-Send Verification Checklist

Before importing to email tool (Instantly, SendGrid):
- [ ] All emails verified (`valid` or `catch_all` only)
- [ ] No `invalid`, `unknown`, or `disposable` emails
- [ ] Remove duplicates
- [ ] Check for role emails (info@, hello@) — only keep if decision-maker

---

## Stage 4: Intent Qualification (Before Demo)

### ✅ High-Intent Signals

| Signal | Score | Why |
|--------|-------|-----|
| **Makes 100+ calls/day** | +3 | High volume = clear ROI |
| **Currently hiring callers** | +2 | Pain point: hiring is expensive |
| **Uses outbound tools** (Apollo, Outreach) | +2 | Understands value of automation |
| **Recent funding / growth** | +1 | Has budget, scaling operations |
| **Multiple locations** | +1 | Needs consistency across sites |
| **Replied to email** | +3 | Shows interest |
| **Booked demo themselves** | +3 | High intent |

### ❌ Low-Intent Signals (Disqualify or Deprioritize)

- Makes < 20 calls/day (too low volume)
- No outbound operations (wrong fit)
- No budget signals (small company, no growth)
- Generic inquiry (not specific to their use case)
- Wrong contact (forwarded to someone else)

### Qualification Questions (Pre-Demo)

Before booking a demo, ask:

1. **"How many outbound calls does your team make per day/week?"**
   - < 20/day → Not qualified (too low volume)
   - 20-50/day → Qualified for Starter/Growth
   - 50-200/day → Qualified for Growth/Pro
   - 200+/day → Qualified for Pro/Enterprise

2. **"What's your current process for outbound calling?"**
   - Manual dialing → High pain, good fit
   - Using dialer software → Good fit (understands automation)
   - Outsourced to BPO → Good fit (we're cheaper)

3. **"Who makes the decision on tools/software for your calling operations?"**
   - "Me" → Decision-maker, qualified
   - "My manager" → Get manager's contact
   - "Not sure" → Low intent, deprioritize

---

## Stage 5: Final Qualification Score

### Lead Scoring System

**Minimum Score: 6/10 to qualify**

| Factor | Points |
|--------|--------|
| **Company Fit** | |
| - Right industry (lead gen, telemarketing, etc.) | +2 |
| - 10-200 employees | +1 |
| - Makes 50+ calls/day (verified) | +2 |
| **Contact Fit** | |
| - Decision-maker (Founder/CEO/Director) | +2 |
| - Right department (Sales/Ops/Recruitment) | +1 |
| **Email Quality** | |
| - Verified `valid` email | +1 |
| - Personal email (not role-based) | +1 |
| **Intent Signals** | |
| - Replied to email | +2 |
| - Booked demo themselves | +2 |
| - Uses outbound tools | +1 |
| - Currently hiring callers | +1 |

**Total Possible:** 15 points

**Qualification Thresholds:**
- **8-10 points:** High priority — book demo immediately
- **6-7 points:** Qualified — can book demo
- **4-5 points:** Low priority — nurture with content first
- **< 4 points:** Disqualify — not a fit

---

## Complete Qualification Workflow

### Step 1: Apollo Company Search
1. Use filters from Stage 1 (Industry, Size, Location, Technologies)
2. Export 50-100 companies per search
3. Review each company:
   - Check website — do they make outbound calls?
   - Check LinkedIn — do they have a sales/calling team?
   - Check job postings — are they hiring callers?
4. **Remove companies that don't fit** before moving to Step 2

**Output:** `qualified_companies.csv` (segment, company_name, website, employee_count, location)

### Step 2: Contact Enrichment
1. Run Apollo People Search OR `find_emails.py` (Hunter)
2. Target decision-makers only (Founder, CEO, Director, VP)
3. Get 1-2 contacts per company (max)
4. **Skip if no decision-maker found**

**Output:** `contacts_found.csv` (company_name, contact_name, job_title, email)

### Step 3: Email Verification (CRITICAL)
1. Verify EVERY email with Hunter/NeverBounce
2. **Only keep `valid` emails** (or `catch_all` if you accept risk)
3. Remove `invalid`, `unknown`, `disposable`
4. Check email format:
   - ✅ `firstname.lastname@company.com`
   - ✅ `firstname@company.com`
   - ⚠️ `info@company.com` (only if decision-maker)
   - ❌ `contact@company.com` (reject)

**Output:** `verified_leads.csv` (all columns + verification_status = `valid`)

### Step 4: Lead Scoring
1. Score each lead using Stage 5 scoring system
2. Sort by score (highest first)
3. **Only contact leads with score ≥ 6**

**Output:** `qualified_leads.csv` (sorted by score, filtered to ≥ 6)

### Step 5: Email Generation
1. Run `generate_emails.py` with `--verified-only` flag
2. Only generates emails for verified, qualified leads
3. Personalize by segment and job title

**Output:** `emails_ready.csv` (ready for Instantly/SendGrid)

### Step 6: Pre-Send Final Check
Before importing to email tool:
- [ ] All emails verified (`valid` status)
- [ ] All leads scored ≥ 6
- [ ] No duplicates
- [ ] Personal emails only (no generic role emails unless decision-maker)
- [ ] Correct segment labels for personalization

---

## Quality Metrics to Track

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Email Bounce Rate** | < 1% | Track bounces in email tool |
| **Open Rate** | > 30% | Track opens in email tool |
| **Reply Rate** | > 5% | Track replies |
| **Demo Booking Rate** | > 20% (of replies) | Track demo bookings |
| **Lead → Customer Conversion** | 2-5% | Track from lead to paying customer |

**If bounce rate > 1%:** Stop and fix verification process.

---

## Apollo Zero-Bounce Checklist

### Before Exporting from Apollo:

- [ ] Company fits ICP (industry, size, location)
- [ ] Company makes outbound calls (verified via website/LinkedIn)
- [ ] Contact is decision-maker (Founder/CEO/Director/VP)
- [ ] Email confidence in Apollo is "High" or "Medium"
- [ ] Email is personal (not generic role email)

### After Export:

- [ ] Verify ALL emails with Hunter/NeverBounce
- [ ] Remove any `invalid`, `unknown`, `disposable` emails
- [ ] Score each lead (minimum 6/10)
- [ ] Remove low-score leads (< 6)
- [ ] Check for duplicates
- [ ] Final review: Would I want to receive this email?

### Before Sending:

- [ ] All emails verified (`valid` status)
- [ ] All leads qualified (score ≥ 6)
- [ ] Email is personalized (segment, company, name)
- [ ] Subject line is relevant (not generic)
- [ ] Unsubscribe link included
- [ ] Sender domain warmed up (if new domain)

---

## Tools & Setup

### Required Tools

1. **Apollo.io** — Company & contact search
   - Pro plan: R500/month (for exports)
   - Use filters to find qualified companies

2. **Hunter.io** — Email verification
   - API: `HUNTER_API_KEY` in `.env`
   - Cost: ~R0.10 per verification
   - Already integrated in `find_emails.py`

3. **NeverBounce / ZeroBounce** (optional for bulk)
   - Bulk verification for 500+ emails
   - Cost: ~R0.05-0.10 per email

4. **Email Tool** (Instantly, SendGrid, etc.)
   - For sending campaigns
   - Track bounces, opens, replies

### Environment Variables

Add to `.env`:
```env
HUNTER_API_KEY=your_hunter_api_key
APOLLO_API_KEY=your_apollo_api_key  # if using API
NEVERBOUNCE_API_KEY=your_key  # optional
```

---

## Example: Qualified vs Unqualified Lead

### ✅ Qualified Lead (Score: 9/10)

- **Company:** "LeadGen Pro" — Appointment setting agency
- **Size:** 45 employees
- **Location:** Cape Town, South Africa
- **Call Volume:** Makes 200+ calls/day (verified via website)
- **Contact:** Sarah Johnson, Founder & CEO
- **Email:** sarah.johnson@leadgenpro.co.za
- **Verification:** `valid` ✅
- **Intent:** Currently hiring 3 callers (LinkedIn job post)
- **Tools:** Uses Apollo.io, Outreach (verified)

**Action:** ✅ Contact immediately — high priority

### ❌ Unqualified Lead (Score: 3/10)

- **Company:** "Retail Solutions" — Retail store chain
- **Size:** 150 employees
- **Location:** Johannesburg, South Africa
- **Call Volume:** Unknown — no outbound operations
- **Contact:** John Smith, IT Manager
- **Email:** john.smith@retailsolutions.co.za
- **Verification:** `valid` ✅
- **Intent:** No signals of outbound calling need
- **Tools:** None related to outbound

**Action:** ❌ Disqualify — wrong industry, wrong contact, no need

---

## Quick Reference: Qualification Checklist

**Before contacting a lead, verify:**

- [ ] ✅ Company makes outbound calls (50+ calls/day)
- [ ] ✅ Right industry (lead gen, telemarketing, etc.)
- [ ] ✅ Right size (10-200 employees)
- [ ] ✅ Right location (South Africa)
- [ ] ✅ Decision-maker contact (Founder/CEO/Director/VP)
- [ ] ✅ Email verified (`valid` status)
- [ ] ✅ Lead score ≥ 6/10
- [ ] ✅ Personal email (not generic role email)
- [ ] ✅ No duplicates in campaign

**If all checked:** ✅ Qualified — proceed to email generation

**If any unchecked:** ❌ Disqualify or fix before proceeding

---

## Expected Results with Proper Qualification

### Without Qualification (Current Plan):
- 2,550 leads → 510 demos → 50 customers
- Conversion: 2%
- Bounce rate: Unknown (risky)

### With Proper Qualification:
- 1,000 qualified leads → 300 demos → 50 customers
- Conversion: 5% (2.5x improvement)
- Bounce rate: < 1%
- **Result:** 60% fewer leads needed, higher conversion, better sender reputation

---

## Next Steps

1. **Update Apollo searches** — Use stricter filters (Stage 1)
2. **Update `find_emails.py`** — Ensure it only keeps `valid` emails
3. **Add lead scoring** — Create scoring script or manual process
4. **Test with small batch** — 50 qualified leads, measure results
5. **Iterate** — Adjust qualification criteria based on what converts

---

**Remember:** One qualified lead is worth 5 unqualified leads. Focus on quality, not quantity.
