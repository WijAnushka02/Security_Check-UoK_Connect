# Securing the Future: How I Fortified UOK Connect Against OWASP Vulnerabilities

As a Software Engineering student at the University of Kelaniya, I recently undertook the challenge of elevating a web development project—UOK Connect, a student project portal—into a secure, industry-standard application for my Information Security module.

In this post, I’ll walk you through the journey of identifying and mitigating critical security flaws based on the OWASP Top 10, transforming a vulnerable portal into a highly secure, stateless API architecture.

## 1. Defeating CSRF (Cross-Site Request Forgery)
**The Threat:** Our stateless API used JWTs stored in cookies. Without CSRF protections, attackers could trick authenticated users into making unwanted requests (like deleting a project) simply by visiting a malicious site.
**The Solution:** I implemented the Double-Submit Cookie pattern using the `csrf-csrf` middleware. The server generates a unique CSRF token stored in a secure cookie, and the frontend (Axios) explicitly reads and sends it back via an `x-csrf-token` header for every mutating request.

## 2. Hardening Authentication & Sessions
**The Threat:** If a session cookie is intercepted via an XSS attack or network sniffing, an attacker can hijack the account.
**The Solution:** I strictly enforced the `SameSite=Strict`, `HttpOnly`, and `Secure` flags on all JWT cookies. Additionally, I implemented rigorous refresh token rotation, ensuring that old tokens are immediately invalidated if reused.

## 3. Eradicating SQL Injection
**The Threat:** Unsanitized database inputs can allow attackers to manipulate queries, bypassing authentication or dumping entire databases.
**The Solution:** I conducted a full audit of all PostgreSQL queries in the backend. I ensured that 100% of the queries utilizing the `pg` library rely on strictly parameterized queries (e.g., `WHERE id = `) rather than template literals. Furthermore, dynamic sorting (like `ORDER BY`) is mapped explicitly against safe string lists.

## 4. Input Validation & XSS Mitigation
**The Threat:** Stored XSS occurs when an attacker inputs malicious JavaScript into fields (like project descriptions or comments) which is then executed in the browsers of other users.
**The Solution:** I integrated the `xss` library to aggressively strip out HTML/JS tags from all user-generated content prior to insertion into the database, neutralizing the threat before it ever persists.

## 5. Security Misconfiguration & Headers
**The Threat:** The server was exposing too much information and was vulnerable to clickjacking and MIME-sniffing.
**The Solution:** Using `helmet`, I configured a strict Content Security Policy (CSP), enforced HTTP Strict Transport Security (HSTS), and explicitly denied iframe embedding. This drastically reduced the backend attack surface.

## 6. Hardening Identity Provider (IdP) Integration
**The Threat:** The Google OAuth implementation utilized a static `state` parameter, opening the door to Login CSRF—where an attacker could force a victim to log into the attacker's account.
**The Solution:** I engineered a custom anti-CSRF state validation mechanism. The server now generates a cryptographic nonce, embeds it into a signed JWT alongside the user role, and sets an `oauth_nonce` cookie. When Google returns the user, the strategy explicitly verifies the JWT and compares its nonce to the browser cookie, instantly rejecting any anomalies.

## Conclusion
Security is not a feature; it's a foundation. Through this project, I transformed UOK Connect from a simple web application into a robust, secure platform ready to withstand real-world cyber threats.

*By Anushka Dilinuwan Wijesinghe*