-- Reward claims are a private anti-abuse ledger. Access them only through
-- SECURITY DEFINER RPCs that validate auth.uid(); clients do not need table grants.
REVOKE ALL ON TABLE public.roflix_watch_reward_claims FROM PUBLIC, anon, authenticated;
