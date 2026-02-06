# Secret Names Verification Checklist

## Firebase NEXT_PUBLIC_* Secrets (Required for Build)

These secrets MUST exist in Secret Manager with EXACT names (case-sensitive):

1. ✅ `next-public-firebase-api-key`
2. ✅ `next-public-firebase-auth-domain`
3. ✅ `next-public-firebase-project-id`
4. ✅ `next-public-firebase-storage-bucket`
5. ✅ `next-public-firebase-messaging-sender-id`
6. ✅ `next-public-firebase-app-id`

## How to Verify in GCP Console

1. Go to [Secret Manager](https://console.cloud.google.com/security/secret-manager?project=intellidial-39ca7)
2. Filter by: `next-public-firebase`
3. Verify all 6 secrets exist with EXACT names above

## Expected Usage

- **Build time** (`availableSecrets` in cloudbuild.yaml): Used to pass as build args to Docker
- **Runtime** (`--set-secrets` in Cloud Run deploy): Used as environment variables in Cloud Run

Both use the same secret names, so they must match exactly.

## Quick Verification Command

```bash
gcloud secrets list --project=intellidial-39ca7 --filter="name~next-public-firebase" --format="table(name)"
```

Expected output should show all 6 secrets listed above.
