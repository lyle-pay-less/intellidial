import { NextResponse } from "next/server";
import { getProjectQueue, setProjectQueue } from "@/lib/data/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing project id" }, { status: 400 });
  }
  const contactIds = getProjectQueue(id);
  return NextResponse.json({ contactIds });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing project id" }, { status: 400 });
  }
  const body = await request.json();
  const contactIds = body?.contactIds as string[] | undefined;
  const add = body?.add !== false;
  if (!Array.isArray(contactIds)) {
    return NextResponse.json(
      { error: "contactIds array is required" },
      { status: 400 }
    );
  }
  setProjectQueue(id, contactIds, add);
  const updated = getProjectQueue(id);
  return NextResponse.json({ contactIds: updated });
}
