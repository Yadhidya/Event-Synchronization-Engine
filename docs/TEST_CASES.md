# 🧪 Test Cases — Real-Time Event Synchronization Engine

All tests below can be run using **curl**, **Postman**, or any REST client.
Replace `TOKEN` with the JWT returned from login.

---

## 1. Authentication Tests

### TC-01: Register a new user
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@events.io","password":"Test@123","role":"producer"}'
```
**Expected:** `201 Created`
```json
{ "success": true, "message": "Registered successfully", "token": "eyJ...", "user": {...} }
```

### TC-02: Login with valid credentials
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@events.io","password":"Admin@123"}'
```
**Expected:** `200 OK` with JWT token

### TC-03: Login with wrong password
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@events.io","password":"wrongpass"}'
```
**Expected:** `401 Unauthorized` → `{ "message": "Invalid credentials" }`

### TC-04: Access protected route without token
```bash
curl http://localhost:5000/api/events
```
**Expected:** `401 Unauthorized` → `{ "message": "No token provided" }`

### TC-05: Get current user profile
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```
**Expected:** `200 OK` with user object

---

## 2. Event CRUD Tests

### TC-06: Create an event (producer/admin only)
```bash
curl -X POST http://localhost:5000/api/events \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "Payment Timeout",
    "description": "Payment gateway timed out after 30s",
    "category": "payments",
    "priority": "high",
    "status": "active",
    "payload": { "gateway": "Stripe", "retry": true }
  }'
```
**Expected:** `201 Created`  
**Side effect:** All connected WebSocket clients receive `event:created` immediately

### TC-07: Create event with missing name (validation)
```bash
curl -X POST http://localhost:5000/api/events \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category":"network"}'
```
**Expected:** `422 Unprocessable` → `{ "errors": [{ "field": "event_name", "msg": "event_name is required" }] }`

### TC-08: Get all events
```bash
curl http://localhost:5000/api/events \
  -H "Authorization: Bearer TOKEN"
```
**Expected:** `200 OK` with `{ "total": N, "data": [...] }`

### TC-09: Filter events by status
```bash
curl "http://localhost:5000/api/events?status=active" \
  -H "Authorization: Bearer TOKEN"
```
**Expected:** Only events with `status: "active"`

### TC-10: Get single event
```bash
curl http://localhost:5000/api/events/1 \
  -H "Authorization: Bearer TOKEN"
```
**Expected:** `200 OK` with event object including `creator_name`

### TC-11: Update event status
```bash
curl -X PUT http://localhost:5000/api/events/1 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```
**Expected:** `200 OK`  
**Side effect:** All WebSocket clients receive `event:updated`

### TC-12: Delete an event (admin only)
```bash
curl -X DELETE http://localhost:5000/api/events/1 \
  -H "Authorization: Bearer TOKEN"
```
**Expected:** `200 OK`  
**Side effect:** All WebSocket clients receive `event:deleted` with `{ eventId: 1 }`

### TC-13: Consumer tries to create event (permission denied)
```bash
# Login as bob (consumer) first, use that token
curl -X POST http://localhost:5000/api/events \
  -H "Authorization: Bearer CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event_name":"Test"}'
```
**Expected:** `403 Forbidden` → `{ "message": "Insufficient permissions" }`

---

## 3. Stats & Analytics Tests

### TC-14: Get event statistics
```bash
curl http://localhost:5000/api/events/stats \
  -H "Authorization: Bearer TOKEN"
```
**Expected:** `200 OK`
```json
{
  "data": {
    "totals": { "total": 4, "active": 2, "pending": 0, "completed": 2, "failed": 0, "critical": 0 },
    "byCategory": [ { "category": "system", "count": 1 }, ... ],
    "recentActivity": [ { "day": "2024-01-15", "count": 3 }, ... ]
  }
}
```

---

## 4. Logs Tests

### TC-15: Get activity logs
```bash
curl http://localhost:5000/api/logs \
  -H "Authorization: Bearer TOKEN"
```
**Expected:** `200 OK` with array of log entries including `event_name`, `user_name`, `action`

### TC-16: Filter logs by action
```bash
curl "http://localhost:5000/api/logs?action=broadcast" \
  -H "Authorization: Bearer TOKEN"
```
**Expected:** Only `broadcast` logs

### TC-17: Get logs for a specific event
```bash
curl http://localhost:5000/api/logs/1 \
  -H "Authorization: Bearer TOKEN"
```
**Expected:** All log entries for event ID 1

---

## 5. Notifications Tests

### TC-18: Get notifications
```bash
curl http://localhost:5000/api/notifications \
  -H "Authorization: Bearer TOKEN"
```
**Expected:** `200 OK` with array of user notifications

### TC-19: Get unread count
```bash
curl http://localhost:5000/api/notifications/count \
  -H "Authorization: Bearer TOKEN"
```
**Expected:** `{ "count": N }`

### TC-20: Mark all notifications as read
```bash
curl -X PATCH http://localhost:5000/api/notifications/read-all \
  -H "Authorization: Bearer TOKEN"
```
**Expected:** `200 OK` → count drops to 0

---

## 6. WebSocket Tests (Manual Browser Test)

### TC-21: Multi-client sync test
1. Open `http://localhost:5000` in **Browser Tab A** (login as admin)
2. Open `http://localhost:5000` in **Browser Tab B** (login as alice)
3. In Tab A: Create a new event via the form
4. **Both tabs** should immediately show the new event in the live stream and table
5. **Expected:** Zero-delay synchronization across tabs

### TC-22: Live connection indicator
1. Stop the server (`Ctrl+C`)
2. **Expected:** Both browser tabs show "🔴 Offline" in the connection indicator
3. Restart the server
4. **Expected:** Both tabs automatically reconnect and show "🟢 Live"

---

## 7. Health Check

### TC-23: Server health endpoint
```bash
curl http://localhost:5000/api/health
```
**Expected:**
```json
{
  "success": true,
  "status": "online",
  "uptime": "42.3s",
  "clients": 2,
  "ts": "2024-01-15T10:30:00.000Z"
}
```

---

## Expected Sample Output — Event Create + Broadcast

**Step 1:** POST to create event  
**Response:**
```json
{
  "success": true,
  "message": "Event created & broadcasted",
  "data": {
    "id": 5,
    "event_name": "Payment Timeout",
    "category": "payments",
    "priority": "high",
    "status": "active",
    "creator_name": "Admin User",
    "creator_avatar": "👑",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Step 2:** All connected browser clients simultaneously receive via WebSocket:
```json
{
  "event": {
    "id": 5,
    "event_name": "Payment Timeout",
    "priority": "high",
    "status": "active",
    ...
  }
}
```

**Step 3:** Log entry written to DB:
```
id=7 | event_id=5 | action=created | details="Created by Admin User"
id=8 | event_id=5 | action=broadcast | details="Broadcast to 2 client(s)"
```
