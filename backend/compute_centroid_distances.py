import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator

DATA_DIR = os.getenv('DATA_DIR', 'dataset')
IMG_SIZE = int(os.getenv('IMG_SIZE', 224))
BATCH_SIZE = int(os.getenv('BATCH_SIZE', 32))

CENTROIDS_PATH = os.path.join(os.getcwd(), 'centroids.npz')

def load_centroids(path):
    data = np.load(path)
    return {k: data[k] for k in data.files}

def main():
    if not os.path.exists(CENTROIDS_PATH):
        print('centroids.npz not found in backend folder. Run compute_centroids.py first.')
        return

    centroids = load_centroids(CENTROIDS_PATH)
    print('Loaded centroids for classes:', list(centroids.keys()))

    # embedding model
    embed_model = tf.keras.applications.MobileNetV2(weights='imagenet', include_top=False, pooling='avg', input_shape=(IMG_SIZE,IMG_SIZE,3))

    datagen = ImageDataGenerator(rescale=1./255, validation_split=0.2)
    gen = datagen.flow_from_directory(DATA_DIR, target_size=(IMG_SIZE,IMG_SIZE), batch_size=BATCH_SIZE, class_mode=None, subset='validation', shuffle=False)

    # build labels list (from filenames)
    labels = [fname.split(os.path.sep)[0] for fname in gen.filenames]

    distances_by_class = {name: [] for name in centroids.keys()}
    nearest_overall = []

    print('Computing embeddings and distances...')
    embeddings = embed_model.predict(gen, verbose=1)

    for name, emb in zip(labels, embeddings):
        if name not in centroids:
            continue
        centroid = centroids[name]
        d = float(np.linalg.norm(emb - centroid))
        distances_by_class[name].append(d)
        # nearest centroid distance
        nearest = min(float(np.linalg.norm(emb - c)) for c in centroids.values())
        nearest_overall.append(nearest)

    # Print stats
    def stats(arr):
        a = np.array(arr)
        return {
            'count': int(len(a)),
            'min': float(a.min()),
            'median': float(np.median(a)),
            'mean': float(a.mean()),
            '95p': float(np.percentile(a,95)),
            'max': float(a.max())
        }

    print('\nPer-class distance stats (to own centroid):')
    for name, vals in distances_by_class.items():
        if not vals:
            print(f"  {name}: no samples")
            continue
        s = stats(vals)
        print(f"  {name}: count={s['count']} min={s['min']:.4f} med={s['median']:.4f} mean={s['mean']:.4f} 95p={s['95p']:.4f} max={s['max']:.4f}")

    if nearest_overall:
        s = stats(nearest_overall)
        print(f"\nNearest-centroid distances across validation set: count={s['count']} min={s['min']:.4f} med={s['median']:.4f} mean={s['mean']:.4f} 95p={s['95p']:.4f} max={s['max']:.4f}")

    print('\nSuggested CENTROID_THRESHOLD: choose a value slightly above the validation 95th percentile, e.g.')
    if nearest_overall:
        print(f"  Suggested ~= {np.percentile(nearest_overall,95):.4f} (95th percentile)")

if __name__ == '__main__':
    main()
