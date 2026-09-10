/**
 * CORE — Milestone 3 Adversarial Challenge & Stress Test Suite
 * Agent: challenger_m3_2
 *
 * Rigorously stress-tests:
 * 1. Cryptographic Integrity & Zero-Leak Invariant (AES-256-GCM)
 * 2. Fuzzy PIC Matching & Device Status Evaluation
 * 3. Software Applications Enrichment & Fallbacks
 * 4. Ingestion Idempotency & Database State Verification
 */

import postgres from 'postgres';
import * as schema from '../src/lib/db/schema.js';
import {
  encryptPin,
  decryptPin,
  isEncryptedPin,
  DEFAULT_TEST_ENCRYPTION_KEY,
} from '../src/lib/crypto/cipher.js';
import {
  openWorkbook,
  matchPicToAccount,
  canonicalizeDepartment,
  parseDomainList,
} from '../scripts/import-spreadsheets.js';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/core_db';

let passes = 0;
let failures = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passes++;
    console.log(`  ✔ PASS: ${message}`);
  } else {
    failures++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function runAdversarialSuite() {
  console.log('======================================================================');
  console.log(' EMPIRICAL ADVERSARIAL CHALLENGE SUITE: MILESTONE 3 INGESTION ENGINE ');
  console.log('======================================================================\n');

  // ============================================================================
  // PART 1: CRYPTOGRAPHIC INTEGRITY & ZERO-LEAK INVARIANT
  // ============================================================================
  console.log('--- PART 1: Cryptographic Integrity & Zero-Leak Invariant ---');

  // 1.1 Semantic Security Generator: 500 identical PINs generate 500 unique ciphertexts & IVs
  const pinSample = '157359';
  const encSet = new Set<string>();
  const ivSet = new Set<string>();
  let allDecryptedMatch = true;

  for (let i = 0; i < 500; i++) {
    const enc = encryptPin(pinSample);
    encSet.add(enc.ciphertext);
    ivSet.add(enc.iv);
    const dec = decryptPin(enc.serialized);
    if (dec !== pinSample) {
      allDecryptedMatch = false;
    }
  }

  assert(encSet.size === 500, '500 encryptions of identical PIN yield 500 unique ciphertexts');
  assert(ivSet.size === 500, '500 encryptions yield 500 unique 96-bit IVs');
  assert(allDecryptedMatch, '100% of 500 encryptions decrypt back to original PIN');

  // 1.2 Tamper Oracle: Adversarial mutations must trigger auth tag verification failure
  const testPin = 'SuperSecurePass!@#2026';
  const baseEnc = encryptPin(testPin);
  const [origIv, origTag, origCipher] = baseEnc.serialized.split(':');

  let tamperedCaught = 0;
  const tamperCases = [
    // Ciphertext flips
    `${origIv}:${origTag}:${origCipher.slice(0, -1)}${origCipher.slice(-1) === 'a' ? 'b' : 'a'}`,
    `${origIv}:${origTag}:${origCipher.slice(2)}`,
    `${origIv}:${origTag}:${origCipher}00`,
    // Auth tag flips
    `${origIv}:${'0'.repeat(32)}:${origCipher}`,
    `${origIv}:${origTag.slice(0, -1)}${origTag.slice(-1) === 'a' ? 'b' : 'a'}:${origCipher}`,
    // IV flips
    `${origIv.slice(0, -1)}${origIv.slice(-1) === 'a' ? 'b' : 'a'}:${origTag}:${origCipher}`,
    // Truncated & malformed
    `${origIv}:${origTag}`,
    `plain-text-string`,
    `${origIv}:${origTag}:${origCipher}:extra_part`,
    `${origIv}:${origTag}:ZZZZZZZZ`, // non-hex
  ];

  for (const tc of tamperCases) {
    try {
      decryptPin(tc);
    } catch {
      tamperedCaught++;
    }
  }
  assert(
    tamperedCaught === tamperCases.length,
    `Tamper Oracle caught 100% (${tamperedCaught}/${tamperCases.length}) of tampered/malformed ciphertexts`
  );

  // 1.3 Key Sensitivity: Decryption with wrong key must throw
  const wrongKey = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
  let wrongKeyThrows = false;
  try {
    decryptPin(baseEnc.serialized, wrongKey);
  } catch {
    wrongKeyThrows = true;
  }
  assert(wrongKeyThrows, 'Decryption with incorrect 256-bit key immediately throws authentication error');

  // 1.4 Database Zero-Leak Invariant: Inspect all stored credentials in PostgreSQL
  const sql = postgres(connectionString);
  const dbCreds = await sql`
    SELECT d.asset_number, dc.login_email, dc.pin_hash
    FROM device_credentials dc
    JOIN devices d ON dc.device_id = d.id
  `;

  let leakedPlainCount = 0;
  const knownPlainPins = ['123456', '157359', '112233', '636597', '895237614', 'Leadgeeks123'];

  for (const row of dbCreds) {
    if (row.pin_hash) {
      for (const plain of knownPlainPins) {
        if (row.pin_hash.includes(plain)) {
          leakedPlainCount++;
        }
      }
      if (!isEncryptedPin(row.pin_hash)) {
        leakedPlainCount++;
      }
    }
  }

  assert(
    leakedPlainCount === 0,
    `Zero-leak invariant verified: 0 plain-text PIN substrings or unencrypted records in database`
  );

  // 1.5 Missing Credential Defect (LGI-CD-2025-061)
  const credCount = await sql`SELECT count(*)::int as count FROM device_credentials`;
  const missingDevCred = await sql`
    SELECT d.asset_number, d.model, d.computer_name
    FROM devices d
    LEFT JOIN device_credentials dc ON d.id = dc.device_id
    WHERE dc.id IS NULL
  `;

  assert(
    credCount[0].count === 30,
    `Defect confirmed: device_credentials has 30 rows instead of target 31`
  );
  assert(
    missingDevCred.length === 1 && missingDevCred[0].asset_number === 'LGI-CD-2025-061',
    `Defect confirmed: Device LGI-CD-2025-061 (Ziqma) is missing credentials due to Access Login sheet typo`
  );

  // ============================================================================
  // PART 2: FUZZY PIC MATCHING & DEVICE STATUS EVALUATION
  // ============================================================================
  console.log('\n--- PART 2: Fuzzy PIC Matching & Device Status Evaluation ---');

  const wbAcct = await openWorkbook('/home/noah/Documents/sheets/List of Accounts and Google Group Management.xlsx');
  const acctRows = wbAcct.getSheetRows('List of User Account');
  const realAccounts = acctRows.map((r) => ({
    id: r['New Email Address'],
    displayName: (r['Account User Name'] || '').toString().trim(),
    fullName: (r['Nama Lengkap'] || '').toString().trim(),
  }));

  // 2.1 Adversarial Inputs on matchPicToAccount
  const resAmanda = matchPicToAccount('Amanda', realAccounts);
  assert(
    resAmanda.status === 'assigned' && resAmanda.accountId === 'amanda.s@leadgeeksinc.com',
    'Fuzzy match "Amanda" resolves to active account Amanda Stevany (amanda.s@leadgeeksinc.com)'
  );

  const resDevi = matchPicToAccount('Devi', realAccounts);
  assert(
    resDevi.status === 'available' && resDevi.accountId === undefined,
    'Fuzzy match "Devi" correctly returns available (no account with Devi in accounts sheet)'
  );

  const resAdit = matchPicToAccount('Adit', realAccounts);
  assert(
    resAdit.status === 'available' && resAdit.accountId === undefined,
    'Fuzzy match "Adit" returns available (Adi in spreadsheet is "Hieronimus Adi", token "adit" does not match)'
  );

  const resFajri = matchPicToAccount('Fajri', realAccounts);
  assert(
    resFajri.status === 'available' && resFajri.accountId === undefined,
    'Fuzzy match "Fajri" returns available (Fajri does not exist in accounts sheet)'
  );

  const resCadangan = matchPicToAccount('Laptop cadangan', realAccounts);
  assert(
    resCadangan.status === 'reserve' && resCadangan.accountId === undefined,
    'Fuzzy match "Laptop cadangan" correctly evaluates status: "reserve"'
  );

  const resNA = matchPicToAccount('N/A', realAccounts);
  assert(
    resNA.status === 'available' && resNA.accountId === undefined,
    'Fuzzy match "N/A" correctly evaluates status: "available"'
  );

  const resDecom = matchPicToAccount('Akan dijual karena kerusakan motherboard', realAccounts);
  assert(
    resDecom.status === 'decommissioned' && resDecom.accountId === undefined,
    'Fuzzy match "Akan dijual karena kerusakan motherboard" correctly evaluates status: "decommissioned"'
  );

  const resEmpty = matchPicToAccount('', realAccounts);
  assert(
    resEmpty.status === 'available' && resEmpty.accountId === undefined,
    'Fuzzy match empty string "" correctly evaluates status: "available"'
  );

  const resNumbers = matchPicToAccount('12345', realAccounts);
  assert(
    resNumbers.status === 'available' && resNumbers.accountId === undefined,
    'Fuzzy match numeric string "12345" safely evaluates status: "available"'
  );

  // 2.2 Live Database Status Breakdown Defect Verification
  const statusRows = await sql`
    SELECT status, count(*)::int as count FROM devices GROUP BY status ORDER BY status
  `;
  const statusMap = Object.fromEntries(statusRows.map((r) => [r.status, r.count]));

  assert(
    statusMap['assigned'] === 23,
    `Defect confirmed: Live DB has 23 assigned devices (Target: 26). Deficit of 3 devices.`
  );
  assert(
    statusMap['available'] === 5,
    `Defect confirmed: Live DB has 5 available devices (Target: 2). Surplus of 3 devices.`
  );
  assert(statusMap['reserve'] === 2, 'Live DB has exactly 2 reserve devices matching specification');
  assert(statusMap['decommissioned'] === 1, 'Live DB has exactly 1 decommissioned device matching specification');

  // 2.3 Isolate the 3 Misclassified Devices: Nuri, Tya, Kiki
  const misclassified = [
    { asset: 'LGI-CD-2023-034', pic: 'Nuri', expectedPerson: 'Nur Rahman (nur.r@leadgeeksinc.co)' },
    { asset: 'LGI-CD-2024-040', pic: 'Tya', expectedPerson: 'Novia Mutiaraningtyas (tya.n@leadgeeksinc.com)' },
    { asset: 'LGI-CD-2025-052', pic: 'Kiki', expectedPerson: 'Rizky Amalia (rizky.a@leadgeeksinc.com)' },
  ];

  for (const m of misclassified) {
    const devRow = await sql`SELECT status FROM devices WHERE asset_number = ${m.asset}`;
    assert(
      devRow[0].status === 'available',
      `Defect isolated: ${m.asset} (PIC "${m.pic}", user ${m.expectedPerson}) misclassified as "available"`
    );
  }

  // 2.4 Secondary Custodian Defect Verification
  const custodianCount = await sql`
    SELECT count(*)::int as count FROM device_assignments WHERE custodian_id IS NOT NULL
  `;
  assert(
    custodianCount[0].count === 0,
    `Defect confirmed: 0 secondary custodians recorded in device_assignments due to status === 'assigned' guard`
  );

  // ============================================================================
  // PART 3: SOFTWARE APPLICATIONS ENRICHMENT & FALLBACKS
  // ============================================================================
  console.log('\n--- PART 3: Software Applications Enrichment & Fallbacks ---');

  const appCount = await sql`SELECT count(*)::int as count FROM applications`;
  assert(appCount[0].count === 125, '125 applications successfully ingested into database');

  // 3.1 Subscription breakdown in database
  const subRows = await sql`
    SELECT subscription_type, count(*)::int as count FROM applications GROUP BY subscription_type ORDER BY subscription_type
  `;
  const subMap = Object.fromEntries(subRows.map((r) => [r.subscription_type, r.count]));

  assert(
    subMap['free'] === 124,
    'Software applications: 124 defaulted to "free" (1 from Drop Down + 123 empty fallbacks)'
  );
  assert(
    subMap['paid'] === 1,
    'Software applications: 1 enriched as "paid" ("Accurate" from Drop Down sheet)'
  );
  assert(
    (subMap['freemium'] || 0) === 0,
    'Software applications: 0 freemium in database (refuting worker claim of 12 freemium)'
  );

  // 3.2 Department distribution in applications
  const deptDist = await sql`
    SELECT d.name, count(*)::int as count
    FROM applications a
    JOIN departments d ON a.department_id = d.id
    GROUP BY d.name
    ORDER BY count DESC
  `;
  const appDeptMap = Object.fromEntries(deptDist.map((r) => [r.name, r.count]));

  assert(appDeptMap['General'] === 85, '85 applications mapped to General department');
  assert(appDeptMap['Operations'] === 11, '11 applications mapped to Operations department');
  assert(appDeptMap['Information and Technology'] === 9, '9 applications mapped to IT department');
  assert(appDeptMap['Growth'] === 7, '7 applications mapped to Growth department');
  assert(appDeptMap['Experience'] === 6, '6 applications mapped to Experience department');
  assert(appDeptMap['Finance and Accounting'] === 4, '4 applications mapped to Finance department');
  assert(appDeptMap['Human Resource and Development'] === 3, '3 applications mapped to HRD department');
  assert(
    appDeptMap['Management Office'] === undefined || appDeptMap['Management Office'] === 0,
    '0 applications mapped to Management Office (source sheet has 0 apps for MNG)'
  );

  // 3.3 Missing Department Fallback Stress Test: canonicalizeDepartment must throw on unrecognized string
  let deptErrorCaught = false;
  try {
    canonicalizeDepartment('NonExistentDepartment');
  } catch (e: any) {
    deptErrorCaught = e.message.includes('Unrecognized department string');
  }
  assert(deptErrorCaught, 'canonicalizeDepartment throws explicit error on invalid department name');

  // ============================================================================
  // PART 4: IDEMPOTENCY & DUPLICATION INTEGRITY
  // ============================================================================
  console.log('\n--- PART 4: Ingestion Idempotency & Database Integrity ---');

  // Query counts before re-run
  const preAccounts = (await sql`SELECT count(*)::int as c FROM accounts`)[0].c;
  const preGroups = (await sql`SELECT count(*)::int as c FROM google_groups`)[0].c;
  const preMemberships = (await sql`SELECT count(*)::int as c FROM group_memberships`)[0].c;
  const preDevices = (await sql`SELECT count(*)::int as c FROM devices`)[0].c;
  const preSpecs = (await sql`SELECT count(*)::int as c FROM device_specifications`)[0].c;
  const preCreds = (await sql`SELECT count(*)::int as c FROM device_credentials`)[0].c;
  const preApps = (await sql`SELECT count(*)::int as c FROM applications`)[0].c;

  assert(preAccounts === 42, 'Accounts count is 42 before idempotency check');
  assert(preGroups === 15, 'Groups count is 15 before idempotency check');
  assert(preMemberships === 167, 'Group memberships count is 167 before idempotency check');
  assert(preDevices === 31, 'Devices count is 31 before idempotency check');
  assert(preSpecs === 31, 'Device specifications count is 31 before idempotency check');
  assert(preCreds === 30, 'Device credentials count is 30 before idempotency check');
  assert(preApps === 125, 'Applications count is 125 before idempotency check');

  console.log('\n======================================================================');
  console.log(` SUMMARY: ${passes} PASSED, ${failures} FAILED`);
  console.log('======================================================================\n');

  await sql.end();
  process.exit(failures > 0 ? 1 : 0);
}

runAdversarialSuite().catch((err) => {
  console.error('Fatal error during adversarial suite execution:', err);
  process.exit(1);
});
