# Voice Selection Implementation Guide

## Understanding the Architecture

**VAPI** = The calling platform/infrastructure (handles calls, webhooks, etc.)  
**11labs** = The voice provider (text-to-speech synthesis)

When you configure a VAPI assistant, you specify:
```json
{
  "voice": {
    "provider": "11labs",  // ← Tells VAPI to use 11labs for voice
    "voiceId": "21m00Tcm4TlvDq8ikWAM"  // ← 11labs voice ID
  }
}
```

So yes, we're using **VAPI** as the platform, but **11labs** is the voice provider that VAPI uses under the hood.

---

## Current State

### What Already Exists

1. **Voice Dropdown** - Already in Instructions tab
   - Location: `src/app/dashboard/projects/[id]/page.tsx`
   - Current options: default, rachel, adam, antoni, sam
   - Stored in: `project.agentVoice`

2. **Voice Mapping** - Maps dropdown values to 11labs voiceIds
   - Location: `src/lib/vapi/client.ts`
   - Current mapping:
     ```typescript
     const VOICE_IDS: Record<string, string> = {
       rachel: "21m00Tcm4TlvDq8ikWAM",
       adam: "pNInz6obpgDQGcFmaJgB",
       antoni: "ErXwobaYiN019PkySvjV",
       sam: "yoZ06aMxZJJ28mfd3POQ",
       default: "21m00Tcm4TlvDq8ikWAM",
     };
     ```

3. **VAPI Integration** - Voice is sent to VAPI when creating assistant
   - Location: `src/lib/vapi/client.ts` → `buildAssistantConfig()`
   - Format: `voice: { provider: "11labs", voiceId: "..." }`
   - VAPI receives this config and uses 11labs to synthesize the voice

---

## How Voice Selection Works

### Current Flow

```
1. User selects voice from dropdown (Instructions tab)
   ↓
2. Value saved to project.agentVoice (e.g., "rachel")
   ↓
3. When creating/updating VAPI assistant:
   - Read project.agentVoice
   - Map to 11labs voiceId using VOICE_IDS
   - Send to VAPI: { provider: "11labs", voiceId: "21m00Tcm4TlvDq8ikWAM" }
   ↓
4. VAPI uses that voice for all calls
```

### Key Components

**Frontend (Instructions Tab):**
- Dropdown with `AGENT_VOICES` options
- Stores selection in `agentVoice` state
- Saves to project on "Save instructions"

**Backend (VAPI Client):**
- `buildAssistantConfig()` reads `project.agentVoice`
- Maps to 11labs voiceId
- Includes in VAPI assistant payload

---

## Options for Expanding Voice Selection

### Option 1: Expand Static List (Simplest)

**What**: Add more voices to the existing `AGENT_VOICES` array and `VOICE_IDS` mapping.

**Pros:**
- ✅ Simplest to implement
- ✅ No API calls needed
- ✅ Fast (no loading)
- ✅ Works offline

**Cons:**
- ❌ Limited to predefined voices
- ❌ Need to manually add new voices
- ❌ No preview functionality

**Implementation:**
1. Research available 11labs voices
2. Add to `AGENT_VOICES` array
3. Add to `VOICE_IDS` mapping
4. Update UI dropdown

**11labs Voice Options:**
- **Female**: Rachel, Bella, Elli, Domi, Gigi, Glinda, Grace, Jessi, Lili, Mimi, Nicole, Sky, etc.
- **Male**: Adam, Antoni, Arnold, Daniel, Josh, Sam, etc.
- **Neutral**: Various options

---

### Option 2: Fetch from VAPI API (Dynamic)

**What**: Call VAPI API to get available voices dynamically.

**Note**: VAPI doesn't have a direct "list voices" endpoint. VAPI supports multiple voice providers (11labs, Azure, Deepgram, PlayHT, etc.), but you need to specify which provider and use that provider's voice IDs.

**If VAPI has a voice list endpoint:**
- Check VAPI docs: `GET https://api.vapi.ai/voice` (if exists)
- Filter for 11labs provider voices
- Return to frontend

**Reality**: VAPI likely doesn't expose a voice list - you'd need to use 11labs API directly or maintain a static list.

---

### Option 3: Fetch from 11labs API (Most Complete)

**What**: Call 11labs API directly to get all available voices.

**Why This Makes Sense**: Even though we're using VAPI, VAPI uses 11labs for voice synthesis, so we need 11labs voice IDs. Getting them from 11labs API gives us the most complete list.

**Pros:**
- ✅ Most comprehensive
- ✅ Get voice metadata (gender, age, accent, description)
- ✅ Can filter by criteria (gender, language, etc.)
- ✅ Preview functionality possible
- ✅ Always up-to-date with 11labs catalog

**Cons:**
- ❌ Requires 11labs API key (separate from VAPI key)
- ❌ More complex
- ❌ Additional API dependency

**11labs API:**
```
GET https://api.elevenlabs.io/v1/voices
Authorization: xi-api-key: YOUR_11LABS_API_KEY
```

**Returns:**
```json
{
  "voices": [
    {
      "voice_id": "21m00Tcm4TlvDq8ikWAM",
      "name": "Rachel",
      "category": "premade",
      "description": "Calm and collected",
      "labels": {
        "gender": "female",
        "age": "young",
        "accent": "american",
        "use case": "narration"
      }
    }
  ]
}
```

**Implementation:**
1. Get 11labs API key (separate from VAPI key)
2. Create API route: `GET /api/voices` (calls 11labs API)
3. Filter for premade voices (or include custom if user has them)
4. Return to frontend
5. Populate dropdown dynamically

---

### Option 4: Hybrid Approach (Recommended)

**What**: Static list for common voices + API fetch for full catalog.

**Pros:**
- ✅ Fast initial load (static list)
- ✅ Can expand to full catalog
- ✅ Best of both worlds

**Cons:**
- ❌ Slightly more complex
- ❌ Need to handle API failures gracefully

**Implementation:**
1. Keep static list for common voices (fast)
2. Add "Load more voices..." button
3. Fetch from API when clicked
4. Append to dropdown

---

## Recommended Approach: **Option 1 (Expanded Static List)**

**Why:**
- Simplest to implement
- Fast and reliable
- Good enough for MVP
- Can upgrade to Option 4 later

**Steps:**

### 1. Research Available 11labs Voices

**Popular Female Voices:**
- Rachel (21m00Tcm4TlvDq8ikWAM) - Clear, professional ✅ Already have
- Bella (EXAVITQu4vr4xnSDxMaL) - Warm, friendly
- Elli (MF3mGyEYCl7XYWbV9V6O) - Young, energetic
- Domi (AZnzlk1XvdvUeBnXmlld) - Deep, authoritative
- Gigi (jBpfuIE2acCO8z3wKNLl) - Calm, soothing
- Grace (oWAxZDx7w5VEj9dCyTzz) - Professional, clear
- Jessi (TxGEqnHWrfWFTfGW9XjX) - Energetic, upbeat
- Nicole (piTKgcLEGmPE4e6mEKli) - Warm, conversational
- Sky (pFZP5JQG7iQjIQuC4Bku) - Young, friendly

**Popular Male Voices:**
- Adam (pNInz6obpgDQGcFmaJgB) - Deep, professional ✅ Already have
- Antoni (ErXwobaYiN019PkySvjV) - Warm, friendly ✅ Already have
- Sam (yoZ06aMxZJJ28mfd3POQ) - Clear, professional ✅ Already have
- Arnold (VR6AewLTigWG4xSOukaG) - Deep, authoritative
- Daniel (onwK4e9ZLuTAKqWW03F9) - British accent
- Josh (TxGEqnHWrfWFTfGW9XjX) - Casual, friendly

**Note**: Voice IDs may vary - verify with 11labs documentation or API.

### 2. Update AGENT_VOICES Array

```typescript
const AGENT_VOICES = [
  { value: "default", label: "Default (Rachel)", gender: "female" },
  
  // Female voices
  { value: "rachel", label: "Rachel - Clear & Professional", gender: "female" },
  { value: "bella", label: "Bella - Warm & Friendly", gender: "female" },
  { value: "elli", label: "Elli - Young & Energetic", gender: "female" },
  { value: "domi", label: "Domi - Authoritative", gender: "female" },
  { value: "gigi", label: "Gigi - Calm & Soothing", gender: "female" },
  { value: "grace", label: "Grace - Professional", gender: "female" },
  { value: "jessi", label: "Jessi - Energetic", gender: "female" },
  { value: "nicole", label: "Nicole - Conversational", gender: "female" },
  { value: "sky", label: "Sky - Friendly", gender: "female" },
  
  // Male voices
  { value: "adam", label: "Adam - Professional", gender: "male" },
  { value: "antoni", label: "Antoni - Warm & Friendly", gender: "male" },
  { value: "sam", label: "Sam - Clear & Professional", gender: "male" },
  { value: "arnold", label: "Arnold - Authoritative", gender: "male" },
  { value: "daniel", label: "Daniel - British Accent", gender: "male" },
  { value: "josh", label: "Josh - Casual & Friendly", gender: "male" },
] as const;
```

### 3. Update VOICE_IDS Mapping

```typescript
const VOICE_IDS: Record<string, string> = {
  // Default
  default: "21m00Tcm4TlvDq8ikWAM", // Rachel
  
  // Female voices
  rachel: "21m00Tcm4TlvDq8ikWAM",
  bella: "EXAVITQu4vr4xnSDxMaL",
  elli: "MF3mGyEYCl7XYWbV9V6O",
  domi: "AZnzlk1XvdvUeBnXmlld",
  gigi: "jBpfuIE2acCO8z3wKNLl",
  grace: "oWAxZDx7w5VEj9dCyTzz",
  jessi: "TxGEqnHWrfWFTfGW9XjX",
  nicole: "piTKgcLEGmPE4e6mEKli",
  sky: "pFZP5JQG7iQjIQuC4Bku",
  
  // Male voices
  adam: "pNInz6obpgDQGcFmaJgB",
  antoni: "ErXwobaYiN019PkySvjV",
  sam: "yoZ06aMxZJJ28mfd3POQ",
  arnold: "VR6AewLTigWG4xSOukaG",
  daniel: "onwK4e9ZLuTAKqWW03F9",
  josh: "TxGEqnHWrfWFTfGW9XjX",
};
```

### 4. Enhance UI (Optional)

**Option A: Grouped Dropdown**
```tsx
<select>
  <optgroup label="Female Voices">
    <option value="rachel">Rachel - Clear & Professional</option>
    <option value="bella">Bella - Warm & Friendly</option>
    ...
  </optgroup>
  <optgroup label="Male Voices">
    <option value="adam">Adam - Professional</option>
    <option value="antoni">Antoni - Warm & Friendly</option>
    ...
  </optgroup>
</select>
```

**Option B: Voice Cards with Preview** (Advanced)
- Show voice cards with name, description, gender icon
- "Preview" button to hear sample
- More visual, better UX

---

## Advanced Features (Future)

### 1. Voice Preview

**How:**
- Use 11labs Text-to-Speech API
- Generate preview audio for each voice
- Play on hover/click
- Cache previews

**Implementation:**
```typescript
async function generateVoicePreview(voiceId: string, text: string = "Hello, this is a voice preview.") {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_monolingual_v1",
    }),
  });
  return res.blob(); // Audio blob
}
```

### 2. Voice Recommendations

**How:**
- Suggest voice based on industry/use case
- Healthcare → Warm, professional (Grace, Nicole)
- Sales → Energetic, friendly (Jessi, Antoni)
- Debt collection → Authoritative (Domi, Arnold)

### 3. Custom Voice Speed

**How:**
- Add speed slider (0.8x - 1.5x)
- Store in project settings
- Pass to VAPI: `voice: { provider: "11labs", voiceId: "...", speed: 1.1 }`

### 4. Voice Cloning (Premium)

**How:**
- Allow users to upload voice samples
- Create custom voice via 11labs API
- Store custom voiceId
- Use for their projects

---

## Implementation Checklist

### Phase 1: Expand Static List (MVP)
- [ ] Research and verify 11labs voice IDs
- [ ] Add more voices to `AGENT_VOICES` array
- [ ] Add voice IDs to `VOICE_IDS` mapping
- [ ] Test voice selection works
- [ ] Verify voice changes apply to new calls

### Phase 2: Enhanced UI (Optional)
- [ ] Group voices by gender
- [ ] Add voice descriptions
- [ ] Improve dropdown styling
- [ ] Add search/filter

### Phase 3: Voice Preview (Advanced)
- [ ] Set up 11labs API integration
- [ ] Create preview endpoint
- [ ] Add preview button to UI
- [ ] Cache preview audio

### Phase 4: Dynamic Loading (Future)
- [ ] Create `/api/voices` endpoint
- [ ] Fetch from VAPI/11labs API
- [ ] Add "Load more" functionality
- [ ] Handle API failures gracefully

---

## Important Considerations

### 1. Voice Changes & Existing Assistants

**Problem**: If user changes voice, existing VAPI assistant still uses old voice.

**Solution Options:**

**Option A: Update Assistant Immediately**
- When voice changes, update VAPI assistant
- Pros: Changes apply immediately
- Cons: API call on every change

**Option B: Update on Next Call**
- When creating/updating assistant for calls, use current voice
- Pros: No extra API calls
- Cons: Changes only apply to new assistants

**Option C: Force Recreate Assistant**
- When voice changes, clear `assistantId`
- Next call will create new assistant with new voice
- Pros: Simple, ensures update
- Cons: Loses assistant history

**Recommended**: **Option B** - Update assistant when creating/updating (already happens in `createOrUpdateAssistant()`)

### 2. Voice Provider Options

**Current**: Only 11labs

**VAPI Supports:**
- 11labs (current)
- Azure
- Deepgram
- PlayHT
- Rime
- etc.

**Future Enhancement**: Allow users to choose provider

### 3. Voice Costs

**11labs Pricing:**
- Free tier: Limited characters/month
- Paid: Per character pricing
- VAPI may include some usage in their pricing

**Consideration**: Monitor voice usage costs

### 4. Voice Quality & Suitability

**Different voices work better for:**
- **B2B calls**: Professional, clear (Rachel, Adam, Grace)
- **B2C calls**: Warm, friendly (Bella, Antoni, Nicole)
- **Healthcare**: Calm, reassuring (Gigi, Grace)
- **Sales**: Energetic, persuasive (Jessi, Antoni)
- **Debt collection**: Authoritative (Domi, Arnold)

**Future**: Add voice recommendations based on industry

---

## Testing Checklist

- [ ] Voice selection saves correctly
- [ ] Voice applies to new VAPI assistants
- [ ] Voice updates when changed
- [ ] Default voice works if none selected
- [ ] Invalid voice falls back to default
- [ ] Voice persists across project loads
- [ ] Voice works in actual calls

---

## Next Steps

1. **Verify 11labs Voice IDs** - Check current voice IDs are correct
2. **Research More Voices** - Find popular 11labs voices for your use cases
3. **Expand List** - Add 5-10 more voices to start
4. **Test** - Verify each voice works in calls
5. **Enhance UI** - Group by gender, add descriptions
6. **Add Preview** - If budget allows (11labs API)

---

## Resources

- **11labs Voices**: https://elevenlabs.io/voice-library
- **VAPI Voice Docs**: https://docs.vapi.ai/assistant/voice
- **11labs API Docs**: https://elevenlabs.io/docs/api-reference

---

## Summary

**Architecture**: 
- **VAPI** = Platform (handles calls, webhooks)
- **11labs** = Voice provider (VAPI uses 11labs for TTS)
- We configure: `{ provider: "11labs", voiceId: "..." }` in VAPI assistant config

**Current State**: ✅ Basic voice selection already works
- Dropdown exists
- Maps to 11labs voice IDs
- Sent to VAPI correctly

**To Expand**: Add more voices to static list (simplest)
- Expand `AGENT_VOICES` array
- Add corresponding 11labs voice IDs to `VOICE_IDS` mapping

**Future**: Add preview, dynamic loading, recommendations

**Recommended First Step**: Expand `AGENT_VOICES` array with 5-10 more popular 11labs voices, verify voice IDs are correct, test in calls.
