# SM FITNESS — Environment setup checklist

Use this as a quick pre-flight list. For a **numbered walkthrough** (install → keys → Gmail → Vercel), see **[ENV_SETUP_STEPS.md](./ENV_SETUP_STEPS.md)**. For detailed explanations, security notes, and troubleshooting, see **[ENV_CONFIGURATION.md](./ENV_CONFIGURATION.md)**.

## Quick steps

1. Copy the template: `cp .env.example .env.local` (from repo root).
2. Fill every variable in the table below.
3. In Supabase: tables, RLS, RPCs, run [`supabase/migrations/001_sm_fitness_extensions.sql`](../supabase/migrations/001_sm_fitness_extensions.sql), `admins` row for your user ([`supabase/seed_admin_example.sql`](../supabase/seed_admin_example.sql)), storage buckets `sm-fitness-member-photo` and `gym-assets` (or set `SUPABASE_*_BUCKET` overrides).
4. Run `npm install` then `npm run dev` and complete [UAT_CHECKLIST.md](./UAT_CHECKLIST.md) for your environment.

## Variables to fill

| Variable | Filled |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | [ ] |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [ ] |
| `SUPABASE_SERVICE_ROLE_KEY` | [ ] |
| `GMAIL_USER` | [ ] |
| `GMAIL_APP_PASSWORD` | [ ] |
| `NEXT_PUBLIC_UPI_ID` | [ ] |
| `NEXT_PUBLIC_GYM_NAME` | [ ] |
| `NEXT_PUBLIC_APP_URL` (production origin, no trailing slash; e.g. `https://your-app.vercel.app`) | [ ] |
| `CRON_SECRET` | [ ] |
| `BACKUP_EMAIL` (optional; fallback if Settings backup email empty) | [ ] |
| `SUPABASE_MEMBER_PHOTO_BUCKET` (optional; default `sm-fitness-member-photo`) | [ ] |
| `SUPABASE_GYM_ASSETS_BUCKET` (optional; default `gym-assets`) | [ ] |

## Where to get values (summary)

- **Supabase:** Dashboard → Project Settings → API (URL, anon key, service role key).
- **Gmail:** App Password after enabling 2-Step Verification.
- **UPI / gym name:** Your VPA and display name.
- **Cron:** Generate a long random string; use as `CRON_SECRET` locally and in Vercel.

## Fill-and-share (optional)

For support or handoff, you can paste non-secret placeholders here (never commit real secrets):

```txt
NEXT_PUBLIC_SUPABASE_URL=(set)
SUPABASE_SERVICE_ROLE_KEY=(set, private)
... etc.
```

After values are configured, run: `npm run test`, `npm run lint`, `npm run build`.
