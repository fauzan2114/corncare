#!/usr/bin/env python3
"""
Commands to view and manage expert requests from database
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import json

async def view_expert_requests():
    print("🔍 EXPERT REQUESTS DATABASE COMMANDS")
    print("=" * 50)
    
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.corncare_db
    
    try:
        # 1. Check if experts collection exists
        collections = await db.list_collection_names()
        print(f"📋 Available Collections: {collections}")
        print(f"🔍 Experts collection exists: {'experts' in collections}")
        
        if 'experts' in collections:
            # 2. Count total expert applications
            total_experts = await db.experts.count_documents({})
            print(f"\n📊 Total Expert Applications: {total_experts}")
            
            # 3. Count by status
            pending_count = await db.experts.count_documents({"verification_status": "pending"})
            approved_count = await db.experts.count_documents({"verification_status": "approved"})
            rejected_count = await db.experts.count_documents({"verification_status": "rejected"})
            
            print(f"   📝 Pending: {pending_count}")
            print(f"   ✅ Approved: {approved_count}")
            print(f"   ❌ Rejected: {rejected_count}")
            
            # 4. List all expert requests
            if total_experts > 0:
                print(f"\n📄 ALL EXPERT APPLICATIONS:")
                print("-" * 50)
                
                experts = await db.experts.find().to_list(None)
                for i, expert in enumerate(experts, 1):
                    print(f"\n{i}. Expert Application:")
                    print(f"   ID: {expert['_id']}")
                    print(f"   Name: {expert['name']}")
                    print(f"   Email: {expert['email']}")
                    print(f"   Phone: {expert['phone']}")
                    print(f"   Specialization: {expert['specialization']}")
                    print(f"   Experience: {expert['experience']} years")
                    print(f"   University: {expert['university']}")
                    print(f"   Position: {expert['current_position']}")
                    print(f"   Organization: {expert['organization']}")
                    print(f"   Status: {expert['verification_status']}")
                    print(f"   Applied: {expert['created_at']}")
                    if expert.get('approved_at'):
                        print(f"   Approved: {expert['approved_at']}")
                    if expert.get('username'):
                        print(f"   Username: {expert['username']}")
                    print(f"   Resume: {expert.get('resume_path', 'N/A')}")
                
                # 5. Show pending applications specifically
                pending_experts = await db.experts.find({"verification_status": "pending"}).to_list(None)
                if pending_experts:
                    print(f"\n⏳ PENDING APPLICATIONS NEEDING REVIEW:")
                    print("-" * 50)
                    for expert in pending_experts:
                        print(f"• {expert['name']} ({expert['email']}) - {expert['specialization']}")
                        print(f"  Applied: {expert['created_at']}")
                        print(f"  Experience: {expert['experience']} years")
                        print()
            else:
                print("\nℹ️  No expert applications found in database")
        else:
            print("\n❌ Experts collection does not exist yet")
            print("   Collection will be created when first expert registers")
            
    except Exception as e:
        print(f"❌ Database error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(view_expert_requests())