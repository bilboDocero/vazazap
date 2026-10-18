-- Run once before deploying the payment changes. Safe to re-run.
-- Existing approved purchases without a verifiable payment are quarantined.
BEGIN;
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['status_purchases', 'vitrine_purchases'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS payment_id text', tbl);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS payment_intent_id text', tbl);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS billing_type varchar(50)', tbl);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT ''brl''', tbl);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS purchase_token_hash text', tbl);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS purchase_fingerprint text', tbl);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0', tbl);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN published_at DROP NOT NULL', tbl);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN published_at DROP DEFAULT', tbl);
    EXECUTE format('UPDATE public.%I SET payment_status = ''review_required'' WHERE payment_status = ''approved'' AND (purchase_fingerprint IS NULL OR payment_id IS NULL OR payment_id NOT LIKE ''cs_%%'')', tbl);
    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (payment_id) WHERE payment_id IS NOT NULL', tbl || '_stripe_session_unique', tbl);
    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (payment_intent_id) WHERE payment_intent_id IS NOT NULL', tbl || '_stripe_intent_unique', tbl);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    -- Public clients must never read ownership hashes or write payment status.
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', tbl);
    END IF;
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', tbl);
    END IF;
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', tbl);
  END LOOP;
END $$;
DROP POLICY IF EXISTS "Permitir leitura pública de status" ON public.status_purchases;
DROP POLICY IF EXISTS "Permitir inserção pública de status" ON public.status_purchases;
DROP POLICY IF EXISTS "Permitir atualização de pagamento de status" ON public.status_purchases;
DROP POLICY IF EXISTS "Permitir leitura pública de vitrines" ON public.vitrine_purchases;
DROP POLICY IF EXISTS "Permitir inserção pública de vitrines" ON public.vitrine_purchases;
DROP POLICY IF EXISTS "Permitir atualização de pagamento de vitrines" ON public.vitrine_purchases;
NOTIFY pgrst, 'reload schema';
COMMIT;
