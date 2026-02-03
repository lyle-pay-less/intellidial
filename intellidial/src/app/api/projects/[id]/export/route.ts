import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/data/store";
import { getOrgFromRequest } from "../../getOrgFromRequest";

function buildCsv(
  project: Awaited<ReturnType<typeof getProject>>,
  contactList: Awaited<ReturnType<typeof import("@/lib/data/store").listContacts>>["contacts"],
  filterFailed = false
): string {
  if (!project) return "";

  const contacts = filterFailed
    ? contactList.filter((c) => c.status === "failed")
    : contactList;

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

  const escapeCsv = (val: string | number | null | undefined): string => {
    if (val == null) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = contacts.map((c) => {
    const date = c.callResult?.attemptedAt
      ? new Date(c.callResult.attemptedAt).toISOString().slice(0, 10)
      : "";
    const duration = c.callResult?.durationSeconds ?? "";
    const captureVals =
      project.captureFields?.map(
        (f) => c.callResult?.capturedData?.[f.key] ?? ""
      ) ?? [];
    const transcript = c.callResult?.transcript ?? "";
    const recording = c.callResult?.recordingUrl ?? "";
    return [
      c.phone,
      c.name ?? "",
      c.status,
      duration,
      date,
      ...captureVals,
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
  const { contacts } = listContacts(id, { limit: 10000, offset: 0 });

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
