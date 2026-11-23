-- 멤버 인터뷰(갱신·6개월 리뷰) 일정 테이블
-- Supabase SQL Editor에서 한 번 실행하세요. 여러 번 실행해도 안전합니다.
CREATE TABLE IF NOT EXISTS member_interviews (
  member_name  TEXT PRIMARY KEY,     -- 인터뷰 대상
  renewal_date DATE,                 -- 갱신일자
  interviewer1 TEXT,
  interviewer2 TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE member_interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read member_interviews"   ON member_interviews;
DROP POLICY IF EXISTS "public insert member_interviews" ON member_interviews;
DROP POLICY IF EXISTS "public update member_interviews" ON member_interviews;
DROP POLICY IF EXISTS "public delete member_interviews" ON member_interviews;
CREATE POLICY "public read member_interviews"   ON member_interviews FOR SELECT TO anon USING (true);
CREATE POLICY "public insert member_interviews" ON member_interviews FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "public update member_interviews" ON member_interviews FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public delete member_interviews" ON member_interviews FOR DELETE TO anon USING (true);

NOTIFY pgrst, 'reload schema';
