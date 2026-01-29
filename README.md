# Intellidial

AI-powered phone research: scrape contact lists, call businesses with voice AI, and get structured data plus recordings. This repo contains the **calling pipeline** (Python) and the **Intellidial marketing site** (Next.js) with a live voice demo.

---

## What’s in this repo

| Path | Description |
|------|-------------|
| **`1_scrape_numbers.py`** | Scrape business phone numbers via Google Places API (e.g. gynecologists in a region). |
| **`2_vapi_caller.py`** | Create a VAPI assistant, place outbound calls (Twilio), download recordings, analyse transcripts with Gemini, write results to Excel. |
| **`create_demo_agent.py`** | Create/update the VAPI “website demo” assistant used by the landing page voice widget. |
| **`intellidial/`** | Next.js landing page for Intellidial: hero, features, voice demo (VAPI Web SDK), pricing, use cases, email/book-a-call CTA. |
| **`production_plan/`** | Business and MVP docs: `BUSINESS_IDEAS.md`, `MVP_PLAN.md`, `GO_LIVE_PLAN.md`, `LANDING_PAGE_DESIGN.md`. |
| **`config.py`** | Loads env vars for the Python scripts (uses `python-dotenv` from `.env`). |

---

## Prerequisites

- **Python 3.9+** (for the calling pipeline and demo agent).
- **Node.js 18+** (for the Intellidial site).
- Accounts and keys:
  - [Google Cloud](https://console.cloud.google.com/) – Places API key (for scraping).
  - [VAPI](https://vapi.ai) – API key (secret), Public key (for web demo), optional Phone Number ID (for outbound).
  - [Twilio](https://twilio.com) – account SID, auth token, and a number (for outbound calls).
  - [Google AI](https://aistudio.google.com/apikey) – Gemini API key (for transcript analysis).
- For the **web voice demo** only: VAPI Public Key + Demo Assistant ID (see below).

---

## Environment variables

Create a **`.env`** file in the **`doctor`** folder (same folder as `config.py` and the Python scripts). The Next.js app in `intellidial/` is configured to use this same `.env` via `next.config.ts`.

```env
# Google Places (scraping)
GOOGLE_PLACES_API_KEY=your_google_places_api_key

# VAPI (calling + web demo)
VAPI_API_KEY=your_vapi_secret_key
VAPI_PUBLIC_KEY=your_vapi_public_key
VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id

# Optional: Google Sheets (if you use it)
GOOGLE_SHEETS_ID=your_sheet_id

# Twilio (outbound calls)
twilio_account_sid=your_twilio_sid
twilio_auth_token=your_twilio_token

# Gemini (transcript analysis)
GEMINI_API_KEY=your_gemini_key

# Web demo (after running create_demo_agent.py)
VAPI_DEMO_ASSISTANT_ID=your_demo_assistant_id
```

- **VAPI_PUBLIC_KEY**: From VAPI Dashboard → API Keys → Public key (used by the browser for the voice demo).
- **VAPI_DEMO_ASSISTANT_ID**: Printed when you run `create_demo_agent.py`; add it to `.env` so the site can start the demo assistant.

---

## Quick start

### 1. Python pipeline (scrape → call → Excel)

```bash
cd doctor
pip install -r requirements.txt
```

1. **Scrape numbers** (e.g. gynecologists in configurable area):
   ```bash
   python 1_scrape_numbers.py
   ```
   Uses `config.py` (and thus `.env`) for `GOOGLE_PLACES_API_KEY` and search location/radius. Output is used as input for the caller.

2. **Run outbound calls** (VAPI + Twilio), download recordings, analyse with Gemini, write Excel:
   ```bash
   python 2_vapi_caller.py
   ```
   Uses `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, Twilio env vars, and `GEMINI_API_KEY`. Tracks called numbers (e.g. in `called_numbers.json`), writes results to an Excel file and saves recordings under `recordings/` (if configured).

3. **Create or update the website demo assistant** (so the landing page voice demo works):
   ```bash
   python create_demo_agent.py
   ```
   Uses `VAPI_API_KEY`. If `VAPI_DEMO_ASSISTANT_ID` is already in `.env`, it **updates** that assistant; otherwise it creates a new one. Copy the printed assistant ID into `.env` as `VAPI_DEMO_ASSISTANT_ID`.

### 2. Intellidial website (landing page + voice demo)

```bash
cd doctor/intellidial
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The site loads `VAPI_DEMO_ASSISTANT_ID` and `VAPI_PUBLIC_KEY` from the parent `doctor/.env` via the Next.js API route `/api/demo-assistant`. “Talk to our AI” starts the VAPI Web SDK and connects to the demo assistant created by `create_demo_agent.py`.

---

## Repo structure (summary)

```
doctor/
├── .env                    # Not committed; add from template above
├── .gitignore
├── README.md               # This file
├── config.py               # Env and config for Python scripts
├── requirements.txt        # Python deps
├── 1_scrape_numbers.py     # Google Places scraping
├── 2_vapi_caller.py        # VAPI outbound calls, recordings, Gemini, Excel
├── create_demo_agent.py    # VAPI demo assistant for website
├── intellidial/            # Next.js landing page + voice demo
│   ├── src/app/
│   │   ├── api/demo-assistant/   # Returns assistant ID + public key for front end
│   │   ├── components/VoiceDemo.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── next.config.ts      # Loads doctor/.env
│   └── package.json
├── production_plan/        # Business and MVP documentation
└── recordings/             # Call recordings (gitignored if present)
```

---

## Tech stack

| Part | Technology |
|------|------------|
| Scraping | Google Places API (New) Text Search |
| Voice AI | VAPI (assistants, outbound, web SDK) |
| Telephony | Twilio (South African number for outbound) |
| Transcript analysis | Google Gemini |
| Landing page | Next.js, Tailwind CSS, VAPI Web SDK (`@vapi-ai/web`) |
| Data out | Excel (openpyxl), optional Google Sheets |

---

## Configuration

- **Search area** (for `1_scrape_numbers.py`): edit `config.py` — `SEARCH_LOCATION` (lat/lng) and `SEARCH_RADIUS_METERS`.
- **Call script / behaviour**: edit the `ASSISTANT_CONFIG` in `2_vapi_caller.py` (prompt, first message, timeouts).
- **Website demo agent**: edit `DEMO_ASSISTANT` in `create_demo_agent.py` (name, prompt, first message, voice, speed). Then run `python create_demo_agent.py` again to update the assistant (if `VAPI_DEMO_ASSISTANT_ID` is set) or create a new one.

---

## Production / business docs

See **`production_plan/`**:

- **`MVP_PLAN.md`** – MVP scope, tech stack, phased plan.
- **`BUSINESS_IDEAS.md`** – Target markets and pricing ideas.
- **`GO_LIVE_PLAN.md`** – Go-live checklist and scaling.
- **`LANDING_PAGE_DESIGN.md`** – Design notes for the Intellidial site.

---

## License and contact

Proprietary. Contact: hello@intellidial.co.za.
