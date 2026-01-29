# Leads Gen Flow — Fully Automated (AI + Tools)

**To view the diagrams:** open **`LEADS_GEN_FLOW.html`** in your browser (right-click the file in Cursor → **Reveal in File Explorer** → double-click the HTML, or drag it into Chrome/Edge).

End-to-end flow with **no manual work**. Each step uses a selected tool or AI; data flows from one step to the next.

---

## High-level flow

```mermaid
flowchart LR
    A[1. Company discovery] --> B[2. Contact enrichment]
    B --> C[3. Email verify]
    C --> D[4. AI email gen]
    D --> E[5. Send + protect domain]
    E --> F[6. Track + follow-up]
```

---

## Full process diagram (tools at each step)

```mermaid
flowchart TB
    subgraph INPUT[" "]
        ICP["ICP: segments, titles, filters<br/>(TARGET_MARKET_REFINEMENT)"]
    end

    subgraph STEP1["1. COMPANY DISCOVERY"]
        S1A[Apollo API<br/>Company Search]
        S1B[LinkedIn API / PhantomBuster<br/>Company search]
        S1C[Scraper: Clutch, G2, Google<br/>e.g. Playwright + list URLs]
        S1A --> S1OUT["companies.csv<br/>segment, company_name, website"]
        S1B --> S1OUT
        S1C --> S1OUT
    end

    subgraph STEP2["2. CONTACT ENRICHMENT"]
        S2A[Hunter API<br/>domain-search]
        S2B[Apollo API<br/>people by company]
        S2C[Clearbit API<br/>Enrichment]
        S2OUT["contacts_raw.csv<br/>company, name, title, email"]
        S2A --> S2OUT
        S2B --> S2OUT
        S2C --> S2OUT
    end

    subgraph STEP3["3. EMAIL VERIFICATION"]
        S3A[Hunter API<br/>email-verifier]
        S3B[NeverBounce / ZeroBounce API<br/>bulk verify]
        S3OUT["contacts_verified.csv<br/>only valid / catch_all"]
        S3A --> S3OUT
        S3B --> S3OUT
    end

    subgraph STEP4["4. AI EMAIL GENERATION"]
        S4A[LLM: GPT-4 / Claude / Gemini<br/>Prompt: our offer + segment + role]
        S4B[Template engine + LLM<br/>Subject + body, A/B variants]
        S4OUT["emails_ready.csv<br/>company, contact, email, subject, body"]
        S4A --> S4OUT
        S4B --> S4OUT
    end

    subgraph STEP5["5. SEND + PROTECT DOMAIN"]
        S5A[SendGrid / Postmark / SES<br/>Transactional API]
        S5B[Instantly / Lemwarm / Mailreach<br/>Warm-up + sending]
        S5C[Unsubscribe + suppression list<br/>in DB or CSV]
        S5OUT["sent_log.csv<br/>email_id, sent_at, open/click later"]
        S5A --> S5OUT
        S5B --> S5OUT
        S5C --> S5OUT
    end

    subgraph STEP6["6. TRACK + FOLLOW-UP"]
        S6A[SendGrid webhooks / Postmark<br/>Opens, clicks, bounces]
        S6B[LLM or rules: reply detection<br/>→ CRM or sheet]
        S6C[Scheduler: follow-up emails<br/>e.g. 3 days later, same AI gen]
        S6OUT["replies.csv, follow_ups_sent"]
        S6A --> S6OUT
        S6B --> S6OUT
        S6C --> S6OUT
    end

    ICP --> STEP1
    S1OUT --> STEP2
    S2OUT --> STEP3
    S3OUT --> STEP4
    S4OUT --> STEP5
    S5OUT --> STEP6
```

---

## Tool selection table (per step)

| Step | Purpose | Tool options | Output |
|------|---------|--------------|--------|
| **1. Company discovery** | Get company names + websites by segment | **Apollo API** (company search), **PhantomBuster** / **LinkedIn** (company search), **Playwright** (scrape Clutch/G2/Google) | `companies.csv`: segment, company_name, website |
| **2. Contact enrichment** | Get decision-maker name, title, email per company | **Hunter API** (domain-search), **Apollo API** (people by company), **Clearbit** (enrichment) | `contacts_raw.csv`: company, name, title, email |
| **3. Email verification** | Remove invalid / risky emails | **Hunter** (email-verifier), **NeverBounce**, **ZeroBounce** | `contacts_verified.csv`: only valid/catch_all |
| **4. AI email generation** | Personalized subject + body per contact | **OpenAI / Anthropic / Google** (GPT-4, Claude, Gemini) + prompt (our offer, segment, role) | `emails_ready.csv`: contact, email, subject, body |
| **5. Send + protect domain** | Send without burning domain | **SendGrid**, **Postmark**, **SES** + **Instantly** / **Lemwarm** (warm-up); **suppression list** in DB/CSV | `sent_log.csv`: email_id, sent_at |
| **6. Track + follow-up** | Opens, clicks, replies; auto follow-up | **SendGrid/Postmark webhooks**; **LLM or rules** for reply detection; **scheduler** for follow-up (same AI gen) | `replies.csv`, follow-up sends |

---

## Data flow (no manual handoffs)

```mermaid
flowchart LR
    C1[companies.csv] --> C2[contacts_raw.csv]
    C2 --> C3[contacts_verified.csv]
    C3 --> C4[emails_ready.csv]
    C4 --> C5[sent_log.csv]
    C5 --> C6[replies + follow_ups]
```

- **Script 1:** ICP + APIs/scrape → `companies.csv`
- **Script 2:** `companies.csv` + Hunter/Apollo/Clearbit → `contacts_raw.csv`
- **Script 3:** `contacts_raw.csv` + Hunter/NeverBounce → `contacts_verified.csv`
- **Script 4:** `contacts_verified.csv` + LLM → `emails_ready.csv`
- **Script 5:** `emails_ready.csv` + SendGrid/Postmark + warm-up → send; write `sent_log.csv`
- **Script 6:** Webhooks + reply detection → `replies.csv`; scheduler + LLM → follow-up emails

Everything is API → CSV/DB → next script. No copy-paste.

---

## Recommended tool stack (single choice per step)

| Step | Recommended tool | Why |
|------|------------------|-----|
| 1. Company discovery | **Apollo API** | One API for company search + filters; exports name + domain. |
| 2. Contact enrichment | **Hunter API** or **Apollo API** | Hunter: domain → people. Apollo: company → people. Pick one for consistency. |
| 3. Email verification | **Hunter** (same key as step 2) or **NeverBounce** | Hunter: same account. NeverBounce: strong bulk + deliverability. |
| 4. AI email gen | **OpenAI API** (GPT-4) or **Anthropic** (Claude) | Simple prompt: “Our offer: X. Segment: Y. Role: Z. Write short cold email.” |
| 5. Send + protect | **SendGrid** + **Instantly** (warm-up) or **Instantly** only (has sending + warm-up) | SendGrid: reliable. Instantly: warm-up + sending in one. |
| 6. Track + follow-up | **SendGrid webhooks** + **Cron/scheduler** + same **LLM** for follow-up copy | Webhooks → opens/clicks/bounces; scheduler runs “follow-up” script with same AI. |

---

## Implementation order

1. **Script 1:** Apollo company search → `companies.csv` (or Hunter-only flow: you still need a company list; Apollo or scrape).
2. **Script 2:** `companies.csv` → Hunter (or Apollo) → `contacts_raw.csv` (already have `find_emails.py`; wire it to read from script 1 output).
3. **Script 3:** Verify step inside script 2 or separate; output `contacts_verified.csv`.
4. **Script 4:** Read verified contacts → call LLM per row → `emails_ready.csv`.
5. **Script 5:** Read `emails_ready.csv` → send via SendGrid/Instantly; log to `sent_log.csv`; respect warm-up + caps.
6. **Script 6:** Webhooks → update status; reply detection → `replies.csv`; cron + LLM → follow-up emails.

This is the full automated leads gen flow with tool selection at each point and no manual work.
