"""
Transcribe all MP3s in recordings/ with Gemini, build recordings_manifest.json,
then run: python analyze_recordings_to_excel.py --from-recordings

Uses GEMINI_API_KEY from .env. No Whisper needed.

Usage:
  python transcribe_recordings.py
  python transcribe_recordings.py --recordings-dir plan/recordings
  python analyze_recordings_to_excel.py --from-recordings --output gyni_results.xlsx
"""
import argparse
import base64
import json
import os
import re
import sys
import time

RECORDINGS_FOLDER = "recordings"
MANIFEST_FILE = "recordings_manifest.json"
GYNECOLOGISTS_JSON = "gynecologists.json"
# Inline audio limit ~20MB; stay under to leave room for prompt
MAX_INLINE_BYTES = 18 * 1024 * 1024
GEMINI_MODEL = "gemini-2.0-flash"


def practice_name_from_filename(filename: str) -> str:
    """e.g. 'Blouberg Doctors_019c09b4.mp3' -> 'Blouberg Doctors'"""
    base = os.path.splitext(filename)[0]
    parts = base.rsplit("_", 1)
    if len(parts) == 2 and len(parts[1]) == 8 and re.match(r"^[0-9a-f]+$", parts[1], re.I):
        base = parts[0]
    return base.replace("_", " ").strip()


def load_gynecologists(path: str = GYNECOLOGISTS_JSON) -> list:
    if not os.path.isfile(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_name(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def match_practice(practice_name: str, practices: list) -> dict | None:
    if not practices:
        return None
    norm = normalize_name(practice_name)
    if not norm:
        return None
    for p in practices:
        n = normalize_name(p.get("name", ""))
        if norm in n or n in norm:
            return p
    words = [w for w in norm.split() if len(w) > 1]
    for p in practices:
        n = normalize_name(p.get("name", ""))
        if any(w in n for w in words):
            return p
    return None


def transcribe_mp3_gemini(filepath: str, gemini_key: str) -> str:
    """Send MP3 to Gemini and return transcript text."""
    with open(filepath, "rb") as f:
        data = f.read()
    if len(data) > MAX_INLINE_BYTES:
        return _transcribe_via_files_api(filepath, data, gemini_key)
    b64 = base64.standard_b64encode(data).decode("ascii")
    import requests
    prompt = (
        "Transcribe this phone call exactly. Return only the full transcript as plain text. "
        "Do not add timestamps, speaker labels, or summary. Just the words spoken."
    )
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inlineData": {"mimeType": "audio/mpeg", "data": b64}},
            ]
        }],
        "generationConfig": {"temperature": 0},
    }
    resp = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={gemini_key}",
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=120,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Gemini {resp.status_code}: {resp.text[:500]}")
    text = (resp.json().get("candidates") or [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
    return (text or "").strip()


def _transcribe_via_files_api(filepath: str, data: bytes, gemini_key: str) -> str:
    """Large files (>18MB): skip inline; return empty so row still gets created."""
    print(f"  Warning: file >{MAX_INLINE_BYTES // (1024*1024)}MB, skipping transcription.")
    return ""


def main():
    from dotenv import load_dotenv
    load_dotenv()
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    if not gemini_key:
        print("Set GEMINI_API_KEY in .env")
        sys.exit(1)

    ap = argparse.ArgumentParser(description="Transcribe recordings/*.mp3 with Gemini and build manifest")
    ap.add_argument("--recordings-dir", "-d", default=RECORDINGS_FOLDER, help="Folder containing .mp3 files")
    ap.add_argument("--manifest", "-m", default=MANIFEST_FILE, help="Output manifest JSON path")
    args = ap.parse_args()

    rec_dir = args.recordings_dir
    if not os.path.isdir(rec_dir):
        print(f"Folder not found: {rec_dir}")
        sys.exit(1)

    mp3s = sorted([f for f in os.listdir(rec_dir) if f.lower().endswith(".mp3")])
    if not mp3s:
        print(f"No .mp3 files in {rec_dir}")
        sys.exit(1)

    practices = load_gynecologists()
    print(f"Found {len(mp3s)} MP3s, using Gemini to transcribe.")
    print(f"Practice names matched from {GYNECOLOGISTS_JSON} where possible.\n")

    manifest = []
    for i, filename in enumerate(mp3s, 1):
        practice_name = practice_name_from_filename(filename)
        matched = match_practice(practice_name, practices) if practices else None
        phone = (matched.get("phone") or matched.get("international_phone") or "") if matched else ""
        address = (matched.get("address") or "") if matched else ""

        mp3_path = os.path.join(rec_dir, filename)
        txt_name = os.path.splitext(filename)[0] + ".txt"
        txt_path = os.path.join(rec_dir, txt_name)

        if os.path.isfile(txt_path):
            print(f"[{i}/{len(mp3s)}] Using existing transcript: {txt_name}")
            with open(txt_path, "r", encoding="utf-8", errors="replace") as f:
                text = f.read()
        else:
            print(f"[{i}/{len(mp3s)}] Transcribing with Gemini: {filename}")
            try:
                text = transcribe_mp3_gemini(mp3_path, gemini_key)
                with open(txt_path, "w", encoding="utf-8") as f:
                    f.write(text)
            except Exception as e:
                print(f"  Error: {e}")
                text = ""
            time.sleep(1)
        manifest.append({
            "transcript_file": txt_name,
            "practice_name": practice_name,
            "phone": phone,
            "address": address,
            "recording_file": filename,
        })

    manifest_path = args.manifest
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"\nWrote {manifest_path} with {len(manifest)} entries.")
    print("Run: python analyze_recordings_to_excel.py --from-recordings "
          f"--recordings-dir {rec_dir} --manifest {manifest_path} --output gyni_results.xlsx")


if __name__ == "__main__":
    main()
