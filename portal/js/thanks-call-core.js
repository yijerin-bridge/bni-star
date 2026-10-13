/* ============================================================
   감사콜 캠페인 — 공용 로직 (기록 화면 / 포털 현황 화면 공통)
   W1 = 2026-08-31 주, 매주 월요일 시작, 총 30주
   ============================================================ */
const TC_START = '2026-08-31';
const TC_TOTAL_WEEKS = 30;
const TC_MID_WEEKS = 16;      // 앞면 W1~W16 (중간 확인 2026.12.20)
const TC_MID_MIN_WEEKS = 14;  // 16주 중 14주 이상 기록
const TC_MAX_GAP = 3;         // 연속 3주 이상 공백이면 기준 미달

function tcIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function tcToday() { return tcIso(new Date()); }

const TC_WEEKS = Array.from({ length: TC_TOTAL_WEEKS }, (_, i) => {
  const s = new Date(TC_START + 'T00:00:00'); s.setDate(s.getDate() + i * 7);
  const e = new Date(s); e.setDate(e.getDate() + 6);
  return { no: i + 1, start: tcIso(s), end: tcIso(e), label: `${String(s.getMonth() + 1).padStart(2, '0')}.${String(s.getDate()).padStart(2, '0')}`, slots: i === 0 ? 2 : 1 };
});

// 오늘이 속한 주차 (캠페인 시작 전 0, 종료 후 30)
function tcCurrentWeek(today = tcToday()) {
  if (today < TC_WEEKS[0].start) return 0;
  const w = TC_WEEKS.find(x => today >= x.start && today <= x.end);
  return w ? w.no : TC_TOTAL_WEEKS;
}

function tcEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// 멤버 한 명의 기록(rows)으로 진행 상태 계산
function tcProgress(rows, today = tcToday()) {
  const cur = tcCurrentWeek(today);
  const recorded = new Set(rows.map(r => r.week_no));
  const closed = TC_WEEKS.filter(w => w.end < today).map(w => w.no);          // 이미 끝난 주
  const closedMid = closed.filter(n => n <= TC_MID_WEEKS);
  const missedMid = closedMid.filter(n => !recorded.has(n)).length;
  let gap = 0, maxGap = 0;
  closedMid.forEach(n => { if (recorded.has(n)) gap = 0; else { gap++; if (gap > maxGap) maxGap = gap; } });
  const weeksMid = [...recorded].filter(n => n <= TC_MID_WEEKS).length;
  const allowedMiss = TC_MID_WEEKS - TC_MID_MIN_WEEKS;                         // 2주까지 빠져도 됨
  const failed = missedMid > allowedMiss || maxGap >= TC_MAX_GAP;
  const started = rows.length > 0;
  return {
    cur, recorded,
    weeks: recorded.size, weeksMid,
    calls: rows.length,
    meetings: rows.filter(r => r.meeting).length,
    visitors: rows.filter(r => r.visitor).length,
    missedMid, maxGap,
    doneThisWeek: cur > 0 && recorded.has(cur),
    status: !started ? 'none' : failed ? 'fail' : 'ok',
  };
}

const TC_STATUS = {
  ok:   { label: '순항',      color: '#16a34a', bg: '#f0fdf4' },
  fail: { label: '기준 미달', color: '#CC0000', bg: '#fff1f2' },
  none: { label: '미시작',    color: '#9ca3af', bg: '#f3f4f6' },
};
