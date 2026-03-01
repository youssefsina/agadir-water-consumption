🌊 AgriFlow AI

  AI-Powered Smart Irrigation Monitoring & Leak Detection System

  AI-driven irrigation monitoring platform designed to reduce water waste, detect leaks early, and optimize agricultural water usage using Machine Learning and IoT simulation.

  Built for smart agriculture and water conservation initiatives.

📌 Overview

Agriculture consumes nearly 70% of global freshwater resources.
Traditional irrigation systems often rely on fixed schedules, leading to:

Undetected water leaks

Over- or under-irrigation

High operational costs

Delayed issue detection

AgriFlow AI addresses these challenges through:

Real-time anomaly detection (Isolation Forest)

Multi-sensor data fusion (flow, pressure, soil moisture, weather)

Automated irrigation decision logic

Live monitoring dashboards (Web + Mobile)

IoT simulation pipeline with WebSocket streaming

🚀 Key Features

✅ Real-time irrigation monitoring dashboard

✅ AI-based anomaly detection (6 anomaly types)

✅ Leak & pipe burst detection

✅ Smart irrigation scheduling

✅ Interactive farm map visualization

✅ IoT device fleet management

✅ WebSocket real-time data streaming

✅ Mobile app (React Native + Expo)

🏗️ System Architecture

Data Layer

IoT Sensor Simulation

Supabase (PostgreSQL)

Backend

FastAPI REST API

Isolation Forest ML model (scikit-learn)

WebSocket streaming

Data processing (Pandas, NumPy)

Frontend

Next.js 16 + React 19 + TypeScript

TailwindCSS + shadcn/ui

Recharts (data visualization)

Mobile

React Native + Expo

🛠️ Tech Stack
Backend

Python 3.8+

FastAPI

Scikit-learn

Pandas / NumPy

Supabase

Uvicorn

Frontend

Next.js 16

React 19

TypeScript

Tailwind CSS

Recharts

Mobile

React Native

Expo

🤖 Machine Learning Approach

Algorithm: Isolation Forest (unsupervised anomaly detection)

Features: Flow rate, pressure, soil moisture, temperature, rain probability, time context

Engineered Metrics: Rolling averages, pressure drop, deviation metrics

Output:

Anomaly type

Confidence score (0–100%)

Automated decision recommendation

Detected Anomalies

Normal

Night Leak

Pipe Burst

Over-Irrigation

Under-Irrigation

Rain Event

📊 Impact (Simulation Results)

💧 34% reduction in water usage

💵 ~$8,450 estimated annual savings per farm

⚡ Reduced pump runtime & energy costs

🛑 Early leak detection (minutes vs days)

⚡ Quick Start
Backend
git clone https://github.com/yourusername/agriflow-ai.git
cd agriflow-ai/backend

python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate (Windows)

pip install -r requirements.txt
python simulation.py
python run.py

API Docs:

http://localhost:8000/docs
Frontend
cd frontend
npm install
npm run dev
http://localhost:3000
Mobile App
cd mobile-app
npm install
npx expo start
🌐 API Overview
Data
GET /api/data/latest
GET /api/data/readings
GET /api/data/anomalies
AI
POST /api/ai/predict/sensor
Pipeline
POST /api/pipeline/start
POST /api/pipeline/stop
WebSocket
wss://your-domain/pipeline/ws
📁 Project Structure
agriflow-ai/
│
├── backend/          # FastAPI + ML
├── frontend/         # Next.js dashboard
├── mobile-app/       # React Native app
├── docs/
└── README.md
🗺️ Roadmap

Pilot deployment with real IoT hardware

Weather API integration

SMS/WhatsApp alerting

Advanced ML (LSTM, predictive maintenance)

Multi-farm scaling

📄 License

MIT License

🤝 Contributing

Contributions are welcome.

Fork the repository

Create a feature branch

Submit a Pull Request

📬 Contact

For inquiries or collaboration:

Email: agriflow@gmail.com

GitHub Issues: Bug reports & feature requests
