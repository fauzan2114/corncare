# 🌽 CornCare - AI-Powered Corn Disease Detection System

An intelligent web application that uses deep learning to detect and diagnose corn leaf diseases, providing farmers with instant analysis and treatment recommendations.

![CornCare Banner](https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200&h=300&fit=crop)

## 🌟 Features

### Core Functionality
- **AI Disease Detection**: Advanced EfficientNetB3-based model for accurate disease classification
- **Real-time Analysis**: Instant diagnosis with confidence scores and severity assessment
- **Multi-Disease Support**: Detects 4 disease categories:
  - Blight
  - Common Rust
  - Gray Leaf Spot
  - Healthy

### User Features
- 🔐 **Secure Authentication**: JWT-based auth with OTP verification
- 📊 **Disease History Dashboard**: Track all previous diagnoses
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🌍 **Multi-language Support**: English and Bahasa Indonesia (i18n)
- 🎨 **Modern UI**: Beautiful animations and intuitive interface
- 📄 **PDF Reports**: Download detailed diagnostic reports

### Expert Portal
- 👨‍🌾 **Expert Consultation**: Connect farmers with agricultural experts
- 💬 **Real-time Chat**: Discuss diseases and treatments
- 📋 **Case Management**: Review and respond to farmer requests
- 📸 **Image Analysis**: View and analyze uploaded crop images

### Admin Features
- 🛡️ **User Management**: Comprehensive admin dashboard
- 📈 **Analytics**: Track system usage and disease patterns
- ⚙️ **System Configuration**: Manage application settings

## 🏗️ Architecture

```
CornCare/
├── backend/                 # FastAPI Backend
│   ├── app.py              # Main application entry
│   ├── routes/             # API route handlers
│   ├── models.py           # Pydantic models
│   ├── database.py         # MongoDB connection
│   ├── auth.py             # Authentication logic
│   ├── otp_service.py      # OTP verification
│   ├── pdf_generator.py    # PDF report generation
│   ├── dataset/            # Training dataset
│   └── tools/              # Utility scripts
│
├── frontend/               # React + TypeScript Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React Context API
│   │   ├── routes/         # Route configurations
│   │   ├── lib/            # Utilities and API clients
│   │   ├── i18n/           # Internationalization
│   │   └── styles/         # CSS and animations
│   └── public/             # Static assets
│
└── logs/                   # Training logs and metrics
```

## 🚀 Tech Stack

### Backend
- **Framework**: FastAPI 2.0.0
- **Database**: MongoDB
- **ML Framework**: TensorFlow/Keras 3.x
- **Model**: EfficientNetB3 (Transfer Learning)
- **Authentication**: JWT + OTP (Twilio)
- **Image Processing**: Pillow, NumPy
- **PDF Generation**: ReportLab

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: React Context API
- **Internationalization**: react-i18next
- **Routing**: React Router v6
- **Icons**: Lucide React

### AI/ML
- **Base Model**: EfficientNetB3 (ImageNet pretrained)
- **Training**: Transfer Learning with Focal Loss
- **Data Augmentation**: Rotation, Flip, Zoom, Brightness
- **Image Size**: 224x224x3
- **Classes**: 4 (Blight, Common Rust, Gray Leaf Spot, Healthy)
- **Accuracy**: ~95% validation accuracy

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- MongoDB 4.4+
- Git

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/corncare.git
cd corncare
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your configurations
```

**Backend Environment Variables (.env)**:
```env
MONGODB_URL=mongodb://localhost:27017/corncare
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env.local
# Edit .env.local with your configurations
```

**Frontend Environment Variables (.env.local)**:
```env
VITE_API_URL=http://localhost:8000
```

### 4. Database Setup

```bash
# Start MongoDB
mongod

# MongoDB will create the database automatically on first connection
```

## 🏃 Running the Application

### Start Backend

```bash
cd backend
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

Backend will be available at: `http://localhost:8000`
API Documentation: `http://localhost:8000/docs`

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at: `http://localhost:5173`

## 📊 Model Information

### Training Details
- **Dataset Size**: 4000+ images across 4 classes
- **Epochs**: 50 with early stopping
- **Optimizer**: Adam
- **Loss Function**: Focal Loss (handles class imbalance)
- **Learning Rate**: 0.0001 with ReduceLROnPlateau
- **Validation Split**: 20%

### Performance Metrics
- **Validation Accuracy**: ~95%
- **Top-2 Accuracy**: ~98%
- **Inference Time**: ~50ms on CPU
- **API Response Time**: <200ms (p95)

### Model Architecture
```
EfficientNetB3 (Pretrained)
    ↓
Global Average Pooling
    ↓
Dropout (0.3)
    ↓
Dense (256, ReLU)
    ↓
Dropout (0.3)
    ↓
Dense (128, ReLU)
    ↓
Dropout (0.2)
    ↓
Dense (4, Softmax)
```

## 🧪 Testing

### Run Model Evaluation

```bash
cd backend/tools
python evaluate_model.py --data ../dataset --model ../corn_disease_model.h5
```

### Run API Benchmarks

```bash
cd backend/tools
python benchmark_api_and_otp.py
```

## 📱 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/verify-otp` - OTP verification
- `POST /auth/resend-otp` - Resend OTP

### Disease Detection
- `POST /predict` - Analyze corn leaf image
- `GET /history` - Get user's diagnosis history
- `DELETE /history/{id}` - Delete diagnosis record

### Expert System
- `POST /expert/auth/register` - Expert registration
- `POST /expert/auth/login` - Expert login
- `GET /expert/requests` - Get consultation requests
- `POST /expert/respond` - Respond to consultation

### Admin
- `GET /admin/users` - List all users
- `GET /admin/statistics` - System statistics
- `DELETE /admin/users/{id}` - Delete user

## 🎨 UI Animations

The application features smooth, professional animations:
- Fade-in entrance effects
- Slide-up content reveals
- Scale-in card animations
- Hover state transitions
- Staggered list animations
- Loading state indicators

## 🌐 Internationalization

Supported languages:
- English (en)
- Hindi (hi)

Toggle language using the language selector in the navigation bar.

## 👥 Contributors

- **Ansari Fauzan** - *Lead Developer*

## 🙏 Acknowledgments

- EfficientNet architecture by Google
- Corn disease dataset from Agricultural Research Centers
- FastAPI and React communities
- TailwindCSS for the amazing styling utilities

## 📞 Contact

For questions or support:
- Email: corncare.global@gmail.com
- GitHub: [fauzan2114](https://github.com/fauzan2114)

## 🔮 Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Support for more crop types
- [ ] Weather integration for disease prediction
- [ ] Community forum for farmers
- [ ] Offline mode with PWA
- [ ] Advanced analytics dashboard
- [ ] Multi-image batch processing
- [ ] GPS-based disease mapping

---

**Made with ❤️ for farmers worldwide**
