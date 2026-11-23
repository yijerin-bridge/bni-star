-- 인터뷰 일정: 6개월 리뷰 칸 추가 (기존 interviewer1·2 = 갱신 인터뷰어)
-- Supabase SQL Editor에서 한 번 실행하세요. 여러 번 실행해도 안전합니다.
ALTER TABLE member_interviews ADD COLUMN IF NOT EXISTS review_date         DATE;
ALTER TABLE member_interviews ADD COLUMN IF NOT EXISTS review_interviewer1 TEXT;
ALTER TABLE member_interviews ADD COLUMN IF NOT EXISTS review_interviewer2 TEXT;
NOTIFY pgrst, 'reload schema';
