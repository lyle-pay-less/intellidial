#!/usr/bin/env python3
"""
Evaluate each HubSpot SA company page for pilot fit using Gemini.

Reads hubspot_marketplace_sa_companies.json, fetches each profile page with Playwright
(single browser, reused for all URLs), sends full page text to Gemini with a detailed
prompt, and writes pilot_fit_evaluation.json and pilot_fit_evaluation.xlsx.

Usage:
  pip install playwright openpyxl requests python-dotenv
  python -m playwright install chromium
  Add GOOGLE_API_KEY or GEMINI_API_KEY to .env
  cd "pilot checklist"
  python evaluate_pilot_fit_gemini.py
"""

import json
import os
import re
import sys
import time
from pathlib import Path

import requests as req
from dotenv import load_dotenv

load_dotenv()

SCRIPT_DIR = Path(__file__).resolve().parent
INPUT_JSON = SCRIPT_DIR / "hubspot_marketplace_sa_companies.json"
OUTPUT_JSON = SCRIPT_DIR / "pilot_fit_evaluation.json"
OUTPUT_EXCEL = SCRIPT_DIR / "pilot_fit_evaluation.xlsx"
DEBUG_LOG = SCRIPT_DIR / "pilot_fit_debug.log"

MAX_PAGE_CHARS = 10000

EVAL_PROMPT_TEMPLATE = (
    "You are evaluating HubSpot Solutions Marketplace (South Africa) partner profiles "
    "for an Intellidial pilot. Intellidial is an AI outbound/sales dialer - we want "
    "partners who do or enable outbound sales, SDR, cold calling, lead gen, or sales "
    "development (for themselves or for clients).\n\n"
    "Read the ENTIRE page below. Then decide if this company is a good fit.\n\n"
    "Good fit: Outbound/sales/SDR/cold calling/lead gen focus; agency or consultancy "
    "that runs outbound for clients; South Africa-focused; mid-size to enterprise. "
    "Strong HubSpot/CRM use is a plus.\n\n"
    "Poor fit: Pure design/creative only (no sales); only inbound/marketing with no "
    "outbound; not SA-focused; very small/solo with no outbound offering.\n\n"
    "Maybe: Some overlap but unclear on outbound/agency; mixed signals.\n\n"
    "Return ONLY valid JSON. No markdown, no code fences, just the JSON object:\n"
    '{"name":"Company Name","url":"THE_URL","fit_verdict":"Good fit","score":7,'
    '"why_fit":"bullet points","why_not":"bullet points",'
    '"key_signals":["signal 1","signal 2"]}\n\n'
    "fit_verdict must be exactly: Good fit, Maybe, or Poor fit.\n"
    "score must be 1-10 (10 = ideal pilot target).\n\n"
    "Profile URL: THE_URL\n\n"
    "Page text:\n---\nTHE_TEXT\n---\nJSON:"
)


def build_prompt(url: str, text: str) -> str:
    """Build the evaluation prompt. Uses replace instead of .format() to avoid brace issues."""
    prompt = EVAL_PROMPT_TEMPLATE.replace("THE_URL", url).replace("THE_TEXT", text[:MAX_PAGE_CHARS])
    return prompt


def gemini_eval(prompt: str, api_key: str, model: str = "gemini-2.0-flash") -> str:
    """Call Gemini REST API. Returns raw response text or empty string."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"},
    }
    try:
        r = req.post(url, params={"key": api_key}, json=payload, timeout=90)
        r.raise_for_status()
        data = r.json()
        parts = (data.get("candidates") or [{}])[0].get("content", {}).get("parts") or []
        return "".join(p.get("text", "") or "" for p in parts).strip()
    except Exception as e:
        return f"ERROR: {e}"


def parse_response(raw: str, company_url: str, fallback_name: str) -> dict:
    """Parse Gemini JSON response into a row dict. Always returns a dict (never None)."""
    default = {
        "name": fallback_name,
        "url": company_url,
        "fit_verdict": "Maybe",
        "score": 5,
        "why_fit": "",
        "why_not": f"Parse failed. Raw: {(raw or '')[:200]}",
        "key_signals": "",
    }
    if not raw or not raw.strip() or raw.startswith("ERROR:"):
        default["why_not"] = raw or "Empty response"
        return default

    raw = raw.strip()
    # Strip code fences
    raw = re.sub(r"```(?:json)?\s*", "", raw).replace("```", "").strip()
    # Fix quotes
    raw = raw.replace("\u201c", '"').replace("\u201d", '"').replace("\u2018", "'").replace("\u2019", "'")
    # Fix trailing commas
    raw = re.sub(r",\s*}", "}", raw)
    raw = re.sub(r",\s*]", "]", raw)

    # Find outermost { ... }
    data = None
    start = raw.find("{")
    if start >= 0:
        depth = 0
        for i in range(start, len(raw)):
            if raw[i] == "{":
                depth += 1
            elif raw[i] == "}":
                depth -= 1
                if depth == 0:
                    chunk = raw[start : i + 1]
                    try:
                        data = json.loads(chunk)
                    except json.JSONDecodeError:
                        pass
                    break

    if not isinstance(data, dict):
        # Regex fallback
        m_name = re.search(r'"name"\s*:\s*"([^"]*)"', raw)
        m_verdict = re.search(r'"fit_verdict"\s*:\s*"(Good fit|Maybe|Poor fit)"', raw)
        m_score = re.search(r'"score"\s*:\s*(\d+)', raw)
        if m_name or m_verdict:
            return {
                "name": (m_name.group(1) if m_name else fallback_name)[:200],
                "url": company_url,
                "fit_verdict": m_verdict.group(1) if m_verdict else "Maybe",
                "score": min(10, max(1, int(m_score.group(1)))) if m_score else 5,
                "why_fit": "",
                "why_not": "",
                "key_signals": "",
            }
        return default

    # Normalize
    d = {str(k).strip('"').strip("'"): v for k, v in data.items()}

    def s(val, maxlen=800):
        if isinstance(val, list):
            return " | ".join(str(x)[:200] for x in val[:10])[:maxlen]
        return str(val or "")[:maxlen]

    name = s(d.get("name") or d.get("company_name") or fallback_name, 200)
    verdict = s(d.get("fit_verdict") or d.get("verdict"), 20).strip()
    if verdict not in ("Good fit", "Maybe", "Poor fit"):
        verdict = "Maybe"
    try:
        score = max(1, min(10, int(float(str(d.get("score", 5))))))
    except (ValueError, TypeError):
        score = 5

    return {
        "name": name,
        "url": company_url,
        "fit_verdict": verdict,
        "score": score,
        "why_fit": s(d.get("why_fit")),
        "why_not": s(d.get("why_not")),
        "key_signals": s(d.get("key_signals"), 500),
    }


def write_excel(results: list[dict]):
    """Write results to Excel."""
    try:
        from openpyxl import Workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "Pilot fit"
        ws.append(["Company name", "URL", "Fit", "Score", "Why fit", "Why not", "Key signals"])
        for r in results:
            ws.append([r["name"], r["url"], r["fit_verdict"], r["score"], r["why_fit"], r["why_not"], r["key_signals"]])
        wb.save(OUTPUT_EXCEL)
        print(f"Wrote {OUTPUT_EXCEL}")
    except ImportError:
        import csv
        out = OUTPUT_EXCEL.with_suffix(".csv")
        with open(out, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["Company name", "URL", "Fit", "Score", "Why fit", "Why not", "Key signals"])
            for r in results:
                w.writerow([r["name"], r["url"], r["fit_verdict"], r["score"], r["why_fit"], r["why_not"], r["key_signals"]])
        print(f"Wrote {out} (install openpyxl for .xlsx)")


def main():
    if not INPUT_JSON.exists():
        print(f"Missing {INPUT_JSON}.")
        sys.exit(1)
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Add GOOGLE_API_KEY or GEMINI_API_KEY to .env")
        sys.exit(1)

    companies = json.loads(INPUT_JSON.read_text(encoding="utf-8"))
    by_url = {}
    for c in companies:
        url = (c.get("url") or "").strip()
        if not url or url.split("/")[-1] == "south-africa":
            continue
        by_url[url] = c
    companies = list(by_url.values())
    n = len(companies)
    print(f"Evaluating {n} companies for pilot fit...")
    print(f"Debug log: {DEBUG_LOG}")

    results = []
    debug_lines = []

    # --- Single browser for all URLs ---
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page()

    try:
        for i, c in enumerate(companies):
            url = c["url"]
            slug = url.rstrip("/").split("/")[-1]
            name = c.get("name") or slug or "Unknown"
            print(f"  [{i+1}/{n}] {slug}...", end=" ", flush=True)

            # Fetch page
            text = ""
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=15000)
                page.wait_for_timeout(1500)
                text = page.evaluate("""() => {
                    const el = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
                    return el ? el.innerText.trim().slice(0, 10000) : '';
                }""")
                text = (text or "").strip()
            except Exception as e:
                debug_lines.append(f"[{slug}] fetch error: {e}")

            if not text:
                print("(no text)")
                results.append({"name": name, "url": url, "fit_verdict": "Maybe", "score": 5,
                                "why_fit": "", "why_not": "Could not fetch page.", "key_signals": ""})
                continue

            # Gemini
            prompt = build_prompt(url, text)
            raw = gemini_eval(prompt, api_key)
            debug_lines.append(f"[{slug}] raw response:\n{raw[:500]}\n")

            row = parse_response(raw, url, name)
            results.append(row)
            print(f"{row['fit_verdict']} ({row['score']})")

            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopped early. Saving results so far...")
    finally:
        try:
            browser.close()
        except Exception:
            pass
        try:
            pw.stop()
        except Exception:
            pass

    # Sort: Good fit first, then by score desc
    results.sort(key=lambda r: (0 if r["fit_verdict"] == "Good fit" else 1 if r["fit_verdict"] == "Maybe" else 2, -r["score"]))

    OUTPUT_JSON.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT_JSON}")
    write_excel(results)

    # Debug log
    DEBUG_LOG.write_text("\n".join(debug_lines), encoding="utf-8")

    good = sum(1 for r in results if r["fit_verdict"] == "Good fit")
    maybe = sum(1 for r in results if r["fit_verdict"] == "Maybe")
    poor = len(results) - good - maybe
    print(f"Done: {good} Good fit, {maybe} Maybe, {poor} Poor fit.")


if __name__ == "__main__":
    main()
