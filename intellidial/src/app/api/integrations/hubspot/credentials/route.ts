import { NextRequest, NextResponse } from "next/server";
import { getOrgFromRequest } from "@/app/api/projects/getOrgFromRequest";
import { getHubSpotIntegration, saveHubSpotIntegration } from "@/lib/data/store";
import crypto from "crypto";

// Encryption key - MUST be set in environment variables for production
// This key must be consistent across all instances to decrypt previously encrypted secrets
const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY;
const ALGORITHM = "aes-256-gcm";

if (!ENCRYPTION_KEY) {
  console.warn("[HubSpot] INTEGRATION_ENCRYPTION_KEY not set. Custom credentials encryption will not work.");
}

/**
 * Encrypt sensitive data
 */
function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY not configured");
  }
  const key = ENCRYPTION_KEY.length >= 64 
    ? Buffer.from(ENCRYPTION_KEY.slice(0, 64), "hex")
    : crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
function decrypt(encryptedText: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY not configured");
  }
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format");
  }
  const key = ENCRYPTION_KEY.length >= 64 
    ? Buffer.from(ENCRYPTION_KEY.slice(0, 64), "hex")
    : crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * GET /api/integrations/hubspot/credentials
 * Get HubSpot credentials for the current organization (returns masked secret).
 */
export async function GET(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integration = await getHubSpotIntegration(org.orgId);
  if (!integration) {
    return NextResponse.json({
      clientId: "",
      clientSecret: "",
      useCustomApp: false,
    });
  }

  return NextResponse.json({
    clientId: integration.customClientId || "",
    clientSecret: integration.customClientSecret ? "••••••••" : "",
    useCustomApp: !!integration.customClientId,
  });
}

/**
 * POST /api/integrations/hubspot/credentials
 * Save HubSpot credentials for the current organization (encrypts client secret).
 */
export async function POST(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { clientId, clientSecret, useCustomApp } = body;

    const integration = await getHubSpotIntegration(org.orgId);
    const baseIntegration = integration || {
      orgId: org.orgId,
      accessToken: "",
      refreshToken: "",
      expiresAt: 0,
      hubspotAccountId: "",
      connectedAt: new Date().toISOString(),
      enabled: true,
    };

    // If useCustomApp is false, clear custom credentials
    if (!useCustomApp) {
      await saveHubSpotIntegration(org.orgId, {
        ...baseIntegration,
        customClientId: undefined,
        customClientSecret: undefined,
      });
      return NextResponse.json({ success: true });
    }

    // Validate required fields
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Client ID and Client Secret are required" },
        { status: 400 }
      );
    }

    // Encrypt the client secret
    const encryptedSecret = encrypt(clientSecret);

    // Save credentials (encrypted)
    await saveHubSpotIntegration(org.orgId, {
      ...baseIntegration,
      customClientId: clientId.trim(),
      customClientSecret: encryptedSecret,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[HubSpot] credentials POST error:", error);
    return NextResponse.json(
      { error: "Failed to save credentials" },
      { status: 500 }
    );
  }
}
