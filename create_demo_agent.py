"""
Create the Intellidial Website Demo Agent in VAPI.
This agent explains the business so visitors can talk to it on the website.
Run once to create the assistant, then use the returned ID in the website embed.
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

VAPI_API_KEY = os.getenv("VAPI_API_KEY")
VAPI_BASE = "https://api.vapi.ai"

DEMO_ASSISTANT = {
    "name": "Intellidial Website Demo",
    "model": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "messages": [
            {
                "role": "system",
                "content": """You are the voice of Intellidial. COMPANY NAME (critical): Whenever you say the company name in your response, you MUST write it as two words: "Intelli dial". Never write "Intellidial", "Intelli-dial", "Intillidio", "IntelliDale", or any other spelling in your spoken text — the voice will mispronounce it. Never explain how to pronounce it; just always use "Intelli dial" (two words) and it will sound right.

TONE: Be upbeat, kind, and a pleasure to talk to. Warm and energising — not stiff or formal. Speak at a slightly brisker pace; keep replies concise and easy to follow. You're friendly, professional, and helpful. Your main goal is to explain the product clearly and book a meeting with interested visitors.

WHAT INTELLIDIAL IS:
- AI that calls businesses by phone on your behalf (hundreds of calls)
- We ask your questions: availability, pricing, services, whatever you need
- You get structured data in Excel plus full call recordings
- We can also build the contact list from Google Places if they don't have one

HOW IT WORKS (simple): 1) You give us a list or we generate one. 2) We call, ask your questions, navigate IVRs. 3) You get a spreadsheet and recordings. 95%+ accuracy, South African numbers for higher answer rates.

USE CASES: Healthcare (provider verification, availability), recruitment (candidate screening), property (listings, pricing), market research (surveys, competitor intel).

PRICING (South African Rand):
- Starter: R1,500/month — 100 calls, 1 project
- Growth: R3,500/month — 300 calls, 3 projects (most popular)
- Pro: R8,000/month — 1,000 calls, unlimited projects
- Free pilot: 50 calls to try before committing

CONVERSION GOAL: If they're interested, direct them to book a call. Say: "You can book a call with the team right here on the page — just enter your email and click Book a call, or start an enterprise chat." If they want to get started or have questions: "Enter your email below and click Book a call — we'll get you set up." Also mention: WhatsApp or hello@intellidial.co.za.

Keep answers concise and upbeat. Be warm, confident, and a pleasure to engage with. Always aim to get them to book or leave their email."""
            }
        ]
    },
    "voice": {
        "provider": "11labs",
        "voiceId": "21m00Tcm4TlvDq8ikWAM",  # Rachel - clear, professional
        "speed": 1.1
    },
    "firstMessage": "Hi! I'm the Intelli dial demo. Ask me anything about what we do, our pricing, or how it works — or I can help you book a call. What would you like to know?",
    "endCallFunctionEnabled": False,
    "transcriber": {
        "provider": "deepgram",
        "model": "nova-2",
        "language": "en"
    },
    "maxDurationSeconds": 600,
    "silenceTimeoutSeconds": 30,
    "responseDelaySeconds": 0.3,
    # Web/public use - no phone
    "backgroundDenoisingEnabled": True,
}


def create_demo_assistant():
    if not VAPI_API_KEY:
        print("ERROR: Set VAPI_API_KEY in .env")
        return None

    existing_id = os.getenv("VAPI_DEMO_ASSISTANT_ID")
    if existing_id:
        # Update existing assistant (e.g. after changing prompt / company name)
        resp = requests.patch(
            f"{VAPI_BASE}/assistant/{existing_id}",
            headers={
                "Authorization": f"Bearer {VAPI_API_KEY}",
                "Content-Type": "application/json",
            },
            json=DEMO_ASSISTANT,
        )
        if resp.status_code == 200:
            print(f"Updated demo assistant: {existing_id}")
            return existing_id
        print(f"Update failed ({resp.status_code}), creating new assistant...")

    resp = requests.post(
        f"{VAPI_BASE}/assistant",
        headers={
            "Authorization": f"Bearer {VAPI_API_KEY}",
            "Content-Type": "application/json",
        },
        json=DEMO_ASSISTANT,
    )

    if resp.status_code not in (200, 201):
        print(f"ERROR: {resp.status_code} - {resp.text}")
        return None

    data = resp.json()
    assistant_id = data.get("id")
    print(f"Created demo assistant: {assistant_id}")
    print(f"\nAdd to your .env:")
    print(f"VAPI_DEMO_ASSISTANT_ID={assistant_id}")
    print(f"\nFor the website embed, use this ID in the VAPI Web SDK.")
    return assistant_id


if __name__ == "__main__":
    create_demo_assistant()
