# SM FITNESS — Testing

This project uses **Jest** (via `next/jest`) for unit and API-route integration tests, **React Testing Library** for component tests, and **Playwright** for end-to-end (E2E) tests.

> A Vitest configuration (`vitest.config.ts`) also exists in the repo. Some test
> files still use `vi.mock` / `vi.fn` syntax via the compatibility shim in
> `jest.setup.ts`. Both runners can execute the same test files, but **Jest is the
> default** (`npm test`).

## Prerequisites

- Node.js 20+ (matching the project)
- Install dependencies: `npm install`
- For E2E against a real Supabase project, configure `.env` with the same variables as production (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, etc.)

---

## Unit and integration tests (Jest)

### Run all tests once

```bash
npm test
```

### Watch mode

```bash
npm run test:watch
```

### Coverage

```bash
npm run test:coverage
```

Coverage is collected from `app/`, `components/`, `lib/`, and `hooks/` (excluding `.d.ts`, `node_modules`, and test files). The configured global threshold is **80%** for statements, branches, functions, and lines.

### Alternative: Vitest

If you prefer Vitest, equivalent commands are available:

```bash
npm run test:vitest          # run once
npm run test:vitest:watch    # watch mode
npm run test:vitest:coverage # coverage
```

---

## Test file conventions

Tests live **next to source files** following the `*.test.ts` / `*.test.tsx` naming convention:

```
app/api/members/route.ts        → app/api/members/route.test.ts
components/settings/SettingsClient.tsx → components/settings/SettingsClient.test.tsx
lib/dateUtils.ts                → lib/dateUtils.test.ts
```

| Extension | Jest environment | Notes |
|-----------|-----------------|-------|
| `*.test.ts` | jsdom (default) | API route tests, lib utilities |
| `*.test.tsx` | jsdom (default) | React component tests |

To override the environment for a specific test file, add a docblock at the top:

```ts
/**
 * @jest-environment node
 */
```

Use `@jest-environment node` when a test interacts with Node-only APIs (timers, streams) that conflict with jsdom — e.g. tests that exercise `undici`-based fetch flows.

---

## Configuration files

### `jest.config.ts`

- Uses `next/jest` (SWC transformer) for TypeScript/JSX compilation.
- Default environment: `jsdom`.
- Module alias: `@/` → project root.
- Coverage threshold: 80% global (statements, branches, functions, lines).

### `jest.polyfills.ts` (runs via `setupFiles`)

Polyfills Web APIs that jsdom does not provide but `next/server` and `undici` require:

| Polyfill | Source |
|----------|--------|
| `TextEncoder`, `TextDecoder` | `node:util` |
| `ReadableStream`, `WritableStream`, `TransformStream` | `node:stream/web` |
| `MessagePort`, `MessageChannel`, `BroadcastChannel` | `node:worker_threads` |
| `setImmediate`, `clearImmediate` | `setTimeout` / `clearTimeout` shim |
| `performance.markResourceTiming` | no-op stub |
| `Request`, `Response`, `Headers`, `fetch`, `FormData` | `undici` |

All polyfills are guarded with `if (!globalThis.X)` — they only apply when the native API is missing (i.e. in jsdom, not in node).

### `jest.setup.ts` (runs via `setupFilesAfterEnv`)

- Imports `@testing-library/jest-dom` matchers (`.toBeInTheDocument()`, etc.)
- Provides a `vi` compatibility shim mapping `vi.fn` → `jest.fn`, `vi.mock` → `jest.mock`, etc.

### Vitest / Jest compatibility shim

Many test files use `vi.mock(...)` and `vi.fn()` syntax. At runtime, `jest.setup.ts` assigns a global `vi` object that delegates to Jest equivalents.

**Important caveat:** `vi.mock()` calls are **not hoisted** by Jest (only literal `jest.mock()` calls are hoisted). This works in most cases because `vi.mock` runs at module top-level before imports in jsdom. However, if you add `@jest-environment node` to a test file using `vi.mock`, you **must** convert those calls to `jest.mock` for the mocks to be properly hoisted.

---

## Writing tests

### API route test example

```ts
// app/api/members/route.test.ts
vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(async () => ({ user: { id: "admin-1" }, error: null })),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  createSupabaseAdminClient: () => makeMock(),
}));

describe("members route", () => {
  it("GET returns paginated members", async () => {
    const { GET } = await import("@/app/api/members/route");
    const req = new Request("http://localhost/api/members?page=1&pageSize=25&tab=all");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
```

### Component test example

```tsx
// components/navigation/DashboardSidebar.test.tsx
import { render, screen } from "@testing-library/react";
import { DashboardSidebar } from "./DashboardSidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/members",
}));

it("highlights the active link", () => {
  render(<DashboardSidebar />);
  expect(screen.getByText("Members")).toHaveClass("font-semibold");
});
```

### Mocking Supabase

Most API route tests mock `@/lib/supabaseAdmin` and `@/lib/auth` to avoid real database calls. Follow the patterns in existing test files:

- `app/api/members/route.test.ts` — full Supabase CRUD mock
- `app/api/payments/route.test.ts` — payment queries mock
- `app/api/settings/route.test.ts` — settings upsert mock

---

## End-to-end tests (Playwright)

E2E tests live in the `e2e/` directory.

### Install browsers (first time)

```bash
npx playwright install
```

### Local dev server

By default `playwright.config.ts` starts `npm run dev` unless `PLAYWRIGHT_SKIP_WEB_SERVER` is set. To use an already-running server:

```bash
set PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000
npx playwright test
```

(On PowerShell use `$env:PLAYWRIGHT_BASE_URL=...`.)

### Full flows (optional)

Set admin credentials used only on a **staging** or **local** project:

```bash
set E2E_ADMIN_EMAIL=owner@example.com
set E2E_ADMIN_PASSWORD=your-secret
npx playwright test
```

The smoke spec skips authenticated scenarios when these variables are missing.

### Run E2E via npm

```bash
npm run test:e2e
```

---

## CI

1. Run `npm run build` and `npm test` on every push.
2. For Playwright in CI:
   - `npx playwright install --with-deps`
   - `npx playwright test`
   - The config starts `npm run dev` automatically unless you set `PLAYWRIGHT_SKIP_WEB_SERVER=1`.
   - Alternatively, start `npm start` in another job, set `PLAYWRIGHT_BASE_URL`, and use `PLAYWRIGHT_SKIP_WEB_SERVER=1`.

---

## Database and migrations

Apply SQL in `supabase/migrations/` to your Supabase project before relying on Settings, `gym_settings`, `plans.default_price`, or new `members` columns. Create the `gym-assets` storage bucket (or set `SUPABASE_GYM_ASSETS_BUCKET`) for logo and UPI QR uploads.

---

## npm scripts reference

| Script | Runner | Description |
|--------|--------|-------------|
| `npm test` | Jest | Run all tests once |
| `npm run test:watch` | Jest | Watch mode |
| `npm run test:coverage` | Jest | Run with coverage report |
| `npm run test:vitest` | Vitest | Run all tests once (alternative) |
| `npm run test:vitest:watch` | Vitest | Watch mode (alternative) |
| `npm run test:vitest:coverage` | Vitest | Coverage report (alternative) |
| `npm run test:e2e` | Playwright | End-to-end tests |
