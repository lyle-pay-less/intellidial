import { NextRequest, NextResponse } from "next/server";
import { duplicateProject } from "@/lib/data/store";
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
  const project = await duplicateProject(id, org.orgId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}
