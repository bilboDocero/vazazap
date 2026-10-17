-- Schema for VorcaroZap Product Purchases & Status Simulation

CREATE TABLE IF NOT EXISTS status_purchases (
  id VARCHAR(64) PRIMARY KEY,
  plan_type VARCHAR(32) NOT NULL, -- 'status_normal' or 'status_impulsionado'
  file_count INTEGER NOT NULL DEFAULT 1, -- 1 to 4 files
  unit_price NUMERIC(10, 2) NOT NULL,
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_price NUMERIC(10, 2) NOT NULL,
  payment_status VARCHAR(32) NOT NULL DEFAULT 'approved',
  profile_name VARCHAR(120) NOT NULL,
  user_handle VARCHAR(120) NOT NULL,
  social_network VARCHAR(32) NOT NULL, -- 'instagram', 'tiktok', 'facebook', 'telegram'
  social_link VARCHAR(255) NOT NULL,
  caption TEXT,
  profile_pic TEXT, -- base64 or URL
  media_files JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of { id, url, name, type }
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_purchases_published_at ON status_purchases(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_purchases_social_network ON status_purchases(social_network);

CREATE TABLE IF NOT EXISTS vitrine_purchases (
  id VARCHAR(64) PRIMARY KEY,
  plan_type VARCHAR(32) NOT NULL, -- 'vitrine_normal' or 'vitrine_impulsionado'
  file_count INTEGER NOT NULL DEFAULT 1, -- 1 to 4 files
  unit_price NUMERIC(10, 2) NOT NULL,
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_price NUMERIC(10, 2) NOT NULL,
  payment_status VARCHAR(32) NOT NULL DEFAULT 'approved',
  profile_name VARCHAR(120) NOT NULL,
  user_handle VARCHAR(120) NOT NULL,
  social_network VARCHAR(32) NOT NULL, -- 'instagram', 'tiktok', 'facebook', 'telegram'
  social_link VARCHAR(255) NOT NULL,
  caption TEXT,
  profile_pic TEXT, -- base64 or URL
  media_files JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of { id, url, name, type, caption }
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vitrine_purchases_published_at ON vitrine_purchases(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_vitrine_purchases_social_network ON vitrine_purchases(social_network);
