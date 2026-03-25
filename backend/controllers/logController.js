// controllers/logController.js
const { pool } = require('../config/db');

// GET /api/logs
async function getLogs(req, res, next) {
  try {
    const { event_id, action, limit = 100, offset = 0 } = req.query;
    let sql    = `SELECT l.*, u.name AS user_name, u.avatar, e.event_name
                  FROM logs l
                  LEFT JOIN users  u ON l.user_id  = u.id
                  LEFT JOIN events e ON l.event_id = e.id
                  WHERE 1=1`;
    const params = [];

    if (event_id) { sql += ' AND l.event_id = ?'; params.push(event_id); }
    if (action)   { sql += ' AND l.action = ?';   params.push(action); }

    sql += ' ORDER BY l.timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [logs] = await pool.query(sql, params);
    res.json({ success: true, data: logs });
  } catch (err) { next(err); }
}

// GET /api/logs/:eventId
async function getEventLogs(req, res, next) {
  try {
    const [logs] = await pool.query(
      `SELECT l.*, u.name AS user_name, u.avatar
       FROM logs l LEFT JOIN users u ON l.user_id = u.id
       WHERE l.event_id = ?
       ORDER BY l.timestamp DESC`,
      [req.params.eventId]
    );
    res.json({ success: true, data: logs });
  } catch (err) { next(err); }
}

module.exports = { getLogs, getEventLogs };
