import { NextRequest, NextResponse } from "next/server";
import { getOrgFromRequest } from "@/app/api/projects/getOrgFromRequest";
import { deleteHubSpotIntegration } from "@/lib/data/store";

/**
 * POST /api/integrations/hubspot/disconnect
 * Disconnect HubSpot integration for the current organization.
 */
export async function POST(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await deleteHubSpotIntegration(org.orgId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[HubSpot] Disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
