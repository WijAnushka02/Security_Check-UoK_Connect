# OWASP Vulnerability Mitigation: Security Misconfiguration & Headers (OWASP #5)

## Vulnerability Description
Security misconfiguration is the most common vulnerability, often resulting from insecure default settings, incomplete configurations, or improperly configured HTTP headers. The backend API previously used default `helmet` configurations that did not enforce a strict Content Security Policy (CSP), Strict Transport Security (HSTS), or explicitly deny framing (clickjacking defense).

## Mitigation Implementation
In `server/src/app.js`, we extensively hardened the HTTP response headers using the `helmet` library:

1. **Strict Content Security Policy (CSP):** Because the Express server strictly acts as a JSON API and does not serve HTML/frontend assets, we configured the CSP directives (`defaultSrc`, `scriptSrc`, `styleSrc`, etc.) to `'none'`. This drastically reduces the attack surface by ensuring the API cannot inadvertently serve malicious executable content or execute inline scripts if somehow accessed directly in a browser.
2. **HTTP Strict Transport Security (HSTS):** Enforced HSTS (`maxAge: 31536000`, `includeSubDomains`, and `preload`) to guarantee that browsers interact with the backend exclusively over HTTPS, preventing protocol downgrade attacks.
3. **X-Content-Type-Options:** Enabled `noSniff: true` to prevent MIME-sniffing, ensuring the browser strictly respects the `Content-Type` provided by the server.
4. **X-Frame-Options (Clickjacking Protection):** Configured `frameguard: { action: 'deny' }` to completely prevent the API from being embedded in any `<iframe>`, neutralizing clickjacking vectors targeting the backend.
5. **X-XSS-Protection:** Explicitly enabled `xssFilter: true` to enforce basic cross-site scripting protections on older browsers.
