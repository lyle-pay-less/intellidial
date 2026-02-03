import { NextRequest, NextResponse } from "next/server";
import { listProjects, createProject, getUserOrganization, ensureDemoDataForOrg } from "@/lib/data/store";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }
  const orgId = await getUserOrganization(userId);
  if (!orgId) {
    return NextResponse.json([]);
  }
  await ensureDemoDataForOrg(orgId);
  const projectsList = await listProjects(orgId);
  return NextResponse.json(projectsList);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }
  const orgId = await getUserOrganization(userId);
  if (!orgId) {
    return NextResponse.json({ error: "Not part of an organization" }, { status: 403 });
  }
  const body = await req.json();
  const name = body?.name as string;
  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }
  const project = await createProject({
    name: name.trim(),
    description: body?.description?.trim() || undefined,
    orgId,
  });
  return NextResponse.json(project);
}
