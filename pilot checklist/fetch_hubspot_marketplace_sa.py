#!/usr/bin/env python3
"""
Fetch HubSpot Solutions Marketplace (South Africa) companies and build ranked pilot list.

Usage:
  cd "pilot checklist"
  python fetch_hubspot_marketplace_sa.py              # use Firecrawl to fetch (needs FIRECRAWL_API_KEY)
  python fetch_hubspot_marketplace_sa.py --from-json   # score existing hubspot_marketplace_sa_companies.json

Output:
  hubspot_marketplace_sa_target_ranking.md  (scored + ranked)
"""

import json
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

MARKETPLACE_URL = "https://ecosystem.hubspot.com/marketplace/solutions/south-africa"
SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_JSON = SCRIPT_DIR / "hubspot_marketplace_sa_companies.json"
OUTPUT_MD = SCRIPT_DIR / "hubspot_marketplace_sa_target_ranking.md"


def get_companies_via_firecrawl():
    """Use Firecrawl to scrape or extract the marketplace page."""
    api_key = os.getenv("FIRECRAWL_API_KEY")
    if not api_key:
        print("Missing FIRECRAWL_API_KEY in .env. Get one at https://firecrawl.dev")
        sys.exit(1)

    try:
        from firecrawl import Firecrawl
    except ImportError:
        print("Install firecrawl-py: pip install firecrawl-py")
        sys.exit(1)

    firecrawl = Firecrawl(api_key=api_key)

    # Option 1: Extract with schema (structured list in one call)
    schema = {
        "type": "object",
        "properties": {
            "companies": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"},
                        "url": {"type": "string"},
                    },
                    "required": ["name"],
                },
            }
        },
        "required": ["companies"],
    }
    prompt = (
        "This page lists HubSpot solution partners in South Africa. "
        "Extract every company or solution listed. "
        "For each: company name (required), short one-line description, and link to profile or website if visible."
    )

    try:
        result = firecrawl.extract(
            urls=[MARKETPLACE_URL],
            prompt=prompt,
            schema=schema,
        )
    except Exception as e:
        print(f"Firecrawl extract failed: {e}")
        # Fallback: scrape and parse markdown
        print("Trying scrape fallback...")
        try:
            scrape_result = firecrawl.scrape(MARKETPLACE_URL)
            if scrape_result and getattr(scrape_result, "markdown", None):
                companies = _parse_companies_from_markdown(scrape_result.markdown)
                return companies
        except Exception as e2:
            print(f"Scrape fallback failed: {e2}")
        return []

    if not result or not getattr(result, "data", None):
        return []

    data = result.data if hasattr(result, "data") else result
    if isinstance(data, dict) and "companies" in data:
        return data["companies"]
    if isinstance(data, list):
        return data
    return []


def _parse_companies_from_markdown(md: str) -> list[dict]:
    """Fallback: parse company name + description from markdown (heading + following text)."""
    companies = []
    lines = md.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        # Look for headings (## or ###) or bold **Name** as company name
        name = None
        if line.startswith("## ") or line.startswith("### "):
            name = line.lstrip("# ").strip()
        elif line.strip().startswith("**") and "**" in line.strip()[2:]:
            m = re.match(r"\*\*(.+?)\*\*", line.strip())
            if m:
                name = m.group(1).strip()
        if name and len(name) > 2 and len(name) < 120:
            desc_parts = []
            i += 1
            while i < len(lines) and not (lines[i].startswith("#") or lines[i].strip().startswith("**")):
                if lines[i].strip():
                    desc_parts.append(lines[i].strip())
                i += 1
            description = " ".join(desc_parts)[:300] if desc_parts else ""
            companies.append({"name": name, "description": description, "url": ""})
            continue
        i += 1
    return companies


def score_company(company: dict) -> tuple[int, dict]:
    """
    Score 1-5 on: HubSpot depth, outbound/sales, agency, size, geography.
    Returns (total_score, {criteria: score}).
    """
    name = (company.get("name") or "").lower()
    desc = (company.get("description") or "").lower()
    text = f"{name} {desc}"

    hubspot = 5 if "hubspot" in text else (4 if "crm" in text or "marketing automation" in text else 3)
    outbound = (
        5
        if any(x in text for x in ["outbound", "sales", "sdr", "lead gen", "cold call", "sales development"])
        else (3 if any(x in text for x in ["marketing", "inbound", "lead"]) else 2)
    )
    agency = (
        5
        if any(x in text for x in ["agency", "partner", "consultancy", "implementation", "revops"])
        else (3 if "company" in text or "firm" in text else 3)
    )
    size = 4  # default mid-size
    if "enterprise" in text or "global" in text:
        size = 5
    elif "small" in text:
        size = 3

    geo = (
        5
        if any(x in text for x in ["south africa", "cape town", "johannesburg", "durban", "sa "])
        else (4 if "africa" in text else 3)
    )

    total = hubspot + outbound + agency + size + geo
    scores = {"hubspot": hubspot, "outbound": outbound, "agency": agency, "size": size, "geo": geo}
    return total, scores


def tier(total: int) -> str:
    if total >= 20:
        return "Tier 1"
    if total >= 15:
        return "Tier 2"
    if total >= 10:
        return "Tier 3"
    return "Tier 4"


def write_ranking_md(companies_with_scores: list[dict]) -> None:
    """Write hubspot_marketplace_sa_target_ranking.md with master table and tiers."""
    lines = [
        "# HubSpot South Africa — Pilot Target Ranking (Research-Backed)",
        "",
        "**Source:** [HubSpot Solutions Marketplace (South Africa)](https://ecosystem.hubspot.com/marketplace/solutions/south-africa) — scraped with Playwright, scored by script.",
        "",
        "**Scoring:** 1–5 each for HubSpot depth, outbound/sales, agency, size, geography (max 25). Tiers: 20+ = Tier 1, 15–19 = Tier 2, 10–14 = Tier 3, <10 = Tier 4.",
        "",
        "---",
        "",
        "## Master ranking",
        "",
        "| Rank | Company | H | O | A | S | G | **Total** | Tier | Notes |",
        "|------|---------|---|---|---|---|---|--------|------|-------|",
    ]

    for i, row in enumerate(companies_with_scores, 1):
        s = row["scores"]
        name = (row.get("name") or "").replace("|", "\\|")
        desc = (row.get("description") or "")[:80].replace("|", "\\|")
        lines.append(
            f"| {i} | **{name}** | {s['hubspot']} | {s['outbound']} | {s['agency']} | {s['size']} | {s['geo']} | **{row['total']}** | {row['tier']} | {desc} |"
        )

    lines.extend([
        "",
        "---",
        "",
        "## Tier 1 (contact first)",
        "",
    ])
    t1 = [r for r in companies_with_scores if r["tier"] == "Tier 1"]
    for r in t1:
        lines.append(f"- **{r['name']}** — {r.get('description', '')[:100]}")

    lines.extend([
        "",
        "## Tier 2",
        "",
    ])
    t2 = [r for r in companies_with_scores if r["tier"] == "Tier 2"]
    for r in t2:
        lines.append(f"- **{r['name']}** — {r.get('description', '')[:100]}")

    lines.extend([
        "",
        "## Tier 3",
        "",
    ])
    t3 = [r for r in companies_with_scores if r["tier"] == "Tier 3"]
    for r in t3:
        lines.append(f"- **{r['name']}** — {r.get('description', '')[:100]}")

    OUTPUT_MD.write_text("\n".join(lines), encoding="utf-8")


def slug_to_display_name(url: str) -> str:
    """Derive company display name from profile URL slug (e.g. huble-digital -> Huble Digital)."""
    if not url:
        return "Unknown"
    path = url.split("?")[0].rstrip("/")
    slug = path.split("/")[-1] if "/" in path else path
    slug = slug.replace("-co-za", "").replace("-com", "").replace(".", " ")
    return slug.replace("-", " ").title()


def load_companies_from_json() -> list[dict]:
    """Load and dedupe companies from Playwright JSON; fix names from URL slug when duplicated."""
    if not OUTPUT_JSON.exists():
        return []
    raw = json.loads(OUTPUT_JSON.read_text(encoding="utf-8"))
    by_url = {}
    seen_names = set()
    for c in raw:
        url = (c.get("url") or "").strip()
        if not url or "south-africa" in url.split("/")[-1]:
            continue
        name = (c.get("name") or "").strip()
        if name in seen_names or not name or "HubSpot Global Partner" in name:
            name = slug_to_display_name(url)
        seen_names.add(name)
        by_url[url] = {"name": name, "description": c.get("description") or "", "url": url}
    return list(by_url.values())


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--from-json", action="store_true", help="Score existing hubspot_marketplace_sa_companies.json (no Firecrawl)")
    args = parser.parse_args()

    if args.from_json:
        companies = load_companies_from_json()
        if not companies:
            print("No companies in hubspot_marketplace_sa_companies.json. Run fetch_hubspot_marketplace_sa_playwright.py first.")
            sys.exit(1)
        print(f"Loaded {len(companies)} companies from JSON. Scoring...")
    else:
        print("Fetching HubSpot Marketplace SA list via Firecrawl...")
        companies = get_companies_via_firecrawl()
        if not companies:
            print("No companies returned. Check FIRECRAWL_API_KEY and that the marketplace URL is reachable.")
            sys.exit(1)
        print(f"Got {len(companies)} companies. Scoring...")
        OUTPUT_JSON.write_text(json.dumps(companies, indent=2), encoding="utf-8")

    with_scores = []
    for c in companies:
        total, scores = score_company(c)
        with_scores.append({
            "name": c.get("name", ""),
            "description": c.get("description", ""),
            "url": c.get("url", ""),
            "total": total,
            "scores": scores,
            "tier": tier(total),
        })

    with_scores.sort(key=lambda x: -x["total"])
    write_ranking_md(with_scores)

    print(f"Wrote {OUTPUT_MD}")
    print(f"Tier 1: {len([r for r in with_scores if r['tier'] == 'Tier 1'])} | Tier 2: {len([r for r in with_scores if r['tier'] == 'Tier 2'])} | Tier 3: {len([r for r in with_scores if r['tier'] == 'Tier 3'])}")


if __name__ == "__main__":
    main()
