# Research SA Companies - Manual Methods

Since automated fetching requires API keys, here are manual methods to get real SA company names.

---

## Method 1: Google Places Search (Free, Fast)

1. Go to [Google Maps](https://www.google.com/maps)
2. Search for: `"[industry] companies South Africa"` or `"[industry] Johannesburg"`
3. Examples:
   - "medical aid companies South Africa"
   - "recruitment agencies Johannesburg"
   - "debt collection agencies Cape Town"
   - "estate agencies South Africa"
4. Click each result → copy company name + website
5. Paste into CSV

**Pro tip:** Use Google Maps search filters:
- Filter by "Rating" (4+ stars = established companies)
- Filter by "Open now" (active businesses)
- Look at "People also search for" for more companies

---

## Method 2: LinkedIn Company Search (Free)

1. Go to [LinkedIn](https://www.linkedin.com) → Search → Companies
2. Search: `"[industry] South Africa"`
3. Filter:
   - **Location:** South Africa
   - **Company size:** 51-200, 201-500, 501-1000, 1000+
   - **Industry:** Select relevant industry
4. Open each company → copy name + website
5. Export or copy-paste into CSV

**Pro tip:** Use LinkedIn Sales Navigator (if you have it) for better filters and export.

---

## Method 3: Industry Directories

| Directory | URL | Best For |
|-----------|-----|----------|
| **Yellow Pages SA** | https://www.yellowpages.co.za | All industries |
| **Hello Peter** | https://www.hellopeter.com | Customer service companies |
| **Clutch** | https://clutch.co | IT services, agencies |
| **G2** | https://www.g2.com | Software companies |
| **SA Business Directory** | https://www.sabusinessdirectory.co.za | General businesses |

**How to use:**
1. Search by industry/category
2. Filter by location (Johannesburg, Cape Town, etc.)
3. Copy company name + website
4. Paste into CSV

---

## Method 4: Industry Association Member Lists

| Association | Industry | URL Pattern |
|-------------|----------|-------------|
| **RECSA** | Recruitment | Search "Recruitment and Employment Confederation South Africa members" |
| **SAPOA** | Property | Search "South African Property Owners Association members" |
| **FIA** | Insurance | Search "Financial Intermediaries Association members" |
| **HASA** | Healthcare | Search "Hospital Association of South Africa members" |

**How to use:**
1. Find association website
2. Look for "Members" or "Directory" page
3. Copy company names + websites
4. Paste into CSV

---

## Method 5: Google Search Operators

Use these Google search queries (copy-paste into Google):

```
"medical aid" site:co.za
"recruitment agency" site:co.za
"debt collection" site:co.za
"estate agency" site:co.za
"market research" site:co.za
"insurance company" site:co.za
```

**How to use:**
1. Copy query → paste in Google
2. Open each result → copy company name + website
3. Paste into CSV

---

## CSV Format

Your `TOP_CONVERSION_LEADS.csv` should have these columns:

```csv
Company Name,Industry,Use Case,Why Likely to Convert,Contact Type,Estimated Size,Website,Address
```

**Example row:**
```csv
Discovery Health,Healthcare/Medical Aid,Provider network verification,Large medical aid with thousands of providers,Enterprise,5000+,https://www.discovery.co.za,Johannesburg
```

---

## Quick Research Checklist

For each industry, aim for **10-20 companies**:

- [ ] Healthcare/Medical Aid (10-15 companies)
- [ ] Recruitment/HR (10-15 companies)
- [ ] Property/Real Estate (10-15 companies)
- [ ] Debt Collection (5-10 companies)
- [ ] Market Research (5-10 companies)
- [ ] Insurance (10-15 companies)
- [ ] Banking (5-10 companies)
- [ ] E-commerce/Delivery (5-10 companies)
- [ ] Fitness/Wellness (5-10 companies)
- [ ] IT Services (5-10 companies)

**Total target: 80-120 companies**

---

## After You Have Company Names

1. **Clean the CSV** — Remove duplicates, verify websites
2. **Run enrichment** — `python find_emails.py` to get contacts
3. **Verify emails** — Keep only `verification_status = valid`
4. **Generate emails** — Use `generate_emails.py` or AI
5. **Send** — Via SendGrid/Instantly with warm-up

---

## Time Estimate

- **Manual research:** 2-4 hours for 100 companies
- **Automated (with API):** 10-20 minutes (if you have Google Places API key)

**Recommendation:** Start manual (Google Maps + LinkedIn) for first 50 companies to validate approach, then automate if needed.
