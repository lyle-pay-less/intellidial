import { NextRequest, NextResponse } from "next/server";
import { getOrgFromRequest } from "@/app/api/projects/getOrgFromRequest";
import {
  getHubSpotSyncQueue,
  removeFromHubSpotSyncQueue,
  getContact,
  updateContact,
} from "@/lib/data/store";
import { syncCallResultToHubSpot } from "@/lib/integrations/hubspot/sync";

/**
 * GET /api/integrations/hubspot/retry-failed
 * List failed syncs in the queue for the current organization.
 */
export async function GET(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const queue = await getHubSpotSyncQueue(org.orgId);
  return NextResponse.json({ queue });
}

/**
 * POST /api/integrations/hubspot/retry-failed
 * Retry failed HubSpot syncs. Body: { queueId?: string } to retry one, or omit to retry all.
 */
export async function POST(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { queueId } = body as { queueId?: string };

  const queue = await getHubSpotSyncQueue(org.orgId);
  const toProcess = queueId ? queue.filter((e) => e.id === queueId) : queue;

  const results: { id: string; status: "ok" | "failed"; error?: string }[] = [];

  for (const entry of toProcess) {
    try {
      const contact = await getContact(entry.projectId, entry.contactId);
      if (!contact) {
        results.push({ id: entry.id, status: "failed", error: "Contact not found" });
        continue;
      }
      if (!contact.callResult) {
        results.push({ id: entry.id, status: "failed", error: "No call result to sync" });
        await removeFromHubSpotSyncQueue(entry.id);
        continue;
      }
      await syncCallResultToHubSpot(org.orgId, contact, contact.callResult);
      await updateContact(entry.contactId, {
        lastSyncedToHubSpot: new Date().toISOString(),
      });
      await removeFromHubSpotSyncQueue(entry.id);
      results.push({ id: entry.id, status: "ok" });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      results.push({ id: entry.id, status: "failed", error: errMsg });
    }
  }

  return NextResponse.json({
    retried: toProcess.length,
    results,
  });
}
