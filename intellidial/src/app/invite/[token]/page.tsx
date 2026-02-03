"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Building2, Loader2, Check, X, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const { user, signUpWithEmail, signInWithEmail } = useAuth();
  
  const [invitation, setInvitation] = useState<{
    email: string;
    role: string;
    orgName: string;
    expiresAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);

  useEffect(() => {
    fetchInvitation();
  }, [token]);

  useEffect(() => {
    if (user && invitation) {
      // User is logged in, auto-accept
      handleAccept();
    }
  }, [user, invitation]);

  const fetchInvitation = async () => {
    try {
      const res = await fetch(`/api/invite/${token}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Invalid invitation");
      }
      const data = await res.json();
      setInvitation(data);
      setEmail(data.email);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invitation");
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!user) {
      // User needs to authenticate first
      if (!email || !password) {
        setError("Please enter your email and password");
        return;
      }

      setAccepting(true);
      try {
        if (isSignup) {
          await signUpWithEmail(email, password);
        } else {
          await signInWithEmail(email, password);
        }
        // After auth, useEffect will trigger handleAccept again
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
        setAccepting(false);
        return;
      }
    }

    // User is authenticated, accept invitation
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch(`/api/invite/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to accept invitation");
      }

      // Success - redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-600" />
          <p className="mt-4 text-slate-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xl">
          <X className="mx-auto h-12 w-12 text-red-600" />
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">
            Invalid Invitation
          </h1>
          <p className="mt-2 text-slate-600">{error}</p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (!invitation) return null;

  const isExpired = new Date(invitation.expiresAt) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/intellidial-logo.png" alt="Intellidial" className="h-9 w-auto" />
              <span className="font-display text-xl font-bold text-slate-900">
                Intelli<span className="text-teal-600">dial</span>
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/5 p-6 sm:p-8 space-y-5">
            {/* Logo */}
            <div className="flex flex-col items-center mb-6">
              <img 
                src="/intellidial-logo.png" 
                alt="Intellidial" 
                className="h-12 w-12 mb-3"
              />
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                You&apos;re Invited!
              </h1>
            </div>

            {/* Invitation details */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-slate-500" />
                <span className="text-slate-600">Organization:</span>
                <span className="font-semibold text-slate-900">{invitation.orgName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-slate-500" />
                <span className="text-slate-600">Email:</span>
                <span className="font-semibold text-slate-900">{invitation.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Role:</span>
                <span className="font-semibold text-slate-900 capitalize">{invitation.role}</span>
              </div>
            </div>

            {isExpired && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" />
                This invitation has expired. Please request a new one.
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <X className="h-4 w-4" />
                {error}
              </div>
            )}

            {!user && !isExpired && (
              <>
                <div className="flex gap-2 border-b border-slate-200 pb-4">
                  <button
                    type="button"
                    onClick={() => setIsSignup(false)}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      !isSignup
                        ? "bg-teal-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSignup(true)}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      isSignup
                        ? "bg-teal-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleAccept(); }} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        required
                        disabled
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 bg-slate-50 cursor-not-allowed"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Email must match the invitation
                    </p>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                      />
                    </div>
                    {isSignup && (
                      <p className="mt-1 text-xs text-slate-500">Must be at least 6 characters</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={accepting || !email || !password}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white py-3 rounded-xl font-semibold hover:from-teal-700 hover:to-teal-800 transition-all shadow-lg shadow-teal-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {isSignup ? "Creating account..." : "Signing in..."}
                      </>
                    ) : (
                      `Accept invitation & ${isSignup ? "Sign up" : "Sign in"}`
                    )}
                  </button>
                </form>
              </>
            )}

            {user && !isExpired && (
              <div className="text-center">
                <div className="mb-4 flex items-center justify-center gap-2 text-teal-600">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">You&apos;re signed in</span>
                </div>
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white py-3 rounded-xl font-semibold hover:from-teal-700 hover:to-teal-800 transition-all shadow-lg shadow-teal-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    "Accept Invitation"
                  )}
                </button>
              </div>
            )}

            <div className="text-center pt-4">
              <Link
                href="/login"
                className="text-sm text-slate-500 hover:text-teal-600 transition-colors"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
