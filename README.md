# SM FITNESS

Admin-only Gym Management System (PWA) built with Next.js, Supabase, and Tailwind CSS.

## Overview

SM FITNESS is designed for a single gym owner/admin to manage:
- Members (create, edit, soft deactivate)
- Membership lifecycle (plans, renewals, date logic in IST)
- Payments (cash + UPI QR, manual confirmation, one payment per membership)
- Email notifications (welcome, receipt, reminders, resend)
- Dashboard analytics and reports (CSV export, revenue summary)

## Tech Stack

- Next.js (App Router, TypeScript)
- Tailwind CSS
- Supabase (PostgreSQL, Auth, Storage)
- Nodemailer (Gmail SMTP)
- Zod
- date-fns + date-fns-tz
- qrcode
- Vercel (deployment + cron)
- Vitest + Testing Library (unit/integration tests)

## Current Implementation Status

Steps 1-12 are implemented in code:
- Project setup and auth
- Member CRUD + photo capture/upload/compression
- Membership flow + renewal logic
- Payment flow + receipt numbering
- Email triggers + resend + logging
- Cron reminders + keep-alive ping
- Dashboard + reports + print receipt
- PWA manifest, install prompt, and baseline service worker

## Local Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GMAIL_USER=
GMAIL_APP_PASSWORD=

NEXT_PUBLIC_UPI_ID=
NEXT_PUBLIC_GYM_NAME=SM FITNESS

CRON_SECRET=
```

### 3) Run locally

```bash
npm run dev
```

App runs at `http://localhost:3000`.

## Supabase Prerequisites

Before running end-to-end flows, ensure:
- All tables from project context exist (`members`, `memberships`, `payments`, `plans`, `email_logs`, `admins`, counters).
- RLS is enabled and policies are correctly configured.
- Only users explicitly present in `admins` are allowed to use the app (no auto-owner bootstrap on login).
- `plans` is seeded (`Monthly`, `Quarterly`, `Half-Yearly`, `Annual`).
- Storage bucket `member-photos` exists and is private.

### Required SQL RPC Functions

1. `next_member_code()`  
   Generates atomic member codes (e.g. `GYM-001`).

2. `next_receipt_number()`  
   Generates atomic yearly-reset receipt numbers (e.g. `RCP-2026-0001`).

## DB Safeguards (Required for Production)

- Add DB-level unique guarantee for one payment per membership:

```sql
alter table payments
add constraint payments_membership_id_unique unique (membership_id);
```

- Ensure counter tables have initial rows:
  - `member_code_counter(id=1)`
  - `receipt_counter(id=1)`

- Apply migrations in safe order:
  1) Tables
  2) Seed `plans`
  3) Counter seed rows
  4) RPC functions
  5) Constraints/indexes
  6) RLS policies

## Cron Endpoints

Configured in `vercel.json`:
- `/api/cron/reminders` -> daily reminders at 8:00 AM IST
- `/api/cron/ping` -> keep-alive ping every 3 days

Both require `CRON_SECRET` via:
- header: `x-cron-secret`

Query-string secret is intentionally not supported to avoid secret leakage in logs/URLs.

## Testing

Commands:

```bash
npm run test
npm run test:watch
npm run test:coverage
npm run lint
npm run build
```

Current automated baseline includes unit/integration tests for:
- Date helpers
- Zod schemas
- RPC wrappers
- Core API routes (`members`, `memberships`, `payments`, `cron/reminders`, `reports/members-csv`)
- Email duplicate-check helper

## Deployment (Vercel)

1. Set all required env vars in Vercel Project Settings.
2. Confirm Supabase project and DB objects are production-ready.
3. Deploy.
4. Validate:
   - Auth flow
   - Member/membership/payment flows
   - Email send + resend
   - Cron endpoints using secret
   - Reports export

## UAT and Release Checklist

See: [`docs/UAT_CHECKLIST.md`](docs/UAT_CHECKLIST.md)

## Known Limitations

- Middleware deprecation warning from Next.js (`middleware` to `proxy`) remains non-blocking but should be migrated in a future update.
- UPI confirmation is manual by design (no gateway/webhook).
- Full E2E browser automation is not yet added (unit/integration baseline is present).

## Future Improvements

- Add Playwright E2E suite for full user flows.
- Add CI coverage gate.
- Add structured migration files for Supabase schema lifecycle.
