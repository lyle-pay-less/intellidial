# Deep Dive: Smart Collections (The RCS Group)

**Your closest SA competitor in AI voice debt collection. Here's everything I found.**

---

## 1. They are NOT what they first appear

**First impression:** "Established debt collection AI company with 40+ languages and enterprise clients."

**Reality:** They're a **marketing/communications agency** that bolted on an AI collections product.

### The company

| Detail | What it actually is |
|--------|-------------------|
| **Legal name** | Retail Communication Solutions (Pty) Ltd |
| **Founded** | 1999 (24 years ago) |
| **Original business** | Marketing agency — events, activations, brand storytelling, experiential marketing |
| **Website** | thercsgroup.co.za (Wix website) |
| **Smart Collections** | A new product line, NOT their core business |
| **NOT the same as** | RCS (rcs.co.za) — that's a completely different company (consumer finance, store cards, loans). Confusing name overlap. |

### The team (total: 5 people)

| Person | Role | Background |
|--------|------|-----------|
| **Craig Berman** | Co-founder | "Communication and business strategist." 30 years in entrepreneurship. Marketing guy, not tech. |
| **Tyrone Watkins** | Co-founder | "Messaging in the commercial landscape." Brand storytelling. Also not tech. |
| **Liam Webb** | Chief AI Architect | "AI integration specialist." Transforms businesses through generative AI. This is their one technical person. |
| **Takalani Manenzhe** | Head of Design | UX/UI, digital marketing, graphic design, video production |
| **Class Manenzhe** | Junior Designer | Social media and real estate marketing |

**That's it. 5 people. Two founders (marketing), one AI guy, two designers.**

---

## 2. Their product: Smart Collections

### How it works

1. Client uploads a spreadsheet (CSV) of debtors
2. RCS cleans/formats the data
3. Client picks: languages, call hours, tone, legal wording
4. AI calls debtors — listens, adapts, sends Netcash payment links mid-call
5. Daily report emailed with funds swept to client

### Tech stack (what I can determine)

| Component | What they likely use |
|-----------|---------------------|
| **AI Voice** | Almost certainly a third-party AI voice API (ElevenLabs, Vapi, or similar). A 5-person marketing agency did not build their own voice AI. |
| **Telephony** | Unknown. Likely Twilio, Plivo, or a local SIP provider. |
| **Languages** | "40+ languages" = they use a multilingual voice AI API that supports this out of the box. This is not custom-built. |
| **Payments** | Netcash integration (SMS payment links) |
| **Hosting** | AWS Cape Town |
| **Website** | Wix (yes, their website is on Wix) |
| **CRM/Backend** | Unknown. Could be custom, could be no-code/low-code given team size. |

### Pricing model

- **Flat percentage fee** on every Rand recovered
- No upfront cost, no software fee
- "Fully managed, turn-key service"
- They claim 35-45% cure rate

### What this means

They're running a **managed service**, not selling software. The client never touches the tech. RCS does everything: data cleanup, campaign setup, calling, reporting. The client just sends a spreadsheet and gets money + a report.

---

## 3. Their other products (tells you where their focus really is)

| Product | What it does |
|---------|-------------|
| **Smart Connectivity** | LinkedIn outreach + email campaigns. Lead gen for B2B. |
| **Smart Automate** | AI meeting transcription + follow-ups. Like Otter.ai. |
| **Smart Assistant** | WhatsApp/Facebook chatbots. Appointment booking, order processing. |

Smart Collections is ONE of FOUR "Smart" products. They're spreading thin across AI-everything.

---

## 4. Their clients

Their website shows a "client community" with ~20 logo images, but the logos are just numbered PNG files (1.png through 21.png) — I can't identify the companies from the filenames. No case studies, no testimonials, no named clients for Smart Collections specifically.

**Other linked projects on their site:**
- leadlogistix.com (lead generation tool)
- intelligentprop.com (property/real estate AI)
- craigberman.org (founder's personal site)
- tyronewatkins.com (founder's personal site)

**No links to debt collection clients. No case studies. No testimonials.**

---

## 5. Strengths and weaknesses

### Their strengths

| Strength | Assessment |
|----------|-----------|
| First mover in SA AI voice collections | Real advantage — they exist and are marketing it |
| Managed service model (easy for clients) | Good for small collectors who don't want to touch tech |
| POPIA/GDPR/CCPA compliance claims | Table stakes, but they've at least thought about it |
| Netcash payment integration | Smart — payment during the call |
| 35-45% cure rate claim | If real, that's decent. No verification available. |
| AWS Cape Town hosting | Good for SA data residency |

### Their weaknesses

| Weakness | Why it matters |
|----------|---------------|
| **5-person team** | A marketing agency trying to do AI debt collection. Limited engineering capacity. |
| **No visible tech depth** | One "AI Architect" + likely using off-the-shelf AI voice APIs. Not building custom models. |
| **Wix website** | Signal of a small operation. Enterprise debt collectors will notice. |
| **No case studies or testimonials** | They can't prove their 35-45% cure rate to anyone. |
| **No named clients** | Could mean very few clients, or very early. |
| **Managed service only** | Can't sell to companies that want to run it themselves (self-serve SaaS). |
| **Spread across 4 products** | Not fully focused on collections. |
| **Not a debt collection company** | No CFDC registration. No domain expertise in collections compliance. They're marketing people who found an AI tool. |
| **No integration story** | No mention of Swordfish, TaskFlow, or any CRM integration. Just CSV in, report out. |
| **Pricing is opaque** | "Flat percentage" but they don't say what percentage. Could be 10%, could be 40%. |

---

## 6. What this means for you

### The good news

1. **They're beatable.** This is a 5-person marketing agency, not a deep-tech AI company. Their AI is almost certainly off-the-shelf.
2. **No moat.** No proprietary tech, no network effects, no enterprise integrations. Their "moat" is just that they showed up first.
3. **No visible traction.** Zero case studies, zero testimonials, zero named clients. They might have a handful of small clients at best.
4. **Managed service is a ceiling.** They can only scale by adding people (to manage campaigns). A self-serve platform scales without people.
5. **They validate the market.** The fact that they exist and are marketing this proves SA debt collectors want AI voice. You don't have to educate the market.

### Where you can beat them

| Your approach | Their approach | Why you win |
|--------------|---------------|-------------|
| **Self-serve SaaS** (client controls campaigns) | Managed service only | Scalable. Mid-size collectors want control. |
| **CRM integrations** (Swordfish, TaskFlow) | CSV only | Enterprise-ready. They can't do this with 5 people. |
| **Transparent pricing** (per call or per seat) | Opaque "flat %" | Clients can calculate ROI before buying. |
| **Case studies with real numbers** (from your pilot) | No case studies | Trust. Proof. |
| **Tech-first team** | Marketing-first team | Deeper AI, better voice quality, faster iteration. |
| **Focused on collections only** | 4 different "Smart" products | Depth beats breadth. |

### What NOT to do

- Don't compete on price yet. Compete on product and proof.
- Don't try to be a managed service too (at least not initially). That's their game and it doesn't scale.
- Don't underestimate them just because they're small. They're in market, they're talking to prospects, and they may have relationships you don't.

---

## 7. Bottom line

Smart Collections is a **marketing agency selling an AI wrapper** as a managed collections service. They were smart to spot the opportunity and first to market it in SA. But they have:

- No deep tech
- No proven traction
- No enterprise integrations
- No self-serve platform
- A team of 5 (2 marketing founders, 1 AI person, 2 designers)

**This is not a formidable competitor. This is a sign the market is ready and underserved.**

If you build a real product (self-serve, integrated, with proven ROI), you can take this market from them. The question is: do you want to build for debt collection specifically, or do you want to build a general AI dialer and debt collection is one vertical?

---

## Sources

- [thercsgroup.co.za](https://www.thercsgroup.co.za/) — company homepage
- [thercsgroup.co.za/about](https://www.thercsgroup.co.za/about) — team and background
- [thercsgroup.co.za/smartcollections](https://www.thercsgroup.co.za/smartcollections) — product page
- [rcs.co.za](https://rcs.co.za/) — DIFFERENT company (consumer finance)
