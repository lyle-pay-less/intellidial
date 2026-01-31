import { NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/data/store";

export async function GET() {
  const projects = listProjects();
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = body?.name as string;
  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }
  const project = createProject({
    name: name.trim(),
    description: body?.description?.trim() || undefined,
  });
  return NextResponse.json(project);
}
