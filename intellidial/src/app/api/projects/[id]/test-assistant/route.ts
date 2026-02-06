import { NextRequest, NextResponse } from "next/server";
import { getVapiHeaders, createOrUpdateAssistant } from "@/lib/vapi/client";
import { getProject, updateProject } from "@/lib/data/store";
import { getOrgFromRequest } from "../../getOrgFromRequest";
import type { ProjectForVapi } from "@/lib/vapi/client";

/**
 * GET /api/projects/[id]/test-assistant
 * Returns VAPI assistant ID + public key for testing the project's agent.
 * Creates/updates the assistant if needed, then returns credentials for web SDK.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  try {
    // Get project
    const project = await getProject(projectId, org.orgId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if project has required fields for assistant
    if (!project.agentInstructions?.trim()) {
      return NextResponse.json(
        { error: "Project instructions not configured. Please save instructions first." },
        { status: 400 }
      );
    }

    // Build project for VAPI
    const projectForVapi: ProjectForVapi = {
      id: project.id,
      name: project.name,
      agentName: project.agentName,
      agentCompany: project.agentCompany,
      agentNumber: project.agentNumber,
      agentVoice: project.agentVoice,
      userGoal: project.userGoal,
      agentInstructions: project.agentInstructions,
      goal: project.goal,
      tone: project.tone,
      agentQuestions: project.agentQuestions,
      captureFields: project.captureFields,
      assistantId: project.assistantId,
      structuredOutputId: project.structuredOutputId,
    };

    // Create or update assistant
    const assistantId = await createOrUpdateAssistant(projectForVapi);

    // Save assistantId back to project if it's new
    if (!project.assistantId || project.assistantId !== assistantId) {
      await updateProject(projectId, { assistantId });
    }

    // Get public key from env
    const rawPublicKey = process.env.VAPI_PUBLIC_KEY?.trim();
    if (!rawPublicKey) {
      return NextResponse.json(
        { error: "VAPI_PUBLIC_KEY not configured" },
        { status: 503 }
      );
    }

    return NextResponse.json({
      assistantId,
      publicKey: rawPublicKey,
      projectName: project.name,
    });
  } catch (err) {
    console.error("[test-assistant] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to get test assistant";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
