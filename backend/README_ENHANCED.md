# CornCare Enhanced - User Management Setup

## Installation

1. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

2. Install and start MongoDB:
```bash
# Download MongoDB Community Server from https://www.mongodb.com/try/download/community
# Or use Docker:
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your settings
```

## New Features Added

### 1. User Authentication
- **Phone Registration**: Users register with phone number and name
- **OTP Verification**: SMS verification via Twilio (or console in dev mode)
- **Username/Password Setup**: Complete registration with username and password
- **JWT Authentication**: Secure login with JWT tokens

### 2. User Dashboard
- **Detection History**: View all past disease detections
- **PDF Reports**: Download individual detection reports as PDF
- **User Profile**: View account information

### 3. Expert Consultation
- **Request Expert Help**: Users can request expert consultation after detection
- **Expert Dashboard**: Experts can view and respond to requests
- **Status Tracking**: Track request status (pending/in-progress/resolved)

### 4. Enhanced API Endpoints

#### Authentication
- `POST /auth/register/phone` - Register with phone number
- `POST /auth/verify-otp` - Verify OTP
- `POST /auth/register/complete` - Complete registration
- `POST /auth/token` - Login
- `GET /auth/me` - Get current user

#### History
- `GET /history/` - Get user's detection history
- `GET /history/{id}/pdf` - Download PDF report

#### Expert Consultation
- `POST /expert/request` - Create expert request
- `GET /expert/requests` - Get user's requests
- `GET /expert/pending` - Get pending requests (for experts)
- `PUT /expert/requests/{id}/respond` - Expert responds

### 5. Database Collections

#### Users
```json
{
  "_id": "ObjectId",
  "name": "string",
  "phone_number": "string",
  "username": "string",
  "password_hash": "string",
  "is_verified": "boolean",
  "created_at": "datetime"
}
```

#### History
```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "disease": "string",
  "disease_name": "string",
  "confidence": "number",
  "cure": "string",
  "tips": "string",
  "image_filename": "string",
  "detected_at": "datetime"
}
```

#### Expert Requests
```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "expert_id": "string",
  "disease": "string",
  "message": "string",
  "response": "string",
  "status": "pending|in_progress|resolved",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

## Running the Application

1. Start MongoDB
2. Start the backend:
```bash
cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

3. The API will be available at `http://localhost:8000`
4. API documentation at `http://localhost:8000/docs`

## Frontend Integration Notes

The frontend will need to be updated to:
1. Add login/registration pages
2. Store JWT tokens
3. Add authentication headers to API calls
4. Add user dashboard with history
5. Add expert consultation interface

## Development Notes

- OTP is printed to console when Twilio credentials are not configured
- MongoDB connection is required for the new features
- All prediction endpoints now require authentication
- PDF generation uses ReportLab for professional reports