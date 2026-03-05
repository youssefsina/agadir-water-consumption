# AgriFlow AI

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Python](https://img.shields.io/badge/python-3.x-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black.svg)

**AI-Powered Smart Irrigation Monitoring & Leak Detection System**

*Reducing water waste and optimizing agricultural water usage in Agadir region using artificial intelligence*

[🌐 Live Demo](https://agadir-water-consumption.vercel.app/en) • [Features](#-features) • [Installation](#-installation) • [Tech Stack](#-tech-stack) • [Contributing](#-contributing)

</div>

---

## 🌐 Demo

<div align="center">

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_App-blue?style=for-the-badge)](https://agadir-water-consumption.vercel.app/en)

**Try the live application:** [https://agadir-water-consumption.vercel.app/en](https://agadir-water-consumption.vercel.app/en)

*Experience real-time irrigation monitoring, AI-powered leak detection, and smart water management*

</div>

---

## 📋 Features

- 🔍 **Intelligent Leak Detection** using AI with real-time anomaly detection
- 💧 **Smart Irrigation Optimization** for all devices
- 🌦️ **Weather-Based Automation** to prevent irrigation before rainfall
- 📊 **Real-time dashboard** with advanced analytics and feedback
- 📱 **Mobile app** built with Expo & React Native
- 🌐 **Multi-language support** (English, French, Arabic, Amazigh-Tifinagh)
- ⚡ **Real-time functionality** using WebSockets
- 🔐 **Secure cloud storage** with Supabase
- 🤖 **Multiple ML models** (LSTM, RNN, Random Forest)

---

## 🚀 Getting Started

### Prerequisites

Before running this project, ensure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn** or **pnpm**
- **Python** 3.x
- **Supabase account** (free tier available)

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/youssefsina/agadir-water-consumption.git
cd agadir-water-consumption
```

2. **Install dependencies:**

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies  
cd ../backend
pip install -r requirements.txt

# Install mobile app dependencies
cd ../mobile-app
npm install
```

3. **Build production:**

```bash
# Frontend
cd frontend
npm run build

# Backend - No build step needed for Python
```

4. **Run the dev server:**

```bash
# Start backend API
cd backend
python run.py

# Start frontend (in a new terminal)
cd frontend
npm run dev

# Start mobile app (in a new terminal)
cd mobile-app
npx expo start
```

---

## 🔧 Environment Variables

### Backend (.env)

Setup the following environment variables optimized for AI features:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# API Configuration
API_PORT=8000
ENV=development

# ML Model Settings
MODEL_TYPE=lstm  # Options: lstm, rnn, rf
LEAK_THRESHOLD=0.7
```

### Frontend (.env.local)

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Mobile App (.env)

```env
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> 💡 Use the provided `.env.example` files as templates.

---

## 📦 Features Breakdown

### Irrigation Analysis

- **Comprehensive sensor analysis:**
  - Flow rate monitoring
  - Pressure anomaly detection
  - Soil moisture tracking
  - Weather correlation
- **AI-powered anomaly detection:**
  - Works with all data patterns
  - Multiple ML model support included

### Leak Detection

- **Step-by-step guided process:**
  - Real-time leak classification
  - Severity assessment
  - Location prediction
- **Auto-retry functionality:**
  - Continuous monitoring
  - Multiple alert channels

### Smart Automation

- **Weather-based irrigation control:**
  - Rain prediction integration
  - Automatic pump shutdown
  - Energy cost optimization
- **Soil moisture optimization:**
  - Threshold-based irrigation
  - Crop-specific recommendations

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 16
- **Language:** TypeScript
- **Styling:** Tailwind CSS with Radix UI primitives
- **Backend:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL)
- **AI/ML:** scikit-learn, NumPy, Pandas
- **Mobile:** Expo & React Native
- **Real-time:** WebSockets
- **Data Visualization:** Recharts, Leaflet
- **Internationalization:** next-intl
- **Deployment:** Vercel (Frontend), Custom server (Backend)

---

## 📊 Architecture

```
agadir-water-consumption/
├── frontend/           # Next.js web application
│   ├── src/
│   │   ├── app/       # App router pages
│   │   ├── components/# Reusable components
│   │   └── lib/       # Utilities
│   └── messages/      # i18n translations
├── backend/           # FastAPI server
│   ├── app/
│   │   ├── models/    # ML models (LSTM, RNN, RF)
│   │   ├── routers/   # API endpoints
│   │   └── services/  # Business logic
│   └── run.py         # Server entry point
├── mobile-app/        # Expo mobile app
│   ├── app/           # App screens
│   ├── components/    # Mobile components
│   └── services/      # API integration
└── api/               # Vercel serverless functions
```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Test functionality:**
   ```bash
   npm run lint
   npm run build
   ```
4. **Commit and submit:**
   ```bash
   git commit -m "Add amazing feature"
   git push origin feature/amazing-feature
   ```
5. **Submit a pull request**

---

## 🎯 Use Cases

- **Agricultural Farms:** Monitor irrigation systems across large fields
- **Greenhouses:** Optimize water usage for controlled environments  
- **Urban Agriculture:** Smart water management for city farms
- **Research:** Agricultural water consumption studies
- **Water Utilities:** Track and reduce water waste in agricultural sectors

---

## 🗺️ Roadmap

- [x] Real-time sensor data simulation
- [x] AI-powered leak detection
- [x] Multi-language support
- [x] Mobile application
- [ ] IoT hardware integration
- [ ] Advanced weather API integration
- [ ] Crop-specific irrigation profiles
- [ ] ML model continuous learning
- [ ] Satellite imagery integration

---

## 📝 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

---

## 👥 Team

Built with ❤️ for the Agadir Water Conservation Hackathon

---

## 📧 Contact

For questions or collaboration opportunities, please open an issue or reach out to the team.

---

<div align="center">

**⭐ Star this repo if you find it useful!**

Made with passion for water conservation 💧

</div>
