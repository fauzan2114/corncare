import os
from PIL import Image

# Set this to your dataset root directory
DATASET_DIR = os.path.join(os.path.dirname(__file__), 'dataset')
removed = 0
for root, dirs, files in os.walk(DATASET_DIR):
    for file in files:
        path = os.path.join(root, file)
        # Remove hidden files and non-image files
        if file.startswith('.') or not file.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff')):
            try:
                os.remove(path)
                print(f'Removed non-image or hidden file: {path}')
                removed += 1
            except Exception as e:
                print(f'Error removing {path}: {e}')
            continue
        # Try to open and convert image
        try:
            img = Image.open(path)
            if img.mode != 'RGB':
                img = img.convert('RGB')
                img.save(path)
                print(f'Converted {path} to RGB')
        except Exception as e:
            print(f'Corrupted or unreadable image, removing: {path} ({e})')
            try:
                os.remove(path)
                removed += 1
            except Exception as e2:
                print(f'Error removing {path}: {e2}')
print(f'All non-image, hidden, and corrupted files removed. {removed} files deleted.')
