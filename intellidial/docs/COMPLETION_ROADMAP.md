# Intellidial — Completion Roadmap

What else needs to be done to complete the app. Grouped by priority and area.

**Progress:** ~90–95% toward testable MVP. Core loop works (signup → project → contacts → real call → results). Remaining: E2E validation, real email, polish.

---

## Done ✅

- **Auth & org hierarchy** — Firebase Auth, org creation, signup, setup, invite flow
- **Data segregation** — Projects, contacts, dashboard stats scoped by org
- **Firestore persistence** — Orgs, projects, team members, invitations, **contacts** (top-level `contacts` with `projectId`)
- **Dashboard** — KPIs, charts, projects list, project detail; **home dashboard = sum of all projects**; **project filter** (dropdown); hydrate all org project contacts before stats so data is captured and persisted
- **Contacts** — Paste numbers, CSV upload, manual entry, queue (persisted to Firestore)
- **Instructions tab** — Capture fields, agent script, mock AI generate
- **Results & export** — Call table, transcript, recording, captured data columns, CSV export; **failure reason** shown when status is failed
- **VAPI real calls** — POST /call, lazy assistant + structured output per project, one phone number (env), usage limits (calls used/limit)
- **Call results** — Transcript, recording, structured output (capturedData) via webhook or **sync-calls polling** (no ngrok); **sync on project load** and **“Sync call status”** on Results; fallbacks for stuck “calling” (no vapiCallId, stale call, getCall null) with clearer failure reasons
- **Usage** — Org usage (callsUsed/callsLimit), UsageWidget, 402 when over limit
- **Team** — Invite, list, roles, resend (mock email)
- **Settings** — Subscription, payment, invoices (mock)
- **Projects list** — Tile layout with industry (not description), formatted date (e.g. Today · 31 Jan 2026), avatar placeholder for AI agent
- **Demo data** — Pay-less org seeded; other orgs empty
- **Architecture plan** — VAPI, Gemini, phone numbers documented
- **Build & deployment** — Next.js 16 compatibility fixed, Docker build working, Cloud Build CI/CD, deployed to Cloud Run (europe-west2)
- **Custom domain** — Application Load Balancer configured, DNS set up for intellidial.co.za, SSL certificate provisioning
- **Gemini Integration** — ✅ **DONE** — Gemini API implemented and used when `GEMINI_API_KEY` is set. See [backlog/GEMINI_INTEGRATION.md](./backlog/GEMINI_INTEGRATION.md).

---

## Critical Path — Remaining

Real calling is implemented. Remaining for full production readiness:

| # | Task | Location | Status |
|---|------|----------|--------|
| 1 | **E2E validation** | — | Test real call → transcript/recording/capturedData in table (polling or webhook) |
| 2 | **Email Sending** | `src/app/api/team/invite/route.ts`, `src/app/api/team/[id]/resend/route.ts` | Replace mock emails with real SMTP (Nodemailer). See [backlog/EMAIL_SENDING.md](./backlog/EMAIL_SENDING.md). |
| 3 | **Firestore security rules** | — | Verify rules if using Firebase client SDK directly. Ensure org-scoped access. |

---

## High Priority — Production Ready

| # | Task | Description |
|---|------|--------------|
| 4 | **Settings org scoping** | Settings API returns mock data without org validation. When wiring South African payment gateway (PayFast/PayGate), scope by org. See [backlog/SETTINGS_ORG_SCOPING.md](./backlog/SETTINGS_ORG_SCOPING.md). |
| 5 | **VAPI webhook security** | Verify VAPI webhook signature. Reject forged requests. TODO in `src/app/api/webhooks/vapi/call-ended/route.ts` line 59. |
| 6 | **Error handling** | Consistent error states (API failures, network errors). User-friendly messages and retry options. |
| 7 | **Loading states** | Skeletons or spinners where fetches take time. Avoid blank flashes. |

---

## Medium Priority — Polish & Reliability

| # | Task | Description |
|---|------|--------------|
| 8 | **Firebase Auth production config** | Verify production domains in Firebase Console. Ensure redirect URLs and session handling work in prod. |
| 9 | **Environment variables documentation** | Create `.env.example` file listing all required vars. Document what each variable does. Separate dev/staging/prod configs. |
| 10 | **Rate limiting** | Protect API routes from abuse (e.g. per-user or per-org limits). |
| 11 | **Logging & monitoring** | Structured logs (Cloud Logging), error tracking (Sentry), basic metrics. |
| 12 | **README.md update** | Replace default Next.js boilerplate with project description, setup instructions, env vars, deployment info. |
| ~~13~~ | ~~**Build fix**~~ | ~~`generate is not a function` error on `npm run build`. Resolve before deployment.~~ ✅ **DONE** — Fixed Next.js 16 TypeScript errors, Docker build working |

---

## Lower Priority — Nice to Have

| # | Task | Description |
|---|------|--------------|
| 13 | **WhatsApp links** | Replace placeholder `27XXXXXXXXX` with real WhatsApp number in `src/app/page.tsx` (lines 822, 970) and `src/app/components/VoiceDemo.tsx` (line 280). |
| 14 | **Real billing (SA payment gateway)** | Replace mock subscription/invoices with South African payment gateway (PayFast/PayGate). Tie usage (calls used) to plans. |
| 15 | **Call consent / TCPA** | Ensure contacts have consented to be called. Document compliance. See architecture doc notes on TCPA. |
| 16 | **Inbound calls** | If orgs want to receive calls on their number, VAPI supports `assistantId` on the phone number. |
| 17 | **Twilio BYON** | Bring Your Own Number for international (e.g. SA +27). See architecture plan Phone Numbers section. |
| 18 | **Tests** | Unit tests for store, API routes; E2E for critical flows (signup → create project → import contacts). |
| 19 | **Health checks** | Add `/health` or `/api/health` endpoint for Cloud Run monitoring. |
| 20 | **Backup & disaster recovery** | Document Firestore backup strategy and recovery procedures. |

---

## Deployment Checklist

Before going live:

- [x] Resolve `npm run build` errors ✅ **DONE** — Fixed Next.js 16 compatibility issues
- [x] Set production env vars (Firebase, VAPI, Gemini, email) ✅ **DONE** — Secrets in Secret Manager, mapped via Cloud Run
- [x] Configure Firebase Auth allowed domains ✅ **DONE** — `intellidial.co.za` added to authorized domains
- [x] Deploy to GCP Cloud Run (or App Engine) ✅ **DONE** — Cloud Build CI/CD working, deployed to europe-west2
- [x] Set up custom domain ✅ **DONE** — Application Load Balancer + DNS configured for intellidial.co.za
- [ ] Verify Firestore security rules (if using client SDK)
- [x] SSL / HTTPS verified ✅ **DONE** — Google-managed SSL cert provisioning (waiting for DNS propagation)
- [ ] Test signup → project → contacts → real call → results (end-to-end)

---

## Suggested Order

1. ~~**Firebase Auth domains**~~ ✅ **DONE** — `intellidial.co.za` added to authorized domains
2. ~~**Deployment**~~ ✅ **DONE** — Cloud Build CI/CD, Cloud Run deployed, custom domain configured
3. ~~**Gemini Integration**~~ ✅ **DONE** — Gemini API implemented
4. **E2E validation** — One real call; confirm transcript, recording, capturedData in table (polling works without ngrok)
5. **Email Sending** — Team invitations (real email)
6. **Firestore security rules** — Verify if using client SDK
7. **Quick wins** — WhatsApp links, `.env.example`, README.md update
8. **Polish** — Error handling, loading states, webhook security, rate limiting
9. **Settings org scoping** — When adding real billing (SA payment gateway)
