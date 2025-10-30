from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.responses import FileResponse
from models import ExpertRequest, RequestStatus
from database import get_database
from routes.expert_auth import get_current_expert
from bson import ObjectId
from datetime import datetime
from typing import List
import os

router = APIRouter(prefix="/expert-dashboard", tags=["expert-dashboard"])

@router.get("/pending-requests")
async def get_pending_requests(current_expert: dict = Depends(get_current_expert)):
    """Get all pending consultation requests for expert dashboard"""
    db = get_database()
    
    cursor = db.expert_requests.find({
        "status": RequestStatus.PENDING
    }).sort("created_at", 1)  # Oldest first
    
    requests = []
    async for request in cursor:
        # Get user details
        user = await db.users.find_one({"_id": ObjectId(request["user_id"])})
        # Users might have 'name', 'username', or neither
        if user:
            user_name = user.get("name") or user.get("username") or f"User {str(user['_id'])[:8]}"
        else:
            user_name = "Unknown User"
        
        request["id"] = str(request["_id"])
        request["user_name"] = user_name
        request.pop("_id", None)
        requests.append(request)
    
    return requests

@router.get("/my-requests")
async def get_expert_assigned_requests(current_expert: dict = Depends(get_current_expert)):
    """Get requests assigned to current expert"""
    db = get_database()
    expert_id = str(current_expert["_id"])
    
    cursor = db.expert_requests.find({
        "expert_id": expert_id
    }).sort("created_at", -1)  # Newest first
    
    requests = []
    async for request in cursor:
        # Get user details
        user = await db.users.find_one({"_id": ObjectId(request["user_id"])})
        # Users might have 'name', 'username', or neither
        if user:
            user_name = user.get("name") or user.get("username") or f"User {str(user['_id'])[:8]}"
        else:
            user_name = "Unknown User"
        
        request["id"] = str(request["_id"])
        request["user_name"] = user_name
        request.pop("_id", None)
        requests.append(request)
    
    return requests

@router.post("/requests/{request_id}/assign")
async def assign_request_to_self(
    request_id: str,
    current_expert: dict = Depends(get_current_expert)
):
    """Assign a pending request to current expert"""
    db = get_database()
    expert_id = str(current_expert["_id"])
    
    try:
        result = await db.expert_requests.update_one(
            {
                "_id": ObjectId(request_id),
                "status": RequestStatus.PENDING
            },
            {
                "$set": {
                    "expert_id": expert_id,
                    "status": RequestStatus.IN_PROGRESS,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found or already assigned"
            )
        
        return {"message": "Request assigned successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign request: {str(e)}"
        )

@router.post("/requests/{request_id}/respond")
async def respond_to_request(
    request_id: str,
    response: str = Form(...),
    current_expert: dict = Depends(get_current_expert)
):
    """Expert responds to a consultation request"""
    db = get_database()
    expert_id = str(current_expert["_id"])
    
    try:
        result = await db.expert_requests.update_one(
            {
                "_id": ObjectId(request_id),
                "expert_id": expert_id
            },
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
                detail="Request not found or not assigned to you"
            )
        
        return {"message": "Response submitted successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit response: {str(e)}"
        )

@router.get("/requests/{request_id}/pdf")
async def download_request_pdf(
    request_id: str,
    current_expert: dict = Depends(get_current_expert)
):
    """Download PDF file attached to a consultation request"""
    db = get_database()
    
    try:
        request = await db.expert_requests.find_one({"_id": ObjectId(request_id)})
        
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
            filename=f"consultation_{filename}",
            media_type="application/pdf"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download PDF: {str(e)}"
        )

@router.get("/stats")
async def get_expert_stats(current_expert: dict = Depends(get_current_expert)):
    """Get expert dashboard statistics"""
    db = get_database()
    expert_id = str(current_expert["_id"])
    
    # Count requests by status
    pending_count = await db.expert_requests.count_documents({"status": RequestStatus.PENDING})
    in_progress_count = await db.expert_requests.count_documents({
        "expert_id": expert_id,
        "status": RequestStatus.IN_PROGRESS
    })
    resolved_count = await db.expert_requests.count_documents({
        "expert_id": expert_id,
        "status": RequestStatus.RESOLVED
    })
    
    return {
        "pending_requests": pending_count,
        "my_in_progress": in_progress_count,
        "my_resolved": resolved_count,
        "total_handled": in_progress_count + resolved_count
    }