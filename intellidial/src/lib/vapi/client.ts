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
  "name" | "agentName" | "agentCompany" | "agentNumber" | "agentVoice" | "userGoal" | "businessContext" | "agentInstructions" | "goal" | "tone" | "agentQuestions" | "captureFields"
> & { id: string; assistantId?: string | null; structuredOutputId?: string | null };

/** 11labs voice settings (from API or defaults when fetch not available). */
export type ElevenLabsVoiceSettings = {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
  speed: number;
};

/** Fallback when we can't fetch per-voice settings from ElevenLabs. Exported for voice-preview fallback. */
export const ELEVENLABS_VOICE_DEFAULTS: ElevenLabsVoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0,
  use_speaker_boost: true,
  speed: 1.0,
};

const ELEVENLABS_SETTINGS_URL = "https://api.elevenlabs.io/v1/voices";

/**
 * Fetch this voice's saved settings from ElevenLabs (each voice has its own in the UI).
 * Uses ELEVEN_LABS_API_KEY. Returns null if key missing or request fails — then use ELEVENLABS_VOICE_DEFAULTS.
 */
export async function fetchElevenLabsVoiceSettings(
  voiceId: string
): Promise<ElevenLabsVoiceSettings | null> {
  const apiKey = process.env.ELEVEN_LABS_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const res = await fetch(`${ELEVENLABS_SETTINGS_URL}/${voiceId}/settings`, {
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      stability?: number;
      similarity_boost?: number;
      style?: number;
      use_speaker_boost?: boolean;
      speed?: number;
    };
    return {
      stability: typeof data.stability === "number" ? data.stability : ELEVENLABS_VOICE_DEFAULTS.stability,
      similarity_boost: typeof data.similarity_boost === "number" ? data.similarity_boost : ELEVENLABS_VOICE_DEFAULTS.similarity_boost,
      style: typeof data.style === "number" ? data.style : ELEVENLABS_VOICE_DEFAULTS.style,
      use_speaker_boost: typeof data.use_speaker_boost === "boolean" ? data.use_speaker_boost : ELEVENLABS_VOICE_DEFAULTS.use_speaker_boost,
      speed: typeof data.speed === "number" ? data.speed : ELEVENLABS_VOICE_DEFAULTS.speed,
    };
  } catch {
    return null;
  }
}

/** VAPI assistant create/update payload (subset we use). */
type VapiAssistantPayload = {
  name: string;
  model: {
    provider: "openai";
    model: string;
    messages: Array<{ role: "system"; content: string }>;
  };
  voice: {
    provider: string;
    voiceId: string;
    /** 11labs: speech speed (0.7–1.2). Passed so calls match ElevenLabs UI. */
    speed?: number;
    /** 11labs: stability (0–1). */
    stability?: number;
    /** 11labs: similarity_boost (0–1). */
    similarity_boost?: number;
    /** 11labs: model (e.g. eleven_multilingual_v2). */
    modelId?: string;
  };
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
  /** When the assistant says one of these, VAPI ends the call (e.g. after saying goodbye). */
  endCallPhrases?: string[];
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

/** VAPI phone number list item (id + E164 for display). */
export type VapiPhoneNumberOption = { id: string; number: string };

/**
 * List phone numbers available for outbound calls.
 * Calls VAPI GET /phone-number; on failure or empty, falls back to VAPI_PHONE_NUMBER_ID (and optional VAPI_PHONE_NUMBER_E164).
 */
export async function listPhoneNumbers(): Promise<VapiPhoneNumberOption[]> {
  const fallbackId = process.env.VAPI_PHONE_NUMBER_ID?.trim();
  const fallbackNumber = process.env.VAPI_PHONE_NUMBER_E164?.trim() || fallbackId || "Configured number";

  try {
    const res = await fetch(`${VAPI_BASE}/phone-number`, {
      method: "GET",
      headers: getVapiHeaders(),
    });
    if (!res.ok) {
      throw new Error(`VAPI phone-number list returned ${res.status}`);
    }
    const data = (await res.json()) as Array<{ id?: string; number?: string }>;
    if (!Array.isArray(data) || data.length === 0) {
      if (fallbackId) return [{ id: fallbackId, number: fallbackNumber }];
      return [];
    }
    return data
      .filter((n): n is { id: string; number: string } => typeof n?.id === "string" && typeof n?.number === "string")
      .map((n) => ({ id: n.id, number: n.number }));
  } catch {
    if (fallbackId) return [{ id: fallbackId, number: fallbackNumber }];
    return [];
  }
}

/** Map dropdown value to ElevenLabs voiceId. Used for 11labs provider and for voice preview. */
const ELEVENLABS_VOICE_IDS: Record<string, string> = {
  default: "L5zW3PqYZoWAeS4J1qMV", // Dr. Samuel Rosso (SA default; was Rachel)
  rachel: "21m00Tcm4TlvDq8ikWAM",
  bella: "EXAVITQu4vr4xnSDxMaL",
  elli: "MF3mGyEYCl7XYWbV9V6O",
  domi: "AZnzlk1XvdvUeBnXmlld",
  gigi: "jBpfuIE2acCO8z3wKNLl",
  grace: "oWAxZDx7w5VEj9dCyTzz",
  jessi: "TxGEqnHWrfWFTfGW9XjX",
  nicole: "piTKgcLEGmPE4e6mEKli",
  sky: "pFZP5JQG7iQjIQuC4Bku",
  adam: "pNInz6obpgDQGcFmaJgB",
  antoni: "ErXwobaYiN019PkySvjV",
  sam: "yoZ06aMxZJJ28mfd3POQ",
  arnold: "VR6AewLTigWG4xSOukaG",
  daniel: "onwK4e9ZLuTAKqWW03F9",
  // South African (from your ElevenLabs Voice Library)
  samuel_rosso: "L5zW3PqYZoWAeS4J1qMV",   // Dr. Samuel Rosso – Retired Doctor
  thandi: "BcpjRWrYhDBHmOnetmBl",         // Clear and Engaging Narrator
  thabiso: "j32TutubsmjTPYaEhg5T",        // Bright, Energetic and Engaging
  musole: "zY7DEQPsInIw5phF8qoH",         // Smokey, Stoic, and Measured
  gawain: "x52Gqgso2pdbdr7KngsJ",         // The Gawain – Confident, Clear and Direct
  crystal: "zd1c6qDiwPV3b24VZtor",         // Casual conversationalist
  emma_lilliana: "0z8S749Xe6jLCD34QXl1",  // Emma Lilliana – Soft, Warm and Gentle
  hannah: "xeBpkkuzgxa0IwKt7NTP",         // Formal and Professional
  cheyenne: "atf1ppeJGCYFBlCLZ26e",        // Calm and Professional
  ryan: "ZSpZE1MGLI5tiZBKkT91",            // Ryan – Serious, Round, and Clear
  // Legacy keys (no longer in library) – fallback to first SA voice
  shrey: "L5zW3PqYZoWAeS4J1qMV",
  darwin: "L5zW3PqYZoWAeS4J1qMV",
  opsy: "L5zW3PqYZoWAeS4J1qMV",
};

/** PlayHT shut down (acquired by Meta). Legacy keys mapped to 11labs default so old projects still work. */
const PLAYHT_SA_VOICES_LEGACY = ["playht_luke", "playht_ayanda", "playht_leah"];

/** Get ElevenLabs voice ID for a voice key. Used for voice preview (preview only supports 11labs). */
export function getVoiceIdForKey(voiceKey: string): string {
  const key = (voiceKey ?? "default").trim().toLowerCase() || "default";
  return ELEVENLABS_VOICE_IDS[key] ?? ELEVENLABS_VOICE_IDS.default;
}

/** Returns { provider, voiceId } for VAPI. PlayHT shut down — legacy playht_* keys fall back to 11labs default. */
export function getVoiceProviderAndId(voiceKey: string): { provider: string; voiceId: string } {
  const key = (voiceKey ?? "default").trim().toLowerCase() || "default";
  if (PLAYHT_SA_VOICES_LEGACY.includes(key)) {
    return { provider: "11labs", voiceId: ELEVENLABS_VOICE_IDS.default };
  }
  const voiceId = ELEVENLABS_VOICE_IDS[key] ?? ELEVENLABS_VOICE_IDS.default;
  return { provider: "11labs", voiceId };
}

/**
 * Build the system prompt for the VAPI assistant from project config.
 * Prepend agent identity (name, company, number) when set; then instructions, goal, tone, questions.
 * Does not include any contact PII.
 */
function buildSystemPrompt(project: ProjectForVapi): string {
  const parts: string[] = [];
  // Who the agent is calling (VAPI fills {{customer.name}} and {{customer.number}} per call)
  parts.push(
    "CURRENT CALL: You are calling {{customer.name}} at {{customer.number}}. " +
    "Use their name to personalize when you have it (e.g. 'Hi {{customer.name}}'). " +
    "If the person's name is not provided, say 'Hi' or 'Hello'."
  );
  parts.push(
    "IDENTITY: You work for this company. When referring to the business — hours, location, services, contact details — always use 'we', 'our', and 'us' (e.g. 'We are open 9 to 5', 'Our office is at...', 'You can reach us at...'). Never say 'they' or 'the company' as if you are external."
  );
  parts.push(
    "ENDING THE CALL: When the person says goodbye, bye, hang up, or that they need to go, say a brief closing and end the call. Use a natural sign-off such as: Goodbye, Bye, Cheers, Take care, Sharp (SA), Thanks bye, Have a good one, or e.g. 'Thanks for your time. Goodbye.' Do not keep talking. 'Hang up' or 'please hang up' means they want to end this call now — say goodbye and end the call; it does NOT mean they want to be removed from the list."
  );
  parts.push(
    "COMPLIANCE (South Africa / POPIA): If the person clearly asks to stop being called in future, to be removed from the list, or not to be contacted again, acknowledge and say you will ensure they are not called again. Do not confuse this with simply ending the current call (goodbye / hang up)."
  );
  const businessContext = (project.businessContext ?? "").trim();
  if (businessContext) {
    parts.push("BUSINESS CONTEXT (use this to answer questions about the company, location, hours, services):");
    parts.push(businessContext);
  }
  const agentName = typeof project.agentName === "string" ? project.agentName.trim() : "";
  const agentCompany = typeof project.agentCompany === "string" ? project.agentCompany.trim() : "";
  const agentNumber = typeof project.agentNumber === "string" ? project.agentNumber.trim() : "";
  if (agentName || agentCompany || agentNumber) {
    const identity: string[] = [];
    if (agentName) identity.push(`You are ${agentName}.`);
    if (agentCompany) identity.push(`You are calling on behalf of ${agentCompany}.`);
    if (agentNumber) identity.push(`The number you are calling from is ${agentNumber}.`);
    parts.push(identity.join(" "));
  }
  const instructions = (project.agentInstructions ?? "").trim();
  if (instructions) parts.push(instructions);
  const goal = typeof project.goal === "string" ? project.goal.trim() : "";
  if (goal) parts.push(`\nGOAL: ${goal}`);
  const tone = typeof project.tone === "string" ? project.tone.trim() : "";
  if (tone) parts.push(`\nTONE: ${tone}`);
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
 * When VAPI_WEBHOOK_BASE_URL (or NEXT_PUBLIC_APP_URL) is set and not forWebTest, adds server URL
 * + serverMessages so we receive end-of-call-report with transcript and recording.
 *
 * forWebTest: omit server URL so browser test calls don't fail. VAPI/Daily can't reach localhost,
 * so web calls with a server URL often get daily-error and drop immediately.
 *
 * Voice: we only send provider ("11labs") and voiceId. We never send an ElevenLabs API key.
 * TTS on production calls is done by VAPI; keep your ElevenLabs key out of VAPI dashboard
 * if you want TTS cost to run through VAPI only. Use ELEVEN_LABS_API_KEY in this app
 * for voice preview only.
 * For 11labs we fetch this voice's saved settings from ElevenLabs so each voice sounds as in the UI.
 */
export async function buildAssistantConfig(
  project: ProjectForVapi,
  options?: { forWebTest?: boolean }
): Promise<VapiAssistantPayload> {
  const forWebTest = options?.forWebTest === true;
  const systemContent = buildSystemPrompt(project);
  const displayName = (project.agentName ?? project.name ?? "Agent").trim().slice(0, 40);
  const name = displayName || "Agent";
  const base = forWebTest ? undefined : getWebhookBaseUrl();
  const webhookUrl = base ? `${base.replace(/\/$/, "")}/api/webhooks/vapi/call-ended` : undefined;
  const voiceKey = (project.agentVoice ?? "default").trim().toLowerCase() || "default";
  const { provider: voiceProvider, voiceId } = getVoiceProviderAndId(voiceKey);

  const voicePayload: VapiAssistantPayload["voice"] = {
    provider: voiceProvider,
    voiceId,
  };
  if (voiceProvider === "11labs") {
    const settings = await fetchElevenLabsVoiceSettings(voiceId);
    const s = settings ?? ELEVENLABS_VOICE_DEFAULTS;
    voicePayload.speed = s.speed;
    // VAPI only accepts provider, voiceId, speed for 11labs; stability/similarity_boost/modelId are rejected
  }

  const payload: VapiAssistantPayload = {
    name,
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemContent }],
    },
    voice: voicePayload,
    firstMessage: "Hi, good day!",
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en",
    },
    maxDurationSeconds: 600, // 10 min (was 180 = 3 min; increase if you need longer calls)
    silenceTimeoutSeconds: 30,
    responseDelaySeconds: 0.5,
    endCallPhrases: [
      "Goodbye",
      "Bye",
      "Bye bye",
      "Cheers",
      "Cheers bye",
      "Take care",
      "Take care bye",
      "Thanks bye",
      "Thanks for your time. Goodbye.",
      "No problem. Goodbye.",
      "Okay bye",
      "Right, goodbye",
      "Have a good one",
      "Have a good day",
      "Stay well",
      "Laters",
      "Catch you later",
      "Talk later",
      "Bye for now",
      "Sharp",
      "Sharp sharp",
      "Shot",
      "Lekker, bye",
      "Good one",
    ],
  };

  if (webhookUrl) {
    payload.server = { url: webhookUrl };
    payload.serverMessages = ["end-of-call-report"];
    // VAPI docs: use recordingEnabled so end-of-call-report includes artifact.recording URL
    payload.artifactPlan = { recordingEnabled: true };
  } else if (forWebTest) {
    // Explicitly clear server so PATCH doesn't leave an old URL (which causes daily-error on web).
    (payload as Record<string, unknown>).server = null;
    (payload as Record<string, unknown>).serverMessages = null;
    (payload as Record<string, unknown>).artifactPlan = null;
  }
  if (project.structuredOutputId?.trim() && !forWebTest) {
    payload.artifactPlan = {
      ...(payload.artifactPlan ?? {}),
      structuredOutputIds: [project.structuredOutputId.trim()],
    };
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
export async function createAssistant(
  project: ProjectForVapi,
  options?: { forWebTest?: boolean }
): Promise<string> {
  const payload = await buildAssistantConfig(project, options);
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
  project: ProjectForVapi,
  options?: { forWebTest?: boolean }
): Promise<void> {
  const payload = await buildAssistantConfig(project, options);
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
 * If project.assistantId is set (and not using overrideAssistantId), PATCH that assistant; otherwise POST a new one.
 * Returns the assistant id (existing or newly created).
 *
 * Options:
 * - forWebTest: build config without server URL so browser test calls don't drop (VAPI can't reach localhost).
 * - overrideAssistantId: use this id for update instead of project.assistantId (e.g. test assistant).
 */
export async function createOrUpdateAssistant(
  project: ProjectForVapi,
  options?: { forWebTest?: boolean; overrideAssistantId?: string }
): Promise<string> {
  const forWebTest = options?.forWebTest === true;
  const overrideId = options?.overrideAssistantId?.trim();

  if (overrideId) {
    await updateAssistant(overrideId, project, { forWebTest });
    return overrideId;
  }
  // When forWebTest, never update the main assistant (would remove server URL). Create a new test assistant instead.
  if (project.assistantId?.trim() && !forWebTest) {
    await updateAssistant(project.assistantId.trim(), project, { forWebTest });
    return project.assistantId.trim();
  }
  return createAssistant(project, { forWebTest });
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
    /** VAPI may return recording as string URL or as { url } */
    recording?: string | { url?: string | null } | null;
    structuredOutputs?: VapiStructuredOutputs | null;
  } | null;
};

/** Extract recording URL from VAPI artifact (handles recording as string or { url }). */
export function getRecordingUrl(
  recording: string | { url?: string | null } | null | undefined
): string | undefined {
  if (!recording) return undefined;
  if (typeof recording === "string" && recording.trim()) return recording.trim();
  const url = (recording as { url?: string | null }).url;
  return typeof url === "string" && url.trim() ? url.trim() : undefined;
}

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
