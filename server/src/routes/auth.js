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

// ── Anti-CSRF Helper ──────────────────────────────────────────────────────────
const startGoogleOAuth = (req, res, next, role) => {
  const nonce = crypto.randomBytes(16).toString('hex');
  const stateToken = jwt.sign({ role, nonce }, process.env.JWT_SECRET, { expiresIn: '10m' });
  
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  res.cookie('oauth_nonce', nonce, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax', // must be lax so it's sent on top-level navigation from Google
    maxAge: 10 * 60 * 1000 // 10 minutes
  });

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: stateToken,
    session: false,
  })(req, res, next);
};

// ── Google OAuth — Student ────────────────────────────────────────────────────
router.get('/google/student', (req, res, next) => startGoogleOAuth(req, res, next, 'student'));

// ── Google OAuth — Recruiter ──────────────────────────────────────────────────
router.get('/google/recruiter', (req, res, next) => startGoogleOAuth(req, res, next, 'recruiter'));

// ── Google OAuth — Login (existing users only, any role) ─────────────────────
router.get('/google/login', (req, res, next) => startGoogleOAuth(req, res, next, 'login'));

// ── Google OAuth — Admin (existing DB admin only) ─────────────────────────────
router.post(
  '/admin/verify-key',
  [body('secretKey').trim().notEmpty().withMessage('Secret key is required.')],
  validate,
  validateAdminKey
);

router.get('/admin/google', requireAdminFlowToken, (req, res, next) => startGoogleOAuth(req, res, next, 'admin'));

// ── Shared Google callback (all flows) ───────────────────────────────────────
// All Google OAuth flows return here.  The `state` query param tells the callback
// which flow it is and where to redirect on failure.
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) return next(err);
    // Attach user and authInfo to req for handleGoogleCallback
    req.user = user || null;
    req.authInfo = info || {};
    next();
  })(req, res, next);
}, handleGoogleCallback);

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
