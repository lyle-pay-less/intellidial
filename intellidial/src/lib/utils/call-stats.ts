/**
 * Utilities for computing call statistics (answer rate, bookings, etc.).
 */

import type { CallResult, CallResultEntry } from "@/lib/firebase/types";

/** Ended reasons that indicate the call was NOT answered (no-answer, busy, etc.). */
export const FAILED_END_REASONS = new Set([
  "no-answer",
  "busy",
  "failed",
  "error",
  "canceled",
  "rejected",
  "timeout",
  "no-answer-timeout",
  "customer-did-not-answer",
]);

/** Keys in capturedData that indicate a viewing/test drive was booked. */
const BOOKING_KEYS = ["meeting_booked", "appointment_date", "meeting_date", "viewing_booked", "test_drive_booked"];

/** Whether the call was answered (someone picked up). Uses endedReason when available, else duration heuristic. */
export function isCallAnswered(entry: CallResult | CallResultEntry | null | undefined): boolean {
  if (!entry) return false;
  const reason = (entry.endedReason ?? "").toLowerCase().trim();
  if (reason) return !FAILED_END_REASONS.has(reason);
  // Fallback: call with substantial duration was likely answered
  return (entry.durationSeconds ?? 0) > 10;
}

/** Get "why testdrive not booked" from capturedData. */
export function getWhyNotBooked(
  capturedData: Record<string, string | number | null> | null | undefined,
  captureFields?: Array<{ key: string; label?: string | null }>
): string {
  if (!capturedData) return "";
  const keys = ["reason_not_scheduled", "reason_for_not_scheduling", "reason_for_not_scheduling_test_drive", "why_not_booked", "test_drive_reason", "why_testdrive_not_booked"];
  for (const k of keys) {
    const v = capturedData[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  for (const f of captureFields ?? []) {
    if (/reason|why|not.booked|not.scheduled|test.drive/i.test(f.label ?? "") || /reason|why|not.booked|not.scheduled/i.test(f.key)) {
      const v = capturedData[f.key];
      if (v != null && String(v).trim()) return String(v).trim();
    }
  }
  for (const [k, v] of Object.entries(capturedData)) {
    if (v != null && String(v).trim() && /reason|why|not.booked|not.scheduled/i.test(k)) return String(v).trim();
  }
  return "";
}

/** Whether the call resulted in a booking (viewing/test drive). */
export function isCallBooking(capturedData: Record<string, string | number | null> | null | undefined): boolean {
  if (!capturedData || typeof capturedData !== "object") return false;
  const mb = capturedData.meeting_booked;
  if (mb === "true" || mb === "yes" || mb === 1) return true;
  if (capturedData.appointment_date || capturedData.meeting_date || capturedData.viewing_booked || capturedData.test_drive_booked)
    return true;
  for (const key of BOOKING_KEYS) {
    const v = capturedData[key];
    if (v != null && v !== "" && String(v) !== "false" && String(v) !== "no") return true;
  }
  return false;
}
