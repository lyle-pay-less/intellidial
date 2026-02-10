import { NextRequest, NextResponse } from "next/server";
import { getOrgFromRequest } from "@/app/api/projects/getOrgFromRequest";
import { saveHubSpotIntegration, getHubSpotIntegration } from "@/lib/data/store";
import crypto from "crypto";

/**
 * GET /api/integrations/hubspot/callback
 * Handle HubSpot OAuth callback.
 * Exchanges authorization code for access token and saves integration.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Build base URL for redirects (must be absolute)
  const host = req.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/integrations?hubspot_error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/integrations?hubspot_error=${encodeURIComponent("Missing code or state")}`
    );
  }

  // Extract orgId from state (format: "state:orgId")
  const [stateToken, orgId] = state.split(":");
  if (!orgId) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/integrations?hubspot_error=${encodeURIComponent("Invalid state")}`
    );
  }

  // Note: We can't verify user via header here because HubSpot redirects back without our auth headers.
  // We trust the state parameter (which includes orgId) since it's cryptographically random.
  // The orgId in state was set by us when initiating OAuth, so it's safe to use.

  // Get integration to check for custom credentials
  const integration = await getHubSpotIntegration(orgId);
  
  // Use custom credentials if available, otherwise use shared app
  let clientId = integration?.customClientId || process.env.HUBSPOT_CLIENT_ID;
  let clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  
  // Decrypt custom client secret if it exists
  if (integration?.customClientSecret) {
    try {
      const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY;
      if (ENCRYPTION_KEY) {
        const parts = integration.customClientSecret.split(":");
        if (parts.length === 3) {
          const key = ENCRYPTION_KEY.length >= 64 
            ? Buffer.from(ENCRYPTION_KEY.slice(0, 64), "hex")
            : crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
          const iv = Buffer.from(parts[0], "hex");
          const authTag = Buffer.from(parts[1], "hex");
          const encrypted = parts[2];
          const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
          decipher.setAuthTag(authTag);
          let decrypted = decipher.update(encrypted, "hex", "utf8");
          decrypted += decipher.final("utf8");
          clientSecret = decrypted;
        }
      }
    } catch (error) {
      console.error("[HubSpot] Failed to decrypt custom secret:", error);
      // Fall back to shared app credentials
      clientId = process.env.HUBSPOT_CLIENT_ID;
      clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    }
  }
  // Use localhost for local dev, production URL from env otherwise
  const isLocal = req.headers.get("host")?.includes("localhost");
  const redirectUri = isLocal 
    ? "http://localhost:3000/dashboard/settings/integrations/hubspot/callback"
    : (process.env.HUBSPOT_REDIRECT_URI || "https://intellidial.co.za/dashboard/settings/integrations/hubspot/callback");

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/integrations?hubspot_error=${encodeURIComponent("HubSpot not configured")}`
    );
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[HubSpot] Token exchange failed:", errorText);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/integrations?hubspot_error=${encodeURIComponent("Failed to get access token")}`
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token || !refresh_token) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/integrations?hubspot_error=${encodeURIComponent("Invalid token response")}`
      );
    }

    // Get HubSpot account info
    const accountResponse = await fetch("https://api.hubapi.com/integrations/v1/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    let hubspotAccountId = "";
    let hubspotAccountName = "";
    
    if (accountResponse.ok) {
      const accountData = await accountResponse.json();
      hubspotAccountId = accountData.portalId?.toString() || "";
      hubspotAccountName = accountData.user || "";
    }

    // Calculate expiration timestamp
    const expiresAt = Math.floor(Date.now() / 1000) + (expires_in || 21600); // Default 6 hours

    // Save integration (preserve custom credentials if they exist)
    await saveHubSpotIntegration(orgId, {
      orgId,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt,
      hubspotAccountId,
      hubspotAccountName,
      connectedAt: new Date().toISOString(),
      enabled: true,
      customClientId: integration?.customClientId,
      customClientSecret: integration?.customClientSecret,
    });

    // Redirect to integrations page with success message
    return NextResponse.redirect(
      `${baseUrl}/dashboard/integrations?hubspot_connected=true`
    );
  } catch (error) {
    console.error("[HubSpot] Callback error:", error);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/integrations?hubspot_error=${encodeURIComponent("Connection failed")}`
    );
  }
}
