import { NextResponse } from "next/server";

/**
 * Returns VAPI demo assistant ID + public key for the website voice widget.
 * All from doctor .env: VAPI_DEMO_ASSISTANT_ID, VAPI_PUBLIC_KEY (from VAPI Dashboard → API Keys → Public).
 */
export async function GET() {
  const assistantId = process.env.VAPI_DEMO_ASSISTANT_ID;
  const publicKey = process.env.VAPI_PUBLIC_KEY;
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
  return NextResponse.json({ assistantId, publicKey });
}
