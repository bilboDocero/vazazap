-- ==============================================================================
-- Schema Supabase / PostgreSQL para vorcarozap (com integração de pagamentos Asaas)
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Tabela de Compras e Publicações de Status / Stories
CREATE TABLE IF NOT EXISTS status_purchases (
  id TEXT PRIMARY KEY,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'status_normal',
  file_count INTEGER NOT NULL DEFAULT 1 CHECK (file_count BETWEEN 1 AND 4),
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 4.90,
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_price NUMERIC(10, 2) NOT NULL DEFAULT 4.90,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  billing_type VARCHAR(50) DEFAULT 'PIX',
  payment_id TEXT,
  profile_name TEXT NOT NULL,
  user_handle TEXT NOT NULL,
  social_network VARCHAR(50) NOT NULL DEFAULT 'instagram',
  social_link TEXT NOT NULL,
  caption TEXT DEFAULT '',
  profile_pic TEXT DEFAULT '',
  media_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrações incrementais se a tabela já existir:
ALTER TABLE status_purchases ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE status_purchases ADD COLUMN IF NOT EXISTS billing_type VARCHAR(50) DEFAULT 'PIX';

CREATE INDEX IF NOT EXISTS idx_status_purchases_ordering 
  ON status_purchases (
    (CASE WHEN plan_type = 'status_impulsionado' THEN 0 ELSE 1 END),
    published_at DESC
  );

-- 2. Tabela de Vitrines Comerciais
CREATE TABLE IF NOT EXISTS vitrine_purchases (
  id TEXT PRIMARY KEY,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'vitrine_normal',
  file_count INTEGER NOT NULL DEFAULT 1 CHECK (file_count BETWEEN 1 AND 4),
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 4.90,
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_price NUMERIC(10, 2) NOT NULL DEFAULT 4.90,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  billing_type VARCHAR(50) DEFAULT 'PIX',
  payment_id TEXT,
  profile_name TEXT NOT NULL,
  user_handle TEXT NOT NULL,
  social_network VARCHAR(50) NOT NULL DEFAULT 'instagram',
  social_link TEXT NOT NULL,
  caption TEXT DEFAULT '',
  profile_pic TEXT DEFAULT '',
  media_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrações incrementais se a tabela já existir:
ALTER TABLE vitrine_purchases ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE vitrine_purchases ADD COLUMN IF NOT EXISTS billing_type VARCHAR(50) DEFAULT 'PIX';

CREATE INDEX IF NOT EXISTS idx_vitrine_purchases_ordering 
  ON vitrine_purchases (
    (CASE WHEN plan_type = 'vitrine_impulsionado' THEN 0 ELSE 1 END),
    published_at DESC
  );

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
