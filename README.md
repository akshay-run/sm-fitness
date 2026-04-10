# SM FITNESS

Admin-only gym management PWA: members, memberships, payments (cash + UPI QR), email (Nodemailer), dashboard, and reports. Built with Next.js (App Router), Supabase, and Tailwind CSS.

## Documentation index

| Resource | Description |
|----------|-------------|
| [docs/README.md](docs/README.md) | Index of all project docs. |
| [docs/ENV_SETUP_STEPS.md](docs/ENV_SETUP_STEPS.md) | **Start here for `.env`:** step-by-step from install to Vercel. |
| [docs/ENV_CONFIGURATION.md](docs/ENV_CONFIGURATION.md) | Full `.env` variable reference, security, troubleshooting. |
| [docs/ENV_SETUP_CHECKLIST.md](docs/ENV_SETUP_CHECKLIST.md) | Quick env checklist before first run. |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Codebase layout, auth, API map, data rules. |
| [docs/UAT_CHECKLIST.md](docs/UAT_CHECKLIST.md) | Pre-release acceptance testing. |
| [docs/E2E_TEST_MATRIX.md](docs/E2E_TEST_MATRIX.md) | Test cases, slow-network checks, automated gate log. |
| [.env.example](.env.example) | Safe template (copy to `.env.local`; do not commit secrets). |

## Features

- **Members:** Create, edit, soft deactivate; auto member code; photo upload or webcam (compressed).
- **Memberships:** Plans (monthly/quarterly/half-yearly/annual), custom fee, IST dates, renewal rules.
- **Payments:** Cash or UPI (QR + manual confirm), one payment per membership, receipt numbering, HTML email receipt.
- **Email:** Welcome, receipt, expiry reminders (cron); duplicate prevention and logs; resend.
- **Dashboard:** Stats, revenue (this month vs last), upcoming renewals, recent payments.
- **Reports:** CSV export, monthly revenue summary.
- **Access:** Supabase Auth with an explicit `admins` table check (no privilege escalation via login alone).
- **Cron:** Reminders and keep-alive ping; authenticate with `x-cron-secret` header only.
- **PWA:** Manifest and install-friendly baseline.

## Tech stack

- Next.js (App Router, TypeScript), Tailwind CSS  
- Supabase (PostgreSQL, Auth, Storage)  
- Nodemailer (Gmail SMTP), Zod, date-fns + date-fns-tz, qrcode  
- Vercel (hosting + cron)  
- Vitest + Testing Library (unit/integration tests)  
- GitHub Actions CI: `npm ci`, `test`, `lint`, `build` (see [.github/workflows/ci.yml](.github/workflows/ci.yml))

## Project structure (overview)

```text
app/
  (auth)/login/       # Sign-in
  (dashboard)/       # Admin UI: home, members, memberships, payments, reports
  api/               # JSON API routes (members, payments, cron, email, reports, …)
components/          # UI, forms, navigation, email templates
lib/                 # Supabase clients, auth, mailer, validations, date/IST helpers
middleware.ts        # Auth/session handling for protected routes
docs/                # Guides: env, UAT, architecture, E2E matrix
```

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Local setup

### 1. Install

```bash
npm install
```

### 2. Environment

Follow **[docs/ENV_SETUP_STEPS.md](docs/ENV_SETUP_STEPS.md)** for a full sequence, or **[docs/ENV_CONFIGURATION.md](docs/ENV_CONFIGURATION.md)** for the variable reference only.

Minimal template:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GMAIL_USER=
GMAIL_APP_PASSWORD=

NEXT_PUBLIC_UPI_ID=
NEXT_PUBLIC_GYM_NAME=SM FITNESS

CRON_SECRET=
SUPABASE_MEMBER_PHOTO_BUCKET=sm-fitness-member-photo
```

Copy from [.env.example](.env.example) to **`.env.local`** at the repo root (never commit). On Windows (PowerShell): `Copy-Item .env.example .env.local`.

### 3. Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Supabase prerequisites

Before full flows work:

- Tables: `members`, `memberships`, `payments`, `plans`, `email_logs`, `admins`, counter tables as per your schema.
- **Admin access:** Insert your auth user’s UUID into `admins` (the app denies dashboard/API access otherwise).
- Seed `plans` (e.g. Monthly, Quarterly, Half-Yearly, Annual).
- **Storage:** Private bucket whose name matches `SUPABASE_MEMBER_PHOTO_BUCKET` (default `sm-fitness-member-photo`).
- RLS policies appropriate for your security model.
- RPC: `next_member_code()`, `next_receipt_number()` with seeded counter rows.

### DB safeguards (production)

- Unique constraint: one payment per membership, e.g.  
  `alter table payments add constraint payments_membership_id_unique unique (membership_id);`
- Seed counter rows for member and receipt sequences as required by your RPCs.

## Cron

Configured in `vercel.json` (reminders, ping). Call with header:

```http
x-cron-secret: <CRON_SECRET>
```

Query-string secrets are not supported (avoid leakage in logs and URLs).

## Testing and quality

```bash
npm run test
npm run test:watch
npm run test:coverage
npm run lint
npm run build
```

Tests cover date helpers, Zod schemas, RPC helpers, core API routes, email helpers, cron verification, UI components (e.g. sidebar), and more. Full browser E2E is manual; see [docs/E2E_TEST_MATRIX.md](docs/E2E_TEST_MATRIX.md).

## Deployment (Vercel)

1. Set all environment variables in Vercel (same names as local).  
2. Confirm Supabase production project: schema, RLS, bucket, `admins`, RPCs.  
3. Deploy and run through [docs/UAT_CHECKLIST.md](docs/UAT_CHECKLIST.md).

## Known limitations

- Next.js may warn that the `middleware` convention is deprecated in favor of `proxy`; migration can be scheduled separately.  
- UPI is manual confirmation (no payment gateway).  
- Automated tests use mocks; live Supabase flows rely on UAT/manual checks.

## Future improvements

- Optional Playwright (or similar) for smoke E2E in CI.  
- Structured Supabase migrations in-repo for repeatable schema rollout.
