from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class PhoneRegistration(BaseModel):
    phone_number: str

class UserCreate(BaseModel):
    name: str
    phone_number: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserComplete(BaseModel):
    phone_number: str
    username: str
    password: str

class OTPVerify(BaseModel):
    phone_number: str
    otp: str

class User(BaseModel):
    id: Optional[str] = None
    name: str
    phone_number: str
    username: Optional[str] = None
    password_hash: Optional[str] = None
    is_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True

class DetectionHistory(BaseModel):
    id: Optional[str] = None
    user_id: str
    disease: str
    disease_name: str
    confidence: float
    cure: str
    tips: str
    image_filename: Optional[str] = None
    saved_image_path: Optional[str] = None
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True

class RequestStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"

class ExpertRequest(BaseModel):
    id: Optional[str] = None
    user_id: str
    expert_id: Optional[str] = None
    disease: str
    message: str
    pdf_path: Optional[str] = None
    status: RequestStatus = RequestStatus.PENDING
    response: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True

class Expert(BaseModel):
    id: Optional[str] = None
    name: str
    email: str
    phone: str
    specialization: str
    experience: int
    qualification: str
    university: str
    current_position: str
    organization: str
    bio: str
    resume_path: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    verification_status: str = "pending"  # pending, approved, rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True

class ExpertRegister(BaseModel):
    name: str
    email: str
    phone: str
    specialization: str
    experience: int
    qualification: str
    university: str
    current_position: str
    organization: str
    bio: str

class ExpertLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    user_type: Optional[str] = None  # "user" or "expert"

class ChatMessage(BaseModel):
    id: Optional[str] = None
    request_id: str
    sender: str  # "user" or "expert"
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    # Optional attachment fields
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_mime: Optional[str] = None
    file_size: Optional[int] = None
    
    class Config:
        populate_by_name = True

class ChatSession(BaseModel):
    id: Optional[str] = None
    request_id: str
    user_id: str
    expert_id: Optional[str] = None
    is_active: bool = True
    messages: List[ChatMessage] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True