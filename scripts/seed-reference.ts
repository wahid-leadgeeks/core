import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import * as dotenv from 'dotenv';
import { eq, or } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config({ path: '.env.local' });
dotenv.config();

const dataDir = process.env.PGLITE_DATA_DIR || path.resolve(process.cwd(), 'data/core_db');

export const CANONICAL_DEPARTMENTS = [
  { name: 'Management Office', code: 'MNG' },
  { name: 'Operations', code: 'OPS' },
  { name: 'Growth', code: 'GRW' },
  { name: 'Experience', code: 'EXP' },
  { name: 'Human Resource and Development', code: 'HRD' },
  { name: 'Information and Technology', code: 'ITE' },
  { name: 'Finance and Accounting', code: 'FAC' },
  { name: 'General', code: 'GNR' },
];

export const CANONICAL_ACCOUNT_ROLES = [
  { name: 'Top Management', level: 1 },
  { name: 'Leaders', level: 2 },
  { name: 'Non-Leaders', level: 3 },
  { name: 'Staff', level: 4 },
  { name: 'Commercial', level: 5 },
];

export const CANONICAL_DOMAINS = [
  { name: 'leadgeeksinc.com', isPrimary: true },
  { name: 'leadgeeksinc.co', isPrimary: false },
  { name: 'leadgeeksprospecting.com', isPrimary: false },
];

/**
 * Execute reference seeding inside an atomic database transaction.
 * Resolves dual-unique constraints on departments (code and name) via
 * disjunctive lookup before update/insert.
 */
export async function seedReferenceData(dbInstance: any) {
  return await dbInstance.transaction(async (tx: any) => {
    // 1. Seed Departments (8 canonical rows) with dual-unique constraint handling
    console.log('📦 Seeding departments (8 expected)...');
    for (const dept of CANONICAL_DEPARTMENTS) {
      const [existing] = await tx
        .select()
        .from(schema.departments)
        .where(
          or(
            eq(schema.departments.code, dept.code),
            eq(schema.departments.name, dept.name)
          )
        )
        .limit(1);

      if (existing) {
        await tx
          .update(schema.departments)
          .set({
            name: dept.name,
            code: dept.code,
          })
          .where(eq(schema.departments.id, existing.id));
      } else {
        await tx.insert(schema.departments).values({
          name: dept.name,
          code: dept.code,
        });
      }
    }
    const deptRows = await tx.select().from(schema.departments);
    console.log(`✅ Departments seeded: ${deptRows.length} total rows.`);

    // 2. Seed Account Roles (5 canonical rows)
    console.log('📦 Seeding account roles (5 expected)...');
    for (const role of CANONICAL_ACCOUNT_ROLES) {
      const [existing] = await tx
        .select()
        .from(schema.accountRoles)
        .where(eq(schema.accountRoles.level, role.level))
        .limit(1);

      if (existing) {
        await tx
          .update(schema.accountRoles)
          .set({ name: role.name })
          .where(eq(schema.accountRoles.id, existing.id));
      } else {
        await tx.insert(schema.accountRoles).values({
          name: role.name,
          level: role.level,
        });
      }
    }
    const roleRows = await tx.select().from(schema.accountRoles);
    console.log(`✅ Account roles seeded: ${roleRows.length} total rows.`);

    // 3. Seed Domains (3 canonical rows)
    console.log('📦 Seeding domains (3 expected)...');
    for (const domain of CANONICAL_DOMAINS) {
      const [existing] = await tx
        .select()
        .from(schema.domains)
        .where(eq(schema.domains.name, domain.name))
        .limit(1);

      if (existing) {
        await tx
          .update(schema.domains)
          .set({ isPrimary: domain.isPrimary })
          .where(eq(schema.domains.id, existing.id));
      } else {
        await tx.insert(schema.domains).values({
          name: domain.name,
          isPrimary: domain.isPrimary,
        });
      }
    }
    const domainRows = await tx.select().from(schema.domains);
    console.log(`✅ Domains seeded: ${domainRows.length} total rows.`);

    return {
      departments: deptRows.length,
      accountRoles: roleRows.length,
      domains: domainRows.length,
    };
  });
}

import { db as appDb, client as appClient, shouldUsePglite } from '../src/lib/db/client';

async function main() {
  const isRemote = !shouldUsePglite();
  console.log(`🔄 Connecting to database for reference seed (${isRemote ? 'Remote PostgreSQL' : 'PGlite Embedded'})...`);

  try {
    const summary = await seedReferenceData(appDb);
    console.log('\n🎉 Reference data seeding complete and verified!');
    console.log(`   - Departments: ${summary.departments}/8`);
    console.log(`   - Account Roles: ${summary.accountRoles}/5`);
    console.log(`   - Domains: ${summary.domains}/3`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    if (isRemote) {
      await (appClient as any).end?.();
    } else {
      await (appClient as any).close?.();
    }
  }
}

if (
  process.argv[1] &&
  (process.argv[1].endsWith('seed-reference.ts') ||
    process.argv[1].endsWith('seed-reference.js') ||
    process.argv[1].includes('seed-reference'))
) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('Unexpected error during seeding:', err);
      process.exit(1);
    });
}
