"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Bell } from "lucide-react";
import Link from "next/link";
import type { NotificationDoc } from "@/lib/firebase/types";

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<NotificationDoc & { id: string }>>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.uid && open) {
      fetchNotifications();
    }
  }, [user?.uid, open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=5&read=false", {
        headers: { "x-user-id": user.uid },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <Link
        href="/dashboard/notifications"
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 relative"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-slate-500" />
        <span>Notifications</span>
        {unreadCount > 0 && (
          <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white min-w-[20px] text-center">
            {unreadCount}
          </span>
        )}
      </Link>
    </div>
  );
}
