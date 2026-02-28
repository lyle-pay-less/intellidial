import { NextRequest, NextResponse } from "next/server";
import { listDealers, createDealer, updateDealer, createProject } from "@/lib/data/store";
import { getOrgFromRequest } from "../projects/getOrgFromRequest";

export async function GET(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }
  const dealersList = await listDealers(org.orgId);
  return NextResponse.json(dealersList);
}

export async function POST(req: NextRequest) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }
  const body = (await req.json()) as Record<string, unknown> | null;
  const name = body?.name as string;
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const address = typeof body?.address === "string" ? body.address.trim() || null : null;
  const phoneNumber = typeof body?.phoneNumber === "string" ? body.phoneNumber.trim() || null : null;
  const operationHours = typeof body?.operationHours === "string" ? body.operationHours.trim() || null : null;
  const email = typeof body?.email === "string" ? body.email.trim() || null : null;
  let contextLinks: Array<{ url: string; label?: string | null }> | null = null;
  if (Array.isArray(body?.contextLinks)) {
    contextLinks = body.contextLinks
      .map((l: unknown) => {
        if (l && typeof l === "object" && "url" in l && typeof (l as { url: unknown }).url === "string") {
          const obj = l as { url: string; label?: string | null };
          return { url: obj.url.trim(), label: typeof obj.label === "string" ? obj.label : null };
        }
        return null;
      })
      .filter((l): l is { url: string; label?: string | null } => l !== null && l.url !== "");
    if (contextLinks.length === 0) contextLinks = null;
  }
  const dealer = await createDealer({
    orgId: org.orgId,
    name: name.trim(),
    address,
    phoneNumber,
    operationHours,
    email,
    contextLinks,
  });
  const project = await createProject({
    name: dealer.name,
    orgId: org.orgId,
    dealerId: dealer.id,
  });
  await updateDealer(dealer.id, { projectId: project.id });
  return NextResponse.json({ ...dealer, projectId: project.id });
}
