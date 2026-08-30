# OWASP Vulnerability Mitigation: Cross-Site Request Forgery (CSRF)

## Vulnerability Description
UOK Connect was susceptible to CSRF attacks because it relied on cookies (including JWTs and session identifiers) for authentication without implementing anti-CSRF measures. An attacker could trick an authenticated user into submitting a state-changing request (like deleting a project) without their consent.

## Mitigation Implementation
1. **Server-Side Token Generation:** We installed `csrf-csrf` (a double-submit cookie pattern CSRF mitigation library) on the Express backend.
2. **Secure Token Delivery:** The backend now exposes an endpoint (`GET /api/auth/csrf-token`) that the frontend calls to retrieve a CSRF token. The corresponding hash is stored in a secure, HttpOnly, SameSite=Strict cookie.
3. **Client-Side Integration:** The frontend Axios instance (`api.js`) was updated to intercept state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`), automatically fetch the CSRF token if missing, and attach it to the `x-csrf-token` header.
4. **Middleware Protection:** The `doubleCsrfProtection` middleware was applied to all API routes, rejecting any state-changing requests lacking a valid token header matching the secure cookie.
