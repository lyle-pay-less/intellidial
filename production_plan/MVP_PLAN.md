# AI Voice Calling System - MVP Plan

## Overview
Automated AI phone calling system that contacts businesses, asks specific questions, and extracts structured data from conversations.

---

## MVP Scope

### Core Features (Must Have)
1. **Contact List Upload**
   - Accept CSV/Excel with business names + phone numbers
   - Validate phone number formats
   - Deduplicate entries

2. **AI Calling Engine**
   - Configurable call script/questions
   - Handle IVR systems (press 1, 2, etc.)
   - Natural conversation flow
   - Call recording

3. **Data Extraction**
   - AI-powered transcript analysis (Gemini)
   - Extract key fields into structured format
   - Confidence scores for extracted data

4. **Results Dashboard**
   - Excel export with all call data
   - Call recordings accessible
   - Status tracking (called/pending/failed)

### Nice to Have (V2)
- Web UI for uploading contacts
- Real-time call monitoring
- CRM integrations (HubSpot, Salesforce)
- Custom voice/personality settings
- Multi-language support

---

## Tech Stack

| Component | Technology | Cost |
|-----------|------------|------|
| Lead Scraping | Google Places API | ~$0.02/request |
| Voice AI | VAPI | ~$0.05-0.15/min |
| Phone | Twilio (SA number) | ~$1/month + usage |
| Transcript Analysis | Google Gemini | ~$0.001/call |
| Backend | Python | Free |
| Data Storage | Excel/JSON | Free |
| Hosting (future) | GCP/AWS | ~$20-50/month |

**Estimated cost per call**: R1-R3 (~$0.05-0.15)

---

## MVP Development Phases

### Phase 1: Core Engine (DONE ✅)
- [x] Google Places API scraping
- [x] VAPI integration
- [x] Twilio SA number setup
- [x] Call orchestration script
- [x] Recording downloads
- [x] Excel data output
- [x] Deduplication logic
- [x] AI transcript analysis (Gemini)
- [x] IVR handling

### Phase 2: Productize (1-2 weeks)
- [ ] Configuration file for different use cases
- [ ] Better error handling & retry logic
- [ ] Batch processing improvements
- [ ] Summary statistics & reporting
- [ ] Clean up code, add comments

### Phase 3: Simple Web UI (2-3 weeks)
- [ ] Flask/FastAPI backend
- [ ] Upload CSV interface
- [ ] Configure questions/script
- [ ] View results & download
- [ ] Basic authentication

### Phase 4: Scale & Sell (ongoing)
- [ ] Multi-tenant support
- [ ] Usage tracking & billing
- [ ] API for integrations
- [ ] White-label option

---

## Use Case Templates

### Template 1: Medical Practice Availability
**Questions:**
1. Is the doctor accepting new patients?
2. Do you offer [specific service]?
3. What is the consultation price?
4. What is the earliest available appointment?

**Output Fields:**
- Accepting patients (Yes/No)
- Service available (Yes/No)
- Price
- Earliest date/time

### Template 2: Lead Qualification
**Questions:**
1. Is [decision maker] available?
2. Are you currently using [product/service]?
3. Would you be interested in learning about [solution]?
4. What's the best time to follow up?

**Output Fields:**
- Decision maker reached (Yes/No)
- Current solution
- Interest level (High/Medium/Low)
- Follow-up time

### Template 3: Data Verification
**Questions:**
1. Can you confirm your business hours?
2. Is this address correct: [address]?
3. Do you offer [service]?
4. What is your website?

**Output Fields:**
- Hours confirmed
- Address correct (Yes/No)
- Services offered
- Website URL

---

## Pricing Model (Proposed)

### Pay-Per-Call
| Volume | Price per call |
|--------|----------------|
| 1-100 | R15 |
| 101-500 | R12 |
| 501-1000 | R10 |
| 1000+ | R8 |

### Monthly Subscription
| Plan | Calls/month | Price |
|------|-------------|-------|
| Starter | 100 | R1,500 |
| Growth | 300 | R3,500 |
| Pro | 1,000 | R8,000 |
| Enterprise | Custom | Custom |

---

## First Customers to Target

1. **Medical Aids / Health Insurers**
   - Discovery, Momentum, Bonitas
   - Need: Provider network verification
   - Value: Accurate directories = better member experience

2. **Recruitment Agencies**
   - Need: Candidate screening calls
   - Value: Save hours of manual calling

3. **Property Portals**
   - Property24, Private Property
   - Need: Listing verification
   - Value: Accurate listings = more trust

4. **Market Research Firms**
   - Need: Price surveys, competitor intel
   - Value: Faster data collection

---

## Next Steps

1. **This week:**
   - Clean up codebase
   - Create config file for easy customization
   - Test with 2-3 different use cases

2. **Next week:**
   - Build simple web interface
   - Create demo video
   - Reach out to 5 potential customers

3. **Week 3-4:**
   - Pilot with first paying customer
   - Iterate based on feedback
   - Refine pricing

---

## Success Metrics

- **MVP Success:** 1 paying customer within 4 weeks
- **Month 1:** R5,000 revenue
- **Month 3:** R20,000 revenue, 5 customers
- **Month 6:** R50,000 revenue, 15 customers
