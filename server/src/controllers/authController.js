const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/db');
const emitter = require('../events/eventEmitter');
const { signToken, signRefreshToken, setTokenCookies, clearTokenCookies } = require('../utils/jwt');
const { sendEmail } = require('../utils/email');

// Init removed in favor of explicit migration script

// ── Google OAuth callback (shared by all flows) ──────────────────────────────
const handleGoogleCallback = async (req, res, next) => {
  // Passport uses callback-style auth in the route, so req.user is set on success.
  // On failure, req.user is undefined/false and req.authInfo has the reason.
  const user = req.user;
  const state = req.query?.state || '';

  if (!user) {
    const message = req.authInfo?.message || 'Authentication failed.';
    if (state === 'admin') {
      return res.redirect(
        `${process.env.CLIENT_URL}/admin/auth?error=${encodeURIComponent(message)}`
      );
    }
    if (state === 'login') {
      return res.redirect(
        `${process.env.CLIENT_URL}/auth/login?error=${encodeURIComponent(message)}`
      );
    }
    return res.redirect(
      `${process.env.CLIENT_URL}/auth/error?message=${encodeURIComponent(message)}`
    );
  }

  // Instead of setting cookies directly here, we generate a short-lived exchange token.
  // This bypasses Safari ITP issues dropping cookies on cross-origin redirects.
  const exchangeToken = jwt.sign({ id: user.id, role: user.role, student_id: user.student_id }, process.env.JWT_SECRET, {
    expiresIn: '5m',
    audience: 'oauth_exchange',
  });

  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  res.clearCookie('oauth_nonce', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax'
  });

  const redirectUrl = `${process.env.CLIENT_URL}/oauth-success?code=${exchangeToken}`;
  return res.redirect(redirectUrl);
};

// ── Admin: verify secret key, return a short-lived token ─────────────────────
//
// The client uses this token as ?t=TOKEN when it redirects to /auth/admin/google,
// so we can verify the key check actually happened before initiating the OAuth.
const validateAdminKey = (req, res) => {
  const { secretKey } = req.body;

  if (!secretKey || secretKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ success: false, message: 'Invalid admin secret key.' });
  }

  // Short-lived (3 minutes) token — just proves the key was entered
  const adminFlowToken = jwt.sign({ adminFlow: true }, process.env.JWT_SECRET, {
    expiresIn: '3m',
    audience: 'admin_flow',
  });

  res.json({ success: true, adminFlowToken });
};

// ── Middleware: gate for /auth/admin/google ───────────────────────────────────
const requireAdminFlowToken = (req, res, next) => {
  const token = req.query?.t;
  if (!token) {
    return res.redirect(
      `${process.env.CLIENT_URL}/admin/auth?error=Missing+admin+flow+token.`
    );
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { audience: 'admin_flow' });
    if (!decoded.adminFlow) throw new Error('Not an admin flow token.');
    next();
  } catch {
    return res.redirect(
      `${process.env.CLIENT_URL}/admin/auth?error=Token+expired+or+invalid.+Please+try+again.`
    );
  }
};

// ── Logout ───────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    try {
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    } catch (err) {
      console.error('[logout] token deletion error:', err.message);
    }
  }
  clearTokenCookies(res);
  res.json({ success: true, message: 'Logged out successfully.' });
};

// ── Get current user ─────────────────────────────────────────────────────────
const getMe = (req, res) => {
  const { id, name, email, profile_pic, role, student_id } = req.user;
  res.json({ success: true, user: { id, name, email, profile_pic, role, student_id } });
};

// ── Complete student profile (after OAuth) ────────────────────────────────────
const completeProfile = async (req, res) => {
  const { student_id } = req.body;

  if (!student_id || typeof student_id !== 'string' || !student_id.trim()) {
    return res.status(422).json({ success: false, message: 'Student ID is required.' });
  }

  const sid = student_id.trim().toUpperCase();

  if (!/^[A-Za-z0-9/\-]{3,20}$/.test(sid)) {
    return res.status(422).json({ success: false, message: 'Invalid student ID format.' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE student_id = $1 AND id != $2',
      [sid, req.user.id]
    );
    if (existing.rows.length) {
      return res.status(409).json({ success: false, message: 'Student ID already in use.' });
    }

    await pool.query(
      'UPDATE users SET student_id = $1, updated_at = NOW() WHERE id = $2',
      [sid, req.user.id]
    );

    res.json({ success: true, message: 'Profile completed.' });
  } catch (err) {
    console.error('[completeProfile]', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Local registration (student & recruiter only) ─────────────────────────────
const registerLocal = async (req, res) => {
  try {
    const { name, email, password, role, student_id } = req.body;

    // Admins cannot self-register — they are added directly via DB
    if (role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin accounts cannot be self-registered.' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }

    let sid = null;
    if (role === 'student') {
      if (!student_id || !student_id.trim()) {
        return res.status(422).json({ success: false, message: 'Student ID is required for student accounts.' });
      }
      sid = student_id.trim().toUpperCase();
      if (!/^[A-Za-z0-9/\-]{3,20}$/.test(sid)) {
        return res.status(422).json({ success: false, message: 'Invalid student ID format (e.g. 2020/CS/001).' });
      }
      const existingSid = await pool.query('SELECT id FROM users WHERE student_id = $1', [sid]);
      if (existingSid.rows.length) {
        return res.status(409).json({ success: false, message: 'Student ID already in use.' });
      }
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const insertResult = await pool.query(
      `INSERT INTO users (name, email, password, role, student_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, role`,
      [name, email, hashedPassword, role, sid]
    );

    const newUser = insertResult.rows[0];

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await pool.query(
      "UPDATE users SET verification_token = $1, verification_token_expires_at = NOW() + INTERVAL '1 day' WHERE id = $2",
      [verificationToken, newUser.id]
    );
    
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to UOK Connect, ${name}!</h2>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="color: #666; font-size: 14px;">If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="color: #666; font-size: 14px; word-break: break-all;">${verificationUrl}</p>
      </div>
    `;
    
    await sendEmail(email, 'Verify Your Email - UOK Connect', emailHtml);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      requireVerification: true,
    });

    // Emit event for admin notifications (after response is sent)
    emitter.emit('UserRegistered', { id: newUser.id, name, email, role: newUser.role });
  } catch (err) {
    console.error('[registerLocal]', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Verify Email ──────────────────────────────────────────────────────────────
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required.' });
    }

    const result = await pool.query(
      'SELECT id, is_email_verified, verification_token_expires_at FROM users WHERE verification_token = $1',
      [token]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Invalid verification token.' });
    }
    
    const user = result.rows[0];

    if (new Date() > new Date(user.verification_token_expires_at)) {
      return res.status(400).json({ success: false, message: 'Verification token expired. Please request a new one.' });
    }

    if (user.is_email_verified) {
      return res.json({ success: true, message: 'Email is already verified. You can now log in.' });
    }

    await pool.query(
      'UPDATE users SET is_email_verified = TRUE, verification_token = NULL, verification_token_expires_at = NULL, updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    console.error('[verifyEmail]', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Local login (all roles including admin) ───────────────────────────────────
const loginLocal = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'This account uses Google Sign-In. Please use the Google button.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Blocked user check
    if (user.is_blocked) {
      return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
    }

    if (!user.is_email_verified) {
      return res.status(403).json({ success: false, message: 'Please verify your email before logging in.' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admins must log in through the admin portal.' });
    }

    const token = signToken(user.id);
    const refreshToken = signRefreshToken(user.id);
    
    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')",
      [user.id, refreshToken]
    );
    
    setTokenCookies(res, token, refreshToken);

    res.json({
      success: true,
      message: 'Login successful.',
      role: user.role,
      token,
      refreshToken,
    });
  } catch (err) {
    console.error('[loginLocal]', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Refresh Token ─────────────────────────────────────────────────────────────
const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token provided.' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET, { audience: 'refresh' });

    // DB Revocation Check
    const tokenCheck = await pool.query('SELECT id FROM refresh_tokens WHERE token = $1', [refreshToken]);
    if (!tokenCheck.rows.length) {
      throw new Error('Refresh token revoked or not found.');
    }

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const user = result.rows[0];

    if (user.is_blocked) {
      clearTokenCookies(res);
      return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
    }

    const newToken = signToken(user.id);
    const newRefreshToken = signRefreshToken(user.id);
    
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')",
      [user.id, newRefreshToken]
    );
    
    setTokenCookies(res, newToken, newRefreshToken);

    res.json({ success: true, message: 'Token refreshed.', token: newToken, refreshToken: newRefreshToken });
  } catch (err) {
    clearTokenCookies(res);
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }
};

// ── OAuth Code Exchange ───────────────────────────────────────────────────────
const exchangeOAuthCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Exchange code is required.' });
    }

    const decoded = jwt.verify(code, process.env.JWT_SECRET, { audience: 'oauth_exchange' });
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    
    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const user = result.rows[0];

    if (user.is_blocked) {
      return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
    }

    const token = signToken(user.id);
    const refreshToken = signRefreshToken(user.id);
    
    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')",
      [user.id, refreshToken]
    );
    
    setTokenCookies(res, token, refreshToken);

    res.json({
      success: true,
      message: 'OAuth exchange successful.',
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile_pic: user.profile_pic,
        role: user.role,
        student_id: user.student_id
      }
    });
  } catch (err) {
    console.error('[exchangeOAuthCode]', err.message);
    res.status(401).json({ success: false, message: 'Invalid or expired exchange code.' });
  }
};

module.exports = {
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
};