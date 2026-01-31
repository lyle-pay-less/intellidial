import { NextResponse } from "next/server";
import {
  getProjectStats,
  getProjectCallsByDayForChart,
  getProjectMinutesByDayForChart,
} from "@/lib/data/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing project id" }, { status: 400 });
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
