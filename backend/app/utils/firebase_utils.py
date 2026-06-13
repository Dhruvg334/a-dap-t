import os
import json
import firebase_admin
from firebase_admin import credentials, auth, firestore
from dotenv import load_dotenv

load_dotenv()

def initialize_firebase():
    if not firebase_admin._apps:
        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        service_account_info = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

        try:
            if service_account_path and os.path.exists(service_account_path):
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
                print(f"Firebase initialized with file: {service_account_path}")
            elif service_account_info:
                cred_dict = json.loads(service_account_info)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                print("Firebase initialized with JSON string")
            else:
                firebase_admin.initialize_app()
                print("Firebase initialized with default credentials")
        except Exception as e:
            print(f"Firebase initialization failed: {e}")
            return None
    return firestore.client()

db = initialize_firebase()

def get_db():
    return db

def verify_token(token: str):
    if not token:
        print("DEBUG: verify_token received empty token")
        return None

    # 1. Clean the token: remove whitespace, quotes, and "Bearer " prefix if present
    original_len = len(token)
    token = token.strip().replace('"', '').replace("'", "")

    if token.lower().startswith("bearer "):
        token = token[7:].strip()

    clean_len = len(token)

    # 2. Log details for debugging (helpful to spot truncation or wrong field)
    print(f"DEBUG: Token Length: {clean_len} (Original: {original_len})")
    print(f"DEBUG: Token Starts With: {token[:15]}...")
    print(f"DEBUG: Token Ends With: ...{token[-15:]}")

    # 3. Basic JWT Sanity Check (must have 2 dots separating 3 parts)
    if token.count('.') != 2:
        print(f"DEBUG: ERROR - Invalid Token Structure. Found {token.count('.') + 1} segments (Expected 3).")
        return None

    try:
        # 4. Verify the ID token with Firebase
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print(f"DEBUG: Firebase Error - {str(e)}")
        return None
