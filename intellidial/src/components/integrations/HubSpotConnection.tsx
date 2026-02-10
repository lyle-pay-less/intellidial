"use client";

import { useState, useEffect } from "react";
import { Check, X, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

type HubSpotStatus = {
  connected: boolean;
  enabled?: boolean;
  hubspotAccountId?: string;
  hubspotAccountName?: string;
  connectedAt?: string;
  isExpired?: boolean;
  needsRefresh?: boolean;
};

export function HubSpotConnection() {
  const { user } = useAuth();
  const [status, setStatus] = useState<HubSpotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      checkStatus();
    }
    // Check for success/error messages in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("hubspot_connected") === "true") {
      setMessage("HubSpot connected successfully!");
      if (user?.uid) {
        checkStatus();
      }
      // Remove from URL
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("hubspot_error")) {
      setMessage(`Error: ${params.get("hubspot_error")}`);
      // Remove from URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [user?.uid]);

  const checkStatus = async () => {
    if (!user?.uid) return;
    try {
      const res = await fetch("/api/integrations/hubspot/status", {
        headers: { "x-user-id": user.uid },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Failed to check HubSpot status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!user?.uid) {
      setMessage("Please log in to connect HubSpot");
      return;
    }
    
    setConnecting(true);
    // Redirect to connect endpoint with userId query param
    // The endpoint will redirect to HubSpot
    window.location.href = `/api/integrations/hubspot/connect?userId=${user.uid}`;
  };

  const handleDisconnect = async () => {
    if (!user?.uid) return;
    
    if (!confirm("Are you sure you want to disconnect HubSpot? This will stop syncing call results.")) {
      return;
    }
    
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/hubspot/disconnect", {
        method: "POST",
        headers: { "x-user-id": user.uid },
      });
      if (res.ok) {
        setStatus({ connected: false });
        setMessage("HubSpot disconnected successfully");
      } else {
        setMessage("Failed to disconnect");
      }
    } catch (error) {
      console.error("Failed to disconnect:", error);
      setMessage("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          <span className="text-sm text-slate-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-slate-900">HubSpot CRM</h3>
        {status?.connected ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <Check className="h-3 w-3" />
            Connected
          </span>
        ) : (
          <span className="text-xs text-slate-500">Not connected</span>
        )}
      </div>
      
      <p className="text-sm text-slate-600 mb-3">
        Sync call results to HubSpot. Import contacts and update Lead Status automatically.
      </p>

      {message && (
        <div
          className={`mb-3 rounded-lg px-3 py-2 text-sm ${
            message.includes("Error") || message.includes("Failed")
              ? "bg-red-50 text-red-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {message}
        </div>
      )}

      {status?.connected ? (
        <div className="space-y-2">
          {status.hubspotAccountName && (
            <p className="text-sm text-slate-600">
              Connected to: <span className="font-medium">{status.hubspotAccountName}</span>
            </p>
          )}
          {status.connectedAt && (
            <p className="text-xs text-slate-500">
              Connected on {new Date(status.connectedAt).toLocaleDateString()}
            </p>
          )}
          {status.needsRefresh && (
            <p className="text-xs text-amber-600">
              Token expired. Please reconnect.
            </p>
          )}
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {disconnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <X className="h-4 w-4" />
                Disconnect
              </>
            )}
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {connecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4" />
              Connect HubSpot
            </>
          )}
        </button>
      )}
    </div>
  );
}
