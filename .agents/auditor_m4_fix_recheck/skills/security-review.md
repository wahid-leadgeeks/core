# Security Review Checklist
Source: /home/noah/.gemini/config/skills/security-review/SKILL.md

Key audit checks:
1. Authentication: no bypass, valid session/token, timing-safe secrets
2. Authorization: mutating and sensitive endpoints check permissions, no IDOR, admin-only routes protected
3. Injection: parameterized queries/ORM only, no raw SQL concatenation
4. Cross-site vulnerabilities: XSS sanitization, safe entity rendering
5. Cryptography and secrets: genuine AES-256-GCM cipher, no plaintext PIN/credential leakage, secure key handling
6. Logging and error handling: no sensitive data in audit logs (PINs masked), no internal stack leaks
