# SM FITNESS — testing

This project uses **Vitest** for unit and API-route integration tests, **React Testing Library** for component tests, and **Playwright** for end-to-end (E2E) tests.

## Prerequisites

- Node.js 20+ (matching the project)
- Install dependencies: `npm install`
- For E2E against a real Supabase project, configure `.env` with the same variables as production (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, etc.)

## Unit and integration tests (Vitest)

Run all tests once:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

Coverage:

```bash
npm run test:coverage
```

Tests live next to source files (e.g. `app/api/members/route.test.ts`) or under `lib/**/*.test.ts`.

## End-to-end tests (Playwright)

Install browsers once (after adding Playwright):

```bash
npx playwright install
```

### Local dev server

By default `playwright.config.ts` starts `npm run dev` unless `CI` is set. To use an already-running server:

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

### CI

- Run `npm run build` and `npm test` on every push.
- For Playwright in CI: run `npx playwright install --with-deps`, then `npx playwright test` (the config starts `npm run dev` automatically unless you set `PLAYWRIGHT_SKIP_WEB_SERVER=1`). Alternatively start `npm start` in another job, set `PLAYWRIGHT_BASE_URL`, and use `PLAYWRIGHT_SKIP_WEB_SERVER=1`.

## Database and migrations

Apply SQL in `supabase/migrations/` to your Supabase project before relying on Settings, `gym_settings`, `plans.default_price`, or new `members` columns. Create the `gym-assets` storage bucket (or set `SUPABASE_GYM_ASSETS_BUCKET`) for logo and UPI QR uploads.
