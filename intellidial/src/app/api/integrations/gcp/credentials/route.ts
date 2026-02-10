import { NextRequest, NextResponse } from "next/server";
import { getOrgFromRequest } from "@/app/api/projects/getOrgFromRequest";
import { getGCPIntegration, saveGCPIntegration } from "@/lib/data/store";
import { encryptServiceAccountKey } from "@/lib/gcp-storage/client";

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/gcp/credentials
 * Get GCP credentials for the current organization (returns masked key).
 */
export async function GET(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integration = await getGCPIntegration(org.orgId);
  if (!integration) {
    return NextResponse.json({
      bucketName: "",
      serviceAccountKey: "",
      enabled: false,
    });
  }

  return NextResponse.json({
    bucketName: integration.bucketName || "",
    serviceAccountKey: integration.serviceAccountKey ? "••••••••" : "",
    enabled: integration.enabled || false,
  });
}

/**
 * POST /api/integrations/gcp/credentials
 * Save GCP credentials for the current organization (encrypts service account key).
 */
export async function POST(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { bucketName, serviceAccountKey, enabled } = body;

    const integration = await getGCPIntegration(org.orgId);
    const baseIntegration = integration || {
      orgId: org.orgId,
      enabled: false,
    };

    // Validate required fields if enabling
    if (enabled && (!bucketName || !serviceAccountKey)) {
      return NextResponse.json(
        { error: "Bucket name and Service Account Key are required" },
        { status: 400 }
      );
    }

    // Encrypt the service account key if provided
    let encryptedKey = integration?.serviceAccountKey;
    if (serviceAccountKey && serviceAccountKey !== "••••••••") {
      try {
        // Validate it's valid JSON
        JSON.parse(serviceAccountKey);
        encryptedKey = encryptServiceAccountKey(serviceAccountKey);
      } catch (error) {
        return NextResponse.json(
          { error: "Invalid service account key JSON" },
          { status: 400 }
        );
      }
    }

    // Save credentials
    await saveGCPIntegration(org.orgId, {
      ...baseIntegration,
      bucketName: bucketName?.trim() || undefined,
      serviceAccountKey: encryptedKey,
      enabled: enabled !== false,
      configuredAt: enabled ? new Date().toISOString() : integration?.configuredAt,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[GCP] credentials POST error:", error);
    return NextResponse.json(
      { error: "Failed to save credentials" },
      { status: 500 }
    );
  }
}
