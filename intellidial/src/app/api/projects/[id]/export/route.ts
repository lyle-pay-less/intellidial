import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/data/store";
import { getOrgFromRequest } from "../../getOrgFromRequest";
import { isCallBooking, getWhyNotBooked } from "@/lib/utils/call-stats";

function sanitizeName(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  let s = raw.trim();
  const urlIdx = s.search(/https?:\/\//i);
  if (urlIdx > 0) s = s.slice(0, urlIdx).trim();
  const phoneIdx = s.search(/\b(?:phone|tel|cell)\s*[:=]/i);
  if (phoneIdx > 0) s = s.slice(0, phoneIdx).trim();
  return s.slice(0, 80).trim();
}

function buildCsv(
  project: Awaited<ReturnType<typeof getProject>>,
  contactList: Awaited<ReturnType<typeof import("@/lib/data/store").listContacts>>["contacts"],
  filterFailed = false
): string {
  if (!project) return "";

  const contacts = filterFailed
    ? contactList.filter((c) => c.status === "failed")
    : contactList;

  const headers = [
    "Phone",
    "Name",
    "Email",
    "Status",
    "Duration (s)",
    "Date",
    "Booked viewing/test drive",
    "Why testdrive not booked",
    "Transcript",
    "Recording",
  ];

  const escapeCsv = (val: string | number | null | undefined): string => {
    if (val == null) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = contacts.map((c) => {
    const call = c.callResult ?? c.callHistory?.at(-1);
    const date = call?.attemptedAt
      ? new Date(call.attemptedAt).toISOString().slice(0, 10)
      : "";
    const duration = call?.durationSeconds ?? "";
    const booked = isCallBooking(call?.capturedData);
    const whyNotBooked = getWhyNotBooked(call?.capturedData, project.captureFields);
    const transcript = call?.transcript ?? "";
    const recording = call?.recordingUrl ?? "";
    return [
      c.phone,
      sanitizeName(c.name),
      c.email ?? "",
      c.status,
      duration,
      date,
      booked ? "Yes" : "No",
      booked ? "" : whyNotBooked,
      transcript,
      recording,
    ]
      .map(escapeCsv)
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }
  const { id } = await params;
  const project = await getProject(id, org.orgId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { listContacts } = await import("@/lib/data/store");
  const { contacts } = await listContacts(id, { limit: 10000, offset: 0 });

  const { searchParams } = new URL(req.url);
  const failedOnly = searchParams.get("failed") === "true";
  const csv = buildCsv(project, contacts, failedOnly);
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });

  return new NextResponse(blob, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${(project.name || "export").replace(/[^a-z0-9.-]/gi, "_")}${failedOnly ? "_failed" : ""}.csv"`,
    },
  });
}
