# SM FITNESS — Backup System

## How it works

- Cron runs on schedule **`0 3 */5 * *`** (UTC): at **03:00 UTC** on calendar days **1, 6, 11, 16, 21, 26** (and 31 when it exists). That is roughly every five days within the month, **not** a rolling 144-hour interval. In India this is typically **08:30 IST** (IST = UTC+5:30).
- The job loads all members, memberships, payments, and plans from Supabase, which also acts as a **keep-alive** query against the database.
- It sends a single **HTML email** to the configured backup address with a summary bar and a **color-coded** member table (see below).

## Email contents

- **Summary:** total members, active, expiring within 7 days, expired, no plan, plus **this month** revenue and cash/UPI splits (IST month bounds).
- **Table columns:** Name, Mobile, Plan, Expiry, Days left, Last paid, Amount, Mode.
- **Row colors:** red = expired, amber = expiring soon (≤7 days), blue = no membership, white = active (>7 days).
- **Sort:** expired first, then expiring soon, then no plan, then active.

## Setup

1. In the app: **Settings → Notifications & Backup → Backup email address**, save.
2. Or set environment variable **`BACKUP_EMAIL`** as a fallback when the database field is empty.
3. Ensure **`CRON_SECRET`** is set in Vercel and Gmail SMTP (`GMAIL_USER`, `GMAIL_APP_PASSWORD`) works for sending.

## Cron schedule and security

- **Route:** `GET /api/cron/backup`
- **Schedule:** `0 3 */5 * *` (see [`vercel.json`](../vercel.json))
- **Auth:** header **`Authorization: Bearer <CRON_SECRET>`** (no `x-cron-secret` fallback on this route).
- Successful and failed sends are logged in **`email_logs`** with `type: backup` (system row; `member_id` may be null if your migration allows it).
