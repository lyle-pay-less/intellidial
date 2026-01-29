# Voice Demo Setup

Intellidial uses the **same .env** as the doctor project. Add these to **doctor** `.env`:

1. **VAPI_DEMO_ASSISTANT_ID** – Run once: `python create_demo_agent.py` (from doctor folder). Paste the printed ID into doctor `.env`.

2. **VAPI_PUBLIC_KEY** – From [VAPI Dashboard](https://dashboard.vapi.ai) → **API Keys** → copy the **Public Key** (not the secret key you use for the doctor scripts).

Example in doctor `.env`:

```env
VAPI_DEMO_ASSISTANT_ID=47328f09-ddde-4084-adb5-55b37188c785
VAPI_PUBLIC_KEY=your_public_key_from_dashboard
```

Restart `npm run dev` in intellidial. No `.env.local` or `NEXT_PUBLIC_` needed.
