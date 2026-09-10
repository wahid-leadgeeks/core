# Investigation & Remediation Report: PinRevealModal Timer Side-Effects, React Hook Dependencies & Case-Insensitive Email Queries

**Author**: `explorer_m4_fix_2`  
**Working Directory**: `/home/noah/project/core/.agents/explorer_m4_fix_2`  
**Target Recipient**: Orchestrator / Parent Agent (`f4820c04-1b52-4163-b871-2dd93083237b`)  
**Timestamp**: 2026-09-08T23:55:00Z  
**Type**: Hard Handoff (Investigation Complete)

---

## 1. Observation

### 1.1 `PinRevealModal.tsx` Countdown Timer State Updater Side-Effect
- **File**: `src/components/assets/PinRevealModal.tsx`
- **Lines 41–58**:
```tsx
  // Auto-mask countdown timer
  useEffect(() => {
    if (!revealedPin) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setRevealedPin(null);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [revealedPin, onClose]);
```
- **Direct Observations**:
  1. `setSecondsRemaining` receives an updater function `(prev) => { ... }`.
  2. Inside this state updater function, three side-effects are directly executed:
     - `clearInterval(interval);` (clearing a timer handle from an outer scope)
     - `setRevealedPin(null);` (enqueuing a secondary state update inside a state transition)
     - `onClose();` (invoking an external prop callback passed from the parent component)
  3. In the parent components (`src/app/assets/page.tsx:335` and `src/app/assets/[id]/page.tsx:451`), `onClose` calls `setPinModalOpen(false)`. Calling a parent component's state setter from inside a child component's state updater function during React's render/reconciliation phase triggers React 19 warnings:
     `Cannot update a component while rendering a different component`.
  4. In addition, `onClose` is included in the interval's dependency array `[revealedPin, onClose]`. In both parent components, `onClose` is passed as an anonymous inline arrow function:
     - `src/app/assets/page.tsx:335`: `onClose={() => { setPinModalOpen(false); setSelectedAssetForPin(null); }}`
     - `src/app/assets/[id]/page.tsx:451`: `onClose={() => setPinModalOpen(false)}`
     Because anonymous functions change referential identity on every parent render, the interval is torn down and recreated every time the parent re-renders, causing interval jitter.

---

### 1.2 Missing React Hook Dependencies Across 4 Detail Pages
The Next.js build execution log reported in `reviewer_m4_2/handoff.md` showed:
```
./src/app/accounts/[id]/page.tsx
34:6  Warning: React Hook useEffect has a missing dependency: 'fetchDetail'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps

./src/app/assets/[id]/page.tsx
42:6  Warning: React Hook useEffect has a missing dependency: 'fetchDetail'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps

./src/app/groups/[id]/page.tsx
34:6  Warning: React Hook useEffect has a missing dependency: 'fetchDetail'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps

./src/app/software/[id]/page.tsx
34:6  Warning: React Hook useEffect has a missing dependency: 'fetchDetail'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
```

Direct inspection of all four files shows an identical architectural pattern:

1. **`src/app/accounts/[id]/page.tsx`** (Lines 4, 30–51, 156):
   - Import: `import React, { useState, useEffect } from 'react';` (missing `useCallback`)
   - Lines 30–34:
     ```tsx
     useEffect(() => {
       if (id) {
         fetchDetail();
       }
     }, [id]);
     ```
   - Lines 36–51:
     ```tsx
     const fetchDetail = async () => { ... };
     ```
   - Line 156: `<button onClick={fetchDetail}>Refresh</button>`
   - Problem: `fetchDetail` is referenced inside `useEffect` but omitted from dependencies. Naively adding `fetchDetail` without `useCallback` causes an infinite fetch loop because `fetchDetail` changes reference on every render, triggering `useEffect` -> `fetchDetail` -> `setData` -> re-render -> new `fetchDetail`.

2. **`src/app/assets/[id]/page.tsx`** (Lines 4, 38–59, 160):
   - Import: `import React, { useState, useEffect } from 'react';` (missing `useCallback`)
   - Lines 38–42:
     ```tsx
     useEffect(() => {
       if (id) {
         fetchDetail();
       }
     }, [id]);
     ```
   - Lines 44–59:
     ```tsx
     const fetchDetail = async () => { ... };
     ```
   - Line 160: `<button onClick={fetchDetail}>Refresh</button>`
   - Problem: Same missing `useCallback` memoization on `fetchDetail`.

3. **`src/app/groups/[id]/page.tsx`** (Lines 4, 30–51, 152):
   - Import: `import React, { useState, useEffect } from 'react';` (missing `useCallback`)
   - Lines 30–34:
     ```tsx
     useEffect(() => {
       if (id) {
         fetchDetail();
       }
     }, [id]);
     ```
   - Lines 36–51:
     ```tsx
     const fetchDetail = async () => { ... };
     ```
   - Line 152: `<button onClick={fetchDetail}>Refresh</button>`
   - Problem: Same missing `useCallback` memoization on `fetchDetail`.

4. **`src/app/software/[id]/page.tsx`** (Lines 4, 30–51, 156):
   - Import: `import React, { useState, useEffect } from 'react';` (missing `useCallback`)
   - Lines 30–34:
     ```tsx
     useEffect(() => {
       if (id) {
         fetchDetail();
       }
     }, [id]);
     ```
   - Lines 36–51:
     ```tsx
     const fetchDetail = async () => { ... };
     ```
   - Line 156: `<button onClick={fetchDetail}>Refresh</button>`
   - Problem: Same missing `useCallback` memoization on `fetchDetail`.

---

### 1.3 Case-Insensitive Email Query Handling in API Routes

1. **`src/app/api/accounts/[id]/route.ts`** (Lines 28–41, 48–53):
   - Lines 28–41:
     ```ts
     const isUuid = isValidUUID(identifier);
     const accountList = await db
       .select()
       .from(schema.accounts)
       .where(
         isUuid
           ? eq(schema.accounts.id, identifier)
           : or(
               eq(schema.accounts.email, identifier),
               eq(schema.accounts.previousEmail, identifier)
             )
       )
       .limit(1);
     ```
   - Lines 48–53 (Fallback fixture):
     ```ts
     const found = fixtureData.accounts?.find(
       (a: any) =>
         a.id === identifier ||
         a.email.toLowerCase() === identifier.toLowerCase() ||
         (a.previousEmail && a.previousEmail.toLowerCase() === identifier.toLowerCase())
     );
     ```
   - Direct Observation: The fallback fixture performs `.toLowerCase() === identifier.toLowerCase()`, but the live PostgreSQL query matches `eq(schema.accounts.email, identifier)`. PostgreSQL's `=` operator is case-sensitive. All database email records from spreadsheet ingestion are normalized to lowercase. If a client queries `Amanda@leadgeeksinc.com`, the live DB query returns 0 rows.

2. **`src/app/api/groups/[id]/route.ts`** (Lines 36–41, 48–53):
   - Lines 36–41:
     ```ts
     const isUuid = isValidUUID(identifier);
     const groupList = await db
       .select()
       .from(schema.googleGroups)
       .where(isUuid ? eq(schema.googleGroups.id, identifier) : eq(schema.googleGroups.email, identifier))
       .limit(1);
     ```
   - Lines 48–53 (Fallback fixture):
     ```ts
     const found = fixtureData.groups?.find(
       (g: any) =>
         g.id === identifier ||
         g.email.toLowerCase() === identifier.toLowerCase() ||
         g.name.toLowerCase() === identifier.toLowerCase()
     );
     ```
   - Direct Observation: The live DB query checks `eq(schema.googleGroups.email, identifier)`, which fails if a client queries with mixed-case (e.g. `Operations@leadgeeksinc.com`), whereas the fixture uses `.toLowerCase()`.

---

## 2. Logic Chain

### 2.1 Logic for `PinRevealModal.tsx`
1. React's architecture requires state updaters to be pure functions. An updater `(prev) => next` must compute the next state solely from `prev` and props without observable side effects.
2. In React 19, side effects inside state updaters are strictly audited. Triggering a parent component's state setter (`onClose -> setPinModalOpen(false)`) during a child state transition violates React's single-directional data flow and scheduling.
3. Separation of Concerns:
   - The interval effect should **only** handle ticking the timer: `setSecondsRemaining((prev) => (prev <= 1 ? 0 : prev - 1))`.
   - A separate expiration effect should listen for `secondsRemaining === 0` when `revealedPin` is active. When triggered, it cleans up `revealedPin` and calls `onClose()`.
   - To prevent timer jitter, `onClose` is kept in a mutable `useRef` or isolated from the interval effect dependency array. The interval depends solely on `[revealedPin]`.
   - In `handleReveal`, `setSecondsRemaining(30)` must precede `setRevealedPin` so the expiration condition is not met prematurely.

### 2.2 Logic for Detail Page Hook Dependencies
1. In Next.js App Router client components, route parameter `id` comes from `useParams().id`.
2. When `fetchDetail` is declared inside the component body, a fresh function reference is allocated on every render.
3. If `fetchDetail` is omitted from `useEffect`'s dependency array `[id]`, ESLint flags `react-hooks/exhaustive-deps`.
4. If `fetchDetail` is added to `[fetchDetail]` without `useCallback`, an infinite render loop occurs:
   Render -> new `fetchDetail` instance -> `useEffect` triggers -> `setData()` -> re-render -> new `fetchDetail` instance -> loop.
5. Wrapping `fetchDetail` in `useCallback(async () => { ... }, [id])`:
   - `id` is a primitive string. `fetchDetail` preserves referential equality across all re-renders where `id` does not change.
   - `useEffect(() => { fetchDetail(); }, [fetchDetail]);` runs exactly once when the component mounts or when the route param `id` changes.
   - The manual `<button onClick={fetchDetail}>Refresh</button>` continues to work seamlessly.
   - ESLint's `react-hooks/exhaustive-deps` rule is 100% satisfied without warning suppressions.

### 2.3 Logic for Case-Insensitive Email Lookups
1. In spreadsheet ingestion (`scripts/import-spreadsheets.ts`), all account and Google Group email addresses are canonicalized to lowercase using `.trim().toLowerCase()`.
2. In PostgreSQL, `eq(column, value)` evaluates as `column = value`. Strings are compared with byte/collation equality, which is case-sensitive by default.
3. If an API request is received for an email like `amanda@leadgeeksinc.com`, it matches. But if an external client or link passes `Amanda@leadgeeksinc.com`, the query fails to find the record in live PostgreSQL.
4. Normalizing non-UUID identifiers with `identifier.toLowerCase()` prior to SQL execution ensures consistent, case-insensitive lookups that match the stored database records and match the existing fallback fixture behavior.

---

## 3. Caveats

1. **Other Domain Identifier Cases**:
   - In `src/app/api/assets/[id]/route.ts`, `schema.devices.assetNumber` is stored in uppercase (e.g. `LGI-CD-2024-001`). If queries are lowercase (`lgi-cd-2024-001`), the fallback fixture checks `toLowerCase()` but the live query does an exact `eq`. We recommend including uppercase normalization or `ilike` in `assets/[id]` as well.
2. **ESLint Unescaped Entities**:
   - The build-blocking JSX unescaped entities (`"{query}"`) in the 6 page files are scoped to `explorer_m4_fix_1`. This report focuses exclusively on `PinRevealModal`, hook dependencies, and API query case-sensitivity.
3. **Command Execution Timeout**:
   - As observed in reviewer reports, `run_command` in this container environment times out when commands trigger user permission prompts. All analysis was conducted via static code inspection and AST/syntax verification.

---

## 4. Conclusion & Actionable Blueprints

The three targeted issues can be cleanly and definitively resolved with the following exact code changes:

### Blueprint 1: `src/components/assets/PinRevealModal.tsx`

#### Target 1A: Refactor countdown interval and add expiration effect (Lines 41–58)
**Replace**:
```tsx
  // Auto-mask countdown timer
  useEffect(() => {
    if (!revealedPin) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setRevealedPin(null);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [revealedPin, onClose]);
```

**With**:
```tsx
  // Auto-mask countdown interval: ticks secondsRemaining without side-effects
  useEffect(() => {
    if (!revealedPin) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [revealedPin]);

  // Handle countdown expiration safely outside state updater
  useEffect(() => {
    if (revealedPin && secondsRemaining === 0) {
      setRevealedPin(null);
      onClose();
    }
  }, [revealedPin, secondsRemaining, onClose]);
```

#### Target 1B: Defensive reset order in `handleReveal` (Lines 84–88)
**Replace**:
```tsx
      const data = await res.json();
      setRevealedPin(data.pin || '(No PIN set)');
      setLoginEmail(data.loginEmail || null);
      setSecondsRemaining(30);
```

**With**:
```tsx
      const data = await res.json();
      setSecondsRemaining(30);
      setRevealedPin(data.pin || '(No PIN set)');
      setLoginEmail(data.loginEmail || null);
```

---

### Blueprint 2: Detail Pages React Hook Dependency Remediation

#### 2.1 `src/app/accounts/[id]/page.tsx`
- **Line 4**:
  Change:
  ```tsx
  import React, { useState, useEffect } from 'react';
  ```
  To:
  ```tsx
  import React, { useState, useEffect, useCallback } from 'react';
  ```

- **Lines 30–51**:
  Replace:
  ```tsx
  useEffect(() => {
    if (id) {
      fetchDetail();
    }
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error(`Failed to load account (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error fetching account');
    } finally {
      setLoading(false);
    }
  };
  ```
  With:
  ```tsx
  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error(`Failed to load account (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error fetching account');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);
  ```

---

#### 2.2 `src/app/assets/[id]/page.tsx`
- **Line 4**:
  Change:
  ```tsx
  import React, { useState, useEffect } from 'react';
  ```
  To:
  ```tsx
  import React, { useState, useEffect, useCallback } from 'react';
  ```

- **Lines 38–59**:
  Replace:
  ```tsx
  useEffect(() => {
    if (id) {
      fetchDetail();
    }
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error(`Failed to load device (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading device detail');
    } finally {
      setLoading(false);
    }
  };
  ```
  With:
  ```tsx
  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error(`Failed to load device (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading device detail');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);
  ```

---

#### 2.3 `src/app/groups/[id]/page.tsx`
- **Line 4**:
  Change:
  ```tsx
  import React, { useState, useEffect } from 'react';
  ```
  To:
  ```tsx
  import React, { useState, useEffect, useCallback } from 'react';
  ```

- **Lines 30–51**:
  Replace:
  ```tsx
  useEffect(() => {
    if (id) {
      fetchDetail();
    }
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error(`Failed to load group (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading group detail');
    } finally {
      setLoading(false);
    }
  };
  ```
  With:
  ```tsx
  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error(`Failed to load group (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading group detail');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);
  ```

---

#### 2.4 `src/app/software/[id]/page.tsx`
- **Line 4**:
  Change:
  ```tsx
  import React, { useState, useEffect } from 'react';
  ```
  To:
  ```tsx
  import React, { useState, useEffect, useCallback } from 'react';
  ```

- **Lines 30–51**:
  Replace:
  ```tsx
  useEffect(() => {
    if (id) {
      fetchDetail();
    }
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/software/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error(`Failed to load software (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading application detail');
    } finally {
      setLoading(false);
    }
  };
  ```
  With:
  ```tsx
  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/software/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error(`Failed to load software (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading application detail');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);
  ```

---

### Blueprint 3: Case-Insensitive Email Query Improvements

#### 3.1 `src/app/api/accounts/[id]/route.ts`
- **Lines 28–41**:
  Replace:
  ```ts
    // Dual resolution: UUID vs Email
    const isUuid = isValidUUID(identifier);
    const accountList = await db
      .select()
      .from(schema.accounts)
      .where(
        isUuid
          ? eq(schema.accounts.id, identifier)
          : or(
              eq(schema.accounts.email, identifier),
              eq(schema.accounts.previousEmail, identifier)
            )
      )
      .limit(1);
  ```
  With:
  ```ts
    // Dual resolution: UUID vs Email (case-insensitive for emails)
    const isUuid = isValidUUID(identifier);
    const searchEmail = identifier.toLowerCase();
    const accountList = await db
      .select()
      .from(schema.accounts)
      .where(
        isUuid
          ? eq(schema.accounts.id, identifier)
          : or(
              eq(schema.accounts.email, searchEmail),
              eq(schema.accounts.previousEmail, searchEmail)
            )
      )
      .limit(1);
  ```

---

#### 3.2 `src/app/api/groups/[id]/route.ts`
- **Lines 36–41**:
  Replace:
  ```ts
    const isUuid = isValidUUID(identifier);
    const groupList = await db
      .select()
      .from(schema.googleGroups)
      .where(isUuid ? eq(schema.googleGroups.id, identifier) : eq(schema.googleGroups.email, identifier))
      .limit(1);
  ```
  With:
  ```ts
    const isUuid = isValidUUID(identifier);
    const searchEmail = identifier.toLowerCase();
    const groupList = await db
      .select()
      .from(schema.googleGroups)
      .where(
        isUuid
          ? eq(schema.googleGroups.id, identifier)
          : eq(schema.googleGroups.email, searchEmail)
      )
      .limit(1);
  ```

---

## 5. Verification Method

### 5.1 Verification Commands
1. **Next.js Production Build**:
   ```bash
   npm run build
   ```
   **Pass Condition**: Zero `react-hooks/exhaustive-deps` warnings for `src/app/{accounts,assets,groups,software}/[id]/page.tsx`, zero errors, exit code `0`.

2. **Next.js Lint**:
   ```bash
   npm run lint
   ```
   **Pass Condition**: Passes with 0 errors and 0 warnings.

3. **E2E Test Suites**:
   ```bash
   node tests/runner.mjs --suite=02
   node tests/runner.mjs --suite=03
   node tests/runner.mjs --suite=07
   npm test
   ```
   **Pass Condition**: 100% of tests pass.

### 5.2 Behavioral Verification
1. **PIN Reveal Auto-Mask**:
   - Open `/assets`, click "Reveal PIN" on any device as `super_admin` or `it_admin`.
   - Verify modal opens and countdown ticks smoothly from 30s to 0s without console warnings.
   - At 0s, verify modal automatically closes, secret is masked, and no React 19 state updater warnings appear in browser console.
2. **Case-Insensitive API Queries**:
   - Query `GET /api/accounts/Amanda@leadgeeksinc.com` (mixed case). Verify HTTP 200 and Amanda account payload returned.
   - Query `GET /api/groups/Operations@leadgeeksinc.com` (mixed case). Verify HTTP 200 and Operations group payload returned.
3. **No Infinite Loops**:
   - Navigate to `/accounts/1`, `/assets/1`, `/groups/1`, `/software/1`.
   - Verify network tab shows exactly 1 fetch request upon page load, not a continuous stream of fetch calls.
   - Click "Refresh" button; verify exactly 1 fetch request executes.
