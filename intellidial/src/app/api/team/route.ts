import { NextResponse } from "next/server";

type TeamMember = {
  id: string;
  email: string;
  name?: string;
  role: "owner" | "admin" | "operator" | "viewer";
  status: "active" | "invited";
  invitedAt?: string;
  lastActive?: string;
};

// Mock team data — replace with Firestore later
const mockTeam: TeamMember[] = [
  {
    id: "user-1",
    email: "dev@intellidial.com",
    name: "Dev User",
    role: "owner",
    status: "active",
    lastActive: "Just now",
  },
  {
    id: "user-2",
    email: "operator@intellidial.com",
    name: "John Operator",
    role: "operator",
    status: "active",
    lastActive: "2 hours ago",
  },
  {
    id: "invite-1",
    email: "pending@example.com",
    role: "viewer",
    status: "invited",
    invitedAt: "3 days ago",
  },
];

export async function GET() {
  return NextResponse.json({ members: mockTeam });
}
