import { NextRequest, NextResponse } from "next/server";
import { getProject, getProjectQueue, setProjectQueue } from "@/lib/data/store";
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
  if (!id) {
    return NextResponse.json({ error: "Missing project id" }, { status: 400 });
  }
  const project = await getProject(id, org.orgId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const contactIds = getProjectQueue(id);
  return NextResponse.json({ contactIds });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing project id" }, { status: 400 });
  }
  const project = await getProject(id, org.orgId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const contactIds = body?.contactIds as string[] | undefined;
  const add = body?.add !== false;
  const scheduledTimes = body?.scheduledTimes as Array<{ contactId: string; scheduledTime: string | null }> | undefined;
  if (!Array.isArray(contactIds)) {
    return NextResponse.json(
      { error: "contactIds array is required" },
      { status: 400 }
    );
  }
  setProjectQueue(id, contactIds, add, scheduledTimes);
  const updated = getProjectQueue(id);
  return NextResponse.json({ contactIds: updated });
}
