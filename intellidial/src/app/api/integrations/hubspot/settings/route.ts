import { NextRequest, NextResponse } from "next/server";
import { getOrgFromRequest } from "@/app/api/projects/getOrgFromRequest";
import { getHubSpotIntegration, saveHubSpotIntegration } from "@/lib/data/store";
import { getLeadStatuses, getDealPipelines } from "@/lib/integrations/hubspot/client";

/**
 * GET /api/integrations/hubspot/settings
 * Get HubSpot sync settings for the current organization.
 */
export async function GET(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integration = await getHubSpotIntegration(org.orgId);
  if (!integration) {
    return NextResponse.json({ error: "HubSpot not connected" }, { status: 404 });
  }

  try {
    // Fetch lead statuses and pipelines in parallel
    const [leadStatuses, pipelines] = await Promise.all([
      getLeadStatuses(org.orgId).catch(() => []),
      getDealPipelines(org.orgId).catch(() => []),
    ]);

    return NextResponse.json({
      settings: integration.settings || {},
      leadStatuses,
      pipelines: pipelines.map((p) => ({
        id: p.id,
        label: p.label,
        stages: p.stages.map((s) => ({ id: s.id, label: s.label })),
      })),
    });
  } catch (error) {
    console.error("[HubSpot] settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/hubspot/settings
 * Update HubSpot sync settings for the current organization.
 */
export async function POST(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integration = await getHubSpotIntegration(org.orgId);
  if (!integration) {
    return NextResponse.json({ error: "HubSpot not connected" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
    }

    // Validate settings
    const validatedSettings = {
      ...integration.settings,
      ...settings,
    };

    // Ensure boolean defaults
    if (validatedSettings.autoSync === undefined) validatedSettings.autoSync = true;
    if (validatedSettings.syncTranscript === undefined) validatedSettings.syncTranscript = true;
    if (validatedSettings.syncRecording === undefined) validatedSettings.syncRecording = true;
    if (validatedSettings.syncMeetings === undefined) validatedSettings.syncMeetings = true;
    if (validatedSettings.syncDeals === undefined) validatedSettings.syncDeals = true;

    // Update integration
    await saveHubSpotIntegration(org.orgId, {
      ...integration,
      settings: validatedSettings,
    });

    return NextResponse.json({
      success: true,
      settings: validatedSettings,
    });
  } catch (error) {
    console.error("[HubSpot] settings POST error:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
