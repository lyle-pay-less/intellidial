import { NextRequest, NextResponse } from "next/server";
import { getOrgFromRequest } from "@/app/api/projects/getOrgFromRequest";
import { getProject, listContacts, updateContact } from "@/lib/data/store";
import { getHubSpotIntegration } from "@/lib/data/store";
import { getAccessToken } from "@/lib/integrations/hubspot/client";
import { syncCallResultToHubSpot } from "@/lib/integrations/hubspot/sync";

const HUBSPOT_API_BASE = "https://api.hubapi.com";
const RATE_LIMIT_DELAY = 100;

let lastRequestTime = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}

/**
 * Create a contact in HubSpot
 */
async function createHubSpotContact(
  accessToken: string,
  contact: { phone: string; name?: string; email?: string; company?: string }
): Promise<{ id: string } | null> {
  try {
    await rateLimit();
    const properties: Record<string, string> = {
      phone: contact.phone,
    };

    if (contact.name) {
      const nameParts = contact.name.trim().split(" ");
      if (nameParts.length > 0) {
        properties.firstname = nameParts[0];
        if (nameParts.length > 1) {
          properties.lastname = nameParts.slice(1).join(" ");
        }
      }
    }

    if (contact.email) {
      properties.email = contact.email;
    }

    if (contact.company) {
      properties.company = contact.company;
    }

    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[HubSpot] Create contact failed:", response.status, errorText);
      return null;
    }

    const data = (await response.json()) as { id: string };
    return data;
  } catch (error) {
    console.error("[HubSpot] Create contact error:", error);
    return null;
  }
}

/**
 * POST /api/integrations/hubspot/sync-contact
 * Manually sync a single contact to HubSpot.
 * Body: { contactId: string, projectId: string }
 */
export async function POST(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { contactId, projectId } = body;

    if (!contactId || !projectId) {
      return NextResponse.json(
        { error: "contactId and projectId are required" },
        { status: 400 }
      );
    }

    // Verify project belongs to org
    const project = await getProject(projectId, org.orgId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get contact (fetch all contacts and find the one we need)
    const { contacts: allContacts } = await listContacts(projectId, { limit: 10000 });
    const contact = allContacts.find((c) => c.id === contactId);
    if (!contact || contact.projectId !== projectId) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Check HubSpot integration
    const integration = await getHubSpotIntegration(org.orgId);
    if (!integration || !integration.enabled) {
      return NextResponse.json({ error: "HubSpot not connected" }, { status: 400 });
    }

    // Check if contact has phone number
    if (!contact.phone || !contact.phone.trim()) {
      return NextResponse.json(
        { error: "Contact missing phone number" },
        { status: 400 }
      );
    }

    const accessToken = await getAccessToken(org.orgId);
    if (!accessToken) {
      return NextResponse.json({ error: "No valid access token" }, { status: 401 });
    }

    let hubspotContactId = contact.hubspotContactId;

    // Create contact in HubSpot if it doesn't exist
    if (!hubspotContactId) {
      const created = await createHubSpotContact(accessToken, {
        phone: contact.phone,
        name: contact.name || undefined,
        email: undefined, // We don't store email in ContactDoc currently
        company: undefined, // We don't store company in ContactDoc currently
      });

      if (!created) {
        return NextResponse.json(
          { error: "Failed to create contact in HubSpot" },
          { status: 500 }
        );
      }

      hubspotContactId = created.id;

      // Update contact with hubspotContactId
      await updateContact(contactId, {
        hubspotContactId: created.id,
      });
    }

    // Sync call results if contact has call history
    let synced = false;
    if (contact.callResult || (contact.callHistory && contact.callHistory.length > 0)) {
      const callResult = contact.callResult || contact.callHistory?.[contact.callHistory.length - 1];
      if (callResult) {
        await syncCallResultToHubSpot(org.orgId, { ...contact, hubspotContactId }, callResult);
        synced = true;
      }
    }

    // Update lastSyncedToHubSpot timestamp
    await updateContact(contactId, {
      lastSyncedToHubSpot: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      hubspotContactId,
      synced,
      created: !contact.hubspotContactId,
    });
  } catch (error) {
    console.error("[HubSpot] sync-contact error:", error);
    const message = error instanceof Error ? error.message : "Failed to sync contact";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
