-- ============================================================
-- Migration: add rich-content columns to existing courses table
-- + enable RLS with public read policy
-- Run once in Supabase SQL editor (or psql).
-- ============================================================

-- 1. Add the two new columns (idempotent) ---------------------
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS summary               TEXT[],
  ADD COLUMN IF NOT EXISTS complementary_courses JSONB;

-- 2. RLS on courses -------------------------------------------
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read" ON courses;
CREATE POLICY "Public read" ON courses
  FOR SELECT USING (true);

-- Notes:
--   • prerequisites  TEXT  — existing column; seed updates it with bullet-point text
--   • key_takeaways  TEXT  — existing column; seed updates it with bullet-point text
--   • summary        TEXT[] — new; stores 3-5 relevance bullets as an array
--   • complementary_courses JSONB — new; array of { course, term, credits, area, faculty, why }
--
--   The service-role key used by the seed script bypasses RLS automatically.
