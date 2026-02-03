import { NextRequest, NextResponse } from "next/server";
import {
  getDashboardStats,
  getCallsByDayForChart,
  getMinutesByDayForChart,
  getDataPointRetrievalStats,
  getUserOrganization,
  getOrganization,
  ensureDemoDataForOrg,
} from "@/lib/data/store";

/** Simulate previous period for deltas (WoW ~85%, MoM ~70% of current) */
function getPreviousStats(
  stats: ReturnType<typeof getDashboardStats>,
  period: "wow" | "mom"
): ReturnType<typeof getDashboardStats> {
  const factor = period === "wow" ? 0.85 : 0.7;
  return {
    contactsUploaded: Math.max(0, Math.round(stats.contactsUploaded * factor)),
    callsMade: Math.max(0, Math.round(stats.callsMade * factor)),
    successfulCalls: Math.max(0, Math.round(stats.successfulCalls * factor)),
    unsuccessfulCalls: Math.max(0, Math.round(stats.unsuccessfulCalls * factor)),
    hoursOnCalls: Math.round(stats.hoursOnCalls * factor * 100) / 100,
    successRate:
      stats.successRate > 0
        ? Math.max(0, Math.min(100, Math.round(stats.successRate * (0.9 + Math.random() * 0.2))))
        : 0,
  };
}

function calcDelta(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }
  const orgId = await getUserOrganization(userId);
  if (!orgId) {
    return NextResponse.json({
      contactsUploaded: 0,
      callsMade: 0,
      successfulCalls: 0,
      unsuccessfulCalls: 0,
      hoursOnCalls: 0,
      successRate: 0,
      usage: { callsUsed: 0, callsLimit: null, minutesUsed: 0, minutesLimit: null },
      callsByDay: [],
      minutesByDay: [],
      dataRetrievalRate: 0,
      dataRetrievalWithData: 0,
      dataRetrievalSuccessfulTotal: 0,
      period: "all",
      previous: null,
      deltas: null,
    });
  }
  await ensureDemoDataForOrg(orgId);

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") ?? "all") as "all" | "wow" | "mom";

  const org = await getOrganization(orgId);
  const usage = org
    ? {
        callsUsed: org.callsUsed ?? 0,
        callsLimit: org.callsLimit ?? null,
        minutesUsed: org.minutesUsed ?? 0,
        minutesLimit: org.minutesLimit ?? null,
      }
    : { callsUsed: 0, callsLimit: null, minutesUsed: 0, minutesLimit: null };

  const stats = getDashboardStats(orgId);
  const callsByDay = getCallsByDayForChart(orgId);
  const minutesByDay = getMinutesByDayForChart(orgId);
  const dataRetrieval = getDataPointRetrievalStats(orgId);

  const previous =
    period !== "all" ? getPreviousStats(stats, period) : null;
  const deltas =
    previous && period !== "all"
      ? {
          contactsUploaded: calcDelta(stats.contactsUploaded, previous.contactsUploaded),
          callsMade: calcDelta(stats.callsMade, previous.callsMade),
          successfulCalls: calcDelta(stats.successfulCalls, previous.successfulCalls),
          unsuccessfulCalls: calcDelta(stats.unsuccessfulCalls, previous.unsuccessfulCalls),
          hoursOnCalls: calcDelta(stats.hoursOnCalls * 100, previous.hoursOnCalls * 100),
          successRate: calcDelta(stats.successRate, previous.successRate),
        }
      : null;

  return NextResponse.json({
    ...stats,
    usage,
    callsByDay,
    minutesByDay,
    dataRetrievalRate: dataRetrieval.rate,
    dataRetrievalWithData: dataRetrieval.withData,
    dataRetrievalSuccessfulTotal: dataRetrieval.successfulTotal,
    period,
    previous,
    deltas,
  });
}
