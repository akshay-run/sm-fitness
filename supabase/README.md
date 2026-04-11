# Supabase schema (SM FITNESS)

Apply SQL in this order on your Supabase project (**SQL Editor**).

## 1. Core schema

If you have not already: run your main schema script (tables `admins`, `members`, `plans`, `memberships`, `payments`, `email_logs`, counters, RPCs `next_member_code` / `next_receipt_number`, RLS, seed plans).

## 2. App extensions (required for this repo)

Run the full contents of:

**[`migrations/001_sm_fitness_extensions.sql`](./migrations/001_sm_fitness_extensions.sql)**

This adds `gym_settings`, `plans.default_price`, `members.blood_group` / `joining_date`, and drops legacy emergency-contact columns if present.

## 3. Admin user row

After you create a user in **Authentication**, insert their row into `public.admins`. Use **[`seed_admin_example.sql`](./seed_admin_example.sql)** as a template (replace the placeholder UUID and email).

## 4. Storage buckets

| Bucket | Env variable | Purpose |
|--------|----------------|---------|
| `sm-fitness-member-photo` | `SUPABASE_MEMBER_PHOTO_BUCKET` (default) | Member photos |
| `gym-assets` | `SUPABASE_GYM_ASSETS_BUCKET` (default) | Gym logo and UPI QR (Settings) |

Create both as **private** buckets in **Storage**. The Next.js API uses the **service role** for uploads; names must match `.env.local` / Vercel.

See also **[`../docs/ENV_SETUP_STEPS.md`](../docs/ENV_SETUP_STEPS.md)** and **[`../.env.example`](../.env.example)**.
