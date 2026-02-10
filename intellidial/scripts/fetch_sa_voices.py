#!/usr/bin/env python3
"""
Fetch all ElevenLabs voices and print only South African ones with their voice_id.
Run from repo root (doctor): python intellidial/scripts/fetch_sa_voices.py
Requires ELEVEN_LABS_API_KEY in environment, or in doctor/.env
"""

import os
import re
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("Install requests: pip install requests", file=sys.stderr)
    sys.exit(1)

ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
SA_PATTERN = re.compile(r"south\s*african|south africa", re.I)


def load_env():
    if os.environ.get("ELEVEN_LABS_API_KEY"):
        return
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            m = re.match(r"^\s*ELEVEN_LABS_API_KEY\s*=\s*(.+?)\s*$", line)
            if m:
                val = m.group(1).strip().strip("'\"")
                os.environ["ELEVEN_LABS_API_KEY"] = val
                break


def has_south_african(voice: dict) -> bool:
    if SA_PATTERN.search(voice.get("name") or ""):
        return True
    if SA_PATTERN.search(voice.get("description") or ""):
        return True
    labels = voice.get("labels")
    if labels and isinstance(labels, dict):
        if SA_PATTERN.search(str(labels)):
            return True
    return False


def main():
    load_env()
    api_key = os.environ.get("ELEVEN_LABS_API_KEY", "").strip()
    if not api_key:
        print("Set ELEVEN_LABS_API_KEY in your environment or in doctor/.env", file=sys.stderr)
        sys.exit(1)

    r = requests.get(
        "https://api.elevenlabs.io/v1/voices",
        headers={"xi-api-key": api_key},
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    voices = data.get("voices", data) if isinstance(data, dict) else data
    if not isinstance(voices, list):
        voices = []

    # API may use "id" instead of "voice_id"; normalize
    for v in voices:
        if "voice_id" not in v and "id" in v:
            v["voice_id"] = v["id"]

    # Debug: show any voice whose name/description/labels contain "south" or "africa"
    loose = re.compile(r"south|africa", re.I)
    sa = []
    for v in voices:
        if has_south_african(v):
            sa.append(v)
        else:
            # Fallback: match "south" or "africa" in description/name (broader)
            raw = str(v.get("name", "")) + " " + str(v.get("description", "")) + " " + str(v.get("labels", ""))
            if loose.search(raw):
                sa.append(v)
    sa = list({id(v): v for v in sa}.values())
    print(f"Total voices from API: {len(voices)}")
    if voices and len(sa) == 0:
        print("Sample voice keys:", list(voices[0].keys()))
        print("All voice names:", [v.get("name") for v in voices])
    print("\nSouth African (or South Africa) voices:\n")
    for v in sa:
        vid = v.get("voice_id") or v.get("id", "")
        print(f"{vid}  {v.get('name', '(no name)')}")
    print(f"\nTotal: {len(sa)} voices. Copy the voice_id values into intellidial/src/lib/vapi/client.ts ELEVENLABS_VOICE_IDS.")


if __name__ == "__main__":
    main()
