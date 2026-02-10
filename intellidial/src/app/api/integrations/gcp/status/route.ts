import { NextRequest, NextResponse } from "next/server";
import { getOrgFromRequest } from "@/app/api/projects/getOrgFromRequest";
import { getGCPIntegration } from "@/lib/data/store";

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/gcp/status
 * Check GCP integration status for the current organization.
 */
export async function GET(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integration = await getGCPIntegration(org.orgId);

  return NextResponse.json({
    configured: !!(integration?.bucketName && integration?.serviceAccountKey),
    enabled: integration?.enabled || false,
    bucketName: integration?.bucketName || undefined,
    configuredAt: integration?.configuredAt || undefined,
  });
}
