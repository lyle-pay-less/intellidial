# Prod auth root cause analysis – verification checklist

Run these from your machine (PowerShell) with `gcloud` configured and project set to `intellidial-39ca7`. No code changes; evidence only.

---

## RCA RESULTS (completed)

| Check | Result |
|-------|--------|
| **Cloud Run SA** | `cloud-run-intellidial@intellidial-39ca7.iam.gserviceaccount.com` ✓ correct |
| **Prod URL** | `https://intellidial-huxj3qhunq-nw.a.run.app` |
| **Env / secrets** | Only client Firebase (`NEXT_PUBLIC_FIREBASE_*`) + VAPI/GEMINI/Places. **No** `FIREBASE_ADMIN_*` or `GOOGLE_APPLICATION_CREDENTIALS` → Admin uses **ADC** (Cloud Run SA). ✓ |
| **Prod logs** | Firestore calls **fail** with: `Metadata string value "projects/intellidial-39ca7"` (message truncated; same error for `getUserOrganization` and `listProjects`). Then fallback to in-memory → only demo data (dev-org-1) → real users get no org. |

**Root cause:** On Cloud Run, Firebase Admin uses **ADC** (identity = cloud-run-intellidial). Firestore/gRPC is **rejecting requests** due to **metadata** (likely **quota project** not set or wrong format for the ADC context). So every Firestore call fails, app falls back to in-memory store, and only demo user has data.

**Next step:** Set quota project for the Cloud Run service so ADC’s Firestore usage is billed/identified correctly (e.g. env `GOOGLE_CLOUD_PROJECT=intellidial-39ca7` on the service, or fix in code so the Firestore client sends the expected metadata). Then re-deploy and re-check logs.

---

## 1. Cloud Run: service account and env vars

**Service account in use:**

```powershell
gcloud run services describe intellidial --region=europe-west2 --format="yaml(spec.template.spec.serviceAccountName)"
```

Expected: `cloud-run-intellidial@intellidial-39ca7.iam.gserviceaccount.com`. If different or empty, Cloud Run is not using the intended SA.

**Env vars and secrets at runtime:**

```powershell
gcloud run services describe intellidial --region=europe-west2 --format="yaml(spec.template.spec.containers[0].env)"
```

Check:

- No `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` → Admin SDK will use ADC (Cloud Run SA).
- `NEXT_PUBLIC_FIREBASE_*` should appear if they’re mounted from Secret Manager (names may show as secret refs).

**Secrets mounted (names only):**

```powershell
gcloud run services describe intellidial --region=europe-west2 --format="value(spec.template.spec.containers[0].env)" | ForEach-Object { $_ -split ',' }
```

Confirm which env vars are set via secrets (no values, just that they exist).

---

## 2. What the code actually uses (from repo)

- **admin.ts** init order: (1) `FIREBASE_ADMIN_PROJECT_ID` + `CLIENT_EMAIL` + `PRIVATE_KEY`, (2) `GOOGLE_APPLICATION_CREDENTIALS`, (3) ADC with `projectId` from env or `intellidial-39ca7`.
- **cloudbuild.yaml**: deploy uses `--set-secrets` for VAPI_*, GEMINI_*, GOOGLE_PLACES_*, and **NEXT_PUBLIC_FIREBASE_*** only. No `FIREBASE_ADMIN_*` or `GOOGLE_APPLICATION_CREDENTIALS` on Cloud Run.
- So prod **will** use ADC (Cloud Run SA `cloud-run-intellidial`). No Admin key is configured in prod.

---

## 3. Prod error (server-side)

Get the real error from Cloud Run logs:

```powershell
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=intellidial" --limit=50 --format="table(timestamp,textPayload)" --freshness=1d
```

Or filter for Firebase/Store:

```powershell
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=intellidial AND (textPayload:\"Firebase\" OR textPayload:\"Store\" OR textPayload:\"CRITICAL\" OR textPayload:\"getUserOrganization\")" --limit=30 --format="value(timestamp,textPayload)" --freshness=1d
```

Note the exact message (e.g. permission denied, invalid_grant, project id, quota).

---

## 4. Firebase Auth (client): authorized domains

Prod domain must be in Firebase Auth authorized domains or sign-in can be blocked.

- Firebase Console → Authentication → Settings → Authorized domains.
- Ensure your Cloud Run URL is listed (e.g. `intellidial-xxxxxxxxxx-ew.a.run.app` or custom domain).

No gcloud command for this; check in console. Optional: note the exact prod URL:

```powershell
gcloud run services describe intellidial --region=europe-west2 --format="value(status.url)"
```

---

## 5. Summary table (fill after running)

| Check | Command / place | Result (paste or one-liner) |
|-------|-----------------|-----------------------------|
| Cloud Run SA | `describe ... serviceAccountName` | |
| Env / secrets | `describe ... containers[0].env` | |
| Server error | `gcloud logging read ...` | |
| Prod URL | `status.url` | |
| Auth domain | Firebase Console → Authorized domains | Added? Y/N |

---

After you run 1–4 and fill the table, we can say whether the cause is SA, ADC/quota, client config, or authorized domains, and only then change code or config.
