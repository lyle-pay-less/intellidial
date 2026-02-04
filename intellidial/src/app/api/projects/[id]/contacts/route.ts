import { NextRequest, NextResponse } from "next/server";
import { getProject, listContacts, createContacts } from "@/lib/data/store";
import { getOrgFromRequest } from "../../getOrgFromRequest";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }
  const { id } = await params;
  const project = await getProject(id, org.orgId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10))
  );
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));
  const status = searchParams.get("status") as "all" | "pending" | "success" | "failed" | "calling" | null;
  const statusFilter = status && ["all", "pending", "success", "failed", "calling"].includes(status) ? status : undefined;

  const { contacts: contactList, total } = await listContacts(id, { limit, offset, status: statusFilter });
  return NextResponse.json({ contacts: contactList, total, limit, offset });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }
  const { id } = await params;
  const project = await getProject(id, org.orgId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const items = body?.contacts as Array<{ phone: string; name?: string }>;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "contacts array is required" },
      { status: 400 }
    );
  }

  const created = await createContacts(id, items);
  return NextResponse.json({ created: created.length, contacts: created });
}
