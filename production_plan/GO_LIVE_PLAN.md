# MVP Go-Live Production Plan

## 1. Landing Page (Week 1)

### Purpose
- Explain what you do
- Build credibility/trust
- Capture leads
- Live chat/contact option

### Simple Structure (Single Page)

```
[Hero Section]
- Headline: "AI-Powered Phone Research at Scale"
- Subline: "We call hundreds of businesses, ask your questions, and deliver structured data"
- CTA Button: "Get a Free Demo" / "Talk to Us"

[How It Works]
1. You give us a list (or we scrape it)
2. Our AI calls each number
3. We extract the answers you need
4. You get an Excel + recordings

[Use Cases]
- Medical provider verification
- Lead qualification
- Market research & pricing surveys
- Data verification & cleanup

[Pricing]
- Simple table (Starter/Growth/Pro)
- "Custom enterprise pricing available"

[Social Proof]
- "Trusted by X businesses" (even if 1-2 pilots)
- Testimonial quotes (ask pilot customers)
- Logos if possible

[FAQ]
- How does it work?
- What countries do you support?
- How accurate is the data?
- Can I customize the questions?

[Contact/CTA]
- WhatsApp chat button (easiest for SA)
- Email: hello@yourbrand.co.za
- Calendly link for demo calls

[Footer]
- Simple links
- "Based in Cape Town, South Africa"
```

### Tech Options (Simple & Fast)

| Option | Cost | Time to Launch |
|--------|------|----------------|
| Carrd.co | R150/year | 1-2 hours |
| Framer | Free-R300/month | 2-4 hours |
| Webflow | R250/month | 4-8 hours |
| Simple HTML + Vercel | Free | 2-4 hours |

**Recommendation:** Start with **Carrd** or **Framer** - fast, cheap, looks professional.

### Live Chat Options
- **Crisp** (free tier) - add chat widget
- **WhatsApp Business** - most SA clients prefer this
- **Calendly** - let them book demo calls directly

---

## 2. Multi-Client Management Plan

### The Problem
When you have 5+ clients, you need:
- Separate contact lists per client
- Track which calls belong to which client
- Billing per client
- Don't mix up data

### Simple Solution (No Code Required)

```
/clients
  /client_acme
    /contacts.json        <- their phone list
    /called_numbers.json  <- tracking
    /results.xlsx         <- their results
    /recordings/          <- their call recordings
    /config.json          <- their custom questions
  /client_beta
    /contacts.json
    /called_numbers.json
    /results.xlsx
    /recordings/
    /config.json
```

### Config File Per Client
```json
{
  "client_name": "Discovery Health",
  "assistant_name": "Sarah",
  "greeting": "Hi, good day!",
  "questions": [
    "Is the doctor accepting new patients?",
    "Do you offer ultrasound services?",
    "What is the consultation fee?",
    "What is the earliest available appointment?"
  ],
  "extract_fields": [
    "accepting_patients",
    "has_ultrasound", 
    "price",
    "earliest_availability"
  ],
  "max_calls_per_run": 50,
  "phone_number_id": "xxx"  // can use different Twilio numbers
}
```

### Client Tracking Spreadsheet
Simple Google Sheet or Excel to track:

| Client | Contact | Start Date | Calls Made | Calls Remaining | Amount Billed | Status |
|--------|---------|------------|------------|-----------------|---------------|--------|
| Discovery | John | 2026-01-15 | 500 | 0 | R5,000 | Complete |
| Pnet | Sarah | 2026-01-20 | 150 | 350 | R1,500 | In Progress |
| Property24 | Mike | 2026-01-25 | 0 | 1000 | R0 | Pending |

### Workflow for New Client

1. **Onboarding Call** (30 min)
   - Understand their use case
   - Define the questions
   - Get their contact list (or scrape for them)

2. **Setup** (1 hour)
   - Create client folder
   - Configure their questions
   - Test with 5 calls
   - Share sample results

3. **Approval & Payment**
   - Client approves sample
   - Invoice sent (50% upfront for new clients)
   - Payment confirmed

4. **Execution**
   - Run calls in batches (50-100/day)
   - Daily progress updates via WhatsApp
   - Handle any issues

5. **Delivery**
   - Final Excel + recordings
   - Summary report
   - Feedback call
   - Invoice remaining balance

---

## 3. Go-Live Checklist

### Week 1: Foundation
- [ ] Register domain (yourbrand.co.za)
- [ ] Set up business email (hello@yourbrand.co.za)
- [ ] Create landing page (Carrd/Framer)
- [ ] Add WhatsApp Business chat
- [ ] Set up Calendly for demo bookings
- [ ] Create company LinkedIn page

### Week 2: Polish & Test
- [ ] Create client folder structure
- [ ] Build config-based calling script
- [ ] Test with 3 different use cases
- [ ] Prepare demo video (Loom, 2-3 min)
- [ ] Write 3 case study outlines
- [ ] Set up invoicing (PayFast / manual)

### Week 3: Soft Launch
- [ ] Reach out to 10 warm contacts
- [ ] Offer free pilot (50 calls) to 2-3 prospects
- [ ] Post on LinkedIn about the service
- [ ] Join relevant SA business groups
- [ ] Complete first pilot successfully

### Week 4: Learn & Iterate
- [ ] Gather feedback from pilots
- [ ] Fix any issues
- [ ] Convert pilots to paying customers
- [ ] Refine pricing based on learnings
- [ ] Start outbound outreach

---

## 4. Scaling Roadmap

### Stage 1: Manual (0-10 clients)
- You run everything manually
- Client folders on your machine
- WhatsApp for communication
- Excel for tracking
- **Focus:** Get testimonials, refine process

### Stage 2: Semi-Automated (10-30 clients)
- Simple web dashboard
- Client self-service upload
- Automated email updates
- Stripe/PayFast integration
- **Focus:** Reduce manual work

### Stage 3: Platform (30+ clients)
- Full multi-tenant platform
- API access for integrations
- Team accounts
- White-label option
- **Focus:** Scale revenue

---

## 5. Immediate Action Items

### Today
1. Pick a brand name
2. Register domain
3. Set up business WhatsApp

### This Week
1. Build landing page (Carrd)
2. Record 2-min demo video
3. Create client folder structure
4. Update calling script to use config files

### Next Week
1. Reach out to 5 potential customers
2. Offer free pilot
3. Post on LinkedIn
4. Complete first external pilot

---

## 6. Budget for Launch

| Item | Cost | Notes |
|------|------|-------|
| Domain (.co.za) | R100/year | |
| Landing page (Carrd) | R150/year | |
| Business email (Zoho) | Free | Or R50/month for Google Workspace |
| WhatsApp Business | Free | |
| Twilio number | R15/month | Already have |
| VAPI credits | R500 | Top up as needed |
| Gemini API | ~R50/month | Pay as you go |
| **Total to launch** | **~R800** | |

---

## 7. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Call quality issues | Test thoroughly before each client batch |
| Data accuracy | Human review sample of each batch |
| Client doesn't pay | 50% upfront for new clients |
| Twilio/VAPI outage | Have backup credits, communicate delays |
| Legal concerns | Clear T&Cs, only B2B calling, respect do-not-call |

---

## Summary

**Minimum to go live:**
1. Landing page (2 hours)
2. WhatsApp Business (30 min)
3. Client folder structure (1 hour)
4. Config-based script update (2-3 hours)
5. First outreach (ongoing)

**You can be live in 1-2 days** with what you have. The rest is iteration.
