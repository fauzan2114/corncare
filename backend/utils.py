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

def is_plant_image(image: Image.Image, min_green_ratio: float = 0.03) -> tuple[bool, float]:
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


def calculate_prediction_entropy(predictions: np.ndarray) -> float:
    """
    Calculate entropy of prediction probabilities.
    High entropy = model is uncertain/confused between all classes
    Low entropy = model is confident in one class
    
    Args:
        predictions: Array of prediction probabilities [0-1]
    
    Returns:
        float: Entropy value (higher = more uncertain)
    """
    # Avoid log(0) by adding small epsilon
    epsilon = 1e-10
    probs = predictions + epsilon
    entropy = -np.sum(probs * np.log(probs))
    return float(entropy)


def is_corn_like_image(image: Image.Image) -> tuple[bool, dict]:
    """
    Advanced check to determine if image looks like a corn leaf.
    Combines multiple heuristics:
    1. Green vegetation check
    2. Color distribution analysis
    3. Texture complexity
    
    Returns:
        tuple: (is_corn_like, metrics_dict)
    """
    try:
        img = image.convert('RGB')
        arr = np.array(img)
        
        if arr.size == 0:
            return False, {"error": "Empty image"}
        
        # Normalize to [0,1]
        r = arr[:, :, 0].astype('float32') / 255.0
        g = arr[:, :, 1].astype('float32') / 255.0
        b = arr[:, :, 2].astype('float32') / 255.0
        
        # 1. Green vegetation check (improved)
        green_mask = (g > r * 1.1) & (g > b * 1.1) & (g > 0.2)
        green_ratio = float(np.sum(green_mask) / (arr.shape[0] * arr.shape[1]))
        
        # 2. Check for yellowish/brownish tones (disease indicators in corn)
        yellow_mask = (r > 0.4) & (g > 0.4) & (b < 0.3) & (r > b * 1.2)
        yellow_ratio = float(np.sum(yellow_mask) / (arr.shape[0] * arr.shape[1]))
        
        # 3. Avoid pure blue/sky (common in outdoor photos but not plant close-ups)
        blue_mask = (b > r * 1.3) & (b > g * 1.3) & (b > 0.5)
        blue_ratio = float(np.sum(blue_mask) / (arr.shape[0] * arr.shape[1]))
        
        # 4. Check for very bright green (rice plants tend to be brighter green)
        bright_green_mask = (g > 0.5) & (g > r * 1.3) & (g > b * 1.3)
        bright_green_ratio = float(np.sum(bright_green_mask) / (arr.shape[0] * arr.shape[1]))
        
        # 5. Calculate color variance (texture complexity)
        color_variance = float(np.var(arr))
        
        # 6. Calculate brightness distribution
        brightness = np.mean(arr, axis=2)
        brightness_std = float(np.std(brightness))
        brightness_mean = float(np.mean(brightness))
        
        metrics = {
            "green_ratio": green_ratio,
            "yellow_ratio": yellow_ratio,
            "blue_ratio": blue_ratio,
            "bright_green_ratio": bright_green_ratio,
            "color_variance": color_variance,
            "brightness_std": brightness_std,
            "brightness_mean": brightness_mean
        }
        
        # Decision logic (stricter):
        # Must have reasonable green content (0.10 to 0.85) - tightened range
        # Should not be too blue (sky/water)
        # Should have some texture complexity
        # Reject if too much bright green (rice characteristic)
        # Corn leaves are typically darker/duller green
        has_green = 0.10 <= green_ratio <= 0.85
        not_too_blue = blue_ratio < 0.25
        has_texture = color_variance > 150  # Stricter texture requirement
        reasonable_brightness = brightness_std > 10  # More variation required
        not_rice_like = bright_green_ratio < 0.4  # Reject very bright green (rice)
        not_too_bright = brightness_mean < 180  # Corn leaves usually darker
        
        is_valid = (has_green and not_too_blue and has_texture and 
                   reasonable_brightness and not_rice_like and not_too_bright)
        
        return is_valid, metrics
        
    except Exception as e:
        return False, {"error": str(e)}
