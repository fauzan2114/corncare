from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path
import tensorflow as tf
from PIL import Image
import numpy as np
import io
import os
from cures import disease_info
from utils import preprocess_image, is_plant_image
import numpy as np
from pathlib import Path as _Path
from datetime import datetime
import random

# New imports for enhanced features
from database import connect_to_mongo, close_mongo_connection, get_database
from routes import auth, history, expert, expert_auth, expert_dashboard, admin, resume
from routes.auth import get_current_user
from models import DetectionHistory
from bson import ObjectId

app = FastAPI(
    title="CornCare API",
    description="API for corn plant disease detection with user management",
    version="2.0.0"
)

# Include routers
app.include_router(auth.router)
app.include_router(history.router)
app.include_router(expert.router)
app.include_router(expert_auth.router)
app.include_router(expert_dashboard.router)
app.include_router(admin.router)
app.include_router(resume.router)

# Database connection events
@app.on_event("startup")
async def startup_event():
    print("Starting database connection...")
    await connect_to_mongo()
    print("Database connected successfully")

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

# CORS configuration
# Allow common dev origins (localhost + local network) and support overriding via CORS_ORIGINS env var.
cors_origins = os.getenv("CORS_ORIGINS", "*")
# Normalize CORS origins: accept comma-separated list and allow values like 'localhost:5173'
if cors_origins.strip() == "*" or cors_origins.strip() == "":
    allow_origins = ["*"]
else:
    raw = [o.strip() for o in cors_origins.split(",") if o.strip()]
    allow_origins = []
    for o in raw:
        if o == '*':
            allow_origins = ['*']
            break
        # If scheme is missing, assume http:// (common in local dev)
        if not (o.startswith('http://') or o.startswith('https://')):
            o = 'http://' + o
        allow_origins.append(o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Load model
MODEL_PATH = Path(__file__).parent / "corn_disease_model_best_20250918-141251.h5"
try:
    if MODEL_PATH.exists():
        # Re-enable model loading
        import tensorflow as tf
        model = tf.keras.models.load_model(str(MODEL_PATH), compile=False)
        print(f"Loaded model from {MODEL_PATH} (compile=False)")
    else:
        print(f"Model file not found at {MODEL_PATH}")
        model = None
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Class labels
CLASSES = ["blight", "common_rust", "gray_leaf_spot", "healthy"]

# Simple configuration
MIN_CONFIDENCE = 0.5

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "model_loaded": model is not None}

@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Predict corn plant disease from image (requires authentication)
    """
    if not model:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    # Validate file
    if file.content_type not in ["image/jpeg", "image/jpg", "image/png"]:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    try:
        # Read and preprocess image
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(status_code=400, detail="File too large")
            
        print(f"Received file: {file.filename}, size: {len(content)} bytes")
        img = Image.open(io.BytesIO(content))

        # Simple preprocessing
        img_array = preprocess_image(img)

        # Simple prediction - just get the class and confidence
        predictions = model.predict(img_array)
        predicted_class = CLASSES[np.argmax(predictions[0])]
        confidence = float(np.max(predictions[0]))

        print(f"Prediction: {predicted_class} with confidence {confidence:.4f}")

        # Save uploaded image to disk for PDF generation
        uploads_dir = "uploads"
        if not os.path.exists(uploads_dir):
            os.makedirs(uploads_dir)
        
        # Generate unique filename with timestamp
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
        saved_filename = f"{timestamp}_{predicted_class}{file_extension}"
        image_path = os.path.join(uploads_dir, saved_filename)
        
        # Save the image
        with open(image_path, "wb") as f:
            f.write(content)

        # Get disease information
        info = disease_info.get(predicted_class, {
            "name": predicted_class,
            "cure": "No specific cure information available",
            "tips": "Continue monitoring plant health"
        })

        # Save to user's history
        try:
            db = get_database()
            user_id = str(current_user["_id"])
            
            history_record = {
                "user_id": user_id,
                "disease": predicted_class,
                "disease_name": info.get("name", predicted_class),
                "confidence": confidence,
                "cure": info["cure"],
                "tips": info["tips"],
                "image_filename": file.filename,
                "image_path": image_path,  # Add the saved image path
                "detected_at": datetime.utcnow()
            }
            
            result = await db.history.insert_one(history_record)
            print(f"History saved with ID: {result.inserted_id}")
            
        except Exception as e:
            print(f"Failed to save to history: {e}")
            # Don't fail the request if history save fails

        return JSONResponse({
            "label": predicted_class,
            "disease_name": info.get("name", predicted_class),
            "confidence": confidence,
            "cure": info["cure"],
            "tips": info["tips"]
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Convert the saved HDF5 model to the native Keras format
# (conversion moved out of server start to avoid runtime errors; keep conversion as a separate script if needed)

@app.get("/test/history")
async def test_history(current_user: dict = Depends(get_current_user)):
    """Test endpoint to check history collection"""
    db = get_database()
    user_id = str(current_user["_id"])
    
    # Count total records
    total_count = await db.history.count_documents({})
    user_count = await db.history.count_documents({"user_id": user_id})
    
    # Get a sample record
    sample = await db.history.find_one({"user_id": user_id})
    
    return {
        "total_history_records": total_count,
        "user_history_records": user_count,
        "user_id": user_id,
        "sample_record": str(sample) if sample else "No records found",
        "database_connected": bool(db)
    }
