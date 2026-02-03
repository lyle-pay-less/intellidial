"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

// Icon components for social providers (inline SVGs)
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M1 13h10v10H1z" />
      <path fill="#05a6f0" d="M13 1h10v10H13z" />
      <path fill="#ffba08" d="M13 13h10v10H13z" />
    </svg>
  );
}

type SocialProvider = "google" | "microsoft";

const SOCIAL_PROVIDERS: { id: SocialProvider; Icon: typeof GoogleIcon }[] = [
  { id: "google", Icon: GoogleIcon },
  { id: "microsoft", Icon: MicrosoftIcon },
];

export default function SignupPage() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle, signInWithMicrosoft } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleSocialSignup = async (provider: SocialProvider) => {
    setMessage(null);
    setSocialLoading(provider);
    try {
      if (provider === "google") {
        await signInWithGoogle();
      } else if (provider === "microsoft") {
        await signInWithMicrosoft();
      }
      // After social auth, user needs to create organization
      // Redirect to setup page to create org
      router.replace("/setup");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (msg.includes("not configured")) {
        router.replace("/dashboard");
      } else {
        setMessage({ type: "error", text: msg });
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    if (!companyName.trim()) {
      setMessage({ type: "error", text: "Company name is required" });
      return;
    }

    setLoading(true);
    try {
      // Create Firebase user
      const user = await signUpWithEmail(email, password);
      
      // Create organization
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          companyName: companyName.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create organization");
      }

      // Success - redirect to dashboard
      router.replace("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (msg.includes("not configured")) {
        router.replace("/dashboard");
      } else {
        setMessage({ type: "error", text: msg });
      }
    } finally {
      setLoading(false);
    }
  };

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
            <Link
              href="/login"
              className="text-slate-600 hover:text-teal-600 transition-colors font-medium text-sm"
            >
              Log in
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
                Intelli<span className="text-teal-600">dial</span>
              </h1>
              <p className="mt-2 text-slate-600 text-sm">
                Create your account and get started
              </p>
            </div>

            {message && (
              <p
                className={`text-sm ${
                  message.type === "error" ? "text-red-600" : "text-teal-600"
                }`}
              >
                {message.text}
              </p>
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                  />
                </div>
              </div>

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
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                  />
                </div>
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
                <p className="mt-1 text-xs text-slate-500">Must be at least 6 characters</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white py-3 rounded-xl font-semibold hover:from-teal-700 hover:to-teal-800 transition-all shadow-lg shadow-teal-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  "Create account"
                )}
              </button>

              {/* Social login icons */}
              <div className="flex items-center justify-center gap-4 pt-2">
                {SOCIAL_PROVIDERS.map(({ id, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSocialSignup(id as SocialProvider)}
                    disabled={!!socialLoading}
                    className="flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    title={id === "google" ? "Sign up with Google" : "Sign up with Microsoft"}
                  >
                    {socialLoading === id ? (
                      <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </button>
                ))}
              </div>

              <div className="text-center space-y-1 pt-2">
                <p className="text-sm text-slate-500">
                  Already have an account?{" "}
                  <Link href="/login" className="font-medium text-teal-600 hover:text-teal-700">
                    Log in
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
