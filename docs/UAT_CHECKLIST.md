# SM FITNESS UAT Checklist

Use this checklist before production release.

## 1) Environment & Infra

- [ ] `.env` values configured in deployment platform.
- [ ] Supabase tables, RPC functions, constraints, RLS policies applied.
- [ ] Storage bucket exists and is private (default name `sm-fitness-member-photo`, or matches `SUPABASE_MEMBER_PHOTO_BUCKET`).
- [ ] `plans` table is seeded with required plans.
- [ ] Cron schedules configured and deployed.

## 2) Authentication

- [ ] Valid admin login works.
- [ ] Invalid login is rejected.
- [ ] Non-admin authenticated account is denied and signed out.
- [ ] Dashboard routes redirect to `/login` when unauthenticated.
- [ ] Protected API routes return `401` when unauthenticated.
- [ ] Auto-logout behavior verified.

## 3) Members

- [ ] Create member with required fields works.
- [ ] Member mobile/email validation works.
- [ ] Member code generated correctly and uniquely.
- [ ] Edit member updates expected fields.
- [ ] Soft deactivate sets `is_active=false` (no hard delete).
- [ ] Member list search/filter/pagination works.

## 4) Photo System

- [ ] Upload path works and photo appears on profile.
- [ ] Camera capture path works.
- [ ] Compression target is under ~200KB for common images.
- [ ] Camera permission denial handled gracefully.
- [ ] Supabase image host renders correctly in preview (no `next/image` host error).

## 5) Memberships

- [ ] Create membership with plan + fee works.
- [ ] Renewal logic is correct for active membership.
- [ ] New membership start date defaults to today IST when no active membership.
- [ ] End date follows selected plan duration.
- [ ] Warning is shown when active membership exists.

## 6) Payments

- [ ] Cash payment flow works.
- [ ] UPI flow with QR works.
- [ ] One-payment-per-membership rule enforced.
- [ ] Partial payments are not possible.
- [ ] Receipt number generation works with proper format.
- [ ] Print receipt action works from payment detail page.

## 7) Email

- [ ] Welcome email sends on member creation (when email exists).
- [ ] Receipt email sends on payment creation (when email exists).
- [ ] Resend receipt endpoint works.
- [ ] `email_logs` captures sent and failed entries.
- [ ] Duplicate-prevention behavior verified.

## 8) Cron

- [ ] `/api/cron/reminders` runs with valid secret.
- [ ] 7-day / 1-day / expired reminders trigger correctly by IST date.
- [ ] Duplicate cron sends are prevented per day/type/membership.
- [ ] Cancelled memberships are never updated to `expired` by cron status update.
- [ ] `/api/cron/ping` returns healthy response.
- [ ] Invalid/missing cron secret returns unauthorized.

## 9) Dashboard & Reports

- [ ] Dashboard cards display expected counts.
- [ ] Upcoming renewals table data looks correct.
- [ ] Recent payments feed renders latest data.
- [ ] CSV export downloads and contains expected columns.
- [ ] Monthly revenue summary is correct.
- [ ] Backup reminder notice is visible on reports page.

## 10) PWA

- [ ] Manifest is served and valid.
- [ ] Install prompt appears on supported browsers.
- [ ] App can be installed to home screen.

## 11) Build & Quality Gates

- [ ] `npm run test` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] CI workflow passes on the default branch.

## 12) Go-Live Checks

- [ ] First admin account verified in production.
- [ ] Real Gmail SMTP credentials tested.
- [ ] UPI ID verified with real QR scan.
- [ ] Rollback plan documented.
- [ ] Monthly manual backup process assigned.

