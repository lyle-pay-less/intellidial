import { NextRequest, NextResponse } from "next/server";
import type { AgentQuestion, CaptureField } from "@/lib/firebase/types";

/** Mock AI generation — replace with Gemini API when ready */
const MOCK_BY_INDUSTRY: Record<
  string,
  {
    tone: string;
    goal: string;
    questions: string[];
    fieldKeys: Record<string, string>;
  }
> = {
  "marketing_research": {
    tone: "Professional, warm, and curious. Speak clearly at a relaxed pace. Be respectful of the recipient's time and thank them for participating.",
    goal: "Conduct market research by gathering honest feedback on products or services through a brief survey.",
    questions: [
      "How would you rate your overall satisfaction with our product?",
      "What feature do you find most useful?",
      "Would you recommend us to a friend? Why or why not?",
      "What could we improve?",
      "Is there anything else you'd like to share?",
      "How often do you use our product?",
      "What made you choose us over competitors?",
      "Would you participate in a follow-up interview?",
    ],
    fieldKeys: { 0: "satisfaction", 1: "most_useful", 2: "would_recommend", 3: "improvements", 4: "additional_feedback", 5: "usage_frequency", 6: "competitor_choice", 7: "follow_up_interest" },
  },
  "debt_collection": {
    tone: "Firm but respectful, clear, and professional. Remain calm and empathetic. Follow compliance guidelines strictly.",
    goal: "Resolve outstanding accounts by confirming balance, understanding circumstances, and agreeing on a payment plan.",
    questions: [
      "Can you confirm the balance on your account?",
      "Are you aware of the overdue amount?",
      "What is preventing you from making a payment?",
      "Would you like to set up a payment plan?",
      "What date works best for your first payment?",
    ],
    fieldKeys: { 0: "balance_confirmed", 1: "aware_of_amount", 2: "payment_barrier", 3: "payment_plan", 4: "first_payment_date" },
  },
  "recruiting_staffing": {
    tone: "Enthusiastic, professional, and personable. Build rapport quickly. Be clear about the opportunity.",
    goal: "Qualify candidates and schedule interviews for open positions.",
    questions: [
      "Are you currently looking for new opportunities?",
      "What type of role are you interested in?",
      "What is your availability for an interview this week?",
      "What is your current or most recent salary expectation?",
      "Do you have any questions about the role?",
    ],
    fieldKeys: { 0: "looking", 1: "role_interest", 2: "interview_availability", 3: "salary_expectation", 4: "candidate_questions" },
  },
  "lead_generation": {
    tone: "Confident, friendly, and consultative. Focus on value, not pushy. Listen more than you talk.",
    goal: "Qualify leads and book meetings with interested prospects.",
    questions: [
      "Is now a good time for a quick chat?",
      "Are you the right person to discuss [topic]?",
      "What challenges are you facing with [relevant area]?",
      "Would a 15-minute demo be helpful?",
      "What day and time works best for you?",
    ],
    fieldKeys: { 0: "good_time", 1: "decision_maker", 2: "challenges", 3: "demo_interest", 4: "meeting_time" },
  },
  "customer_support": {
    tone: "Empathetic, patient, and solution-focused. Acknowledge frustration and work toward resolution.",
    goal: "Resolve customer issues and ensure satisfaction.",
    questions: [
      "Can you describe the issue you're experiencing?",
      "Have you already tried any troubleshooting steps?",
      "What would be a satisfactory resolution for you?",
      "Is there anything else I can help you with today?",
      "Would you like me to follow up with you after this call?",
    ],
    fieldKeys: { 0: "issue_description", 1: "troubleshooting", 2: "desired_resolution", 3: "additional_help", 4: "follow_up" },
  },
  "healthcare_outreach": {
    tone: "Warm, caring, and professional. Be sensitive to health topics. Respect privacy and compliance.",
    goal: "Schedule appointments or follow-ups and provide health-related information.",
    questions: [
      "Is this a good time to discuss your health care needs?",
      "When was your last check-up or visit?",
      "Would you like to schedule an appointment?",
      "What day and time works best for you?",
      "Do you have any questions about our services?",
    ],
    fieldKeys: { 0: "good_time", 1: "last_visit", 2: "schedule_interest", 3: "preferred_time", 4: "questions" },
  },
  "real_estate": {
    tone: "Friendly, knowledgeable, and consultative. Understand needs before presenting options.",
    goal: "Qualify buyers or renters and schedule property viewings.",
    questions: [
      "Are you currently looking to buy or rent?",
      "What area are you interested in?",
      "What is your budget range?",
      "When do you need to move?",
      "Would you like to schedule a viewing?",
    ],
    fieldKeys: { 0: "buy_or_rent", 1: "area_interest", 2: "budget", 3: "move_date", 4: "viewing_interest" },
  },
  other: {
    tone: "Professional, friendly, and clear. Adapt to the context of your campaign.",
    goal: "Achieve your campaign objectives through effective outreach and data collection.",
    questions: [
      "Is now a good time for a brief conversation?",
      "Are you familiar with our company or offering?",
      "Would you be interested in learning more?",
      "What would be the best next step for you?",
      "Is there anything else you'd like to share?",
    ],
    fieldKeys: { 0: "good_time", 1: "familiarity", 2: "interest", 3: "next_step", 4: "additional_info" },
  },
};

function getIndustryConfig(industry: string) {
  const key = (industry || "other").toLowerCase().replace(/\s+/g, "_");
  return MOCK_BY_INDUSTRY[key] ?? MOCK_BY_INDUSTRY.other;
}

import { getProject } from "@/lib/data/store";
import { getOrgFromRequest } from "../../getOrgFromRequest";

export async function POST(
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
  const body = await req.json();
  const { type, industry, questions } = body ?? {};
  const config = getIndustryConfig(industry ?? "");

  if (type === "tone") {
    return NextResponse.json({ tone: config.tone });
  }
  if (type === "goal") {
    return NextResponse.json({ goal: config.goal });
  }
  if (type === "questions") {
    const count = Math.min(10, Math.max(1, parseInt(body?.count ?? "5", 10)));
    const existing = (body?.existing ?? []) as string[];
    const existingSet = new Set(existing.map((t: string) => t.toLowerCase().trim()));
    let qs = config.questions.filter((t) => !existingSet.has(t.toLowerCase().trim()));
    qs = qs.slice(0, count);
    if (qs.length === 0) qs = config.questions.slice(0, count);
    return NextResponse.json({
      questions: qs.map((text, i) => ({ id: `q-${Date.now()}-${i}`, text })),
    });
  }
  if (type === "fieldNames") {
    const qList = (questions ?? []) as Array<{ id: string; text: string }>;
    const fields: CaptureField[] = qList.map((q, i) => {
      const preKey = config.fieldKeys[i];
      const slug = (q.text || "")
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .trim()
        .split(/\s+/)
        .slice(0, 4)
        .join("_");
      const key = preKey || slug || `field_${i + 1}`;
      return {
        key: key.replace(/\s+/g, "_").replace(/\W/g, "").toLowerCase() || `field_${i + 1}`,
        label: q.text || `Question ${i + 1}`,
        type: "text",
      };
    });
    return NextResponse.json({ captureFields: fields });
  }
  if (type === "script") {
    const goal = body?.goal ?? config.goal;
    const tone = body?.tone ?? config.tone;
    const qList = (body?.questions ?? config.questions) as string[];
    const script = `**Tone:** ${tone}

**Goal:** ${goal}

**Questions to ask:**
${(qList || []).map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}

Introduce yourself briefly, confirm you have the right person, and work through the questions naturally. Thank them for their time at the end.`;
    return NextResponse.json({ agentInstructions: script });
  }

  return NextResponse.json(
    { error: "Invalid type. Use: tone, goal, questions, fieldNames, or script" },
    { status: 400 }
  );
}
