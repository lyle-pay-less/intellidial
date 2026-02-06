# Self-Healing System - Proactive Optimization

## Overview

The self-healing system automatically detects issues, generates improvement suggestions, and presents them to users for one-click acceptance. This creates a **proactive optimization loop** that continuously improves call performance without manual intervention.

**Key Concept**: The system watches, learns, suggests, and improves automatically.

**Business Value**: 
- Reduces need for manual optimization
- Improves success rates automatically
- Creates high-value notifications (users see ROI)
- Can be monetized (premium feature or uses call minutes)
- Reduces support burden (system fixes itself)

**User Experience**: Users see suggestions appear automatically, review them on the instructions page, and accept with one click. No need to analyze results or figure out what's wrong - the system tells them.

---

## How It Works

### 1. Detection Phase
**System continuously monitors:**
- Call success rates
- Missing data points
- Call failure reasons
- Instruction quality
- User behavior patterns

**Triggers:**
- Success rate drops below threshold (e.g., < 50%)
- Missing data rate exceeds threshold (e.g., > 30%)
- New patterns detected (e.g., calls failing at specific point)
- Instruction changes needed based on industry best practices

### 2. Analysis Phase
**System analyzes:**
- Recent call results
- Transcripts and recordings
- Instruction content
- Industry benchmarks
- Historical performance

**Generates:**
- Root cause identification
- Specific improvement suggestions
- Expected ROI (e.g., "This will improve success rate by 15%")
- Priority level (high/medium/low)

### 3. Suggestion Phase
**System creates suggestions:**
- Specific instruction changes
- Question phrasing improvements
- Timing adjustments
- Tone/style modifications
- Missing best practices

**Formats as:**
- Before/after instruction text
- Highlighted changes
- Explanation of why
- Expected impact

### 4. Notification Phase
**Sends important notification:**
- Type: `instruction_suggestion`
- Priority: High (important notification)
- Includes: ROI estimate, impact prediction
- Links directly to instructions page

### 5. Acceptance Phase
**User sees suggestion:**
- On instructions page (inline)
- In notifications (with link)
- Can preview changes
- One-click accept/reject

### 6. Tracking Phase
**System tracks:**
- Which suggestions were accepted
- Actual vs predicted ROI
- Success rate improvements
- User feedback

**Learns from:**
- What works (accept more similar suggestions)
- What doesn't (refine detection/analysis)

---

## User Experience Flow

### Scenario 1: Low Success Rate Detected

```
1. System detects: "Car Finance Checker" has 30% success rate
2. Analysis: 40% fail with "no answer", 30% hang up early
3. Suggestion generated:
   - Change call window to 10am-3pm
   - Soften opening tone
   - Add name confirmation
4. Notification sent: "Improve your success rate by 20%"
5. User clicks notification → Goes to instructions page
6. Sees suggestion card with:
   - Current instruction (highlighted)
   - Suggested change (highlighted)
   - Expected impact: "+20% success rate"
   - [Accept] [Reject] [Preview] buttons
7. User clicks "Accept"
8. Instructions automatically updated
9. System tracks improvement
```

### Scenario 2: Missing Data Detected

```
1. System detects: "price" field missing in 60% of calls
2. Analysis: Agent asks about price but doesn't capture it properly
3. Suggestion generated:
   - Add explicit price capture instruction
   - Rephrase price question
   - Add validation step
4. Notification sent: "Capture 60% more price data"
5. User sees suggestion on instructions page
6. Preview shows: Before/after instruction comparison
7. User accepts → Instructions updated
8. Next calls capture price field
```

### Scenario 3: Proactive Best Practice

```
1. System detects: New project created
2. Analysis: Instructions missing best practices
3. Suggestion generated:
   - Add interrupt handling
   - Add name confirmation
   - Add natural conversation flow
4. Notification sent: "Optimize your new project"
5. User accepts → Better instructions from start
6. Higher success rate from day one
```

---

## Technical Implementation

### Data Model

```typescript
type InstructionSuggestion = {
  id: string;
  projectId: string;
  projectName: string;
  type: "success_rate" | "missing_data" | "best_practice" | "tone" | "timing";
  priority: "high" | "medium" | "low";
  
  // Current state
  currentInstruction: string;
  currentMetrics: {
    successRate: number;
    missingDataRate: number;
    failureReasons: Record<string, number>;
  };
  
  // Suggested changes
  suggestedChanges: Array<{
    section: string; // Which part of instructions
    current: string; // Current text
    suggested: string; // Suggested text
    reason: string; // Why this change
  }>;
  
  // Expected impact
  expectedImpact: {
    successRateImprovement: number; // e.g., +15%
    missingDataReduction: number; // e.g., -30%
    estimatedROI: string; // e.g., "Save 20 minutes per 100 calls"
  };
  
  // Status
  status: "pending" | "accepted" | "rejected" | "applied";
  createdAt: string;
  acceptedAt?: string;
  appliedAt?: string;
  
  // Tracking
  actualImpact?: {
    successRateChange: number;
    missingDataChange: number;
    actualROI: string;
  };
};
```

### API Endpoints

```typescript
// GET /api/projects/[id]/suggestions
// Get all suggestions for a project
export async function GET(req: NextRequest, { params }) {
  const suggestions = await getProjectSuggestions(projectId);
  return NextResponse.json({ suggestions });
}

// POST /api/projects/[id]/suggestions/[suggestionId]/accept
// Accept a suggestion
export async function POST(req: NextRequest, { params }) {
  const { suggestionId } = await params;
  await acceptSuggestion(suggestionId);
  await applySuggestionToInstructions(suggestionId);
  await createNotification({
    type: "suggestion_applied",
    message: "Suggestion applied successfully",
  });
  return NextResponse.json({ success: true });
}

// POST /api/projects/[id]/suggestions/[suggestionId]/reject
// Reject a suggestion
export async function POST(req: NextRequest, { params }) {
  await rejectSuggestion(suggestionId);
  // Learn from rejection (maybe user knows better)
  return NextResponse.json({ success: true });
}

// POST /api/projects/[id]/suggestions/generate
// Manually trigger suggestion generation
export async function POST(req: NextRequest, { params }) {
  const suggestions = await generateSuggestions(projectId);
  return NextResponse.json({ suggestions });
}
```

### Detection Service

```typescript
// services/issue-detector.ts

export async function detectIssues(projectId: string): Promise<InstructionSuggestion[]> {
  const project = await getProject(projectId);
  const contacts = await listContacts(projectId);
  const stats = getProjectStats(projectId);
  
  const suggestions: InstructionSuggestion[] = [];
  
  // Check success rate
  if (stats.successRate < 50) {
    const analysis = await analyzeLowSuccessRate(project, contacts);
    suggestions.push(await generateSuccessRateSuggestion(project, analysis));
  }
  
  // Check missing data
  const missingDataRate = calculateMissingDataRate(contacts, project.captureFields);
  if (missingDataRate > 30) {
    const analysis = await analyzeMissingData(project, contacts);
    suggestions.push(await generateMissingDataSuggestion(project, analysis));
  }
  
  // Check best practices
  const bestPracticeCheck = await checkBestPractices(project.agentInstructions);
  if (bestPracticeCheck.missing.length > 0) {
    suggestions.push(await generateBestPracticeSuggestion(project, bestPracticeCheck));
  }
  
  return suggestions;
}

async function analyzeLowSuccessRate(project, contacts) {
  const failedCalls = contacts.filter(c => c.status === "failed");
  const failureReasons = groupBy(failedCalls, c => c.callResult?.failureReason);
  
  return {
    failureReasons,
    commonPatterns: extractPatterns(failedCalls),
    timingAnalysis: analyzeCallTiming(failedCalls),
  };
}

async function generateSuccessRateSuggestion(project, analysis) {
  const prompt = `
    Analyze this project's low success rate and generate specific instruction improvements.
    
    Project: ${project.name}
    Current success rate: ${stats.successRate}%
    Failure reasons: ${JSON.stringify(analysis.failureReasons)}
    Instructions: ${project.agentInstructions}
    
    Generate:
    1. Specific instruction changes
    2. Expected improvement (+X%)
    3. ROI estimate
  `;
  
  const response = await gemini.generateText(prompt);
  return parseSuggestion(response);
}
```

### Suggestion Generation

```typescript
// services/suggestion-generator.ts

export async function generateSuggestion(
  project: Project,
  issueType: string,
  analysis: any
): Promise<InstructionSuggestion> {
  const prompt = `
    You are an expert at optimizing AI agent instructions for phone calls.
    
    Project: ${project.name}
    Industry: ${project.industry}
    Issue: ${issueType}
    Analysis: ${JSON.stringify(analysis)}
    
    Current Instructions:
    ${project.agentInstructions}
    
    Expected Data Points:
    ${project.captureFields.map(f => f.key).join(', ')}
    
    Recent Call Results:
    - Success rate: ${stats.successRate}%
    - Missing data: ${missingFields.join(', ')}
    - Failure reasons: ${failureReasons.join(', ')}
    
    Generate a specific suggestion with:
    1. Exact instruction changes (before/after)
    2. Expected impact (quantified)
    3. ROI estimate
    4. Priority level
    
    Format as JSON matching InstructionSuggestion type.
  `;
  
  const response = await gemini.generateText(prompt);
  const suggestion = JSON.parse(response);
  
  // Validate and enhance
  suggestion.projectId = project.id;
  suggestion.projectName = project.name;
  suggestion.status = "pending";
  suggestion.createdAt = now();
  
  return suggestion;
}
```

---

## UI Components

### Instructions Page Integration

```tsx
// components/InstructionSuggestions.tsx

export function InstructionSuggestions({ projectId }: { projectId: string }) {
  const [suggestions, setSuggestions] = useState<InstructionSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchSuggestions();
  }, [projectId]);
  
  const fetchSuggestions = async () => {
    const res = await fetch(`/api/projects/${projectId}/suggestions`);
    const data = await res.json();
    setSuggestions(data.suggestions.filter(s => s.status === "pending"));
    setLoading(false);
  };
  
  const handleAccept = async (suggestionId: string) => {
    await fetch(`/api/projects/${projectId}/suggestions/${suggestionId}/accept`, {
      method: "POST",
    });
    fetchSuggestions();
    // Refresh instructions
  };
  
  const handleReject = async (suggestionId: string) => {
    await fetch(`/api/projects/${projectId}/suggestions/${suggestionId}/reject`, {
      method: "POST",
    });
    fetchSuggestions();
  };
  
  if (loading) return <Loader />;
  if (suggestions.length === 0) return null;
  
  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          Optimization Suggestions
        </h3>
        <span className="rounded-full bg-blue-500 px-2 py-1 text-xs font-medium text-white">
          {suggestions.length} new
        </span>
      </div>
      
      {suggestions.map((suggestion) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          onAccept={() => handleAccept(suggestion.id)}
          onReject={() => handleReject(suggestion.id)}
        />
      ))}
    </div>
  );
}

function SuggestionCard({ suggestion, onAccept, onReject }) {
  return (
    <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-slate-900">{suggestion.type}</h4>
            {suggestion.priority === "high" && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                High Priority
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 mb-3">{suggestion.reason}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-emerald-600">
            {suggestion.expectedImpact.successRateImprovement > 0 && "+"}
            {suggestion.expectedImpact.successRateImprovement}%
          </div>
          <div className="text-xs text-slate-500">Success rate</div>
        </div>
      </div>
      
      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3">
          <div className="text-xs font-medium text-slate-500 mb-1">Current</div>
          <div className="text-sm text-slate-700 bg-red-50 p-2 rounded">
            {suggestion.currentInstruction}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-500 mb-1">Suggested</div>
          <div className="text-sm text-slate-700 bg-emerald-50 p-2 rounded">
            {suggestion.suggestedChanges[0].suggested}
          </div>
        </div>
      </div>
      
      <div className="mb-4 rounded-lg bg-white p-3 border border-slate-200">
        <div className="text-xs font-medium text-slate-700 mb-1">Expected Impact</div>
        <div className="text-sm text-slate-600">
          {suggestion.expectedImpact.estimatedROI}
        </div>
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={onAccept}
          className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Accept & Apply
        </button>
        <button
          onClick={onReject}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Reject
        </button>
        <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Preview
        </button>
      </div>
    </div>
  );
}
```

### Notification Integration

```typescript
// When suggestion is generated
await createNotification({
  orgId: project.orgId,
  userId: project.userId,
  type: "instruction_suggestion",
  title: `Optimize "${project.name}" - Improve success rate by ${suggestion.expectedImpact.successRateImprovement}%`,
  message: `${suggestion.suggestedChanges.length} improvements suggested. Expected ROI: ${suggestion.expectedImpact.estimatedROI}`,
  metadata: {
    projectId: project.id,
    projectName: project.name,
    suggestionId: suggestion.id,
    priority: suggestion.priority,
    expectedImpact: suggestion.expectedImpact,
  },
  priority: suggestion.priority === "high" ? "high" : "normal",
});
```

---

## ROI Tracking

### Calculate Expected ROI

```typescript
function calculateExpectedROI(suggestion: InstructionSuggestion, project: Project) {
  const currentSuccessRate = suggestion.currentMetrics.successRate;
  const expectedSuccessRate = currentSuccessRate + suggestion.expectedImpact.successRateImprovement;
  
  const currentCallsPer100 = 100;
  const currentSuccessfulCalls = currentCallsPer100 * (currentSuccessRate / 100);
  const expectedSuccessfulCalls = currentCallsPer100 * (expectedSuccessRate / 100);
  
  const improvement = expectedSuccessfulCalls - currentSuccessfulCalls;
  const minutesSaved = improvement * 3; // Average 3 minutes per successful call
  
  return {
    successRateImprovement: suggestion.expectedImpact.successRateImprovement,
    additionalSuccessfulCalls: improvement,
    minutesSaved: minutesSaved,
    estimatedROI: `Save ${minutesSaved} minutes per 100 calls`,
  };
}
```

### Track Actual ROI

```typescript
async function trackSuggestionImpact(suggestionId: string) {
  const suggestion = await getSuggestion(suggestionId);
  const project = await getProject(suggestion.projectId);
  
  // Get stats before and after
  const statsBefore = await getStatsAtTime(project.id, suggestion.createdAt);
  const statsAfter = await getStatsAtTime(project.id, now());
  
  const actualImpact = {
    successRateChange: statsAfter.successRate - statsBefore.successRate,
    missingDataChange: statsAfter.missingDataRate - statsBefore.missingDataRate,
    actualROI: calculateActualROI(statsBefore, statsAfter),
  };
  
  await updateSuggestion(suggestionId, { actualImpact });
  
  // Learn from results
  if (actualImpact.successRateChange > suggestion.expectedImpact.successRateImprovement * 0.8) {
    // Suggestion worked well - use similar patterns in future
    await learnFromSuccess(suggestion);
  }
}
```

---

## Continuous Monitoring

### Scheduled Jobs

```typescript
// Run every hour
async function monitorAllProjects() {
  const projects = await listActiveProjects();
  
  for (const project of projects) {
    // Skip if recently checked
    if (project.lastSuggestionCheck && 
        Date.now() - new Date(project.lastSuggestionCheck).getTime() < 3600000) {
      continue;
    }
    
    const suggestions = await detectIssues(project.id);
    
    if (suggestions.length > 0) {
      // Save suggestions
      for (const suggestion of suggestions) {
        await saveSuggestion(suggestion);
        
        // Create notification
        await createNotification({
          type: "instruction_suggestion",
          priority: suggestion.priority,
          // ... notification data
        });
      }
    }
    
    await updateProject(project.id, { lastSuggestionCheck: now() });
  }
}
```

### Real-Time Detection

```typescript
// Hook into call-ended webhook
export async function POST(req: NextRequest) {
  // ... existing call-ended logic ...
  
  // After updating contact
  await updateContact(contact.id, { ... });
  
  // Check if we should generate suggestions
  const project = await getProject(projectId);
  const stats = getProjectStats(projectId);
  
  // If success rate dropped below threshold
  if (stats.successRate < 50 && !project.recentSuggestionGenerated) {
    const suggestions = await detectIssues(projectId);
    if (suggestions.length > 0) {
      await saveSuggestions(suggestions);
      await createNotifications(suggestions);
      await updateProject(projectId, { recentSuggestionGenerated: true });
    }
  }
}
```

---

## Success Metrics

### Adoption Metrics
- % of suggestions accepted (target: 60%+)
- Time to accept (target: < 24 hours)
- Suggestions per project (target: 2-5/month)

### Impact Metrics
- Average success rate improvement (target: +10-15%)
- ROI accuracy (predicted vs actual) (target: 80%+)
- User satisfaction with suggestions (target: 4/5)

### System Metrics
- Suggestions generated per day
- False positive rate (target: < 20%)
- Detection accuracy (target: 90%+)

---

## Implementation Priority

### Phase 1: Basic Detection & Suggestions (Week 1-2)
- [ ] Build issue detection service
- [ ] Create suggestion generation
- [ ] Add suggestions to instructions page
- [ ] Accept/reject functionality
- [ ] **Track all activities** (generation, acceptance, rejection)

### Phase 2: Notifications & ROI (Week 3)
- [ ] Create notification type for suggestions
- [ ] Add ROI calculation
- [ ] Link notifications to instructions page
- [ ] Priority system
- [ ] **Track ROI predictions**

### Phase 3: Tracking & Dashboard (Week 4) ⭐ **CRITICAL**
- [ ] Build Assistant Dashboard page
- [ ] Track actual vs predicted ROI
- [ ] Calculate metrics (acceptance rate, impact, etc.)
- [ ] Create charts and visualizations
- [ ] Add to navigation

### Phase 4: Learning & Optimization (Week 5-6)
- [ ] Learn from acceptances/rejections
- [ ] Improve suggestion quality based on data
- [ ] Track impact over time
- [ ] Refine detection accuracy

### Phase 5: Advanced Features (Week 7-8)
- [ ] Real-time detection
- [ ] Proactive best practices
- [ ] A/B testing suggestions
- [ ] Multi-suggestion optimization

---

## Key Benefits

1. **Proactive**: System finds issues before users notice
2. **Actionable**: Specific, one-click improvements
3. **Measurable**: Clear ROI on every suggestion
4. **Self-Improving**: Learns what works
5. **Time-Saving**: Users don't need to analyze results manually
6. **Revenue**: High-value feature (can charge premium)

---

## Next Steps

1. **Start with Phase 1**: Basic detection and suggestions
2. **Test with real projects**: See what users accept/reject
3. **Iterate on detection**: Improve accuracy
4. **Add ROI tracking**: Prove value
5. **Scale**: Monitor all projects automatically
