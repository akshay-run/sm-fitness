# Environment configuration (complete guide)

This document explains every environment variable the SM FITNESS app reads, how to obtain each value, and how to verify your setup.

**Prefer a linear walkthrough?** Start with **[ENV_SETUP_STEPS.md](./ENV_SETUP_STEPS.md)** (copy file → Supabase → Gmail → … → Vercel). For a short checkbox-only list, see [`ENV_SETUP_CHECKLIST.md`](./ENV_SETUP_CHECKLIST.md).

## File names

| File | Purpose |
|------|---------|
| `.env.local` | Recommended for local development (Next.js loads it automatically). |
| `.env` | Also supported; never commit either file (see root `.gitignore`). |
| `.env.example` | Template only (safe to commit; no secrets). |

Copy from the repo root:

```bash
cp .env.example .env.local
```

Then fill in values below.

## Variable reference

### Supabase (required)

| Variable | Scope | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Project URL from Supabase Dashboard. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Anonymous key for browser and server helpers using the user session. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Service role key for server-only admin operations (API routes). Never expose to the client. |

**Where to get:** Supabase Dashboard → **Project Settings** → **API**.

**Verify:** `NEXT_PUBLIC_SUPABASE_URL` must match the project you created tables and storage in.

### Email — Gmail SMTP (required for sending mail)

| Variable | Description |
|----------|-------------|
| `GMAIL_USER` | Gmail address used to send mail (e.g. `owner@gmail.com`). |
| `GMAIL_APP_PASSWORD` | [Google App Password](https://support.google.com/accounts/answer/185833) (16 characters), not your normal Gmail password. |

**Prerequisites:** 2-Step Verification enabled on the Google account.

### Branding and UPI (required for payment UI)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_UPI_ID` | UPI VPA shown in the QR flow (e.g. `9876543210@upi`). |
| `NEXT_PUBLIC_GYM_NAME` | Display name (default in code: `SM FITNESS`). |
| `NEXT_PUBLIC_APP_URL` | Public site origin for password reset links and redirects (no trailing slash), e.g. `https://your-app.vercel.app`. Required in production so reset emails do not use the wrong host. |

### Cron jobs (required for scheduled endpoints)

| Variable | Description |
|----------|-------------|
| `CRON_SECRET` | Shared secret. Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>` when the variable is set. The app also accepts header `x-cron-secret` for manual or legacy callers. |

**Generate a strong value (example PowerShell):**

```powershell
[guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
```

Use the **same** value in Vercel environment variables and in your cron configuration.

### Member photos — Storage bucket (optional override)

| Variable | Description |
|----------|-------------|
| `SUPABASE_MEMBER_PHOTO_BUCKET` | Name of the **private** Supabase Storage bucket for member photos. Default: `sm-fitness-member-photo`. |

Create this bucket in Supabase if it does not exist. The app uploads member images here and signs URLs for display. `next.config.ts` uses `NEXT_PUBLIC_SUPABASE_URL` to allow `next/image` for signed storage URLs.

### Gym logo and UPI QR — Storage bucket (optional override)

| Variable | Description |
|----------|-------------|
| `SUPABASE_GYM_ASSETS_BUCKET` | Name of the **private** bucket for gym logo and UPI QR uploads (Settings). Default: `gym-assets`. |

Create this bucket if it does not exist. Uploads use the service role from API routes ([`app/api/settings/logo`](../app/api/settings/logo/route.ts), [`app/api/settings/upi-qr`](../app/api/settings/upi-qr/route.ts)).

## Minimal `.env.local` template

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GMAIL_USER=
GMAIL_APP_PASSWORD=

NEXT_PUBLIC_UPI_ID=
NEXT_PUBLIC_GYM_NAME=SM FITNESS
NEXT_PUBLIC_APP_URL=http://localhost:3000

CRON_SECRET=

SUPABASE_MEMBER_PHOTO_BUCKET=sm-fitness-member-photo
SUPABASE_GYM_ASSETS_BUCKET=gym-assets
```

## Local vs production (Vercel)

1. **Local:** Use `.env.local` with the same variable names.
2. **Vercel:** Project → **Settings** → **Environment Variables** → add each key for Production (and Preview if needed).
3. After changing env vars on Vercel, redeploy so the new values are picked up.

## Security checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` and `GMAIL_APP_PASSWORD` are never committed or pasted into client-side code.
- [ ] `CRON_SECRET` is long and random; only your deployment and trusted schedulers know it.
- [ ] Repository has `.env*` in `.gitignore` (verify before pushing).

## Non-env prerequisites (Supabase)

Environment variables alone are not enough. You must also:

1. Create tables, RLS policies, and seed data per project documentation, then run [`supabase/migrations/001_sm_fitness_extensions.sql`](../supabase/migrations/001_sm_fitness_extensions.sql) for `gym_settings` and member/plan extensions.
2. Add your logged-in user’s UUID to the `admins` table (strict admin access). See [`supabase/seed_admin_example.sql`](../supabase/seed_admin_example.sql).
3. Create storage buckets: `SUPABASE_MEMBER_PHOTO_BUCKET` (default `sm-fitness-member-photo`) and `SUPABASE_GYM_ASSETS_BUCKET` (default `gym-assets`), private; the API uses the service role for uploads.
4. Deploy SQL RPC functions `next_member_code()` and `next_receipt_number()` and seed counter rows.

See [README.md](../README.md) (Supabase prerequisites and DB safeguards) and [`UAT_CHECKLIST.md`](./UAT_CHECKLIST.md).

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Login works but dashboard kicks you out | User not in `admins` table. |
| `Bucket not found` on photo upload | Bucket name mismatch; set `SUPABASE_MEMBER_PHOTO_BUCKET` or create the default bucket. |
| `Bucket not found` on Settings logo/QR | Create `gym-assets` or set `SUPABASE_GYM_ASSETS_BUCKET` to your bucket name. |
| `Invalid src prop` for member photo | `NEXT_PUBLIC_SUPABASE_URL` missing or wrong in build; image host comes from this URL. |
| Cron returns 401 | Wrong or missing `Authorization: Bearer` / `x-cron-secret`, or `CRON_SECRET` not set on the server. |
| Password reset opens wrong host | Set `NEXT_PUBLIC_APP_URL` and Supabase Auth redirect URLs to your production domain. |
| Emails not sending | Wrong `GMAIL_USER` / app password, or Gmail blocking sign-in. |
