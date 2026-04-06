-- Pin Cognitive System v2 — Full Schema
-- Run in Supabase SQL Editor

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 1. PINS — every thought captured
-- ============================================
CREATE TABLE IF NOT EXISTS brain_pins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL DEFAULT 'default',
  text text NOT NULL,
  thread_id uuid,
  session_id text,
  embedding vector(768),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pins_user ON brain_pins(user_id);
CREATE INDEX IF NOT EXISTS idx_pins_thread ON brain_pins(thread_id);
CREATE INDEX IF NOT EXISTS idx_pins_session ON brain_pins(session_id);
CREATE INDEX IF NOT EXISTS idx_pins_created ON brain_pins(created_at DESC);

-- ============================================
-- 2. THREADS — discovered connections
-- ============================================
CREATE TABLE IF NOT EXISTS brain_pin_threads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL DEFAULT 'default',
  label text NOT NULL,
  pin_ids uuid[] DEFAULT '{}',
  is_primary boolean DEFAULT false,
  insight text,
  question text,
  action text,
  action_type text CHECK (action_type IN ('task', 'goal', 'reflection')),
  embedding vector(768),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_threads_user ON brain_pin_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_primary ON brain_pin_threads(is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_threads_created ON brain_pin_threads(created_at DESC);

-- ============================================
-- 3. INSIGHTS — standalone insight log
-- ============================================
CREATE TABLE IF NOT EXISTS brain_pin_insights (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL DEFAULT 'default',
  thread_id uuid REFERENCES brain_pin_threads(id) ON DELETE SET NULL,
  insight text NOT NULL,
  question text,
  action text,
  action_type text CHECK (action_type IN ('task', 'goal', 'reflection')),
  source_pin_ids uuid[] DEFAULT '{}',
  depth_score integer DEFAULT 1 CHECK (depth_score BETWEEN 1 AND 10),
  embedding vector(768),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insights_user ON brain_pin_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_created ON brain_pin_insights(created_at DESC);

-- ============================================
-- 4. ACTIONS — trackable next steps
-- ============================================
CREATE TABLE IF NOT EXISTS brain_pin_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL DEFAULT 'default',
  insight_id uuid REFERENCES brain_pin_insights(id) ON DELETE SET NULL,
  thread_id uuid REFERENCES brain_pin_threads(id) ON DELETE SET NULL,
  text text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('task', 'goal', 'reflection')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'skipped')),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_actions_user ON brain_pin_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON brain_pin_actions(status) WHERE status = 'pending';

-- ============================================
-- 5. USER PROFILES — cognitive identity
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id text PRIMARY KEY DEFAULT 'default',
  recurring_themes text[] DEFAULT '{}',
  emotional_patterns text[] DEFAULT '{}',
  active_goals text[] DEFAULT '{}',
  total_pins integer DEFAULT 0,
  total_reveals integer DEFAULT 0,
  depth_level integer DEFAULT 1 CHECK (depth_level BETWEEN 1 AND 10),
  cognitive_signature text,
  last_active timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- VECTOR SIMILARITY SEARCH FUNCTIONS
-- ============================================

-- Find similar pins by embedding
CREATE OR REPLACE FUNCTION match_pins(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  p_user_id text DEFAULT 'default'
)
RETURNS TABLE (
  id uuid,
  text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    brain_pins.id,
    brain_pins.text,
    1 - (brain_pins.embedding <=> query_embedding) AS similarity
  FROM brain_pins
  WHERE brain_pins.user_id = p_user_id
    AND brain_pins.embedding IS NOT NULL
    AND 1 - (brain_pins.embedding <=> query_embedding) > match_threshold
  ORDER BY brain_pins.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Find similar insights by embedding
CREATE OR REPLACE FUNCTION match_insights(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 3,
  p_user_id text DEFAULT 'default'
)
RETURNS TABLE (
  id uuid,
  insight text,
  question text,
  action text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    brain_pin_insights.id,
    brain_pin_insights.insight,
    brain_pin_insights.question,
    brain_pin_insights.action,
    1 - (brain_pin_insights.embedding <=> query_embedding) AS similarity
  FROM brain_pin_insights
  WHERE brain_pin_insights.user_id = p_user_id
    AND brain_pin_insights.embedding IS NOT NULL
    AND 1 - (brain_pin_insights.embedding <=> query_embedding) > match_threshold
  ORDER BY brain_pin_insights.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Seed default profile
INSERT INTO user_profiles (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
