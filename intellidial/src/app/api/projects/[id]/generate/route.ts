import { NextRequest, NextResponse } from "next/server";
import type { AgentQuestion, CaptureField } from "@/lib/firebase/types";
import { generateText, isGeminiConfigured } from "@/lib/gemini/client";
import { getProject } from "@/lib/data/store";
import { getOrgFromRequest } from "../../getOrgFromRequest";

/** Human-readable industry label for prompts (e.g. "lead_generation" -> "lead generation / sales") */
function industryLabel(industry: string): string {
  if (!industry?.trim()) return "general business outreach";
  const s = industry.trim().toLowerCase();
  const map: Record<string, string> = {
    marketing_research: "market research",
    debt_collection: "debt collection / arrears",
    recruiting_staffing: "recruitment and staffing",
    lead_generation: "lead generation / sales",
    customer_support: "customer support",
    healthcare_outreach: "healthcare outreach",
    real_estate: "real estate",
  };
  return map[s] ?? s.replace(/_/g, " ");
}

/** Mock fallback when Gemini is not configured or fails */
const MOCK_BY_INDUSTRY: Record<
  string,
  { tone: string; goal: string; questions: string[]; fieldKeys: Record<number, string> }
> = {
  marketing_research: {
    tone: "Professional, warm, and curious. Speak clearly at a relaxed pace. Be respectful of the recipient's time and thank them for participating.",
    goal: "Conduct market research by gathering honest feedback on products or services through a brief survey.",
    questions: [
      "How would you rate your overall satisfaction with our product?",
      "What feature do you find most useful?",
      "Would you recommend us to a friend? Why or why not?",
      "What could we improve?",
      "Is there anything else you'd like to share?",
    ],
    fieldKeys: { 0: "satisfaction", 1: "most_useful", 2: "would_recommend", 3: "improvements", 4: "additional_feedback" },
  },
  debt_collection: {
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
  recruiting_staffing: {
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
  lead_generation: {
    tone: "Confident, friendly, and consultative. Focus on value, not pushy. Listen more than you talk.",
    goal: "Qualify leads and book meetings with interested prospects.",
    questions: [
      "Is now a good time for a quick chat?",
      "Are you the right person to discuss this?",
      "What challenges are you facing in this area?",
      "Would a 15-minute demo be helpful?",
      "What day and time works best for you?",
    ],
    fieldKeys: { 0: "good_time", 1: "decision_maker", 2: "challenges", 3: "demo_interest", 4: "meeting_time" },
  },
  customer_support: {
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
  healthcare_outreach: {
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
  real_estate: {
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

function getMockConfig(industry: string) {
  const key = (industry || "other").toLowerCase().replace(/\s+/g, "_").replace(/[^\w]/g, "");
  const normalized = key && key !== "other" ? key : "other";
  return MOCK_BY_INDUSTRY[normalized] ?? MOCK_BY_INDUSTRY.other;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    let body: Record<string, unknown>;
    try {
      const parsed = await req.json();
      body = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { type, industry, questions: bodyQuestions } = body;
    const industryStr = typeof industry === "string" ? industry.trim() : "";
    const label = industryLabel(industryStr || "other");

  // —— Tone: Gemini generates from goal (and industry); fallback mock
  if (type === "tone") {
    const goalInput = typeof body?.goal === "string" ? body.goal.trim() : "";
    const goalContext = goalInput ? ` The agent's goal is: "${goalInput.slice(0, 300)}".` : "";
    
    if (isGeminiConfigured()) {
      const prompt = `You are helping configure an AI phone agent for outbound calls. The user's industry or use case is: "${label}".${goalContext}

Write a short tone description (2-4 sentences) for how the agent should act and speak on the phone. Be specific to this industry and goal. Include pace, demeanor, and any compliance or sensitivity notes. Output only the tone description, no headings or labels.`;
      const tone = await generateText(prompt);
      if (tone) return NextResponse.json({ tone });
    }
    const config = getMockConfig(industryStr);
    return NextResponse.json({ tone: config.tone });
  }

  // —— Goal: enhance the user's goal — structure it, fix errors, add important steps they may have forgotten.
  if (type === "goal") {
    const currentGoal = typeof body.goal === "string" ? body.goal.trim() : "";
    if (isGeminiConfigured() && currentGoal) {
      const prompt = `You are helping configure an AI phone agent for outbound calls. The user's industry or use case is: "${label}". The user wrote this goal:

"${currentGoal.slice(0, 1000)}"

Enhance it: (1) structure it clearly, (2) fix any grammar or clarity errors, (3) add any important steps or outcomes the user might have forgotten (e.g. confirm contact details, note objections, set next step). Consider the industry context when enhancing. Keep their intent and tone. Return only the enhanced goal text, 2-5 sentences, no headings or bullet points.`;
      const goal = await generateText(prompt);
      if (goal) return NextResponse.json({ goal });
    }
    const config = getMockConfig(industryStr);
    return NextResponse.json({ goal: currentGoal || config.goal });
  }

  // —— Questions: Gemini generates from goal (and industry); fallback mock
  if (type === "questions") {
    const countStr = typeof body?.count === 'string' || typeof body?.count === 'number' ? String(body.count) : "5";
    const count = Math.min(10, Math.max(1, parseInt(countStr, 10)));
    const existing = (body?.existing ?? []) as string[];
    const existingSet = new Set(existing.map((t: string) => t.toLowerCase().trim()));
    const goalInput = typeof body?.goal === "string" ? body.goal.trim() : "";
    const goalContext = goalInput ? ` The agent's primary goal is: "${goalInput.slice(0, 400)}".` : "";

    if (isGeminiConfigured()) {
      const prompt = `You are helping configure an AI phone agent for outbound calls. Industry: "${label}".${goalContext}

Generate exactly ${count} specific questions the agent will ask during the call to achieve this goal. Questions should be relevant to the goal and industry, suitable for a short phone conversation, and help gather the information needed. Output ONLY a JSON array of strings, e.g. ["Question 1?", "Question 2?"]. No other text.`;
      const raw = await generateText(prompt);
      if (raw) {
        try {
          const cleaned = raw.replace(/```json?\s*/gi, "").replace(/```\s*/g, "").trim();
          const parsed = JSON.parse(cleaned) as unknown;
          const list = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
          const newOnes = list.filter((q) => !existingSet.has(q.toLowerCase().trim())).slice(0, count);
          if (newOnes.length > 0) {
            return NextResponse.json({
              questions: newOnes.map((text, i) => ({ id: `q-${Date.now()}-${i}`, text })),
            });
          }
        } catch (_) {
          // fall through to mock
        }
      }
    }
    const config = getMockConfig(industryStr);
    let qs = config.questions.filter((t) => !existingSet.has(t.toLowerCase().trim()));
    qs = qs.slice(0, count);
    if (qs.length === 0) qs = config.questions.slice(0, count);
    return NextResponse.json({
      questions: qs.map((text, i) => ({ id: `q-${Date.now()}-${i}`, text })),
    });
  }

  // —— Field names: Gemini from questions, or derive
  if (type === "fieldNames") {
    const qList = (bodyQuestions ?? body?.questions ?? []) as Array<{ id: string; text: string }>;
    const questionTexts = qList.map((q) => (typeof q === "string" ? q : q?.text ?? "")).filter(Boolean);

    if (isGeminiConfigured() && questionTexts.length > 0) {
      const prompt = `Given these call questions, suggest Excel column names for each answer. For each question give a short "key" (snake_case, e.g. satisfaction_rating) and a "label" (human-readable, e.g. Satisfaction rating). Output ONLY a JSON array of objects with "key" and "label". Example: [{"key":"satisfaction_rating","label":"Satisfaction rating"}]. Questions:\n${questionTexts.map((q, i) => `${i + 1}. ${q}`).join("\n")}`;
      const raw = await generateText(prompt);
      if (raw) {
        try {
          const cleaned = raw.replace(/```json?\s*/gi, "").replace(/```\s*/g, "").trim();
          const parsed = JSON.parse(cleaned) as unknown;
          const list = Array.isArray(parsed) ? parsed : [];
          const fields: CaptureField[] = list.slice(0, questionTexts.length).map((item: unknown, i: number) => {
            const o = item && typeof item === "object" && "key" in item ? (item as { key?: string; label?: string }) : {};
            const key = typeof o.key === "string" ? o.key : questionTexts[i]?.toLowerCase().replace(/\W+/g, "_").slice(0, 30) || `field_${i + 1}`;
            const label = typeof o.label === "string" ? o.label : questionTexts[i] || `Question ${i + 1}`;
            return {
              key: key.replace(/\s+/g, "_").replace(/\W/g, "").toLowerCase() || `field_${i + 1}`,
              label,
              type: "text",
            };
          });
          if (fields.length > 0) return NextResponse.json({ captureFields: fields });
        } catch (_) {
          // fall through
        }
      }
    }
    const config = getMockConfig(industryStr);
    const captureFields: CaptureField[] = qList.map((q, i) => {
      const text = typeof q === "string" ? q : q?.text ?? "";
      const preKey = config.fieldKeys[i];
      const slug = text.toLowerCase().replace(/[^\w\s]/g, "").trim().split(/\s+/).slice(0, 4).join("_");
      const key = (preKey || slug || `field_${i + 1}`).replace(/\s+/g, "_").replace(/\W/g, "").toLowerCase() || `field_${i + 1}`;
      return { key, label: text || `Question ${i + 1}`, type: "text" };
    });
    return NextResponse.json({ captureFields });
  }

  // —— Script: one coherent prompt from tone + goal + questions + name + company + best practices (Gemini combines; else we build one)
  if (type === "script") {
    const tone = (typeof body?.tone === 'string' ? body.tone : "").trim();
    const goal = (typeof body?.goal === 'string' ? body.goal : "").trim();
    const qList = (body?.questions ?? []) as string[];
    const questionLines = qList.filter((q) => typeof q === "string" && q.trim()).map((q) => q.trim());
    const agentName = (typeof body?.agentName === 'string' ? body.agentName : "").trim();
    const agentCompany = (typeof body?.agentCompany === 'string' ? body.agentCompany : "").trim();

    if (isGeminiConfigured() && (tone || goal || questionLines.length > 0)) {
      const prompt = `You are writing the full system prompt for an AI phone agent. The user's industry or use case is: "${label}". The user has provided:

${tone ? `Tone: ${tone}` : ""}
${goal ? `Goal: ${goal}` : ""}
${agentName ? `Agent Name: ${agentName}` : ""}
${agentCompany ? `Company/Organization Name: ${agentCompany}` : ""}
${questionLines.length > 0 ? `Questions to ask during the call:\n${questionLines.map((q, i) => `${i + 1}. ${q}`).join("\n")}` : ""}

CRITICAL BEST PRACTICES TO INCLUDE:
- Appear as human and natural as possible in all interactions
- When the call connects, answer "Hello" first and wait for the person to respond before continuing
- Always confirm the person's name at the beginning: "Hi, is this [Name]?" or "Am I speaking with [Name]?" - wait for confirmation before proceeding
- If the person starts speaking while you are speaking, immediately stop talking and let them finish
- Use natural pauses and conversational flow - don't rush through questions
- Listen actively and acknowledge what the person says before moving to the next question
- Be respectful of their time and ask if it's a good time before diving into questions

Write ONE coherent, flowing prompt that combines all of the above into natural instructions. The prompt should tell the agent:
1. How to introduce itself (using the agent name and company name if provided)
2. How to behave (tone) - consider the industry context
3. What to achieve (goal) - tailored to this industry
4. The conversation flow including confirming the person's name first
5. What questions to ask naturally during the conversation
6. All the best practices listed above

Consider the industry context (${label}) throughout the prompt to ensure the agent's behavior, language, and approach are appropriate for this industry. Write this as continuous prose that reads naturally, not as bullet points or labeled sections. The agent should follow these instructions seamlessly. Output only the final prompt.`;
      const script = await generateText(prompt);
      if (script) return NextResponse.json({ agentInstructions: script });
    }

    // Fallback: single coherent paragraph with best practices
    const parts: string[] = [];
    
    // Introduction and name confirmation
    if (agentName && agentCompany) {
      parts.push(`You are ${agentName}, calling on behalf of ${agentCompany}.`);
    } else if (agentName) {
      parts.push(`You are ${agentName}.`);
    } else if (agentCompany) {
      parts.push(`You are calling on behalf of ${agentCompany}.`);
    }
    
    parts.push(`You are operating in the ${label} industry. When the call connects, answer "Hello" first and wait for the person to respond. Always confirm the person's name at the beginning by asking "Hi, is this [Name]?" or "Am I speaking with [Name]?" - wait for confirmation before proceeding with the conversation.`);
    
    if (tone) parts.push(`Throughout the call, you should sound and act as follows: ${tone}`);
    if (goal) parts.push(`Your primary goal on each call is to ${goal.toLowerCase().replace(/^your (aim|goal) is to /i, "").replace(/\.$/, "")}.`);
    
    parts.push(`Appear as human and natural as possible. If the person starts speaking while you are speaking, immediately stop talking and let them finish. Use natural pauses and conversational flow - don't rush through questions. Listen actively and acknowledge what the person says before moving to the next question.`);
    
    if (questionLines.length > 0) {
      parts.push(`During the call, work through these questions naturally in conversation: ${questionLines.join(" ")}`);
    }
    
    parts.push(`Be respectful of their time and thank them for their time at the end.`);
    
    const script = parts.join(" ");
    return NextResponse.json({ agentInstructions: script });
  }

  return NextResponse.json(
    { error: "Invalid type. Use: tone, goal, questions, fieldNames, or script" },
    { status: 400 }
  );
  } catch (e) {
    console.error("[Generate API] Error:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 }
    );
  }
}
