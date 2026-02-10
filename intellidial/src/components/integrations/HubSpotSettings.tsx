"use client";

import { useState, useEffect } from "react";
import { Loader2, Check, X, Save } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

type HubSpotSettings = {
  autoSync?: boolean;
  syncTranscript?: boolean;
  syncRecording?: boolean;
  syncMeetings?: boolean;
  syncDeals?: boolean;
  successLeadStatus?: string;
  failedLeadStatus?: string;
  meetingLeadStatus?: string;
  dealPipelineId?: string;
  dealStageId?: string;
};

type HubSpotSettingsResponse = {
  settings?: HubSpotSettings;
  leadStatuses?: string[];
  pipelines?: Array<{ id: string; label: string; stages: Array<{ id: string; label: string }> }>;
};

export function HubSpotSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [settings, setSettings] = useState<HubSpotSettings>({
    autoSync: true,
    syncTranscript: true,
    syncRecording: true,
    syncMeetings: true,
    syncDeals: true,
    successLeadStatus: "CONNECTED",
    failedLeadStatus: "ATTEMPTED_TO_CONTACT",
    meetingLeadStatus: "MEETING_SCHEDULED",
  });
  const [leadStatuses, setLeadStatuses] = useState<string[]>([]);
  const [pipelines, setPipelines] = useState<Array<{ id: string; label: string; stages: Array<{ id: string; label: string }> }>>([]);

  useEffect(() => {
    if (user?.uid) {
      fetchSettings();
    }
  }, [user?.uid]);

  const fetchSettings = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/hubspot/settings", {
        headers: { "x-user-id": user.uid },
      });
      if (res.ok) {
        const data: HubSpotSettingsResponse = await res.json();
        if (data.settings) {
          setSettings({
            autoSync: true,
            syncTranscript: true,
            syncRecording: true,
            syncMeetings: true,
            syncDeals: true,
            successLeadStatus: "CONNECTED",
            failedLeadStatus: "ATTEMPTED_TO_CONTACT",
            meetingLeadStatus: "MEETING_SCHEDULED",
            ...data.settings,
          });
        }
        if (data.leadStatuses) {
          setLeadStatuses(data.leadStatuses);
        }
        if (data.pipelines) {
          setPipelines(data.pipelines);
        }
      }
    } catch (error) {
      console.error("Failed to fetch HubSpot settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations/hubspot/settings", {
        method: "POST",
        headers: {
          "x-user-id": user.uid,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Settings saved successfully!" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: data.error || "Failed to save settings" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          <span className="text-sm text-slate-600">Loading settings...</span>
        </div>
      </div>
    );
  }

  const selectedPipeline = pipelines.find((p) => p.id === settings.dealPipelineId);
  const availableStages = selectedPipeline?.stages || [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium text-slate-900">HubSpot Sync Settings</h3>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
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

      {/* Auto-Sync Settings */}
      <div className="mb-6">
        <h4 className="mb-3 text-sm font-medium text-slate-900">Auto-Sync Settings</h4>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={settings.autoSync ?? true}
            onChange={(e) => setSettings({ ...settings, autoSync: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <div>
            <div className="text-sm font-medium text-slate-900">
              Automatically sync call results to HubSpot
            </div>
            <div className="text-xs text-slate-500">
              When enabled, call results will automatically update HubSpot contacts
            </div>
          </div>
        </label>
      </div>

      {/* What to Sync */}
      <div className="mb-6">
        <h4 className="mb-3 text-sm font-medium text-slate-900">What to Sync</h4>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.syncTranscript ?? true}
              onChange={(e) => setSettings({ ...settings, syncTranscript: e.target.checked })}
              disabled={!settings.autoSync}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50"
            />
            <span className="text-sm text-slate-700">Sync call transcripts (create Notes)</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.syncRecording ?? true}
              onChange={(e) => setSettings({ ...settings, syncRecording: e.target.checked })}
              disabled={!settings.autoSync}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50"
            />
            <span className="text-sm text-slate-700">Sync recording URLs</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.syncMeetings ?? true}
              onChange={(e) => setSettings({ ...settings, syncMeetings: e.target.checked })}
              disabled={!settings.autoSync}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50"
            />
            <span className="text-sm text-slate-700">Create meetings when booked</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.syncDeals ?? true}
              onChange={(e) => setSettings({ ...settings, syncDeals: e.target.checked })}
              disabled={!settings.autoSync}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50"
            />
            <span className="text-sm text-slate-700">Create deals when meetings booked</span>
          </label>
        </div>
      </div>

      {/* Lead Status Mapping */}
      {leadStatuses.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 text-sm font-medium text-slate-900">Lead Status Mapping</h4>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                On successful call →
              </label>
              <select
                value={settings.successLeadStatus || "CONNECTED"}
                onChange={(e) => setSettings({ ...settings, successLeadStatus: e.target.value })}
                disabled={!settings.autoSync}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none disabled:opacity-50"
              >
                {leadStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                On failed call →
              </label>
              <select
                value={settings.failedLeadStatus || "ATTEMPTED_TO_CONTACT"}
                onChange={(e) => setSettings({ ...settings, failedLeadStatus: e.target.value })}
                disabled={!settings.autoSync}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none disabled:opacity-50"
              >
                {leadStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                On meeting booked →
              </label>
              <select
                value={settings.meetingLeadStatus || "MEETING_SCHEDULED"}
                onChange={(e) => setSettings({ ...settings, meetingLeadStatus: e.target.value })}
                disabled={!settings.autoSync}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none disabled:opacity-50"
              >
                {leadStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Deal Settings */}
      {settings.syncDeals && pipelines.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 text-sm font-medium text-slate-900">Deal Settings</h4>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Deal Pipeline
              </label>
              <select
                value={settings.dealPipelineId || ""}
                onChange={(e) => setSettings({ ...settings, dealPipelineId: e.target.value, dealStageId: undefined })}
                disabled={!settings.autoSync}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none disabled:opacity-50"
              >
                <option value="">Select pipeline...</option>
                {pipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.label}
                  </option>
                ))}
              </select>
            </div>
            {availableStages.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Default Deal Stage
                </label>
                <select
                  value={settings.dealStageId || ""}
                  onChange={(e) => setSettings({ ...settings, dealStageId: e.target.value })}
                  disabled={!settings.autoSync || !settings.dealPipelineId}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none disabled:opacity-50"
                >
                  <option value="">Select stage...</option>
                  {availableStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
