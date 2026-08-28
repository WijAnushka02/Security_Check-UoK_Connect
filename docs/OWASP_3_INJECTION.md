# OWASP Vulnerability Mitigation: Injection (OWASP #3)

## Vulnerability Description
Injection flaws, such as SQL injection, occur when untrusted data is sent to an interpreter as part of a command or query. The attacker's hostile data can trick the interpreter into executing unintended commands or accessing data without proper authorization.

## Mitigation Implementation
An extensive audit of all backend database interactions was conducted across all controllers (`adminController.js`, `authController.js`, `commentController.js`, `projectController.js`, `userController.js`, etc.).

1. **Parameterized Queries:** The application uses the `pg` (node-postgres) library exclusively. Every single database interaction correctly utilizes parameterized queries (e.g., `WHERE id = `). This separates the data from the SQL structure, making SQL injection impossible for these parameters.
2. **Safe Dynamic Clauses:** For dynamic filtering and searching (such as the search filters in `projectController.js` and `adminController.js`), the query strings are built dynamically, but the actual user input is securely pushed into the parameter array and referenced via positional placeholders (e.g., `{params.length}`).
3. **Integer Casting for Pagination:** Pagination parameters like `LIMIT` and `OFFSET` are strictly cast to integers using `parseInt(..., 10)` before being safely passed into the parameterized arrays.
4. **Controlled Sorting:** `ORDER BY` clauses are determined via strict string mapping (e.g., checking if `sort === 'newest'`) rather than directly injecting the user's sort query string into the SQL statement, fully mitigating ORDER BY injection risks.

Status: **Secured / Verified Safe**.