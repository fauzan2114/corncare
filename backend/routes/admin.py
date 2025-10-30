from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.responses import FileResponse
from database import get_database
from auth import get_password_hash
from bson import ObjectId
from datetime import datetime
import secrets
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from typing import List

router = APIRouter(prefix="/admin", tags=["admin"])

# Email configuration (set these in environment variables)
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
ADMIN_EMAIL = os.getenv("CORNCARE_EMAIL", "corncare.official@gmail.com")
ADMIN_PASSWORD = os.getenv("CORNCARE_EMAIL_PASSWORD", "")

def generate_username(name: str, email: str) -> str:
    """Generate a unique username for expert"""
    # Take first name and add some random characters
    first_name = name.split()[0].lower()
    random_suffix = ''.join(secrets.choice(string.digits) for _ in range(4))
    return f"expert_{first_name}_{random_suffix}"

def generate_password() -> str:
    """Generate a secure random password"""
    length = 12
    characters = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(characters) for _ in range(length))

def send_approval_email(expert_email: str, expert_name: str, username: str, password: str):
    """Send approval email to expert with login credentials"""
    try:
        msg = MIMEMultipart()
        msg['From'] = ADMIN_EMAIL
        msg['To'] = expert_email
        msg['Subject'] = "🌽 Welcome to CornCare Expert Panel - Your Application Approved!"
        
        body = f"""
Dear Dr. {expert_name},

🎉 Congratulations! Your application to join the CornCare Expert Panel has been APPROVED!

We are excited to have you as part of our agricultural expert community, helping farmers with corn disease management and providing professional consultation.

🔐 Your Login Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Username: {username}
Password: {password}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 Expert Dashboard Access:
Please visit: http://localhost:5173/expert-login
(Use the credentials above to login)

🔒 Security Note:
• Keep these credentials secure and confidential
• We recommend changing your password after first login
• Never share your login details with anyone

📋 What's Next:
1. Login to your expert dashboard
2. Review pending consultation requests from farmers
3. Download and analyze disease detection reports
4. Provide professional advice and recommendations
5. Help farmers improve their crop health

🤝 Your Role as a CornCare Expert:
• Review farmer consultation requests
• Analyze uploaded disease detection reports (PDFs)
• Provide expert advice on disease management
• Share prevention tips and treatment recommendations
• Make a positive impact on agricultural productivity

📞 Support:
If you have any questions or need assistance, please contact our team at this email address.

Thank you for joining our mission to support farmers with cutting-edge agricultural technology and expert knowledge!

Best regards,
The CornCare Team
🌽 Empowering Farmers with AI & Expert Knowledge

---
This is an automated email from CornCare Expert Management System.
Please do not reply to this email directly.
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        if ADMIN_PASSWORD:  # Only send email if password is configured
            try:
                server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
                server.starttls()
                server.login(ADMIN_EMAIL, ADMIN_PASSWORD)
                text = msg.as_string()
                server.sendmail(ADMIN_EMAIL, expert_email, text)
                server.quit()
                print(f"✅ Approval email sent successfully to {expert_email}")
                return True
            except smtplib.SMTPAuthenticationError:
                print(f"⚠️ SMTP Authentication failed. Trying without authentication...")
                try:
                    # Some SMTP servers allow sending without authentication
                    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
                    server.starttls()
                    text = msg.as_string()
                    server.sendmail(ADMIN_EMAIL, expert_email, text)
                    server.quit()
                    print(f"✅ Email sent without authentication to {expert_email}")
                    return True
                except Exception as e2:
                    print(f"❌ Both authentication methods failed: {str(e2)}")
                    return False
        else:
            print(f"⚠️ Email configuration missing! Would send to {expert_email}:")
            print(f"Username: {username}")
            print(f"Password: {password}")
            print("📧 Email preview:")
            print(body)
            return False
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        return False

@router.get("/expert-applications")
async def get_expert_applications():
    """Get all pending expert applications"""
    db = get_database()
    
    cursor = db.experts.find({
        "verification_status": "pending"
    }).sort("created_at", 1)
    
    applications = []
    async for expert in cursor:
        expert["id"] = str(expert["_id"])
        expert.pop("_id", None)
        applications.append(expert)
    
    return applications

@router.get("/expert-applications/{expert_id}")
async def get_expert_application_details(expert_id: str):
    """Get detailed information about a specific expert application"""
    db = get_database()
    
    expert = await db.experts.find_one({"_id": ObjectId(expert_id)})
    if not expert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expert application not found"
        )
    
    expert["id"] = str(expert["_id"])
    expert.pop("_id", None)
    return expert

@router.get("/expert-applications/{expert_id}/resume")
async def download_expert_resume(expert_id: str):
    """Download expert's resume"""
    db = get_database()
    
    expert = await db.experts.find_one({"_id": ObjectId(expert_id)})
    if not expert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expert application not found"
        )
    
    resume_path = expert.get("resume_path")
    if not resume_path or not os.path.exists(resume_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file not found"
        )
    
    filename = os.path.basename(resume_path)
    return FileResponse(
        path=resume_path,
        filename=f"resume_{expert['name'].replace(' ', '_')}_{filename}",
        media_type="application/octet-stream"
    )

@router.post("/expert-applications/{expert_id}/approve")
async def approve_expert_application(expert_id: str):
    """Approve expert application and send credentials"""
    db = get_database()
    
    try:
        # Get expert details
        expert = await db.experts.find_one({"_id": ObjectId(expert_id)})
        if not expert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expert application not found"
            )
        
        if expert.get("verification_status") != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Expert application is not in pending status (current: {expert.get('verification_status')})"
            )
        
        print(f"📋 Processing approval for expert: {expert['name']} ({expert['email']})")
        
        # Generate credentials
        username = generate_username(expert["name"], expert["email"])
        password = generate_password()
        hashed_password = get_password_hash(password)
        
        print(f"🔐 Generated credentials - Username: {username}")
        
        # Update expert record with detailed logging
        update_data = {
            "username": username,
            "password": hashed_password,
            "is_active": True,
            "is_verified": True,
            "verification_status": "approved",
            "approved_at": datetime.utcnow()
        }
        
        result = await db.experts.update_one(
            {"_id": ObjectId(expert_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Failed to update expert record - Expert not found"
            )
        
        if result.modified_count == 0:
            print("⚠️ Warning: Expert record was not modified (may already be updated)")
        else:
            print("✅ Expert record updated successfully in database")
        
        # Verify the update was successful
        updated_expert = await db.experts.find_one({"_id": ObjectId(expert_id)})
        if not updated_expert or updated_expert.get("username") != username:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database update verification failed"
            )
        
        print(f"✅ Database update verified - Username: {updated_expert.get('username')}")
        
        # Send email with credentials
        print(f"📧 Sending approval email to: {expert['email']}")
        email_sent = send_approval_email(
            expert["email"], 
            expert["name"], 
            username, 
            password
        )
        
        response_data = {
            "message": "Expert application approved successfully",
            "expert_id": expert_id,
            "expert_name": expert["name"],
            "expert_email": expert["email"],
            "username": username,
            "email_sent": email_sent,
            "database_updated": True
        }
        
        # Include password in response only if email failed to send
        if not email_sent:
            response_data["password"] = password
            response_data["note"] = "Email failed to send. Please provide these credentials to the expert manually."
        else:
            response_data["note"] = "Login credentials have been sent to expert's email address."
        
        print(f"🎉 Expert approval process completed successfully!")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error during expert approval: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to approve expert application: {str(e)}"
        )

@router.post("/expert-applications/{expert_id}/reject")
async def reject_expert_application(
    expert_id: str,
    reason: str = Form(...)
):
    """Reject expert application"""
    db = get_database()
    
    try:
        result = await db.experts.update_one(
            {"_id": ObjectId(expert_id)},
            {
                "$set": {
                    "verification_status": "rejected",
                    "rejection_reason": reason,
                    "rejected_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expert application not found"
            )
        
        return {"message": "Expert application rejected"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reject expert application: {str(e)}"
        )

@router.get("/stats")
async def get_admin_stats():
    """Get admin dashboard statistics"""
    db = get_database()
    
    # Count applications by status
    pending_count = await db.experts.count_documents({"verification_status": "pending"})
    approved_count = await db.experts.count_documents({"verification_status": "approved"})
    rejected_count = await db.experts.count_documents({"verification_status": "rejected"})
    
    # Count consultation requests
    total_requests = await db.expert_requests.count_documents({})
    pending_requests = await db.expert_requests.count_documents({"status": "pending"})
    resolved_requests = await db.expert_requests.count_documents({"status": "resolved"})
    
    return {
        "expert_applications": {
            "pending": pending_count,
            "approved": approved_count,
            "rejected": rejected_count,
            "total": pending_count + approved_count + rejected_count
        },
        "consultation_requests": {
            "total": total_requests,
            "pending": pending_requests,
            "resolved": resolved_requests
        }
    }