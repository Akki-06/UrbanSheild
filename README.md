# 🌍 UrbanShield  
## Intelligent Traffic & Disaster Response System

![Django](https://img.shields.io/badge/Backend-Django-green)
![React](https://img.shields.io/badge/Frontend-React-blue)
![DRF](https://img.shields.io/badge/API-DRF-red)
![Leaflet](https://img.shields.io/badge/Maps-Leaflet-orange)
![Status](https://img.shields.io/badge/Status-Active-success)

---

## 📌 About The Project

UrbanShield is a real-time geospatial intelligence platform built to monitor disasters, analyze traffic congestion, optimize evacuation routes, and automatically notify relevant authorities.

The system is geographically restricted to **Uttarakhand, India**, ensuring focused and realistic state-level disaster management simulation.

UrbanShield integrates:

- Live disaster mapping  
- Traffic congestion heatmaps  
- Smart routing algorithms  
- Automated escalation workflows  
- Authority resource mapping  
- Geofencing controls  

This project demonstrates how intelligent routing, geospatial filtering, and automation can modernize emergency response systems.

---

# 🧠 System Workflow

1. Disaster is reported (manual or API-based).
2. Coordinates validated (must lie within Uttarakhand).
3. Disaster saved to database.
4. Automatic escalation logic triggered.
5. Relevant authority identified based on:
   - Severity
   - Type
   - Location
6. Email notification sent.
7. Smart route calculated considering:
   - Distance
   - Traffic congestion
   - Road blockages
8. Recommended shelter and authority returned.
9. Incident visualized on interactive map.

---

# 🚀 Core Functionalities

## 1️⃣ Disaster Monitoring

- Real-time disaster plotting
- Severity-based colored markers
- Heatmap visualization
- Radius-based filtering
- Geo-fenced restriction to Uttarakhand

---

## 2️⃣ Traffic Monitoring

- Real-time congestion markers
- Heatmap rendering
- Blocked road detection
- Congestion penalty scoring

---

## 3️⃣ Smart Route Optimization

Uses:

- Haversine formula
- Traffic penalty weighting
- Dijkstra-based route scoring

Route score formula:

```
Route Score = Distance + Traffic Congestion Penalty + Blockage Penalty
```

The lowest score determines the optimal route.

---

## 4️⃣ Automated Escalation Engine

Severity & Type-based logic:

| Condition | Authority |
|-----------|----------|
| Fire | Fire Department |
| Traffic Incident | Police |
| Severity >= 8 | NDRF / SDRF |
| Medium Severity | SDRF |

Features:

- Auto-trigger on disaster creation
- SMTP email integration
- Escalation logging
- Authority proximity matching

---

## 5️⃣ Authority & Resource Mapping

Interactive map layers for:

- Police Stations
- Fire Stations
- NDRF Battalions
- Hospitals
- Shelters

GeoJSON boundary rendering for:

- Uttarakhand
- India (frontend restriction)

---

## 6️⃣ Geofencing & Data Restriction

Backend Restrictions:

- Bounding box validation
- Prevent disaster creation outside Uttarakhand

Frontend Restrictions:

- Map bounds limited
- Controlled zoom levels
- GeoJSON boundary overlay

---

## 7️⃣ Real Data Integration

- Earthquake API
- Weather disaster API
- OpenStreetMap Overpass API
- Authority coordinate extraction

---

# 🏗️ System Architecture

## Backend (Django + DRF)

```
apps/
│
├── disasters/
├── traffic/
├── shelters/
├── authorities/
└── core/
    ├── services/
    └── utils.py
```

### Service-Oriented Structure

- `earthquake_service.py`
- `weather_service.py`
- `escalation_service.py`
- `dijkstra_route_service.py`
- `smart_traffic_service.py`

Separation of concerns ensures scalability and maintainability.

---

## Frontend (React + Leaflet)

- Interactive map rendering
- Heatmap overlays
- Dynamic layer toggles
- Smart search-based location centering
- Responsive UI
- GeoJSON boundary rendering

---

# 🧮 Algorithms Used

- Haversine Distance Formula
- Dijkstra Shortest Path
- Traffic Congestion Weighting
- Bounding Box Geofencing
- Radius-based Filtering

---

# 🗂️ Database Models Overview

## Disaster Model
- disaster_type
- latitude
- longitude
- severity
- confidence_score
- status
- created_at

## Authority Model
- name
- authority_type
- latitude
- longitude
- phone
- email
- state

## TrafficIncident Model
- latitude
- longitude
- congestion_level
- is_blocked

## EscalationLog Model
- disaster
- authority_name
- email_sent
- timestamp

---

# 💻 Tech Stack

## Backend
- Python 3.13
- Django 6
- Django REST Framework
- SQLite (Development)
- SMTP Email (Gmail App Password)
- Overpass API

## Frontend
- React.js
- React Leaflet
- Leaflet Heatmap
- Axios
- GeoJSON
- Custom CSS

---

# ⚙️ Installation Guide

## Backend Setup

```bash
git clone https://github.com/Akki-06/UrbanShield.git
cd UrbanShield
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

# 📧 Email Setup

Enable 2FA in Gmail and create an App Password.

In `settings.py`:

```python
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = "your-email@gmail.com"
EMAIL_HOST_PASSWORD = "your-app-password"
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
```

---

# 🔐 Security Considerations

- Coordinate validation before saving disasters
- Geofencing enforcement
- Escalation logging
- Controlled API filtering
- Email failure handling

---

# 📊 Performance Considerations

- Bounding box filtering reduces DB load
- Radius-based filtering limits dataset size
- Modular services reduce coupling
- Layer toggling improves frontend performance

---

# 📈 Future Enhancements

- AI-based disaster severity prediction
- SMS alert integration
- Push notification system
- Real-time WebSocket updates
- IoT sensor integration
- Satellite image analysis
- Machine learning risk forecasting
- PostgreSQL + PostGIS migration

---

# 🖼️ Screenshots

_Add screenshots here_

- Dashboard view
- Disaster heatmap
- Smart route visualization
- Authority layers

---

# 🎥 Demo

_Add demo video link here_

---

# 🛡️ Real-World Applications

- State disaster management authorities
- Smart city control rooms
- Traffic command centers
- Emergency evacuation planning systems

---

# 🤝 Contribution

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Submit pull request

---

# 👨‍💻 Developed By

UrbanShield Development Team

---

# 📄 License

This project is developed for academic and demonstration purposes.
