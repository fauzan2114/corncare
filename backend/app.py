from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path
import tensorflow as tf
from PIL import Image
import numpy as np
import io
import os
from cures import disease_info
from dotenv import load_dotenv
from utils import preprocess_image, is_plant_image, is_corn_like_image, calculate_prediction_entropy
import numpy as np
from pathlib import Path as _Path
from datetime import datetime
import random
import json

# New imports for enhanced features
from database import connect_to_mongo, close_mongo_connection, get_database
from routes import auth, history, expert, expert_auth, expert_dashboard, admin, resume
from routes.auth import get_current_user
from models import DetectionHistory
from bson import ObjectId

# Load environment variables from a .env file if present
load_dotenv()

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
# Allow overriding the model path via environment variable MODEL_PATH
_default_model = Path(__file__).parent / "corn_disease_model_best_20250918-141251.h5"
MODEL_PATH = Path(os.getenv("MODEL_PATH", str(_default_model)))
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

# Helper: TTA predictions
def tta_predict_pil(pil_img: Image.Image) -> np.ndarray:
    """
    Run model prediction with simple test-time augmentations and average probs.
    Returns averaged probability vector over CLASSES.
    """
    variants = [pil_img]
    try:
        if USE_TTA:
            # Horizontal flip
            variants.append(pil_img.transpose(Image.FLIP_LEFT_RIGHT))
            # Small rotations
            if TTA_ROT_DEGREES > 0:
                variants.append(pil_img.rotate(TTA_ROT_DEGREES, resample=Image.BICUBIC))
                variants.append(pil_img.rotate(-TTA_ROT_DEGREES, resample=Image.BICUBIC))
    except Exception as e:
        print(f"TTA variant generation failed: {e}")

    probs = []
    for v in variants:
        arr = preprocess_image(v)
        pred = model.predict(arr, verbose=0)[0]
        probs.append(pred)
    probs = np.array(probs)
    avg = probs.mean(axis=0)
    return avg

# Optional: Load embedding model and centroids for OOD detection
EMBED_IMG_SIZE = 224
centroids = None
embed_model = None
CENTROIDS_PATH = Path(__file__).parent / "centroids.npz"
try:
    if CENTROIDS_PATH.exists():
        data = np.load(str(CENTROIDS_PATH))
        centroids = {k: data[k] for k in data.files}
        print(f"Loaded centroids for classes: {list(centroids.keys())}")
        # Load MobileNetV2 once
        embed_model = tf.keras.applications.MobileNetV2(weights='imagenet', include_top=False, pooling='avg', input_shape=(EMBED_IMG_SIZE, EMBED_IMG_SIZE, 3))
        print("Embedding model (MobileNetV2) loaded for OOD checks")
    else:
        print("centroids.npz not found; centroid-based OOD will be disabled")
except Exception as e:
    print(f"Failed to initialize centroid OOD: {e}")
    centroids = None
    embed_model = None

# Class labels
CLASSES = ["blight", "common_rust", "gray_leaf_spot", "healthy"]

# Configuration for OOD detection (tunable via env)
MIN_CONFIDENCE = float(os.getenv("MIN_CONFIDENCE", 0.60))
MIN_GREEN_RATIO = float(os.getenv("MIN_GREEN_RATIO", 0.05))
MAX_PREDICTION_ENTROPY = float(os.getenv("MAX_PREDICTION_ENTROPY", 1.20))
MIN_TOP2_CONFIDENCE_GAP = float(os.getenv("MIN_TOP2_CONFIDENCE_GAP", 0.10))
CENTROID_THRESHOLD = float(os.getenv("CENTROID_THRESHOLD", 20.0))  # Calibrate with script for best results

# Feature flags to quickly toggle checks without code changes
ENABLE_CENTROID_OOD = os.getenv("ENABLE_CENTROID_OOD", "1") not in ("0", "false", "False")
ENABLE_HEURISTIC_OOD = os.getenv("ENABLE_HEURISTIC_OOD", "1") not in ("0", "false", "False")
ENABLE_ENTROPY_CHECK = os.getenv("ENABLE_ENTROPY_CHECK", "1") not in ("0", "false", "False")
ENABLE_GAP_CHECK = os.getenv("ENABLE_GAP_CHECK", "1") not in ("0", "false", "False")
DEBUG_OOD_RESPONSES = os.getenv("DEBUG_OOD_RESPONSES", "0") not in ("0", "false", "False")

# Inference-time enhancements
USE_TTA = os.getenv("USE_TTA", "1") not in ("0", "false", "False")
TTA_ROT_DEGREES = int(os.getenv("TTA_ROT_DEGREES", 15))  # small rotations ±deg

# Response language (en or hi)
RESPONSE_LANG = os.getenv("RESPONSE_LANG", "en")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "model_loaded": model is not None}

@app.post("/predict")
async def predict(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Predict corn plant disease from image (requires authentication)
    """
    if not model:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    # Get language from Accept-Language header, fallback to RESPONSE_LANG env, then 'en'
    accept_lang = request.headers.get('Accept-Language', RESPONSE_LANG).lower()
    # Normalize: extract primary language code (e.g., 'hi-IN' -> 'hi')
    response_lang = accept_lang.split('-')[0].split(',')[0].strip() if accept_lang else 'en'
    print(f"Response language: {response_lang}")
    
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

        # Enhanced multi-stage validation

        # Stage 1: Centroid OOD check using embeddings (run early to avoid heuristic false negatives)
        nearest_class = None
        nearest_distance = None
        if ENABLE_CENTROID_OOD and embed_model is not None and centroids is not None:
            try:
                # Prepare image for embedding model
                emb_img = img.resize((EMBED_IMG_SIZE, EMBED_IMG_SIZE)).convert('RGB')
                emb_arr = tf.keras.preprocessing.image.img_to_array(emb_img) / 255.0
                emb_arr = np.expand_dims(emb_arr, axis=0)
                embedding = embed_model.predict(emb_arr, verbose=0)[0]
                # Compute nearest centroid distance
                distances = {name: float(np.linalg.norm(embedding - vec)) for name, vec in centroids.items()}
                nearest_class = min(distances, key=distances.get)
                nearest_distance = distances[nearest_class]
                print(f"Centroid OOD - nearest: {nearest_class}, distance: {nearest_distance:.4f}, threshold: {CENTROID_THRESHOLD}")
            except HTTPException:
                raise
            except Exception as e:
                print(f"Centroid OOD check failed: {e}")

        # Stage 2: Heuristic corn-like check (soft gate; allow pass if centroid is strong)
        is_corn, metrics = (True, {})
        if ENABLE_HEURISTIC_OOD:
            is_corn, metrics = is_corn_like_image(img)
            print(f"Corn-like check: {is_corn}, metrics: {metrics}")

        # Only hard-reject if BOTH fail (heuristic false negatives are common)
        if (is_corn is False) and (nearest_distance is None or nearest_distance > CENTROID_THRESHOLD):
            detail_obj = {
                "reason": "corn_like_and_centroid_failed",
                "message": "Image does not appear to be a corn plant.",
                "corn_like_metrics": metrics,
                "centroid": {
                    "nearest_class": nearest_class,
                    "nearest_distance": nearest_distance,
                    "threshold": CENTROID_THRESHOLD
                }
            }
            # Provide a more specific message hint
            if metrics.get("green_ratio", 0) < 0.10:
                detail_obj["message"] = "Not enough plant material detected. Please upload a corn leaf close-up."
            elif metrics.get("blue_ratio", 0) > 0.25:
                detail_obj["message"] = "Too much sky/blue region. Please upload a close-up of corn leaves."
            elif metrics.get("color_variance", 0) < 100:
                detail_obj["message"] = "Image lacks leaf texture details. Please upload a clearer image."
            elif metrics.get("bright_green_ratio", 0) > 0.60:
                detail_obj["message"] = "Image seems like a different plant species (too bright green)."
            elif metrics.get("brightness_mean", 0) > 200:
                detail_obj["message"] = "Image is too bright. Corn leaves are typically darker."

            if DEBUG_OOD_RESPONSES:
                raise HTTPException(status_code=400, detail=detail_obj)
            else:
                raise HTTPException(status_code=400, detail=detail_obj["message"])

        # Do NOT hard-reject solely on centroid distance; only reject if both checks fail

        # Stage 2b: Model prediction (with optional TTA)
        probs = tta_predict_pil(img)
        predictions = np.expand_dims(probs, axis=0)
        predicted_class = CLASSES[int(np.argmax(probs))]
        confidence = float(np.max(probs))
        
        # Get top 2 predictions
        sorted_indices = np.argsort(probs)[::-1]
        top1_confidence = float(probs[sorted_indices[0]])
        top2_confidence = float(probs[sorted_indices[1]])
        confidence_gap = top1_confidence - top2_confidence

        print(f"Prediction: {predicted_class} with confidence {confidence:.4f}")
        print(f"All predictions: {probs}")
        print(f"Top 2 confidence gap: {confidence_gap:.4f}")
        
        # Stage 3: Check prediction entropy (is model confused?)
        entropy = calculate_prediction_entropy(probs)
        print(f"Prediction entropy: {entropy:.4f}")
        
        if ENABLE_ENTROPY_CHECK and entropy > MAX_PREDICTION_ENTROPY:
            detail_obj = {
                "reason": "high_entropy",
                "message": "Unable to identify the plant species. This may not be a corn leaf.",
                "entropy": entropy,
                "max_entropy": MAX_PREDICTION_ENTROPY
            }
            if DEBUG_OOD_RESPONSES:
                raise HTTPException(status_code=400, detail=detail_obj)
            else:
                raise HTTPException(status_code=400, detail=detail_obj["message"])
        
        # Stage 4: Check top 2 confidence gap
        if ENABLE_GAP_CHECK and confidence_gap < MIN_TOP2_CONFIDENCE_GAP:
            detail_obj = {
                "reason": "small_top2_gap",
                "message": "Model is uncertain about the classification. This may not be a corn leaf.",
                "gap": confidence_gap,
                "min_gap": MIN_TOP2_CONFIDENCE_GAP
            }
            if DEBUG_OOD_RESPONSES:
                raise HTTPException(status_code=400, detail=detail_obj)
            else:
                raise HTTPException(status_code=400, detail=detail_obj["message"])
        
        # Stage 5: Check confidence threshold
        if confidence < MIN_CONFIDENCE:
            detail_obj = {
                "reason": "low_confidence",
                "message": "Low confidence prediction. Please upload a clearer corn leaf image.",
                "confidence": confidence,
                "min_confidence": MIN_CONFIDENCE
            }
            if DEBUG_OOD_RESPONSES:
                raise HTTPException(status_code=400, detail=detail_obj)
            else:
                raise HTTPException(status_code=400, detail=detail_obj["message"])

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

        # Get disease information (use request language, not env default)
        info = disease_info.get(predicted_class, {})
        if not info:
            info = {
                "name": predicted_class,
                "cure": "No specific cure information available",
                "tips": "Continue monitoring plant health"
            }

        # Get disease info in both languages (always return both for client-side switching)
        disease_name_en = info.get('name') or predicted_class
        disease_name_hi = info.get('name_hi') or disease_name_en
        cure_text_en = info.get('cure') or "No specific cure information available"
        cure_text_hi = info.get('cure_hi') or cure_text_en
        tips_text_en = info.get('tips') or "Continue monitoring plant health"
        tips_text_hi = info.get('tips_hi') or tips_text_en
        
        # For backward compatibility and history storage, use language from request
        if response_lang and response_lang.startswith('hi'):
            disease_name = disease_name_hi
            cure_text = cure_text_hi
            tips_text = tips_text_hi
        else:
            disease_name = disease_name_en
            cure_text = cure_text_en
            tips_text = tips_text_en

        # Save to user's history
        try:
            db = get_database()
            user_id = str(current_user["_id"])
            
            history_record = {
                "user_id": user_id,
                "disease": predicted_class,
                "disease_name": disease_name,
                "confidence": confidence,
                "cure": cure_text,
                "tips": tips_text,
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
            "disease_name": disease_name,
            "confidence": confidence,
            "cure": cure_text,
            "tips": tips_text,
            # Include both language versions for client-side switching
            "disease_name_en": disease_name_en,
            "disease_name_hi": disease_name_hi,
            "cure_en": cure_text_en,
            "cure_hi": cure_text_hi,
            "tips_en": tips_text_en,
            "tips_hi": tips_text_hi
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
