import os
from PIL import Image

# Set this to your dataset root directory
DATASET_DIR = os.path.join(os.path.dirname(__file__), 'dataset')

for root, dirs, files in os.walk(DATASET_DIR):
    for file in files:
        if file.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff')):
            path = os.path.join(root, file)
            try:
                img = Image.open(path)
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                    img.save(path)
                    print(f'Converted {path} to RGB')
            except Exception as e:
                print(f'Error processing {path}: {e}')
print('All images checked and converted to RGB if needed.')
