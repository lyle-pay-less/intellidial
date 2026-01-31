"""
Analyze all recordings/transcripts and create the same Excel file (gyni_results.xlsx).

Inputs (use one):
  1. call_results.json  — from 2_vapi_caller.py (has transcript + practice). Rebuilds Excel from it;
     optionally re-runs Gemini analysis with --reanalyze.
  2. recordings/ + manifest — transcript files (.txt) and recordings_manifest.json listing
     practice_name, phone, address, transcript_file (and optional recording_file). Analyzes each
     with Gemini and writes Excel.

Usage:
  python analyze_recordings_to_excel.py
  python analyze_recordings_to_excel.py --reanalyze
  python analyze_recordings_to_excel.py --from-recordings
  python analyze_recordings_to_excel.py --call-results call_results.json --output my_results.xlsx
"""

import argparse
import json
import os
import time

# Reuse Excel setup and append from 2_vapi_caller
from openpyxl import Workbook, load_workbook

EXCEL_HEADERS = [
    "Practice Name",
    "Phone",
    "Address",
    "Gyni Available",
    "Ultrasound Available",
    "Consultation Price",
    "Earliest Availability",
    "Call Status",
    "Call Duration (s)",
    "Full Transcript",
    "Recording URL",
    "Local Recording File",
    "Called At",
]

RECORDINGS_FOLDER = "recordings"
DEFAULT_CALL_RESULTS = "call_results.json"
DEFAULT_EXCEL = "gyni_results.xlsx"
MANIFEST_FILE = "recordings_manifest.json"


def get_gemini_analysis(transcript: str, gemini_key: str) -> dict:
    """Run Gemini to extract has_gyni, has_ultrasound, price, availability."""
    result = {
        "has_gyni": "Unknown",
        "has_ultrasound": "Unknown",
        "price": "Unknown",
        "availability": "Unknown",
    }
    if not transcript or not gemini_key:
        return result

    try:
        prompt = """Analyze this phone call transcript and extract the following information.
Return ONLY a JSON object with these exact keys:
- has_gyni: "Yes", "No", or "Unknown"
- has_ultrasound: "Yes", "No", or "Unknown"
- price: The consultation price mentioned (e.g., "R2800") or "Unknown"
- availability: The earliest available appointment mentioned (e.g., "Wednesday 2pm", "Next Monday") or "Unknown"

Be thorough - look for any mention of prices, fees, costs, availability, appointments, gynecologist/gynaecologist availability.

Transcript:
""" + transcript

        import requests
        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0},
            },
            timeout=30,
        )

        if response.status_code == 200:
            content = response.json()["candidates"][0]["content"]["parts"][0]["text"]
            content = content.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            content = content.strip()
            parsed = json.loads(content)
            result["has_gyni"] = parsed.get("has_gyni", "Unknown")
            result["has_ultrasound"] = parsed.get("has_ultrasound", "Unknown")
            result["price"] = parsed.get("price", "Unknown")
            result["availability"] = parsed.get("availability", "Unknown")
        else:
            print(f"  Gemini error: {response.status_code}")
    except Exception as e:
        print(f"  Gemini error: {e}")
    return result


def setup_excel(path: str):
    """Create or overwrite Excel with headers."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Call Results"
    ws.append(EXCEL_HEADERS)
    wb.save(path)
    return wb, ws


def append_row(wb, ws, row: list, excel_path: str):
    """Append one row and save."""
    ws.append(row)
    wb.save(excel_path)


def result_to_row(result: dict, called_at: str | None = None) -> list:
    """Build Excel row from result dict (same shape as 2_vapi_caller append_to_excel)."""
    practice = result.get("practice") or {}
    if isinstance(practice, dict):
        name = practice.get("name", "")
        phone = practice.get("phone", "")
        address = practice.get("address", "")
    else:
        name = str(practice)
        phone = result.get("phone", "")
        address = result.get("address", "")

    return [
        name,
        phone,
        address,
        result.get("has_gyni", "Unknown"),
        result.get("has_ultrasound", "Unknown"),
        result.get("price", "Unknown"),
        result.get("availability", "Unknown"),
        result.get("status", ""),
        result.get("duration_seconds", ""),
        result.get("transcript", ""),
        result.get("recording_url", ""),
        result.get("local_recording", ""),
        called_at or time.strftime("%Y-%m-%d %H:%M:%S"),
    ]


def run_from_call_results(call_results_path: str, excel_path: str, reanalyze: bool, gemini_key: str):
    """Load call_results.json and write all rows to Excel. Optionally re-run Gemini."""
    if not os.path.exists(call_results_path):
        print(f"Not found: {call_results_path}")
        print("Run 2_vapi_caller.py first to generate call results, or use --from-recordings.")
        return

    with open(call_results_path, "r", encoding="utf-8") as f:
        results = json.load(f)

    if not results:
        print("No results in file.")
        return

    wb, ws = setup_excel(excel_path)
    print(f"Writing {len(results)} rows to {excel_path}")

    for i, result in enumerate(results, 1):
        practice = result.get("practice") or {}
        name = practice.get("name", "?") if isinstance(practice, dict) else str(practice)
        transcript = result.get("transcript", "")

        if reanalyze and transcript and gemini_key:
            print(f"  [{i}/{len(results)}] Re-analyzing: {name[:40]}...")
            analysis = get_gemini_analysis(transcript, gemini_key)
            result["has_gyni"] = analysis["has_gyni"]
            result["has_ultrasound"] = analysis["has_ultrasound"]
            result["price"] = analysis["price"]
            result["availability"] = analysis["availability"]
        elif not result.get("has_gyni") and transcript and gemini_key:
            print(f"  [{i}/{len(results)}] Analyzing: {name[:40]}...")
            analysis = get_gemini_analysis(transcript, gemini_key)
            result["has_gyni"] = analysis["has_gyni"]
            result["has_ultrasound"] = analysis["has_ultrasound"]
            result["price"] = analysis["price"]
            result["availability"] = analysis["availability"]

        row = result_to_row(result, result.get("called_at"))
        append_row(wb, ws, row, excel_path)

    print(f"Done. {excel_path}")


def run_from_recordings(recordings_dir: str, manifest_path: str, excel_path: str, gemini_key: str):
    """Use recordings_manifest.json + transcript files to build Excel."""
    if not os.path.exists(manifest_path):
        print(f"Not found: {manifest_path}")
        print("Create a JSON array with one object per call, e.g.:")
        print('  [{"transcript_file": "call1.txt", "practice_name": "X", "phone": "...", "address": "..."}]')
        return

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    if not gemini_key:
        print("GEMINI_API_KEY required for --from-recordings. Set it in .env.")
        return

    wb, ws = setup_excel(excel_path)
    base = os.path.dirname(manifest_path) or "."
    if recordings_dir:
        base = recordings_dir

    for i, entry in enumerate(manifest, 1):
        transcript_file = entry.get("transcript_file", "")
        path = os.path.join(base, transcript_file)
        if not os.path.exists(path):
            path = os.path.join(RECORDINGS_FOLDER, transcript_file)
        if not os.path.exists(path):
            print(f"  Skip: transcript file not found: {transcript_file}")
            continue

        with open(path, "r", encoding="utf-8", errors="replace") as f:
            transcript = f.read()

        print(f"  [{i}/{len(manifest)}] Analyzing: {entry.get('practice_name', '?')[:40]}...")
        analysis = get_gemini_analysis(transcript, gemini_key)

        practice = {
            "name": entry.get("practice_name", ""),
            "phone": entry.get("phone", ""),
            "address": entry.get("address", ""),
        }
        result = {
            "practice": practice,
            "has_gyni": analysis["has_gyni"],
            "has_ultrasound": analysis["has_ultrasound"],
            "price": analysis["price"],
            "availability": analysis["availability"],
            "status": "from transcript",
            "duration_seconds": entry.get("duration_seconds", ""),
            "transcript": transcript,
            "recording_url": entry.get("recording_url", ""),
            "local_recording": entry.get("recording_file", "") or entry.get("local_recording", ""),
        }
        row = result_to_row(result)
        append_row(wb, ws, row, excel_path)

    print(f"Done. {excel_path}")


def main():
    from dotenv import load_dotenv
    load_dotenv()
    gemini_key = os.environ.get("GEMINI_API_KEY", "")

    parser = argparse.ArgumentParser(description="Analyze recordings/transcripts and create Excel (gyni_results.xlsx)")
    parser.add_argument("--call-results", default=DEFAULT_CALL_RESULTS, help="Path to call_results.json")
    parser.add_argument("--output", "-o", default=DEFAULT_EXCEL, help="Output Excel path")
    parser.add_argument("--reanalyze", action="store_true", help="Re-run Gemini on all transcripts (from call_results)")
    parser.add_argument("--from-recordings", action="store_true", help="Use recordings/ + recordings_manifest.json")
    parser.add_argument("--recordings-dir", default=RECORDINGS_FOLDER, help="Folder for transcript files (with --from-recordings)")
    parser.add_argument("--manifest", default=MANIFEST_FILE, help="Path to manifest JSON (with --from-recordings)")
    args = parser.parse_args()

    if args.from_recordings:
        run_from_recordings(args.recordings_dir, args.manifest, args.output, gemini_key)
    else:
        run_from_call_results(args.call_results, args.output, args.reanalyze, gemini_key)


if __name__ == "__main__":
    main()
