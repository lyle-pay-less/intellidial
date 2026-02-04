"""
Step 4: Generate personalized cold emails from enriched leads using Gemini.

Reads enriched_leads.csv (from find_emails.py), optionally filters to verified only,
calls Gemini to generate one subject + body per contact. Writes emails_ready.csv
for import into Instantly (Step 5).

Usage:
  1. Run find_emails.py first to create enriched_leads.csv
  2. Add GEMINI_API_KEY to .env (in doctor folder)
  3. python generate_emails.py
  4. python generate_emails.py --verified-only   # only valid/catch_all
  5. python generate_emails.py --input my_leads.csv --output my_emails.csv
"""

import argparse
import csv
import os
import re
import sys

# Load .env from doctor repo root (parent of leads_gen)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from dotenv import load_dotenv
load_dotenv(os.path.join(REPO_ROOT, ".env"))

try:
    import requests
except ImportError:
    print("Install requests: pip install requests")
    sys.exit(1)

DEFAULT_INPUT = os.path.join(SCRIPT_DIR, "enriched_leads.csv")
DEFAULT_OUTPUT = os.path.join(SCRIPT_DIR, "emails_ready.csv")

VALUE_PROP = (
    "Intelli Dial automates phone research at scale: give us a list, we call with AI voice, "
    "and you get structured data plus recordings. Same questions every time, consistent fields, "
    "results in Excel or your stack. Cut call time and cost—no extra headcount."
)
CTA = "Book a short call to see a demo or discuss your use case."


def get_gemini_email(segment: str, company_name: str, contact_name: str, job_title: str, gemini_key: str) -> dict:
    """Call Gemini to generate one subject line and one short email body."""
    result = {"subject": "", "body": ""}
    if not gemini_key:
        return result

    prompt = f"""Write one cold email for this B2B prospect. Return ONLY a JSON object with two keys:
- subject: A short, professional subject line (no quotes in the subject).
- body: The email body in 3-5 short lines, professional, one clear CTA. Use plain text; no markdown.

Our offer: {VALUE_PROP}
CTA: {CTA}

Their segment: {segment}
Company: {company_name}
Contact: {contact_name}
Title: {job_title}

Return only valid JSON, e.g. {{"subject": "...", "body": "..."}}
"""

    try:
        resp = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.3},
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        text = (data.get("candidates") or [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        if not text:
            return result
        # Extract JSON from response (may be wrapped in markdown code block)
        json_match = re.search(r"\{[\s\S]*\}", text)
        if json_match:
            import json as _json
            obj = _json.loads(json_match.group())
            result["subject"] = (obj.get("subject") or "").strip()
            result["body"] = (obj.get("body") or "").strip()
    except Exception as e:
        print(f"  Gemini error: {e}", file=sys.stderr)
    return result


def main():
    ap = argparse.ArgumentParser(description="Generate personalized emails from enriched leads (Gemini)")
    ap.add_argument("--input", default=DEFAULT_INPUT, help="Input CSV (enriched_leads.csv)")
    ap.add_argument("--output", default=DEFAULT_OUTPUT, help="Output CSV (emails_ready.csv)")
    ap.add_argument("--allow-unverified", action="store_true", help="Allow unverified emails (NOT RECOMMENDED - will cause bounces). Default: only verified emails.")
    args = ap.parse_args()

    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        print("Add GEMINI_API_KEY to .env in the doctor folder.")
        sys.exit(1)

    if not os.path.isfile(args.input):
        print(f"Input file not found: {args.input}")
        print("Run find_emails.py first to create enriched_leads.csv")
        sys.exit(1)

    rows = []
    skipped_unverified = 0
    with open(args.input, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # ZERO BOUNCE RULE: By default, only keep verified emails
            if not args.allow_unverified:
                status = (row.get("verification_status") or "").strip().lower()
                if status not in ("valid", "catch_all"):
                    skipped_unverified += 1
                    continue
            rows.append(row)
    
    if skipped_unverified > 0:
        print(f"⚠️  Skipped {skipped_unverified} unverified emails (zero bounce rule). Use --allow-unverified to include them (NOT RECOMMENDED).")

    if not rows:
        print("No verified leads to process.")
        print("Add verified leads to enriched_leads.csv or run find_emails.py first.")
        print("⚠️  ZERO BOUNCE RULE: Only verified (valid/catch_all) emails are included by default.")
        sys.exit(0)

    out_fields = ["segment", "company_name", "contact_name", "job_title", "email", "subject", "body"]
    results = []
    for i, row in enumerate(rows):
        segment = (row.get("segment") or "").strip()
        company_name = (row.get("company_name") or "").strip()
        contact_name = (row.get("contact_name") or "").strip()
        job_title = (row.get("job_title") or "").strip()
        email = (row.get("email") or "").strip()
        if not email:
            continue
        print(f"[{i+1}/{len(rows)}] {contact_name} @ {company_name}")
        gen = get_gemini_email(segment, company_name, contact_name, job_title, gemini_key)
        results.append({
            "segment": segment,
            "company_name": company_name,
            "contact_name": contact_name,
            "job_title": job_title,
            "email": email,
            "subject": gen["subject"],
            "body": gen["body"],
        })

    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    with open(args.output, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=out_fields)
        w.writeheader()
        w.writerows(results)

    verified_count = sum(1 for r in results if r.get("verification_status", "").lower() == "valid")
    print(f"\n✅ Wrote {len(results)} emails to {args.output}")
    print(f"   - All emails verified (zero bounce rule)")
    print(f"   - {verified_count} valid emails")
    print("\n📧 Import this file into Instantly/SendGrid for sending.")
    print("⚠️  Remember: Warm up your domain before sending large volumes!")


if __name__ == "__main__":
    main()
