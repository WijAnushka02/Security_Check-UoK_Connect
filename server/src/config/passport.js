const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');
const emitter = require('../events/eventEmitter');

/**
 * Role resolution via OAuth `state` parameter.
 *
 * Initiator sets state to one of:
 *   'student'   – /auth/google/student   → create/login student
 *   'recruiter' – /auth/google/recruiter  → create/login recruiter
 *   'login'     – /auth/google/login      → login only (no new user)
 *   'admin'     – /auth/admin/google      → login only, must already be admin in DB
 *
 * Admin accounts are NEVER auto-created here.
 * They are inserted directly via SQL (see scripts/create_admin.sql).
 */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Single callback URL – all flows share it; role is in the state param
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const googleId = profile.id;
        const name = profile.displayName;
        const profilePic = profile.photos?.[0]?.value || null;

        // State is set by our initiation routes and returned unchanged by Google
        const state = req.query?.state || 'recruiter';

        // Existing user 
        const result = await pool.query(
          'SELECT id, name, email, profile_pic, role, student_id, is_blocked, is_email_verified, google_id FROM users WHERE google_id = $1 OR (email = $2 AND google_id IS NULL)',
          [googleId, email]
        );

        if (result.rows.length > 0) {
          const user = result.rows[0];

          // Admin flow: reject if this Google account is not already an admin in DB
          if (state === 'admin' && user.role !== 'admin') {
            return done(null, false, { message: 'This Google account is not registered as an admin.' });
          }

          // Prevent admins from logging in through normal flows
          if (user.role === 'admin' && state !== 'admin') {
            return done(null, false, { message: 'Admins must log in through the admin portal.' });
          }

          // Blocked user check
          if (user.is_blocked) {
            return done(null, false, { message: 'Your account has been suspended.' });
          }

          if (!user.google_id) {
            await pool.query(
              'UPDATE users SET google_id = $1, is_email_verified = true, profile_pic = COALESCE(profile_pic, $2), updated_at = NOW() WHERE id = $3',
              [googleId, profilePic, user.id]
            );
            user.google_id = googleId;
            user.is_email_verified = true;
          } else {
            // Refresh profile pic
            await pool.query(
              'UPDATE users SET profile_pic = $1, updated_at = NOW() WHERE id = $2',
              [profilePic, user.id]
            );
          }

          return done(null, { ...user, profile_pic: profilePic });
        }

        //  New user 
        // Admin and login-only flows must not create accounts
        if (state === 'admin') {
          return done(null, false, {
            message: 'No admin account found for this Google account. Contact a super-admin.',
          });
        }
        if (state === 'login') {
          return done(null, false, {
            message: 'No account found. Please register first.',
          });
        }

        // Determine role from state
        const role = state === 'student' ? 'student' : 'recruiter';

        const insertResult = await pool.query(
          `INSERT INTO users (google_id, name, email, profile_pic, role, admin_verified)
           VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
          [googleId, name, email, profilePic, role]
        );

        const newUser = insertResult.rows[0];
        emitter.emit('UserRegistered', newUser);

        return done(null, newUser);
      } catch (err) {
        return done(err);
      }
    }
    )
  );
} else {
  console.warn('Google OAuth is disabled: Google OAuth environment variables are incomplete.');
}

// Passport session serialise/deserialise (used only during the short OAuth redirect)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT id, name, email, profile_pic, role, student_id, is_blocked, is_email_verified, google_id FROM users WHERE id = $1', [id]);
    done(null, result.rows[0] || false);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;