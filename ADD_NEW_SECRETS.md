# Adding New Secrets to Secret Manager

This guide helps you add the new secrets (Calendly, HubSpot, Encryption Key) to GCP Secret Manager before deploying.

## New Secrets to Add

1. **hubspot-client-id** → `HUBSPOT_CLIENT_ID`
2. **hubspot-client-secret** → `HUBSPOT_CLIENT_SECRET`
3. **hubspot-redirect-uri** → `HUBSPOT_REDIRECT_URI`
4. **integration-encryption-key** → `INTEGRATION_ENCRYPTION_KEY`
5. **next-public-calendly-url** → `NEXT_PUBLIC_CALENDLY_URL`

## Step 1: Generate Encryption Key

First, generate a secure 64-character hex encryption key:

**Bash/Linux/Mac/Git Bash:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**PowerShell (Windows):**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (64 characters) - you'll need it for the `integration-encryption-key` secret.

## Step 2: Create Secrets in Secret Manager

**Bash/Linux/Mac/Git Bash:**

```bash
# Set project
gcloud config set project intellidial-39ca7

# Create secrets (replace YOUR_* values with actual values from .env)
echo -n "ad34266e-4d58-45c0-a1f1-aea450ff8936" | gcloud secrets create hubspot-client-id --data-file=-
echo -n "fb86455a-19f6-4b23-9d3d-379df517c488" | gcloud secrets create hubspot-client-secret --data-file=-
echo -n "https://intellidial.co.za/dashboard/integrations?hubspot_connected=true" | gcloud secrets create hubspot-redirect-uri --data-file=-
echo -n "YOUR_64_CHAR_HEX_KEY_FROM_STEP_1" | gcloud secrets create integration-encryption-key --data-file=-
echo -n "https://calendly.com/growth-intellidial/30min" | gcloud secrets create next-public-calendly-url --data-file=-
```

**PowerShell (Windows):**

```powershell
# Set project
gcloud config set project intellidial-39ca7

# Create secrets (replace YOUR_* values with actual values from .env)
"ad34266e-4d58-45c0-a1f1-aea450ff8936" | gcloud secrets create hubspot-client-id --data-file=-
"fb86455a-19f6-4b23-9d3d-379df517c488" | gcloud secrets create hubspot-client-secret --data-file=-
"https://intellidial.co.za/dashboard/integrations?hubspot_connected=true" | gcloud secrets create hubspot-redirect-uri --data-file=-
"YOUR_64_CHAR_HEX_KEY_FROM_STEP_1" | gcloud secrets create integration-encryption-key --data-file=-
"https://calendly.com/growth-intellidial/30min" | gcloud secrets create next-public-calendly-url --data-file=-
```

**Note:** Replace the example values above with your actual values from `.env` file.

## Step 3: Grant Cloud Run Service Account Access

**Bash/Linux/Mac/Git Bash:**

```bash
SA="cloud-run-intellidial@intellidial-39ca7.iam.gserviceaccount.com"
for name in hubspot-client-id hubspot-client-secret hubspot-redirect-uri integration-encryption-key next-public-calendly-url; do
  gcloud secrets add-iam-policy-binding $name \
    --member="serviceAccount:${SA}" \
    --role="roles/secretmanager.secretAccessor"
done
```

**PowerShell (Windows):**

```powershell
$SA = "cloud-run-intellidial@intellidial-39ca7.iam.gserviceaccount.com"
@("hubspot-client-id", "hubspot-client-secret", "hubspot-redirect-uri", "integration-encryption-key", "next-public-calendly-url") | ForEach-Object {
  gcloud secrets add-iam-policy-binding $_ --member="serviceAccount:$SA" --role="roles/secretmanager.secretAccessor"
}
```

## Step 4: Verify Secrets

**Bash/Linux/Mac/Git Bash:**

```bash
# List all secrets (should see the new ones)
gcloud secrets list --project=intellidial-39ca7 --format="table(name)"

# Verify Cloud Run SA can access them
SA="cloud-run-intellidial@intellidial-39ca7.iam.gserviceaccount.com"
for name in hubspot-client-id hubspot-client-secret hubspot-redirect-uri integration-encryption-key next-public-calendly-url; do
  echo "Checking $name..."
  gcloud secrets get-iam-policy $name --project=intellidial-39ca7 | grep -A1 "$SA"
done
```

**PowerShell (Windows):**

```powershell
# List all secrets (should see the new ones)
gcloud secrets list --project=intellidial-39ca7 --format="table(name)"

# Verify Cloud Run SA can access them
$SA = "cloud-run-intellidial@intellidial-39ca7.iam.gserviceaccount.com"
@("hubspot-client-id", "hubspot-client-secret", "hubspot-redirect-uri", "integration-encryption-key", "next-public-calendly-url") | ForEach-Object {
  Write-Host "Checking $_..."
  gcloud secrets get-iam-policy $_ --project=intellidial-39ca7 | Select-String -Pattern $SA
}
```

## Step 5: Update cloudbuild.yaml

The `cloudbuild.yaml` file has already been updated to include these secrets in the `--set-secrets` parameter. Verify it includes:

- `HUBSPOT_CLIENT_ID=hubspot-client-id:latest`
- `HUBSPOT_CLIENT_SECRET=hubspot-client-secret:latest`
- `HUBSPOT_REDIRECT_URI=hubspot-redirect-uri:latest`
- `INTEGRATION_ENCRYPTION_KEY=integration-encryption-key:latest`
- `NEXT_PUBLIC_CALENDLY_URL=next-public-calendly-url:latest`

## Step 6: Push to Git

After creating all secrets and verifying access, you can safely push your code to git. The `.env` file is already in `.gitignore`, so it won't be committed.

```bash
git add .
git commit -m "Add HubSpot, GCP, Google Sheets integrations and update deployment config"
git push origin main
```

## Troubleshooting

### Secret Already Exists

If a secret already exists, add a new version instead:

```bash
echo -n "NEW_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=-
```

PowerShell: `"NEW_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=-`

### Permission Denied

Make sure you're authenticated:
```bash
gcloud auth login
gcloud config set project intellidial-39ca7
```

### Missing Secret Manager API

Enable it:
```bash
gcloud services enable secretmanager.googleapis.com
```
