import { NextRequest, NextResponse } from "next/server";
import { getUserOrganization, getOrganization } from "@/lib/data/store";

/**
 * GET /api/auth/organization
 * Returns the current user's organization details.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    
    if (!userId) {
      console.error("[Get Organization API] No userId provided in headers");
      return NextResponse.json({
        hasOrganization: false,
        organization: null,
        error: "User ID required",
      });
    }

    console.log("[Get Organization API] Checking org for userId:", userId);

    const orgId = await getUserOrganization(userId);
    console.log("[Get Organization API] Found orgId:", orgId);
    
    if (!orgId) {
      return NextResponse.json({
        hasOrganization: false,
        organization: null,
      });
    }

    const org = await getOrganization(orgId);
    console.log("[Get Organization API] Found org:", org);
    
    if (!org) {
      return NextResponse.json({
        hasOrganization: false,
        organization: null,
      });
    }

    return NextResponse.json({
      hasOrganization: true,
      organization: {
        id: org.id,
        name: org.name,
      },
    });
  } catch (error) {
    console.error("[Get Organization API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get organization" },
      { status: 500 }
    );
  }
}
