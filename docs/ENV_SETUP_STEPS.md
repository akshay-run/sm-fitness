# SM FITNESS — Step-by-step: fulfill `.env` requirements

Use this page as a **linear checklist** from zero to a working local app. For the full variable reference, security notes, and troubleshooting, see **[ENV_CONFIGURATION.md](./ENV_CONFIGURATION.md)**.

## Before you start

- Node.js 20+ recommended (matches CI).
- A [Supabase](https://supabase.com) account and a new project (or an existing one you control).
- A Gmail account that will send mail (with 2-Step Verification).

---

## Step 1 — Install dependencies

From the repository root:

```bash
npm install
```

---

## Step 2 — Create your env file

1. Copy the template:

   **macOS / Linux / Git Bash**

   ```bash
   cp .env.example .env.local
   ```

   **Windows (PowerShell, repo root)**

   ```powershell
   Copy-Item .env.example .env.local
   ```

2. Keep `.env.local` **out of git** (already ignored via `.gitignore`).

---

## Step 3 — Supabase API keys (required)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Project Settings** → **API**.
2. Copy into `.env.local`:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (secret) → `SUPABASE_SERVICE_ROLE_KEY`

Never commit `SUPABASE_SERVICE_ROLE_KEY` or expose it in client-side code.

---

## Step 4 — Gmail SMTP (required for email features)

1. Enable **2-Step Verification** on the Google account.
2. Create an **App Password** (Google Account → Security → App passwords).
3. Set in `.env.local`:
   - `GMAIL_USER` = full Gmail address
   - `GMAIL_APP_PASSWORD` = the 16-character app password (not your normal password)

---

## Step 5 — UPI and display name (required for payment UI)

Set:

- `NEXT_PUBLIC_UPI_ID` — your UPI VPA (e.g. `9876543210@paytm`).
- `NEXT_PUBLIC_GYM_NAME` — shown in UI and emails (default `SM FITNESS` if omitted in code paths).

---

## Step 6 — Cron secret (required for `/api/cron/*`)

1. Generate a long random string (32+ characters). Example (PowerShell):

   ```powershell
   [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
   ```

2. Set `CRON_SECRET` in `.env.local` to that value.
3. On Vercel, scheduled crons send `Authorization: Bearer <same value>` automatically. For manual tests, use either that header or `x-cron-secret: <same value>` (no query-string secret).

---

## Step 7 — Storage buckets (member photos + gym assets)

Create **two private** buckets in Supabase → **Storage** (unless you already created them):

| Bucket | Default env variable | Used for |
|--------|----------------------|----------|
| `sm-fitness-member-photo` | `SUPABASE_MEMBER_PHOTO_BUCKET` | Member profile photos |
| `gym-assets` | `SUPABASE_GYM_ASSETS_BUCKET` | Logo and UPI QR image (Settings page) |

If you use different names, set the matching variables in `.env.local` (and Vercel). The API uploads via the **service role**; bucket names must match the env vars.

---

## Step 8 — Database migration for Settings and members (required)

After your core schema exists, run the extension migration in the Supabase **SQL Editor**:

- File in repo: [`supabase/migrations/001_sm_fitness_extensions.sql`](../supabase/migrations/001_sm_fitness_extensions.sql)

It adds `gym_settings`, `plans.default_price`, `members.blood_group` / `joining_date`, and removes legacy emergency-contact columns if present. See [`supabase/README.md`](../supabase/README.md) for the full apply order.

---

## Step 9 — Database and access (not env vars, but required)

Without these, login or features will fail even with a correct `.env.local`:

1. Tables, RLS, RPCs (`next_member_code`, `next_receipt_number`), counters — per your schema **plus** Step 8.
2. **`admins` row:** insert your Supabase Auth user UUID so the app allows dashboard access. Template: [`supabase/seed_admin_example.sql`](../supabase/seed_admin_example.sql).
3. Seed `plans` (e.g. Monthly, Quarterly, Half-Yearly, Annual).
4. Storage buckets from Step 7 exist and names match your env vars.

Use [UAT_CHECKLIST.md](./UAT_CHECKLIST.md) for a full pre-flight list.

---

## Step 10 — Verify locally

```bash
npm run dev
```

Open `http://localhost:3000`, sign in, and exercise members / payments. Optional quality gate:

```bash
npm run test
npm run lint
npm run build
```

---

## Step 11 — Production (Vercel)

1. In Vercel → Project → **Settings** → **Environment Variables**, add **the same variable names** as in `.env.local` for Production (and Preview if needed).
2. Redeploy after changing variables.
3. Run [UAT_CHECKLIST.md](./UAT_CHECKLIST.md) against the deployed URL.

---

## Related docs

| Doc | Use when |
|-----|----------|
| [ENV_CONFIGURATION.md](./ENV_CONFIGURATION.md) | Full variable table, troubleshooting, security checklist |
| [ENV_SETUP_CHECKLIST.md](./ENV_SETUP_CHECKLIST.md) | Short checkbox list |
| [README.md](../README.md) | Overview, cron, DB safeguards |
