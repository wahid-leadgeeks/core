#!/usr/bin/env node

import { runAllTests, testSuites } from './helpers/test-framework.js';

// Import all TypeScript test suites
import './e2e/01-db-schema-and-seed.test.js';
import './e2e/02-auth-and-sessions.test.js';
import './e2e/03-rbac-permissions.test.js';
import './e2e/04-audit-logging.test.js';
import './e2e/05-credential-encryption.test.js';
import './e2e/06-spreadsheet-ingestion.test.js';
import './e2e/07-crud-api-and-pages.test.js';

const args = process.argv.slice(2);
let tierFilter: 1 | 2 | 3 | 4 | undefined = undefined;
let suiteFilter: string | undefined = undefined;

for (const arg of args) {
  if (arg.startsWith('--tier=')) {
    const val = parseInt(arg.split('=')[1], 10);
    if ([1, 2, 3, 4].includes(val)) {
      tierFilter = val as 1 | 2 | 3 | 4;
    }
  } else if (arg.startsWith('--suite=')) {
    suiteFilter = arg.split('=')[1];
  }
}

async function main() {
  const results = await runAllTests({ tier: tierFilter, suiteFilter });
  console.log(`Execution complete. Total: ${results.total}, Passed: ${results.passed}, Failed: ${results.failed}`);
  if (results.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
