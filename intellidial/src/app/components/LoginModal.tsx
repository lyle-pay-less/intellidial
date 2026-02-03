"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Mail, Lock, Loader2, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

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
const SOCIAL_PROVIDERS = [
  { id: "google", label: "Continue with Google", Icon: GoogleIcon },
  { id: "microsoft", label: "Continue with Microsoft", Icon: MicrosoftIcon },
] as const;

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const router = useRouter();
  const { signInWithGoogle, signInWithMicrosoft, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleSocialLogin = async (provider: "google" | "microsoft") => {
    setMessage(null);
    setSocialLoading(provider);
    try {
      if (provider === "google") await signInWithGoogle();
      else await signInWithMicrosoft();
      onSuccess?.();
      onClose();
      router.replace("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (msg.includes("not configured")) {
        onClose();
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
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      onSuccess?.();
      onClose();
      router.replace("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (msg.includes("not configured")) {
        onClose();
        router.replace("/dashboard");
      } else {
        setMessage({ type: "error", text: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="login-modal-title"
    >
      {/* Blurred backdrop — smooth transition, professional look */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card — centered over hero, subtle scale-in */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/95 shadow-2xl shadow-slate-900/20 backdrop-blur-sm animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6 sm:p-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Branding + slogan (convincer) */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-1">
              <img src="/intellidial-logo.png" alt="Intellidial" className="h-9 w-auto" />
              <span className="font-display text-lg font-semibold text-slate-900">
                Intelli<span className="text-teal-600">dial</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">AI-powered phone research at scale</p>
          </div>
          <h2 id="login-modal-title" className="font-display text-xl font-bold text-slate-900 text-center mb-6">
            Log in
          </h2>

          {message && (
            <p className={`text-sm mb-4 ${message.type === "error" ? "text-red-600" : "text-teal-600"}`}>
              {message.text}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="modal-email" className="sr-only">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="modal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none transition-all text-sm"
                />
              </div>
            </div>
            <div>
              <label htmlFor="modal-password" className="sr-only">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="modal-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none transition-all text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white py-2.5 rounded-lg font-medium text-sm hover:from-teal-700 hover:to-teal-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Log in"
              )}
            </button>
          </form>

          {/* Social icons below login — minimal */}
          <div className="flex justify-center gap-3 mt-6 pt-6 border-t border-slate-100">
            {SOCIAL_PROVIDERS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleSocialLogin(id as "google" | "microsoft")}
                disabled={!!socialLoading}
                title={label}
                aria-label={label}
                className="flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {socialLoading === id ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                ) : (
                  <Icon className="w-5 h-5 shrink-0" />
                )}
              </button>
            ))}
          </div>

          <div className="text-center mt-5 space-y-1">
            <button type="button" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Forgot password?
            </button>
            <p className="text-xs text-slate-400">
              No account?{" "}
              <Link href="/#contact" className="text-teal-600 hover:text-teal-700 font-medium" onClick={onClose}>
                Sign up
              </Link>
            </p>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mt-4">
              <Shield className="w-3.5 h-3.5 text-teal-500/70" aria-hidden />
              Secure sign-in
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
