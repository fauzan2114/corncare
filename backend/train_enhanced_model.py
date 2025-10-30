
# Quick Start Training Script
# Run this to start training with your existing data

import sys
sys.path.append('.')
from enhanced_training import train_enhanced_model

# Update these paths to your data
DATA_DIR = "dataset"  # Your dataset folder with blight, common_rust, gray_leaf_spot, healthy
OUTPUT_DIR = "enhanced_models"

# Start training
model = train_enhanced_model(DATA_DIR, OUTPUT_DIR)

print("Training completed! Your enhanced model is ready.")
