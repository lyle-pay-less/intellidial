# Assistant Dashboard - Performance Tracking & ROI

## Overview

A dedicated dashboard to track the Back Office Assistant's performance, measure ROI, and understand its impact on the system. This helps justify the investment and continuously improve the assistant.

**Purpose**: 
- Track all assistant activities
- Measure actual ROI vs predicted
- Understand what works and what doesn't
- Justify the feature to stakeholders
- Optimize assistant performance

---

## Dashboard Location

**New Tab**: "Assistant" in the main dashboard navigation
**Route**: `/dashboard/assistant`
**Access**: Available to all users (or premium feature)

---

## Key Metrics to Track

### 1. Activity Metrics
- **Total suggestions generated** (all time, this month, this week)
- **Suggestions by type** (success rate, missing data, best practice, etc.)
- **Acceptance rate** (% of suggestions accepted)
- **Rejection rate** (% rejected)
- **Average time to accept** (how quickly users act)

### 2. Impact Metrics
- **Success rate improvements** (before vs after)
- **Missing data reduction** (before vs after)
- **Total minutes saved** (calculated from improvements)
- **Projects improved** (how many projects got better)
- **Calls optimized** (total calls affected by improvements)

### 3. ROI Metrics
- **Predicted ROI** (what we expected)
- **Actual ROI** (what actually happened)
- **ROI accuracy** (predicted vs actual)
- **Cost per suggestion** (LLM costs)
- **Revenue/value generated** (if monetized)
- **Net ROI** (value - costs)

### 4. Performance Metrics
- **Detection accuracy** (false positive rate)
- **Suggestion quality** (acceptance rate by type)
- **User satisfaction** (if we add ratings)
- **Support ticket reduction** (if tracked)

---

## Dashboard Layout

### Top Section: Key KPIs

```
┌─────────────────────────────────────────────────────────┐
│  Assistant Performance Dashboard                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │  1,234   │  │   742    │  │   +15%   │  │  R12,450 ││
│  │Suggestions│  │ Accepted │  │Avg Impact│  │Value Gen ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │   60%    │  │  85%     │  │  R2,500  │  │  4.2x    ││
│  │Accept Rate│  │ROI Accur │  │Cost/Month│  │   ROI    ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
└─────────────────────────────────────────────────────────┘
```

### Middle Section: Charts & Trends

**Chart 1: Suggestions Over Time**
- Line chart showing suggestions generated per day/week/month
- Separate lines for accepted vs rejected
- Trend analysis

**Chart 2: Impact Distribution**
- Bar chart showing success rate improvements
- Grouped by suggestion type
- Shows which types have biggest impact

**Chart 3: ROI Accuracy**
- Scatter plot: Predicted ROI vs Actual ROI
- Shows how accurate predictions are
- Helps improve prediction model

**Chart 4: Acceptance Rate by Type**
- Bar chart showing acceptance rates
- Helps identify which suggestions users trust most

### Bottom Section: Detailed Tables

**Table 1: Recent Suggestions**
- List of recent suggestions with:
  - Project name
  - Type
  - Status (pending/accepted/rejected)
  - Predicted impact
  - Actual impact (if applied)
  - Date

**Table 2: Top Performing Suggestions**
- Suggestions with highest actual ROI
- What made them successful
- Patterns to replicate

**Table 3: Projects Improved**
- List of projects that accepted suggestions
- Before/after metrics
- Total value generated

---

## Data Model

### Assistant Activity Tracking

```typescript
type AssistantActivity = {
  id: string;
  orgId: string;
  projectId: string;
  projectName: string;
  
  // Activity type
  activityType: 
    | "suggestion_generated"
    | "suggestion_accepted"
    | "suggestion_rejected"
    | "instruction_reviewed"
    | "call_analyzed"
    | "chat_query";
  
  // Suggestion details (if applicable)
  suggestionId?: string;
  suggestionType?: "success_rate" | "missing_data" | "best_practice" | "tone" | "timing";
  
  // Metrics (before/after)
  metricsBefore?: {
    successRate: number;
    missingDataRate: number;
    callsMade: number;
  };
  metricsAfter?: {
    successRate: number;
    missingDataRate: number;
    callsMade: number;
  };
  
  // ROI
  predictedROI?: {
    successRateImprovement: number;
    minutesSaved: number;
    estimatedValue: string;
  };
  actualROI?: {
    successRateChange: number;
    minutesSaved: number;
    actualValue: string;
  };
  
  // Costs
  cost?: {
    llmTokens: number;
    costInRands: number;
    minutesUsed: number; // if using call minutes model
  };
  
  // Timestamps
  createdAt: string;
  completedAt?: string;
  
  // Metadata
  metadata?: Record<string, any>;
};
```

### Aggregated Metrics

```typescript
type AssistantMetrics = {
  // Time period
  period: "all" | "month" | "week" | "day";
  startDate: string;
  endDate: string;
  
  // Activity counts
  totalSuggestions: number;
  suggestionsAccepted: number;
  suggestionsRejected: number;
  suggestionsPending: number;
  
  // Acceptance rates
  acceptanceRate: number; // %
  averageTimeToAccept: number; // hours
  
  // Impact
  totalSuccessRateImprovement: number; // average %
  totalMinutesSaved: number;
  projectsImproved: number;
  callsOptimized: number;
  
  // ROI
  totalPredictedValue: number; // Rands
  totalActualValue: number; // Rands
  totalCost: number; // Rands
  netROI: number; // Rands
  roiMultiplier: number; // e.g., 4.2x
  
  // Accuracy
  roiAccuracy: number; // % (how close predicted vs actual)
  detectionAccuracy: number; // % (false positive rate)
  
  // Breakdown by type
  byType: Record<string, {
    count: number;
    accepted: number;
    avgImpact: number;
    avgROI: number;
  }>;
};
```

---

## API Endpoints

### GET /api/assistant/metrics
```typescript
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "month";
  const orgId = await getUserOrganization(userId);
  
  const metrics = await getAssistantMetrics(orgId, period);
  return NextResponse.json(metrics);
}
```

### GET /api/assistant/activities
```typescript
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const activityType = searchParams.get("type");
  
  const activities = await getAssistantActivities(userId, { limit, type: activityType });
  return NextResponse.json({ activities });
}
```

### GET /api/assistant/suggestions
```typescript
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // pending, accepted, rejected
  
  const suggestions = await getAssistantSuggestions(userId, { status });
  return NextResponse.json({ suggestions });
}
```

---

## Tracking Implementation

### Track Every Action

```typescript
// services/assistant-tracker.ts

export async function trackSuggestionGenerated(
  orgId: string,
  projectId: string,
  suggestion: InstructionSuggestion
): Promise<void> {
  const activity: AssistantActivity = {
    id: generateId(),
    orgId,
    projectId,
    projectName: suggestion.projectName,
    activityType: "suggestion_generated",
    suggestionId: suggestion.id,
    suggestionType: suggestion.type,
    metricsBefore: {
      successRate: suggestion.currentMetrics.successRate,
      missingDataRate: suggestion.currentMetrics.missingDataRate,
      callsMade: getProjectStats(projectId).callsMade,
    },
    predictedROI: {
      successRateImprovement: suggestion.expectedImpact.successRateImprovement,
      minutesSaved: calculateMinutesSaved(suggestion),
      estimatedValue: suggestion.expectedImpact.estimatedROI,
    },
    cost: {
      llmTokens: estimateTokens(suggestion),
      costInRands: calculateCost(suggestion),
      minutesUsed: ASSISTANT_COSTS[suggestion.type] || 0,
    },
    createdAt: now(),
  };
  
  await saveAssistantActivity(activity);
}

export async function trackSuggestionAccepted(
  suggestionId: string,
  orgId: string
): Promise<void> {
  const suggestion = await getSuggestion(suggestionId);
  const activity = await getActivityBySuggestionId(suggestionId);
  
  // Update with acceptance
  await updateActivity(activity.id, {
    activityType: "suggestion_accepted",
    completedAt: now(),
  });
  
  // Schedule impact tracking (check after some calls)
  scheduleImpactTracking(suggestionId, 7); // Check after 7 days
}

export async function trackImpact(
  suggestionId: string
): Promise<void> {
  const suggestion = await getSuggestion(suggestionId);
  const activity = await getActivityBySuggestionId(suggestionId);
  const project = await getProject(suggestion.projectId);
  
  // Get before metrics (from activity)
  const metricsBefore = activity.metricsBefore!;
  
  // Get after metrics (current)
  const stats = getProjectStats(project.id);
  const metricsAfter = {
    successRate: stats.successRate,
    missingDataRate: calculateMissingDataRate(project),
    callsMade: stats.callsMade,
  };
  
  // Calculate actual ROI
  const actualROI = {
    successRateChange: metricsAfter.successRate - metricsBefore.successRate,
    minutesSaved: calculateActualMinutesSaved(metricsBefore, metricsAfter),
    actualValue: formatROI(metricsBefore, metricsAfter),
  };
  
  // Update activity
  await updateActivity(activity.id, {
    metricsAfter,
    actualROI,
  });
  
  // Update suggestion
  await updateSuggestion(suggestionId, {
    actualImpact: actualROI,
  });
}
```

---

## Dashboard UI Component

```tsx
// app/dashboard/assistant/page.tsx

export default function AssistantDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<AssistantMetrics | null>(null);
  const [activities, setActivities] = useState<AssistantActivity[]>([]);
  const [period, setPeriod] = useState<"all" | "month" | "week">("month");
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchData();
  }, [user?.uid, period]);
  
  const fetchData = async () => {
    if (!user?.uid) return;
    const headers = { "x-user-id": user.uid };
    
    const [metricsRes, activitiesRes] = await Promise.all([
      fetch(`/api/assistant/metrics?period=${period}`, { headers }),
      fetch(`/api/assistant/activities?limit=50`, { headers }),
    ]);
    
    if (metricsRes.ok) {
      const data = await metricsRes.json();
      setMetrics(data);
    }
    
    if (activitiesRes.ok) {
      const data = await activitiesRes.json();
      setActivities(data.activities);
    }
    
    setLoading(false);
  };
  
  if (loading) return <Loader />;
  if (!metrics) return <div>No data</div>;
  
  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Assistant Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Track performance and ROI of the Back Office Assistant
        </p>
      </div>
      
      {/* Period Selector */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setPeriod("week")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            period === "week" ? "bg-teal-600 text-white" : "bg-white text-slate-700 border"
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => setPeriod("month")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            period === "month" ? "bg-teal-600 text-white" : "bg-white text-slate-700 border"
          }`}
        >
          This Month
        </button>
        <button
          onClick={() => setPeriod("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            period === "all" ? "bg-teal-600 text-white" : "bg-white text-slate-700 border"
          }`}
        >
          All Time
        </button>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Suggestions Generated"
          value={metrics.totalSuggestions.toLocaleString()}
          icon={<Sparkles />}
        />
        <KpiCard
          label="Acceptance Rate"
          value={`${metrics.acceptanceRate.toFixed(1)}%`}
          icon={<CheckCircle />}
          trend={metrics.acceptanceRate > 60 ? "up" : "down"}
        />
        <KpiCard
          label="Avg Impact"
          value={`+${metrics.totalSuccessRateImprovement.toFixed(1)}%`}
          icon={<TrendingUp />}
        />
        <KpiCard
          label="Net ROI"
          value={`R${metrics.netROI.toLocaleString()}`}
          icon={<DollarSign />}
          subtitle={`${metrics.roiMultiplier.toFixed(1)}x return`}
        />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Suggestions Over Time">
          <SuggestionsChart data={activities} />
        </ChartCard>
        <ChartCard title="Impact by Type">
          <ImpactByTypeChart metrics={metrics} />
        </ChartCard>
        <ChartCard title="ROI Accuracy">
          <ROIAccuracyChart activities={activities} />
        </ChartCard>
        <ChartCard title="Acceptance Rate by Type">
          <AcceptanceByTypeChart metrics={metrics} />
        </ChartCard>
      </div>
      
      {/* Recent Activities Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
        </div>
        <ActivitiesTable activities={activities} />
      </div>
    </div>
  );
}
```

---

## Store Functions

```typescript
// lib/data/store.ts

const assistantActivities = new Map<string, AssistantActivity>();

export async function saveAssistantActivity(activity: AssistantActivity): Promise<void> {
  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminFirestore();
      await db.collection("assistant_activities").doc(activity.id).set(activity);
    } catch (error) {
      console.warn("[Store] Failed to save assistant activity:", error);
    }
  }
  
  assistantActivities.set(activity.id, activity);
}

export async function getAssistantMetrics(
  orgId: string,
  period: "all" | "month" | "week" | "day"
): Promise<AssistantMetrics> {
  const activities = Array.from(assistantActivities.values())
    .filter(a => a.orgId === orgId)
    .filter(a => filterByPeriod(a.createdAt, period));
  
  const suggestions = activities.filter(a => a.activityType === "suggestion_generated");
  const accepted = activities.filter(a => a.activityType === "suggestion_accepted");
  const rejected = activities.filter(a => a.activityType === "suggestion_rejected");
  
  const totalPredictedValue = suggestions
    .reduce((sum, a) => sum + (parseFloat(a.predictedROI?.estimatedValue?.replace(/[^0-9.]/g, "") || "0") || 0), 0);
  
  const totalActualValue = accepted
    .filter(a => a.actualROI)
    .reduce((sum, a) => sum + (parseFloat(a.actualROI?.actualValue?.replace(/[^0-9.]/g, "") || "0") || 0), 0);
  
  const totalCost = activities.reduce((sum, a) => sum + (a.cost?.costInRands || 0), 0);
  
  return {
    period,
    startDate: getPeriodStart(period),
    endDate: now(),
    totalSuggestions: suggestions.length,
    suggestionsAccepted: accepted.length,
    suggestionsRejected: rejected.length,
    suggestionsPending: suggestions.length - accepted.length - rejected.length,
    acceptanceRate: suggestions.length > 0 ? (accepted.length / suggestions.length) * 100 : 0,
    averageTimeToAccept: calculateAvgTimeToAccept(accepted),
    totalSuccessRateImprovement: calculateAvgSuccessRateImprovement(accepted),
    totalMinutesSaved: calculateTotalMinutesSaved(accepted),
    projectsImproved: new Set(accepted.map(a => a.projectId)).size,
    callsOptimized: calculateTotalCallsOptimized(accepted),
    totalPredictedValue,
    totalActualValue,
    totalCost,
    netROI: totalActualValue - totalCost,
    roiMultiplier: totalCost > 0 ? totalActualValue / totalCost : 0,
    roiAccuracy: calculateROIAccuracy(suggestions, accepted),
    detectionAccuracy: calculateDetectionAccuracy(suggestions),
    byType: groupByType(suggestions, accepted),
  };
}
```

---

## Integration Points

### 1. Track When Suggestions Generated
```typescript
// In suggestion generator
const suggestion = await generateSuggestion(...);
await saveSuggestion(suggestion);
await trackSuggestionGenerated(orgId, projectId, suggestion); // ← Add this
```

### 2. Track When Accepted
```typescript
// In accept endpoint
await acceptSuggestion(suggestionId);
await trackSuggestionAccepted(suggestionId, orgId); // ← Add this
```

### 3. Track Impact After Time
```typescript
// Scheduled job (run daily)
async function trackSuggestionImpacts() {
  const acceptedSuggestions = await getAcceptedSuggestions();
  for (const suggestion of acceptedSuggestions) {
    const daysSinceAcceptance = getDaysSince(suggestion.acceptedAt);
    if (daysSinceAcceptance >= 7 && !suggestion.actualImpact) {
      await trackImpact(suggestion.id);
    }
  }
}
```

### 4. Add to Navigation
```typescript
// dashboard/layout.tsx
const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "assistant", label: "Assistant", icon: Sparkles }, // ← Add this
  { id: "team", label: "Team", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
];
```

---

## Key Metrics Explained

### Acceptance Rate
**Formula**: `(Accepted Suggestions / Total Suggestions) × 100`
**Target**: 60%+
**Why**: Shows users trust the assistant's suggestions

### ROI Accuracy
**Formula**: `(Actual ROI / Predicted ROI) × 100`
**Target**: 80%+
**Why**: Shows predictions are reliable

### Net ROI
**Formula**: `Total Value Generated - Total Costs`
**Target**: Positive (ideally 3x+)
**Why**: Proves the feature pays for itself

### Detection Accuracy
**Formula**: `(True Positives / (True Positives + False Positives)) × 100`
**Target**: 90%+
**Why**: Shows we're detecting real issues, not noise

---

## Success Criteria

### Minimum Viable
- ✅ Track all suggestions generated
- ✅ Track acceptances/rejections
- ✅ Calculate basic ROI
- ✅ Show metrics dashboard

### Success Metrics
- Acceptance rate > 60%
- ROI accuracy > 80%
- Net ROI > 3x
- Detection accuracy > 90%

### Excellent Performance
- Acceptance rate > 70%
- ROI accuracy > 90%
- Net ROI > 5x
- Detection accuracy > 95%
- Support ticket reduction > 50%

---

## Next Steps

1. **Add tracking to existing code** - Track every suggestion generation/acceptance
2. **Create dashboard page** - Build UI component
3. **Add to navigation** - Make it accessible
4. **Set up scheduled jobs** - Track impact over time
5. **Add analytics** - Charts and visualizations
6. **Iterate** - Improve based on data

---

## Example Dashboard View

```
┌─────────────────────────────────────────────────────────┐
│  Assistant Dashboard                    [Week] [Month] [All]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │   1,234    │  │    60%     │  │   +15.2%   │       │
│  │Suggestions│  │Accept Rate │  │Avg Impact  │       │
│  └────────────┘  └────────────┘  └────────────┘       │
│                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │  R12,450   │  │   R2,500  │  │   4.2x    │       │
│  │Value Gen   │  │   Cost    │  │   ROI     │       │
│  └────────────┘  └────────────┘  └────────────┘       │
│                                                         │
│  [Charts showing trends, impact, ROI accuracy]        │
│                                                         │
│  Recent Activity:                                       │
│  - "Car Finance" suggestion accepted → +18% success    │
│  - "Market Research" suggestion rejected                │
│  - "Lead Gen" suggestion generated → pending           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

This dashboard will help you:
- **Justify the feature** - Show clear ROI
- **Improve the assistant** - See what works
- **Optimize costs** - Track expenses
- **Measure success** - Quantify impact
