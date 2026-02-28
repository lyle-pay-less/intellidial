import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/data/store";
import { getOrgFromRequest } from "../../getOrgFromRequest";
import { extractFullTextFromHtml, isGeminiConfigured } from "@/lib/gemini/client";
import { fetchVehicleListingHtml } from "@/lib/vehicle-listing/fetch-html";

/**
 * POST /api/projects/[id]/refresh-vehicle-context
 * Fetches the vehicle listing URL (from body or project), extracts full text via Gemini,
 * and saves to project. Optional body: { url?: string }. If url is sent, use it even before
 * the project is saved; then we persist it on the project along with the extracted context.
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

  let body: { url?: string } = {};
  try {
    const raw = (await req.json()) as { url?: string } | null;
    if (raw && typeof raw === "object") body = raw;
  } catch {
    // No body is fine — use project.vehicleListingUrl
  }

  const urlFromBody = typeof body.url === "string" ? body.url.trim() : "";
  const urlFromProject = project.vehicleListingUrl?.trim() ?? "";
  const url = urlFromBody || urlFromProject;

  if (!url) {
    return NextResponse.json(
      { error: "Enter a vehicle listing URL above and try again, or save the project first." },
      { status: 400 }
    );
  }

  const normalizedUrl =
    url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Gemini is not configured. Set GEMINI_API_KEY." },
      { status: 503 }
    );
  }

  // 1. Fetch full HTML (Playwright, then fallback to fetch)
  const fetchResult = await fetchVehicleListingHtml(normalizedUrl);
  if (!fetchResult.ok) {
    return NextResponse.json(
      { error: `Could not load page: ${fetchResult.error}` },
      { status: 502 }
    );
  }

  // 2. Extract full text from HTML via Gemini (no summarisation)
  const extractResult = await extractFullTextFromHtml(fetchResult.html);
  if (!extractResult.ok) {
    const status = extractResult.code === "API_KEY_INVALID" ? 503 : 500;
    return NextResponse.json(
      { error: extractResult.error },
      { status }
    );
  }

  // Diagnostic: log lengths and whether Handling/Safety made it into the extraction
  const text = extractResult.text;
  const hasHandling =
    /\bhandling\b/i.test(text) ||
    /\bpower steering\b/i.test(text) ||
    /\bstability control\b/i.test(text) ||
    /\btraction control\b/i.test(text);
  const hasSafety =
    /\bsafety\b/i.test(text) ||
    /\bairbag\b/i.test(text) ||
    /\bABS\b/i.test(text);
  console.log(
    "[refresh-vehicle-context]",
    "htmlChars=" + fetchResult.html.length,
    "extractedChars=" + text.length,
    "hasHandling=" + hasHandling,
    "hasSafety=" + hasSafety
  );

  const now = new Date().toISOString();
  await updateProject(projectId, {
    vehicleContextFullText: extractResult.text,
    vehicleContextUpdatedAt: now,
    ...(urlFromBody ? { dealershipEnabled: true, vehicleListingUrl: normalizedUrl } : {}),
  });

  return NextResponse.json({
    ok: true,
    vehicleContextFullText: extractResult.text,
    vehicleContextUpdatedAt: now,
    _diagnostic: { extractedChars: text.length, hasHandling, hasSafety },
  });
}
