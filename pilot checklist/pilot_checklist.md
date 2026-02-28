# Intellidial – Pilot Readiness Checklist

Use this checklist before you invite pilot customers. Aim for “good enough and reliable”, not perfect.

---

## 1. Core end‑to‑end flow is solid

- [ ] I can **sign up / log in** as a fresh user without errors.
- [ ] I can **create a new organization** (or have a clear path for me to create it manually).
- [ ] I can **create a project** with capture fields and AI agent instructions.
- [ ] I can **import contacts** (CSV / paste numbers) and see them in the project.
- [ ] I can **start calls** and see them transition from “calling” to a final state.
- [ ] For completed calls, I can see:
  - [ ] **Status** (completed / failed / etc.)
  - [ ] **Transcript**
  - [ ] **Recording link**
  - [ ] **Captured data fields** filled correctly
- [ ] I can **export results to CSV** and the columns match what I expect.
- [ ] I have run this full flow myself **multiple times** with different projects/lists.

---

## 2. Security & org isolation are correct

- [ ] Each user only sees data for **their own organization**.
- [ ] If I log in as User A and User B (different orgs), they **cannot** see each other’s:
  - [ ] Projects
  - [ ] Contacts
  - [ ] Calls / results
  - [ ] Exports
- [ ] Firestore rules / server checks enforce org scoping (not just UI hiding).
- [ ] No secrets or internal debug info are exposed in API responses or UI error messages.

---

## 3. Pilot onboarding path is clear

- [ ] I have decided **how pilot users get access**:
  - [ ] I invite them manually **or**
  - [ ] They self‑signup using a stable flow I’ve tested.
- [ ] Invitation + login works smoothly (even if I send the invite link manually at first).
- [ ] I know exactly what I will do when a new pilot says “yes” (step‑by‑step).

Example internal flow:

- [ ] Create org for the customer.
- [ ] Invite main contact (and any team members).
- [ ] Create first project template for them (optional).
- [ ] Share simple “How to log in and see your results” instructions.

---

## 4. UX for errors and loading is “good enough”

- [ ] There are **no blank screens** where users might think the app is broken.
- [ ] Long operations (dashboard load, results, exports) have **spinners or skeletons**.
- [ ] When something fails, users see:
  - [ ] A **clear message** (plain language, not raw error objects).
  - [ ] Reassurance that their data is safe (where relevant).
  - [ ] A simple instruction: e.g. “Please contact support and include this ID: …”.
- [ ] Obvious rough edges (Next.js boilerplate, test copy) are removed from the main pilot flow.

---

## 5. Monitoring & support during pilots

- [ ] I know where to check **app health**:
  - [ ] Cloud Run / hosting logs
  - [ ] Firestore data (projects, contacts, calls)
  - [ ] VAPI dashboard (for call status)
- [ ] I have a simple **internal routine** for active pilots:
  - [ ] Daily/regular check of new calls and failures.
  - [ ] Manual review of a sample of transcripts and recordings.
  - [ ] Quick fixes for obvious data issues (e.g. bad imports, obvious mis‑captures).
- [ ] Pilot customers know:
  - [ ] **How to reach me** (email / WhatsApp) for support.
  - [ ] Approximate **response times** during the pilot.

---

## 6. Clear pilot offer & expectations

- [ ] I have a **one‑pager** (or a short doc) describing:
  - [ ] Pilot scope (e.g. “Up to 200 calls over 2–3 weeks”).
  - [ ] What I will deliver (data, dashboards, exports, summary).
  - [ ] What they commit (access to lists, 1–2 review calls, internal champion).
  - [ ] Pilot price (or conditions, if discounted/free) and what happens after.
- [ ] I know **how I will measure success** of the pilot:
  - [ ] # of completed calls / insights.
  - [ ] Quality and usefulness of data.
  - [ ] Whether the customer wants to continue / expand.

---

## 7. Personal confidence check

- [ ] I’ve personally gone through the app and thought:  
  “If I were the customer, I would **understand what’s happening** and **trust the results**.”
- [ ] I’m comfortable jumping on a call with a pilot customer, sharing my screen, and:
  - [ ] Creating a project live.
  - [ ] Importing a small test list.
  - [ ] Starting calls.
  - [ ] Showing them where to find transcripts, recordings, and exports.

If all of the above are **mostly true** (you don’t need perfection), you are ready to start inviting **carefully selected pilots** and learning from real usage.

