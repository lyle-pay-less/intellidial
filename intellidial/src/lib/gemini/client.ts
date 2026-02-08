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
