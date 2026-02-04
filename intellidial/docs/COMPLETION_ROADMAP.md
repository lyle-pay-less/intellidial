# Intellidial — Completion Roadmap

What else needs to be done to complete the app. Grouped by priority and area.

---

## Done ✅

- **Auth & org hierarchy** — Firebase Auth, org creation, signup, setup, invite flow
- **Data segregation** — Projects, contacts, dashboard stats scoped by org
- **Firestore persistence** — Orgs, projects, team members, invitations, **contacts** (top-level `contacts` with `projectId`)
- **Dashboard** — KPIs, charts, projects list, project detail
- **Contacts** — Paste numbers, CSV upload, manual entry, queue (persisted to Firestore)
- **Instructions tab** — Capture fields, agent script, mock AI generate
- **Results & export** — Call table, transcript, recording, captured data columns, CSV export
- **VAPI real calls** — POST /call, lazy assistant + structured output per project, one phone number (env), usage limits (calls used/limit)
- **Call results** — Transcript, recording, structured output (capturedData) via webhook or **sync-calls polling** (no ngrok)
- **Usage** — Org usage (callsUsed/callsLimit), UsageWidget, 402 when over limit
- **Team** — Invite, list, roles, resend (mock email)
- **Settings** — Subscription, payment, invoices (mock)
- **Demo data** — Pay-less org seeded; other orgs empty
- **Architecture plan** — VAPI, Gemini, phone numbers documented

---

## Critical Path — Remaining

Real calling is implemented. Remaining for full production readiness:

| # | Task | Location | Status |
|---|------|----------|--------|
| 1 | **Gemini Integration** | [backlog/GEMINI_INTEGRATION.md](./backlog/GEMINI_INTEGRATION.md) | Partial (generate: questions, field names, script) |
| 2 | **E2E validation** | — | Test real call → transcript/recording/capturedData in table (polling or webhook) |

---

## High Priority — Production Ready

| # | Task | Description |
|---|------|--------------|
| 5 | **Email Sending** | Real email for team invitations. See [backlog/EMAIL_SENDING.md](./backlog/EMAIL_SENDING.md) |
| 6 | **Settings org scoping** | Settings API returns mock data without org validation. When wiring Stripe, scope by org. See [backlog/SETTINGS_ORG_SCOPING.md](./backlog/SETTINGS_ORG_SCOPING.md). |

---

## Medium Priority — Polish & Reliability

| # | Task | Description |
|---|------|--------------|
| 7 | **Error handling** | Consistent error states (API failures, network errors). User-friendly messages and retry options. |
| 8 | **Loading states** | Skeletons or spinners where fetches take time. Avoid blank flashes. |
| 9 | **Firebase Auth production config** | Verify production domains in Firebase Console. Ensure redirect URLs and session handling work in prod. |
| 10 | **Environment variables** | Document all `.env` vars. Use different configs for dev/staging/prod. |
| 11 | **VAPI webhook security** | Verify VAPI webhook signature. Reject forged requests. |
| 12 | **Rate limiting** | Protect API routes from abuse (e.g. per-user or per-org limits). |
| 13 | **Build fix** | `generate is not a function` error on `npm run build`. Resolve before deployment. |

---

## Lower Priority — Nice to Have

| # | Task | Description |
|---|------|--------------|
| 14 | **Real billing (Stripe)** | Replace mock subscription/invoices with Stripe. Tie usage (calls used) to plans. |
| 15 | **Call consent / TCPA** | Ensure contacts have consented to be called. Document compliance. See architecture doc notes on TCPA. |
| 16 | **Inbound calls** | If orgs want to receive calls on their number, VAPI supports `assistantId` on the phone number. |
| 17 | **Twilio BYON** | Bring Your Own Number for international (e.g. SA +27). See architecture plan Phone Numbers section. |
| 18 | **Logging & monitoring** | Structured logs, error tracking (e.g. Sentry), basic metrics. |
| 19 | **Tests** | Unit tests for store, API routes; E2E for critical flows (signup → create project → import contacts). |

---

## Deployment Checklist

Before going live:

- [ ] Resolve `npm run build` errors
- [ ] Set production env vars (Firebase, VAPI, Gemini, email)
- [ ] Configure Firebase Auth allowed domains
- [ ] Deploy to Vercel (or chosen host)
- [ ] Set up custom domain
- [ ] Verify Firestore security rules (if using client SDK)
- [ ] SSL / HTTPS verified
- [ ] Test signup → project → contacts → real call → results (end-to-end)

---

## Suggested Order

1. **E2E validation** — One real call; confirm transcript, recording, capturedData in table (polling works without ngrok)
2. **Build fix** — Required for deployment (`npm run build`)
3. **Email Sending** — Team invitations (real email)
4. **Settings org scoping** — When adding real billing (Stripe)
5. **Deployment** — Set prod env vars, deploy (e.g. Vercel)
6. **Polish** — Error handling, loading states, optional webhook signing
