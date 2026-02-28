#!/usr/bin/env python3
"""Read hubspot_marketplace_sa_companies.json and write all URLs to an Excel file."""
import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
INPUT_JSON = SCRIPT_DIR / "hubspot_marketplace_sa_companies.json"
OUTPUT_EXCEL = SCRIPT_DIR / "hubspot_marketplace_sa_urls.xlsx"

def main():
    if not INPUT_JSON.exists():
        print(f"Missing {INPUT_JSON}. Run fetch_hubspot_marketplace_sa_playwright.py --headed first.")
        return
    data = json.loads(INPUT_JSON.read_text(encoding="utf-8"))
    if not data:
        print("No companies in JSON.")
        return
    try:
        from openpyxl import Workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "URLs"
        ws.append(["URL", "Name", "Description"])
        for row in data:
            ws.append([
                (row.get("url") or "").strip(),
                (row.get("name") or "").strip(),
                (row.get("description") or "").strip(),
            ])
        wb.save(OUTPUT_EXCEL)
        print(f"Wrote {len(data)} URLs to {OUTPUT_EXCEL}")
    except ImportError:
        import csv
        out = OUTPUT_EXCEL.with_suffix(".csv")
        with open(out, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["URL", "Name", "Description"])
            for row in data:
                w.writerow([row.get("url") or "", row.get("name") or "", row.get("description") or ""])
        print(f"Wrote {len(data)} URLs to {out} (install openpyxl for .xlsx)")

if __name__ == "__main__":
    main()
