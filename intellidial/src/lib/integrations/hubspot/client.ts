/**
 * HubSpot API client
 * Handles authentication, token refresh, and API calls
 */

import { getHubSpotIntegration, saveHubSpotIntegration } from "@/lib/data/store";
import type {
  HubSpotContact,
  HubSpotContactResponse,
  HubSpotTokenResponse,
  HubSpotAccountInfo,
  HubSpotDeal,
  HubSpotDealProperties,
  HubSpotDealResponse,
  HubSpotPipeline,
  HubSpotPipelinesResponse,
  HubSpotList,
  HubSpotListsSearchResponse,
  HubSpotListMembershipsResponse,
} from "./types";

const HUBSPOT_API_BASE = "https://api.hubapi.com";
const RATE_LIMIT_DELAY = 100; // ms between requests (100 requests per 10 seconds = 100ms per request)

let lastRequestTime = 0;

/**
 * Rate limiting helper
 */
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}

/**
 * Get valid access token for an organization.
 * Refreshes token if expired.
 */
export async function getAccessToken(orgId: string): Promise<string | null> {
  const integration = await getHubSpotIntegration(orgId);
  if (!integration || !integration.enabled) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const isExpired = integration.expiresAt < now;

  if (!isExpired) {
    return integration.accessToken;
  }

  // Token expired, refresh it
  return await refreshAccessToken(orgId, integration.refreshToken);
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  orgId: string,
  refreshToken: string
): Promise<string | null> {
  const integration = await getHubSpotIntegration(orgId);
  
  // Use custom credentials if available, otherwise use shared app
  let clientId = integration?.customClientId || process.env.HUBSPOT_CLIENT_ID;
  let clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  
  // Decrypt custom client secret if it exists
  if (integration?.customClientSecret) {
    try {
      const crypto = await import("crypto");
      const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY;
      if (ENCRYPTION_KEY) {
        const parts = integration.customClientSecret.split(":");
        if (parts.length === 3) {
          const key = ENCRYPTION_KEY.length >= 64 
            ? Buffer.from(ENCRYPTION_KEY.slice(0, 64), "hex")
            : crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
          const iv = Buffer.from(parts[0], "hex");
          const authTag = Buffer.from(parts[1], "hex");
          const encrypted = parts[2];
          const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
          decipher.setAuthTag(authTag);
          let decrypted = decipher.update(encrypted, "hex", "utf8");
          decrypted += decipher.final("utf8");
          clientSecret = decrypted;
        }
      }
    } catch (error) {
      console.error("[HubSpot] Failed to decrypt custom secret:", error);
      // Fall back to shared app credentials
      clientId = process.env.HUBSPOT_CLIENT_ID;
      clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    }
  }

  if (!clientId || !clientSecret) {
    console.error("[HubSpot] Client ID or Secret not configured");
    return null;
  }

  try {
    await rateLimit();
    const response = await fetch(`${HUBSPOT_API_BASE}/oauth/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[HubSpot] Token refresh failed:", errorText);
      return null;
    }

    const tokenData = (await response.json()) as HubSpotTokenResponse;
    const { access_token, refresh_token: new_refresh_token, expires_in } = tokenData;

    if (!access_token) {
      return null;
    }

    // Update integration with new tokens
    const integration = await getHubSpotIntegration(orgId);
    if (integration) {
      const expiresAt = Math.floor(Date.now() / 1000) + (expires_in || 21600);
      await saveHubSpotIntegration(orgId, {
        ...integration,
        accessToken: access_token,
        refreshToken: new_refresh_token || refreshToken,
        expiresAt,
      });
    }

    return access_token;
  } catch (error) {
    console.error("[HubSpot] Token refresh error:", error);
    return null;
  }
}

/**
 * Get contacts from HubSpot
 */
export async function getContacts(
  orgId: string,
  options?: {
    limit?: number;
    offset?: number;
    leadStatus?: string; // Filter by hs_lead_status
  }
): Promise<{ contacts: HubSpotContact[]; hasMore: boolean; nextOffset?: string }> {
  const accessToken = await getAccessToken(orgId);
  if (!accessToken) {
    throw new Error("No valid access token");
  }

  const limit = options?.limit ?? 100;
  const offset = options?.offset;

  // Build properties to fetch
  const properties = ["phone", "email", "firstname", "lastname", "company", "hs_lead_status"];

  // Build filter if leadStatus is provided
  let filter = "";
  if (options?.leadStatus) {
    filter = `&hs_lead_status=${encodeURIComponent(options.leadStatus)}`;
  }

  // Build pagination parameter (only include 'after' if offset is provided)
  const pagination = offset ? `&after=${offset}` : "";

  try {
    await rateLimit();
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts?limit=${limit}&properties=${properties.join(",")}${pagination}${filter}`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token might be invalid, try refreshing
        const integration = await getHubSpotIntegration(orgId);
        if (integration?.refreshToken) {
          const newToken = await refreshAccessToken(orgId, integration.refreshToken);
          if (newToken) {
            // Retry once with new token
            await rateLimit();
            const retryResponse = await fetch(url, {
              headers: {
                Authorization: `Bearer ${newToken}`,
              },
            });
            if (!retryResponse.ok) {
              const errorText = await retryResponse.text();
              throw new Error(`HubSpot API error: ${retryResponse.status} - ${errorText}`);
            }
            const retryData = (await retryResponse.json()) as HubSpotContactResponse;
            return {
              contacts: retryData.results || [],
              hasMore: !!retryData.paging?.next,
              nextOffset: retryData.paging?.next?.after,
            };
          }
        }
      }
      const errorText = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as HubSpotContactResponse;
    return {
      contacts: data.results || [],
      hasMore: !!data.paging?.next,
      nextOffset: data.paging?.next?.after,
    };
  } catch (error) {
    console.error("[HubSpot] getContacts error:", error);
    throw error;
  }
}

/**
 * Get single contact by ID
 */
export async function getContactById(
  orgId: string,
  contactId: string
): Promise<HubSpotContact | null> {
  const accessToken = await getAccessToken(orgId);
  if (!accessToken) {
    return null;
  }

  const properties = ["phone", "email", "firstname", "lastname", "company", "hs_lead_status"];

  try {
    await rateLimit();
    const response = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}?properties=${properties.join(",")}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as HubSpotContact;
  } catch (error) {
    console.error("[HubSpot] getContactById error:", error);
    return null;
  }
}

/** In-memory cache: orgs for which we've ensured intellidial_sync_status property exists (per process) */
const syncStatusPropertyEnsured = new Set<string>();

export const INTELLIDIAL_SYNC_STATUS_PROPERTY = "intellidial_sync_status";

/**
 * Ensure the contact property "intellidial_sync_status" exists in HubSpot (create if not).
 * Cached per org per process so we don't call the API every sync.
 */
export async function ensureIntellidialSyncStatusProperty(orgId: string): Promise<void> {
  if (syncStatusPropertyEnsured.has(orgId)) return;
  const accessToken = await getAccessToken(orgId);
  if (!accessToken) return;

  try {
    await rateLimit();
    const getRes = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/properties/contacts/${INTELLIDIAL_SYNC_STATUS_PROPERTY}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (getRes.ok) {
      syncStatusPropertyEnsured.add(orgId);
      return;
    }
    if (getRes.status !== 404) return;

    await rateLimit();
    const createRes = await fetch(`${HUBSPOT_API_BASE}/crm/v3/properties/contacts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        groupName: "contactinformation",
        name: INTELLIDIAL_SYNC_STATUS_PROPERTY,
        label: "Intellidial sync status",
        type: "string",
        fieldType: "text",
      }),
    });
    if (createRes.ok) syncStatusPropertyEnsured.add(orgId);
  } catch (err) {
    console.warn("[HubSpot] ensureIntellidialSyncStatusProperty:", err);
  }
}

const CONTACT_PROPERTIES = ["phone", "email", "firstname", "lastname", "company", "hs_lead_status"];
const CONTACT_OBJECT_TYPE_ID = "0-1";

/**
 * Search HubSpot contact lists (segments). Returns lists of objectTypeId 0-1 (contacts).
 */
export async function searchContactLists(orgId: string): Promise<HubSpotList[]> {
  const accessToken = await getAccessToken(orgId);
  if (!accessToken) {
    throw new Error("No valid access token");
  }

  try {
    await rateLimit();
    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/lists/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        objectTypeId: CONTACT_OBJECT_TYPE_ID,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as HubSpotListsSearchResponse;
    return data.results || [];
  } catch (error) {
    console.error("[HubSpot] searchContactLists error:", error);
    throw error;
  }
}

/**
 * Get list memberships (record IDs) for a list. Paginated via after.
 */
export async function getListMemberships(
  orgId: string,
  listId: string,
  options?: { after?: string; limit?: number }
): Promise<{ recordIds: string[]; after?: string }> {
  const accessToken = await getAccessToken(orgId);
  if (!accessToken) {
    throw new Error("No valid access token");
  }

  const limit = options?.limit ?? 100;
  const after = options?.after;
  const qs = new URLSearchParams();
  qs.set("limit", String(limit));
  if (after) qs.set("after", after);

  try {
    await rateLimit();
    const url = `${HUBSPOT_API_BASE}/crm/v3/lists/${listId}/memberships?${qs.toString()}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as HubSpotListMembershipsResponse;
    const results = data.results || [];
    const recordIds = results.map((r: { recordId: string }) => r.recordId);
    const nextAfter = data.paging?.next?.after;
    return { recordIds, after: nextAfter };
  } catch (error) {
    console.error("[HubSpot] getListMemberships error:", error);
    throw error;
  }
}

/**
 * Batch read contacts by IDs (max 100 per request). Returns full contact objects.
 */
export async function getContactsBatch(
  orgId: string,
  contactIds: string[]
): Promise<HubSpotContact[]> {
  if (contactIds.length === 0) return [];
  const accessToken = await getAccessToken(orgId);
  if (!accessToken) {
    throw new Error("No valid access token");
  }

  try {
    await rateLimit();
    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts/batch/read`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: CONTACT_PROPERTIES,
        inputs: contactIds.map((id) => ({ id })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as { results: HubSpotContact[] };
    return data.results || [];
  } catch (error) {
    console.error("[HubSpot] getContactsBatch error:", error);
    throw error;
  }
}

/**
 * Get all contacts that are members of a HubSpot list (paginates memberships and batch-reads contacts).
 */
export async function getContactsByListId(
  orgId: string,
  listId: string,
  options?: { limit?: number }
): Promise<{ contacts: HubSpotContact[]; hasMore: boolean }> {
  const maxContacts = options?.limit ?? 500;
  const allRecordIds: string[] = [];
  let after: string | undefined;

  do {
    const { recordIds, after: nextAfter } = await getListMemberships(orgId, listId, {
      after,
      limit: 100,
    });
    allRecordIds.push(...recordIds);
    after = nextAfter;
    if (allRecordIds.length >= maxContacts) break;
  } while (after);

  const idsToFetch = allRecordIds.slice(0, maxContacts);
  const contacts: HubSpotContact[] = [];

  for (let i = 0; i < idsToFetch.length; i += 100) {
    const batch = idsToFetch.slice(i, i + 100);
    const batchContacts = await getContactsBatch(orgId, batch);
    contacts.push(...batchContacts);
  }

  return {
    contacts,
    hasMore: allRecordIds.length > maxContacts,
  };
}

/**
 * Get deal pipelines and stages from HubSpot
 */
export async function getDealPipelines(orgId: string): Promise<HubSpotPipeline[]> {
  const accessToken = await getAccessToken(orgId);
  if (!accessToken) {
    throw new Error("No valid access token");
  }

  try {
    await rateLimit();
    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/pipelines/deals`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as HubSpotPipelinesResponse;
    return data.results || [];
  } catch (error) {
    console.error("[HubSpot] getDealPipelines error:", error);
    throw error;
  }
}

/**
 * Create a deal in HubSpot
 */
export async function createDeal(
  orgId: string,
  dealProperties: HubSpotDealProperties
): Promise<HubSpotDealResponse | null> {
  const accessToken = await getAccessToken(orgId);
  if (!accessToken) {
    return null;
  }

  try {
    await rateLimit();
    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/deals`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: dealProperties,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[HubSpot] Create deal failed:", response.status, errorText);
      return null;
    }

    return (await response.json()) as HubSpotDealResponse;
  } catch (error) {
    console.error("[HubSpot] Create deal error:", error);
    return null;
  }
}

/**
 * Associate a deal with a contact
 */
export async function associateDealWithContact(
  orgId: string,
  dealId: string,
  contactId: string
): Promise<boolean> {
  const accessToken = await getAccessToken(orgId);
  if (!accessToken) {
    return false;
  }

  try {
    await rateLimit();
    const response = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            associationCategory: "HUBSPOT_DEFINED",
            associationTypeId: 3, // Deal to Contact association
          },
        ]),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[HubSpot] Associate deal with contact failed:", response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[HubSpot] Associate deal with contact error:", error);
    return false;
  }
}

/**
 * Get available Lead Status values from HubSpot
 * Fetches the hs_lead_status property definition to get enum values
 */
export async function getLeadStatuses(orgId: string): Promise<string[]> {
  const accessToken = await getAccessToken(orgId);
  if (!accessToken) {
    throw new Error("No valid access token");
  }

  try {
    await rateLimit();
    const response = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/properties/contacts/hs_lead_status`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      // If property doesn't exist or we can't fetch it, return common defaults
      console.warn("[HubSpot] Could not fetch lead statuses, using defaults");
      return [
        "NEW",
        "CONNECTED",
        "OPEN",
        "IN_PROGRESS",
        "OPEN_DEAL",
        "UNQUALIFIED",
        "ATTEMPTED_TO_CONTACT",
        "CONNECTED",
        "BAD_TIMING",
        "NOT_INTERESTED",
      ];
    }

    const propertyData = (await response.json()) as {
      options?: Array<{ label: string; value: string }>;
    };

    if (propertyData.options && propertyData.options.length > 0) {
      return propertyData.options.map((opt) => opt.value);
    }

    // Fallback to common defaults if no options found
    return [
      "NEW",
      "CONNECTED",
      "OPEN",
      "IN_PROGRESS",
      "OPEN_DEAL",
      "UNQUALIFIED",
      "ATTEMPTED_TO_CONTACT",
      "BAD_TIMING",
      "NOT_INTERESTED",
    ];
  } catch (error) {
    console.error("[HubSpot] getLeadStatuses error:", error);
    // Return common defaults on error
    return [
      "NEW",
      "CONNECTED",
      "OPEN",
      "IN_PROGRESS",
      "OPEN_DEAL",
      "UNQUALIFIED",
      "ATTEMPTED_TO_CONTACT",
      "BAD_TIMING",
      "NOT_INTERESTED",
    ];
  }
}
