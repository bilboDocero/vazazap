-- ==============================================================================
-- Schema Supabase / PostgreSQL para VorcaroZap (com integração de pagamentos Asaas)
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

-- 3. Habilita Row Level Security (RLS)
ALTER TABLE status_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitrine_purchases ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para API (leitura pública, inserção e atualização de status de pagamento)
DROP POLICY IF EXISTS "Permitir leitura pública de status" ON status_purchases;
CREATE POLICY "Permitir leitura pública de status" 
  ON status_purchases FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Permitir inserção pública de status" ON status_purchases;
CREATE POLICY "Permitir inserção pública de status" 
  ON status_purchases FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização de pagamento de status" ON status_purchases;
CREATE POLICY "Permitir atualização de pagamento de status" 
  ON status_purchases FOR UPDATE 
  USING (true);

DROP POLICY IF EXISTS "Permitir leitura pública de vitrines" ON vitrine_purchases;
CREATE POLICY "Permitir leitura pública de vitrines" 
  ON vitrine_purchases FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Permitir inserção pública de vitrines" ON vitrine_purchases;
CREATE POLICY "Permitir inserção pública de vitrines" 
  ON vitrine_purchases FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização de pagamento de vitrines" ON vitrine_purchases;
CREATE POLICY "Permitir atualização de pagamento de vitrines" 
  ON vitrine_purchases FOR UPDATE 
  USING (true);
