# SM FITNESS Env Setup Checklist

Use this file to collect all required setup values before running the app.

## 1) `.env.local` values to fill

Create `d:\sm-fitness\cursor\.env.local` and add:

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

## 2) Where to get each value

### Supabase

1. Open Supabase Dashboard -> your project.
2. Go to **Project Settings -> API**.
3. Copy:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key (keep private)

### Gmail SMTP (Nodemailer)

1. Use the Gmail account that should send emails.
2. Enable 2-Step Verification.
3. Generate an **App Password**.
4. Set:
   - `GMAIL_USER` = Gmail address (example: owner@gmail.com)
   - `GMAIL_APP_PASSWORD` = generated 16-char app password

### UPI

- `NEXT_PUBLIC_UPI_ID` = your UPI handle (example: `9876543210@upi`)
- `NEXT_PUBLIC_GYM_NAME` = keep `SM FITNESS` unless you want another label

### Cron Secret

- `CRON_SECRET` = long random string (32+ chars recommended)
- Example PowerShell:

```powershell
[guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
```

## 3) Non-env prerequisites (must also be done)

In Supabase, ensure:

- Tables exist: `members`, `memberships`, `payments`, `plans`, `email_logs`, `admins`, counters.
- Add your authenticated admin user to `admins` table before first login (required access control).
- `plans` is seeded (`Monthly`, `Quarterly`, `Half-Yearly`, `Annual`).
- Storage bucket exists: `member-photos` (private).
- RLS policies configured.
- SQL RPC functions exist:
  - `next_member_code()`
  - `next_receipt_number()`

Recommended DB safeguard:

```sql
alter table payments
add constraint payments_membership_id_unique unique (membership_id);
```

Cron security rule:
- Trigger cron endpoints with `x-cron-secret` request header only.

## 4) Fill-and-share section

Paste your values here (or share in chat) when ready:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GMAIL_USER=
GMAIL_APP_PASSWORD=
NEXT_PUBLIC_UPI_ID=
NEXT_PUBLIC_GYM_NAME=SM FITNESS
CRON_SECRET=
```

After you provide these, we can validate environment setup and run live feature checks.

