/**
 * Sync call results to HubSpot
 * Updates lead status, creates notes, updates custom properties
 */

import { getHubSpotIntegration } from "@/lib/data/store";
import {
  getAccessToken,
  refreshAccessToken,
  createDeal,
  associateDealWithContact,
} from "./client";
import type { HubSpotDealProperties } from "./types";
import type { ContactDoc } from "@/lib/firebase/types";
import type { CallResult } from "@/lib/firebase/types";

const HUBSPOT_API_BASE = "https://api.hubapi.com";
const RATE_LIMIT_DELAY = 100; // ms between requests

let lastRequestTime = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}

/**
 * Update HubSpot contact properties
 */
async function updateContactProperties(
  accessToken: string,
  contactId: string,
  properties: Record<string, string | number | null>
): Promise<boolean> {
  try {
    await rateLimit();
    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[HubSpot] Update contact properties failed:", response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[HubSpot] Update contact properties error:", error);
    return false;
  }
}

/**
 * Create a note/timeline event in HubSpot
 */
async function createNote(
  accessToken: string,
  contactId: string,
  noteBody: string
): Promise<boolean> {
  try {
    await rateLimit();
    // First create the note
    const noteResponse = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/notes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          hs_note_body: noteBody,
          hs_timestamp: Date.now().toString(),
        },
      }),
    });

    if (!noteResponse.ok) {
      const errorText = await noteResponse.text();
      console.error("[HubSpot] Create note failed:", noteResponse.status, errorText);
      return false;
    }

    const noteData = (await noteResponse.json()) as { id?: string };
    if (!noteData.id) {
      console.error("[HubSpot] Note created but no ID returned");
      return false;
    }

    // Then associate the note with the contact
    await rateLimit();
    const associationResponse = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/notes/${noteData.id}/associations/contacts/${contactId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            associationCategory: "HUBSPOT_DEFINED",
            associationTypeId: 214, // Contact to Note
          },
        ]),
      }
    );

    if (!associationResponse.ok) {
      // Note was created but association failed - log but don't fail
      const errorText = await associationResponse.text();
      console.warn("[HubSpot] Note association failed:", associationResponse.status, errorText);
    }

    return true;
  } catch (error) {
    console.error("[HubSpot] Create note error:", error);
    return false;
  }
}

/**
 * Create a meeting/event in HubSpot (for meeting bookings)
 * Uses the engagements API to create a meeting
 */
async function createMeeting(
  accessToken: string,
  contactId: string,
  meetingDate: string,
  description?: string
): Promise<boolean> {
  try {
    await rateLimit();
    // Create engagement (meeting)
    const engagementResponse = await fetch(`${HUBSPOT_API_BASE}/engagements/v1/engagements`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        engagement: {
          type: "MEETING",
          active: true,
        },
        associations: {
          contactIds: [contactId],
        },
        metadata: {
          body: description || "Meeting scheduled via Intellidial",
          startTime: new Date(meetingDate).getTime(),
          endTime: new Date(new Date(meetingDate).getTime() + 30 * 60 * 1000).getTime(), // 30 min default
        },
      }),
    });

    if (!engagementResponse.ok) {
      const errorText = await engagementResponse.text();
      console.error("[HubSpot] Create meeting failed:", engagementResponse.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[HubSpot] Create meeting error:", error);
    return false;
  }
}

/**
 * Create a deal in HubSpot for a booked meeting
 */
async function createDealForMeeting(
  orgId: string,
  contact: ContactDoc & { id: string },
  callResult: CallResult
): Promise<void> {
  const integration = await getHubSpotIntegration(orgId);
  if (!integration || !integration.enabled) {
    return;
  }

  // Check if deal sync is enabled (default: true)
  const syncDeals = integration.settings?.syncDeals !== false; // Default to true
  if (!syncDeals) {
    return;
  }

  const accessToken = await getAccessToken(orgId);
  if (!accessToken) {
    console.warn("[HubSpot] No valid access token for deal creation");
    return;
  }

  const contactId = contact.hubspotContactId;
  if (!contactId) {
    return;
  }

  // Check if meeting was booked
  const meetingBookedValue = callResult.capturedData?.meeting_booked;
  const meetingBooked =
    (meetingBookedValue === "true" || meetingBookedValue === "yes" || meetingBookedValue === 1) ||
    callResult.capturedData?.appointment_date ||
    callResult.capturedData?.meeting_date;

  if (!meetingBooked) {
    return; // No meeting booked, skip deal creation
  }

  try {
    const appointmentDate = (callResult.capturedData?.appointment_date ||
      callResult.capturedData?.meeting_date) as string;

    // Get deal settings from integration (or use defaults)
    const pipelineId = integration.settings?.dealPipelineId || "default";
    // Use configured stage or fallback to "appointmentscheduled" or first stage
    const stageId = integration.settings?.dealStageId || "appointmentscheduled";

    // Build deal name
    const contactName = contact.name || contact.phone;
    const dealName = appointmentDate
      ? `Meeting with ${contactName} - ${new Date(appointmentDate).toLocaleDateString()}`
      : `Meeting with ${contactName}`;

    // Get deal amount if captured
    const dealAmount =
      callResult.capturedData?.deal_value ||
      callResult.capturedData?.amount ||
      callResult.capturedData?.value;

    // Format close date (HubSpot expects timestamp in milliseconds)
    const closeDate = appointmentDate
      ? new Date(appointmentDate).getTime().toString()
      : undefined;

    // Create deal properties
    const dealProperties: HubSpotDealProperties = {
      dealname: dealName,
      dealstage: stageId,
      pipeline: pipelineId,
    };

    if (closeDate) {
      dealProperties.closedate = closeDate;
    }

    if (dealAmount) {
      dealProperties.amount = String(dealAmount);
    }

    // Add deal description from transcript
    if (callResult.transcript) {
      const description = callResult.transcript.slice(0, 500); // Limit to 500 chars
      dealProperties.description = description;
    }

    // Create the deal
    const deal = await createDeal(orgId, dealProperties);
    if (!deal) {
      console.error("[HubSpot] Failed to create deal");
      return;
    }

    // Associate deal with contact
    const associated = await associateDealWithContact(orgId, deal.id, contactId);
    if (!associated) {
      console.warn("[HubSpot] Deal created but failed to associate with contact");
    }

    console.log(`[HubSpot] Successfully created deal ${deal.id} for contact ${contactId}`);
  } catch (error) {
    // Don't throw - we don't want to fail the webhook if deal creation fails
    console.error("[HubSpot] Create deal for meeting error:", error);
  }
}

/**
 * Sync call result to HubSpot
 * Updates lead status, creates notes, updates custom properties
 */
export async function syncCallResultToHubSpot(
  orgId: string,
  contact: ContactDoc & { id: string },
  callResult: CallResult
): Promise<void> {
  // Check if contact has hubspotContactId
  if (!contact.hubspotContactId) {
    return; // No HubSpot contact linked, skip sync
  }

  // Check if HubSpot integration is enabled
  const integration = await getHubSpotIntegration(orgId);
  if (!integration || !integration.enabled) {
    return; // HubSpot not connected or disabled
  }

  // Check if autoSync is enabled (default: true)
  const autoSync = integration.settings?.autoSync !== false; // Default to true
  if (!autoSync) {
    return; // Auto-sync disabled
  }

  // Get access token
  let accessToken = await getAccessToken(orgId);
  if (!accessToken) {
    console.warn("[HubSpot] No valid access token for sync");
    return;
  }

  const contactId = contact.hubspotContactId;
  const isSuccess = !callResult.failureReason;
  const isFailed = !!callResult.failureReason;

  try {
    // Update Lead Status based on call outcome (use settings or defaults)
    const leadStatusUpdates: Record<string, string> = {};
    const successStatus = integration.settings?.successLeadStatus || "CONNECTED";
    const failedStatus = integration.settings?.failedLeadStatus || "ATTEMPTED_TO_CONTACT";
    const meetingStatus = integration.settings?.meetingLeadStatus || "MEETING_SCHEDULED";

    if (isSuccess) {
      leadStatusUpdates.hs_lead_status = successStatus;
    } else if (isFailed) {
      leadStatusUpdates.hs_lead_status = failedStatus;
    }

    // Check if meeting was booked
    const meetingBookedValue = callResult.capturedData?.meeting_booked;
    const meetingBooked =
      (meetingBookedValue === "true" || meetingBookedValue === "yes" || meetingBookedValue === 1) ||
      callResult.capturedData?.appointment_date ||
      callResult.capturedData?.meeting_date;

    if (meetingBooked) {
      leadStatusUpdates.hs_lead_status = meetingStatus;
    }

    // Get sync settings
    const syncRecording = integration.settings?.syncRecording !== false; // Default: true
    const syncTranscript = integration.settings?.syncTranscript !== false; // Default: true

    // Update custom properties (respect sync settings)
    const customProperties: Record<string, string | number | null> = {
      ...leadStatusUpdates,
    };

    if (syncRecording && callResult.recordingUrl) {
      customProperties.intellidial_recording_url = callResult.recordingUrl;
    }

    if (callResult.durationSeconds !== undefined) {
      customProperties.intellidial_last_call_duration = callResult.durationSeconds;
    }

    if (callResult.attemptedAt) {
      customProperties.intellidial_last_call_date = callResult.attemptedAt;
    }

    // Increment call count (we'll need to fetch current value first, or use a separate endpoint)
    // For now, we'll just set the last call date and let HubSpot handle counting if needed

    // Update contact properties
    if (Object.keys(customProperties).length > 0) {
      await updateContactProperties(accessToken, contactId, customProperties);
    }

    // Create Note with transcript (if transcript exists and syncTranscript enabled)
    if (syncTranscript && callResult.transcript) {
      const noteBody = `Intellidial Call Transcript:\n\n${callResult.transcript}\n\nDuration: ${callResult.durationSeconds || 0} seconds\nStatus: ${isSuccess ? "Success" : "Failed"}${
        callResult.failureReason ? `\nReason: ${callResult.failureReason}` : ""
      }${syncRecording && callResult.recordingUrl ? `\nRecording: ${callResult.recordingUrl}` : ""}`;

      await createNote(accessToken, contactId, noteBody);
    }

    // Create Meeting/Event if meeting was booked (if syncMeetings enabled)
    const syncMeetings = integration.settings?.syncMeetings !== false; // Default: true
    if (syncMeetings && meetingBooked && callResult.capturedData?.appointment_date) {
      const appointmentDate = callResult.capturedData.appointment_date as string;
      await createMeeting(
        accessToken,
        contactId,
        appointmentDate,
        callResult.transcript || "Meeting scheduled during call"
      );
    }

    // Create Deal if meeting was booked (if syncDeals enabled)
    const syncDeals = integration.settings?.syncDeals !== false; // Default: true
    if (syncDeals && meetingBooked) {
      await createDealForMeeting(orgId, contact, callResult);
    }

    // Update lastSyncedToHubSpot timestamp on contact
    // Note: This is done in the webhook handler after sync completes
    // We'll update it there to avoid circular dependencies

    console.log(`[HubSpot] Successfully synced call result for contact ${contactId}`);
  } catch (error) {
    // Don't throw - we don't want to fail the webhook if HubSpot sync fails
    console.error("[HubSpot] Sync call result error:", error);
  }
}
