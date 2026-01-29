import os
from dotenv import load_dotenv

load_dotenv()

# Google Places API
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")

# VAPI (Phase 2)
VAPI_API_KEY = os.getenv("VAPI_API_KEY")
VAPI_PHONE_NUMBER_ID = os.getenv("VAPI_PHONE_NUMBER_ID")

# Google Sheets (Phase 3)
GOOGLE_SHEETS_ID = os.getenv("GOOGLE_SHEETS_ID")

# Gemini (for transcript analysis)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Search configuration
SEARCH_LOCATION = {
    "lat": -33.8025,  # Parklands, Cape Town
    "lng": 18.5350
}
SEARCH_RADIUS_METERS = 35000  # 35km
