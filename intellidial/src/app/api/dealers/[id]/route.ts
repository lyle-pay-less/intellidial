import { NextRequest, NextResponse } from "next/server";
import { getDealer, updateDealer, deleteDealer } from "@/lib/data/store";
import { getOrgFromRequest } from "../../projects/getOrgFromRequest";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }
  const { id } = await params;
  const dealer = await getDealer(id, org.orgId);
  if (!dealer) {
    return NextResponse.json({ error: "Dealer not found" }, { status: 404 });
  }
  return NextResponse.json(dealer);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }
  const { id } = await params;
  const dealer = await getDealer(id, org.orgId);
  if (!dealer) {
    return NextResponse.json({ error: "Dealer not found" }, { status: 404 });
  }
  const body = (await req.json()) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const updates: Record<string, unknown> = {};
  const keys = ["name", "address", "phoneNumber", "operationHours", "email", "addressPronunciationNotes", "contextLinks", "forwardingEmail"] as const;
  for (const key of keys) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  if (updates.name !== undefined && (typeof updates.name !== "string" || !(updates.name as string).trim())) {
    return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
  }
  if (updates.contextLinks !== undefined && !Array.isArray(updates.contextLinks)) {
    return NextResponse.json({ error: "contextLinks must be an array" }, { status: 400 });
  }
  if (Array.isArray(updates.contextLinks)) {
    updates.contextLinks = (updates.contextLinks as unknown[]).map((l: unknown) => {
      if (l && typeof l === "object" && "url" in l && typeof (l as { url: unknown }).url === "string") {
        const obj = l as { url: string; label?: string | null };
        return { url: obj.url.trim(), label: typeof obj.label === "string" ? obj.label : null };
      }
      return null;
    }).filter((l): l is { url: string; label?: string | null } => l !== null && (l as { url: string }).url !== "");
  }
  try {
    const updated = await updateDealer(id, updates as Parameters<typeof updateDealer>[1]);
    if (!updated) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[API] PATCH /api/dealers/[id] updateDealer failed:", e);
    const message = e instanceof Error ? e.message : "Failed to save dealer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deleteDealer(id, org.orgId);
  if (!ok) {
    return NextResponse.json({ error: "Dealer not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
