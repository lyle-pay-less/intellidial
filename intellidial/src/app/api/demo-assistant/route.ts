import { NextResponse } from "next/server";
import { getVapiHeaders } from "@/lib/vapi/client";

/**
 * Returns VAPI demo assistant ID + public key for the website voice widget.
 * All from doctor .env: VAPI_DEMO_ASSISTANT_ID, VAPI_PUBLIC_KEY (from VAPI Dashboard → API Keys → Public).
 * Also verifies the assistant exists and is valid.
 */
export async function GET() {
  const rawAssistantId = process.env.VAPI_DEMO_ASSISTANT_ID;
  const rawPublicKey = process.env.VAPI_PUBLIC_KEY;
  
  // Trim whitespace (Secret Manager might add newlines)
  const assistantId = rawAssistantId?.trim();
  const publicKey = rawPublicKey?.trim();
  
  if (!assistantId) {
    return NextResponse.json(
      { error: "Add VAPI_DEMO_ASSISTANT_ID to doctor .env (run create_demo_agent.py)." },
      { status: 503 }
    );
  }
  if (!publicKey) {
    return NextResponse.json(
      { error: "Add VAPI_PUBLIC_KEY to doctor .env (VAPI Dashboard → API Keys → Public Key)." },
      { status: 503 }
    );
  }

  // Verify assistant exists (optional check, but helpful for debugging)
  try {
    const headers = getVapiHeaders();
    const res = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: "GET",
      headers,
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("[demo-assistant] Assistant verification failed:", {
        status: res.status,
        assistantId: assistantId.substring(0, 8) + "...",
        error: errorText.slice(0, 200),
      });
      // Still return the credentials, but log the warning
      return NextResponse.json({
        assistantId,
        publicKey,
        warning: `Assistant verification failed (${res.status}). Check VAPI_DEMO_ASSISTANT_ID is correct.`,
      });
    }
    
    const assistantData = await res.json();
    return NextResponse.json({
      assistantId,
      publicKey,
      verified: true,
      assistantName: assistantData.name,
    });
  } catch (err) {
    // If verification fails, still return credentials (might be network issue)
    console.warn("[demo-assistant] Could not verify assistant:", err);
    return NextResponse.json({
      assistantId,
      publicKey,
      verified: false,
      warning: "Could not verify assistant (check VAPI_API_KEY and network)",
    });
  }
}
