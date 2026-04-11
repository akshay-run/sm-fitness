-- Run in Supabase SQL Editor AFTER the user exists in auth.users.
-- 1) Dashboard → Authentication → Users → copy the user's UUID.
-- 2) Replace YOUR_USER_UUID_HERE and email below, then run once.

insert into public.admins (id, email, name, role)
values (
  'YOUR_USER_UUID_HERE'::uuid,
  'owner@example.com',
  'Owner name',
  'owner'
)
on conflict (id) do update set
  email = excluded.email,
  name = coalesce(excluded.name, public.admins.name),
  role = excluded.role;
