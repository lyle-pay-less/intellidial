# VAPI + Twilio: Setup and Scalability Discussion

**Goal:** When we sign a client, how do we set up voice (VAPI) and telephony (Twilio) with minimal manual work, and how do we keep subscribers separated so this scales as SaaS?

---

## Current setup

- **VAPI** — voice AI (assistants, prompts, web SDK for demo, outbound calls).
- **Twilio** — phone number(s), PSTN connectivity, outbound/inbound calls.

When a **client** wants to run campaigns (e.g. debt collection, appointment reminders), they need:
1. An AI agent (prompt, questions, behaviour) — we already model this in the back office (Instructions).
2. A way to place/receive calls — today that’s VAPI + Twilio.

The open question is: **who provisions and owns the Twilio side, and how do we isolate each client on VAPI?**

---

## When we sign a client: what has to happen?

| Step | Who does it today? | Manual? |
|------|--------------------|--------|
| Create/configure the AI agent (prompt, questions, voice) | Us (or client via back office) | Low if we use our app; high if we do it in VAPI dashboard. |
| Get a phone number for outbound/inbound | Someone has to buy and configure it on Twilio | **High** — Twilio account, number purchase, billing. |
| Connect Twilio ↔ VAPI | Configure VAPI to use Twilio for telephony | Per-account or per-phone-number setup. |
| Point client’s “campaign” at the right number and agent | Us or client | Depends on how we model “one client = one number” or “one client = many numbers”. |

To scale as SaaS we want: **minimal manual steps per new client**, and **clear separation so Client A never sees or uses Client B’s data or usage**.

---

## Option A: We own Twilio and numbers (full-service)

- **Idea:** One Twilio account (ours). We buy numbers (or a pool) and assign them to clients. VAPI is configured to use our Twilio account for outbound/inbound.
- **Pros:** Client signs up and gets going quickly; we control quality and routing; one billing relationship (us ↔ Twilio).
- **Cons:** We pay for all numbers and usage; we’re on the hook for carrier compliance (e.g. debt collection rules); scaling = we buy more numbers and manage them.
- **Manual work:** Per new client we assign a number (or reuse a pool), configure VAPI assistant/phone-number mapping. Can be reduced with a small internal “admin” flow (e.g. “Create client → allocate number → create VAPI assistant”).

---

## Option B: Client brings their own Twilio (BYON – bring your own number)

- **Idea:** We tell the business: “You need a Twilio account and a number. Here’s a step-by-step guide (or video). Once you’ve created the number and got your Twilio SID/token, paste them into our app.” Our app (or a secure onboarding flow) configures VAPI to use **their** Twilio credentials for their campaigns.
- **Pros:** They pay Twilio directly; they own their number and compliance; we don’t manage numbers or carrier relationships.
- **Cons:** Friction at signup; support burden (“I don’t understand Twilio”); we must securely store and use per-client Twilio credentials and ensure we never use Client A’s creds for Client B.
- **Manual work:** Lower for us (no number buying), but we may need to “walk them through” unless the guide is very good. Optional: “managed onboarding” where we do the Twilio steps for them once, then hand over.

---

## Option C: Hybrid – we use VAPI’s telephony, client optionally brings number

- **Idea:** Use **VAPI’s built-in telephony** (if VAPI offers numbers or resells Twilio) so the default is “no Twilio needed.” Client gets a VAPI number or we assign from a pool. Only if they need their own number (e.g. existing number, compliance) do we support “bring your own” (Twilio or other) and wire it in.
- **Pros:** Easiest for small clients (no Twilio at all); we still can support power users who need their own number.
- **Cons:** Depends on what VAPI actually offers (number provisioning, pricing, regions). Need to confirm in VAPI docs/dashboard.
- **Manual work:** Depends on VAPI’s UX. If “create number in VAPI” is one click, then low.

---

## Separating subscribers on VAPI (multi-tenant)

- **Assumption:** We should **not** give every client the same VAPI account. We need:
  - **Per-client (or per-tenant) isolation:** Client A’s assistants, numbers, and call data are not visible or usable by Client B.
  - **Billing/usage:** So we can attribute usage to the right client (for our own SaaS billing and limits).
  - **Security:** No cross-tenant data leakage.

**Ways to get there:**

1. **VAPI “sub-accounts” or “organizations” (if they exist)**  
   Check VAPI docs for teams, workspaces, or child accounts. One VAPI “org” per client → we create an org when we onboard the client, and all their assistants/numbers live there. We use one master API key to create/manage these, or use per-org API keys stored in our backend.

2. **Single VAPI account, tag/label by client**  
   One account; every assistant and phone number is tagged with `client_id` (or similar) in our database. We never expose or use another client’s assistants. VAPI might not enforce this — we enforce it in our app and in how we call VAPI (e.g. we only ever pass that client’s assistant IDs). Risk: if our app is wrong, or someone gets API keys, boundaries can be crossed.

3. **One VAPI account per client (separate signups)**  
   We create a new VAPI account (e.g. via API or invite) per client. Each client has their own login and their own billing with VAPI. We then only need to “link” our platform to their VAPI (e.g. OAuth or API key they paste in). Isolation is natural; downside is onboarding (“go sign up at VAPI”) and we might not have a single dashboard to manage everyone.

**Recommendation to validate:** Check VAPI’s docs for **multi-tenant / teams / workspaces**. If they support it, “one workspace per client” + we own the master account is likely the best balance of control and isolation.

---

## Recommendation (to be refined)

- **Short term (minimal manual work):**  
  - Use **one VAPI account** (ours) and **clearly tag every asset (assistant, number) with `client_id`** in our database.  
  - Prefer **Option C** if VAPI offers numbers: default = “we assign you a VAPI number,” no Twilio for the client. If VAPI doesn’t offer that, then **Option B (BYON)** with a very clear “Twilio setup in 5 minutes” guide (and optional “we do it for you” for a fee).  
  - Avoid Option A unless we’re ready to own all numbers and compliance.

- **As we scale:**  
  - Move to **per-client VAPI workspaces/sub-accounts** if available, so isolation is enforced by VAPI, not only by our app.  
  - Automate “create client → create VAPI workspace → create default assistant from template” so that signing a client is one click in our back office, and we only touch Twilio when the client brings their own number.

---

## Open questions

1. Does VAPI support **workspaces / organizations / sub-accounts** for multi-tenant separation? What does the API look like?
2. Does VAPI **sell or provision phone numbers** (e.g. Twilio resell), or do we always have to bring Twilio (or another SIP/carrier)?
3. For **BYON (Option B):** Where do we store the client’s Twilio SID/token (vault, env per tenant, encrypted in DB)? How do we pass them to VAPI securely (e.g. per-request, or “register” with VAPI once per client)?
4. **Compliance:** For debt collection (or other regulated use cases), do we need the number to be in the client’s name (then BYON is better) or is “our number, their campaign” acceptable in our target markets?
5. **Back office:** Do we add “Telephony” or “Numbers” to the Settings (or onboarding) flow: “Use Intellidial number” vs “Connect your Twilio” with a form for SID/token/number?

---

## Next steps

- [ ] Confirm VAPI’s multi-tenant and number-provisioning options (docs + dashboard).
- [ ] Decide: default to VAPI numbers (Option C) or BYON (Option B) as first GA.
- [ ] Document “Twilio setup in 5 minutes” (or “we do it for you”) if BYON.
- [ ] Design back-office flow: create client → create VAPI workspace/assistant → optional Twilio link.
- [ ] Define where and how we store per-client telephony credentials (vault, encryption, env).

---

*This doc is for discussion. Update as we validate with VAPI and Twilio and lock in the architecture.*
