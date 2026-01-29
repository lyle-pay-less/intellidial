# Landing Page Design Specification

## Target Audience
- **Primary:** B2B decision makers (Operations, Data, Research teams)
- **Industries:** Healthcare/Medical Aids, Recruitment, Property, Market Research
- **Mindset:** Professional, results-driven, skeptical of new tools, need proof

## Brand Personality
- **Trustworthy** - They're giving us access to their contacts
- **Efficient** - We save them time and money
- **Modern** - AI-powered, cutting edge
- **Professional** - Not playful, not corporate boring

---

## Color Palette

### Option A: Deep Blue + Cyan (Trust + Innovation)
```
Primary:      #0F172A (Slate 900 - deep navy for text)
Secondary:    #1E40AF (Blue 800 - strong blue)
Accent:       #06B6D4 (Cyan 500 - modern, techy)
Background:   #FFFFFF (White)
Surface:      #F8FAFC (Slate 50 - subtle sections)
Success:      #10B981 (Emerald 500)
```

### Option B: Indigo + Purple (AI/Premium feel)
```
Primary:      #1E1B4B (Indigo 950 - deep purple-blue)
Secondary:    #4F46E5 (Indigo 600)
Accent:       #8B5CF6 (Violet 500)
Background:   #FFFFFF
Surface:      #F5F3FF (Violet 50)
```

### Option C: Teal + Dark (Modern Professional) ⭐ RECOMMENDED
```
Primary:      #0F172A (Slate 900 - authority)
Secondary:    #0D9488 (Teal 600 - trust + innovation)
Accent:       #14B8A6 (Teal 500 - CTAs)
Background:   #FFFFFF (White)
Surface:      #F0FDFA (Teal 50 - subtle warmth)
Muted:        #64748B (Slate 500 - secondary text)
Success:      #22C55E (Green 500)
```

**Why Teal?**
- Combines trust of blue + growth of green
- Stands out from typical "blue SaaS" sites
- Medical/health associations (good for healthcare clients)
- Modern without being too trendy

---

## Typography

**Font:** Inter (clean, professional, excellent readability)

| Element | Size | Weight |
|---------|------|--------|
| Hero H1 | 56px / 3.5rem | Bold (700) |
| Section H2 | 36px / 2.25rem | Semibold (600) |
| Card H3 | 24px / 1.5rem | Semibold (600) |
| Body | 18px / 1.125rem | Regular (400) |
| Small/Caption | 14px / 0.875rem | Medium (500) |

**Line height:** 1.5 for body, 1.2 for headings

---

## Layout Structure

### 1. Navigation (Sticky)
```
┌────────────────────────────────────────────────────────┐
│  [Logo]                    How it Works  Pricing  [CTA]│
└────────────────────────────────────────────────────────┘
```
- Minimal links
- CTA button in nav
- Transparent on hero, solid on scroll

### 2. Hero Section
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│            AI That Makes the Calls                     │  <- Main headline
│               So You Don't Have To                     │
│                                                        │
│     We call hundreds of businesses, ask your           │  <- Subheadline
│     questions, and deliver structured data.            │
│                                                        │
│        [Get Started - Free Pilot]                      │  <- Primary CTA
│           See how it works ↓                           │  <- Secondary
│                                                        │
│    ┌─────────────────────────────────────────────┐    │
│    │                                             │    │  <- Product preview
│    │    [Mockup of Excel results / Dashboard]    │    │     or abstract visual
│    │                                             │    │
│    └─────────────────────────────────────────────┘    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 3. Social Proof Bar
```
┌────────────────────────────────────────────────────────┐
│  "10,000+ calls made"  •  "98% data accuracy"  •  "50+ │
│   businesses served"                                   │
└────────────────────────────────────────────────────────┘
```

### 4. How It Works (3 Steps)
```
┌────────────────────────────────────────────────────────┐
│                   How It Works                         │
│                                                        │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐       │
│   │    📋    │    │    🤖    │    │    📊    │       │
│   │          │    │          │    │          │       │
│   │  Upload  │ →  │ We Call  │ →  │ Get Data │       │
│   │  Your    │    │ Using    │    │ In Excel │       │
│   │  List    │    │   AI     │    │ + Audio  │       │
│   └──────────┘    └──────────┘    └──────────┘       │
│                                                        │
│   Give us a list     Our AI calls    Receive structured│
│   or we scrape it    each number     data + recordings │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 5. Use Cases / Who It's For
```
┌────────────────────────────────────────────────────────┐
│              Built for Data-Driven Teams               │
│                                                        │
│   ┌─────────────────┐  ┌─────────────────┐            │
│   │ 🏥 Healthcare   │  │ 👥 Recruitment  │            │
│   │                 │  │                 │            │
│   │ Verify provider │  │ Screen candidates│           │
│   │ networks, check │  │ at scale, qualify│           │
│   │ availability    │  │ leads faster    │            │
│   └─────────────────┘  └─────────────────┘            │
│                                                        │
│   ┌─────────────────┐  ┌─────────────────┐            │
│   │ 🏠 Property     │  │ 📊 Research     │            │
│   │                 │  │                 │            │
│   │ Verify listings,│  │ Price surveys,  │            │
│   │ check rental    │  │ competitor intel│            │
│   │ availability    │  │ at scale        │            │
│   └─────────────────┘  └─────────────────┘            │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 6. Features / Benefits
```
┌────────────────────────────────────────────────────────┐
│                  Why Choose Us                         │
│                                                        │
│   ✓ Natural AI Conversations                          │
│     Our AI handles follow-ups, IVR systems, and       │
│     complex dialogues naturally                        │
│                                                        │
│   ✓ Structured Data Output                            │
│     Not just transcripts - actual usable data in      │
│     Excel with the fields you need                    │
│                                                        │
│   ✓ Full Recordings Included                          │
│     Every call recorded for QA and compliance         │
│                                                        │
│   ✓ Local South African Numbers                       │
│     Higher answer rates with local caller ID          │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 7. Pricing
```
┌────────────────────────────────────────────────────────┐
│                Simple, Transparent Pricing             │
│                                                        │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐     │
│   │  STARTER   │  │   GROWTH   │  │    PRO     │     │
│   │            │  │  ⭐ Popular│  │            │     │
│   │  R1,500    │  │  R3,500    │  │  R8,000    │     │
│   │  /month    │  │  /month    │  │  /month    │     │
│   │            │  │            │  │            │     │
│   │  100 calls │  │  300 calls │  │ 1000 calls │     │
│   │  1 project │  │  3 projects│  │ Unlimited  │     │
│   │  Email     │  │  Priority  │  │ Dedicated  │     │
│   │  support   │  │  support   │  │ manager    │     │
│   │            │  │            │  │            │     │
│   │ [Get Started│ │[Get Started]│ │[Contact Us]│     │
│   └────────────┘  └────────────┘  └────────────┘     │
│                                                        │
│          Need more? Let's talk enterprise →           │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 8. Testimonial / Case Study
```
┌────────────────────────────────────────────────────────┐
│   ┌─────────────────────────────────────────────────┐ │
│   │                                                 │ │
│   │  "Saved us 40 hours of manual calling in one   │ │
│   │   week. The data quality was better than our   │ │
│   │   internal team could achieve."                │ │
│   │                                                 │ │
│   │   — Operations Manager, Healthcare Company     │ │
│   │                                                 │ │
│   └─────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### 9. FAQ Section
```
┌────────────────────────────────────────────────────────┐
│                 Frequently Asked Questions             │
│                                                        │
│   ▼ How accurate is the data extraction?              │
│     We achieve 95%+ accuracy using AI analysis...     │
│                                                        │
│   ▶ What countries do you support?                    │
│   ▶ Can I customize the questions?                    │
│   ▶ How long does a project take?                     │
│   ▶ Is my data secure?                                │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 10. Final CTA
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│            Ready to Scale Your Outreach?               │
│                                                        │
│     Start with a free pilot - 50 calls on us          │
│                                                        │
│              [Start Free Pilot]                        │
│                                                        │
│        Or chat with us on WhatsApp →                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 11. Footer
```
┌────────────────────────────────────────────────────────┐
│  [Logo]                                                │
│                                                        │
│  Product        Company        Contact                 │
│  How it Works   About          hello@brand.co.za      │
│  Pricing        Privacy        WhatsApp               │
│  FAQ            Terms          LinkedIn               │
│                                                        │
│  © 2026 BrandName. Made in Cape Town 🇿🇦              │
└────────────────────────────────────────────────────────┘
```

---

## Visual Elements

### Hero Visual Options
1. **Abstract gradient shapes** - Modern, doesn't need updating
2. **Mockup of results Excel** - Shows the product clearly
3. **Simple animation** - Phone icon with sound waves

### Icons
- Use Lucide React or Heroicons
- Consistent stroke width
- Teal accent color

### Spacing
- Section padding: 80px top/bottom (desktop), 48px (mobile)
- Max content width: 1200px
- Card padding: 24px-32px

---

## Interactions

- **Smooth scroll** to sections
- **Hover effects** on buttons (slight lift + shadow)
- **FAQ accordion** with smooth expand
- **Subtle entrance animations** on scroll (fade up)

---

## Mobile Considerations

- Stack all cards vertically
- Hamburger menu for nav
- Larger touch targets (min 44px)
- Reduce hero text size to 36px
- Full-width CTAs

---

## Brand Name Ideas (if needed)

- **CallScale** - Simple, describes what it does
- **VoiceData** - Clear B2B feel
- **RingInsight** - Combines calling + data
- **Callify** - Modern, SaaS-y
- **DataDialer** - Direct and clear
