-- ============================================================
-- 1. Lock down financial / sensitive RPCs
-- ============================================================

-- add_credits_after_purchase: already restricted to postgres/service_role,
-- but make it explicit (idempotent).
REVOKE EXECUTE ON FUNCTION public.add_credits_after_purchase(uuid, integer, numeric, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_credits_after_purchase(uuid, integer, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_credits_after_purchase(uuid, integer, numeric, text) FROM authenticated;

-- redeem_promo_code: should never be callable by anon
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(text) FROM anon;

-- update_helper_availability: should never be callable by anon
REVOKE EXECUTE ON FUNCTION public.update_helper_availability(uuid, text) FROM anon;

-- ============================================================
-- 2. Promo codes — prevent catalog scraping
-- ============================================================

-- Drop the permissive "any authenticated user can list all active codes" policy.
-- Edge functions / RPCs use service role and bypass RLS, so users only ever
-- see redemption results, never the full code list.
DROP POLICY IF EXISTS "Anyone authenticated can view active promo codes" ON public.promo_codes;

-- ============================================================
-- 3. Push tokens — explicit per-command hardening
-- ============================================================

-- Replace the catch-all ALL policy with explicit per-command policies
-- so it's auditable and impossible to accidentally widen.
DROP POLICY IF EXISTS "Users can manage own tokens" ON public.push_tokens;

CREATE POLICY "Owner reads own push token"
  ON public.push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner inserts own push token"
  ON public.push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner updates own push token"
  ON public.push_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner deletes own push token"
  ON public.push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. Messages: add moderation gate
-- ============================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved';
-- Existing rows default to 'approved' (backwards compatible).
-- New rows from the client default to 'approved' too; the moderation
-- function flips them to 'flagged' or 'pending' as needed.

-- Replace the SELECT policy with a moderation-aware version:
--   - sender always sees their own messages (any status)
--   - receiver only sees approved messages
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;

CREATE POLICY "Sender sees own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id);

CREATE POLICY "Receiver sees approved messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = receiver_id AND moderation_status = 'approved');