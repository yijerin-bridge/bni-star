-- ============================================================
-- BNI Traffic Light - Supabase Schema
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 주간 활동 기록
CREATE TABLE IF NOT EXISTS traffic_weekly_records (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id     INTEGER NOT NULL,
  week_start    DATE NOT NULL,          -- 해당 주 수요일
  attended      BOOLEAN DEFAULT false,
  one_on_one    INTEGER DEFAULT 0,
  education     BOOLEAN DEFAULT false,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, week_start)
);

-- 레퍼럴 흐름 (A → B)
CREATE TABLE IF NOT EXISTS traffic_referral_flows (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_member_id INTEGER NOT NULL,
  to_member_id   INTEGER NOT NULL,
  amount         NUMERIC(12,0) DEFAULT 0,
  description    TEXT,
  referral_date  DATE NOT NULL,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending','closed','rejected')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) - anon key로 읽기/쓰기 허용 (위원회 내부용)
ALTER TABLE traffic_weekly_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_referral_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_weekly" ON traffic_weekly_records
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_referral" ON traffic_referral_flows
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_weekly_updated_at
  BEFORE UPDATE ON traffic_weekly_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 기존 테이블 업데이트 (이미 생성된 경우 아래만 실행)
-- ============================================================
ALTER TABLE traffic_weekly_records ADD COLUMN IF NOT EXISTS education BOOLEAN DEFAULT false;
ALTER TABLE traffic_weekly_records DROP COLUMN IF EXISTS referrals_given;
ALTER TABLE traffic_weekly_records DROP COLUMN IF EXISTS closed_business_received;
