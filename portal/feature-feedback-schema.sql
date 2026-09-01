-- 피처 프레젠테이션 피드백 테이블 (Supabase SQL Editor에서 실행)
CREATE TABLE IF NOT EXISTS feature_feedback (
  id           BIGSERIAL PRIMARY KEY,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  presenter_name TEXT NOT NULL,
  q1 INT CHECK (q1 BETWEEN 1 AND 5),  -- 무엇을 하는 사람인지 명확하게 이해됐다
  q2 INT CHECK (q2 BETWEEN 1 AND 5),  -- 어떤 고객을 찾고 있는지 구체적으로 그려졌다
  q3 INT CHECK (q3 BETWEEN 1 AND 5),  -- 경쟁자와 다른 강점이 기억에 남는다
  q4 INT CHECK (q4 BETWEEN 1 AND 5),  -- "이런 분 소개해 주세요" 요청이 분명했다
  q5 INT CHECK (q5 BETWEEN 1 AND 5),  -- 소개하고 싶은 사람이 실제로 떠올랐다
  q6 INT CHECK (q6 BETWEEN 1 AND 5),  -- 믿고 소개해도 되겠다는 신뢰가 느껴졌다
  comment TEXT
);

-- RLS: 누구나 INSERT 가능, 읽기도 공개
ALTER TABLE feature_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public insert" ON feature_feedback
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "public read" ON feature_feedback
  FOR SELECT TO anon USING (true);

CREATE POLICY "public delete" ON feature_feedback
  FOR DELETE TO anon USING (true);
