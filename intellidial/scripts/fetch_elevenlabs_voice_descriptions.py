#!/usr/bin/env python3
"""
Fetch all ElevenLabs voices and write name, voice_id, and description to a file.
Run from repo root (doctor): python intellidial/scripts/fetch_elevenlabs_voice_descriptions.py
Requires ELEVEN_LABS_API_KEY in environment or in doctor/.env
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
SCRIPT_DIR = Path(__file__).resolve().parent
OUT_PATH = SCRIPT_DIR.parent / "docs" / "ELEVENLABS_VOICE_DESCRIPTIONS.md"

# The 10 voices used in this app (from src/lib/vapi/client.ts ELEVENLABS_VOICE_IDS — SA + default).
VOICE_IDS_IN_APP = frozenset({
    "L5zW3PqYZoWAeS4J1qMV",   # Dr. Samuel Rosso (default)
    "BcpjRWrYhDBHmOnetmBl",   # Thandi
    "j32TutubsmjTPYaEhg5T",   # Thabiso
    "zY7DEQPsInIw5phF8qoH",   # Musole
    "x52Gqgso2pdbdr7KngsJ",   # Gawain
    "zd1c6qDiwPV3b24VZtor",   # Crystal
    "0z8S749Xe6jLCD34QXl1",   # Emma Lilliana
    "xeBpkkuzgxa0IwKt7NTP",   # Hannah
    "atf1ppeJGCYFBlCLZ26e",   # Cheyenne
    "ZSpZE1MGLI5tiZBKkT91",   # Ryan
})


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


def escape_md_cell(s: str) -> str:
    return (s or "").replace("|", "\\|").replace("\n", " ")


def main():
    load_env()
    api_key = (os.environ.get("ELEVEN_LABS_API_KEY") or "").strip()
    if not api_key:
        print("Set ELEVEN_LABS_API_KEY in your environment or in .env", file=sys.stderr)
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

    for v in voices:
        if v.get("id") and not v.get("voice_id"):
            v["voice_id"] = v["id"]

    # Only include the 10 voices used in this app
    vid_key = "voice_id"
    filtered = [v for v in voices if (v.get(vid_key) or v.get("id")) in VOICE_IDS_IN_APP]

    lines = [
        "# ElevenLabs voice descriptions",
        "",
        "Fetched from ElevenLabs API. Run from repo root:",
        "```",
        "python intellidial/scripts/fetch_elevenlabs_voice_descriptions.py",
        "```",
        "",
        "Requires `ELEVEN_LABS_API_KEY` in your environment or in `.env`.",
        "",
        "Only the 10 voices used in this app are included.",
        "",
        "| Voice name | voice_id | Description | Labels |",
        "|------------|----------|-------------|--------|",
    ]
    for v in filtered:
        name = escape_md_cell(v.get("name") or "(no name)")[:80]
        voice_id = escape_md_cell(v.get("voice_id") or v.get("id") or "")
        desc = escape_md_cell(v.get("description") or "")[:200]
        labels = v.get("labels")
        if isinstance(labels, dict):
            labels_str = "; ".join(f"{k}: {v}" for k, v in labels.items())
        else:
            labels_str = ""
        labels_str = escape_md_cell(labels_str)[:100]
        lines.append(f"| {name} | {voice_id} | {desc} | {labels_str} |")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {len(filtered)} voices (app voices only) to {OUT_PATH}")


if __name__ == "__main__":
    main()
