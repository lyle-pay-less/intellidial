/**
 * Map HubSpot contact to Intellidial contact format
 */

import type { HubSpotContact } from "./types";

/**
 * Convert HubSpot contact to Intellidial contact format
 */
export function mapHubSpotToIntellidial(hubspotContact: HubSpotContact): {
  phone: string;
  name?: string;
  email?: string;
  company?: string;
  hubspotContactId: string;
  hubspotLeadStatus?: string;
} {
  const props = hubspotContact.properties;
  
  // Build name from firstname + lastname
  const firstName = props.firstname?.trim() || "";
  const lastName = props.lastname?.trim() || "";
  const name = firstName && lastName 
    ? `${firstName} ${lastName}`.trim()
    : firstName || lastName || undefined;

  return {
    phone: props.phone || "",
    name,
    email: props.email || undefined,
    company: props.company || undefined,
    hubspotContactId: hubspotContact.id,
    hubspotLeadStatus: props.hs_lead_status || undefined,
  };
}
