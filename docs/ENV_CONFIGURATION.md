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

### Cron jobs (required for scheduled endpoints)

| Variable | Description |
|----------|-------------|
| `CRON_SECRET` | Shared secret; Vercel Cron (or any caller) must send it as header `x-cron-secret`. Query-string secrets are not supported. |

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

## Minimal `.env.local` template

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

1. Create tables, RLS policies, and seed data per project documentation.
2. Add your logged-in user’s UUID to the `admins` table (strict admin access).
3. Create the storage bucket matching `SUPABASE_MEMBER_PHOTO_BUCKET` (default `sm-fitness-member-photo`), private, with policies allowing the service role uploads used by the API.
4. Deploy SQL RPC functions `next_member_code()` and `next_receipt_number()` and seed counter rows.

See [README.md](../README.md) (Supabase prerequisites and DB safeguards) and [`UAT_CHECKLIST.md`](./UAT_CHECKLIST.md).

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Login works but dashboard kicks you out | User not in `admins` table. |
| `Bucket not found` on photo upload | Bucket name mismatch; set `SUPABASE_MEMBER_PHOTO_BUCKET` or create the default bucket. |
| `Invalid src prop` for member photo | `NEXT_PUBLIC_SUPABASE_URL` missing or wrong in build; image host comes from this URL. |
| Cron returns 401 | Missing or wrong `x-cron-secret` header, or `CRON_SECRET` not set on the server. |
| Emails not sending | Wrong `GMAIL_USER` / app password, or Gmail blocking sign-in. |
