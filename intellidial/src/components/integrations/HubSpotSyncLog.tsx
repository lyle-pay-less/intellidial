"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, RotateCcw, HelpCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

type HubSpotSyncLogEntry = {
  id: string;
  orgId: string;
  contactId: string;
  hubspotContactId: string;
  timestamp: string;
  status: "success" | "failed";
  action: string;
  error?: string;
};

type HubSpotSyncLogResponse = {
  logs: HubSpotSyncLogEntry[];
};

type HubSpotSyncQueueEntry = {
  id: string;
  orgId: string;
  projectId: string;
  contactId: string;
  addedAt: string;
  lastError: string;
  retryCount: number;
};

export function HubSpotSyncLog() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<HubSpotSyncLogEntry[]>([]);
  const [queue, setQueue] = useState<HubSpotSyncQueueEntry[]>([]);
  const [retrying, setRetrying] = useState(false);

  const fetchLogs = async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError(null);
    try {
      const [logRes, queueRes] = await Promise.all([
        fetch("/api/integrations/hubspot/sync-log", { headers: { "x-user-id": user.uid } }),
        fetch("/api/integrations/hubspot/retry-failed", { headers: { "x-user-id": user.uid } }),
      ]);
      if (!logRes.ok) {
        const data = (await logRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to load sync log");
      }
      const logData = (await logRes.json()) as HubSpotSyncLogResponse;
      setLogs(logData.logs ?? []);
      if (queueRes.ok) {
        const queueData = (await queueRes.json()) as { queue?: HubSpotSyncQueueEntry[] };
        setQueue(queueData.queue ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sync log");
    } finally {
      setLoading(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!user?.uid || queue.length === 0) return;
    setRetrying(true);
    try {
      const res = await fetch("/api/integrations/hubspot/retry-failed", {
        method: "POST",
        headers: { "x-user-id": user.uid, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await fetchLogs();
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Retry failed");
      }
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      fetchLogs();
    }
  }, [user?.uid]);

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium text-slate-900">HubSpot Sync Activity</h4>
          <p className="text-xs text-slate-500">Call results sync to each contact&apos;s record in HubSpot.</p>
          <Link
            href="/dashboard/help/hubspot-sync"
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
          >
            <HelpCircle className="h-3 w-3" />
            What to do if sync failed?
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <button
              type="button"
              onClick={handleRetryFailed}
              disabled={retrying}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-50"
            >
              {retrying ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RotateCcw className="h-3 w-3" />
              )}
              Retry failed syncs ({queue.length})
            </button>
          )}
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-white disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading sync activity...
        </div>
      ) : error ? (
        <div className="text-xs text-red-600">{error}</div>
      ) : logs.length === 0 ? (
        <div className="text-xs text-slate-500">No recent sync activity.</div>
      ) : (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Time</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Action</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Status</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-3 py-2 text-slate-600">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{log.action}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        log.status === "success"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {log.status === "success" ? "Success" : "Failed"}
                    </span>
                    {log.error && (
                      <div className="mt-1 text-[11px] text-slate-500 truncate max-w-xs" title={log.error}>
                        {log.error}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {log.hubspotContactId || log.contactId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

