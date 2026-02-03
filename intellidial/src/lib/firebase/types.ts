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
  /** Industry for AI-generated defaults */
  industry?: string | null;
  /** How the agent should act — AI-generated */
  tone?: string | null;
  /** Goal of the agent — AI-generated */
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
  status: "active" | "invited";
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

/** Collection names */
export const COLLECTIONS = {
  users: "users",
  projects: "projects",
  contacts: "contacts",
  organizations: "organizations",
  invitations: "invitations",
} as const;
