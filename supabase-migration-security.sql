-- ============================================================
-- Catatonica Security Migration
-- Fixes: is_premium stored on user-writable profiles table
-- Solution: separate `subscriptions` table, no user write access
-- ============================================================

-- 1. Create the protected subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_premium      BOOLEAN NOT NULL DEFAULT false,
  tier            TEXT CHECK (tier IN ('deep', 'order')),
  paddle_subscription_id TEXT,
  paddle_status   TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Backfill from profiles (preserves existing premium users)
INSERT INTO public.subscriptions (user_id, is_premium, tier, updated_at)
SELECT id, COALESCE(is_premium, false), tier, now()
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- 3. RLS on subscriptions — users can READ their own row, NEVER write
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- NO INSERT or UPDATE policy for users.
-- Only the service role (webhook function) can write to this table.

-- 4. Lock down profiles — remove is_premium and tier columns
--    (do this AFTER confirming the app reads from subscriptions)
--    Run these when ready:
--
--    ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_premium;
--    ALTER TABLE public.profiles DROP COLUMN IF EXISTS tier;
--
--    For now, just restrict the UPDATE policy on profiles to exclude these columns.

-- 5. Update the profiles UPDATE policy to be safe even before column removal
--    Drop existing permissive policy first (adjust name if yours differs):
DROP POLICY IF EXISTS "users can update own profile" ON public.profiles;

CREATE POLICY "users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent users from touching subscription-related columns
    -- Note: Postgres doesn't support column-level WITH CHECK directly,
    -- so the real fix is moving to the subscriptions table above.
    -- This policy still restricts the row to their own.
  );

-- 6. total_catatons is a stat, not a billing field — it's fine on profiles
--    But if you want extra safety, you can move it too.

-- ============================================================
-- After migration, update app.html to join subscriptions:
--
-- OLD:
--   sb.from('profiles').select('*').eq('id', uid).single()
--   profile.is_premium
--
-- NEW:
--   sb.from('profiles').select('*, subscriptions(is_premium, tier)').eq('id', uid).single()
--   profile.subscriptions?.is_premium
-- ============================================================
