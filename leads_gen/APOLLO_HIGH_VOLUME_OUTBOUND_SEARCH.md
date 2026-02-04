# Apollo Search Plan - High Volume Outbound Call Companies

**Goal:** Find 100-200 real SA companies that make lots of outbound calls and would benefit from Intellidial.

**Target Profile:**
- Companies that make 50+ outbound calls per day
- Service is core to their business (not just occasional)
- Low compliance risk (not heavily regulated)
- Small-medium size (10-200 employees) for faster decisions
- Clear ROI: saves time and money

---

## Search Strategy Overview

**Total searches:** 8-10 searches across different industries/use cases
**Companies per search:** 20-30 companies
**Total target:** 150-200 companies

---

## Search 1: Lead Generation & Appointment Setting Agencies

**Why:** These companies make hundreds of calls daily - core business is outbound calling.

**Apollo Filters:**
| Filter | Value |
|-------|-------|
| **Industry** | Marketing & Advertising, Business Services |
| **Keywords** | "appointment setting" OR "lead generation" OR "demand generation" OR "outbound agency" |
| **Company Size** | 10-200 employees |
| **Location** | South Africa |
| **Technologies (optional)** | Apollo.io, Outreach, SalesLoft, Instantly (shows they do outbound) |

**Expected results:** 20-30 companies

**Export columns:** Company Name, Website, Employee Count, Location, Industry

**Label in CSV:** `segment = "lead_gen_appointment_setting"`

---

## Search 2: Telemarketing & Cold Calling Services

**Why:** Telemarketing companies make outbound calls as their primary service.

**Apollo Filters:**
| Filter | Value |
|-------|-------|
| **Industry** | Business Services, Marketing & Advertising |
| **Keywords** | "telemarketing" OR "cold calling" OR "telesales" OR "outbound calling" |
| **Company Size** | 10-200 employees |
| **Location** | South Africa |
| **Technologies (optional)** | Dialer software, CRM (shows active calling) |

**Expected results:** 15-25 companies

**Export columns:** Company Name, Website, Employee Count, Location

**Label in CSV:** `segment = "telemarketing"`

---

## Search 3: Market Research & Fieldwork Companies

**Why:** They conduct phone surveys - high volume calling for data collection.

**Apollo Filters:**
| Filter | Value |
|-------|-------|
| **Industry** | Market Research, Business Services |
| **Keywords** | "market research" OR "fieldwork" OR "phone surveys" OR "data collection" |
| **Company Size** | 10-200 employees |
| **Location** | South Africa |
| **Technologies (optional)** | Survey tools, data collection software |

**Expected results:** 15-25 companies

**Export columns:** Company Name, Website, Employee Count, Location

**Label in CSV:** `segment = "market_research"`

---

## Search 4: Customer Onboarding & Welcome Call Services

**Why:** Companies that call every new customer for onboarding.

**Apollo Filters:**
| Filter | Value |
|-------|-------|
| **Industry** | Business Services, Customer Service, BPO |
| **Keywords** | "customer onboarding" OR "welcome calls" OR "account setup" OR "new customer calls" |
| **Company Size** | 20-200 employees |
| **Location** | South Africa |
| **Technologies (optional)** | CRM, customer success tools |

**Expected results:** 10-20 companies

**Export columns:** Company Name, Website, Employee Count, Location

**Label in CSV:** `segment = "customer_onboarding"`

---

## Search 5: Follow-up & Customer Feedback Services

**Why:** Companies that make post-service follow-up calls.

**Apollo Filters:**
| Filter | Value |
|-------|-------|
| **Industry** | Business Services, Customer Service, BPO |
| **Keywords** | "follow-up calls" OR "customer feedback" OR "satisfaction surveys" OR "post-service calls" |
| **Company Size** | 20-200 employees |
| **Location** | South Africa |

**Expected results:** 15-25 companies

**Export columns:** Company Name, Website, Employee Count, Location

**Label in CSV:** `segment = "follow_up_feedback"`

---

## Search 6: Appointment Reminder & Booking Services

**Why:** Companies that call to confirm/remind about appointments.

**Apollo Filters:**
| Filter | Value |
|-------|-------|
| **Industry** | Healthcare, Beauty & Wellness, Business Services |
| **Keywords** | "appointment reminders" OR "appointment booking" OR "appointment confirmation" |
| **Company Size** | 10-200 employees |
| **Location** | South Africa |
| **Technologies (optional)** | Booking software, scheduling tools |

**Expected results:** 20-30 companies

**Export columns:** Company Name, Website, Employee Count, Location

**Label in CSV:** `segment = "appointment_reminders"`

---

## Search 7: Data Verification & Database Cleanup Services

**Why:** Companies that call to verify/update database records.

**Apollo Filters:**
| Filter | Value |
|-------|-------|
| **Industry** | Business Services, Data Management, Marketing |
| **Keywords** | "data verification" OR "database cleanup" OR "contact verification" OR "data enrichment" |
| **Company Size** | 10-100 employees |
| **Location** | South Africa |

**Expected results:** 10-20 companies

**Export columns:** Company Name, Website, Employee Count, Location

**Label in CSV:** `segment = "data_verification"`

---

## Search 8: Property & Listing Verification Services

**Why:** Companies that call to verify property listings.

**Apollo Filters:**
| Filter | Value |
|-------|-------|
| **Industry** | Real Estate, Business Services |
| **Keywords** | "property verification" OR "listing verification" OR "estate verification" |
| **Company Size** | 10-100 employees |
| **Location** | South Africa |

**Expected results:** 10-15 companies

**Export columns:** Company Name, Website, Employee Count, Location

**Label in CSV:** `segment = "property_verification"`

---

## Search 9: BPO & Call Centre Services (Outbound)

**Why:** BPO companies with outbound calling services.

**Apollo Filters:**
| Filter | Value |
|-------|-------|
| **Industry** | Business Services, BPO, Customer Service |
| **Keywords** | "BPO" OR "call centre" OR "contact centre" AND "outbound" |
| **Company Size** | 50-200 employees |
| **Location** | South Africa |
| **Technologies (optional)** | Call centre software, dialer systems |

**Expected results:** 15-25 companies

**Export columns:** Company Name, Website, Employee Count, Location

**Label in CSV:** `segment = "bpo_outbound"`

---

## Search 10: Sales Development & Lead Qualification Services

**Why:** Companies that qualify leads via outbound calls.

**Apollo Filters:**
| Filter | Value |
|-------|-------|
| **Industry** | Sales, Marketing & Advertising, Business Services |
| **Keywords** | "lead qualification" OR "SDR services" OR "sales development" OR "lead scoring" |
| **Company Size** | 10-100 employees |
| **Location** | South Africa |
| **Technologies (optional)** | Sales automation, CRM, lead scoring tools |

**Expected results:** 15-25 companies

**Export columns:** Company Name, Website, Employee Count, Location

**Label in CSV:** `segment = "lead_qualification"`

---

## Execution Steps

### Step 1: Set Up Apollo
- [ ] Sign up/login to Apollo.io
- [ ] Upgrade to Pro if needed (for more exports)
- [ ] Set default location filter to "South Africa"

### Step 2: Run Each Search
For each search above:
1. [ ] Go to Apollo → Search → Companies
2. [ ] Apply filters from the table
3. [ ] Review results (check company descriptions match)
4. [ ] Export 20-30 companies per search
5. [ ] Add `segment` column with the label from the search
6. [ ] Save as separate CSV or combine into one

### Step 3: Combine & Clean
- [ ] Combine all exports into one CSV
- [ ] Remove duplicates (by company name or website)
- [ ] Verify websites exist (quick check)
- [ ] Remove companies that don't fit criteria
- [ ] Final CSV: `apollo_high_volume_outbound.csv`

### Step 4: Enrich with Contacts
- [ ] Use Apollo People Search or `find_emails.py`
- [ ] Find decision-makers (Founder, CEO, Sales Director, Operations Manager)
- [ ] Export contacts with emails
- [ ] Verify emails (Hunter or Apollo)

---

## Apollo Tips

### 1. Use Multiple Keyword Searches
If one search returns too few results, try variations:
- "appointment setting" → also try "appointment booking", "meeting scheduling"
- "lead generation" → also try "demand generation", "lead gen"

### 2. Use Technologies Filter Strategically
Companies using these tools are actively doing outbound:
- **Apollo.io** - They use lead gen tools (understand the value)
- **Outreach, SalesLoft** - Sales automation (they do outbound)
- **Dialer software** - Active calling operations
- **CRM** - Managing customer relationships (likely calling)

### 3. Company Size Sweet Spot
- **10-50 employees:** Very agile, fast decisions, but may have limited budget
- **51-200 employees:** Best balance - established enough to pay, agile enough to decide quickly

### 4. Location Refinement
- Start broad: "South Africa"
- If too many results: Filter by city (Johannesburg, Cape Town)
- If too few: Expand to "South Africa" + nearby countries

### 5. Export Limits
- Apollo free tier: Limited exports per month
- If you hit limit: Export in batches, or upgrade for one month
- Alternative: Use LinkedIn Sales Navigator + manual copy

---

## Expected Results Summary

| Search | Target Companies | Priority |
|--------|------------------|----------|
| Lead Gen/Appointment Setting | 20-30 | **HIGHEST** - Core business is calling |
| Telemarketing/Cold Calling | 15-25 | **HIGHEST** - Primary service |
| Market Research | 15-25 | **HIGH** - High volume survey calls |
| Customer Onboarding | 10-20 | **HIGH** - Call every new customer |
| Follow-up/Feedback | 15-25 | **MEDIUM** - Post-service calls |
| Appointment Reminders | 20-30 | **MEDIUM** - Regular reminder calls |
| Data Verification | 10-20 | **MEDIUM** - Verification calls |
| Property Verification | 10-15 | **LOWER** - Niche use case |
| BPO Outbound | 15-25 | **HIGH** - Large call volumes |
| Lead Qualification | 15-25 | **HIGH** - Qualify leads via calls |

**Total target: 150-200 companies**

---

## After Export: Next Steps

1. **Clean the data:**
   - Remove duplicates
   - Verify websites
   - Check company descriptions match criteria

2. **Enrich with contacts:**
   - Use Apollo People Search
   - Or run `find_emails.py` with the company list
   - Target titles: Founder, CEO, Sales Director, Operations Manager

3. **Prioritize:**
   - Start with Search 1-3 (Lead Gen, Telemarketing, Market Research) - highest need
   - These companies make the most calls and will see immediate ROI

4. **Generate emails:**
   - Use `generate_emails.py` or AI
   - Focus on time/money saved, call volume they handle

---

## Alternative: If Apollo Doesn't Work

**LinkedIn Sales Navigator:**
- Same search queries
- Filter: Location = South Africa, Company size = 10-200
- Export or manual copy company names + websites

**Google Search:**
- Use queries from searches above
- Visit each company website
- Copy company name + website into CSV

**Yellow Pages SA:**
- Search by category
- Filter by location
- Extract company names + websites

---

**Start with Search 1 (Lead Gen/Appointment Setting) - these are your highest-value targets.**
