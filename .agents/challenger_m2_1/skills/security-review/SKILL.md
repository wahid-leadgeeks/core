---
name: security-review
description: >-
  Security-focused code review checklist. Use when the user asks for a security
  audit, security review, threat assessment, or vulnerability scan of code
  changes. Also activated by the release-qa skill during Phase 6. Covers
  authentication, authorization, injection, cryptography, secrets, network
  boundaries, dependency vulnerabilities, and infrastructure hardening.
---
# Security Review

Perform a systematic security review of the changed code. Pay special
attention to trust boundaries — where user input enters, where privilege
escalates, and where data crosses network or process boundaries.

Any unresolved **severe** finding blocks production release.

## Core rule

Do not suppress or downgrade findings to make the review pass. If a finding
cannot be resolved in this change, mark it as an **accepted risk** with an
explicit justification, or as a **blocker** that must be fixed before release.

---

## 1. Authentication

- [ ] No authentication bypass (missing middleware, optional auth on protected routes)
- [ ] Token/session validation is present and correct
- [ ] Token expiration is enforced
- [ ] Refresh token rotation or revocation works
- [ ] Password hashing uses bcrypt/scrypt/argon2 with adequate cost
- [ ] Timing-safe comparison for secrets and tokens
- [ ] No user enumeration (login, forgot-password return generic messages)
- [ ] Rate limiting on auth endpoints

## 2. Authorization

- [ ] Every mutating endpoint checks permissions
- [ ] Role/scope checks cannot be bypassed by parameter manipulation
- [ ] No insecure direct object references (IDOR) — verify ownership checks
- [ ] Admin-only routes are not accessible to regular users
- [ ] Multi-tenancy boundaries enforced (if applicable)

## 3. Injection

- [ ] No raw SQL concatenation — parameterized queries or ORM only
- [ ] No template injection (server-side or client-side)
- [ ] No OS command injection (`exec`, `eval`, unsanitized shell args)
- [ ] No LDAP/NoSQL injection
- [ ] GraphQL: depth/complexity limits (if applicable)

## 4. Cross-site vulnerabilities

- [ ] XSS: user input is escaped/sanitized before rendering
- [ ] CSRF: state-changing requests require anti-CSRF tokens or SameSite cookies
- [ ] CORS: `Access-Control-Allow-Origin` is not `*` for authenticated endpoints
- [ ] Content-Security-Policy header present and restrictive
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY or SAMEORIGIN

## 5. Server-side request forgery (SSRF)

- [ ] User-supplied URLs are validated against an allowlist
- [ ] Internal/private IP ranges are blocked
- [ ] Redirects are not followed blindly

## 6. File and path handling

- [ ] No path traversal (`../` in user-supplied filenames)
- [ ] File uploads validate type, size, and content
- [ ] Uploaded files are not served from the application domain without sanitization
- [ ] Temporary files are cleaned up

## 7. Cryptography and secrets

- [ ] No hardcoded secrets, API keys, or tokens in source code
- [ ] Secrets use environment variables or a secret manager
- [ ] TLS is enforced for all external connections (DB, cache, SMTP, APIs)
- [ ] No weak algorithms (MD5, SHA1 for security, ECB mode, DES)
- [ ] Random values use cryptographically secure generators
- [ ] JWT: algorithm is explicit (no `alg: none`), secret is strong

## 8. Logging and error handling

- [ ] Sensitive data is not logged (passwords, tokens, PII, full credit card numbers)
- [ ] Error messages do not leak internal details to the client
- [ ] Stack traces are not returned in production responses
- [ ] Log injection is prevented (newlines in user input)

## 9. Network and infrastructure

- [ ] Container runs as non-root with minimal capabilities
- [ ] Read-only root filesystem where possible
- [ ] Resource limits (CPU, memory, PIDs) are set
- [ ] Internal services are not exposed to the public network
- [ ] Firewall defaults to deny incoming
- [ ] Database and cache connections require TLS in production
- [ ] Health/metrics/debug endpoints are not publicly accessible

## 10. Dependencies

- [ ] No known critical CVEs in direct dependencies (check with `govulncheck`,
      `npm audit`, `pip audit`, `trivy`, or repository-supported tools)
- [ ] Dependencies are pinned or locked (go.sum, package-lock.json, etc.)
- [ ] No unnecessary or abandoned dependencies

## 11. Infrastructure scripts

When reviewing shell scripts, Dockerfiles, Compose files, or IaC:

- [ ] `set -euo pipefail` in shell scripts
- [ ] User input is quoted to prevent word splitting / globbing
- [ ] No eval of untrusted input
- [ ] Sudo scope is minimized
- [ ] Sensitive environment variables are not passed to untrusted processes
- [ ] Docker images use digest pinning for production
- [ ] No `--privileged` or `SYS_ADMIN` capabilities unless justified

---

## Output format

For each section, report:

| Section | Status | Findings |
|---|---|---|
| Authentication | ✅ PASS / ⚠️ RISK / ❌ FAIL | Detail |
| Authorization | ... | ... |
| ... | ... | ... |

Summarize with:

- **Blockers**: Issues that must be fixed before release
- **Accepted risks**: Issues acknowledged but not blocking, with justification
- **Recommendations**: Non-blocking improvements for future work
