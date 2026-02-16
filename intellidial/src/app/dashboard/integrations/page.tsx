"use client";

import { useState, useEffect } from "react";
import { Plug, Loader2, Check, X, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { HubSpotConnection } from "@/components/integrations/HubSpotConnection";
import { HubSpotSettings } from "@/components/integrations/HubSpotSettings";
import { HubSpotSyncLog } from "@/components/integrations/HubSpotSyncLog";
import { GoogleSheetsConnection } from "@/components/integrations/GoogleSheetsConnection";
import { GCPConnection } from "@/components/integrations/GCPConnection";
import Link from "next/link";

type IntegrationStatus = {
  connected: boolean;
  enabled?: boolean;
  hubspotAccountId?: string;
  hubspotAccountName?: string;
  connectedAt?: string;
  isExpired?: boolean;
  needsRefresh?: boolean;
};

export default function IntegrationsPage() {
  const { user } = useAuth();
  const [hubspotStatus, setHubspotStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user?.uid) {
      checkHubSpotStatus();
    }
    
    // Check for success/error messages in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("hubspot_connected") === "true") {
      setMessage({ type: "success", text: "HubSpot connected successfully!" });
      checkHubSpotStatus();
      // Remove from URL
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("hubspot_error")) {
      setMessage({ type: "error", text: `Error: ${params.get("hubspot_error")}` });
      // Remove from URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [user?.uid]);

  const checkHubSpotStatus = async () => {
    if (!user?.uid) return;
    try {
      const res = await fetch("/api/integrations/hubspot/status", {
        headers: { "x-user-id": user.uid },
      });
      if (res.ok) {
        const data = await res.json();
        setHubspotStatus(data);
      }
    } catch (error) {
      console.error("Failed to check HubSpot status:", error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="mb-8 flex items-center gap-2">
          <Plug className="h-6 w-6 text-teal-600" />
          <h1 className="font-display text-2xl font-bold text-slate-900">Integrations</h1>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex items-center gap-2">
        <Plug className="h-6 w-6 text-teal-600" />
        <h1 className="font-display text-2xl font-bold text-slate-900">Integrations</h1>
      </div>

      <p className="mb-6 text-sm text-slate-600">
        Connect your favorite tools to automate workflows and sync data. All integrations use secure OAuth authentication - 
        you authorize access directly with each service, and you can revoke access anytime.
      </p>

      {/* HubSpot Integration */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* HubSpot Logo */}
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <img
                src="https://cdn.simpleicons.org/hubspot/FF7A59"
                alt="HubSpot"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-slate-900">HubSpot CRM</h2>
              <p className="text-sm text-slate-600">
                Sync contacts, call results, and create deals automatically
              </p>
              <Link
                href="/dashboard/help/hubspot-sync"
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
              >
                How syncing works
                <ExternalLink className="h-3 w-3" />
              </Link>
              {hubspotStatus?.connected && hubspotStatus.hubspotAccountName && (
                <p className="mt-1 text-xs text-slate-500">
                  Connected to: {hubspotStatus.hubspotAccountName}
                </p>
              )}
            </div>
          </div>
          {hubspotStatus?.connected ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <Check className="h-3 w-3" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Not connected
            </span>
          )}
        </div>

        {/* Connection Component */}
        <div className="mb-6">
          <HubSpotConnection />
        </div>

        {/* Security Info */}
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-3 w-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-emerald-900">Secure OAuth Connection</h3>
              <p className="mt-1 text-xs text-emerald-700">
                When you connect HubSpot, you authorize Intellidial to access only the data needed for syncing contacts and call results. 
                Your authorization is stored securely and you can revoke access anytime from your HubSpot account settings.
              </p>
              {hubspotStatus?.connected && hubspotStatus.hubspotAccountId && (
                <a
                  href={`https://app.hubspot.com/settings/${hubspotStatus.hubspotAccountId}/integrations`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Manage HubSpot permissions
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Settings (if connected) */}
        {hubspotStatus?.connected && (
          <div className="space-y-4">
            <HubSpotSettings />
            <HubSpotSyncLog />
          </div>
        )}
      </section>

      {/* Google Sheets Integration */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <img
                src="https://cdn.simpleicons.org/googlesheets/34A853"
                alt="Google Sheets"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-slate-900">Google Sheets</h2>
              <p className="text-sm text-slate-600">
                Export project results automatically to Google Sheets
              </p>
            </div>
          </div>
        </div>

        <GoogleSheetsConnection />

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-xs text-slate-600">
            <strong>How it works:</strong> Share your Google Sheet with the service account email shown above as Editor. 
            Then use the Export tab in your project to export data directly to your sheet.
          </p>
        </div>
      </section>

      {/* GCP Cloud Storage Integration */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <img
                src="https://cdn.simpleicons.org/googlecloud/4285F4"
                alt="Google Cloud Platform"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-slate-900">GCP Cloud Storage</h2>
              <p className="text-sm text-slate-600">
                Export project results directly to your GCP Cloud Storage bucket
              </p>
            </div>
          </div>
        </div>

        <GCPConnection />

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-xs text-slate-600">
            <strong>How it works:</strong> Provide your GCP service account key and bucket name. 
            Exports will be saved as CSV files directly to your bucket. Your service account key is encrypted before storage.
          </p>
        </div>
      </section>

      {/* Coming Soon Integrations */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-lg font-semibold text-slate-900">
          More Integrations Coming Soon
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white p-2">
                <img
                  src="https://mitto.ch/wp-content/uploads/2024/01/salesforce@2x-8-1.png"
                  alt="Salesforce"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    // Fallback to text if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.fallback-text')) {
                      const fallback = document.createElement('span');
                      fallback.className = 'fallback-text text-xl font-bold text-blue-600';
                      fallback.textContent = 'SF';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Salesforce</h3>
                <span className="text-xs text-slate-500">Coming soon</span>
              </div>
            </div>
            <p className="mb-3 text-sm text-slate-600">
              Sync call results to Salesforce CRM
            </p>
            <button
              disabled
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-500 cursor-not-allowed"
            >
              Connect Salesforce
            </button>
          </div>
        </div>
      </section>

      {message && (
        <div
          className={`fixed bottom-4 right-4 rounded-lg px-4 py-3 text-sm shadow-lg ${
            message.type === "error"
              ? "bg-red-50 text-red-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {message.type === "success" ? (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              {message.text}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <X className="h-4 w-4" />
              {message.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
