-- 인터뷰 일정: 갱신 인터뷰·6개월 리뷰 완료 체크 칸 추가
-- Supabase SQL Editor에서 한 번 실행하세요. 여러 번 실행해도 안전합니다.
ALTER TABLE member_interviews ADD COLUMN IF NOT EXISTS renewal_done BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE member_interviews ADD COLUMN IF NOT EXISTS review_done  BOOLEAN NOT NULL DEFAULT false;
NOTIFY pgrst, 'reload schema';
