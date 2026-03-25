# ⚡ Real-Time Event Synchronization Engine

A full-stack real-time event engine built with **Node.js**, **Express**, **Socket.io**, **MySQL**, and vanilla **HTML/CSS/JS**.

---

## 📁 Project Structure

```
realtime-event-engine/
├── backend/
│   ├── config/
│   │   ├── db.js              # MySQL connection pool
│   │   └── db-setup.js        # One-time schema runner
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── eventController.js
│   │   ├── logController.js
│   │   └── notificationController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT guard + role check
│   │   ├── errorHandler.js
│   │   └── validate.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── events.js
│   │   ├── logs.js
│   │   └── notifications.js
│   ├── socket/
│   │   └── socketManager.js   # Socket.io event handlers
│   ├── .env.example
│   ├── package.json
│   └── server.js              # App entry point
├── frontend/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── api.js             # REST API wrapper
│   │   ├── socket.js          # Socket.io client
│   │   ├── ui.js              # Rendering helpers
│   │   └── app.js             # Main controller
│   └── index.html
├── database/
│   └── schema.sql             # Tables + seed data
└── docs/
    ├── README.md
    └── TEST_CASES.md
```

---

## 🗄️ Database Schema

```
users        → id, name, email, password, role, avatar, timestamps
events       → id, event_name, description, category, priority, status, payload, created_by, timestamps
logs         → id, event_id, user_id, action, details, ip_address, timestamp
notifications→ id, user_id, event_id, message, type, is_read, created_at
```

---

## 🚀 Local Setup (Step-by-Step)

### Prerequisites
- Node.js v18+
- MySQL 8+ running locally
- npm

### 1. Clone / Unzip the project

```bash
cd realtime-event-engine/backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your MySQL credentials:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=event_engine
JWT_SECRET=change_this_to_a_long_random_string
```

### 4. Set up the database

```bash
node config/db-setup.js
```

This creates the `event_engine` database, all tables, and seed data.

### 5. Start the server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 6. Open the app

```
http://localhost:5000
```

### Seed login credentials (all use password: `Admin@123`)

| Email                | Role     |
|----------------------|----------|
| admin@events.io      | admin    |
| alice@events.io      | producer |
| bob@events.io        | consumer |

---

## 🏗️ Architecture Overview

```
Browser Clients (HTML/CSS/JS)
       │
       ├── REST calls (fetch)  ──→  Express REST API  ──→  MySQL
       │
       └── WebSocket (Socket.io) ──→ Socket.io Server
                                         │
                              io.emit() broadcasts
                                         │
                              All connected clients receive
                              event:created / event:updated / event:deleted
```

### Event Flow (Producer → Consumer)

1. **Producer** sends `POST /api/events` with event data
2. **Express** validates input → writes to MySQL `events` table
3. **Express** calls `io.emit('event:created', { event })` via `socketManager`
4. **Socket.io** broadcasts to **all** connected clients simultaneously
5. **Each consumer** receives the socket event and updates their UI in real-time
6. **Log** is written to `logs` table for audit trail

---

## 📡 WebSocket Events

| Event (server → client) | Payload | Description |
|--------------------------|---------|-------------|
| `event:created`          | `{ event }` | New event broadcasted |
| `event:updated`          | `{ event }` | Event modified |
| `event:deleted`          | `{ eventId }` | Event removed |
| `event:triggered`        | event data | Manual trigger |
| `user:joined`            | `{ user, connectedClients }` | Client connected |
| `user:left`              | `{ connectedClients }` | Client disconnected |

| Event (client → server) | Payload | Description |
|--------------------------|---------|-------------|
| `event:trigger`          | event data | Manual trigger |
| `subscribe`              | room name | Join a channel |
| `ping`                   | — | Heartbeat |

---

## 🔌 REST API Reference

### Auth
```
POST   /api/auth/register   { name, email, password, role }
POST   /api/auth/login      { email, password }
GET    /api/auth/me         (JWT required)
```

### Events
```
GET    /api/events          ?status=&priority=&limit=&offset=
GET    /api/events/stats
GET    /api/events/:id
POST   /api/events          { event_name, description, category, priority, status, payload }
PUT    /api/events/:id      (partial update)
DELETE /api/events/:id
```

### Logs
```
GET    /api/logs            ?event_id=&action=&limit=
GET    /api/logs/:eventId
```

### Notifications
```
GET    /api/notifications
GET    /api/notifications/count
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
```

### Health
```
GET    /api/health
```
