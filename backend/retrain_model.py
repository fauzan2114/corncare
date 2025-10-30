#!/usr/bin/env python3
"""
Simple and effective model retraining script for corn disease detection
This script will improve your model's accuracy using advanced techniques
"""

import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import EfficientNetB3
from tensorflow.keras import layers, Model
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from datetime import datetime
import matplotlib.pyplot as plt

# Configuration
CONFIG = {
    'IMG_SIZE': 224,
    'BATCH_SIZE': 32,
    'EPOCHS': 50,
    'LEARNING_RATE': 0.0001,
    'CLASSES': ['blight', 'common_rust', 'gray_leaf_spot', 'healthy']
}

def create_improved_model(num_classes=4):
    """
    Create an improved model using EfficientNet-B3 with better architecture
    """
    # Clear any existing session to avoid weight conflicts
    tf.keras.backend.clear_session()
    
    # Load EfficientNet-B3 as base model
    base_model = EfficientNetB3(
        weights='imagenet',
        include_top=False,
        input_shape=(CONFIG['IMG_SIZE'], CONFIG['IMG_SIZE'], 3)
    )
    
    # Freeze base model initially
    base_model.trainable = False
    
    # Add custom head
    inputs = tf.keras.Input(shape=(CONFIG['IMG_SIZE'], CONFIG['IMG_SIZE'], 3))
    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(512, activation='relu')(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.5)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    
    model = Model(inputs, outputs)
    return model, base_model

def create_data_generators(data_dir):
    """
    Create enhanced data generators with better augmentation
    """
    # Enhanced augmentation for training
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=30,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        fill_mode='nearest',
        brightness_range=[0.8, 1.2],
        validation_split=0.2  # 20% for validation
    )
    
    # Simple rescaling for validation
    val_datagen = ImageDataGenerator(
        rescale=1./255,
        validation_split=0.2
    )
    
    # Training data generator
    train_generator = train_datagen.flow_from_directory(
        data_dir,
        target_size=(CONFIG['IMG_SIZE'], CONFIG['IMG_SIZE']),
        batch_size=CONFIG['BATCH_SIZE'],
        class_mode='categorical',
        subset='training',
        shuffle=True,
        seed=42
    )
    
    # Validation data generator
    validation_generator = val_datagen.flow_from_directory(
        data_dir,
        target_size=(CONFIG['IMG_SIZE'], CONFIG['IMG_SIZE']),
        batch_size=CONFIG['BATCH_SIZE'],
        class_mode='categorical',
        subset='validation',
        shuffle=False,
        seed=42
    )
    
    return train_generator, validation_generator

def focal_loss(gamma=2., alpha=0.25):
    """
    Focal loss for handling class imbalance
    """
    def focal_loss_fixed(y_true, y_pred):
        epsilon = tf.keras.backend.epsilon()
        y_pred = tf.clip_by_value(y_pred, epsilon, 1. - epsilon)
        p_t = tf.where(tf.equal(y_true, 1), y_pred, 1 - y_pred)
        alpha_factor = tf.ones_like(y_true) * alpha
        alpha_t = tf.where(tf.equal(y_true, 1), alpha_factor, 1 - alpha_factor)
        cross_entropy = -tf.math.log(p_t)
        weight = alpha_t * tf.pow((1 - p_t), gamma)
        loss = weight * cross_entropy
        return tf.reduce_mean(tf.reduce_sum(loss, axis=1))
    return focal_loss_fixed

def train_model():
    """
    Main training function
    """
    print("🌽 Starting Enhanced Corn Disease Model Training...")
    print(f"Configuration: {CONFIG}")
    
    # Setup data
    data_dir = "dataset"
    if not os.path.exists(data_dir):
        print(f"❌ Error: Dataset directory '{data_dir}' not found!")
        return
    
    print(f"📁 Loading data from: {data_dir}")
    train_gen, val_gen = create_data_generators(data_dir)
    
    print(f"📊 Training samples: {train_gen.samples}")
    print(f"📊 Validation samples: {val_gen.samples}")
    print(f"📊 Classes found: {list(train_gen.class_indices.keys())}")
    
    # Create model
    print("🏗️ Building improved model architecture...")
    model, base_model = create_improved_model(num_classes=len(train_gen.class_indices))
    
    # Compile model
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=CONFIG['LEARNING_RATE']),
        loss='categorical_crossentropy',
        metrics=['accuracy', 'top_2_accuracy']
    )
    
    # Setup callbacks
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    model_name = f"corn_disease_model_improved_{timestamp}.h5"
    
    callbacks = [
        EarlyStopping(
            monitor='val_accuracy',
            patience=10,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-7,
            verbose=1
        ),
        ModelCheckpoint(
            model_name,
            monitor='val_accuracy',
            save_best_only=True,
            save_weights_only=False,
            verbose=1
        )
    ]
    
    print("🚀 Starting Phase 1: Transfer Learning...")
    # Phase 1: Train with frozen base model
    history1 = model.fit(
        train_gen,
        epochs=15,
        validation_data=val_gen,
        callbacks=callbacks,
        verbose=1
    )
    
    print("🔥 Starting Phase 2: Fine-tuning...")
    # Phase 2: Unfreeze and fine-tune
    base_model.trainable = True
    
    # Use a lower learning rate for fine-tuning
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=CONFIG['LEARNING_RATE']/10),
        loss=focal_loss(gamma=2.0, alpha=0.25),  # Use focal loss
        metrics=['accuracy', 'top_2_accuracy']
    )
    
    # Continue training
    history2 = model.fit(
        train_gen,
        epochs=CONFIG['EPOCHS'] - 15,
        validation_data=val_gen,
        callbacks=callbacks,
        verbose=1,
        initial_epoch=15
    )
    
    # Save final model
    final_model_name = f"corn_disease_model_final_{timestamp}.h5"
    model.save(final_model_name)
    
    print(f"✅ Training completed!")
    print(f"📦 Best model saved as: {model_name}")
    print(f"📦 Final model saved as: {final_model_name}")
    
    # Evaluate final model
    print("📈 Final evaluation:")
    val_loss, val_accuracy, val_top2 = model.evaluate(val_gen, verbose=0)
    print(f"Validation Accuracy: {val_accuracy:.4f}")
    print(f"Top-2 Accuracy: {val_top2:.4f}")
    
    return model, model_name

if __name__ == "__main__":
    try:
        model, best_model_file = train_model()
        print(f"\n🎉 SUCCESS! Your improved model is ready: {best_model_file}")
        print(f"📊 This model should have better accuracy than your previous one!")
        print(f"💡 To use it, replace your current model file with: {best_model_file}")
    except Exception as e:
        print(f"❌ Error during training: {str(e)}")
        import traceback
        traceback.print_exc()