// src/lib/db/client.ts
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite';
import postgres from 'postgres';
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import fs from 'node:fs';
import path from 'node:path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

export type AppDatabase = PgliteDatabase<typeof schema> | PostgresJsDatabase<typeof schema>;

// Detect Next.js build / SSG phase where database connections should not open persistent file locks
const isBuildPhase =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.npm_lifecycle_event === 'build' ||
  process.argv.some((arg) => arg.includes('next') && arg.includes('build'));

// Embedded PGlite data directory for local development persistence
const isVercel = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const defaultDataDir = isVercel
  ? path.resolve('/tmp', 'core_db')
  : path.resolve(process.cwd(), 'data/core_db');
const dataDir = process.env.PGLITE_DATA_DIR || defaultDataDir;

/**
 * Determine whether to use PGlite (embedded WASM PostgreSQL) or external PostgreSQL:
 * - Always use PGlite in local development unless explicitly pointed to a remote DB
 * - Use PGlite if USE_PGLITE=true or no DATABASE_URL is set
 * - Use external PostgreSQL when DATABASE_URL is set for production/remote environments
 */
export function shouldUsePglite(): boolean {
  if (process.env.USE_PGLITE === 'true') return true;
  if (process.env.USE_REMOTE_DB === 'true') return false;
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') return true;
  if (process.env.DATABASE_URL.includes('localhost:5432/core_db') && process.env.NODE_ENV !== 'production') {
    return true;
  }
  return false;
}

// Maintain singletons across Next.js hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var _appDb: AppDatabase | undefined;
  // eslint-disable-next-line no-var
  var _pgliteClient: PGlite | undefined;
  // eslint-disable-next-line no-var
  var _postgresClient: postgres.Sql | undefined;
}

let db: AppDatabase;
let client: PGlite | postgres.Sql;

if (shouldUsePglite()) {
  if (isBuildPhase) {
    // In-memory PGlite instance during build prevents file lock collisions between worker threads
    const buildClient = new PGlite();
    db = drizzlePglite(buildClient, { schema });
    client = buildClient;
  } else {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const pgliteClient = globalThis._pgliteClient ?? new PGlite(dataDir);
    if (process.env.NODE_ENV !== 'production') {
      globalThis._pgliteClient = pgliteClient;
    }
    db = globalThis._appDb ?? drizzlePglite(pgliteClient, { schema });
    if (process.env.NODE_ENV !== 'production') {
      globalThis._appDb = db;
    }
    client = pgliteClient;
  }
} else {
  // External PostgreSQL client for production / staging (e.g. Aiven, Neon, Supabase)
  const connectionString = process.env.DATABASE_URL!;
  const postgresClient = globalThis._postgresClient ?? postgres(connectionString, {
    max: process.env.NODE_ENV === 'production' ? 10 : 2,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: connectionString.includes('sslmode=disable')
      ? false
      : connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? false
      : 'require',
  });
  if (process.env.NODE_ENV !== 'production') {
    globalThis._postgresClient = postgresClient;
  }
  db = globalThis._appDb ?? drizzlePostgres(postgresClient, { schema });
  if (process.env.NODE_ENV !== 'production') {
    globalThis._appDb = db;
  }
  client = postgresClient;
}

export { db, client };

// Helper to ensure database tables are created on startup
let initPromise: Promise<void> | null = null;
export async function ensureDbInitialized(): Promise<void> {
  if (isBuildPhase) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (shouldUsePglite()) {
        const pglite = client as PGlite;
        if (typeof pglite.waitReady !== 'undefined') {
          await pglite.waitReady;
        }
        const checkRes = await pglite.query<{ count: string }>(
          "SELECT count(*)::text as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments'"
        );
        if (!checkRes.rows[0] || checkRes.rows[0].count === '0') {
          const sqlPath = path.resolve(process.cwd(), 'drizzle/0000_core_foundation.sql');
          if (fs.existsSync(sqlPath)) {
            const sql = fs.readFileSync(sqlPath, 'utf8');
            await pglite.exec(sql);
          }
        }

        // Ensure sheets_sync_logs table exists
        await pglite.exec(`
          CREATE TABLE IF NOT EXISTS "sheets_sync_logs" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "action" varchar(50) NOT NULL,
            "spreadsheet_id" varchar(255) NOT NULL,
            "spreadsheet_title" varchar(255),
            "sheet_name" varchar(100) NOT NULL,
            "range" varchar(100) NOT NULL,
            "summary" text NOT NULL,
            "previous_condition" jsonb,
            "new_condition" jsonb,
            "status" varchar(50) DEFAULT 'applied' NOT NULL,
            "actor_id" uuid,
            "actor_email" varchar(255),
            "rollback_log_id" uuid,
            "error_message" text,
            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
            "updated_at" timestamp with time zone DEFAULT now() NOT NULL
          );
        `);
      } else {
        // External PostgreSQL
        const sql = client as postgres.Sql;
        const checkRes = await sql<{ count: string }[]>`
          SELECT count(*)::text as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments'
        `;
        if (!checkRes[0] || checkRes[0].count === '0') {
          const sqlPath = path.resolve(process.cwd(), 'drizzle/0000_core_foundation.sql');
          if (fs.existsSync(sqlPath)) {
            const sqlContent = fs.readFileSync(sqlPath, 'utf8');
            await sql.unsafe(sqlContent);
          }
        }

        await sql`
          CREATE TABLE IF NOT EXISTS "sheets_sync_logs" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "action" varchar(50) NOT NULL,
            "spreadsheet_id" varchar(255) NOT NULL,
            "spreadsheet_title" varchar(255),
            "sheet_name" varchar(100) NOT NULL,
            "range" varchar(100) NOT NULL,
            "summary" text NOT NULL,
            "previous_condition" jsonb,
            "new_condition" jsonb,
            "status" varchar(50) DEFAULT 'applied' NOT NULL,
            "actor_id" uuid,
            "actor_email" varchar(255),
            "rollback_log_id" uuid,
            "error_message" text,
            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
            "updated_at" timestamp with time zone DEFAULT now() NOT NULL
          );
        `;
      }
    } catch (err) {
      console.error('Failed to auto-initialize database tables:', err);
    }
  })();
  return initPromise;
}

// Automatically trigger initialization in the background during runtime
if (!isBuildPhase) {
  ensureDbInitialized().catch(() => {});
}

