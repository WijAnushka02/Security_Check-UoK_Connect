# OWASP Vulnerability Mitigation: Cross-Site Scripting (XSS) / Input Validation (OWASP #3 / #7)

## Vulnerability Description
Without proper input validation and sanitization, an attacker could submit malicious scripts via forms (such as project titles, descriptions, tech stacks, tags, or comments). These scripts would be saved to the database and executed in the browsers of other users who view the content (Stored XSS).

## Mitigation Implementation
1. **Library Installation:** Installed the `xss` library to forcefully sanitize all user-supplied content by filtering out potentially harmful HTML/JS tags and attributes.
2. **Sanitizing Project Data:** In `projectController.js`, we applied the `xss()` sanitizer to `title`, `description`, `github_url`, `demo_url`, `status`, `tech_stack`, and `tags` arrays upon creation and updating, preventing malicious scripts from being stored in project entries.
3. **Sanitizing Comments:** In `commentController.js`, we applied `xss()` to the `content` field when a user submits a new comment, mitigating Stored XSS attacks via the commenting system.
4. **Sanitizing Profiles:** In `userController.js`, the `name` and `student_id` fields are aggressively sanitized during profile updates.

Status: **Secured / Verified Safe**.