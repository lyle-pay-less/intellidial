"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard, FolderOpen, Users, Settings, Building2 } from "lucide-react";
import { DashboardGuard } from "./DashboardGuard";
import { UserMenu } from "./UserMenu";
import { UsageWidget } from "./UsageWidget";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/lib/auth/AuthContext";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [orgName, setOrgName] = useState<string | null>(null);
  const [credentialsBanner, setCredentialsBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      console.log("[Dashboard Layout] No user UID, skipping org fetch");
      return;
    }

    console.log("[Dashboard Layout] Fetching organization for userId:", user.uid);

    fetch("/api/auth/organization", {
      headers: {
        "x-user-id": user.uid,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("[Dashboard Layout] Organization API response:", data);
        if (data.hasOrganization && data.organization) {
          console.log("[Dashboard Layout] Setting org name:", data.organization.name);
          setOrgName(data.organization.name);
          setCredentialsBanner(null);
        } else {
          console.warn("[Dashboard Layout] No organization found for user");
          if (data.credentialsExpired && data.credentialsHelp) {
            setCredentialsBanner(data.credentialsHelp);
          } else {
            setCredentialsBanner(null);
          }
        }
      })
      .catch((err) => {
        console.error("[Dashboard Layout] Failed to fetch organization", err);
        setCredentialsBanner(null);
      });
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 mb-2">
            <img 
              src="/intellidial-logo.png" 
              alt="Intellidial" 
              className="h-9 w-9 object-contain"
            />
            <span className="font-display text-lg font-bold text-slate-900">
              Intelli<span className="text-teal-600">dial</span>
            </span>
          </Link>
          {orgName && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span className="text-xs font-medium text-slate-700 truncate" title={orgName}>
                {orgName}
              </span>
            </div>
          )}
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-700"
          >
            <LayoutDashboard className="h-5 w-5 text-slate-500" />
            Dashboard
          </Link>
          <Link
            href="/dashboard/projects"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-700"
          >
            <FolderOpen className="h-5 w-5 text-slate-500" />
            Projects
          </Link>
          <Link
            href="/dashboard/team"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-700"
          >
            <Users className="h-5 w-5 text-slate-500" />
            Team
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-700"
          >
            <Settings className="h-5 w-5 text-slate-500" />
            Settings
          </Link>
        </nav>
        <div className="border-t border-slate-100 p-3 space-y-3">
          <UsageWidget />
          <NotificationBell />
          <UserMenu />
        </div>
      </aside>

      {/* Main content */}
      <main className="pl-56">
        {credentialsBanner && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-900">
            <strong>Local dev:</strong> Firebase credentials need re-auth. In a terminal run:{" "}
            <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">{credentialsBanner}</code>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardGuard>
  );
}
