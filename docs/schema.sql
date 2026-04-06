-- Pin Schema for Supabase
-- Run this in Supabase SQL Editor

-- Pins table
CREATE TABLE IF NOT EXISTS brain_pins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  thread_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Threads table
CREATE TABLE IF NOT EXISTS brain_pin_threads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  pin_ids uuid[] DEFAULT '{}',
  is_primary boolean DEFAULT false,
  insight text,
  question text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pins_user ON brain_pins(user_id);
CREATE INDEX IF NOT EXISTS idx_pins_thread ON brain_pins(thread_id);
CREATE INDEX IF NOT EXISTS idx_threads_user ON brain_pin_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_primary ON brain_pin_threads(is_primary) WHERE is_primary = true;

-- RLS
ALTER TABLE brain_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_pin_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pins" ON brain_pins
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own threads" ON brain_pin_threads
  FOR ALL USING (auth.uid() = user_id);
