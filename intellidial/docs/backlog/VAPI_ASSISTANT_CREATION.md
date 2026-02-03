# VAPI Assistant Creation - Backlog

## Per-Project Voice Agent

### Current Status
- ✅ Project config (agentInstructions, captureFields, goal, tone)
- ✅ Instructions tab UI for editing
- ❌ **VAPI assistant not created; no assistantId on project**

### Task: Create VAPI Assistant per Project

**Location**: `src/lib/vapi/client.ts` (new), `src/app/api/projects/[id]/run/route.ts`, store

**What needs to be done**:
1. Add `VAPI_API_KEY` to `.env`
2. Create `src/lib/vapi/client.ts` — createAssistant, updateAssistant
3. Add `assistantId` to project type and Firestore schema
4. Implement lazy creation: when user clicks "Run" (or "Create agent"):
   - [ ] Check if `project.assistantId` exists
   - [ ] If not: build assistant config from project, POST to VAPI, save assistantId
   - [ ] Use assistantId for calls
5. Map project config → VAPI assistant:
   - agentInstructions → system prompt
   - goal, tone → prompt context
   - captureFields → tools / custom data schema

**Priority**: High (required for real outbound calls)

**Reference**: `architecture_plan/VAPI_GEMINI_ORG_INTEGRATION.md` — Phase 2
