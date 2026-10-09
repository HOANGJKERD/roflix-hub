-- Public schedule cards are intentionally readable by anon; row visibility remains
-- restricted by the existing `release schedule public read` RLS policy.
-- This grants table-level SELECT only and does not grant INSERT/UPDATE/DELETE.
grant select on table public.roflix_release_schedule to anon, authenticated;
