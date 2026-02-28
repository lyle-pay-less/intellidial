import { NextRequest, NextResponse } from "next/server";
import { getOrgFromRequest } from "@/app/api/projects/getOrgFromRequest";
import { searchContactLists } from "@/lib/integrations/hubspot/client";

/**
 * GET /api/integrations/hubspot/lists
 * Get contact lists (segments) from HubSpot for the current organization.
 */
export async function GET(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const lists = await searchContactLists(org.orgId);
    return NextResponse.json({ lists });
  } catch (error) {
    console.error("[HubSpot] lists error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch HubSpot lists";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
