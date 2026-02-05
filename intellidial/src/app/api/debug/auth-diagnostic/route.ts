import { NextRequest, NextResponse } from "next/server";
import { getUserOrganization, getOrganization } from "@/lib/data/store";
import { isFirebaseAdminConfigured, getFirebaseAdminFirestore } from "@/lib/firebase/admin";

/**
 * GET /api/debug/auth-diagnostic
 * Diagnostic endpoint to check auth/org lookup issues.
 * Returns detailed information about what's happening.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const diagnostic: Record<string, unknown> = {
      userId,
      timestamp: new Date().toISOString(),
    };

    // Check Firebase Admin configuration
    diagnostic.firebaseAdminConfigured = isFirebaseAdminConfigured();
    
    // Try to get Firestore instance
    let firestoreWorks = false;
    let firestoreError: string | null = null;
    try {
      const db = getFirebaseAdminFirestore();
      diagnostic.firestoreInstanceObtained = true;
      
      // Try a simple query
      const testDoc = await db.collection("userOrganizations").doc(userId).get();
      firestoreWorks = true;
      diagnostic.firestoreQueryWorks = true;
      diagnostic.userOrganizationsDocExists = testDoc.exists;
      
      if (testDoc.exists) {
        const data = testDoc.data();
        diagnostic.userOrganizationsData = data;
        diagnostic.orgIdFromMapping = data?.orgId ?? null;
      }
      
      // Check team members
      const orgsSnap = await db.collection("organizations").get();
      diagnostic.totalOrganizations = orgsSnap.docs.length;
      
      const teamMemberships: Array<{ orgId: string; orgName: string }> = [];
      for (const orgDoc of orgsSnap.docs) {
        const memberDoc = await orgDoc.ref.collection("members").doc(userId).get();
        if (memberDoc.exists) {
          const orgData = await db.collection("organizations").doc(orgDoc.id).get();
          teamMemberships.push({
            orgId: orgDoc.id,
            orgName: orgData.data()?.name ?? "Unknown",
          });
        }
      }
      diagnostic.teamMemberships = teamMemberships;
      
    } catch (error) {
      firestoreWorks = false;
      firestoreError = error instanceof Error ? error.message : String(error);
      diagnostic.firestoreError = firestoreError;
      diagnostic.firestoreInstanceObtained = false;
      diagnostic.firestoreQueryWorks = false;
    }

    // Try getUserOrganization
    let orgId: string | null = null;
    let getUserOrgError: string | null = null;
    try {
      orgId = await getUserOrganization(userId);
      diagnostic.getUserOrganizationResult = orgId;
    } catch (error) {
      getUserOrgError = error instanceof Error ? error.message : String(error);
      diagnostic.getUserOrganizationError = getUserOrgError;
    }

    // If we got an orgId, try to get org details
    if (orgId) {
      try {
        const org = await getOrganization(orgId);
        diagnostic.organizationDetails = {
          id: org?.id,
          name: org?.name,
          ownerId: org?.ownerId,
        };
      } catch (error) {
        diagnostic.getOrganizationError = error instanceof Error ? error.message : String(error);
      }
    }

    return NextResponse.json(diagnostic);
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to run diagnostic",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
