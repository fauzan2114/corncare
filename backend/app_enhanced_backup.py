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

# Thresholds for improved accuracy
MIN_GREEN_RATIO = float(os.getenv('MIN_GREEN_RATIO', 0.03))
MIN_CONFIDENCE = float(os.getenv('MIN_CONFIDENCE', 0.65))  # Increased from 0.5
MIN_MARGIN = float(os.getenv('MIN_MARGIN', 0.15))  # New: minimum gap between top 2 predictions
TEMP_SCALE = float(os.getenv('TEMP_SCALE', 1.0))  # Temperature scaling for calibration

# Enhanced uncertainty detection
UNCERTAINTY_THRESHOLD = float(os.getenv('UNCERTAINTY_THRESHOLD', 0.7))  # Combined uncertainty score

# Embedding / centroid OOD detector (optional)
EMBEDDING_MODEL = None
CENTROIDS = None
CENTROIDS_PATH = Path(__file__).parent / 'centroids.npz'
CENTROID_THRESHOLD = float(os.getenv('CENTROID_THRESHOLD', 28.0))  # euclidean distance threshold, increased to accept more valid samples

# Optional per-class centroid thresholds (95th-percentile values from validation)
# These were computed by compute_centroid_distances.py and hard-coded here as a safe default.
# Keys are normalized to match centroid keys and model labels.
CENTROID_THRESHOLDS = {
    "blight": float(os.getenv('CENTROID_THRESHOLD_BLIGHT', 24.7598)),
    "common_rust": float(os.getenv('CENTROID_THRESHOLD_COMMON_RUST', 30.0)),  # Increased threshold
    "gray_leaf_spot": float(os.getenv('CENTROID_THRESHOLD_GRAY_LEAF_SPOT', 24.1110)),
    "healthy": float(os.getenv('CENTROID_THRESHOLD_HEALTHY', 20.6033)),
}

# Test-time augmentation flag
USE_TTA = os.getenv('USE_TTA', '1') not in ('0', 'false', 'False')
TTA_TRANSFORMS = int(os.getenv('TTA_TRANSFORMS', 5))

# Directory to save OOD/rejected samples for inspection
OOD_DIR = Path(__file__).parent / "ood_samples"
OOD_DIR.mkdir(exist_ok=True)

# Directory to save accepted samples for inspection and a small CSV log
ACCEPTED_DIR = Path(__file__).parent / "accepted_samples"
ACCEPTED_DIR.mkdir(exist_ok=True)
PREDICTION_LOG = Path(__file__).parent / "prediction_log.csv"
if not PREDICTION_LOG.exists():
    try:
        with open(PREDICTION_LOG, 'w', encoding='utf-8') as f:
            f.write('timestamp,filename,predicted_class,confidence,distance,threshold,green_ratio\n')
    except Exception as e:
        print(f"Failed to create prediction log: {e}")

def load_embedding_and_centroids():
    global EMBEDDING_MODEL, CENTROIDS
    try:
        # TEMPORARILY DISABLE EMBEDDING MODEL LOADING FOR TESTING
        # EMBEDDING_MODEL = tf.keras.applications.MobileNetV2(weights='imagenet', include_top=False, pooling='avg', input_shape=(224,224,3))
        EMBEDDING_MODEL = None
        if CENTROIDS_PATH.exists():
            data = np.load(str(CENTROIDS_PATH))
            # Normalize centroid keys to lowercase underscored names to match model label style
            CENTROIDS = {}
            for k in data.files:
                norm_k = k.lower().replace(' ', '_')
                CENTROIDS[norm_k] = data[k]
            print(f"Loaded centroids for classes: {list(CENTROIDS.keys())}")
        else:
            CENTROIDS = None
            print("Centroids file not found; OOD centroid check disabled")
    except Exception as e:
        print(f"Error setting up embedding model/centroids: {e}")
        EMBEDDING_MODEL = None
        CENTROIDS = None

# TEMPORARILY DISABLE CENTROID LOADING FOR TESTING
# load_embedding_and_centroids()

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

        # Basic plant heuristic check
        is_plant, green_ratio = is_plant_image(img, min_green_ratio=MIN_GREEN_RATIO)
        print(f"Green ratio: {green_ratio:.4f}, is_plant: {is_plant}")
        if not is_plant:
            raise HTTPException(status_code=400, detail="Uploaded image does not appear to contain plant/leaf content")

        # We'll perform an embedding-distance OOD check against the centroid of the predicted class
        img_array = preprocess_image(img)

        # Enhanced prediction with uncertainty detection
        def enhanced_predict(pil_img, transforms=TTA_TRANSFORMS):
            """
            Enhanced prediction with temperature scaling and uncertainty detection
            """
            ops = []
            ops.append(lambda im: im)
            ops.append(lambda im: im.transpose(Image.FLIP_LEFT_RIGHT))
            ops.append(lambda im: im.rotate(5))
            ops.append(lambda im: im.rotate(-5))
            ops.append(lambda im: im.transpose(Image.FLIP_LEFT_RIGHT).rotate(5))

            chosen = []
            i = 0
            while len(chosen) < transforms:
                chosen.append(ops[i % len(ops)])
                i += 1

            arrs = []
            for fn in chosen:
                t = fn(pil_img.copy())
                a = preprocess_image(t)
                arrs.append(a)

            batch = np.vstack(arrs)
            logits = model.predict(batch)
            
            # Apply temperature scaling for better calibration
            logits_scaled = logits / TEMP_SCALE
            
            # Convert to probabilities
            exp_logits = np.exp(logits_scaled - np.max(logits_scaled, axis=1, keepdims=True))
            probs = exp_logits / np.sum(exp_logits, axis=1, keepdims=True)
            
            # Average across TTA transforms
            mean_probs = np.mean(probs, axis=0)
            
            # Calculate uncertainty metrics
            top2_indices = np.argsort(mean_probs)[-2:][::-1]
            top1_conf = mean_probs[top2_indices[0]]
            top2_conf = mean_probs[top2_indices[1]]
            margin = top1_conf - top2_conf
            
            # Entropy-based uncertainty
            entropy = -np.sum(mean_probs * np.log(mean_probs + 1e-8))
            max_entropy = np.log(len(CLASSES))
            normalized_entropy = entropy / max_entropy
            
            # Combined uncertainty score
            uncertainty_score = (1 - top1_conf) * 0.5 + normalized_entropy * 0.3 + (1 - margin) * 0.2
            
            is_uncertain = (top1_conf < MIN_CONFIDENCE) or (margin < MIN_MARGIN) or (uncertainty_score > UNCERTAINTY_THRESHOLD)
            
            return mean_probs, uncertainty_score, is_uncertain, {
                'top1_conf': float(top1_conf),
                'top2_conf': float(top2_conf), 
                'margin': float(margin),
                'entropy': float(entropy),
                'uncertainty_score': float(uncertainty_score)
            }

        if USE_TTA:
            probs, uncertainty_score, is_uncertain, uncertainty_details = enhanced_predict(img, transforms=TTA_TRANSFORMS)
            predictions = np.expand_dims(probs, 0)
        else:
            # Single prediction with uncertainty detection
            logits = model.predict(img_array)
            logits_scaled = logits / TEMP_SCALE
            exp_logits = np.exp(logits_scaled - np.max(logits_scaled, axis=1, keepdims=True))
            probs = exp_logits / np.sum(exp_logits, axis=1, keepdims=True)
            
            # Calculate uncertainty for single prediction
            top2_indices = np.argsort(probs[0])[-2:][::-1]
            top1_conf = probs[0][top2_indices[0]]
            top2_conf = probs[0][top2_indices[1]]
            margin = top1_conf - top2_conf
            
            entropy = -np.sum(probs[0] * np.log(probs[0] + 1e-8))
            max_entropy = np.log(len(CLASSES))
            normalized_entropy = entropy / max_entropy
            
            uncertainty_score = (1 - top1_conf) * 0.5 + normalized_entropy * 0.3 + (1 - margin) * 0.2
            is_uncertain = (top1_conf < MIN_CONFIDENCE) or (margin < MIN_MARGIN) or (uncertainty_score > UNCERTAINTY_THRESHOLD)
            
            uncertainty_details = {
                'top1_conf': float(top1_conf),
                'top2_conf': float(top2_conf),
                'margin': float(margin),
                'entropy': float(entropy),
                'uncertainty_score': float(uncertainty_score)
            }
            
            predictions = probs

        predicted_class = CLASSES[np.argmax(predictions[0])]
        confidence = float(np.max(predictions[0]))

        # Check if prediction is uncertain
        if is_uncertain:
            print(f"Uncertain prediction detected: {uncertainty_details}")
            # Return uncertainty response
            return JSONResponse(
                status_code=200,
                content={
                    "status": "uncertain",
                    "message": "Low confidence prediction detected. Please consult an agricultural expert for accurate diagnosis.",
                    "prediction": {
                        "predicted_class": predicted_class,
                        "confidence": confidence,
                        "uncertainty_details": uncertainty_details,
                        "all_predictions": {CLASSES[i]: float(predictions[0][i]) for i in range(len(CLASSES))},
                        "recommendation": "Consider taking another photo or consulting with an expert"
                    }
                }
            )

        # Mark low-confidence predictions but return result (let frontend handle UX)
        low_confidence = confidence < MIN_CONFIDENCE
        dist = None

        # Skip centroid OOD checks for low-confidence predictions (not reliable)
        if not low_confidence and EMBEDDING_MODEL is not None and CENTROIDS is not None:
            try:
                emb_img = img.resize((224,224)).convert('RGB')
                arr = np.array(emb_img).astype('float32') / 255.0
                arr = np.expand_dims(arr, 0)
                emb = EMBEDDING_MODEL.predict(arr)
                pred_key = predicted_class.lower()
                if pred_key in CENTROIDS:
                    centroid_vec = CENTROIDS[pred_key]
                    dist = float(np.linalg.norm(emb - centroid_vec))
                    print(f"Distance to predicted-class centroid ({pred_key}): {dist:.4f}")
                    # Prefer per-class threshold if available
                    thr = CENTROID_THRESHOLDS.get(pred_key, CENTROID_THRESHOLD)
                    if dist > thr:
                        # Save rejected image for inspection
                        try:
                            ts = datetime.utcnow().strftime('%Y%m%dT%H%M%S')
                            safe_name = Path(file.filename).stem if file.filename else 'upload'
                            fname = OOD_DIR / f"{safe_name}_{pred_key}_{int(dist*100):04d}_{ts}.jpg"
                            img.save(str(fname))
                            print(f"Saved OOD sample to {fname}")
                        except Exception as e:
                            print(f"Failed to save OOD sample: {e}")
                        # Append to prediction log before raising
                        try:
                            with open(PREDICTION_LOG, 'a', encoding='utf-8') as f:
                                f.write(f"{datetime.utcnow().isoformat()},{file.filename},{pred_key},{confidence:.4f},{dist:.4f},{thr:.4f},{green_ratio:.4f}\n")
                        except Exception as e:
                            print(f"Failed to append to prediction log: {e}")
                        raise HTTPException(status_code=400, detail=f"Uploaded image looks different from training images for the predicted class (dist={dist:.2f} > thr={thr:.2f})")
                else:
                    print(f"No centroid available for predicted class: {pred_key}; skipping centroid OOD check")
            except HTTPException:
                raise
            except Exception as e:
                print(f"Centroid check error: {e}")

        # Get disease information
        info = disease_info.get(predicted_class, {
            "name": predicted_class,
            "cure": "No specific cure needed",
            "tips": "Continue monitoring plant health"
        })

        # Save to user's history
        saved_image_path = None
        history_id = None
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
                "detected_at": datetime.utcnow()
            }
            
            print(f"DEBUG: Saving to history - user_id: {user_id}, disease: {predicted_class}")
            result = await db.history.insert_one(history_record)
            history_id = str(result.inserted_id)
            print(f"DEBUG: History saved successfully with ID: {history_id}")
            
            # Save image with history ID for easy retrieval
            try:
                ts = datetime.utcnow().strftime('%Y%m%dT%H%M%S')
                safe_name = Path(file.filename).stem if file.filename else 'upload'
                saved_image_filename = f"{history_id}_{safe_name}_{predicted_class}_{int(confidence*100):03d}_{ts}.jpg"
                saved_image_path = ACCEPTED_DIR / saved_image_filename
                img.save(str(saved_image_path))
                
                # Update history record with saved image path
                await db.history.update_one(
                    {"_id": result.inserted_id},
                    {"$set": {"saved_image_path": str(saved_image_path)}}
                )
                print(f"DEBUG: Image saved to {saved_image_path}")
                
            except Exception as e:
                print(f"Failed to save image: {e}")
            
        except Exception as e:
            print(f"Failed to save to history: {e}")
            # Don't fail the request if history save fails

        # If passed OOD checks (or low_confidence), save accepted sample and log
        try:
            # Save accepted image for inspection
            try:
                ts = datetime.utcnow().strftime('%Y%m%dT%H%M%S')
                safe_name = Path(file.filename).stem if file.filename else 'upload'
                saved = ACCEPTED_DIR / f"{safe_name}_{predicted_class}_{int(confidence*100):03d}_{ts}.jpg"
                img.save(str(saved))
            except Exception as e:
                print(f"Failed to save accepted sample: {e}")
            # Append to prediction log
            try:
                with open(PREDICTION_LOG, 'a', encoding='utf-8') as f:
                    dist_val = f"{dist:.4f}" if dist is not None else ''
                    thr_val = ''
                    if EMBEDDING_MODEL is not None and CENTROIDS is not None:
                        thr_val = f"{CENTROID_THRESHOLDS.get(predicted_class, CENTROID_THRESHOLD):.4f}"
                    f.write(f"{datetime.utcnow().isoformat()},{file.filename},{predicted_class},{confidence:.4f},{dist_val},{thr_val},{green_ratio:.4f}\n")
            except Exception as e:
                print(f"Failed to append to prediction log: {e}")
        except Exception:
            pass

        return JSONResponse({
            "label": predicted_class,
            "disease_name": info.get("name", predicted_class),
            "confidence": confidence,
            "low_confidence": low_confidence,
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
