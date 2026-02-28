import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject, deleteProject } from "@/lib/data/store";
import { getOrgFromRequest } from "../getOrgFromRequest";
import { getSystemPromptDefaults } from "@/lib/vapi/client";

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
  const defaults = getSystemPromptDefaults();
  return NextResponse.json({
    ...project,
    effectiveCallContextInstructions: project.callContextInstructions ?? defaults.callContext,
    effectiveIdentityInstructions: project.identityInstructions ?? defaults.identity,
    effectiveEndingCallInstructions: project.endingCallInstructions ?? defaults.endingCall,
    effectiveComplianceInstructions: project.complianceInstructions ?? defaults.compliance,
    effectiveVoiceOutputInstructions: project.voiceOutputInstructions ?? defaults.voiceOutput,
    effectiveVehiclePlaceholderInstructions: project.vehiclePlaceholderInstructions ?? defaults.vehiclePlaceholder,
    effectiveSchedulingInstructions: project.schedulingInstructions ?? defaults.scheduling,
    effectiveVehicleContextHeaderInstructions: project.vehicleContextHeaderInstructions ?? defaults.vehicleContextHeader,
    effectiveVehicleReferenceInstructions: project.vehicleReferenceInstructions ?? defaults.vehicleReference,
    effectiveVehicleIntroInstructions: project.vehicleIntroInstructions ?? defaults.vehicleIntro,
    effectiveBusinessContextHeaderInstructions: project.businessContextHeaderInstructions ?? defaults.businessContextHeader,
  });
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
  const body = (await req.json()) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  // Only pass defined fields so we don't overwrite with undefined in Firestore
  const updates: Record<string, unknown> = {};
  const keys = [
    "schedulingInstructions", "vehicleContextHeaderInstructions", "vehicleReferenceInstructions", "vehicleIntroInstructions", "businessContextHeaderInstructions",
    "name", "description", "agentName", "agentCompany", "agentNumber", "agentPhoneNumberId", "agentVoice", "userGoal",
    "industry", "tone", "goal", "agentQuestions", "captureFields", "businessContext", "agentInstructions",
    "status", "notifyOnComplete", "surveyEnabled", "callWindowStart", "callWindowEnd", "googleSheetId",
    "dealershipEnabled", "vehicleListingUrl", "vehicleContextFullText", "vehicleContextUpdatedAt",
    "callContextInstructions", "identityInstructions", "endingCallInstructions", "complianceInstructions", "voiceOutputInstructions", "vehiclePlaceholderInstructions",
    "name", "description", "agentName", "agentCompany", "agentNumber", "agentPhoneNumberId", "agentVoice", "userGoal",
    "industry", "tone", "goal", "agentQuestions", "captureFields", "businessContext", "agentInstructions",
    "status", "notifyOnComplete", "surveyEnabled", "callWindowStart", "callWindowEnd", "googleSheetId",
    "dealershipEnabled", "vehicleListingUrl", "vehicleContextFullText", "vehicleContextUpdatedAt",
    "callContextInstructions", "identityInstructions", "endingCallInstructions", "complianceInstructions", "voiceOutputInstructions", "vehiclePlaceholderInstructions",
    "name", "description", "agentName", "agentCompany", "agentNumber", "agentPhoneNumberId", "agentVoice", "userGoal",
    "industry", "tone", "goal", "agentQuestions", "captureFields", "businessContext", "agentInstructions",
    "status", "notifyOnComplete", "surveyEnabled", "callWindowStart", "callWindowEnd", "googleSheetId",
    "dealershipEnabled", "vehicleListingUrl", "vehicleContextFullText", "vehicleContextUpdatedAt",
    "callContextInstructions", "identityInstructions", "endingCallInstructions", "complianceInstructions", "voiceOutputInstructions", "vehiclePlaceholderInstructions",
    "isDealerProject", "dealerId",
  ] as const;
  for (const key of keys) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  try {
    const updated = await updateProject(id, updates as Parameters<typeof updateProject>[1]);
    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[API] PATCH /api/projects/[id] updateProject failed:", e);
    const message = e instanceof Error ? e.message : "Failed to save project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deleteProject(id, org.orgId);
  if (!ok) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
