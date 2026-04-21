# Wellness & Fitness App

A full-stack cross-platform wellness application built with React Native (Expo), Firebase, and Python Flask backend.

---

## 🛠 Tech Stack

- React Native (Expo)
- Firebase Authentication + Cloud Firestore
- Python Flask REST API (deployed on Railway)
- USDA FoodData Central API

---

## 📂 Project Structure
dissertation-fitnessapp/
├── FitnessApp/        # React Native frontend
└── FlaskBackend/     # Python Flask backend

---

## 🌐 Live Backend

The Flask backend is deployed and live at:

https://wellness-fitness-app-production.up.railway.app

---

## 🔗 Available Endpoints

- GET `/` — Health check  
- POST `/api/recommendations` — AI-powered recommendations  
- POST `/api/progress` — Weekly/monthly progress analysis  
- POST `/api/motivation` — Motivational messages  
- GET `/api/food-search` — USDA food search  
- POST `/api/food-nutrients` — Detailed nutrient calculation  

---

## ▶️ How to Run

### Prerequisites

- Node.js installed  
- Expo Go app on your phone  

---

### 📱 Frontend (React Native)
cd FitnessApp
npm install
npx expo start

Scan QR code with Expo Go (Android) or Camera app (iOS).  
Press **W** to open in browser.

---

### ⚙️ Backend (Flask)

The backend is already live on Railway — no local setup needed.

For local development:
cd FlaskBackend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python app.py

Flask runs on:

http://localhost:5000

---

## ⚙️ Configuration
FitnessApp/src/config/api.js

Already pointed to the live Railway backend.

---

## ✨ Features

- User registration and login (Firebase Authentication)
- 5-step onboarding with goal setting
- Workout logging with history
- Meal logging with USDA food search + macro calculation
- Mood tracking with trend chart
- Mindfulness exercises with timer
- AI-powered recommendations (Python rule engine – 21 rules)
- Weekly and monthly progress reports
- Motivational messages based on mood data
- GDPR compliant (consent + account deletion)
- Firestore security rules (user data isolation)

   ## 🔐 Test Account
Email: [testuser@gmail.com]
Password: [Testuser123?]
  
