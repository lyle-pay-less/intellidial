# Caller Improvement Checklist

Use this when testing calls and improving how well the agent performs. The agent needs enough context to sound informed and answer common caller questions.

---

## 1. Business context

**Goal:** Agent should know what the company does so it can explain it and stay on-message.

- [ ] **What the company does** — One or two sentences the agent can use when asked “What do you do?” or “Who is this?”
- [ ] **Main products / services** — Short list so the agent can point callers to the right thing.
- [ ] **Key differentiator** — Why callers should care (e.g. “We’re the only X in the area that does Y”).
- [ ] **Tone / positioning** — Formal vs casual, B2B vs B2C, so the agent matches your brand.

**Where this lives:** Instructions / script (e.g. “Company” or “About us” section) so it’s part of the agent’s system prompt.

---

## 2. Location & operation hours

**Goal:** Agent can answer “Where are you?” and “When are you open?” without guessing.

- [ ] **Location(s)** — Address(es) or area (e.g. “Johannesburg, Sandton”) and whether you serve nationwide/regions only.
- [ ] **Operation hours** — Days and times (e.g. “Mon–Fri 8am–5pm SAST”) and any exceptions (public holidays, half-days).
- [ ] **Time zone** — If relevant (e.g. “All times are South African Standard Time”).

**Where this lives:** Instructions or a dedicated “Location & hours” block the agent can read from when asked.

---

## 3. Common caller questions

**Goal:** Pre-write answers so the agent doesn’t improvise wrong or vague info.

- [ ] **“How do I get in touch with a person?”** — e.g. “Ask for a callback and we’ll call you back within X hours” or “Press 0 for reception.”
- [ ] **“What are your prices?”** — Either a short answer or “We’ll send a quote based on your needs.”
- [ ] **“Do you do [X]?”** — Yes/no plus one line (e.g. “We do X; for Y we recommend Z”).
- [ ] **“Can I speak to [department / person]?”** — How to route or what to say if not available.
- [ ] **“What do I need to bring / have ready?”** — e.g. ID, account number, reference.

**Where this lives:** FAQ-style bullets in the instructions or a “Common questions” section.

---

## 4. What to avoid

- [ ] **Out-of-date info** — Review location, hours, and “what we do” when something changes.
- [ ] **Over-long context** — Keep blocks short; agent works better with clear, scannable lines.
- [ ] **Contradicting the script** — If the script says “we’re closed weekends,” don’t add “we’re open Saturdays” elsewhere.

---

## 5. Testing checklist

After updating context:

- [ ] Ask “What does [company] do?” — Answer matches your one-liner.
- [ ] Ask “Where are you based?” / “What’s your address?” — Correct location or area.
- [ ] Ask “When are you open?” — Correct days and times (and time zone if needed).
- [ ] Ask one or two common product/service questions — Answer is accurate and on-brand.
- [ ] Ask “Can I speak to someone?” — Response matches your process (callback, transfer, etc.).

---

## Quick reference: what the agent needs

| Topic              | Example content                          |
|--------------------|------------------------------------------|
| What we do         | 1–2 sentence company description        |
| Location           | Area/address, coverage (local/national)  |
| Hours              | Days, times, time zone, exceptions       |
| Common questions   | FAQ-style answers (prices, contact, etc.)|
| How to reach a human | Callback, transfer, or “we’ll call back” |

---

*Update this checklist as you find new gaps during testing.*
