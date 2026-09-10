import postgres from 'postgres';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as zlib from 'node:zlib';
import * as XLSX from 'xlsx';
import { decryptPin, isEncryptedPin } from '../src/lib/crypto/cipher.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/core_db';
const sql = postgres(connectionString);

console.log('======================================================================');
console.log(' EMPIRICAL ADVERSARIAL STRESS HARNESS — SPREADSHEET INGESTION');
console.log('======================================================================\n');

async function runAdversarialAudit() {
  const findings = [];

  // --------------------------------------------------------------------------
  // TEST 1: ACCOUNT CLASSIFICATION DEFECT
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Account Classification (Personal, Service, Shared) ---');
  const accounts = await sql`SELECT id, email, display_name, full_name, account_type FROM accounts ORDER BY email`;
  const typeCounts = { personal: 0, service: 0, shared: 0 };
  for (const a of accounts) {
    typeCounts[a.account_type] = (typeCounts[a.account_type] || 0) + 1;
  }
  console.log('Account type breakdown in DB:', typeCounts);

  const amandaS = accounts.find(a => a.email === 'amanda.s@leadgeeksinc.com');
  const sales = accounts.find(a => a.email === 'sales@leadgeeksinc.com');
  const admin = accounts.find(a => a.email === 'admin@leadgeeksinc.co');

  console.log(`amanda.s@leadgeeksinc.com -> ${amandaS?.account_type} (Expected: personal)`);
  console.log(`sales@leadgeeksinc.com    -> ${sales?.account_type} (Expected: service)`);
  console.log(`admin@leadgeeksinc.co     -> ${admin?.account_type} (Expected: shared)`);

  if (typeCounts.personal !== 40 || typeCounts.service !== 1 || typeCounts.shared !== 1) {
    findings.push({
      id: 'DEFECT-1',
      severity: 'HIGH',
      title: 'Incorrect Account Type Classification (amanda.s misclassified as service)',
      details: `Expected 40 personal, 1 service, 1 shared. Actual: ${typeCounts.personal} personal, ${typeCounts.service} service, ${typeCounts.shared} shared. Cause: import-spreadsheets.ts line 665 checks 'roleRaw === "Commercial"', which incorrectly matches Amanda Stevany because her spreadsheet Email Type is 'Commercial'.`
    });
  }

  // --------------------------------------------------------------------------
  // TEST 2: DEVICE STATUS & PIC ASSIGNMENT DISCREPANCY
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Device Status & PIC Assignment Matching ---');
  const devices = await sql`SELECT asset_number, brand, model, status, notes FROM devices ORDER BY asset_number`;
  const devStatusCounts = {};
  for (const d of devices) {
    devStatusCounts[d.status] = (devStatusCounts[d.status] || 0) + 1;
  }
  console.log('Device status breakdown in DB:', devStatusCounts);

  const assignments = await sql`SELECT da.*, a.display_name, a.email, d.asset_number 
    FROM device_assignments da 
    JOIN devices d ON da.device_id = d.id 
    JOIN accounts a ON da.account_id = a.id 
    WHERE da.returned_at IS NULL`;
  console.log('Active assignments in DB:', assignments.length);

  // Check specific devices: LGI-CD-2023-034 (Nuri), LGI-CD-2024-040 (Tya), LGI-CD-2025-052 (Kiki)
  const devNuri = devices.find(d => d.asset_number === 'LGI-CD-2023-034');
  const devTya = devices.find(d => d.asset_number === 'LGI-CD-2024-040');
  const devKiki = devices.find(d => d.asset_number === 'LGI-CD-2025-052');

  console.log(`LGI-CD-2023-034 (PIC: Nuri): status=${devNuri?.status} (Expected: assigned)`);
  console.log(`LGI-CD-2024-040 (PIC: Tya):  status=${devTya?.status} (Expected: assigned)`);
  console.log(`LGI-CD-2025-052 (PIC: Kiki): status=${devKiki?.status} (Expected: assigned)`);

  if (devStatusCounts.assigned !== 26 || assignments.length !== 26) {
    findings.push({
      id: 'DEFECT-2',
      severity: 'HIGH',
      title: 'PIC Fuzzy Matching Misses 3 Employees (Nuri, Tya, Kiki)',
      details: `Expected 26 assigned devices and 26 active device assignments (per docs/domains/assets.md and worker claims). Actual: ${devStatusCounts.assigned} assigned (${devStatusCounts.available} available) and ${assignments.length} assignments. Cause: Nuri (Nur Rahman), Tya (Novia Mutiaraningtyas, tya.n@), and Kiki (Rizky Amalia Safitri) fail displayName/fullName prefix matching in matchPicToAccount().`
    });
  }

  // --------------------------------------------------------------------------
  // TEST 3: DEVICE CREDENTIALS MISMATCH & TOTAL COUNT
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Device Credentials Ingestion & Decryption Verification ---');
  const creds = await sql`SELECT dc.*, d.asset_number FROM device_credentials dc JOIN devices d ON dc.device_id = d.id`;
  console.log('Device credentials in DB:', creds.length);

  let decryptSuccessCount = 0;
  let decryptFailCount = 0;
  for (const c of creds) {
    try {
      const plain = decryptPin(c.pin_hash);
      if (typeof plain === 'string') {
        decryptSuccessCount++;
      }
    } catch {
      decryptFailCount++;
    }
  }
  console.log(`Decryption check: ${decryptSuccessCount} successfully decrypted, ${decryptFailCount} failed.`);

  if (creds.length !== 31) {
    findings.push({
      id: 'DEFECT-3',
      severity: 'MEDIUM',
      title: 'Mismatched Asset in Access Login Resulting in Missing Credential (30 vs 31)',
      details: `Expected 31 device credentials. Actual: ${creds.length}. In source spreadsheet 'List of Company Hardware Devices (Laptop).xlsx', 'Laptop Information' row 26 is LGI-CD-2025-061 (PIC Ziqma), but 'Access Login' row 26 is LGI-CD-2025-062 (PIC Ziqma) and row 27 is LGI-CD-2025-064 (PIC N/A). LGI-CD-2025-061 has no credential, and LGI-CD-2025-064 is discarded because it does not exist in devices table.`
    });
  }

  // --------------------------------------------------------------------------
  // TEST 4: GOOGLE GROUP RESOLUTION & UNRESOLVABLE EMAIL
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Google Groups & Membership Resolution ---');
  const groups = await sql`SELECT g.id, g.name, g.email, g.member_count, count(gm.id) as actual_members
    FROM google_groups g
    LEFT JOIN group_memberships gm ON g.id = gm.group_id
    GROUP BY g.id, g.name, g.email, g.member_count
    ORDER BY g.name`;
  console.log(`Total Google Groups in DB: ${groups.length}`);

  const totalMemberships = await sql`SELECT count(*) FROM group_memberships`;
  console.log(`Total Group Memberships in DB: ${totalMemberships[0].count}`);

  const opCalendar = groups.find(g => g.email === 'operations.calendar@leadgeeksinc.co');
  console.log(`Operations Calendar Team: member_count=${opCalendar?.member_count}, actual=${opCalendar?.actual_members} (Spreadsheet has 27 raw rows)`);

  if (Number(totalMemberships[0].count) !== 168) {
    findings.push({
      id: 'DEFECT-4',
      severity: 'LOW',
      title: 'Google Group Membership Count Mismatch',
      details: `Expected 168 resolved memberships. Actual: ${totalMemberships[0].count}.`
    });
  }

  // --------------------------------------------------------------------------
  // TEST 5: IDEMPOTENCY UNDER REPEATED TRANSACTION CALLS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Database Constraints & Multi-Run Stability ---');
  const dupDomains = await sql`SELECT account_id, domain_id, count(*) FROM account_domains GROUP BY account_id, domain_id HAVING count(*) > 1`;
  const dupMemberships = await sql`SELECT group_id, account_id, count(*) FROM group_memberships GROUP BY group_id, account_id HAVING count(*) > 1`;
  const dupAssignments = await sql`SELECT device_id, count(*) FROM device_assignments WHERE returned_at IS NULL GROUP BY device_id HAVING count(*) > 1`;
  const dupCredentials = await sql`SELECT device_id, count(*) FROM device_credentials GROUP BY device_id HAVING count(*) > 1`;

  console.log('Duplicate account_domains:', dupDomains.length);
  console.log('Duplicate group_memberships:', dupMemberships.length);
  console.log('Duplicate active assignments per device:', dupAssignments.length);
  console.log('Duplicate credentials per device:', dupCredentials.length);

  if (dupDomains.length > 0 || dupMemberships.length > 0 || dupAssignments.length > 0 || dupCredentials.length > 0) {
    findings.push({
      id: 'DEFECT-5',
      severity: 'CRITICAL',
      title: 'Idempotency Failure: Duplicate Records Created',
      details: `Duplicates detected in join tables.`
    });
  }

  console.log('\n======================================================================');
  console.log(' AUDIT FINDINGS SUMMARY');
  console.log('======================================================================');
  console.log(`Total defects identified: ${findings.length}`);
  for (const f of findings) {
    console.log(`\n[${f.severity}] ${f.id}: ${f.title}`);
    console.log(`  Details: ${f.details}`);
  }

  if (findings.length > 0) {
    process.exitCode = 1;
  }

  await sql.end();
}

runAdversarialAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
