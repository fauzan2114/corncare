"""
Temperature Calibration for Existing Model
==========================================

This script calibrates your existing model to improve probability estimates
without retraining. Run this on your validation set to find the optimal temperature.
"""

import tensorflow as tf
import numpy as np
from pathlib import Path
import json
from scipy.optimize import minimize_scalar
from utils import preprocess_image
from PIL import Image
import os

def load_validation_data(validation_dir):
    """
    Load validation data for calibration
    """
    classes = ["blight", "common_rust", "gray_leaf_spot", "healthy"]
    images = []
    labels = []
    
    for class_idx, class_name in enumerate(classes):
        class_dir = Path(validation_dir) / class_name
        if not class_dir.exists():
            print(f"Warning: {class_dir} does not exist")
            continue
            
        for img_path in class_dir.glob("*.jpg"):
            try:
                img = Image.open(img_path)
                img_array = preprocess_image(img)
                images.append(img_array[0])  # Remove batch dimension
                
                # One-hot encode label
                label = np.zeros(len(classes))
                label[class_idx] = 1
                labels.append(label)
            except Exception as e:
                print(f"Error loading {img_path}: {e}")
    
    return np.array(images), np.array(labels)

def calibrate_temperature(model_path, validation_dir, output_path="calibration_results.json"):
    """
    Calibrate temperature for better probability estimates
    """
    print("Loading model...")
    model = tf.keras.models.load_model(model_path, compile=False)
    
    print("Loading validation data...")
    images, labels = load_validation_data(validation_dir)
    
    if len(images) == 0:
        print("No validation data found!")
        return None
    
    print(f"Loaded {len(images)} validation samples")
    
    # Get model predictions (logits)
    print("Getting model predictions...")
    logits = model.predict(images, batch_size=32)
    
    def calibration_loss(temperature):
        """Loss function for temperature calibration"""
        scaled_logits = logits / temperature
        probs = tf.nn.softmax(scaled_logits)
        
        # Cross-entropy loss
        loss = -np.sum(labels * np.log(probs.numpy() + 1e-8))
        return loss / len(labels)
    
    print("Finding optimal temperature...")
    result = minimize_scalar(calibration_loss, bounds=(0.1, 10.0), method='bounded')
    optimal_temp = result.x
    
    # Evaluate before and after calibration
    original_probs = tf.nn.softmax(logits).numpy()
    calibrated_probs = tf.nn.softmax(logits / optimal_temp).numpy()
    
    # Calculate accuracy and confidence metrics
    original_preds = np.argmax(original_probs, axis=1)
    calibrated_preds = np.argmax(calibrated_probs, axis=1)
    true_labels = np.argmax(labels, axis=1)
    
    original_accuracy = np.mean(original_preds == true_labels)
    calibrated_accuracy = np.mean(calibrated_preds == true_labels)
    
    original_confidence = np.mean(np.max(original_probs, axis=1))
    calibrated_confidence = np.mean(np.max(calibrated_probs, axis=1))
    
    results = {
        "optimal_temperature": float(optimal_temp),
        "original_accuracy": float(original_accuracy),
        "calibrated_accuracy": float(calibrated_accuracy),
        "original_avg_confidence": float(original_confidence),
        "calibrated_avg_confidence": float(calibrated_confidence),
        "calibration_loss": float(result.fun),
        "validation_samples": len(images)
    }
    
    # Save results
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nCalibration Results:")
    print(f"Optimal Temperature: {optimal_temp:.3f}")
    print(f"Original Accuracy: {original_accuracy:.3f}")
    print(f"Calibrated Accuracy: {calibrated_accuracy:.3f}")
    print(f"Original Avg Confidence: {original_confidence:.3f}")
    print(f"Calibrated Avg Confidence: {calibrated_confidence:.3f}")
    print(f"\nResults saved to: {output_path}")
    
    # Update your environment variable
    print(f"\nTo use this temperature in your app, set:")
    print(f"export TEMP_SCALE={optimal_temp:.3f}")
    print(f"or add TEMP_SCALE={optimal_temp:.3f} to your .env file")
    
    return results

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 3:
        print("Usage: python calibrate_temperature.py <model_path> <validation_dir>")
        print("Example: python calibrate_temperature.py corn_disease_model.h5 dataset/validation")
        sys.exit(1)
    
    model_path = sys.argv[1]
    validation_dir = sys.argv[2]
    
    calibrate_temperature(model_path, validation_dir)