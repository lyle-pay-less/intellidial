# VAPI & Gemini Integration Architecture

## Overview

This document outlines how we connect **VAPI** (voice AI calls) and **Gemini** (AI content generation) to each organization in Intellidial. The design ensures:

- **Organization independence** — Each company’s data and agents are isolated
- **No data leaks** — Strict org-scoping on all APIs and storage
- **Minimal manual work** — Platform-level API keys; assistants created per project

---

## End-to-End Flow

```
1. Instructions Tab (Gemini auto-fill)
   └── User selects industry → clicks "Generate tone/goal/questions"
   └── API validates org → Gemini generates → returns to UI
   └── User edits → saves project config (agentInstructions, captureFields, etc.)

2. Create Agent (VAPI assistant)
   └── When project is ready for calls: create/update VAPI assistant via API
   └── Map project config → VAPI assistant (system prompt, tools, voice)
   └── Store assistantId in project (Firestore)

3. Import Contacts
   └── Upload CSV / manual entry → contacts tied to project (projectId)
   └── Project is org-scoped → contacts implicitly org-scoped

4. Call Queue
   └── Order contacts for calling (queue per project)
   └── All queue data scoped by project → org

5. Calls (VAPI)
   └── Initiate call with project’s assistantId
   └── VAPI webhooks → update contact status/transcript
   └── Webhook handler validates call belongs to our project/org
```

---

## Phone Numbers (Per-Org Caller ID)

Each company needs its own phone number so calls show their business as the caller. This section covers how we provision and assign numbers per org.

### Requirements

- **One number per org** — Each org gets one primary outbound caller ID (phone number).
- **No cross-org use** — Org A cannot use Org B's number.
- **Minimal manual work** — Prefer automated provisioning where possible.

### VAPI Phone Number Model

- **Outbound call** requires: `assistantId`, `phoneNumberId`, `customer.number`.
- **Phone numbers** can be:
  1. **Free VAPI numbers** — US only, up to 10 per VAPI account, created via dashboard or `POST /phone-numbers`.
  2. **Imported from Twilio** — For international or higher limits; org provides Twilio credentials.

### Options for Per-Org Numbers

| Option | Approach | Manual work | Best for |
|--------|----------|-------------|----------|
| **A. Platform provisions (free US)** | We provision via `POST /phone-numbers` when org is ready for calls. Store `phoneNumberId` on org. | Low — fully automated | US-only orgs, MVP |
| **B. Bring Your Own Number (BYON)** | Org connects Twilio, imports number via VAPI `/phone-numbers/import`. We store `phoneNumberId` on org. | Medium — org needs Twilio | International, existing numbers |
| **C. Hybrid** | Default: platform provisions (A). Enterprise: org can BYON (B). | Low for default; medium for BYON | Production |

**Recommendation:** Start with **Option A** (platform provisions). Add **Option B** for international and enterprise.

### Data Model

```
organizations/{orgId}
  name: string
  ownerId: string
  phoneNumberId?: string      // VAPI phone number ID (caller ID for outbound)
  phoneNumberE164?: string    // Human-readable e.g. +1234567890
  phoneNumberStatus?: "none" | "pending" | "active" | "imported"
  createdAt: string
```

### Provisioning Flow (Platform Provisioned)

```
1. Org is created (signup/setup)
2. When org first runs calls (or explicitly "Add phone number"):
   a. API: getUserOrganization(userId) → orgId
   b. If !org.phoneNumberId:
      i.   POST https://api.vapi.ai/phone-numbers
           { provider: "vapi", ... } for free US number
      ii.  Save phoneNumberId, phoneNumberE164 to org (Firestore)
   c. If VAPI account at limit (10 free numbers): return error, prompt BYON
3. Use org.phoneNumberId for all outbound calls from that org
```

### Provisioning Flow (Bring Your Own Number)

```
1. Org owner goes to Settings → Phone Number
2. Clicks "Connect Twilio" or "Import my number"
3. Enters Twilio Account SID, Auth Token, and Twilio phone number SID
4. API: POST https://api.vapi.ai/phone-numbers/import
   { twilioAccountSid, twilioAuthToken, twilioPhoneNumberSid }
5. VAPI returns phoneNumberId; save to org
6. Mark org.phoneNumberStatus = "imported"
```

**Security:** Never store Twilio credentials long-term. Use them once for import; VAPI holds the mapping.

### Call Initiation Flow (Updated)

```
1. User triggers call for contact
2. API: getProject(id, orgId), getOrganization(orgId), getProjectQueue(id)
3. Validate contact belongs to project
4. Validate org has phoneNumberId (return error if not)
5. POST VAPI /call {
     assistantId: project.assistantId,
     phoneNumberId: org.phoneNumberId,   // org's caller ID
     customer: { number: contact.phone }
   }
6. Store call ID in contact for webhook correlation
```

### Org Isolation

| Check | Purpose |
|-------|---------|
| `org.phoneNumberId` exists | Org has a number before calls |
| `phoneNumberId` stored on org | Number belongs to org only |
| Lookup by orgId | No cross-org number usage |
| BYON: validate org ownership | Only org owner can import numbers |

### Implementation Phases (Phone Numbers)

- [ ] Add `phoneNumberId`, `phoneNumberE164`, `phoneNumberStatus` to org type and Firestore
- [ ] Create `/api/org/phone-number` — GET (status), POST (provision or import)
- [ ] Settings page: "Phone Number" section — show status, provision or BYON flow
- [ ] Update call initiation API to require and use `org.phoneNumberId`
- [ ] Handle VAPI 10-number limit (error message, BYON prompt)
- [ ] (Later) BYON flow: Twilio import UI and API

### Open Questions (Phone Numbers)

1. **Region** — Free VAPI numbers are US only. For SA (e.g. +27), we need Twilio or similar. When do we add Twilio integration?
2. **Number pool vs per-org** — One number per org vs shared pool with assignment. One per org is simpler and matches "each company has their own number".
3. **Inbound** — If org wants to receive calls on the same number, VAPI supports `assistantId` on the phone number. Out of scope for MVP but document for later.

---

## Gemini Integration

### Role

- **Instructions Tab** — Auto-fill tone, goal, questions, capture field names, and script when user clicks generate buttons.
- **Current state** — Mock data by industry (see `api/projects/[id]/generate`).
- **Target state** — Real Gemini API calls for richer, context-aware content.

### Architecture

| Concern | Approach |
|--------|----------|
| **API key** | Single platform key: `GEMINI_API_KEY` in `.env`. Server-side only. |
| **Per-org** | No per-org Gemini key. Stateless; each request validates user/org before calling Gemini. |
| **Data isolation** | Request: `x-user-id` → `getUserOrganization` → `orgId`. Validate project with `getProject(id, orgId)`. Only include org-scoped context (industry, goal) in the prompt. Never send contact PII to Gemini for generation. |
| **Prompt safety** | Include only project metadata (industry, tone, goal) in prompts. Do not include contact names, phones, or call transcripts in generation requests. |

### API Flow

```
POST /api/projects/[id]/generate
  Headers: x-user-id
  1. getOrgFromRequest(req) → orgId
  2. getProject(id, orgId) → project (404 if wrong org)
  3. Build prompt from project.industry, project.goal, body.type
  4. Call Gemini API
  5. Return generated content
```

### Security Checklist

- [ ] Gemini API key in server env only
- [ ] All generate requests require `x-user-id` and validate org
- [ ] No contact PII in Gemini prompts
- [ ] Do not log full prompts/responses with PII

---

## VAPI Integration

### Role

- **Voice AI calls** — Place outbound calls using project-specific assistant config.
- **Per-project assistant** — Each project gets its own VAPI assistant (created when project is ready for calls).
- **Webhooks** — Call status, transcripts, and captured data sent back to our API.

### Architecture

| Concern | Approach |
|--------|----------|
| **API key** | Single platform key: `VAPI_API_KEY` (private) in `.env`. Server-side only. Public key for client widget only where needed. |
| **Assistants** | Create one VAPI assistant per project via `POST /v1/assistant`. Store `assistantId` in project document (Firestore). |
| **Per-org** | Assistants are scoped by project; projects are scoped by org. No per-org VAPI accounts. |
| **Creation trigger** | Lazy: when user runs calls (or explicitly “Create agent”), check `project.assistantId`. If missing, create assistant via VAPI API, save to project, then use. |

### Project → VAPI Assistant Mapping

| Project field | VAPI assistant field |
|---------------|----------------------|
| `agentInstructions` | `model.messages[0].content` (system prompt) |
| `goal` | Part of system prompt |
| `tone` | Part of system prompt |
| `agentQuestions` | Tools / function calling or structured in prompt |
| `captureFields` | Custom data schema for call end webhook |
| `industry` | Context for prompt |

### Create Assistant Flow

```
1. User clicks "Run" or "Create agent" for project
2. API: getProject(id, orgId) → project
3. If !project.assistantId:
   a. Build assistant config from project (prompt, tools, voice)
   b. POST https://api.vapi.ai/assistant { name, model, ... }
   c. Save assistantId to project (Firestore)
4. Use assistantId for calls
```

### Call Initiation Flow

```
1. User triggers call for contact
2. API: getProject(id, orgId), getOrganization(orgId), getProjectQueue(id)
3. Validate contact belongs to project
4. Validate org has phoneNumberId (required for outbound; see Phone Numbers section)
5. POST VAPI /call with assistantId, phoneNumberId (org's caller ID), customer.number
6. Store call ID in contact for webhook correlation
```

### Webhook Flow (VAPI → Us)

```
1. VAPI sends POST to /api/webhooks/vapi/call-ended
2. Payload includes: callId, assistantId, transcript, customData
3. Look up project by assistantId (or callId → contact → project)
4. Validate project belongs to an org we manage
5. Update contact status, transcript, capturedData
6. Do not trust client-provided org/project; always resolve server-side
```

### Security Checklist

- [ ] VAPI private API key in server env only
- [ ] Create assistants only via server API (never from client)
- [ ] Store `assistantId` in project (org-scoped)
- [ ] Webhook handler validates assistantId → project → org
- [ ] Use webhook signing / secret to verify requests are from VAPI

---

## Data Model Additions

### Project (Firestore)

```
projects/{projectId}
  orgId: string
  assistantId?: string    // VAPI assistant ID (added when agent is created)
  // ... existing fields
```

### Invariants

- `assistantId` is optional; set when first creating the VAPI assistant.
- `assistantId` is unique per project; projects are unique per org.
- All lookups: `assistantId` → project → orgId.

---

## Organization Isolation Summary

| Layer | Isolation mechanism |
|-------|---------------------|
| **API** | All routes require `x-user-id` → `getUserOrganization(userId)` → orgId |
| **Projects** | `listProjects(orgId)`, `getProject(id, orgId)` |
| **Contacts** | Tied to project; project access validated first |
| **Gemini** | orgId validated before request; no cross-org context in prompts |
| **VAPI** | assistantId stored in project; phoneNumberId stored on org; both org-scoped |
| **Webhooks** | assistantId → project → orgId; no client-provided org |

---

## Manual Work Minimization

| Task | Approach |
|------|----------|
| **Gemini** | One `GEMINI_API_KEY` in `.env`. No per-org setup. |
| **VAPI** | One `VAPI_API_KEY` in `.env`. Assistants created per project via API. |
| **New org** | No extra config. Org created at signup; projects/assistants created on demand. |
| **New project** | User fills Instructions tab → saves → assistant created when first run. |
| **Phone number** | Platform provisions (free US) when org first runs calls; or org BYON via Twilio. |

---

## Implementation Phases

### Phase 1: Gemini (Instructions tab)

- [ ] Add `GEMINI_API_KEY` to `.env`
- [ ] Create `src/lib/gemini/client.ts` (server-side only)
- [ ] Replace mock logic in `/api/projects/[id]/generate` with Gemini calls
- [ ] Ensure org validation before every Gemini request
- [ ] Document prompt templates and avoid PII in prompts

### Phase 2: VAPI assistant creation

- [ ] Add `VAPI_API_KEY` to `.env`
- [ ] Create `src/lib/vapi/client.ts` (create/update assistant)
- [ ] Add `assistantId` to project type and Firestore schema
- [ ] Implement lazy assistant creation on "Run" or "Create agent"
- [ ] Map project config → VAPI assistant payload

### Phase 3: VAPI calls & webhooks

- [ ] Implement call initiation API (project + contact validation)
- [ ] Set up webhook endpoint `/api/webhooks/vapi/call-ended`
- [ ] Webhook: validate assistantId, update contact
- [ ] Add webhook secret verification

### Phase 4: End-to-end

- [ ] Connect Instructions → assistant creation → contacts → queue → calls
- [ ] Test multi-org: Org A cannot see/use Org B’s assistants or contacts
- [ ] Load and security testing

---

## Open Questions

1. **VAPI pricing** — Per-minute or per-assistant? Affects how many assistants we create.
2. **Assistant reuse** — One assistant per project vs. per campaign/run (if we add campaigns later).
3. **Gemini rate limits** — Do we need per-org quotas or caching?
4. **Webhook idempotency** — Handle duplicate webhook deliveries safely.
5. **Phone numbers** — See "Open Questions (Phone Numbers)" in the Phone Numbers section.
