import { NextRequest, NextResponse } from "next/server";
import {
  getProject,
  getHubSpotIntegration,
  listContacts,
  runProjectSimulation,
} from "@/lib/data/store";
import { getOrgFromRequest } from "../../getOrgFromRequest";
import { getContactById } from "@/lib/integrations/hubspot/client";

export async function POST(
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

  let contactIds: string[] | undefined;
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (Array.isArray(body?.contactIds) && body.contactIds.length > 0) {
      contactIds = body.contactIds;
    }
  } catch {
    // no body or invalid
  }

  // Two-way sync: exclude contacts whose HubSpot Lead Status is "do not call"
  if (contactIds && contactIds.length > 0) {
    const integration = await getHubSpotIntegration(org.orgId);
    const dontCallLeadStatuses = integration?.enabled
      ? integration.settings?.dontCallLeadStatuses
      : undefined;
    if (dontCallLeadStatuses && dontCallLeadStatuses.length > 0) {
      const { contacts } = await listContacts(id, { limit: 5000 });
      const byId = new Map(contacts.map((c) => [c.id, c]));
      const filtered: string[] = [];
      for (const cid of contactIds) {
        const contact = byId.get(cid);
        if (!contact?.hubspotContactId) {
          filtered.push(cid);
          continue;
        }
        const hsContact = await getContactById(org.orgId, contact.hubspotContactId);
        const leadStatus = hsContact?.properties?.hs_lead_status;
        if (leadStatus && dontCallLeadStatuses.includes(leadStatus)) continue;
        filtered.push(cid);
      }
      contactIds = filtered.length > 0 ? filtered : undefined;
    }
  }

  const { updated } = await runProjectSimulation(id, contactIds);
  return NextResponse.json({ updated, status: "completed" });
}
