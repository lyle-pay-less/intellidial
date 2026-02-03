# VAPI Calls & Webhooks - Backlog

## Outbound Calls and Call Results

### Current Status
- ✅ Project run simulation (mock)
- ✅ Contact status, callResult structure
- ❌ **Real VAPI call initiation not implemented**
- ❌ **No webhook endpoint for call-ended**

### Task: Implement Real Calls and Webhooks

**Location**: `src/app/api/projects/[id]/run/route.ts`, `src/app/api/webhooks/vapi/call-ended/route.ts` (new)

**What needs to be done**:

1. **Call initiation API** (update run route or add dedicated call API):
   - [ ] Validate project has assistantId
   - [ ] Validate org has phoneNumberId (see PHONE_NUMBERS.md)
   - [ ] For each contact in queue: POST VAPI /call { assistantId, phoneNumberId, customer }
   - [ ] Store VAPI call ID in contact for webhook correlation

2. **Webhook endpoint** `/api/webhooks/vapi/call-ended`:
   - [ ] Create route
   - [ ] Verify webhook signature (VAPI secret)
   - [ ] Parse payload: callId, assistantId, transcript, customData
   - [ ] Look up project by assistantId
   - [ ] Validate project → org
   - [ ] Update contact: status, callResult (transcript, capturedData)
   - [ ] Handle duplicate deliveries (idempotency)

3. **Security**:
   - [ ] Never trust client-provided org/project
   - [ ] Resolve assistantId → project → orgId server-side

**Priority**: High (core calling functionality)

**Reference**: `architecture_plan/VAPI_GEMINI_ORG_INTEGRATION.md` — Phase 3
