from twilio.rest import Client
import random
import os
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

# Twilio configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

# File-based OTP storage to persist between server reloads
OTP_STORAGE_FILE = Path(__file__).parent / "otp_storage.json"

def load_otp_storage():
    """Load OTP storage from file"""
    if OTP_STORAGE_FILE.exists():
        try:
            with open(OTP_STORAGE_FILE, 'r') as f:
                data = json.load(f)
                # Convert timestamp strings back to datetime objects
                for phone, otp_data in data.items():
                    otp_data["timestamp"] = datetime.fromisoformat(otp_data["timestamp"])
                return data
        except (json.JSONDecodeError, KeyError, ValueError):
            return {}
    return {}

def save_otp_storage(storage):
    """Save OTP storage to file"""
    # Convert datetime objects to strings for JSON serialization
    serializable_storage = {}
    for phone, otp_data in storage.items():
        serializable_storage[phone] = {
            "otp": otp_data["otp"],
            "timestamp": otp_data["timestamp"].isoformat(),
            "attempts": otp_data["attempts"]
        }
    
    with open(OTP_STORAGE_FILE, 'w') as f:
        json.dump(serializable_storage, f)

# Load existing OTP storage on module import
otp_storage = load_otp_storage()

def generate_otp():
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))

def store_otp(phone_number: str, otp: str):
    """Store OTP temporarily"""
    otp_storage[phone_number] = {
        "otp": otp,
        "timestamp": datetime.utcnow(),
        "attempts": 0
    }
    # Save to file to persist between server reloads
    save_otp_storage(otp_storage)

def verify_otp(phone_number: str, otp: str) -> bool:
    """Verify OTP"""
    print(f"DEBUG: Checking OTP storage for phone: {phone_number}")
    print(f"DEBUG: Current OTP storage keys: {list(otp_storage.keys())}")
    
    if phone_number not in otp_storage:
        print(f"DEBUG: Phone number {phone_number} not found in OTP storage")
        return False
    
    stored_data = otp_storage[phone_number]
    print(f"DEBUG: Found stored data: {stored_data}")
    
    # Check if OTP is expired (5 minutes)
    time_diff = datetime.utcnow() - stored_data["timestamp"]
    print(f"DEBUG: Time difference: {time_diff}, Max allowed: 5 minutes")
    if time_diff > timedelta(minutes=5):
        print(f"DEBUG: OTP expired for {phone_number}")
        del otp_storage[phone_number]
        save_otp_storage(otp_storage)
        return False
    
    # Check attempts (max 3)
    if stored_data["attempts"] >= 3:
        print(f"DEBUG: Max attempts exceeded for {phone_number}")
        del otp_storage[phone_number]
        save_otp_storage(otp_storage)
        return False
    
    # Verify OTP
    print(f"DEBUG: Comparing OTP - Stored: {stored_data['otp']}, Provided: {otp}")
    if stored_data["otp"] == otp:
        print(f"DEBUG: OTP match successful for {phone_number}")
        del otp_storage[phone_number]
        save_otp_storage(otp_storage)
        return True
    else:
        stored_data["attempts"] += 1
        print(f"DEBUG: OTP mismatch for {phone_number}, attempts now: {stored_data['attempts']}")
        save_otp_storage(otp_storage)
        return False

async def send_otp(phone_number: str):
    """Send OTP via Twilio SMS"""
    try:
        print(f"DEBUG: Attempting to send OTP to {phone_number}")
        print(f"DEBUG: Twilio Account SID: {TWILIO_ACCOUNT_SID[:10]}..." if TWILIO_ACCOUNT_SID else "DEBUG: No Account SID")
        print(f"DEBUG: Twilio Phone Number: {TWILIO_PHONE_NUMBER}")
        
        # Check if Twilio credentials are properly configured
        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_PHONE_NUMBER:
            print("DEBUG: Missing Twilio credentials, using development mode")
            otp = generate_otp()
            store_otp(phone_number, otp)
            print(f"Development mode - OTP for {phone_number}: {otp}")
            return True
        
        # Try to send actual SMS
        print("DEBUG: Sending actual SMS via Twilio")
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        otp = generate_otp()
        
        message = client.messages.create(
            body=f"Your CornCare verification code is: {otp}",
            from_=TWILIO_PHONE_NUMBER,
            to=phone_number
        )
        
        print(f"DEBUG: SMS sent successfully. Message SID: {message.sid}")
        store_otp(phone_number, otp)
        return True
        
    except Exception as e:
        print(f"DEBUG: Failed to send OTP via Twilio: {e}")
        print(f"DEBUG: Falling back to development mode")
        # Fallback to development mode if Twilio fails
        otp = generate_otp()
        store_otp(phone_number, otp)
        print(f"Development mode - OTP for {phone_number}: {otp}")
        return True