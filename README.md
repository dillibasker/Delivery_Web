# 🏍️ RapidoX — Full-Stack Ride Booking App

A production-ready Rapido-clone with real-time live tracking, built with Vite + React, Node.js + Express, MongoDB, Socket.io, and Leaflet/OpenStreetMap.

---

## 🗂️ Folder Structure

```
rapido-clone/
├── backend/
│   ├── models/
│   │   ├── User.js          # User schema (owner/driver)
│   │   └── Ride.js          # Ride schema
│   ├── routes/
│   │   ├── auth.js          # Login/Register routes
│   │   └── rides.js         # Ride CRUD routes
│   ├── middleware/
│   │   └── auth.js          # JWT middleware
│   ├── socket/
│   │   └── socketHandler.js # All Socket.io events
│   ├── .env
│   ├── package.json
│   └── server.js            # Entry point
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── MapView.jsx   # Leaflet map component
    │   │   ├── Navbar.jsx    # Top nav bar
    │   │   └── Toast.jsx     # Notification toasts
    │   ├── context/
    │   │   ├── AuthContext.jsx   # Auth state + JWT
    │   │   └── SocketContext.jsx # Socket.io connection
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── OwnerDashboard.jsx  # Book + Track rides
    │   │   └── DriverDashboard.jsx # Accept + Navigate rides
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## ⚙️ Prerequisites

- **Node.js** v18+ — https://nodejs.org
- **MongoDB** (local) — https://www.mongodb.com/try/download/community
  - Or use MongoDB Atlas (free tier): update `MONGODB_URI` in `.env`

---

## 🚀 Setup & Run

### 1. Start MongoDB locally
```bash
mongod
# or on macOS with Homebrew:
brew services start mongodb-community
```

### 2. Backend Setup
```bash
cd rapido-clone/backend
npm install
npm run dev
# Server runs at http://localhost:5000
```

### 3. Frontend Setup
```bash
cd rapido-clone/frontend
npm install
npm run dev
# App runs at http://localhost:5173
```

---

## 🧪 Testing the App

### To test the full flow, open **two browser windows**:

**Window 1 — Register/Login as Owner:**
- Go to http://localhost:5173/register
- Select "Owner" role
- Register and you'll be taken to the Owner Dashboard
- Search for a pickup and drop location (in India)
- Click "Book Ride"

**Window 2 — Register/Login as Driver:**
- Go to http://localhost:5173/register (use a different email)
- Select "Driver" role, fill vehicle info
- Register and you'll be taken to Driver Dashboard
- Toggle "Online" switch to go available
- You'll see the ride request appear in real-time
- Click "Accept Ride"

**Back in Window 1 (Owner):**
- You'll see the driver's info appear
- The driver's location marker will start moving on the map in real-time!

**Back in Window 2 (Driver):**
- Click "Start Ride" → then "Complete Ride"

---

## 🔑 Key Features

| Feature | Details |
|---|---|
| Authentication | JWT tokens, bcrypt password hashing |
| Role-based routing | Owner and Driver have separate dashboards |
| Real-time ride requests | Socket.io — drivers get notified instantly |
| Socket rooms | Only the assigned owner tracks their driver |
| Live GPS tracking | Driver's location emitted every 3 seconds |
| Map (FREE) | Leaflet + OpenStreetMap (no API keys needed) |
| Location search | Nominatim geocoding (free, no API key) |
| Fare calculation | Distance-based automatic fare estimate |
| Ride lifecycle | pending → accepted → in_progress → completed |

---

## 🔧 Environment Variables

### Backend (`backend/.env`)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rapido
JWT_SECRET=rapido_super_secret_jwt_key_2024
CLIENT_URL=http://localhost:5173
```

---

## 📡 Socket Events

| Event | Direction | Description |
|---|---|---|
| `owner:bookRide` | Client→Server | Owner books a ride |
| `ride:newRequest` | Server→Drivers | Broadcast new ride to all online drivers |
| `driver:acceptRide` | Client→Server | Driver accepts a ride |
| `ride:accepted` | Server→Owner | Notifies owner that driver accepted |
| `driver:locationUpdate` | Client→Server | Driver sends GPS coords |
| `driver:moved` | Server→Owner | Forwards driver location to owner only |
| `driver:startRide` | Client→Server | Driver marks ride as started |
| `driver:completeRide` | Client→Server | Driver completes the ride |
| `owner:cancelRide` | Client→Server | Owner cancels the ride |

---

## 🌐 API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | - | Register user |
| POST | /api/auth/login | - | Login |
| GET | /api/auth/me | JWT | Get current user |
| POST | /api/rides/book | Owner JWT | Book a ride |
| GET | /api/rides/active | Owner JWT | Get active ride |
| GET | /api/rides/my-rides | Owner JWT | Ride history |
| GET | /api/rides/pending | Driver JWT | Get pending rides |
| GET | /api/rides/driver-active | Driver JWT | Driver's active ride |
| PATCH | /api/rides/:id/accept | Driver JWT | Accept a ride |
| PATCH | /api/rides/:id/cancel | JWT | Cancel a ride |

---

Built with ❤️ using 100% free, open-source tools.
