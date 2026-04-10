# SM FITNESS — Environment setup checklist

Use this as a quick pre-flight list. For a **numbered walkthrough** (install → keys → Gmail → Vercel), see **[ENV_SETUP_STEPS.md](./ENV_SETUP_STEPS.md)**. For detailed explanations, security notes, and troubleshooting, see **[ENV_CONFIGURATION.md](./ENV_CONFIGURATION.md)**.

## Quick steps

1. Copy the template: `cp .env.example .env.local` (from repo root).
2. Fill every variable in the table below.
3. In Supabase: tables, RLS, RPCs, `admins` row for your user, storage bucket (default name: `sm-fitness-member-photo`).
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
| `CRON_SECRET` | [ ] |
| `SUPABASE_MEMBER_PHOTO_BUCKET` (optional; default `sm-fitness-member-photo`) | [ ] |

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
