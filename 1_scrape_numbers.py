"""
Phase 1: Scrape gynecologist phone numbers from Google Places API
"""
import requests
import json
import time
from config import GOOGLE_PLACES_API_KEY, SEARCH_LOCATION, SEARCH_RADIUS_METERS

# Safety limit to prevent excessive API billing
MAX_RESULTS = 100


def search_places(query: str, location: dict, radius: int, page_token: str = None) -> dict:
    """Search for places using Google Places API (New) Text Search"""
    
    url = "https://places.googleapis.com/v1/places:searchText"
    
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.businessStatus,nextPageToken"
    }
    
    body = {
        "textQuery": query,
        "locationBias": {
            "circle": {
                "center": {
                    "latitude": location["lat"],
                    "longitude": location["lng"]
                },
                "radius": float(radius)
            }
        },
        "maxResultCount": 20
    }
    
    if page_token:
        body["pageToken"] = page_token
    
    response = requests.post(url, headers=headers, json=body)
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None
    
    return response.json()


def get_all_gynecologists() -> list:
    """Fetch all gynecologists within the search radius"""
    
    all_places = []
    search_queries = [
        "gynecologist near Parklands Cape Town",
        "gynaecologist near Parklands Cape Town",
        "obstetrician gynecologist Cape Town",
        "women's health clinic ultrasound Cape Town",
    ]
    
    seen_phones = set()  # Deduplicate by phone number
    
    for query in search_queries:
        # Stop if we've hit the limit
        if len(all_places) >= MAX_RESULTS:
            print(f"\n⚠️  Reached limit of {MAX_RESULTS} results. Stopping.")
            break
            
        print(f"\nSearching: {query}")
        
        page_token = None
        page = 1
        
        while True:
            # Check limit before each API call
            if len(all_places) >= MAX_RESULTS:
                break
                
            result = search_places(query, SEARCH_LOCATION, SEARCH_RADIUS_METERS, page_token)
            
            if not result or "places" not in result:
                break
            
            for place in result["places"]:
                # Check limit before adding
                if len(all_places) >= MAX_RESULTS:
                    break
                    
                phone = place.get("nationalPhoneNumber") or place.get("internationalPhoneNumber")
                
                # Skip if no phone or already seen
                if not phone or phone in seen_phones:
                    continue
                
                seen_phones.add(phone)
                
                place_data = {
                    "name": place.get("displayName", {}).get("text", "Unknown"),
                    "address": place.get("formattedAddress", ""),
                    "phone": phone,
                    "international_phone": place.get("internationalPhoneNumber", ""),
                    "website": place.get("websiteUri", ""),
                    "google_maps_url": place.get("googleMapsUri", ""),
                    "status": place.get("businessStatus", "UNKNOWN"),
                }
                
                all_places.append(place_data)
                print(f"  Found: {place_data['name']} - {phone}")
            
            # Check for more pages
            page_token = result.get("nextPageToken")
            if not page_token:
                break
            
            page += 1
            time.sleep(2)  # Be nice to the API
    
    return all_places


def save_results(places: list, filename: str = "gynecologists.json"):
    """Save results to JSON file"""
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(places, f, indent=2, ensure_ascii=False)
    print(f"\nSaved {len(places)} places to {filename}")


def main():
    if not GOOGLE_PLACES_API_KEY:
        print("ERROR: Please set GOOGLE_PLACES_API_KEY in your .env file")
        print("Get an API key from: https://console.cloud.google.com/apis/credentials")
        print("Enable 'Places API (New)' in your Google Cloud project")
        return
    
    print("=" * 50)
    print("Gyni Finder - Phase 1: Scraping Phone Numbers")
    print("=" * 50)
    print(f"Location: Parklands, Cape Town ({SEARCH_LOCATION['lat']}, {SEARCH_LOCATION['lng']})")
    print(f"Radius: {SEARCH_RADIUS_METERS / 1000}km")
    print(f"Max results: {MAX_RESULTS} (billing safety limit)")
    
    places = get_all_gynecologists()
    
    print("\n" + "=" * 50)
    print(f"TOTAL UNIQUE PLACES FOUND: {len(places)}")
    print("=" * 50)
    
    if places:
        save_results(places)
        
        # Also save a simple phone list for easy reference
        with open("phone_list.txt", "w") as f:
            for p in places:
                f.write(f"{p['name']}: {p['phone']}\n")
        print("Also saved phone_list.txt for quick reference")


if __name__ == "__main__":
    main()
