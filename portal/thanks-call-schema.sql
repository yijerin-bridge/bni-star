-- 감사콜 30주 기록 테이블
-- Supabase SQL Editor에서 한 번 실행하세요.
CREATE TABLE IF NOT EXISTS thanks_calls (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  member_name TEXT NOT NULL,
  week_no     INT  NOT NULL CHECK (week_no BETWEEN 1 AND 30),
  slot        INT  NOT NULL DEFAULT 1 CHECK (slot IN (1, 2)),  -- W1은 더블 감사 위크(2통)
  call_date   DATE,
  callee      TEXT NOT NULL,           -- 감사 드린 분 (성함)
  meeting     BOOLEAN DEFAULT FALSE,   -- 만남 약속
  visitor     BOOLEAN DEFAULT FALSE,   -- 비지터 초청
  UNIQUE (member_name, week_no, slot)
);

ALTER TABLE thanks_calls ENABLE ROW LEVEL SECURITY;

-- 멤버가 로그인 없이 링크로 기록하므로 공개 키로 읽기·쓰기를 허용합니다.
CREATE POLICY "public read thanks_calls"   ON thanks_calls FOR SELECT TO anon USING (true);
CREATE POLICY "public insert thanks_calls" ON thanks_calls FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "public update thanks_calls" ON thanks_calls FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public delete thanks_calls" ON thanks_calls FOR DELETE TO anon USING (true);
