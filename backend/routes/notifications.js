// routes/notifications.js
const router = require('express').Router();
const ctrl   = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/',              ctrl.getNotifications);
router.get('/count',         ctrl.getUnreadCount);
router.patch('/read-all',    ctrl.markAllRead);
router.patch('/:id/read',    ctrl.markRead);

module.exports = router;
