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
  agentInstructions?: string | null;
  notifyOnComplete?: boolean;
  /** Enable post-call survey; recipient can give feedback */
  surveyEnabled?: boolean;
  /** Call window start (HH:mm), e.g. "09:00" */
  callWindowStart?: string | null;
  /** Call window end (HH:mm), e.g. "17:00" */
  callWindowEnd?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Firestore: contacts (collection). Query by projectId. */
export type ContactDoc = {
  projectId: string;
  phone: string;
  name?: string | null;
  status: ContactStatus;
  callResult?: CallResult | null;
  /** VAPI call ID of last processed end-of-call webhook (idempotency). */
  lastVapiCallId?: string | null;
  /** VAPI call ID of current in-flight call (for polling transcript/recording). */
  vapiCallId?: string | null;
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

/** Collection names */
export const COLLECTIONS = {
  users: "users",
  projects: "projects",
  contacts: "contacts",
  organizations: "organizations",
  invitations: "invitations",
  notifications: "notifications",
} as const;
