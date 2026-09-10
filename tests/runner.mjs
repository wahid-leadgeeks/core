#!/usr/bin/env node

import { runAllTests, testSuites } from './helpers/test-framework.mjs';

// Import all test suites to register tests
import './e2e/01-db-schema-and-seed.test.mjs';
import './e2e/02-auth-and-sessions.test.mjs';
import './e2e/03-rbac-permissions.test.mjs';
import './e2e/04-audit-logging.test.mjs';
import './e2e/05-credential-encryption.test.mjs';
import './e2e/06-spreadsheet-ingestion.test.mjs';
import './e2e/07-crud-api-and-pages.test.mjs';
import './e2e/08-asset-lifecycle-mutations.test.mjs';

// Parse command line arguments
const args = process.argv.slice(2);
let tierFilter = undefined;
let suiteFilter = undefined;

for (const arg of args) {
  if (arg.startsWith('--tier=')) {
    const val = parseInt(arg.split('=')[1], 10);
    if ([1, 2, 3, 4].includes(val)) {
      tierFilter = val;
    }
  } else if (arg.startsWith('--suite=')) {
    suiteFilter = arg.split('=')[1];
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
CORE E2E Test Suite Runner
Usage: node tests/runner.mjs [options]

Options:
  --tier=1|2|3|4     Filter execution to specific test tier
  --suite=<query>    Filter execution to suites matching query (e.g. --suite=01 or --suite=rbac)
  --help, -h         Display this help message
`);
    process.exit(0);
  }
}

// ANSI colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

async function main() {
  console.log(`\n${c.bold}${c.cyan}======================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan} CORE (Company Operations, Resources & Environment) — E2E Test Suite ${c.reset}`);
  console.log(`${c.bold}${c.cyan}======================================================================${c.reset}`);
  if (tierFilter) console.log(`${c.yellow}Filter: Tier ${tierFilter} only${c.reset}`);
  if (suiteFilter) console.log(`${c.yellow}Filter: Suite matching "${suiteFilter}"${c.reset}`);
  console.log('');

  const results = await runAllTests({ tier: tierFilter, suiteFilter });

  // Print results per suite
  for (const suite of testSuites) {
    if (suiteFilter && !suite.name.toLowerCase().includes(suiteFilter.toLowerCase())) {
      continue;
    }
    const executedTests = tierFilter ? suite.tests.filter(t => t.tier === tierFilter) : suite.tests;
    if (executedTests.length === 0) continue;

    console.log(`${c.bold}${c.magenta}▶ ${suite.name}${c.reset}`);
    for (const t of executedTests) {
      const tierBadge = `${c.dim}[T${t.tier}]${c.reset}`;
      if (t.status === 'passed') {
        console.log(`  ${c.green}✔${c.reset} ${tierBadge} ${t.name.replace(/\[Tier \d\]\s*/, '')} ${c.dim}(${t.durationMs}ms)${c.reset}`);
      } else {
        console.log(`  ${c.red}✘${c.reset} ${tierBadge} ${t.name.replace(/\[Tier \d\]\s*/, '')} ${c.dim}(${t.durationMs}ms)${c.reset}`);
        if (t.error) {
          console.log(`    ${c.red}Error: ${t.error.message}${c.reset}`);
          if (t.error.stack) {
            const stackLines = t.error.stack.split('\n').slice(1, 3).join('\n');
            console.log(`    ${c.dim}${stackLines}${c.reset}`);
          }
        }
      }
    }
    console.log('');
  }

  // Summary box
  console.log(`${c.bold}----------------------------------------------------------------------${c.reset}`);
  console.log(`${c.bold}Execution Summary:${c.reset}`);
  console.log(`  Total Tests Run : ${c.bold}${results.total}${c.reset}`);
  console.log(`  Passed          : ${c.green}${results.passed}${c.reset}`);
  console.log(`  Failed          : ${results.failed > 0 ? c.red : c.green}${results.failed}${c.reset}`);
  console.log(`  Duration        : ${results.durationMs}ms`);
  console.log('');
  console.log(`${c.bold}4-Tier Breakdown:${c.reset}`);
  for (const tier of [1, 2, 3, 4]) {
    const stats = results.tierBreakdown[tier];
    const tierLabels = {
      1: 'Feature Coverage',
      2: 'Boundary & Corner Cases',
      3: 'Cross-Feature Combinations',
      4: 'Real-World Scenarios'
    };
    console.log(`  Tier ${tier} (${tierLabels[tier].padEnd(26)}) : ${stats.passed}/${stats.total} passed`);
  }
  console.log(`${c.bold}----------------------------------------------------------------------${c.reset}`);

  if (results.failed > 0) {
    console.log(`\n${c.red}${c.bold}RESULT: FAIL — ${results.failed} test(s) failed${c.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${c.green}${c.bold}RESULT: PASS — 100% of ${results.passed} tests passed (Exit Code 0)${c.reset}\n`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error(`${c.red}Fatal runner error: ${err.message}${c.reset}`);
  process.exit(1);
});
