# Google Cloud Build Setup — Simple Steps

**Goal:** Connect your Git repo to Google Cloud Build for automatic deployments.

---

## Step 1: Create Cloud Build Config File

✅ **Done!** Created `cloudbuild.yaml` in your repo root.

This file tells Cloud Build how to:
1. Build your Next.js app
2. Create a Docker image
3. Deploy to Cloud Run

---

## Step 2: Enable Cloud Build API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create one)
3. Go to **APIs & Services** → **Library**
4. Search for **"Cloud Build API"**
5. Click **Enable**

---

## Step 3: Connect Your Git Repo

### Option A: GitHub (Recommended)

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click **"Create Trigger"**
3. **Source:** Select **GitHub**
4. **Repository:** Connect your GitHub account (if not connected)
5. **Repository:** Select your repo (`doctor` or whatever it's named)
6. **Branch:** `main` (or `master`)
7. **Configuration:** Select **"Cloud Build configuration file"**
8. **Location:** `cloudbuild.yaml`
9. Click **"Create"**

### Option B: Cloud Source Repositories

1. Go to [Cloud Source Repositories](https://console.cloud.google.com/source/repos)
2. Click **"Add Repository"**
3. Select **"Connect external repository"**
4. Choose **GitHub** or **GitLab**
5. Authorize and select your repo
6. Go back to **Cloud Build Triggers**
7. Create trigger pointing to this repo

---

## Step 4: Set Up Environment Variables

1. Go to [Cloud Run](https://console.cloud.google.com/run)
2. Click on your service (or create one)
3. Go to **"Edit & Deploy New Revision"**
4. Go to **"Variables & Secrets"** tab
5. Add your environment variables:
   - `VAPI_API_KEY`
   - `VAPI_PUBLIC_KEY`
   - `VAPI_DEMO_ASSISTANT_ID`
   - `FIREBASE_ADMIN_SDK_KEY`
   - `GEMINI_API_KEY`
   - etc.

**OR** use Secret Manager (more secure):
1. Go to [Secret Manager](https://console.cloud.google.com/security/secret-manager)
2. Create secrets for each env var
3. Reference them in Cloud Run

---

## Step 5: Create Dockerfile (If Needed)

✅ **Done!** Created `Intellidial/Dockerfile`

This builds your Next.js app for production.

---

## Step 6: Test It

1. Make a small change to your code
2. Commit and push to `main` branch:
   ```bash
   git add .
   git commit -m "Test cloud build"
   git push origin main
   ```
3. Go to [Cloud Build History](https://console.cloud.google.com/cloud-build/builds)
4. You should see a build start automatically
5. Wait for it to complete (5-10 minutes)
6. Check Cloud Run - your app should be deployed!

---

## Troubleshooting

### Build Fails?

**Check:**
1. **Cloud Build logs** - Click on the failed build to see errors
2. **Dockerfile** - Make sure it's correct
3. **Environment variables** - Make sure they're set in Cloud Run
4. **Permissions** - Cloud Build needs permission to deploy to Cloud Run

**Fix permissions:**
```bash
# Run in Cloud Shell or locally with gcloud CLI
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member=serviceAccount:YOUR_PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
  --role=roles/run.admin
```

### Can't Connect GitHub?

**Try:**
1. Disconnect and reconnect GitHub
2. Make sure you have admin access to the repo
3. Use Cloud Source Repositories instead

### Build Takes Too Long?

**Optimize:**
1. Use `.dockerignore` to exclude unnecessary files
2. Use build cache
3. Increase machine type in `cloudbuild.yaml` (already set to E2_HIGHCPU_8)

---

## Quick Commands

### Manual Build (Test Locally)

```bash
# Build Docker image
docker build -t intellidial -f Intellidial/Dockerfile Intellidial

# Run locally
docker run -p 3000:3000 intellidial
```

### Deploy Manually

```bash
# Build and push
gcloud builds submit --config cloudbuild.yaml

# Or deploy directly
gcloud run deploy intellidial \
  --source ./Intellidial \
  --region us-central1 \
  --allow-unauthenticated
```

---

## What Happens Now?

**Every time you push to `main`:**
1. Cloud Build automatically starts
2. Builds your Next.js app
3. Creates Docker image
4. Deploys to Cloud Run
5. Your app is live!

**No manual deployment needed!** 🎉

---

## Next Steps

1. ✅ Cloud Build config created
2. ✅ Dockerfile created
3. ⏳ Enable Cloud Build API
4. ⏳ Connect GitHub repo
5. ⏳ Set environment variables
6. ⏳ Test with a push

**That's it! Simple and easy.**
