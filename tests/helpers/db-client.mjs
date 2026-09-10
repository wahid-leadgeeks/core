import { PGlite } from '@electric-sql/pglite';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local and .env
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dataDir =
  process.env.PGLITE_DATA_DIR || path.resolve(__dirname, '../../data/core_db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let pgliteClient = null;
let sqlWrapper = null;

function createSqlWrapper(client) {
  const sql = async (strings, ...values) => {
    if (typeof strings === 'string') {
      const res = await client.query(strings, values[0] || []);
      return res.rows;
    }
    let query = strings[0];
    const params = [];
    for (let i = 0; i < values.length; i++) {
      params.push(values[i]);
      query += '$' + (i + 1) + strings[i + 1];
    }
    const res = await client.query(query, params);
    return res.rows;
  };

  sql.begin = async (callback) => {
    return await client.transaction(async (txClient) => {
      const txSql = createSqlWrapper(txClient);
      return await callback(txSql);
    });
  };

  sql.end = async () => {
    // Graceful cleanup
  };

  return sql;
}

/**
 * Get or initialize the live PostgreSQL client (PGlite embedded WASM)
 */
export function getDbClient() {
  if (!sqlWrapper) {
    if (!pgliteClient) {
      pgliteClient = globalThis._pgliteClient ?? new PGlite(dataDir);
      globalThis._pgliteClient = pgliteClient;
    }
    sqlWrapper = createSqlWrapper(pgliteClient);
  }
  return sqlWrapper;
}

/**
 * Gracefully close the PostgreSQL connection pool
 */
export async function closeDbClient() {
  sqlWrapper = null;
}

/**
 * Query all base tables in the 'public' schema from information_schema.tables
 */
export async function queryPublicTables() {
  const sql = getDbClient();
  const rows = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name ASC;
  `;
  return rows.map((r) => r.table_name);
}

/**
 * Query column specifications for a table from information_schema.columns
 */
export async function queryTableColumns(tableName) {
  const sql = getDbClient();
  const rows = await sql`
    SELECT
      column_name,
      is_nullable,
      data_type,
      udt_name,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${tableName}
    ORDER BY ordinal_position ASC;
  `;
  return rows.map((r) => ({
    name: r.column_name,
    isNullable: r.is_nullable === 'YES',
    dataType: r.data_type,
    udtName: r.udt_name,
    columnDefault: r.column_default,
  }));
}

/**
 * Query enum labels for a PostgreSQL enum type from pg_type and pg_enum
 */
export async function queryEnumValues(enumName) {
  const sql = getDbClient();
  const rows = await sql`
    SELECT e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = ${enumName}
    ORDER BY e.enumsortorder ASC;
  `;
  return rows.map((r) => r.enumlabel);
}

/**
 * Query foreign key constraints and on-delete rules from information_schema
 */
export async function queryTableForeignKeys(tableName) {
  const sql = getDbClient();
  const rows = await sql`
    SELECT
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON rc.unique_constraint_name = ccu.constraint_name
      AND rc.unique_constraint_schema = ccu.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = ${tableName};
  `;
  return rows.map((r) => ({
    column: r.column_name,
    foreignTable: r.foreign_table_name,
    foreignColumn: r.foreign_column_name,
    deleteRule: r.delete_rule,
  }));
}

/**
 * Query unique constraints from information_schema.table_constraints
 */
export async function queryTableUniqueConstraints(tableName) {
  const sql = getDbClient();
  const rows = await sql`
    SELECT
      tc.constraint_name,
      array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_schema = 'public'
      AND tc.table_name = ${tableName}
    GROUP BY tc.constraint_name;
  `;
  return rows.map((r) => ({
    name: r.constraint_name,
    columns: r.columns,
  }));
}

/**
 * Query actual counts of reference tables in live database
 */
export async function queryReferenceCounts() {
  const sql = getDbClient();
  const [deptRow] = await sql`SELECT count(*)::int AS count FROM departments;`;
  const [roleRow] = await sql`SELECT count(*)::int AS count FROM account_roles;`;
  const [domainRow] = await sql`SELECT count(*)::int AS count FROM domains;`;
  return {
    departments: deptRow.count,
    accountRoles: roleRow.count,
    domains: domainRow.count,
  };
}

/**
 * Query all rows from reference tables
 */
export async function queryReferenceData() {
  const sql = getDbClient();
  const departments = await sql`SELECT id, name, code, created_at FROM departments ORDER BY code ASC;`;
  const accountRoles = await sql`SELECT id, name, level FROM account_roles ORDER BY level ASC;`;
  const domains = await sql`SELECT id, name, is_primary FROM domains ORDER BY name ASC;`;
  return {
    departments,
    accountRoles,
    domains,
  };
}

/**
 * Contract verification helper for backwards compatibility
 */
export async function verifyTableContract(tableName, expectedColumns) {
  const columns = await queryTableColumns(tableName);
  const actualColumnNames = new Set(columns.map((c) => c.name.toLowerCase()));
  const missingColumns = expectedColumns.filter((c) => !actualColumnNames.has(c.toLowerCase()));

  return {
    tableName,
    exists: columns.length > 0,
    columns,
    missingColumns,
  };
}

/**
 * Enum verification helper for backwards compatibility
 */
export async function verifyEnumValues(enumName, expectedValues) {
  const actualValues = await queryEnumValues(enumName);
  if (actualValues.length !== expectedValues.length) return false;
  const actualSet = new Set(actualValues);
  return expectedValues.every((v) => actualSet.has(v));
}

/**
 * Seed counts verification helper for backwards compatibility
 */
export async function verifyReferenceSeedCounts(expectedCounts) {
  const actualCounts = await queryReferenceCounts();
  const errors = [];
  if (actualCounts.departments !== expectedCounts.departments) {
    errors.push(`Expected ${expectedCounts.departments} departments, got ${actualCounts.departments}`);
  }
  if (actualCounts.accountRoles !== expectedCounts.accountRoles) {
    errors.push(`Expected ${expectedCounts.accountRoles} account_roles, got ${actualCounts.accountRoles}`);
  }
  if (actualCounts.domains !== expectedCounts.domains) {
    errors.push(`Expected ${expectedCounts.domains} domains, got ${actualCounts.domains}`);
  }
  return {
    valid: errors.length === 0,
    errors,
    actualCounts,
  };
}
