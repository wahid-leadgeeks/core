// Embedded Test Framework and Assertion Library for CORE E2E Test Suite

export type TestFn = () => void | Promise<void>;
export type HookFn = () => void | Promise<void>;

export interface TestCase {
  name: string;
  fn: TestFn;
  tier: 1 | 2 | 3 | 4;
  suiteName: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  error?: Error;
}

export interface TestSuite {
  name: string;
  beforeAllHooks: HookFn[];
  afterAllHooks: HookFn[];
  beforeEachHooks: HookFn[];
  afterEachHooks: HookFn[];
  tests: TestCase[];
}

export class Expectation {
  private actual: any;
  private isNot: boolean;

  constructor(actual: any, isNot = false) {
    this.actual = actual;
    this.isNot = isNot;
  }

  get not(): Expectation {
    return new Expectation(this.actual, !this.isNot);
  }

  private assert(condition: boolean, message: string) {
    const passed = this.isNot ? !condition : condition;
    if (!passed) {
      throw new Error(this.isNot ? `Expected NOT: ${message}` : message);
    }
  }

  toBe(expected: any): void {
    const pass = Object.is(this.actual, expected);
    this.assert(pass, `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(this.actual)}`);
  }

  toEqual(expected: any): void {
    const pass = deepEqual(this.actual, expected);
    this.assert(pass, `Expected deeply equal to:\n${JSON.stringify(expected, null, 2)}\nReceived:\n${JSON.stringify(this.actual, null, 2)}`);
  }

  toBeTruthy(): void {
    this.assert(Boolean(this.actual), `Expected truthy value, received ${this.actual}`);
  }

  toBeFalsy(): void {
    this.assert(!this.actual, `Expected falsy value, received ${this.actual}`);
  }

  toBeDefined(): void {
    this.assert(this.actual !== undefined, `Expected value to be defined, received undefined`);
  }

  toBeUndefined(): void {
    this.assert(this.actual === undefined, `Expected value to be undefined, received ${this.actual}`);
  }

  toBeNull(): void {
    this.assert(this.actual === null, `Expected null, received ${this.actual}`);
  }

  toContain(item: any): void {
    if (typeof this.actual === 'string') {
      this.assert(this.actual.includes(item), `Expected string "${this.actual}" to contain "${item}"`);
    } else if (Array.isArray(this.actual)) {
      const pass = this.actual.some(el => deepEqual(el, item) || el === item);
      this.assert(pass, `Expected array ${JSON.stringify(this.actual)} to contain ${JSON.stringify(item)}`);
    } else if (this.actual instanceof Set || this.actual instanceof Map) {
      this.assert(this.actual.has(item), `Expected collection to contain ${item}`);
    } else {
      throw new Error(`toContain applied to non-iterable type: ${typeof this.actual}`);
    }
  }

  toHaveLength(length: number): void {
    const actualLength = this.actual?.length ?? this.actual?.size;
    this.assert(actualLength === length, `Expected length ${length}, received ${actualLength}`);
  }

  toBeGreaterThan(expected: number): void {
    this.assert(this.actual > expected, `Expected ${this.actual} > ${expected}`);
  }

  toBeGreaterThanOrEqual(expected: number): void {
    this.assert(this.actual >= expected, `Expected ${this.actual} >= ${expected}`);
  }

  toBeLessThan(expected: number): void {
    this.assert(this.actual < expected, `Expected ${this.actual} < ${expected}`);
  }

  toBeLessThanOrEqual(expected: number): void {
    this.assert(this.actual <= expected, `Expected ${this.actual} <= ${expected}`);
  }

  toMatch(regex: RegExp | string): void {
    const re = typeof regex === 'string' ? new RegExp(regex) : regex;
    this.assert(re.test(String(this.actual)), `Expected "${this.actual}" to match ${re}`);
  }

  toThrow(expectedErrorSubstring?: string): void {
    if (typeof this.actual !== 'function') {
      throw new Error('toThrow requires a function target');
    }
    let threw = false;
    let thrownError: any = null;
    try {
      this.actual();
    } catch (err: any) {
      threw = true;
      thrownError = err;
    }
    if (!threw) {
      this.assert(false, 'Expected function to throw an error, but it returned normally');
      return;
    }
    if (expectedErrorSubstring) {
      const msg = thrownError?.message || String(thrownError);
      this.assert(
        msg.toLowerCase().includes(expectedErrorSubstring.toLowerCase()),
        `Expected error message containing "${expectedErrorSubstring}", got "${msg}"`
      );
    }
  }

  async toThrowAsync(expectedErrorSubstring?: string): Promise<void> {
    let threw = false;
    let thrownError: any = null;
    try {
      if (typeof this.actual === 'function') {
        await this.actual();
      } else {
        await this.actual;
      }
    } catch (err: any) {
      threw = true;
      thrownError = err;
    }
    if (!threw) {
      this.assert(false, 'Expected async function to throw an error, but it resolved normally');
      return;
    }
    if (expectedErrorSubstring) {
      const msg = thrownError?.message || String(thrownError);
      this.assert(
        msg.toLowerCase().includes(expectedErrorSubstring.toLowerCase()),
        `Expected error message containing "${expectedErrorSubstring}", got "${msg}"`
      );
    }
  }
}

function deepEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !deepEqual(a[key], b[key])) {
      return false;
    }
  }
  return true;
}

export const expect = (actual: any) => new Expectation(actual);

// Global Registry
export const testSuites: TestSuite[] = [];
let currentSuite: TestSuite | null = null;

export function describe(name: string, fn: () => void): void {
  const suite: TestSuite = {
    name,
    beforeAllHooks: [],
    afterAllHooks: [],
    beforeEachHooks: [],
    afterEachHooks: [],
    tests: []
  };
  const prevSuite = currentSuite;
  currentSuite = suite;
  testSuites.push(suite);
  try {
    fn();
  } finally {
    currentSuite = prevSuite;
  }
}

function parseTierFromName(name: string): 1 | 2 | 3 | 4 {
  if (name.includes('[Tier 1]') || name.includes('Tier 1:')) return 1;
  if (name.includes('[Tier 2]') || name.includes('Tier 2:')) return 2;
  if (name.includes('[Tier 3]') || name.includes('Tier 3:')) return 3;
  if (name.includes('[Tier 4]') || name.includes('Tier 4:')) return 4;
  return 1;
}

export function it(name: string, fn: TestFn): void {
  if (!currentSuite) {
    describe('Default Suite', () => {
      it(name, fn);
    });
    return;
  }
  const tier = parseTierFromName(name);
  currentSuite.tests.push({
    name,
    fn,
    tier,
    suiteName: currentSuite.name,
    status: 'skipped',
    durationMs: 0
  });
}

export const test = it;

export function beforeAll(fn: HookFn): void {
  if (currentSuite) currentSuite.beforeAllHooks.push(fn);
}

export function afterAll(fn: HookFn): void {
  if (currentSuite) currentSuite.afterAllHooks.push(fn);
}

export function beforeEach(fn: HookFn): void {
  if (currentSuite) currentSuite.beforeEachHooks.push(fn);
}

export function afterEach(fn: HookFn): void {
  if (currentSuite) currentSuite.afterEachHooks.push(fn);
}

export interface RunResults {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  tierBreakdown: Record<1 | 2 | 3 | 4, { total: number; passed: number; failed: number }>;
  failures: { suite: string; test: string; error: Error }[];
}

export async function runAllTests(options: { tier?: 1 | 2 | 3 | 4; suiteFilter?: string } = {}): Promise<RunResults> {
  const startTime = Date.now();
  const results: RunResults = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    durationMs: 0,
    tierBreakdown: {
      1: { total: 0, passed: 0, failed: 0 },
      2: { total: 0, passed: 0, failed: 0 },
      3: { total: 0, passed: 0, failed: 0 },
      4: { total: 0, passed: 0, failed: 0 }
    },
    failures: []
  };

  for (const suite of testSuites) {
    if (options.suiteFilter && !suite.name.toLowerCase().includes(options.suiteFilter.toLowerCase())) {
      continue;
    }

    // Execute beforeAll hooks
    for (const hook of suite.beforeAllHooks) {
      await hook();
    }

    for (const t of suite.tests) {
      if (options.tier && t.tier !== options.tier) {
        continue;
      }

      results.total++;
      results.tierBreakdown[t.tier].total++;

      // Execute beforeEach hooks
      for (const hook of suite.beforeEachHooks) {
        await hook();
      }

      const testStart = Date.now();
      try {
        await t.fn();
        t.durationMs = Date.now() - testStart;
        t.status = 'passed';
        results.passed++;
        results.tierBreakdown[t.tier].passed++;
      } catch (err: any) {
        t.durationMs = Date.now() - testStart;
        t.status = 'failed';
        t.error = err;
        results.failed++;
        results.tierBreakdown[t.tier].failed++;
        results.failures.push({
          suite: suite.name,
          test: t.name,
          error: err
        });
      }

      // Execute afterEach hooks
      for (const hook of suite.afterEachHooks) {
        await hook();
      }
    }

    // Execute afterAll hooks
    for (const hook of suite.afterAllHooks) {
      await hook();
    }
  }

  results.durationMs = Date.now() - startTime;
  return results;
}
