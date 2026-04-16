# Next.js Jest Testing Skill
### Based on *The Art of Software Testing* (Myers, Badgett, Sandler — 3rd Ed.)

---

## 🧭 Purpose

This file is a complete instruction set for an AI agent to write **industrial-standard Jest tests** for a Next.js project. The agent must read and follow every section before writing a single line of test code.

The agent's mindset must be:
> *"Testing is the process of executing a program with the intent of **finding errors**."*
> — Glenford J. Myers

Tests are not written to prove a program works. They are written to **find where it breaks**.

---

## 🧠 Core Testing Philosophy (Must Internalize)

### The Destructive Mindset
- A **successful test** is one that finds a bug.
- An **unsuccessful test** is one that runs but finds nothing — not because there are no bugs, but because the test was poorly designed.
- Always assume the program contains errors. Start from that assumption.

### The 10 Principles (from Myers — apply all of them)

| # | Principle | How the Agent Must Apply It |
|---|-----------|----------------------------|
| 1 | Every test case must define the **expected output** before running | Always write `expect(...)` with a precise assertion, never vague checks |
| 2 | A programmer should not test their own code | Agent writes tests independently of how the code was written — test the spec, not the implementation |
| 3 | Test cases must be written for **invalid and unexpected inputs**, not just valid ones | Always add edge-case and error-path tests |
| 4 | Examine whether the program does what it is **NOT supposed to do** | Test for unwanted side effects, unexpected state mutations, unintended renders |
| 5 | Avoid throwaway tests — all tests must be **reusable and maintained** | Write tests in files, use `describe` blocks, name tests descriptively |
| 6 | Inspect all test results thoroughly | Every assertion must be specific; avoid `toBeTruthy()` when `toBe('exact value')` is possible |
| 7 | Do not assume no errors will be found | Never skip a test category because "this part looks simple" |
| 8 | Sections with more known bugs are likely to have **more hidden bugs** | Add more tests to files/components that have already had bugs fixed |
| 9 | Test case design is a **creative, intellectual task** | Think about the spec, not just the happy path |
| 10 | Define expected results before running — **pre-define assertions** | Write the `expect` before the `act` when possible (TDD) |

---

## 📐 Test Case Design Methodology

The agent must apply these methods **in order** for every unit being tested.

---

### Step 1 — Equivalence Partitioning (Black-Box)

Split all inputs into groups (equivalence classes) where members are expected to behave identically. Test one value from each class.

**Rules:**
- If input accepts a range (e.g., quantity: 1–999), identify:
  - ✅ Valid class: within range
  - ❌ Invalid class: below minimum, above maximum
- If input accepts specific values (e.g., role: `"admin" | "user" | "guest"`), identify:
  - ✅ One valid class per value
  - ❌ One invalid class for anything else (e.g., `""`, `null`, `"superuser"`)
- If input is boolean, test both `true` and `false` explicitly
- If input is optional, test both provided and omitted

**Next.js Application:**
```ts
// Function: getUserDiscount(role: string, orderTotal: number)
// Equivalence classes:
// role: ["admin", "user", "guest"] → valid | [null, "", "hacker"] → invalid
// orderTotal: [1–999] → valid | [0, -1, 1000] → boundary/invalid

describe('getUserDiscount', () => {
  // Valid classes
  it('returns 20% for admin role', () => {
    expect(getUserDiscount('admin', 100)).toBe(20);
  });
  it('returns 10% for user role', () => {
    expect(getUserDiscount('user', 100)).toBe(10);
  });
  // Invalid class
  it('throws or returns 0 for unknown role', () => {
    expect(getUserDiscount('hacker', 100)).toBe(0);
  });
  it('handles null role gracefully', () => {
    expect(() => getUserDiscount(null, 100)).not.toThrow();
  });
});
```

---

### Step 2 — Boundary Value Analysis (Black-Box)

Errors cluster at the **edges** of equivalence classes. Always test: minimum, maximum, just-below-minimum, just-above-maximum.

**Rules:**
- For a range [A, B]: test `A-1`, `A`, `B`, `B+1`
- For a count (e.g., 1–255 records): test `0`, `1`, `255`, `256`
- For strings: test empty string `""`, single character, max-length string, max+1
- For arrays: test `[]`, `[oneItem]`, `[maxItems]`, `[maxItems+1]`
- For ordered sets (lists, tables): always test the **first** and **last** element

**Next.js Application:**
```ts
// API Route: GET /api/products?page=1&limit=50
describe('pagination boundary values', () => {
  it('handles page=1 (minimum)', async () => { ... });
  it('handles page=0 (below minimum — invalid)', async () => { ... });
  it('handles limit=50 (maximum)', async () => { ... });
  it('handles limit=51 (above maximum — should error or clamp)', async () => { ... });
  it('handles empty result set (0 products)', async () => { ... });
});
```

---

### Step 3 — Cause-Effect Graphing (Black-Box)

When multiple input conditions combine to produce outputs, map each combination.

For functions with multiple boolean/conditional inputs, test **all meaningful combinations**.

**Next.js Application:**
```ts
// Component: <SubmitButton isLoading={bool} isDisabled={bool} userRole={string} />
// Causes: isLoading, isDisabled, userRole === 'admin'
// Effects: button text, disabled state, visibility

describe('SubmitButton combinations', () => {
  it('shows "Loading..." and is disabled when isLoading=true', () => { ... });
  it('is disabled when isDisabled=true regardless of loading', () => { ... });
  it('shows "Admin Submit" for admin role when not loading', () => { ... });
  it('is enabled when isLoading=false and isDisabled=false', () => { ... });
});
```

---

### Step 4 — Error Guessing (Black-Box)

Use experience and intuition to guess where bugs are most likely. These are high-yield test cases.

**Common error-prone patterns in Next.js — always test these:**
- `null` / `undefined` passed to a component prop
- Empty arrays `[]` or objects `{}` where data is expected
- Async functions called without `await`
- API routes called with missing required body fields
- Component renders with no children when children are expected
- Server Components receiving client-only browser APIs (like `window`)
- Environment variables (`process.env.X`) being undefined
- Hydration mismatches between SSR and client renders
- Middleware redirecting in a loop
- `useRouter()` called outside a `<Router>` context in tests

---

### Step 5 — White-Box Coverage (Logic-Driven)

After black-box tests, audit internal logic coverage. Achieve at minimum **Decision Coverage** — every `if/else`, `switch`, ternary, and `try/catch` branch must have at least one true and one false test.

**Coverage hierarchy (apply in order of feasibility):**

| Level | Requirement | Jest Tool |
|-------|-------------|-----------|
| Statement | Every line executes | `--coverage` |
| Decision/Branch | Every `if/else` takes both paths | `--coverage` → look at Branch % |
| Condition | Every boolean sub-expression is true and false | Manual test design |
| Decision+Condition | Both of the above | Manual test design |
| Multiple Condition | All combinations of conditions in a decision | Combinatorial test design |

**Never accept < 80% branch coverage on business logic files.**

---

## 🏗️ Next.js Test Categories

The agent must produce tests for **all applicable categories** below.

---

### Category 1 — Unit Tests: Utility Functions

**File pattern:** `lib/`, `utils/`, `helpers/`, `services/`

**Agent Checklist:**
- [ ] Test every exported function
- [ ] Apply equivalence partitioning to all inputs
- [ ] Apply boundary value analysis to all numeric/string/array inputs
- [ ] Test all error paths (`throw`, `return null`, `return undefined`)
- [ ] Test with `null`, `undefined`, `NaN`, `""`, `[]`, `{}` for each input
- [ ] Mock external dependencies (`fetch`, `fs`, database clients)

```ts
// Template
import { myUtil } from '@/lib/myUtil';

describe('myUtil', () => {
  describe('valid inputs', () => {
    it('returns expected result for typical input', () => {
      expect(myUtil('valid')).toBe('expected');
    });
  });

  describe('boundary values', () => {
    it('handles empty string', () => { ... });
    it('handles maximum length string', () => { ... });
  });

  describe('invalid inputs', () => {
    it('throws TypeError for null input', () => {
      expect(() => myUtil(null)).toThrow(TypeError);
    });
    it('handles undefined gracefully', () => {
      expect(myUtil(undefined)).toBeNull();
    });
  });

  describe('side effects', () => {
    it('does NOT mutate the original input object', () => {
      const input = { a: 1 };
      myUtil(input);
      expect(input).toEqual({ a: 1 }); // unchanged
    });
  });
});
```

---

### Category 2 — Unit Tests: React Components

**File pattern:** `components/`, `app/**/*.tsx`, `pages/**/*.tsx`

**Agent Checklist:**
- [ ] Render with all required props (happy path)
- [ ] Render with each optional prop both provided and omitted
- [ ] Render with empty/null/undefined data props
- [ ] Test all user interactions (`click`, `change`, `submit`, `focus`, `blur`)
- [ ] Test conditional rendering paths (loading, error, empty, populated states)
- [ ] Test accessibility (role, aria-label, aria-disabled)
- [ ] Do NOT test internal implementation (no `instance()`, no `.state()`)
- [ ] Use `@testing-library/react` — query by role, label, text (not by class or id)

```ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  const defaultProps = {
    title: 'Test Title',
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Happy path
  it('renders the title correctly', () => {
    render(<MyComponent {...defaultProps} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  // ✅ Conditional renders
  it('shows loading spinner when isLoading=true', () => {
    render(<MyComponent {...defaultProps} isLoading={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows error message when error prop is provided', () => {
    render(<MyComponent {...defaultProps} error="Something went wrong" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('renders empty state when items=[]', () => {
    render(<MyComponent {...defaultProps} items={[]} />);
    expect(screen.getByText(/no items/i)).toBeInTheDocument();
  });

  // ✅ User interactions
  it('calls onSubmit with correct data when form is submitted', async () => {
    const user = userEvent.setup();
    render(<MyComponent {...defaultProps} />);

    await user.type(screen.getByLabelText(/name/i), 'John');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(defaultProps.onSubmit).toHaveBeenCalledWith({ name: 'John' });
    expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
  });

  // ✅ Invalid / unexpected behavior
  it('does not call onSubmit when form is submitted empty', async () => {
    const user = userEvent.setup();
    render(<MyComponent {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  // ✅ Unwanted side effects (Principle 4 from Myers)
  it('does not navigate away when submit fails', async () => {
    defaultProps.onSubmit.mockRejectedValueOnce(new Error('fail'));
    render(<MyComponent {...defaultProps} />);
    // assert navigation mock was NOT called
  });
});
```

---

### Category 3 — Unit Tests: Custom Hooks

**File pattern:** `hooks/`

**Agent Checklist:**
- [ ] Test return values for each state (initial, loading, success, error)
- [ ] Test that state updates correctly after async operations
- [ ] Test cleanup (unmount, cancel effects)
- [ ] Test with different argument combinations (equivalence partitioned)
- [ ] Mock all external calls (`fetch`, `localStorage`, `useRouter`)

```ts
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '@/hooks/useMyHook';

describe('useMyHook', () => {
  it('returns initial state correctly', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets isLoading=true during async fetch', async () => {
    const { result } = renderHook(() => useMyHook());
    act(() => { result.current.fetch(); });
    expect(result.current.isLoading).toBe(true);
  });

  it('populates data on successful fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, name: 'Test' }),
    });
    const { result } = renderHook(() => useMyHook());
    await act(async () => { await result.current.fetch(); });
    expect(result.current.data).toEqual({ id: 1, name: 'Test' });
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error on fetch failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useMyHook());
    await act(async () => { await result.current.fetch(); });
    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });
});
```

---

### Category 4 — Integration Tests: API Routes

**File pattern:** `app/api/**`, `pages/api/**`

**Agent Checklist:**
- [ ] Test each HTTP method (GET, POST, PUT, DELETE, PATCH)
- [ ] Test with valid request body (happy path)
- [ ] Test with missing required fields → expect `400`
- [ ] Test with invalid field types (string where number expected) → expect `400`
- [ ] Test with unauthorized request → expect `401` or `403`
- [ ] Test with nonexistent resource → expect `404`
- [ ] Test with duplicate resource creation → expect `409`
- [ ] Test database/service error handling → expect `500`
- [ ] Test with maximum and minimum valid payloads (boundary values)
- [ ] Mock all external services (database, email, third-party APIs)

```ts
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/users/route';

describe('POST /api/users', () => {
  // ✅ Happy path
  it('creates user and returns 201 with valid body', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { name: 'John Doe', email: 'john@example.com' },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(201);
    expect(JSON.parse(res._getData())).toMatchObject({ name: 'John Doe' });
  });

  // ❌ Missing fields
  it('returns 400 when name is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { email: 'john@example.com' },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  // ❌ Invalid field types
  it('returns 400 when email is not a valid email format', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { name: 'John', email: 'not-an-email' },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  // ❌ Boundary: empty string fields
  it('returns 400 when name is empty string', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { name: '', email: 'john@example.com' },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  // ❌ Unauthorized
  it('returns 401 when no auth token is provided', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { name: 'John', email: 'j@j.com' } });
    // no Authorization header
    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  // ❌ Duplicate
  it('returns 409 when email already exists', async () => {
    // mock DB to throw duplicate error
  });

  // ❌ Wrong method
  it('returns 405 for GET request', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});
```

---

### Category 5 — Integration Tests: Server Actions

**File pattern:** `app/**` using `'use server'`

**Agent Checklist:**
- [ ] Test successful action with valid data
- [ ] Test action with invalid/missing Zod schema fields
- [ ] Test action with unauthenticated session
- [ ] Test action with unauthorized role
- [ ] Test action with duplicate data
- [ ] Test that `revalidatePath` / `revalidateTag` is called on success
- [ ] Test action does NOT call revalidate on failure

```ts
import { createPost } from '@/app/actions/createPost';
import { auth } from '@/lib/auth';

jest.mock('@/lib/auth');
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

describe('createPost server action', () => {
  it('creates post successfully for authenticated user', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: '1', role: 'admin' } });
    const result = await createPost({ title: 'Hello', content: 'World' });
    expect(result.success).toBe(true);
  });

  it('returns error when user is not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const result = await createPost({ title: 'Hello', content: 'World' });
    expect(result.error).toBe('Unauthorized');
  });

  it('returns validation error when title is empty', async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: '1' } });
    const result = await createPost({ title: '', content: 'World' });
    expect(result.error).toContain('title');
  });
});
```

---

### Category 6 — Integration Tests: Middleware

**File pattern:** `middleware.ts`

**Agent Checklist:**
- [ ] Test redirect for unauthenticated access to protected routes
- [ ] Test pass-through for public routes
- [ ] Test redirect for wrong role (e.g., non-admin accessing `/admin`)
- [ ] Test that middleware does NOT redirect on auth pages (avoid loops)
- [ ] Test `matcher` config covers intended paths

```ts
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

function makeRequest(path: string, token?: string) {
  const req = new NextRequest(`http://localhost${path}`);
  if (token) req.cookies.set('session', token);
  return req;
}

describe('middleware', () => {
  it('redirects unauthenticated user from /dashboard to /login', async () => {
    const res = await middleware(makeRequest('/dashboard'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('allows authenticated user to access /dashboard', async () => {
    const res = await middleware(makeRequest('/dashboard', 'valid-token'));
    expect(res.status).toBe(200); // or next()
  });

  it('allows unauthenticated access to /login without redirect loop', async () => {
    const res = await middleware(makeRequest('/login'));
    expect(res.headers.get('location')).not.toContain('/login');
  });
});
```

---

### Category 7 — Function/System Tests: Page-Level

These correspond to **Function Testing** (Myers Ch. 5) — testing the program against its external specification.

**Agent Checklist:**
- [ ] Test page renders with all required data (SSR/SSG mocked)
- [ ] Test page shows correct content for different user roles
- [ ] Test page error state when data fetch fails
- [ ] Test page loading state (Suspense boundaries)
- [ ] Test SEO metadata (`<title>`, `<meta>`)
- [ ] Test that page does not render content for unauthorized users

```ts
// For App Router pages, test the Server Component output
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';

jest.mock('@/lib/getData', () => ({
  getDashboardData: jest.fn().mockResolvedValue({ stats: { users: 42 } }),
}));

describe('DashboardPage', () => {
  it('renders user stats correctly', async () => {
    render(await DashboardPage());
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows error boundary content when data fetch fails', async () => {
    require('@/lib/getData').getDashboardData.mockRejectedValueOnce(new Error('DB down'));
    // test error.tsx fallback
  });
});
```

---

### Category 8 — Security Tests

**Agent Checklist (MUST test all):**
- [ ] SQL/NoSQL injection attempt in input fields
- [ ] XSS payload in user-generated content (`<script>alert(1)</script>`)
- [ ] CSRF — verify state-changing routes require valid session
- [ ] Path traversal in file-related endpoints (`../../etc/passwd`)
- [ ] Privilege escalation — user accessing admin routes
- [ ] Unintended data exposure — API response leaking sensitive fields (password, tokens)
- [ ] Rate limiting — verify throttled after N requests (if implemented)

```ts
describe('Security: POST /api/users', () => {
  it('does not return password hash in response', async () => {
    const res = await fetch('/api/users/1');
    const data = await res.json();
    expect(data).not.toHaveProperty('password');
    expect(data).not.toHaveProperty('passwordHash');
  });

  it('sanitizes XSS in name field', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { name: '<script>alert(1)</script>', email: 'x@x.com' },
    });
    await handler(req, res);
    const data = JSON.parse(res._getData());
    expect(data.name).not.toContain('<script>');
  });

  it('blocks user from accessing another user\'s data', async () => {
    // authenticated as user 1, try to GET user 2's private data
  });
});
```

---

### Category 9 — Performance Tests (Lightweight)

**Agent Checklist:**
- [ ] Utility functions complete within reasonable time for large inputs
- [ ] No N+1 query patterns — mock DB and count calls
- [ ] No infinite re-render loops in components

```ts
describe('Performance: processLargeList', () => {
  it('processes 10,000 items in under 100ms', () => {
    const input = Array.from({ length: 10000 }, (_, i) => ({ id: i }));
    const start = Date.now();
    processLargeList(input);
    expect(Date.now() - start).toBeLessThan(100);
  });
});

describe('Performance: API handler', () => {
  it('calls the database only once per request (no N+1)', async () => {
    const dbSpy = jest.spyOn(db, 'query');
    await handler(req, res);
    expect(dbSpy).toHaveBeenCalledTimes(1);
  });
});
```

---

## 📁 File & Folder Conventions

```
__tests__/
  unit/
    lib/            → utility function tests
    hooks/          → custom hook tests
    components/     → React component tests
  integration/
    api/            → API route tests
    actions/        → Server action tests
    middleware/     → Middleware tests
  pages/            → Full page render tests

# OR co-located (acceptable for components):
components/
  Button/
    Button.tsx
    Button.test.tsx
```

---

## ⚙️ Jest Configuration

The agent must verify this config exists in `jest.config.ts` (or `jest.config.js`):

```ts
import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

export default createJestConfig(config);
```

```ts
// jest.setup.ts
import '@testing-library/jest-dom';
```

---

## 🔖 Test Naming Convention

Every test name must answer: **"What does it do, under what conditions, and what is the expected result?"**

```
✅ Good: "returns 401 when Authorization header is missing"
✅ Good: "shows empty state message when items array is empty"  
✅ Good: "calls onSubmit exactly once when form is valid and submitted"
❌ Bad: "works correctly"
❌ Bad: "handles error"
❌ Bad: "test 1"
```

Use this pattern:
```
it('[action/behavior] when [condition]', () => { ... })
it('[function] returns [result] for [input]', () => { ... })
```

---

## 🚦 Agent Execution Workflow

When given a file or module to test, the agent MUST follow these steps in order:

### Step 1 — Analyze the Spec (Not the Code)
- Read what the function/component is **supposed** to do
- List all inputs, outputs, states, and behaviors described

### Step 2 — Design Test Cases (Before Writing Code)
For each unit:
1. List all equivalence classes (valid and invalid)
2. Identify all boundary values
3. List all cause-effect combinations (when multiple conditions interact)
4. List error-guessing candidates (null, empty, max, concurrent, etc.)

### Step 3 — Write Tests
- Write `describe` blocks first to define the structure
- Write all `it()` descriptions before filling bodies
- Fill in assertions ensuring each uses the most precise matcher available

### Step 4 — Coverage Audit
- Run `jest --coverage`
- Identify any branch < 80%
- Add targeted tests for uncovered branches

### Step 5 — Side Effect Checks (Myers Principle 4 & 6)
For every function/component, ask:
- Does it mutate state it shouldn't?
- Does it trigger effects it shouldn't (navigation, alerts, API calls)?
- Add tests that **assert what did NOT happen**, not just what did

---

## ✅ Pre-Commit Test Quality Checklist

Before marking tests done, the agent must verify:

- [ ] All equivalence classes (valid + invalid) are covered
- [ ] All boundary values (min, max, min-1, max+1) are covered
- [ ] Every `if/else` and ternary has both branches covered
- [ ] `null` and `undefined` are tested for all inputs
- [ ] Empty string, empty array, and empty object are tested where applicable
- [ ] Error paths (`throw`, rejected promises, network failures) are tested
- [ ] No test uses `toBeTruthy()` or `toBeFalsy()` where a specific value is assertable
- [ ] No test name says "works", "handles", "test", or "it works"
- [ ] Every test has exactly one behavior under test (single responsibility)
- [ ] Mocks are reset between tests (`beforeEach(() => jest.clearAllMocks())`)
- [ ] Tests do not depend on execution order
- [ ] Coverage report shows ≥ 80% branches across all business logic files

---

## 📚 Reference: Myers Testing Principles Applied to Next.js

| Myers Principle | Next.js Application |
|-----------------|---------------------|
| Test to find errors, not to confirm correctness | Write tests that try to break each component/API |
| Define expected output before running | Write `expect(...)` assertions before calling `act()` |
| Test invalid + unexpected inputs | Always add null, empty, malformed, and out-of-range test cases |
| Test what the program should NOT do | Add negative assertions: `expect(fn).not.toHaveBeenCalled()` |
| Preserve test cases — never throwaway | All tests in committed files, never ad-hoc console testing |
| Error-prone sections need more tests | If a file has had bugs, add 2x the normal test cases |
| System test checks against objectives, not spec | E2E or page-level tests verify user-facing outcomes |
| Stress test under peak load | Test APIs with max payload, components with max list length |
| Security test by attempting to subvert | Always test auth bypass, XSS, and data leakage |

---

*This skill is based on the foundational testing philosophy of Glenford J. Myers,*
*"The Art of Software Testing" (3rd Ed., 2012), adapted for Next.js + Jest.*
