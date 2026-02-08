# Deploy secrets — Secret Manager + Cloud Build

Use this when you add new API keys or before deploying a new version. All runtime secrets are loaded from **Secret Manager** and wired via `cloudbuild.yaml` → Cloud Run.

---

## 1. Secret names (must match exactly)

Create these in [Secret Manager](https://console.cloud.google.com/security/secret-manager?project=intellidial-39ca7) with **exact** names:

| Secret name | Env var | Purpose |
|-------------|--------|---------|
| `vapi-api-key` | VAPI_API_KEY | VAPI server API key |
| `vapi-public-key` | VAPI_PUBLIC_KEY | VAPI public key (web/demo) |
| `vapi-demo-assistant-id` | VAPI_DEMO_ASSISTANT_ID | Demo assistant for landing page |
| `vapi-phone-number-id` | VAPI_PHONE_NUMBER_ID | VAPI phone number for outbound |
| `gemini-api-key` | GEMINI_API_KEY | Gemini API (e.g. context from URL) |
| `google-places-api-key` | GOOGLE_PLACES_API_KEY | Google Places (if used) |
| `eleven-labs-api-key` | ELEVEN_LABS_API_KEY | ElevenLabs (voice preview in app) |
| `google-sheets-service-account-json` | GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON | Service account JSON string (Export to Sheets) |
| `next-public-app-url` | NEXT_PUBLIC_APP_URL | App URL (e.g. `https://intellidial-xxx.run.app`) for webhooks + invite emails |
| `next-public-firebase-api-key` | NEXT_PUBLIC_FIREBASE_API_KEY | Firebase client config |
| `next-public-firebase-auth-domain` | NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | Firebase client config |
| `next-public-firebase-project-id` | NEXT_PUBLIC_FIREBASE_PROJECT_ID | Firebase client config |
| `next-public-firebase-storage-bucket` | NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | Firebase client config |
| `next-public-firebase-messaging-sender-id` | NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | Firebase client config |
| `next-public-firebase-app-id` | NEXT_PUBLIC_FIREBASE_APP_ID | Firebase client config |

**Total: 15 secrets** (6 VAPI/Gemini/Google/ElevenLabs/Sheets/App URL + 6 Firebase NEXT_PUBLIC_ + 3 already existed).

---

## 2. Create new secrets (when you add keys)

For each new key, create the secret and grant the Cloud Run service account access.

**Bash (Linux / macOS / Git Bash / Cloud Shell):**

```bash
# Set project
gcloud config set project intellidial-39ca7

# Create secret (you'll be prompted to type the value, or use --data-file=path/to/file)
echo -n "YOUR_VALUE" | gcloud secrets create eleven-labs-api-key --data-file=-
echo -n '{"type":"service_account",...}' | gcloud secrets create google-sheets-service-account-json --data-file=-
echo -n "https://intellidial-81645167087.europe-west2.run.app" | gcloud secrets create next-public-app-url --data-file=-

# Grant Cloud Run service account access to the new secret(s)
SA="cloud-run-intellidial@intellidial-39ca7.iam.gserviceaccount.com"
for name in eleven-labs-api-key google-sheets-service-account-json next-public-app-url; do
  gcloud secrets add-iam-policy-binding $name \
    --member="serviceAccount:${SA}" \
    --role="roles/secretmanager.secretAccessor"
done
```

**PowerShell (Windows):**

Run these one at a time (or run the loop as a single block). Replace `YOUR_ELEVEN_LABS_KEY` and the JSON with your real values.

```powershell
gcloud config set project intellidial-39ca7

# Create each secret (use your real values)
"YOUR_ELEVEN_LABS_KEY" | gcloud secrets create eleven-labs-api-key --data-file=-
# For Google Sheets: paste the full JSON in a file, then: Get-Content path\to\key.json -Raw | gcloud secrets create google-sheets-service-account-json --data-file=-
"https://intellidial-81645167087.europe-west2.run.app" | gcloud secrets create next-public-app-url --data-file=-

# Grant Cloud Run service account access (PowerShell loop)
$SA = "cloud-run-intellidial@intellidial-39ca7.iam.gserviceaccount.com"
@("eleven-labs-api-key", "google-sheets-service-account-json", "next-public-app-url") | ForEach-Object {
  gcloud secrets add-iam-policy-binding $_ --member="serviceAccount:$SA" --role="roles/secretmanager.secretAccessor"
}
```

If a secret already exists and you only need to **add a new version** (e.g. rotated key):

```bash
echo -n "NEW_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=-
```

PowerShell: `"NEW_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=-`

---

## 3. cloudbuild.yaml

- **Build step:** Only the 6 `NEXT_PUBLIC_FIREBASE_*` values are passed as Docker build args (currently hardcoded in `cloudbuild.yaml`). They must match your Firebase project.
- **Deploy step:** All 15 secrets are mapped with `--set-secrets` so Cloud Run injects them as env vars at runtime.

When you add a new env var that must be a secret:

1. Create the secret in Secret Manager (name in kebab-case, e.g. `my-new-api-key`).
2. Add to the long `--set-secrets` string in `cloudbuild.yaml`:
   - `ENV_VAR_NAME=secret-name:latest`
3. Grant `cloud-run-intellidial@...` **Secret Manager Secret Accessor** on that secret (see Step 2 above).

---

## 4. Optional / not in Cloud Build

- **VAPI_WEBHOOK_BASE_URL** — If set, overrides webhook URL; otherwise app uses `NEXT_PUBLIC_APP_URL` + `/api/webhooks/vapi/call-ended`. Usually leave unset.
- **FIREBASE_ADMIN_*** — App can use Application Default Credentials (ADC) on Cloud Run, so Firebase Admin secrets are optional if the Cloud Run service account has Firebase Admin role.
- **VAPI_PHONE_NUMBER_E164** — Optional display value; not required for calling.

---

## 5. Quick check before deploy

```bash
# List secrets (should see all 15)
gcloud secrets list --project=intellidial-39ca7 --format="table(name)"

# Ensure Cloud Run SA can access them (bash)
SA="cloud-run-intellidial@intellidial-39ca7.iam.gserviceaccount.com"
gcloud secrets get-iam-policy eleven-labs-api-key --project=intellidial-39ca7 | grep -A1 "$SA"
```

PowerShell: same `gcloud secrets list`; for IAM check use `gcloud secrets get-iam-policy eleven-labs-api-key --project=intellidial-39ca7`.

After updating secrets or `cloudbuild.yaml`, push to `main` to trigger the build; the new revision will use the updated secrets.
