// routes/events.js
const router   = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('../controllers/eventController');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate);   // all event routes need a valid JWT

router.get('/stats', ctrl.getStats);
router.get('/',      ctrl.getAllEvents);
router.get('/:id',   ctrl.getEventById);

router.post('/',
  requireRole('admin', 'producer'),
  body('event_name').trim().notEmpty().withMessage('event_name is required'),
  body('priority').optional().isIn(['low','medium','high','critical']),
  body('status').optional().isIn(['pending','active','completed','failed']),
  validate, ctrl.createEvent
);

router.put('/:id',
  body('priority').optional().isIn(['low','medium','high','critical']),
  body('status').optional().isIn(['pending','active','completed','failed']),
  validate, ctrl.updateEvent
);

router.delete('/:id', ctrl.deleteEvent);

module.exports = router;
