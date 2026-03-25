// routes/logs.js
const router = require('express').Router();
const ctrl   = require('../controllers/logController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/',            ctrl.getLogs);
router.get('/:eventId',    ctrl.getEventLogs);

module.exports = router;
