// controllers/notificationController.js
const { pool } = require('../config/db');

// GET /api/notifications  (current user's notifications)
async function getNotifications(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT n.*, e.event_name
       FROM notifications n
       LEFT JOIN events e ON n.event_id = e.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

// PATCH /api/notifications/:id/read
async function markRead(req, res, next) {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) { next(err); }
}

// PATCH /api/notifications/read-all
async function markAllRead(req, res, next) {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { next(err); }
}

// GET /api/notifications/count
async function getUnreadCount(req, res, next) {
  try {
    const [[row]] = await pool.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ success: true, count: row.count });
  } catch (err) { next(err); }
}

module.exports = { getNotifications, markRead, markAllRead, getUnreadCount };
