/**
 * Ensures a project has a VAPI assistant (lazy create + persist).
 * Used by the call-initiation API before placing a call.
 * Phase 3: Create VAPI assistant (lazy, per project).
 */

import { getProject, getDealer, updateProject } from "@/lib/data/store";
import { createOrUpdateAssistant, ensureStructuredOutput, enrichBusinessContextWithDealer } from "./client";
import type { ProjectForVapi } from "./client";
import type { ProjectDoc } from "@/lib/firebase/types";

type ProjectWithId = ProjectDoc & { id: string };

const FAILED_CREATE_MESSAGE = "Failed to create agent. Try again.";

/**
 * Ensures the project has an assistantId. If not, creates a VAPI assistant
 * from the project config (instructions, goal, tone, questions, captureFields),
 * saves the assistantId (and structuredOutputId if new) to the project, and returns the assistant id.
 * When the project has captureFields, ensures a VAPI structured output exists and is linked to the assistant.
 *
 * @param projectId - Project id
 * @param opts.orgId - Optional org id for auth
 * @param opts.project - Pre-fetched project (avoids redundant Firestore read)
 * @returns The assistant id (existing or newly created)
 * @throws Error with user-facing message if project not found or VAPI fails
 */
export async function ensureProjectAssistantId(
  projectId: string,
  opts?: { orgId?: string; project?: ProjectWithId }
): Promise<string> {
  const orgId = opts?.orgId;
  let project = opts?.project ?? await getProject(projectId, orgId);
  if (!project) {
    throw new Error("Project not found");
  }

  let projectForVapi: ProjectForVapi = project as ProjectForVapi;
  if (project.dealerId && project.orgId) {
    const dealer = await getDealer(project.dealerId, project.orgId);
    if (dealer) {
      projectForVapi = {
        ...projectForVapi,
        businessContext: enrichBusinessContextWithDealer(project.businessContext, dealer),
      };
    }
  }

  try {
    const captureFields = project.captureFields ?? [];
    const hasCaptureFields = captureFields.length > 0;
    const hasAssistant = !!project.assistantId?.trim();
    const hasStructuredOutput = !!project.structuredOutputId?.trim();

    // Fast path: both IDs exist → run VAPI structured output sync and assistant update in parallel
    if (hasAssistant && hasStructuredOutput && hasCaptureFields) {
      await Promise.all([
        ensureStructuredOutput(project as ProjectForVapi),
        createOrUpdateAssistant(projectForVapi),
      ]);
      return project.assistantId!.trim();
    }

    // Existing assistant, no capture fields → just update assistant
    if (hasAssistant && !hasCaptureFields) {
      await createOrUpdateAssistant(projectForVapi);
      return project.assistantId!.trim();
    }

    // Has capture fields but structured output needs creating first
    if (hasCaptureFields) {
      const structuredOutputId = await ensureStructuredOutput(project as ProjectForVapi);
      if (structuredOutputId && !hasStructuredOutput) {
        await updateProject(projectId, { structuredOutputId });
        project = { ...project, structuredOutputId };
        projectForVapi = { ...projectForVapi, structuredOutputId };
      } else if (structuredOutputId) {
        project = { ...project, structuredOutputId };
        projectForVapi = { ...projectForVapi, structuredOutputId };
      }
    }

    if (hasAssistant) {
      await createOrUpdateAssistant(projectForVapi);
      return project.assistantId!.trim();
    }

    const assistantId = await createOrUpdateAssistant(projectForVapi);
    await updateProject(projectId, { assistantId });
    return assistantId;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[VAPI] ensureProjectAssistantId:", message);
    throw new Error(FAILED_CREATE_MESSAGE);
  }
}