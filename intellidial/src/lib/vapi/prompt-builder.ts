/**
 * System prompt assembly — shared between server (client.ts) and front-end (preview).
 * No secrets or server-only imports; safe to import from client components.
 */

import type { AgentQuestion } from "@/lib/firebase/types";

/** Fields used to assemble the system prompt (subset of ProjectDoc). */
export type PromptProject = {
  agentName?: string | null;
  agentCompany?: string | null;
  agentNumber?: string | null;
  businessContext?: string | null;
  agentInstructions?: string | null;
  goal?: string | null;
  tone?: string | null;
  agentQuestions?: AgentQuestion[];
  vehicleContextFullText?: string | null;
  callContextInstructions?: string | null;
  identityInstructions?: string | null;
  endingCallInstructions?: string | null;
  complianceInstructions?: string | null;
  voiceOutputInstructions?: string | null;
  vehiclePlaceholderInstructions?: string | null;
  schedulingInstructions?: string | null;
  vehicleContextHeaderInstructions?: string | null;
  vehicleReferenceInstructions?: string | null;
  vehicleIntroInstructions?: string | null;
  businessContextHeaderInstructions?: string | null;
};

export const SYSTEM_PROMPT_DEFAULTS = {
  callContext:
    "CURRENT CALL: You are calling {{customerName}} at {{customerNumber}}. Use their name to personalize when you have it (e.g. 'Hi {{customerName}}'). If the person's name is not provided, say 'Hi' or 'Hello'.",
  identity:
    "IDENTITY: You work for this company. When referring to the business — hours, location, services, contact details — always use 'we', 'our', and 'us' (e.g. 'We are open 9 to 5', 'Our office is at...', 'You can reach us at...'). Never say 'they' or 'the company' as if you are external.",
  endingCall:
    "ENDING THE CALL: When the person says goodbye, bye, hang up, or that they need to go, say a brief closing and end the call. Use a natural sign-off such as: Goodbye, Bye, Cheers, Take care, Sharp (SA), Thanks bye, Have a good one, or e.g. 'Thanks for your time. Goodbye.' Do not keep talking. 'Hang up' or 'please hang up' means they want to end this call now — say goodbye and end the call; it does NOT mean they want to be removed from the list.",
  compliance:
    "COMPLIANCE (South Africa / POPIA): If the person clearly asks to stop being called in future, to be removed from the list, or not to be contacted again, acknowledge and say you will ensure they are not called again. Do not confuse this with simply ending the current call (goodbye / hang up).",
  voiceOutput:
    "VOICE OUTPUT: Your replies are read aloud by a voice system. You MUST write all numbers in words so they sound correct — the system reads digits character-by-character otherwise.\n" +
    "• PRICES: Never output 'R289995', 'R289 995', or similar. Always write in words: 'two hundred and eighty-nine thousand nine hundred and ninety-five rand'. Example: R419995 → 'four hundred and nineteen thousand nine hundred and ninety-five rand'.\n" +
    "• YEARS: 'twenty twenty-two' never '2022' or '20 22'. 'twenty nineteen' never '2019'.\n" +
    "• ENGINE/SPECS: 'seventy kilowatts' not '70 kW'; 'five point four litres per hundred kilometres' not '5.4 L/100km'. For engine capacity say 'two litre', 'two point five litre', 'one point eight litre' — never '2 point 0', '2.0', or 'two point zero'. People say '2 litre' or '2.5 litre', not '2 point 0'.\n" +
    "• MODEL LETTERS (critical): Single letters in model names are misread by the voice. 'G 350 d' (d = diesel) is read as 'G 350 days'. Always write the full word: say 'G 350 diesel' or 'G-class 350 diesel', never 'G 350 d'. Same for 'e' (electric) → 'electric', 't' (turbo) → 'turbo' if it would sound wrong. So: Mercedes G 350 d → 'Mercedes G-class 350 diesel' or 'G 350 diesel' when speaking.\n" +
    "• MODEL NAMES LIKE A7, A3: 'Audi A7' must be said clearly as 'Audi A seven' (A seven = the model). Never say 'Audi a 7' or 'Audi 7' — that's unclear. Always 'A seven', 'A three', 'A four', etc. for Audi A-series. Same for BMW 3 Series: '3 Series' not '3 3'.\n" +
    "• ENGINE CAPACITY: '3.0 TDI' → say '3 litre TDI' or '3 point 0 TDI'. '2.5' → '2 point 5 litre' or '2.5 litre'. Never '3 TDI' or '3 3 TDI' — always include the unit: '3 litre' or '3 point 0 TDI'. Decimals: '2.5' = '2 point 5 litre', '1.8' = '1 point 8 litre'.\n" +
    "• 4x4: 'four by four' not '4x4'.\n" +
    "• PHONE NUMBERS: Say the number slowly so the person can write it down. Use clear groups with a pause between each: e.g. 086 128 8634 → 'zero eight six ... one two eight ... eight six three four'. Three digits, then three, then four (or similar grouping). Never rush — imagine you are dictating it for someone noting it down. Use commas or brief pauses between groups; never read the whole number in one flat stream.\n" +
    "• EMAIL ADDRESSES: Use 'at' for @. For .co.za use this exact phrase with even cadence: dot cee oh dot zed ay. Write it as four parts with spaces only: dot, then cee oh (letters C and O, no pause between them), then dot, then zed ay (letters Z and A). Do NOT use a comma between cee and oh — that causes a long pause. Do NOT write 'co' or 'za' as words. Example: info@bargainauto.co.za → 'info at bargain auto dot cee oh dot zed ay'. Practice phrasing: dot · cee oh · dot · zed ay.\n" +
    "• ADDRESS: When giving the address, keep it natural and brief. Say only the number, street name, and area — e.g. 'We're at 180 Voortrekker Road, Goodwood.' Do not read out the full formal line (suburb, city, postcode) unless they ask. You can add 'I can give you the full address if you need it.'\n" +
    "• PRONUNCIATION — Voortrekker: This is an Afrikaans street name. When saying it, use Afrikaans pronunciation so it doesn't sound anglicized: the V is like F, the 'oo' is a long vowel. Output 'Foor-trekker' when speaking the street name so the voice says it correctly (e.g. '180 Foor-trekker Road, Goodwood'). If the dealer has added other pronunciation notes in Dealer setup, follow those when saying the address.\n" +
    "Never output raw digits, symbols, or abbreviations for anything that will be spoken.",
  vehiclePlaceholder:
    "VEHICLE PLACEHOLDERS: When your script or instructions mention [year], [make], [model], or similar placeholders, replace them with the actual year, make, and model from the VEHICLE LISTING CONTEXT above. Never say the literal words 'year', 'make', or 'model' as placeholders.\n" +
    "Model names: keep as one word (e.g. 'Wildtrak' not 'wild track').",
  scheduling:
    "SCHEDULING — When the customer suggests a time outside your hours:\n" +
    "(1) Say: 'Unfortunately we're not operational during that time.'\n" +
    "(2) State your operating hours clearly from BUSINESS CONTEXT. Use 'We're open from [X] to [Y]' — e.g. 'We're open from 8 AM to 5 PM on weekdays.' Do NOT confuse open and close: 8 AM = when you open, 5 PM = when you close. Never say 'we close at 8 AM' if 8 AM is when you open.\n" +
    "(3) Ask: 'What day and time would work for you?' — let them choose rather than assuming.\n" +
    "Example: 'Unfortunately we're not operational during that time. We're open from 8 AM to 5 PM on weekdays. What day and time would work for you?'\n" +
    "AMBIGUOUS TIMES — If the customer gives only a number for the time (e.g. 'Friday 9', '9', '3'), do NOT assume PM. Numbers like 8, 9, 10, 11, 12 are often meant as AM (within typical daytime hours). Either confirm: 'Just to confirm, did you mean 9 AM or 9 PM?' or, if the number is clearly within your operating hours as AM (e.g. 9 when you're open 8 AM–5 PM), treat it as AM and confirm: 'So that's Friday at 9 AM — I've got you down for that.'",
  clarification:
    "CLARIFICATION (speech can be misheard): If what the customer said doesn't make sense in context (e.g. 'the ending', 'the conflict', 'the computes' when discussing a vehicle) — do NOT guess or give a generic answer. React like a human: politely ask for clarification. You can say: 'Sorry, I didn't quite catch that — did you mean the handling?' or 'Just to confirm, did you say comfort?' or 'I want to make sure I help you right; could you repeat that?' Always be polite, courteous, and a delight to speak to. Never pretend you understood if it was unclear.",
  vehicleContextHeader:
    "VEHICLE LISTING CONTEXT (the customer enquired about this vehicle; use this to introduce the car and to answer any question about it — specs, price, features, description, handling, comfort, safety, etc. Do not summarise; use the details below.)\n" +
    "ANSWERING HANDLING, COMFORT, SAFETY, SPECS: Search the context below for anything relevant before replying. Map the customer's word to context: 'handling' → steering, suspension, drive type, ride, dynamics, four-wheel drive; 'comfort' → seats, interior, cabin, noise, space, ride quality, materials; 'safety' → airbags, ABS, stability control, brakes, crash rating. If the listing contains ANY relevant sentence or phrase, use it — quote or paraphrase from the context. Do NOT lead with 'I don't have specific details' when you do have relevant info. Only say you don't have that detail when the context has literally zero on that topic; then suggest the team can go through it when they visit or they check the listing. Do not invent; if the context has nothing, say so briefly. Never give a generic answer when the context has the answer.",
  vehicleReference:
    "VEHICLE NAME — Human-like, not repetitive. Say the full car (year, make, model, variant) only TWICE in the whole call: (1) once in your intro after they confirm identity, (2) once when confirming the booking at the end. Everywhere else use SHORT references: the model name only (e.g. 'the G-class', 'the Corolla', 'the Golf', 'the GTI') or 'it', 'this one', 'the car', 'the vehicle'. Once the customer knows which car you mean, they know — do not keep saying 'the 2017 Mercedes Benz G Class G 350 d'. That is unnatural and robotic. Use 'the G-class', 'it', 'this one' for a natural, human experience. Do not repeat the full trim or variant in every sentence.",
  vehicleIntro:
    "VEHICLE INTRO (after they confirm identity): One short line — year, make, model, and variant only (e.g. 'the 2017 Mercedes G-class 350 diesel'). Do NOT list engine specs or trim. Never say 'high demand' or 'luckily still available'.\n" +
    "Flow: (1) Brief intro. (2) Offer: 'Would you like a summary of the amazing features of the [vehicle]?' (3) If yes, give a short summary. (4) Ask: 'Any other questions?' (5) Only when the conversation naturally allows, offer: 'Can I book you for a viewing and test drive?' Do NOT append 'Would you like to schedule a viewing and test drive?' to every answer — that is repetitive. Answer their question, then only offer booking when it fits (e.g. after they have had their questions answered). When answering questions about the car, refer to it as 'it', 'the G-class', 'this one', etc., not the full name.",
  businessContextHeader:
    "BUSINESS CONTEXT (use this to answer questions about the company, location, services):",
} as const;

/** Dealer contact fields injected into business context for the prompt preview and server. */
export type DealerContactForPrompt = {
  address?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  operationHours?: string | null;
  /** Optional pronunciation notes when saying the address (e.g. "Voortrekker: say Foor-trekker"). */
  addressPronunciationNotes?: string | null;
};

/**
 * Enrich business context with dealership contact details.
 * Used both server-side (before building the VAPI assistant) and client-side (for prompt preview).
 */
export function enrichBusinessContextWithDealer(
  businessContext: string | null | undefined,
  dealer: DealerContactForPrompt
): string {
  const base = (businessContext ?? "").trim();
  const parts: string[] = [];
  if (base) parts.push(base);
  const hasAny =
    (dealer.address ?? "").trim() ||
    (dealer.phoneNumber ?? "").trim() ||
    (dealer.email ?? "").trim() ||
    (dealer.operationHours ?? "").trim();
  if (hasAny) {
    parts.push("");
    parts.push(
      "DEALERSHIP CONTACT DETAILS (provide these when the customer asks for address, phone, email, or where to go for a viewing or test drive):"
    );
    if ((dealer.address ?? "").trim()) parts.push(`Address: ${(dealer.address ?? "").trim()}`);
    if ((dealer.phoneNumber ?? "").trim()) parts.push(`Phone: ${(dealer.phoneNumber ?? "").trim()}`);
    if ((dealer.email ?? "").trim()) parts.push(`Email: ${(dealer.email ?? "").trim()}`);
    if ((dealer.operationHours ?? "").trim())
      parts.push(`Operating hours: ${(dealer.operationHours ?? "").trim()}`);
    if ((dealer.addressPronunciationNotes ?? "").trim()) {
      parts.push("");
      parts.push("ADDRESS PRONUNCIATION (when saying the address aloud, use these forms):");
      parts.push((dealer.addressPronunciationNotes ?? "").trim());
    }
  }
  return parts.join("\n");
}

export function getSystemPromptDefaults(): typeof SYSTEM_PROMPT_DEFAULTS {
  return { ...SYSTEM_PROMPT_DEFAULTS };
}

/**
 * Assemble the full system prompt from project fields + defaults.
 * This is the single source of truth — used by the server to build the VAPI prompt
 * and by the front end to render the live preview.
 */
export function buildSystemPrompt(project: PromptProject): string {
  const D = SYSTEM_PROMPT_DEFAULTS;
  const parts: string[] = [];
  parts.push((project.callContextInstructions ?? D.callContext).trim());
  parts.push((project.identityInstructions ?? D.identity).trim());
  parts.push((project.endingCallInstructions ?? D.endingCall).trim());
  parts.push((project.complianceInstructions ?? D.compliance).trim());
  parts.push((project.voiceOutputInstructions ?? D.voiceOutput).trim());
  parts.push(D.clarification.trim());
  const businessContext = (project.businessContext ?? "").trim();
  if (businessContext) {
    parts.push((project.businessContextHeaderInstructions ?? D.businessContextHeader).trim());
    parts.push(businessContext);
    parts.push((project.schedulingInstructions ?? D.scheduling).trim());
  }
  const vehicleContext = (project.vehicleContextFullText ?? "").trim();
  if (vehicleContext) {
    parts.push((project.vehicleContextHeaderInstructions ?? D.vehicleContextHeader).trim());
    parts.push(vehicleContext);
    parts.push((project.vehicleReferenceInstructions ?? D.vehicleReference).trim());
    parts.push((project.vehicleIntroInstructions ?? D.vehicleIntro).trim());
    parts.push((project.vehiclePlaceholderInstructions ?? D.vehiclePlaceholder).trim());
  }
  const agentName = typeof project.agentName === "string" ? project.agentName.trim() : "";
  const agentCompany = typeof project.agentCompany === "string" ? project.agentCompany.trim() : "";
  const agentNumber = typeof project.agentNumber === "string" ? project.agentNumber.trim() : "";
  if (agentName || agentCompany || agentNumber) {
    const identity: string[] = [];
    if (agentName) identity.push(`You are ${agentName}.`);
    if (agentCompany) identity.push(`You are calling on behalf of ${agentCompany}.`);
    if (agentNumber) identity.push(`The number you are calling from is ${agentNumber}.`);
    parts.push(identity.join(" "));
  }
  const instructions = (project.agentInstructions ?? "").trim();
  if (instructions) parts.push(instructions);
  const goal = typeof project.goal === "string" ? project.goal.trim() : "";
  if (goal) parts.push(`\nGOAL: ${goal}`);
  const tone = typeof project.tone === "string" ? project.tone.trim() : "";
  if (tone) parts.push(`\nTONE: ${tone}`);
  const questions = (project.agentQuestions ?? []).filter((q) => q?.text?.trim());
  if (questions.length > 0) {
    parts.push("\nQUESTIONS TO COVER (work these into the conversation naturally):");
    questions.forEach((q, i) => {
      parts.push(`${i + 1}. ${q.text.trim()}`);
    });
  }
  return parts.join("\n").trim() || "You are a professional phone agent. Be concise and helpful.";
}
