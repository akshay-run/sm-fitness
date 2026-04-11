# SM FITNESS — Architecture overview

High-level map of the codebase for maintainers. Product rules and scope: [SM_FITNESS_PROJECT_CONTEXT.txt](./SM_FITNESS_PROJECT_CONTEXT.txt).

## Stack

- **Framework:** Next.js (App Router), React, TypeScript.
- **Styling:** Tailwind CSS ([app/globals.css](../app/globals.css)).
- **Backend:** Supabase (PostgreSQL, Auth, Storage); server routes use the **service role** only where required ([lib/supabaseAdmin.ts](../lib/supabaseAdmin.ts)).
- **Email:** Nodemailer + Gmail SMTP ([lib/mailer.ts](../lib/mailer.ts)).
- **Validation:** Zod ([lib/validations/](../lib/validations/)).
- **Dates:** `date-fns` + `date-fns-tz` (IST) ([lib/dateUtils.ts](../lib/dateUtils.ts)).

## Directory layout (main areas)

```text
app/
  (auth)/login/          # Login UI (Supabase Auth)
  (dashboard)/           # Admin UI: members, payments, reports, dashboard home
  api/                   # Route handlers (REST-style JSON APIs)
components/              # Shared UI (forms, sidebar, email templates, etc.)
lib/                     # Auth, Supabase clients, email, cron, formatting, validations
middleware.ts            # Session refresh / route protection (see Next.js docs for latest conventions)
```

## Authentication and authorization

- **Authentication:** Supabase Auth (email/password or configured providers).
- **Authorization:** The app requires a row in the `admins` table for the current user’s UUID ([lib/auth.ts](../lib/auth.ts), dashboard layout). Users without an `admins` row are not treated as admins.

## API surface (representative)

| Area | Routes (under `app/api/`) |
|------|---------------------------|
| Members | `members`, `members/[id]`, `members/[id]/photo` |
| Memberships | `memberships`, `memberships/[id]` |
| Payments | `payments`, `payments/[id]`, `payments/[id]/resend` |
| Plans | `plans` |
| Email | `email` |
| Reports | `reports/revenue`, `reports/members-csv`, `reports/summary` |
| Cron | `cron/reminders` (Bearer or `x-cron-secret`), `cron/backup` (**Bearer only**) — both require `CRON_SECRET` |

## Data rules (summary)

- **Soft delete:** Members use `is_active` (no hard deletes for core entities in normal flows).
- **Membership status:** UI derives “active / expiring / expired” from dates and “today” in IST where applicable; do not rely on a single DB column alone for display logic.
- **Payments:** One payment per membership enforced at application level and should be backed by a DB unique constraint in production ([README.md](../README.md#db-safeguards-production)).

## Configuration

- Environment variables: [ENV_CONFIGURATION.md](./ENV_CONFIGURATION.md), [ENV_SETUP_STEPS.md](./ENV_SETUP_STEPS.md).
- Image domains for `next/image`: derived from `NEXT_PUBLIC_SUPABASE_URL` in [next.config.ts](../next.config.ts).

## Testing

- Unit and integration tests: Vitest ([vitest.config.ts](../vitest.config.ts)).
- Manual / browser flows: [E2E_TEST_MATRIX.md](./E2E_TEST_MATRIX.md), [UAT_CHECKLIST.md](./UAT_CHECKLIST.md).

## CI

GitHub Actions runs `npm ci`, `npm run test`, `npm run lint`, `npm run build` (see [.github/workflows/ci.yml](../.github/workflows/ci.yml)).
