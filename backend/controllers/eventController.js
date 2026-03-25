// controllers/eventController.js — CRUD + real-time broadcasting
const { pool }    = require('../config/db');
const { getIO }   = require('../socket/socketManager');

// ── Helper: insert a log entry ─────────────────────────────
async function logAction(event_id, user_id, action, details, ip) {
  await pool.query(
    'INSERT INTO logs (event_id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)',
    [event_id, user_id || null, action, details || null, ip || null]
  );
}

// ── Helper: create notifications for all relevant users ────
async function notifyAll(event_id, message, type = 'info') {
  const [users] = await pool.query('SELECT id FROM users');
  if (!users.length) return;
  const values = users.map(u => [u.id, event_id, message, type]);
  await pool.query(
    'INSERT INTO notifications (user_id, event_id, message, type) VALUES ?',
    [values]
  );
}

// GET /api/events
async function getAllEvents(req, res, next) {
  try {
    const { status, priority, category, limit = 50, offset = 0 } = req.query;

    let sql    = `SELECT e.*, u.name AS creator_name, u.avatar AS creator_avatar
                  FROM events e
                  LEFT JOIN users u ON e.created_by = u.id
                  WHERE 1=1`;
    const params = [];

    if (status)   { sql += ' AND e.status = ?';   params.push(status); }
    if (priority) { sql += ' AND e.priority = ?'; params.push(priority); }
    if (category) { sql += ' AND e.category = ?'; params.push(category); }

    sql += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [events] = await pool.query(sql, params);

    // Total count for pagination
    const [countRow] = await pool.query('SELECT COUNT(*) AS total FROM events');
    res.json({ success: true, total: countRow[0].total, data: events });
  } catch (err) { next(err); }
}

// GET /api/events/:id
async function getEventById(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, u.name AS creator_name, u.avatar AS creator_avatar
       FROM events e LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/events
async function createEvent(req, res, next) {
  try {
    const { event_name, description, category = 'general', priority = 'medium', payload } = req.body;
    const userId = req.user.id;

    const [result] = await pool.query(
      `INSERT INTO events (event_name, description, category, priority, status, payload, created_by)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
      [event_name, description || null, category, priority, payload ? JSON.stringify(payload) : null, userId]
    );

    const eventId = result.insertId;
    await logAction(eventId, userId, 'created', `Created by ${req.user.name}`, req.ip);
    await notifyAll(eventId, `New event: "${event_name}" was created`, 'info');

    // Fetch full event to broadcast
    const [rows] = await pool.query(
      `SELECT e.*, u.name AS creator_name, u.avatar AS creator_avatar
       FROM events e LEFT JOIN users u ON e.created_by = u.id WHERE e.id = ?`,
      [eventId]
    );

    // 🔴 Broadcast to all connected clients
    const io = getIO();
    io.emit('event:created', { event: rows[0] });

    await logAction(eventId, userId, 'broadcast', `Broadcast to ${io.engine.clientsCount} client(s)`, req.ip);

    res.status(201).json({ success: true, message: 'Event created & broadcasted', data: rows[0] });
  } catch (err) { next(err); }
}

// PUT /api/events/:id
async function updateEvent(req, res, next) {
  try {
    const { id } = req.params;
    const { event_name, description, category, priority, status, payload } = req.body;

    const [existing] = await pool.query('SELECT * FROM events WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Event not found' });

    // Only admin or creator may update
    if (req.user.role !== 'admin' && existing[0].created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorised to update this event' });
    }

    await pool.query(
      `UPDATE events SET
         event_name  = COALESCE(?, event_name),
         description = COALESCE(?, description),
         category    = COALESCE(?, category),
         priority    = COALESCE(?, priority),
         status      = COALESCE(?, status),
         payload     = COALESCE(?, payload)
       WHERE id = ?`,
      [event_name, description, category, priority, status,
       payload ? JSON.stringify(payload) : null, id]
    );

    await logAction(id, req.user.id, 'updated', `Updated by ${req.user.name}`, req.ip);

    const [rows] = await pool.query(
      `SELECT e.*, u.name AS creator_name, u.avatar AS creator_avatar
       FROM events e LEFT JOIN users u ON e.created_by = u.id WHERE e.id = ?`,
      [id]
    );

    getIO().emit('event:updated', { event: rows[0] });

    res.json({ success: true, message: 'Event updated & broadcasted', data: rows[0] });
  } catch (err) { next(err); }
}

// DELETE /api/events/:id
async function deleteEvent(req, res, next) {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM events WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Event not found' });

    if (req.user.role !== 'admin' && existing[0].created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorised to delete this event' });
    }

    // Log before delete (FK cascade will remove logs anyway, but we want the broadcast detail)
    await logAction(id, req.user.id, 'deleted', `Deleted by ${req.user.name}`, req.ip);

    await pool.query('DELETE FROM events WHERE id = ?', [id]);

    getIO().emit('event:deleted', { eventId: parseInt(id) });

    res.json({ success: true, message: 'Event deleted & broadcasted' });
  } catch (err) { next(err); }
}

// GET /api/events/stats  — analytics
async function getStats(req, res, next) {
  try {
    const [[totals]]  = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'active')    AS active,
        SUM(status = 'pending')   AS pending,
        SUM(status = 'completed') AS completed,
        SUM(status = 'failed')    AS failed,
        SUM(priority = 'critical') AS critical
      FROM events`);

    const [byCategory] = await pool.query(`
      SELECT category, COUNT(*) AS count FROM events GROUP BY category`);

    const [recent] = await pool.query(`
      SELECT DATE(created_at) AS day, COUNT(*) AS count
      FROM events
      WHERE created_at >= NOW() - INTERVAL 7 DAY
      GROUP BY day ORDER BY day`);

    res.json({ success: true, data: { totals, byCategory, recentActivity: recent } });
  } catch (err) { next(err); }
}

module.exports = { getAllEvents, getEventById, createEvent, updateEvent, deleteEvent, getStats };
