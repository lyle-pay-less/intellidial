import { NextRequest, NextResponse } from "next/server";
import { getUserOrganization } from "@/lib/data/store";

/**
 * GET /api/auth/check-org
 * Checks if the authenticated user has an organization.
 * Returns: { hasOrganization: boolean, organizationId: string | null }
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    
    console.log("[Check Org API] Checking org for userId:", userId);
    
    if (!userId) {
      console.error("[Check Org API] No userId provided");
      return NextResponse.json({
        hasOrganization: false,
        organizationId: null,
        error: "User ID required",
      });
    }

    // Skip check for dev bypass user
    if (userId === "dev-user-1") {
      console.log("[Check Org API] Dev bypass user detected");
      return NextResponse.json({
        hasOrganization: true, // Dev bypass - assume has org
        organizationId: "dev-org-1",
      });
    }

    const orgId = await getUserOrganization(userId);
    console.log("[Check Org API] Found orgId:", orgId);

    return NextResponse.json({
      hasOrganization: !!orgId,
      organizationId: orgId,
    });
  } catch (error) {
    console.error("[Check Org API] Error:", error);
    return NextResponse.json({
      hasOrganization: false,
      organizationId: null,
      error: error instanceof Error ? error.message : "Failed to check organization",
    });
  }
}
