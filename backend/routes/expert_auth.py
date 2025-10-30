from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models import ExpertLogin
from database import get_database
from auth import create_access_token, get_password_hash, verify_password, verify_token
from bson import ObjectId
from datetime import datetime
import logging
import os
import shutil
from typing import Optional

# Directory for storing resumes
RESUME_UPLOADS_DIR = "resume_uploads"
os.makedirs(RESUME_UPLOADS_DIR, exist_ok=True)

router = APIRouter(prefix="/expert-auth", tags=["expert-auth"])
security = HTTPBearer()

logger = logging.getLogger(__name__)

@router.post("/register")
async def expert_register(
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    specialization: str = Form(...),
    experience: int = Form(...),
    qualification: str = Form(...),
    university: str = Form(...),
    current_position: str = Form(...),
    organization: str = Form(...),
    bio: str = Form(...),
    resume_file: UploadFile = File(...)
):
    """Register a new expert with resume upload"""
    db = get_database()
    
    # Validate resume file
    if not resume_file.filename.lower().endswith(('.pdf', '.doc', '.docx')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume must be a PDF, DOC, or DOCX file"
        )
    
    # Check if expert already exists
    existing_expert = await db.experts.find_one({"email": email})
    if existing_expert:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expert with this email already exists"
        )
    
    # Save resume file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    resume_filename = f"{email.replace('@', '_').replace('.', '_')}_{timestamp}_{resume_file.filename}"
    resume_path = os.path.join(RESUME_UPLOADS_DIR, resume_filename)
    
    with open(resume_path, "wb") as buffer:
        shutil.copyfileobj(resume_file.file, buffer)
    
    # Create expert document (without password initially)
    expert_doc = {
        "name": name,
        "email": email,
        "phone": phone,
        "specialization": specialization,
        "experience": experience,
        "qualification": qualification,
        "university": university,
        "current_position": current_position,
        "organization": organization,
        "bio": bio,
        "resume_path": resume_path,
        "username": None,
        "password": None,
        "is_active": False,
        "is_verified": False,
        "verification_status": "pending",
        "created_at": datetime.utcnow(),
        "approved_at": None
    }
    
    result = await db.experts.insert_one(expert_doc)
    
    return {
        "message": "Expert application submitted successfully. Please wait for admin review and approval. You will receive login credentials via email once approved.",
        "expert_id": str(result.inserted_id)
    }

@router.post("/login")
async def expert_login(expert_data: ExpertLogin):
    """Expert login using username and password"""
    db = get_database()
    
    # Find expert by username
    expert = await db.experts.find_one({"username": expert_data.username})
    if not expert:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Verify password
    if not verify_password(expert_data.password, expert["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Check if expert is active and verified
    if not expert.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Expert account is deactivated"
        )
    
    if not expert.get("is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Expert account is not verified yet. Please wait for admin approval."
        )
    
    # Create access token
    token_data = {
        "sub": expert["username"],  # Subject - required by JWT standard
        "expert_id": str(expert["_id"]),
        "email": expert["email"],
        "name": expert["name"],
        "type": "expert",
        "user_type": "expert"  # For compatibility with verify_token
    }
    
    access_token = create_access_token(data=token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expert": {
            "id": str(expert["_id"]),
            "name": expert["name"],
            "email": expert["email"],
            "specialization": expert["specialization"],
            "experience": expert["experience"]
        }
    }

async def get_current_expert(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current expert from token"""
    try:
        token = credentials.credentials
        
        # Decode the JWT token directly to get all payload data
        from jose import jwt, JWTError
        from auth import SECRET_KEY, ALGORITHM
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Check if this is an expert token
        if payload.get("type") != "expert":
            print(f"Token verification failed: Invalid token type: {payload.get('type')}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid token type"
            )
        
        expert_id = payload.get("expert_id")
        if expert_id is None:
            print("Token verification failed: No expert_id in token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        db = get_database()
        expert = await db.experts.find_one({"_id": ObjectId(expert_id)})
        
        if expert is None:
            print(f"Token verification failed: Expert not found for ID: {expert_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Expert not found"
            )
        
        if not expert.get("is_active", False) or not expert.get("is_verified", False):
            print(f"Token verification failed: Expert not active/verified")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Expert account is not active or verified"
            )
        
        return expert
        
    except JWTError as e:
        print(f"Token verification failed: JWT Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Token verification failed: Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
        
        return expert
        
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

@router.get("/me")
async def get_expert_profile(current_expert: dict = Depends(get_current_expert)):
    """Get expert profile"""
    return {
        "id": str(current_expert["_id"]),
        "name": current_expert["name"],
        "email": current_expert["email"],
        "specialization": current_expert["specialization"],
        "experience": current_expert["experience"],
        "qualification": current_expert["qualification"]
    }