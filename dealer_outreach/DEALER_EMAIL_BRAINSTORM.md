# Dealership Cold Email — Brainstorm & Strategy

## Date: 16 Feb 2026

---

## 1. Your Unfair Advantage (use this)

You have something 99% of cold emailers don't: **real proof the dealer is losing leads right now.**

### What you have:
- **Your own enquiry test** (LEAD_RESPONSE_TEST.md — 20 enquiries sent 11 Feb 2026). You KNOW which dealers called back and which didn't.
- **AutoTrader public reviews** where real buyers complain about slow/no response. Example: Auto King has a 1-star review from Stevelin D on 7 Nov 2025: *"I am still waiting on the consultant to confirm of the enquiry I sent with regards to the Audi A3."*
- **AutoTrader dealer data**: star rating, number of reviews, number of listings, location, inventory price range.
- **Google Places API** (optional enrichment): Google rating, review count, opening hours, website URL.

**This is your hook. You're not guessing they have a problem — you can show them.**

---

## 2. Cold Email Best Practices (for maximum open + reply rate)

### DO:
- **Plain text only** — no HTML templates, no images, no logos. It looks like a real human sent it.
- **Short** — under 120 words in the body. Dealers are busy. Respect that.
- **One clear CTA** — don't give them 3 choices. One question they can reply yes/no to.
- **Personalized subject line** — include their dealer name or something specific.
- **Send from a real person email** — e.g. `lasse@intellidial.co.za`, not `sales@` or `info@`.
- **Send Tuesday–Thursday, 8–10 AM** — best open rates for B2B in SA.
- **Mobile-friendly** — most people read email on their phone. Short paragraphs.

### DON'T:
- **No links in the first email** — links hurt deliverability and trigger spam filters. Save your website link for the signature or follow-up #2.
- **No attachments** — never attach anything to a cold email. Spam city.
- **No demo video in email #1** — it's too much too soon. They haven't said they're interested yet.
- **No long feature lists** — they don't care about features yet. They care about their problem.
- **No "Dear Sir/Madam"** — find the actual person's name if possible.
- **Don't mention price in email #1** — you want a conversation first.

### Website link?
- **Yes, but only in your email signature**, not in the body. Something like:

```
Lyle [Surname]
Intellidial — AI Speed-to-Lead for Dealerships
intellidial.co.za
```

This way curious people can click through, but it doesn't feel salesy and doesn't hurt deliverability.

### Demo video/link?
- **Not in email #1.** Save it for:
  - Follow-up #2 (if no reply): "I recorded a quick 90-second walkthrough showing what happens when a lead comes in — [link]"
  - Or when they reply with interest: "Want me to send you a quick demo?"
- If you do record a demo, keep it **under 2 minutes**, screen-recorded, showing:
  1. A lead enquiry comes in (email forward)
  2. Intellidial calls within 60 seconds
  3. The AI qualifies the buyer and books a viewing
  4. Result appears in their inbox / CRM
- Host on **Loom** (free, no login required to watch, tracks views so you know who watched).

### Pilot details?
- **Mention it briefly** in email #1 as the CTA (low-friction offer).
- **Don't explain the full mechanics yet.** Just say something like: "We can test this in 48 hours — no integration, no setup. You just forward your leads email to us."
- Full pilot details come in the reply / follow-up call.

---

## 3. Personalization Data — What to Gather Per Dealer

Before writing each email, spend 5 minutes collecting:

- [ ] **Dealer name** — AutoTrader → personalization
- [ ] **Location (suburb)** — AutoTrader → shows you know them
- [ ] **Star rating** — AutoTrader → if low, it's ammo
- [ ] **Number of reviews** — AutoTrader → shows scale
- [ ] **Specific bad reviews about response time** — AutoTrader reviews tab → **this is gold** — real buyers saying they got no response
- [ ] **Number of active listings** — AutoTrader → shows they're active / spending on ads
- [ ] **Inventory price range** — AutoTrader → mid-range vs luxury changes the value of each lead
- [ ] **Your own enquiry result** — LEAD_RESPONSE_TEST.md → did THEY specifically fail to call you back?
- [ ] **Google rating** — Places API → additional credibility data
- [ ] **Contact person name** — AutoTrader / website / LinkedIn → personalize the greeting

### Optional (Places API enrichment):
- Google Maps rating + review count
- Opening hours (are they open when leads come in?)
- Phone number listed on Google (verify it works)
- Any Google reviews mentioning poor follow-up

---

## 4. Email Framework — The "I Was Your Customer" Angle

This is the strongest framework for your situation because it's TRUE and provable.

### Structure:

1. **Subject line** — personal, curiosity-driven, specific to them
2. **Opening** — show you know them (dealer name, location, one specific detail)
3. **The sting** — "I enquired about [car] on [date]. [What happened / didn't happen]."
4. **The insight** — brief stat or observation about what this costs them
5. **The offer** — ultra-low-friction pilot ("forward your leads email, we call in 60 seconds")
6. **Soft close** — one-line question they can reply to

---

## 5. Email Templates

### Template A: "I enquired and you didn't call back"

Use this when you sent an enquiry to THIS dealer and got slow/no response.

```
Subject: Your [Car Make] enquiry from AutoTrader

Hi [Name / team at Dealer Name],

I sent an enquiry on your [Car Year] [Car Make Model] via AutoTrader on [date].

[Option 1 — no callback]: I never got a call back.
[Option 2 — slow callback]: I got a call back [X hours/days] later — by then I'd already spoken to other dealers.

I'm not writing to complain. I'm writing because I built something that fixes this.

Intellidial is an AI assistant that calls your AutoTrader leads back within 60 seconds — qualifies the buyer, answers their questions, and books a viewing. Every call is recorded.

The setup takes 5 minutes: you forward your leads email to us, and we call immediately.

Would it be worth a quick 15-minute chat this week to see if this fits?

Lyle
Intellidial — AI Speed-to-Lead for Dealerships
intellidial.co.za
```

**Word count: ~120. Plain text. One CTA. Personal.**

---

### Template B: "Your reviews say what I'm already thinking"

Use this when AutoTrader reviews mention slow response, but you didn't personally enquire at this dealer.

```
Subject: Saw something on your AutoTrader reviews

Hi [Name / team at Dealer Name],

I've been researching dealerships in [area] and came across your AutoTrader profile — [X] listings, [rating] stars from [Y] reviews.

One thing stood out: a few reviews mention slow follow-up on enquiries. One buyer wrote: "[paste short quote from real review]."

I built a tool that fixes exactly this. Intellidial calls back every AutoTrader lead within 60 seconds using AI — qualifies the buyer, answers questions about the car, and books a test drive.

No app to install, no system to learn. You just forward your leads email to us and we handle the first call.

Worth a quick chat to see if this could help your close rate?

Lyle
Intellidial — AI Speed-to-Lead for Dealerships
intellidial.co.za
```

---

### Template C: "Your leads are calling other dealers first"

Use this for dealers with good ratings (can't use the bad-review angle), to create urgency.

```
Subject: Quick question about your AutoTrader leads

Hi [Name / team at Dealer Name],

You've got [X] cars listed on AutoTrader and a solid [rating]-star rating — clearly running a good operation in [suburb].

Quick question: how fast does your team call back online enquiries?

I've been testing this across Cape Town dealers. The average is 4+ hours. By then, most buyers have already spoken to 2-3 other dealers.

I built Intellidial specifically for this — it calls your leads back within 60 seconds, qualifies the buyer, and books a viewing. Every call recorded, transcripts included.

The pilot is dead simple: forward your leads email to us, and we start calling. No integration needed.

Would it be worth 15 minutes this week to walk you through it?

Lyle
Intellidial — AI Speed-to-Lead for Dealerships
intellidial.co.za
```

---

## 6. Subject Line Options (pick per dealer)

**Best performers for cold email: short, specific, lowercase, no hype.**

| Subject Line | When to Use |
|---|---|
| `Your [Car Make] enquiry from AutoTrader` | When you actually enquired |
| `Saw something on your AutoTrader reviews` | When reviews mention slow response |
| `Quick question about your AutoTrader leads` | General / good-rated dealers |
| `[Dealer Name] — enquiry follow-up speed` | When you know the dealer name |
| `How fast does [Dealer Name] call back leads?` | Provocative but specific |
| `Your AutoTrader leads in [suburb]` | Location-specific |
| `re: AutoTrader enquiry` | Aggressive but high open rate (use carefully — implies prior contact) |

**Rules:**
- All lowercase or sentence case (NOT Title Case Or ALL CAPS)
- Under 6 words if possible
- Include dealer name or car make for personalization

---

## 7. Follow-Up Sequence

Don't just send one email. 80% of deals happen after the 2nd–5th touch.

### Follow-up #1 — Day 3 (bump)

```
Subject: Re: [original subject]

Hi [Name],

Just floating this to the top in case it got buried.

Happy to close the loop if it's not relevant — just let me know.

Lyle
```

**Why this works:** It's 2 lines. No pressure. Respects their time. Many people reply to bumps because they feel bad ignoring a short, polite message.

---

### Follow-up #2 — Day 7 (add value: demo or stat)

```
Subject: Re: [original subject]

Hi [Name],

I recorded a quick 90-second walkthrough showing what happens when a lead comes in — from enquiry to booked viewing in under 2 minutes:

[Loom link]

If this isn't a priority right now, no worries at all.

Lyle
```

**This is where the demo video goes** — not email #1.

---

### Follow-up #3 — Day 14 (breakup email)

```
Subject: Re: [original subject]

Hi [Name],

Last note from me on this.

If speed-to-lead isn't a priority right now, I completely understand. But if things change — especially heading into a busy season — I'm here.

All the best with [Dealer Name].

Lyle
```

**Why this works:** The "breakup email" consistently gets the highest reply rate in any sequence. People respond when they think they're about to lose an option.

---

## 8. How the Pilot Actually Works (for YOUR reference — explain verbally or in reply, not in cold email)

When a dealer says "tell me more," here's the simple version:

1. **They forward their AutoTrader/Cars.co.za leads email** to a dedicated Intellidial address (e.g. `autoking@leads.intellidial.co.za`).
2. **Within 60 seconds**, Intellidial's AI calls the buyer.
3. The AI:
   - Introduces itself on behalf of the dealership
   - References the specific car they enquired about (make, model, price, colour)
   - Confirms interest
   - Answers common questions (price negotiable? finance? trade-in?)
   - Books a viewing / test drive
4. **The dealer gets**: an email/notification with the call recording, transcript, and whether a viewing was booked.
5. **No CRM integration required** for the pilot — just email forwarding.
6. **Pilot scope**: 2 weeks, all incoming leads, no charge for the first 20–30 calls.

**This is the pitch in the follow-up call, not in the cold email.**

---

## 9. Enrichment with Google Places API (optional but powerful)

If you want to go the extra mile per dealer:

```python
# Pseudocode — enrich each dealer
places_data = google_places_api.find_place(
    query=f"{dealer_name} {suburb} car dealer",
    fields=["rating", "user_ratings_total", "opening_hours", "formatted_phone_number", "reviews"]
)
```

**What you get:**
- Google rating (compare with AutoTrader rating)
- Total Google reviews
- Opening hours (if they close at 5pm, leads after 5pm are definitely lost)
- Top Google reviews (search for "never called back", "no response", etc.)

**How to use it in the email:**
- "You're rated 4.1 on Google with 87 reviews — solid. But I noticed your team isn't available after 5pm, and 40% of AutoTrader enquiries come in the evening."
- Or just use it as background research to sound informed on a call.

---

## 10. Metrics to Track

| Metric | Target | Notes |
|---|---|---|
| Emails sent | 10–15/day | Quality > volume |
| Open rate | 50%+ | If below 40%, fix subject lines |
| Reply rate | 10–15% | Normal for personalized cold email to SMBs |
| Positive reply rate | 5–8% | "Tell me more" / "Let's chat" |
| Meetings booked | 2–3/week | From 50–75 emails sent |
| Pilots started | 1–2/week | From meetings |

---

## 11. Tools Needed

| Tool | Purpose | Cost |
|---|---|---|
| Gmail / Outlook | Send emails manually (1:1, not bulk) | Free |
| Loom | Record 90-second demo video | Free |
| Google Sheets | Track outreach (dealer, date sent, status, follow-ups) | Free |
| Google Places API | Enrich dealer data (optional) | Free tier: 100 requests/day |
| AutoTrader.co.za | Manual research per dealer | Free (public) |
| LinkedIn (optional) | Find dealer principal / sales manager name | Free |

---

## 12. Key Principles — What Makes This Work

1. **Proof over claims.** You don't say "dealers lose leads." You show them their own bad reviews and your own enquiry test.

2. **Their problem, not your product.** The email is about THEM losing leads. Intellidial is mentioned in 1–2 sentences, not the whole email.

3. **Ultra-low friction CTA.** "Forward your leads email" is the lowest possible bar. No integration, no training, no budget approval.

4. **Personalization is the differentiator.** A generic "AI for dealerships" email gets deleted. An email that quotes their own customer's review and references a specific car from their lot — that gets read.

5. **Follow-up is where the money is.** Most dealers won't reply to email #1. The bump, the demo video, and the breakup email are where conversions happen.

6. **Relevance of speed in car sales.** Unlike some industries, car buyers are actively shopping across 3–5 dealers simultaneously. The first dealer to call back wins the viewing. AutoTrader data shows most buyers contact multiple dealers for the same type of car. A 4-hour delay = the buyer is already at another showroom. This is THE pain point.

---

## 13. Checklist Before Sending Each Email

- [ ] Found dealer name and location
- [ ] Checked their AutoTrader rating and review count
- [ ] Read their reviews — any "no communication" / "still waiting" complaints?
- [ ] Checked number of active listings
- [ ] Noted inventory highlights (price range, popular models)
- [ ] Found contact person name (dealer principal, sales manager) if possible
- [ ] Chose the right template (A, B, or C)
- [ ] Personalized the subject line
- [ ] Kept it under 120 words
- [ ] Read it on my phone to check formatting
- [ ] Logged it in tracking sheet (dealer, date, template, subject line)
- [ ] Set follow-up reminders (Day 3, Day 7, Day 14)

---

## 14. Next Steps

1. **Fill in your LEAD_RESPONSE_TEST.md** with actual results from the 11 Feb enquiries
2. **Pick your first 10 dealers** from AutoTrader Western Cape (mix of bad-review and good-review dealers)
3. **Spend 5–10 min per dealer** gathering personalization data (see Section 3)
4. **Write and send 5–10 emails** using Templates A/B/C
5. **Record your Loom demo** (for follow-up #2) — under 2 minutes
6. **Track everything** in a simple Google Sheet
7. **Follow up** on Day 3, 7, 14

---

*This document is your living playbook. Update it as you learn what subject lines, templates, and angles get the best responses.*
