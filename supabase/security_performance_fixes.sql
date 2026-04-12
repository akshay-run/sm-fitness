-- SM FITNESS: run each numbered block separately in Supabase SQL Editor.
-- See plan / docs for conventions (RLS bootstrap, idempotent drops).

-- ========== BLOCK 1 — gym_settings RLS ==========
ALTER TABLE public.gym_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access" ON public.gym_settings;

CREATE POLICY "admin_full_access" ON public.gym_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.id = (SELECT auth.uid())
    )
  );

-- ========== BLOCK 2 — policies for members, memberships, payments, email_logs, counters ==========
DROP POLICY IF EXISTS "admin_full_access" ON public.members;
CREATE POLICY "admin_full_access" ON public.members
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "admin_full_access" ON public.memberships;
CREATE POLICY "admin_full_access" ON public.memberships
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "admin_full_access" ON public.payments;
CREATE POLICY "admin_full_access" ON public.payments
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "admin_full_access" ON public.email_logs;
CREATE POLICY "admin_full_access" ON public.email_logs
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "admin_full_access" ON public.member_code_counter;
CREATE POLICY "admin_full_access" ON public.member_code_counter
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "admin_full_access" ON public.receipt_counter;
CREATE POLICY "admin_full_access" ON public.receipt_counter
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = (SELECT auth.uid())));

-- ========== BLOCK 3 — admins RLS ==========
DROP POLICY IF EXISTS "admin_only" ON public.admins;
DROP POLICY IF EXISTS "admin_full_access" ON public.admins;

CREATE POLICY "admin_full_access" ON public.admins
  FOR ALL
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ========== BLOCK 4 — SECURITY DEFINER search_path ==========
CREATE OR REPLACE FUNCTION public.next_member_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_counter int;
BEGIN
  UPDATE member_code_counter
    SET counter = counter + 1
    WHERE id = 1
    RETURNING counter INTO new_counter;
  RETURN 'GYM-' || lpad(new_counter::text, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.next_receipt_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE y int := extract(year from now() at time zone 'Asia/Kolkata');
DECLARE new_counter int;
BEGIN
  INSERT INTO receipt_counter(id, year, counter)
    VALUES (1, y, 0)
    ON CONFLICT (id) DO NOTHING;

  UPDATE receipt_counter
    SET year = y, counter = 0
    WHERE id = 1 AND year <> y;

  UPDATE receipt_counter
    SET counter = counter + 1
    WHERE id = 1
    RETURNING counter INTO new_counter;

  RETURN 'RCP-' || y::text || '-' || lpad(new_counter::text, 4, '0');
END;
$$;

-- ========== BLOCK 5 — indexes ==========
CREATE INDEX IF NOT EXISTS idx_email_logs_member_id ON public.email_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_membership_id ON public.email_logs(membership_id);
CREATE INDEX IF NOT EXISTS idx_memberships_member_id ON public.memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_memberships_plan_id ON public.memberships(plan_id);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON public.payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_membership_id ON public.payments(membership_id);
CREATE INDEX IF NOT EXISTS idx_memberships_end_date ON public.memberships(end_date);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON public.memberships(status);
CREATE INDEX IF NOT EXISTS idx_members_is_active ON public.members(is_active);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);

-- ========== BLOCK 6 — inspect members indexes ==========
-- Run only this in SQL Editor (see block6_members_indexes.sql).
