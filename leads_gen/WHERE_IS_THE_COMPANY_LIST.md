# Where is the list from company discovery?

The **company discovery list** is not a file in this repo yet. It comes from **Apollo** (or another source) and either stays in Apollo or gets exported into the repo.

---

## Where the list lives

| Where | What |
|-------|------|
| **In Apollo** | After you run **Search → People** or **Search → Companies** with your filters (job titles, industry, location), Apollo shows matching leads. You **save** them to a **List** or **Saved people** / **Saved companies**. That *is* your company discovery list — it lives in Apollo until you export it. |
| **In this repo** | We only have **`companies_to_enrich.csv`** with **2 example rows** (placeholders). There is no real list file yet until you create one (see below). |

So: **you haven’t seen the list in the repo because it doesn’t exist here yet.** It’s either in Apollo (saved search results / lists) or you still need to run the search and export.

---

## How to get the list

### Option A: Use Apollo only (no CSV in repo)

1. In Apollo go to **Prospect & enrich → People** (or **Companies**).
2. Apply filters (e.g. job title: Recruitment Manager, Head of Sales; industry: Staffing & Recruiting; location: US, Canada).
3. Run search. Save the people/companies you want to a **List** (e.g. “Tier 1 – Recruiters”).
4. When you **Add contacts to the sequence**, choose that list. The “list from company discovery” is that Apollo list — you don’t need a CSV in the repo for this.

### Option B: Export from Apollo into the repo

1. In Apollo run the same **People** or **Companies** search and save to a List.
2. **Export** the list to CSV (Apollo: open the list → Export).
3. Open the CSV. Keep or add columns: **segment**, **company_name**, **website** (and **contact_name**, **email** if you exported people).
4. Save it as **`leads_gen/companies_to_enrich.csv`** (overwrite the example file). That file then *is* your company discovery list in the repo.
5. Optional: run **`python leads_gen/find_emails.py`** if you need more contacts per company or verification (script uses Hunter).

---

## Summary

- **List from company discovery** = the leads you found in Apollo (saved in a List / Saved people / Saved companies). You haven’t seen it in the repo because we don’t have an exported CSV yet — only the template **`companies_to_enrich.csv`** with 2 example rows.
- To **see** it: in Apollo open **Prospect & enrich → Lists** (or **Saved people** / **Saved companies**) and open the list you created from your search.
- To **have it in the repo**: export that list from Apollo to CSV and save as **`leads_gen/companies_to_enrich.csv`**.
