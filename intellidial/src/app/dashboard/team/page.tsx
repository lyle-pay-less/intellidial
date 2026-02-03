"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  Users,
  Mail,
  Shield,
  Eye,
  Trash2,
  UserPlus,
  Check,
  X,
  MoreVertical,
  Crown,
} from "lucide-react";

type UserRole = "owner" | "admin" | "operator" | "viewer";

type TeamMember = {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  status: "active" | "invited";
  invitedAt?: string;
  lastActive?: string;
};

function formatLastActive(value: string | undefined): string {
  if (!value) return "—";
  if (value === "Just now" || value.toLowerCase().includes("just")) return "Just now";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return value;
  }
}

const ROLE_CONFIG: Record<
  UserRole,
  { label: string; icon: React.ElementType; color: string; description: string }
> = {
  owner: {
    label: "Owner",
    icon: Crown,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    description: "Full access including billing and team management",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    color: "text-purple-600 bg-purple-50 border-purple-200",
    description: "Manage projects, contacts, and view all data",
  },
  operator: {
    label: "Operator",
    icon: Users,
    color: "text-teal-600 bg-teal-50 border-teal-200",
    description: "Run projects, manage contacts, view assigned projects",
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    color: "text-slate-600 bg-slate-50 border-slate-200",
    description: "View-only access to projects and results",
  },
};

export default function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("operator");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRoleMenu, setShowRoleMenu] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) fetchTeam();
    else setLoading(false);
  }, [user?.uid]);

  const fetchTeam = async () => {
    if (!user?.uid) return;
    try {
      const res = await fetch("/api/team", {
        headers: {
          "x-user-id": user.uid,
          ...(user.email ? { "x-user-email": user.email } : {}),
          ...(user.displayName ? { "x-user-display-name": user.displayName } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user?.uid ? { "x-user-id": user.uid } : {}),
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send invite");
      }

      setSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      fetchTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: UserRole) => {
    if (!user?.uid) return;
    try {
      const res = await fetch(`/api/team/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.uid,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        fetchTeam();
        setShowRoleMenu(null);
      }
    } catch (err) {
      console.error("Failed to update role", err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Remove this team member?")) return;
    if (!user?.uid) return;

    try {
      const res = await fetch(`/api/team/${memberId}`, {
        method: "DELETE",
        headers: { "x-user-id": user.uid },
      });
      if (res.ok) fetchTeam();
    } catch (err) {
      console.error("Failed to remove member", err);
    }
  };

  const handleResendInvite = async (memberId: string) => {
    if (!user?.uid) return;
    try {
      await fetch(`/api/team/${memberId}/resend`, {
        method: "POST",
        headers: { "x-user-id": user.uid },
      });
      setSuccess("Invite resent");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error("Failed to resend invite", err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="mb-8 flex items-center gap-2">
          <Users className="h-6 w-6 text-teal-600" />
          <h1 className="font-display text-2xl font-bold text-slate-900">Team</h1>
        </div>
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  const activeMembers = members.filter((m) => m.status === "active");
  const pendingInvites = members.filter((m) => m.status === "invited");

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-teal-600" />
          <h1 className="font-display text-2xl font-bold text-slate-900">Team</h1>
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {activeMembers.length} member{activeMembers.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Success/Error messages */}
      {success && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Check className="h-4 w-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <X className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Invite form */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-teal-600" />
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Invite team member
          </h2>
        </div>
        <form onSubmit={handleInvite} className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Email address
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              required
            />
          </div>
          <div className="w-full md:w-48">
            <label className="mb-1 block text-xs font-medium text-slate-700">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
            >
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 hover:bg-teal-700 disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              {inviting ? "Sending..." : "Send invite"}
            </button>
          </div>
        </form>
      </div>

      {/* Role descriptions */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => {
          const config = ROLE_CONFIG[role];
          const Icon = config.icon;
          return (
            <div
              key={role}
              className={`rounded-xl border p-4 ${config.color}`}
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="text-sm font-semibold">{config.label}</span>
              </div>
              <p className="text-xs opacity-80">{config.description}</p>
            </div>
          );
        })}
      </div>

      {/* Active members */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Active members
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-500">
                <th className="px-6 py-3">Member</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Last active</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                    No active members yet. Invite your first team member above.
                  </td>
                </tr>
              ) : (
                activeMembers.map((member) => {
                  const config = ROLE_CONFIG[member.role];
                  const Icon = config.icon;
                  const isOwner = member.role === "owner";
                  return (
                    <tr
                      key={member.id}
                      className="border-b border-slate-50 hover:bg-slate-50/50"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {member.name || member.email}
                          </p>
                          {member.name && (
                            <p className="text-xs text-slate-500">{member.email}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative inline-block">
                          <button
                            onClick={() =>
                              !isOwner && setShowRoleMenu(showRoleMenu === member.id ? null : member.id)
                            }
                            disabled={isOwner}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${config.color} ${
                              isOwner ? "cursor-not-allowed" : "hover:opacity-80"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {config.label}
                          </button>
                          {showRoleMenu === member.id && (
                            <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                              {(Object.keys(ROLE_CONFIG) as UserRole[])
                                .filter((r) => r !== "owner" && r !== member.role)
                                .map((role) => {
                                  const roleConfig = ROLE_CONFIG[role];
                                  const RoleIcon = roleConfig.icon;
                                  return (
                                    <button
                                      key={role}
                                      onClick={() => handleUpdateRole(member.id, role)}
                                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                      <RoleIcon className="h-4 w-4" />
                                      {roleConfig.label}
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatLastActive(member.lastActive)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isOwner ? (
                          <span className="text-xs text-slate-400">Full access</span>
                        ) : (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            aria-label="Remove member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Pending invites
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-500">
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Invited</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvites.map((invite) => {
                  const config = ROLE_CONFIG[invite.role];
                  const Icon = config.icon;
                  return (
                    <tr
                      key={invite.id}
                      className="border-b border-slate-50 hover:bg-slate-50/50"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-900">
                          {invite.email}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${config.color}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {invite.invitedAt || "Recently"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResendInvite(invite.id)}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-teal-600 hover:bg-teal-50"
                          >
                            Resend
                          </button>
                          <button
                            onClick={() => handleRemoveMember(invite.id)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            aria-label="Cancel invite"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
