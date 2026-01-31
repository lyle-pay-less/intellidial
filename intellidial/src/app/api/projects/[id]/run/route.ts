import { NextResponse } from "next/server";
import { getProject, runProjectSimulation } from "@/lib/data/store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { updated } = runProjectSimulation(id);
  return NextResponse.json({ updated, status: "completed" });
}
