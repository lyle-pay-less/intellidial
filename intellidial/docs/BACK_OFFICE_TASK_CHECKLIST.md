# Back Office — Task Checklist (Top-Down Execution)

Execute in order. Check off as you complete each item. Dependencies are ordered so earlier tasks unblock later ones.

---

## Phase 0 — Setup (do first)

- [x] **0.1** Create dashboard route structure: `src/app/dashboard/layout.tsx`, `src/app/dashboard/page.tsx`
- [x] **0.2** Define data schema: Firestore collections `users`, `projects`, `contacts`. Types: project (name, status, captureFields, agentInstructions), contact (projectId, phone, name?, status, callResult: durationSeconds, recordingUrl, transcript, capturedData, attemptedAt)
- [x] **0.3** GCP / Firebase: Firestore + Firebase Auth. Add Firebase client config and (when needed) Admin SDK in API routes. Env vars for project id, API key, etc.
- [x] **0.4** Auth: Firebase Auth (Google, Microsoft, email) or NextAuth wired to Firebase. Protect `/dashboard/*` — require signed-in user.
- [x] **0.5** Create mock data helper: projects, contacts with callResult, so dashboard and project pages can render before real Firestore.

---

## Phase 1 — MVP

### Auth & layout

- [x] **1.1** Protect `/dashboard`: middleware or layout that redirects unauthenticated users to `/` (or `/login`) and optionally opens login modal.
- [x] **1.2** Dashboard layout: sidebar or top nav with “Dashboard” and “Projects” links, main content area, user menu + Logout.
- [x] **1.3** Reuse marketing header style (teal/slate); ensure dashboard feels like same product.

### Dashboard home

- [x] **1.4** Dashboard home page (`/dashboard`): KPI tiles — Contacts uploaded, Calls made, Successful calls, Unsuccessful calls, **Hours on calls (time saved)**. Use mock data first.
- [x] **1.5** Add Success rate % and one-line value: “AI handled X hours of calls.”
- [x] **1.6** Recent projects list with link to each project (route to project detail).

### Projects

- [x] **1.7** Projects list page (`/dashboard/projects`): list all projects (name, status, created date, contact count), “New project” button.
- [x] **1.8** API: create project (name, optional description). Redirect or refresh list after create.
- [x] **1.9** Project detail page shell (`/dashboard/projects/[id]`): tabs or sections — Overview, Contacts, Instructions, Results, Export. Empty states for each.

### Contacts

- [x] **1.10** Contacts section: textarea to paste numbers (one per line or comma-separated). Parse, validate format, count, de-dupe; show preview.
- [x] **1.11** API: bulk create contacts for project (phone, optional name). Save with status `pending`.
- [x] **1.12** Contacts table: columns — phone, name, status, last updated. Pagination or “Load more”. Read from API.

### Agent instructions (project config)

- [x] **1.13** Capture fields UI: add/remove fields (label + optional type text/number). Save to `project.captureFields`.
- [x] **1.14** Agent script UI: text area “What should the AI ask?” Save to `project.agentInstructions`.
- [x] **1.15** API: update project (captureFields, agentInstructions). Load and display on project page.

### Results & calls

- [x] **1.16** Results section: calls table — contact (phone/name), status, duration, date, dynamic columns for each capture field, “Transcript”, “Recording”. Use mock or real `contact.callResult` / `calls` data.
- [x] **1.17** Transcript view: modal or slide-over with full transcript (Agent / Contact). “Play recording” button that opens or focuses recording player.
- [x] **1.18** Recording player: `<audio>` (or small lib) — play, progress, speed, optional download. Use `recordingUrl` from call/contact.
- [x] **1.19** Optional: filters on Results — by status (success/failed), date range.

### Export & run

- [x] **1.20** Export: “Export to Excel” (or CSV). Columns — contact (phone, name), status, duration, date, all capture fields, transcript (text or link), recording (link). API route returns file download.
- [x] **1.21** Run project (stub): “Start calling” button; call pipeline API or stub that marks random contacts success/failed and fills mock transcript/duration. Show project status “running” then “completed”.

### Wire real data (when backend ready)

- [x] **1.22** Replace mock KPIs on dashboard with real aggregates (count contacts, count calls, success/failed, sum duration → hours).
- [x] **1.23** Ensure project detail loads real project, contacts, and call results from API/DB.

---

## Phase 2 — Polish

- [x] **2.1** Time saved framing: dashboard and project view — “Equivalent to X hours of your team’s time saved” using total AI call time.
- [x] **2.2** Run progress: when project status = running, show “X of Y called” and optional progress bar (poll or websocket).
- [x] **2.3** Transcript search: search box to filter/highlight text in transcript (client-side).
- [x] **2.4** Export failed: button to download CSV of failed contacts only; optional “Retry failed” to re-queue.
- [x] **2.5** Duplicate project: copy project config + contact list into new project.

---

## Phase 3 — Later

- [x] **3.1** Usage/billing: show “Calls used / limit” if tiers exist; link to upgrade.
- [x] **3.2** Notifications: email when project completes; optional in-app bell.
- [x] **3.3** Multi-user: invite, roles (admin/viewer), permissions (optional).

---

## Quick reference — suggested file/route map

| Task area        | Routes / files |
|------------------|----------------|
| Layout & auth     | `dashboard/layout.tsx`, middleware or auth check |
| Dashboard home   | `dashboard/page.tsx` |
| Projects list    | `dashboard/projects/page.tsx` |
| Project detail   | `dashboard/projects/[id]/page.tsx` (tabs: Contacts, Instructions, Results, Export) |
| APIs             | `dashboard/projects/route.ts`, `dashboard/projects/[id]/route.ts`, `dashboard/projects/[id]/contacts/route.ts`, `dashboard/projects/[id]/export/route.ts` |
| Data             | `lib/firebase/` — types, config, Firestore helpers; mock data |

---

**Start with:** 0.1 → 0.2 → 0.3 → 0.4 → 0.5, then 1.1 → 1.2 → 1.4 → 1.7 → 1.9, and continue down the list.
