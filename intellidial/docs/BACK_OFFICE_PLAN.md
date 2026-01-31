# Intellidial Back Office — Product Plan & Task List

This document defines the back office (dashboard) where businesses use Intellidial: upload contacts, configure the AI agent, run campaigns, and see results. The goal is **simple, easy to use, and clearly showing value** (time saved, calls completed, data captured).

---

## 1. Product Vision

- **Who uses it:** Business users (operations, research, sales) who have lists of numbers and need structured answers from phone calls.
- **Core loop:** Create a project → upload/paste contacts → define what to capture and what the agent should ask → run → see transcripts, recordings, and exported data.
- **Value story:** Dashboard surfaces "hours of calling done by AI", "successful vs failed calls", "contacts processed" so the business immediately sees ROI and time saved.

---

## 2. Core Concepts

| Concept | Description |
|--------|-------------|
| **Project / Campaign** | One run: a contact list + agent instructions + capture fields. Has a name, status (draft / running / completed), dates. |
| **Contact** | A phone number (and optional name/company). Belongs to a project. Has status: pending, called, success, failed (no answer, busy, error). |
| **Call** | One attempt to a contact. Has: duration, transcript, recording URL, captured data (structured fields). |
| **Agent instructions** | Two parts: (1) **What to capture** — custom fields (e.g. Price, Availability, Contact name). (2) **What to ask** — script/questions the AI should cover. |
| **Capture fields** | Structured output: the columns the AI fills from the conversation (e.g. "Price quoted", "Callback requested", "Decision maker name"). |

---

## 3. User Stories (What Users Do)

1. **Create a project** — Name it, optionally add a short description.
2. **Add contacts** — Paste a list of numbers (or upload CSV/Excel). See count, validate format, de-dupe.
3. **Configure capture** — Define which fields to capture (e.g. "Price", "Availability", "Notes"). These become columns in the export.
4. **Configure agent** — Write what the AI should say/ask (script or bullet points). Optional: tone, max duration, retry rules.
5. **Run the project** — Start calling. See progress: pending → calling → completed.
6. **View results** — Per contact: status, duration, transcript, recording. Table view with all captured data.
7. **Listen to recordings** — Play audio per call, with transcript alongside (optional sync).
8. **Export** — Download Excel/CSV with captured fields + transcript/recording links.
9. **See value** — Dashboard: total contacts, calls made, successful vs failed, **total AI call time (time saved)**, success rate.

---

## 4. Information Architecture (Screens / Routes)

| Route | Purpose |
|-------|--------|
| `/dashboard` | Overview: KPIs (contacts uploaded, calls made, successful, failed, **hours on calls / time saved**), recent projects, quick actions. |
| `/dashboard/projects` | List of projects. Create new, open existing, see status (draft/running/completed). |
| `/dashboard/projects/[id]` | Single project: tabs or sections — **Contacts**, **Instructions** (capture fields + agent script), **Results** (calls table + transcripts + recordings), **Export**. |
| `/dashboard/projects/[id]/calls/[callId]` (optional) | Dedicated call detail: transcript + recording player + captured data. Or inline modal from Results. |
| `/dashboard/settings` (later) | Profile, API keys, billing/usage if applicable. |

**Suggested nav (sidebar or top):** Dashboard | Projects | (Settings)

---

## 5. Data Model (Logical) — Firestore (GCP)

Collections: `users` (doc id = auth uid), `projects`, `contacts` (query by `projectId`).

- **Project**  
  - `id`, `name`, `description?`, `status` (draft | running | completed | paused), `createdAt`, `updatedAt`, `userId`  
  - `captureFields`: array of `{ key, label, type? }` (e.g. price, availability, notes)  
  - `agentInstructions`: text (what to ask / script)  
  - `agentConfig?`: tone, maxCallDuration, retries, etc.

- **Contact**  
  - `id`, `projectId`, `phone`, `name?`, `metadata?`, `status` (pending | calling | success | failed), `createdAt`  
  - `callResult?`: `callId`, `durationSeconds`, `recordingUrl`, `transcript`, `capturedData` (key-value per capture field), `attemptedAt`, `failureReason?`

- **Call** (if stored as separate entity)  
  - `id`, `projectId`, `contactId`, `durationSeconds`, `recordingUrl`, `transcript`, `capturedData`, `status`, `attemptedAt`

- **User** (for auth)  
  - `id`, `email`, `name?`, etc.

**Metrics derived:**  
- Contacts uploaded = count(Contact where projectId = X).  
- Calls made = count(Call) or count(Contact where status in [calling, success, failed]).  
- Successful calls = status = success.  
- Failed calls = status = failed.  
- **Time on calls (time saved)** = sum(Call.durationSeconds) or sum(Contact.callResult.durationSeconds) for successful/completed calls.

---

## 6. Value Metrics (Dashboard KPIs)

| Metric | Definition | Why it matters |
|--------|------------|----------------|
| **Contacts uploaded** | Total (or per project) contacts in the system. | Shows scale of work. |
| **Calls made** | Number of call attempts (completed, not just queued). | Volume of AI activity. |
| **Successful calls** | Calls that reached a person and completed with data. | Delivered value. |
| **Unsuccessful calls** | No answer, busy, error, or incomplete. | Retry / list quality. |
| **Success rate** | Successful / Calls made (%). | Quality of list and agent. |
| **Total AI call time** | Sum of call durations (e.g. in minutes or hours). | **Primary “time saved” story:** “X hours of calls done by AI.” |
| **Avg call duration** | Total time / Successful calls. | Efficiency and script length. |

**Presentation:**  
- Big number tiles: Contacts | Calls made | Successful | Failed | **Hours on calls (time saved)**.  
- Small chart: success vs failed (pie or bar).  
- Optional: calls over time (line/bar by day).  
- One-line value statement: “AI handled **12.5 hours** of calls — equivalent to **X** hours of your team’s time saved.”

---

## 7. Feature Breakdown (What to Build)

### Phase 1 — Foundation (MVP)

1. **Auth & layout**
   - Protect `/dashboard` (redirect to login if not authenticated).
   - Dashboard layout: sidebar or top nav (Dashboard, Projects), main content area, logout.
   - Use existing login modal; add simple session (e.g. NextAuth or cookie).

2. **Projects CRUD**
   - List projects (name, status, created, contact count).
   - Create project (name, optional description).
   - Open project → project detail page with sections/tabs.

3. **Contacts**
   - **Paste numbers:** Textarea to paste one number per line (or comma-separated). Validate format, show count, de-dupe.
   - **Upload CSV/Excel (optional in MVP):** Parse file, map column to phone (and optionally name), preview table, import.
   - Contacts table: phone, name (if any), status (pending/called/success/failed), last updated. Pagination or virtual scroll if large list.

4. **Agent instructions (project config)**
   - **Capture fields:** Add/remove fields (e.g. “Price”, “Availability”, “Notes”). Simple list: label + optional type (text/number). Stored in project.
   - **Agent script:** Text area for “What should the AI ask / say?” (script or bullet points). Stored in project.
   - Save button; show summary on project page.

5. **Results / Calls**
   - **Calls table:** Contact (phone/name), status, duration, date, link to transcript, link to recording. Columns for each capture field (filled after call).
   - **Filters:** By status (success/failed), date range. Optional search by phone/name.
   - **Transcript view:** Click row or “View transcript” → modal or slide-over with full transcript (speaker labels: Agent / Contact). Optional: “Play recording” next to it.

6. **Recordings**
   - **Playback:** Per call, audio player (play/pause, progress, speed, optional download). Same page or modal as transcript.
   - **Storage:** Assume recordings are stored (e.g. S3 or existing pipeline); back office only needs URL and a simple `<audio>` or player component.

7. **Dashboard home**
   - KPI tiles: Contacts uploaded (total or across projects), Calls made, Successful calls, Unsuccessful calls, **Total AI call time (hours)**.
   - Success rate %.
   - Short value line: “AI handled X hours of calls.”
   - List of recent projects with quick link.

8. **Export**
   - Button: “Export to Excel” (or CSV). Columns: contact (phone, name), status, duration, date, all capture fields, transcript (text or link), recording (link). One row per contact/call.

### Phase 2 — Polish & Depth

9. **Run / start project**
   - “Start calling” button (or “Run project”). Integrate with existing calling pipeline (e.g. queue jobs). Show status: running / completed / partial.
   - Progress indicator: X of Y contacts called; live or polling.

10. **Time saved / value framing**
    - Dashboard: “Time saved” = total AI call time, with short copy: “Equivalent to X hours of your team’s time.”
    - Optional: “Cost per call” or “Cost per hour saved” if you have pricing.

11. **Transcript UX**
    - Search within transcript.
    - Highlight capture fields in transcript (if we store spans).
    - Optional: “Jump to recording” at a timestamp (if we have word-level timestamps later).

12. **Contact list improvements**
    - Edit/delete single contact.
    - Bulk status filter; “Retry failed” to re-queue failed numbers.
    - Export failed list (CSV) for manual follow-up.

13. **Project settings**
    - Duplicate project (copy config + contact list).
    - Archive project (hide from main list, keep data).

### Phase 3 — Scale & Trust

14. **Usage / billing**
    - If you have tiers (e.g. 100/300/1000 calls per month): show “Calls used / limit” on dashboard or in settings.
    - Link to upgrade or contact sales.

15. **Audit**
    - “Created by”, “Started at”, “Completed at” on project.
    - Optional: activity log (who uploaded, when run, when exported).

16. **Multi-user (optional)**
    - Invite team members, roles (admin vs viewer). Permissions: who can run, export, edit instructions.

17. **Notifications**
    - Email when project completes (“Your project X finished: Y successful calls, Z failed.”).
    - Optional: in-app notification bell.

---

## 8. Technical Notes (Implementation)

- **Stack:** Next.js (App Router), React, same UI style as marketing site (Tailwind, teal/slate). API routes for projects, contacts, calls, export.
- **Data (GCP / Firebase):** Firestore collections: `users` (doc id = auth uid), `projects`, `contacts` (query by `projectId`). Call result and capture fields stored on contact/project docs. Recordings: store URL only (e.g. Cloud Storage or existing pipeline). Use Firebase Admin SDK in API routes; Firebase client SDK in browser for auth.
- **Auth:** Firebase Auth (Google, Microsoft, email/password) or NextAuth with Firebase as backend. Session required for all `/dashboard/*`.
- **Calling pipeline:** Back office does not implement dialling; it assumes an existing service (or queue) that: takes project + contact list + instructions, makes calls, writes back transcript, recording URL, duration, captured data to Firestore. Dashboard only displays and exports that data. If no pipeline yet, use mock data for UI build.
- **Export:** Server-side generation of CSV/Excel (e.g. `xlsx` or `csv-stringify`), stream or download.

---

## 9. Task List (Ordered for Dev)

Use this as a checklist; order can be adjusted (e.g. mock data first, then wire real API).

### Phase 1 — MVP

| # | Task | Notes |
|---|------|--------|
| 1 | **Auth** — Protect `/dashboard`, session from login, logout in nav. | Redirect unauthenticated users to home + open login modal or `/login`. |
| 2 | **Dashboard layout** — Sidebar/top nav, “Dashboard” and “Projects”, main content area. | Reuse header style from marketing; add sidebar or simple tabs. |
| 3 | **Dashboard home page** — KPI tiles (contacts, calls made, success, failed, **hours on calls**), success rate, value line. | Use mock data first; then wire to API. |
| 4 | **Projects list** — List all projects (name, status, created, contact count), “New project” button. | CRUD: create, read. |
| 5 | **Project detail shell** — Single project page with tabs/sections: Overview, Contacts, Instructions, Results, Export. | Navigation and empty states. |
| 6 | **Contacts — paste** — Textarea paste, parse (one per line / comma), validate phone format, count, de-dupe, save to project. | Store in `contacts` with `projectId`, `phone`, `name?`, `status: pending`. |
| 7 | **Contacts table** — Table of contacts (phone, name, status, updated). Pagination or “Load more”. | Read from API; later add “Run” to trigger pipeline. |
| 8 | **Capture fields config** — UI to add/remove capture fields (label + optional type). Save to project. | Stored as `project.captureFields`. |
| 9 | **Agent script config** — Text area for “What should the AI ask?” Save to project. | Stored as `project.agentInstructions`. |
| 10 | **Results / Calls table** — Table: contact, status, duration, date, capture field columns, “Transcript”, “Recording”. | Data from `calls` or `contact.callResult`. Mock then real. |
| 11 | **Transcript view** — Modal or panel with full transcript (Agent / Contact). Optional “Play recording” link. | From `call.transcript` or `contact.callResult.transcript`. |
| 12 | **Recording player** — Audio player (play, progress, speed, download) per call. | Use `<audio>` or a small library; `recordingUrl` from DB. |
| 13 | **Export** — “Export to Excel/CSV” with contacts + capture fields + transcript link + recording link. | API route that generates file and returns download. |
| 14 | **Run project (stub)** — “Start calling” button; call pipeline API or queue. Show “Running” state; progress (X of Y) if API supports it. | Can stub with “Simulate” that marks random contacts as success/failed and fills mock transcript/duration. |

### Phase 2 — Polish

| # | Task | Notes |
|---|------|--------|
| 15 | **Time saved** — Dashboard and project view: “AI call time” in hours, copy “Equivalent to X hours saved.” | Compute from sum(duration). |
| 16 | **Progress indicator** — When project is running, show “X of Y called”, maybe a simple progress bar. | Poll or websocket. |
| 17 | **Transcript search** — Search box to filter or highlight text in transcript. | Client-side search in transcript text. |
| 18 | **Retry failed / export failed** — Button to export failed contacts as CSV; optional “Retry” to re-queue. | Filter contacts by status = failed. |
| 19 | **Duplicate project** — Copy project config + contact list into a new project. | Clone project and contacts. |

### Phase 3 — Later

| # | Task | Notes |
|---|------|--------|
| 20 | **Usage/billing** — Show calls used vs limit (if tiers exist). | Depends on billing model. |
| 21 | **Notifications** — Email on project complete; optional in-app bell. | Worker + email provider. |
| 22 | **Multi-user / permissions** — Optional; invite, roles. | Requires teams and permissions model. |

---

## 10. Things You Might Have Forgotten (Included Above)

- **Definition of “success” vs “failed”** — Clearly define (e.g. success = answered + conversation completed + at least one capture field filled; failed = no answer, busy, error, or abandoned). Document in UI (tooltip or help).
- **Capture fields as columns** — Export and Results table must dynamically show columns for each project’s capture fields.
- **Recording storage** — Where files live (URL only in DB); download link if files are private (signed URL).
- **Large lists** — 1000+ contacts: pagination, virtual scroll, background import for CSV.
- **Run vs manual** — “Run” triggers your existing pipeline; if pipeline doesn’t exist yet, “Simulate” or “Demo” mode with mock results so UI can be built and demonstrated.
- **Timezone** — Store dates in UTC; show in user’s local time in UI.
- **Empty states** — “No projects yet”, “Paste numbers to get started”, “No calls yet — run the project”.
- **Loading / error states** — Skeleton loaders, error messages, retry for API failures.
- **Mobile/tablet** — Table responsive (horizontal scroll or cards); sidebar collapses to menu on small screens.

---

## 11. Next Step

Pick a starting slice (e.g. **Auth + Dashboard layout + Dashboard home with mock KPIs**), then **Projects list + Project detail shell + Contacts paste + Contacts table**. Once that’s in place, add **Instructions (capture + script)**, then **Results table + Transcript + Recording + Export**, then **Run** and **Time saved** polish.

If you want, the next step can be a minimal **data schema (SQL or Prisma)** and **route list (API + pages)** so implementation can start from this plan.
