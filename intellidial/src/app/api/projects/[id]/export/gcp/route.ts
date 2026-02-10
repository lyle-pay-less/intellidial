import { NextRequest, NextResponse } from "next/server";
import { getProject, listContacts } from "@/lib/data/store";
import { getOrgFromRequest } from "../../../getOrgFromRequest";
import { getGCPIntegration } from "@/lib/data/store";
import { exportToGCPBucket } from "@/lib/gcp-storage/client";

export const dynamic = 'force-dynamic';

/**
 * POST: Export project results to GCP Cloud Storage bucket.
 * Body: { failedOnly?: boolean }
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

  // Get GCP integration
  const integration = await getGCPIntegration(org.orgId);
  if (!integration?.enabled || !integration.bucketName || !integration.serviceAccountKey) {
    return NextResponse.json(
      {
        error: "GCP integration is not configured. Set up your bucket and service account in Integrations.",
      },
      { status: 400 }
    );
  }

  let body: { failedOnly?: boolean } = {};
  try {
    body = (await req.json().catch(() => ({}))) as typeof body;
  } catch {
    // ignore
  }

  const { contacts } = await listContacts(projectId, { limit: 10000, offset: 0 });
  const filterFailed = Boolean(body.failedOnly);

  try {
    const { fileUrl, fileName } = await exportToGCPBucket(
      project,
      contacts,
      integration.bucketName,
      integration.serviceAccountKey,
      filterFailed
    );

    return NextResponse.json({ success: true, fileUrl, fileName });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed";
    console.error("[API] GCP export error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
