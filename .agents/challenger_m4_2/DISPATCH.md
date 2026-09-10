# Dispatch: Challenger M4.2 (Assets with PIN Reveal, Software & Audit Invariants)

## Working Directory
`/home/noah/project/core/.agents/challenger_m4_2/`

## Mandatory Documents to Read First
- `/home/noah/project/core/.agents/ORIGINAL_REQUEST.md` (MANDATORY — read first)
- `/home/noah/project/core/.agents/orchestrator_3/PROJECT.md`
- `/home/noah/project/core/DESIGN.md`
- `/home/noah/project/core/TEST_READY.md`
- `/home/noah/project/core/.agents/worker_m4_1/handoff.md`

## Mission Scope
Empirically stress-test and challenge the Assets, Software, and Audit implementations:
1. Write and execute adversarial test scripts targeting:
   - Asset detail lookup via assetNumber (`/assets/LGI-CD-2024-001`) vs UUID vs non-existent tag (404, no crash).
   - Credential reveal security: call `/api/assets/[id]/credentials/reveal` as `super_admin` (200), `it_admin` (200), `asset_admin` (403), `software_admin` (403), and `auditor` (403).
   - Verify that whenever credential reveal succeeds, an audit event `credential.reveal` is recorded in `audit_events` with NO plaintext PIN in `metadata`.
   - Software detail lookup via slug (`/software/app-slack`) vs UUID vs non-existent. Verify department and subscription filters (`free`, `paid`, `freemium`).
   - Audit trail viewer security: call `/api/audit` as `super_admin` (200), `auditor` (200), `it_admin` (403), `asset_admin` (403), `software_admin` (403).
2. Document tests, execution commands, and empirical results.
3. Formulate explicit verdict: `APPROVE` or `REQUEST_CHANGES`.

## Output Location
Write your challenger report to `/home/noah/project/core/.agents/challenger_m4_2/handoff.md` and report back via `send_message`.

## 2026-09-09T06:45:07Z
You are challenger_m4_2. Your working directory is: /home/noah/project/core/.agents/challenger_m4_2.
Read /home/noah/project/core/.agents/challenger_m4_2/DISPATCH.md and /home/noah/project/core/.agents/ORIGINAL_REQUEST.md.
Empirically challenge and test Assets, Software, and Audit implementations (dual UUID/assetNumber lookup, credential reveal RBAC + audit event logging with zero plaintext PIN in metadata, software filters, audit viewer RBAC guard).
Formulate explicit verdict (APPROVE or REQUEST_CHANGES) in /home/noah/project/core/.agents/challenger_m4_2/handoff.md and report back via send_message.
