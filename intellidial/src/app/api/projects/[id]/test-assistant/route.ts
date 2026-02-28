import { NextRequest, NextResponse } from "next/server";
import { getVapiHeaders, createOrUpdateAssistant, enrichBusinessContextWithDealer } from "@/lib/vapi/client";
import { getProject, getDealer, updateProject } from "@/lib/data/store";
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

    // When project is linked to a dealer, inject dealer contact details so the agent can give address, phone, email, hours
    let businessContext = project.businessContext ?? undefined;
    if (project.dealerId && project.orgId) {
      const dealer = await getDealer(project.dealerId, project.orgId);
      if (dealer) {
        businessContext = enrichBusinessContextWithDealer(project.businessContext, dealer);
      }
    }

    // Build project for VAPI (same config as real calls, including business context)
    const projectForVapi: ProjectForVapi = {
      id: project.id,
      name: project.name,
      agentName: project.agentName,
      agentCompany: project.agentCompany,
      agentNumber: project.agentNumber,
      agentVoice: project.agentVoice,
      userGoal: project.userGoal,
      businessContext: businessContext ?? null,
      agentInstructions: project.agentInstructions,
      goal: project.goal,
      tone: project.tone,
      agentQuestions: project.agentQuestions,
      captureFields: project.captureFields,
      vehicleContextFullText: project.vehicleContextFullText,
      callContextInstructions: project.callContextInstructions,
      identityInstructions: project.identityInstructions,
      endingCallInstructions: project.endingCallInstructions,
      complianceInstructions: project.complianceInstructions,
      voiceOutputInstructions: project.voiceOutputInstructions,
      vehiclePlaceholderInstructions: project.vehiclePlaceholderInstructions,
      schedulingInstructions: project.schedulingInstructions,
      vehicleContextHeaderInstructions: project.vehicleContextHeaderInstructions,
      vehicleReferenceInstructions: project.vehicleReferenceInstructions,
      vehicleIntroInstructions: project.vehicleIntroInstructions,
      businessContextHeaderInstructions: project.businessContextHeaderInstructions,
      assistantId: project.assistantId,
      structuredOutputId: project.structuredOutputId,
    };

    // Use a dedicated test assistant (no server URL) so browser tests don't drop with daily-error.
    // VAPI/Daily can't reach localhost; when the assistant has a server URL, web calls often fail.
    // ?refresh=1 forces creating a new test assistant (e.g. after fixing config or clearing stale state).
    const refresh = req.nextUrl.searchParams.get("refresh") === "1";
    const assistantId = await createOrUpdateAssistant(projectForVapi, {
      forWebTest: true,
      overrideAssistantId: refresh ? undefined : (project.testAssistantId ?? undefined),
    });

    // Persist test assistant id so we reuse one per project (or update after refresh)
    if (refresh || !project.testAssistantId || project.testAssistantId !== assistantId) {
      await updateProject(projectId, { testAssistantId: assistantId });
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