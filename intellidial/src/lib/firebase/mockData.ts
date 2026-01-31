/**
 * Mock data for dashboard and project pages before real Firestore is wired.
 * Use for UI development and demos.
 */

import type { ProjectDoc, ContactDoc, CallResult } from "./types";

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_PROJECTS: ProjectDoc[] = [
  {
    userId: "user-mock-1",
    name: "Q1 Restaurant Outreach",
    description: "Follow-up calls to tier 1 restaurants",
    status: "completed",
    captureFields: [
      { key: "interested", label: "Interested?", type: "text" },
      { key: "callback_date", label: "Callback date", type: "text" },
    ],
    agentInstructions: "Introduce yourself. Ask if they're interested in the new lunch menu. Offer a callback if busy.",
    createdAt: threeDaysAgo,
    updatedAt: now,
  },
  {
    userId: "user-mock-1",
    name: "Dental Practices — Trial",
    description: "Cold outreach for trial signups",
    status: "running",
    captureFields: [
      { key: "decision_maker", label: "Decision maker?", type: "text" },
      { key: "interested", label: "Interested?", type: "text" },
    ],
    agentInstructions: "Ask for the practice manager. Explain the trial offer. Capture interest and callback preference.",
    createdAt: twoDaysAgo,
    updatedAt: now,
  },
  {
    userId: "user-mock-1",
    name: "Retail Leads — Draft",
    description: "Draft project",
    status: "draft",
    captureFields: [],
    agentInstructions: null,
    createdAt: now,
    updatedAt: now,
  },
];

const MOCK_CALL_RESULTS: Record<string, CallResult> = {
  "contact-1": {
    durationSeconds: 142,
    recordingUrl: "https://example.com/recordings/1.mp3",
    transcript: "Agent: Hi, this is Sarah from Acme. Is this John?\nContact: Yes, speaking.\nAgent: Great, I'm calling about our lunch menu offer...\nContact: Sure, send me the details.\nAgent: I'll have that emailed today. Thanks!",
    capturedData: { interested: "Yes", callback_date: "" },
    attemptedAt: now,
  },
  "contact-2": {
    durationSeconds: 89,
    recordingUrl: "https://example.com/recordings/2.mp3",
    transcript: "Agent: Hi, is Maria available?\nContact: She's not in. Try tomorrow.\nAgent: Thanks, I'll call back.\n",
    capturedData: { interested: "Not reached", callback_date: "Tomorrow" },
    attemptedAt: now,
  },
  "contact-3": {
    durationSeconds: 0,
    failureReason: "No answer",
    attemptedAt: now,
  },
  "contact-4": {
    durationSeconds: 210,
    recordingUrl: "https://example.com/recordings/4.mp3",
    transcript: "Agent: Hi, this is Sarah from Acme...\nContact: Oh yes, we spoke last week...\nAgent: Great, following up on the quote...\n",
    capturedData: { interested: "Yes", callback_date: "" },
    attemptedAt: twoDaysAgo,
  },
};

export function getMockContacts(_projectId: string): ContactDoc[] {
  return [
    { projectId: _projectId, phone: "+12345678901", name: "John Smith", status: "success", callResult: MOCK_CALL_RESULTS["contact-1"], createdAt: threeDaysAgo, updatedAt: now },
    { projectId: _projectId, phone: "+12345678902", name: "Maria Garcia", status: "success", callResult: MOCK_CALL_RESULTS["contact-2"], createdAt: threeDaysAgo, updatedAt: now },
    { projectId: _projectId, phone: "+12345678903", status: "failed", callResult: MOCK_CALL_RESULTS["contact-3"], createdAt: threeDaysAgo, updatedAt: now },
    { projectId: _projectId, phone: "+12345678904", name: "Bob Wilson", status: "success", callResult: MOCK_CALL_RESULTS["contact-4"], createdAt: threeDaysAgo, updatedAt: now },
    { projectId: _projectId, phone: "+12345678905", status: "pending", createdAt: now, updatedAt: now },
    // Extra demo data for better chart visualization
    { projectId: _projectId, phone: "+12345678906", name: "Alice", status: "success", callResult: { durationSeconds: 95, attemptedAt: now, capturedData: { interested: "Yes" } }, createdAt: now, updatedAt: now },
    { projectId: _projectId, phone: "+12345678907", name: "Bob", status: "success", callResult: { durationSeconds: 180, attemptedAt: now, capturedData: { interested: "No" } }, createdAt: now, updatedAt: now },
    { projectId: _projectId, phone: "+12345678908", status: "failed", callResult: { durationSeconds: 0, failureReason: "Busy", attemptedAt: now }, createdAt: now, updatedAt: now },
    { projectId: _projectId, phone: "+12345678909", name: "Carol", status: "success", callResult: { durationSeconds: 210, attemptedAt: yesterday, capturedData: { interested: "Yes" } }, createdAt: now, updatedAt: now },
    { projectId: _projectId, phone: "+12345678910", status: "success", callResult: { durationSeconds: 145, attemptedAt: yesterday, capturedData: { interested: "Yes" } }, createdAt: now, updatedAt: now },
    { projectId: _projectId, phone: "+12345678911", status: "failed", callResult: { durationSeconds: 0, failureReason: "No answer", attemptedAt: yesterday }, createdAt: now, updatedAt: now },
    { projectId: _projectId, phone: "+12345678912", name: "Dave", status: "success", callResult: { durationSeconds: 320, attemptedAt: fourDaysAgo, capturedData: { interested: "Yes" } }, createdAt: now, updatedAt: now },
    { projectId: _projectId, phone: "+12345678913", status: "success", callResult: { durationSeconds: 88, attemptedAt: fourDaysAgo, capturedData: { interested: "No" } }, createdAt: now, updatedAt: now },
    { projectId: _projectId, phone: "+12345678914", status: "success", callResult: { durationSeconds: 156, attemptedAt: fiveDaysAgo, capturedData: { interested: "Yes" } }, createdAt: now, updatedAt: now },
  ];
}

/** Aggregate stats from mock contacts with call results. */
export function getMockDashboardStats() {
  const contacts = getMockContacts("project-1");
  const withResult = contacts.filter((c) => c.callResult);
  const successful = contacts.filter((c) => c.status === "success");
  const failed = contacts.filter((c) => c.status === "failed");
  const totalSeconds = withResult.reduce((sum, c) => sum + (c.callResult?.durationSeconds ?? 0), 0);
  const hoursOnCalls = Math.round((totalSeconds / 3600) * 100) / 100;

  return {
    contactsUploaded: contacts.length,
    callsMade: withResult.length,
    successfulCalls: successful.length,
    unsuccessfulCalls: failed.length,
    hoursOnCalls,
    successRate: withResult.length > 0 ? Math.round((successful.length / withResult.length) * 100) : 0,
  };
}
