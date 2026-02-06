"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  FileText,
  Filter,
  Check,
  ChevronDown,
  ExternalLink,
  Calendar,
  Clock,
  User,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import type { NotificationDoc } from "@/lib/firebase/types";

type NotificationType = NotificationDoc["type"];

const TYPE_CONFIG: Record<
  NotificationType,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  call_completed: {
    label: "Call Completed",
    icon: CheckCircle,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200",
  },
  call_failed: {
    label: "Call Failed",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
  },
  data_missing: {
    label: "Data Missing",
    icon: AlertCircle,
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200",
  },
  project_complete: {
    label: "Project Complete",
    icon: CheckCircle,
    color: "text-teal-600",
    bgColor: "bg-teal-50 border-teal-200",
  },
  usage_warning: {
    label: "Usage Warning",
    icon: AlertCircle,
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
  },
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Array<NotificationDoc & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<NotificationType | "all">("all");
  const [filterRead, setFilterRead] = useState<"all" | "unread" | "read">("all");
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) fetchNotifications();
  }, [user?.uid, filterType, filterRead]);

  const fetchNotifications = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("type", filterType);
      if (filterRead === "unread") params.set("read", "false");
      if (filterRead === "read") params.set("read", "true");

      const res = await fetch(`/api/notifications?${params}`, {
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

  const handleMarkRead = async (notificationId: string) => {
    if (!user?.uid) return;
    setMarkingRead(notificationId);
    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: { "x-user-id": user.uid },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n))
        );
      }
    } finally {
      setMarkingRead(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.uid) return;
    try {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { "x-user-id": user.uid },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
        );
      }
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const selected = notifications.find((n) => n.id === selectedNotification);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-teal-600" />
          <h1 className="font-display text-2xl font-bold text-slate-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Check className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Filter:</span>
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as NotificationType | "all")}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
        >
          <option value="all">All types</option>
          {(Object.keys(TYPE_CONFIG) as NotificationType[]).map((type) => (
            <option key={type} value={type}>
              {TYPE_CONFIG[type].label}
            </option>
          ))}
        </select>
        <select
          value={filterRead}
          onChange={(e) => setFilterRead(e.target.value as "all" | "unread" | "read")}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
        >
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Notifications List */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 text-sm font-medium text-slate-900">No notifications</p>
                <p className="mt-1 text-sm text-slate-500">
                  {filterType !== "all" || filterRead !== "all"
                    ? "Try adjusting your filters"
                    : "You're all caught up!"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => {
                  const config = TYPE_CONFIG[notification.type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={notification.id}
                      className={`cursor-pointer transition-colors ${
                        selectedNotification === notification.id
                          ? "bg-teal-50"
                          : notification.read
                            ? "bg-white hover:bg-slate-50"
                            : "bg-blue-50/50 hover:bg-blue-50"
                      }`}
                      onClick={() => {
                        setSelectedNotification(notification.id);
                        if (!notification.read) {
                          handleMarkRead(notification.id);
                        }
                      }}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${config.bgColor}`}
                          >
                            <Icon className={`h-5 w-5 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{notification.message}</p>
                                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatTimeAgo(notification.createdAt)}
                                  </span>
                                  {notification.metadata?.projectName && (
                                    <span className="flex items-center gap-1">
                                      <FileText className="h-3 w-3" />
                                      {notification.metadata.projectName}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {!notification.read && (
                                <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Raw Data Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Details</h2>
            {selected ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-medium text-slate-500 uppercase">Type</h3>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {TYPE_CONFIG[selected.type].label}
                  </p>
                </div>
                {selected.metadata && (
                  <>
                    {selected.metadata.contactName && (
                      <div>
                        <h3 className="text-xs font-medium text-slate-500 uppercase">Contact</h3>
                        <p className="mt-1 text-sm text-slate-900">{selected.metadata.contactName}</p>
                        <p className="text-xs text-slate-500">{selected.metadata.contactPhone}</p>
                      </div>
                    )}
                    {selected.metadata.durationSeconds !== undefined && (
                      <div>
                        <h3 className="text-xs font-medium text-slate-500 uppercase">Duration</h3>
                        <p className="mt-1 text-sm text-slate-900">
                          {Math.floor(selected.metadata.durationSeconds / 60)}m {selected.metadata.durationSeconds % 60}s
                        </p>
                      </div>
                    )}
                    {selected.metadata.failureReason && (
                      <div>
                        <h3 className="text-xs font-medium text-slate-500 uppercase">Failure Reason</h3>
                        <p className="mt-1 text-sm text-slate-900">{selected.metadata.failureReason}</p>
                      </div>
                    )}
                    {selected.metadata.missingFields && selected.metadata.missingFields.length > 0 && (
                      <div>
                        <h3 className="text-xs font-medium text-slate-500 uppercase">Missing Fields</h3>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selected.metadata.missingFields.map((field) => (
                            <span
                              key={field}
                              className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                            >
                              {field}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selected.metadata.capturedData && Object.keys(selected.metadata.capturedData).length > 0 && (
                      <div>
                        <h3 className="text-xs font-medium text-slate-500 uppercase">Captured Data</h3>
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <pre className="text-xs text-slate-700 whitespace-pre-wrap">
                            {JSON.stringify(selected.metadata.capturedData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    {selected.metadata.transcript && (
                      <div>
                        <h3 className="text-xs font-medium text-slate-500 uppercase">Transcript</h3>
                        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs text-slate-700">{selected.metadata.transcript}</p>
                        </div>
                      </div>
                    )}
                    {selected.metadata.recordingUrl && (
                      <div>
                        <h3 className="text-xs font-medium text-slate-500 uppercase">Recording</h3>
                        <a
                          href={selected.metadata.recordingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Listen to recording
                        </a>
                      </div>
                    )}
                    {selected.metadata.projectId && (
                      <div>
                        <Link
                          href={`/dashboard/projects/${selected.metadata.projectId}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
                        >
                          View project
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </>
                )}
                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">Raw Data</h3>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap">
                      {JSON.stringify(selected, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select a notification to view details</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
