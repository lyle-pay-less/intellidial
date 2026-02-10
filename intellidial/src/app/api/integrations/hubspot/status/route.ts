import { NextRequest, NextResponse } from "next/server";
import { getOrgFromRequest } from "@/app/api/projects/getOrgFromRequest";
import { getHubSpotIntegration } from "@/lib/data/store";

/**
 * GET /api/integrations/hubspot/status
 * Get HubSpot integration status for the current organization.
 */
export async function GET(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integration = await getHubSpotIntegration(org.orgId);

  if (!integration) {
    return NextResponse.json({
      connected: false,
    });
  }

  // Check if token is expired
  const now = Math.floor(Date.now() / 1000);
  const isExpired = integration.expiresAt < now;

  return NextResponse.json({
    connected: true,
    enabled: integration.enabled,
    hubspotAccountId: integration.hubspotAccountId,
    hubspotAccountName: integration.hubspotAccountName,
    connectedAt: integration.connectedAt,
    isExpired,
    needsRefresh: isExpired,
  });
}
