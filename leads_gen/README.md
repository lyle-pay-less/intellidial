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

**ZERO BOUNCE RULE:** The script automatically filters out `invalid`, `unknown`, and `disposable` emails. Only `valid` (and optionally `catch_all`) emails are included in the output.

See **`LEAD_QUALIFICATION_PROCESS.md`** for the complete qualification workflow.

---

## 4. Next steps

- **Generate emails:** Use `LEADS_GEN_PLAN.md` — our offer + their segment/role → subject + body.
- **Send safely:** Same doc — warm-up, sending infra, caps, unsubscribe.
- **Plans:** `TARGET_MARKET_REFINEMENT.md`, `TIER1_TIER2_EMAIL_PLAN.md`.

---

## 5. Reduce demo burden & scale sales

**Problem:** Converting customers requires too many demos, takes time away from product development.

**Solutions:**
- **`REDUCE_DEMO_BURDEN_STRATEGY.md`** — Strategies to reduce demos by 60-70%:
  - Self-serve trials for Starter/Growth plans
  - Pre-recorded videos to qualify leads
  - Focus on high-intent leads only
- **`DEMO_AGENT_COMMISSION_PLAN.md`** — Hire commission-based demo agents:
  - 20% MRR commission structure
  - Training program
  - Agent management system
  - Scale demos without doing them all yourself
- **`EARLY_STAGE_PRIORITIES.md`** — Product-focused early stage plan:
  - 75% of time on product development
  - Self-serve trials + demo agents handle sales
  - Scalable approach for solo founder

**Quick win:** Create demo video + add qualification questions → 50% reduction immediately.  
**Scale win:** Hire demo agents → handle Pro/Growth demos, you focus on Enterprise + product.  
**Early stage:** Focus 75% of time on product improvements while agents + self-serve handle sales.
