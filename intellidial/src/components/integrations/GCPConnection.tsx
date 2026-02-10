"use client";

import { useState, useEffect } from "react";
import { Check, X, Loader2, Save, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

type GCPStatus = {
  configured: boolean;
  enabled: boolean;
  bucketName?: string;
  configuredAt?: string;
};

type GCPCredentials = {
  bucketName: string;
  serviceAccountKey: string;
  enabled: boolean;
};

export function GCPConnection() {
  const { user } = useAuth();
  const [status, setStatus] = useState<GCPStatus | null>(null);
  const [credentials, setCredentials] = useState<GCPCredentials>({
    bucketName: "",
    serviceAccountKey: "",
    enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      checkStatus();
      loadCredentials();
    }
  }, [user?.uid]);

  const checkStatus = async () => {
    if (!user?.uid) return;
    try {
      const res = await fetch("/api/integrations/gcp/status", {
        headers: { "x-user-id": user.uid },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setCredentials((prev) => ({
          ...prev,
          enabled: data.enabled || false,
        }));
      }
    } catch (error) {
      console.error("[GCP] Status check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCredentials = async () => {
    if (!user?.uid) return;
    try {
      const res = await fetch("/api/integrations/gcp/credentials", {
        headers: { "x-user-id": user.uid },
      });
      if (res.ok) {
        const data = await res.json();
        setCredentials({
          bucketName: data.bucketName || "",
          serviceAccountKey: data.serviceAccountKey || "",
          enabled: data.enabled || false,
        });
      }
    } catch (error) {
      console.error("[GCP] Load credentials failed:", error);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/integrations/gcp/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save credentials");
        return;
      }

      setSuccess(true);
      await checkStatus();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError("Failed to save credentials");
      console.error("[GCP] Save failed:", error);
    } finally {
      setSaving(false);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {status?.configured ? (
          <>
            <Check className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-medium text-slate-900">
              GCP Cloud Storage Configured
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

      {status?.configured && status.bucketName && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-700 mb-1">
            Bucket Name:
          </p>
          <p className="text-xs text-slate-600 font-mono">
            {status.bucketName}
          </p>
          {status.configuredAt && (
            <p className="text-xs text-slate-500 mt-2">
              Configured: {new Date(status.configuredAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            GCP Bucket Name
          </label>
          <input
            type="text"
            value={credentials.bucketName}
            onChange={(e) =>
              setCredentials({ ...credentials, bucketName: e.target.value })
            }
            placeholder="my-export-bucket"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Service Account Key (JSON)
          </label>
          <textarea
            value={credentials.serviceAccountKey}
            onChange={(e) =>
              setCredentials({ ...credentials, serviceAccountKey: e.target.value })
            }
            placeholder='{"type": "service_account", "project_id": "...", ...}'
            rows={6}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            Paste your GCP service account JSON key. It will be encrypted before storage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="gcp-enabled"
            checked={credentials.enabled}
            onChange={(e) =>
              setCredentials({ ...credentials, enabled: e.target.checked })
            }
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="gcp-enabled" className="text-sm text-slate-700">
            Enable GCP export
          </label>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            <Check className="h-4 w-4" />
            <span>Credentials saved successfully!</span>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !credentials.bucketName || !credentials.serviceAccountKey}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Credentials
            </>
          )}
        </button>
      </div>
    </div>
  );
}
