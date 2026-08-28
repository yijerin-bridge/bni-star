-- 담당 직책 컬럼 추가 (Supabase SQL Editor에서 실행)
ALTER TABLE chapter_goals ADD COLUMN IF NOT EXISTS responsible_role TEXT;
