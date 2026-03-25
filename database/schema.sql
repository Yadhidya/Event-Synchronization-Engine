-- ============================================================
-- Real-Time Event Synchronization Engine — Database Schema
-- Compatible with MySQL 8+ and PostgreSQL 14+
-- ============================================================

-- ── Users Table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,   -- PG: SERIAL PRIMARY KEY
    name        VARCHAR(100)  NOT NULL,
    email       VARCHAR(150)  NOT NULL UNIQUE,
    password    VARCHAR(255)  NOT NULL,
    role        ENUM('admin','producer','consumer') NOT NULL DEFAULT 'consumer',
    avatar      VARCHAR(10)   DEFAULT '🙂',
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Events Table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    event_name  VARCHAR(200)  NOT NULL,
    description TEXT,
    category    VARCHAR(80)   NOT NULL DEFAULT 'general',
    priority    ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
    status      ENUM('pending','active','completed','failed') NOT NULL DEFAULT 'pending',
    payload     JSON,                          -- structured event data
    created_by  INT           NOT NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Logs Table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logs (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    event_id    INT           NOT NULL,
    user_id     INT,
    action      ENUM('created','updated','deleted','broadcast','consumed','failed') NOT NULL,
    details     TEXT,
    ip_address  VARCHAR(45),
    timestamp   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE SET NULL
);

-- ── Notifications Table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT           NOT NULL,
    event_id    INT,
    message     VARCHAR(500)  NOT NULL,
    type        ENUM('info','success','warning','error') NOT NULL DEFAULT 'info',
    is_read     BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);

-- ── Indexes for performance ──────────────────────────────────
CREATE INDEX idx_events_status    ON events(status);
CREATE INDEX idx_events_priority  ON events(priority);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_logs_event_id    ON logs(event_id);
CREATE INDEX idx_logs_timestamp   ON logs(timestamp);
CREATE INDEX idx_notif_user_read  ON notifications(user_id, is_read);

-- ── Seed Data ────────────────────────────────────────────────
-- Default admin user  (password: Admin@123  — bcrypt hash below)
INSERT INTO users (name, email, password, role, avatar) VALUES
  ('Admin User',    'admin@events.io',    '$2b$10$YKq5PZHwzklm6Q8vUxQxeOQ.9zF7Rrx3sDJW1oAGnVE2f6kq0mR6W', 'admin',    '👑'),
  ('Alice Producer','alice@events.io',   '$2b$10$YKq5PZHwzklm6Q8vUxQxeOQ.9zF7Rrx3sDJW1oAGnVE2f6kq0mR6W', 'producer', '🚀'),
  ('Bob Consumer',  'bob@events.io',     '$2b$10$YKq5PZHwzklm6Q8vUxQxeOQ.9zF7Rrx3sDJW1oAGnVE2f6kq0mR6W', 'consumer', '👀');

-- Seed events
INSERT INTO events (event_name, description, category, priority, status, created_by) VALUES
  ('System Boot',       'Application server started successfully', 'system',  'high',   'completed', 1),
  ('User Login Spike',  'Unusual login activity detected',         'security','critical','active',   1),
  ('DB Backup Done',    'Nightly database backup completed',       'database','low',    'completed', 2),
  ('API Rate Limit',    'Client exceeded 1000 req/min threshold',  'network', 'medium', 'active',    2);

-- Seed logs
INSERT INTO logs (event_id, user_id, action, details) VALUES
  (1, 1, 'created',   'Event created via admin panel'),
  (1, 1, 'broadcast', 'Sent to 3 connected clients'),
  (2, 1, 'created',   'Security alert triggered'),
  (3, 2, 'created',   'Automated backup event'),
  (4, 2, 'created',   'Rate limiter triggered');
