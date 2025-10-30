from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from models import UserCreate, UserLogin, UserComplete, OTPVerify, Token, TokenData, PhoneRegistration, User
from database import get_database
from auth import verify_password, get_password_hash, create_access_token, verify_token
from otp_service import send_otp, verify_otp
from bson import ObjectId
from datetime import datetime
import re

router = APIRouter(prefix="/auth", tags=["authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

def validate_phone_number(phone: str) -> bool:
    """Validate phone number format"""
    # Remove spaces and common separators for validation
    clean_phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    pattern = r'^\+?1?\d{9,15}$'
    return re.match(pattern, clean_phone) is not None

def validate_username(username: str) -> bool:
    """Validate username format"""
    pattern = r'^[a-zA-Z0-9_]{3,20}$'
    return re.match(pattern, username) is not None

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    # Debug: print a short prefix of the token so we can see if the frontend sent one
    try:
        print(f"get_current_user: received token prefix: {token[:8]}...")
    except Exception:
        print("get_current_user: no token received or token not sliceable")

    token_data = None
    try:
        token_data = verify_token(token, credentials_exception)
    except HTTPException:
        print("get_current_user: token verification failed, raising credentials_exception")
        raise
    db = get_database()
    user = await db.users.find_one({"username": token_data.username})
    
    if user is None:
        raise credentials_exception
    
    return user

@router.post("/register/phone")
async def register_phone(user_data: PhoneRegistration):
    """Step 1: Register with phone number and send OTP"""
    print(f"DEBUG: Received registration data: {user_data.dict()}")
    
    # Clean phone number by removing spaces and common separators
    clean_phone = user_data.phone_number.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    
    if not validate_phone_number(user_data.phone_number):
        print(f"DEBUG: Invalid phone number format: {user_data.phone_number}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid phone number format"
        )
    
    db = get_database()
    
    # Check if phone number already exists (use cleaned version for comparison)
    existing_user = await db.users.find_one({"phone_number": clean_phone})
    if existing_user and existing_user.get("username") and existing_user.get("password_hash"):
        # User has completed full registration
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
    
    # Send OTP (use cleaned phone number)
    if not await send_otp(clean_phone):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP"
        )
    
    # Store or update user data (use cleaned phone number)
    user_doc = {
        "phone_number": clean_phone,
        "is_verified": False,
        "created_at": datetime.utcnow()
    }
    
    if existing_user:
        await db.users.update_one(
            {"phone_number": clean_phone},
            {"$set": user_doc}
        )
    else:
        await db.users.insert_one(user_doc)
    
    return {"message": "OTP sent successfully"}

@router.post("/verify-otp")
async def verify_otp_endpoint(otp_data: OTPVerify):
    """Step 2: Verify OTP"""
    print(f"DEBUG: Verifying OTP for phone: {otp_data.phone_number}, OTP: {otp_data.otp}")
    
    # Clean phone number the same way as registration
    clean_phone = otp_data.phone_number.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    print(f"DEBUG: Cleaned phone number: {clean_phone}")
    
    if not verify_otp(clean_phone, otp_data.otp):
        print(f"DEBUG: OTP verification failed for {clean_phone}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
    
    db = get_database()
    await db.users.update_one(
        {"phone_number": clean_phone},
        {"$set": {"is_verified": True}}
    )
    
    print(f"DEBUG: OTP verified successfully for {clean_phone}")
    return {"message": "OTP verified successfully"}

@router.post("/register/complete")
async def complete_registration(user_data: UserComplete):
    """Step 3: Complete registration with username and password"""
    print(f"DEBUG: Completing registration for: {user_data.phone_number}")
    
    # Clean phone number consistently
    clean_phone = user_data.phone_number.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    print(f"DEBUG: Cleaned phone number: {clean_phone}")
    
    if not validate_username(user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid username format. Use 3-20 characters, letters, numbers, and underscore only"
        )
    
    if len(user_data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long"
        )
    
    db = get_database()
    
    # Check if user exists and is verified
    user = await db.users.find_one({
        "phone_number": clean_phone,
        "is_verified": True
    })
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number not verified"
        )
    
    # Check if username already exists
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Update user with username and password
    hashed_password = get_password_hash(user_data.password)
    await db.users.update_one(
        {"phone_number": clean_phone},
        {"$set": {
            "username": user_data.username,
            "password_hash": hashed_password
        }}
    )
    
    print(f"DEBUG: Registration completed for {clean_phone}")
    return {"message": "Registration completed successfully"}

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login with username and password"""
    db = get_database()
    user = await db.users.find_one({"username": form_data.username})
    
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user["username"], "user_type": "user"}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=User)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    # Convert ObjectId to string
    current_user["id"] = str(current_user.get("_id", ""))
    
    # Ensure all required fields exist
    if "name" not in current_user or not current_user["name"]:
        # Use username as fallback for name if name is missing
        current_user["name"] = current_user.get("username", "Anonymous User")
    
    # Remove the _id field to avoid conflicts
    current_user.pop("_id", None)
    
    return current_user