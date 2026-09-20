import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

// drizzle.config.ts
// Drizzle Kit uses PostgreSQL dialect for SQL schema generation.
// For local development, CORE runs embedded PGlite (which is 100% PostgreSQL-compatible).
// In local development, schema migrations are executed directly via `npm run db:migrate` (scripts/migrate.ts).
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/core_db',
  },
});

