// src/lib/db/client.ts
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from './schema';
import fs from 'node:fs';
import path from 'node:path';

// Local directory for PGlite embedded database persistence
const dataDir = process.env.PGLITE_DATA_DIR || path.resolve(process.cwd(), 'data/core_db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Maintain a singleton PGlite instance across Next.js hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var _pgliteClient: PGlite | undefined;
}

const client: PGlite = globalThis._pgliteClient ?? new PGlite(dataDir);

if (process.env.NODE_ENV !== 'production') {
  globalThis._pgliteClient = client;
}

export const db = drizzle(client, { schema });
export { client };

// Helper to ensure database tables are created on startup
let initPromise: Promise<void> | null = null;
export async function ensureDbInitialized(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await client.waitReady;
      const checkRes = await client.query<{ count: string }>(
        "SELECT count(*)::text as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments'"
      );
      if (!checkRes.rows[0] || checkRes.rows[0].count === '0') {
        const sqlPath = path.resolve(process.cwd(), 'drizzle/0000_core_foundation.sql');
        if (fs.existsSync(sqlPath)) {
          const sql = fs.readFileSync(sqlPath, 'utf8');
          await client.exec(sql);
        }
      }
    } catch (err) {
      console.error('Failed to auto-initialize PGlite tables:', err);
    }
  })();
  return initPromise;
}

// Automatically trigger initialization in the background during runtime (skip during production build)
if (process.env.NEXT_PHASE !== 'phase-production-build') {
  ensureDbInitialized().catch(() => {});
}
