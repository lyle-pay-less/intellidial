import { NextRequest, NextResponse } from "next/server";
import { getOrgFromRequest } from "@/app/api/projects/getOrgFromRequest";
import { isVapiConfigured, listPhoneNumbers } from "@/lib/vapi/client";

/**
 * GET /api/phone-numbers
 * Returns available VAPI phone numbers for the outbound-number dropdown.
 * Requires auth. Returns 503 if VAPI is not configured.
 */
export async function GET(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }

  if (!isVapiConfigured()) {
    return NextResponse.json(
      { error: "VAPI is not configured" },
      { status: 503 }
    );
  }

  try {
    const numbers = await listPhoneNumbers();
    return NextResponse.json({ numbers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list phone numbers";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
