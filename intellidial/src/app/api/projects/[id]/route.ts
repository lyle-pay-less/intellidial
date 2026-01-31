import { NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/data/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const body = await request.json();
  const updated = updateProject(id, {
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
