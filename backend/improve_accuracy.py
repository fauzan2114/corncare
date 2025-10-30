"""
Data Collection Assistant for Model Improvement
===============================================

This script helps you collect and organize data to improve your model:
1. Collect hard negative examples (non-corn plants)
2. Organize misclassified samples for retraining
3. Create balanced datasets
"""

import os
import shutil
from pathlib import Path
import requests
import json
from datetime import datetime
import random

def create_improved_dataset_structure(base_dir):
    """
    Create improved dataset structure with hard negatives
    """
    base_path = Path(base_dir)
    
    # Create main directories
    for split in ['train', 'validation', 'test']:
        for class_name in ['blight', 'common_rust', 'gray_leaf_spot', 'healthy', 'other_plant']:
            (base_path / split / class_name).mkdir(parents=True, exist_ok=True)
    
    print(f"Created dataset structure at: {base_path}")
    print("\nDataset structure:")
    print("├── train/")
    print("│   ├── blight/")
    print("│   ├── common_rust/")
    print("│   ├── gray_leaf_spot/")
    print("│   ├── healthy/")
    print("│   └── other_plant/  <- NEW: Non-corn plants")
    print("├── validation/")
    print("│   └── ... (same structure)")
    print("└── test/")
    print("    └── ... (same structure)")

def collect_hard_negatives():
    """
    Guide for collecting hard negative examples
    """
    print("\n" + "="*50)
    print("COLLECTING HARD NEGATIVE EXAMPLES")
    print("="*50)
    
    print("\n1. NON-CORN PLANTS TO COLLECT:")
    plants_to_collect = [
        "Rice leaves (similar texture to corn)",
        "Wheat leaves (similar shape)",
        "Soybean leaves",
        "Tomato leaves",
        "Potato leaves", 
        "Bean leaves",
        "Grass leaves",
        "Weed leaves",
        "Tree leaves (oak, maple, etc.)",
        "Garden plants (roses, etc.)"
    ]
    
    for i, plant in enumerate(plants_to_collect, 1):
        print(f"   {i:2d}. {plant}")
    
    print("\n2. IMAGE COLLECTION SOURCES:")
    sources = [
        "PlantNet dataset",
        "iNaturalist",
        "Your own photography",
        "Agricultural extension websites",
        "Plant identification apps",
        "University plant databases"
    ]
    
    for i, source in enumerate(sources, 1):
        print(f"   {i}. {source}")
    
    print("\n3. COLLECTION GUIDELINES:")
    guidelines = [
        "Collect 200-500 images per non-corn plant type",
        "Include various lighting conditions",
        "Include diseased and healthy versions",
        "Focus on leaf close-ups (similar to corn shots)",
        "Include different growth stages",
        "Ensure good image quality (not blurry)",
        "Mix of indoor/outdoor shots"
    ]
    
    for guideline in guidelines:
        print(f"   • {guideline}")

def analyze_model_errors(prediction_log_path="prediction_log.csv"):
    """
    Analyze your model's prediction errors to identify improvement areas
    """
    print("\n" + "="*50)
    print("ANALYZING MODEL ERRORS")
    print("="*50)
    
    if not Path(prediction_log_path).exists():
        print(f"Prediction log not found at: {prediction_log_path}")
        print("Run your model for a few days to collect error data.")
        return
    
    import pandas as pd
    
    try:
        df = pd.read_csv(prediction_log_path, 
                        names=['timestamp', 'filename', 'predicted_class', 'confidence', 'distance', 'threshold', 'green_ratio'])
        
        print(f"Loaded {len(df)} predictions from log")
        
        # Analyze low confidence predictions
        low_conf = df[df['confidence'] < 0.7]
        print(f"\nLow confidence predictions: {len(low_conf)} ({len(low_conf)/len(df)*100:.1f}%)")
        
        if len(low_conf) > 0:
            print("Distribution by class:")
            print(low_conf['predicted_class'].value_counts())
        
        # Analyze out-of-distribution rejections
        ood_rejections = df[df['distance'] > df['threshold']]
        print(f"\nOut-of-distribution rejections: {len(ood_rejections)} ({len(ood_rejections)/len(df)*100:.1f}%)")
        
        if len(ood_rejections) > 0:
            print("OOD rejections by class:")
            print(ood_rejections['predicted_class'].value_counts())
        
        print(f"\nRecommendations:")
        if len(low_conf) > len(df) * 0.2:
            print("• High number of low-confidence predictions detected")
            print("• Consider collecting more training data")
            print("• Review data quality and labeling")
        
        if len(ood_rejections) > len(df) * 0.1:
            print("• High OOD rejection rate detected") 
            print("• Consider adjusting centroid thresholds")
            print("• Add more diverse training examples")
            
    except Exception as e:
        print(f"Error analyzing prediction log: {e}")

def create_training_schedule():
    """
    Create a systematic training improvement schedule
    """
    schedule = {
        "Week 1: Data Collection": [
            "Collect 500+ other_plant images",
            "Review and clean existing dataset",
            "Split data into train/val/test (70/15/15)",
            "Run temperature calibration on existing model"
        ],
        "Week 2: Quick Improvements": [
            "Implement enhanced uncertainty detection",
            "Adjust confidence thresholds based on validation",
            "Update centroid thresholds",
            "Test improved backend on sample images"
        ],
        "Week 3: Model Retraining": [
            "Train enhanced model with hard negatives",
            "Implement focal loss and label smoothing",
            "Use test-time augmentation",
            "Validate on held-out test set"
        ],
        "Week 4: Deployment & Monitoring": [
            "Deploy improved model",
            "Set up error monitoring",
            "Collect user feedback",
            "Plan next iteration"
        ]
    }
    
    print("\n" + "="*50)
    print("SYSTEMATIC IMPROVEMENT SCHEDULE")
    print("="*50)
    
    for week, tasks in schedule.items():
        print(f"\n{week}:")
        for task in tasks:
            print(f"  □ {task}")
    
    return schedule

def setup_active_learning():
    """
    Set up active learning to continuously improve the model
    """
    print("\n" + "="*50)
    print("ACTIVE LEARNING SETUP")
    print("="*50)
    
    active_learning_code = '''
# Add this to your FastAPI app to collect hard examples

from datetime import datetime
import json

@app.post("/report_error")
async def report_error(
    image_id: str,
    predicted_class: str,
    actual_class: str,
    user_feedback: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Allow users to report prediction errors
    """
    error_report = {
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": current_user["_id"],
        "image_id": image_id,
        "predicted_class": predicted_class,
        "actual_class": actual_class,
        "user_feedback": user_feedback
    }
    
    # Save to database for retraining
    db = get_database()
    db.error_reports.insert_one(error_report)
    
    return {"status": "error_reported", "message": "Thank you for the feedback!"}

@app.get("/get_uncertain_predictions")
async def get_uncertain_predictions():
    """
    Get predictions marked as uncertain for expert review
    """
    db = get_database()
    uncertain = db.predictions.find({"uncertainty_score": {"$gte": 0.7}}).limit(50)
    return {"uncertain_predictions": list(uncertain)}
'''
    
    print("Active Learning Code to Add:")
    print(active_learning_code)
    
    print("\nBenefits of Active Learning:")
    benefits = [
        "Continuously improve model with real-world errors",
        "Focus training on hardest examples", 
        "Get expert feedback on uncertain cases",
        "Build domain-specific dataset over time",
        "Reduce false positives through user feedback"
    ]
    
    for benefit in benefits:
        print(f"  • {benefit}")

def main():
    """
    Main function to run all improvement recommendations
    """
    print("🌽 CORN DISEASE MODEL IMPROVEMENT ASSISTANT 🌽")
    print("=" * 60)
    
    print("\nWhat would you like to do?")
    print("1. Create improved dataset structure")
    print("2. Learn about collecting hard negatives")
    print("3. Analyze model errors")
    print("4. View training schedule")
    print("5. Setup active learning")
    print("6. All of the above")
    
    choice = input("\nEnter your choice (1-6): ").strip()
    
    if choice == "1" or choice == "6":
        dataset_dir = input("Enter dataset directory path: ").strip()
        if dataset_dir:
            create_improved_dataset_structure(dataset_dir)
    
    if choice == "2" or choice == "6":
        collect_hard_negatives()
    
    if choice == "3" or choice == "6":
        analyze_model_errors()
    
    if choice == "4" or choice == "6":
        create_training_schedule()
    
    if choice == "5" or choice == "6":
        setup_active_learning()
    
    print("\n" + "="*60)
    print("🎯 QUICK WINS FOR IMMEDIATE IMPROVEMENT:")
    print("="*60)
    print("1. Run temperature calibration: python calibrate_temperature.py model.h5 validation_data/")
    print("2. Set TEMP_SCALE in your .env file")
    print("3. Increase MIN_CONFIDENCE to 0.65")
    print("4. Add MIN_MARGIN=0.15 to your environment")
    print("5. Test the enhanced uncertainty detection")
    print("\n✅ Your enhanced backend code is already implemented!")

if __name__ == "__main__":
    main()