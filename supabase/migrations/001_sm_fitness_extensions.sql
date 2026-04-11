-- Run in Supabase SQL Editor. Idempotent-style helpers for local dev.

-- Gym settings (single row; id = 1)
CREATE TABLE IF NOT EXISTS public.gym_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  gym_name text NOT NULL DEFAULT 'SM FITNESS',
  address text,
  phone text,
  upi_id text,
  logo_path text,
  upi_qr_path text,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.gym_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS backup_email TEXT;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS whatsapp_group_link TEXT;

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS welcome_wa_sent BOOLEAN DEFAULT false;

-- System emails (e.g. cron backup) are not tied to one member
ALTER TABLE public.email_logs ALTER COLUMN member_id DROP NOT NULL;

-- Plans: default price hint for UI
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS default_price numeric(12, 2);

-- Members: blood group, joining date; remove emergency contacts (optional drop)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS blood_group text;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS joining_date date;

ALTER TABLE public.members
  DROP COLUMN IF EXISTS emergency_contact_name;

ALTER TABLE public.members
  DROP COLUMN IF EXISTS emergency_contact_phone;

-- Optional: constrain blood group to common values
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_blood_group_check;
ALTER TABLE public.members ADD CONSTRAINT members_blood_group_check CHECK (
  blood_group IS NULL OR blood_group IN (
    'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'
  )
);

-- Storage: create bucket `gym-assets` in Supabase Dashboard (Storage) if not exists,
-- then set env SUPABASE_GYM_ASSETS_BUCKET=gym-assets
