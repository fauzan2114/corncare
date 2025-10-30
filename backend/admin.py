#!/usr/bin/env python3
"""
CornCare Admin Tool - Generalized Commands for All Admin Functions
Usage: python admin.py <command> [options]
"""

import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import secrets
import string
from bson import ObjectId
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import shutil
from passlib.context import CryptContext
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
DB_URL = 'mongodb://localhost:27017'
DB_NAME = 'corncare_db'
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
ADMIN_EMAIL = os.getenv("CORNCARE_EMAIL", "corncare.global@gmail.com")
ADMIN_PASSWORD = os.getenv("CORNCARE_EMAIL_PASSWORD", "wcbp adzx jxin ioue")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class CornCareAdmin:
    def __init__(self):
        self.client = AsyncIOMotorClient(DB_URL)
        self.db = self.client[DB_NAME]
    
    async def close(self):
        self.client.close()
    
    def generate_credentials(self, name, email):
        """Generate username and password"""
        base = name.lower().replace(" ", "").replace(".", "")[:6]
        suffix = email.split('@')[0][-2:]
        random_num = ''.join(secrets.choice(string.digits) for _ in range(2))
        username = f"{base}{suffix}{random_num}"
        password = ''.join(secrets.choice(string.ascii_letters + string.digits + "!@#") for _ in range(10))
        return username, password
    
    async def send_email(self, to_email, subject, body):
        """Send email notification"""
        try:
            msg = MIMEMultipart()
            msg['From'] = ADMIN_EMAIL
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
            server.login(ADMIN_EMAIL, ADMIN_PASSWORD)
            server.send_message(msg)
            server.quit()
            return True
        except Exception as e:
            print(f"❌ Email failed: {e}")
            return False
    
    # COMMAND: list
    async def list_experts(self, status="all"):
        """List expert applications by status"""
        print(f"📋 EXPERT APPLICATIONS ({status.upper()})")
        print("=" * 50)
        
        filter_query = {}
        if status != "all":
            filter_query["verification_status"] = status
        
        experts = await self.db.experts.find(filter_query).to_list(None)
        
        if not experts:
            print(f"ℹ️  No {status} applications found")
            return []
        
        status_icons = {"pending": "⏳", "approved": "✅", "rejected": "❌"}
        
        for i, expert in enumerate(experts, 1):
            icon = status_icons.get(expert.get('verification_status', 'unknown'), "❓")
            print(f"\n{i}. {icon} {expert['name']}")
            print(f"   ID: {expert['_id']}")
            print(f"   Email: {expert['email']}")
            print(f"   Phone: {expert['phone']}")
            print(f"   Specialization: {expert['specialization']}")
            print(f"   Experience: {expert['experience']} years")
            print(f"   Status: {expert.get('verification_status', 'unknown')}")
            print(f"   Applied: {expert.get('created_at', 'N/A')}")
            if expert.get('username'):
                print(f"   Username: {expert['username']}")
        
        return experts
    
    # COMMAND: details
    async def get_details(self, expert_id):
        """Get detailed expert information"""
        print(f"🔍 EXPERT DETAILS")
        print("=" * 30)
        
        try:
            expert = await self.db.experts.find_one({"_id": ObjectId(expert_id)})
            if not expert:
                print(f"❌ Expert with ID {expert_id} not found")
                return None
            
            print(f"📄 Full Details for {expert['name']}:")
            print(f"   ID: {expert['_id']}")
            print(f"   Name: {expert['name']}")
            print(f"   Email: {expert['email']}")
            print(f"   Phone: {expert['phone']}")
            print(f"   Specialization: {expert['specialization']}")
            print(f"   Experience: {expert['experience']} years")
            print(f"   Qualification: {expert.get('qualification', 'N/A')}")
            print(f"   University: {expert.get('university', 'N/A')}")
            print(f"   Position: {expert.get('current_position', 'N/A')}")
            print(f"   Organization: {expert.get('organization', 'N/A')}")
            print(f"   Bio: {expert.get('bio', 'N/A')}")
            print(f"   Resume: {expert.get('resume_path', 'N/A')}")
            print(f"   Status: {expert.get('verification_status', 'unknown')}")
            print(f"   Applied: {expert.get('created_at', 'N/A')}")
            if expert.get('username'):
                print(f"   Username: {expert['username']}")
            if expert.get('approved_at'):
                print(f"   Approved: {expert['approved_at']}")
            
            return expert
        except Exception as e:
            print(f"❌ Error: {e}")
            return None
    
    # COMMAND: approve
    async def approve_expert(self, expert_id, notes="", send_email=True):
        """Approve expert application"""
        print(f"✅ APPROVING EXPERT")
        print("=" * 30)
        
        try:
            expert = await self.db.experts.find_one({"_id": ObjectId(expert_id)})
            if not expert:
                print(f"❌ Expert not found")
                return False
            
            if expert.get('verification_status') != 'pending':
                print(f"❌ Expert is already {expert.get('verification_status', 'unknown')}")
                return False
            
            # Generate credentials
            username, password = self.generate_credentials(expert['name'], expert['email'])
            hashed_password = pwd_context.hash(password)
            
            # Update database
            update_data = {
                "username": username,
                "password": hashed_password,
                "verification_status": "approved",
                "approved_at": datetime.utcnow(),
                "is_active": True,
                "is_verified": True
            }
            
            if notes:
                update_data["admin_notes"] = notes
            
            result = await self.db.experts.update_one(
                {"_id": ObjectId(expert_id)},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                print(f"✅ {expert['name']} approved successfully!")
                print(f"   Username: {username}")
                print(f"   Password: {password}")
                
                # Send email
                if send_email:
                    subject = "🎉 CornCare Expert Application Approved!"
                    body = f"""Dear {expert['name']},

Congratulations! Your CornCare expert application has been approved.

Login Credentials:
Username: {username}
Password: {password}

You can now access the expert dashboard and help farmers.

Best regards,
CornCare Team"""
                    
                    email_sent = await self.send_email(expert['email'], subject, body)
                    print(f"   Email sent: {'✅' if email_sent else '❌'}")
                
                return True
            else:
                print("❌ Failed to update database")
                return False
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    # COMMAND: reject
    async def reject_expert(self, expert_id, reason="", send_email=True):
        """Reject expert application"""
        print(f"❌ REJECTING EXPERT")
        print("=" * 30)
        
        try:
            expert = await self.db.experts.find_one({"_id": ObjectId(expert_id)})
            if not expert:
                print(f"❌ Expert not found")
                return False
            
            if expert.get('verification_status') != 'pending':
                print(f"❌ Expert is already {expert.get('verification_status', 'unknown')}")
                return False
            
            # Update database
            update_data = {
                "verification_status": "rejected",
                "rejected_at": datetime.utcnow()
            }
            
            if reason:
                update_data["rejection_reason"] = reason
            
            result = await self.db.experts.update_one(
                {"_id": ObjectId(expert_id)},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                print(f"❌ {expert['name']} rejected")
                print(f"   Reason: {reason}")
                
                # Send email
                if send_email:
                    subject = "CornCare Expert Application Status"
                    body = f"""Dear {expert['name']},

Thank you for your interest in becoming a CornCare expert.

Unfortunately, we cannot approve your application at this time.
{f'Reason: {reason}' if reason else ''}

You may reapply in the future.

Best regards,
CornCare Team"""
                    
                    email_sent = await self.send_email(expert['email'], subject, body)
                    print(f"   Email sent: {'✅' if email_sent else '❌'}")
                
                return True
            else:
                print("❌ Failed to update database")
                return False
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    # COMMAND: stats
    async def get_statistics(self):
        """Get application statistics"""
        print("📊 EXPERT APPLICATION STATISTICS")
        print("=" * 40)
        
        total = await self.db.experts.count_documents({})
        pending = await self.db.experts.count_documents({"verification_status": "pending"})
        approved = await self.db.experts.count_documents({"verification_status": "approved"})
        rejected = await self.db.experts.count_documents({"verification_status": "rejected"})
        
        print(f"📈 Total Applications: {total}")
        print(f"⏳ Pending: {pending}")
        print(f"✅ Approved: {approved}")
        print(f"❌ Rejected: {rejected}")
        
        if total > 0:
            print(f"\n📊 Percentages:")
            print(f"   Pending: {(pending/total)*100:.1f}%")
            print(f"   Approved: {(approved/total)*100:.1f}%")
            print(f"   Rejected: {(rejected/total)*100:.1f}%")
    
    # COMMAND: bulk-approve
    async def bulk_approve_all(self):
        """Approve all pending applications"""
        print("🚨 BULK APPROVE ALL PENDING")
        print("=" * 40)
        
        pending = await self.db.experts.find({"verification_status": "pending"}).to_list(None)
        
        if not pending:
            print("ℹ️  No pending applications")
            return
        
        print(f"⚠️  Will approve {len(pending)} applications:")
        for expert in pending:
            print(f"   - {expert['name']} ({expert['email']})")
        
        approved = 0
        for expert in pending:
            success = await self.approve_expert(str(expert['_id']), "Bulk approved", send_email=False)
            if success:
                approved += 1
        
        print(f"\n✅ Bulk approval complete: {approved}/{len(pending)} approved")
    
    # COMMAND: reset
    async def reset_expert(self, expert_id):
        """Reset expert to pending status"""
        print(f"🔄 RESETTING EXPERT TO PENDING")
        print("=" * 30)
        
        try:
            result = await self.db.experts.update_one(
                {"_id": ObjectId(expert_id)},
                {"$set": {
                    "verification_status": "pending",
                    "username": None,
                    "password": None,
                    "is_active": False,
                    "is_verified": False
                },
                "$unset": {
                    "approved_at": "",
                    "rejected_at": "",
                    "rejection_reason": "",
                    "admin_notes": ""
                }}
            )
            
            if result.modified_count > 0:
                print("✅ Expert reset to pending status")
                return True
            else:
                print("❌ Failed to reset expert")
                return False
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return False

    # COMMAND: download
    async def download_resume(self, expert_id, download_path="./downloads"):
        """Download expert's resume to specified path"""
        print(f"📥 DOWNLOADING EXPERT RESUME")
        print("=" * 30)
        
        try:
            expert = await self.db.experts.find_one({"_id": ObjectId(expert_id)})
            if not expert:
                print(f"❌ Expert with ID {expert_id} not found")
                return False
            
            resume_path = expert.get("resume_path")
            if not resume_path or not os.path.exists(resume_path):
                print(f"❌ Resume file not found for {expert['name']}")
                print(f"   Expected path: {resume_path}")
                return False
            
            # Create download directory if it doesn't exist
            os.makedirs(download_path, exist_ok=True)
            
            # Create a meaningful filename
            original_filename = os.path.basename(resume_path)
            expert_name = expert['name'].replace(' ', '_').replace('.', '_')
            download_filename = f"resume_{expert_name}_{expert_id}_{original_filename}"
            destination_path = os.path.join(download_path, download_filename)
            
            # Copy the file
            shutil.copy2(resume_path, destination_path)
            
            print(f"✅ Resume downloaded successfully!")
            print(f"   Expert: {expert['name']}")
            print(f"   Email: {expert['email']}")
            print(f"   From: {resume_path}")
            print(f"   To: {destination_path}")
            print(f"   File size: {os.path.getsize(destination_path)} bytes")
            
            return True
            
        except Exception as e:
            print(f"❌ Error downloading resume: {e}")
            return False

def print_usage():
    """Print usage information"""
    print("""
🔐 CornCare Admin Tool - Usage:

📋 LIST COMMANDS:
   python admin.py list [all|pending|approved|rejected]
   python admin.py list pending    # List only pending applications
   python admin.py list approved   # List only approved experts
   python admin.py list rejected   # List only rejected applications

🔍 DETAILS COMMAND:
   python admin.py details <expert_id>
   python admin.py details 68d948e8b76691401aed9357

✅ APPROVE COMMAND:
   python admin.py approve <expert_id> [notes]
   python admin.py approve 68d948e8b76691401aed9357
   python admin.py approve 68d948e8b76691401aed9357 "Excellent qualifications"

❌ REJECT COMMAND:
   python admin.py reject <expert_id> [reason]
   python admin.py reject 68d948e8b76691401aed9357
   python admin.py reject 68d948e8b76691401aed9357 "Insufficient experience"

📊 STATISTICS COMMAND:
   python admin.py stats

🔄 RESET COMMAND:
   python admin.py reset <expert_id>    # Reset expert to pending status

� DOWNLOAD COMMAND:
   python admin.py download <expert_id> [download_path]
   python admin.py download 68d948e8b76691401aed9357
   python admin.py download 68d948e8b76691401aed9357 ./my_downloads

�🚨 BULK COMMANDS:
   python admin.py bulk-approve         # Approve all pending (use with caution!)

💡 EXAMPLES:
   python admin.py list pending
   python admin.py approve 68d948e8b76691401aed9357 "Good credentials"
   python admin.py reject 68d948e8b76691401aed9357 "Needs more experience"
   python admin.py download 68d948e8b76691401aed9357 ./downloads
   python admin.py stats
""")

async def main():
    if len(sys.argv) < 2:
        print_usage()
        return
    
    command = sys.argv[1].lower()
    admin = CornCareAdmin()
    
    try:
        if command == "list":
            status = sys.argv[2] if len(sys.argv) > 2 else "all"
            await admin.list_experts(status)
        
        elif command == "details":
            if len(sys.argv) < 3:
                print("❌ Please provide expert ID")
                return
            expert_id = sys.argv[2]
            await admin.get_details(expert_id)
        
        elif command == "approve":
            if len(sys.argv) < 3:
                print("❌ Please provide expert ID")
                return
            expert_id = sys.argv[2]
            notes = " ".join(sys.argv[3:]) if len(sys.argv) > 3 else ""
            await admin.approve_expert(expert_id, notes)
        
        elif command == "reject":
            if len(sys.argv) < 3:
                print("❌ Please provide expert ID")
                return
            expert_id = sys.argv[2]
            reason = " ".join(sys.argv[3:]) if len(sys.argv) > 3 else ""
            await admin.reject_expert(expert_id, reason)
        
        elif command == "stats":
            await admin.get_statistics()
        
        elif command == "bulk-approve":
            await admin.bulk_approve_all()
        
        elif command == "reset":
            if len(sys.argv) < 3:
                print("❌ Please provide expert ID")
                return
            expert_id = sys.argv[2]
            await admin.reset_expert(expert_id)
        
        elif command == "download":
            if len(sys.argv) < 3:
                print("❌ Please provide expert ID")
                return
            expert_id = sys.argv[2]
            download_path = sys.argv[3] if len(sys.argv) > 3 else "./downloads"
            await admin.download_resume(expert_id, download_path)
        
        else:
            print(f"❌ Unknown command: {command}")
            print_usage()
    
    finally:
        await admin.close()

if __name__ == "__main__":
    asyncio.run(main())