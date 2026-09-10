# Task Dispatch: Challenger M3-2 (Assets, Crypto & Software Robustness Challenge)

## Identity
- Role: Adversarial Verifier / Challenger
- Working Directory: ./.agents/challenger_m3_2

## Objective
Adversarially challenge and stress-test the Device Ingestion, AES-256-GCM Credential Encryption, and Software Applications Enrichment in `./scripts/import-spreadsheets.ts`.

## Inputs to Read
- ./.agents/ORIGINAL_REQUEST.md
- ./.agents/orchestrator_2/PROJECT.md
- ./scripts/import-spreadsheets.ts
- ./src/lib/crypto/cipher.ts
- tests/e2e/05-credential-encryption.test.ts
- ./docs/domains/access.md
- ./docs/domains/assets.md
- ./.agents/worker_m3_1/handoff.md

## Challenge Scope
1. **Cryptographic Integrity & Zero-Leak Invariant**:
   - Trace the encryption flow: Is `encryptPin` called for every PIN?
   - Are identical PINs (e.g. 27 devices sharing "123456") given unique IVs so ciphertexts differ?
   - Is there ANY scenario where plain-text PIN or a unencrypted value is inserted or leaked into `pin_hash`?
   - Does `decryptPin` fail immediately on tampered ciphertext?
2. **Fuzzy PIC Matching Stress Test**:
   - Trace `matchPicToAccount` on: "Amanda", "Devi", "Adit", "Fajri", "Laptop cadangan", "N/A", "Akan dijual karena kerusakan motherboard", empty string, numbers.
   - Does it correctly set statuses: 26 assigned, 2 reserve, 2 available, 1 decommissioned?
3. **Software Applications Enrichment**:
   - Are 125 applications correctly enriched from `Drop Down` sheet?
   - What happens if an application is missing from `Drop Down`? Does it crash or fallback gracefully?
4. **Formulate Verdict**: Write CONFIRM_CORRECTNESS or REPORT_DEFECT in your handoff report.

Write your report to `./.agents/challenger_m3_2/handoff.md`.
Report back when finished.

## 2026-09-08T18:47:22Z
You are challenger_m3_2. Your working directory is ./.agents/challenger_m3_2.
Read your task dispatch in ./.agents/challenger_m3_2/DISPATCH.md.
MANDATORY: Read ./.agents/ORIGINAL_REQUEST.md before starting work.
Empirically and adversarially challenge the Device status evaluation, fuzzy PIC matching, AES-256-GCM encryption (zero plain-text leak invariant), and Software enrichment logic in scripts/import-spreadsheets.ts.
Write your report and verdict (CONFIRM_CORRECTNESS or REPORT_DEFECT) to ./.agents/challenger_m3_2/handoff.md and report back when finished.
