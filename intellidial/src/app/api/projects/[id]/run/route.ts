import { NextRequest, NextResponse } from "next/server";
import { getProject, runProjectSimulation } from "@/lib/data/store";
import { getOrgFromRequest } from "../../getOrgFromRequest";

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

  let contactIds: string[] | undefined;
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (Array.isArray(body?.contactIds) && body.contactIds.length > 0) {
      contactIds = body.contactIds;
    }
  } catch {
    // no body or invalid
  }

  const { updated } = await runProjectSimulation(id, contactIds);
  return NextResponse.json({ updated, status: "completed" });
}
