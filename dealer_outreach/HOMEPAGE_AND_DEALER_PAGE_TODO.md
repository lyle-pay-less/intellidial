# Homepage & Dealer Page — Dealer Campaign

**Purpose:** So dealers who click from your cold email or Loom land on a page that matches the pitch (60-second callback, test drive booking).

---

## Campaign status: DONE

**The dealer campaign is done.** You send everyone to **https://intellidial.co.za/dealers**. That page is live with the right hero, 3 steps, CTA, dealer voice demo, and wording. Homepage "Dealers" nav links to it. Use this URL in emails, Day 7 Loom, and signature.

| # | Task | Status |
|---|------|--------|
| 1 | Dealer landing page `/dealers` | **Done** — Live. Hero, 3 steps, CTA, dealer voice demo. Nav "Dealers" → `/dealers`. |
| 2 | Homepage: dealer hero line OR Car Dealership first in Use Cases | **Optional** — Only if you want the root URL (intellidial.co.za) to speak to dealers too. Not required; you send people to /dealers. |
| 3 | Wording "call your new lead" / "qualify and book test drive" | **Done** — Dealer page and use-case copy in place. |
| 4 | Dealer testimonial | **Later** — After first pilot. Placeholder on dealer page; add real quote then. |

**Nothing is "to do" for the campaign to work.** Items 2 and 4 are optional / later.

---

## 1. Add a dealer-focused landing page (HIGH) — ✅ DONE

**What:** A dedicated page for car dealers, e.g. **`/dealers`** or **`/speed-to-lead`**.

**Why:** When you send "See how it works" or drop the Loom link in follow-up, they should land on a page that says "this is the 60-second callback thing" — not generic phone research.

**Exactly what to do:**

1. Create a new page on your site: **https://intellidial.co.za/dealers** (or /speed-to-lead).
2. **Hero section** — use this (or close to it):
   - Headline: **"Call every AutoTrader lead back in 60 seconds"**
   - Subhead: **"Qualify the buyer, book a test drive, get a notification — even at 9pm."**
3. **How it works (3 steps)** — keep it short:
   - Step 1: You forward the lead's enquiry email to us.
   - Step 2: We call the lead within 60 seconds. AI qualifies them, answers questions about the car, and books a viewing/test drive into your calendar.
   - Step 3: You get a notification: qualified warm lead + confirmed time slot. Full call transcript and recording available.
4. **CTA:** Same as main site — "Start free trial" / "Book demo" and "50 free calls to start" or "Try with your next 50 AutoTrader leads."
5. **Optional:** One line of social proof when you have it, e.g. "Join dealers who never miss a lead."
6. **Use this URL everywhere for dealers:** In your cold email follow-ups (Day 7 Loom or "see how it works" link) and in the Loom video itself, link to **https://intellidial.co.za/dealers** (or your chosen path) — not the homepage.

**Done when:** Dealers who click from your email or Loom land on this page and see the 60-second callback + test drive booking message immediately.

**Status:** Implemented. Page at `/dealers` with hero, 3 steps, How it works image, pricing, FAQ, HubSpot, dealer-specific voice demo (variant=dealers). Homepage nav "Dealers" links to `/dealers`.

---

## 2. On the main homepage: make "Car Dealership" obvious — OPTIONAL

**What:** So if a dealer lands on the **root** URL (not /dealers), they see themselves straight away. **Optional** — you send links to /dealers, so this is only for the rare case someone hits the homepage first.

**Exactly what to do — pick one:**

- **Option A (hero):** In the hero section, add one line under the main headline:
  - **"For car dealers: Call every AutoTrader enquiry back in 60 seconds — qualify, book a test drive, get the transcript."**
- **Option B (use cases):** In the "Use Cases" section, move **"Car Dealership Speed-to-Lead"** to the **first** position (top left). Add a small label like "New" or "For dealers" so it stands out.

**Done when:** A dealer opening the homepage sees "car dealers" or "AutoTrader" / "60 seconds" / "test drive" without scrolling.

---

## 3. Wording so dealers don’t think it’s only "outbound research" (LOW) — ✅ DONE

**What:** Hero says "calls your contact list, and asks your questions." For dealers the flow is "we call **the lead who just enquired**" and "qualify and book a viewing." Make that clear where dealers look.

**Exactly what to do:**

- On the **dealer landing page** (from step 1): Use "we call **your new lead**" and "ask the right questions to qualify and book a test drive" — not "contact list" / "your questions."
- In the **Car Dealership Speed-to-Lead** use-case box on the homepage: Keep or add a line like "We call the lead who just enquired — not a cold list."

**Done when:** No dealer reads the page and thinks "this is for cold calling lists" instead of "this calls my inbound enquiries."

**Status:** Dealer page uses "your new lead", "qualify and book a viewing/test drive" throughout. Car Dealership use-case on homepage already says "Instantly call back every online enquiry".

---

## 4. After your first pilot: add a dealer testimonial — LATER

**What:** One short quote from a dealer on the homepage (and on the dealer page) so the next dealer trusts it.

**Exactly what to do:**

- When you have one pilot dealer who’s happy, ask for one line, e.g. "IntelliDial called our lead back in under a minute and booked a viewing."
- Add it to the "What Our Clients Say" section on the homepage with title e.g. "Dealer Principal" / "Cape Town dealership."
- Add the same quote (or a longer one) to the dealer landing page if you have a testimonial block there.

**Done when:** Homepage and dealer page show at least one dealer testimonial.

---

## Checklist summary

| # | Task | Status |
|---|------|--------|
| 1 | `/dealers` page with hero + 3 steps + CTA; use this URL in dealer emails and Loom | [x] Done |
| 2 | Homepage: one hero line for dealers OR Car Dealership first in Use Cases | Optional (not required for campaign) |
| 3 | Wording "call your new lead" / "qualify and book test drive" | [x] Done |
| 4 | Dealer testimonial after first pilot | Later |

---

## Where this lives

- **Dealer outreach folder:** `dealer_outreach/` (this file).
- **Main site:** intellidial.co.za — dealer page live at **https://intellidial.co.za/dealers**.
- **Campaign:** Use the dealer page URL in Day 7 follow-up and in your Loom CTA so every dealer click lands in the right place.
- **Code:** `Intellidial/src/app/dealers/page.tsx` (dealer page), `Intellidial/src/app/page.tsx` (homepage; "Dealers" nav → `/dealers`).
