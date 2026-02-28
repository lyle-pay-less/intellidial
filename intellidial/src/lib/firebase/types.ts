/**
 * Firestore data model for back office (GCP / Firebase).
 * Collections: users, projects, contacts.
 */

export type ProjectStatus = "draft" | "running" | "completed" | "paused";
export type ContactStatus = "pending" | "calling" | "success" | "failed";

export type CaptureField = {
  key: string;
  label: string;
  type?: "text" | "number";
};

export type CallResult = {
  durationSeconds?: number;
  recordingUrl?: string;
  transcript?: string;
  capturedData?: Record<string, string | number | null>;
  attemptedAt?: string; // ISO date
  failureReason?: string;
};

/** One call in history (CallResult + VAPI call id for idempotency). */
export type CallResultEntry = CallResult & { vapiCallId?: string };

/** Firestore: users (collection). Doc id = auth uid. */
export type UserDoc = {
  email: string;
  name?: string | null;
  createdAt: string; // ISO
};

/** Question the agent asks during a call */
export type AgentQuestion = {
  id: string;
  text: string;
  fieldKey?: string; // Excel column name, AI-generated
};

/** Firestore: projects (collection). */
export type ProjectDoc = {
  orgId: string;
  userId: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  /** VAPI assistant ID (set when agent is created for calls) */
  assistantId?: string | null;
  /** VAPI assistant ID for in-browser test only (no server URL; avoids daily-error on web) */
  testAssistantId?: string | null;
  /** VAPI structured output ID (for extracting captureFields from calls) */
  structuredOutputId?: string | null;
  /** Agent identity (used in prompt): name, company calling on behalf of, outbound number */
  agentName?: string | null;
  agentCompany?: string | null;
  agentNumber?: string | null;
  /** VAPI phone number ID used for outbound calls (dropdown selection). */
  agentPhoneNumberId?: string | null;
  /** VAPI/11labs voice id — e.g. 11labs voiceId for dropdown */
  agentVoice?: string | null;
  /** Public URL for the agent's avatar/picture (shown on project cards and in UI). */
  agentImageUrl?: string | null;
  /** User's own goal description (typed or from voice note); primary goal input */
  userGoal?: string | null;
  /** Industry for AI-generated defaults */
  industry?: string | null;
  /** How the agent should act — AI-generated */
  tone?: string | null;
  /** Goal of the agent — AI-generated expansion of userGoal */
  goal?: string | null;
  /** Questions the agent asks */
  agentQuestions?: AgentQuestion[];
  captureFields?: CaptureField[];
  /** Business context: what the company does, location, hours, etc. (e.g. generated from website URL). */
  businessContext?: string | null;
  agentInstructions?: string | null;
  notifyOnComplete?: boolean;
  /** Enable post-call survey; recipient can give feedback */
  surveyEnabled?: boolean;
  /** Call window start (HH:mm), e.g. "09:00" */
  callWindowStart?: string | null;
  /** Call window end (HH:mm), e.g. "17:00" */
  callWindowEnd?: string | null;
  /** Google Sheet ID for export (user shares the sheet with service account). */
  googleSheetId?: string | null;
  /** Dealership mode: when true, project has a vehicle listing URL and full vehicle context for the agent. */
  dealershipEnabled?: boolean | null;
  /** Vehicle listing URL (e.g. AutoTrader) — the car the customer enquired from. Used to fetch full context. */
  vehicleListingUrl?: string | null;
  /** Full text extracted from the vehicle listing page (no summarisation). Agent uses this to answer any question about the vehicle. */
  vehicleContextFullText?: string | null;
  /** When vehicle context was last refreshed (ISO). */
  vehicleContextUpdatedAt?: string | null;
  /** Editable system instructions (visible in UI). When null, built-in default is used. */
  callContextInstructions?: string | null;
  identityInstructions?: string | null;
  endingCallInstructions?: string | null;
  complianceInstructions?: string | null;
  voiceOutputInstructions?: string | null;
  vehiclePlaceholderInstructions?: string | null;
  /** Scheduling behaviour when customer suggests a time outside business hours. */
  schedulingInstructions?: string | null;
  /** How the agent should use the vehicle listing data (header/intro for the context block). */
  vehicleContextHeaderInstructions?: string | null;
  /** How to refer to the vehicle — year/make/model only vs full trim name. */
  vehicleReferenceInstructions?: string | null;
  /** Call flow after confirming identity — intro, feature summary, then booking. */
  vehicleIntroInstructions?: string | null;
  /** Header text for the business context section in the prompt. */
  businessContextHeaderInstructions?: string | null;
  /** When true, project appears in Dealers panel (master-only dealer setups). */
  isDealerProject?: boolean | null;
  /** When set, this project is the linked project for this dealer (dealers panel opens this project). */
  dealerId?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** One link in a dealer's context links list (URL + optional label). */
export type DealerContextLink = {
  url: string;
  label?: string | null;
};

/** Firestore: dealers (collection). Org-scoped; separate from projects. */
export type DealerDoc = {
  orgId: string;
  /** Optional pronunciation notes for the address (e.g. "Voortrekker: say Foor-trekker (Afrikaans)"). Used when the agent says the address aloud. */
  addressPronunciationNotes?: string | null;
  /** Dealer name (required). */
  name: string;
  /** Physical address. */
  address?: string | null;
  /** Dealer phone number. */
  phoneNumber?: string | null;
  /** Operation hours, e.g. "Mon–Fri 8–17, Sat 8–12". */
  operationHours?: string | null;
  /** Email; stored for future linking (e.g. enquiries). */
  email?: string | null;
  /** Dealer name (required). */
  name: string;
  /** Physical address. */
  address?: string | null;
  /** Email to link enquiries back to this dealership (e.g. the address that forwards to leads@ so we know which dealer the lead came from). */
  forwardingEmail?: string | null;
  /** Dealer phone number. */
  phoneNumber?: string | null;
  /** Operation hours, e.g. "Mon–Fri 8–17, Sat 8–12". */
  operationHours?: string | null;
  /** Email; stored for future linking (e.g. enquiries). */
  email?: string | null;
  /** Multiple URLs for dealer context (e.g. dealer site, AutoTrader). */
  contextLinks?: DealerContextLink[] | null;
  /** Linked project id (project has dealerId = this dealer's id). Opening dealer opens this project. */
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Firestore: contacts (collection). Query by projectId. */
export type ContactDoc = {
  projectId: string;
  phone: string;
  name?: string | null;
  /** Do-not-call: set when contact opts out (POPIA / compliance). Skip when starting calls. */
  optOut?: boolean | null;
  status: ContactStatus;
  /** Latest call result (for quick access and backward compatibility). */
  callResult?: CallResult | null;
  /** All call attempts to this contact (newest last). Used when phoning the same person more than once. */
  callHistory?: CallResultEntry[] | null;
  /** VAPI call ID of last processed end-of-call webhook (idempotency). */
  lastVapiCallId?: string | null;
  /** VAPI call ID of current in-flight call (for polling transcript/recording). */
  vapiCallId?: string | null;
  /** HubSpot contact ID (for HubSpot integration sync) */
  hubspotContactId?: string | null;
  /** HubSpot lead status (for filtering/syncing) */
  hubspotLeadStatus?: string | null;
  /** Last time this contact was synced to HubSpot (ISO timestamp) */
  lastSyncedToHubSpot?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Firestore: organizations (collection). */
export type OrganizationDoc = {
  name: string;
  ownerId: string;
  createdAt: string; // ISO
  /** VAPI phone number ID (caller ID for outbound) */
  phoneNumberId?: string | null;
  phoneNumberE164?: string | null;
  phoneNumberStatus?: "none" | "pending" | "active" | "imported" | null;
  /** Plan and usage (org-level limits) — optional for first "call now" milestone */
  plan?: "starter" | "growth" | "business" | null;
  callsLimit?: number;
  minutesLimit?: number;
  usagePeriodStart?: string | null;
  callsUsed?: number;
  minutesUsed?: number;
};

/** Firestore: teamMembers (subcollection under organizations/{orgId}/members). */
export type TeamMemberDoc = {
  userId: string;
  email: string;
  name?: string | null;
  role: "owner" | "admin" | "operator" | "viewer";
  status: "active" | "invited" | "suspended";
  invitedAt?: string; // ISO
  lastActive?: string; // ISO
};

/** Firestore: invitations (collection). */
export type InvitationDoc = {
  email: string;
  role: "admin" | "operator" | "viewer";
  orgId: string;
  invitedBy: string;
  createdAt: string; // ISO
  expiresAt: string; // ISO
  accepted: boolean;
};

/** Firestore: notifications (collection). */
export type NotificationDoc = {
  orgId: string;
  userId: string; // recipient user ID
  type: "call_completed" | "call_failed" | "data_missing" | "project_complete" | "usage_warning";
  title: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO
  readAt?: string; // ISO
  metadata?: {
    projectId?: string;
    projectName?: string;
    contactId?: string;
    contactPhone?: string;
    contactName?: string;
    callId?: string;
    durationSeconds?: number;
    failureReason?: string;
    missingFields?: string[];
    capturedData?: Record<string, string | number | null>;
    transcript?: string;
    recordingUrl?: string;
    callsMade?: number;
    successfulCalls?: number;
    failedCalls?: number;
  };
};

/** Firestore: hubspotIntegrations (collection). One per organization. */
export type HubSpotIntegrationDoc = {
  orgId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (seconds)
  hubspotAccountId: string; // HubSpot portal ID
  hubspotAccountName?: string; // Account name/email for display
  connectedAt: string; // ISO
  enabled: boolean;
  /** Custom HubSpot app credentials (encrypted) - optional, uses shared app by default */
  customClientId?: string; // User's own HubSpot Client ID
  customClientSecret?: string; // Encrypted Client Secret
  /** Sync settings */
  settings?: {
    autoSync?: boolean; // Auto-sync calls to HubSpot
    callLeadStatuses?: string[]; // Which Lead Statuses to call
    dontCallLeadStatuses?: string[]; // Which Lead Statuses to skip
    successLeadStatus?: string; // Lead Status to set on successful call
    failedLeadStatus?: string; // Lead Status to set on failed call
    meetingLeadStatus?: string; // Lead Status to set on meeting booked
    syncTranscript?: boolean; // Create Notes with transcript
    syncRecording?: boolean; // Store recording URL in custom property
    syncMeetings?: boolean; // Create Meetings when booked
    syncDeals?: boolean; // Create Deals when meetings booked (default: true)
    dealPipelineId?: string; // Default pipeline ID for deals
    dealStageId?: string; // Default stage ID for deals (e.g., "Meeting Scheduled")
    fieldMappings?: Record<string, string>; // Intellidial field → HubSpot property
  };
};

/** Firestore: googleSheetsIntegrations (collection). One per organization. */
export type GoogleSheetsIntegrationDoc = {
  orgId: string;
  enabled: boolean;
  serviceAccountEmail?: string; // Service account email (for sharing instructions)
  configuredAt?: string; // ISO timestamp
};

/** Firestore: gcpIntegrations (collection). One per organization. */
export type GCPIntegrationDoc = {
  orgId: string;
  enabled: boolean;
  bucketName?: string;
  serviceAccountKey?: string; // Encrypted service account JSON key
  configuredAt?: string; // ISO timestamp
};

/** Firestore: hubspotSyncLog (collection). Many per organization. */
export type HubSpotSyncLogDoc = {
  orgId: string;
  contactId: string;
  hubspotContactId: string;
  timestamp: string; // ISO timestamp
  status: "success" | "failed";
  action: string; // "Updated Lead Status", "Created Note", etc.
  error?: string;
};

/** Firestore: hubspotSyncQueue (collection). Failed syncs to retry. */
export type HubSpotSyncQueueDoc = {
  orgId: string;
  projectId: string;
  contactId: string;
  addedAt: string; // ISO timestamp
  lastError: string;
  retryCount: number;
};

/** Collection names */
export const COLLECTIONS = {
  users: "users",
  projects: "projects",
  dealers: "dealers",
  contacts: "contacts",
  organizations: "organizations",
  invitations: "invitations",
  notifications: "notifications",
  hubspotIntegrations: "hubspotIntegrations",
  googleSheetsIntegrations: "googleSheetsIntegrations",
  gcpIntegrations: "gcpIntegrations",
  hubspotSyncLog: "hubspotSyncLog",
  hubspotSyncQueue: "hubspotSyncQueue",
} as const;
