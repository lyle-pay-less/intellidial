# GCP Cloud Run Deployment Checklist — Complete Guide

**Goal:** Deploy Intellidial to Cloud Run (London) with CI/CD, Firebase, and secrets management.

**Region:** London (europe-west2)  
**Service:** Cloud Run  
**CI/CD:** Cloud Build  
**Local Dev:** Still works locally

---

## Quick Progress Tracker

| Step | Status | Description |
|------|--------|-------------|
| 1 | ☑ | Enable Required GCP APIs - **COMPLETE** |
| 2 | ☑ | Set Up Service Account for Cloud Run - **COMPLETE** |
| 3 | ☑ | Set Up Firebase Service Account - **COMPLETE** (using ADC, no file needed) |
| 4 | ☑ | Create Secrets in Secret Manager - **COMPLETE** |
| 5 | ☑ | Grant Secret Access to Service Account - **COMPLETE** |
| 6 | ☑ | Update cloudbuild.yaml for London Region - **COMPLETE** |
| 7 | ☑ | Update Dockerfile for Secrets - **COMPLETE** |
| 8 | ☑ | Verify Cloud Run Configuration - **COMPLETE** (Cloud Build will create it) |
| 9 | ☑ | Update Cloud Build Permissions - **COMPLETE** |
| 10 | ☑ | Update cloudbuild.yaml for Secrets - **COMPLETE** |
| 11 | ☑ | Keep Local Development Working - **COMPLETE** |
| 12 | ☑ | Update .gitignore - **COMPLETE** |
| 13 | ☐ | Connect Cloud Build Trigger |
| 14 | ☑ | Test Deployment - **IN PROGRESS** (code pushed, monitoring build) |
| 15 | ☐ | Verify Deployment |
| 16 | ☐ | Set Up Custom Domain (Optional) |
| 17 | ☐ | Monitor and Optimize |
| 18 | ☐ | Update Documentation |

**Instructions:** Change `☐` to `☑` when you complete each step.

---

## Pre-Deployment Checklist

### Step 1: Enable Required GCP APIs

☑ **Step 1: Enable Required GCP APIs** - **COMPLETE**

☑ Go to [Google Cloud Console](https://console.cloud.google.com) - **DONE**
☑ Select your project (or create one) - **DONE (intellidial-39ca7)**
☑ Billing setup - **DONE**
☑ Go to **APIs & Services** → **Library** - **DONE**
☑ Enable these APIs:
  ☑ **Cloud Run API** - **ENABLED**
  ☑ **Cloud Build API** - **ENABLED**
  ☑ **Secret Manager API** - **ENABLED**
  ☑ **Firebase Admin API** - **ENABLED**
  ☑ **Container Registry API** - **ENABLED**

**How to enable:**
1. Search for each API name
2. Click on it
3. Click **"Enable"**
4. Wait for activation (30 seconds each)

---

### Step 2: Set Up Service Account for Cloud Run

☑ **Step 2: Set Up Service Account for Cloud Run** - **COMPLETE**

☑ Go to [IAM & Admin](https://console.cloud.google.com/iam-admin/serviceaccounts) - **DONE**
☑ Click **"Create Service Account"** - **DONE**
☑ Name: `cloud-run-intellidial` - **DONE**
☑ Description: `Service account for Intellidial Cloud Run deployment` - **DONE**
☑ Click **"Create and Continue"** - **DONE**
☑ Add roles:
  ☑ **Cloud Run Invoker** (to allow public access) - **DONE**
  ☑ **Secret Manager Secret Accessor** (to read secrets) - **DONE**
  ☑ **Firebase Admin** (if using Firebase Admin SDK) - **DONE**
☑ Click **"Done"** - **DONE**
☑ **Save the service account email** (you'll need it) - **DONE**

**Service Account Email:** `cloud-run-intellidial@intellidial-39ca7.iam.gserviceaccount.com`

---

### Step 3: Set Up Firebase Service Account

☑ **Step 3: Set Up Firebase Service Account** - **COMPLETE**

☑ Service account exists: `firebase-adminsdk-fbsvc@intellidial-39ca7.iam.gserviceaccount.com` - **DONE**
☑ Cloud Run service account (`cloud-run-intellidial`) has Firebase Admin role - **DONE**
☑ **No JSON file needed** - Cloud Run will use Application Default Credentials (ADC) automatically - **DONE**

**Note:** Since Cloud Run uses the service account `cloud-run-intellidial@intellidial-39ca7.iam.gserviceaccount.com` which has Firebase Admin role, Firebase Admin SDK will authenticate automatically using Application Default Credentials. No JSON file or secret needed!

---

### Step 4: Create Secrets in Secret Manager

☑ **Step 4: Create Secrets in Secret Manager** - **COMPLETE**

☑ Go to [Secret Manager](https://console.cloud.google.com/security/secret-manager) - **DONE**
☑ Created all secrets using gcloud commands - **DONE**

**Note:** Firebase Admin SDK uses Application Default Credentials (ADC) automatically via the Cloud Run service account, so no secret needed!

#### Secret 1: VAPI API Key
☑ Name: `vapi-api-key` - **CREATED**

#### Secret 2: VAPI Public Key
☑ Name: `vapi-public-key` - **CREATED**

#### Secret 3: VAPI Demo Assistant ID
☑ Name: `vapi-demo-assistant-id` - **CREATED**

#### Secret 4: Gemini API Key
☑ Name: `gemini-api-key` - **CREATED**

#### Secret 5: Google Places API Key
☑ Name: `google-places-api-key` - **CREATED**

#### Secret 6: VAPI Phone Number ID
☑ Name: `vapi-phone-number-id` - **CREATED**

#### Secret 7-12: Firebase Config (NEXT_PUBLIC vars - stored in secrets for consistency)
☑ Name: `next-public-firebase-api-key` - **CREATED**
☑ Name: `next-public-firebase-auth-domain` - **CREATED**
☑ Name: `next-public-firebase-project-id` - **CREATED**
☑ Name: `next-public-firebase-storage-bucket` - **CREATED**
☑ Name: `next-public-firebase-messaging-sender-id` - **CREATED**
☑ Name: `next-public-firebase-app-id` - **CREATED**

**Note:** These are stored in Secret Manager but will be mapped to environment variables in Cloud Run (using `--set-secrets`).

---

### Step 5: Grant Secret Access to Service Account

☑ **Step 5: Grant Secret Access to Service Account** - **COMPLETE**

☑ Granted access to all 12 secrets using gcloud commands - **DONE**
☑ Service account: `cloud-run-intellidial@intellidial-39ca7.iam.gserviceaccount.com` - **DONE**
☑ Role: **Secret Manager Secret Accessor** - **DONE**

**Secrets granted access:**
- vapi-api-key
- vapi-public-key
- vapi-demo-assistant-id
- gemini-api-key
- google-places-api-key
- vapi-phone-number-id
- next-public-firebase-api-key
- next-public-firebase-auth-domain
- next-public-firebase-project-id
- next-public-firebase-storage-bucket
- next-public-firebase-messaging-sender-id
- next-public-firebase-app-id

---

### Step 6: Update cloudbuild.yaml for London Region

☑ **Step 6: Update cloudbuild.yaml for London Region** - **COMPLETE**

☑ Region is set to `europe-west2` (London) - **VERIFIED**
☑ All 12 secrets are correctly referenced in `--set-secrets` - **VERIFIED**
☑ Service account is correctly set - **VERIFIED**
☑ All Cloud Run configuration is correct - **VERIFIED**

**Verified configuration:**
- Region: `europe-west2` (London) ✅
- Secrets: All 12 secrets mapped correctly ✅
- Service account: `cloud-run-intellidial@$PROJECT_ID.iam.gserviceaccount.com` ✅

---

### Step 7: Update Dockerfile for Secrets

☑ **Step 7: Update Dockerfile for Secrets** - **COMPLETE**

☑ Dockerfile is set up for production - **VERIFIED**
☑ `.env` files excluded via `.dockerignore` - **UPDATED**
☑ Dockerfile comment updated to clarify secrets come from Cloud Run - **UPDATED**

**Verified configuration:**
- ✅ Builds Next.js app
- ✅ Uses standalone output (`output: 'standalone'` in next.config.ts)
- ✅ `.env` files excluded via `.dockerignore`
- ✅ Secrets read from environment variables (set by Cloud Run via `--set-secrets`)

---

### Step 8: Verify Cloud Run Configuration (Cloud Build will create it)

☑ **Step 8: Verify Cloud Run Configuration** - **COMPLETE**

☑ Cloud Run service will be created automatically by Cloud Build on first deployment - **CONFIGURED**
☑ All configuration is in `cloudbuild.yaml` - **VERIFIED**

**Cloud Build will automatically create the Cloud Run service with:**
- ✅ Service name: `intellidial`
- ✅ Region: `europe-west2` (London)
- ✅ Port: `3000`
- ✅ CPU: 1
- ✅ Memory: 512 MiB
- ✅ Timeout: 300 seconds
- ✅ Max instances: 10
- ✅ Min instances: 0
- ✅ All 12 secrets mapped via `--set-secrets`
- ✅ Service account: `cloud-run-intellidial@intellidial-39ca7.iam.gserviceaccount.com`
- ✅ Allow unauthenticated: Yes (public access)

**No manual Cloud Run creation needed - Cloud Build handles everything!**

---

### Step 9: Update Cloud Build Permissions

☑ **Step 9: Update Cloud Build Permissions** - **COMPLETE**

☑ Cloud Build service account: `81645167087@cloudbuild.gserviceaccount.com` - **CONFIGURED**
☑ Granted roles using gcloud commands - **DONE**

**Roles granted:**
- ✅ **Cloud Run Admin** (`roles/run.admin`) - to deploy to Cloud Run
- ✅ **Service Account User** (`roles/iam.serviceAccountUser`) - to use service account
- ✅ **Secret Manager Secret Accessor** (`roles/secretmanager.secretAccessor`) - to read secrets during build

**Cloud Build can now:**
- Deploy to Cloud Run
- Use the Cloud Run service account
- Access secrets during build/deployment

---

### Step 10: Update cloudbuild.yaml for Secrets

☑ **Step 10: Update cloudbuild.yaml for Secrets** - **COMPLETE**

☑ Verified `cloudbuild.yaml` configuration - **DONE**

**Verified configuration:**
- ✅ Uses London region (`europe-west2`)
- ✅ Deploys to correct service name (`intellidial`)
- ✅ Uses correct service account (`cloud-run-intellidial@$PROJECT_ID.iam.gserviceaccount.com`)
- ✅ Sets all 12 secrets via `--set-secrets`:
  - 6 API keys (VAPI, Gemini, Google Places)
  - 6 Firebase NEXT_PUBLIC_* variables
- ✅ Cloud Run settings configured (port, memory, CPU, timeout, instances)

**Example cloudbuild.yaml should have:**
```yaml
steps:
  # Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/intellidial:$COMMIT_SHA'
      - '-f'
      - 'Intellidial/Dockerfile'
      - 'Intellidial'

  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/intellidial:$COMMIT_SHA'

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'intellidial'
      - '--image'
      - 'gcr.io/$PROJECT_ID/intellidial:$COMMIT_SHA'
      - '--region'
      - 'europe-west2'  # London
      - '--platform'
      - 'managed'
      - '--service-account'
      - 'cloud-run-intellidial@$PROJECT_ID.iam.gserviceaccount.com'
      - '--set-secrets'
      - 'VAPI_API_KEY=vapi-api-key:latest,VAPI_PUBLIC_KEY=vapi-public-key:latest,VAPI_DEMO_ASSISTANT_ID=vapi-demo-assistant-id:latest,GEMINI_API_KEY=gemini-api-key:latest'
      - '--allow-unauthenticated'
```

---

### Step 11: Keep Local Development Working

☑ **Step 11: Keep Local Development Working** - **COMPLETE**

☑ `.env` file exists in root directory - **VERIFIED**
☑ `next.config.ts` already configured to read `.env` for production, `.env.local` for local dev - **VERIFIED**
☑ `.env` and `.env.local` are in `.gitignore` - **VERIFIED**

**Current configuration:**
- ✅ Local dev: Reads from `.env.local` (if exists) or `.env` (fallback)
- ✅ Production: Reads from `.env` (but Cloud Run uses secrets from Secret Manager)
- ✅ Both `.env` and `.env.local` are gitignored

**Local development will continue to work:**
- Your existing `.env` file will work for local development
- `next.config.ts` already handles this correctly
- No changes needed!

---

### Step 12: Update .gitignore

☑ **Step 12: Update .gitignore** - **COMPLETE**

☑ Verified `.gitignore` in root directory - **DONE**
☑ Added missing entries for Node.js/Next.js - **UPDATED**

**Verified/Updated entries:**
- ✅ `.env` - already ignored
- ✅ `.env.local` - already ignored
- ✅ `.env.*` - already ignored (covers all env variants)
- ✅ `firebase-adminsdk-*.json` - already ignored
- ✅ `node_modules/` - added
- ✅ `.next/` - added
- ✅ `dist/` and `build/` - added (common build outputs)

---

### Step 13: Connect Cloud Build Trigger

☑ **Step 13: Connect Cloud Build Trigger** - **COMPLETE**

☑ Trigger created: `deploy-intellidial` - **DONE**
☑ Connected to GitHub repo: `lyle-pay-less/intellidial` - **DONE**
☑ Build configuration: `cloudbuild.yaml` - **DONE**
☑ Event: Push to branch - **DONE**
☑ Service account: `cloud-build-intellidial@intellidial-39ca7.iam.gserviceaccount.com` - **DONE**
☑ Status: Enabled - **DONE**

☐ Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
☐ Click **"Create Trigger"**
☐ **Name:** `deploy-intellidial`
☐ **Event:** Push to a branch
☐ **Branch:** `^main$` (or `^master$`)
☐ **Configuration:** Cloud Build configuration file
☐ **Location:** `cloudbuild.yaml`
☐ **Service account:** `YOUR_PROJECT_NUMBER@cloudbuild.gserviceaccount.com`
☐ Click **"Create"**

---

### Step 14: Test Deployment

☑ **Step 14: Test Deployment** - **IN PROGRESS**

☑ Code committed and pushed to GitHub - **DONE**
☑ Cloud Build triggered successfully - **DONE**
☐ Monitor Cloud Build progress - **IN PROGRESS** (Build ID: `e2c7d9ae`)
☐ Verify deployment succeeds
☐ Check Cloud Run service is created
☐ Test the deployed application

**Build Details:**
- Build ID: `e2c7d9ae`
- Trigger: `deploy-intellidial`
- Commit: `cd53d69`
- Status: Building (monitor in [Cloud Build History](https://console.cloud.google.com/cloud-build/builds))
  ```
☐ Go to [Cloud Build History](https://console.cloud.google.com/cloud-build/builds)
☐ Watch the build (should start automatically)
☐ Wait for completion (5-10 minutes)
☐ Check [Cloud Run](https://console.cloud.google.com/run) - service should be deployed
☐ Click on service → **"Test"** tab → Click URL to test

---

### Step 15: Verify Deployment

☐ **Step 15: Verify Deployment**

☐ **Check Cloud Run Service:**
  ☐ Go to [Cloud Run](https://console.cloud.google.com/run)
  ☐ Click on `intellidial` service
  ☐ Verify **Region:** `europe-west2` (London)
  ☐ Verify **Status:** Running
  ☐ Click **"Test"** tab → Click URL
  ☐ Verify app loads

☐ **Check Environment Variables:**
  ☐ Go to service → **"Edit & Deploy New Revision"**
  ☐ Go to **"Variables & Secrets"** tab
  ☐ Verify all secrets are referenced correctly
  ☐ Verify variable names match your code

☐ **Check Logs:**
  ☐ Go to service → **"Logs"** tab
  ☐ Verify no errors
  ☐ Check Firebase connection
  ☐ Check VAPI connection

☐ **Test Functionality:**
  ☐ Test signup/login
  ☐ Test creating project
  ☐ Test making a call
  ☐ Verify Firebase writes work
  ☐ Verify VAPI calls work

---

### Step 16: Set Up Custom Domain (Optional)

☐ **Step 16: Set Up Custom Domain (Optional)**

☐ Go to [Cloud Run](https://console.cloud.google.com/run)
☐ Click on `intellidial` service
☐ Go to **"Custom Domains"** tab
☐ Click **"Add Mapping"**
☐ Enter your domain
☐ Follow DNS setup instructions
☐ Verify SSL certificate (automatic)

---

## Post-Deployment Checklist

### Step 17: Monitor and Optimize

☐ **Step 17: Monitor and Optimize**

☐ Set up [Cloud Monitoring](https://console.cloud.google.com/monitoring)
☐ Set up alerts for errors
☐ Monitor Cloud Run metrics:
  ☐ Request count
  ☐ Latency
  ☐ Error rate
  ☐ CPU/Memory usage

☐ Optimize if needed:
  ☐ Increase CPU/Memory if slow
  ☐ Increase max instances if traffic spikes
  ☐ Set min instances to 1 if you want always-on

---

### Step 18: Update Documentation

☐ **Step 18: Update Documentation**

☐ Update `README.md` with deployment info
☐ Document how to:
  ☐ Deploy manually
  ☐ Update secrets
  ☐ Roll back deployment
  ☐ View logs

---

## Troubleshooting

### Build Fails?

☐ Check [Cloud Build logs](https://console.cloud.google.com/cloud-build/builds)
☐ Verify `cloudbuild.yaml` syntax
☐ Verify Dockerfile is correct
☐ Check permissions (Cloud Build needs Run Admin role)

### Deployment Fails?

☐ Check Cloud Run logs
☐ Verify secrets are set correctly
☐ Verify service account has permissions
☐ Check environment variable names match code

### App Doesn't Work?

☐ Check Cloud Run logs
☐ Verify Firebase connection (check service account)
☐ Verify VAPI API keys are correct
☐ Check environment variables are set
☐ Test locally first to isolate issue

### Local Dev Broken?

☐ Verify `.env.local` exists
☐ Verify `next.config.ts` reads `.env.local`
☐ Check `.gitignore` ignores `.env.local`
☐ Test: `cd Intellidial && npm run dev`

---

## Quick Reference

### Important URLs

- **Cloud Run:** https://console.cloud.google.com/run
- **Cloud Build:** https://console.cloud.google.com/cloud-build
- **Secret Manager:** https://console.cloud.google.com/security/secret-manager
- **IAM & Admin:** https://console.cloud.google.com/iam-admin
- **Firebase Console:** https://console.firebase.google.com

### Important Commands

```bash
# View Cloud Run service
gcloud run services describe intellidial --region=europe-west2

# View logs
gcloud run services logs read intellidial --region=europe-west2

# Deploy manually
gcloud builds submit --config cloudbuild.yaml

# Update secret
gcloud secrets versions add SECRET_NAME --data-file=-

# Test locally
cd Intellidial && npm run dev
```

---

## Summary

**Complete these steps in order:**
1. Enable APIs
2. Set up service accounts
3. Create secrets
4. Grant permissions
5. Update config files
6. Create Cloud Run service
7. Set up Cloud Build trigger
8. Test deployment
9. Verify everything works
10. Monitor and optimize

**Region:** London (europe-west2)  
**Service:** Cloud Run  
**CI/CD:** Cloud Build (automatic on push to main)  
**Local Dev:** Still works with `.env.local`

---

**Walk through this checklist from top to bottom. Change `☐` to `☑` when you complete each step.**
