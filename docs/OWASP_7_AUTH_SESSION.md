# OWASP Vulnerability Mitigation: Identification and Authentication Failures (OWASP #7)

## Vulnerability Description
The application used JWT tokens stored in cookies for authentication. However, the `SameSite` attribute of the cookies was previously set to `none` in production, making the cookies vulnerable to cross-site request forgery and potential cross-site token leakage. Additionally, it's essential to enforce strict policies for session and refresh token handling to prevent token reuse and session hijacking.

## Mitigation Implementation
1. **Cookie Hardening:** In `server/src/utils/jwt.js`, we enforced `sameSite: 'strict'` for both the access token (`token`) and the `refreshToken`. This ensures the browser only sends these authentication cookies for first-party contexts, mitigating cross-site attacks completely.
2. **Refresh Token Rotation:** The application already implements a secure refresh token rotation policy (in `server/src/controllers/authController.js`), where a used refresh token is immediately deleted from the database and a new pair is issued, effectively neutralizing stolen refresh tokens.
3. **Secure Flag:** The `secure` flag remains dynamically set to `true` in production to ensure tokens are only transmitted over HTTPS.
