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

let pgliteClient: PGlite | null = null;
let sqlWrapper: any = null;

export interface ColumnSpec {
  name: string;
  isNullable: boolean;
  dataType: string;
  udtName: string;
  columnDefault: string | null;
}

export interface ForeignKeySpec {
  column: string;
  foreignTable: string;
  foreignColumn: string;
  deleteRule: string;
}

export interface UniqueConstraintSpec {
  name: string;
  columns: string[];
}

export interface TableVerificationResult {
  tableName: string;
  exists: boolean;
  columns: ColumnSpec[];
  missingColumns: string[];
}

export interface ReferenceCounts {
  departments: number;
  accountRoles: number;
  domains: number;
}

export interface ReferenceDataResult {
  departments: Array<{ id: string; name: string; code: string; created_at: Date }>;
  accountRoles: Array<{ id: string; name: string; level: number }>;
  domains: Array<{ id: string; name: string; is_primary: boolean }>;
}

function createSqlWrapper(client: PGlite): any {
  const sql: any = async (strings: TemplateStringsArray | string, ...values: any[]) => {
    if (typeof strings === 'string') {
      const res = await client.query(strings, values[0] || []);
      return res.rows;
    }
    let query = strings[0];
    const params: any[] = [];
    for (let i = 0; i < values.length; i++) {
      params.push(values[i]);
      query += '$' + (i + 1) + strings[i + 1];
    }
    const res = await client.query(query, params);
    return res.rows;
  };

  sql.begin = async (callback: (tx: any) => Promise<any>) => {
    return await (client as any).transaction(async (txClient: any) => {
      const txSql = createSqlWrapper(txClient);
      return await callback(txSql);
    });
  };

  sql.end = async () => {};

  return sql;
}

/**
 * Get or initialize the live PostgreSQL client (PGlite embedded WASM)
 */
export function getDbClient(): any {
  if (!sqlWrapper) {
    if (!pgliteClient) {
      pgliteClient = (globalThis as any)._pgliteClient ?? new PGlite(dataDir);
      (globalThis as any)._pgliteClient = pgliteClient;
    }
    sqlWrapper = createSqlWrapper(pgliteClient!);
  }
  return sqlWrapper;
}

/**
 * Gracefully close the PostgreSQL connection pool
 */
export async function closeDbClient(): Promise<void> {
  sqlWrapper = null;
}

/**
 * Query all base tables in the 'public' schema from information_schema.tables
 */
export async function queryPublicTables(): Promise<string[]> {
  const sql = getDbClient();
  const rows = await sql<{ table_name: string }[]>`
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
export async function queryTableColumns(tableName: string): Promise<ColumnSpec[]> {
  const sql = getDbClient();
  const rows = await sql<{
    column_name: string;
    is_nullable: string;
    data_type: string;
    udt_name: string;
    column_default: string | null;
  }[]>`
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
export async function queryEnumValues(enumName: string): Promise<string[]> {
  const sql = getDbClient();
  const rows = await sql<{ enumlabel: string }[]>`
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
export async function queryTableForeignKeys(tableName: string): Promise<ForeignKeySpec[]> {
  const sql = getDbClient();
  const rows = await sql<{
    column_name: string;
    foreign_table_name: string;
    foreign_column_name: string;
    delete_rule: string;
  }[]>`
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
export async function queryTableUniqueConstraints(tableName: string): Promise<UniqueConstraintSpec[]> {
  const sql = getDbClient();
  const rows = await sql<{
    constraint_name: string;
    columns: string[];
  }[]>`
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
export async function queryReferenceCounts(): Promise<ReferenceCounts> {
  const sql = getDbClient();
  const [deptRow] = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM departments;`;
  const [roleRow] = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM account_roles;`;
  const [domainRow] = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM domains;`;
  return {
    departments: deptRow.count,
    accountRoles: roleRow.count,
    domains: domainRow.count,
  };
}

/**
 * Query all rows from reference tables
 */
export async function queryReferenceData(): Promise<ReferenceDataResult> {
  const sql = getDbClient();
  const departments = await sql<ReferenceDataResult['departments']>`SELECT id, name, code, created_at FROM departments ORDER BY code ASC;`;
  const accountRoles = await sql<ReferenceDataResult['accountRoles']>`SELECT id, name, level FROM account_roles ORDER BY level ASC;`;
  const domains = await sql<ReferenceDataResult['domains']>`SELECT id, name, is_primary FROM domains ORDER BY name ASC;`;
  return {
    departments,
    accountRoles,
    domains,
  };
}

/**
 * Contract verification helper for backwards compatibility
 */
export async function verifyTableContract(tableName: string, expectedColumns: string[]): Promise<TableVerificationResult> {
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
export async function verifyEnumValues(enumName: string, expectedValues: string[]): Promise<boolean> {
  const actualValues = await queryEnumValues(enumName);
  if (actualValues.length !== expectedValues.length) return false;
  const actualSet = new Set(actualValues);
  return expectedValues.every((v) => actualSet.has(v));
}

/**
 * Seed counts verification helper for backwards compatibility
 */
export async function verifyReferenceSeedCounts(expectedCounts: ReferenceCounts): Promise<{
  valid: boolean;
  errors: string[];
  actualCounts: ReferenceCounts;
}> {
  const actualCounts = await queryReferenceCounts();
  const errors: string[] = [];
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
