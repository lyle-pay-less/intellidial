# IntelliDial: Recommendations Implementation Plan

Based on external recommendations (voice, scaling, cost, compliance), this doc tracks what to do and what’s done.

---

## 1. Voice & accent (African English)

**Goal:** Use voices that sound local, not “American robots.”

| Action | Status | Notes |
|--------|--------|--------|
| **ElevenLabs African English** | In progress | Add voices: **Shrey** (Engaging), **Darwin** (Mature/Wise), **Opsy** (Direct/Professional). Get voice IDs from [ElevenLabs Voice Library](https://elevenlabs.io/voice-library) (filter by African English) and add to `ELEVENLABS_VOICE_IDS` in `src/lib/vapi/client.ts`. Dropdown entries added; replace placeholder IDs when you have them. |
| **Cartesia Sonic-3** (optional) | Backlog | Low-latency alternative. Would require adding `provider: "cartesia"` and a Cartesia voice in the VAPI client. |
| **VAPI voice config** | Done | When changing voice, ensure assistant’s `firstMessage` and `voiceId` are updated (we already do this in `buildAssistantConfig`). Prefer ElevenLabs Turbo/Flash in VAPI for cost. |

---

## 2. Scaling to 10k+ contacts

**Goal:** Avoid 429s and manage large batches.

| Action | Status | Notes |
|--------|--------|--------|
| **GCP Cloud Tasks + batch** | Backlog | Flow: upload contacts → “Start campaign” enqueues N tasks → Cloud Tasks calls a Cloud Run worker at e.g. 10/s → worker calls VAPI `/call` or `/campaign`. Keeps within VAPI concurrency. |
| **VAPI Campaigns** | Backlog | If product allows, use VAPI’s Campaigns API: upload CSV, VAPI handles scheduling/retries. See [VAPI Campaigns](https://docs.vapi.ai/outbound-campaigns/overview). |

---

## 3. Cost reduction

**Goal:** Lower LLM and TTS cost at scale.

| Action | Status | Notes |
|--------|--------|--------|
| **Gemini 1.5 Flash** | Optional | We use `gemini-2.5-flash` for URL context. For non-URL generation (tone, goal, script), consider `gemini-1.5-flash` via `GEMINI_MODEL` if cheaper and sufficient. |
| **Gemini context caching** | Backlog | For repeated large business context: use Vertex AI / Gemini context caching so the same ~5k-token block is cached (~90% discount on cached tokens). Requires Vertex AI setup. |
| **ElevenLabs Flash in VAPI** | Config | In VAPI dashboard, choose ElevenLabs “Flash” (or Turbo) model for the assistant to reduce TTS cost vs Multilingual v2. |

---

## 4. South African compliance (POPIA)

**Goal:** Align with POPIA for AI outbound calls.

| Action | Status | Notes |
|--------|--------|--------|
| **Compliance block in system prompt** | Done | Agent identifies as AI and offers opt-out / do-not-call. See `buildSystemPrompt` in `src/lib/vapi/client.ts`. |
| **`optOut` on contacts** | Done | `ContactDoc` has `optOut?: boolean`. When true, skip contact in campaigns. |
| **Detect “stop calling” in-call** | Backlog | Use VAPI tool call or end-of-call webhook: when user says “stop calling me” / opt-out, set `optOut: true` on the contact (and optionally add to org-level do-not-call list). |
| **Respect optOut when dialing** | Backlog | In campaign/worker logic, filter out contacts where `optOut === true` before calling VAPI. |

---

## Summary checklist

| Component | Recommendation | Benefit |
|-----------|----------------|--------|
| Voice | ElevenLabs African English (Shrey / Darwin / Opsy) | Local trust, lower hang-up rate |
| LLM | Gemini 1.5 Flash + context caching (when needed) | ~50%+ savings on repeated context |
| Scaling | GCP Cloud Tasks + VAPI batch/campaigns | No 429s, 10k+ contacts per org |
| Compliance | POPIA-aware prompt + optOut + “stop calling” handling | Legal safety for SA |

---

## File reference

- **Voice IDs:** `intellidial/src/lib/vapi/client.ts` — `ELEVENLABS_VOICE_IDS`, `getVoiceProviderAndId`
- **System prompt (POPIA):** `intellidial/src/lib/vapi/client.ts` — `buildSystemPrompt`
- **Contact model:** `intellidial/src/lib/firebase/types.ts` — `ContactDoc.optOut`
- **Store (optOut):** `intellidial/src/lib/data/store.ts` — when reading/updating contacts and when building call lists
