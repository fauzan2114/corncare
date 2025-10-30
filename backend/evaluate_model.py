import os
import tensorflow as tf
import numpy as np

DATA_DIR = os.getenv('DATA_DIR', 'dataset')
IMG_SIZE = int(os.getenv('IMG_SIZE', 224))
BATCH_SIZE = int(os.getenv('BATCH_SIZE', 32))
SEED = 42

# Find latest best checkpoint matching pattern
base = os.path.dirname(__file__)
models = [os.path.join(base, f) for f in os.listdir(base) if f.startswith('corn_disease_model_best_') and f.endswith('.h5')]
if not models:
    print('No best-model checkpoints found. Falling back to corn_disease_model.h5')
    model_path = os.path.join(base, 'corn_disease_model.h5')
else:
    model_path = max(models, key=os.path.getmtime)

print('Using model:', model_path)
model = tf.keras.models.load_model(model_path, compile=False)

# define focal loss to match training-time custom loss
def categorical_focal_loss(gamma=2.0, alpha=0.25):
    def loss(y_true, y_pred):
        y_pred = tf.clip_by_value(y_pred, 1e-7, 1.0 - 1e-7)
        cross_entropy = -y_true * tf.math.log(y_pred)
        weight = alpha * tf.pow(1.0 - y_pred, gamma)
        loss_val = weight * cross_entropy
        return tf.reduce_mean(tf.reduce_sum(loss_val, axis=1))
    return loss

# compile model with matching loss
loss_fn = categorical_focal_loss()
model.compile(optimizer='adam', loss=loss_fn, metrics=['accuracy'])

val_ds = tf.keras.preprocessing.image_dataset_from_directory(
    DATA_DIR,
    labels='inferred',
    label_mode='categorical',
    validation_split=0.2,
    subset='validation',
    seed=SEED,
    image_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
)

# rescale
val_ds = val_ds.map(lambda x, y: (tf.cast(x, tf.float32) / 255.0, y))

# TTA settings
USE_TTA = os.getenv('USE_TTA', '1') not in ('0', 'false', 'False')
TTA_TRANSFORMS = int(os.getenv('TTA_TRANSFORMS', 5))

def tta_predict_batch(model, imgs, transforms=TTA_TRANSFORMS):
    # imgs: numpy array batch
    preds = []
    from PIL import Image
    # Define same conservative ops as server TTA
    def op_identity(im):
        return im
    def op_flip(im):
        return im.transpose(Image.FLIP_LEFT_RIGHT)
    def op_rot_plus(im):
        return im.rotate(5)
    def op_rot_minus(im):
        return im.rotate(-5)
    def op_flip_rot(im):
        return im.transpose(Image.FLIP_LEFT_RIGHT).rotate(5)

    ops = [op_identity, op_flip, op_rot_plus, op_rot_minus, op_flip_rot]

    chosen = []
    i = 0
    while len(chosen) < transforms:
        chosen.append(ops[i % len(ops)])
        i += 1

    for fn in chosen:
        batch = []
        for img in imgs:
            pil = Image.fromarray((img * 255).astype('uint8'))
            t = fn(pil.copy())
            a = np.array(t).astype('float32') / 255.0
            batch.append(a)
        batch = np.stack(batch, axis=0)
        preds.append(model.predict(batch))
    avg = np.mean(np.stack(preds, axis=0), axis=0)
    return avg

loss, acc = model.evaluate(val_ds)
print(f"Validation loss: {loss:.4f}, accuracy: {acc:.4f} -> {acc*100:.2f}%")

# compute per-class metrics
y_true = []
y_pred = []
for x, y in val_ds:
    imgs = x.numpy()
    if USE_TTA:
        preds = tta_predict_batch(model, imgs, transforms=TTA_TRANSFORMS)
    else:
        preds = model.predict(imgs)
    y_true.extend(np.argmax(y.numpy(), axis=1).tolist())
    y_pred.extend(np.argmax(preds, axis=1).tolist())

from collections import Counter
correct = sum(1 for t, p in zip(y_true, y_pred) if t==p)
acc2 = correct / len(y_true) if y_true else 0.0
print(f"Recomputed accuracy: {acc2*100:.2f}% ({correct}/{len(y_true)})")

# per-class accuracy: derive class names from DATA_DIR (mapping lost after .map)
classes = sorted([d for d in os.listdir(DATA_DIR) if os.path.isdir(os.path.join(DATA_DIR, d))])
per_class = {}
for i, cname in enumerate(classes):
    idxs = [j for j, t in enumerate(y_true) if t==i]
    if not idxs:
        per_class[cname] = None
    else:
        hits = sum(1 for j in idxs if y_pred[j]==i)
        per_class[cname] = hits / len(idxs)

print('Per-class accuracy:')
for k, v in per_class.items():
    if v is None:
        print(f"  {k}: no samples")
    else:
        print(f"  {k}: {v*100:.2f}%")
