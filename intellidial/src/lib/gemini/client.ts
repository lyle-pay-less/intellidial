/**
 * Gemini API client for server-side only.
 * Used for Instructions tab: tone, goal, questions, field names, and agent script.
 * Set GEMINI_API_KEY in .env (from https://aistudio.google.com/apikey).
 */

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

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
