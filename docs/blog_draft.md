# Securing UoK Connect: Integrating WSO2 Asgardeo & Mitigating OWASP Top 10 Vulnerabilities

As part of the Information Security module at the University of Kelaniya, I embarked on a journey to harden **UoK Connect**, a Student Project Portal, against common web vulnerabilities. My goals were twofold: integrate a secure Cloud Identity Provider (IdP) for authentication and systematically address the OWASP Top 10 security risks.

Here is a breakdown of my experience, the implementation strategies used, and the challenges faced during the process.

## 1. Authentication Integration: Moving to WSO2 Asgardeo (OIDC)

Building custom login systems from scratch is notoriously risky. Instead of manually storing passwords and managing sessions, I delegated authentication to **WSO2 Asgardeo**, a powerful cloud-based Identity and Access Management (IAM) provider.

### Implementation Strategy
I utilized the **OpenID Connect (OIDC)** protocol. 
1. When a user (Student or Recruiter) attempts to log in, they are redirected to Asgardeo's securely hosted login page.
2. Upon successful authentication, Asgardeo sends an authorization code back to my Express.js backend.
3. The backend securely exchanges this code for an Access Token and fetches the user's profile information.
4. Finally, the backend issues a local JWT (JSON Web Token) inside an `HttpOnly` cookie to seamlessly authenticate future API requests.

### Challenges Faced
One major challenge was dealing with the OIDC `prompt=create` flag. I wanted users to jump directly to the registration page when they clicked "Register." However, Asgardeo restricts programmatic bypassing of the login screen for standard OIDC requests. I learned that Identity Providers strictly enforce their own user flows, and I had to adapt my frontend to align with Asgardeo's required User Onboarding configurations (like enabling Auto-Login after Registration).

## 2. Hardening Against the OWASP Top 10

To ensure UoK Connect was robust against modern threats, I systematically mitigated several OWASP Top 10 vulnerabilities:

### Broken Access Control (A01:2021)
**Risk:** Attackers might try to access unauthorized API endpoints or modify other users' projects.
**Solution:** I implemented Express middleware (`requireAuth` and `requireRole`). The API validates the JWT on every protected request. Furthermore, ownership checks guarantee that a Student can only edit or delete their *own* project.

### Cryptographic Failures (A02:2021)
**Risk:** Sensitive data transmitted in plaintext can be intercepted.
**Solution:** The entire application (both Vite frontend and Node.js backend) is configured to run over **HTTPS**. The JWTs issued to the client are signed using a robust 256-bit secret key, ensuring they cannot be forged or tampered with.

### Injection (A03:2021)
**Risk:** Attackers could execute malicious SQL commands or inject JavaScript into the UI (XSS).
**Solution:** 
- **SQL Injection:** The backend utilizes the `pg` library with strictly **Parameterized Queries**. User inputs are never directly concatenated into SQL strings.
- **XSS:** The frontend is built with React, which automatically escapes dynamic user input before rendering it to the DOM, rendering XSS payloads harmless.

### Security Misconfiguration (A05:2021)
**Risk:** Exposing database passwords or OIDC Client Secrets in the source code.
**Solution:** I strictly utilized `.env` files to keep all sensitive credentials out of version control. I also created a `.env.example` file to securely document the required variables for deployment without exposing real keys.

### Identification and Authentication Failures (A07:2021)
**Risk:** Weak password policies or brute-force attacks on custom login endpoints.
**Solution:** By delegating authentication to WSO2 Asgardeo, the application leverages enterprise-grade security features out-of-the-box, completely neutralizing local brute-force and credential stuffing threats.

## 3. Learning Outcomes

This project provided invaluable hands-on experience in secure web development. The most significant takeaway was understanding the complexity of Identity Federation. Integrating an external IdP via OIDC taught me that security is often about delegating responsibilities to specialized, hardened services rather than trying to build everything in-house.

Additionally, mapping out the OWASP Top 10 vulnerabilities and actively mitigating them code-block by code-block transformed my approach to software engineering—security is no longer an afterthought, but a fundamental part of the design process.

---
*Source code and further details can be found on my GitHub repository:* [UoK Connect](https://github.com/WijAnushka02/Security_Check-UoK_Connect)