import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/data/store";
import { getOrgFromRequest } from "../../getOrgFromRequest";
import { generateTextFromUrl, isGeminiConfigured } from "@/lib/gemini/client";

const BUSINESS_CONTEXT_INSTRUCTION = `You are helping to build context for an AI phone agent. Read the content at the URL below.

Extract and write a single, concise "business context" block that the agent will use to answer caller questions. Include:
- What the company does (1-3 sentences).
- Location / address or service area if mentioned.
- Operating hours: include them if they appear anywhere on the site (e.g. footer, contact page, opening times). If not found, do not add a meta sentence like "Operating hours are not explicitly mentioned"; either omit hours entirely or say briefly "Opening hours are not listed on our website" so the agent can answer in first person if asked.
- Contact person and contact details: any named contact, phone number(s), email, or "contact us" details. Include when present.
- Key products or services (brief list).
- Any other facts that help answer "What do you do?", "Where are you?", "When are you open?", "Who can I speak to?", or "How do I get in touch?"

Write in clear, neutral prose. Do not use bullet points in the final output unless listing services. Keep the total length under 400 words. Output only the business context text, no headings or labels.`;

/**
 * POST /api/projects/[id]/generate-business-context
 * Body: { url: string }
 * Uses Gemini (with URL context tool, e.g. gemini-2.5-flash) to read the URL and produce
 * a concise business context for the AI phone agent.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const auth = await getOrgFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await getProject(projectId, auth.orgId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Send { url: string }." },
      { status: 400 }
    );
  }

  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json(
      { error: "Missing or empty url. Send { url: string }." },
      { status: 400 }
    );
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return NextResponse.json(
      { error: "URL must start with http:// or https://" },
      { status: 400 }
    );
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Gemini is not configured. Set GEMINI_API_KEY." },
      { status: 503 }
    );
  }

  const result = await generateTextFromUrl(url, BUSINESS_CONTEXT_INSTRUCTION);
  if (!result.ok) {
    const status = result.code === "API_KEY_INVALID" ? 503 : 500;
    return NextResponse.json(
      { error: result.error },
      { status }
    );
  }

  return NextResponse.json({ businessContext: result.text });
}
