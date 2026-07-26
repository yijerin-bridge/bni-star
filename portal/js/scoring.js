/* ============================================================
   BNI STAR — 채점 공유 모듈
   traffic-light.js / dashboard.js / dashboard-share.html /
   member-view.html 에서 공통 사용
   채점 기준 변경 시 이 파일만 수정하면 됩니다.
   ============================================================ */

const ANNUAL_MEMBERSHIP = 1600000; // 연간 멤버십 비용 (원)

/* ── 항목별 채점 함수 ── */
function scoreAttendance(recs) { if (!recs.length) return 0; const rate = recs.filter(r => !r.absent).length / recs.length; return rate >= 0.95 ? 10 : rate >= 0.88 ? 5 : 0; }
function scoreReferral(avg)    { return avg < 0.25 ? 0 : avg < 0.5 ? 5 : avg < 0.75 ? 10 : avg < 1.0 ? 15 : avg < 1.25 ? 20 : 25; }
function scoreTyfcb(total)     { const m = total / ANNUAL_MEMBERSHIP; return m <= 0 ? 0 : m < 2 ? 1 : m < 5 ? 2 : m < 15 ? 3 : m < 30 ? 4 : 5; }
function scoreVisitor(total)   { return total >= 5 ? 25 : total >= 4 ? 20 : total >= 3 ? 15 : total >= 2 ? 10 : total >= 1 ? 5 : 0; }
function scoreOno(avg)         { return avg < 0.25 ? 0 : avg < 0.5 ? 5 : avg < 0.75 ? 10 : avg < 1.0 ? 15 : 20; }
function scoreCeu(avg)         { return avg <= 0 ? 0 : avg < 0.5 ? 5 : 10; }
function scoreSponsored(n)     { return n >= 1 ? 5 : 0; }

/* ── 종합 채점 ── */
// pastWeeks: 실제 경과 주수 (분모) — 리퍼럴·1:1·CEU 주평균 계산에 사용
function calcMemberScore(recs, pastWeeks) {
  const n = recs.length;
  const empty = { total: 0, light: 'gray',
    breakdown: { attendance:0, referral:0, tyfcb:0, visitor:0, ono:0, ceu:0, sponsored:0 },
    stats: { n:0 } };
  if (!n) return empty;

  const absN         = recs.filter(r => r.absent).length;
  const lateN        = recs.filter(r => r.late).length;
  const totRef       = recs.reduce((s,r) => s + (r.given_t1||0) + (r.given_t2||0), 0);
  const totVis       = recs.reduce((s,r) => s + (r.visitors||0), 0);
  const totOno       = recs.reduce((s,r) => s + (r.one_on_one||0), 0);
  const totTyf       = recs.reduce((s,r) => s + (Number(r.tyfcb)||0), 0);
  const totCeu       = recs.reduce((s,r) => s + (r.ceu||0), 0);
  const totSponsored = recs.reduce((s,r) => s + (r.sponsored||0), 0);

  const totalWeeks = Math.max(pastWeeks != null ? pastWeeks : n, 1);
  const attendRate = recs.filter(r => !r.absent).length / n;

  const s1 = scoreAttendance(recs);
  const s2 = scoreReferral(totRef / totalWeeks);
  const s3 = scoreTyfcb(totTyf);
  const s4 = scoreVisitor(totVis);
  const s5 = scoreOno(totOno / totalWeeks);
  const s6 = scoreCeu(totCeu / totalWeeks);
  const s7 = scoreSponsored(totSponsored);
  const total = s1+s2+s3+s4+s5+s6+s7;
  const light = total >= 70 ? 'green' : total >= 50 ? 'amber' : total >= 30 ? 'red' : 'gray';

  return { total, light,
    breakdown: { attendance:s1, referral:s2, tyfcb:s3, visitor:s4, ono:s5, ceu:s6, sponsored:s7 },
    stats: { n, totalWeeks, absN, lateN, totRef, totVis, totOno, totTyf, totCeu, totSponsored, attendRate,
             avgRef:(totRef/totalWeeks).toFixed(2), avgVis:(totVis/totalWeeks).toFixed(2),
             avgOno:(totOno/totalWeeks).toFixed(2), avgCeu:(totCeu/totalWeeks).toFixed(2),
             tyfcbMult:(totTyf/ANNUAL_MEMBERSHIP).toFixed(1) } };
}
