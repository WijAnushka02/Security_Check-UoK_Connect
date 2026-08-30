const express = require('express');
const passport = require('passport');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  handleGoogleCallback,
  validateAdminKey,
  requireAdminFlowToken,
  logout,
  getMe,
  completeProfile,
  registerLocal,
  verifyEmail,
  loginLocal,
  refresh,
  exchangeOAuthCode,
} = require('../controllers/authController');

const router = express.Router();

// ── Asgardeo OIDC ─────────────────────────────────────────────────────────────
// Initiates the OIDC login flow. The state can still carry the user's intended role.
router.get('/oidc/login', (req, res, next) => {
  req.query.state = req.query.state || 'login';
  require('../controllers/authController').oidcLogin(req, res, next);
});

// OIDC callback
router.get('/callback', require('../controllers/authController').oidcCallback);

// General endpoints
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.post('/oauth-exchange', exchangeOAuthCode);

router.post(
  '/complete-profile',
  authenticate,
  [body('student_id').trim().notEmpty().withMessage('Student ID is required.')],
  validate,
  completeProfile
);

// ── Local auth ────────────────────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Full name is required.').escape(),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required.')
      .custom((value, { req }) => {
        const domain = value.split('@')[1];
        
        // List of allowed domains (University + Common providers)
        const allowedDomains = [
          'stu.kln.ac.lk',
          'kln.ac.lk',
          'gmail.com',
          'yahoo.com',
          'outlook.com',
          'hotmail.com',
          'icloud.com'
        ];

        // If the role is 'student', we strictly enforce the whitelist.
        // (We allow recruiters to bypass this so they can use their company domains like @wso2.com)
        if (req.body.role === 'student' && !allowedDomains.includes(domain)) {
          throw new Error('Students must use a UOK email or a standard provider (Gmail, Yahoo, Outlook, iCloud).');
        }
        return true;
      }),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters.')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter.')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number.')
      .matches(/[^A-Za-z0-9]/)
      .withMessage('Password must contain at least one special character.'),
    body('role')
      .isIn(['student', 'recruiter'])
      .withMessage('Role must be student or recruiter.'),
  ],
  validate,
  registerLocal
);

router.post(
  '/verify-email',
  [body('token').notEmpty().withMessage('Token is required.')],
  validate,
  verifyEmail
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  loginLocal
);

module.exports = router;
