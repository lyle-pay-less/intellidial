"use client";

import { useState, useEffect } from "react";
import { Check, X, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

type GoogleSheetsStatus = {
  configured: boolean;
  enabled: boolean;
  serviceAccountEmail?: string;
};

export function GoogleSheetsConnection() {
  const { user } = useAuth();
  const [status, setStatus] = useState<GoogleSheetsStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      checkStatus();
    }
  }, [user?.uid]);

  const checkStatus = async () => {
    if (!user?.uid) return;
    try {
      const res = await fetch("/api/integrations/google-sheets/status", {
        headers: { "x-user-id": user.uid },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("[Google Sheets] Status check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking status...
      </div>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {status.configured ? (
          <>
            <Check className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-medium text-slate-900">
              Google Sheets Export Available
            </span>
          </>
        ) : (
          <>
            <X className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">
              Not Configured
            </span>
          </>
        )}
      </div>

      {status.configured && status.serviceAccountEmail && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-700 mb-1">
            Service Account Email:
          </p>
          <p className="text-xs text-slate-600 font-mono break-all">
            {status.serviceAccountEmail}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Share your Google Sheets with this email as Editor to enable automatic exports.
          </p>
        </div>
      )}

      {!status.configured && (
        <p className="text-sm text-slate-600">
          Google Sheets export requires server-side configuration. Contact support to enable this feature.
        </p>
      )}
    </div>
  );
}
