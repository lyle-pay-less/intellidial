# Gemini Integration - Backlog

## Instructions Tab Auto-Fill

### Current Status
- ✅ Mock AI generation by industry (`api/projects/[id]/generate`) — fallback when Gemini not configured
- ✅ Org validation before generate (x-user-id, getProject)
- ✅ **Gemini API implemented** — used when `GEMINI_API_KEY` is set

### Task: Replace Mock with Gemini API — DONE

**Location**: `src/app/api/projects/[id]/generate/route.ts`, `src/lib/gemini/client.ts`

**Done**:
1. ✅ Add `GEMINI_API_KEY` to `.env` (see `.env.example`)
2. ✅ Create `src/lib/gemini/client.ts` (server-side only)
3. ✅ Gemini API used for: Tone (from industry), Goal (from industry), Questions (from industry + optional goal), Field names (from questions), Script (one coherent prompt from tone + goal + questions)
4. ✅ Org validation before every request
5. ✅ Prompts use only industry/goal/questions — no contact PII
6. ✅ Final agent script is one coherent flowing prompt (Gemini combines tone, goal, questions; fallback builds one paragraph)

**Priority**: High (enables rich, context-aware agent setup)

**Reference**: `architecture_plan/VAPI_GEMINI_ORG_INTEGRATION.md` — Phase 1
