# Leads Gen Plan — B2B Outbound with AI

This plan matches the **6-step flow** (see `LEADS_GEN_FLOW.md` and `LEADS_GEN_FLOW.html`). Each step: **input → what we do → tools and why → output**. Fully automated; no manual handoffs.

**Stack: Apollo + Instantly.** We use **Apollo** for company discovery and contact enrichment; **Instantly** for sending, warm-up, tracking, and follow-up. Steps **not** covered by Apollo or Instantly need one extra tool each (see table below).

---

## Steps covered by Apollo vs Instantly

| Step | Apollo | Instantly | Extra tool needed? |
|------|--------|-----------|---------------------|
| 1. Company discovery | ✓ | — | No |
| 2. Contact enrichment | ✓ | — | No |
| 3. Email verification | — | — | **Optional** (Hunter / NeverBounce / ZeroBounce — skip for small Apollo batches) |
| 4. AI email generation | — | — | **Yes** (LLM: GPT-4 / Claude / Gemini) |
| 5. Send + protect domain | — | ✓ | No |
| 6. Track + follow-up | — | ✓ | No (Instantly has sequences + tracking) |

**Steps not covered by Apollo or Instantly:** **Step 3** (email verification — optional; skip for small Apollo batches) and **Step 4** (AI email generation). Add an LLM for step 4; add a verification API for step 3 only if you want it.

---

## Step 1: Company discovery

| | |
|---|------------------------------------------------------------------|
| **Input** | ICP definition: segments (e.g. recruiters, lead qual agencies), job titles, company filters (size, industry, keywords), geography. From `TARGET_MARKET_REFINEMENT.md` and `TIER1_TIER2_EMAIL_PLAN.md`. |
| **What we do** | Run automated company search by segment: apply filters (industry, keywords, size, location), call Apollo API, extract company name + website per result. One row per company; add segment column. No manual list building. |
| **Tools we use and why** | **Apollo API** — company search with filters, returns name + domain; single API for steps 1 and 2, easy to script and export. |
| **Output** | **`companies.csv`** — columns: `segment`, `company_name`, `website`. Optional: `employee_count`, `country`. Feeds step 2. |

---

## Step 2: Contact enrichment

| | |
|---|------------------------------------------------------------------|
| **Input** | **`companies.csv`** from step 1: segment, company_name, website (domain). |
| **What we do** | For each company row: call Apollo people search by company/domain; filter by job title (or take top by relevance). Extract name, title, email. One or two decision-makers per company. |
| **Tools we use and why** | **Apollo API** — people-by-company search; same account as step 1, returns name, title, email. One stack for discovery + contacts. |
| **Output** | **`contacts_raw.csv`** — columns: `segment`, `company_name`, `website`, `contact_name`, `job_title`, `email`. Feeds step 3. |

---

## Step 3: Email verification (optional — skip for small Apollo batches)

| | |
|---|------------------------------------------------------------------|
| **Input** | **`contacts_raw.csv`** from step 2: contact_name, job_title, email, company, segment. |
| **What we do** | For each email: call verification API; get status (valid, catch_all, invalid, unknown). Filter list to valid (and optionally catch_all). Remove or flag invalid/unknown so we never send to them. Protects domain and reduces bounces. |
| **Tools we use and why** | **Not Apollo or Instantly.** If you run this step: **Hunter**, **NeverBounce**, or **ZeroBounce**. Apollo/Instantly don’t do dedicated verification. |
| **Output** | **`contacts_verified.csv`** — or skip and use **`contacts_raw.csv`** as input to step 4. |

**Do you need it?** For a **first test (20–50 leads from Apollo)**, **skip** Step 3 and send from `contacts_raw.csv`. For **higher volume** or a **domain you care about**, add verification so bounces don't hurt deliverability.

---

## Step 4: AI email generation

| | |
|---|------------------------------------------------------------------|
| **Input** | **`contacts_verified.csv`** from step 3: segment, company_name, contact_name, job_title, email. Plus our **value prop** (e.g. “AI phone research — scrape lists, call at scale with voice AI, structured data + recordings”) and **CTA** (e.g. book a call, see a demo). |
| **What we do** | For each contact: build a short prompt with our offer, their segment, company name, and role; call LLM to generate one subject line and one body (3–5 lines, professional, one clear CTA). Optionally generate A/B variants. No templates filled by hand. |
| **Tools we use and why** | **Not Apollo or Instantly.** We need an **LLM**: **OpenAI (GPT-4)**, **Anthropic (Claude)**, or **Google (Gemini)**. Single prompt per row; “Our offer: X. Their segment: Y. Role: Z. Company: W. Write a short cold email (subject + body).” LLM gives personalized copy at scale. |
| **Output** | **`emails_ready.csv`** — columns: `segment`, `company_name`, `contact_name`, `job_title`, `email`, `subject`, `body`. Feeds step 5 (import into Instantly). |

---

## Step 5: Send + protect domain

| | |
|---|------------------------------------------------------------------|
| **Input** | **`emails_ready.csv`** from step 4: email, subject, body per contact. Plus **sending caps**, **warm-up schedule**, and **suppression list** (unsubscribes, bounces). |
| **What we do** | Send each email via Instantly; respect daily caps and warm-up so we don’t burn the domain. Honor suppression list and unsubscribe link in every email. Instantly handles warm-up, SPF/DKIM/DMARC (with your domain), and logging. |
| **Tools we use and why** | **Instantly** — cold email sending + warm-up in one; campaign management, caps, domain reputation. Optional: suppression list in CSV or Instantly's suppression so we never resend to unsubscribes or bounces. |
| **Output** | **Sent log** (Instantly campaign analytics) — email, contact, sent_at. Opens/clicks flow into step 6. Feeds step 6. |

---

## Step 6: Track + follow-up

| | |
|---|------------------------------------------------------------------|
| **Input** | **Sent data** from step 5 (Instantly campaigns); **opens, clicks, bounces** from Instantly; **inbound replies** (Instantly inbox or forwarding). |
| **What we do** | Use Instantly's tracking for opens/clicks/bounces. Use Instantly's sequences for follow-up (e.g. day 3 for non-repliers). Reply detection: Instantly inbox or export to sheet/DB. Optionally generate follow-up copy with same LLM as step 4 and add to Instantly sequences. |
| **Tools we use and why** | **Instantly** — sequences (follow-up emails on a schedule), open/click tracking, reply detection. No extra tool; optional: same LLM as step 4 for personalized follow-up body if not using a fixed template. |
| **Output** | **`replies.csv`** (or Instantly export) — contact, email, replied_at. Follow-up sends and open/click/bounce status in Instantly. |

---

## Flow summary (Apollo + Instantly + 2 extras)

| Step | Covered by | Input | Output |
|------|------------|-------|--------|
| 1. Company discovery | **Apollo** | ICP (segments, filters, geography) | `companies.csv` |
| 2. Contact enrichment | **Apollo** | `companies.csv` | `contacts_raw.csv` |
| 3. Email verification | **Extra: Hunter / NeverBounce / ZeroBounce** | `contacts_raw.csv` | `contacts_verified.csv` |
| 4. AI email generation | **Extra: LLM (GPT-4 / Claude / Gemini)** | `contacts_verified.csv` + value prop + CTA | `emails_ready.csv` |
| 5. Send + protect domain | **Instantly** | `emails_ready.csv` + caps + suppression | sent_log, opens/clicks |
| 6. Track + follow-up | **Instantly** | Instantly campaigns + replies | `replies.csv`, follow-ups, open/click/bounce |

---

## Who we target (ICP)

Defined in **`TARGET_MARKET_REFINEMENT.md`** and **`TIER1_TIER2_EMAIL_PLAN.md`**. Summary:

- **Tier 1:** Recruiters & staffing, Sales/SDR teams, Local/multi-location, Lead qual / appointment-setting agencies.
- **Tier 2:** Market research/panel, Real estate, SaaS customer research.
- **Criteria:** Easy to implement, low business risk, big time saver, better data quality, save on overheads, business already does this manually.

Avoid for now: large enterprise procurement, heavily regulated industries (finance, healthcare), markets with strict cold-calling/email rules.

---

## Reference

- **Diagrams:** `LEADS_GEN_FLOW.md`, `LEADS_GEN_FLOW.html` (open HTML in browser to view).
- **Target refinement:** `TARGET_MARKET_REFINEMENT.md`, `TIER1_TIER2_EMAIL_PLAN.md`.
- **Getting company names:** `HOW_TO_GET_COMPANY_NAMES.md` (manual options; flow above automates via Apollo/scrape).
