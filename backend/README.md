# Backend - FastAPI Application

This is the backend server for CornCare - an AI-powered corn plant disease detection system.

## Features

- Image preprocessing
- Disease detection using TensorFlow model
- Disease information and treatment recommendations
- API endpoints for health check and predictions
- CORS support
- File validation

## Tech Stack

- Python 3.10+
- FastAPI
- TensorFlow
- Pillow
- NumPy
- Uvicorn

## Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   venv\Scripts\activate  # Windows
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Place your trained model:
   ```
   Copy your trained model file 'corn_disease_model.h5' to the backend directory
   ```

5. Start the server:
   ```bash
   uvicorn app:app --reload
   ```

## API Endpoints

### GET /health
Health check endpoint

Response:
```json
{
    "status": "healthy",
    "model_loaded": true
}
```

### POST /predict
Predict disease from image

Request:
- Content-Type: multipart/form-data
- Body: file (image/jpeg, image/jpg, image/png, max 10MB)

Response:
```json
{
    "label": "common_rust",
    "confidence": 0.95,
    "cure": "Apply fungicides...",
    "tips": "Use resistant hybrids..."
}
```

## Project Structure

```
backend/
├── app.py          # FastAPI application
├── cures.py        # Disease information
├── utils.py        # Helper functions
└── requirements.txt # Dependencies
```

## Environment Variables

- `CORS_ORIGINS` - Comma-separated list of allowed origins

## Deployment

### Render
1. Create new Web Service
2. Connect GitHub repository
3. Set build command:
   ```bash
   pip install -r requirements.txt
   ```
4. Set start command:
   ```bash
   uvicorn app:app --host 0.0.0.0 --port $PORT
   ```
5. Add environment variables

### Railway
1. Create new project
2. Connect GitHub repository
3. Add environment variables
4. Deploy

## License

MIT
