import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator

# Configuration
DATA_DIR = os.getenv('DATA_DIR', 'dataset')
IMG_SIZE = int(os.getenv('IMG_SIZE', 224))
BATCH_SIZE = int(os.getenv('BATCH_SIZE', 32))
OUTPUT_DIR = os.getenv('OUTPUT_DIR', '.')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def compute_and_save_centroids():
    # Use MobileNetV2 (imagenet) as embedding extractor
    embed_model = tf.keras.applications.MobileNetV2(weights='imagenet', include_top=False, pooling='avg', input_shape=(IMG_SIZE, IMG_SIZE, 3))

    datagen = ImageDataGenerator(rescale=1./255)
    generator = datagen.flow_from_directory(
        DATA_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode=None,
        shuffle=False
    )

    # Map filenames -> class by directory structure
    labels = []
    # generator.filenames contains paths like 'class_name/xxx.jpg'
    for fname in generator.filenames:
        labels.append(fname.split(os.path.sep)[0])

    # Compute embeddings for all images
    embeddings = embed_model.predict(generator, verbose=1)

    # Accumulate per-class
    centroids = {}
    for name, emb in zip(labels, embeddings):
        centroids.setdefault(name, []).append(emb)

    # Mean per class
    centroids_mean = {name: np.mean(np.stack(v), axis=0) for name, v in centroids.items()}

    out_path = os.path.join(OUTPUT_DIR, 'centroids.npz')
    # Save with keys as class names
    np.savez_compressed(out_path, **centroids_mean)
    print(f"Saved centroids to {out_path}")

if __name__ == '__main__':
    compute_and_save_centroids()
