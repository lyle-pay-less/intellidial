/**
 * Gemini API client for server-side only.
 * Used for Instructions tab: tone, goal, questions, field names, and agent script.
 * Set GEMINI_API_KEY in .env (from https://aistudio.google.com/apikey).
 */

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
/** Model that supports URL context (fetch/read URLs). Used for generate-business-context. */
const urlContextModel = process.env.GEMINI_URL_CONTEXT_MODEL ?? "gemini-2.5-flash";

function getClient() {
  if (!apiKey?.trim()) return null;
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

export function isGeminiConfigured(): boolean {
  return !!apiKey?.trim();
}

/**
 * Generate text from a single prompt. Returns null if Gemini is not configured or request fails.
 */
export async function generateText(prompt: string): Promise<string | null> {
  const ai = getClient();
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    const text = (response as { text?: string })?.text;
    return typeof text === "string" ? text.trim() : null;
  } catch (e) {
    console.warn("[Gemini] generateText failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

export type GenerateTextFromUrlResult =
  | { ok: true; text: string }
  | { ok: false; error: string; code: "API_KEY_INVALID" }
  | { ok: false; error: string; code?: string };

/**
 * Generate text using Gemini's URL context tool: the model fetches and reads the URL itself.
 * Use for "generate business context from URL". Requires a model that supports URL context
 * (e.g. gemini-2.5-flash). Returns result with ok/text or ok/error/code.
 */
export async function generateTextFromUrl(
  url: string,
  instruction: string
): Promise<GenerateTextFromUrlResult> {
  const ai = getClient();
  if (!ai) return { ok: false, error: "Gemini is not configured.", code: "API_KEY_INVALID" };
  const prompt = `${instruction}\n\nURL to read: ${url}`;
  try {
    const response = await ai.models.generateContent({
      model: urlContextModel,
      contents: prompt,
      config: {
        tools: [{ urlContext: {} }],
      },
    });
    const text = (response as { text?: string })?.text;
    if (typeof text === "string" && text.trim()) {
      return { ok: true, text: text.trim() };
    }
    return { ok: false, error: "No content generated." };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const str =
      typeof e === "object" && e
        ? JSON.stringify(e).concat(raw)
        : raw;
    const is403 =
      raw.includes("403") ||
      raw.includes("PERMISSION_DENIED") ||
      str.includes("leaked") ||
      str.includes("API key") ||
      str.includes("api key");
    console.warn("[Gemini] generateTextFromUrl failed:", raw);
    if (is403) {
      return {
        ok: false,
        error: "Your Gemini API key was revoked or is invalid (e.g. reported as leaked). Create a new key and set GEMINI_API_KEY.",
        code: "API_KEY_INVALID",
      };
    }
    return { ok: false, error: raw || "Request failed." };
  }
}

export type ExtractFullTextFromHtmlResult =
  | { ok: true; text: string }
  | { ok: false; error: string; code?: "API_KEY_INVALID" };

const VEHICLE_LISTING_URL_INSTRUCTION = `You will fetch and read a vehicle listing page (e.g. AutoTrader, Cars.co.za, or a dealer site).

Output the complete text content of the page. Preserve every piece of information. You MUST include:
- Make, model, year, variant
- Price and any pricing notes
- Mileage, fuel type, transmission
- Full description and seller notes
- ALL specification sections. Do not skip or summarise any of these:
  - General (e.g. body type, doors, seats)
  - Engine (e.g. capacity, power, torque, fuel type)
  - Handling (e.g. front tyres, rear tyres, power steering, stability control, traction control, cruise control, lane departure)
  - Safety (e.g. airbag quantity, ABS, brake assist, any safety features listed)
  - Comfort, Technology, and any other spec categories on the page
- Any disclaimers, contact details, or other text on the listing

Do not summarise or omit anything. The output will be used by a phone agent to answer questions about handling, safety, specs, and everything else. Output only the extracted text, no headings or labels.`;

/** Strip tracking/analytics query params from listing URLs so Gemini gets a cleaner request. */
function cleanListingUrl(url: string): string {
  try {
    const u = new URL(url);
    const trackingParams = ["vf", "db", "s360", "so", "pl", "pr", "po", "pq", "sp", "utm_source", "utm_medium", "utm_campaign", "fbclid", "gclid"];
    for (const p of trackingParams) u.searchParams.delete(p);
    return u.toString();
  } catch {
    return url;
  }
}

/** Single attempt at Gemini URL context extraction. */
async function attemptUrlContextExtraction(
  ai: GoogleGenAI,
  url: string
): Promise<ExtractFullTextFromHtmlResult> {
  const prompt = `${VEHICLE_LISTING_URL_INSTRUCTION}\n\nURL to read: ${url}`;
  const response = await ai.models.generateContent({
    model: urlContextModel,
    contents: prompt,
    config: {
      tools: [{ urlContext: {} }],
      maxOutputTokens: 32768,
    },
  });
  const text = (response as { text?: string })?.text;
  if (typeof text === "string" && text.trim()) {
    return { ok: true, text: text.trim() };
  }
  const raw = JSON.stringify(response).slice(0, 500);
  console.warn("[Gemini] urlContext returned empty. Raw response shape:", raw);
  return { ok: false, error: "No content generated from URL." };
}

/**
 * Extract full vehicle listing context directly from a URL using Gemini's urlContext tool.
 * Gemini fetches and reads the page itself -- no browser needed.
 * Retries once on empty response (transient failures are common). Cleans tracking params from the URL.
 */
export async function extractVehicleContextFromUrl(url: string): Promise<ExtractFullTextFromHtmlResult> {
  const ai = getClient();
  if (!ai) return { ok: false, error: "Gemini is not configured.", code: "API_KEY_INVALID" };
  const cleanUrl = cleanListingUrl(url);
  const MAX_ATTEMPTS = 2;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await attemptUrlContextExtraction(ai, cleanUrl);
      if (result.ok) return result;
      if (attempt < MAX_ATTEMPTS) {
        console.log("[Gemini] urlContext attempt %d empty — retrying", attempt);
        continue;
      }
      return result;
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      const str = typeof e === "object" && e ? JSON.stringify(e).concat(raw) : raw;
      const is403 =
        raw.includes("403") ||
        raw.includes("PERMISSION_DENIED") ||
        str.includes("leaked") ||
        str.includes("API key") ||
        str.includes("api key");
      console.warn("[Gemini] extractVehicleContextFromUrl attempt %d failed: %s", attempt, raw);
      if (is403) {
        return {
          ok: false,
          error: "Your Gemini API key was revoked or is invalid. Create a new key and set GEMINI_API_KEY.",
          code: "API_KEY_INVALID",
        };
      }
      if (attempt >= MAX_ATTEMPTS) {
        return { ok: false, error: raw || "Request failed." };
      }
    }
  }
  return { ok: false, error: "All URL context attempts failed." };
}

const VEHICLE_LISTING_FULL_TEXT_INSTRUCTION = `You are given the HTML of a vehicle listing page (e.g. AutoTrader, Cars.co.za, or a dealer site).

Output the complete text content of this page. Preserve every piece of information. You MUST include:
- Make, model, year, variant
- Price and any pricing notes
- Mileage, fuel type, transmission
- Full description and seller notes
- ALL specification sections. Do not skip or summarise any of these:
  - General (e.g. body type, doors, seats)
  - Engine (e.g. capacity, power, torque, fuel type)
  - Handling (e.g. front tyres, rear tyres, power steering, stability control, traction control, cruise control, lane departure)
  - Safety (e.g. airbag quantity, ABS, brake assist, any safety features listed)
  - Comfort, Technology, and any other spec categories on the page
- Any disclaimers, contact details, or other text on the listing

Do not summarise or omit anything. The output will be used by a phone agent to answer questions about handling, safety, specs, and everything else. Output only the extracted text, no headings or labels.`;

/**
 * Extract full text from vehicle listing HTML using Gemini. No summarisation — agent gets full context.
 */
export async function extractFullTextFromHtml(html: string): Promise<ExtractFullTextFromHtmlResult> {
  const ai = getClient();
  if (!ai) return { ok: false, error: "Gemini is not configured.", code: "API_KEY_INVALID" };
  // Truncate very large HTML to stay within model context (e.g. 500k chars ~= ~125k tokens)
  const maxChars = 450_000;
  const content = html.length > maxChars ? html.slice(0, maxChars) + "\n\n[... content truncated ...]" : html;
  const prompt = `${VEHICLE_LISTING_FULL_TEXT_INSTRUCTION}\n\n--- HTML ---\n${content}`;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        // Default is 8192; long listings (all specs) can exceed that and get cut off — Handling/Safety often at end
        maxOutputTokens: 32768,
      },
    });
    const text = (response as { text?: string })?.text;
    if (typeof text === "string" && text.trim()) {
      return { ok: true, text: text.trim() };
    }
    return { ok: false, error: "No content generated." };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const str = typeof e === "object" && e ? JSON.stringify(e).concat(raw) : raw;
    const is403 =
      raw.includes("403") ||
      raw.includes("PERMISSION_DENIED") ||
      str.includes("leaked") ||
      str.includes("API key") ||
      str.includes("api key");
    console.warn("[Gemini] extractFullTextFromHtml failed:", raw);
    if (is403) {
      return {
        ok: false,
        error: "Your Gemini API key was revoked or is invalid. Create a new key and set GEMINI_API_KEY.",
        code: "API_KEY_INVALID",
      };
    }
    return { ok: false, error: raw || "Request failed." };
  }
}
