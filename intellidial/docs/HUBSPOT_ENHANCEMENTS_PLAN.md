# HubSpot Integration Enhancements - Checklist

**Goal:** Add high-value features to make HubSpot integration more powerful and user-friendly.

**Priority Order:**
1. Deal Creation (when meetings booked)
2. Lead Status Filtering (targeted imports)
3. Sync Configuration UI (user controls)
4. Contact Sync Status Indicators
5. Manual Sync Button

---

## Phase 1: Deal Creation 🎯

**Goal:** Automatically create HubSpot Deals when meetings/appointments are booked during calls.

### Backend - Deal Creation Logic
- [x] Add Deal types to `src/lib/integrations/hubspot/types.ts`
  - [x] Type: `HubSpotDeal`
  - [x] Type: `HubSpotDealProperties`
  - [x] Type: `HubSpotDealResponse`
  - [x] Type: `HubSpotPipeline` and `HubSpotDealStage`

- [x] Add Deal functions to `src/lib/integrations/hubspot/client.ts`
  - [x] Function: `createDeal(orgId, dealProperties)` - Create a new deal
  - [x] Function: `associateDealWithContact(orgId, dealId, contactId)` - Link deal to contact
  - [x] Function: `getDealPipelines(orgId)` - Get available pipelines (for deal stage mapping)
  - [x] Handle rate limiting and errors

- [x] Update `src/lib/integrations/hubspot/sync.ts`
  - [x] Add function: `createDealForMeeting(orgId, contact, callResult)`
  - [x] Check if `capturedData.meeting_booked === true` or `appointment_date` exists
  - [x] Create deal with:
    - [x] Deal name: "Meeting with [Contact Name]" or "Appointment - [Date]"
    - [x] Deal stage: Configurable default (from settings or "appointmentscheduled")
    - [x] Deal amount: From `capturedData.deal_value` or `capturedData.amount` if captured
    - [x] Close date: From `appointment_date`
    - [x] Deal description: Include transcript snippet or call summary
  - [x] Associate deal with HubSpot contact
  - [ ] Link deal to company if available (Future enhancement)
  - [x] Handle errors gracefully (log, don't fail sync)

- [x] Update `syncCallResultToHubSpot()` function
  - [x] Call `createDealForMeeting()` after creating meeting/event
  - [x] Only create deal if meeting was actually booked
  - [x] Add setting check: `settings.syncDeals` (default: true)

### Database Schema
- [x] Update `HubSpotIntegrationDoc` type in `src/lib/firebase/types.ts`
  - [x] Add `settings.syncDeals?: boolean` (default: true)
  - [x] Add `settings.dealPipelineId?: string` (default pipeline)
  - [x] Add `settings.dealStageId?: string` (default stage for meetings)

### Testing
- [ ] Test deal creation with meeting booked
- [ ] Test deal creation with deal amount captured
- [ ] Test deal association with contact
- [ ] Test error handling (invalid pipeline/stage)
- [ ] Verify deal appears in HubSpot
- [ ] Test with syncDeals setting disabled (should skip deal creation)

**Phase 1 Complete When:** ✅ Deals are automatically created in HubSpot when meetings are booked during calls

**Status:** ✅ Implementation complete, ready for testing

---

## Phase 2: Lead Status Filtering 📊

**Goal:** Allow users to filter which contacts to import from HubSpot based on Lead Status.

### Backend - Lead Status Options
- [x] Add function to `src/lib/integrations/hubspot/client.ts`
  - [x] Function: `getLeadStatuses(orgId)` - Fetch available Lead Status values from HubSpot
  - [x] Fallback to common defaults if API fails
  - [x] Return array of status options: `["NEW", "CONNECTED", "ATTEMPTED_TO_CONTACT", ...]`

- [x] Create API endpoint `src/app/api/integrations/hubspot/lead-statuses/route.ts`
  - [x] GET handler to fetch lead statuses for organization
  - [x] Handle errors gracefully

### Frontend - Import UI Enhancement
- [x] Update `ContactsTab` component in `src/app/dashboard/projects/[id]/page.tsx`
  - [x] Add dropdown: "Filter by Lead Status" (above Import button)
  - [x] Options: "All", plus fetched Lead Statuses from HubSpot
  - [x] Fetch lead statuses from HubSpot API on component mount
  - [x] Show loading state while fetching statuses
  - [x] Add multi-select checkboxes: "Exclude Lead Statuses" (optional)
  - [x] Pass selected filters to sync-contacts API
  - [x] Show filter summary when filters are active

- [x] Update `src/app/api/integrations/hubspot/sync-contacts/route.ts`
  - [x] Accept `leadStatuses` array (can be multiple values)
  - [x] Accept `excludeLeadStatuses` array
  - [x] Filter HubSpot contacts by Lead Status before importing
  - [x] Return count of filtered contacts (`filteredByStatus`)

### UI Improvements
- [x] Show filter summary: "Including: NEW" and "Excluding: CONNECTED, ..."
- [ ] Add "Clear filters" button (Future enhancement)
- [ ] Remember last used filters (localStorage) (Future enhancement)

### Testing
- [ ] Test import with single Lead Status filter
- [ ] Test import with multiple Lead Status filters
- [ ] Test exclude filters
- [ ] Test "All" option (no filter)
- [ ] Verify only matching contacts are imported

**Phase 2 Complete When:** ✅ Users can filter HubSpot imports by Lead Status

**Status:** ✅ Implementation complete, ready for testing

---

## Phase 3: Sync Configuration UI ⚙️

**Goal:** Give users control over what gets synced and how.

### Database Schema Updates
- [ ] Update `HubSpotIntegrationDoc` type in `src/lib/firebase/types.ts`
  - [ ] Add `settings` object:
    ```typescript
    settings?: {
      autoSync: boolean; // Default: true
      syncTranscript: boolean; // Default: true
      syncRecording: boolean; // Default: true
      syncMeetings: boolean; // Default: true
      syncDeals: boolean; // Default: true
      successLeadStatus: string; // Default: "CONNECTED"
      failedLeadStatus: string; // Default: "ATTEMPTED_TO_CONTACT"
      meetingLeadStatus: string; // Default: "MEETING_SCHEDULED"
      dealPipelineId?: string;
      dealStageId?: string;
    }
    ```

### Settings Component
- [x] Create `src/components/integrations/HubSpotSettings.tsx`
  - [x] Section: "Auto-Sync Settings"
    - [x] Toggle: "Automatically sync call results to HubSpot" (autoSync)
    - [x] Description: "When enabled, call results will automatically update HubSpot contacts"
  - [x] Section: "What to Sync"
    - [x] Toggle: "Sync call transcripts" (syncTranscript)
    - [x] Toggle: "Sync recording URLs" (syncRecording)
    - [x] Toggle: "Create meetings when booked" (syncMeetings)
    - [x] Toggle: "Create deals when meetings booked" (syncDeals)
  - [x] Section: "Lead Status Mapping"
    - [x] Dropdown: "On successful call →" (successLeadStatus)
    - [x] Dropdown: "On failed call →" (failedLeadStatus)
    - [x] Dropdown: "On meeting booked →" (meetingLeadStatus)
    - [x] Fetch available Lead Statuses from HubSpot
  - [x] Section: "Deal Settings" (if syncDeals enabled)
    - [x] Dropdown: "Deal Pipeline" (dealPipelineId)
    - [x] Dropdown: "Default Deal Stage" (dealStageId)
    - [x] Fetch pipelines and stages from HubSpot
  - [x] Button: "Save Settings"
  - [x] Show success/error messages

### API Endpoints
- [x] Create `src/app/api/integrations/hubspot/settings/route.ts`
  - [x] GET: Fetch current settings
  - [x] POST: Update settings
  - [x] Validate settings before saving
  - [x] Return updated settings
  - [x] Fetch lead statuses and pipelines

- [x] Update `src/lib/integrations/hubspot/sync.ts`
  - [x] Read settings from `HubSpotIntegrationDoc.settings`
  - [x] Respect `autoSync` flag (skip sync if false)
  - [x] Respect `syncTranscript`, `syncRecording`, `syncMeetings`, `syncDeals` flags
  - [x] Use custom Lead Status mappings from settings
  - [x] Use custom deal pipeline/stage from settings

### UI Integration
- [x] Add HubSpotSettings component to Settings page
  - [x] Show in `/dashboard/settings` under HubSpotConnection component
  - [x] Only show if HubSpot is connected
  - [x] Check connection status and conditionally render

### Testing
- [ ] Test saving settings
- [ ] Test disabling autoSync (verify no sync happens)
- [ ] Test disabling individual sync options
- [ ] Test custom Lead Status mappings
- [ ] Test deal pipeline/stage selection

**Phase 3 Complete When:** ✅ Users can configure sync behavior via Settings UI

**Status:** ✅ Implementation complete, ready for testing

---

## Phase 4: Contact Sync Status Indicators 👁️

**Goal:** Show visual indicators of which contacts are synced with HubSpot.

### Database Schema
- [x] Add `lastSyncedToHubSpot?: string` (ISO timestamp) to `ContactDoc` type
- [x] Update sync functions to set `lastSyncedToHubSpot` when syncing

### UI Components
- [x] Update ContactsTab in `src/app/dashboard/projects/[id]/page.tsx`
  - [x] Add column: "HubSpot Status" (shown when HubSpot connected)
  - [x] Show badge: "Synced" (green) if `hubspotContactId` exists
  - [x] Show badge: "Not Synced" (gray) if no `hubspotContactId`
  - [x] Show "Last synced: X minutes ago" text
  - [x] Add link: "View in HubSpot" (opens HubSpot contact page)

- [x] Create helper function: `getHubSpotContactUrl(contactId, portalId)`
  - [x] Returns: `https://app.hubspot.com/contacts/{portalId}/contact/{contactId}`
- [x] Create helper function: `formatTimeAgo(timestamp)` for relative time display

### Visual Design
- [x] Badge styles:
  - [x] Synced: Green badge with checkmark icon
  - [x] Not Synced: Gray badge
- [x] Show last sync time: Relative time (e.g., "5 minutes ago")
- [x] Click: Open HubSpot contact page in new tab

### Testing
- [ ] Verify badges show correctly
- [ ] Verify HubSpot links work
- [ ] Verify last sync time displays correctly

**Phase 4 Complete When:** ✅ Contacts table shows sync status with HubSpot links

**Status:** ✅ Implementation complete, ready for testing

---

## Phase 5: Manual Sync Button 🔄

**Goal:** Allow users to manually sync individual contacts to HubSpot.

### Backend
- [x] Create `src/app/api/integrations/hubspot/sync-contact/route.ts`
  - [x] POST handler: Sync single contact to HubSpot
  - [x] Parameters: `contactId`, `projectId`
  - [x] Verify contact belongs to project
  - [x] Check if contact has `hubspotContactId`
  - [x] If no `hubspotContactId`, create contact in HubSpot first
  - [x] Then sync call results (if any)
  - [x] Return: `{ success: boolean, hubspotContactId?: string, synced: boolean }`
  - [x] Update `lastSyncedToHubSpot` timestamp

### Frontend
- [x] Add "Sync to HubSpot" button to ContactsTab
  - [x] Show button in contact row (if HubSpot connected)
  - [x] Show loading state while syncing
  - [x] Show success/error message
  - [x] Button in Actions column

- [x] Add bulk sync option
  - [x] Checkbox column: "Select contacts to sync"
  - [x] Button: "Sync Selected to HubSpot" (shown when contacts selected)
  - [x] Show progress: "Syncing X contacts..."
  - [x] Handle errors gracefully (continue with others)
  - [x] Select all checkbox in header

### Error Handling
- [x] Show error if HubSpot not connected
- [x] Show error if contact missing phone number
- [x] Show error if HubSpot API fails
- [x] Allow retry on failure (user can click sync again)

### Testing
- [ ] Test manual sync for single contact
- [ ] Test bulk sync for multiple contacts
- [ ] Test sync for contact without hubspotContactId (should create)
- [ ] Test error handling

**Phase 5 Complete When:** ✅ Users can manually sync contacts to HubSpot

**Status:** ✅ Implementation complete, ready for testing

---

## Implementation Order

1. **Phase 1: Deal Creation** (Highest ROI, straightforward)
2. **Phase 2: Lead Status Filtering** (Makes imports more useful)
3. **Phase 3: Sync Configuration UI** (Gives users control)
4. **Phase 4: Contact Sync Status Indicators** (Visual feedback)
5. **Phase 5: Manual Sync Button** (Nice-to-have)

---

## Notes

- **Deal Creation** is the highest value feature - creates immediate ROI for sales teams
- **Lead Status Filtering** makes imports more targeted and useful
- **Sync Configuration** gives users control but can be added incrementally
- **Status Indicators** improve UX but are less critical
- **Manual Sync** is useful for edge cases but not essential

**Start with Phase 1 (Deal Creation) for maximum impact!**
