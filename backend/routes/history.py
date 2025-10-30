from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from models import DetectionHistory
from database import get_database
from routes.auth import get_current_user
from pdf_generator import generate_detection_pdf
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from typing import List

# Indian Standard Time (IST) is UTC+5:30
IST = timezone(timedelta(hours=5, minutes=30))

router = APIRouter(prefix="/history", tags=["history"])

@router.get("/", response_model=List[DetectionHistory])
async def get_user_history(current_user: dict = Depends(get_current_user)):
    """Get user's detection history"""
    db = get_database()
    user_id = str(current_user["_id"])
    
    print(f"DEBUG: Fetching history for user_id: {user_id}")
    
    cursor = db.history.find({"user_id": user_id}).sort("detected_at", -1)
    history = []
    
    count = 0
    async for record in cursor:
        count += 1
        print(f"DEBUG: Processing record {count}: {record.get('disease', 'unknown')} - {record.get('detected_at', 'no date')}")
        # Convert ObjectId to string and remove the original _id field
        record["id"] = str(record["_id"])
        print(f"DEBUG: Converted ID: {record['id']}")
        record.pop("_id", None)  # Remove the original _id field to avoid conflicts
        
        # Convert datetime to string for JSON serialization with IST timezone
        if "detected_at" in record:
            # Convert UTC datetime to IST
            utc_datetime = record["detected_at"]
            if utc_datetime.tzinfo is None:
                # If datetime is naive (no timezone info), assume it's UTC
                utc_datetime = utc_datetime.replace(tzinfo=timezone.utc)
            
            # Convert to IST
            ist_datetime = utc_datetime.astimezone(IST)
            record["detected_at"] = ist_datetime.isoformat()
        
        print(f"DEBUG: Record after processing: {list(record.keys())}")
        history.append(DetectionHistory(**record))
    
    print(f"DEBUG: Found {len(history)} history records for user {user_id}")
    
    # Debug: Check first record's id field
    if history:
        first_record = history[0]
        print(f"DEBUG: First record ID field: {getattr(first_record, 'id', 'NOT_FOUND')}")
    
    return history

@router.get("/{history_id}/pdf")
async def download_history_pdf(
    history_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Download detection history as PDF"""
    db = get_database()
    user_id = str(current_user["_id"])
    
    print(f"DEBUG: PDF download requested for history_id: {history_id}, user_id: {user_id}")
    
    try:
        history_record = await db.history.find_one({
            "_id": ObjectId(history_id),
            "user_id": user_id
        })
        
        if not history_record:
            print(f"DEBUG: History record not found for ID: {history_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="History record not found"
            )
        
        print(f"DEBUG: Found history record: {history_record.get('disease', 'unknown')}")
        
        # Convert to dict for PDF generation
        utc_datetime = history_record["detected_at"]
        if utc_datetime.tzinfo is None:
            # If datetime is naive, assume it's UTC
            utc_datetime = utc_datetime.replace(tzinfo=timezone.utc)
        
        # Convert to IST for display
        ist_datetime = utc_datetime.astimezone(IST)
        
        pdf_data = {
            "detected_at": ist_datetime.strftime("%Y-%m-%d %H:%M:%S IST"),
            "disease_name": history_record["disease_name"],
            "confidence": history_record["confidence"],
            "cure": history_record["cure"],
            "tips": history_record["tips"],
            "image_path": history_record.get("image_path")  # Match the field name from prediction
        }
        
        print(f"DEBUG: Generating PDF with data: {pdf_data}")
        
        # Generate PDF
        pdf_buffer = generate_detection_pdf(pdf_data)
        
        # Return as streaming response
        filename = f"detection_report_{history_id}.pdf"
        
        print(f"DEBUG: PDF generated successfully, returning as: {filename}")
        
        return StreamingResponse(
            iter([pdf_buffer.getvalue()]),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        print(f"DEBUG: PDF generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}"
        )

@router.delete("/{history_id}")
async def delete_history_record(
    history_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a specific detection history record"""
    db = get_database()
    user_id = str(current_user["_id"])
    
    print(f"DEBUG: Delete requested for history_id: {history_id}, user_id: {user_id}")
    
    try:
        # First check if the record exists and belongs to the user
        history_record = await db.history.find_one({
            "_id": ObjectId(history_id),
            "user_id": user_id
        })
        
        if not history_record:
            print(f"DEBUG: History record not found for deletion: {history_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="History record not found or you don't have permission to delete it"
            )
        
        # Delete the record
        result = await db.history.delete_one({
            "_id": ObjectId(history_id),
            "user_id": user_id
        })
        
        if result.deleted_count == 1:
            print(f"DEBUG: Successfully deleted history record: {history_id}")
            return {
                "message": "History record deleted successfully",
                "deleted_id": history_id
            }
        else:
            print(f"DEBUG: Failed to delete history record: {history_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete history record"
            )
            
    except Exception as e:
        print(f"DEBUG: Delete operation failed: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete history record: {str(e)}"
        )