import Link from "next/link";
import { Phone, LayoutDashboard, FolderOpen, Users, Settings } from "lucide-react";
import { DashboardGuard } from "./DashboardGuard";
import { UserMenu } from "./UserMenu";
import { UsageWidget } from "./UsageWidget";
import { NotificationBell } from "./NotificationBell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-500/20">
              <Phone className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold text-slate-900">
              Intellidial
            </span>
          </Link>
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
      <main className="pl-56">{children}</main>
    </div>
    </DashboardGuard>
  );
}
