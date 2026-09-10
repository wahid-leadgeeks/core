import { PGlite } from '@electric-sql/pglite';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config();

const dataDir = process.env.PGLITE_DATA_DIR || path.resolve(process.cwd(), 'data/core_db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function main() {
  console.log('🔄 Starting PGlite database migrations...');
  console.log(`📁 Embedded Database Directory: ${dataDir}`);

  const client = new PGlite(dataDir);

  try {
    const sqlFile = path.resolve(process.cwd(), 'drizzle/0000_core_foundation.sql');
    if (fs.existsSync(sqlFile)) {
      console.log(`📁 Applying schema from ${sqlFile}...`);
      const sqlContent = fs.readFileSync(sqlFile, 'utf8');
      await client.exec(sqlContent);
      console.log('✅ PGlite schema migration executed successfully!');
    } else {
      throw new Error(`Migration SQL not found at ${sqlFile}`);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Unexpected error running migrations:', err);
  process.exit(1);
});
