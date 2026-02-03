# Intellidial — Completion Roadmap

What else needs to be done to complete the app. Grouped by priority and area.

---

## Done ✅

- **Auth & org hierarchy** — Firebase Auth, org creation, signup, setup, invite flow
- **Data segregation** — Projects, contacts, dashboard stats scoped by org
- **Firestore persistence** — Orgs, projects, team members, invitations
- **Dashboard** — KPIs, charts, projects list, project detail
- **Contacts** — Paste numbers, CSV upload, manual entry, queue
- **Instructions tab** — Capture fields, agent script, mock AI generate
- **Results & export** — Call table, transcript, recording, CSV export
- **Team** — Invite, list, roles, resend (mock email)
- **Settings** — Subscription, payment, invoices (mock)
- **Demo data** — Pay-less org seeded; other orgs empty
- **Architecture plan** — VAPI, Gemini, phone numbers documented

---

## Critical Path — Core Functionality

These block the core value: real AI phone calls.

| # | Task | Location | Status |
|---|------|----------|--------|
| 1 | **Gemini Integration** | [backlog/GEMINI_INTEGRATION.md](./backlog/GEMINI_INTEGRATION.md) | ❌ |
| 2 | **VAPI Assistant Creation** | [backlog/VAPI_ASSISTANT_CREATION.md](./backlog/VAPI_ASSISTANT_CREATION.md) | ❌ |
| 3 | **Phone Numbers** | [backlog/PHONE_NUMBERS.md](./backlog/PHONE_NUMBERS.md) | ❌ |
| 4 | **VAPI Calls & Webhooks** | [backlog/VAPI_CALLS_WEBHOOKS.md](./backlog/VAPI_CALLS_WEBHOOKS.md) | ❌ |

Without these four, the app cannot make real outbound calls or show real call results.

---

## High Priority — Production Ready

| # | Task | Description |
|---|------|--------------|
| 5 | **Contacts Firestore persistence** | Contacts are in-memory only. On server restart they’re lost. Need to persist contacts to Firestore (e.g. subcollection `projects/{id}/contacts` or top-level `contacts` with `projectId`). |
| 6 | **Email Sending** | Real email for team invitations. See [backlog/EMAIL_SENDING.md](./backlog/EMAIL_SENDING.md). |
| 7 | **Settings org scoping** | Settings API returns mock data without org validation. When wiring Stripe, scope by org. See [backlog/SETTINGS_ORG_SCOPING.md](./backlog/SETTINGS_ORG_SCOPING.md). |

---

## Medium Priority — Polish & Reliability

| # | Task | Description |
|---|------|--------------|
| 8 | **Error handling** | Consistent error states (API failures, network errors). User-friendly messages and retry options. |
| 9 | **Loading states** | Skeletons or spinners where fetches take time. Avoid blank flashes. |
| 10 | **Firebase Auth production config** | Verify production domains in Firebase Console. Ensure redirect URLs and session handling work in prod. |
| 11 | **Environment variables** | Document all `.env` vars. Use different configs for dev/staging/prod. |
| 12 | **VAPI webhook security** | Verify VAPI webhook signature. Reject forged requests. |
| 13 | **Rate limiting** | Protect API routes from abuse (e.g. per-user or per-org limits). |
| 14 | **Build fix** | `generate is not a function` error on `npm run build`. Resolve before deployment. |

---

## Lower Priority — Nice to Have

| # | Task | Description |
|---|------|--------------|
| 15 | **Real billing (Stripe)** | Replace mock subscription/invoices with Stripe. Tie usage (calls used) to plans. |
| 16 | **Call consent / TCPA** | Ensure contacts have consented to be called. Document compliance. See architecture doc notes on TCPA. |
| 17 | **Inbound calls** | If orgs want to receive calls on their number, VAPI supports `assistantId` on the phone number. |
| 18 | **Twilio BYON** | Bring Your Own Number for international (e.g. SA +27). See architecture plan Phone Numbers section. |
| 19 | **Logging & monitoring** | Structured logs, error tracking (e.g. Sentry), basic metrics. |
| 20 | **Tests** | Unit tests for store, API routes; E2E for critical flows (signup → create project → import contacts). |

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
- [ ] Test signup → project → contacts → run (end-to-end)

---

## Suggested Order

1. **Contacts Firestore** — Prevents data loss; unblocks production
2. **Gemini Integration** — Improves Instructions tab
3. **Phone Numbers** — Required before real calls
4. **VAPI Assistant Creation** — Required before real calls
5. **VAPI Calls & Webhooks** — Enables real calling
6. **Email Sending** — Team invitations
7. **Build fix** — Required for deployment
8. **Settings org scoping** — When adding real billing
9. **Deployment** — Ship MVP
10. **Polish** — Error handling, loading, monitoring
