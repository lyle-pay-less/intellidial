"""
Find emails for companies in leads_gen/companies_to_enrich.csv using Hunter.io.

Usage:
  1. Add HUNTER_API_KEY to .env (get one at https://hunter.io/api)
  2. Fill companies_to_enrich.csv with segment, company_name, website (one per row)
  3. Run: python find_emails.py
  4. Output: enriched_leads.csv (company, segment, contact_name, job_title, email, verification_status)
"""

import csv
import os
import re
import sys
from urllib.parse import urlparse

import requests
from dotenv import load_dotenv

load_dotenv()

HUNTER_API_KEY = os.getenv("HUNTER_API_KEY")
if not HUNTER_API_KEY:
    print("Missing HUNTER_API_KEY in .env. Get one at https://hunter.io/api")
    sys.exit(1)

# Target job title keywords (match if any appears in Hunter's position field)
TITLE_KEYWORDS = [
    "recruitment", "recruiter", "talent", "staffing", "hiring",
    "sales", "director", "vp", "head of", "manager", "lead",
    "founder", "ceo", "demand gen", "outbound", "sdr", "growth",
    "operations", "regional", "franchise", "multi-site",
]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
COMPANIES_CSV = os.path.join(SCRIPT_DIR, "companies_to_enrich.csv")
OUTPUT_CSV = os.path.join(SCRIPT_DIR, "enriched_leads.csv")


def domain_from_website(website: str) -> str | None:
    """Extract domain from URL (e.g. https://www.foo.com/path -> foo.com)."""
    if not website or not website.strip():
        return None
    s = website.strip().lower()
    if not s.startswith(("http://", "https://")):
        s = "https://" + s
    try:
        parsed = urlparse(s)
        netloc = parsed.netloc or parsed.path.split("/")[0]
        if netloc.startswith("www."):
            netloc = netloc[4:]
        return netloc if netloc else None
    except Exception:
        return None


def hunter_domain_search(domain: str, limit: int = 10) -> list[dict]:
    """Hunter domain-search: returns list of people with email, position, etc."""
    url = "https://api.hunter.io/v2/domain-search"
    params = {"domain": domain, "api_key": HUNTER_API_KEY, "limit": limit}
    try:
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json().get("data", {})
        return data.get("emails", []) or []
    except Exception as e:
        print(f"  Hunter domain-search error for {domain}: {e}")
        return []


def hunter_verify_email(email: str) -> str:
    """Hunter email-verifier: returns status (valid, catch_all, invalid, unknown)."""
    url = "https://api.hunter.io/v2/email-verifier"
    params = {"email": email, "api_key": HUNTER_API_KEY}
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        return r.json().get("data", {}).get("status", "unknown")
    except Exception:
        return "unknown"


def title_matches(position: str) -> bool:
    """True if position contains any of our target title keywords."""
    if not position:
        return False
    p = position.lower()
    return any(kw in p for kw in TITLE_KEYWORDS)


def main():
    if not os.path.exists(COMPANIES_CSV):
        print(f"Create {COMPANIES_CSV} with columns: segment, company_name, website")
        sys.exit(1)

    rows = []
    with open(COMPANIES_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames and "website" not in (reader.fieldnames or []):
            print("companies_to_enrich.csv must have: segment, company_name, website")
            sys.exit(1)
        for row in reader:
            rows.append(row)

    if not rows:
        print("No rows in companies_to_enrich.csv. Add segment, company_name, website.")
        sys.exit(0)

    results = []
    for i, row in enumerate(rows):
        segment = (row.get("segment") or "").strip()
        company_name = (row.get("company_name") or "").strip()
        website = (row.get("website") or "").strip()
        domain = domain_from_website(website)
        if not domain:
            print(f"Skipping (no domain): {company_name} | {website}")
            continue
        print(f"[{i+1}/{len(rows)}] {company_name} ({domain})")
        emails = hunter_domain_search(domain)
        # Prefer contacts whose position matches our target titles
        matched = [e for e in emails if title_matches((e.get("position") or ""))]
        if not matched:
            matched = emails[:3]  # fallback: take first 3
        for contact in matched[:2]:  # max 2 contacts per company
            first = (contact.get("first_name") or "").strip()
            last = (contact.get("last_name") or "").strip()
            position = (contact.get("position") or "").strip()
            email = (contact.get("value") or "").strip()
            if not email:
                continue
            verification = hunter_verify_email(email)
            # ZERO BOUNCE RULE: Only keep valid or catch_all emails
            if verification not in ("valid", "catch_all"):
                print(f"  -> SKIPPED {email} | {position} | {verification} (will bounce)")
                continue
            results.append({
                "segment": segment,
                "company_name": company_name,
                "website": website,
                "contact_name": f"{first} {last}".strip() or "—",
                "job_title": position or "—",
                "email": email,
                "verification_status": verification,
            })
            print(f"  -> ✅ {email} | {position} | {verification}")

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["segment", "company_name", "website", "contact_name", "job_title", "email", "verification_status"],
        )
        writer.writeheader()
        writer.writerows(results)

    valid_count = sum(1 for r in results if r.get("verification_status") == "valid")
    catch_all_count = sum(1 for r in results if r.get("verification_status") == "catch_all")
    print(f"\n✅ Wrote {len(results)} verified contacts to {OUTPUT_CSV}")
    print(f"   - {valid_count} valid emails")
    print(f"   - {catch_all_count} catch_all emails (use with caution)")
    print(f"\n⚠️  ZERO BOUNCE RULE: Only valid/catch_all emails included. Invalid emails were filtered out.")


if __name__ == "__main__":
    main()
