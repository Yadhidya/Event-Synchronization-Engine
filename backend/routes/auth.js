// routes/auth.js
const router   = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate         = require('../middleware/validate');

const pwRule = body('password').isLength({ min: 6 }).withMessage('Password must be ≥ 6 chars');

router.post('/register',
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  pwRule,
  body('role').optional().isIn(['admin','producer','consumer']),
  validate, ctrl.register
);

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  pwRule,
  validate, ctrl.login
);

router.get('/me', authenticate, ctrl.me);

module.exports = router;
