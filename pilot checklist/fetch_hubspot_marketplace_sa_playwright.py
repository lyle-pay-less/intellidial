#!/usr/bin/env python3
"""
Scrape HubSpot Solutions Marketplace (South Africa): all pages, all company cards,
optionally visit each profile for full description.

Usage:
  pip install playwright openpyxl
  python -m playwright install chromium
  cd "pilot checklist"
  python fetch_hubspot_marketplace_sa_playwright.py              # list only (cards)
  python fetch_hubspot_marketplace_sa_playwright.py --full        # list + visit each profile for full About

Output:
  hubspot_marketplace_sa_companies.json   (name, description, url; full description if --full)
  hubspot_marketplace_sa_companies.xlsx   (URL, Name, Description; all pages including /page/2, /page/3...)
"""

import argparse
import json
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_JSON = SCRIPT_DIR / "hubspot_marketplace_sa_companies.json"
OUTPUT_EXCEL = SCRIPT_DIR / "hubspot_marketplace_sa_companies.xlsx"
BASE_URL = "https://ecosystem.hubspot.com"
LISTING_URL = "https://ecosystem.hubspot.com/marketplace/solutions/south-africa"
MAX_PAGES = 2  # only 2 pages: south-africa and south-africa/page/2


def get_cards_on_page(page) -> list[dict]:
    """Extract company name, short description, profile URL from current listing page."""
    js = r"""
    () => {
        const sel = 'a[href*="/marketplace/solutions/"]';
        const links = Array.from(document.querySelectorAll(sel));
        const seen = new Set();
        const out = [];
        const base = 'https://ecosystem.hubspot.com';
        for (const a of links) {
            let href = (a.getAttribute('href') || '').trim();
            const path = href.split('?')[0];
            const segments = path.split('/').filter(Boolean);
            const slug = segments[segments.length - 1];
            if (!slug || slug === 'south-africa' || seen.has(slug)) continue;
            seen.add(slug);
            const fullUrl = href.startsWith('http') ? href : base + (href.startsWith('/') ? href : '/' + href);
            const card = a.closest('article') || a.closest('[class*="card"]') || a.closest('div[class]') || a;
            const nameEl = card ? (card.querySelector('h2, h3, h4') || a) : a;
            const descEl = card ? card.querySelector('p') : null;
            let name = (nameEl ? nameEl.innerText : a.innerText).trim();
            const description = descEl ? descEl.innerText.trim() : '';
            if (name.length > 300) name = '';
            if (!name) name = slug;
            out.push({ name: name, description: description.slice(0, 800), url: fullUrl, slug: slug });
        }
        return out;
    }
    """
    cards_data = page.evaluate(js.strip())
    return cards_data or []


def get_full_description(page, profile_url: str) -> str:
    """Visit profile page and return About / full description text."""
    try:
        page.goto(profile_url, wait_until="domcontentloaded", timeout=15000)
        page.wait_for_timeout(2000)
        about_js = r"""
        () => {
            const aboutSection = document.querySelector('[class*="about"]');
            if (aboutSection) return aboutSection.innerText.trim().slice(0, 2000);
            const desc = document.querySelector('p');
            if (desc) return desc.innerText.trim().slice(0, 2000);
            const main = document.querySelector('main');
            return main ? main.innerText.trim().slice(0, 2000) : '';
        }
        """
        about = page.evaluate(about_js.strip())
        return (about or "").strip()
    except Exception:
        return ""


def main():
    parser = argparse.ArgumentParser(description="Scrape HubSpot Marketplace SA companies")
    parser.add_argument("--full", action="store_true", help="Visit each profile page for full description")
    parser.add_argument("--headed", action="store_true", help="Show browser (sometimes needed for page 2 to load)")
    args = parser.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Install: pip install playwright && python -m playwright install chromium")
        sys.exit(1)

    companies_by_slug = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed)
        page = browser.new_page()

        # Page 1
        page.goto(LISTING_URL, wait_until="load", timeout=30000)
        try:
            page.wait_for_selector('a[href*="/marketplace/solutions/"]', timeout=10000)
        except Exception:
            pass
        page.wait_for_timeout(2000)
        cards = get_cards_on_page(page)
        for c in cards:
            slug = c.get("slug") or ""
            if slug and slug not in companies_by_slug:
                companies_by_slug[slug] = {
                    "name": c.get("name", ""),
                    "description": (c.get("description") or "").strip(),
                    "url": c.get("url", ""),
                }
        print(f"  Page 1: {len(cards)} cards -> total {len(companies_by_slug)}")

        page1_slugs = set(companies_by_slug.keys())
        page2_urls_from_api = []

        def capture_json_response(response):
            nonlocal page2_urls_from_api
            try:
                url = response.url
                if response.request.method != "GET" or "json" not in (response.headers.get("content-type") or "").lower():
                    return
                if "marketplace" not in url and "solutions" not in url and "ecosystem" not in url:
                    return
                body = response.json()
                if not isinstance(body, dict):
                    return
                # Look for list of solutions/partners with slug or url
                def extract_urls(obj, out):
                    if isinstance(obj, dict):
                        slug = (obj.get("slug") or (obj.get("url") or "").split("/")[-1] or "").split("?")[0]
                        if slug and slug != "south-africa":
                            u = obj.get("url") or obj.get("link")
                            if u and "marketplace/solutions" in str(u):
                                u = u if isinstance(u, str) and u.startswith("http") else BASE_URL + (u if isinstance(u, str) and u.startswith("/") else "/" + str(u))
                            else:
                                u = f"{BASE_URL}/marketplace/solutions/{slug}"
                            out.append(u)
                        for v in obj.values():
                            extract_urls(v, out)
                    elif isinstance(obj, list):
                        for x in obj:
                            extract_urls(x, out)
                extract_urls(body, page2_urls_from_api)
            except Exception:
                pass

        page.on("response", capture_json_response)
        try:
            page.goto(f"{LISTING_URL}/page/2", wait_until="networkidle", timeout=25000)
        except Exception:
            page.goto(f"{LISTING_URL}/page/2", wait_until="load", timeout=30000)
        page.wait_for_timeout(3000)

        cards2 = []
        for _ in range(20):
            cards2 = get_cards_on_page(page)
            if any((c.get("slug") or "") not in page1_slugs for c in cards2):
                break
            page.wait_for_timeout(1000)

        # If DOM still shows page 1, use any URLs we captured from API
        if not any((c.get("slug") or "") not in page1_slugs for c in cards2) and page2_urls_from_api:
            for u in page2_urls_from_api:
                slug = (u.rstrip("/").split("/")[-1] or "").split("?")[0]
                if slug and slug not in companies_by_slug:
                    companies_by_slug[slug] = {"name": slug, "description": "", "url": u}
        added = 0
        for c in cards2:
            slug = c.get("slug") or ""
            if slug and slug not in companies_by_slug:
                companies_by_slug[slug] = {
                    "name": c.get("name", ""),
                    "description": (c.get("description") or "").strip(),
                    "url": c.get("url", ""),
                }
                added += 1
        print(f"  Page 2: {len(cards2)} cards, {added} new -> total {len(companies_by_slug)}")

        if args.full and companies_by_slug:
            for i, (slug, data) in enumerate(companies_by_slug.items()):
                url = data.get("url") or ""
                if not url or "south-africa" in url.split("/")[-1]:
                    continue
                full_desc = get_full_description(page, url)
                if full_desc:
                    data["description"] = full_desc
                time.sleep(0.5)
                if (i + 1) % 10 == 0:
                    print(f"  Fetched full description for {i + 1}/{len(companies_by_slug)}")

        browser.close()

    companies = list(companies_by_slug.values())
    if not companies:
        print("No companies found. The page structure may have changed; check selectors in the script.")
        sys.exit(1)

    OUTPUT_JSON.write_text(json.dumps(companies, indent=2), encoding="utf-8")
    print(f"Wrote {len(companies)} companies to {OUTPUT_JSON}")

    # Excel export: URL, Name, Description
    try:
        from openpyxl import Workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "Companies"
        ws.append(["URL", "Name", "Description"])
        for c in companies:
            ws.append([
                c.get("url") or "",
                c.get("name") or "",
                (c.get("description") or "").strip(),
            ])
        wb.save(OUTPUT_EXCEL)
        print(f"Wrote {len(companies)} rows to {OUTPUT_EXCEL}")
    except ImportError:
        import csv
        csv_path = OUTPUT_EXCEL.with_suffix(".csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["URL", "Name", "Description"])
            for c in companies:
                w.writerow([c.get("url") or "", c.get("name") or "", (c.get("description") or "").strip()])
        print(f"Wrote {len(companies)} rows to {csv_path} (install openpyxl for .xlsx)")

    if args.full:
        print("Full descriptions included (--full).")


if __name__ == "__main__":
    main()
