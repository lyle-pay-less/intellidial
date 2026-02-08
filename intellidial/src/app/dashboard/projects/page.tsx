"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { FolderOpen, Plus, Loader2, ArrowRight, Calendar, User } from "lucide-react";
import Link from "next/link";
import { IntelliDialLoader } from "@/app/components/IntelliDialLoader";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  industry?: string | null;
  status: string;
  /** Agent identity name (voice agent) — shown on card when set */
  agentName?: string | null;
  /** Agent avatar/picture URL — shown on card when set */
  agentImageUrl?: string | null;
  /** Agent identity name (voice agent) — shown on card when set */
  agentName?: string | null;
  /** Agent avatar/picture URL — shown on card when set */
  agentImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

function formatProjectDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  if (diffDays === 0) return "Today · " + dateStr;
  if (diffDays === 1) return "Yesterday · " + dateStr;
  return dateStr;
}

function industryLabel(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  return value.trim().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    if (!user?.uid) return;
    const res = await fetch("/api/projects", { headers: { "x-user-id": user.uid } });
    const data = await res.json();
    setProjects(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    fetchProjects().finally(() => setLoading(false));
  }, [user?.uid]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user?.uid ? { "x-user-id": user.uid } : {}),
        },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      setShowModal(false);
      setName("");
      setDescription("");
      router.push(`/dashboard/projects/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Projects
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your calling campaigns and view results
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:bg-teal-700 hover:shadow-teal-500/30"
        >
          <Plus className="h-4 w-4" />
          New project
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px] w-full">
          <IntelliDialLoader />
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white p-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100">
            <FolderOpen className="h-7 w-7 text-teal-600" />
          </div>
          <p className="text-slate-600 font-medium">No projects yet</p>
          <p className="mt-1 text-sm text-slate-500">Create your first project to start calling campaigns</p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Create project
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/projects/${p.id}`}
              className="group flex gap-4 rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-teal-200 hover:shadow-md"
            >
              {/* Agent picture: use image when set, otherwise placeholder */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200/80">
                  {p.agentImageUrl ? (
                    <img
                      src={p.agentImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                      {p.name}
                    </h2>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        p.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : p.status === "running"
                            ? "bg-amber-100 text-amber-700"
                            : p.status === "paused"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {p.agentName ? (
                      <span className="text-slate-600">{p.agentName}</span>
                    ) : (
                      industryLabel(p.industry)
                    )}
                  </p>
                </div>
              <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatProjectDate(p.updatedAt)}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-teal-600 opacity-0 transition-opacity group-hover:opacity-100">
                  Open
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => !creating && setShowModal(false)}
            aria-hidden
          />
          <div
            className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 font-display text-lg font-semibold text-slate-900">
              New project
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q1 Restaurant Outreach"
                  required
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => !creating && setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-70"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
