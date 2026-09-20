import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const isRemote = Boolean(connectionString && connectionString.trim() !== '' && !process.env.USE_PGLITE);

async function main() {
  const sqlFile = path.resolve(process.cwd(), 'drizzle/0000_core_foundation.sql');
  if (!fs.existsSync(sqlFile)) {
    throw new Error(`Migration SQL not found at ${sqlFile}`);
  }
  const sqlContent = fs.readFileSync(sqlFile, 'utf8');

  if (isRemote) {
    console.log('🔄 Starting remote PostgreSQL migrations...');
    const masked = connectionString!.replace(/:([^:@]+)@/, ':****@');
    console.log(`🌐 Target: ${masked}`);

    const sql = postgres(connectionString!, {
      ssl: connectionString!.includes('sslmode=disable')
        ? false
        : connectionString!.includes('localhost') || connectionString!.includes('127.0.0.1')
        ? false
        : 'require',
      connect_timeout: 15,
    });

    try {
      console.log(`📁 Applying schema from ${sqlFile}...`);
      await sql.unsafe(sqlContent);
      console.log('✅ Remote PostgreSQL schema migration executed successfully!');

      console.log('📁 Ensuring sheets_sync_logs table exists...');
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
      console.log('✅ sheets_sync_logs table verified!');
    } catch (error) {
      console.error('❌ Remote migration failed:', error);
      process.exit(1);
    } finally {
      await sql.end();
    }
  } else {
    const dataDir = process.env.PGLITE_DATA_DIR || path.resolve(process.cwd(), 'data/core_db');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log('🔄 Starting PGlite database migrations...');
    console.log(`📁 Embedded Database Directory: ${dataDir}`);

    const client = new PGlite(dataDir);
    try {
      console.log(`📁 Applying schema from ${sqlFile}...`);
      await client.exec(sqlContent);
      console.log('✅ PGlite schema migration executed successfully!');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    } finally {
      await client.close();
    }
  }
}

main().catch((err) => {
  console.error('Unexpected error running migrations:', err);
  process.exit(1);
});

