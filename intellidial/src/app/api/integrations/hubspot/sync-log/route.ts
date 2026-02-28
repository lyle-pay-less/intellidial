import { NextRequest, NextResponse } from "next/server";
import { getOrgFromRequest } from "@/app/api/projects/getOrgFromRequest";
import { getHubSpotSyncLogs } from "@/lib/data/store";

/**
 * GET /api/integrations/hubspot/sync-log
 * Get recent HubSpot sync activity for the current organization.
 */
export async function GET(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs = await getHubSpotSyncLogs(org.orgId, 50);

  return NextResponse.json({
    logs,
  });
}

