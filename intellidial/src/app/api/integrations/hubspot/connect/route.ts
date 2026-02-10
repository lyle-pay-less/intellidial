import { NextRequest, NextResponse } from "next/server";
import { getOrgFromRequest } from "@/app/api/projects/getOrgFromRequest";
import { getUserOrganization, getHubSpotIntegration } from "@/lib/data/store";
import crypto from "crypto";

/**
 * GET /api/integrations/hubspot/connect
 * Initiate HubSpot OAuth flow.
 * Redirects user to HubSpot authorization page.
 * Accepts userId via header (x-user-id) or query param (?userId=...)
 */
export async function GET(req: NextRequest) {
  // Try to get org from header first (normal API call)
  let org = await getOrgFromRequest(req);
  
  // If no header, try query param (for direct link clicks)
  if (!org) {
    const userId = req.nextUrl.searchParams.get("userId");
    if (userId) {
      const orgId = await getUserOrganization(userId);
      if (orgId) {
        org = { userId, orgId };
      }
    }
  }
  
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if org has custom credentials, otherwise use shared app
  const integration = await getHubSpotIntegration(org.orgId);
  const clientId = integration?.customClientId || process.env.HUBSPOT_CLIENT_ID;
  
  // Use localhost for local dev, production URL from env otherwise
  const isLocal = req.headers.get("host")?.includes("localhost");
  const redirectUri = isLocal 
    ? "http://localhost:3000/dashboard/settings/integrations/hubspot/callback"
    : (process.env.HUBSPOT_REDIRECT_URI || "https://intellidial.co.za/dashboard/settings/integrations/hubspot/callback");
  
  // Note: The redirect URI must match what's registered in HubSpot app settings
  
  if (!clientId) {
    return NextResponse.json({ error: "HubSpot Client ID not configured" }, { status: 500 });
  }

  // Generate state parameter for CSRF protection
  const state = crypto.randomBytes(32).toString("hex");
  
  // Store state in session/cookie (for callback verification)
  // For now, we'll include orgId in state and verify in callback
  const stateWithOrg = `${state}:${org.orgId}`;
  
  // Build HubSpot OAuth URL
  // Note: "contacts" scope doesn't exist - use crm.objects.contacts.read/write instead
  const scopes = [
    "timeline",
    "crm.objects.contacts.read",
    "crm.objects.contacts.write",
  ].join(" ");
  
  const authUrl = new URL("https://app.hubspot.com/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", stateWithOrg);

  // Redirect to HubSpot
  return NextResponse.redirect(authUrl.toString());
}
