# Contacts Firestore Persistence - Backlog

## Contacts Lost on Restart

### Current Status
- ✅ Projects persisted to Firestore
- ✅ Orgs, team, invitations persisted
- ❌ **Contacts are in-memory only — lost on server restart**

### Task: Persist Contacts to Firestore

**Location**: `src/lib/data/store.ts` — createContacts, updateContact, listContacts, projectContacts

**What needs to be done**:
1. **Schema** — Store contacts in Firestore:
   - Option A: `projects/{projectId}/contacts/{contactId}` (subcollection)
   - Option B: Top-level `contacts` collection with `projectId` field
   - Recommend A for simpler queries per project

2. **createContacts** — Write to Firestore when creating; also update in-memory for backward compat

3. **listContacts** — Read from Firestore when configured; fallback to in-memory

4. **updateContact** — Update Firestore when call result arrives (webhook); keep in-memory in sync

5. **getProjectIdsForOrg** — Contacts don't affect this; projects have orgId. No change needed.

6. **Webhook flow** — When VAPI call-ended webhook updates a contact, persist to Firestore

**Priority**: High (prevents data loss; required for production)
