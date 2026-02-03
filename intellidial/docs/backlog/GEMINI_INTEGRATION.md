# Gemini Integration - Backlog

## Instructions Tab Auto-Fill

### Current Status
- ✅ Mock AI generation by industry (`api/projects/[id]/generate`)
- ✅ Org validation before generate (x-user-id, getProject)
- ❌ **Real Gemini API not implemented**

### Task: Replace Mock with Gemini API

**Location**: `src/app/api/projects/[id]/generate/route.ts`

**What needs to be done**:
1. Add `GEMINI_API_KEY` to `.env`
2. Create `src/lib/gemini/client.ts` (server-side only)
3. Replace MOCK_BY_INDUSTRY with Gemini API calls for:
   - [ ] Tone (from industry, goal)
   - [ ] Goal (from industry)
   - [ ] Questions (from industry, count)
   - [ ] Field names (from questions)
   - [ ] Script (from full config)
4. Ensure org validation before every Gemini request
5. Document prompt templates; never include contact PII in prompts

**Priority**: High (enables rich, context-aware agent setup)

**Reference**: `architecture_plan/VAPI_GEMINI_ORG_INTEGRATION.md` — Phase 1
