/**
 * Google Sheets export via Service Account.
 * Set GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON in .env (stringified JSON from GCP Console).
 * User must share their Google Sheet with the service account email (Editor).
 */

import { google } from "googleapis";
import type { JWT } from "google-auth-library";
import type { ProjectDoc, ContactDoc } from "@/lib/firebase/types";

type ContactWithId = ContactDoc & { id: string };

const SHEET_NAME = "Sheet1";

let cachedClient: JWT | null = null;

function getServiceAccountJson(): Record<string, unknown> | null {
  const raw = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON;
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw.trim()) as Record<string, unknown>;
    if (parsed.client_email && parsed.private_key) return parsed;
  } catch {
    // ignore
  }
  return null;
}

/** Returns JWT client for Sheets API, or null if not configured. */
export function getSheetsClient(): JWT | null {
  if (cachedClient) return cachedClient;
  const cred = getServiceAccountJson();
  if (!cred) return null;
  cachedClient = new google.auth.JWT({
    email: cred.client_email as string,
    key: (cred.private_key as string)?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return cachedClient;
}

/** Service account email (for "share this sheet with" instructions). */
export function getServiceAccountEmail(): string | null {
  const cred = getServiceAccountJson();
  return (cred?.client_email as string) ?? null;
}

export function isGoogleSheetsConfigured(): boolean {
  return getSheetsClient() !== null;
}

/** Extract spreadsheet ID from URL or return as-is if already an ID. */
export function parseSpreadsheetId(input: string): string | null {
  const s = input?.trim();
  if (!s) return null;
  const match = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9-_]+$/.test(s)) return s;
  return null;
}

/** Build export rows (same columns as CSV): headers + one row per contact (latest call). */
function buildExportRows(
  project: ProjectDoc & { id: string },
  contacts: ContactWithId[],
  filterFailed: boolean
): string[][] {
  const captureLabels = project.captureFields?.map((f) => f.label) ?? [];
  const headers = [
    "Phone",
    "Name",
    "Status",
    "Duration (s)",
    "Date",
    ...captureLabels,
    "Transcript",
    "Recording",
  ];
  const list = filterFailed
    ? contacts.filter((c) => c.status === "failed")
    : contacts;
  const rows = list.map((c) => {
    const call = c.callResult;
    const date = call?.attemptedAt
      ? new Date(call.attemptedAt).toISOString().slice(0, 10)
      : "";
    const duration = call?.durationSeconds ?? "";
    const captureVals =
      project.captureFields?.map((f) => String(call?.capturedData?.[f.key] ?? "")) ?? [];
    const row: string[] = [
      c.phone,
      c.name ?? "",
      c.status,
      String(duration),
      date,
      ...captureVals,
      call?.transcript ?? "",
      call?.recordingUrl ?? "",
    ];
    return row;
  });
  return [headers, ...rows];
}

/**
 * Write project export data to a Google Sheet (overwrites Sheet1).
 * Returns spreadsheet URL on success.
 */
export async function writeProjectToSheet(
  project: ProjectDoc & { id: string },
  contacts: ContactWithId[],
  spreadsheetId: string,
  filterFailed = false
): Promise<{ spreadsheetUrl: string }> {
  const auth = getSheetsClient();
  if (!auth) throw new Error("Google Sheets is not configured (missing GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON).");
  const sheets = google.sheets({ version: "v4", auth });
  const rows = buildExportRows(project, contacts, filterFailed);
  const range = `${SHEET_NAME}!A1:ZZ${Math.max(rows.length, 1)}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });
  return {
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}
