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
  delete: async () => {},
  getIdToken: async () => "",
  getIdTokenResult: async () => ({}),
  reload: async () => {},
  toJSON: () => ({}),
} as User;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
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
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
