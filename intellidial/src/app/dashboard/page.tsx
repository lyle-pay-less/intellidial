"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
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

type Project = { id: string; name: string; status: string };

type Stats = {
  contactsUploaded: number;
  callsMade: number;
  successfulCalls: number;
  unsuccessfulCalls: number;
  hoursOnCalls: number;
  successRate: number;
  callsByDay: Array<{ date: string; label: string; calls: number; successful: number; failed: number }>;
  minutesByDay: Array<{ date: string; label: string; minutes: number }>;
  dataRetrievalRate: number;
  dataRetrievalWithData: number;
  dataRetrievalSuccessfulTotal: number;
  period: "all" | "wow" | "mom";
  deltas: {
    contactsUploaded: number | null;
    callsMade: number | null;
    successfulCalls: number | null;
    unsuccessfulCalls: number | null;
    hoursOnCalls: number | null;
    successRate: number | null;
  } | null;
};

const HOURLY_RATE = 300; // R300/hour or $50 - configurable
const CHART_COLORS = {
  success: "#14B8A6", // Intellidial accent (teal-500)
  failed: "#ef4444",
  bar: "#14B8A6", // Intellidial accent
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"all" | "wow" | "mom">("all");

  useEffect(() => {
    Promise.all([
      fetch(`/api/dashboard/stats?period=${period}`).then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ])
      .then(([statsData, projectsData]) => {
        setStats(statsData);
        setProjects(Array.isArray(projectsData) ? projectsData.slice(0, 5) : []);
      })
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-teal-600" />
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <PeriodButton
            active={period === "all"}
            onClick={() => setPeriod("all")}
          >
            All time
          </PeriodButton>
          <PeriodButton
            active={period === "wow"}
            onClick={() => setPeriod("wow")}
          >
            WoW
          </PeriodButton>
          <PeriodButton
            active={period === "mom"}
            onClick={() => setPeriod("mom")}
          >
            MoM
          </PeriodButton>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : stats ? (
        <>
          {/* Score cards */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <KpiCard
              icon={<Users className="h-5 w-5 text-slate-500" />}
              label="Contacts uploaded"
              value={stats.contactsUploaded}
              delta={stats.deltas?.contactsUploaded}
            />
            <KpiCard
              icon={<Phone className="h-5 w-5 text-slate-500" />}
              label="Calls made"
              value={stats.callsMade}
              delta={stats.deltas?.callsMade}
            />
            <KpiCard
              icon={<CheckCircle className="h-5 w-5 text-emerald-500" />}
              label="Successful calls"
              value={stats.successfulCalls}
              delta={stats.deltas?.successfulCalls}
            />
            <KpiCard
              icon={<XCircle className="h-5 w-5 text-red-500" />}
              label="Unsuccessful calls"
              value={stats.unsuccessfulCalls}
              delta={stats.deltas?.unsuccessfulCalls}
            />
            <KpiCard
              icon={<Clock className="h-5 w-5 text-teal-500" />}
              label="Time saved"
              value={formatDuration(stats.hoursOnCalls)}
              delta={stats.deltas?.hoursOnCalls}
            />
            <KpiCard
              icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
              label="Money saved"
              value={`R${Math.round(stats.hoursOnCalls * HOURLY_RATE).toLocaleString()}`}
            />
          </div>

          {/* Value KPIs */}
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
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

          {/* Charts row */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Pie chart - Success vs Failed */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-display text-sm font-semibold text-slate-900">
                Call outcomes
              </h3>
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
                          cx="50%"
                          cy="50%"
                          innerRadius={72}
                          outerRadius={110}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {[
                            { name: "Successful", value: stats.successfulCalls, color: CHART_COLORS.success },
                            { name: "Failed", value: stats.unsuccessfulCalls, color: CHART_COLORS.failed },
                          ].map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [value, "Calls"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-slate-900">{stats.callsMade}</span>
                      <span className="text-xs text-slate-500">total calls</span>
                      {stats.deltas?.callsMade != null && (
                        <span
                          className={`mt-1 text-xs font-medium ${
                            stats.deltas.callsMade > 0 ? "text-emerald-600" : stats.deltas.callsMade < 0 ? "text-red-600" : "text-slate-500"
                          }`}
                        >
                          {stats.deltas.callsMade > 0 ? "+" : ""}{stats.deltas.callsMade}%
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    No call data yet
                  </div>
                )}
              </div>
            </div>

            {/* Minutes by day */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm overflow-x-auto">
              <h3 className="mb-4 font-display text-sm font-semibold text-slate-900">
                Minutes by day
              </h3>
              <div className="h-64 min-w-[400px]" style={{ minWidth: Math.max(400, (stats.minutesByDay?.length ?? 0) * 36) }}>
                {stats.minutesByDay?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.minutesByDay}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                        formatter={(value: number) => [Math.round(value), "Minutes"]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Bar dataKey="minutes" fill={CHART_COLORS.bar} radius={[4, 4, 0, 0]} name="minutes">
                        <LabelList dataKey="minutes" position="top" formatter={(v: number) => (v > 0 ? Math.round(v) : "")} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    No call data yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Calls by day - stacked bar */}
          <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm overflow-x-auto">
            <h3 className="mb-4 font-display text-sm font-semibold text-slate-900">
              Calls by day
            </h3>
            <div className="h-64 min-w-[400px]" style={{ minWidth: Math.max(400, (stats.callsByDay?.length ?? 0) * 36) }}>
              {stats.callsByDay?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.callsByDay}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                      formatter={(value: number, name: string) => [value, name === "successful" ? "Successful" : "Failed"]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
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
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No call data by day yet
                </div>
              )}
            </div>
          </div>

          {/* Recent projects */}
          <div>
            <h2 className="mb-4 font-display text-lg font-semibold text-slate-900">
              Recent projects
            </h2>
            <div className="space-y-2">
              {projects.slice(0, 5).map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/projects/${p.id}`}
                  className="block rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-teal-200 hover:bg-teal-50/30"
                >
                  <span className="font-medium text-slate-900">{p.name}</span>
                  <span className="ml-2 text-sm text-slate-500">({p.status})</span>
                </Link>
              ))}
              {projects.length === 0 && (
                <p className="text-sm text-slate-500">No projects yet.</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function PeriodButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-teal-600 text-white"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function KpiCard({
  icon,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  delta?: number | null;
}) {
  const showDelta = delta !== null && delta !== undefined;
  const isPositive = showDelta && delta > 0;
  const isNegative = showDelta && delta < 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-slate-500">{icon}</span>
        {showDelta && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              isPositive ? "text-emerald-600" : isNegative ? "text-red-600" : "text-slate-500"
            }`}
          >
            {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : isNegative ? <TrendingDown className="h-3.5 w-3.5" /> : null}
            {isPositive ? "+" : ""}
            {delta}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
