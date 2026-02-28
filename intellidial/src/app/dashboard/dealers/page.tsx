"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Car, Plus, Loader2, ArrowRight, Calendar, Trash2 } from "lucide-react";
import Link from "next/link";
import { IntelliDialLoader } from "@/app/components/IntelliDialLoader";

type Dealer = {
  id: string;
  name: string;
  address?: string | null;
  phoneNumber?: string | null;
  operationHours?: string | null;
  email?: string | null;
  contextLinks?: Array<{ url: string; label?: string | null }> | null;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  if (diffDays === 0) return "Today · " + dateStr;
  if (diffDays === 1) return "Yesterday · " + dateStr;
  return dateStr;
}

export default function DealersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Dealer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDealers = async () => {
    if (!user?.uid) return;
    const res = await fetch("/api/dealers", { headers: { "x-user-id": user.uid } });
    const data = await res.json();
    setDealers(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    fetchDealers().finally(() => setLoading(false));
  }, [user?.uid]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/dealers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user?.uid ? { "x-user-id": user.uid } : {}),
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      setShowModal(false);
      setName("");
      router.push(`/dashboard/dealers/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !user?.uid) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/dealers/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "x-user-id": user.uid },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete");
      }
      setDeleteTarget(null);
      await fetchDealers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Dealers
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage dealer setups — name, address, hours, and context links
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:bg-teal-700 hover:shadow-teal-500/30"
        >
          <Plus className="h-4 w-4" />
          Add dealer
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px] w-full">
          <IntelliDialLoader />
        </div>
      ) : dealers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white p-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100">
            <Car className="h-7 w-7 text-teal-600" />
          </div>
          <p className="text-slate-600 font-medium">No dealers yet</p>
          <p className="mt-1 text-sm text-slate-500">Add a dealer to set up their details and context links</p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Add dealer
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {dealers.map((d) => (
            <div
              key={d.id}
              className="group relative flex flex-col gap-4 rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-teal-200 hover:shadow-md"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeleteTarget(d);
                }}
                className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Delete dealer"
                aria-label={`Delete ${d.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <Link
                href={`/dashboard/dealers/${d.id}`}
                className="flex flex-col gap-4 min-w-0 -m-5 p-5 rounded-2xl"
              >
                <div className="min-w-0 flex-1 pr-8">
                  <h2 className="font-semibold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                    {d.name}
                  </h2>
                  {(d.address || d.phoneNumber) && (
                    <p className="mt-1 text-sm text-slate-500 truncate">
                      {[d.address, d.phoneNumber].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(d.updatedAt)}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-teal-600 opacity-0 transition-opacity group-hover:opacity-100">
                    Open
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => { if (!deleting) { setDeleteTarget(null); setError(null); } }}
            aria-hidden
          />
          <div
            className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 font-display text-lg font-semibold text-slate-900">
              Delete dealer?
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              Delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { if (!deleting) { setDeleteTarget(null); setError(null); } }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-70"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
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
              Add dealer
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <div>
                <label htmlFor="dealer-name" className="block text-sm font-medium text-slate-700 mb-1">
                  Dealer name
                </label>
                <input
                  id="dealer-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bargain Auto"
                  required
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
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
                    "Add dealer"
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
