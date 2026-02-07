/**
 * Firebase Admin SDK for API routes (server-side only).
 * Initialize lazily to avoid edge/static issues.
 *
 * Authentication options (in order of preference):
 * 1. Service account key (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY)
 * 2. Service account JSON file (GOOGLE_APPLICATION_CREDENTIALS)
 * 3. Application Default Credentials (ADC) - works on GCP or with gcloud CLI configured
 */

import { initializeApp, getApps, cert, type ServiceAccount, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

export { FieldValue };

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0] as ReturnType<typeof initializeApp>;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // Option 1: Service account key from env vars
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    console.log("[Firebase Admin] Using credentials from FIREBASE_ADMIN_* env vars");
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      } as ServiceAccount),
    });
  }

  // Option 2: Service account JSON file path
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log("[Firebase Admin] Using credentials from GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
    return initializeApp({
      credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
    });
  }

  // Option 3: Application Default Credentials (works on GCP or with gcloud CLI)
  // This will use ADC if available (e.g., when running on GCP, or after `gcloud auth application-default login`)
  try {
    console.log("[Firebase Admin] No service account env found; using Application Default Credentials (ADC)...");
    const app = initializeApp({
      credential: applicationDefault(),
      projectId: projectId || "intellidial-39ca7", // Explicitly set project ID for ADC
    });
    console.log("[Firebase Admin] Successfully initialized with ADC");
    return app;
  } catch (error) {
    // ADC not available - log but don't throw, let store functions handle gracefully
    console.warn("[Firebase Admin] ADC initialization failed:", error instanceof Error ? error.message : error);
    console.warn("[Firebase Admin] Falling back to in-memory storage. To enable Firestore:");
    console.warn("  1. Run: gcloud auth application-default login");
    console.warn("  2. Run: gcloud auth application-default set-quota-project intellidial-39ca7");
    console.warn("  3. Or set service account env vars");
    throw error; // Re-throw so store functions can catch and fallback
  }
}

export function getFirebaseAdminFirestore() {
  return getFirestore(getAdminApp());
}

export function getFirebaseAdminAuth() {
  return getAuth(getAdminApp());
}

export function isFirebaseAdminConfigured(): boolean {
  // Check if any credential method is explicitly configured
  if (
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ) {
    return true;
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return true;
  }
  
  // ADC might be available (after gcloud auth application-default login)
  // We can't reliably detect it without trying, so return true to allow attempt
  // The try-catch blocks in store functions will handle failures gracefully
  // This allows ADC to work when user has run: gcloud auth application-default login
  return true;
}
