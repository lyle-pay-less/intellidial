import { NextResponse } from "next/server";
import { clearFirestoreCredentialFailed } from "@/lib/data/store";

/**
 * POST /api/debug/clear-firestore-flag
 * Clears the in-process "Firestore credential failed" flag so the next request will try Firestore again.
 * Use after running: gcloud auth application-default login && gcloud auth application-default set-quota-project intellidial-39ca7
 * Only available in development.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  clearFirestoreCredentialFailed();
  return NextResponse.json({ ok: true, message: "Firestore credential flag cleared. Next org lookup will try Firestore." });
}
