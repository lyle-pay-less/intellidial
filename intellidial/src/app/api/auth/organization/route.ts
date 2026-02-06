import { NextRequest, NextResponse } from "next/server";
import { getUserOrganization, getOrganization, hadFirestoreCredentialError, getFirestoreCredentialErrorHelp } from "@/lib/data/store";

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
      const credentialsExpired = hadFirestoreCredentialError();
      const helpMessage = getFirestoreCredentialErrorHelp();
      return NextResponse.json({
        hasOrganization: false,
        organization: null,
        ...(credentialsExpired && helpMessage && { credentialsExpired: true, credentialsHelp: helpMessage }),
      });
    }

    // Safety check: prevent demo org for real users
    if (orgId === "dev-org-1" && userId !== "dev-user-1") {
      console.error("[Get Organization API] ⚠️ CRITICAL: Attempted to return demo org for non-dev user:", { userId, orgId });
      return NextResponse.json({
        hasOrganization: false,
        organization: null,
        error: "Invalid organization assignment",
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

    // Double-check org name matches expected (extra safety)
    if (org.name === "Demo Organization" && userId !== "dev-user-1") {
      console.error("[Get Organization API] ⚠️ CRITICAL: Attempted to return Demo Organization for non-dev user:", { userId, orgId, orgName: org.name });
      return NextResponse.json({
        hasOrganization: false,
        organization: null,
        error: "Invalid organization assignment",
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
