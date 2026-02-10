import { NextRequest, NextResponse } from "next/server";
import { getOrgFromRequest } from "@/app/api/projects/getOrgFromRequest";
import { isGoogleSheetsConfigured, getServiceAccountEmail } from "@/lib/google-sheets/client";

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/google-sheets/status
 * Check if Google Sheets export is configured (server-side service account).
 */
export async function GET(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configured = isGoogleSheetsConfigured();
  const serviceAccountEmail = getServiceAccountEmail();

  return NextResponse.json({
    configured,
    serviceAccountEmail: serviceAccountEmail || undefined,
    enabled: configured, // Enabled if configured
  });
}
