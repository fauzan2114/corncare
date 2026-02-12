from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "corncare_db")

class MongoDB:
    client: AsyncIOMotorClient = None
    database = None

db = MongoDB()

async def connect_to_mongo():
    """Create database connection"""
    db.client = AsyncIOMotorClient(MONGODB_URL)
    db.database = db.client[DATABASE_NAME]
    print(f"Connected to MongoDB at {MONGODB_URL}")
    
    # Create indexes
    try:
        # Drop old username index if it exists (non-sparse)
        try:
            await db.database.users.drop_index("username_1")
            print("Dropped old username index")
        except:
            pass  # Index might not exist
        
        # Create sparse unique index for username (allows multiple nulls)
        await db.database.users.create_index("username", unique=True, sparse=True)
        
        # Create unique index for phone_number
        await db.database.users.create_index("phone_number", unique=True, sparse=True)
        
        # Create unique index for email
        await db.database.users.create_index("email", unique=True, sparse=True)
        
        print("Database indexes created successfully")
    except Exception as e:
        print(f"Note: Index creation skipped or failed: {e}")

async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
        print("Disconnected from MongoDB")

def get_database():
    return db.database