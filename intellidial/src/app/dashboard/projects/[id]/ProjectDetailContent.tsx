"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  Download,
  MessageSquare,
  Headphones,
  Loader2,
  Copy,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Upload,
  Plus,
  ListChecks,
  PlayCircle,
  Sparkles,
  ClipboardList,
  Target,
  MessageCircle,
  Globe,
  ExternalLink,
  HelpCircle,
  List,
  ChevronDown,
  Car,
  RefreshCw,
  Eye,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { IntelliDialLoader } from "@/app/components/IntelliDialLoader";
import { getHubSpotContactUrl, formatTimeAgo } from "@/lib/integrations/hubspot/utils";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { formatDuration } from "@/lib/utils/format";
import type {
  ProjectDoc,
  ContactDoc,
  CaptureField,
  AgentQuestion,
  CallResult,
  CallResultEntry,
} from "@/lib/firebase/types";
import { TestAgent } from "@/app/components/TestAgent";
import { buildSystemPrompt, enrichBusinessContextWithDealer } from "@/lib/vapi/prompt-builder";

type ProjectWithId = ProjectDoc & { id: string };
type ContactWithId = ContactDoc & { id: string };

type TabId = "overview" | "contacts" | "queue" | "instructions" | "results" | "export";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "instructions", label: "Instructions", icon: FileText },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "queue", label: "Call queue", icon: ListChecks },
  { id: "results", label: "Results", icon: BarChart3 },
  { id: "export", label: "Export", icon: Download },
];

const PAGE_SIZE = 20;
const HOURLY_RATE = 300;
const CHART_COLORS = { success: "#14B8A6", failed: "#ef4444", bar: "#14B8A6" };

type DealerForSetup = {
  id: string;
  name: string;
  address?: string | null;
  phoneNumber?: string | null;
  operationHours?: string | null;
  email?: string | null;
  contextLinks?: Array<{ url: string; label?: string | null }> | null;
  /** Email to link enquiries back to this dealership (e.g. address that forwards to leads@). */
  forwardingEmail?: string | null;
};

export function ProjectDetailContent({ projectId, embedded, dealer }: { projectId: string; embedded?: boolean; dealer?: DealerForSetup | null }) {
  const { user } = useAuth();
  const id = projectId;
  const authHeaders = useMemo<Record<string, string>>(
    () => (user?.uid ? { "x-user-id": user.uid } : {}) as Record<string, string>,
    [user?.uid]
  );
  const [project, setProject] = useState<ProjectWithId | null>(null);
  const [contacts, setContacts] = useState<Array<ContactWithId & { scheduledTime?: string | null }>>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [duplicating, setDuplicating] = useState(false);
  const [orgName, setOrgName] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!id || !user?.uid) return;
    const res = await fetch(`/api/projects/${id}`, { headers: authHeaders });
    if (res.ok) {
      const data = await res.json();
      setProject(data);
    }
  }, [id, authHeaders]);

  const fetchContacts = useCallback(
    async (offset = 0, append = false) => {
      if (!id || !user?.uid) return;
      const res = await fetch(
        `/api/projects/${id}/contacts?limit=${PAGE_SIZE}&offset=${offset}`,
        { headers: authHeaders }
      );
      if (res.ok) {
        const data = await res.json();
        const list = data.contacts ?? [];
        setContacts((prev) => (append ? [...prev, ...list] : list));
        if (!append) setTotalContacts(data.total ?? list.length);
      }
    },
    [id, authHeaders]
  );

  /** Run sync-calls once (fixes contacts stuck "calling") then refetch contacts. Call on project load and from Results tab. */
  const syncCallsThenRefresh = useCallback(async () => {
    if (!id || !user?.uid) return;
    try {
      const syncRes = await fetch(`/api/projects/${id}/sync-calls`, {
        headers: authHeaders,
      });
      if (syncRes.ok) await fetchContacts(0);
    } catch {
      // ignore
    }
  }, [id, authHeaders, fetchContacts]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      await fetchProject();
      await fetchContacts();
      await syncCallsThenRefresh();
    })().finally(() => setLoading(false));
  }, [id, fetchProject, fetchContacts, syncCallsThenRefresh]);

  useEffect(() => {
    if (!user?.uid) return;
    fetch("/api/auth/organization", { headers: authHeaders })
      .then((res) => res.json())
      .then((data) => {
        if (data.hasOrganization && data.organization?.name) {
          setOrgName(data.organization.name);
        }
      })
      .catch(() => {});
  }, [user?.uid, authHeaders]);

  const refreshContacts = () => fetchContacts(0);

  if (loading && !project) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-8">
        <IntelliDialLoader />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-slate-500">Project not found.</p>
      </div>
    );
  }

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/projects/${id}/duplicate`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok && data.id) {
        window.location.href = `/dashboard/projects/${data.id}`;
      }
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <div className={embedded ? "" : "p-6 md:p-8"}>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {project.name}
          </h1>
          {project.description && (
            <p className="mt-1 text-slate-500">{project.description}</p>
          )}
          <span
            className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${
              project.status === "completed"
                ? "bg-emerald-100 text-emerald-700"
                : project.status === "running"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {project.status}
          </span>
        </div>
        <button
          type="button"
          onClick={handleDuplicate}
          disabled={duplicating}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-70"
        >
          {duplicating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          Duplicate project
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tabId
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <OverviewTab
          project={project}
          contacts={contacts}
          total={totalContacts}
          projectId={id}
          authHeaders={authHeaders}
          onRun={async () => {
            await fetch(`/api/projects/${id}/run`, {
              method: "POST",
              headers: authHeaders,
            });
            fetchProject();
            fetchContacts(0);
          }}
          onUpdate={fetchProject}
        />
      )}
      {activeTab === "contacts" && (
        <ContactsTab
          projectId={id}
          contacts={contacts}
          total={totalContacts}
          onRefresh={refreshContacts}
          onLoadMore={() => fetchContacts(contacts.length, true)}
          authHeaders={authHeaders}
        />
      )}
      {activeTab === "queue" && (
        <QueueTab
          project={project}
          projectId={id}
          authHeaders={authHeaders}
          onRun={async () => {
            await fetch(`/api/projects/${id}/run`, {
              method: "POST",
              headers: authHeaders,
            });
            fetchProject();
            fetchContacts(0);
          }}
          onUpdate={fetchProject}
        />
      )}
      {activeTab === "instructions" && (
        <InstructionsTab project={project} onUpdate={fetchProject} authHeaders={authHeaders} orgName={orgName} dealer={dealer} />
      )}
      {activeTab === "results" && (
        <ResultsTab
          contacts={contacts}
          project={project}
          onSyncCalls={syncCallsThenRefresh}
        />
      )}
      {activeTab === "export" && (
        <ExportTab
          contacts={contacts}
          project={project}
          projectId={id}
          total={totalContacts}
          failedCount={contacts.filter((c) => c.status === "failed").length}
          authHeaders={authHeaders}
          onSheetsExportSuccess={fetchProject}
        />
      )}
    </div>
  );
}

function OverviewTab({
  project,
  contacts,
  total,
  projectId,
  authHeaders,
  onRun,
  onUpdate,
}: {
  project: ProjectWithId;
  contacts: ContactWithId[];
  total: number;
  projectId: string;
  authHeaders: Record<string, string>;
  onRun: () => Promise<void>;
  onUpdate: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<{
    contactsUploaded: number;
    callsMade: number;
    successfulCalls: number;
    unsuccessfulCalls: number;
    hoursOnCalls: number;
    successRate: number;
    callsByDay: Array<{ date: string; label: string; calls: number; successful: number; failed: number }>;
    minutesByDay: Array<{ date: string; label: string; minutes: number }>;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [pieOutcomes, setPieOutcomes] = useState({ success: 0, failed: 0 });
  const [notifyOnComplete, setNotifyOnComplete] = useState(
    project.notifyOnComplete ?? false
  );

  const pendingCount = contacts.filter(
    (c) => c.status === "pending" || c.status === "calling"
  ).length;

  useEffect(() => {
    setNotifyOnComplete(project.notifyOnComplete ?? false);
  }, [project.id, project.notifyOnComplete]);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}/stats`, { headers: authHeaders })
      .then((r) => r.json())
      .then((data) => setStats(data))
      .finally(() => setStatsLoading(false));
  }, [projectId, authHeaders]);

  // When stats load, delay pie values so chart animates from 0 to final
  useEffect(() => {
    if (!stats || stats.callsMade === 0) {
      setPieOutcomes({ success: 0, failed: 0 });
      return;
    }
    setPieOutcomes({ success: 0, failed: 0 });
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPieOutcomes({
          success: stats.successfulCalls,
          failed: stats.unsuccessfulCalls,
        });
      });
    });
    return () => cancelAnimationFrame(t);
  }, [stats?.successfulCalls, stats?.unsuccessfulCalls, stats?.callsMade]);

  const handleRun = async () => {
    setRunning(true);
    try {
      await onRun();
      const res = await fetch(`/api/projects/${projectId}/stats`, {
        headers: authHeaders,
      });
      if (res.ok) setStats(await res.json());
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {(project.status === "draft" || project.status === "paused") &&
        pendingCount > 0 && (
          <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4">
            <p className="mb-2 text-sm text-teal-800">
              {pendingCount} contact{pendingCount !== 1 ? "s" : ""} ready to
              call. Simulate the calling pipeline (stub).
            </p>
            <button
              type="button"
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-70"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                "Start calling (simulate)"
              )}
            </button>
          </div>
        )}
      {statsLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <IntelliDialLoader />
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2"><Users className="h-5 w-5 text-slate-500" /></div>
              <p className="text-2xl font-bold text-slate-900">{stats.contactsUploaded}</p>
              <p className="text-sm text-slate-500">Contacts</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2"><Phone className="h-5 w-5 text-slate-500" /></div>
              <p className="text-2xl font-bold text-slate-900">{stats.callsMade}</p>
              <p className="text-sm text-slate-500">Calls made</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2"><CheckCircle className="h-5 w-5 text-emerald-500" /></div>
              <p className="text-2xl font-bold text-emerald-600">{stats.successfulCalls}</p>
              <p className="text-sm text-slate-500">Successful</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2"><XCircle className="h-5 w-5 text-red-500" /></div>
              <p className="text-2xl font-bold text-red-600">{stats.unsuccessfulCalls}</p>
              <p className="text-sm text-slate-500">Unsuccessful</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2"><Clock className="h-5 w-5 text-teal-500" /></div>
              <p className="text-2xl font-bold text-slate-900">{formatDuration(stats.hoursOnCalls)}</p>
              <p className="text-sm text-slate-500">Time saved</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2"><DollarSign className="h-5 w-5 text-emerald-600" /></div>
              <p className="text-2xl font-bold text-slate-900">R{Math.round(stats.hoursOnCalls * HOURLY_RATE).toLocaleString()}</p>
              <p className="text-sm text-slate-500">Money saved</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-5">
              <p className="text-sm font-medium text-teal-800">
                Success rate: <span className="font-bold">{stats.successRate}%</span>
              </p>
              <p className="mt-1 text-xs text-teal-600">
                AI handled {formatDuration(stats.hoursOnCalls)} of calls
              </p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5">
              <p className="text-sm font-medium text-emerald-800">
                Time saved: <span className="font-bold">{formatDuration(stats.hoursOnCalls)}</span>
              </p>
              <p className="mt-1 text-xs text-emerald-600">
                Equivalent to your team&apos;s time
              </p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5">
              <p className="text-sm font-medium text-emerald-800">
                Money saved: <span className="font-bold">R{Math.round(stats.hoursOnCalls * HOURLY_RATE).toLocaleString()}</span>
              </p>
              <p className="mt-1 text-xs text-emerald-600">
                At R{HOURLY_RATE}/hour labor cost
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-display text-sm font-semibold text-slate-900">Call outcomes</h3>
              <div className="relative h-80">
                {stats.callsMade > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Successful", value: pieOutcomes.success, color: CHART_COLORS.success },
                            { name: "Failed", value: pieOutcomes.failed, color: CHART_COLORS.failed },
                          ]}
                          cx="50%" cy="50%" innerRadius={72} outerRadius={110}
                          paddingAngle={2} dataKey="value"
                          isAnimationActive={true}
                          animationBegin={0}
                          animationDuration={1000}
                          animationEasing="ease-out"
                          label={({ name, percent }) => (percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : "")}
                        >
                          {[
                            { name: "Successful", value: pieOutcomes.success, color: CHART_COLORS.success },
                            { name: "Failed", value: pieOutcomes.failed, color: CHART_COLORS.failed },
                          ].map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [value, "Calls"]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-slate-900">{stats.callsMade}</span>
                      <span className="text-xs text-slate-500">total calls</span>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">No call data yet</div>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm overflow-x-auto">
              <h3 className="mb-4 font-display text-sm font-semibold text-slate-900">Minutes by day</h3>
              <div className="h-80 min-w-[400px]" style={{ minWidth: Math.max(400, (stats.minutesByDay?.length ?? 0) * 36) }}>
                {stats.minutesByDay?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.minutesByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                        formatter={(value: number) => [Math.round(value), "Minutes"]}
                        labelFormatter={(label) => `Date: ${label}`} />
                      <Bar dataKey="minutes" fill={CHART_COLORS.bar} radius={[4, 4, 0, 0]} name="minutes">
                        <LabelList dataKey="minutes" position="top" formatter={(v: number) => (v > 0 ? Math.round(v) : "")} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">No call data yet</div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm overflow-x-auto">
            <h3 className="mb-4 font-display text-sm font-semibold text-slate-900">Calls by day</h3>
            <div className="h-80 min-w-[400px]" style={{ minWidth: Math.max(400, (stats.callsByDay?.length ?? 0) * 36) }}>
              {stats.callsByDay?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.callsByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                      formatter={(value: number, name: string) => [value, name === "successful" ? "Successful" : "Failed"]}
                      labelFormatter={(label) => `Date: ${label}`} />
                    <Bar dataKey="successful" stackId="a" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} name="successful">
                      <LabelList dataKey="successful" position="center" fill="white" formatter={(v: number) => (v > 0 ? v : "")} />
                    </Bar>
                    <Bar dataKey="failed" stackId="a" fill={CHART_COLORS.failed} radius={[0, 0, 4, 4]} name="failed">
                      <LabelList dataKey="failed" position="center" fill="white" formatter={(v: number) => (v > 0 ? v : "")} />
                      <LabelList dataKey="calls" position="top" formatter={(v: number) => (v > 0 ? v : "")} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">No call data by day yet</div>
              )}
            </div>
          </div>
        </>
      ) : null}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={notifyOnComplete}
            onChange={(e) => {
              const checked = e.target.checked;
              setNotifyOnComplete(checked);
              fetch(`/api/projects/${projectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notifyOnComplete: checked }),
              }).then(() => onUpdate());
            }}
            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-slate-700">
            Email me when this project completes
          </span>
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Notification delivery coming soon.
        </p>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-slate-900">Capture fields</h3>
        {project.captureFields?.length ? (
          <ul className="list-inside list-disc text-sm text-slate-600">
            {project.captureFields.map((f, i) => (
              <li key={i}>
                {f.label} ({f.type ?? "text"})
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No capture fields defined.</p>
        )}
      </div>
    </div>
  );
}

/** Basic phone validation: digits, optional + at start, 10–15 chars */
function parseAndValidatePhones(text: string): Array<{ phone: string; name?: string }> {
  const raw = text
    .split(/[\n,;\t]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const results: Array<{ phone: string; name?: string }> = [];
  const seen = new Set<string>();

  for (const line of raw) {
    const parts = line.split(/\s+/);
    let phone = parts[0].replace(/\D/g, "");
    if (parts[0].startsWith("+")) phone = "+" + phone;
    else if (phone.length >= 10) phone = "+" + phone;

    if (!phone || phone.length < 10 || seen.has(phone)) continue;
    seen.add(phone);

    const name = parts.length > 1 ? parts.slice(1).join(" ") : undefined;
    results.push({ phone, name: name || undefined });
  }

  return results;
}

function ContactsTab({
  projectId,
  contacts,
  total,
  onRefresh,
  onLoadMore,
  authHeaders,
}: {
  projectId: string;
  contacts: ContactWithId[];
  total: number;
  onRefresh: () => void;
  onLoadMore: () => Promise<void>;
  authHeaders: Record<string, string>;
}) {
  const [pasteText, setPasteText] = useState("");
  const [preview, setPreview] = useState<Array<{ phone: string; name?: string }>>([]);
  const [adding, setAdding] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [manualPhone, setManualPhone] = useState("");
  const [manualName, setManualName] = useState("");
  const [addingOne, setAddingOne] = useState(false);
  const [addOneError, setAddOneError] = useState<string | null>(null);
  const [hubspotConnected, setHubspotConnected] = useState<boolean | null>(null);
  const [hubspotSyncing, setHubspotSyncing] = useState(false);
  const [hubspotSyncResult, setHubspotSyncResult] = useState<{
    imported: number;
    skipped: number;
    skippedNoPhone?: number;
    skippedDuplicates?: number;
    filteredByStatus?: number;
    hasMore?: boolean;
  } | null>(null);
  const [hubspotLeadStatuses, setHubspotLeadStatuses] = useState<string[]>([]);
  const [selectedLeadStatus, setSelectedLeadStatus] = useState<string>("all");
  const [excludedLeadStatuses, setExcludedLeadStatuses] = useState<string[]>([]);
  const [loadingLeadStatuses, setLoadingLeadStatuses] = useState(false);
  const [hubspotImportMode, setHubspotImportMode] = useState<"leadStatus" | "list">("leadStatus");
  const [hubspotLists, setHubspotLists] = useState<{ listId: string; name: string }[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [loadingLists, setLoadingLists] = useState(false);
  const [hubspotSyncSettings, setHubspotSyncSettings] = useState<{
    syncTranscript?: boolean;
    syncRecording?: boolean;
    fieldMappings?: Record<string, string>;
    successLeadStatus?: string;
    failedLeadStatus?: string;
    meetingLeadStatus?: string;
  } | null>(null);
  const [preFlightHubSpotOpen, setPreFlightHubSpotOpen] = useState(false);
  const [hubspotTriggerOpen, setHubspotTriggerOpen] = useState(false);
  const [hubspotAccountId, setHubspotAccountId] = useState<string | null>(null);
  const [syncingContactId, setSyncingContactId] = useState<string | null>(null);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [selectedContactsForSync, setSelectedContactsForSync] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasMore = contacts.length < total;

  // Check HubSpot connection status and fetch lead statuses
  useEffect(() => {
    const checkHubSpot = async () => {
      try {
        const res = await fetch("/api/integrations/hubspot/status", {
          headers: authHeaders,
        });
        if (res.ok) {
          const data = await res.json();
          const connected = data.connected === true;
          setHubspotConnected(connected);
          if (data.hubspotAccountId) {
            setHubspotAccountId(data.hubspotAccountId);
          }
          
          // Fetch lead statuses if connected
          if (connected) {
            setLoadingLeadStatuses(true);
            try {
              const statusRes = await fetch("/api/integrations/hubspot/lead-statuses", {
                headers: authHeaders,
              });
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                setHubspotLeadStatuses(statusData.statuses || []);
              }
            } catch (err) {
              console.error("Failed to fetch lead statuses:", err);
            } finally {
              setLoadingLeadStatuses(false);
            }
          }
        } else {
          setHubspotConnected(false);
        }
      } catch {
        setHubspotConnected(false);
      }
    };
    checkHubSpot();
  }, [authHeaders]);

  // Fetch HubSpot lists when import mode is "list" and HubSpot is connected
  useEffect(() => {
    if (!hubspotConnected || hubspotImportMode !== "list") return;
    let cancelled = false;
    setLoadingLists(true);
    fetch("/api/integrations/hubspot/lists", { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : { lists: [] }))
      .then((data) => {
        if (!cancelled) setHubspotLists(data.lists || []);
      })
      .catch(() => {
        if (!cancelled) setHubspotLists([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingLists(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authHeaders, hubspotConnected, hubspotImportMode]);

  // Fetch HubSpot sync settings for pre-flight "What we'll write to HubSpot"
  useEffect(() => {
    if (!hubspotConnected) {
      setHubspotSyncSettings(null);
      return;
    }
    let cancelled = false;
    fetch("/api/integrations/hubspot/settings", { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : { settings: null }))
      .then((data) => {
        if (!cancelled && data.settings) {
          setHubspotSyncSettings({
            syncTranscript: data.settings.syncTranscript !== false,
            syncRecording: data.settings.syncRecording !== false,
            fieldMappings: data.settings.fieldMappings,
            successLeadStatus: data.settings.successLeadStatus || "CONNECTED",
            failedLeadStatus: data.settings.failedLeadStatus || "ATTEMPTED_TO_CONTACT",
            meetingLeadStatus: data.settings.meetingLeadStatus || "MEETING_SCHEDULED",
          });
        }
      })
      .catch(() => {
        if (!cancelled) setHubspotSyncSettings(null);
      });
    return () => {
      cancelled = true;
    };
  }, [authHeaders, hubspotConnected]);

  const handleHubSpotSync = async () => {
    setHubspotSyncing(true);
    setHubspotSyncResult(null);
    try {
      const requestBody: {
        projectId: string;
        limit: number;
        listId?: string;
        leadStatuses?: string[];
        excludeLeadStatuses?: string[];
      } = {
        projectId,
        limit: hubspotImportMode === "list" ? 500 : 100,
      };

      if (hubspotImportMode === "list" && selectedListId) {
        requestBody.listId = selectedListId;
      } else {
        if (selectedLeadStatus !== "all") {
          requestBody.leadStatuses = [selectedLeadStatus];
        }
        if (excludedLeadStatuses.length > 0) {
          requestBody.excludeLeadStatuses = excludedLeadStatuses;
        }
      }

      const res = await fetch("/api/integrations/hubspot/sync-contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to sync contacts");
      }
      const data = await res.json();
      setHubspotSyncResult({
        imported: data.imported || 0,
        skipped: data.skipped || 0,
        skippedNoPhone: data.skippedNoPhone ?? 0,
        skippedDuplicates: data.skippedDuplicates ?? data.skipped ?? 0,
        filteredByStatus: data.filteredByStatus || 0,
        hasMore: data.hasMore === true,
      });
      onRefresh();
    } catch (e) {
      setAddOneError(e instanceof Error ? e.message : "Failed to sync from HubSpot");
    } finally {
      setHubspotSyncing(false);
    }
  };

  const toggleExcludedStatus = (status: string) => {
    setExcludedLeadStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const handleSyncContact = async (contactId: string) => {
    setSyncingContactId(contactId);
    try {
      const res = await fetch("/api/integrations/hubspot/sync-contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ contactId, projectId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to sync contact");
      }
      onRefresh();
    } catch (e) {
      setAddOneError(e instanceof Error ? e.message : "Failed to sync contact");
    } finally {
      setSyncingContactId(null);
    }
  };

  const toggleContactForSync = (contactId: string) => {
    setSelectedContactsForSync((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  };

  const handleBulkSync = async () => {
    if (selectedContactsForSync.size === 0) return;
    setBulkSyncing(true);
    const contactIds = Array.from(selectedContactsForSync);
    let successCount = 0;
    let failCount = 0;

    for (const contactId of contactIds) {
      try {
        const res = await fetch("/api/integrations/hubspot/sync-contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({ contactId, projectId }),
        });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setSelectedContactsForSync(new Set());
    onRefresh();
    setBulkSyncing(false);
    if (failCount > 0) {
      setAddOneError(`Synced ${successCount} contact(s), ${failCount} failed`);
    }
  };

  const handleParse = () => {
    const parsed = parseAndValidatePhones(pasteText);
    setPreview(parsed);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseAndValidatePhones(text);
      setPreview(parsed);
      setPasteText(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleAdd = async () => {
    if (preview.length === 0) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ contacts: preview }),
      });
      if (!res.ok) throw new Error("Failed to add contacts");
      setPasteText("");
      setPreview([]);
      onRefresh();
    } catch {
      setAdding(false);
    } finally {
      setAdding(false);
    }
  };

  const handleAddOne = async () => {
    setAddOneError(null);
    const digits = manualPhone.trim().replace(/\D/g, "");
    if (digits.length < 10) {
      setAddOneError("Enter a valid phone number (at least 10 digits).");
      return;
    }
    const normalized = digits.startsWith("+") ? manualPhone.trim() : "+" + digits;
    setAddingOne(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          contacts: [{ phone: normalized, name: manualName.trim() || undefined }],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to add contact");
      }
      setManualPhone("");
      setManualName("");
      onRefresh();
    } catch (e) {
      setAddOneError(e instanceof Error ? e.message : "Failed to add contact");
    } finally {
      setAddingOne(false);
    }
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      await onLoadMore();
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Add manually - field by field */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 font-medium text-slate-900">Add contact</h3>
          <p className="mb-3 text-sm text-slate-500">
            Add a single contact with phone and optional name.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[140px]">
              <label className="mb-1 block text-xs text-slate-500">Phone</label>
              <input
                type="text"
                value={manualPhone}
                onChange={(e) => { setManualPhone(e.target.value); setAddOneError(null); }}
                placeholder="+27123456789"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="mb-1 block text-xs text-slate-500">Name (optional)</label>
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="John Smith"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleAddOne}
              disabled={addingOne || !manualPhone.trim()}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-70 disabled:cursor-not-allowed"
              title="Add to list"
            >
              {addingOne ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
            </button>
          </div>
          {addOneError && (
            <p className="mt-2 text-sm text-amber-600" role="alert">
              {addOneError}
            </p>
          )}
        </div>

        {/* Paste or upload */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 font-medium text-slate-900">Paste or upload contacts</h3>
          <p className="mb-2 text-sm text-slate-500">
            One per line or comma-separated. Format: phone or phone name (e.g. +27123456789 John)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Upload className="h-4 w-4" />
              Upload file (.csv, .txt)
            </button>
            <span className="flex items-center text-sm text-slate-400">or paste below</span>
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="+27123456789&#10;+27987654321 Jane&#10;021 123 4567"
            rows={4}
            className="mb-3 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none resize-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleParse}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Parse & preview
            </button>
            {preview.length > 0 && (
              <>
                <span className="text-sm text-slate-500">
                  {preview.length} valid contact{preview.length !== 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={adding}
                  className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-70"
                >
                  {adding ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add contacts"
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* HubSpot Import */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 font-medium text-slate-900">Import from HubSpot</h3>
          <p className="mb-3 text-sm text-slate-500">
            Add contacts from your HubSpot CRM to this project. Only contacts with phone numbers are
            imported. Call results sync back to each contact&apos;s record in HubSpot.
          </p>
          {hubspotConnected && (
            <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setPreFlightHubSpotOpen((o) => !o)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100/80"
              >
                <span>What we&apos;ll write to HubSpot</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-500 transition-transform ${preFlightHubSpotOpen ? "rotate-180" : ""}`}
                />
              </button>
              {preFlightHubSpotOpen && (
                <div className="border-t border-slate-200 px-3 py-2 text-sm text-slate-600">
                  {hubspotSyncSettings === null ? (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading sync settings…
                    </div>
                  ) : (
                    <>
                  <p className="mb-2 font-medium text-slate-700">
                    When a call completes, we update this contact in HubSpot with:
                  </p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>
                      <strong>Lead Status</strong> — success: {hubspotSyncSettings.successLeadStatus ?? "CONNECTED"}, failed: {hubspotSyncSettings.failedLeadStatus ?? "ATTEMPTED_TO_CONTACT"}, meeting booked: {hubspotSyncSettings.meetingLeadStatus ?? "MEETING_SCHEDULED"}
                    </li>
                    {hubspotSyncSettings.syncTranscript !== false && (
                      <li>
                        <strong>Note</strong> — &quot;Intellidial Call&quot; note with transcript on the contact timeline
                      </li>
                    )}
                    {hubspotSyncSettings.syncRecording !== false && (
                      <li>
                        <strong>Recording URL</strong> — link to the call recording (and in the note)
                      </li>
                    )}
                    <li>
                      Call activity — last call date, duration, call count
                    </li>
                    {hubspotSyncSettings.fieldMappings && Object.keys(hubspotSyncSettings.fieldMappings).length > 0 && (
                      <li>
                        <strong>Custom properties</strong> — {Object.entries(hubspotSyncSettings.fieldMappings).map(([k, v]) => `${k} → ${v}`).join("; ")}
                      </li>
                    )}
                  </ul>
                  <p className="mt-2 text-xs text-slate-500">
                    Configure in Settings → Integrations → HubSpot Sync Settings.
                  </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          {hubspotConnected === null ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking connection...
            </div>
          ) : hubspotConnected ? (
            <div>
              {/* Import by: Lead Status or HubSpot list */}
              <div className="mb-3">
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-700">
                  Who to import
                  <span
                    className="text-slate-400"
                    title="Choose by Lead Status (filter) or by a HubSpot list — same segments you use in HubSpot."
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHubspotImportMode("leadStatus")}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${
                      hubspotImportMode === "leadStatus"
                        ? "border-teal-500 bg-teal-50 text-teal-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Target className="h-4 w-4" />
                    Lead Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setHubspotImportMode("list")}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${
                      hubspotImportMode === "list"
                        ? "border-teal-500 bg-teal-50 text-teal-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <List className="h-4 w-4" />
                    HubSpot list
                  </button>
                </div>
              </div>

              {hubspotImportMode === "list" ? (
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Choose a HubSpot list
                  </label>
                  {loadingLists ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading lists...
                    </div>
                  ) : (
                    <select
                      value={selectedListId}
                      onChange={(e) => setSelectedListId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                    >
                      <option value="">Select a list…</option>
                      {hubspotLists.map((list) => (
                        <option key={list.listId} value={list.listId}>
                          {list.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {hubspotLists.length === 0 && !loadingLists && (
                    <p className="mt-1 text-xs text-slate-500">
                      No contact lists in HubSpot, or create one in HubSpot first.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* Lead Status Filter */}
                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Filter by Lead Status
                    </label>
                    {loadingLeadStatuses ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading statuses...
                      </div>
                    ) : (
                      <select
                        value={selectedLeadStatus}
                        onChange={(e) => setSelectedLeadStatus(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                      >
                        <option value="all">All Lead Statuses</option>
                        {hubspotLeadStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Exclude Lead Statuses */}
                  {hubspotLeadStatuses.length > 0 && (
                    <div className="mb-3">
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Exclude Lead Statuses (optional)
                      </label>
                      <div className="max-h-24 overflow-y-auto rounded-lg border border-slate-200 p-2">
                        {hubspotLeadStatuses.map((status) => (
                          <label
                            key={status}
                            className="flex items-center gap-2 py-1 text-sm text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={excludedLeadStatuses.includes(status)}
                              onChange={() => toggleExcludedStatus(status)}
                              className="h-3 w-3 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span>{status}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Filter Summary */}
                  {(selectedLeadStatus !== "all" || excludedLeadStatuses.length > 0) && (
                    <div className="mb-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                      {selectedLeadStatus !== "all" && (
                        <div>Including: {selectedLeadStatus}</div>
                      )}
                      {excludedLeadStatuses.length > 0 && (
                        <div>Excluding: {excludedLeadStatuses.join(", ")}</div>
                      )}
                    </div>
                  )}
                </>
              )}

              <p className="mb-2 text-xs text-slate-500">
                Up to 500 contacts per run. For larger lists, run Import again to get the next batch.
              </p>
              <button
                type="button"
                onClick={handleHubSpotSync}
                disabled={
                  hubspotSyncing ||
                  (hubspotImportMode === "list" && !selectedListId)
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {hubspotSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Import contacts
                  </>
                )}
              </button>
              {hubspotSyncResult && (
                <div className="mt-2 text-sm text-slate-600">
                  <div>
                    Imported {hubspotSyncResult.imported} contact
                    {hubspotSyncResult.imported !== 1 ? "s" : ""}
                  </div>
                  {hubspotSyncResult.hasMore && (
                    <div className="mt-1 font-medium text-teal-700">
                      There are more contacts in this list. Run Import again to continue.
                    </div>
                  )}
                  {(hubspotSyncResult.skippedDuplicates ?? 0) > 0 && (
                    <div>
                      Skipped {hubspotSyncResult.skippedDuplicates} duplicate
                      {hubspotSyncResult.skippedDuplicates !== 1 ? "s" : ""}
                    </div>
                  )}
                  {(hubspotSyncResult.skippedNoPhone ?? 0) > 0 && (
                    <div>
                      Skipped {hubspotSyncResult.skippedNoPhone} contact
                      {hubspotSyncResult.skippedNoPhone !== 1 ? "s" : ""} without
                      {" "}phone number
                    </div>
                  )}
                  {hubspotSyncResult.filteredByStatus &&
                    hubspotSyncResult.filteredByStatus > 0 && (
                      <div>
                        Filtered out {hubspotSyncResult.filteredByStatus} contact
                        {hubspotSyncResult.filteredByStatus !== 1 ? "s" : ""} by
                        {" "}Lead Status
                      </div>
                    )}
                </div>
              )}
              {/* Trigger from HubSpot: webhook URL for workflows */}
              {hubspotConnected && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setHubspotTriggerOpen((o) => !o)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100/80"
                  >
                    <span>Trigger from HubSpot (workflow → add to queue)</span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-500 transition-transform ${hubspotTriggerOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {hubspotTriggerOpen && (
                    <div className="border-t border-slate-200 px-3 py-2 text-sm text-slate-600">
                      <p className="mb-2">
                        In a HubSpot workflow, add a &quot;Send webhook&quot; action to add contacts to this project&apos;s call queue when they enter a list or Lead Status changes.
                      </p>
                      <p className="mb-1 text-xs font-medium text-slate-500">Webhook URL</p>
                      <code className="block break-all rounded bg-slate-100 px-2 py-1 text-xs">
                        {typeof window !== "undefined" ? `${window.location.origin}/api/integrations/hubspot/webhook` : "/api/integrations/hubspot/webhook"}
                      </code>
                      <p className="mt-2 text-xs font-medium text-slate-500">JSON body (POST)</p>
                      <pre className="mt-1 overflow-x-auto rounded bg-slate-100 p-2 text-xs">
                        {JSON.stringify(
                          {
                            projectId,
                            hubspotContactId: "{{ contact.id }}",
                            secret: "<optional: set HUBSPOT_WEBHOOK_SECRET in env>",
                          },
                          null,
                          2
                        )}
                      </pre>
                      <p className="mt-2 text-xs text-slate-500">
                        Use <code className="rounded bg-slate-100 px-1">{"{{ contact.id }}"}</code> in HubSpot for the contact ID. If HUBSPOT_WEBHOOK_SECRET is set, include it as <code className="rounded bg-slate-100 px-1">secret</code> or header <code className="rounded bg-slate-100 px-1">X-Intellidial-Webhook-Secret</code>.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-3 text-sm text-amber-600">
                HubSpot is not connected. Connect it in Settings to import contacts.
              </p>
              <a
                href="/dashboard/settings"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Go to Settings
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium text-slate-900">
          Contacts ({total})
        </h3>
        {hubspotConnected && selectedContactsForSync.size > 0 && (
          <button
            type="button"
            onClick={handleBulkSync}
            disabled={bulkSyncing}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-70"
          >
            {bulkSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing {selectedContactsForSync.size}...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Sync {selectedContactsForSync.size} to HubSpot
              </>
            )}
          </button>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              {hubspotConnected && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={contacts.length > 0 && selectedContactsForSync.size === contacts.length}
                    onChange={() => {
                      if (selectedContactsForSync.size === contacts.length) {
                        setSelectedContactsForSync(new Set());
                      } else {
                        setSelectedContactsForSync(new Set(contacts.map((c) => c.id)));
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    title="Select all for bulk sync"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Phone
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Status
              </th>
              {hubspotConnected && (
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  HubSpot
                </th>
              )}
              {hubspotConnected && (
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Actions
                </th>
              )}
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Last updated
              </th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-b border-slate-100">
                {hubspotConnected && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedContactsForSync.has(c.id)}
                      onChange={() => toggleContactForSync(c.id)}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-slate-900">{c.phone}</td>
                <td className="px-4 py-3 text-slate-600">{c.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      c.status === "success"
                        ? "bg-emerald-100 text-emerald-700"
                        : c.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                {hubspotConnected && (
                  <td className="px-4 py-3">
                    {c.hubspotContactId ? (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <CheckCircle className="h-3 w-3" />
                          Synced
                        </span>
                        {hubspotAccountId && (
                          <a
                            href={getHubSpotContactUrl(
                              c.hubspotContactId,
                              hubspotAccountId,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 hover:underline"
                            title="Open this contact's record in HubSpot"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </a>
                        )}
                        {c.hubspotLeadStatus && (
                          <span className="text-xs text-slate-500">
                            Lead status: {c.hubspotLeadStatus}
                          </span>
                        )}
                        {c.lastSyncedToHubSpot && (
                          <span
                            className="text-xs text-slate-500"
                            title={`Last synced to HubSpot: ${new Date(
                              c.lastSyncedToHubSpot,
                            ).toLocaleString()}. Results appear on the contact's timeline.`}
                          >
                            {formatTimeAgo(c.lastSyncedToHubSpot)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Not synced
                      </span>
                    )}
                  </td>
                )}
                {hubspotConnected && (
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSyncContact(c.id)}
                      disabled={syncingContactId === c.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      title="Sync call results to this contact's record in HubSpot (Lead Status, notes, recording)"
                    >
                      {syncingContactId === c.id ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-3 w-3" />
                          Sync
                        </>
                      )}
                    </button>
                  </td>
                )}
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {new Date(c.updatedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-70"
          >
            {loadingMore ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

type StatusFilter = "all" | "pending" | "failed" | "success" | "calling";

function QueueTab({
  project,
  projectId,
  authHeaders,
  onRun,
  onUpdate,
}: {
  project: ProjectWithId;
  projectId: string;
  authHeaders: Record<string, string>;
  onRun: () => Promise<void>;
  onUpdate: () => void;
}) {
  const [contacts, setContacts] = useState<Array<ContactWithId & { scheduledTime?: string | null }>>([]);
  const [total, setTotal] = useState(0);
  const [queueIds, setQueueIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [callWindowStart, setCallWindowStart] = useState(
    project.callWindowStart ?? "09:00"
  );
  const [callWindowEnd, setCallWindowEnd] = useState(
    project.callWindowEnd ?? "17:00"
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedScheduledTimes, setSelectedScheduledTimes] = useState<Map<string, string>>(new Map());
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [bulkScheduleTime, setBulkScheduleTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [callingNowId, setCallingNowId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const syncPollRef = useRef<{
    interval: number;
    timeout: number;
  } | null>(null);

  const fetchData = useCallback(async (options?: { skipLoading?: boolean }) => {
    if (!options?.skipLoading) setLoading(true);
    try {
      const [contactsRes, queueRes] = await Promise.all([
        fetch(
          `/api/projects/${projectId}/contacts?limit=200&status=${statusFilter}`,
          { headers: authHeaders }
        ),
        fetch(`/api/projects/${projectId}/queue`, { headers: authHeaders }),
      ]);
      const contactsList: Array<{ id: string; status: string; vapiCallId?: string | null }> = [];
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        const list = data.contacts ?? [];
        contactsList.push(...list);
        setContacts(list);
        setTotal(data.total ?? 0);
      }
      if (queueRes.ok) {
        const data = await queueRes.json();
        setQueueIds(new Set(data.contactIds ?? []));
      }
      // If any contact is stuck in "calling" (e.g. user left before sync), run sync once and refetch once
      const hasStuckCalling = contactsList.some(
        (c) => c.status === "calling" && c.vapiCallId?.trim()
      );
      if (hasStuckCalling) {
        try {
          const r = await fetch(`/api/projects/${projectId}/sync-calls`, {
            headers: authHeaders,
          });
          if (r.ok) {
            const [c2, q2] = await Promise.all([
              fetch(`/api/projects/${projectId}/contacts?limit=200&status=${statusFilter}`, {
                headers: authHeaders,
              }),
              fetch(`/api/projects/${projectId}/queue`, { headers: authHeaders }),
            ]);
            if (c2.ok) {
              const d = await c2.json();
              setContacts(d.contacts ?? []);
              setTotal(d.total ?? 0);
            }
            if (q2.ok) {
              const d = await q2.json();
              setQueueIds(new Set(d.contactIds ?? []));
            }
          }
        } catch {
          // ignore
        }
      }
    } finally {
      if (!options?.skipLoading) setLoading(false);
    }
  }, [projectId, statusFilter, authHeaders]);

  const startSyncPolling = useCallback(() => {
    // Clear any existing polling
    if (syncPollRef.current) {
      window.clearInterval(syncPollRef.current.interval);
      window.clearTimeout(syncPollRef.current.timeout);
      syncPollRef.current = null;
    }

    const poll = async () => {
      try {
        const r = await fetch(`/api/projects/${projectId}/sync-calls`, {
          headers: authHeaders,
        });
        if (r.ok) {
          const data = await r.json();
          // Stop polling if no calls were synced (all calls completed)
          if (data.synced === 0) {
            if (syncPollRef.current) {
              window.clearInterval(syncPollRef.current.interval);
              window.clearTimeout(syncPollRef.current.timeout);
              syncPollRef.current = null;
            }
            return;
          }
          await fetchData({ skipLoading: true });
        }
      } catch {
        // ignore
      }
    };
    poll();
    // Increased interval from 3s to 10s to reduce API load
    const interval = window.setInterval(poll, 10000);
    // Reduced timeout from 120s to 60s
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      syncPollRef.current = null;
    }, 60000);
    syncPollRef.current = { interval, timeout };
  }, [projectId, authHeaders, fetchData]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, statusFilter]);

  useEffect(() => {
    return () => {
      if (syncPollRef.current) {
        window.clearInterval(syncPollRef.current.interval);
        window.clearTimeout(syncPollRef.current.timeout);
      }
    };
  }, []);

  useEffect(() => {
    setCallWindowStart(project.callWindowStart ?? "09:00");
    setCallWindowEnd(project.callWindowEnd ?? "17:00");
  }, [project.callWindowStart, project.callWindowEnd]);

  const saveCallWindow = () => {
    setUpdating(true);
    fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        callWindowStart: callWindowStart || null,
        callWindowEnd: callWindowEnd || null,
      }),
    })
      .then(() => onUpdate())
      .finally(() => setUpdating(false));
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    if (selected.size === contacts.length) {
      setSelected(new Set());
      setSelectedScheduledTimes(new Map());
    } else {
      setSelected(new Set(contacts.map((c) => c.id)));
    }
  };

  const selectAllFiltered = async () => {
    if (selected.size === total && total > 0) {
      setSelected(new Set());
      setSelectedScheduledTimes(new Map());
      return;
    }
    // Fetch all contact IDs for the current filter
    try {
      const res = await fetch(
        `/api/projects/${projectId}/contacts?limit=10000&status=${statusFilter}&idsOnly=true`,
        { headers: authHeaders }
      );
      if (res.ok) {
        const data = await res.json();
        const allIds = (data.contactIds ?? []) as string[];
        setSelected(new Set(allIds));
      }
    } catch {
      // Fallback to selecting all on current page
      setSelected(new Set(contacts.map((c) => c.id)));
    }
  };

  const addToQueue = async (scheduledTime?: string) => {
    if (selected.size === 0) return;
    
    // If scheduled time provided, show modal or use it
    if (scheduledTime || bulkScheduleTime) {
      const timeToUse = scheduledTime || bulkScheduleTime;
      // Store scheduled times for selected contacts
      const timesMap = new Map(selectedScheduledTimes);
      Array.from(selected).forEach(id => {
        if (!timesMap.has(id)) {
          timesMap.set(id, timeToUse);
        }
      });
      setSelectedScheduledTimes(timesMap);
    }
    
    setUpdating(true);
    try {
      const scheduledTimes = Array.from(selected).map(id => ({
        contactId: id,
        scheduledTime: selectedScheduledTimes.get(id) || scheduledTime || bulkScheduleTime || null
      }));
      
      const res = await fetch(`/api/projects/${projectId}/queue`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ 
          contactIds: Array.from(selected), 
          add: true,
          scheduledTimes: scheduledTimes.length > 0 ? scheduledTimes : undefined
        }),
      });
      if (res.ok) {
        setSelected(new Set());
        setSelectedScheduledTimes(new Map());
        setBulkScheduleTime("");
        setShowScheduleModal(false);
        fetchData();
      }
    } finally {
      setUpdating(false);
    }
  };

  const removeFromQueue = async () => {
    if (selected.size === 0) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/queue`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ contactIds: Array.from(selected), add: false }),
      });
      if (res.ok) {
        setSelected(new Set());
        fetchData();
      }
    } finally {
      setUpdating(false);
    }
  };

  const addAllFilteredToQueue = async () => {
    setUpdating(true);
    try {
      const ids = contacts.map((c) => c.id);
      if (ids.length === 0) return;
      const res = await fetch(`/api/projects/${projectId}/queue`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ contactIds: ids, add: true }),
      });
      if (res.ok) {
        setSelected(new Set());
        fetchData();
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setCallError(null);
    const contactIdsToCall =
      queueIds.size > 0
        ? contacts
            .filter(
              (c) =>
                queueIds.has(c.id) &&
                (c.status === "pending" || c.status === "calling") &&
                c.optOut !== true
            )
            .map((c) => c.id)
        : contacts
            .filter(
              (c) =>
                (c.status === "pending" || c.status === "calling") && c.optOut !== true
            )
            .map((c) => c.id);
    if (contactIdsToCall.length === 0) {
      setRunning(false);
      return;
    }
    try {
      const res = await fetch(`/api/projects/${projectId}/call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ contactIds: contactIdsToCall }),
      });
      if (res.ok) {
        await fetchData();
        startSyncPolling();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        await onRun();
        await fetchData();
        return;
      }
      setCallError(data?.error ?? "Call failed");
    } finally {
      setRunning(false);
    }
  };

  const handleCallNow = async (contactId: string) => {
    setCallingNowId(contactId);
    setCallError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ contactId }),
      });
      if (res.ok) {
        await fetchData();
        startSyncPolling();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        const runRes = await fetch(`/api/projects/${projectId}/run`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({ contactIds: [contactId] }),
        });
        if (runRes.ok) await fetchData();
        return;
      }
      setCallError(data?.error ?? "Call failed");
    } finally {
      setCallingNowId(null);
    }
  };
  const pendingCount = contacts.filter(
    (c) => (c.status === "pending" || c.status === "calling") && c.optOut !== true
  ).length;
  const canRun =
    (project.status === "draft" || project.status === "paused" || project.status === "completed") &&
    (queueIds.size > 0 || pendingCount > 0);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
        <p className="mb-3 text-sm font-medium text-teal-800">
          Manage who gets called next. Filter by status, select contacts, and add them to the call queue.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-600">Status filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed (retry)</option>
              <option value="success">Success</option>
              <option value="calling">Calling</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Call between</label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={callWindowStart}
                onChange={(e) => setCallWindowStart(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
              <span className="text-slate-500">–</span>
              <input
                type="time"
                value={callWindowEnd}
                onChange={(e) => setCallWindowEnd(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
              <button
                type="button"
                onClick={saveCallWindow}
                disabled={updating}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-70"
              >
                Save
              </button>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Calls will be made within this window
            </p>
          </div>
        </div>
      </div>

      {callError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {callError}
          <button
            type="button"
            onClick={() => setCallError(null)}
            className="ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-700">
            {selected.size > 0 && `${selected.size} selected • `}
            {queueIds.size} in queue
          </span>
          {selected.size > 0 && (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(true)}
                  disabled={updating}
                  className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                >
                  <Clock className="h-4 w-4" />
                  Schedule & add to queue
                </button>
                <button
                  type="button"
                  onClick={() => addToQueue()}
                  disabled={updating}
                  className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Add selected to queue
                </button>
              </div>
              <button
                type="button"
                onClick={removeFromQueue}
                disabled={updating}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Remove selected from queue
              </button>
            </>
          )}
          {total > contacts.length && (
            <button
              type="button"
              onClick={selectAllFiltered}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {selected.size === total ? "Deselect all" : `Select all ${total} filtered`}
            </button>
          )}
          {statusFilter === "pending" && contacts.length > 0 && selected.size === 0 && (
            <button
              type="button"
              onClick={addAllFilteredToQueue}
              disabled={updating}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Add all {total} to queue
            </button>
          )}
        </div>
        {canRun && (
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-70"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            Start calling
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex min-h-[120px] items-center justify-center p-8">
            <IntelliDialLoader size="md" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No contacts match the filter. Change the status filter or add contacts in the Contacts tab.
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={contacts.length > 0 && selected.size === contacts.length}
                    onChange={selectAllOnPage}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">In queue</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Scheduled time</th>
                <th className="px-4 py-3 text-right font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr
                  key={c.id}
                  className={`border-b border-slate-100 ${selected.has(c.id) ? "bg-teal-50/50" : ""}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-900">{c.phone}</td>
                  <td className="px-4 py-3 text-slate-600">{c.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        c.status === "success"
                          ? "bg-emerald-100 text-emerald-700"
                          : c.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : c.status === "calling"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {queueIds.has(c.id) ? (
                      <CheckCircle className="h-4 w-4 text-teal-600" />
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {selected.has(c.id) ? (
                      <input
                        type="time"
                        value={selectedScheduledTimes.get(c.id) || c.scheduledTime || ""}
                        onChange={(e) => {
                          const newTimes = new Map(selectedScheduledTimes);
                          if (e.target.value) {
                            newTimes.set(c.id, e.target.value);
                          } else {
                            newTimes.delete(c.id);
                          }
                          setSelectedScheduledTimes(newTimes);
                        }}
                        placeholder="Schedule time"
                        className="w-32 rounded border border-slate-200 px-2 py-1 text-xs text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none"
                      />
                    ) : c.scheduledTime ? (
                      <span className="text-xs text-slate-600 font-medium">{c.scheduledTime}</span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.status === "calling" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Calling…
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCallNow(c.id)}
                        disabled={callingNowId !== null}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          c.status === "failed"
                            ? "Retry call"
                            : c.status === "success"
                              ? "Call this contact again"
                              : "Call this contact only"
                        }
                      >
                        {callingNowId === c.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Phone className="h-3.5 w-3.5" />
                        )}
                        {c.status === "failed"
                          ? "Retry"
                          : c.status === "success"
                            ? "Call again"
                            : "Call now"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Schedule Time Modal */}
      {showScheduleModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowScheduleModal(false);
              setBulkScheduleTime("");
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Schedule Calls</h3>
            <p className="mb-4 text-sm text-slate-600">
              Set a time for {selected.size} selected contact{selected.size !== 1 ? "s" : ""} to be called.
            </p>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Call at (HH:mm)
              </label>
              <input
                type="time"
                value={bulkScheduleTime}
                onChange={(e) => setBulkScheduleTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">
                Leave empty to use default call window ({callWindowStart} - {callWindowEnd})
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowScheduleModal(false);
                  setBulkScheduleTime("");
                }}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => addToQueue(bulkScheduleTime)}
                disabled={updating}
                className="flex-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {updating ? "Adding..." : "Schedule & Add to Queue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const INDUSTRIES = [
  { value: "marketing_research", label: "Marketing research" },
  { value: "debt_collection", label: "Debt collection" },
  { value: "recruiting_staffing", label: "Recruiting / staffing" },
  { value: "lead_generation", label: "Lead generation / sales" },
  { value: "customer_support", label: "Customer support" },
  { value: "healthcare_outreach", label: "Healthcare outreach" },
  { value: "real_estate", label: "Real estate" },
  { value: "other", label: "Other" },
];
/** Only authentic South African voices (from your ElevenLabs Voice Library). */
const AGENT_VOICES = [
  { value: "samuel_rosso", label: "Dr. Samuel Rosso – Retired Doctor" },
  { value: "thandi", label: "Thandi – Clear and Engaging" },
  { value: "thabiso", label: "Thabiso – Bright, Energetic" },
  { value: "musole", label: "Musole – Smokey, Stoic" },
  { value: "gawain", label: "The Gawain – Confident, Direct" },
  { value: "crystal", label: "Crystal – Casual conversationalist" },
  { value: "emma_lilliana", label: "Emma Lilliana – Soft, Warm" },
  { value: "hannah", label: "Hannah – Formal and Professional" },
  { value: "cheyenne", label: "Cheyenne – Calm and Professional" },
  { value: "ryan", label: "Ryan – Serious, Round, and Clear" },
  { value: "daniel", label: "Daniel - British Accent" },
] as const;
const AGENT_VOICE_VALUES = AGENT_VOICES.map((o) => o.value);
/** Default voice when project has none or an old value (e.g. "default" → Rachel). Must be one of AGENT_VOICES. */
const DEFAULT_AGENT_VOICE = AGENT_VOICES[0].value;

function InstructionsTab({
  project,
  onUpdate,
  authHeaders,
  orgName,
  dealer,
}: {
  project: ProjectWithId;
  onUpdate: () => void;
  authHeaders: Record<string, string>;
  orgName: string | null;
  dealer?: DealerForSetup | null;
}) {
  const [agentName, setAgentName] = useState(project.agentName ?? "");
  const [agentCompany, setAgentCompany] = useState(project.agentCompany ?? orgName ?? "");
  const [agentNumber, setAgentNumber] = useState(project.agentNumber ?? "");
  const [agentPhoneNumberId, setAgentPhoneNumberId] = useState(project.agentPhoneNumberId ?? "");
  const [phoneNumbers, setPhoneNumbers] = useState<{ id: string; number: string }[]>([]);
  const [phoneNumbersLoading, setPhoneNumbersLoading] = useState(true);
  const [agentImageUrl, setAgentImageUrl] = useState(project.agentImageUrl ?? "");
  const [agentVoice, setAgentVoice] = useState(
    project.agentVoice && AGENT_VOICE_VALUES.includes(project.agentVoice as (typeof AGENT_VOICES)[number]["value"])
      ? project.agentVoice
      : DEFAULT_AGENT_VOICE
  );
  const [goal, setGoal] = useState(project.goal ?? "");
  const [industry, setIndustry] = useState(project.industry ?? "");
  const [industryOther, setIndustryOther] = useState("");
  const [tone, setTone] = useState(project.tone ?? "");
  const [agentQuestions, setAgentQuestions] = useState<AgentQuestion[]>(
    project.agentQuestions ?? []
  );
  const [captureFields, setCaptureFields] = useState<CaptureField[]>(
    project.captureFields ?? []
  );
  const [businessContext, setBusinessContext] = useState(
    project.businessContext ?? ""
  );
  const [businessContextUrls, setBusinessContextUrls] = useState<Array<{ url: string; label?: string }>>([{ url: "" }]);
  const [businessContextGenerateError, setBusinessContextGenerateError] = useState<string | null>(null);
  const [dealershipEnabled, setDealershipEnabled] = useState(project.dealershipEnabled ?? false);
  const [vehicleListingUrl, setVehicleListingUrl] = useState(project.vehicleListingUrl ?? "");
  const [vehicleContextUpdatedAt, setVehicleContextUpdatedAt] = useState<string | null>(
    project.vehicleContextUpdatedAt ?? null
  );
  const [refreshVehicleError, setRefreshVehicleError] = useState<string | null>(null);
  const [callContextInstructions, setCallContextInstructions] = useState(
    (project as ProjectWithId & { effectiveCallContextInstructions?: string }).effectiveCallContextInstructions ?? ""
  );
  const [identityInstructions, setIdentityInstructions] = useState(
    (project as ProjectWithId & { effectiveIdentityInstructions?: string }).effectiveIdentityInstructions ?? ""
  );
  const [endingCallInstructions, setEndingCallInstructions] = useState(
    (project as ProjectWithId & { effectiveEndingCallInstructions?: string }).effectiveEndingCallInstructions ?? ""
  );
  const [complianceInstructions, setComplianceInstructions] = useState(
    (project as ProjectWithId & { effectiveComplianceInstructions?: string }).effectiveComplianceInstructions ?? ""
  );
  const [voiceOutputInstructions, setVoiceOutputInstructions] = useState(
    (project as ProjectWithId & { effectiveVoiceOutputInstructions?: string }).effectiveVoiceOutputInstructions ?? ""
  );
  const [vehiclePlaceholderInstructions, setVehiclePlaceholderInstructions] = useState(
    (project as ProjectWithId & { effectiveVehiclePlaceholderInstructions?: string }).effectiveVehiclePlaceholderInstructions ?? ""
  );
  const [schedulingInstructions, setSchedulingInstructions] = useState(
    (project as ProjectWithId & { effectiveSchedulingInstructions?: string }).effectiveSchedulingInstructions ?? ""
  );
  const [vehicleContextHeaderInstructions, setVehicleContextHeaderInstructions] = useState(
    (project as ProjectWithId & { effectiveVehicleContextHeaderInstructions?: string }).effectiveVehicleContextHeaderInstructions ?? ""
  );
  const [vehicleReferenceInstructions, setVehicleReferenceInstructions] = useState(
    (project as ProjectWithId & { effectiveVehicleReferenceInstructions?: string }).effectiveVehicleReferenceInstructions ?? ""
  );
  const [vehicleIntroInstructions, setVehicleIntroInstructions] = useState(
    (project as ProjectWithId & { effectiveVehicleIntroInstructions?: string }).effectiveVehicleIntroInstructions ?? ""
  );
  const [businessContextHeaderInstructions, setBusinessContextHeaderInstructions] = useState(
    (project as ProjectWithId & { effectiveBusinessContextHeaderInstructions?: string }).effectiveBusinessContextHeaderInstructions ?? ""
  );
  const [agentInstructions, setAgentInstructions] = useState(
    project.agentInstructions ?? ""
  );
  const [surveyEnabled, setSurveyEnabled] = useState(project.surveyEnabled ?? false);
  const [surveyAcknowledged, setSurveyAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voicePreviewLoading, setVoicePreviewLoading] = useState(false);
  const [voicePreviewError, setVoicePreviewError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const [dealerName, setDealerName] = useState("");
  const [dealerAddress, setDealerAddress] = useState("");
  const [dealerPhoneNumber, setDealerPhoneNumber] = useState("");
  const [dealerOperationHours, setDealerOperationHours] = useState("");
  const [dealerEmail, setDealerEmail] = useState("");
  const [dealerAddressPronunciationNotes, setDealerAddressPronunciationNotes] = useState("");
  const [dealerForwardingEmail, setDealerForwardingEmail] = useState("");
  const [dealerSaving, setDealerSaving] = useState(false);
  const [dealerSaveSuccess, setDealerSaveSuccess] = useState(false);
  const [dealerError, setDealerError] = useState<string | null>(null);

  useEffect(() => {
    if (dealer) {
      setDealerName(dealer.name ?? "");
      setDealerAddress(dealer.address ?? "");
      setDealerPhoneNumber(dealer.phoneNumber ?? "");
      setDealerOperationHours(dealer.operationHours ?? "");
      setDealerEmail(dealer.email ?? "");
      setDealerAddressPronunciationNotes((dealer as { addressPronunciationNotes?: string | null }).addressPronunciationNotes ?? "");
      setDealerForwardingEmail(dealer.forwardingEmail ?? "");
    }
  }, [dealer?.id]);

  useEffect(() => {
    setAgentName(project.agentName ?? "");
    setAgentCompany(project.agentCompany ?? "");
    setAgentNumber(project.agentNumber ?? "");
    setAgentPhoneNumberId(project.agentPhoneNumberId ?? "");
    setAgentImageUrl(project.agentImageUrl ?? "");
    setAgentVoice(
      project.agentVoice && AGENT_VOICE_VALUES.includes(project.agentVoice as (typeof AGENT_VOICES)[number]["value"])
        ? project.agentVoice
        : DEFAULT_AGENT_VOICE
    );
    setGoal(project.goal ?? "");
    const ind = project.industry ?? "";
    const isInList = INDUSTRIES.some((o) => o.value === ind);
    setIndustry(isInList ? ind : (ind ? "other" : ""));
    setIndustryOther(ind && !isInList ? ind : "");
    setTone(project.tone ?? "");
    setAgentQuestions(project.agentQuestions ?? []);
    setBusinessContext(project.businessContext ?? "");
    setDealershipEnabled(project.dealershipEnabled ?? false);
    setVehicleListingUrl(project.vehicleListingUrl ?? "");
    setVehicleContextUpdatedAt(project.vehicleContextUpdatedAt ?? null);
    setCallContextInstructions((project as ProjectWithId & { effectiveCallContextInstructions?: string }).effectiveCallContextInstructions ?? "");
    setIdentityInstructions((project as ProjectWithId & { effectiveIdentityInstructions?: string }).effectiveIdentityInstructions ?? "");
    setEndingCallInstructions((project as ProjectWithId & { effectiveEndingCallInstructions?: string }).effectiveEndingCallInstructions ?? "");
    setComplianceInstructions((project as ProjectWithId & { effectiveComplianceInstructions?: string }).effectiveComplianceInstructions ?? "");
    setVoiceOutputInstructions((project as ProjectWithId & { effectiveVoiceOutputInstructions?: string }).effectiveVoiceOutputInstructions ?? "");
    setVehiclePlaceholderInstructions((project as ProjectWithId & { effectiveVehiclePlaceholderInstructions?: string }).effectiveVehiclePlaceholderInstructions ?? "");
    setSchedulingInstructions((project as ProjectWithId & { effectiveSchedulingInstructions?: string }).effectiveSchedulingInstructions ?? "");
    setVehicleContextHeaderInstructions((project as ProjectWithId & { effectiveVehicleContextHeaderInstructions?: string }).effectiveVehicleContextHeaderInstructions ?? "");
    setVehicleReferenceInstructions((project as ProjectWithId & { effectiveVehicleReferenceInstructions?: string }).effectiveVehicleReferenceInstructions ?? "");
    setVehicleIntroInstructions((project as ProjectWithId & { effectiveVehicleIntroInstructions?: string }).effectiveVehicleIntroInstructions ?? "");
    setBusinessContextHeaderInstructions((project as ProjectWithId & { effectiveBusinessContextHeaderInstructions?: string }).effectiveBusinessContextHeaderInstructions ?? "");
    setAgentInstructions(project.agentInstructions ?? "");
    setSurveyEnabled(project.surveyEnabled ?? false);
  }, [project.id, project.agentName, project.agentCompany, project.agentNumber, project.agentPhoneNumberId, project.agentVoice, project.agentImageUrl, project.goal, project.industry, project.tone, project.agentQuestions, project.captureFields, project.businessContext, project.dealershipEnabled, project.vehicleListingUrl, project.vehicleContextUpdatedAt, project.agentInstructions, project.surveyEnabled, project.updatedAt, orgName]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPhoneNumbersLoading(true);
      try {
        const res = await fetch("/api/phone-numbers", { headers: authHeaders });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data?.numbers) ? data.numbers : [];
          setPhoneNumbers(list);
          if (list.length === 1) {
            setAgentPhoneNumberId((prev) => prev || list[0].id);
            setAgentNumber((prev) => prev || list[0].number);
          }
        } else {
          setPhoneNumbers([]);
        }
      } catch {
        if (!cancelled) setPhoneNumbers([]);
      } finally {
        if (!cancelled) setPhoneNumbersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authHeaders]);
  useEffect(() => {
    if (project.surveyEnabled !== undefined && project.surveyEnabled !== null) setSurveyAcknowledged(true);
  }, [project.surveyEnabled]);

  const generate = async (type: string) => {
    setGenerating(type);
    setError(null);
    const industryVal = industry === "other" ? industryOther : industry;
    const body: Record<string, unknown> = {
      type,
      industry: industryVal,
      count: 5,
      tone,
      goal,
    };
    if (type === "goal") body.goal = goal;
    if (type === "fieldNames") body.questions = agentQuestions;
    else if (type === "script") {
      body.questions = agentQuestions.map((q) => q.text);
      body.agentName = agentName;
      body.agentCompany = agentCompany;
    }
    try {
      const res = await fetch(`/api/projects/${project.id}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Generation failed (${res.status})`);
      }
      const data = await res.json();
      if (type === "tone" && data.tone) setTone(data.tone);
      if (type === "goal" && data.goal) setGoal(data.goal);
      if (type === "questions" && data.questions) setAgentQuestions(data.questions);
      if (type === "fieldNames" && data.captureFields) setCaptureFields(data.captureFields);
      if (type === "script" && data.agentInstructions) setAgentInstructions(data.agentInstructions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(null);
    }
  };
  const playVoicePreview = async () => {
    setVoicePreviewError(null);
    setVoicePreviewLoading(true);
    try {
      const res = await fetch(
        `/api/voice-preview?voice=${encodeURIComponent(agentVoice)}`,
        { headers: authHeaders }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Preview failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (err) {
      setVoicePreviewError(err instanceof Error ? err.message : "Could not play preview");
    } finally {
      setVoicePreviewLoading(false);
    }
  };

  const generateBusinessContextFromUrl = async (url: string) => {
    const u = url.trim();
    if (!u) {
      setError("Enter a website URL first");
      return;
    }
    setGenerating("businessContext");
    setError(null);
    setBusinessContextGenerateError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/generate-business-context`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ url: u }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || `Failed to generate (${res.status})`;
        setBusinessContextGenerateError(msg);
        setError(msg);
        return;
      }
      if (data.businessContext) {
        setBusinessContext((prev) => (prev.trim() ? prev + "\n\n---\n\n" + data.businessContext : data.businessContext));
        setBusinessContextGenerateError(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate business context";
      setBusinessContextGenerateError(msg);
      setError(msg);
    } finally {
      setGenerating(null);
    }
  };

  const refreshVehicleContext = async () => {
    if (!vehicleListingUrl.trim()) {
      setRefreshVehicleError("Enter a vehicle listing URL first.");
      return;
    }
    setGenerating("vehicleContext");
    setRefreshVehicleError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/refresh-vehicle-context`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ url: vehicleListingUrl.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRefreshVehicleError(data.error ?? `Failed (${res.status})`);
        return;
      }
      setVehicleContextUpdatedAt(data.vehicleContextUpdatedAt ?? new Date().toISOString());
      await onUpdate();
    } catch (err) {
      setRefreshVehicleError(err instanceof Error ? err.message : "Failed to refresh vehicle context");
    } finally {
      setGenerating(null);
    }
  };

  const generateMoreQuestions = async () => {
    setGenerating("questions");
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          type: "questions",
          industry: industry === "other" ? industryOther : industry,
          count: 3,
          existing: agentQuestions.map((q) => q.text),
          goal: goal,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Generation failed (${res.status})`);
      }
      const data = await res.json();
      if (data.questions) setAgentQuestions((prev) => [...prev, ...data.questions]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(null);
    }
  };

  const addQuestion = () => {
    setAgentQuestions((prev) => [
      ...prev,
      { id: `q-${Date.now()}`, text: "" },
    ]);
  };

  const updateQuestion = (index: number, text: string) => {
    setAgentQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, text } : q))
    );
  };

  const removeQuestion = (index: number) => {
    setAgentQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<CaptureField>) => {
    setCaptureFields((prev) =>
      prev.map((f, i) =>
        i === index
          ? { ...f, ...updates, key: updates.key ?? f.key }
          : f
      )
    );
  };

  const removeField = (index: number) => {
    setCaptureFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    setShowSuccess(false);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          agentName: agentName.trim() || null,
          agentCompany: agentCompany.trim() || null,
          agentNumber: agentNumber.trim() || null,
          agentPhoneNumberId: agentPhoneNumberId.trim() || null,
          agentImageUrl: agentImageUrl.trim() || null,
          agentVoice: agentVoice || null,
          industry: industry === "other" ? (industryOther || null) : (industry || null),
          tone: tone.trim() || null,
          goal: goal.trim() || null,
          agentQuestions,
          businessContext: businessContext.trim() || null,
          captureFields,
          agentInstructions: agentInstructions.trim() || null,
          surveyEnabled,
          dealershipEnabled,
          vehicleListingUrl: vehicleListingUrl.trim() || null,
          callContextInstructions: callContextInstructions.trim() || null,
          identityInstructions: identityInstructions.trim() || null,
          endingCallInstructions: endingCallInstructions.trim() || null,
          complianceInstructions: complianceInstructions.trim() || null,
          voiceOutputInstructions: voiceOutputInstructions.trim() || null,
          vehiclePlaceholderInstructions: vehiclePlaceholderInstructions.trim() || null,
          schedulingInstructions: schedulingInstructions.trim() || null,
          vehicleContextHeaderInstructions: vehicleContextHeaderInstructions.trim() || null,
          vehicleReferenceInstructions: vehicleReferenceInstructions.trim() || null,
          vehicleIntroInstructions: vehicleIntroInstructions.trim() || null,
          businessContextHeaderInstructions: businessContextHeaderInstructions.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      await onUpdate();
      
      // Show success state briefly before scroll
      setSaved(true);
      setShowSuccess(true);
      // Wait for success animation, then scroll to Test Your Agent (or top)
      window.setTimeout(() => {
        const el = document.getElementById("test-your-agent");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        else window.scrollTo({ top: 0, behavior: "smooth" });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 600);
      
      // Hide success banner after 3.5s
      window.setTimeout(() => {
        setShowSuccess(false);
      }, 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const saveDealer = async () => {
    if (!dealer?.id) return;
    setDealerSaving(true);
    setDealerError(null);
    try {
      const res = await fetch(`/api/dealers/${dealer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          name: dealerName.trim(),
          address: dealerAddress.trim() || null,
          phoneNumber: dealerPhoneNumber.trim() || null,
          operationHours: dealerOperationHours.trim() || null,
          email: dealerEmail.trim() || null,
          addressPronunciationNotes: dealerAddressPronunciationNotes.trim() || null,
          forwardingEmail: dealerForwardingEmail.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setDealerSaveSuccess(true);
      setTimeout(() => setDealerSaveSuccess(false), 2500);
    } catch (err) {
      setDealerError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setDealerSaving(false);
    }
  };

  const previewBusinessContext = useMemo(() => {
    const base = businessContext.trim() || null;
    if (!dealer) return base;
    return enrichBusinessContextWithDealer(base, {
      address: dealerAddress.trim() || null,
      phoneNumber: dealerPhoneNumber.trim() || null,
      email: dealerEmail.trim() || null,
      operationHours: dealerOperationHours.trim() || null,
      addressPronunciationNotes: dealerAddressPronunciationNotes.trim() || null,
    });
  }, [businessContext, dealer, dealerAddress, dealerPhoneNumber, dealerEmail, dealerOperationHours, dealerAddressPronunciationNotes]);

  const promptPreview = useMemo(() => buildSystemPrompt({
    agentName, agentCompany, agentNumber,
    businessContext: previewBusinessContext,
    agentInstructions: agentInstructions.trim() || null,
    goal: goal.trim() || null,
    tone: tone.trim() || null,
    agentQuestions,
    vehicleContextFullText: project.vehicleContextFullText ?? null,
    callContextInstructions: callContextInstructions.trim() || null,
    identityInstructions: identityInstructions.trim() || null,
    endingCallInstructions: endingCallInstructions.trim() || null,
    complianceInstructions: complianceInstructions.trim() || null,
    voiceOutputInstructions: voiceOutputInstructions.trim() || null,
    vehiclePlaceholderInstructions: vehiclePlaceholderInstructions.trim() || null,
    schedulingInstructions: schedulingInstructions.trim() || null,
    vehicleContextHeaderInstructions: vehicleContextHeaderInstructions.trim() || null,
    vehicleReferenceInstructions: vehicleReferenceInstructions.trim() || null,
    vehicleIntroInstructions: vehicleIntroInstructions.trim() || null,
    businessContextHeaderInstructions: businessContextHeaderInstructions.trim() || null,
  }), [
    agentName, agentCompany, agentNumber, previewBusinessContext, agentInstructions, goal, tone,
    agentQuestions, project.vehicleContextFullText,
    callContextInstructions, identityInstructions, endingCallInstructions,
    complianceInstructions, voiceOutputInstructions, vehiclePlaceholderInstructions,
    schedulingInstructions, vehicleContextHeaderInstructions, vehicleReferenceInstructions,
    vehicleIntroInstructions, businessContextHeaderInstructions,
  ]);

  const canGenerate = industry || industryOther;
  const isDealershipVersion = !!dealer;

  const questionCount = agentQuestions.filter((q) => q.text.trim()).length;
  const stepsRaw = [
    { id: "businessContext", label: "Business context", hasContent: !!businessContext.trim() },
    { id: "goal", label: "Goal", hasContent: !!goal.trim() },
    { id: "industry", label: "Industry", hasContent: !!canGenerate },
    { id: "tone", label: "Tone", hasContent: !!tone.trim() },
    ...(isDealershipVersion
      ? []
      : [
          { id: "questions", label: "Questions", hasContent: questionCount > 0 },
          { id: "fields", label: "Field names", hasContent: captureFields.length >= questionCount && questionCount > 0 },
        ]),
    { id: "survey", label: "Survey", hasContent: surveyAcknowledged },
    { id: "script", label: "Script", hasContent: !!agentInstructions.trim() },
  ];
  const steps = stepsRaw.map((s, i) => {
    const prevDone = i === 0 || stepsRaw.slice(0, i).every((p) => p.hasContent);
    return { ...s, done: s.hasContent && prevDone };
  });
  const nextStep = steps.find((s) => !s.done)?.id ?? "done";
  const currentStepIndex = steps.findIndex((s) => s.id === nextStep);
  const progressPct = nextStep === "done" ? 100 : Math.round(((currentStepIndex) / steps.length) * 100);

  return (
    <div className="space-y-8">
      {/* Success banner — appears on save */}
      {showSuccess && (
        <div className="animate-save-success flex items-center gap-3 rounded-2xl border-2 border-emerald-400/50 bg-gradient-to-r from-emerald-50 via-teal-50/80 to-emerald-50/50 px-6 py-4 shadow-xl shadow-emerald-500/20">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/40 animate-pulse-gentle">
            <CheckCircle className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <p className="font-display text-base font-bold text-emerald-900">Successfully saved</p>
            <p className="text-sm text-emerald-700">Your agent instructions are ready. You can edit them anytime.</p>
          </div>
        </div>
      )}

      {/* Progress stepper */}
      <div
        className={`rounded-2xl border p-4 shadow-sm transition-all duration-700 ${
          saved ? "border-emerald-300 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 shadow-emerald-500/10" : "border-slate-200 bg-white"
        }`}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">
            {nextStep === "done" ? "All set" : `Step ${currentStepIndex + 1} of ${steps.length}`}
          </span>
          <span className="text-xs text-slate-500">{progressPct}%</span>
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                s.id === nextStep
                  ? "bg-teal-100 text-teal-700 ring-2 ring-teal-500 ring-offset-1"
                  : s.done
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              {s.done ? "✓" : i + 1}. {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Dealer setup — only when viewing from dealer route */}
      {dealer && (
        <div className="rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-teal-50/50 to-cyan-50/30 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
              <Car className="h-4 w-4 text-teal-600" />
              Dealer setup
            </h3>
            <button
              type="button"
              onClick={saveDealer}
              disabled={dealerSaving}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 hover:bg-teal-700 disabled:opacity-70"
            >
              {dealerSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {dealerSaving ? "Saving…" : dealerSaveSuccess ? "Saved" : "Save dealer setup"}
            </button>
          </div>
          {dealerError && <p className="mb-4 text-sm text-red-600">{dealerError}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Business name</label>
              <input
                type="text"
                value={dealerName}
                onChange={(e) => setDealerName(e.target.value)}
                placeholder="e.g. Bargain Auto"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone number</label>
              <input
                type="text"
                value={dealerPhoneNumber}
                onChange={(e) => setDealerPhoneNumber(e.target.value)}
                placeholder="e.g. +27 11 123 4567"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
              <textarea
                value={dealerAddress}
                onChange={(e) => setDealerAddress(e.target.value)}
                placeholder="Physical address"
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Operation hours</label>
              <input
                type="text"
                value={dealerOperationHours}
                onChange={(e) => setDealerOperationHours(e.target.value)}
                placeholder="e.g. Mon–Fri 8–17, Sat 8–12"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email address</label>
              <input
                type="email"
                value={dealerEmail}
                onChange={(e) => setDealerEmail(e.target.value)}
                placeholder="dealer@example.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Forwarding email (link enquiries to this dealer)</label>
              <input
                type="email"
                value={dealerForwardingEmail}
                onChange={(e) => setDealerForwardingEmail(e.target.value)}
                placeholder="e.g. enquiries@dealer.co.za or leave empty"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">The email address that forwards to leads@ so we can link incoming enquiries to this dealership.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Address pronunciation notes</label>
              <input
                type="text"
                value={dealerAddressPronunciationNotes}
                onChange={(e) => setDealerAddressPronunciationNotes(e.target.value)}
                placeholder="e.g. Voortrekker: say Foor-trekker (Afrikaans)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">How to say street/place names when reading the address aloud. Leave empty to use the default (Voortrekker → Foor-trekker).</p>
            </div>
          </div>
        </div>
      )}

      {/* Test Your Agent — at top so user can try after saving */}
      {agentInstructions.trim() && (
        <div
          id="test-your-agent"
          className="rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-teal-50/50 to-cyan-50/50 p-6 shadow-sm"
        >
          <div className="mb-4 text-center">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Test Your Agent
            </h3>
            <p className="text-sm text-slate-600">
              Test your agent before calling real clients. Click below to start a test call.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              This uses the <strong>same agent</strong> as real calls: same goal, questions, business context, and script. If the call drops immediately, try allowing the microphone, using Chrome/Edge, or running a real test from Call queue to confirm the agent.
            </p>
          </div>
          <TestAgent projectId={project.id} projectName={project.name} />
        </div>
      )}

      {/* Dealership: vehicle listing URL + full context for agent */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <label className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
          <Car className="h-4 w-4 text-teal-600" />
          Dealership
        </label>
        <p className="mb-3 text-xs text-slate-500">
          When enabled, add the vehicle listing URL (e.g. AutoTrader) that the customer enquired from. The agent will get full context from this page to introduce the vehicle and answer any question about it.
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Dealership</span>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="dealership"
                checked={dealershipEnabled === true}
                onChange={() => setDealershipEnabled(true)}
                className="h-4 w-4 border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-slate-700">Yes</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="dealership"
                checked={dealershipEnabled === false}
                onChange={() => setDealershipEnabled(false)}
                className="h-4 w-4 border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-slate-700">No</span>
            </label>
          </div>
        </div>
        {dealershipEnabled && (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              <input
                type="url"
                value={vehicleListingUrl}
                onChange={(e) => {
                  setVehicleListingUrl(e.target.value);
                  setRefreshVehicleError(null);
                }}
                placeholder="https://autotrader.co.za/car-for-sale/..."
                className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
              <button
                type="button"
                onClick={refreshVehicleContext}
                disabled={!vehicleListingUrl.trim() || generating === "vehicleContext"}
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-teal-700 disabled:opacity-50"
              >
                {generating === "vehicleContext" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Refresh vehicle context
              </button>
            </div>
            {refreshVehicleError && (
              <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{refreshVehicleError}</p>
            )}
            {vehicleContextUpdatedAt && (
              <p className="text-xs text-slate-500">
                Vehicle context last updated: {new Date(vehicleContextUpdatedAt).toLocaleString()}. The agent has full page context to answer questions about this vehicle.
              </p>
            )}
            {dealershipEnabled && vehicleListingUrl.trim() && !vehicleContextUpdatedAt && !generating && (
              <p className="text-xs text-amber-600">
                Click &quot;Refresh vehicle context&quot; to load full listing content for the agent.
              </p>
            )}
          </>
        )}
      </div>

      {/* Business context — just above Goal */}
      <div
        className={`rounded-2xl border-2 p-6 shadow-sm transition-all ${
          nextStep === "businessContext"
            ? "border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20"
            : "border-slate-200 bg-white"
        }`}
      >
        <label className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
          <Globe className="h-4 w-4 text-teal-600" />
          Business context
          {nextStep === "businessContext" && (
            <span className="rounded-full bg-teal-500 px-2 py-0.5 text-xs font-bold text-white">
              Next step
            </span>
          )}
        </label>
        <p className="mb-3 text-xs text-slate-500">
          What the company does, location, hours, contact person and details, key services. The agent uses this to answer caller questions. Add URLs to generate from, or type it yourself.
        </p>
        <div className="mb-3 space-y-3">
          {businessContextUrls.map((item, i) => (
            <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="url"
                value={item.url}
                onChange={(e) => {
                  setBusinessContextUrls((prev) => {
                    const next = [...prev];
                    if (!next[i]) return prev;
                    next[i] = { ...next[i], url: e.target.value };
                    return next;
                  });
                  setBusinessContextGenerateError(null);
                }}
                placeholder="https://example.com"
                className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
              <input
                type="text"
                value={item.label ?? ""}
                onChange={(e) => {
                  setBusinessContextUrls((prev) => {
                    const next = [...prev];
                    if (!next[i]) return prev;
                    next[i] = { ...next[i], label: e.target.value };
                    return next;
                  });
                }}
                placeholder="Label (optional)"
                className="w-full sm:w-32 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              />
              <button
                type="button"
                onClick={() => generateBusinessContextFromUrl(item.url)}
                disabled={!item.url.trim() || generating === "businessContext"}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-teal-700 disabled:opacity-50"
              >
                {generating === "businessContext" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Generate
              </button>
              <button
                type="button"
                onClick={() =>
                  setBusinessContextUrls((prev) =>
                    prev.length <= 1 ? [{ url: "" }] : prev.filter((_, idx) => idx !== i)
                  )
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                aria-label="Remove URL"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setBusinessContextUrls((prev) => [...prev, { url: "" }])}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Add URL
          </button>
        </div>
        {businessContextGenerateError && (
          <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {businessContextGenerateError}
            {businessContextGenerateError.includes("API key") && (
              <span className="mt-2 block">
                Create a new key at{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  aistudio.google.com/apikey
                </a>
                {" "}and set <code className="bg-red-100 px-1 rounded">GEMINI_API_KEY</code> in your .env, then restart the app.
              </span>
            )}
          </p>
        )}
        <textarea
          value={businessContext}
          onChange={(e) => setBusinessContext(e.target.value)}
          placeholder="e.g. We are a family-owned plumbing company in Johannesburg. We offer 24/7 emergency callouts. Opening hours: Mon–Fri 8am–5pm, Sat 8am–12pm."
          rows={6}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none resize-y"
        />
      </div>

      {/* System instructions — visible and editable so behaviour is transparent */}
      <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/50 p-6 shadow-sm">
        <label className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
          <Eye className="h-4 w-4 text-teal-600" />
          System instructions (transparent)
        </label>
        <p className="mb-4 text-xs text-slate-500">
          These instructions control how the agent behaves. Edit any block below; leave empty or click Reset to use the default. Changes apply after you click Save instructions.
        </p>
        <div className="space-y-4">
          {[
            { key: "callContextInstructions", label: "Call context", value: callContextInstructions, setValue: setCallContextInstructions, placeholder: "Who the agent is calling ({{customerName}}, {{customerNumber}})..." },
            { key: "identityInstructions", label: "Identity", value: identityInstructions, setValue: setIdentityInstructions, placeholder: "Use we/our/us when referring to the business..." },
            { key: "endingCallInstructions", label: "Ending the call", value: endingCallInstructions, setValue: setEndingCallInstructions, placeholder: "When to say goodbye and end the call..." },
            { key: "complianceInstructions", label: "Compliance (e.g. POPIA)", value: complianceInstructions, setValue: setComplianceInstructions, placeholder: "Opt-out / do not call again..." },
            { key: "voiceOutputInstructions", label: "Voice output", value: voiceOutputInstructions, setValue: setVoiceOutputInstructions, placeholder: "Numbers and years in words for TTS..." },
            { key: "businessContextHeaderInstructions", label: "Business context header", value: businessContextHeaderInstructions, setValue: setBusinessContextHeaderInstructions, placeholder: "Header text for the business context section..." },
            { key: "schedulingInstructions", label: "Scheduling", value: schedulingInstructions, setValue: setSchedulingInstructions, placeholder: "How to handle when customer picks a time outside business hours..." },
            ...(dealershipEnabled ? [
              { key: "vehiclePlaceholderInstructions" as const, label: "Vehicle placeholders & speech", value: vehiclePlaceholderInstructions, setValue: setVehiclePlaceholderInstructions, placeholder: "Replace [year] [make] [model]; speech-friendly phrasing..." },
              { key: "vehicleContextHeaderInstructions" as const, label: "Vehicle context header", value: vehicleContextHeaderInstructions, setValue: setVehicleContextHeaderInstructions, placeholder: "How the agent should introduce and use the vehicle listing data..." },
              { key: "vehicleReferenceInstructions" as const, label: "Vehicle reference", value: vehicleReferenceInstructions, setValue: setVehicleReferenceInstructions, placeholder: "How to refer to the vehicle — year/make/model only vs full trim..." },
              { key: "vehicleIntroInstructions" as const, label: "Vehicle intro flow", value: vehicleIntroInstructions, setValue: setVehicleIntroInstructions, placeholder: "Call flow after confirming identity — intro, feature summary, then booking..." },
            ] : []),
          ].map(({ key, label, value, setValue, placeholder }) => (
            <div key={key} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-600">{label}</span>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await fetch(`/api/projects/${project.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json", ...authHeaders },
                      body: JSON.stringify({ [key]: null }),
                    });
                    if (res.ok) await onUpdate();
                  }}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset to default
                </button>
              </div>
              <textarea
                value={value}
                onChange={(e) => { setValue(e.target.value); setSaved(false); }}
                placeholder={placeholder}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none resize-y"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Preview Full Prompt — shows exactly what the agent receives */}
      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/30 p-6 shadow-sm">
        <button
          type="button"
          onClick={() => setPromptPreviewOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
            <Eye className="h-4 w-4 text-amber-600" />
            Preview full prompt
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${promptPreviewOpen ? "rotate-180" : ""}`} />
        </button>
        {promptPreviewOpen && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-slate-500">
              This is the exact system prompt the agent receives. It updates live as you edit fields above. What you see here is what the agent gets — nothing hidden.
            </p>
            <div className="relative">
              <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-xl border border-amber-200 bg-white p-4 text-xs text-slate-700 leading-relaxed">
                {promptPreview}
              </pre>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(promptPreview); }}
                className="absolute right-3 top-3 rounded-md bg-white/80 p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Copy full prompt"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-sm text-slate-600">
        Start with your goal, then set agent identity and follow the steps. Use &quot;Enhance with AI&quot; to structure and improve your goal.
      </p>

      {/* Goal — first step: user types goal; optional Enhance with AI */}
      <div
        className={`rounded-2xl border-2 p-6 shadow-sm transition-all ${
          nextStep === "goal"
            ? "border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20"
            : "border-slate-200 bg-white"
        }`}
      >
        <label className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
          <Target className="h-4 w-4 text-teal-600" />
          Goal
          {nextStep === "goal" && (
            <span className="rounded-full bg-teal-500 px-2 py-0.5 text-xs font-bold text-white">
              Start here
            </span>
          )}
        </label>
        <p className="mb-3 text-xs text-slate-500">
          What should the agent achieve on each call? Type or paste; use &quot;Enhance with AI&quot; to structure it, fix errors, and add steps you might have missed.
        </p>
        <div className="flex flex-col gap-3">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Call leads to confirm interest, answer basic questions, and book a demo if they're interested. Be friendly and brief."
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none resize-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => generate("goal")}
              disabled={!goal.trim() || generating === "goal"}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                nextStep === "goal"
                  ? "bg-teal-600 text-white hover:bg-teal-700"
                  : "bg-teal-50 text-teal-700 hover:bg-teal-100 disabled:opacity-50"
              }`}
            >
              {generating === "goal" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Enhance with AI
            </button>
            <span className="text-xs text-slate-400">Structures your goal, fixes errors, adds missing steps</span>
          </div>
        </div>
      </div>

      {/* Agent settings — identity and voice (used in prompt) */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <label className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
          <Headphones className="h-4 w-4 text-teal-600" />
          Agent settings
        </label>
        <p className="mb-4 text-xs text-slate-500">
          These are used when the agent introduces itself and in the call prompt.
        </p>
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 sm:items-start">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Agent name</label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g. Sarah"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Company (calling on behalf of)</label>
            <input
              type="text"
              value={agentCompany}
              onChange={(e) => setAgentCompany(e.target.value)}
              placeholder="e.g. Acme Health"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Outbound number (agent&apos;s number)</label>
            <select
              value={agentPhoneNumberId}
              onChange={(e) => {
                const id = e.target.value;
                setAgentPhoneNumberId(id);
                const opt = phoneNumbers.find((n) => n.id === id);
                setAgentNumber(opt?.number ?? "");
              }}
              disabled={phoneNumbersLoading}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none disabled:opacity-60"
            >
              <option value="">
                {phoneNumbersLoading ? "Loading…" : phoneNumbers.length === 0 ? "No numbers configured" : "Select number…"}
              </option>
              {phoneNumbers.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.number}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Voice</label>
            <div className="flex gap-2">
              <select
                value={agentVoice}
                onChange={(e) => { setAgentVoice(e.target.value); setVoicePreviewError(null); }}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              >
                {AGENT_VOICES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={playVoicePreview}
                disabled={voicePreviewLoading}
                className="shrink-0 flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-60"
                title="Play a short preview of this voice"
              >
                {voicePreviewLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Headphones className="h-4 w-4" />
                )}
                Test voice
              </button>
            </div>
            {voicePreviewError && (
              <p className="text-xs text-amber-600">{voicePreviewError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Industry */}
      <div
        className={`rounded-2xl border-2 p-6 shadow-sm transition-all ${
          nextStep === "industry"
            ? "border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20"
            : "border-slate-200 bg-white"
        }`}
      >
        <label className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
          <ClipboardList className="h-4 w-4 text-teal-600" />
          Industry
          {nextStep === "industry" && (
            <span className="rounded-full bg-teal-500 px-2 py-0.5 text-xs font-bold text-white">
              Next step
            </span>
          )}
        </label>
        <p className="mb-3 text-xs text-slate-500">
          Select your use case so AI can tailor the agent for you.
        </p>
        <div className="flex flex-wrap gap-3">
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
          >
            <option value="">Select industry...</option>
            {INDUSTRIES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {industry === "other" && (
            <input
              type="text"
              value={industryOther}
              onChange={(e) => setIndustryOther(e.target.value)}
              placeholder="Describe your industry"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none min-w-[200px]"
            />
          )}
        </div>
      </div>

      {/* Tone */}
      <div
        className={`rounded-2xl border-2 p-6 shadow-sm transition-all ${
          nextStep === "tone"
            ? "border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20"
            : "border-slate-200 bg-gradient-to-br from-slate-50 to-white"
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
            <MessageCircle className="h-4 w-4 text-teal-600" />
            Tone
            {nextStep === "tone" && (
              <span className="rounded-full bg-teal-500 px-2 py-0.5 text-xs font-bold text-white">
                Next step
              </span>
            )}
          </label>
          <button
            type="button"
            onClick={() => generate("tone")}
            disabled={!canGenerate || generating === "tone"}
            className={`animate-glisten flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              nextStep === "tone"
                ? "bg-teal-600 text-white shadow-lg shadow-teal-500/30 hover:bg-teal-700"
                : "bg-teal-50 text-teal-700 hover:bg-teal-100 disabled:opacity-50"
            }`}
          >
            {generating === "tone" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Generate
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          How the agent should act and speak. AI-generated from your industry.
        </p>
        <textarea
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          placeholder="e.g. Professional, warm, and curious. Speak clearly at a relaxed pace."
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none resize-none"
        />
      </div>

      {/* Questions — hidden for dealership version */}
      {!isDealershipVersion && (
        <div
          className={`rounded-2xl border-2 p-6 shadow-sm transition-all ${
            nextStep === "questions"
              ? "border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
              <FileText className="h-4 w-4 text-teal-600" />
              Questions ({agentQuestions.length})
              {nextStep === "questions" && (
                <span className="rounded-full bg-teal-500 px-2 py-0.5 text-xs font-bold text-white">
                  Next step
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => generate("questions")}
                disabled={!canGenerate || generating === "questions"}
                className={`animate-glisten flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  nextStep === "questions"
                    ? "bg-teal-600 text-white shadow-lg shadow-teal-500/30 hover:bg-teal-700"
                    : "bg-teal-50 text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                }`}
              >
                {generating === "questions" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Generate 5 questions
              </button>
              <button
                type="button"
                onClick={generateMoreQuestions}
                disabled={!canGenerate || generating === "questions" || agentQuestions.length >= 10}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Generate more
              </button>
              <button
                type="button"
                onClick={addQuestion}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            Questions the agent asks during the call. Default 5; generate more or add manually.
          </p>
          <div className="space-y-2">
            {agentQuestions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
                No questions yet. Generate or add manually.
              </p>
            ) : (
              agentQuestions.map((q, i) => (
                <div
                  key={q.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-medium text-teal-700">
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) => updateQuestion(i, e.target.value)}
                    placeholder={`Question ${i + 1}`}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeQuestion(i)}
                    className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Field names (Excel) — hidden for dealership version */}
      {!isDealershipVersion && (
        <div
          className={`rounded-2xl border-2 p-6 shadow-sm transition-all ${
            nextStep === "fields"
              ? "border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20"
              : "border-slate-200 bg-gradient-to-br from-emerald-50/50 to-white"
          }`}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              Field names (Excel)
              {nextStep === "fields" && (
                <span className="rounded-full bg-teal-500 px-2 py-0.5 text-xs font-bold text-white">
                  Next step
                </span>
              )}
            </label>
            <button
              type="button"
              onClick={() => generate("fieldNames")}
              disabled={agentQuestions.length === 0 || generating === "fieldNames"}
              className={`animate-glisten flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                nextStep === "fields"
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-500/30 hover:bg-teal-700"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              }`}
            >
              {generating === "fieldNames" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Generate from questions
            </button>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            Column names for exported data. AI generates from your questions.
          </p>
          {captureFields.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center text-sm text-slate-500">
              Generate field names from your questions above.
            </p>
          ) : (
            <div className="space-y-2">
              {captureFields.map((f, i) => (
                <div
                  key={f.key}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <input
                    type="text"
                    value={f.key}
                    onChange={(e) => updateField(i, { key: e.target.value })}
                    placeholder="field_key"
                    className="w-40 rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  />
                  <span className="text-slate-400">→</span>
                  <input
                    type="text"
                    value={f.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                    placeholder="Label"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeField(i)}
                    className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Survey toggle */}
      <div
        className={`relative rounded-2xl border-2 p-6 shadow-sm transition-all ${
          nextStep === "survey"
            ? "border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
          Enable post-call survey
          {nextStep === "survey" && (
            <span className="rounded-full bg-teal-500 px-2 py-0.5 text-xs font-bold text-white">
              Next step
            </span>
          )}
        </div>
        <label
          className="flex cursor-pointer items-start gap-4"
          onClick={() => setSurveyAcknowledged(true)}
        >
          <input
            type="checkbox"
            checked={surveyEnabled}
            onChange={(e) => {
              setSurveyEnabled(e.target.checked);
              setSurveyAcknowledged(true);
            }}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <div>
            <p className="mt-0.5 text-xs text-slate-500">
              Let the person called give feedback after each call. You&apos;ll get a notification when feedback arrives, and AI will suggest agent improvements.
            </p>
          </div>
        </label>
      </div>

      {/* Agent script */}
      <div
        className={`rounded-2xl border-2 p-6 shadow-sm transition-all ${
          nextStep === "script"
            ? "border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
            <MessageSquare className="h-4 w-4 text-teal-600" />
            Agent script
            {nextStep === "script" && (
              <span className="rounded-full bg-teal-500 px-2 py-0.5 text-xs font-bold text-white">
                Next step
              </span>
            )}
          </label>
          <button
            type="button"
            onClick={() => generate("script")}
            disabled={!tone || !goal || (!isDealershipVersion && agentQuestions.length === 0) || generating === "script"}
            className={`animate-glisten flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              nextStep === "script"
                ? "bg-teal-600 text-white shadow-lg shadow-teal-500/30 hover:bg-teal-700"
                : "bg-teal-50 text-teal-700 hover:bg-teal-100 disabled:opacity-50"
            }`}
          >
            {generating === "script" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Generate full script
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          {isDealershipVersion
            ? "Full instructions for the AI. Generated from tone and goal; editable."
            : "Full instructions for the AI. Generated from tone, goal, and questions; editable."}
        </p>
        <textarea
          value={agentInstructions}
          onChange={(e) => {
            setAgentInstructions(e.target.value);
            setSaved(false);
          }}
          placeholder={isDealershipVersion ? "e.g. Introduce yourself as calling from [Dealership]. Confirm interest in the vehicle. Qualify and book a viewing or test drive. Thank them." : "e.g. Introduce yourself. Ask if they're interested. Work through the questions naturally. Thank them for their time."}
          rows={10}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none resize-y"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={`relative flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold shadow-lg transition-all duration-300 overflow-hidden ${
          saved
            ? "bg-emerald-600 text-white shadow-emerald-500/30 scale-[0.99]"
            : saving
              ? "bg-teal-500 text-white shadow-teal-500/25 cursor-wait"
              : "bg-teal-600 text-white shadow-teal-500/20 hover:bg-teal-700 hover:shadow-teal-500/30 hover:scale-[1.01] active:scale-[0.99]"
        }`}
      >
        {saving ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="font-medium">Saving instructions...</span>
          </>
        ) : saved ? (
          <>
            <CheckCircle className="h-5 w-5 animate-pulse-gentle" />
            <span className="font-semibold">Successfully saved</span>
          </>
        ) : (
          <span className="font-semibold">Save instructions</span>
        )}
      </button>
    </div>
  );
}

/** One row in the Results table: a single call (contact may have multiple calls). */
type ResultRow = { contact: ContactWithId; call: CallResultEntry };

function ResultsTab({
  contacts,
  project,
  onSyncCalls,
}: {
  contacts: ContactWithId[];
  project: ProjectWithId;
  onSyncCalls?: () => Promise<void>;
}) {
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [syncing, setSyncing] = useState(false);

  const resultRows: ResultRow[] = useMemo(() => {
    const rows: ResultRow[] = [];
    for (const c of contacts) {
      const calls =
        c.callHistory && c.callHistory.length > 0
          ? c.callHistory
          : c.callResult
            ? [{ ...c.callResult }]
            : [];
      for (const call of calls) {
        rows.push({ contact: c, call });
      }
    }
    rows.sort((a, b) => {
      const ta = a.call.attemptedAt ? new Date(a.call.attemptedAt).getTime() : 0;
      const tb = b.call.attemptedAt ? new Date(b.call.attemptedAt).getTime() : 0;
      return tb - ta;
    });
    return rows;
  }, [contacts]);

  const filteredResultRows = resultRows.filter(({ call }) => {
    const status = call.failureReason ? "failed" : "success";
    if (statusFilter === "success" && status !== "success") return false;
    if (statusFilter === "failed" && status !== "failed") return false;
    const attemptedAt = call.attemptedAt;
    if (attemptedAt) {
      const d = new Date(attemptedAt).getTime();
      if (dateFrom && d < new Date(dateFrom).getTime()) return false;
      if (dateTo && d > new Date(dateTo + "T23:59:59").getTime()) return false;
    }
    return true;
  });

  const selectedRow = selectedRowIndex !== null ? filteredResultRows[selectedRowIndex] ?? null : null;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | "success" | "failed")
          }
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-teal-500 outline-none"
        >
          <option value="all">All statuses</option>
          <option value="success">Success only</option>
          <option value="failed">Failed only</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="From"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-teal-500 outline-none"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="To"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-teal-500 outline-none"
        />
        <span className="text-xs text-slate-500">
          {filteredResultRows.length} of {resultRows.length} calls shown
        </span>
        {onSyncCalls && (
          <button
            type="button"
            onClick={async () => {
              setSyncing(true);
              try {
                await onSyncCalls();
              } finally {
                setSyncing(false);
              }
            }}
            disabled={syncing}
            className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            {syncing ? "Syncing…" : "Sync call status"}
          </button>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Contact
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Duration
              </th>
              {project.captureFields?.map((f) => (
                <th
                  key={f.key}
                  className="px-4 py-3 text-left font-medium text-slate-700"
                >
                  {f.label}
                </th>
              ))}
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Transcript
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Recording
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredResultRows.map(({ contact: c, call }, i) => {
              const status = call.failureReason ? "failed" : "success";
              return (
                <tr
                  key={c.id + "-" + (call.vapiCallId ?? call.attemptedAt ?? i)}
                  className="border-b border-slate-100"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">{c.phone}</span>
                    {c.name && (
                      <span className="ml-1 text-slate-500">({c.name})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs ${
                          status === "success"
                            ? "bg-emerald-100 text-emerald-700"
                            : status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {status}
                      </span>
                      {status === "failed" && call.failureReason && (
                        <span
                          className="max-w-[220px] text-xs text-slate-500"
                          title={call.failureReason}
                        >
                          {call.failureReason}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {call.durationSeconds
                      ? `${call.durationSeconds}s`
                      : "—"}
                  </td>
                  {project.captureFields?.map((f) => (
                    <td key={f.key} className="px-4 py-3 text-slate-600">
                      {call.capturedData?.[f.key] ?? "—"}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    {call.transcript ? (
                      <button
                        type="button"
                        onClick={() => setSelectedRowIndex(i)}
                        className="flex items-center gap-1 text-teal-600 hover:text-teal-700"
                      >
                        <MessageSquare className="h-4 w-4" />
                        View
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {call.recordingUrl ? (
                      <a
                        href={call.recordingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-teal-600 hover:text-teal-700"
                      >
                        <Headphones className="h-4 w-4" />
                        Play
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selectedRow && (
        <TranscriptModal
          contact={selectedRow.contact}
          call={selectedRow.call}
          onClose={() => setSelectedRowIndex(null)}
        />
      )}
    </>
  );
}

function TranscriptModal({
  contact,
  call,
  onClose,
}: {
  contact: ContactWithId;
  call: CallResult;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const transcript = call.transcript ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-slate-900">
            Transcript — {contact.phone}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ×
          </button>
        </div>
        <div className="mb-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search in transcript..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
          />
        </div>
        {call.recordingUrl && (
          <div className="mb-4">
            <audio controls src={call.recordingUrl} className="w-full">
              <a href={call.recordingUrl}>Download recording</a>
            </audio>
          </div>
        )}
        <pre className="whitespace-pre-wrap text-sm text-slate-700">{transcript || "No transcript."}</pre>
      </div>
    </div>
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ExportTab({
  contacts,
  project,
  projectId,
  total,
  failedCount,
  authHeaders,
  onSheetsExportSuccess,
}: {
  contacts: ContactWithId[];
  project: ProjectWithId;
  projectId: string;
  total: number;
  failedCount: number;
  authHeaders: Record<string, string>;
  onSheetsExportSuccess?: () => void;
}) {
  const [exporting, setExporting] = useState(false);
  const [exportingFailed, setExportingFailed] = useState(false);
  const [sheetsStatus, setSheetsStatus] = useState<{
    configured: boolean;
    serviceAccountEmail?: string;
  } | null>(null);
  const [sheetUrl, setSheetUrl] = useState(
    project.googleSheetId
      ? `https://docs.google.com/spreadsheets/d/${project.googleSheetId}/edit`
      : ""
  );
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [exportingSheets, setExportingSheets] = useState(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [gcpStatus, setGcpStatus] = useState<{
    configured: boolean;
    enabled: boolean;
    bucketName?: string;
  } | null>(null);
  const [exportingGCP, setExportingGCP] = useState(false);
  const [gcpError, setGcpError] = useState<string | null>(null);
  const [gcpSuccess, setGcpSuccess] = useState<string | null>(null);

  useEffect(() => {
    setSheetUrl(
      project.googleSheetId
        ? `https://docs.google.com/spreadsheets/d/${project.googleSheetId}/edit`
        : ""
    );
  }, [project.googleSheetId]);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/export/google-sheets`, { headers: authHeaders })
      .then((r) => r.json())
      .then((data) => setSheetsStatus({ configured: data.configured, serviceAccountEmail: data.serviceAccountEmail }))
      .catch(() => setSheetsStatus({ configured: false }));
    
    fetch(`/api/integrations/gcp/status`, { headers: authHeaders })
      .then((r) => r.json())
      .then((data) => setGcpStatus({ configured: data.configured, enabled: data.enabled, bucketName: data.bucketName }))
      .catch(() => setGcpStatus({ configured: false, enabled: false }));
  }, [projectId, authHeaders]);

  const doExport = async (failedOnly: boolean) => {
    const res = await fetch(
      `/api/projects/${projectId}/export${failedOnly ? "?failed=true" : ""}`,
      { headers: authHeaders }
    );
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition");
    const match = disposition?.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? `export_${projectId}.csv`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await doExport(false);
    } finally {
      setExporting(false);
    }
  };

  const handleExportFailed = async () => {
    setExportingFailed(true);
    try {
      await doExport(true);
    } finally {
      setExportingFailed(false);
    }
  };

  const handleExportToSheets = async (failedOnly: boolean) => {
    setSheetsError(null);
    setExportingSheets(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/export/google-sheets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          spreadsheetUrl: sheetUrl.trim() || undefined,
          saveAsDefault,
          failedOnly,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSheetsError(data.error ?? "Export failed");
        return;
      }
      if (saveAsDefault && onSheetsExportSuccess) onSheetsExportSuccess();
      if (data.spreadsheetUrl) window.open(data.spreadsheetUrl, "_blank");
    } finally {
      setExportingSheets(false);
    }
  };

  const handleExportToGCP = async (failedOnly: boolean) => {
    setGcpError(null);
    setGcpSuccess(null);
    setExportingGCP(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/export/gcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ failedOnly }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGcpError(data.error ?? "Export failed");
        return;
      }
      setGcpSuccess(`Exported to ${data.fileName} in bucket ${gcpStatus?.bucketName}`);
      setTimeout(() => setGcpSuccess(null), 5000);
    } finally {
      setExportingGCP(false);
    }
  };

  return (
    <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
      <div>
        <p className="mb-4 text-sm text-slate-600">
          Export to CSV with columns: contact (phone, name), status, duration,
          date, capture fields, transcript, recording link.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-70"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>Export all — {total} rows</>
            )}
          </button>
          {failedCount > 0 && (
            <button
              type="button"
              onClick={handleExportFailed}
              disabled={exportingFailed}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-70"
            >
              {exportingFailed ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>Export failed only — {failedCount} rows</>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Google Sheets</h3>
        <p className="mb-3 text-sm text-slate-600">
          Push the same export data to a Google Sheet. Share the sheet with the service account as Editor first.
        </p>
        {sheetsStatus && !sheetsStatus.configured && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Google Sheets export is not configured for this server (missing GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON).
          </p>
        )}
        {sheetsStatus?.configured && (
          <>
            {sheetsStatus.serviceAccountEmail && (
              <p className="mb-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                Share your sheet with: <strong className="font-mono">{sheetsStatus.serviceAccountEmail}</strong> (Editor)
              </p>
            )}
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Google Sheet URL
              </label>
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 outline-none"
              />
            </div>
            <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={saveAsDefault}
                onChange={(e) => setSaveAsDefault(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              Save as default for this project
            </label>
            {sheetsError && (
              <p className="mb-2 text-sm text-red-600">{sheetsError}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleExportToSheets(false)}
                disabled={exportingSheets || !sheetUrl.trim()}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-70"
              >
                {exportingSheets ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>Export to Google Sheets</>
                )}
              </button>
              {failedCount > 0 && (
                <button
                  type="button"
                  onClick={() => handleExportToSheets(true)}
                  disabled={exportingSheets || !sheetUrl.trim()}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-70"
                >
                  Export failed only to Sheets
                </button>
              )}
            </div>
          </>
        )}

        {/* GCP Cloud Storage Export */}
        {gcpStatus && gcpStatus.configured && gcpStatus.enabled && (
          <>
            <div className="my-6 border-t border-slate-200 pt-6">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Export to GCP Cloud Storage
              </h3>
              <p className="mb-3 text-sm text-slate-600">
                Export directly to your GCP bucket: <span className="font-mono text-xs">{gcpStatus.bucketName}</span>
              </p>
              {gcpError && (
                <p className="mb-2 text-sm text-red-600">{gcpError}</p>
              )}
              {gcpSuccess && (
                <p className="mb-2 text-sm text-emerald-600">{gcpSuccess}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleExportToGCP(false)}
                  disabled={exportingGCP}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-70"
                >
                  {exportingGCP ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>Export to GCP Bucket</>
                  )}
                </button>
                {failedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleExportToGCP(true)}
                    disabled={exportingGCP}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-70"
                  >
                    Export failed only to GCP
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
