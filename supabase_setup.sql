-- Create gym_settings table
CREATE TABLE IF NOT EXISTS gym_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_name text NOT NULL DEFAULT 'SM FITNESS',
  address text,
  phone text,
  upi_id text,
  logo_url text,
  upi_qr_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Note: we only need a single row for gym_settings, maybe enforce it if needed.
-- Insert a default row if empty
INSERT INTO gym_settings (gym_name)
SELECT 'SM FITNESS'
WHERE NOT EXISTS (SELECT 1 FROM gym_settings);

-- Alter members table
ALTER TABLE members 
  DROP COLUMN IF EXISTS emergency_contact_name,
  DROP COLUMN IF EXISTS emergency_contact_phone,
  ADD COLUMN IF EXISTS blood_group text,
  ADD COLUMN IF EXISTS joining_date date DEFAULT CURRENT_DATE NOT NULL;

-- If email needs to be enforced on DB level (optional, will be handled by app level)
-- ALTER TABLE members ALTER COLUMN email SET NOT NULL;
