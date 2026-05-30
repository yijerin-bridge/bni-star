-- ============================================================
-- BNI STAR — 주간 기록 테이블 (매주 수요일 기준)
-- Supabase SQL Editor에서 실행
-- ============================================================

CREATE TABLE IF NOT EXISTS weekly_records (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id   INT  REFERENCES members(id),
  member_name TEXT NOT NULL,
  week_date   DATE NOT NULL,          -- 매주 수요일 날짜

  -- 출결
  attended    BOOLEAN DEFAULT true,
  absent      BOOLEAN DEFAULT false,
  late        BOOLEAN DEFAULT false,
  sick        BOOLEAN DEFAULT false,
  substitute  BOOLEAN DEFAULT false,

  -- 활동
  given_t1    INT     DEFAULT 0,
  given_t2    INT     DEFAULT 0,
  visitors    INT     DEFAULT 0,
  one_on_one  INT     DEFAULT 0,
  tyfcb       NUMERIC DEFAULT 0,      -- 받은 감사장 금액
  ceu         INT     DEFAULT 0,      -- 교육 점수

  is_estimated BOOLEAN DEFAULT false, -- 미래 추정치 여부
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (member_name, week_date)
);

ALTER TABLE weekly_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_weekly_records" ON weekly_records;
CREATE POLICY "anon_all_weekly_records" ON weekly_records
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_weekly_records_updated ON weekly_records;
CREATE TRIGGER trg_weekly_records_updated
  BEFORE UPDATE ON weekly_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
