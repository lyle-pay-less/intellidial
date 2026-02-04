"""
Fetch real South African companies for Intellidial leads.

Uses Google Places API to find companies by industry/use case.
Outputs: TOP_CONVERSION_LEADS.csv with real company names, websites, locations.

Usage:
  1. Add GOOGLE_PLACES_API_KEY to .env (get from Google Cloud Console)
  2. Run: python fetch_sa_companies.py
  3. Output: TOP_CONVERSION_LEADS.csv (ready for enrichment)
"""

import csv
import json
import os
import sys
import time
from typing import List, Dict

import requests
from dotenv import load_dotenv

load_dotenv()

GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")
if not GOOGLE_PLACES_API_KEY:
    print("Missing GOOGLE_PLACES_API_KEY in .env")
    print("Get one at: https://console.cloud.google.com/apis/credentials")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_CSV = os.path.join(SCRIPT_DIR, "TOP_CONVERSION_LEADS.csv")

# SA cities for search
SA_CITIES = ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth", "Bloemfontein"]

# Search queries by use case
SEARCH_QUERIES = {
    "Healthcare/Medical Aid": [
        "medical aid companies South Africa",
        "healthcare providers Johannesburg",
        "private hospitals Cape Town",
        "medical scheme administrators",
    ],
    "Recruitment/HR": [
        "recruitment agencies Johannesburg",
        "staffing companies Cape Town",
        "HR consulting firms South Africa",
        "talent acquisition companies",
    ],
    "Property/Real Estate": [
        "estate agencies Johannesburg",
        "property management companies Cape Town",
        "real estate firms South Africa",
        "property developers",
    ],
    "Debt Collection": [
        "debt collection agencies South Africa",
        "credit management companies",
        "arrears recovery services",
    ],
    "Market Research": [
        "market research companies South Africa",
        "survey companies Johannesburg",
        "data collection agencies",
    ],
    "Fitness/Wellness": [
        "gym chains South Africa",
        "fitness centers Johannesburg",
        "wellness programs Cape Town",
    ],
    "Insurance": [
        "insurance companies South Africa",
        "short-term insurance Johannesburg",
        "life insurance companies",
    ],
    "IT Services": [
        "IT services companies Johannesburg",
        "technology consulting Cape Town",
        "software companies South Africa",
    ],
    "Telecoms": [
        "telecom companies South Africa",
        "business telecoms Johannesburg",
    ],
    "Financial Services": [
        "banks South Africa",
        "financial services companies",
        "investment firms Johannesburg",
    ],
    "E-commerce": [
        "online retailers South Africa",
        "e-commerce platforms",
        "online grocery delivery",
    ],
    "Food Delivery": [
        "food delivery services South Africa",
        "restaurant delivery companies",
    ],
}


def google_places_text_search(query: str, location: str = "South Africa", max_results: int = 20) -> List[Dict]:
    """Search Google Places API for businesses."""
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {
        "query": f"{query} {location}",
        "key": GOOGLE_PLACES_API_KEY,
        "type": "establishment",
    }
    
    results = []
    try:
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()
        
        if data.get("status") != "OK":
            print(f"  API error for '{query}': {data.get('status')}")
            return results
        
        for place in data.get("results", [])[:max_results]:
            name = place.get("name", "").strip()
            place_id = place.get("place_id", "")
            address = place.get("formatted_address", "")
            
            # Get website from Place Details
            website = get_place_website(place_id)
            
            if name:
                results.append({
                    "name": name,
                    "website": website or "",
                    "address": address,
                    "place_id": place_id,
                })
        
        time.sleep(0.1)  # Rate limit
    except Exception as e:
        print(f"  Error searching '{query}': {e}")
    
    return results


def get_place_website(place_id: str) -> str:
    """Get website from Place Details API."""
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "website",
        "key": GOOGLE_PLACES_API_KEY,
    }
    
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        if data.get("status") == "OK":
            return data.get("result", {}).get("website", "")
    except Exception:
        pass
    
    return ""


def main():
    all_companies = []
    seen_names = set()
    
    print("Fetching SA companies from Google Places API...\n")
    
    for industry, queries in SEARCH_QUERIES.items():
        print(f"Industry: {industry}")
        for query in queries:
            print(f"  Searching: {query}")
            companies = google_places_text_search(query, max_results=10)
            
            for company in companies:
                name = company["name"]
                if name.lower() in seen_names:
                    continue
                seen_names.add(name.lower())
                
                all_companies.append({
                    "Company Name": name,
                    "Industry": industry,
                    "Use Case": infer_use_case(industry),
                    "Why Likely to Convert": f"Large {industry.lower()} company in SA",
                    "Contact Type": "Enterprise",
                    "Estimated Size": "500+",
                    "Website": company["website"],
                    "Address": company["address"],
                })
                print(f"    -> {name}")
        
        print()
    
    # Write CSV
    fieldnames = [
        "Company Name", "Industry", "Use Case", "Why Likely to Convert",
        "Contact Type", "Estimated Size", "Website", "Address"
    ]
    
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_companies)
    
    print(f"\n✅ Found {len(all_companies)} companies")
    print(f"✅ Saved to {OUTPUT_CSV}")
    print("\nNext steps:")
    print("  1. Review and clean the CSV (remove duplicates, verify websites)")
    print("  2. Run find_emails.py to enrich with contacts")


def infer_use_case(industry: str) -> str:
    """Map industry to Intellidial use case."""
    mapping = {
        "Healthcare/Medical Aid": "Provider network verification",
        "Recruitment/HR": "Candidate pre-screening",
        "Property/Real Estate": "Listing verification",
        "Debt Collection": "Payment plan setup",
        "Market Research": "Price surveys",
        "Fitness/Wellness": "Appointment reminders",
        "Insurance": "Claims follow-up",
        "IT Services": "Customer onboarding",
        "Telecoms": "Customer onboarding",
        "Financial Services": "Customer onboarding",
        "E-commerce": "Order confirmation",
        "Food Delivery": "Order confirmation",
    }
    return mapping.get(industry, "Courtesy calls/feedback")


if __name__ == "__main__":
    main()
