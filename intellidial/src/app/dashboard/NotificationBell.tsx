"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-slate-500" />
        Notifications
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 z-50 mb-1 rounded-lg border border-slate-200 bg-white py-2 shadow-lg">
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            No notifications yet.
          </div>
          <p className="border-t border-slate-100 px-4 pt-2 text-xs text-slate-400">
            Email when project completes — coming soon.
          </p>
        </div>
      )}
    </div>
  );
}
