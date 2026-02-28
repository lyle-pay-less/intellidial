# Voice Demo Setup

Intellidial uses the **same .env** as the doctor project. Add these to **doctor** `.env`:

1. **VAPI_DEMO_ASSISTANT_ID** – Run once: `python create_demo_agent.py` (from doctor folder). Paste the printed ID into doctor `.env`.

2. **VAPI_PUBLIC_KEY** – From [VAPI Dashboard](https://dashboard.vapi.ai) → **API Keys** → copy the **Public Key** (not the secret key you use for the doctor scripts).

3. **VAPI_DEMO_DEALERS_ASSISTANT_ID** (optional) – If set, the `/dealers` page voice demo uses this assistant instead of the default. Use a dealer-focused assistant (60-second callback, test drives, AutoTrader). If unset, `/dealers` uses the same assistant as the homepage but with dealer-specific UI copy (connecting messages, in-call hint).

Example in doctor `.env`:

```env
VAPI_DEMO_ASSISTANT_ID=47328f09-ddde-4084-adb5-55b37188c785
VAPI_PUBLIC_KEY=your_public_key_from_dashboard
# VAPI_DEMO_DEALERS_ASSISTANT_ID=optional_dealer_assistant_id
```

Restart `npm run dev` in intellidial.
