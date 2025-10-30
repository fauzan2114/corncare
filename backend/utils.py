import tensorflow as tf
import numpy as np
from PIL import Image

def preprocess_image(image: Image.Image) -> np.ndarray:
    """
    Preprocess image for model prediction
    
    Args:
        image (PIL.Image): Input image
    
    Returns:
        np.ndarray: Preprocessed image array
    """
    # Resize to expected input size
    image = image.resize((224, 224))
    
    # Convert to array and normalize
    img_array = tf.keras.preprocessing.image.img_to_array(image)
    img_array = img_array / 255.0  # Scale to [0,1]
    
    # Add batch dimension
    img_array = tf.expand_dims(img_array, 0)
    
    return img_array

def is_plant_image(image: Image.Image, min_green_ratio: float = 0.03) -> (bool, float):
    """
    Heuristic to check if an image contains vegetation using a simple green-pixel ratio.
    Returns a tuple (is_plant, green_ratio).

    This is not perfect but helps filter out totally unrelated images (cars, documents, etc.).
    """
    try:
        img = image.convert('RGB')
        arr = np.array(img)
        if arr.size == 0:
            return False, 0.0

        # Normalize to [0,1]
        r = arr[:, :, 0].astype('float32') / 255.0
        g = arr[:, :, 1].astype('float32') / 255.0
        b = arr[:, :, 2].astype('float32') / 255.0

        # A pixel is 'green' if the G channel is noticeably larger than R and B
        green_mask = (g > r * 1.05) & (g > b * 1.05) & (g > 0.15)
        green_ratio = float(np.sum(green_mask) / (arr.shape[0] * arr.shape[1]))

        return (green_ratio >= min_green_ratio), green_ratio
    except Exception:
        return False, 0.0
