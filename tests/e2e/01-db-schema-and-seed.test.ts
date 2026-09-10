import { describe, it, expect, afterAll } from '../helpers/test-framework.js';
import {
  getDbClient,
  closeDbClient,
  queryPublicTables,
  queryTableColumns,
  queryEnumValues,
  queryTableForeignKeys,
  queryTableUniqueConstraints,
  queryReferenceCounts,
  queryReferenceData,
  verifyTableContract,
  verifyEnumValues,
} from '../helpers/db-client.js';

describe('Suite 01: Database Schema, Constraints, Enums & Reference Seed Data', () => {
  const sql = getDbClient();

  afterAll(async () => {
    await closeDbClient();
  });

  // ============================================================================
  // TIER 1: FEATURE COVERAGE (Live PostgreSQL Verification)
  // ============================================================================

  it('[Tier 1] verifies reference departments table contains exactly 8 canonical departments in PostgreSQL', async () => {
    const data = await queryReferenceData();
    expect(data.departments).toHaveLength(8);

    const codes = data.departments.map((d) => d.code);
    expect(codes).toContain('MNG');
    expect(codes).toContain('OPS');
    expect(codes).toContain('GRW');
    expect(codes).toContain('EXP');
    expect(codes).toContain('HRD');
    expect(codes).toContain('ITE');
    expect(codes).toContain('FAC');
    expect(codes).toContain('GNR');

    const hrd = data.departments.find((d) => d.code === 'HRD');
    expect(hrd?.name).toBe('Human Resource and Development');

    const ite = data.departments.find((d) => d.code === 'ITE');
    expect(ite?.name).toBe('Information and Technology');
  });

  it('[Tier 1] verifies reference account_roles table contains exactly 5 roles with hierarchical levels', async () => {
    const data = await queryReferenceData();
    expect(data.accountRoles).toHaveLength(5);

    const rolesByLevel = Object.fromEntries(data.accountRoles.map((r) => [r.level, r.name]));
    expect(rolesByLevel[1]).toBe('Top Management');
    expect(rolesByLevel[2]).toBe('Leaders');
    expect(rolesByLevel[3]).toBe('Non-Leaders');
    expect(rolesByLevel[4]).toBe('Staff');
    expect(rolesByLevel[5]).toBe('Commercial');
  });

  it('[Tier 1] verifies reference domains table contains 3 domains with 1 primary domain', async () => {
    const data = await queryReferenceData();
    expect(data.domains).toHaveLength(3);

    const primaryDomains = data.domains.filter((d) => d.is_primary === true);
    expect(primaryDomains).toHaveLength(1);
    expect(primaryDomains[0].name).toBe('leadgeeksinc.com');

    const domainNames = data.domains.map((d) => d.name);
    expect(domainNames).toContain('leadgeeksinc.co');
    expect(domainNames).toContain('leadgeeksprospecting.com');
  });

  it('[Tier 1] verifies all 13 core tables exist in PostgreSQL information_schema.tables', async () => {
    const tables = await queryPublicTables();
    expect(tables.length).toBeGreaterThanOrEqual(13);

    const requiredTables = [
      'departments',
      'account_roles',
      'domains',
      'accounts',
      'account_domains',
      'google_groups',
      'group_memberships',
      'devices',
      'device_specifications',
      'device_assignments',
      'device_credentials',
      'applications',
      'audit_events',
    ];

    for (const tbl of requiredTables) {
      expect(tables).toContain(tbl);
    }
  });

  it('[Tier 1] verifies accounts table contract has all mandatory and nullable fields in information_schema', async () => {
    const result = await verifyTableContract('accounts', [
      'id',
      'full_name',
      'display_name',
      'email',
      'previous_email',
      'account_type',
      'department_id',
      'account_role_id',
      'status',
      'notes',
      'migration_notes',
      'created_at',
      'updated_at',
    ]);
    expect(result.exists).toBe(true);
    expect(result.missingColumns).toHaveLength(0);

    const emailCol = result.columns.find((c) => c.name === 'email');
    expect(emailCol?.isNullable).toBe(false);

    const prevEmailCol = result.columns.find((c) => c.name === 'previous_email');
    expect(prevEmailCol?.isNullable).toBe(true);
  });

  it('[Tier 1] verifies devices table contract has required hardware identification fields', async () => {
    const result = await verifyTableContract('devices', [
      'id',
      'asset_number',
      'brand',
      'model',
      'computer_name',
      'status',
      'purchased_at',
      'has_antivirus',
      'notes',
      'created_at',
      'updated_at',
    ]);
    expect(result.exists).toBe(true);
    expect(result.missingColumns).toHaveLength(0);

    const assetNumCol = result.columns.find((c) => c.name === 'asset_number');
    expect(assetNumCol?.isNullable).toBe(false);
  });

  it('[Tier 1] verifies device_specifications 1:1 relationship table contract', async () => {
    const result = await verifyTableContract('device_specifications', [
      'id',
      'device_id',
      'processor',
      'ram',
      'storage',
    ]);
    expect(result.exists).toBe(true);
    expect(result.missingColumns).toHaveLength(0);

    const deviceIdCol = result.columns.find((c) => c.name === 'device_id');
    expect(deviceIdCol?.isNullable).toBe(false);
  });

  it('[Tier 1] verifies device_credentials table has encrypted pin_hash field', async () => {
    const result = await verifyTableContract('device_credentials', [
      'id',
      'device_id',
      'login_email',
      'pin_hash',
      'pin_last_rotated_at',
      'notes',
      'created_at',
      'updated_at',
    ]);
    expect(result.exists).toBe(true);
    expect(result.missingColumns).toHaveLength(0);
  });

  it('[Tier 1] verifies google_groups and group_memberships table contracts', async () => {
    const groupRes = await verifyTableContract('google_groups', [
      'id',
      'name',
      'email',
      'description',
      'member_count',
      'google_id',
      'sync_status',
      'last_synced_at',
      'created_at',
      'updated_at',
    ]);
    expect(groupRes.missingColumns).toHaveLength(0);

    const memberRes = await verifyTableContract('group_memberships', [
      'id',
      'group_id',
      'account_id',
      'role',
      'source',
      'added_at',
      'created_at',
    ]);
    expect(memberRes.missingColumns).toHaveLength(0);
  });

  it('[Tier 1] verifies applications table contract contains subscription and category fields', async () => {
    const result = await verifyTableContract('applications', [
      'id',
      'name',
      'description',
      'department_id',
      'category',
      'subscription_type',
      'status',
      'website_url',
      'created_at',
      'updated_at',
    ]);
    expect(result.missingColumns).toHaveLength(0);
  });

  it('[Tier 1] verifies audit_events table contract matches DATA_MODEL.md specification', async () => {
    const result = await verifyTableContract('audit_events', [
      'id',
      'actor_id',
      'action',
      'entity_type',
      'entity_id',
      'metadata',
      'ip_address',
      'created_at',
    ]);
    expect(result.missingColumns).toHaveLength(0);

    const metadataCol = result.columns.find((c) => c.name === 'metadata');
    expect(metadataCol?.udtName).toBe('jsonb');

    const ipCol = result.columns.find((c) => c.name === 'ip_address');
    expect(ipCol?.udtName).toBe('inet');
  });

  it('[Tier 1] verifies all PostgreSQL enum types match exact domain specifications in pg_type', async () => {
    expect(await verifyEnumValues('account_type_enum', ['personal', 'service', 'shared'])).toBe(true);
    expect(await verifyEnumValues('account_status_enum', ['active', 'suspended', 'archived'])).toBe(true);
    expect(await verifyEnumValues('sync_status_enum', ['synced', 'pending', 'conflict', 'error'])).toBe(true);
    expect(await verifyEnumValues('group_role_enum', ['member', 'manager', 'owner'])).toBe(true);
    expect(await verifyEnumValues('group_source_enum', ['spreadsheet', 'google_sync', 'manual'])).toBe(true);
    expect(await verifyEnumValues('device_status_enum', ['assigned', 'available', 'reserve', 'decommissioned'])).toBe(true);
    expect(await verifyEnumValues('subscription_type_enum', ['free', 'paid', 'freemium'])).toBe(true);
    expect(await verifyEnumValues('application_status_enum', ['active', 'deprecated', 'evaluating'])).toBe(true);
    expect(await verifyEnumValues('application_category_enum', [
      'productivity', 'security', 'development', 'communication',
      'design', 'marketing', 'finance', 'operations', 'other'
    ])).toBe(true);
  });

  // ============================================================================
  // TIER 2: BOUNDARY & CORNER CASES (Adversarial Constraint Enforcement)
  // ============================================================================

  it('[Tier 2] rejects duplicate department codes or names in live database', async () => {
    let duplicateCodeThrew = false;
    let codeError: any = null;
    try {
      await sql`INSERT INTO departments (name, code) VALUES ('Duplicate Code Dept', 'MNG');`;
    } catch (err: any) {
      duplicateCodeThrew = true;
      codeError = err;
    }
    expect(duplicateCodeThrew).toBe(true);
    expect(codeError?.code === '23505' || codeError?.message?.includes('unique')).toBe(true);

    let duplicateNameThrew = false;
    let nameError: any = null;
    try {
      await sql`INSERT INTO departments (name, code) VALUES ('Operations', 'NEW_OPS');`;
    } catch (err: any) {
      duplicateNameThrew = true;
      nameError = err;
    }
    expect(duplicateNameThrew).toBe(true);
    expect(nameError?.code === '23505' || nameError?.message?.includes('unique')).toBe(true);
  });

  it('[Tier 2] rejects duplicate account role hierarchy levels or names', async () => {
    let duplicateNameThrew = false;
    let error: any = null;
    try {
      await sql`INSERT INTO account_roles (name, level) VALUES ('Leaders', 99);`;
    } catch (err: any) {
      duplicateNameThrew = true;
      error = err;
    }
    expect(duplicateNameThrew).toBe(true);
    expect(error?.code === '23505' || error?.message?.includes('unique')).toBe(true);
  });

  it('[Tier 2] enforces unique constraint on device asset_number in database constraints', async () => {
    const uniques = await queryTableUniqueConstraints('devices');
    const hasAssetNumberUnique = uniques.some((u) => u.columns.includes('asset_number'));
    expect(hasAssetNumberUnique).toBe(true);
  });

  it('[Tier 2] enforces unique constraint on account primary email in database constraints', async () => {
    const uniques = await queryTableUniqueConstraints('accounts');
    const hasEmailUnique = uniques.some((u) => u.columns.includes('email'));
    expect(hasEmailUnique).toBe(true);
  });

  it('[Tier 2] enforces unique composite constraint on group_memberships (group_id, account_id)', async () => {
    const uniques = await queryTableUniqueConstraints('group_memberships');
    const hasCompositeUnique = uniques.some((u) =>
      u.columns.length === 2 && u.columns.includes('group_id') && u.columns.includes('account_id')
    );
    expect(hasCompositeUnique).toBe(true);
  });

  it('[Tier 2] verifies foreign key cascade rule on device_specifications (device_id CASCADE)', async () => {
    const fks = await queryTableForeignKeys('device_specifications');
    const deviceFk = fks.find((f) => f.column === 'device_id');
    expect(deviceFk?.foreignTable).toBe('devices');
    expect(deviceFk?.deleteRule).toBe('CASCADE');
  });

  it('[Tier 2] verifies foreign key set null rule on accounts department_id and account_role_id', async () => {
    const fks = await queryTableForeignKeys('accounts');
    const deptFk = fks.find((f) => f.column === 'department_id');
    const roleFk = fks.find((f) => f.column === 'account_role_id');

    expect(deptFk?.foreignTable).toBe('departments');
    expect(deptFk?.deleteRule).toBe('SET NULL');

    expect(roleFk?.foreignTable).toBe('account_roles');
    expect(roleFk?.deleteRule).toBe('SET NULL');
  });

  it('[Tier 2] rejects unknown enum values across application category in PostgreSQL', async () => {
    let invalidEnumThrew = false;
    let error: any = null;
    try {
      await sql`
        INSERT INTO applications (name, category, status)
        VALUES ('Crypto Mining App', 'crypto_miner'::application_category_enum, 'active');
      `;
    } catch (err: any) {
      invalidEnumThrew = true;
      error = err;
    }
    expect(invalidEnumThrew).toBe(true);
    expect(error?.code === '22P02' || error?.message?.includes('invalid input value for enum')).toBe(true);
  });

  // ============================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS (Relational Integrity Interlocks)
  // ============================================================================

  it('[Tier 3] validates foreign key relationship chain: account -> department & role -> account_domains', async () => {
    const acctFks = await queryTableForeignKeys('accounts');
    expect(acctFks.some((f) => f.column === 'department_id' && f.deleteRule === 'SET NULL')).toBe(true);
    expect(acctFks.some((f) => f.column === 'account_role_id' && f.deleteRule === 'SET NULL')).toBe(true);

    const acctDomainFks = await queryTableForeignKeys('account_domains');
    expect(acctDomainFks.some((f) => f.column === 'account_id' && f.deleteRule === 'CASCADE')).toBe(true);
    expect(acctDomainFks.some((f) => f.column === 'domain_id' && f.deleteRule === 'CASCADE')).toBe(true);
  });

  it('[Tier 3] validates hardware device relationship chain: devices -> specs (1:1) + assignments + credentials', async () => {
    const specUniques = await queryTableUniqueConstraints('device_specifications');
    expect(specUniques.some((u) => u.columns.includes('device_id'))).toBe(true);

    const assignmentFks = await queryTableForeignKeys('device_assignments');
    expect(assignmentFks.some((f) => f.column === 'device_id' && f.deleteRule === 'CASCADE')).toBe(true);
    expect(assignmentFks.some((f) => f.column === 'account_id' && f.deleteRule === 'SET NULL')).toBe(true);

    const credentialFks = await queryTableForeignKeys('device_credentials');
    expect(credentialFks.some((f) => f.column === 'device_id' && f.deleteRule === 'CASCADE')).toBe(true);
  });

  it('[Tier 3] validates audit events actor relationship with optional/nullable system actor', async () => {
    const auditColumns = await queryTableColumns('audit_events');
    const actorCol = auditColumns.find((c) => c.name === 'actor_id');
    expect(actorCol?.isNullable).toBe(true);

    const auditFks = await queryTableForeignKeys('audit_events');
    const actorFk = auditFks.find((f) => f.column === 'actor_id');
    expect(actorFk?.foreignTable).toBe('accounts');
    expect(actorFk?.deleteRule).toBe('SET NULL');
  });

  it('[Tier 3] validates Google Workspace groups and memberships relational integrity', async () => {
    const groupUniques = await queryTableUniqueConstraints('google_groups');
    expect(groupUniques.some((u) => u.columns.includes('email'))).toBe(true);

    const memberFks = await queryTableForeignKeys('group_memberships');
    expect(memberFks.some((f) => f.column === 'group_id' && f.deleteRule === 'CASCADE')).toBe(true);
    expect(memberFks.some((f) => f.column === 'account_id' && f.deleteRule === 'CASCADE')).toBe(true);
  });

  // ============================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS
  // ============================================================================

  it('[Tier 4] Scenario 1: Initial database migration & reference seeding validation', async () => {
    const counts = await queryReferenceCounts();
    expect(counts.departments).toBe(8);
    expect(counts.accountRoles).toBe(5);
    expect(counts.domains).toBe(3);

    const data = await queryReferenceData();
    expect(data.departments.every((d) => Boolean(d.id && d.code && d.name))).toBe(true);
    expect(data.accountRoles.every((r) => Boolean(r.id && r.name && r.level))).toBe(true);
    expect(data.domains.every((dm) => Boolean(dm.id && dm.name))).toBe(true);
  });

  it('[Tier 4] Scenario 2: Idempotent re-seed execution without data corruption or duplicates', async () => {
    // Re-run idempotent upsert queries in a transaction against the live database
    await sql.begin(async (tx) => {
      // 1. Re-seed departments
      const canonicalDepts = [
        { name: 'Management Office', code: 'MNG' },
        { name: 'Operations', code: 'OPS' },
        { name: 'Growth', code: 'GRW' },
        { name: 'Experience', code: 'EXP' },
        { name: 'Human Resource and Development', code: 'HRD' },
        { name: 'Information and Technology', code: 'ITE' },
        { name: 'Finance and Accounting', code: 'FAC' },
        { name: 'General', code: 'GNR' },
      ];

      for (const d of canonicalDepts) {
        const [existing] = await tx`
          SELECT id FROM departments WHERE code = ${d.code} OR name = ${d.name} LIMIT 1;
        `;
        if (existing) {
          await tx`
            UPDATE departments SET name = ${d.name}, code = ${d.code} WHERE id = ${existing.id};
          `;
        } else {
          await tx`
            INSERT INTO departments (name, code) VALUES (${d.name}, ${d.code});
          `;
        }
      }
    });

    // Re-verify counts after re-execution
    const countsAfter = await queryReferenceCounts();
    expect(countsAfter.departments).toBe(8);
    expect(countsAfter.accountRoles).toBe(5);
    expect(countsAfter.domains).toBe(3);
  });
});
