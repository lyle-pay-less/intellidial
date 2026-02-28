import { NextRequest, NextResponse } from "next/server";
import {
  getProject,
  getHubSpotIntegration,
  listContacts,
  createContacts,
  setProjectQueue,
  getProjectQueue,
} from "@/lib/data/store";
import { getContactById } from "@/lib/integrations/hubspot/client";
import { mapHubSpotToIntellidial } from "@/lib/integrations/hubspot/map-contact";

/**
 * POST /api/integrations/hubspot/webhook
 *
 * Trigger from HubSpot: when a contact is added to a list or Lead Status changes,
 * HubSpot workflow can call this URL to add the contact to an Intellidial project's call queue.
 *
 * Body: { projectId: string, hubspotContactId: string, secret?: string }
 * - projectId: Intellidial project to add the contact to
 * - hubspotContactId: HubSpot contact ID (numeric string)
 * - secret: must match HUBSPOT_WEBHOOK_SECRET env (if set)
 *
 * Returns: 200 { added: true, contactId, inQueue } or 4xx with error message.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : null;
    const hubspotContactId = typeof body?.hubspotContactId === "string"
      ? body.hubspotContactId.trim()
      : null;
    const secret = typeof body?.secret === "string" ? body.secret : req.headers.get("x-intellidial-webhook-secret") ?? null;

    const webhookSecret = process.env.HUBSPOT_WEBHOOK_SECRET;
    if (webhookSecret && secret !== webhookSecret) {
      return NextResponse.json(
        { error: "Invalid or missing webhook secret" },
        { status: 401 }
      );
    }

    if (!projectId || !hubspotContactId) {
      return NextResponse.json(
        { error: "projectId and hubspotContactId are required" },
        { status: 400 }
      );
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const orgId = (project as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Project has no organization" },
        { status: 400 }
      );
    }

    const integration = await getHubSpotIntegration(orgId);
    if (!integration?.enabled) {
      return NextResponse.json(
        { error: "HubSpot is not connected for this project's organization" },
        { status: 400 }
      );
    }

    const hsContact = await getContactById(orgId, hubspotContactId);
    if (!hsContact) {
      return NextResponse.json(
        { error: "Contact not found in HubSpot" },
        { status: 404 }
      );
    }

    const mapped = mapHubSpotToIntellidial(hsContact);
    if (!mapped.phone || !mapped.phone.trim()) {
      return NextResponse.json(
        { error: "Contact has no phone number in HubSpot" },
        { status: 400 }
      );
    }

    const { contacts: existingContacts } = await listContacts(projectId, { limit: 10000 });
    const existingByHubSpotId = existingContacts.find(
      (c) => (c as { hubspotContactId?: string }).hubspotContactId === hubspotContactId
    );
    const normalizedPhone = mapped.phone.replace(/\s/g, "").toLowerCase();
    const existingByPhone = existingContacts.find(
      (c) => c.phone.replace(/\s/g, "").toLowerCase() === normalizedPhone
    );
    const existing = existingByHubSpotId ?? existingByPhone;

    let contactId: string;
    if (existing) {
      contactId = existing.id;
    } else {
      const created = await createContacts(projectId, [
        {
          phone: mapped.phone,
          name: mapped.name,
          hubspotContactId: mapped.hubspotContactId,
          hubspotLeadStatus: mapped.hubspotLeadStatus,
        },
      ]);
      if (created.length === 0) {
        return NextResponse.json(
          { error: "Failed to create contact (duplicate phone?)" },
          { status: 400 }
        );
      }
      contactId = created[0].id;
    }

    const queueIds = getProjectQueue(projectId);
    const alreadyInQueue = queueIds.includes(contactId);
    if (!alreadyInQueue) {
      setProjectQueue(projectId, [contactId], true);
    }

    return NextResponse.json({
      added: true,
      contactId,
      inQueue: true,
      wasNewContact: !existing,
    });
  } catch (err) {
    console.error("[HubSpot] webhook error:", err);
    const message = err instanceof Error ? err.message : "Webhook failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
