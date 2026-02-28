# Intellidial – HubSpot Integration Feature Checklist (Internal)

Use this to understand **what HubSpot features already work** and **what’s still needed** to make Intellidial a “no‑brainer” for HubSpot customers.

---

## 1. What we already have (today)

These are effectively built (per `HUBSOT_INTEGRATION_PLAN.md` + code), even if you still need to polish or test.

- [x] **Single Intellidial HubSpot app (multi‑tenant)**
  - One HubSpot app with **Client ID/Secret** stored in `.env`.
  - OAuth model: many customers authorize the same app; each gets its own tokens.

- [x] **Per‑org HubSpot connection & storage**
  - Firestore document per org with:
    - `accessToken`, `refreshToken`, `expiresAt`
    - `hubspotAccountId` (portal ID), `connectedAt`, `enabled`
  - Tokens scoped to `orgId` so tenants are isolated.

- [x] **Connection / disconnection API routes**
  - `connect`: builds OAuth URL and redirects to HubSpot.
  - `callback`: exchanges code, saves tokens, fetches portal info.
  - `disconnect`: deletes integration record (revocation optional / later).
  - `status`: returns connection status and account info.

- [x] **Basic UI for connecting HubSpot**
  - `HubSpotConnection` component:
    - Shows “Connect HubSpot” when not connected.
    - Shows connected account name + date when connected.
    - Allows disconnect.
  - Integrated into **Settings → Integrations**.

- [x] **Foundations for API client & sync logic**
  - HubSpot client helpers: token refresh, contact fetch, basic error/rate‑limit handling.
  - Mapping from HubSpot contact → Intellidial contact (phone, name, email, company, `hubspotContactId`, `hs_lead_status`).
  - Initial `syncCallResultToHubSpot` function wired into `call-ended` webhook:
    - Updates lead status based on outcome.
    - Creates note with transcript.
    - Sets custom properties such as `intellidial_recording_url`, `intellidial_last_call_duration`, `intellidial_last_call_date` (where implemented).

---

## 2. What’s missing for a **“no‑brainer” HubSpot pitch**

For HubSpot users to **actively want** Intellidial (not just tolerate the integration), they need a clear story:

> “Intellidial plugs into HubSpot, pulls the right leads, calls them, and **writes clean results back** automatically. You live in HubSpot; Intellidial does the heavy lifting.”

That means the following should feel **smooth, reliable, and visible**.

### 2.1. Import from HubSpot → Intellidial (must‑have)

- [x] **Simple, guided “Import from HubSpot” flow in Projects**
  - [x] Button in the project’s Contacts tab: **“Import from HubSpot”**.
  - [x] Inline section (acts like a modal) with:
    - [x] Filter by **Lead Status** (e.g. “New”, “Open deal”, or custom statuses).
    - [x] Limit (default 100 contacts, currently fixed in code).
    - [x] Clear explanation: “Only contacts with phone numbers will be imported.”

- [x] **Robust contact import behaviour**
  - [x] Skips contacts with no phone numbers.
  - [x] De‑duplicates by `hubspotContactId` or phone to avoid double‑calling.
  - [x] Shows a summary that distinguishes:
    - [x] `imported X`
    - [x] `skipped Y duplicates`
    - [x] `skipped Z without phone`
    - [x] `filtered N by Lead Status`.

- [x] **Obvious visual indicator for HubSpot‑linked contacts**
  - [x] “Synced / Not synced” pill + icon in the Contacts table when HubSpot is connected.
  - [x] Column shows a **“View in HubSpot”** link (and last synced time) for linked contacts.

This makes it very clear to a HubSpot user: **“I don’t rebuild lists; I just pull what I already have in HubSpot.”**

### 2.2. Sync results back into HubSpot (must‑have)

- [x] **Lead Status updates that match their process**
  - [x] On successful call: update to a meaningful status (e.g. `CONNECTED` or their chosen value).
  - [x] On failed call: update to something like `ATTEMPTED_TO_CONTACT`.
  - [x] On meeting booked: update to `MEETING_SCHEDULED` or equivalent.
  - [x] These mappings are visible and editable in **HubSpot Settings** (not hard‑coded magic).

- [x] **Structured results written back as Notes & properties**
  - [x] Call transcript (or key summary) saved as a **Note** on the contact.
  - [x] Recording URL stored in a custom property (e.g. `intellidial_recording_url`).
  - [x] Call date, duration, and count stored in properties:
    - [x] `intellidial_last_call_date`
    - [x] `intellidial_last_call_duration`
    - [x] `intellidial_call_count` (incremented correctly, best‑effort).

- [x] **Meeting booking sync**
  - [x] If Intellidial captured a meeting/appointment, a **HubSpot meeting** is created.
  - [x] Meeting is linked to the contact and uses the correct date/time.

From the user’s point of view: **“If Intellidial called them, I’ll see it right in HubSpot without logging into another tool.”**

### 2.3. Configuration & visibility (strong differentiator)

- [x] **HubSpot Sync Settings UI**
  - [x] Toggle: `Auto-sync calls` ON/OFF.
  - [x] Controls for:
    - [x] Which **Lead Statuses to call** (multi-select).
    - [x] Which **Lead Statuses to skip** (multi-select, e.g. “Do not call”).
    - [x] Mapping from call outcomes → new Lead Statuses.
  - [x] Toggles for:
    - [x] Sync transcript (Note creation).
    - [x] Sync recording URL.
    - [x] Sync meetings (and deals).

- [x] **Field mapping**
  - [x] Simple UI in HubSpot Settings to map Intellidial capture fields → HubSpot properties.
  - [x] Examples supported: `appointment_date` → `meeting_date`, `interest_level` → `intellidial_interest_level`.
  - [x] Stored in settings; applied in `syncCallResultToHubSpot` to write custom properties.

- [x] **Basic sync log**
  - [x] Recent activity list (last 50 syncs) with contact, date/time, actions, status (Success/Failed), error message.
  - [x] Sync log UI under HubSpot settings with manual refresh.

This gives power users and ops/RevOps people confidence that **data isn’t disappearing into a black box**.

### 2.4. Reliability & safety

- [x] **Graceful error handling**
  - [x] If HubSpot API fails (rate limit, outage), Intellidial logs the error, does **not** break the webhook flow, and marks sync as failed in the sync log; failed syncs are added to the retry queue.

- [x] **Retry / queue mechanism for failed syncs**
  - [x] Failed syncs are added to `hubspot_sync_queue`.
  - [x] Manual “Retry failed syncs” button processes the queue.

- [x] **Clear messaging in UI**
  - [x] When disconnected or token invalid: clear copy and prominent reconnect prompt; no silent failures.

When this is in place, you can confidently tell pilots: **“If something goes wrong, we see it and can fix it.”**

---

## 3. Minimum HubSpot scope for early pilots vs. full “no‑brainer”

### 3.1. For early pilots with HubSpot users

For a **handful of friendly pilots**, the following is likely enough:

- [x] Connect / disconnect works and is visible in Settings.
- [x] Import contacts from HubSpot into a project (even with a simple UI).
- [x] Basic status + note sync back to HubSpot after calls.
- [x] Manual, developer‑level visibility into errors (logs), plus sync log UI.

You can fill UI gaps with **manual support** and honest communication:

> “This is an early version – we’ll watch the sync closely and fix any issues with you.”

### 3.2. For “no‑brainer” outbound pitch to cold HubSpot accounts

Before you tell a cold HubSpot prospect **“this just plugs into your HubSpot and works”**, you want:

- [x] Smooth **Import from HubSpot → Call → Sync back** loop a non‑technical user can follow.
- [x] Clear, self‑service configuration for:
  - What gets called.
  - What gets updated in HubSpot.
  - How results appear (statuses, notes, properties).
- [x] Basic but solid **sync logging & error handling** so they trust the integration.

Once most of the above boxes are checked, HubSpot users will feel that Intellidial is:

> “The missing layer on top of HubSpot that actually talks to people on the phone and keeps my CRM clean and up‑to‑date.”

Use this checklist to decide:

- What must be finished **before** selling HubSpot integration heavily.  
- What can be handled by **manual support** during the first few pilots.  
- Where to invest next to make HubSpot + Intellidial a **compelling, default combo** for your niche.

---

## 4. Customer perspective: adoption, learning curve, perceived value

*Put yourself in the seat of a marketing agency, recruitment agency, or any team whose heartbeat is HubSpot. They need to feel: “This fits how I already work. I don’t have to learn a new system.”*

### 4.1. Work the way they already think

- [x] **Import by HubSpot list (or saved view)**
  - Today they can filter by Lead Status only. Many users think in **lists** (“Q1 outbound”, “Recruitment – engineers”). Let them select a HubSpot list or a saved view/filter so “who to call” is “everyone in this list” with no mental translation.
  - *Value:* Zero guesswork. They stay in the same mental model they use in HubSpot every day.

- [x] **HubSpot-first framing in the product**
  - Where it makes sense, use their language: “HubSpot list”, “Lead Status”, “timeline”, “contact record”. Tooltips or one-line explanations that map Intellidial concepts to HubSpot (e.g. “Results sync to this contact’s record in HubSpot”).
  - *Value:* They feel they’re extending HubSpot, not learning a new CRM.

### 4.2. Trust and transparency before the first call

- [x] **Pre-flight: “What we’ll write to HubSpot”**
  - Before or when they set up a project, show a clear summary: “When a call completes, we will update this contact in HubSpot with: [Lead Status], a Note (transcript), recording URL, and these properties: [list from field mapping].” One screen or collapsible section they can show to a manager or themselves.
  - *Value:* No surprises. They can sign off on exactly what changes in HubSpot and trust the integration from day one.

- [x] **Recognizable activity in the HubSpot timeline**
  - Ensure the Note (or engagement) we create is clearly labeled (e.g. “Intellidial Call” or a consistent title) so when they open a contact in HubSpot they see at a glance that this was an Intellidial call, not a random note.
  - *Value:* Instant recognition. “I can see it was us (Intellidial) and what happened.”

### 4.3. Self-serve and support without leaving their world

- [x] **One-page “How Intellidial syncs to HubSpot” (in-app or doc)**
  - Single place that answers: What gets updated (Lead Status, Note, recording, custom properties)? Where do I see it in HubSpot? What do I do if sync failed? Link from Settings or from a failed sync message.
  - *Value:* They don’t have to hunt or ask support. Reduces “where did my data go?” and “what do I do now?”.

- [x] **Optional: Sync status visible in HubSpot**
  - A property (e.g. “Intellidial sync status” = success / failed / pending) or similar so users who rarely open Intellidial can see sync health on the contact record or in a HubSpot report.
  - *Value:* Power users who live in HubSpot only can monitor and chase failures without switching tools.

### 4.4. Scale and reporting without friction

- [x] **Clear guidance for large lists**
  - When they have hundreds or thousands of contacts: batch import behavior, progress (e.g. “X of Y synced to HubSpot”), or a short note so they know how to run at scale without confusion.
  - *Value:* No “did it work?” anxiety when they ramp volume.

- [x] **Reporting in HubSpot**
  - We already write properties they can report on. Add a short doc or in-app hint: “You can build a HubSpot report using [these properties] to see call volume, last call date, outcomes.” Optionally a suggested report template or screenshot.
  - *Value:* “I can show my boss the numbers in the same place we already report.”

### 4.5. Future: close the loop the way they work

- [x] **Two-way sync (HubSpot → Intellidial)**
  - When they update HubSpot (e.g. Lead Status = “Do not call” or a custom “No contact”) that flows back to Intellidial so we don’t call again. They manage “who to call” in HubSpot; Intellidial respects it.
  - *Value:* One source of truth. No calling people they’ve already marked as done or no-go in HubSpot.

- [x] **Trigger from HubSpot (optional)**
  - When a contact is added to a list or Lead Status changes to X, optionally add them to an Intellidial call queue (e.g. via HubSpot workflow + webhook or similar). Advanced; not required for first “no learning curve” release.
  - *Value:* Fully “set it and forget it” for specific playbooks.

