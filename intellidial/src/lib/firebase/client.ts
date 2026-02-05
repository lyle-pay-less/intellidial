/**
 * Firebase client SDK for browser.
 * Initializes app and auth lazily.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { firebaseConfig } from "./config";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    const isProduction = typeof window !== "undefined" && 
      (window.location.hostname.includes("run.app") || 
       window.location.hostname.includes("intellidial.co.za") ||
       process.env.NODE_ENV === "production");
    
    if (isProduction) {
      console.error("[Firebase Client] ⚠️ CRITICAL: Firebase config missing in production!", {
        apiKey: !!firebaseConfig.apiKey,
        authDomain: !!firebaseConfig.authDomain,
        projectId: !!firebaseConfig.projectId,
        storageBucket: !!firebaseConfig.storageBucket,
        messagingSenderId: !!firebaseConfig.messagingSenderId,
        appId: !!firebaseConfig.appId,
        envVars: {
          NEXT_PUBLIC_FIREBASE_API_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        }
      });
    }
    return null;
  }
  if (app) return app;
  app = initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const a = getFirebaseApp();
  if (!a) return null;
  if (!auth) auth = getAuth(a);
  return auth;
}
