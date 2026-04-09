-- Run this AFTER the initial schema.sql if you already applied the permissive policies.
-- Locks down INSERT/UPDATE so only the backend (Supabase service role) can mutate rows.
-- The Next.js API routes use SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.

-- payment_requests: public read stays; no direct client writes
DROP POLICY IF EXISTS "Anyone can create payment requests." ON public.payment_requests;
DROP POLICY IF EXISTS "Creator can update own payment requests." ON public.payment_requests;

-- payments: public read can stay for MVP dashboard/activity; no direct client writes
DROP POLICY IF EXISTS "Anyone can record a payment." ON public.payments;
DROP POLICY IF EXISTS "Service role can update payments." ON public.payments;

-- audit_logs: avoid anonymous spam (optional — only server should write logs)
DROP POLICY IF EXISTS "Anyone can insert audit logs." ON public.audit_logs;

-- Note: No replacement INSERT/UPDATE policies are needed for anon/authenticated:
-- the service role key bypasses RLS and your /api/* routes use that key.
