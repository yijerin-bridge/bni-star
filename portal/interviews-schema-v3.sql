-- 인터뷰 일정: 멘토링(90일 리뷰) O/X 칸 추가
-- Supabase SQL Editor에서 한 번 실행하세요. 여러 번 실행해도 안전합니다.
ALTER TABLE member_interviews ADD COLUMN IF NOT EXISTS mentoring TEXT;  -- 'O' / 'X' / NULL
NOTIFY pgrst, 'reload schema';
