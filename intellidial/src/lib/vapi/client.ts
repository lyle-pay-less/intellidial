/**
 * VAPI API client — server-side only.
 * Used to create/update assistants and place outbound calls.
 * Do not import this in client components; API key must stay on the server.
 */

import type { ProjectDoc, AgentQuestion, CaptureField } from "@/lib/firebase/types";

const VAPI_BASE = "https://api.vapi.ai";

/** Project shape we need for building assistant config (id + assistantId/structuredOutputId optional for update). */
export type ProjectForVapi = Pick<
  ProjectDoc,
  "name" | "agentInstructions" | "goal" | "tone" | "agentQuestions" | "captureFields"
> & { id: string; assistantId?: string | null; structuredOutputId?: string | null };

/** VAPI assistant create/update payload (subset we use). */
type VapiAssistantPayload = {
  name: string;
  model: {
    provider: "openai";
    model: string;
    messages: Array<{ role: "system"; content: string }>;
  };
  voice: { provider: string; voiceId: string };
  firstMessage?: string;
  transcriber?: { provider: string; model: string; language: string };
  maxDurationSeconds?: number;
  silenceTimeoutSeconds?: number;
  responseDelaySeconds?: number;
  /** So we receive transcript + recording when the call ends */
  server?: { url: string };
  serverMessages?: string[];
  /** Recording + structured outputs (extract captureFields from call) */
  artifactPlan?: {
    recording?: { enabled?: boolean };
    structuredOutputIds?: string[];
  };
};

/** VAPI outbound call payload. */
type VapiCallPayload = {
  assistantId: string;
  phoneNumberId: string;
  customer: { number: string; name?: string };
};

function getApiKey(): string | undefined {
  return process.env.VAPI_API_KEY;
}

/** Headers for VAPI API requests. Use only on the server. */
export function getVapiHeaders(): Record<string, string> {
  const key = getApiKey();
  if (!key) {
    throw new Error("VAPI_API_KEY is not set");
  }
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

/** Whether VAPI is configured (key present). Use to gate call features. */
export function isVapiConfigured(): boolean {
  return !!getApiKey();
}

/** MVP: single phone number from env. Per-org numbers can be added later. */
const PHONE_NUMBER_NOT_CONFIGURED =
  "Phone number not configured. Set VAPI_PHONE_NUMBER_ID in your environment or add a number in the VAPI dashboard.";

/**
 * Returns the phone number ID to use for outbound calls.
 * MVP: reads from VAPI_PHONE_NUMBER_ID (one number for all calls). Per-org later.
 * @throws Error with user-facing message if not set
 */
export function getPhoneNumberIdForCall(): string {
  const id = process.env.VAPI_PHONE_NUMBER_ID?.trim();
  if (!id) {
    throw new Error(PHONE_NUMBER_NOT_CONFIGURED);
  }
  return id;
}

/** Whether the MVP phone number is configured (env set). Use to show setup prompt. */
export function isPhoneNumberConfigured(): boolean {
  return !!process.env.VAPI_PHONE_NUMBER_ID?.trim();
}

/**
 * Build the system prompt for the VAPI assistant from project config.
 * Uses agentInstructions as the main script; appends goal and tone if present.
 * Does not include any contact PII.
 */
function buildSystemPrompt(project: ProjectForVapi): string {
  const parts: string[] = [];
  const instructions = (project.agentInstructions ?? "").trim();
  if (instructions) parts.push(instructions);
  if ((project.goal ?? "").trim()) {
    parts.push(`\nGOAL: ${project.goal.trim()}`);
  }
  if ((project.tone ?? "").trim()) {
    parts.push(`\nTONE: ${project.tone.trim()}`);
  }
  const questions = (project.agentQuestions ?? []).filter((q) => (q as AgentQuestion).text?.trim());
  if (questions.length > 0) {
    parts.push("\nQUESTIONS TO COVER (work these into the conversation naturally):");
    questions.forEach((q, i) => {
      parts.push(`${i + 1}. ${(q as AgentQuestion).text.trim()}`);
    });
  }
  return parts.join("\n").trim() || "You are a professional phone agent. Be concise and helpful.";
}

/** Webhook base URL for end-of-call-report (must be reachable by VAPI, e.g. ngrok or deployed app). */
function getWebhookBaseUrl(): string | undefined {
  return process.env.VAPI_WEBHOOK_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
}

/**
 * Build the full VAPI assistant payload from a project.
 * Maps project fields to VAPI assistant schema (system prompt, voice, transcriber, etc.).
 * When VAPI_WEBHOOK_BASE_URL (or NEXT_PUBLIC_APP_URL) is set, adds server URL + serverMessages
 * so we receive end-of-call-report with transcript and recording.
 */
export function buildAssistantConfig(project: ProjectForVapi): VapiAssistantPayload {
  const systemContent = buildSystemPrompt(project);
  const name = (project.name || "Agent").slice(0, 40); // VAPI name limit
  const base = getWebhookBaseUrl();
  const webhookUrl = base ? `${base.replace(/\/$/, "")}/api/webhooks/vapi/call-ended` : undefined;

  const payload: VapiAssistantPayload = {
    name,
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemContent }],
    },
    voice: {
      provider: "11labs",
      voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel — professional, matches existing scripts
    },
    firstMessage: "Hi, good day!",
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en",
    },
    maxDurationSeconds: 180,
    silenceTimeoutSeconds: 30,
    responseDelaySeconds: 0.5,
  };

  if (webhookUrl) {
    payload.server = { url: webhookUrl };
    payload.serverMessages = ["end-of-call-report"];
    payload.artifactPlan = { recording: { enabled: true } };
  }
  if (project.structuredOutputId?.trim()) {
    payload.artifactPlan = payload.artifactPlan ?? {};
    payload.artifactPlan.structuredOutputIds = [project.structuredOutputId.trim()];
  }

  return payload;
}

/** Build JSON Schema for VAPI structured output from project captureFields. */
function buildStructuredOutputSchema(captureFields: CaptureField[]): Record<string, unknown> {
  const properties: Record<string, { type: string; description?: string }> = {};
  const required: string[] = [];
  for (const f of captureFields) {
    if (!f.key?.trim()) continue;
    const key = f.key.trim();
    const type = f.type === "number" ? "number" : "string";
    properties[key] = { type, description: f.label?.trim() || key };
    required.push(key);
  }
  return {
    type: "object",
    properties,
    ...(required.length ? { required } : {}),
  };
}

/**
 * Create a VAPI structured output for extracting captureFields from calls.
 * Returns the structured output id. Throws on API error.
 */
export async function createStructuredOutput(
  name: string,
  schema: Record<string, unknown>,
  description?: string
): Promise<string> {
  const body: Record<string, unknown> = {
    name: name.slice(0, 40),
    type: "ai",
    schema,
    ...(description ? { description } : {}),
  };
  const res = await fetch(`${VAPI_BASE}/structured-output`, {
    method: "POST",
    headers: getVapiHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    let message = `VAPI create structured output failed: ${res.status}`;
    try {
      const json = JSON.parse(text) as { message?: string; error?: string };
      message = json.message ?? json.error ?? message;
    } catch {
      if (text) message += ` — ${text.slice(0, 200)}`;
    }
    console.error("[VAPI] createStructuredOutput error:", message);
    throw new Error(message);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

/**
 * Update a VAPI structured output schema (e.g. when captureFields change).
 * Throws on API error.
 */
export async function updateStructuredOutput(
  structuredOutputId: string,
  schema: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${VAPI_BASE}/structured-output/${structuredOutputId}?schemaOverride=true`, {
    method: "PATCH",
    headers: getVapiHeaders(),
    body: JSON.stringify({ schema }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn("[VAPI] updateStructuredOutput error:", res.status, text.slice(0, 200));
    throw new Error(`VAPI update structured output failed: ${res.status}`);
  }
}

/**
 * Ensure the project has a VAPI structured output for captureFields.
 * Creates one if missing, updates schema if captureFields changed.
 * Returns the structured output id, or null if no captureFields.
 */
export async function ensureStructuredOutput(project: ProjectForVapi): Promise<string | null> {
  const fields = project.captureFields ?? [];
  if (fields.length === 0) return null;

  const schema = buildStructuredOutputSchema(fields);
  const name = `Intellidial ${(project.name || project.id).slice(0, 25)}`;
  const description = "Extract answers to survey questions from the call.";

  if (project.structuredOutputId?.trim()) {
    await updateStructuredOutput(project.structuredOutputId.trim(), schema);
    return project.structuredOutputId.trim();
  }
  return createStructuredOutput(name, schema, description);
}

/**
 * Create a new VAPI assistant from project config.
 * Returns the assistant id. Throws on API error.
 */
export async function createAssistant(project: ProjectForVapi): Promise<string> {
  const payload = buildAssistantConfig(project);
  const res = await fetch(`${VAPI_BASE}/assistant`, {
    method: "POST",
    headers: getVapiHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    let message = `VAPI create assistant failed: ${res.status}`;
    try {
      const json = JSON.parse(text) as { message?: string; error?: string };
      message = json.message ?? json.error ?? message;
    } catch {
      if (text) message += ` — ${text.slice(0, 200)}`;
    }
    console.error("[VAPI] createAssistant error:", message);
    throw new Error(message);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

/**
 * Update an existing VAPI assistant with current project config.
 * Throws on API error.
 */
export async function updateAssistant(
  assistantId: string,
  project: ProjectForVapi
): Promise<void> {
  const payload = buildAssistantConfig(project);
  const res = await fetch(`${VAPI_BASE}/assistant/${assistantId}`, {
    method: "PATCH",
    headers: getVapiHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    let message = `VAPI update assistant failed: ${res.status}`;
    try {
      const json = JSON.parse(text) as { message?: string; error?: string };
      message = json.message ?? json.error ?? message;
    } catch {
      if (text) message += ` — ${text.slice(0, 200)}`;
    }
    console.error("[VAPI] updateAssistant error:", message);
    throw new Error(message);
  }
}

/**
 * Create or update the VAPI assistant for this project.
 * If project.assistantId is set, PATCH that assistant; otherwise POST a new one.
 * Returns the assistant id (existing or newly created).
 */
export async function createOrUpdateAssistant(project: ProjectForVapi): Promise<string> {
  if (project.assistantId?.trim()) {
    await updateAssistant(project.assistantId.trim(), project);
    return project.assistantId.trim();
  }
  return createAssistant(project);
}

/**
 * Place an outbound call via VAPI.
 * Requires assistantId (from project), phoneNumberId (from org), and customer phone number.
 * Returns the VAPI call id. Throws on API error.
 */
export async function createOutboundCall(params: {
  assistantId: string;
  phoneNumberId: string;
  customerNumber: string;
  customerName?: string | null;
}): Promise<string> {
  const { assistantId, phoneNumberId, customerNumber, customerName } = params;
  let number = customerNumber.trim().replace(/\s/g, "");
  
  // Normalize South African numbers
  // Handle malformed numbers like +084 -> treat as 084
  if (number.startsWith("+0") && number.length > 3) {
    // Remove the + and normalize as if it started with 0
    number = number.slice(1);
  }
  
  if (number.startsWith("0")) {
    // Handle cases like 084 -> +2784
    number = "+27" + number.slice(1);
  } else if (!number.startsWith("+")) {
    // Handle cases like 844050294 -> +27844050294
    number = "+27" + number;
  } else if (number.startsWith("+27")) {
    // Already in correct format
    number = number;
  } else {
    // Other country codes - keep as is but log warning
    console.warn("[VAPI] createOutboundCall: non-SA number format", number);
  }
  
  console.log("[VAPI] createOutboundCall: normalized number", customerNumber.trim(), "->", number);

  // Validate: South African numbers should be +27 followed by 9 digits (mobile) or 8-9 digits (landline)
  const digitsAfterCountryCode = number.slice(3).replace(/\D/g, "");
  if (digitsAfterCountryCode.length < 8 || digitsAfterCountryCode.length > 9) {
    console.warn("[VAPI] createOutboundCall: suspicious number length", number, "digits:", digitsAfterCountryCode.length);
  }

  const payload: VapiCallPayload = {
    assistantId,
    phoneNumberId,
    customer: {
      number,
      ...(customerName ? { name: customerName.slice(0, 40) } : {}),
    },
  };

  console.log("[VAPI] createOutboundCall: payload", JSON.stringify(payload, null, 2));

  const res = await fetch(`${VAPI_BASE}/call/phone`, {
    method: "POST",
    headers: getVapiHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    let message = `VAPI create call failed: ${res.status}`;
    try {
      const json = JSON.parse(text) as { message?: string; error?: string; details?: string };
      message = json.message ?? json.error ?? message;
      if (json.details) message += ` — ${json.details}`;
    } catch {
      if (text) message += ` — ${text.slice(0, 200)}`;
    }
    console.error("[VAPI] createOutboundCall error:", {
      status: res.status,
      message,
      phoneNumber: number,
      assistantId,
      phoneNumberId,
    });
    throw new Error(message);
  }

  const data = (await res.json()) as { id: string; status?: string; error?: string; message?: string };
  console.log("[VAPI] createOutboundCall: response", JSON.stringify(data, null, 2));
  if (data.error || data.message) {
    console.warn("[VAPI] createOutboundCall: warning in response", { error: data.error, message: data.message });
  }
  return data.id;
}

/** VAPI structured output result in call artifact (keyed by output id). */
export type VapiStructuredOutputs = Record<
  string,
  { name?: string; result?: Record<string, unknown> | null } | undefined
>;

/** VAPI GET /call/{id} response (subset we use for polling). */
export type VapiCallResponse = {
  id: string;
  status?: string | null;
  endedReason?: string | null;
  createdAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  assistantId?: string | null;
  artifact?: {
    transcript?: string | null;
    recording?: { url?: string | null } | null;
    structuredOutputs?: VapiStructuredOutputs | null;
  } | null;
};

/**
 * Map VAPI artifact.structuredOutputs to our capturedData (keyed by capture field key).
 * Uses first structured output that has a result; coerces values to string | number | null.
 */
export function mapStructuredOutputsToCapturedData(
  structuredOutputs: VapiStructuredOutputs | null | undefined,
  captureFieldKeys: string[]
): Record<string, string | number | null> | undefined {
  if (!structuredOutputs || typeof structuredOutputs !== "object") return undefined;
  const result = structuredOutputs[Object.keys(structuredOutputs)[0]]?.result;
  if (!result || typeof result !== "object") return undefined;
  const captured: Record<string, string | number | null> = {};
  const keys = new Set(captureFieldKeys);
  for (const key of keys) {
    const v = (result as Record<string, unknown>)[key];
    if (v === undefined) continue;
    if (typeof v === "number" && Number.isFinite(v)) captured[key] = v;
    else if (typeof v === "string") captured[key] = v;
    else if (v === null) captured[key] = null;
    else captured[key] = String(v);
  }
  return Object.keys(captured).length ? captured : undefined;
}

/**
 * Fetch a call by ID from VAPI (for polling transcript/recording when webhook is not reachable).
 * Returns null if call not found or API error.
 */
export async function getCall(callId: string): Promise<VapiCallResponse | null> {
  const res = await fetch(`${VAPI_BASE}/call/${callId}`, {
    method: "GET",
    headers: getVapiHeaders(),
  });
  if (!res.ok) {
    if (res.status === 404) {
      console.warn("[VAPI] getCall: call not found", callId);
      return null;
    }
    const errorText = await res.text().catch(() => "");
    console.error("[VAPI] getCall error:", {
      callId,
      status: res.status,
      error: errorText.slice(0, 500),
    });
    return null;
  }
  const data = await res.json() as VapiCallResponse;
  // Log full response for debugging stuck calls
  if (data.status === "queued") {
    console.log("[VAPI] getCall: call still queued", {
      callId,
      status: data.status,
      createdAt: data.createdAt,
      startedAt: data.startedAt,
      endedAt: data.endedAt,
      endedReason: data.endedReason,
    });
  }
  return data;
}
