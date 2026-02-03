# Phone Numbers (Per-Org Caller ID) - Backlog

## Each Company Has Its Own Number

### Current Status
- ✅ Org model in Firestore
- ❌ **No phoneNumberId on org**
- ❌ **No provisioning flow**

### Task: Provision and Assign Phone Numbers per Org

**Location**: `src/app/api/org/phone-number/route.ts` (new), Settings page, `src/lib/firebase/types.ts`

**What needs to be done**:

1. **Data model** — Add to organization:
   - [ ] `phoneNumberId?: string` — VAPI phone number ID
   - [ ] `phoneNumberE164?: string` — Human-readable (e.g. +1234567890)
   - [ ] `phoneNumberStatus?: "none" | "pending" | "active" | "imported"`

2. **API** `/api/org/phone-number`:
   - [ ] GET — Return status, number if exists
   - [ ] POST — Provision (platform) or import (BYON)
   - [ ] Platform provision: POST VAPI /phone-numbers, save to org
   - [ ] Handle VAPI 10-number limit (error, prompt BYON)

3. **Settings page** — "Phone Number" section:
   - [ ] Show current status
   - [ ] "Add phone number" (platform provision for US)
   - [ ] (Later) "Import my number" (BYON via Twilio)

4. **Call initiation** — Update to require and use `org.phoneNumberId`:
   - [ ] Get org before call
   - [ ] Validate org.phoneNumberId exists
   - [ ] Pass phoneNumberId to VAPI /call

**Priority**: High (required for outbound calls; caller ID is org-specific)

**Reference**: `architecture_plan/VAPI_GEMINI_ORG_INTEGRATION.md` — Phone Numbers section

**Note**: Free VAPI numbers are US only. For SA (+27) or international, need Twilio BYON flow.
