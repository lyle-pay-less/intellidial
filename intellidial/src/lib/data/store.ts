/**
 * In-memory store for projects and contacts.
 * Used when Firebase is not configured. Resets on server restart.
 * 
 * Organizations are now persisted to Firestore when Firebase Admin SDK is configured.
 * Falls back to in-memory storage if Firebase is not available.
 */

import type { ProjectDoc, ContactDoc, OrganizationDoc, CaptureField, NotificationDoc, HubSpotIntegrationDoc, GoogleSheetsIntegrationDoc, GCPIntegrationDoc, DealerDoc, DealerContextLink } from "@/lib/firebase/types";
import { isCallAnswered, isCallBooking } from "@/lib/utils/call-stats";
import { MOCK_PROJECTS, getMockContacts } from "@/lib/firebase/mockData";
import { getFirebaseAdminFirestore, getFirebaseAdminAuth, isFirebaseAdminConfigured, FieldValue } from "@/lib/firebase/admin";
import { COLLECTIONS, type HubSpotSyncLogDoc, type HubSpotSyncQueueDoc } from "@/lib/firebase/types";

const now = () => new Date().toISOString();

type ProjectWithId = ProjectDoc & { id: string };
type ContactWithId = ContactDoc & { id: string };
type DealerWithId = DealerDoc & { id: string };

/** Organizations: orgId -> { id, name, ownerId, createdAt, phone/plan/usage } */
type Organization = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  phoneNumberId?: string | null;
  phoneNumberE164?: string | null;
  phoneNumberStatus?: "none" | "pending" | "active" | "imported" | null;
  plan?: "starter" | "growth" | "business" | null;
  callsLimit?: number;
  minutesLimit?: number;
  usagePeriodStart?: string | null;
  callsUsed?: number;
  minutesUsed?: number;
};
/** Team members: userId -> { id, email, name, role, orgId, status, invitedAt, lastActive, updatedAt } */
type TeamMember = {
  id: string;
  email: string;
  name?: string;
  role: "owner" | "admin" | "operator" | "viewer";
  orgId: string;
  status: "active" | "invited" | "suspended";
  invitedAt?: string;
  lastActive?: string;
  updatedAt?: string;
};
/** Invitations: token -> { token, email, role, orgId, invitedBy, createdAt, expiresAt, accepted } */
type Invitation = {
  token: string;
  email: string;
  role: "admin" | "operator" | "viewer";
  orgId: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  accepted: boolean;
};

const projects = new Map<string, ProjectWithId>();
const contacts = new Map<string, ContactWithId>();
const projectContacts = new Map<string, string[]>();
/** Project call queue: contact IDs to call next (in order) */
const projectQueue = new Map<string, Set<string>>();
/** Scheduled call times per contact: projectId -> contactId -> scheduledTime (HH:mm) */
const contactScheduledTimes = new Map<string, Map<string, string>>();

/** Dealers: dealerId -> DealerWithId (org-scoped via doc.orgId) */
const dealers = new Map<string, DealerWithId>();

/** Organizations: orgId -> Organization */
const organizations = new Map<string, Organization>();
/** User to organization mapping: userId -> orgId */
const userOrganizations = new Map<string, string>();
/** Team members: userId -> TeamMember */
const teamMembers = new Map<string, TeamMember>();
/** Email to userId mapping (for quick lookup) */
const emailToUserId = new Map<string, string>();
/** Invitations: token -> Invitation */
const invitations = new Map<string, Invitation>();
/** Email to invitation token mapping (for quick lookup) */
const emailToInvitationToken = new Map<string, string>();
/** Notifications: notificationId -> NotificationDoc */
const notifications = new Map<string, NotificationDoc & { id: string }>();
/** HubSpot integrations: orgId -> HubSpotIntegrationDoc */
const hubspotIntegrations = new Map<string, HubSpotIntegrationDoc>();
/** HubSpot sync log: logId -> HubSpotSyncLogDoc */
const hubspotSyncLogs = new Map<string, HubSpotSyncLogDoc & { id: string }>();
/** HubSpot sync queue: queueId -> HubSpotSyncQueueDoc & { id: string } */
const hubspotSyncQueue = new Map<string, HubSpotSyncQueueDoc & { id: string }>();
const googleSheetsIntegrations = new Map<string, GoogleSheetsIntegrationDoc>();
const gcpIntegrations = new Map<string, GCPIntegrationDoc>();

let contactIdCounter = 0;
let notificationIdCounter = 0;
let orgIdCounter = 0;
let userIdCounter = 0;

/** Demo org ID – demo data for dev-user-1 */
const DEMO_ORG_ID = "dev-org-1";
/** Orgs that receive demo data at init */
const DEMO_ORG_IDS = [DEMO_ORG_ID];
/** Org names that get demo data seeded at runtime (test/demo orgs) */
const DEMO_ORG_NAMES = ["pay-less", "payless"];

/** When Firestore fails with a credential/re-auth error, skip Firestore on subsequent calls (avoids 7s hang per request). */
let firestoreCredentialFailed = false;
/** Last credential error message for API to return to client. */
let lastCredentialErrorHelp: string | null = null;

function isCredentialError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /invalid_grant|invalid_rapt|reauth|reauth related/i.test(msg);
}

/** Call after getUserOrganization returns null to check if Firestore failed due to credentials. */
export function hadFirestoreCredentialError(): boolean {
  return firestoreCredentialFailed;
}

/** Message to show user when credentials failed (e.g. for local dev). */
export function getFirestoreCredentialErrorHelp(): string | null {
  return lastCredentialErrorHelp;
}

/** Clear the credential-failed flag so the next request will try Firestore again (e.g. after running gcloud auth application-default login). */
export function clearFirestoreCredentialFailed(): void {
  firestoreCredentialFailed = false;
  lastCredentialErrorHelp = null;
}

function nextContactId() {
  return `contact-${++contactIdCounter}`;
}

function nextSyncLogId() {
  return `hubspot-sync-${hubspotSyncLogs.size + 1}`;
}

function nextSyncQueueId() {
  return `hubspot-queue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function initStore() {
  if (projects.size > 0) return;
  // Set up demo org so dev-user-1 sees demo data
  organizations.set(DEMO_ORG_ID, {
    id: DEMO_ORG_ID,
    name: "Demo Organization",
    ownerId: "dev-user-1",
    createdAt: now(),
  });
  userOrganizations.set("dev-user-1", DEMO_ORG_ID);
  DEMO_ORG_IDS.forEach((orgId) => {
    MOCK_PROJECTS.forEach((p, i) => {
      const id = `proj-${orgId}-${String(i + 1)}`;
      projects.set(id, { ...p, id, orgId } as ProjectWithId);
      const mockContacts = getMockContacts(id);
      const ids: string[] = [];
      mockContacts.forEach((c) => {
        const cid = nextContactId();
        contacts.set(cid, { ...c, projectId: id, id: cid } as ContactWithId);
        ids.push(cid);
      });
      projectContacts.set(id, ids);
    });
  });
  injectDemoChartData();
  console.log("[Store] Demo data initialized for dev-org-1");
}

/**
 * Seed demo data for an org (e.g. Pay-less). Call when org has no projects and name matches DEMO_ORG_NAMES.
 */
function seedDemoDataForOrg(orgId: string): void {
  if (getProjectIdsForOrg(orgId).length > 0) return; // Already has data
  MOCK_PROJECTS.forEach((p, i) => {
    const id = `proj-${orgId}-${String(i + 1)}`;
    projects.set(id, { ...p, id, orgId } as ProjectWithId);
    const mockContacts = getMockContacts(id);
    const ids: string[] = [];
    mockContacts.forEach((c) => {
      const cid = nextContactId();
      contacts.set(cid, { ...c, projectId: id, id: cid } as ContactWithId);
      ids.push(cid);
    });
    projectContacts.set(id, ids);
  });
  // Inject chart data for first project
  const firstProjectId = `proj-${orgId}-1`;
  const existingIds = projectContacts.get(firstProjectId) ?? [];
  const names = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace", "Henry", "Ivy", "Jack", "Kate", "Leo"];
  const failureReasons = ["No answer", "Busy", "Wrong number", "Callback requested"];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, month, day);
    if (d.getDay() < 1 || d.getDay() > 5) continue;
    const attemptedAt = d.toISOString().slice(0, 10) + "T09:00:00.000Z";
    const callsToday = demoRand(day * 7 + orgId.length, 4, 12);
    for (let i = 0; i < callsToday; i++) {
      const seed = day * 100 + i;
      const isSuccess = demoRand(seed, 0, 100) > 22;
      const durationSeconds = isSuccess ? demoRand(seed + 1, 90, 320) : 0;
      const cid = nextContactId();
      const contact: ContactWithId = {
        id: cid,
        projectId: firstProjectId,
        phone: `+27${String(seed + 800000000).padStart(9, "0").slice(-9)}`,
        name: names[demoRand(seed + 2, 0, names.length - 1)],
        status: isSuccess ? "success" : "failed",
        callResult: {
          durationSeconds: isSuccess ? durationSeconds : undefined,
          attemptedAt,
          ...(isSuccess
            ? { capturedData: { interested: demoRand(seed + 3, 0, 1) ? "Yes" : "No" } }
            : { failureReason: failureReasons[demoRand(seed + 3, 0, failureReasons.length - 1)] }),
        },
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      contacts.set(cid, contact);
      existingIds.push(cid);
    }
  }
  projectContacts.set(firstProjectId, existingIds);
  console.log("[Store] Seeded demo data for org:", orgId);
}

/** Ensure demo org (Pay-less) has demo data. Call before stats/projects fetch. */
export async function ensureDemoDataForOrg(orgId: string): Promise<void> {
  if (getProjectIdsForOrg(orgId).length > 0) return;
  const org = await getOrganization(orgId);
  const name = org?.name?.toLowerCase().replace(/\s/g, "") ?? "";
  if (DEMO_ORG_NAMES.some((n) => name.includes(n) || n.includes(name))) {
    seedDemoDataForOrg(orgId);
  }
}

initStore();

/** Get project IDs for an organization */
function getProjectIdsForOrg(orgId: string): string[] {
  return Array.from(projects.values())
    .filter((p) => (p as ProjectWithId & { orgId?: string }).orgId === orgId)
    .map((p) => p.id);
}

export function getDashboardStats(orgId: string, filterProjectIds?: string[]): {
  contactsUploaded: number;
  callsMade: number;
  successfulCalls: number;
  unsuccessfulCalls: number;
  hoursOnCalls: number;
  successRate: number;
} {
  let contactsUploaded = 0;
  let callsMade = 0;
  let successfulCalls = 0;
  let unsuccessfulCalls = 0;
  let totalSeconds = 0;
  const orgProjectIds = new Set(
    filterProjectIds?.length ? filterProjectIds : getProjectIdsForOrg(orgId)
  );

  for (const [projId, ids] of projectContacts) {
    if (!orgProjectIds.has(projId)) continue;
    contactsUploaded += ids.length;
    for (const cid of ids) {
      const c = contacts.get(cid);
      if (!c) continue;
      if (c.callResult) {
        callsMade++;
        if (c.status === "success") successfulCalls++;
        else if (c.status === "failed") unsuccessfulCalls++;
        totalSeconds += c.callResult.durationSeconds ?? 0;
      }
    }
  }

  const hoursOnCalls = Math.round((totalSeconds / 3600) * 100) / 100;
  const successRate =
    callsMade > 0 ? Math.round((successfulCalls / callsMade) * 100) : 0;

  return {
    contactsUploaded,
    callsMade,
    successfulCalls,
    unsuccessfulCalls,
    hoursOnCalls,
    successRate,
  };
}

export type ProjectStatsExtended = ReturnType<typeof getDashboardStats> & {
  answeredCalls: number;
  answerRate: number;
  bookingsCount: number;
  enquiryToCallAvgSeconds: number | null;
  enquiryToCallMinSeconds: number | null;
  enquiryToCallMaxSeconds: number | null;
  avgDurationSeconds: number | null;
  maxDurationSeconds: number | null;
  minDurationSeconds: number | null;
};

export function getProjectStats(projectId: string): ProjectStatsExtended {
  const ids = projectContacts.get(projectId) ?? [];
  let contactsUploaded = ids.length;
  let callsMade = 0;
  let successfulCalls = 0;
  let unsuccessfulCalls = 0;
  let totalSeconds = 0;
  let answeredCalls = 0;
  let bookingsCount = 0;
  const enquiryToCallSeconds: number[] = [];
  const durationSecondsList: number[] = [];

  for (const cid of ids) {
    const c = contacts.get(cid);
    if (!c) continue;
    const entry = c.callResult ?? c.callHistory?.at(-1);
    if (!entry?.attemptedAt) continue;
    callsMade++;
    if (c.status === "success") successfulCalls++;
    else if (c.status === "failed") unsuccessfulCalls++;
    const dur = entry.durationSeconds ?? 0;
    totalSeconds += dur;
    if (dur > 0) durationSecondsList.push(dur);
    if (isCallAnswered(entry)) answeredCalls++;
    if (isCallBooking(entry.capturedData)) bookingsCount++;
    if (c.createdAt && entry.attemptedAt) {
      const ms = new Date(entry.attemptedAt).getTime() - new Date(c.createdAt).getTime();
      if (ms >= 0) enquiryToCallSeconds.push(Math.round(ms / 1000));
    }
  }

  const hoursOnCalls = Math.round((totalSeconds / 3600) * 100) / 100;
  const successRate = callsMade > 0 ? Math.round((successfulCalls / callsMade) * 100) : 0;
  const answerRate = callsMade > 0 ? Math.round((answeredCalls / callsMade) * 100) : 0;

  const enquiryToCallAvgSeconds =
    enquiryToCallSeconds.length > 0
      ? Math.round(enquiryToCallSeconds.reduce((a, b) => a + b, 0) / enquiryToCallSeconds.length)
      : null;
  const enquiryToCallMinSeconds =
    enquiryToCallSeconds.length > 0 ? Math.min(...enquiryToCallSeconds) : null;
  const enquiryToCallMaxSeconds =
    enquiryToCallSeconds.length > 0 ? Math.max(...enquiryToCallSeconds) : null;

  const avgDurationSeconds =
    durationSecondsList.length > 0
      ? Math.round(durationSecondsList.reduce((a, b) => a + b, 0) / durationSecondsList.length)
      : null;
  const maxDurationSeconds = durationSecondsList.length > 0 ? Math.max(...durationSecondsList) : null;
  const minDurationSeconds = durationSecondsList.length > 0 ? Math.min(...durationSecondsList) : null;

  return {
    contactsUploaded,
    callsMade,
    successfulCalls,
    unsuccessfulCalls,
    hoursOnCalls,
    successRate,
    answeredCalls,
    answerRate,
    bookingsCount,
    enquiryToCallAvgSeconds,
    enquiryToCallMinSeconds,
    enquiryToCallMaxSeconds,
    avgDurationSeconds,
    maxDurationSeconds,
    minDurationSeconds,
  };
}

function getProjectCallsByDay(projectId: string): Array<{ date: string; calls: number; successful: number; failed: number; bookings: number }> {
  const byDay = new Map<string, { calls: number; successful: number; failed: number; bookings: number }>();
  const ids = projectContacts.get(projectId) ?? [];
  for (const cid of ids) {
    const c = contacts.get(cid);
    const entry = c?.callResult ?? c?.callHistory?.at(-1);
    if (!entry?.attemptedAt) continue;
    const date = entry.attemptedAt.slice(0, 10);
    const current = byDay.get(date) ?? { calls: 0, successful: 0, failed: 0, bookings: 0 };
    current.calls++;
    if (c?.status === "success") current.successful++;
    else if (c?.status === "failed") current.failed++;
    if (isCallBooking(entry.capturedData)) current.bookings++;
    byDay.set(date, current);
  }
  return Array.from(byDay.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getProjectMinutesByDay(projectId: string): Array<{ date: string; minutes: number }> {
  const byDay = new Map<string, number>();
  const ids = projectContacts.get(projectId) ?? [];
  for (const cid of ids) {
    const c = contacts.get(cid);
    const entry = c?.callResult ?? c?.callHistory?.at(-1);
    if (!entry?.attemptedAt || !(entry.durationSeconds ?? 0)) continue;
    const date = entry.attemptedAt.slice(0, 10);
    const mins = Math.round((entry.durationSeconds ?? 0) / 60);
    byDay.set(date, (byDay.get(date) ?? 0) + mins);
  }
  return Array.from(byDay.entries())
    .map(([date, minutes]) => ({ date, minutes }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getProjectCallsByDayForChart(projectId: string): Array<{ date: string; label: string; calls: number; successful: number; failed: number; bookings: number }> {
  const raw = getProjectCallsByDay(projectId);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const result: Array<{ date: string; label: string; calls: number; successful: number; failed: number; bookings: number }> = [];
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month, day);
    if (!isWorkingDay(d)) continue;
    const date = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-ZA", { month: "short", day: "numeric" });
    const existing = raw.find((x) => x.date === date);
    result.push({
      date,
      label,
      calls: existing?.calls ?? 0,
      successful: existing?.successful ?? 0,
      failed: existing?.failed ?? 0,
      bookings: existing?.bookings ?? 0,
    });
  }
  return result;
}

export function getProjectMinutesByDayForChart(projectId: string): ReturnType<typeof getMinutesByDayForChart> {
  const raw = getProjectMinutesByDay(projectId);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const result: Array<{ date: string; label: string; minutes: number }> = [];
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month, day);
    if (!isWorkingDay(d)) continue;
    const date = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-ZA", { month: "short", day: "numeric" });
    const existing = raw.find((x) => x.date === date);
    result.push({ date, label, minutes: existing?.minutes ?? 0 });
  }
  return result;
}

export function getCallsByDay(orgId: string, filterProjectIds?: string[]): Array<{ date: string; calls: number; successful: number; failed: number }> {
  const byDay = new Map<string, { calls: number; successful: number; failed: number }>();
  const orgProjectIds = new Set(
    filterProjectIds?.length ? filterProjectIds : getProjectIdsForOrg(orgId)
  );

  for (const [projId, ids] of projectContacts) {
    if (!orgProjectIds.has(projId)) continue;
    for (const cid of ids) {
      const c = contacts.get(cid);
      if (!c?.callResult?.attemptedAt) continue;
      const date = c.callResult.attemptedAt.slice(0, 10);
      const current = byDay.get(date) ?? { calls: 0, successful: 0, failed: 0 };
      current.calls++;
      if (c.status === "success") current.successful++;
      else if (c.status === "failed") current.failed++;
      byDay.set(date, current);
    }
  }

  return Array.from(byDay.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getMinutesByDay(orgId: string, filterProjectIds?: string[]): Array<{ date: string; minutes: number }> {
  const byDay = new Map<string, number>();
  const orgProjectIds = new Set(
    filterProjectIds?.length ? filterProjectIds : getProjectIdsForOrg(orgId)
  );
  for (const [projId, ids] of projectContacts) {
    if (!orgProjectIds.has(projId)) continue;
    for (const cid of ids) {
      const c = contacts.get(cid);
      if (!c?.callResult?.attemptedAt || !c.callResult.durationSeconds) continue;
      const date = c.callResult.attemptedAt.slice(0, 10);
      const mins = Math.round(c.callResult.durationSeconds / 60);
      byDay.set(date, (byDay.get(date) ?? 0) + mins);
    }
  }
  return Array.from(byDay.entries())
    .map(([date, minutes]) => ({ date, minutes }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Check if a date is a working day (Mon–Fri) */
function isWorkingDay(d: Date): boolean {
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

/** Deterministic pseudo-random for demo data (seeded by n) */
function demoRand(n: number, min: number, max: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
}

/** Inject demo contacts with call results spread across all working days of the month */
function injectDemoChartData() {
  const names = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace", "Henry", "Ivy", "Jack", "Kate", "Leo"];
  const failureReasons = ["No answer", "Busy", "Wrong number", "Callback requested"];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  for (const orgId of DEMO_ORG_IDS) {
    const firstProjectId = Array.from(projects.values()).find((p) => (p as ProjectWithId & { orgId?: string }).orgId === orgId)?.id;
    if (!firstProjectId) continue;

    const existingIds = projectContacts.get(firstProjectId) ?? [];

    for (let day = 1; day <= 31; day++) {
      const d = new Date(year, month, day);
      if (!isWorkingDay(d)) continue;
      const attemptedAt = d.toISOString().slice(0, 10) + "T09:00:00.000Z";

      const callsToday = demoRand(day * 7 + orgId.length, 4, 12);
      for (let i = 0; i < callsToday; i++) {
        const seed = day * 100 + i;
        const isSuccess = demoRand(seed, 0, 100) > 22;
        const durationSeconds = isSuccess ? demoRand(seed + 1, 90, 320) : 0;
        const cid = nextContactId();
        const contact: ContactWithId = {
          id: cid,
          projectId: firstProjectId,
          phone: `+27${String(seed + 800000000).padStart(9, "0").slice(-9)}`,
          name: names[demoRand(seed + 2, 0, names.length - 1)],
          status: isSuccess ? "success" : "failed",
          callResult: {
            durationSeconds: isSuccess ? durationSeconds : undefined,
            attemptedAt,
            ...(isSuccess
              ? { capturedData: { interested: demoRand(seed + 3, 0, 1) ? "Yes" : "No" } }
              : { failureReason: failureReasons[demoRand(seed + 3, 0, failureReasons.length - 1)] }),
          },
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };
        contacts.set(cid, contact);
        existingIds.push(cid);
      }
    }
    projectContacts.set(firstProjectId, existingIds);
  }
}

/** Get all working days of the current month for chart (Mon–Fri only) */
export function getCallsByDayForChart(orgId: string, filterProjectIds?: string[]): Array<{
  date: string;
  label: string;
  calls: number;
  successful: number;
  failed: number;
}> {
  const raw = getCallsByDay(orgId, filterProjectIds);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const result: Array<{ date: string; label: string; calls: number; successful: number; failed: number }> = [];
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month, day);
    if (!isWorkingDay(d)) continue;
    const date = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-ZA", { month: "short", day: "numeric" });
    const existing = raw.find((x) => x.date === date);
    result.push({
      date,
      label,
      calls: existing?.calls ?? 0,
      successful: existing?.successful ?? 0,
      failed: existing?.failed ?? 0,
    });
  }
  return result;
}

/** Get all working days of the current month for chart (Mon–Fri only) */
export function getMinutesByDayForChart(orgId: string, filterProjectIds?: string[]): Array<{ date: string; label: string; minutes: number }> {
  const raw = getMinutesByDay(orgId, filterProjectIds);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const result: Array<{ date: string; label: string; minutes: number }> = [];
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month, day);
    if (!isWorkingDay(d)) continue;
    const date = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-ZA", { month: "short", day: "numeric" });
    const existing = raw.find((x) => x.date === date);
    result.push({
      date,
      label,
      minutes: existing?.minutes ?? 0,
    });
  }
  return result;
}

export function getDataPointRetrievalStats(orgId: string, filterProjectIds?: string[]): { withData: number; successfulTotal: number; rate: number } {
  let withData = 0;
  let successfulTotal = 0;
  const orgProjectIds = new Set(
    filterProjectIds?.length ? filterProjectIds : getProjectIdsForOrg(orgId)
  );
  for (const [projId, ids] of projectContacts) {
    if (!orgProjectIds.has(projId)) continue;
    for (const cid of ids) {
      const c = contacts.get(cid);
      if (!c || c.status !== "success") continue;
      successfulTotal++;
      const captured = c.callResult?.capturedData;
      if (captured && Object.keys(captured).length > 0) withData++;
    }
  }
  const rate = successfulTotal > 0 ? Math.round((withData / successfulTotal) * 100) : 0;
  return { withData, successfulTotal, rate };
}

export async function duplicateProject(projectId: string, orgId: string): Promise<ProjectWithId | null> {
  const project = projects.get(projectId);
  if (!project) return null;
  const proj = project as ProjectWithId & { orgId?: string };
  if (proj.orgId && proj.orgId !== orgId) return null;

  const newProject = await createProject({
    name: `${project.name} (copy)`,
    description: project.description ?? undefined,
    orgId,
  });
  await updateProject(newProject.id, {
    captureFields: project.captureFields,
    businessContext: project.businessContext ?? undefined,
    agentInstructions: project.agentInstructions,
    status: "draft",
  });

  const ids = projectContacts.get(projectId) ?? [];
  const newIds: string[] = [];
  for (const cid of ids) {
    const c = contacts.get(cid);
    if (!c) continue;
    const newCid = nextContactId();
    const newContact: ContactWithId = {
      ...c,
      id: newCid,
      projectId: newProject.id,
      status: "pending" as const,
      callResult: undefined,
      createdAt: now(),
      updatedAt: now(),
    };
    contacts.set(newCid, newContact);
    newIds.push(newCid);
  }
  projectContacts.set(newProject.id, newIds);

  return await getProject(newProject.id);
}

export async function listProjects(
  orgId: string,
  options?: { dealerOnly?: boolean }
): Promise<ProjectWithId[]> {
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const snap = await db.collection(COLLECTIONS.projects).where("orgId", "==", orgId).get();
      const list: ProjectWithId[] = [];
      snap.forEach((doc) => {
        const d = doc.data() as Record<string, unknown>;
        const p = projectFromFirestoreDoc(doc.id, d, orgId);
        list.push(p);
        projects.set(doc.id, p);
      });
      let result = list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      if (options?.dealerOnly) {
        result = result.filter((p) => (p as ProjectWithId & { isDealerProject?: boolean }).isDealerProject === true);
      }
      return result;
    } catch (e) {
      console.warn("[Store] listProjects Firestore failed, using in-memory:", (e as Error).message);
    }
  }
  let list = Array.from(projects.values()).filter(
    (p) => (p as ProjectWithId & { orgId?: string }).orgId === orgId
  );
  if (options?.dealerOnly) {
    list = list.filter((p) => (p as ProjectWithId & { isDealerProject?: boolean }).isDealerProject === true);
  }
  return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/** Build ProjectWithId from Firestore doc data (used by getProject and updateProject when loading from Firestore). */
function projectFromFirestoreDoc(
  docId: string,
  d: Record<string, unknown>,
  orgIdFallback = ""
): ProjectWithId {
  return {
    id: docId,
    orgId: (d.orgId as string) ?? orgIdFallback,
    userId: (d.userId as string) ?? "dev-user-1",
    name: (d.name as string) ?? "",
    description: (d.description as string | null) ?? null,
    status: (d.status as ProjectWithId["status"]) ?? "draft",
    assistantId: (d.assistantId as string | null) ?? null,
    testAssistantId: (d.testAssistantId as string | null) ?? null,
    structuredOutputId: (d.structuredOutputId as string | null) ?? null,
    agentName: (d.agentName as string | null) ?? null,
    agentCompany: (d.agentCompany as string | null) ?? null,
    agentNumber: (d.agentNumber as string | null) ?? null,
    agentPhoneNumberId: (d.agentPhoneNumberId as string | null) ?? null,
    agentVoice: (d.agentVoice as string | null) ?? null,
    agentImageUrl: (d.agentImageUrl as string | null) ?? null,
    userGoal: (d.userGoal as string | null) ?? null,
    industry: (d.industry as string | null) ?? null,
    tone: (d.tone as string | null) ?? null,
    goal: (d.goal as string | null) ?? null,
    agentQuestions: (d.agentQuestions as ProjectWithId["agentQuestions"]) ?? [],
    captureFields: (d.captureFields as ProjectWithId["captureFields"]) ?? [],
    businessContext: (d.businessContext as string | null) ?? null,
    agentInstructions: (d.agentInstructions as string | null) ?? null,
    notifyOnComplete: d.notifyOnComplete as boolean | undefined,
    surveyEnabled: (d.surveyEnabled as boolean) ?? false,
    callWindowStart: (d.callWindowStart as string | null) ?? null,
    callWindowEnd: (d.callWindowEnd as string | null) ?? null,
    googleSheetId: (d.googleSheetId as string | null) ?? null,
    dealershipEnabled: (d.dealershipEnabled as boolean | null) ?? null,
    vehicleListingUrl: (d.vehicleListingUrl as string | null) ?? null,
    vehicleContextFullText: (d.vehicleContextFullText as string | null) ?? null,
    vehicleContextUpdatedAt: (d.vehicleContextUpdatedAt as string | null) ?? null,
    callContextInstructions: (d.callContextInstructions as string | null) ?? null,
    identityInstructions: (d.identityInstructions as string | null) ?? null,
    endingCallInstructions: (d.endingCallInstructions as string | null) ?? null,
    complianceInstructions: (d.complianceInstructions as string | null) ?? null,
    voiceOutputInstructions: (d.voiceOutputInstructions as string | null) ?? null,
    vehiclePlaceholderInstructions: (d.vehiclePlaceholderInstructions as string | null) ?? null,
    isDealerProject: (d.isDealerProject as boolean | null) ?? null,
    dealerId: (d.dealerId as string | null) ?? null,
    createdAt: (d.createdAt as string) ?? now(),
    updatedAt: (d.updatedAt as string) ?? now(),
  } as ProjectWithId;
}

export async function getProject(id: string, orgId?: string): Promise<ProjectWithId | null> {
  let project = projects.get(id) ?? null;
  if (!project && isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const doc = await db.collection(COLLECTIONS.projects).doc(id).get();
      if (doc.exists && doc.data()) {
        project = projectFromFirestoreDoc(doc.id, doc.data()!, orgId ?? "");
        projects.set(doc.id, project);
      }
    } catch (e) {
      console.warn("[Store] getProject Firestore failed:", (e as Error).message);
    }
  }
  if (!project) return null;
  if (orgId) {
    const proj = project as ProjectWithId & { orgId?: string };
    if (proj.orgId && proj.orgId !== orgId) return null;
  }
  return project;
}

/** Get project by VAPI assistant ID (for webhook: resolve assistantId → project). */
export async function getProjectByAssistantId(assistantId: string): Promise<ProjectWithId | null> {
  if (!assistantId?.trim()) return null;
  const aid = assistantId.trim();
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const snap = await db
        .collection(COLLECTIONS.projects)
        .where("assistantId", "==", aid)
        .limit(1)
        .get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        const project = projectFromFirestoreDoc(doc.id, doc.data(), "");
        projects.set(doc.id, project);
        return project;
      }
    } catch (e) {
      console.warn("[Store] getProjectByAssistantId Firestore failed:", (e as Error).message);
    }
  }
  const found = Array.from(projects.values()).find(
    (p) => (p as ProjectWithId & { assistantId?: string }).assistantId === aid
  );
  return found ?? null;
}

export async function createProject(
  data: { name: string; description?: string; orgId: string; isDealerProject?: boolean; dealerId?: string | null }
): Promise<ProjectWithId> {
  const id = `proj-${Date.now()}`;
  const t = now();
  const project: ProjectWithId = {
    id,
    orgId: data.orgId,
    userId: "dev-user-1",
    name: data.name,
    description: data.description ?? null,
    status: "draft",
    captureFields: [],
    agentInstructions: null,
    isDealerProject: data.isDealerProject ?? (data.dealerId ? true : null),
    dealerId: data.dealerId ?? null,
    createdAt: t,
    updatedAt: t,
  };
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const { id: _id, ...doc } = project;
      await db.collection(COLLECTIONS.projects).doc(id).set(doc);
    } catch (e) {
      console.warn("[Store] createProject Firestore failed, using in-memory only:", (e as Error).message);
    }
  }
  projects.set(id, project);
  projectContacts.set(id, []);
  return project;
}

export async function updateProject(
  id: string,
  data: Partial<Pick<ProjectDoc, "name" | "description" | "agentName" | "agentCompany" | "agentNumber" | "agentPhoneNumberId" | "agentVoice" | "agentImageUrl" | "userGoal" | "industry" | "tone" | "goal" | "agentQuestions" | "captureFields" | "businessContext" | "agentInstructions" | "status" | "notifyOnComplete" | "surveyEnabled" | "callWindowStart" | "callWindowEnd" | "assistantId" | "testAssistantId" | "structuredOutputId" | "googleSheetId" | "dealershipEnabled" | "vehicleListingUrl" | "vehicleContextFullText" | "vehicleContextUpdatedAt" | "callContextInstructions" | "identityInstructions" | "endingCallInstructions" | "complianceInstructions" | "voiceOutputInstructions" | "vehiclePlaceholderInstructions" | "isDealerProject" | "dealerId">>
): Promise<ProjectWithId | null> {
  let project = projects.get(id) ?? null;
  // Load from Firestore if not in memory (e.g. after server restart) so we can still persist
  if (!project && isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const doc = await db.collection(COLLECTIONS.projects).doc(id).get();
      if (doc.exists && doc.data()) {
        project = projectFromFirestoreDoc(doc.id, doc.data()!, "");
        projects.set(id, project);
      }
    } catch (e) {
      console.warn("[Store] updateProject load from Firestore failed:", (e as Error).message);
    }
  }
  if (!project) return null;
  // Merge only defined values so we don't overwrite with undefined (Firestore would delete those fields)
  const definedData = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  ) as Partial<ProjectWithId>;
  const updated: ProjectWithId = {
    ...project,
    ...definedData,
    updatedAt: now(),
  };
  if (isFirebaseAdminConfigured()) {
    const db = getFirebaseAdminFirestore();
    const { id: _id, ...rawDoc } = updated;
    // Omit undefined so Firestore doesn't delete fields
    const doc = Object.fromEntries(
      Object.entries(rawDoc).filter(([, v]) => v !== undefined)
    ) as Record<string, unknown>;
    await db.collection(COLLECTIONS.projects).doc(id).set(doc, { merge: true });
  }
  projects.set(id, updated);
  return updated;
}

/**
 * Delete a project and all its contacts. Verifies project belongs to orgId.
 * Removes from Firestore (contacts then project) and in-memory store.
 */
export async function deleteProject(projectId: string, orgId: string): Promise<boolean> {
  const project = await getProject(projectId, orgId);
  if (!project) return false;
  const pid = project.id;
  const contactIds = projectContacts.get(pid) ?? [];

  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      // Delete all contacts for this project (Firestore batch limit 500)
      const contactsSnap = await db
        .collection(COLLECTIONS.contacts)
        .where("projectId", "==", pid)
        .get();
      const BATCH_SIZE = 500;
      for (let i = 0; i < contactsSnap.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        contactsSnap.docs.slice(i, i + BATCH_SIZE).forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
      await db.collection(COLLECTIONS.projects).doc(pid).delete();
    } catch (e) {
      console.error("[Store] deleteProject Firestore failed:", (e as Error).message);
      return false;
    }
  }

  for (const cid of contactIds) contacts.delete(cid);
  projectContacts.delete(pid);
  projectQueue.delete(pid);
  contactScheduledTimes.delete(pid);
  projects.delete(pid);
  return true;
}

// ---------- Dealers (separate entity, no project) ----------

function dealerFromFirestoreDoc(docId: string, d: Record<string, unknown>, orgIdFallback: string): DealerWithId {
  const rawLinks = d.contextLinks as DealerContextLink[] | null | undefined;
  const contextLinks = Array.isArray(rawLinks)
    ? rawLinks.map((l) => ({ url: l?.url ?? "", label: l?.label ?? null }))
    : null;
  return {
    id: docId,
    orgId: (d.orgId as string) ?? orgIdFallback,
    name: (d.name as string) ?? "",
    address: (d.address as string | null) ?? null,
    phoneNumber: (d.phoneNumber as string | null) ?? null,
    operationHours: (d.operationHours as string | null) ?? null,
    email: (d.email as string | null) ?? null,
    addressPronunciationNotes: (d.addressPronunciationNotes as string | null) ?? null,
    contextLinks: contextLinks ?? null,
    projectId: (d.projectId as string | null) ?? null,
    forwardingEmail: (d.forwardingEmail as string | null) ?? null,
    callUpdatesEmail: (d.callUpdatesEmail as string | null) ?? null,
    createdAt: (d.createdAt as string) ?? now(),
    updatedAt: (d.updatedAt as string) ?? now(),
  };
}

/**
 * Single-tenant: one org owns all dealers. When there is exactly one organization, return its ID.
 * Dealer forwarding webhook uses this so no env var is needed for the normal case.
 */
export async function getFirstOrgIdIfSingle(): Promise<string | null> {
  if (!isFirebaseAdminConfigured()) return null;
  try {
    const db = getFirebaseAdminFirestore();
    const snap = await db.collection(COLLECTIONS.organizations).limit(2).get();
    if (snap.docs.length === 1) return snap.docs[0].id;
  } catch {
    // ignore
  }
  return null;
}

export async function listDealers(orgId: string): Promise<DealerWithId[]> {
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const snap = await db.collection(COLLECTIONS.dealers).where("orgId", "==", orgId).get();
      const list: DealerWithId[] = [];
      snap.forEach((doc) => {
        const d = doc.data() as Record<string, unknown>;
        const dealer = dealerFromFirestoreDoc(doc.id, d, orgId);
        list.push(dealer);
        dealers.set(doc.id, dealer);
      });
      return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (e) {
      console.warn("[Store] listDealers Firestore failed, using in-memory:", (e as Error).message);
    }
  }
  const list = Array.from(dealers.values()).filter((d) => d.orgId === orgId);
  return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getDealer(id: string, orgId?: string): Promise<DealerWithId | null> {
  let dealer = dealers.get(id) ?? null;
  if (!dealer && isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const doc = await db.collection(COLLECTIONS.dealers).doc(id).get();
      if (doc.exists && doc.data()) {
        dealer = dealerFromFirestoreDoc(doc.id, doc.data()!, orgId ?? "");
        dealers.set(doc.id, dealer);
      }
    } catch (e) {
      console.warn("[Store] getDealer Firestore failed:", (e as Error).message);
    }
  }
  if (!dealer) return null;
  if (orgId && dealer.orgId !== orgId) return null;
  return dealer;
}

export async function createDealer(data: {
  orgId: string;
  name: string;
  address?: string | null;
  phoneNumber?: string | null;
  operationHours?: string | null;
  email?: string | null;
  contextLinks?: DealerContextLink[] | null;
  projectId?: string | null;
}): Promise<DealerWithId> {
  const id = `dealer-${Date.now()}`;
  const t = now();
  const dealer: DealerWithId = {
    id,
    orgId: data.orgId,
    name: data.name.trim(),
    address: data.address?.trim() || null,
    phoneNumber: data.phoneNumber?.trim() || null,
    operationHours: data.operationHours?.trim() || null,
    email: data.email?.trim() || null,
    contextLinks: data.contextLinks ?? null,
    projectId: data.projectId ?? null,
    createdAt: t,
    updatedAt: t,
  };
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const { id: _id, ...doc } = dealer;
      await db.collection(COLLECTIONS.dealers).doc(id).set(doc);
    } catch (e) {
      console.warn("[Store] createDealer Firestore failed, using in-memory only:", (e as Error).message);
    }
  }
  dealers.set(id, dealer);
  return dealer;
}

export async function updateDealer(
  id: string,
  data: Partial<Pick<DealerDoc, "name" | "address" | "phoneNumber" | "operationHours" | "email" | "addressPronunciationNotes" | "contextLinks" | "projectId" | "forwardingEmail" | "callUpdatesEmail">>
): Promise<DealerWithId | null> {
  let dealer = dealers.get(id) ?? null;
  if (!dealer && isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const doc = await db.collection(COLLECTIONS.dealers).doc(id).get();
      if (doc.exists && doc.data()) {
        dealer = dealerFromFirestoreDoc(doc.id, doc.data()!, "");
        dealers.set(doc.id, dealer);
      }
    } catch (e) {
      console.warn("[Store] updateDealer load from Firestore failed:", (e as Error).message);
    }
  }
  if (!dealer) return null;
  const definedData = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  ) as Partial<DealerWithId>;
  const updated: DealerWithId = {
    ...dealer,
    ...definedData,
    updatedAt: now(),
  };
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const { id: _id, ...rawDoc } = updated;
      const doc = Object.fromEntries(
        Object.entries(rawDoc).filter(([, v]) => v !== undefined)
      ) as Record<string, unknown>;
      await db.collection(COLLECTIONS.dealers).doc(id).set(doc, { merge: true });
    } catch (e) {
      console.warn("[Store] updateDealer Firestore failed:", (e as Error).message);
    }
  }
  dealers.set(id, updated);
  return updated;
}

export async function deleteDealer(dealerId: string, orgId: string): Promise<boolean> {
  const dealer = await getDealer(dealerId, orgId);
  if (!dealer) return false;
  const projectId = (dealer as DealerWithId & { projectId?: string | null }).projectId;
  if (projectId) {
    const ok = await deleteProject(projectId, orgId);
    if (!ok) return false;
  }
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      await db.collection(COLLECTIONS.dealers).doc(dealerId).delete();
    } catch (e) {
      console.error("[Store] deleteDealer Firestore failed:", (e as Error).message);
      return false;
    }
  }
  dealers.delete(dealerId);
  return true;
}

export function getProjectQueue(projectId: string): string[] {
  return Array.from(projectQueue.get(projectId) ?? []);
}

export function getContactScheduledTime(projectId: string, contactId: string): string | null {
  return contactScheduledTimes.get(projectId)?.get(contactId) ?? null;
}

export function setProjectQueue(
  projectId: string, 
  contactIds: string[], 
  add: boolean,
  scheduledTimes?: Array<{ contactId: string; scheduledTime: string | null }>
): void {
  const queueSet = projectQueue.get(projectId) ?? new Set<string>();
  let projectScheduledTimes = contactScheduledTimes.get(projectId);
  if (!projectScheduledTimes) {
    projectScheduledTimes = new Map();
    contactScheduledTimes.set(projectId, projectScheduledTimes);
  }
  
  for (const cid of contactIds) {
    if (add) {
      queueSet.add(cid);
      // Set scheduled time if provided
      if (scheduledTimes) {
        const scheduled = scheduledTimes.find(st => st.contactId === cid);
        if (scheduled) {
          if (scheduled.scheduledTime) {
            projectScheduledTimes.set(cid, scheduled.scheduledTime);
          } else {
            projectScheduledTimes.delete(cid);
          }
        }
      }
    } else {
      queueSet.delete(cid);
      projectScheduledTimes.delete(cid);
    }
  }
  if (queueSet.size === 0) {
    projectQueue.delete(projectId);
    contactScheduledTimes.delete(projectId);
  } else {
    projectQueue.set(projectId, queueSet);
  }
}

/** Load contacts for a project from Firestore into in-memory store. Called when listContacts finds none in memory. */
async function hydrateProjectContacts(projectId: string): Promise<void> {
  if (!isFirebaseAdminConfigured()) return;
  const existing = projectContacts.get(projectId) ?? [];
  if (existing.length > 0) return; // Already have contacts in memory
  try {
    const db = getFirebaseAdminFirestore();
    const snap = await db
      .collection(COLLECTIONS.contacts)
      .where("projectId", "==", projectId)
      .get();
    const loaded: ContactWithId[] = [];
    snap.forEach((doc) => {
      const d = doc.data();
      const contact: ContactWithId = {
        id: doc.id,
        projectId: (d.projectId as string) ?? projectId,
        phone: (d.phone as string) ?? "",
        name: (d.name as string | null) ?? null,
        status: (d.status as ContactWithId["status"]) ?? "pending",
        optOut: (d.optOut as boolean | null) ?? null,
        callResult: d.callResult as ContactWithId["callResult"],
        callHistory: (d.callHistory as ContactWithId["callHistory"]) ?? null,
        lastVapiCallId: (d.lastVapiCallId as string | null) ?? null,
        vapiCallId: (d.vapiCallId as string | null) ?? null,
        email: (d.email as string | null) ?? null,
        hubspotContactId: (d.hubspotContactId as string | null) ?? null,
        hubspotLeadStatus: (d.hubspotLeadStatus as string | null) ?? null,
        lastSyncedToHubSpot: (d.lastSyncedToHubSpot as string | null) ?? null,
        createdAt: (d.createdAt as string) ?? now(),
        updatedAt: (d.updatedAt as string) ?? now(),
      };
      contacts.set(doc.id, contact);
      loaded.push(contact);
    });
    loaded.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    projectContacts.set(projectId, loaded.map((c) => c.id));
  } catch (e) {
    console.warn("[Store] hydrateProjectContacts failed:", (e as Error).message);
  }
}

export async function listContacts(
  projectId: string,
  opts?: { limit?: number; offset?: number; status?: "all" | "pending" | "success" | "failed" | "calling" }
): Promise<{ contacts: ContactWithId[]; total: number }> {
  await hydrateProjectContacts(projectId);
  const ids = projectContacts.get(projectId) ?? [];
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const statusFilter = opts?.status ?? "all";

  let filtered = ids
    .map((cid) => contacts.get(cid))
    .filter((c): c is ContactWithId => c != null);

  if (statusFilter !== "all") {
    filtered = filtered.filter((c) => c.status === statusFilter);
  }

  const total = filtered.length;
  const pageIds = filtered.slice(offset, offset + limit);
  return { contacts: pageIds, total };
}

/** Get a single contact by project and contact id (hydrates project contacts if needed). */
export async function getContact(projectId: string, contactId: string): Promise<ContactWithId | null> {
  await hydrateProjectContacts(projectId);
  return contacts.get(contactId) ?? null;
}

/** Recursively remove undefined values so Firestore accepts the document (Firestore rejects undefined). */
function stripUndefined<T>(obj: T): T {
  if (obj === undefined || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined) as T;
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return obj;
}

export async function updateContact(
  contactId: string,
  data: Partial<
    Pick<ContactDoc, "status" | "callResult" | "optOut" | "lastVapiCallId" | "vapiCallId" | "callHistory" | "hubspotContactId" | "hubspotLeadStatus" | "lastSyncedToHubSpot">
  >
): Promise<ContactWithId | null> {
  const contact = contacts.get(contactId);
  if (!contact) return null;
  const updated: ContactWithId = {
    ...contact,
    ...data,
    updatedAt: now(),
  };
  contacts.set(contactId, updated);
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const { id: _id, ...doc } = updated;
      const docClean = stripUndefined(doc) as Record<string, unknown>;
      await db.collection(COLLECTIONS.contacts).doc(contactId).set(docClean, { merge: true });
    } catch (e) {
      console.warn("[Store] updateContact Firestore failed:", (e as Error).message);
    }
  }
  return updated;
}

export async function createContacts(
  projectId: string,
  items: Array<{ phone: string; name?: string; email?: string; hubspotContactId?: string; hubspotLeadStatus?: string }>,
  opts?: { skipDuplicates?: boolean }
): Promise<ContactWithId[]> {
  const ids = projectContacts.get(projectId) ?? [];
  const t = now();
  const created: ContactWithId[] = [];
  const seen = new Set<string>();

  const db = isFirebaseAdminConfigured() ? getFirebaseAdminFirestore() : null;
  const skipDuplicates = opts?.skipDuplicates === true;

  for (const item of items) {
    const phone = normalizePhoneForContact(item.phone);
    if (!phone || seen.has(phone)) continue;
    seen.add(phone);

    if (skipDuplicates && db) {
      const forms = equivalentPhoneForms(phone);
      let found: ContactWithId | null = null;
      for (const form of forms) {
        const existingSnap = await db
          .collection(COLLECTIONS.contacts)
          .where("projectId", "==", projectId)
          .where("phone", "==", form)
          .limit(1)
          .get();
        if (!existingSnap.empty) {
          const doc = existingSnap.docs[0];
          found = { id: doc.id, ...doc.data() } as ContactWithId;
          break;
        }
      }
      if (found) {
        created.push(found);
        continue;
      }
    } else if (skipDuplicates) {
      await listContacts(projectId, { limit: 10000 });
      const existingIds = projectContacts.get(projectId) ?? [];
      const forms = new Set(equivalentPhoneForms(phone));
      const existingContact = existingIds
        .map((cid) => contacts.get(cid))
        .find((c) => c && (forms.has(normalizePhoneForContact(c.phone)) || forms.has(c.phone)));
      if (existingContact) {
        created.push(existingContact);
        continue;
      }
    }

    const id = db
      ? db.collection(COLLECTIONS.contacts).doc().id
      : nextContactId();
    const contact: ContactWithId = {
      id,
      projectId,
      phone,
      name: item.name ?? null,
      email: item.email ?? null,
      status: "pending",
      hubspotContactId: item.hubspotContactId ?? null,
      hubspotLeadStatus: item.hubspotLeadStatus ?? null,
      createdAt: t,
      updatedAt: t,
    };
    if (db) {
      try {
        const { id: _id, ...doc } = contact;
        await db.collection(COLLECTIONS.contacts).doc(id).set(doc);
      } catch (e) {
        console.warn("[Store] createContacts Firestore failed:", (e as Error).message);
      }
    }
    contacts.set(id, contact);
    ids.push(id);
    created.push(contact);
  }
  projectContacts.set(projectId, ids);
  return created;
}

/** Normalize SA phone to canonical +27xxxxxxxxx. Handles +0844... (typo), 0xx..., 27xx.... */
function normalizePhoneForContact(raw: string): string {
  let s = raw.replace(/\s/g, "").trim();
  if (!s || s.length < 10) return s;
  // +0844... or +086... (common SA typo: +27 typed as +084)
  if (s.startsWith("+0") && s.length >= 11) s = "+27" + s.slice(2);
  else if (s.startsWith("0") && s.length >= 10) s = "+27" + s.slice(1);
  else if (s.startsWith("27") && s.length >= 11 && !s.startsWith("+")) s = "+" + s;
  else if (!s.startsWith("+") && s.length >= 10) s = "+27" + s;
  return s;
}

/** Return equivalent phone forms for duplicate check (canonical + alternates we might find in DB). */
function equivalentPhoneForms(normalizedPhone: string): string[] {
  if (!normalizedPhone) return [];
  const forms = new Set<string>([normalizedPhone]);
  if (normalizedPhone.startsWith("+27") && normalizedPhone.length >= 12) {
    forms.add("0" + normalizedPhone.slice(3));
    forms.add("+0" + normalizedPhone.slice(2)); // +0844050294 (common SA typo)
  } else if (normalizedPhone.startsWith("0") && normalizedPhone.length >= 11) {
    forms.add("+27" + normalizedPhone.slice(1));
  }
  return Array.from(forms);
}

const MOCK_TRANSCRIPTS = [
  "Agent: Hi, this is Sarah from Acme. Is this John?\nContact: Yes, speaking.\nAgent: Great, I'm calling about our offer...\nContact: Sure, send details.\nAgent: Thanks!",
  "Agent: Hi, is Maria available?\nContact: She's not in. Try tomorrow.\nAgent: Thanks, I'll call back.\n",
  "Agent: Hi, this is Sarah...\nContact: Oh yes, we spoke last week...\nAgent: Great, following up...\n",
];

function generateMockCallResult(
  status: "success" | "failed",
  captureFields?: CaptureField[]
): ContactDoc["callResult"] {
  const attemptedAt = now();
  if (status === "failed") {
    return {
      durationSeconds: 0,
      failureReason: Math.random() > 0.5 ? "No answer" : "Busy",
      attemptedAt,
    };
  }
  const durationSeconds = Math.floor(60 + Math.random() * 180);
  const capturedData: Record<string, string | number | null> = {};
  captureFields?.forEach((f) => {
    capturedData[f.key] = f.type === "number" ? Math.floor(Math.random() * 10) : "Yes";
  });
  return {
    durationSeconds,
    recordingUrl: `https://example.com/recordings/${Date.now()}.mp3`,
    transcript:
      MOCK_TRANSCRIPTS[Math.floor(Math.random() * MOCK_TRANSCRIPTS.length)],
    capturedData: Object.keys(capturedData).length ? capturedData : undefined,
    attemptedAt,
  };
}

/**
 * Run the calling simulation. If contactIds is provided, call only those contacts (row-level "Call now").
 * Otherwise run for the full queue ("Start calling").
 */
export async function runProjectSimulation(
  projectId: string,
  contactIds?: string[]
): Promise<{ updated: number }> {
  const project = projects.get(projectId);
  if (!project) return { updated: 0 };

  await updateProject(projectId, { status: "running" });

  const ids =
    contactIds && contactIds.length > 0
      ? contactIds
      : (() => {
          const queueIds = projectQueue.get(projectId);
          return queueIds && queueIds.size > 0
            ? Array.from(queueIds)
            : (projectContacts.get(projectId) ?? []);
        })();

  const isQueueRun = !contactIds || contactIds.length === 0;
  const queueIds = projectQueue.get(projectId);
  let count = 0;

  for (const cid of ids) {
    const contact = contacts.get(cid);
    if (!contact || (contact.status !== "pending" && contact.status !== "calling"))
      continue;
    const status: "success" | "failed" =
      Math.random() > 0.3 ? "success" : "failed";
    const callResult = generateMockCallResult(
      status,
      project.captureFields
    ) as NonNullable<ContactDoc["callResult"]>;
    await updateContact(cid, { status, callResult });
    if (isQueueRun && queueIds) queueIds.delete(cid);
    count++;
  }

  if (isQueueRun && queueIds && queueIds.size === 0) projectQueue.delete(projectId);
  await updateProject(projectId, { status: "completed" });
  return { updated: count };
}

/**
 * Create a new organization and link user as owner.
 * Automatically adds owner as team member with role "owner".
 * Persists to Firestore if available, otherwise uses in-memory store.
 */
export async function createOrganization(data: {
  name: string;
  ownerId: string;
  ownerEmail?: string;
  ownerDisplayName?: string;
  createdAt: string;
}): Promise<string> {
  const ownerEmail = data.ownerEmail || "owner@example.com";
  const ownerName = data.ownerDisplayName || undefined;

  // Try Firestore first if configured
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const orgRef = db.collection(COLLECTIONS.organizations).doc();
      const orgId = orgRef.id;
      
      const orgData: OrganizationDoc = {
        name: data.name,
        ownerId: data.ownerId,
        createdAt: data.createdAt,
      };
      
      await orgRef.set(orgData);
      
      // Also create user-org mapping document
      await db.collection("userOrganizations").doc(data.ownerId).set({
        orgId,
        createdAt: data.createdAt,
      });
      
      // Add owner as team member with role "owner"
      const membersRef = orgRef.collection("members");
      await membersRef.doc(data.ownerId).set({
        userId: data.ownerId,
        email: ownerEmail,
        name: ownerName ?? null,
        role: "owner",
        status: "active",
        lastActive: data.createdAt,
      });
      
      console.log("[Store] Created organization in Firestore:", { orgId, name: data.name, ownerId: data.ownerId });
      
      // Also update in-memory cache for quick access
      organizations.set(orgId, { ...data, id: orgId });
      userOrganizations.set(data.ownerId, orgId);
      const ownerMember: TeamMember = {
        id: data.ownerId,
        email: ownerEmail,
        name: ownerName,
        role: "owner",
        orgId,
        status: "active",
        lastActive: data.createdAt,
      };
      teamMembers.set(data.ownerId, ownerMember);
      
      return orgId;
    } catch (error) {
      console.warn("[Store] Failed to create organization in Firestore (Firebase may not be configured), falling back to in-memory:", error instanceof Error ? error.message : error);
      // Fall through to in-memory storage
    }
  }
  
  // Fallback to in-memory storage
  const id = `org-${++orgIdCounter}`;
  organizations.set(id, { ...data, id });
  userOrganizations.set(data.ownerId, id);
  // Add owner as team member
  const ownerMember: TeamMember = {
    id: data.ownerId,
    email: ownerEmail,
    name: ownerName,
    role: "owner",
    orgId: id,
    status: "active",
    lastActive: data.createdAt,
  };
  teamMembers.set(data.ownerId, ownerMember);
  console.log("[Store] Created organization in-memory:", { id, name: data.name, ownerId: data.ownerId });
  return id;
}

/**
 * Get organization ID for a user.
 * Checks Firestore first if available, otherwise uses in-memory store.
 */
export async function getUserOrganization(userId: string): Promise<string | null> {
  console.log("[Store] getUserOrganization called:", { userId, isFirebaseConfigured: isFirebaseAdminConfigured() });

  // Fast path: skip Firestore when we've already seen a credential error (avoids ~7s hang per request)
  if (firestoreCredentialFailed) {
    const inMemoryOrgId = userOrganizations.get(userId) ?? null;
    return inMemoryOrgId;
  }

  // Try Firestore first if configured
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      console.log("[Store] Firestore DB obtained, querying userOrganizations:", { userId });

      const userOrgDoc = await db.collection("userOrganizations").doc(userId).get();
      
      let orgIdFromMapping: string | null = null;
      if (userOrgDoc.exists) {
        const data = userOrgDoc.data();
        orgIdFromMapping = data?.orgId ?? null;
        console.log("[Store] userOrganizations document exists:", { userId, orgId: orgIdFromMapping, fullData: data });
      } else {
        console.log("[Store] userOrganizations document does not exist:", { userId });
      }

      // If userOrganizations points to demo org but user is not dev-user-1, that's suspicious
      // Check team members to find the correct org
      if (orgIdFromMapping === DEMO_ORG_ID && userId !== "dev-user-1") {
        console.log("[Store] ⚠️ CRITICAL: userOrganizations points to demo org for non-dev user, ignoring and checking team members:", { userId, orgIdFromMapping });
        orgIdFromMapping = null; // Ignore the wrong mapping
      }

      // If we have a valid mapping, use it
      if (orgIdFromMapping && orgIdFromMapping !== DEMO_ORG_ID) {
        console.log("[Store] ✅ Found valid organization in Firestore userOrganizations:", { userId, orgId: orgIdFromMapping });
        firestoreCredentialFailed = false;
        lastCredentialErrorHelp = null;
        userOrganizations.set(userId, orgIdFromMapping);
        return orgIdFromMapping;
      }

      // Fallback: check team members - if user is a member of an org, they belong to that org
      // Query all organizations and check if user is a member
      // Note: This is a fallback for users who were added via invite but the mapping wasn't persisted
      console.log("[Store] userOrganizations lookup failed or invalid, checking team members as fallback:", { userId });
      const orgsSnap = await db.collection(COLLECTIONS.organizations).get();
      console.log("[Store] Found organizations in Firestore:", { count: orgsSnap.docs.length });
      
      for (const orgDoc of orgsSnap.docs) {
        const memberDoc = await orgDoc.ref.collection("members").doc(userId).get();
        if (memberDoc.exists) {
          const orgId = orgDoc.id;
          const orgData = await db.collection(COLLECTIONS.organizations).doc(orgId).get();
          const orgName = orgData.data()?.name ?? "Unknown";
          console.log("[Store] ✅ Found organization via team member lookup:", { userId, orgId, orgName });
          
          // Persist to userOrganizations for faster future lookups
          try {
            await db.collection("userOrganizations").doc(userId).set({ orgId });
            console.log("[Store] ✅ Persisted user-org mapping to Firestore:", { userId, orgId });
            firestoreCredentialFailed = false;
            lastCredentialErrorHelp = null;
            userOrganizations.set(userId, orgId);
            return orgId;
          } catch (persistError) {
            console.error("[Store] ❌ Failed to persist user-org mapping after team member lookup:", persistError instanceof Error ? persistError.message : persistError);
            // Still return the orgId even if persistence failed
            userOrganizations.set(userId, orgId);
            return orgId;
          }
        }
      }
      console.log("[Store] ❌ No organization found for user in userOrganizations or team members:", { userId });
    } catch (error) {
      const isCred = isCredentialError(error);
      if (isCred) {
        firestoreCredentialFailed = true;
        const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "intellidial-39ca7";
        lastCredentialErrorHelp = `gcloud auth application-default login && gcloud auth application-default set-quota-project ${projectId}`;
        console.error("[Store] ❌ Firestore credentials expired or need re-auth. Run:", lastCredentialErrorHelp);
      } else {
        console.error("[Store] ❌ CRITICAL ERROR: Failed to get organization from Firestore:", {
          userId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
      // Fall through to in-memory storage
    }
  } else {
    console.warn("[Store] Firebase Admin not configured, using in-memory storage:", { userId });
  }
  
  // Fallback to in-memory storage (should be empty for real users)
  const inMemoryOrgId = userOrganizations.get(userId) ?? null;
  if (inMemoryOrgId) {
    console.warn("[Store] ⚠️ Using in-memory org mapping (Firestore not available):", { userId, orgId: inMemoryOrgId });
  } else {
    console.log("[Store] No organization found in-memory:", { userId });
  }
  return inMemoryOrgId;
}

/**
 * Get organization details.
 * Checks Firestore first if available, otherwise uses in-memory store.
 */
export async function getOrganization(orgId: string): Promise<Organization | null> {
  // Try Firestore first if configured
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const orgDoc = await db.collection(COLLECTIONS.organizations).doc(orgId).get();
      
      if (orgDoc.exists) {
        const data = orgDoc.data() as OrganizationDoc;
        const org: Organization = {
          id: orgId,
          name: data.name,
          ownerId: data.ownerId,
          createdAt: data.createdAt,
          phoneNumberId: data.phoneNumberId ?? null,
          phoneNumberE164: data.phoneNumberE164 ?? null,
          phoneNumberStatus: data.phoneNumberStatus ?? null,
          plan: data.plan ?? null,
          callsLimit: data.callsLimit,
          minutesLimit: data.minutesLimit,
          usagePeriodStart: data.usagePeriodStart ?? null,
          callsUsed: data.callsUsed,
          minutesUsed: data.minutesUsed,
        };
        console.log("[Store] Found organization in Firestore:", org);
        // Update in-memory cache
        organizations.set(orgId, org);
        return org;
      }
    } catch (error) {
      console.warn("[Store] Failed to get organization from Firestore (Firebase may not be configured), falling back to in-memory:", error instanceof Error ? error.message : error);
      // Fall through to in-memory storage
    }
  }
  
  // Fallback to in-memory storage
  return organizations.get(orgId) ?? null;
}

/**
 * Update organization details (e.g. phoneNumberId after VAPI provisioning).
 * Persists to Firestore when configured; updates in-memory cache.
 */
export async function updateOrganization(
  orgId: string,
  data: Partial<Pick<OrganizationDoc, "name" | "phoneNumberId" | "phoneNumberE164" | "phoneNumberStatus" | "plan" | "callsLimit" | "minutesLimit" | "usagePeriodStart" | "callsUsed" | "minutesUsed">>
): Promise<Organization | null> {
  let org = organizations.get(orgId) ?? null;
  if (!org && isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const doc = await db.collection(COLLECTIONS.organizations).doc(orgId).get();
      if (doc.exists && doc.data()) {
        const d = doc.data() as OrganizationDoc;
        org = {
          id: orgId,
          name: d.name,
          ownerId: d.ownerId,
          createdAt: d.createdAt,
          phoneNumberId: d.phoneNumberId ?? null,
          phoneNumberE164: d.phoneNumberE164 ?? null,
          phoneNumberStatus: d.phoneNumberStatus ?? null,
          plan: d.plan ?? null,
          callsLimit: d.callsLimit,
          minutesLimit: d.minutesLimit,
          usagePeriodStart: d.usagePeriodStart ?? null,
          callsUsed: d.callsUsed,
          minutesUsed: d.minutesUsed,
        };
        organizations.set(orgId, org);
      }
    } catch (e) {
      console.warn("[Store] updateOrganization load from Firestore failed:", (e as Error).message);
    }
  }
  if (!org) return null;
  const definedData = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  ) as Partial<Organization>;
  const updated: Organization = { ...org, ...definedData };
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const doc = Object.fromEntries(
        Object.entries(updated).filter(([k, v]) => k !== "id" && v !== undefined)
      ) as Record<string, unknown>;
      await db.collection(COLLECTIONS.organizations).doc(orgId).set(doc, { merge: true });
    } catch (e) {
      console.warn("[Store] updateOrganization Firestore write failed:", (e as Error).message);
    }
  }
  organizations.set(orgId, updated);
  return updated;
}

/**
 * Atomically increment org usage (calls and minutes). Used by call-ended webhook.
 * When Firestore is configured, uses FieldValue.increment to avoid race conditions.
 */
export async function incrementOrgUsage(
  orgId: string,
  callsDelta: number,
  minutesDelta: number
): Promise<void> {
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      await db
        .collection(COLLECTIONS.organizations)
        .doc(orgId)
        .update({
          callsUsed: FieldValue.increment(callsDelta),
          minutesUsed: FieldValue.increment(minutesDelta),
        });
    } catch (e) {
      console.warn("[Store] incrementOrgUsage Firestore failed:", (e as Error).message);
    }
  }
  const org = organizations.get(orgId);
  if (org) {
    org.callsUsed = (org.callsUsed ?? 0) + callsDelta;
    org.minutesUsed = (org.minutesUsed ?? 0) + minutesDelta;
    organizations.set(orgId, org);
  }
}

/**
 * Create an invitation token (secure random string).
 */
function generateInvitationToken(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Create a team invitation.
 * Persists to Firestore if available.
 */
export async function createInvitation(data: {
  email: string;
  role: "admin" | "operator" | "viewer";
  orgId: string;
  invitedBy: string;
}): Promise<string> {
  const token = generateInvitationToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const email = data.email.toLowerCase().trim();

  const invitation: Invitation = {
    token,
    email,
    role: data.role,
    orgId: data.orgId,
    invitedBy: data.invitedBy,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    accepted: false,
  };

  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      await db.collection(COLLECTIONS.invitations).doc(token).set({
        email: invitation.email,
        role: invitation.role,
        orgId: invitation.orgId,
        invitedBy: invitation.invitedBy,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        accepted: false,
      });
      // Use token as doc id for invited members (tokens start with "inv_")
      await db
        .collection(COLLECTIONS.organizations)
        .doc(data.orgId)
        .collection("members")
        .doc(token)
        .set({
          userId: token,
          email: invitation.email,
          role: invitation.role,
          status: "invited",
          invitedAt: invitation.createdAt,
        });
      invitations.set(token, invitation);
      emailToInvitationToken.set(email, token);
      return token;
    } catch (error) {
      console.warn("[Store] Failed to create invitation in Firestore, falling back to in-memory:", error instanceof Error ? error.message : error);
    }
  }

  invitations.set(token, invitation);
  emailToInvitationToken.set(email, token);
  const memberId = `user-${++userIdCounter}`;
  teamMembers.set(memberId, {
    id: memberId,
    email: invitation.email,
    role: invitation.role,
    orgId: invitation.orgId,
    status: "invited",
    invitedAt: invitation.createdAt,
  });
  emailToUserId.set(email, memberId);
  return token;
}

/**
 * Get invitation by token.
 */
export async function getInvitation(token: string): Promise<Invitation | null> {
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const doc = await db.collection(COLLECTIONS.invitations).doc(token).get();
      if (doc.exists) {
        const d = doc.data();
        return {
          token,
          email: d?.email ?? "",
          role: d?.role ?? "viewer",
          orgId: d?.orgId ?? "",
          invitedBy: d?.invitedBy ?? "",
          createdAt: d?.createdAt ?? "",
          expiresAt: d?.expiresAt ?? "",
          accepted: d?.accepted ?? false,
        };
      }
    } catch (error) {
      console.warn("[Store] Failed to get invitation from Firestore:", error instanceof Error ? error.message : error);
    }
  }
  return invitations.get(token) ?? null;
}

/**
 * Accept an invitation and create team member.
 */
export async function acceptInvitation(token: string, userId: string): Promise<{ orgId: string; role: string } | null> {
  // Load invitation from Firestore if available
  let invitation = invitations.get(token);
  if (!invitation && isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const doc = await db.collection(COLLECTIONS.invitations).doc(token).get();
      if (doc.exists) {
        const d = doc.data();
        invitation = {
          token,
          email: d?.email ?? "",
          role: d?.role ?? "viewer",
          orgId: d?.orgId ?? "",
          invitedBy: d?.invitedBy ?? "",
          createdAt: d?.createdAt ?? "",
          expiresAt: d?.expiresAt ?? "",
          accepted: d?.accepted ?? false,
        };
        invitations.set(token, invitation);
      }
    } catch (error) {
      console.warn("[Store] Failed to load invitation from Firestore:", error instanceof Error ? error.message : error);
    }
  }

  if (!invitation) return null;

  // Check if expired
  if (new Date(invitation.expiresAt) < new Date()) {
    return null;
  }

  // Check if already accepted
  if (invitation.accepted) {
    return null;
  }

  // Mark as accepted
  invitation.accepted = true;

  // Update team member to active
  const memberId = emailToUserId.get(invitation.email);
  if (memberId) {
    const member = teamMembers.get(memberId);
    if (member) {
      member.id = userId; // Update to real Firebase userId
      member.status = "active";
      member.lastActive = new Date().toISOString();
      teamMembers.set(userId, member);
      if (memberId !== userId) {
        teamMembers.delete(memberId);
      }
    }
  }

  // Link user to organization (persist to Firestore)
  userOrganizations.set(userId, invitation.orgId);
  
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      // Persist user-org mapping
      await db.collection("userOrganizations").doc(userId).set({ orgId: invitation.orgId });
      // Update invitation as accepted
      await db.collection(COLLECTIONS.invitations).doc(token).update({ accepted: true });
      // Update team member status in Firestore
      const memberRef = db
        .collection(COLLECTIONS.organizations)
        .doc(invitation.orgId)
        .collection("members")
        .doc(userId);
      const memberDoc = await memberRef.get();
      if (memberDoc.exists) {
        await memberRef.update({
          status: "active",
          lastActive: new Date().toISOString(),
        });
      }
      console.log("[Store] Accepted invitation and persisted to Firestore:", { userId, orgId: invitation.orgId, token });
    } catch (error) {
      console.warn("[Store] Failed to persist invitation acceptance to Firestore:", error instanceof Error ? error.message : error);
    }
  }

  return {
    orgId: invitation.orgId,
    role: invitation.role,
  };
}

/**
 * Get team members for an organization.
 * Reads from Firestore (organizations/{orgId}/members) if available, with in-memory fallback.
 * Optional requestorEmail/requestorDisplayName/requestorId: when requestor is owner and owner has placeholder email, use these.
 */
export async function getTeamMembers(
  orgId: string,
  opts?: {
    requestorEmail?: string;
    requestorDisplayName?: string;
    requestorId?: string;
  }
): Promise<TeamMember[]> {
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const membersSnap = await db
        .collection(COLLECTIONS.organizations)
        .doc(orgId)
        .collection("members")
        .get();

      const result: TeamMember[] = [];
      membersSnap.forEach((doc) => {
        const d = doc.data();
        result.push({
          id: doc.id,
          email: d.email ?? "",
          name: d.name ?? undefined,
          role: d.role ?? "viewer",
          orgId,
          status: d.status ?? "active",
          invitedAt: d.invitedAt,
          lastActive: d.lastActive,
        });
      });

      const org = await getOrganization(orgId);
      // Enrich owner email/name: Firebase Auth first, then requestor headers (from client)
      if (org?.ownerId) {
        const ownerMember = result.find((m) => m.id === org.ownerId);
        if (ownerMember && (ownerMember.email === "owner@example.com" || !ownerMember.email)) {
          try {
            const authUser = await getFirebaseAdminAuth().getUser(org.ownerId);
            ownerMember.email = authUser.email ?? ownerMember.email;
            ownerMember.name = authUser.displayName ?? ownerMember.name;
          } catch {
            // Firebase Auth getUser may fail (e.g. ADC lacks permission)
          }
          // Fallback: use requestor's email/name when they are the owner
          if ((ownerMember.email === "owner@example.com" || !ownerMember.email) && opts?.requestorId === org.ownerId) {
            if (opts.requestorEmail) ownerMember.email = opts.requestorEmail;
            if (opts.requestorDisplayName) ownerMember.name = opts.requestorDisplayName;
          }
        }
      }

      // Ensure owner is always included (e.g. orgs created before owner was auto-added to members)
      if (org?.ownerId && !result.some((m) => m.id === org.ownerId)) {
        let email = "owner@example.com";
        let name: string | undefined;
        try {
          const authUser = await getFirebaseAdminAuth().getUser(org.ownerId);
          email = authUser.email ?? email;
          name = authUser.displayName ?? undefined;
        } catch {
          // Use requestor headers when they are the owner
          if (opts?.requestorId === org.ownerId) {
            if (opts.requestorEmail) email = opts.requestorEmail;
            if (opts.requestorDisplayName) name = opts.requestorDisplayName;
          }
        }
        result.unshift({
          id: org.ownerId,
          email,
          name,
          role: "owner",
          orgId,
          status: "active",
          lastActive: org.createdAt,
        });
      }
      return result;
    } catch (error) {
      console.warn("[Store] Failed to get team members from Firestore, falling back to in-memory:", error instanceof Error ? error.message : error);
    }
  }

  return Array.from(teamMembers.values()).filter((m) => m.orgId === orgId);
}

/**
 * Get invitation by email.
 */
export function getInvitationByEmail(email: string): Invitation | null {
  const token = emailToInvitationToken.get(email.toLowerCase().trim());
  if (!token) return null;
  return invitations.get(token) ?? null;
}

/**
 * Update a team member's role.
 * memberId is either Firebase uid (active) or invitation token (invited).
 */
export async function updateTeamMemberRole(
  orgId: string,
  memberId: string,
  newRole: "admin" | "operator" | "viewer"
): Promise<boolean> {
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const ref = db
        .collection(COLLECTIONS.organizations)
        .doc(orgId)
        .collection("members")
        .doc(memberId);
      const doc = await ref.get();
      if (doc.exists) {
        await ref.update({ role: newRole });
        const member = teamMembers.get(memberId);
        if (member) member.role = newRole;
        return true;
      }
    } catch (error) {
      console.warn("[Store] Failed to update role in Firestore:", error instanceof Error ? error.message : error);
    }
  }
  const member = teamMembers.get(memberId);
  if (member) {
    member.role = newRole;
    return true;
  }
  return false;
}

/**
 * Remove a team member or cancel an invitation.
 * memberId is either Firebase uid (active) or invitation token (invited).
 */
export async function suspendTeamMember(orgId: string, memberId: string, suspend: boolean): Promise<boolean> {
  const newStatus = suspend ? "suspended" : "active";
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const ref = db
        .collection(COLLECTIONS.organizations)
        .doc(orgId)
        .collection("members")
        .doc(memberId);
      const doc = await ref.get();
      if (doc.exists) {
        await ref.update({ status: newStatus, updatedAt: now() });
        const member = teamMembers.get(memberId);
        if (member) {
          member.status = newStatus as "active" | "invited" | "suspended";
          member.updatedAt = now();
          teamMembers.set(memberId, member);
        }
        return true;
      }
    } catch (error) {
      console.warn("[Store] Failed to suspend member in Firestore:", error instanceof Error ? error.message : error);
    }
  }
  const member = teamMembers.get(memberId);
  if (member && member.orgId === orgId) {
    member.status = newStatus as "active" | "invited" | "suspended";
    member.updatedAt = now();
    teamMembers.set(memberId, member);
    return true;
  }
  return false;
}

export async function removeTeamMember(orgId: string, memberId: string): Promise<boolean> {
  if (memberId.startsWith("inv_")) {
    // Invited member - delete from members and invitations
    if (isFirebaseAdminConfigured()) {
      try {
        const db = getFirebaseAdminFirestore();
        const memberRef = db
          .collection(COLLECTIONS.organizations)
          .doc(orgId)
          .collection("members")
          .doc(memberId);
        const memberDoc = await memberRef.get();
        const email = memberDoc.data()?.email;
        await memberRef.delete();
        await db.collection(COLLECTIONS.invitations).doc(memberId).delete();
        invitations.delete(memberId);
        if (email) emailToInvitationToken.delete(email);
        teamMembers.delete(memberId);
        return true;
      } catch (error) {
        console.warn("[Store] Failed to remove member from Firestore:", error instanceof Error ? error.message : error);
      }
    }
    const token = memberId;
    const member = Array.from(teamMembers.values()).find((m) => m.orgId === orgId && (m.id === token || emailToInvitationToken.get(m.email) === token));
    if (member) {
      invitations.delete(token);
      emailToInvitationToken.delete(member.email);
      teamMembers.delete(member.id);
      emailToUserId.delete(member.email);
      return true;
    }
    return deleteInvitation(token);
  }
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const ref = db
        .collection(COLLECTIONS.organizations)
        .doc(orgId)
        .collection("members")
        .doc(memberId);
      const doc = await ref.get();
      if (doc.exists) {
        await ref.delete();
        const member = teamMembers.get(memberId);
        if (member?.status === "invited") {
          const token = emailToInvitationToken.get(member.email);
          if (token) {
            await db.collection(COLLECTIONS.invitations).doc(token).delete();
            invitations.delete(token);
            emailToInvitationToken.delete(member.email);
          }
        }
      }
      const mem = teamMembers.get(memberId);
      teamMembers.delete(memberId);
      if (mem?.email) emailToUserId.delete(mem.email);
      return true;
    } catch (error) {
      console.warn("[Store] Failed to remove member from Firestore:", error instanceof Error ? error.message : error);
    }
  }
  const member = teamMembers.get(memberId);
  if (member?.status === "invited") {
    const token = emailToInvitationToken.get(member.email);
    if (token) {
      invitations.delete(token);
      emailToInvitationToken.delete(member.email);
    }
    emailToUserId.delete(member.email);
  }
  teamMembers.delete(memberId);
  return true;
}

/**
 * Delete invitation (cancel).
 */
export function deleteInvitation(token: string): boolean {
  const invitation = invitations.get(token);
  if (!invitation) return false;

  invitations.delete(token);
  emailToInvitationToken.delete(invitation.email);

  // Remove pending team member
  const memberId = emailToUserId.get(invitation.email);
  if (memberId) {
    teamMembers.delete(memberId);
    emailToUserId.delete(invitation.email);
  }

  return true;
}

/**
 * Create a notification for a user.
 */
export async function createNotification(
  orgId: string,
  userId: string,
  type: NotificationDoc["type"],
  title: string,
  message: string,
  metadata?: NotificationDoc["metadata"]
): Promise<string> {
  const notificationId = `notif-${++notificationIdCounter}`;
  const notification: NotificationDoc & { id: string } = {
    id: notificationId,
    orgId,
    userId,
    type,
    title,
    message,
    read: false,
    createdAt: now(),
    ...(metadata ? { metadata } : {}),
  };

  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      await db.collection(COLLECTIONS.notifications).doc(notificationId).set(notification);
    } catch (error) {
      console.warn("[Store] Failed to create notification in Firestore:", error instanceof Error ? error.message : error);
    }
  }

  notifications.set(notificationId, notification);
  return notificationId;
}

/**
 * Get notifications for a user.
 */
export async function getNotifications(
  userId: string,
  options?: { limit?: number; type?: NotificationDoc["type"]; read?: boolean }
): Promise<Array<NotificationDoc & { id: string }>> {
  const limit = options?.limit ?? 100;
  const typeFilter = options?.type;
  const readFilter = options?.read;

  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      let query = db.collection(COLLECTIONS.notifications).where("userId", "==", userId);
      
      if (readFilter !== undefined) {
        query = query.where("read", "==", readFilter);
      }
      if (typeFilter) {
        query = query.where("type", "==", typeFilter);
      }
      
      query = query.orderBy("createdAt", "desc").limit(limit);
      const snap = await query.get();
      
      const result: Array<NotificationDoc & { id: string }> = [];
      snap.forEach((doc) => {
        const data = doc.data();
        const notif: NotificationDoc & { id: string } = {
          id: doc.id,
          orgId: data.orgId,
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          read: data.read ?? false,
          createdAt: data.createdAt,
          readAt: data.readAt,
          metadata: data.metadata,
        };
        result.push(notif);
        notifications.set(doc.id, notif);
      });
      return result;
    } catch (error) {
      console.warn("[Store] Failed to fetch notifications from Firestore:", error instanceof Error ? error.message : error);
    }
  }

  // In-memory fallback
  const all = Array.from(notifications.values())
    .filter((n) => n.userId === userId)
    .filter((n) => readFilter === undefined || n.read === readFilter)
    .filter((n) => !typeFilter || n.type === typeFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
  return all;
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
  const notification = notifications.get(notificationId);
  if (!notification || notification.userId !== userId) {
    return false;
  }

  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      await db.collection(COLLECTIONS.notifications).doc(notificationId).update({
        read: true,
        readAt: now(),
      });
    } catch (error) {
      console.warn("[Store] Failed to mark notification as read in Firestore:", error instanceof Error ? error.message : error);
    }
  }

  notification.read = true;
  notification.readAt = now();
  notifications.set(notificationId, notification);
  return true;
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const userNotifications = Array.from(notifications.values()).filter((n) => n.userId === userId && !n.read);
  let count = 0;

  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const batch = db.batch();
      const readAt = now();
      
      for (const notif of userNotifications) {
        const ref = db.collection(COLLECTIONS.notifications).doc(notif.id);
        batch.update(ref, { read: true, readAt });
        notif.read = true;
        notif.readAt = readAt;
        notifications.set(notif.id, notif);
        count++;
      }
      
      if (count > 0) {
        await batch.commit();
      }
    } catch (error) {
      console.warn("[Store] Failed to mark all notifications as read in Firestore:", error instanceof Error ? error.message : error);
    }
  } else {
    const readAt = now();
    for (const notif of userNotifications) {
      notif.read = true;
      notif.readAt = readAt;
      notifications.set(notif.id, notif);
      count++;
    }
  }

  return count;
}

/**
 * Create notifications for all team members in an org.
 */
export async function createNotificationForOrg(
  orgId: string,
  type: NotificationDoc["type"],
  title: string,
  message: string,
  metadata?: NotificationDoc["metadata"]
): Promise<void> {
  const members = await getTeamMembers(orgId);
  for (const member of members) {
    if (member.status === "active") {
      await createNotification(orgId, member.id, type, title, message, metadata);
    }
  }
}

/**
 * Get HubSpot integration for an organization.
 */
export async function getHubSpotIntegration(orgId: string): Promise<HubSpotIntegrationDoc | null> {
  // Try Firestore first if configured
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const doc = await db.collection(COLLECTIONS.hubspotIntegrations).doc(orgId).get();
      
      if (doc.exists) {
        const data = doc.data() as HubSpotIntegrationDoc;
        // Update in-memory cache
        hubspotIntegrations.set(orgId, data);
        return data;
      }
    } catch (error) {
      console.warn("[Store] Failed to get HubSpot integration from Firestore:", error instanceof Error ? error.message : error);
    }
  }
  
  // Fallback to in-memory storage
  return hubspotIntegrations.get(orgId) ?? null;
}

/**
 * Save HubSpot integration for an organization.
 */
export async function saveHubSpotIntegration(
  orgId: string,
  data: HubSpotIntegrationDoc
): Promise<void> {
  // Update in-memory cache
  hubspotIntegrations.set(orgId, data);
  
  // Persist to Firestore if configured
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      await db.collection(COLLECTIONS.hubspotIntegrations).doc(orgId).set(data);
    } catch (error) {
      console.warn("[Store] Failed to save HubSpot integration to Firestore:", error instanceof Error ? error.message : error);
    }
  }
}

/**
 * Delete HubSpot integration for an organization.
 */
export async function deleteHubSpotIntegration(orgId: string): Promise<void> {
  // Remove from in-memory cache
  hubspotIntegrations.delete(orgId);
  
  // Delete from Firestore if configured
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      await db.collection(COLLECTIONS.hubspotIntegrations).doc(orgId).delete();
    } catch (error) {
      console.warn("[Store] Failed to delete HubSpot integration from Firestore:", error instanceof Error ? error.message : error);
    }
  }
}

/**
 * Log a HubSpot sync event for an organization.
 */
export async function logHubSpotSync(entry: HubSpotSyncLogDoc): Promise<void> {
  const id = nextSyncLogId();
  const logEntry: HubSpotSyncLogDoc & { id: string } = {
    ...entry,
    id,
  };

  hubspotSyncLogs.set(id, logEntry);

  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const { id: _id, ...doc } = logEntry;
      await db.collection(COLLECTIONS.hubspotSyncLog).doc(id).set(doc);
    } catch (error) {
      console.warn("[Store] Failed to write HubSpot sync log:", error instanceof Error ? error.message : error);
    }
  }
}

/**
 * Get recent HubSpot sync logs for an organization.
 */
export async function getHubSpotSyncLogs(
  orgId: string,
  limit = 50
): Promise<Array<HubSpotSyncLogDoc & { id: string }>> {
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const snap = await db
        .collection(COLLECTIONS.hubspotSyncLog)
        .where("orgId", "==", orgId)
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get();

      const results: Array<HubSpotSyncLogDoc & { id: string }> = [];
      snap.forEach((doc) => {
        const data = doc.data() as HubSpotSyncLogDoc;
        const log: HubSpotSyncLogDoc & { id: string } = {
          id: doc.id,
          ...data,
        };
        results.push(log);
        hubspotSyncLogs.set(doc.id, log);
      });
      return results;
    } catch (error) {
      console.warn("[Store] Failed to fetch HubSpot sync logs:", error instanceof Error ? error.message : error);
    }
  }

  // In-memory fallback
  return Array.from(hubspotSyncLogs.values())
    .filter((log) => log.orgId === orgId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Add a failed HubSpot sync to the retry queue.
 */
export async function addHubSpotSyncToQueue(entry: HubSpotSyncQueueDoc): Promise<string> {
  const id = nextSyncQueueId();
  const doc: HubSpotSyncQueueDoc & { id: string } = { ...entry, id };
  hubspotSyncQueue.set(id, doc);
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const { id: _id, ...data } = doc;
      await db.collection(COLLECTIONS.hubspotSyncQueue).doc(id).set(data);
    } catch (error) {
      console.warn("[Store] Failed to write HubSpot sync queue:", error instanceof Error ? error.message : error);
    }
  }
  return id;
}

/**
 * Get HubSpot sync queue entries for an organization (oldest first for retry order).
 */
export async function getHubSpotSyncQueue(orgId: string): Promise<Array<HubSpotSyncQueueDoc & { id: string }>> {
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const snap = await db
        .collection(COLLECTIONS.hubspotSyncQueue)
        .where("orgId", "==", orgId)
        .get();
      const results: Array<HubSpotSyncQueueDoc & { id: string }> = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as HubSpotSyncQueueDoc;
        const item = { id: docSnap.id, ...data };
        results.push(item);
        hubspotSyncQueue.set(docSnap.id, item);
      });
      results.sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
      return results;
    } catch (error) {
      console.warn("[Store] Failed to fetch HubSpot sync queue:", error instanceof Error ? error.message : error);
    }
  }
  return Array.from(hubspotSyncQueue.values())
    .filter((e) => e.orgId === orgId)
    .sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
}

/**
 * Remove an entry from the HubSpot sync queue (after successful retry or discard).
 */
export async function removeFromHubSpotSyncQueue(queueId: string): Promise<void> {
  hubspotSyncQueue.delete(queueId);
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      await db.collection(COLLECTIONS.hubspotSyncQueue).doc(queueId).delete();
    } catch (error) {
      console.warn("[Store] Failed to delete HubSpot sync queue entry:", error instanceof Error ? error.message : error);
    }
  }
}

/**
 * Get Google Sheets integration for an organization.
 */
export async function getGoogleSheetsIntegration(orgId: string): Promise<GoogleSheetsIntegrationDoc | null> {
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const doc = await db.collection(COLLECTIONS.googleSheetsIntegrations).doc(orgId).get();
      if (doc.exists) {
        const data = doc.data() as GoogleSheetsIntegrationDoc;
        googleSheetsIntegrations.set(orgId, data);
        return data;
      }
    } catch (error) {
      console.warn("[Store] Failed to get Google Sheets integration from Firestore:", error instanceof Error ? error.message : error);
    }
  }
  return googleSheetsIntegrations.get(orgId) ?? null;
}

/**
 * Save Google Sheets integration for an organization.
 */
export async function saveGoogleSheetsIntegration(
  orgId: string,
  data: GoogleSheetsIntegrationDoc
): Promise<void> {
  googleSheetsIntegrations.set(orgId, data);
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      await db.collection(COLLECTIONS.googleSheetsIntegrations).doc(orgId).set(data);
    } catch (error) {
      console.warn("[Store] Failed to save Google Sheets integration to Firestore:", error instanceof Error ? error.message : error);
    }
  }
}

/**
 * Get GCP integration for an organization.
 */
export async function getGCPIntegration(orgId: string): Promise<GCPIntegrationDoc | null> {
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      const doc = await db.collection(COLLECTIONS.gcpIntegrations).doc(orgId).get();
      if (doc.exists) {
        const data = doc.data() as GCPIntegrationDoc;
        gcpIntegrations.set(orgId, data);
        return data;
      }
    } catch (error) {
      console.warn("[Store] Failed to get GCP integration from Firestore:", error instanceof Error ? error.message : error);
    }
  }
  return gcpIntegrations.get(orgId) ?? null;
}

/**
 * Save GCP integration for an organization.
 */
export async function saveGCPIntegration(
  orgId: string,
  data: GCPIntegrationDoc
): Promise<void> {
  gcpIntegrations.set(orgId, data);
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      await db.collection(COLLECTIONS.gcpIntegrations).doc(orgId).set(data);
    } catch (error) {
      console.warn("[Store] Failed to save GCP integration to Firestore:", error instanceof Error ? error.message : error);
    }
  }
}
