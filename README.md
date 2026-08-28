# Information Security Project

## Overview

This is an individual Information Security project based on the **UOK Connect (Student Project Portal)** application.

The project focuses on identifying security vulnerabilities in the existing application, implementing appropriate security improvements, and integrating secure authentication using an external Identity Provider (IdP).

## Objectives

- Identify existing security vulnerabilities.
- Remove or mitigate identified vulnerabilities.
- Improve authentication and authorization.
- Integrate an external Identity Provider.
- Apply secure coding practices.
- Document the implemented security improvements.
- Explain the changes and implementation process through a Medium blog.

## Security Improvements

The application has been extensively hardened against the OWASP Top 10 vulnerabilities. Detailed documentation of the mitigations can be found in the `docs/` folder:

1. **[OWASP #1 / #8] CSRF Protection:** Implemented robust double-submit secure cookies for CSRF prevention.
2. **[OWASP #7] Authentication & Session Hardening:** Enforced `SameSite=Strict`, `HttpOnly`, and `Secure` flags on all JWT and session cookies, alongside strict refresh token rotation.
3. **[OWASP #3] Injection Prevention:** Audited and verified that all PostgreSQL database interactions use strictly parameterized queries via the `pg` library. 
4. **[OWASP #5] Security Misconfiguration & Headers:** Tightened backend server headers with `helmet`, strictly denying framing (clickjacking) and configuring a restrictive Content Security Policy (CSP).
5. **[OWASP #3 / #7] Input Validation & XSS:** Integrated the `xss` library to deeply sanitize all user-generated content (projects, comments, profiles) prior to database insertion.
6. **[IdP Hardening] Secure Google OAuth:** Rewrote the `passport-google-oauth20` integration to use signed JWTs and cryptographic nonces for the `state` parameter, completely eliminating Login CSRF vulnerabilities.

## Authentication

An external Identity Provider is integrated into the application for Single Sign-On (SSO).

**Identity Provider:** Google OAuth 2.0

The authentication implementation correctly manages stateless session tokens and implements robust state-nonce verification to prevent Login CSRF.

## Technologies

- **Frontend:** React 18, Vite, Tailwind CSS v4, Zustand
- **Backend:** Node.js, Express 5, Passport.js
- **Database:** PostgreSQL (Neon)
- **Authentication:** Google OAuth 2.0
- **Version Control:** Git & GitHub

## Installation and Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/WijAnushka02/Security_Check-UoK_Connect.git
   cd Security_Check-UoK_Connect
   ```

2. **Backend Setup:**
   ```bash
   cd server
   npm install
   # Create a .env file with your PostgreSQL URI, JWT_SECRET, CSRF_SECRET, and Google OAuth credentials.
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd ../client
   npm install
   # Create a .env file with VITE_API_URL pointing to the backend.
   npm run dev
   ```

## Security Testing

The application has been tested to verify that the identified vulnerabilities have been thoroughly addressed. Custom anti-CSRF token exchanges and secure HTTP-only cookies guarantee a highly secured stateless API architecture.

## Documentation

A Medium blog will be published explaining the security vulnerabilities identified, the solutions implemented, and the authentication integration process.

## Author

**Anushka Dilinuwan Wijesinghe**

BSc (Hons) in Software Engineering  
University of Kelaniya