"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
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
} from "lucide-react";
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
} from "@/lib/firebase/types";

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

export default function ProjectDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const id = params?.id as string;
  const authHeaders = useMemo(
    () => (user?.uid ? { "x-user-id": user.uid } : {}),
    [user?.uid]
  );
  const [project, setProject] = useState<ProjectWithId | null>(null);
  const [contacts, setContacts] = useState<ContactWithId[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [duplicating, setDuplicating] = useState(false);

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

  const refreshContacts = () => fetchContacts(0);

  if (loading && !project) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
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
    <div className="p-6 md:p-8">
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
        <InstructionsTab project={project} onUpdate={fetchProject} authHeaders={authHeaders} />
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
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
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
                            { name: "Successful", value: stats.successfulCalls, color: CHART_COLORS.success },
                            { name: "Failed", value: stats.unsuccessfulCalls, color: CHART_COLORS.failed },
                          ]}
                          cx="50%" cy="50%" innerRadius={72} outerRadius={110}
                          paddingAngle={2} dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {[
                            { name: "Successful", value: stats.successfulCalls, color: CHART_COLORS.success },
                            { name: "Failed", value: stats.unsuccessfulCalls, color: CHART_COLORS.failed },
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasMore = contacts.length < total;

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
    const digits = manualPhone.trim().replace(/\D/g, "");
    if (digits.length < 10) return;
    const normalized = digits.length >= 10 ? "+" + digits : digits;
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
      if (!res.ok) throw new Error("Failed to add contact");
      setManualPhone("");
      setManualName("");
      onRefresh();
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
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
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
                onChange={(e) => setManualPhone(e.target.value)}
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
      </div>

      <h3 className="mb-2 font-medium text-slate-900">
        Contacts ({total})
      </h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Phone
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">
                Last updated
              </th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-b border-slate-100">
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
  const [contacts, setContacts] = useState<ContactWithId[]>([]);
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
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [callingNowId, setCallingNowId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const syncPollRef = useRef<{
    interval: ReturnType<typeof setInterval>;
    timeout: ReturnType<typeof setTimeout>;
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
      clearInterval(syncPollRef.current.interval);
      clearTimeout(syncPollRef.current.timeout);
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
              clearInterval(syncPollRef.current.interval);
              clearTimeout(syncPollRef.current.timeout);
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
    const interval = setInterval(poll, 10000);
    // Reduced timeout from 120s to 60s
    const timeout = setTimeout(() => {
      clearInterval(interval);
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
        clearInterval(syncPollRef.current.interval);
        clearTimeout(syncPollRef.current.timeout);
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
    } else {
      setSelected(new Set(contacts.map((c) => c.id)));
    }
  };

  const addToQueue = async () => {
    if (selected.size === 0) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/queue`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ contactIds: Array.from(selected), add: true }),
      });
      if (res.ok) {
        setSelected(new Set());
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
        ? Array.from(queueIds)
        : contacts.filter((c) => c.status === "pending" || c.status === "calling").map((c) => c.id);
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

  const pendingCount = contacts.filter((c) => c.status === "pending" || c.status === "calling").length;
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
            {queueIds.size} in queue
          </span>
          <button
            type="button"
            onClick={addToQueue}
            disabled={selected.size === 0 || updating}
            className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add selected to queue
          </button>
          <button
            type="button"
            onClick={removeFromQueue}
            disabled={selected.size === 0 || updating}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Remove selected from queue
          </button>
          {statusFilter === "pending" && contacts.length > 0 && (
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
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
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

function InstructionsTab({
  project,
  onUpdate,
  authHeaders,
}: {
  project: ProjectWithId;
  onUpdate: () => void;
  authHeaders: Record<string, string>;
}) {
  const [industry, setIndustry] = useState(project.industry ?? "");
  const [industryOther, setIndustryOther] = useState("");
  const [tone, setTone] = useState(project.tone ?? "");
  const [goal, setGoal] = useState(project.goal ?? "");
  const [agentQuestions, setAgentQuestions] = useState<AgentQuestion[]>(
    project.agentQuestions ?? []
  );
  const [captureFields, setCaptureFields] = useState<CaptureField[]>(
    project.captureFields ?? []
  );
  const [agentInstructions, setAgentInstructions] = useState(
    project.agentInstructions ?? ""
  );
  const [surveyEnabled, setSurveyEnabled] = useState(project.surveyEnabled ?? false);
  const [surveyAcknowledged, setSurveyAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    const ind = project.industry ?? "";
    const isInList = INDUSTRIES.some((o) => o.value === ind);
    setIndustry(isInList ? ind : (ind ? "other" : ""));
    setIndustryOther(ind && !isInList ? ind : "");
    setTone(project.tone ?? "");
    setGoal(project.goal ?? "");
    setAgentQuestions(project.agentQuestions ?? []);
    setCaptureFields(project.captureFields ?? []);
    setAgentInstructions(project.agentInstructions ?? "");
    setSurveyEnabled(project.surveyEnabled ?? false);
  }, [project.id, project.industry, project.tone, project.goal, project.agentQuestions, project.captureFields, project.agentInstructions, project.surveyEnabled]);
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
    if (type === "fieldNames") body.questions = agentQuestions;
    else if (type === "script") body.questions = agentQuestions.map((q) => q.text);
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
          industry: industry === "other" ? (industryOther || null) : (industry || null),
          tone: tone.trim() || null,
          goal: goal.trim() || null,
          agentQuestions,
          captureFields,
          agentInstructions: agentInstructions.trim() || null,
          surveyEnabled,
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
      
      // Wait for success animation, then scroll to top
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 600);
      
      // Hide success banner after 3.5s
      setTimeout(() => {
        setShowSuccess(false);
      }, 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const canGenerate = industry || industryOther;

  const questionCount = agentQuestions.filter((q) => q.text.trim()).length;
  const stepsRaw = [
    { id: "industry", label: "Industry", hasContent: !!canGenerate },
    { id: "tone", label: "Tone", hasContent: !!tone.trim() },
    { id: "goal", label: "Goal", hasContent: !!goal.trim() },
    { id: "questions", label: "Questions", hasContent: questionCount > 0 },
    { id: "fields", label: "Field names", hasContent: captureFields.length >= questionCount && questionCount > 0 },
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

      <p className="text-sm text-slate-600">
        Follow the steps below. AI generates each section — edit as needed.
      </p>

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
              Start here
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

      {/* Goal */}
      <div
        className={`rounded-2xl border-2 p-6 shadow-sm transition-all ${
          nextStep === "goal"
            ? "border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20"
            : "border-slate-200 bg-gradient-to-br from-slate-50 to-white"
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
            <Target className="h-4 w-4 text-teal-600" />
            Goal
            {nextStep === "goal" && (
              <span className="rounded-full bg-teal-500 px-2 py-0.5 text-xs font-bold text-white">
                Next step
              </span>
            )}
          </label>
          <button
            type="button"
            onClick={() => generate("goal")}
            disabled={!canGenerate || generating === "goal"}
            className={`animate-glisten flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              nextStep === "goal"
                ? "bg-teal-600 text-white shadow-lg shadow-teal-500/30 hover:bg-teal-700"
                : "bg-teal-50 text-teal-700 hover:bg-teal-100 disabled:opacity-50"
            }`}
          >
            {generating === "goal" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Generate
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          What the agent aims to achieve. AI-generated; you can edit.
        </p>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Qualify leads and book meetings with interested prospects."
          rows={2}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none resize-none"
        />
      </div>

      {/* Questions */}
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

      {/* Field names (Excel) */}
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
            disabled={!tone || !goal || agentQuestions.length === 0 || generating === "script"}
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
          Full instructions for the AI. Generated from tone, goal, and questions; editable.
        </p>
        <textarea
          value={agentInstructions}
          onChange={(e) => setAgentInstructions(e.target.value)}
          placeholder="e.g. Introduce yourself. Ask if they're interested. Work through the questions naturally. Thank them for their time."
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
        disabled={saving || saved}
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

function ResultsTab({
  contacts,
  project,
  onSyncCalls,
}: {
  contacts: ContactWithId[];
  project: ProjectWithId;
  onSyncCalls?: () => Promise<void>;
}) {
  const [transcriptIndex, setTranscriptIndex] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [syncing, setSyncing] = useState(false);
  const selectedContact =
    transcriptIndex !== null ? contacts[transcriptIndex] : null;

  const filteredContacts = contacts.filter((c) => {
    if (statusFilter === "success" && c.status !== "success") return false;
    if (statusFilter === "failed" && c.status !== "failed") return false;
    const attemptedAt = c.callResult?.attemptedAt;
    if (attemptedAt) {
      const d = new Date(attemptedAt).getTime();
      if (dateFrom && d < new Date(dateFrom).getTime()) return false;
      if (dateTo && d > new Date(dateTo + "T23:59:59").getTime()) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-700">Filter:</span>
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
          {filteredContacts.length} of {contacts.length} shown
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
            {filteredContacts.map((c, i) => (
              <tr key={c.id} className="border-b border-slate-100">
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
                        c.status === "success"
                          ? "bg-emerald-100 text-emerald-700"
                          : c.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {c.status}
                    </span>
                    {c.status === "failed" && c.callResult?.failureReason && (
                      <span
                        className="max-w-[220px] text-xs text-slate-500"
                        title={c.callResult.failureReason}
                      >
                        {c.callResult.failureReason}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {c.callResult?.durationSeconds
                    ? `${c.callResult.durationSeconds}s`
                    : "—"}
                </td>
                {project.captureFields?.map((f) => (
                  <td key={f.key} className="px-4 py-3 text-slate-600">
                    {c.callResult?.capturedData?.[f.key] ?? "—"}
                  </td>
                ))}
                <td className="px-4 py-3">
                  {c.callResult?.transcript ? (
                    <button
                      type="button"
                      onClick={() =>
                        setTranscriptIndex(contacts.indexOf(c))
                      }
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
                  {c.callResult?.recordingUrl ? (
                    <a
                      href={c.callResult.recordingUrl}
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
            ))}
          </tbody>
        </table>
      </div>

      {selectedContact?.callResult?.transcript && (
        <TranscriptModal
          contact={selectedContact}
          onClose={() => setTranscriptIndex(null)}
          recordingUrl={selectedContact.callResult?.recordingUrl}
        />
      )}
    </div>
  );
}

function TranscriptModal({
  contact,
  onClose,
  recordingUrl,
}: {
  contact: ContactWithId;
  onClose: () => void;
  recordingUrl?: string;
}) {
  const [search, setSearch] = useState("");
  const transcript = contact.callResult?.transcript ?? "";
  const highlighted =
    search.trim() === ""
      ? transcript
      : transcript.split(new RegExp(`(${escapeRegex(search.trim())})`, "gi")).map((part, i) =>
          part.toLowerCase() === search.trim().toLowerCase() ? (
            <mark key={i} className="bg-amber-200">
              {part}
            </mark>
          ) : (
            part
          )
        );

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
        {recordingUrl && (
          <div className="mb-4">
            <audio controls src={recordingUrl} className="w-full">
              <a href={recordingUrl}>Download recording</a>
            </audio>
          </div>
        )}
        <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
          {highlighted}
        </pre>
      </div>
    </div>
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ExportTab({
  projectId,
  total,
  failedCount,
}: {
  contacts: ContactWithId[];
  project: ProjectWithId;
  projectId: string;
  total: number;
  failedCount: number;
}) {
  const [exporting, setExporting] = useState(false);
  const [exportingFailed, setExportingFailed] = useState(false);

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

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
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
  );
}
