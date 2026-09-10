# Dispatch: Explorer M4.3 (Assets with PIN Reveal, Software & Audit Domain Pages)

## Context & Objectives
You are `explorer_m4_3`.
Working directory: `/home/noah/project/core/.agents/explorer_m4_3/`

You must read:
- `/home/noah/project/core/.agents/ORIGINAL_REQUEST.md` (MANDATORY — read first)
- `/home/noah/project/core/.agents/orchestrator_3/PROJECT.md`
- `/home/noah/project/core/DESIGN.md`
- `/home/noah/project/core/TEST_READY.md`
- `/home/noah/project/core/tests/e2e/04-audit-logging.test.ts`
- `/home/noah/project/core/tests/e2e/05-credential-encryption.test.ts`
- `/home/noah/project/core/tests/e2e/07-crud-api-and-pages.test.ts`
- Existing schema in `src/lib/db/schema.ts`, crypto in `src/lib/crypto/cipher.ts`, and audit in `src/domains/audit/`

## Mission Scope
Investigate the existing codebase and design a concrete, executable implementation blueprint for:
1. `/assets` (Hardware Devices List Page):
   - Search bar (by asset_number, serial_number, model, brand, custodian/PIC).
   - Filters: Status (assigned, available, reserve, decommissioned), Brand, Department.
   - Status color indicators (🔵 Assigned, ⚪ Available, 🟡 Reserve, 🔴 Decommissioned).
   - Display asset list cards / rows with specs summary and assigned PIC name.
2. `/assets/[id]` (Device Detail Page & PIN Reveal Modal):
   - Resource Page Pattern per `DESIGN.md` with header summary and tabs:
     - Overview: Asset tag, serial number, brand, model, purchase date, warranty.
     - Specifications: CPU, RAM (GB), storage (GB), OS, display size.
     - Assignment: Current custodian / PIC info, assignment date, status.
     - Access & Credentials: PIN password reveal button.
   - **Secure PIN Reveal Modal**:
     - Requires Super Admin or IT Admin role (disabled or hidden for others).
     - Calls credential reveal endpoint (`/api/assets/[id]/reveal` or server action) to decrypt the AES-256-GCM PIN.
     - Generates an immutable audit event (`credential.reveal`) with zero plain-text PIN leakage in the audit metadata.
     - Displays decrypted PIN temporarily in secure UI with copy button and auto-hide timer.
3. `/software` (Software Applications List & Detail Page):
   - List page with search (by app name, vendor) and filters: Department, Subscription Type (Free, Paid, Freemium), Category.
   - Resource cards with subscription badges and department tags.
   - Detail page `/software/[id]` showing vendor, website, licenses, subscription details, and assigned departments/users.
4. `/audit` (Audit Log Viewer Page):
   - **Strict Access Control**: Accessible ONLY to Super Admin and Auditor roles (returns 403 Forbidden or redirect for IT Admin, Asset Admin, Software Admin).
   - Chronological stream / table of audit events (actor, action, entity type, entity ID, timestamp).
   - Filters: Entity Type, Action, Actor.
   - **JSON Metadata Viewer**: Expandable row or modal displaying formatted JSON of `metadata` / diff without plain-text secret leaks.

## Output Requirements
Write your comprehensive architectural and implementation blueprint to:
`/home/noah/project/core/.agents/explorer_m4_3/handoff.md`

Include:
- Verified evidence of existing assets, software, and audit APIs and DB schema
- Exact file paths (`src/app/(admin)/assets/page.tsx`, `src/app/(admin)/assets/[id]/page.tsx`, `src/app/(admin)/software/page.tsx`, `src/app/(admin)/software/[id]/page.tsx`, `src/app/(admin)/audit/page.tsx`, etc.)
- Concrete implementation for the secure PIN reveal modal and audit logging flow
- Handoff verdict and implementation recommendations for Worker

## 2026-09-08T23:33:53Z
You are explorer_m4_3. Your working directory is: /home/noah/project/core/.agents/explorer_m4_3.
Read /home/noah/project/core/.agents/explorer_m4_3/DISPATCH.md and /home/noah/project/core/.agents/ORIGINAL_REQUEST.md.
Investigate the codebase and produce an implementation blueprint for the Assets (with PIN reveal modal and audit logging), Software (with dept/subscription filters), and Audit (Super Admin / Auditor restricted viewer with JSON metadata) domain pages.
Write your handoff report to /home/noah/project/core/.agents/explorer_m4_3/handoff.md and report back via send_message when done.
