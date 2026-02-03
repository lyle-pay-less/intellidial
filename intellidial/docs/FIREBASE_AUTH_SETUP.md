# Firebase Authentication Setup Guide

## Current Status ✅

### What's Already Implemented

1. **Firebase packages installed** (`package.json`):
   - `firebase@^11.0.2` (client SDK)
   - `firebase-admin@^13.0.2` (server SDK)

2. **Client-side Firebase config** (`src/lib/firebase/client.ts`):
   - Lazy initialization
   - Returns `null` if not configured (enables dev bypass)

3. **Firebase Admin SDK** (`src/lib/firebase/admin.ts`):
   - Supports service account credentials
   - Supports `GOOGLE_APPLICATION_CREDENTIALS` env var

4. **Auth Context** (`src/lib/auth/AuthContext.tsx`):
   - ✅ Google sign-in (`signInWithPopup`)
   - ✅ Microsoft sign-in (`OAuthProvider`)
   - ✅ GitHub sign-in (`OAuthProvider`)
   - ✅ Email/password sign-in
   - ✅ Sign out
   - ✅ Dev bypass mode (uses mock user when Firebase not configured)

5. **Dashboard Guard** (`src/app/dashboard/DashboardGuard.tsx`):
   - Protects `/dashboard/*` routes
   - Redirects to `/login` if not authenticated

6. **Login Page** (`src/app/login/page.tsx`):
   - Social login buttons (Google, Microsoft, GitHub)
   - Email/password form
   - Handles "Firebase not configured" gracefully (redirects to dashboard)

---

## What You Need to Do 🔧

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `intellidial` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click **"Create project"**

### Step 2: Get Client Configuration

1. In Firebase Console, click the **gear icon** ⚙️ → **Project settings**
2. Scroll to **"Your apps"** section
3. Click **"Web"** icon (`</>`) to add a web app
4. Register app name: `Intellidial Web`
5. **Copy the config object** — you'll need these values:
   ```javascript
   {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   }
   ```

### Step 3: Enable Authentication Providers

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable these providers:
   - ✅ **Email/Password** (click → Enable → Save)
   - ✅ **Google** (click → Enable → Set support email → Save)
   - ✅ **Microsoft** (click → Enable → Set app ID/secret → Save)
   - ✅ **GitHub** (click → Enable → Set client ID/secret → Save)

**Note**: For OAuth providers (Google, Microsoft, GitHub), you'll need to:
- Configure OAuth consent screens in respective platforms
- Add authorized redirect URIs (Firebase will provide these)
- Copy client IDs/secrets to Firebase Console

### Step 4: Set Up Firebase Admin SDK

1. In Firebase Console, go to **Project settings** → **Service accounts**
2. Click **"Generate new private key"**
3. Download the JSON file (e.g., `intellidial-firebase-adminsdk-xxxxx.json`)
4. **Keep this file secure** — it has admin privileges

### Step 5: Add Environment Variables

Add these to your **`.env`** file in the repo root (`c:\code\doctor\.env`):

```env
# Firebase Client (browser) - from Step 2
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin (server) - from Step 4
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Important**: 
- The `FIREBASE_ADMIN_PRIVATE_KEY` should be the **entire private key** from the JSON file, including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Keep it on **one line** with `\n` for newlines (or use actual newlines if your `.env` parser supports it)
- Wrap it in quotes if it contains special characters

**Alternative**: Instead of individual env vars, you can use:
```env
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\intellidial-firebase-adminsdk-xxxxx.json
```

### Step 6: Restart Dev Server

```bash
cd Intellidial
npm run dev
```

---

## Verification Checklist ✅

After setup, verify:

- [ ] `.env` file has all `NEXT_PUBLIC_FIREBASE_*` variables
- [ ] `.env` file has `FIREBASE_ADMIN_*` variables (or `GOOGLE_APPLICATION_CREDENTIALS`)
- [ ] Firebase Console → Authentication → Sign-in method shows providers enabled
- [ ] Visit `http://localhost:3000/login` — should show login form (not redirect to dashboard)
- [ ] Try Google sign-in — should open popup and authenticate
- [ ] After login, should redirect to `/dashboard`
- [ ] Dashboard should show your real user email (not "dev@local.test")
- [ ] Sign out should work and redirect to `/login`

---

## Current Dev Bypass Behavior

**When Firebase is NOT configured** (current state):
- `AuthContext` uses `MOCK_DEV_USER` (`dev@local.test`)
- Login page redirects to dashboard automatically
- Dashboard works with mock user

**When Firebase IS configured**:
- Real authentication required
- Login page shows login form
- Dashboard requires valid Firebase user

---

## Troubleshooting

### "Firebase Auth not configured" error
- Check `.env` file has all `NEXT_PUBLIC_FIREBASE_*` variables
- Restart dev server after adding env vars
- Check `next.config.ts` is loading `.env` correctly

### OAuth providers not working
- Verify provider is enabled in Firebase Console
- Check redirect URIs are configured correctly
- Check browser console for CORS/redirect errors

### Admin SDK errors
- Verify `FIREBASE_ADMIN_PRIVATE_KEY` includes full key with `\n` newlines
- Check `FIREBASE_ADMIN_PROJECT_ID` matches your Firebase project ID
- Ensure service account JSON file is valid

### Still using dev bypass after setup
- Restart dev server
- Clear browser cache/localStorage
- Check browser console for Firebase initialization errors

---

## Next Steps After Auth Setup

1. **Replace in-memory data store** (`src/lib/data/store.ts`) with Firestore
2. **Add user management** — link users to projects/teams
3. **Add role-based access control** (admin, operator, viewer)
4. **Add email verification** flow
5. **Add password reset** functionality

---

## Security Notes ⚠️

- **Never commit** `.env` file or service account JSON to git
- `NEXT_PUBLIC_*` variables are exposed to the browser — only use for public config
- Keep `FIREBASE_ADMIN_PRIVATE_KEY` secret — it has full admin access
- Use Firebase Security Rules to protect Firestore data
- Enable Firebase App Check for production to prevent abuse
