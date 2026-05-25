-- ============================================================
-- BNI STAR Portal — 신규 스키마
-- Supabase SQL Editor에서 실행
-- 기존 traffic_* 테이블 수정 없음
-- ============================================================

-- 역할 정의
CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  tier        INT  NOT NULL CHECK (tier IN (1,2,3)),
  role_type   TEXT NOT NULL CHECK (role_type IN ('board','leader','membership','member')),
  description TEXT
);

INSERT INTO roles (name, tier, role_type, description) VALUES
  ('회장',         1, 'board',      '챕터 회장'),
  ('부회장',       1, 'board',      '챕터 부회장'),
  ('서기',         1, 'board',      '챕터 서기'),
  ('재무',         1, 'board',      '챕터 재무'),
  ('교육조정관',   2, 'leader',     '교육 프로그램 조정'),
  ('멘토팀장',     2, 'leader',     '멤버 멘토링'),
  ('방문객호스트', 2, 'leader',     '방문객 초대 및 환영'),
  ('파워포인트',   2, 'leader',     '미팅 진행'),
  ('멤버십위원장', 2, 'membership', '멤버십위원회 위원장'),
  ('멤버십위원',   2, 'membership', '멤버십위원회 위원'),
  ('일반멤버',     3, 'member',     '일반 멤버')
ON CONFLICT DO NOTHING;

-- 멤버 영구 테이블 (탈퇴 후에도 기록 보존)
CREATE TABLE IF NOT EXISTS members (
  id          SERIAL PRIMARY KEY,
  legacy_id   INT  UNIQUE,   -- members-data.js 기존 id 브릿지
  name        TEXT NOT NULL,
  company     TEXT,
  category    TEXT,
  phone       TEXT,
  email       TEXT,
  joined_date DATE,
  left_date   DATE,
  is_active   BOOLEAN DEFAULT true,
  photo_url   TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 역할 임기 테이블 (매년 임원 교체 이력 누적)
CREATE TABLE IF NOT EXISTS member_roles (
  id          SERIAL PRIMARY KEY,
  member_id   INT  NOT NULL REFERENCES members(id),
  role_id     INT  NOT NULL REFERENCES roles(id),
  term_start  DATE NOT NULL,
  term_end    DATE,
  is_current  BOOLEAN DEFAULT true,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 회의 (4종: weekly_bni | board | membership | leader_team)
CREATE TABLE IF NOT EXISTS meetings (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('weekly_bni','board','membership','leader_team')),
  meeting_date DATE NOT NULL,
  title        TEXT,
  presider_id  INT REFERENCES members(id),
  recorder_id  INT REFERENCES members(id),
  status       TEXT DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_attendees (
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  member_id   INT  NOT NULL REFERENCES members(id),
  attended    BOOLEAN DEFAULT false,
  PRIMARY KEY (meeting_id, member_id)
);

CREATE TABLE IF NOT EXISTS meeting_minutes (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id   UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  content      TEXT,               -- 마크다운
  decisions    JSONB DEFAULT '[]', -- [{text, assignee_id, due_date}]
  next_actions JSONB DEFAULT '[]',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 인수인계
CREATE TABLE IF NOT EXISTS handover_records (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id      INT  NOT NULL REFERENCES roles(id),
  outgoing_id  INT  REFERENCES members(id),
  incoming_id  INT  REFERENCES members(id),
  term_start   DATE,
  term_end     DATE,
  status       TEXT DEFAULT 'draft' CHECK (status IN ('draft','complete')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS handover_items (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_id         UUID NOT NULL REFERENCES handover_records(id) ON DELETE CASCADE,
  category            TEXT NOT NULL CHECK (category IN ('decision','ongoing','contact','resource','caution','achievement')),
  title               TEXT NOT NULL,
  content             TEXT,
  priority            TEXT DEFAULT 'normal' CHECK (priority IN ('high','normal','low')),
  related_meeting_id  UUID REFERENCES meetings(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 챕터 전체 히스토리 (영구 아카이브)
CREATE TABLE IF NOT EXISTS chapter_history (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_date DATE NOT NULL,
  category   TEXT NOT NULL CHECK (category IN ('policy','member','achievement','warning','system')),
  title      TEXT NOT NULL,
  content    TEXT,
  visibility TEXT DEFAULT 'all' CHECK (visibility IN ('board','leader','all')),
  author_id  INT REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS — 개발 중 anon 전체 허용 (Auth 연동 시 교체)
ALTER TABLE roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_roles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_minutes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_history  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_roles"             ON roles             FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_members"           ON members           FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_member_roles"      ON member_roles      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_meetings"          ON meetings          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_meeting_attendees" ON meeting_attendees FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_meeting_minutes"   ON meeting_minutes   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_handover_records"  ON handover_records  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_handover_items"    ON handover_items    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_chapter_history"   ON chapter_history   FOR ALL TO anon USING (true) WITH CHECK (true);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_meetings_updated_at
  BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_minutes_updated_at
  BEFORE UPDATE ON meeting_minutes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
