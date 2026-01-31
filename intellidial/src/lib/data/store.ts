/**
 * In-memory store for projects and contacts.
 * Used when Firebase is not configured. Resets on server restart.
 */

import type { ProjectDoc, ContactDoc } from "@/lib/firebase/types";
import { MOCK_PROJECTS, getMockContacts } from "@/lib/firebase/mockData";

const now = () => new Date().toISOString();

type ProjectWithId = ProjectDoc & { id: string };
type ContactWithId = ContactDoc & { id: string };

const projects = new Map<string, ProjectWithId>();
const contacts = new Map<string, ContactWithId>();
const projectContacts = new Map<string, string[]>();
/** Project call queue: contact IDs to call next (in order) */
const projectQueue = new Map<string, Set<string>>();

let contactIdCounter = 0;

function nextContactId() {
  return `contact-${++contactIdCounter}`;
}

function initStore() {
  if (projects.size > 0) return;
  MOCK_PROJECTS.forEach((p, i) => {
    const id = `proj-${String(i + 1)}`;
    projects.set(id, { ...p, id } as ProjectWithId);
    const mockContacts = getMockContacts(id);
    const ids: string[] = [];
    mockContacts.forEach((c) => {
      const cid = nextContactId();
      contacts.set(cid, { ...c, projectId: id, id: cid } as ContactWithId);
      ids.push(cid);
    });
    projectContacts.set(id, ids);
  });
  injectDemoChartData();
}

initStore();

export function getDashboardStats(): {
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

  for (const ids of projectContacts.values()) {
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

export function getProjectStats(projectId: string): ReturnType<typeof getDashboardStats> {
  const ids = projectContacts.get(projectId) ?? [];
  let contactsUploaded = ids.length;
  let callsMade = 0;
  let successfulCalls = 0;
  let unsuccessfulCalls = 0;
  let totalSeconds = 0;
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
  const hoursOnCalls = Math.round((totalSeconds / 3600) * 100) / 100;
  const successRate = callsMade > 0 ? Math.round((successfulCalls / callsMade) * 100) : 0;
  return {
    contactsUploaded,
    callsMade,
    successfulCalls,
    unsuccessfulCalls,
    hoursOnCalls,
    successRate,
  };
}

function getProjectCallsByDay(projectId: string): Array<{ date: string; calls: number; successful: number; failed: number }> {
  const byDay = new Map<string, { calls: number; successful: number; failed: number }>();
  const ids = projectContacts.get(projectId) ?? [];
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
  return Array.from(byDay.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getProjectMinutesByDay(projectId: string): Array<{ date: string; minutes: number }> {
  const byDay = new Map<string, number>();
  const ids = projectContacts.get(projectId) ?? [];
  for (const cid of ids) {
    const c = contacts.get(cid);
    if (!c?.callResult?.attemptedAt || !c.callResult.durationSeconds) continue;
    const date = c.callResult.attemptedAt.slice(0, 10);
    const mins = Math.round(c.callResult.durationSeconds / 60);
    byDay.set(date, (byDay.get(date) ?? 0) + mins);
  }
  return Array.from(byDay.entries())
    .map(([date, minutes]) => ({ date, minutes }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getProjectCallsByDayForChart(projectId: string): ReturnType<typeof getCallsByDayForChart> {
  const raw = getProjectCallsByDay(projectId);
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

export function getCallsByDay(): Array<{ date: string; calls: number; successful: number; failed: number }> {
  const byDay = new Map<string, { calls: number; successful: number; failed: number }>();

  for (const ids of projectContacts.values()) {
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

export function getMinutesByDay(): Array<{ date: string; minutes: number }> {
  const byDay = new Map<string, number>();
  for (const ids of projectContacts.values()) {
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
  const firstProjectId = Array.from(projects.keys())[0];
  if (!firstProjectId) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const existingIds = projectContacts.get(firstProjectId) ?? [];

  const names = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace", "Henry", "Ivy", "Jack", "Kate", "Leo"];
  const failureReasons = ["No answer", "Busy", "Wrong number", "Callback requested"];

  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, month, day);
    if (!isWorkingDay(d)) continue;
    const attemptedAt = d.toISOString().slice(0, 10) + "T09:00:00.000Z";

    // 4–12 calls per working day, varied
    const callsToday = demoRand(day * 7, 4, 12);
    for (let i = 0; i < callsToday; i++) {
      const seed = day * 100 + i;
      const isSuccess = demoRand(seed, 0, 100) > 22; // ~78% success rate
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

/** Get all working days of the current month for chart (Mon–Fri only) */
export function getCallsByDayForChart(): Array<{
  date: string;
  label: string;
  calls: number;
  successful: number;
  failed: number;
}> {
  const raw = getCallsByDay();
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
export function getMinutesByDayForChart(): Array<{ date: string; label: string; minutes: number }> {
  const raw = getMinutesByDay();
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

export function getDataPointRetrievalStats(): { withData: number; successfulTotal: number; rate: number } {
  let withData = 0;
  let successfulTotal = 0;
  for (const ids of projectContacts.values()) {
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

export function duplicateProject(projectId: string): ProjectWithId | null {
  const project = projects.get(projectId);
  if (!project) return null;

  const newProject = createProject({
    name: `${project.name} (copy)`,
    description: project.description ?? undefined,
  });
  updateProject(newProject.id, {
    captureFields: project.captureFields,
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

  return getProject(newProject.id);
}

export function listProjects(): ProjectWithId[] {
  return Array.from(projects.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getProject(id: string): ProjectWithId | null {
  return projects.get(id) ?? null;
}

export function createProject(
  data: { name: string; description?: string }
): ProjectWithId {
  const id = `proj-${Date.now()}`;
  const t = now();
  const project: ProjectWithId = {
    id,
    userId: "dev-user-1",
    name: data.name,
    description: data.description ?? null,
    status: "draft",
    captureFields: [],
    agentInstructions: null,
    createdAt: t,
    updatedAt: t,
  };
  projects.set(id, project);
  projectContacts.set(id, []);
  return project;
}

export function updateProject(
  id: string,
  data: Partial<Pick<ProjectDoc, "name" | "description" | "industry" | "tone" | "goal" | "agentQuestions" | "captureFields" | "agentInstructions" | "status" | "notifyOnComplete" | "surveyEnabled" | "callWindowStart" | "callWindowEnd">>
): ProjectWithId | null {
  const project = projects.get(id);
  if (!project) return null;
  const updated: ProjectWithId = {
    ...project,
    ...data,
    updatedAt: now(),
  };
  projects.set(id, updated);
  return updated;
}

export function getProjectQueue(projectId: string): string[] {
  return Array.from(projectQueue.get(projectId) ?? []);
}

export function setProjectQueue(projectId: string, contactIds: string[], add: boolean): void {
  const queueSet = projectQueue.get(projectId) ?? new Set<string>();
  for (const cid of contactIds) {
    if (add) queueSet.add(cid);
    else queueSet.delete(cid);
  }
  if (queueSet.size === 0) projectQueue.delete(projectId);
  else projectQueue.set(projectId, queueSet);
}

export function listContacts(
  projectId: string,
  opts?: { limit?: number; offset?: number; status?: "all" | "pending" | "success" | "failed" | "calling" }
): { contacts: ContactWithId[]; total: number } {
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

export function updateContact(
  contactId: string,
  data: Partial<Pick<ContactDoc, "status" | "callResult">>
): ContactWithId | null {
  const contact = contacts.get(contactId);
  if (!contact) return null;
  const updated: ContactWithId = {
    ...contact,
    ...data,
    updatedAt: now(),
  };
  contacts.set(contactId, updated);
  return updated;
}

export function createContacts(
  projectId: string,
  items: Array<{ phone: string; name?: string }>
): ContactWithId[] {
  const ids = projectContacts.get(projectId) ?? [];
  const t = now();
  const created: ContactWithId[] = [];

  const seen = new Set<string>();
  for (const item of items) {
    const phone = item.phone.replace(/\s/g, "");
    if (!phone || seen.has(phone)) continue;
    seen.add(phone);

    const id = nextContactId();
    const contact: ContactWithId = {
      id,
      projectId,
      phone,
      name: item.name ?? null,
      status: "pending",
      createdAt: t,
      updatedAt: t,
    };
    contacts.set(id, contact);
    ids.push(id);
    created.push(contact);
  }
  projectContacts.set(projectId, ids);
  return created;
}

const MOCK_TRANSCRIPTS = [
  "Agent: Hi, this is Sarah from Acme. Is this John?\nContact: Yes, speaking.\nAgent: Great, I'm calling about our offer...\nContact: Sure, send details.\nAgent: Thanks!",
  "Agent: Hi, is Maria available?\nContact: She's not in. Try tomorrow.\nAgent: Thanks, I'll call back.\n",
  "Agent: Hi, this is Sarah...\nContact: Oh yes, we spoke last week...\nAgent: Great, following up...\n",
];

function generateMockCallResult(
  status: "success" | "failed",
  captureFields?: { key: string }[]
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

export function runProjectSimulation(projectId: string): { updated: number } {
  const project = projects.get(projectId);
  if (!project) return { updated: 0 };

  updateProject(projectId, { status: "running" });
  const queueIds = projectQueue.get(projectId);
  const ids = queueIds && queueIds.size > 0
    ? Array.from(queueIds)
    : (projectContacts.get(projectId) ?? []);
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
    updateContact(cid, { status, callResult });
    if (queueIds) queueIds.delete(cid);
    count++;
  }

  if (queueIds && queueIds.size === 0) projectQueue.delete(projectId);
  updateProject(projectId, { status: "completed" });
  return { updated: count };
}
