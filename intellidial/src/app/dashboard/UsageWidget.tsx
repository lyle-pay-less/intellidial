"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

const MOCK_LIMIT = 1000; // Placeholder until tiers exist

export function UsageWidget() {
  const { user } = useAuth();
  const [callsMade, setCallsMade] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    fetch("/api/dashboard/stats", { headers: { "x-user-id": user.uid } })
      .then((r) => r.json())
      .then((d) => setCallsMade(d.callsMade ?? 0))
      .catch(() => setCallsMade(0));
  }, [user?.uid]);

  if (callsMade === null) return null;

  const percent = Math.min(100, (callsMade / MOCK_LIMIT) * 100);
  const nearLimit = percent >= 80;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
      <p className="text-xs font-medium text-slate-700">Calls used</p>
      <p className="text-sm font-bold text-slate-900">
        {callsMade} / {MOCK_LIMIT}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${
            nearLimit ? "bg-amber-500" : "bg-teal-500"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <Link
        href="/dashboard/settings"
        className="mt-2 flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
      >
        <Zap className="h-3 w-3" />
        Upgrade
      </Link>
    </div>
  );
}
