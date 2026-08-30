# Securing UoK Connect: Integrating WSO2 Asgardeo & Mitigating OWASP Top 10 Vulnerabilities

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

## Security Improvements (OWASP Top 10 Mitigations)

The application has been extensively hardened against the OWASP Top 10 vulnerabilities. Key mitigations include:

1. **[OWASP A01:2021] Broken Access Control:** Implemented strict backend middleware (`requireAuth` and `requireRole`). Users can only manage their own projects, and Recruiter/Student roles are strictly separated.
2. **[OWASP A02:2021] Cryptographic Failures:** The application runs over HTTPS. Sensitive JSON Web Tokens (JWTs) are signed using a strong 256-bit secret key to prevent tampering.
3. **[OWASP A03:2021] Injection (SQLi & XSS):** 
   - **SQL Injection:** Completely prevented by using `pg` parameterized queries for all database interactions.
   - **XSS:** Mitigated by React's automatic escaping of dynamic user input in the DOM.
4. **[OWASP A05:2021] Security Misconfiguration:** Sensitive data (DB passwords, OIDC secrets) are kept out of source code using `.env` files. A safe `.env.example` file is provided.
5. **[OWASP A07:2021] Identification and Authentication Failures:** Delegated authentication to **WSO2 Asgardeo** using standard **OpenID Connect (OIDC)**, protecting against brute-force attacks and session fixation.
6. **[OWASP A09:2021] Security Logging and Monitoring Failures:** The backend logs critical security events (e.g., user registrations and authentication failures) using an internal Event Emitter architecture.

## Authentication

An external Identity Provider is integrated into the application for Single Sign-On (SSO).

**Identity Provider:** WSO2 Asgardeo (OIDC)

The authentication implementation correctly manages stateless session tokens and implements robust state verification to prevent Login CSRF.

## Technologies

- **Frontend:** React 18, Vite, Tailwind CSS v4, Zustand
- **Backend:** Node.js, Express 5, PostgreSQL (pg library)
- **Database:** PostgreSQL
- **Authentication:** WSO2 Asgardeo (OpenID Connect)
- **Version Control:** Git & GitHub

## Installation and Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/WijAnushka02/Security_Check-UoK_Connect.git
   cd Security_Check-UoK_Connect
   ```

2. **Database Setup:**
   - Create a new PostgreSQL database.
   - Execute the `database.sql` script located in the root directory to create all required tables and triggers.

3. **Backend Setup:**
   ```bash
   cd server
   npm install
   # Copy .env.example to .env and fill in your PostgreSQL credentials and Asgardeo OIDC secrets.
   npm run dev
   ```

4. **Frontend Setup:**
   ```bash
   cd ../client
   npm install
   # Create a .env file with VITE_API_URL pointing to the backend (https://localhost:5001).
   npm run dev
   ```

## Security Testing

The application has been tested to verify that the identified vulnerabilities have been thoroughly addressed. Secure HTTP-only cookies and OIDC state validation guarantee a highly secured API architecture.
