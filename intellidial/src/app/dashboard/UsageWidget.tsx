"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

type Usage = { callsUsed: number; callsLimit: number | null; minutesUsed: number; minutesLimit: number | null };

export function UsageWidget() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    fetch("/api/dashboard/stats", { headers: { "x-user-id": user.uid } })
      .then((r) => r.json())
      .then((d) => setUsage(d.usage ?? { callsUsed: 0, callsLimit: null, minutesUsed: 0, minutesLimit: null }))
      .catch(() => setUsage({ callsUsed: 0, callsLimit: null, minutesUsed: 0, minutesLimit: null }));
  }, [user?.uid]);

  if (usage === null) return null;

  const callsUsed = usage.callsUsed ?? 0;
  const callsLimit = usage.callsLimit ?? null;
  const percent = callsLimit != null && callsLimit > 0 ? Math.min(100, (callsUsed / callsLimit) * 100) : 0;
  const nearLimit = callsLimit != null && callsLimit > 0 && percent >= 80;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
      <p className="text-xs font-medium text-slate-700">Calls used</p>
      <p className="text-sm font-bold text-slate-900">
        {callsUsed} / {callsLimit != null ? callsLimit : "Unlimited"}
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
