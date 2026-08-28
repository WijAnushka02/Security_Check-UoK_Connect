const { doubleCsrf } = require('csrf-csrf');

const doubleCsrfOptions = {
  getSecret: () => process.env.CSRF_SECRET || 'a-very-secure-secret-key-that-should-be-in-env',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict', // Strict for standard CSRF protection
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.headers['x-csrf-token'], 
};

const {
  invalidCsrfTokenError,
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf(doubleCsrfOptions);

module.exports = {
  doubleCsrfProtection,
  generateToken,
  invalidCsrfTokenError
};
