/**
 * HubSpot utility functions
 */

/**
 * Get HubSpot contact URL
 */
export function getHubSpotContactUrl(contactId: string, portalId: string): string {
  return `https://app.hubspot.com/contacts/${portalId}/contact/${contactId}`;
}

/**
 * Format time ago (e.g., "5 minutes ago", "2 hours ago")
 */
export function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "Just now";
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  }
}
