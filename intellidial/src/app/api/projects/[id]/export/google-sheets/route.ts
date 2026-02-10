import { NextRequest, NextResponse } from "next/server";
import { getProject, listContacts, updateProject } from "@/lib/data/store";
import { getOrgFromRequest } from "../../../getOrgFromRequest";
import {
  isGoogleSheetsConfigured,
  getServiceAccountEmail,
  parseSpreadsheetId,
  writeProjectToSheet,
} from "@/lib/google-sheets/client";

/**
 * GET: Return whether Google Sheets is configured and the service account email (for sharing).
 * Requires auth (same as project access).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getOrgFromRequest(_req);
  if (!org) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }
  const { id } = await params;
  const project = await getProject(id, org.orgId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const configured = isGoogleSheetsConfigured();
  const serviceAccountEmail = getServiceAccountEmail();
  return NextResponse.json({
    configured,
    serviceAccountEmail: serviceAccountEmail ?? undefined,
  });
}

/**
 * POST: Export project results to a Google Sheet.
 * Body: { spreadsheetUrl?: string, spreadsheetId?: string, saveAsDefault?: boolean, failedOnly?: boolean }
 * Uses project.googleSheetId if no spreadsheetUrl/spreadsheetId in body.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }
  const { id: projectId } = await params;
  const project = await getProject(projectId, org.orgId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (!isGoogleSheetsConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google Sheets is not configured. Add GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON to server environment.",
      },
      { status: 503 }
    );
  }

  let body: {
    spreadsheetUrl?: string;
    spreadsheetId?: string;
    saveAsDefault?: boolean;
    failedOnly?: boolean;
  } = {};
  try {
    body = (await req.json().catch(() => ({}))) as typeof body;
  } catch {
    // ignore
  }

  let spreadsheetId: string | null =
    body.spreadsheetId?.trim() ?? null;
  if (!spreadsheetId && body.spreadsheetUrl?.trim()) {
    spreadsheetId = parseSpreadsheetId(body.spreadsheetUrl);
  }
  if (!spreadsheetId && project.googleSheetId?.trim()) {
    spreadsheetId = project.googleSheetId.trim();
  }
  if (!spreadsheetId) {
    return NextResponse.json(
      {
        error:
          "No sheet specified. Paste a Google Sheet URL or link a sheet in this project first.",
      },
      { status: 400 }
    );
  }

  const { contacts } = await listContacts(projectId, { limit: 10000, offset: 0 });
  const filterFailed = Boolean(body.failedOnly);

  try {
    const { spreadsheetUrl } = await writeProjectToSheet(
      project,
      contacts,
      spreadsheetId,
      filterFailed
    );

    if (body.saveAsDefault) {
      await updateProject(projectId, { googleSheetId: spreadsheetId });
    }

    return NextResponse.json({ success: true, spreadsheetUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed";
    if (message.includes("403") || message.includes("permission")) {
      return NextResponse.json(
        {
          error:
            "Access denied. Share the Google Sheet with the service account email (see Export tab) as Editor.",
        },
        { status: 403 }
      );
    }
    console.error("[API] Google Sheets export error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
