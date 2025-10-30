from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models import ExpertRequest, RequestStatus, ChatMessage, ChatSession
from database import get_database
from routes.auth import get_current_user, oauth2_scheme
from routes.expert_auth import get_current_expert
from auth import verify_token
from bson import ObjectId
from datetime import datetime, timezone
from typing import List, Optional, Union
from pydantic import BaseModel
import os
import shutil

# Hybrid authentication function
async def get_current_user_or_expert(token: str = Depends(oauth2_scheme)):
    """Get current user or expert - supports both authentication types"""
    try:
        try:
            print(f"[hybrid-auth] received token prefix: {token[:8]}...")
        except Exception:
            print("[hybrid-auth] no token or not sliceable")
        # First try user authentication
        user = await get_current_user(token)
        print("[hybrid-auth] authenticated as user")
        return {"type": "user", "data": user}
    except HTTPException:
        # If user auth fails, try expert authentication
        try:
            # Create HTTPAuthorizationCredentials object for expert auth
            credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
            expert = await get_current_expert(credentials)
            print("[hybrid-auth] authenticated as expert")
            return {"type": "expert", "data": expert}
        except HTTPException:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials - neither user nor expert token",
                headers={"WWW-Authenticate": "Bearer"},
            )

class ExpertRequestCreate(BaseModel):
    disease: str
    message: str

# Directory for storing uploaded PDFs
EXPERT_UPLOADS_DIR = "expert_uploads"
os.makedirs(EXPERT_UPLOADS_DIR, exist_ok=True)

router = APIRouter(prefix="/expert", tags=["expert"])

@router.post("/request")
async def create_expert_request(
    disease: str = Form(...),
    message: str = Form(...),
    pdf_file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Create a new expert consultation request with optional PDF upload"""
    db = get_database()
    user_id = str(current_user["_id"])
    
    pdf_path = None
    if pdf_file:
        # Validate file type
        if not pdf_file.filename.endswith('.pdf'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are allowed"
            )
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        pdf_filename = f"{user_id}_{timestamp}_{pdf_file.filename}"
        pdf_path = os.path.join(EXPERT_UPLOADS_DIR, pdf_filename)
        
        # Save the uploaded file
        with open(pdf_path, "wb") as buffer:
            shutil.copyfileobj(pdf_file.file, buffer)
    
    request_doc = {
        "user_id": user_id,
        "disease": disease,
        "message": message,
        "pdf_path": pdf_path,
        "status": RequestStatus.PENDING,
        "created_at": datetime.utcnow()
    }
    
    result = await db.expert_requests.insert_one(request_doc)
    
    return {
        "message": "Expert consultation request created successfully",
        "request_id": str(result.inserted_id)
    }

@router.get("/requests", response_model=List[ExpertRequest])
async def get_user_requests(current_user: dict = Depends(get_current_user)):
    """Get user's expert consultation requests"""
    db = get_database()
    user_id = str(current_user["_id"])
    
    cursor = db.expert_requests.find({"user_id": user_id}).sort("created_at", -1)
    requests = []
    
    async for request in cursor:
        # Convert ObjectId to string and remove the original _id field
        request["id"] = str(request["_id"])
        request.pop("_id", None)  # Remove the original _id field to avoid conflicts
        requests.append(ExpertRequest(**request))
    
    return requests

@router.get("/requests/{request_id}/download-pdf")
async def download_expert_pdf(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Download the PDF file uploaded with the expert request"""
    db = get_database()
    user_id = str(current_user["_id"])
    
    try:
        request = await db.expert_requests.find_one({
            "_id": ObjectId(request_id),
            "user_id": user_id
        })
        
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )
        
        pdf_path = request.get("pdf_path")
        if not pdf_path or not os.path.exists(pdf_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PDF file not found"
            )
        
        filename = os.path.basename(pdf_path)
        return FileResponse(
            path=pdf_path,
            filename=f"expert_request_{filename}",
            media_type="application/pdf"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download PDF: {str(e)}"
        )

@router.get("/requests/{request_id}")
async def get_request_details(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get details of a specific expert request"""
    db = get_database()
    user_id = str(current_user["_id"])
    
    try:
        request = await db.expert_requests.find_one({
            "_id": ObjectId(request_id),
            "user_id": user_id
        })
        
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )
        
        request["id"] = str(request["_id"])
        return ExpertRequest(**request)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch request: {str(e)}"
        )

# Expert-side endpoints (to be implemented when expert panel is ready)
@router.get("/pending")
async def get_pending_requests():
    """Get all pending expert requests - for expert dashboard"""
    db = get_database()
    
    cursor = db.expert_requests.find({
        "status": RequestStatus.PENDING
    }).sort("created_at", 1)
    
    requests = []
    async for request in cursor:
        request["id"] = str(request["_id"])
        requests.append(ExpertRequest(**request))
    
    return requests

@router.put("/requests/{request_id}/respond")
async def respond_to_request(
    request_id: str,
    response: str
):
    """Expert responds to a consultation request"""
    db = get_database()
    
    try:
        result = await db.expert_requests.update_one(
            {"_id": ObjectId(request_id)},
            {
                "$set": {
                    "response": response,
                    "status": RequestStatus.RESOLVED,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )
        
        return {"message": "Response submitted successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit response: {str(e)}"
        )

# Chat endpoints
@router.post("/chat/{request_id}/start")
async def start_chat_session(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Start or resume a chat session for an expert request"""
    db = get_database()
    user_id = str(current_user["_id"])
    
    try:
        # Verify the request belongs to the user
        request = await db.expert_requests.find_one({
            "_id": ObjectId(request_id),
            "user_id": user_id
        })
        
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )
        
        # Check if chat session already exists
        existing_session = await db.chat_sessions.find_one({
            "request_id": request_id
        })
        
        if existing_session:
            # Return existing session
            existing_session["id"] = str(existing_session["_id"])
            return {"message": "Chat session resumed", "session_id": existing_session["id"]}
        
        # Create new chat session
        session_doc = {
            "request_id": request_id,
            "user_id": user_id,
            "expert_id": request.get("expert_id"),
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        
        result = await db.chat_sessions.insert_one(session_doc)
        
        return {
            "message": "Chat session started successfully",
            "session_id": str(result.inserted_id)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start chat session: {str(e)}"
        )

@router.get("/chat/{request_id}")
async def get_chat_session(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get chat session with messages"""
    db = get_database()
    user_id = str(current_user["_id"])
    
    try:
        # Verify request belongs to user
        request = await db.expert_requests.find_one({
            "_id": ObjectId(request_id),
            "user_id": user_id
        })
        
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )
        
        # Get chat session
        session = await db.chat_sessions.find_one({
            "request_id": request_id
        })
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found"
            )
        
        # Get messages for this session
        cursor = db.chat_messages.find({
            "request_id": request_id
        }).sort("timestamp", 1)
        
        messages = []
        async for message in cursor:
            message["id"] = str(message["_id"])
            message.pop("_id", None)
            messages.append(ChatMessage(**message))
        
        session["id"] = str(session["_id"])
        session["messages"] = messages
        session.pop("_id", None)
        
        return ChatSession(**session)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get chat session: {str(e)}"
        )

ATTACHMENTS_DIR = "chat_attachments"
os.makedirs(ATTACHMENTS_DIR, exist_ok=True)

@router.post("/chat/{request_id}/message")
async def send_chat_message(
    request_id: str,
    message: str = Form(""),
    upload: UploadFile = File(None),
    current_user_or_expert = Depends(get_current_user_or_expert)
):
    """Send a message in the chat (works for both users and experts)."""
    db = get_database()
    
    try:
        sender = "user" if current_user_or_expert["type"] == "user" else "expert"
        print(f"[chat] {sender} sending message to request_id: {request_id}")
        
        # Optional: if it's user, ensure the request belongs to them
        if sender == "user":
            user_id = str(current_user_or_expert["data"]["_id"])
            req = await db.expert_requests.find_one({
                "_id": ObjectId(request_id),
                "user_id": user_id
            })
            if not req:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Request not found"
                )
        
        # Handle optional file upload
        file_url = None
        file_name = None
        file_mime = None
        file_size = None
        if upload is not None:
            safe_name = f"{request_id}_{int(datetime.utcnow().timestamp())}_{upload.filename}"
            dest_path = os.path.join(ATTACHMENTS_DIR, safe_name)
            with open(dest_path, "wb") as out:
                content = await upload.read()
                out.write(content)
                file_size = len(content)
            file_name = upload.filename
            file_mime = upload.content_type or "application/octet-stream"
            # Expose via full backend URL for proper access from frontend
            file_url = f"http://localhost:8000/expert/chat/attachments/{safe_name}"

        # Create message document with dynamic sender and optional file
        message_doc = {
            "request_id": request_id,
            "sender": sender,
            "message": message or (file_name or ""),
            "timestamp": datetime.utcnow(),
        }
        if file_url:
            message_doc.update({
                "file_url": file_url,
                "file_name": file_name,
                "file_mime": file_mime,
                "file_size": file_size,
            })
        
        print(f"[chat] Saving message: {message_doc}")
        result = await db.chat_messages.insert_one(message_doc)
        print(f"[chat] Message saved with ID: {result.inserted_id}")
        
        # Update or create chat session timestamp
        await db.chat_sessions.update_one(
            {"request_id": request_id},
            {"$set": {"updated_at": datetime.utcnow()}},
            upsert=True
        )
        
        message_doc["id"] = str(result.inserted_id)
        message_doc.pop("_id", None)
        
        return ChatMessage(**message_doc)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sending message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )

@router.get("/chat/{request_id}/messages")
async def get_chat_messages(
    request_id: str,
    current_user_or_expert = Depends(get_current_user_or_expert)
):
    """Get all messages for a chat session - works for both users and experts"""
    db = get_database()
    
    try:
        print(f"Hybrid auth requesting messages for request_id: {request_id}")
        print(f"Auth type: {current_user_or_expert['type']}")
        
        # Get messages without strict user verification for experts
        cursor = db.chat_messages.find({
            "request_id": request_id
        }).sort("timestamp", 1)
        
        messages = []
        async for message in cursor:
            print(f"Found message: {message}")
            message["id"] = str(message["_id"])
            message.pop("_id", None)
            messages.append(ChatMessage(**message))
        
        print(f"Total messages found: {len(messages)}")
        return messages
        
    except Exception as e:
        print(f"Error getting messages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get messages: {str(e)}"
        )

# Separate expert endpoints that work with expert authentication
@router.get("/chat/{request_id}/messages")
async def get_expert_chat_messages(
    request_id: str,
    current_user_or_expert = Depends(get_current_user_or_expert)
):
    """Expert can get all messages for a chat session"""
    db = get_database()
    
    try:
        print(f"Hybrid auth expert requesting messages for request_id: {request_id}")
        print(f"Auth type: {current_user_or_expert['type']}")
        
        # Get messages without any filtering - expert should see all messages for this request
        cursor = db.chat_messages.find({
            "request_id": request_id
        }).sort("timestamp", 1)
        
        messages = []
        async for message in cursor:
            print(f"Found message: {message}")
            message["id"] = str(message["_id"])
            message.pop("_id", None)
            messages.append(ChatMessage(**message))
        
        print(f"Total messages found: {len(messages)}")
        return messages
        
    except Exception as e:
        print(f"Error getting expert chat messages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get messages: {str(e)}"
        )

@router.get("/chat/{request_id}")
async def get_expert_chat_session(
    request_id: str,
    current_user_or_expert = Depends(get_current_user_or_expert)
):
    """Expert can view chat session with patient"""
    db = get_database()
    
    try:
        print(f"Hybrid auth requesting chat session for request_id: {request_id}")
        print(f"Auth type: {current_user_or_expert['type']}")
        
        # Get chat session
        session = await db.chat_sessions.find_one({
            "request_id": request_id
        })
        
        print(f"Found session: {session}")
        
        if not session:
            print("No session found, creating new one")
            # Create session if it doesn't exist
            session_doc = {
                "request_id": request_id,
                "user_id": "",  # Will be filled from the request
                "expert_id": str(current_user_or_expert["data"]["_id"]) if current_user_or_expert['type'] == 'expert' else "",
                "is_active": True,
                "created_at": datetime.utcnow()
            }
            
            result = await db.chat_sessions.insert_one(session_doc)
            session = await db.chat_sessions.find_one({"_id": result.inserted_id})
        
        # Get messages for this session
        cursor = db.chat_messages.find({
            "request_id": request_id
        }).sort("timestamp", 1)
        
        messages = []
        async for message in cursor:
            print(f"Found message in session: {message}")
            message["id"] = str(message["_id"])
            message.pop("_id", None)
            messages.append(ChatMessage(**message))
        
        session["id"] = str(session["_id"])
        session["messages"] = messages
        session.pop("_id", None)
        
        print(f"Returning session with {len(messages)} messages")
        return ChatSession(**session)
        
    except Exception as e:
        print(f"Error getting expert chat session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get chat session: {str(e)}"
        )

@router.post("/chat/{request_id}/read")
async def mark_chat_read(
    request_id: str,
    current_user_or_expert = Depends(get_current_user_or_expert)
):
    """Mark all messages as read for the caller (user or expert)."""
    db = get_database()

    try:
        # Ensure session exists
        session = await db.chat_sessions.find_one({"request_id": request_id})
        if not session:
            # Create a minimal session if missing
            session_doc = {
                "request_id": request_id,
                "user_id": "",
                "expert_id": "",
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
            }
            await db.chat_sessions.insert_one(session_doc)

        # Determine who is reading
        role = current_user_or_expert.get("type")
        if role not in ("user", "expert"):
            raise HTTPException(status_code=401, detail="Unauthorized")

        field = "last_read_by_user" if role == "user" else "last_read_by_expert"
        now = datetime.now(timezone.utc)

        await db.chat_sessions.update_one(
            {"request_id": request_id},
            {"$set": {field: now, "updated_at": now}},
            upsert=True,
        )

        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark chat as read: {str(e)}",
        )

@router.get("/chat/{request_id}/unread_count")
async def get_unread_count(
    request_id: str,
    current_user_or_expert = Depends(get_current_user_or_expert)
):
    """Return unread message count for the caller based on last read timestamp."""
    db = get_database()

    try:
        role = current_user_or_expert.get("type")
        if role not in ("user", "expert"):
            raise HTTPException(status_code=401, detail="Unauthorized")

        opposite_sender = "expert" if role == "user" else "user"

        session = await db.chat_sessions.find_one({"request_id": request_id})
        # Default last read very old if not present
        default_epoch = datetime(1970, 1, 1, tzinfo=timezone.utc)
        last_read = session.get(
            "last_read_by_user" if role == "user" else "last_read_by_expert",
            default_epoch,
        ) if session else default_epoch

        count = await db.chat_messages.count_documents({
            "request_id": request_id,
            "sender": opposite_sender,
            "timestamp": {"$gt": last_read},
        })

        return {"unread": int(count)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get unread count: {str(e)}",
        )

@router.get("/chat/attachments/{filename}")
async def get_chat_attachment(filename: str):
    """Serve chat attachment file by filename"""
    path = os.path.join(ATTACHMENTS_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)

# (Removed duplicate expert-only send message endpoint; unified above.)