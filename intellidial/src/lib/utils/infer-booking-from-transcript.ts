/**
 * Fallback: when VAPI structured output didn't capture a booking, infer from transcript.
 * Used so "bookings" count reflects reality when the customer said yes but structured output missed it.
 */

import { generateText } from "@/lib/gemini/client";
import { isCallBooking } from "@/lib/utils/call-stats";

const MAX_TRANSCRIPT_CHARS = 15_000;

/**
 * When capturedData doesn't indicate a booking but we have a transcript,
 * use Gemini to infer if the customer agreed to a viewing/test drive.
 * Returns enriched capturedData with meeting_booked if inferred, else original.
 * Does not throw; returns original on Gemini failure.
 */
export async function enrichCapturedDataWithTranscriptFallback(
  transcript: string,
  capturedData: Record<string, string | number | null> | null | undefined
): Promise<Record<string, string | number | null> | undefined> {
  if (!transcript?.trim()) return capturedData ?? undefined;
  if (isCallBooking(capturedData)) return capturedData ?? undefined;

  const inferred = await inferBookingFromTranscript(transcript);
  if (inferred === true) {
    return { ...(capturedData ?? {}), meeting_booked: "yes" };
  }
  return capturedData ?? undefined;
}

async function inferBookingFromTranscript(transcript: string): Promise<boolean | null> {
  const truncated =
    transcript.length > MAX_TRANSCRIPT_CHARS
      ? transcript.slice(0, MAX_TRANSCRIPT_CHARS) + "\n\n[... truncated ...]"
      : transcript;

  const prompt = `You are analyzing a phone call transcript between an AI agent and a customer. The agent likely asked if the customer wants to book a viewing or test drive of a vehicle.

Transcript:
---
${truncated}
---

Did the customer clearly agree to book a viewing or test drive? (e.g. said "yes", "sure", "I'd like to", "book me in", "let's do it", etc.)
Answer with exactly one word: YES or NO.`;

  const answer = await generateText(prompt);
  if (!answer) return null;
  const lower = answer.trim().toLowerCase();
  if (lower.startsWith("yes")) return true;
  if (lower.startsWith("no")) return false;
  return null;
}
