# Intellidial

AI-powered phone research platform: call businesses with voice AI, get structured data and recordings. Complete solution for high-volume phone outreach with automated calling, transcript analysis, and data extraction.

**Live:** [https://intellidial.co.za](https://intellidial.co.za)

---

## What's in this repo

| Path | Description |
|------|-------------|
| **`intellidial/`** | Next.js app: marketing site, live voice demo, and back office (dashboard, projects, contacts, team, settings). Production-ready with Firebase Auth, Firestore, VAPI integration, and Cloud Run deployment. |
| **`intellidial/docs/`** | Documentation: completion roadmap, backlog items, integration plans, setup guides. |
| **`cloudbuild.yaml`** | Google Cloud Build configuration for CI/CD deployment to Cloud Run. |
| **`leads_gen/`** | Lead generation scripts and documentation (separate tooling). |
| **`production_plan/`** | Business planning and MVP documentation. |

---

## Features

### ✅ Implemented

- **Authentication & Organizations** - Firebase Auth with organization-based multi-tenancy
- **Projects & Campaigns** - Create projects, configure capture fields, agent instructions
- **Contact Management** - Upload CSV, paste numbers, manual entry with validation
- **AI Calling** - VAPI integration for real phone calls with structured output
- **Call Results** - Transcripts, recordings, captured data with CSV export
- **Dashboard** - KPIs, charts, project overview, call statistics
- **Team Management** - Invite team members, role-based access (Owner/Admin/Operator/Viewer)
- **Email Notifications** - Resend integration for team invitations
- **HubSpot Integration** - OAuth-based CRM sync (contacts, properties)
- **Usage Limits** - Per-organization call limits with enforcement
- **Voice Demo** - Live AI voice widget on landing page

### 🚧 In Progress / Planned

- Notifications system (in-app + email)
- Per-org phone numbers (BYON support)
- Real billing integration (PayFast/PayGate)
- Back Office Assistant (self-healing system)

---

## Prerequisites

- **Node.js 20+**
- **npm** or **yarn**
- **Firebase project** (for authentication and Firestore)
- **VAPI account** (for AI calling)
- **Google Cloud project** (for deployment)
- **Resend account** (for email sending)

---

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/lyle-pay-less/intellidial.git
cd intellidial
npm install
```

### 2. Environment Variables

Create a **`.env`** file in the **repo root** (parent of `intellidial/`). The Next.js app loads it via `intellidial/next.config.ts`.

**Required variables:**

```env
# Firebase (Client - Browser)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# Firebase (Admin - Server)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n

# VAPI (AI Calling)
VAPI_API_KEY=your_vapi_api_key
VAPI_PUBLIC_KEY=your_vapi_public_key
VAPI_PHONE_NUMBER_ID=your_phone_number_id
VAPI_DEMO_ASSISTANT_ID=your_demo_assistant_id

# Google Gemini (Transcript Analysis)
GEMINI_API_KEY=your_gemini_api_key

# Resend (Email)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=Intellidial <noreply@intellidial.co.za>

# HubSpot (CRM Integration - Optional)
HUBSPOT_CLIENT_ID=your_hubspot_client_id
HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret
HUBSPOT_REDIRECT_URI=https://intellidial.co.za/dashboard/settings/integrations/hubspot/callback

# App Configuration
NEXT_PUBLIC_APP_URL=https://intellidial.co.za
NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/growth-intellidial/30min

# Google Places API (Optional - for lead generation)
GOOGLE_PLACES_API_KEY=your_google_places_api_key

# Integration Encryption (Required for HubSpot custom credentials)
INTEGRATION_ENCRYPTION_KEY=your_64_character_hex_key
```

**Generate encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Run Development Server

```bash
cd intellidial
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

- **Landing page**: Hero, features, pricing, "Talk to our AI" voice demo, contact/book-a-call
- **Back office**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard) - Dashboard, projects, team, settings

---

## Project Structure

```
intellidial/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── dashboard/            # Back office
│   │   │   ├── page.tsx          # Dashboard home (KPIs, charts)
│   │   │   ├── projects/         # Project list + detail
│   │   │   │   └── [id]/         # Project detail (contacts, instructions, results)
│   │   │   ├── team/             # Team management
│   │   │   └── settings/         # Settings, integrations
│   │   ├── api/                  # API routes
│   │   │   ├── projects/         # Project CRUD, calling
│   │   │   ├── team/             # Team invitations
│   │   │   ├── webhooks/         # VAPI webhooks
│   │   │   └── ...
│   │   └── components/           # React components
│   ├── lib/
│   │   ├── firebase/             # Firebase Auth & Admin
│   │   ├── data/                 # Firestore data layer
│   │   ├── vapi/                 # VAPI client
│   │   ├── email/                # Email sending (Resend)
│   │   └── ...
│   └── ...
├── docs/                          # Documentation
├── Dockerfile                     # Production Docker image
├── next.config.ts                 # Next.js config
└── package.json
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Framework** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 4 |
| **Authentication** | Firebase Auth |
| **Database** | Firestore (Firebase) |
| **Voice AI** | VAPI (`@vapi-ai/web`) |
| **AI Analysis** | Google Gemini (`@google/genai`) |
| **Email** | Resend |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Deployment** | Google Cloud Run (via Cloud Build) |

---

## Deployment

### Google Cloud Build (CI/CD)

The project uses Google Cloud Build for automatic deployment on push to `main`.

**Setup:**
1. Enable Cloud Build API in Google Cloud Console
2. Connect GitHub repository to Cloud Build
3. Create trigger pointing to `cloudbuild.yaml`
4. Ensure all secrets are in Google Secret Manager (see `DEPLOY_SECRETS.md`)

**Build Process:**
1. Builds Docker image from `intellidial/Dockerfile`
2. Pushes to Container Registry
3. Deploys to Cloud Run (europe-west2 - London)

**Secrets:** All runtime secrets are loaded from Google Secret Manager via `--set-secrets` in `cloudbuild.yaml`.

---

## Development

### Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Key Workflows

1. **Create Project** → Configure capture fields → Add contacts → Set agent instructions → Run calls
2. **Team Invitations** → Send invite → User accepts → Role-based access
3. **Call Flow** → Initiate call via VAPI → Webhook receives results → Update contact status → Export data

### Environment Setup

- **Development**: Uses `.env` file in repo root
- **Production**: Secrets loaded from Google Secret Manager
- **Build-time**: `NEXT_PUBLIC_*` vars embedded in client bundle
- **Runtime**: Server secrets loaded from environment/Secret Manager

---

## Documentation

- **[Completion Roadmap](./Intellidial/docs/COMPLETION_ROADMAP.md)** - What's done, what's remaining
- **[Backlog](./Intellidial/docs/backlog/)** - Planned features and tasks
- **[HubSpot Integration](./Intellidial/docs/HUBSOT_INTEGRATION_PLAN.md)** - CRM sync setup
- **[Email Setup](./Intellidial/docs/EMAIL_SETUP.md)** - Resend configuration
- **[Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)** - Production deployment guide
- **[Cloud Build Setup](./CLOUD_BUILD_SETUP.md)** - CI/CD configuration

---

## Use Cases

- **Healthcare & Medical Aids** - Provider verification, availability checks
- **Recruitment & HR** - Candidate screening, reference checks
- **Property & Real Estate** - Listing verification, availability
- **Market Research** - Price surveys, competitor intelligence
- **Debt Collection** - Balance confirmation, payment plans
- **Appointment Reminders** - Reduce no-shows

---

## License

Proprietary. All rights reserved.

---

## Contact

- **Website**: [https://intellidial.co.za](https://intellidial.co.za)
- **Email**: hello@intellidial.co.za
- **Book Demo**: [Calendly](https://calendly.com/growth-intellidial/30min)

---

## Status

**Current Version**: 0.1.0  
**Status**: Production-ready MVP (~90-95% complete)  
**Last Updated**: February 2026

**Core functionality**: ✅ Complete  
**Remaining**: Email delivery debugging, E2E validation, polish items (see [Completion Roadmap](./Intellidial/docs/COMPLETION_ROADMAP.md))
