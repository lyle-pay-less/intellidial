import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/data/store";
import { getOrgFromRequest } from "../getOrgFromRequest";

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
  return NextResponse.json(project);
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
  const project = await getProject(id, org.orgId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const body = await req.json();
  const updated = await updateProject(id, {
    name: body?.name,
    description: body?.description,
    industry: body?.industry,
    tone: body?.tone,
    goal: body?.goal,
    agentQuestions: body?.agentQuestions,
    captureFields: body?.captureFields,
    agentInstructions: body?.agentInstructions,
    status: body?.status,
    notifyOnComplete: body?.notifyOnComplete,
    surveyEnabled: body?.surveyEnabled,
    callWindowStart: body?.callWindowStart,
    callWindowEnd: body?.callWindowEnd,
  });
  return NextResponse.json(updated);
}
