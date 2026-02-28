#!/usr/bin/env python3
"""
Enrich hubspot_marketplace_sa_companies.json using Gemini: for each profile URL,
fetch the page with Playwright, send the text to Gemini, and extract company name + description.

Usage:
  pip install google-generativeai playwright python-dotenv
  python -m playwright install chromium
  Add GOOGLE_API_KEY or GEMINI_API_KEY to .env
  cd "pilot checklist"
  python enrich_hubspot_companies_with_gemini.py

Reads: hubspot_marketplace_sa_companies.json (dedupes by URL)
Writes: hubspot_marketplace_sa_companies.json (updated with Gemini-extracted name + description)
"""

import json
import os
import re
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

SCRIPT_DIR = Path(__file__).resolve().parent
INPUT_JSON = SCRIPT_DIR / "hubspot_marketplace_sa_companies.json"
EXTRACT_PROMPT = """From this HubSpot Solutions Marketplace partner profile page text, extract:
1. The exact company/partner name (as shown on the page, e.g. "Huble" or "MO Agency").
2. A 1-2 sentence description of what they do (focus on services, location, HubSpot focus).

Return ONLY valid JSON in this exact format, no other text:
{"name": "Company Name", "description": "One or two sentences."}

Page text:
---
{text}
---
JSON:"""


def fetch_page_text(url: str) -> str:
    """Fetch profile URL with Playwright and return main content text."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return ""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(1000)
            text = page.evaluate("""() => {
                const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
                return main ? main.innerText.trim().slice(0, 6000) : '';
            }""")
            browser.close()
            return (text or "").strip()
        except Exception:
            browser.close()
            return ""


def _gemini_rest(prompt: str, api_key: str) -> str | None:
    """Call Gemini via REST and return response text (avoids SDK KeyError on some responses)."""
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"},
    }
    try:
        r = requests.post(
            url,
            params={"key": api_key},
            json=payload,
            timeout=60,
        )
        r.raise_for_status()
        data = r.json()
        parts = (data.get("candidates") or [{}])[0].get("content", {}).get("parts") or []
        return "".join(p.get("text", "") or "" for p in parts).strip() or None
    except Exception:
        return None


def extract_with_gemini(page_text: str) -> dict | None:
    """Send page text to Gemini and return {name, description} or None."""
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        prompt = EXTRACT_PROMPT.format(text=page_text[:5000])
        raw = None
        # Prefer REST to avoid SDK KeyError('"name"') when parsing response
        raw = _gemini_rest(prompt, api_key)
        if not raw or not raw.strip():
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            raw = ""
            try:
                if response.candidates and response.candidates[0].content.parts:
                    for p in response.candidates[0].content.parts:
                        t = getattr(p, "text", None)
                        if t and isinstance(t, str):
                            raw += t
            except (KeyError, AttributeError, TypeError, IndexError):
                pass
            raw = (raw or "").strip() or None
        if not raw:
            return None
        raw = raw.strip()
        # Strip markdown code block if present
        if "```" in raw:
            raw = re.sub(r"```(?:json)?\s*", "", raw).replace("```", "").strip()
        # Find first { ... } and parse
        start = raw.find("{")
        if start >= 0:
            depth = 0
            for i in range(start, len(raw)):
                if raw[i] == "{":
                    depth += 1
                elif raw[i] == "}":
                    depth -= 1
                    if depth == 0:
                        raw = raw[start : i + 1]
                        break
        # Fix smart quotes and trailing commas for JSON
        raw = raw.replace("\u201c", '"').replace("\u201d", '"').replace("\u2018", "'").replace("\u2019", "'")
        raw = re.sub(r",\s*}", "}", raw)
        raw = re.sub(r",\s*]", "]", raw)
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            # Fallback: regex extract "name": "..." and "description": "..."
            m_name = re.search(r'"name"\s*:\s*"([^"]*)"', raw)
            m_desc = re.search(r'"description"\s*:\s*"([^"]*)"', raw)
            name = (m_name.group(1) if m_name else "").strip()
            desc = (m_desc.group(1) if m_desc else "").strip()
            if name:
                return {"name": name[:200], "description": desc[:800]}
            return None
        # Normalize keys (Gemini sometimes returns keys with extra quotes, e.g. '"name"')
        if isinstance(data, dict):
            data = {str(k).strip('"').strip("'"): v for k, v in data.items()}
        name = (data.get("name") or data.get("company_name") or data.get("company") or "").strip()
        if isinstance(name, dict):
            name = ""
        else:
            name = str(name)
        desc = (data.get("description") or data.get("desc") or "").strip()
        if isinstance(desc, dict):
            desc = ""
        else:
            desc = str(desc)
        if name:
            return {"name": name[:200], "description": desc[:800]}
    except json.JSONDecodeError as e:
        print(f"  Gemini JSON error: {e}")
    except Exception as e:
        print(f"  Gemini error: {type(e).__name__}: {e}")
    return None


def main():
    if not INPUT_JSON.exists():
        print(f"Missing {INPUT_JSON}. Run fetch_hubspot_marketplace_sa_playwright.py first.")
        sys.exit(1)

    raw = json.loads(INPUT_JSON.read_text(encoding="utf-8"))
    by_url = {}
    for c in raw:
        url = (c.get("url") or "").strip()
        if not url or url.split("/")[-1] == "south-africa":
            continue
        by_url[url] = {"name": c.get("name") or "", "description": c.get("description") or "", "url": url}

    companies = list(by_url.values())
    n = len(companies)
    print(f"Enriching {n} companies (fetch page + Gemini extract)...")

    if not os.getenv("GOOGLE_API_KEY") and not os.getenv("GEMINI_API_KEY"):
        print("Add GOOGLE_API_KEY or GEMINI_API_KEY to .env")
        sys.exit(1)

    for i, c in enumerate(companies):
        url = c["url"]
        print(f"  [{i+1}/{n}] {url.split('/')[-1]}...", end=" ", flush=True)
        text = fetch_page_text(url)
        if not text:
            print("(no text)")
            time.sleep(0.5)
            continue
        out = extract_with_gemini(text)
        if out:
            c["name"] = out["name"]
            c["description"] = out["description"]
            print("ok")
        else:
            print("(kept)")
        time.sleep(0.8)

    INPUT_JSON.write_text(json.dumps(companies, indent=2), encoding="utf-8")
    print(f"Wrote {INPUT_JSON}. Run: python fetch_hubspot_marketplace_sa.py --from-json")


if __name__ == "__main__":
    main()
