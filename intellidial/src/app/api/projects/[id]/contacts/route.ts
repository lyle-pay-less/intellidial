import { NextResponse } from "next/server";
import { listContacts, createContacts } from "@/lib/data/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10))
  );
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));
  const status = searchParams.get("status") as "all" | "pending" | "success" | "failed" | "calling" | null;
  const statusFilter = status && ["all", "pending", "success", "failed", "calling"].includes(status) ? status : undefined;

  const { contacts: contactList, total } = listContacts(id, { limit, offset, status: statusFilter });
  return NextResponse.json({ contacts: contactList, total, limit, offset });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const items = body?.contacts as Array<{ phone: string; name?: string }>;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "contacts array is required" },
      { status: 400 }
    );
  }

  const created = createContacts(id, items);
  return NextResponse.json({ created: created.length, contacts: created });
}
