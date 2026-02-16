import { NextRequest, NextResponse } from "next/server";
import { getOrgFromRequest } from "@/app/api/projects/getOrgFromRequest";
import { getProject, listContacts, createContacts } from "@/lib/data/store";
import { getContacts, getContactsByListId } from "@/lib/integrations/hubspot/client";
import { mapHubSpotToIntellidial } from "@/lib/integrations/hubspot/map-contact";

/**
 * POST /api/integrations/hubspot/sync-contacts
 * Import contacts from HubSpot into an Intellidial project.
 * Body: { projectId: string, listId?: string, leadStatuses?: string[], excludeLeadStatuses?: string[], limit?: number }
 * - If listId is set: import contacts that are members of that HubSpot list.
 * - Otherwise: import by Lead Status filter (leadStatuses / excludeLeadStatuses).
 */
export async function POST(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { projectId, listId, leadStatus, leadStatuses, excludeLeadStatuses, limit = 100 } = body;
    
    // Support both old single leadStatus and new leadStatuses array for backward compatibility
    const statusesToInclude = leadStatuses || (leadStatus ? [leadStatus] : undefined);

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    // Verify project belongs to org
    const project = await getProject(projectId, org.orgId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get existing contacts to check for duplicates
    const { contacts: existingContacts } = await listContacts(projectId, { limit: 10000 });
    const existingPhones = new Set(
      existingContacts.map((c) => c.phone.replace(/\s/g, "").toLowerCase())
    );
    const existingHubSpotIds = new Set(
      existingContacts
        .map((c) => (c as any).hubspotContactId)
        .filter(Boolean)
    );

    // Fetch contacts: either from a HubSpot list or by Lead Status
    let hubspotContacts: Awaited<ReturnType<typeof getContacts>>["contacts"];
    let hasMore: boolean;

    if (listId) {
      const listResult = await getContactsByListId(org.orgId, listId, { limit });
      hubspotContacts = listResult.contacts;
      hasMore = listResult.hasMore;
    } else {
      const result = await getContacts(org.orgId, {
        limit: limit * 2, // Fetch more to account for filtering
      });
      hubspotContacts = result.contacts;
      hasMore = result.hasMore;
    }

    // Map and filter contacts
    const contactsToAdd: Array<{
      phone: string;
      name?: string;
      hubspotContactId?: string;
      hubspotLeadStatus?: string;
    }> = [];
    let skippedNoPhone = 0;
    let skippedDuplicates = 0;
    let filteredByStatus = 0;

    for (const hubspotContact of hubspotContacts) {
      const mapped = mapHubSpotToIntellidial(hubspotContact);
      const contactLeadStatus = mapped.hubspotLeadStatus || "";

      // Filter by Lead Status (include)
      if (statusesToInclude && statusesToInclude.length > 0) {
        if (!statusesToInclude.includes(contactLeadStatus)) {
          filteredByStatus++;
          continue;
        }
      }

      // Filter by Lead Status (exclude)
      if (excludeLeadStatuses && excludeLeadStatuses.length > 0) {
        if (excludeLeadStatuses.includes(contactLeadStatus)) {
          filteredByStatus++;
          continue;
        }
      }

      // Skip if no phone number
      if (!mapped.phone || !mapped.phone.trim()) {
        skippedNoPhone++;
        continue;
      }

      // Normalize phone for duplicate check
      const normalizedPhone = mapped.phone.replace(/\s/g, "").toLowerCase();

      // Skip if duplicate (by phone or hubspotContactId)
      if (
        existingPhones.has(normalizedPhone) ||
        existingHubSpotIds.has(mapped.hubspotContactId)
      ) {
        skippedDuplicates++;
        continue;
      }

      // Add to list with HubSpot metadata
      contactsToAdd.push({
        phone: mapped.phone,
        name: mapped.name,
        hubspotContactId: mapped.hubspotContactId,
        hubspotLeadStatus: mapped.hubspotLeadStatus,
      });

      // Track for duplicate checking
      existingPhones.add(normalizedPhone);
      existingHubSpotIds.add(mapped.hubspotContactId);
    }

    // Create contacts in Intellidial project
    const created = await createContacts(projectId, contactsToAdd);

    const skipped = skippedNoPhone + skippedDuplicates;

    return NextResponse.json({
      imported: created.length,
      skipped,
      skippedNoPhone,
      skippedDuplicates,
      filteredByStatus,
      total: hubspotContacts.length,
      hasMore,
    });
  } catch (error) {
    console.error("[HubSpot] sync-contacts error:", error);
    const message = error instanceof Error ? error.message : "Failed to sync contacts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
