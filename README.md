# Intellidial

AI-powered phone research: call businesses with voice AI, get structured data and recordings. This repo contains the **Intellidial app** — marketing site, live voice demo, and back office (dashboard, projects, team, settings).

---

## What’s in this repo

| Path | Description |
|------|-------------|
| **`intellidial/`** | Next.js app: landing page (pricing, use cases, CTA), voice demo (VAPI Web SDK), and back office (dashboard, projects, contacts, instructions, call queue, team, settings). |
| **`intellidial/docs/`** | Back office task checklist and plan. |
| **`create_demo_agent.py`** | Create/update the VAPI “website demo” assistant used by the landing page voice widget. Run from repo root; uses `.env` for `VAPI_API_KEY` and writes `VAPI_DEMO_ASSISTANT_ID`. |

Everything under **`intellidial/`** is the Intellidial product. Other folders in the repo (e.g. Python pipelines, leads_gen, production_plan) are separate tooling and docs.

---

## Prerequisites

- **Node.js 18+**
- For the **web voice demo**: [VAPI](https://vapi.ai) — Public key and a Demo Assistant ID (see Environment variables).

---

## Quick start

```bash
cd intellidial
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Landing page**: hero, features, pricing, “Talk to our AI” voice demo, contact/book-a-call.
- **Back office**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard) — dashboard, projects, team, settings. Auth is stubbed (dev bypass) until Firebase is wired.

---

## Environment variables

Create a **`.env`** file in the **repo root** (parent of `intellidial/`). The Next.js app loads it via `intellidial/next.config.ts`.

**Required for the voice demo:**

```env
# VAPI (web voice demo)
VAPI_PUBLIC_KEY=your_vapi_public_key
VAPI_DEMO_ASSISTANT_ID=your_demo_assistant_id
```

- **VAPI_PUBLIC_KEY**: VAPI Dashboard → API Keys → Public key.
- **VAPI_DEMO_ASSISTANT_ID**: Run `python create_demo_agent.py` from the repo root; it prints the assistant ID. Add that to `.env` so the site can start the demo.

If these are missing, the site still runs; the voice demo will not connect.

---

## Intellidial app structure

```
intellidial/
├── src/app/
│   ├── page.tsx              # Landing: hero, features, pricing, voice demo, CTA
│   ├── layout.tsx
│   ├── globals.css
│   ├── api/
│   │   └── demo-assistant/   # Returns assistant ID + public key for voice widget
│   ├── components/
│   │   ├── VoiceDemo.tsx      # VAPI Web SDK voice widget
│   │   └── LoginModal.tsx
│   ├── dashboard/             # Back office
│   │   ├── layout.tsx         # Sidebar: Dashboard, Projects, Team, Settings
│   │   ├── page.tsx           # Dashboard home (KPIs, charts)
│   │   ├── projects/         # List + detail (overview, contacts, queue, instructions, results, export)
│   │   ├── team/             # Invite members, roles, pending invites
│   │   └── settings/         # Subscription, payment method, invoices, contact
│   └── login/
├── src/lib/                   # Auth, Firebase stubs, data store, utils
├── next.config.ts             # Loads parent .env
├── package.json
└── docs/                      # Back office checklist, plan
```

---

## Tech stack

| Part | Technology |
|------|------------|
| App | Next.js (App Router), React, TypeScript |
| Styling | Tailwind CSS |
| Voice demo | VAPI Web SDK (`@vapi-ai/web`) |
| Back office data | In-memory store (Firebase/Firestore to be wired) |
| Charts | Recharts |

---

## License and contact

Proprietary. Contact: hello@intellidial.co.za.
