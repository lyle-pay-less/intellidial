import { NextRequest, NextResponse } from "next/server";
import { getOrgFromRequest } from "@/app/api/projects/getOrgFromRequest";
import { getLeadStatuses } from "@/lib/integrations/hubspot/client";

/**
 * GET /api/integrations/hubspot/lead-statuses
 * Get available Lead Status values from HubSpot for the current organization.
 */
export async function GET(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const statuses = await getLeadStatuses(org.orgId);
    return NextResponse.json({ statuses });
  } catch (error) {
    console.error("[HubSpot] lead-statuses error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch lead statuses";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
