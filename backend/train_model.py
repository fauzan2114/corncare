import os
DATA_DIR = os.getenv('DATA_DIR', 'dataset')
import numpy as np
import tensorflow as tf
from tensorflow.keras.regularizers import l2
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, BatchNormalization, Rescaling, Resizing
from tensorflow.keras.models import Model
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau, TensorBoard
from datetime import datetime
from collections import Counter
import math

# Optional improvements toggles
USE_MIXUP = False  # Disable MixUp to use class weights for better accuracy
USE_FOCAL = os.getenv('USE_FOCAL', '1') not in ('0', 'false', 'False')
MIXUP_ALPHA = float(os.getenv('MIXUP_ALPHA', 0.2))
FOCAL_GAMMA = float(os.getenv('FOCAL_GAMMA', 2.0))
FOCAL_ALPHA = float(os.getenv('FOCAL_ALPHA', 0.25))

# Configuration

IMG_SIZE = int(os.getenv('IMG_SIZE', 224))  # MobileNetV2 default input size
BATCH_SIZE = int(os.getenv('BATCH_SIZE', 32))
# Increase default epochs for better convergence
EPOCHS_HEAD = int(os.getenv('EPOCHS_HEAD', 64))  # Increased epochs for better convergence
EPOCHS_FINE = int(os.getenv('EPOCHS_FINE', 96))  # Increased epochs for better convergence
FINE_TUNE_AT = int(os.getenv('FINE_TUNE_AT', -20))  # Unfreeze last 20 layers (top 1-2 blocks)
DATA_DIR = os.getenv('DATA_DIR', 'dataset')
OUTPUT_DIR = os.getenv('OUTPUT_DIR', '.')

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Reproducibility
SEED = 42
np.random.seed(SEED)
tf.random.set_seed(SEED)

# Use tf.data pipeline (image_dataset_from_directory) and augmentation layers
train_ds = tf.keras.preprocessing.image_dataset_from_directory(
    DATA_DIR,
    labels='inferred',
    label_mode='categorical',
    validation_split=0.2,
    subset='training',
    seed=SEED,
    image_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    color_mode='rgb',
)

val_ds = tf.keras.preprocessing.image_dataset_from_directory(
    DATA_DIR,
    labels='inferred',
    label_mode='categorical',
    validation_split=0.2,
    subset='validation',
    seed=SEED,
    image_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    color_mode='rgb',
)

class_names = train_ds.class_names
num_classes = len(class_names)



# No custom ensure_rgb needed; rely on color_mode='rgb' in image_dataset_from_directory


print(f"Found {sum(1 for _ in train_ds.unbatch())} training images (est), {sum(1 for _ in val_ds.unbatch())} validation images (est), {num_classes} classes")

# Calculate simple class weights by scanning the directory (fallback)
all_labels = []
for _, y in train_ds.unbatch():
    # y is one-hot
    all_labels.append(int(tf.argmax(y).numpy()))
counter = Counter(all_labels)
max_count = float(max(counter.values()))
class_weight = {i: max_count / count for i, count in counter.items()}
print('Class weights:', class_weight)

# Prefetch and cache will be applied after optional oversampling to keep memory use reasonable
AUTOTUNE = tf.data.AUTOTUNE

# --- Targeted per-class oversampling (optional) ---
# Allow oversampling a specific class to balance the dataset. Default: gray_leaf_spot
OVERSAMPLE_CLASS = os.getenv('OVERSAMPLE_CLASS', 'gray_leaf_spot').lower()

# Convert class names to normalized form and find target index
norm_names = [c.lower().replace(' ', '_') for c in class_names]
target_idx = None
if OVERSAMPLE_CLASS in norm_names:
    target_idx = norm_names.index(OVERSAMPLE_CLASS)

# Unbatch source dataset for fine-grained operations
train_unbatched = train_ds.unbatch()

if target_idx is not None:
    target_count = counter.get(target_idx, 0)
    max_count = float(max(counter.values())) if counter else float(0)
    if target_count > 0 and target_count < max_count:
        # compute repeat factor so target class approximately reaches max_count
        repeat_factor = int(math.ceil(max_count / float(target_count)))
        print(f"Oversampling class '{OVERSAMPLE_CLASS}' (index {target_idx}) by factor {repeat_factor}")
        extra = train_unbatched.filter(lambda x, y: tf.equal(tf.argmax(y), target_idx)).repeat(repeat_factor - 1)
        # Concatenate original dataset with extra repeats for target class
        train_aug = train_unbatched.concatenate(extra)
    else:
        train_aug = train_unbatched
else:
    train_aug = train_unbatched

# Re-batch, shuffle, cache and prefetch after oversampling
train_ds = train_aug.shuffle(1000).batch(BATCH_SIZE).cache().prefetch(buffer_size=AUTOTUNE)
val_ds = val_ds.cache().prefetch(buffer_size=AUTOTUNE)

# --- end oversampling ---

# Augmentation pipeline (use Keras preprocessing layers)
data_augmentation = tf.keras.Sequential([
    tf.keras.layers.RandomFlip('horizontal'),
    # small rotations to match TTA's +/-5 degrees (~5 degrees ~= 0.087 radians, but RandomRotation takes fraction of 1)
    tf.keras.layers.RandomRotation(0.02),
    tf.keras.layers.RandomZoom(0.04),
    tf.keras.layers.RandomContrast(0.04),
    Resizing(IMG_SIZE, IMG_SIZE),  # Ensure consistent size
])

# Targeted stronger augmentation for a specific weak class (e.g., Gray_Leaf_Spot)
TARGET_AUG_CLASS = os.getenv('TARGET_AUG_CLASS', 'gray_leaf_spot').lower()
norm_names = [c.lower().replace(' ', '_') for c in class_names]
TARGET_AUG_IDX = norm_names.index(TARGET_AUG_CLASS) if TARGET_AUG_CLASS in norm_names else None

target_augmentation = tf.keras.Sequential([
    tf.keras.layers.RandomFlip('horizontal'),
    tf.keras.layers.RandomRotation(0.25),  # Increased rotation
    tf.keras.layers.RandomZoom(0.25),      # Increased zoom
    tf.keras.layers.RandomTranslation(0.15, 0.15),  # Increased translation
    tf.keras.layers.RandomContrast(0.25),  # Increased contrast
    tf.keras.layers.RandomBrightness(0.2), # Increased brightness
    tf.keras.layers.RandomWidth(0.15),     # Increased width shift
    tf.keras.layers.RandomHeight(0.15),    # Increased height shift
    Resizing(IMG_SIZE, IMG_SIZE),          # Resize back to input size
])

# Rescaling
rescale_layer = Rescaling(1./255)

def prepare(ds, training=False):
    ds = ds.map(lambda x, y: (rescale_layer(x), y), num_parallel_calls=AUTOTUNE)
    if training:
        # Apply per-sample augmentation: for the target class use stronger augmentation,
        # otherwise use the default (conservative) augmentation.
        def _augment_batch(images, labels):
            # images: [B,H,W,C], labels: [B,num_classes]
            aug_default = data_augmentation(images, training=True)
            aug_target = target_augmentation(images, training=True)
            if TARGET_AUG_IDX is None:
                return aug_default, labels
            # mask shape [B,1,1,1]
            lbl_idx = tf.argmax(labels, axis=1)
            mask = tf.cast(tf.equal(lbl_idx, TARGET_AUG_IDX), images.dtype)
            mask = tf.reshape(mask, [-1, 1, 1, 1])
            out = aug_default * (1.0 - mask) + aug_target * mask
            return out, labels

        ds = ds.map(lambda x, y: _augment_batch(x, y), num_parallel_calls=AUTOTUNE)
    return ds

train_ds = prepare(train_ds, training=True)
val_ds = prepare(val_ds, training=False)

# MixUp implementation (batch-wise)
def sample_beta_distribution(alpha, shape):
    # sample from two gamma distributions and form beta sample
    a = tf.random.gamma(shape, alpha)
    b = tf.random.gamma(shape, alpha)
    return a / (a + b)

def mixup_batch(images, labels, alpha=MIXUP_ALPHA):
    batch_size = tf.shape(images)[0]
    lam = sample_beta_distribution(alpha, [batch_size, 1, 1, 1])
    lam_y = tf.reshape(lam, [batch_size, 1])
    index = tf.random.shuffle(tf.range(batch_size))
    mixed_images = images * lam + tf.gather(images, index) * (1.0 - lam)
    mixed_labels = labels * lam_y + tf.gather(labels, index) * (1.0 - lam_y)
    return mixed_images, mixed_labels

def apply_mixup(ds, alpha=MIXUP_ALPHA):
    def _mixup(images, labels):
        mixed_images, mixed_labels = mixup_batch(images, labels, alpha)
        # Ensure the shapes are fully specified for the dataset adapter
        try:
            mixed_images.set_shape(images.shape)
            mixed_labels.set_shape(labels.shape)
        except Exception:
            pass
        return mixed_images, mixed_labels

    return ds.map(lambda x, y: _mixup(x, y), num_parallel_calls=AUTOTUNE)




# Build model (transfer learning) with MobileNetV2
base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(IMG_SIZE, IMG_SIZE, 3))
base_model.trainable = False
x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dropout(0.6)(x)
x = Dense(256, activation='relu', kernel_regularizer=l2(0.02))(x)
x = BatchNormalization()(x)
x = Dropout(0.4)(x)
predictions = Dense(num_classes, activation='softmax', kernel_regularizer=l2(0.02))(x)

model = Model(inputs=base_model.input, outputs=predictions)

# Compile head
# Loss selection: focal loss or label-smoothed categorical crossentropy
if USE_FOCAL:
    print(f"Using focal loss with gamma={FOCAL_GAMMA}, alpha={FOCAL_ALPHA}")
    def categorical_focal_loss(gamma=FOCAL_GAMMA, alpha=FOCAL_ALPHA):
        def loss(y_true, y_pred):
            y_pred = tf.clip_by_value(y_pred, 1e-7, 1.0 - 1e-7)
            cross_entropy = -y_true * tf.math.log(y_pred)
            weight = alpha * tf.pow(1.0 - y_pred, gamma)
            loss_val = weight * cross_entropy
            return tf.reduce_mean(tf.reduce_sum(loss_val, axis=1))
        return loss
    loss_fn = categorical_focal_loss()
else:
    loss_fn = tf.keras.losses.CategoricalCrossentropy(label_smoothing=0.1)

model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
              loss=loss_fn,
              metrics=['accuracy'])

# Callbacks
timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
ckpt_path = os.path.join(OUTPUT_DIR, f'corn_disease_model_best_{timestamp}.h5')
callbacks = [
    # save best by validation accuracy (we care about accuracy)
    ModelCheckpoint(ckpt_path, monitor='val_accuracy', save_best_only=True, verbose=1),
    EarlyStopping(monitor='val_accuracy', patience=10, restore_best_weights=True, verbose=1),
    ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=3, verbose=1),
    TensorBoard(log_dir=os.path.join(OUTPUT_DIR, 'logs', timestamp))
]

# Train head
print('Training head...')
# If MixUp is applied via a py_function, class_weight may be incompatible (unknown y shape). Only pass class_weight when not using MixUp.
fit_class_weight = class_weight if not USE_MIXUP else None

history_head = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=EPOCHS_HEAD,
    class_weight=fit_class_weight,
    callbacks=callbacks,
)

# Fine-tune: unfreeze some of the base model
if FINE_TUNE_AT != 0:
    print('Fine-tuning...')
    # Determine layer index to unfreeze
    if FINE_TUNE_AT < 0:
        # negative index means 'last N layers'
        unfreeze_from = len(base_model.layers) + FINE_TUNE_AT
    else:
        unfreeze_from = FINE_TUNE_AT

    for layer in base_model.layers[:unfreeze_from]:
        layer.trainable = False
    for layer in base_model.layers[unfreeze_from:]:
        layer.trainable = True

    # Recompile with lower lr
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
                  loss='categorical_crossentropy',
                  metrics=['accuracy'])

    history_fine = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS_FINE,
        class_weight=fit_class_weight,
        callbacks=callbacks,
    )

# Final save
h5_path = os.path.join(OUTPUT_DIR, 'corn_disease_model.h5')
keras_path = os.path.join(OUTPUT_DIR, 'corn_disease_model.keras')
print(f'Saving final model to {h5_path} and {keras_path}')
model.save(h5_path)
# Save also in native Keras format
model.save(keras_path)

print('Training complete')
