-- ============================================================
-- BNI STAR Portal — PALMS 월별 기록 스키마
-- Supabase SQL Editor에서 실행
-- ============================================================

-- PALMS 월별 기록 (파일 가져오기 또는 직접 입력)
CREATE TABLE IF NOT EXISTS palms_records (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id    INT  REFERENCES members(id),
  member_name  TEXT NOT NULL,             -- 이름 직접 저장 (매핑 실패 대비)
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,

  -- 출석
  attendance   INT DEFAULT 0,
  absence      INT DEFAULT 0,
  late_leave   INT DEFAULT 0,
  sick_leave   INT DEFAULT 0,
  substitute   INT DEFAULT 0,

  -- 리퍼럴
  given_t1     INT     DEFAULT 0,
  given_t2     INT     DEFAULT 0,
  received_t1  INT     DEFAULT 0,
  received_t2  INT     DEFAULT 0,

  -- 기타
  visitors     INT     DEFAULT 0,
  one_on_one   INT     DEFAULT 0,
  tyfcb        NUMERIC DEFAULT 0,
  ceu          INT     DEFAULT 0,

  -- 계산 결과
  score        NUMERIC,
  light        TEXT DEFAULT 'new' CHECK (light IN ('green','yellow','red','new')),

  -- 수정 이력
  is_manual    BOOLEAN DEFAULT false,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (member_name, period_start)
);

-- 점수 기준 설정 (단일 행 — id=1 고정)
CREATE TABLE IF NOT EXISTS palms_score_config (
  id               INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),

  -- 출석률 (출석/전체 %)
  attend_weight    INT DEFAULT 30,
  attend_target    INT DEFAULT 80,    -- % 목표

  -- 리퍼럴 준 건수 (T1+T2)
  referral_weight  INT DEFAULT 25,
  referral_target  INT DEFAULT 2,     -- 건/월

  -- 감사장 금액
  tyfcb_weight     INT DEFAULT 20,
  tyfcb_target     INT DEFAULT 50,    -- 만원/월

  -- 1:1 횟수
  ono_weight       INT DEFAULT 15,
  ono_target       INT DEFAULT 2,     -- 회/월

  -- CEU
  ceu_weight       INT DEFAULT 10,
  ceu_target       INT DEFAULT 3,     -- 점/월

  -- 트래픽라이트 기준 (점수)
  green_min        INT DEFAULT 70,
  yellow_min       INT DEFAULT 40,

  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE palms_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE palms_score_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_palms_records" ON palms_records
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_palms_config"  ON palms_score_config
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- 기본 설정 삽입
INSERT INTO palms_score_config DEFAULT VALUES ON CONFLICT DO NOTHING;

-- updated_at 트리거
CREATE TRIGGER trg_palms_records_updated
  BEFORE UPDATE ON palms_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
