# How to get company names (and websites)

You need a list of **company_name** + **website** (and **segment**) before running `find_emails.py`. Here are practical ways to get that list.

---

## Option 1: Apollo.io (fastest if you have an account)

Apollo has a **Company Search**. You get company name + website in one place and can export to CSV.

1. Go to [apollo.io](https://apollo.io) → **Search** → **Companies**.
2. Set filters, for example:
   - **Industry:** Staffing & Recruiting, or Human Resources, or Marketing & Advertising (for lead gen agencies).
   - **Keywords:** “recruitment agency”, “staffing”, “appointment setting”, “lead generation”.
   - **Company size:** 11–200 (or 51–200 for slightly bigger).
   - **Location:** Your target country/region.
3. Run search. Apollo shows company name, website (domain), often employee count.
4. **Export:** Use Apollo’s export (CSV). You’ll get columns like Company Name, Website.
5. In Excel/Sheets: add a column **segment** (e.g. `recruiters` or `lead_qual_agencies`), and make sure you have **segment, company_name, website** to match `companies_to_enrich.csv`. Copy those columns into `companies_to_enrich.csv`.

**Tip:** Do one search per segment (e.g. “recruitment agency” → segment `recruiters`; “appointment setting agency” → segment `lead_qual_agencies`), then combine into one CSV.

---

## Option 2: LinkedIn (manual but free)

1. **LinkedIn** → **Search** → **Companies** (or **All** and filter by Companies).
2. Search: e.g. “recruitment agency”, “staffing agency”, “lead generation agency”.
3. Optional: use **Filters** → Industry (Staffing, HR, etc.) and Headcount.
4. Open each company page; copy **Company name** and **Website** (from “About” or the company’s LinkedIn page).
5. Paste into a sheet with columns **segment, company_name, website**, then save as CSV and copy into `companies_to_enrich.csv`.

**Faster:** Use LinkedIn Sales Navigator if you have it — company search + export. Or use a Chrome extension that pulls company name + URL from search results (use within LinkedIn’s ToS).

---

## Option 3: Directories (Clutch, G2, industry lists)

| Directory | Best for | How to get names + site |
|-----------|----------|---------------------------|
| **Clutch** | Agencies (marketing, lead gen, staffing) | Search “lead generation”, “recruitment”, etc. → each listing has company name + link to site. Manually or with a scraper copy name + URL. |
| **G2** | Software + some agencies | Similar: search category, open profile, get company name + website. |
| **Industry associations** | Recruiters, staffing | e.g. REC (UK), ASA (US staffing). Member lists often have company name + website. |
| **Google** | Any segment | Search “recruitment agencies [city]” or “appointment setting companies”. Open each result, copy business name + website into your sheet. |

Export or paste into a spreadsheet with **segment, company_name, website**, then into `companies_to_enrich.csv`.

---

## Option 4: Script with Apollo API (automated)

If you have an **Apollo API key**, we can add a small script that:

- Calls Apollo’s **Company Search API** with filters (industry, keywords, size),
- Gets company name + domain for each result,
- Writes `companies_to_enrich.csv` (or appends to it) with segment.

That way you get company names + websites without manual copy-paste. If you want this, we can add `fetch_companies_apollo.py` and document the required env var and filters.

---

## Summary

| Method | Effort | Output |
|--------|--------|--------|
| **Apollo.io** (export from UI) | Low | company_name, website; you add segment. |
| **LinkedIn** (manual or Sales Nav) | Medium | Same. |
| **Clutch / G2 / Google** | Medium | Same; copy from directory or search. |
| **Apollo API script** | Low once set up | CSV with segment, company_name, website. |

**Recommended start:** Use **Apollo Company Search** (or LinkedIn) for 50–100 companies in “recruiters” and “lead_qual_agencies”, export or paste into a sheet, add **segment**, then save as `companies_to_enrich.csv` and run `find_emails.py`.
