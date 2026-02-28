# How to Break Into SA Debt Collection with Intellidial

**The barrier feels high, but it's actually easier than you think. Here's the playbook.**

---

## 1. The barrier is NOT what you think

You're looking at Nimble (1,500 agents, Nexidia, custom everything) and thinking "how do I compete with that." **You don't.** You don't start with Nimble. You don't need to replace their entire stack. Here's the real picture:

### What looks hard (but isn't)

| Perceived barrier | Reality |
|-------------------|---------|
| "They have massive existing systems" | You don't replace them. You plug INTO them via SIP trunk. Zero infrastructure change on their side. |
| "Regulatory compliance is complex" | You build POPIA compliance into the product once. Then it's a selling point, not a barrier. |
| "Long enterprise sales cycles" | True for Nimble. Not true for the 200+ small/mid collectors who use Swordfish or basic dialers. |
| "Need deep integrations" | Skit.ai (your biggest competitor) started with SFTP flat-file transfers. Not APIs. CSV in, CSV out. |
| "I need to be registered" | No. You sell tech. Your clients are the registered collectors. |

### What IS actually hard

- Getting the first 1-2 paying pilots
- Making the AI agent handle SA accents and multilingual calls (Afrikaans, Zulu, English)
- Not saying something illegal on a debt call (compliance scripting)

---

## 2. How you technically integrate (3 levels)

### Level 1: Standalone (easiest, start here)

```
Your client uploads a CSV of accounts
    --> Intellidial dials them via its own telephony (Twilio/Vapi)
    --> AI agent makes the call (verification, payment reminder, etc.)
    --> Results exported as CSV back to client
    --> Client imports results into their CRM/Swordfish/whatever
```

**Integration needed:** None. Just CSV import/export.
**Who this works for:** Small collectors (5-50 agents) who don't have APIs.
**Timeline:** You can do this NOW.

### Level 2: SIP Trunk (medium, next step)

```
Client's existing PBX/dialer routes calls to Intellidial via SIP trunk
    --> AI agent handles the call
    --> Call recording + transcript sent back
    --> Disposition/outcome posted to client's system via webhook or SFTP
```

**How SIP integration works:**
- Client gives you a SIP trunk endpoint (IP + port + credentials)
- Intellidial receives calls on that trunk (inbound) or originates calls through it (outbound)
- Audio flows as RTP (G.711 codec, standard telephony)
- No hardware changes on their side. Their PBX just points some calls to your trunk.

**Integration needed:** SIP trunk support (Twilio, Plivo, or direct carrier). Webhook for dispositions.
**Who this works for:** Mid-size collectors who already have a PBX/cloud contact center.

### Level 3: Full API (enterprise, later)

```
Real-time API integration with their CRM (Swordfish, TaskFlow, custom)
    --> Pull account data in real-time before each call
    --> AI agent has full context (balance, history, last contact, payment arrangements)
    --> Post-call: update account status, log notes, trigger workflows
    --> Real-time dashboards, speech analytics, compliance scoring
```

**Integration needed:** REST API connectors to Swordfish/TaskFlow/custom CRMs. Real-time data sync.
**Who this works for:** Enterprise collectors like Nimble, ITC, MBD.
**Timeline:** 3-6 months after proving Level 1/2.

---

## 3. How to position this

### Don't say: "We're an AI dialer"
They'll compare you to their existing dialer and you'll lose.

### Say: "We handle the calls your agents don't want to do"

**Position as an AI agent for LOW-VALUE work:**

| Use case | What the AI does | Why they care |
|----------|-----------------|---------------|
| **Verification calls** | "Hi, is this John? Can you confirm your ID number and address?" | Agents hate these. 30-40% of call time is just verification. |
| **Payment reminders** | "You have an outstanding balance of R2,500. Would you like to set up a payment plan?" | Early-stage debt (0-30 days overdue). High volume, low complexity. |
| **Promise-to-pay follow-up** | "You agreed to pay R500 on the 15th. Just confirming that's still happening." | Currently done by agents reading a script. Perfect for AI. |
| **Right-party contact** | Dial through a list, confirm identity, only transfer to a human when you reach the right person. | Connect rates are 10-20%. 80% of agent time is wasted on wrong numbers/voicemail. |
| **Inbound payment IVR** | Debtor calls in, AI handles: account lookup, balance check, payment arrangement, payment link via SMS. | Riverty does this. 15% of inbound fully automated. 10X ROI reported. |

### The pitch in one sentence:

> "Your agents spend 70% of their time on verification, wrong numbers, and payment reminders. Our AI handles that so your agents only talk to people who are ready to negotiate."

### The math (this is what closes deals):

```
Current state:
  50 agents x R15,000/month = R750,000/month
  Connect rate: 15% (85% wasted dials)
  Effective agent time on real conversations: ~30%

With Intellidial:
  AI handles verification + reminders + wrong-number filtering
  Agents only get warm transfers (right person, verified, ready to talk)
  Same 50 agents now 3x more productive
  OR: cut to 25 agents + AI = same output, R375,000/month saved
```

---

## 4. Who to approach (and who will actually give you a chance)

### DO NOT start with:
- **Nimble Group** (too big, 1,500 agents, already invested in Nexidia, 6-month procurement cycles)
- **MBD Credit Solutions** (same - enterprise, slow, risk-averse)
- **Any company with 500+ agents** (they need enterprise features you don't have yet)

### START with these types:

#### Tier 1: Small tech-forward collectors (5-50 agents)

| Company | Why they'll listen |
|---------|-------------------|
| **QuickDebt** | Already tech-forward (custom software, automated comms). Small enough to try new things. B2B + B2C. |
| **NVDB Collections** | Already uses "AI-powered digital solutions." They're looking for more AI. |
| **Smart Collections (RCS Group)** | Already uses AI automation. Reports 35-45% cure rates. Multilingual (40+ languages). Would want to push that further. |
| **Zig Kwande** | 100% black-owned, Level 1 B-BBEE. Offers call center setup. Would benefit from AI to compete with bigger players. |

**Why small collectors:** They can't afford 50 agents but they have the accounts. AI is how they compete with Nimble. You're not replacing their stack -- you're giving them superpowers they can't build themselves.

#### Tier 2: Mid-size BPO/collections (50-200 agents)

| Company | Why |
|---------|-----|
| **VVM** | Already on Smartz cloud platform. Cloud-native = easier to integrate. Uses Sisense for BI. Data-driven culture. |
| **ITC Business Administrators** | 58 agents, 400-seat capacity. They have ROOM to grow without adding agents. That's your pitch. |
| **Credit Intel** | Est. 1996, Midrand. Established but mid-size. Probably ready to modernize. |

#### Tier 3: The "creditor" angle (banks/telcos/retailers who outsource collections)

Instead of selling to collectors, sell to the companies that HIRE collectors:

| Company | Why |
|---------|-----|
| **Vodacom / MTN / Telkom** | Massive subscriber bases, constant billing/collections. They outsource to BPOs. |
| **Capitec / FNB / Standard Bank** | All have collections departments. All under pressure to reduce costs. |
| **Retailers (Woolworths Financial, Edgars/Edcon)** | Store credit = constant collections. |

If a bank says "we want our BPO to use AI for collections," the BPO has to comply. **Top-down pressure is the fastest way in.**

---

## 5. The exact play to get your first pilot

### Step 1: Build a 60-second demo

Record a demo call: AI agent calling a "debtor," doing verification, confirming balance, offering a payment link via SMS. Make it sound natural with a South African English accent.

### Step 2: Target 10 small collectors

From the list above (QuickDebt, NVDB, Smart Collections, Zig Kwande, etc.). Find the founder/CEO/CTO on LinkedIn. These are small companies -- the decision maker IS the person you'll talk to.

### Step 3: The message

> "Hi [name], I'm building an AI voice agent specifically for SA debt collection. It handles verification calls and payment reminders so your agents only talk to people ready to negotiate.
>
> [Company X] in the US saw 3x recovery rates and 10x ROI with this approach (Skit.ai case study).
>
> I'd love to run a free pilot on 500 of your accounts -- you keep 100% of recoveries. Can I show you a 60-second demo?"

### Step 4: The pilot structure

- **Free for 30 days** on 500 accounts (you eat the telephony cost -- it's cheap)
- **They provide:** A CSV with account number, name, phone, balance, days overdue
- **You do:** AI calls for verification + payment reminder
- **You report:** Connect rate, right-party contact rate, promises to pay, actual payments
- **They compare:** Your results vs their agents on the same segment

### Step 5: Convert to paid

After the pilot: "We recovered R[X] on your worst accounts. Here's what it costs vs your current agents." Price it per successful contact or per account, not per seat.

---

## 6. Integrations you need to build (priority order)

| Priority | Integration | Why | Effort |
|----------|------------|-----|--------|
| **P0** | CSV import/export | Every collector can use this. No API needed. | 1 day |
| **P0** | Call recording + storage | POPIA requires it. Non-negotiable. | Already have? |
| **P0** | SMS payment link | After call, send "Pay here: [link]" via SMS (Twilio/Clickatell) | 1-2 days |
| **P1** | SIP trunk support | Connect to their existing PBX without replacing it | 1-2 weeks |
| **P1** | Do-not-contact list | Check phone number against DNC before every dial | 1 day |
| **P1** | Consent verification flow | AI confirms consent at start of call per POPIA Form 4 | 2-3 days |
| **P2** | Swordfish API | Most popular SA collections CRM. Pull accounts, push dispositions. | 2-4 weeks |
| **P2** | Payment gateway (Netcash/PayFast) | Take payment during the call or via link | 1-2 weeks |
| **P3** | TaskFlow / Smartz API | Other popular platforms | 2-4 weeks each |
| **P3** | Skip tracing (Datanamix/TransUnion) | Verify/find phone numbers before dialing | 2-4 weeks |

**You can get your first pilot with just P0 items. That's a few days of work.**

---

## 7. Proof points to use in your pitch

| Company | Result | Source |
|---------|--------|--------|
| **Southwest Recovery (US)** | **10x ROI** with Skit.ai inbound voice AI | [PR Newswire](https://www.prnewswire.com/news-releases/southwest-recovery-services-achieves-10x-roi-with-skitais-inbound-voice-ai-solution-302032423.html) |
| **Riverty (Germany)** | 10% less call time, 50% less wait time, 15% of calls fully automated | [Parloa](https://www.parloa.com/company/press/riverty-ai-voice-assistant-to-be-rolled-out-across-companys-debt-collection-business-in-2025/) |
| **Vodex clients** | **3x recovery rate**, 7x connect rate | [Vodex](https://www.vodex.ai/case-studies) |
| **Legalcity (France)** | 70% of debtors couldn't tell it was AI | [Rounded](https://callrounded.com/en/blog/rounded-legalcity-ai-voice-agent-debt-collection) |
| **Apifonica (Mexico)** | AI matched human performance on 90+ day overdue debt | [Apifonica](https://www.apifonica.com/en/blog/ai-debt-collection-automation-mexico/) |

---

## 8. Your competitors in this space

| Competitor | Where | Threat | Your advantage |
|-----------|-------|--------|----------------|
| **Skit.ai** | US/India | High -- leader in AI voice for collections | They're not in SA. You are. POPIA, local accents, local presence. |
| **Parloa** | Germany | Medium -- focused on Europe | Same. Not in SA. |
| **Vodex** | India | Medium | Not in SA. |
| **Swordfish** | SA | Medium -- could add AI | They're a CRM, not an AI company. Partner with them instead of competing. |
| **TaskFlow** | SA | Low-Medium | Same. CRM, not AI. |

**Your real positioning: "The Skit.ai of South Africa."** First mover in AI voice for SA debt collection. Local, POPIA-native, understands the market.

---

## TL;DR

1. **Start with CSV import/export** -- no integrations needed
2. **Target small collectors** (QuickDebt, NVDB, Smart Collections) not Nimble
3. **Position as the AI that handles verification + reminders** -- not a dialer replacement
4. **Free 30-day pilot on 500 accounts** -- prove the math
5. **Build SIP trunk + Swordfish integration** after the first win
6. **Use global proof points** (Skit.ai 10x ROI, Vodex 3x recovery) in your pitch
7. **The real moat: you're in SA, they're not.** POPIA compliance, local accents, local presence.
