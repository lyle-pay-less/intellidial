import { NextRequest, NextResponse } from "next/server";
import {
  getProject,
  getProjectStats,
  getProjectCallsByDayForChart,
  getProjectMinutesByDayForChart,
} from "@/lib/data/store";
import { getOrgFromRequest } from "../../getOrgFromRequest";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getOrgFromRequest(req);
  if (!org) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing project id" }, { status: 400 });
  }
  const project = await getProject(id, org.orgId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const stats = getProjectStats(id);
  const callsByDay = getProjectCallsByDayForChart(id);
  const minutesByDay = getProjectMinutesByDayForChart(id);
  return NextResponse.json({
    ...stats,
    callsByDay,
    minutesByDay,
  });
}
