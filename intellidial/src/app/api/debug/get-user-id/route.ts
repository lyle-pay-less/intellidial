import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

/**
 * GET /api/debug/get-user-id?email=lyle@automationarchitects.ai
 * Looks up Firebase user ID by email address.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    
    if (!email) {
      return NextResponse.json({ error: "Email parameter required" }, { status: 400 });
    }

    try {
      const auth = getFirebaseAdminAuth();
      const user = await auth.getUserByEmail(email);
      
      return NextResponse.json({
        success: true,
        email: user.email,
        uid: user.uid,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("no user record")) {
        return NextResponse.json({
          success: false,
          error: "User not found",
          email,
        }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to lookup user",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
