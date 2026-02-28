/**
 * Format duration in a human-readable way.
 * e.g. 0.37 -> "22 min", 1.5 -> "1h 30m", 0.0167 -> "1 min"
 */
export function formatDuration(hours: number): string {
  if (hours === 0) return "0 min";
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Format seconds as human-readable (e.g. enquiry-to-call time). */
export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins} min`;
  return `${mins}m ${secs}s`;
}
