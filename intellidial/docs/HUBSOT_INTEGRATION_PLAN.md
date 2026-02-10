# HubSpot Integration Plan - Checklist

**Goal:** Enable Intellidial customers to sync contacts and call results with HubSpot CRM automatically.

**Use Case:** Customer imports leads into HubSpot → Intellidial calls them → Results sync back to HubSpot (Lead Status, Notes, Meeting Bookings).

---

## Data Flow

```
HubSpot Contacts (with Lead Status = "New")
    ↓
Intellidial reads contacts via HubSpot API
    ↓
Intellidial calls contacts (VAPI)
    ↓
Call results (success/failed, transcript, meeting booked)
    ↓
Intellidial updates HubSpot (Lead Status, Notes, Custom Properties)
```

---

## Phase 1: HubSpot Authentication & Connection

### Setup HubSpot App
- [x] Register Intellidial app in HubSpot Developer Portal (https://developers.hubspot.com/)
- [x] Get Client ID and Client Secret
- [x] Set redirect URI: `https://intellidial.co.za/dashboard/settings/int`
- [x] Request OAuth scopes: `contacts`, `timeline`, `crm.objects.contacts.read`, `crm.objects.contacts.write`
- [x] Add HubSpot credentials to `.env`:
  ```
  HUBSPOT_APP_ID=30935743
  HUBSPOT_CLIENT_ID=ad34266e-4d58-45c0-a1f1-aea450ff8936
  HUBSPOT_CLIENT_SECRET=fb86455a-19f6-4b23-9d3d-379df517c488
  HUBSPOT_REDIRECT_URI=https://intellidial.co.za/dashboard/settings/int
  ```

### Database Schema
- [x] Create `HubSpotIntegration` interface/type:
  ```typescript
  interface HubSpotIntegration {
    orgId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    hubspotAccountId: string; // HubSpot portal ID
    connectedAt: Date;
    enabled: boolean;
  }
  ```
- [x] Add `hubspotIntegration` field to organization/settings collection in Firestore
- [x] Create helper functions: `getHubSpotIntegration(orgId)`, `saveHubSpotIntegration(orgId, data)`, `deleteHubSpotIntegration(orgId)`

### API Endpoints - OAuth Flow
- [x] Create `src/app/api/integrations/hubspot/connect/route.ts`
  - [x] GET handler: Generate OAuth URL and redirect to HubSpot
  - [x] Store `state` parameter for CSRF protection
- [x] Create `src/app/api/integrations/hubspot/callback/route.ts`
  - [x] GET handler: Receive authorization code from HubSpot
  - [x] Exchange code for access token + refresh token
  - [x] Get HubSpot account info (portal ID, account name)
  - [x] Save tokens to database
  - [x] Redirect to settings page with success message
- [x] Create `src/app/api/integrations/hubspot/disconnect/route.ts`
  - [x] POST handler: Delete integration from database
  - [ ] Revoke HubSpot tokens (optional - can add later)
- [x] Create `src/app/api/integrations/hubspot/status/route.ts`
  - [x] GET handler: Return connection status and account info
  - [x] Check if token is expired, return refresh needed if so

### UI - Connection Status
- [x] Create `src/components/integrations/HubSpotConnection.tsx`
  - [x] Show "Connect HubSpot" button if not connected
  - [x] Show connection status if connected (account name, connected date)
  - [x] Show "Disconnect" button
- [x] Add HubSpot section to Settings page (`src/app/dashboard/settings/page.tsx`)
  - [x] Add "Integrations" tab/section
  - [x] Include HubSpotConnection component
- [ ] Test OAuth flow end-to-end:
  - [ ] Click "Connect HubSpot" → Redirects to HubSpot
  - [ ] Authorize → Redirects back → Shows "Connected"
  - [ ] Click "Disconnect" → Shows "Not Connected"

**Phase 1 Complete When:** ✅ Can connect/disconnect HubSpot account, status visible in UI

---

## Phase 2: Read Contacts from HubSpot

### HubSpot API Client
- [x] Create `src/lib/integrations/hubspot/client.ts`
  - [x] Function: `getAccessToken(orgId)` - Get valid access token (refresh if expired)
  - [x] Function: `refreshAccessToken(orgId, refreshToken)` - Refresh expired token
  - [x] Function: `getContacts(orgId, filters, limit, offset)` - List contacts from HubSpot
  - [x] Function: `getContactById(orgId, contactId)` - Get single contact
  - [x] Handle rate limiting (100 requests per 10 seconds)
  - [x] Handle API errors (401, 429, 500) with retry logic
- [x] Create `src/lib/integrations/hubspot/types.ts`
  - [x] Type: `HubSpotContact` (properties, id, etc.)
  - [x] Type: `HubSpotContactResponse` (results, paging, etc.)

### Contact Mapping Logic
- [x] Create `src/lib/integrations/hubspot/map-contact.ts`
  - [x] Function: `mapHubSpotToIntellidial(hubspotContact)` - Convert HubSpot contact to Intellidial format
  - [x] Map: `phone` → `phone`
  - [x] Map: `firstname + lastname` → `name`
  - [x] Map: `email` → `email` (store in metadata)
  - [x] Map: `company` → `company` (store in metadata)
  - [x] Store: `hubspotContactId` → `hubspotContactId` (for later updates)
  - [x] Store: `hs_lead_status` → `hubspotLeadStatus` (in metadata)

### Import Contacts API
- [x] Create `src/app/api/integrations/hubspot/sync-contacts/route.ts`
  - [x] POST handler: Import contacts from HubSpot
  - [x] Parameters: `projectId`, `leadStatus` (optional filter), `limit` (default 100)
  - [x] Check HubSpot integration exists and is enabled
  - [x] Fetch contacts from HubSpot (filter by Lead Status if provided)
  - [x] For each contact:
    - [x] Check if contact already exists in project (by phone or hubspotContactId)
    - [x] Skip if duplicate, create if new
    - [x] Store `hubspotContactId` in contact metadata
  - [x] Return: `{ imported: number, skipped: number, contacts: [...] }`
- [x] Handle edge cases:
  - [x] Contact missing phone number → Skip with warning
  - [x] Invalid phone format → Normalize or skip
  - [x] Rate limit hit → Queue for retry or return partial results

### UI - Import Contacts
- [x] Add "Import from HubSpot" button to Project Contacts page (`src/app/dashboard/projects/[id]/page.tsx`)
- [ ] Create `src/components/integrations/HubSpotImportModal.tsx` (Simplified - button directly in ContactsTab)
  - [ ] Modal with:
    - [ ] Dropdown: Select Lead Status filter (or "All")
    - [ ] Input: Limit (default 100)
    - [ ] Button: "Import Contacts"
    - [ ] Progress indicator: "Importing 25 contacts..."
  - [x] Show imported contacts count
  - [x] Show skipped duplicates count
- [ ] Add HubSpot badge/icon to contacts imported from HubSpot (Future enhancement)
- [ ] Test import flow:
  - [ ] Import contacts with Lead Status = "New" → Creates contacts in project
  - [ ] Import again → Skips duplicates
  - [ ] Verify `hubspotContactId` is stored

**Phase 2 Complete When:** ✅ Can import contacts from HubSpot, contacts linked via hubspotContactId

---

## Phase 3: Update HubSpot After Calls

### Sync Logic
- [x] Create `src/lib/integrations/hubspot/sync.ts`
  - [x] Function: `syncCallResultToHubSpot(orgId, contact, callResult)` - Update HubSpot after call
  - [x] Check if contact has `hubspotContactId`
  - [x] Check if HubSpot integration is enabled
  - [x] Update Lead Status based on call outcome:
    - [x] Success → `hs_lead_status = "CONNECTED"`
    - [x] Failed → `hs_lead_status = "ATTEMPTED_TO_CONTACT"`
  - [x] Create Note with transcript (if transcript exists)
  - [x] Update custom properties:
    - [x] `intellidial_recording_url` = callResult.recordingUrl
    - [x] `intellidial_last_call_duration` = callResult.durationSeconds
    - [x] `intellidial_last_call_date` = callResult.attemptedAt
    - [ ] Increment `intellidial_call_count` (requires fetching current value first)
  - [x] Handle errors gracefully (log, don't fail webhook)

### Custom Properties Setup
- [ ] Create function: `ensureCustomProperties(orgId)` - Create custom properties if they don't exist
- [ ] Properties to create:
  - [ ] `intellidial_recording_url` (text, label: "Intellidial Recording URL")
  - [ ] `intellidial_last_call_duration` (number, label: "Intellidial Last Call Duration (seconds)")
  - [ ] `intellidial_last_call_date` (date, label: "Intellidial Last Call Date")
  - [ ] `intellidial_call_count` (number, label: "Intellidial Call Count")
- [ ] Call `ensureCustomProperties()` when integration is first connected
- **Note:** Custom properties can be created manually in HubSpot for now. Auto-creation can be added later.

### Meeting Booking Sync
- [x] In `syncCallResultToHubSpot()`, check if call captured meeting/appointment:
  - [x] If `capturedData.meeting_booked === true` or `capturedData.appointment_date` exists:
    - [x] Create HubSpot Meeting/Event
    - [x] Link meeting to contact
    - [x] Set meeting time from `capturedData.appointment_date`
    - [x] Update Lead Status to "MEETING_SCHEDULED" (if exists)

### Integrate with Call Webhook
- [x] Modify `src/app/api/webhooks/vapi/call-ended/route.ts`
  - [x] After updating Intellidial contact (line ~137), add:
    - [x] Check if contact has `hubspotContactId`
    - [x] If yes, call `syncCallResultToHubSpot(project.orgId, contact, callResult)`
    - [x] Wrap in try-catch (don't fail webhook if HubSpot sync fails)
- [x] Log sync results (success/failure) for debugging

### Error Handling & Retry
- [ ] Create `src/lib/integrations/hubspot/queue.ts` - Queue failed syncs for retry
- [ ] If HubSpot API fails:
  - [ ] Log error with contact ID and call ID
  - [ ] Queue sync for retry (store in Firestore `hubspot_sync_queue` collection)
- [ ] Create background job/cron to retry failed syncs (or manual retry button in UI)

**Phase 3 Complete When:** ✅ Call results automatically sync to HubSpot (Lead Status, Notes, Custom Properties)

---

## Phase 4: Sync Configuration UI

### Settings Page
- [ ] Create `src/components/integrations/HubSpotSettings.tsx`
  - [ ] Section: "Sync Settings"
  - [ ] Toggle: "Auto-sync calls" (enable/disable automatic sync after calls)
  - [ ] Section: "Lead Status Mapping"
    - [ ] Input: "Call contacts with Lead Status:" (dropdown with HubSpot Lead Statuses)
    - [ ] Input: "Don't call contacts with Lead Status:" (multi-select)
  - [ ] Section: "Update Lead Status After Call"
    - [ ] Dropdown: "On successful call →" (select Lead Status, default "CONNECTED")
    - [ ] Dropdown: "On failed call →" (select Lead Status, default "ATTEMPTED_TO_CONTACT")
    - [ ] Dropdown: "On meeting booked →" (select Lead Status, default "MEETING_SCHEDULED")
  - [ ] Section: "Sync Options"
    - [ ] Toggle: "Sync transcript" (create Notes)
    - [ ] Toggle: "Sync recording URL" (store in custom property)
    - [ ] Toggle: "Sync meeting bookings" (create Meetings)
  - [ ] Button: "Save Settings"
- [ ] Store settings in `HubSpotIntegration` object:
  ```typescript
  {
    ...existingFields,
    settings: {
      autoSync: boolean,
      callLeadStatuses: string[], // Which Lead Statuses to call
      dontCallLeadStatuses: string[],
      successLeadStatus: string,
      failedLeadStatus: string,
      meetingLeadStatus: string,
      syncTranscript: boolean,
      syncRecording: boolean,
      syncMeetings: boolean,
    }
  }
  ```

### Field Mapping UI
- [ ] Add section: "Field Mapping" in HubSpotSettings
  - [ ] Map Intellidial capture fields → HubSpot custom properties
  - [ ] Example: "appointment_date" → HubSpot "Meeting Date"
  - [ ] Allow user to create new HubSpot custom property if needed
- [ ] Store field mappings in settings:
  ```typescript
  fieldMappings: {
    "appointment_date": "meeting_date",
    "interested": "interested_in_product",
    ...
  }
  ```

### Sync Log
- [ ] Create `src/components/integrations/HubSpotSyncLog.tsx`
  - [ ] Show recent sync activity (last 50 syncs)
  - [ ] Columns: Date, Contact, Status (Success/Failed), Action (Updated Lead Status, Created Note, etc.)
  - [ ] Filter by status (All/Success/Failed)
  - [ ] Show error message if sync failed
- [ ] Store sync log in Firestore `hubspot_sync_log` collection:
  ```typescript
  {
    orgId: string,
    contactId: string,
    hubspotContactId: string,
    timestamp: Date,
    status: "success" | "failed",
    action: string, // "Updated Lead Status", "Created Note", etc.
    error?: string,
  }
  ```
- [ ] Add "Sync Log" tab/section to HubSpotSettings component
- [ ] Show "Last sync: X minutes ago" in connection status

**Phase 4 Complete When:** ✅ Customers can configure sync settings, see sync activity log

---

## Phase 5: Two-Way Sync (Advanced) 🔄

### HubSpot Webhooks
- [ ] Register webhook subscription in HubSpot:
  - [ ] Subscribe to contact property changes (`contact.propertyChange`)
  - [ ] Webhook URL: `https://intellidial.co.za/api/webhooks/hubspot/contact-updated`
- [ ] Create `src/app/api/webhooks/hubspot/contact-updated/route.ts`
  - [ ] POST handler: Receive HubSpot webhook
  - [ ] Verify webhook signature (if HubSpot supports)
  - [ ] When Lead Status changes in HubSpot:
    - [ ] Find Intellidial contact by `hubspotContactId`
    - [ ] Update contact status/metadata to match HubSpot
  - [ ] When contact deleted in HubSpot:
    - [ ] Archive contact in Intellidial (don't delete, mark as archived)
- [ ] Handle webhook retries (HubSpot may retry on failure)

### Conflict Resolution
- [ ] Add `lastSyncedAt` timestamp to contacts (both systems)
- [ ] If both systems updated since last sync:
  - [ ] Show conflict in UI
  - [ ] Allow manual resolution (choose which version to keep)
  - [ ] Or use "last updated wins" strategy

### Sync Status Per Contact
- [ ] Add sync status badge to contacts in UI:
  - [ ] "Synced" (green) - Last synced < 5 minutes ago
  - [ ] "Pending" (yellow) - Sync queued but not completed
  - [ ] "Error" (red) - Last sync failed
  - [ ] "Not synced" (gray) - No HubSpot link
- [ ] Add "Sync Now" button per contact (manual sync)
- [ ] Add "Sync All" button to sync all contacts in project

**Phase 5 Complete When:** ✅ HubSpot changes reflect in Intellidial, manual sync available

---

## Testing Checklist

### Phase 1 Testing
- [ ] Test OAuth flow: Connect HubSpot account → Success
- [ ] Test disconnect: Disconnect → Status shows "Not Connected"
- [ ] Test reconnect: Connect again → Works
- [ ] Test expired token: Wait for expiration → Refresh works automatically

### Phase 2 Testing
- [ ] Test import: Import contacts with Lead Status = "New" → Contacts created
- [ ] Test duplicate handling: Import same contacts again → Skips duplicates
- [ ] Test filter: Import with different Lead Status → Only imports filtered contacts
- [ ] Test missing phone: Contact without phone → Skipped with warning
- [ ] Verify `hubspotContactId` stored in contact metadata

### Phase 3 Testing
- [ ] Test successful call sync: Make call → HubSpot Lead Status = "CONNECTED"
- [ ] Test failed call sync: Failed call → HubSpot Lead Status = "ATTEMPTED_TO_CONTACT"
- [ ] Test transcript sync: Call with transcript → HubSpot Note created
- [ ] Test recording sync: Call with recording → Custom property populated
- [ ] Test meeting sync: Call with meeting booked → HubSpot Meeting created
- [ ] Test error handling: HubSpot API down → Error logged, webhook doesn't fail

### Phase 4 Testing
- [ ] Test settings save: Change settings → Saved correctly
- [ ] Test settings apply: Change "Success Lead Status" → Next call uses new status
- [ ] Test sync log: Make calls → Log shows sync activity
- [ ] Test field mapping: Map custom field → Syncs to mapped property

### Phase 5 Testing (if implemented)
- [ ] Test webhook: Change Lead Status in HubSpot → Intellidial contact updates
- [ ] Test conflict: Update both systems → Conflict shown in UI
- [ ] Test manual sync: Click "Sync Now" → Contact syncs immediately

---

## File Structure

```
Intellidial/
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── integrations/
│   │       │   └── hubspot/
│   │       │       ├── connect/
│   │       │       │   └── route.ts ✅
│   │       │       ├── callback/
│   │       │       │   └── route.ts ✅
│   │       │       ├── disconnect/
│   │       │       │   └── route.ts ✅
│   │       │       ├── status/
│   │       │       │   └── route.ts ✅
│   │       │       └── sync-contacts/
│   │       │           └── route.ts ✅
│   │       └── webhooks/
│   │           └── hubspot/
│   │               └── contact-updated/
│   │                   └── route.ts ✅ (Phase 5)
│   ├── lib/
│   │   └── integrations/
│   │       └── hubspot/
│   │           ├── client.ts ✅
│   │           ├── types.ts ✅
│   │           ├── map-contact.ts ✅
│   │           ├── sync.ts ✅
│   │           └── queue.ts ✅ (Phase 3)
│   └── components/
│       └── integrations/
│           ├── HubSpotConnection.tsx ✅
│           ├── HubSpotImportModal.tsx ✅
│           ├── HubSpotSettings.tsx ✅
│           └── HubSpotSyncLog.tsx ✅
```

---

## Resources

- [HubSpot API Docs](https://developers.hubspot.com/docs/api/overview)
- [HubSpot OAuth Guide](https://developers.hubspot.com/docs/api/working-with-oauth)
- [HubSpot Contact Properties](https://developers.hubspot.com/docs/api/crm/contacts)
- [HubSpot Webhooks](https://developers.hubspot.com/docs/api/webhooks)

---

## Progress Tracking

**Phase 1:** 14/15 tasks complete ✅ (Testing pending)
**Phase 2:** 0/12 tasks complete
**Phase 3:** 0/12 tasks complete
**Phase 4:** 0/10 tasks complete
**Phase 5:** 0/8 tasks complete (Optional)

**Total:** 14/57 tasks complete
