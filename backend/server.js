require('dotenv').config();

const express     = require('express');
const http        = require('http');
const { Server }  = require('socket.io');
const cors        = require('cors');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const path        = require('path');

const { testConnection }     = require('./config/db');
const socketManager          = require('./socket/socketManager');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// ── Routes ───────────────────────────────────────────────────
const authRoutes         = require('./routes/auth');
const eventRoutes        = require('./routes/events');
const logRoutes          = require('./routes/logs');
const notificationRoutes = require('./routes/notifications');

const app    = express();
const server = http.createServer(app);

// 🔥 FIX 1: Strong CORS (IMPORTANT)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ── Socket.io ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
socketManager.init(io);

// ── Express Middleware ───────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiter
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests — slow down!' },
}));

// ── REST API Routes ──────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/events',        eventRoutes);
app.use('/api/logs',          logRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status:  'online',
    uptime:  process.uptime().toFixed(1) + 's',
    clients: io.engine.clientsCount,
    ts:      new Date().toISOString(),
  });
});

// 🔥 FIX 2: REMOVE static + catch-all (causing fetch issue)
// ❌ REMOVE THESE:
// app.use(express.static(...))
// app.get('*', ...)

// ── Error Handling ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Boot ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

(async () => {
  await testConnection();
  server.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log(`📡 WebSocket ready`);
    console.log(`🗄️ Database: ${process.env.DB_NAME || 'event_engine'}`);
    console.log(`🌍 Env: ${process.env.NODE_ENV || 'development'}\n`);
    console.log("JWT:", process.env.JWT_SECRET);
  });
})();