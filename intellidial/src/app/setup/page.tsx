"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

export default function SetupPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.replace("/login");
      return;
    }

    // Check if user already has an organization
    checkOrganization();
  }, [user, authLoading, router]);

  const checkOrganization = async () => {
    if (!user) return;
    
    try {
      const res = await fetch("/api/auth/check-org", {
        headers: {
          "x-user-id": user.uid,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.hasOrganization) {
          // User already has organization, redirect to dashboard
          router.replace("/dashboard");
          return;
        }
        // No organization - this is OK for setup page (user is creating org during signup)
        // But if they got here via login, they shouldn't be here
        // We'll allow it for now since they're authenticated
      }
    } catch (err) {
      console.error("Failed to check organization", err);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Company name is required");
      return;
    }

    if (!user) {
      setError("You must be signed in");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          companyName: companyName.trim(),
          email: user.email ?? "",
          displayName: user.displayName ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create organization");
      }

      // Success - redirect to dashboard
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
      setSubmitting(false);
    }
  };

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-600" />
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirecting
  }

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
            {/* Logo and name */}
            <div className="flex flex-col items-center mb-6">
              <img 
                src="/intellidial-logo.png" 
                alt="Intellidial" 
                className="h-12 w-12 mb-3"
              />
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                Create Your Organization
              </h1>
              <p className="mt-2 text-slate-600 text-sm text-center">
                You&apos;ll be the owner and can invite team members to join
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Company Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your Company"
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  This will be your organization name. You can change it later in settings.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || !companyName.trim()}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white py-3 rounded-xl font-semibold hover:from-teal-700 hover:to-teal-800 transition-all shadow-lg shadow-teal-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating organization...
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
