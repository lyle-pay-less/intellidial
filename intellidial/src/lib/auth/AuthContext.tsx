"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

type AuthState = {
  user: User | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  signInWithGoogle: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const MOCK_DEV_USER = {
  uid: "dev-user-1",
  email: "dev@local.test",
  displayName: "Dev User",
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: "",
  tenantId: null,
  phoneNumber: null,
  photoURL: null,
  providerId: "password",
  delete: async () => {},
  getIdToken: async () => "",
  getIdTokenResult: async () => ({}),
  reload: async () => {},
  toJSON: () => ({}),
} as unknown as User;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      // Only use mock dev user in development/local - NEVER in production
      const isProduction = typeof window !== "undefined" && 
        (window.location.hostname.includes("run.app") || 
         window.location.hostname.includes("intellidial.co.za") ||
         process.env.NODE_ENV === "production");
      
      if (isProduction) {
        console.error("[AuthContext] ⚠️ CRITICAL: Firebase Auth not configured in production! This should never happen.");
        console.error("[AuthContext] Firebase config:", {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "***set***" : "MISSING",
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "***set***" : "MISSING",
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "***set***" : "MISSING",
        });
        // Don't set mock user in production - let it fail properly
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Only use mock in local dev
      console.warn("[AuthContext] Firebase Auth not configured, using mock dev user (local dev only)");
      setUser(MOCK_DEV_USER);
      setLoading(false);
      return;
    }
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase Auth not configured");
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const signInWithMicrosoft = async () => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase Auth not configured");
    await signInWithPopup(auth, new OAuthProvider("microsoft.com"));
  };

  const signInWithGitHub = async () => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase Auth not configured");
    await signInWithPopup(auth, new OAuthProvider("github.com"));
  };

  const signInWithEmail = async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase Auth not configured");
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase Auth not configured");
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  const signOut = async () => {
    const auth = getFirebaseAuth();
    if (auth) await firebaseSignOut(auth);
  };

  const value: AuthContextValue = {
    user,
    loading,
    signInWithGoogle,
    signInWithMicrosoft,
    signInWithGitHub,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
