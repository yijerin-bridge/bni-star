-- 랜딩 통합 상담 신청 저장 테이블
-- Supabase SQL Editor에서 한 번 실행하세요.
CREATE TABLE IF NOT EXISTS consult_requests (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  call_time  TEXT,
  topics     TEXT,
  expert     TEXT,
  message    TEXT,
  status     TEXT DEFAULT 'new'
);

ALTER TABLE consult_requests ENABLE ROW LEVEL SECURITY;

-- 방문자는 신청(INSERT)만 가능. 조회 정책이 없으므로 공개 키로는 읽을 수 없고,
-- 신청 내역은 Supabase 대시보드(Table Editor)에서만 보입니다.
CREATE POLICY "public insert consult" ON consult_requests
  FOR INSERT TO anon WITH CHECK (true);
