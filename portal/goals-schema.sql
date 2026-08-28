-- ============================================================
-- BNI STAR — 챕터 목표 관리 스키마
-- Supabase SQL Editor에서 실행
-- ============================================================

CREATE TABLE IF NOT EXISTS chapter_goals (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year_month   TEXT NOT NULL,          -- 'YYYY-MM'
  metric_key   TEXT NOT NULL,          -- 'attendance_rate' | 'referral_count' | 'custom_xxx'
  metric_name  TEXT NOT NULL,          -- 화면 표시명
  metric_unit  TEXT DEFAULT '',        -- '%', '건', '명', '원' 등
  target_value NUMERIC NOT NULL,
  actual_value NUMERIC,                -- NULL = weekly_records 자동 집계 / NOT NULL = 수동 입력
  is_custom    BOOLEAN DEFAULT false,  -- true = 커스텀 지표
  sort_order   INT  DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (year_month, metric_key)
);

ALTER TABLE chapter_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_goals" ON chapter_goals
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE TRIGGER trg_chapter_goals_updated
  BEFORE UPDATE ON chapter_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
