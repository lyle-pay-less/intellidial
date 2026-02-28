/**
 * Ensures a project has a VAPI assistant (lazy create + persist).
 * Used by the call-initiation API before placing a call.
 * Phase 3: Create VAPI assistant (lazy, per project).
 */

import { getProject, getDealer, updateProject } from "@/lib/data/store";
import { createOrUpdateAssistant, ensureStructuredOutput, enrichBusinessContextWithDealer } from "./client";
import type { ProjectForVapi } from "./client";

const FAILED_CREATE_MESSAGE = "Failed to create agent. Try again.";

/**
 * Ensures the project has an assistantId. If not, creates a VAPI assistant
 * from the project config (instructions, goal, tone, questions, captureFields),
 * saves the assistantId (and structuredOutputId if new) to the project, and returns the assistant id.
 * When the project has captureFields, ensures a VAPI structured output exists and is linked to the assistant.
 *
 * @param projectId - Project id
 * @param orgId - Optional org id for auth (project must belong to this org)
 * @returns The assistant id (existing or newly created)
 * @throws Error with user-facing message if project not found or VAPI fails
 */
export async function ensureProjectAssistantId(
  projectId: string,
  orgId?: string
): Promise<string> {
  let project = await getProject(projectId, orgId);
  if (!project) {
    throw new Error("Project not found");
  }

  // When project is linked to a dealer, inject dealer contact details into business context for the agent
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
    let structuredOutputId: string | null = null;
    if (captureFields.length > 0) {
      structuredOutputId = await ensureStructuredOutput(project as ProjectForVapi);
      if (structuredOutputId && !project.structuredOutputId?.trim()) {
        await updateProject(projectId, { structuredOutputId });
        project = { ...project, structuredOutputId };
      } else if (structuredOutputId) {
        project = { ...project, structuredOutputId };
      }
    }

    if (project.assistantId?.trim()) {
      await createOrUpdateAssistant(projectForVapi);
      // VAPI can apply assistant updates asynchronously; a short delay reduces the chance
      // the first call uses the previous voice (e.g. Rachel instead of the newly saved one).
      await new Promise((r) => setTimeout(r, 1500));
      // VAPI can apply assistant updates asynchronously; a short delay reduces the chance
      // the first call uses the previous voice (e.g. Rachel instead of the newly saved one).
      await new Promise((r) => setTimeout(r, 1500));
      return project.assistantId.trim();
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