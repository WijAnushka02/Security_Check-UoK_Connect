# OWASP Vulnerability Mitigation: IdP Integration Hardening (Login CSRF)

## Vulnerability Description
The application uses Google OAuth 2.0 for Single Sign-On via `passport-google-oauth20`. Previously, the OAuth `state` parameter was statically assigned based on the route (e.g., `state='student'`). This static state does not protect against Login CSRF attacks, where an attacker could force a victim's browser to log into the attacker's account, potentially compromising the victim's data if they enter personal information into the session.

## Mitigation Implementation
Because the backend is completely stateless (no `express-session`) and uses JWTs, we implemented a custom, highly secure state validation mechanism:

1. **Nonce Generation:** When a user initiates an OAuth flow, the server generates a cryptographically secure 16-byte random nonce.
2. **State JWT Construction:** A short-lived JWT (10 minutes) is signed using the server's secret. This JWT contains the intended role (e.g., `student`) and the generated `nonce`, and is passed to Google as the `state` parameter.
3. **Cookie Binding:** Simultaneously, the `nonce` is stored in a secure, HttpOnly, SameSite=Lax cookie (`oauth_nonce`).
4. **Validation in Callback:** When Google redirects back to our callback, the `passport-google-oauth20` strategy intercepts the request, verifies the signature of the returned state JWT, and strictly compares the `nonce` inside the JWT with the `oauth_nonce` cookie present in the user's browser. If they do not match, the login is rejected as a CSRF attempt.
5. **Cleanup:** The `oauth_nonce` cookie is properly cleared once the exchange succeeds.

Status: **Secured / Verified Safe**.