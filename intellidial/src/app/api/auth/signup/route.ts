import { NextRequest, NextResponse } from "next/server";
import { createOrganization } from "@/lib/data/store";

/**
 * POST /api/auth/signup
 * Creates a new organization and links the user to it as owner.
 * Body: { email, password, companyName }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, companyName, email, displayName } = await req.json();

    console.log("[Signup API] Creating organization:", { userId, companyName, email });

    if (!userId || !companyName) {
      return NextResponse.json(
        { error: "User ID and company name are required" },
        { status: 400 }
      );
    }

    // Create organization (persists to Firestore if configured, otherwise in-memory)
    // Owner is automatically added as team member with role "owner"
    const orgId = await createOrganization({
      name: companyName.trim(),
      ownerId: userId,
      ownerEmail: (email || "").trim() || undefined,
      ownerDisplayName: displayName || undefined,
      createdAt: new Date().toISOString(),
    });

    console.log("[Signup API] Created organization:", { orgId, userId, companyName });

    return NextResponse.json({ 
      success: true, 
      organizationId: orgId 
    });
  } catch (error) {
    console.error("[Signup API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create organization" },
      { status: 500 }
    );
  }
}
