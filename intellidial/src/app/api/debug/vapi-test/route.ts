import { NextResponse } from "next/server";
import { getVapiHeaders, getPhoneNumberIdForCall, isVapiConfigured, isPhoneNumberConfigured } from "@/lib/vapi/client";

/**
 * GET /api/debug/vapi-test
 * Quick diagnostic endpoint to test VAPI configuration and phone number.
 * Returns status of VAPI API key, phone number ID, and attempts to fetch phone number details.
 */
export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    vapiConfigured: isVapiConfigured(),
    phoneNumberConfigured: isPhoneNumberConfigured(),
  };

  if (!isVapiConfigured()) {
    return NextResponse.json({ error: "VAPI_API_KEY not set", checks }, { status: 503 });
  }

  if (!isPhoneNumberConfigured()) {
    return NextResponse.json({ error: "VAPI_PHONE_NUMBER_ID not set", checks }, { status: 503 });
  }

  try {
    const phoneNumberId = getPhoneNumberIdForCall();
    checks.phoneNumberId = phoneNumberId;

    // Try to fetch phone number details from VAPI
    const res = await fetch(`https://api.vapi.ai/phone-number/${phoneNumberId}`, {
      method: "GET",
      headers: getVapiHeaders(),
    });

    if (res.ok) {
      const phoneData = await res.json();
      checks.phoneNumberDetails = {
        id: phoneData.id,
        number: phoneData.number,
        status: phoneData.status,
        provider: phoneData.provider,
      };
    } else {
      const errorText = await res.text();
      checks.phoneNumberError = {
        status: res.status,
        message: errorText.slice(0, 200),
      };
    }

    // Try to list recent calls (last 5)
    const callsRes = await fetch(`https://api.vapi.ai/call?limit=5`, {
      method: "GET",
      headers: getVapiHeaders(),
    });

    if (callsRes.ok) {
      const callsData = await callsRes.json();
      checks.recentCalls = Array.isArray(callsData) 
        ? callsData.map((c: { id: string; status?: string; customer?: { number?: string }; startedAt?: string }) => ({
            id: c.id,
            status: c.status,
            customerNumber: c.customer?.number,
            startedAt: c.startedAt,
          }))
        : callsData;
    } else {
      checks.recentCallsError = {
        status: callsRes.status,
        message: (await callsRes.text()).slice(0, 200),
      };
    }
  } catch (err) {
    checks.error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({ checks });
}
