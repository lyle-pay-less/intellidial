#!/usr/bin/env python3
"""
Script to find Firebase user ID by email
Usage: python scripts/find_user_id.py <email>
Example: python scripts/find_user_id.py lyle@automationarchitects.ai
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import firebase_admin
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent.parent / ".env")
except ImportError:
    print("⚠️  python-dotenv not installed, trying to load .env manually")
    env_path = Path(__file__).parent.parent.parent / ".env"
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

try:
    import firebase_admin
    from firebase_admin import credentials, auth, firestore
except ImportError:
    print("❌ firebase-admin not installed. Install with: pip install firebase-admin")
    sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/find_user_id.py <email>")
        print("Example: python scripts/find_user_id.py lyle@automationarchitects.ai")
        sys.exit(1)
    
    email = sys.argv[1]
    
    # Initialize Firebase Admin - try multiple methods
    try:
        if not firebase_admin._apps:
            # Method 1: Service account key from env vars
            project_id = os.getenv('FIREBASE_ADMIN_PROJECT_ID') or os.getenv('NEXT_PUBLIC_FIREBASE_PROJECT_ID')
            client_email = os.getenv('FIREBASE_ADMIN_CLIENT_EMAIL')
            private_key = os.getenv('FIREBASE_ADMIN_PRIVATE_KEY', '').replace('\\n', '\n')
            
            if project_id and client_email and private_key:
                print("✅ Using Firebase Admin credentials from env vars")
                cred = credentials.Certificate({
                    "project_id": project_id,
                    "client_email": client_email,
                    "private_key": private_key,
                })
                firebase_admin.initialize_app(cred)
            # Method 2: Service account JSON file
            elif os.getenv('GOOGLE_APPLICATION_CREDENTIALS'):
                print(f"✅ Using Firebase Admin credentials from: {os.getenv('GOOGLE_APPLICATION_CREDENTIALS')}")
                cred = credentials.Certificate(os.getenv('GOOGLE_APPLICATION_CREDENTIALS'))
                firebase_admin.initialize_app(cred)
            # Method 3: Application Default Credentials (ADC)
            else:
                print("✅ Using Application Default Credentials (ADC)")
                print("   Make sure you've run: gcloud auth application-default login")
                project_id = os.getenv('FIREBASE_ADMIN_PROJECT_ID') or os.getenv('NEXT_PUBLIC_FIREBASE_PROJECT_ID') or 'intellidial-39ca7'
                firebase_admin.initialize_app(credential=credentials.ApplicationDefault(), options={'projectId': project_id})
        else:
            print("✅ Firebase Admin already initialized")
    except Exception as e:
        print(f"❌ Failed to initialize Firebase Admin: {e}")
        sys.exit(1)
    
    try:
        print(f"\n🔍 Looking up user by email: {email}\n")
        
        # Try to get user by email from Firebase Auth
        try:
            user = auth.get_user_by_email(email)
            print("✅ Found user in Firebase Auth:")
            print(f"   User ID: {user.uid}")
            print(f"   Email: {user.email}")
            print(f"   Display Name: {user.display_name or '(not set)'}")
            print(f"   Email Verified: {user.email_verified}")
            user_id = user.uid
        except auth.UserNotFoundError:
            print("❌ User not found in Firebase Auth")
            user_id = None
        except Exception as e:
            print(f"❌ Error getting user: {e}")
            user_id = None
        
        # Check userOrganizations collection
        db = firestore.client()
        if user_id:
            user_org_ref = db.collection('userOrganizations').document(user_id)
            user_org_doc = user_org_ref.get()
            
            if user_org_doc.exists:
                data = user_org_doc.to_dict()
                org_id = data.get('orgId')
                print("\n📋 User-Organization mapping:")
                print(f"   Org ID: {org_id or '(not set)'}")
                
                if org_id:
                    org_ref = db.collection('organizations').document(org_id)
                    org_doc = org_ref.get()
                    if org_doc.exists:
                        org_data = org_doc.to_dict()
                        print(f"   Org Name: {org_data.get('name', '(not set)')}")
            else:
                print("\n⚠️  No userOrganizations document found")
            
            # Check team memberships
            orgs_ref = db.collection('organizations')
            orgs = orgs_ref.stream()
            memberships = []
            
            for org_doc in orgs:
                member_ref = org_doc.reference.collection('members').document(user_id)
                member_doc = member_ref.get()
                if member_doc.exists:
                    org_data = org_doc.to_dict()
                    member_data = member_doc.to_dict()
                    memberships.append({
                        'orgId': org_doc.id,
                        'orgName': org_data.get('name', 'Unknown'),
                        'role': member_data.get('role', 'unknown'),
                    })
            
            if memberships:
                print("\n👥 Team Memberships:")
                for m in memberships:
                    print(f"   - {m['orgName']} ({m['orgId']}) - Role: {m['role']}")
            else:
                print("\n⚠️  No team memberships found")
        
        # Also list all userOrganizations mappings
        print("\n🔍 Searching userOrganizations collection...")
        all_user_orgs = db.collection('userOrganizations').stream()
        user_org_list = list(all_user_orgs)
        print(f"   Found {len(user_org_list)} user-org mappings")
        
        if user_org_list:
            print("\n📊 All user-org mappings:")
            for doc in user_org_list:
                data = doc.to_dict()
                org_id = data.get('orgId', '(not set)')
                print(f"   User ID: {doc.id} → Org ID: {org_id}")
        
        print("\n✅ Done")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
