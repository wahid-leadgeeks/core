# Security Review Skill Methodology
See /home/noah/.gemini/config/skills/security-review/SKILL.md
Key verification areas:
1. Authentication: No bypass, session validation, route protection.
2. Authorization: RBAC enforcement, no IDOR, parameter tamper protection.
3. Cryptography and secrets: AES-256-GCM cipher, zero hardcoded secrets, zero plaintext leak.
4. Logging: Zero sensitive secrets (PINs/passwords) in logs or audit metadata.
