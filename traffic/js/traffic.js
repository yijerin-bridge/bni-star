/* ============================================================
   BNI STAR — Traffic Light Dashboard
   ============================================================ */

const TRAFFIC_PW = 'dlwofls1!';  // 비밀번호 여기서 변경

// Supabase — 지연 초기화 (CDN 로딩 타이밍 이슈 방지)
let _sb = null;
function getSb() {
  if (!_sb) {
    if (!window.supabase) throw new Error('Supabase CDN 미로드');
    _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }
  return _sb;
}

// 트래픽라이트 판정 기준 (최근 4주 기준)
const CRITERIA = {
  attendanceMin: 3,   // 4주 중 3회 이상
  onoMin: 1,          // 4주 중 1회 이상
  referralMin: 1,     // 4주 중 1건 이상
};

// 상태
let members = [];
let weeklyRecords = [];
let referralFlows = [];
let attendVal = true;
let selectedMonth = { year: new Date().getFullYear(), month: new Date().getMonth() }; // 0-indexed
let memberStats = [];  // 계산된 멤버별 통계
let chartInstances = {};  // Chart.js 인스턴스 보관

/* ─────────────────────────────────────────
   유틸
───────────────────────────────────────── */
function toLocalDateStr(d) {
  // toISOString()은 UTC 기준이라 한국(UTC+9)에서 날짜 어긋남 → 로컬 기준으로
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMondayOf(dateStr) {
  // BNI 수원 챕터: 수요일(3) 기준 주차
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  const day = d.getDay(); // 0=일 1=월 2=화 3=수 4=목 5=금 6=토
  const diff = (day >= 3) ? 3 - day : 3 - day - 7;
  d.setDate(d.getDate() + diff);
  return toLocalDateStr(d);
}

function fmt(n) {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '억';
  if (n >= 10000) return (n / 10000).toFixed(0) + '만';
  return n.toLocaleString();
}

function getRecentWeeks(n = 4) {
  const weeks = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 7);
    weeks.push(getMondayOf(d.toISOString().slice(0, 10)));
  }
  return weeks;
}

function tlClass(status) {
  if (status === 'green') return 'green';
  if (status === 'yellow') return 'yellow';
  if (status === 'new') return 'new';
  return 'red';
}
function tlLabel(status) {
  if (status === 'green') return '🟢 Green';
  if (status === 'yellow') return '🟡 Yellow';
  if (status === 'new') return '⚪ 미입력';
  return '🔴 Red';
}

/* ─────────────────────────────────────────
   트래픽라이트 계산 (최근 4주)
───────────────────────────────────────── */
function calcMemberStats() {
  const recentWeeks = getRecentWeeks(4);
  // 최근 4주 날짜 범위
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 28);

  memberStats = members.map(m => {
    const recs = weeklyRecords.filter(r =>
      r.member_id === m.id && recentWeeks.includes(r.week_start)
    );
    const attendance = recs.filter(r => r.attended).length;
    const ono = recs.reduce((s, r) => s + (r.one_on_one || 0), 0);
    const education = recs.filter(r => r.education).length;
    const visitors = recs.reduce((s, r) => s + (r.visitors_invited || 0), 0);

    // 리퍼럴 건수: 리퍼럴 흐름 테이블에서 집계
    const referrals = referralFlows.filter(f =>
      f.from_member_id === m.id && new Date(f.referral_date) >= cutoff
    ).length;

    const critAttend = attendance >= CRITERIA.attendanceMin;
    const critOno = ono >= CRITERIA.onoMin;
    const critReferral = referrals >= CRITERIA.referralMin;
    const failCount = [critAttend, critOno, critReferral].filter(v => !v).length;

    let status = 'green';
    if (failCount === 1) status = 'yellow';
    if (failCount >= 2) status = 'red';
    if (recs.length === 0) status = 'new';

    // 추세: 최근 8주 주별 리퍼럴 건수
    const allWeeks = getRecentWeeks(8);
    const trend = allWeeks.map(w => {
      const wDate = new Date(w);
      const wEnd = new Date(w); wEnd.setDate(wEnd.getDate() + 7);
      return referralFlows.filter(f =>
        f.from_member_id === m.id &&
        new Date(f.referral_date) >= wDate &&
        new Date(f.referral_date) < wEnd
      ).length;
    });

    // 리퍼럴 성사금액 (준 것 / 받은 것)
    const refAmountReceived = referralFlows
      .filter(f => f.to_member_id === m.id && f.status === 'closed')
      .reduce((s, f) => s + (f.amount || 0), 0);
    const refAmountGiven = referralFlows
      .filter(f => f.from_member_id === m.id && f.status === 'closed')
      .reduce((s, f) => s + (f.amount || 0), 0);

    return {
      ...m, attendance, ono, education, visitors, referrals,
      refAmountReceived, refAmountGiven,
      status, critAttend, critOno, critReferral, trend, recs
    };
  });
}

/* ─────────────────────────────────────────
   로그인 (비활성화)
───────────────────────────────────────── */
function initLogin() {
  init();
}

/* ─────────────────────────────────────────
   탭 네비게이션
───────────────────────────────────────── */
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'network') renderNetwork();
      renderAIDirector(btn.dataset.tab);
    });
  });

  document.querySelectorAll('.input-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.input-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.input-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('ipanel-' + btn.dataset.itab).classList.add('active');
    });
  });
}

/* ─────────────────────────────────────────
   데이터 로드
───────────────────────────────────────── */
async function loadData() {
  // 회원 데이터: members-data.js (bni-star와 동일 배포, 항상 최신)
  members = (typeof MEMBERS_DEFAULT !== 'undefined') ? [...MEMBERS_DEFAULT] : [];
  console.log('멤버 로드:', members.length, '명');

  // Supabase에서 활동 데이터 로드 (테이블 없어도 페이지 표시)
  try {
    const [{ data: wr, error: e1 }, { data: rf, error: e2 }] = await Promise.all([
      getSb().from('traffic_weekly_records').select('*').order('week_start', { ascending: false }),
      getSb().from('traffic_referral_flows').select('*').order('referral_date', { ascending: false }),
    ]);
    if (e1 || e2) {
      console.warn('Supabase 테이블 미생성 — Supabase SQL Editor에서 supabase-schema.sql을 실행하세요');
      showSchemaWarning();
    }
    weeklyRecords = wr || [];
    referralFlows = rf || [];
  } catch (e) {
    console.error(e);
    showSchemaWarning();
  }
  calcMemberStats();
}

function showSchemaWarning() {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#1A1A2E;color:white;padding:12px 20px;border-radius:12px;font-size:.85rem;z-index:999;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3)';
  el.innerHTML = '⚠️ Supabase 테이블 미생성 — SQL Editor에서 <b>supabase-schema.sql</b> 실행 필요';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 8000);
}

/* ─────────────────────────────────────────
   ① 대시보드
───────────────────────────────────────── */
function renderDashboard() {
  const green = memberStats.filter(m => m.status === 'green').length;
  const yellow = memberStats.filter(m => m.status === 'yellow').length;
  const red = memberStats.filter(m => m.status === 'red').length;
  const total = memberStats.length;

  const totalReferrals = memberStats.reduce((s, m) => s + m.referrals, 0);
  const totalRefAmount = memberStats.reduce((s, m) => s + m.refAmountReceived, 0);
  const totalVisitors = memberStats.reduce((s, m) => s + m.visitors, 0);
  const avgOno = total ? (memberStats.reduce((s, m) => s + m.ono, 0) / total).toFixed(1) : 0;
  const healthScore = total ? Math.round((green * 100 + yellow * 50) / total) : 0;

  // KPI
  document.getElementById('kpiGrid').innerHTML = [
    { label: '챕터 건강 점수', value: healthScore, unit: '점' },
    { label: '총 리퍼럴 (4주)', value: totalReferrals, unit: '건' },
    { label: '리퍼럴 성사금액', value: fmt(totalRefAmount), unit: '원' },
    { label: '평균 1:1 (4주)', value: avgOno, unit: '회' },
    { label: '비지터 초대 (4주)', value: totalVisitors, unit: '명' },
  ].map(k => `
    <div class="kpi-card">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.value}<small style="font-size:.7em;font-weight:500"> ${k.unit}</small></div>
    </div>`).join('');

  // 트래픽 분포
  document.getElementById('trafficDist').innerHTML = `
    <div class="tl-badge green"><div class="tl-count">${green}</div><div class="tl-label">🟢 Green</div></div>
    <div class="tl-badge yellow"><div class="tl-count">${yellow}</div><div class="tl-label">🟡 Yellow</div></div>
    <div class="tl-badge red"><div class="tl-count">${red}</div><div class="tl-label">🔴 Red</div></div>`;

  renderChart('chartDist', 'doughnut',
    ['Green', 'Yellow', 'Red'],
    [green, yellow, red],
    ['#27AE60', '#F39C12', '#CC0000']
  );

  // 주간 추이 (최근 8주)
  const weeks = getRecentWeeks(8);
  const weeklyTotals = weeks.map(w =>
    weeklyRecords.filter(r => r.week_start === w).reduce((s, r) => s + (r.referrals_given || 0), 0)
  );
  renderChart('chartTrend', 'line',
    weeks.map(w => w.slice(5)),
    weeklyTotals,
    ['#CC0000']
  );

  // Top/Bottom 5
  const sorted = [...memberStats].sort((a, b) => b.referrals - a.referrals);
  renderRankList('rankReferralTop', sorted.slice(0, 5), m => `${m.referrals}건`);
  renderRankList('rankReferralBottom', sorted.slice(-5).reverse(), m => `${m.referrals}건`);

  const sortedOno = [...memberStats].sort((a, b) => b.ono - a.ono);
  renderRankList('rankOnoTop', sortedOno.slice(0, 5), m => `${m.ono}회`);
  renderRankList('rankOnoBottom', sortedOno.slice(-5).reverse(), m => `${m.ono}회`);

  // 챕터 배지
  document.getElementById('chapterBadge').textContent = `전체 ${total}명`;
}

function renderRankList(id, list, valFn) {
  const nums = ['1', '2', '3', '4', '5'];
  const numClass = ['gold', 'silver', 'bronze', '', ''];
  document.getElementById(id).innerHTML = list.map((m, i) => `
    <div class="rank-item">
      <span class="rank-num ${numClass[i]}">${nums[i]}</span>
      <div style="flex:1">
        <div class="rank-name">${m.name}</div>
        <div class="rank-cat">${m.category}</div>
      </div>
      <span class="rank-val">${valFn(m)}</span>
      <span class="rank-tl ${tlClass(m.status)}">${tlLabel(m.status)}</span>
    </div>`).join('') || '<div class="empty-msg">데이터 없음</div>';
}

function renderChart(id, type, labels, data, colors) {
  if (typeof Chart === 'undefined') return;
  const ctx = document.getElementById(id);
  if (!ctx) return;
  if (chartInstances[id]) chartInstances[id].destroy();

  const datasets = [{
    data,
    backgroundColor: type === 'doughnut' ? colors : colors[0] + '33',
    borderColor: colors[0],
    borderWidth: type === 'line' ? 2 : 1,
    tension: 0.4,
    fill: type === 'line',
    pointRadius: 3,
  }];

  chartInstances[id] = new Chart(ctx, {
    type,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: type === 'doughnut', position: 'bottom',
          labels: { font: { size: 11 }, padding: 10, boxWidth: 12 }
        }
      },
      scales: type !== 'doughnut' ? {
        y: { beginAtZero: true, ticks: { font: { size: 10 } } },
        x: { ticks: { font: { size: 10 } } }
      } : {},
    }
  });
}

/* ─────────────────────────────────────────
   ② 개인 성과
───────────────────────────────────────── */
function calcMonthStats(year, month) {
  // 해당 월의 시작/끝
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  // 해당 월의 수요일 목록
  const wednesdays = [];
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 3) wednesdays.push(toLocalDateStr(new Date(d)));
  }
  const totalMeetings = wednesdays.length; // 이 달의 총 미팅 수

  return members.map(m => {
    const recs = weeklyRecords.filter(r =>
      r.member_id === m.id && wednesdays.includes(r.week_start)
    );
    const attendance = recs.filter(r => r.attended).length;
    const ono = recs.reduce((s, r) => s + (r.one_on_one || 0), 0);
    const education = recs.filter(r => r.education).length;
    const visitors = recs.reduce((s, r) => s + (r.visitors_invited || 0), 0);

    const referrals = referralFlows.filter(f =>
      f.from_member_id === m.id &&
      new Date(f.referral_date) >= monthStart &&
      new Date(f.referral_date) <= monthEnd
    ).length;

    const attendanceMin = Math.ceil(totalMeetings * 0.75); // 75% 이상
    const critAttend = attendance >= attendanceMin;
    const critOno = ono >= CRITERIA.onoMin;
    const critReferral = referrals >= CRITERIA.referralMin;
    const failCount = [critAttend, critOno, critReferral].filter(v => !v).length;

    let status = 'green';
    if (failCount === 1) status = 'yellow';
    if (failCount >= 2) status = 'red';
    if (recs.length === 0) status = 'new';

    const refAmountReceived = referralFlows
      .filter(f => f.to_member_id === m.id && f.status === 'closed' &&
        new Date(f.referral_date) >= monthStart && new Date(f.referral_date) <= monthEnd)
      .reduce((s, f) => s + (f.amount || 0), 0);
    const refAmountGiven = referralFlows
      .filter(f => f.from_member_id === m.id && f.status === 'closed' &&
        new Date(f.referral_date) >= monthStart && new Date(f.referral_date) <= monthEnd)
      .reduce((s, f) => s + (f.amount || 0), 0);

    return {
      ...m, attendance, totalMeetings, ono, education, visitors, referrals,
      refAmountReceived, refAmountGiven,
      status, critAttend, critOno, critReferral, recs
    };
  });
}

function renderMembers(filter = '', lightFilter = '') {
  const stats = calcMonthStats(selectedMonth.year, selectedMonth.month);
  let list = stats;
  if (filter) list = list.filter(m => m.name.includes(filter) || m.category.includes(filter));
  if (lightFilter) list = list.filter(m => m.status === lightFilter);

  document.getElementById('memberGrid').innerHTML = list.map(m => `
    <div class="member-card ${tlClass(m.status)}">
      <div class="mc-header">
        <img class="mc-avatar" src="${m.photoUrl || ''}" onerror="this.src=''" alt="${m.name}">
        <div class="mc-info">
          <div class="mc-name">${m.name}</div>
          <div class="mc-cat">${m.company} · ${m.category}</div>
        </div>
        <span class="mc-tl ${tlClass(m.status)}">${tlLabel(m.status)}</span>
      </div>
      <div class="mc-stats">
        <div class="mc-stat"><div class="mc-stat-val">${m.attendance}/${m.totalMeetings}</div><div class="mc-stat-label">출석</div></div>
        <div class="mc-stat"><div class="mc-stat-val">${m.ono}</div><div class="mc-stat-label">1:1</div></div>
        <div class="mc-stat"><div class="mc-stat-val">${m.referrals}</div><div class="mc-stat-label">리퍼럴</div></div>
        <div class="mc-stat"><div class="mc-stat-val">${m.visitors}</div><div class="mc-stat-label">비지터</div></div>
        <div class="mc-stat"><div class="mc-stat-val">${fmt(m.refAmountReceived)}</div><div class="mc-stat-label">성사금액</div></div>
      </div>
      <div class="mc-criteria">
        <span class="mc-crit ${m.critAttend ? 'ok' : 'fail'}">${m.critAttend ? '✓' : '✗'} 출석</span>
        <span class="mc-crit ${m.critOno ? 'ok' : 'fail'}">${m.critOno ? '✓' : '✗'} 1:1</span>
        <span class="mc-crit ${m.critReferral ? 'ok' : 'fail'}">${m.critReferral ? '✓' : '✗'} 리퍼럴</span>
        <span style="flex:1"></span>
        <span style="font-size:.72rem;color:#999">준 금액 ${fmt(m.refAmountGiven)}원</span>
      </div>
    </div>`).join('') || '<div class="empty-msg">해당하는 멤버 없음</div>';
}

/* ─────────────────────────────────────────
   ③ 리퍼럴 네트워크
───────────────────────────────────────── */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function renderNetwork() {
  const container = document.getElementById('networkContainer');
  if (!container) return;

  if (!window.vis) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#999">로딩 중...</div>';
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/vis-network@9.1.9/dist/vis-network.min.js');
    } catch {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:#CC0000">vis-network 로드 실패. 새로고침 해주세요.</div>';
      return;
    }
  }
  container.innerHTML = '';

  // 멤버별 리퍼럴 송수신 집계
  const degreeMap = {};
  members.forEach(m => { degreeMap[m.id] = { out: 0, in: 0 }; });
  referralFlows.forEach(f => {
    if (degreeMap[f.from_member_id]) degreeMap[f.from_member_id].out++;
    if (degreeMap[f.to_member_id]) degreeMap[f.to_member_id].in++;
  });

  const nodes = members.map(m => {
    const deg = (degreeMap[m.id]?.out || 0) + (degreeMap[m.id]?.in || 0);
    const stat = memberStats.find(s => s.id === m.id);
    const color = stat?.status === 'green' ? '#27AE60' : stat?.status === 'yellow' ? '#F39C12' : '#CC0000';
    return {
      id: m.id,
      label: m.name,
      title: `${m.name}\n${m.category}\n리퍼럴 준: ${degreeMap[m.id]?.out || 0} / 받은: ${degreeMap[m.id]?.in || 0}`,
      size: Math.max(12, 12 + deg * 4),
      color: { background: color, border: color, highlight: { background: color, border: '#333' } },
      font: { size: 13, color: '#1E1E1E' },
    };
  });

  const maxAmount = Math.max(...referralFlows.map(f => f.amount || 0), 1);
  const edges = referralFlows.map(f => ({
    from: f.from_member_id,
    to: f.to_member_id,
    width: Math.max(1, Math.round((f.amount || 0) / maxAmount * 5)),
    label: f.amount ? fmt(f.amount) : '',
    title: `${f.description || ''} (${f.status})`,
    arrows: 'to',
    color: { color: f.status === 'closed' ? '#27AE60' : f.status === 'rejected' ? '#CC0000' : '#AAA' },
    font: { size: 10, color: '#666' },
  }));

  new window.vis.Network(container,
    { nodes: new window.vis.DataSet(nodes), edges: new window.vis.DataSet(edges) },
    {
      physics: { stabilization: { iterations: 200 }, barnesHut: { gravitationalConstant: -4000 } },
      interaction: { hover: true, tooltipDelay: 100 },
      edges: { smooth: { type: 'continuous' } },
    }
  );
}

/* ─────────────────────────────────────────
   ④ 직군 현황
───────────────────────────────────────── */
function renderPortfolio() {
  const cats = {};
  memberStats.forEach(m => {
    if (!cats[m.category]) cats[m.category] = { count: 0, referrals: 0, green: 0, yellow: 0, red: 0 };
    cats[m.category].count++;
    cats[m.category].referrals += m.referrals;
    cats[m.category][m.status]++;
  });

  const labels = Object.keys(cats);
  const counts = labels.map(c => cats[c].count);
  const refs = labels.map(c => cats[c].referrals);

  renderChart('chartCategory', 'bar', labels, counts, ['#1A1A2E']);
  renderChart('chartCatReferral', 'bar', labels, refs, ['#CC0000']);

  const table = document.getElementById('catTable');
  table.innerHTML = `
    <thead><tr>
      <th>직군</th><th>인원</th><th>리퍼럴</th>
      <th><span class="tl-dot green"></span>Green</th>
      <th><span class="tl-dot yellow"></span>Yellow</th>
      <th><span class="tl-dot red"></span>Red</th>
    </tr></thead>
    <tbody>${labels.map(c => `
      <tr>
        <td>${c}</td>
        <td>${cats[c].count}</td>
        <td>${cats[c].referrals}건</td>
        <td style="color:var(--green);font-weight:700">${cats[c].green}</td>
        <td style="color:var(--yellow);font-weight:700">${cats[c].yellow}</td>
        <td style="color:var(--red);font-weight:700">${cats[c].red}</td>
      </tr>`).join('')}
    </tbody>`;
}

/* ─────────────────────────────────────────
   ⑤ 경고
───────────────────────────────────────── */
function renderAlerts() {
  const alerts = [];

  memberStats.forEach(m => {
    const reasons = [];

    // 2주 연속 Red 확인
    const recentWeeks = getRecentWeeks(4);
    const lastTwo = recentWeeks.slice(-2);
    const twoWeekRecs = m.recs.filter(r => lastTwo.includes(r.week_start));
    const consecutiveAbsent = twoWeekRecs.length === 2 && twoWeekRecs.every(r => !r.attended);
    if (consecutiveAbsent) reasons.push('2주 연속 결석');

    if (m.ono === 0) reasons.push('1:1 0회 (4주)');
    if (m.referrals === 0) reasons.push('리퍼럴 0건 (4주)');

    // Yellow인데 3주 연속 악화 감지
    if (m.status === 'yellow') {
      const last3 = getRecentWeeks(3);
      const trend3 = last3.map(w => {
        const r = weeklyRecords.find(r => r.member_id === m.id && r.week_start === w);
        return r ? (r.referrals_given || 0) : 0;
      });
      if (trend3[0] >= trend3[1] && trend3[1] >= trend3[2] && trend3[2] === 0) {
        reasons.push('리퍼럴 3주 연속 하락');
      }
    }

    if (reasons.length > 0) {
      alerts.push({ member: m, reasons, severity: m.status === 'red' || consecutiveAbsent ? 'critical' : 'warning' });
    }
  });

  alerts.sort((a) => (a.severity === 'critical' ? -1 : 1));

  document.getElementById('alertList').innerHTML = alerts.length
    ? alerts.map(a => `
        <div class="alert-item ${a.severity}">
          <div class="alert-header">
            <span class="alert-name">${a.member.name}</span>
            <span style="font-size:.78rem;color:var(--sub)">${a.member.category}</span>
            <span class="alert-badge ${a.severity}">${a.severity === 'critical' ? '즉시 액션' : '모니터링'}</span>
            <span class="rank-tl ${tlClass(a.member.status)}" style="margin-left:auto">${tlLabel(a.member.status)}</span>
          </div>
          <ul class="alert-reasons">${a.reasons.map(r => `<li>${r}</li>`).join('')}</ul>
        </div>`).join('')
    : '<div class="alert-empty">경고 대상 멤버 없음 🎉</div>';
}

/* ─────────────────────────────────────────
   ⑥ 입력 폼
───────────────────────────────────────── */
let editingWeeklyId  = null;
let editingReferralId = null;
let recentWeeklyData  = [];
let recentReferralData = [];

function initForms() {
  const opts = members.map(m => `<option value="${m.id}">${m.name} (${m.category})</option>`).join('');
  ['fMember', 'fFrom', 'fTo'].forEach(id => {
    document.getElementById(id).innerHTML = '<option value="">선택하세요</option>' + opts;
  });

  document.getElementById('fWeekStart').value = getMondayOf();
  document.getElementById('fRefDate').value   = toLocalDateStr(new Date());

  document.getElementById('submitWeekly').addEventListener('click', async () => {
    const memberId  = parseInt(document.getElementById('fMember').value);
    const weekStart = document.getElementById('fWeekStart').value;
    if (!memberId || !weekStart) return showMsg('weeklyMsg', '멤버와 날짜를 선택하세요', 'err');

    const payload = {
      member_id: memberId,
      week_start: getMondayOf(weekStart),
      attended: attendVal,
      one_on_one: parseInt(document.getElementById('fOno').value) || 0,
      education: eduVal,
      visitors_invited: parseInt(document.getElementById('fVisitors').value) || 0,
      notes: document.getElementById('fNotes').value,
    };

    let error;
    if (editingWeeklyId) {
      ({ error } = await getSb().from('traffic_weekly_records')
        .update(payload).eq('id', editingWeeklyId));
    } else {
      ({ error } = await getSb().from('traffic_weekly_records')
        .upsert(payload, { onConflict: 'member_id,week_start' }));
    }

    if (error) return showMsg('weeklyMsg', '저장 실패: ' + error.message, 'err');
    showMsg('weeklyMsg', editingWeeklyId ? '수정 완료!' : '저장 완료!', 'ok');
    cancelWeeklyEdit();
    await loadData(); renderAll(); loadRecentWeekly();
  });

  document.getElementById('cancelWeekly').addEventListener('click', cancelWeeklyEdit);

  document.getElementById('submitReferral').addEventListener('click', async () => {
    const from = parseInt(document.getElementById('fFrom').value);
    const to   = parseInt(document.getElementById('fTo').value);
    const date = document.getElementById('fRefDate').value;
    if (!from || !to || !date) return showMsg('referralMsg', '모든 필드를 입력하세요', 'err');
    if (from === to) return showMsg('referralMsg', '같은 멤버는 선택 불가', 'err');

    const payload = {
      from_member_id: from,
      to_member_id: to,
      referral_date: date,
      referral_type: refTypeVal,
      introduced_name: refTypeVal === 'T2' ? document.getElementById('fIntroduced').value : null,
      amount: parseInt(document.getElementById('fRefAmount').value) || 0,
      status: document.getElementById('fRefStatus').value,
      description: document.getElementById('fRefDesc').value,
    };

    let error;
    if (editingReferralId) {
      ({ error } = await getSb().from('traffic_referral_flows')
        .update(payload).eq('id', editingReferralId));
    } else {
      ({ error } = await getSb().from('traffic_referral_flows').insert(payload));
    }

    if (error) return showMsg('referralMsg', '저장 실패: ' + error.message, 'err');
    showMsg('referralMsg', editingReferralId ? '수정 완료!' : '저장 완료!', 'ok');
    cancelReferralEdit();
    await loadData(); renderAll(); loadRecentReferral();
  });

  document.getElementById('cancelReferral').addEventListener('click', cancelReferralEdit);

  loadRecentWeekly();
  loadRecentReferral();
}

function cancelWeeklyEdit() {
  editingWeeklyId = null;
  document.getElementById('submitWeekly').textContent = '저장';
  document.getElementById('cancelWeekly').style.display = 'none';
  document.getElementById('weeklyFormTitle').textContent = '주간 활동 기록';
  document.getElementById('fMember').value = '';
  document.getElementById('fWeekStart').value = getMondayOf();
  document.getElementById('fOno').value = '0';
  document.getElementById('fVisitors').value = '0';
  document.getElementById('fNotes').value = '';
  setAttend(true); setEdu(true);
}

function cancelReferralEdit() {
  editingReferralId = null;
  document.getElementById('submitReferral').textContent = '저장';
  document.getElementById('cancelReferral').style.display = 'none';
  document.getElementById('referralFormTitle').textContent = '리퍼럴 기록 (누가 → 누구에게)';
  document.getElementById('fFrom').value = '';
  document.getElementById('fTo').value = '';
  document.getElementById('fRefDate').value = toLocalDateStr(new Date());
  document.getElementById('fRefAmount').value = '0';
  document.getElementById('fRefStatus').value = 'pending';
  document.getElementById('fRefDesc').value = '';
  document.getElementById('fIntroduced').value = '';
  setRefType('T1');
}

function editWeekly(id) {
  const r = recentWeeklyData.find(x => x.id === id);
  if (!r) return;
  editingWeeklyId = id;
  document.getElementById('weeklyFormTitle').textContent = '주간 활동 수정';
  document.getElementById('submitWeekly').textContent = '수정 저장';
  document.getElementById('cancelWeekly').style.display = 'block';
  document.getElementById('fMember').value    = r.member_id;
  document.getElementById('fWeekStart').value = r.week_start;
  document.getElementById('fOno').value       = r.one_on_one || 0;
  document.getElementById('fVisitors').value  = r.visitors_invited || 0;
  document.getElementById('fNotes').value     = r.notes || '';
  setAttend(!!r.attended);
  setEdu(!!r.education);
  document.querySelector('[data-itab="weekly"]').click();
  document.getElementById('ipanel-weekly').querySelector('.card').scrollIntoView({ behavior: 'smooth' });
}

async function deleteWeekly(id) {
  if (!confirm('이 활동 기록을 삭제하시겠습니까?')) return;
  const { error } = await getSb().from('traffic_weekly_records').delete().eq('id', id);
  if (error) return alert('삭제 실패: ' + error.message);
  if (editingWeeklyId === id) cancelWeeklyEdit();
  await loadData(); renderAll(); loadRecentWeekly();
}

function editReferral(id) {
  const r = recentReferralData.find(x => x.id === id);
  if (!r) return;
  editingReferralId = id;
  document.getElementById('referralFormTitle').textContent = '리퍼럴 수정';
  document.getElementById('submitReferral').textContent = '수정 저장';
  document.getElementById('cancelReferral').style.display = 'block';
  document.getElementById('fFrom').value       = r.from_member_id;
  document.getElementById('fTo').value         = r.to_member_id;
  document.getElementById('fRefDate').value    = r.referral_date;
  document.getElementById('fRefAmount').value  = r.amount || 0;
  document.getElementById('fRefStatus').value  = r.status || 'pending';
  document.getElementById('fRefDesc').value    = r.description || '';
  document.getElementById('fIntroduced').value = r.introduced_name || '';
  setRefType(r.referral_type || 'T1');
  document.querySelector('[data-itab="referral"]').click();
  document.getElementById('ipanel-referral').querySelector('.card').scrollIntoView({ behavior: 'smooth' });
}

async function deleteReferral(id) {
  if (!confirm('이 리퍼럴 기록을 삭제하시겠습니까?')) return;
  const { error } = await getSb().from('traffic_referral_flows').delete().eq('id', id);
  if (error) return alert('삭제 실패: ' + error.message);
  if (editingReferralId === id) cancelReferralEdit();
  await loadData(); renderAll(); loadRecentReferral();
}

function setAttend(val) {
  attendVal = val;
  document.getElementById('toggleYes').classList.toggle('active', val);
  document.getElementById('toggleNo').classList.toggle('active', !val);
}

let eduVal = true;
function setEdu(val) {
  eduVal = val;
  document.getElementById('toggleEduY').classList.toggle('active', val);
  document.getElementById('toggleEduN').classList.toggle('active', !val);
}

let refTypeVal = 'T1';
function setRefType(val) {
  refTypeVal = val;
  document.getElementById('toggleT1').classList.toggle('active', val === 'T1');
  document.getElementById('toggleT2').classList.toggle('active', val === 'T2');
  document.getElementById('rowIntroduced').style.display = val === 'T2' ? 'block' : 'none';
  if (val === 'T1') document.getElementById('fIntroduced').value = '';
}

function showMsg(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = 'form-msg ' + type;
  setTimeout(() => { el.textContent = ''; el.className = 'form-msg'; }, 3000);
}

async function loadRecentWeekly() {
  const { data } = await getSb().from('traffic_weekly_records')
    .select('*').order('created_at', { ascending: false }).limit(20);
  recentWeeklyData = data || [];
  document.getElementById('recentWeekly').innerHTML = recentWeeklyData.length
    ? recentWeeklyData.map(r => {
      const m = members.find(m => m.id === r.member_id);
      return `<div class="recent-item">
          <div class="recent-item-left">
            <div class="recent-item-week">${m?.name || '?'} · ${r.week_start}</div>
            <div class="recent-item-detail">${r.attended ? '✅ 출석' : '❌ 결석'} · 1:1 ${r.one_on_one}회 · 교육 ${r.education ? '✅' : '❌'} · 비지터 ${r.visitors_invited || 0}명</div>
          </div>
          <div class="recent-item-actions">
            <button class="ri-edit-btn" onclick="editWeekly('${r.id}')">수정</button>
            <button class="ri-del-btn" onclick="deleteWeekly('${r.id}')">삭제</button>
          </div>
        </div>`;
    }).join('')
    : '<div class="empty-msg">입력 내역 없음</div>';
}

async function loadRecentReferral() {
  const { data } = await getSb().from('traffic_referral_flows')
    .select('*').order('created_at', { ascending: false }).limit(20);
  recentReferralData = data || [];
  document.getElementById('recentReferral').innerHTML = recentReferralData.length
    ? recentReferralData.map(r => {
      const from = members.find(m => m.id === r.from_member_id);
      const to   = members.find(m => m.id === r.to_member_id);
      const statusLabel = r.status === 'closed' ? '✅ 성사' : r.status === 'rejected' ? '❌ 불발' : '⏳ 진행 중';
      const typeLabel   = r.referral_type === 'T2' ? `T2${r.introduced_name ? ` (${r.introduced_name})` : ''}` : 'T1';
      return `<div class="recent-item">
          <div class="recent-item-left">
            <div class="recent-item-week">${from?.name || '?'} → ${to?.name || '?'} <span style="font-size:.72rem;color:#999;font-weight:700">${typeLabel}</span></div>
            <div class="recent-item-detail">${r.referral_date} · ${fmt(r.amount)}원 · ${statusLabel}</div>
          </div>
          <div class="recent-item-actions">
            <button class="ri-edit-btn" onclick="editReferral('${r.id}')">수정</button>
            <button class="ri-del-btn" onclick="deleteReferral('${r.id}')">삭제</button>
          </div>
        </div>`;
    }).join('')
    : '<div class="empty-msg">리퍼럴 내역 없음</div>';
}

/* ─────────────────────────────────────────
   검색 필터
───────────────────────────────────────── */
function updateMonthLabel() {
  document.getElementById('monthLabel').textContent =
    `${selectedMonth.year}년 ${selectedMonth.month + 1}월`;
  // 미래 월은 넘어갈 수 없게
  const now = new Date();
  document.getElementById('monthNext').disabled =
    selectedMonth.year >= now.getFullYear() && selectedMonth.month >= now.getMonth();
}

function initFilters() {
  // 월 네비게이션
  updateMonthLabel();
  document.getElementById('monthPrev').addEventListener('click', () => {
    if (selectedMonth.month === 0) { selectedMonth.month = 11; selectedMonth.year--; }
    else selectedMonth.month--;
    updateMonthLabel();
    renderMembers(
      document.getElementById('memberSearch').value,
      document.getElementById('lightFilter').value
    );
    renderAIDirector('members');
  });
  document.getElementById('monthNext').addEventListener('click', () => {
    const now = new Date();
    if (selectedMonth.year >= now.getFullYear() && selectedMonth.month >= now.getMonth()) return;
    if (selectedMonth.month === 11) { selectedMonth.month = 0; selectedMonth.year++; }
    else selectedMonth.month++;
    updateMonthLabel();
    renderMembers(
      document.getElementById('memberSearch').value,
      document.getElementById('lightFilter').value
    );
    renderAIDirector('members');
  });

  // 검색/필터
  let debounce;
  document.getElementById('memberSearch').addEventListener('input', e => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      renderMembers(e.target.value, document.getElementById('lightFilter').value);
    }, 200);
  });
  document.getElementById('lightFilter').addEventListener('change', e => {
    renderMembers(document.getElementById('memberSearch').value, e.target.value);
  });
}

/* ─────────────────────────────────────────
   AI 챕터 디렉터
───────────────────────────────────────── */
function generateDirectorInsight(tab) {
  const total = memberStats.length;
  if (total === 0) return null;

  const green  = memberStats.filter(m => m.status === 'green').length;
  const yellow = memberStats.filter(m => m.status === 'yellow').length;
  const red    = memberStats.filter(m => m.status === 'red').length;
  const newM   = memberStats.filter(m => m.status === 'new').length;
  const healthScore = Math.round((green * 100 + yellow * 50) / total);

  if (tab === 'dashboard') {
    const points = [];
    const greenPct = Math.round(green / total * 100);
    const redPct   = Math.round(red   / total * 100);

    if (healthScore >= 80)
      points.push({ type: 'positive', text: `챕터 건강 점수 ${healthScore}점 — Green 멤버 ${green}명(${greenPct}%)이 활발히 활동 중입니다.` });
    else if (healthScore >= 60)
      points.push({ type: 'warning',  text: `챕터 건강 점수 ${healthScore}점 — Yellow/Red 멤버 개별 면담을 통한 개선이 필요합니다.` });
    else
      points.push({ type: 'critical', text: `챕터 건강 점수 ${healthScore}점으로 위험 수준입니다. 멤버십위원회의 즉각적인 개입이 필요합니다.` });

    if (red > 0)
      points.push({ type: 'action', text: `🔴 Red 멤버 ${red}명(${redPct}%) — 멤버십위원회 1:1 면담을 즉시 진행하세요.` });

    if (newM > 0)
      points.push({ type: 'warning', text: `⚪ 데이터 미입력 멤버 ${newM}명 — 빠른 활동 입력으로 정확한 현황 파악에 협조해 주세요.` });

    const totalRefs = memberStats.reduce((s, m) => s + m.referrals, 0);
    const avgRefs   = (totalRefs / total).toFixed(1);
    if (parseFloat(avgRefs) < 1)
      points.push({ type: 'action', text: `4주 평균 리퍼럴 멤버당 ${avgRefs}건 — 목표(1건) 미달입니다. 다음 미팅에서 리퍼럴 동기부여 세션을 권장합니다.` });

    const topRef = [...memberStats].sort((a, b) => b.referrals - a.referrals)[0];
    if (topRef && topRef.referrals > 0)
      points.push({ type: 'positive', text: `이번 기간 리퍼럴 MVP: ${topRef.name}님(${topRef.referrals}건) — 미팅에서 공개 인정을 통해 챕터 문화를 강화하세요.` });

    return points;
  }

  if (tab === 'members') {
    const stats = calcMonthStats(selectedMonth.year, selectedMonth.month);
    const mGreen = stats.filter(m => m.status === 'green').length;
    const mYellow= stats.filter(m => m.status === 'yellow').length;
    const mRed   = stats.filter(m => m.status === 'red').length;
    const failAttend = stats.filter(m => !m.critAttend && m.recs.length > 0).length;
    const failOno    = stats.filter(m => !m.critOno   && m.recs.length > 0).length;
    const failRef    = stats.filter(m => !m.critReferral && m.recs.length > 0).length;
    const points = [];

    const ym = `${selectedMonth.year}년 ${selectedMonth.month + 1}월`;
    points.push({
      type: mRed > total * 0.2 ? 'critical' : mYellow > total * 0.3 ? 'warning' : 'positive',
      text: `${ym} 성과 현황 — 🟢 Green ${mGreen}명 · 🟡 Yellow ${mYellow}명 · 🔴 Red ${mRed}명`
    });

    const failItems = [
      { label: '출석 미달', count: failAttend },
      { label: '1:1 부족',  count: failOno    },
      { label: '리퍼럴 미달', count: failRef  },
    ].sort((a, b) => b.count - a.count);
    if (failItems[0].count > 0)
      points.push({ type: 'action', text: `가장 많은 멤버가 부진한 항목: "${failItems[0].label}" (${failItems[0].count}명) — 해당 항목 중심의 교육 및 지원 방안을 검토하세요.` });

    const redNames = stats.filter(m => m.status === 'red').map(m => m.name);
    if (redNames.length > 0 && redNames.length <= 6)
      points.push({ type: 'critical', text: `즉시 면담 권장: ${redNames.join(', ')}` });
    else if (redNames.length > 6)
      points.push({ type: 'critical', text: `🔴 Red 멤버 ${redNames.length}명 — 멤버십위원회 집중 관리 대상입니다.` });

    return points;
  }

  if (tab === 'network') {
    const points = [];
    const isolated = members.filter(m =>
      referralFlows.filter(f => f.from_member_id === m.id || f.to_member_id === m.id).length === 0
    );
    const hubs = members
      .map(m => ({ ...m, cnt: referralFlows.filter(f => f.from_member_id === m.id || f.to_member_id === m.id).length }))
      .sort((a, b) => b.cnt - a.cnt).slice(0, 3).filter(m => m.cnt > 0);

    const t2Count    = referralFlows.filter(f => f.referral_type === 'T2').length;
    const closed     = referralFlows.filter(f => f.status === 'closed').length;
    const totalFlows = referralFlows.length;
    const closedRate = totalFlows ? Math.round(closed / totalFlows * 100) : 0;

    if (hubs.length > 0)
      points.push({ type: 'positive', text: `네트워크 허브 멤버: ${hubs.map(m => m.name).join(', ')} — 이 멤버들이 챕터 리퍼럴 흐름의 중심 역할을 합니다.` });

    if (isolated.length > 0)
      points.push({ type: 'critical', text: `리퍼럴 고립 멤버 ${isolated.length}명: ${isolated.slice(0, 5).map(m => m.name).join(', ')}${isolated.length > 5 ? ' 외' : ''} — 1:1 미팅 주선 등 연결 지원이 필요합니다.` });

    if (t2Count > 0)
      points.push({ type: 'positive', text: `T2(소개) 리퍼럴 ${t2Count}건 발생 — 간접 네트워크가 활성화되고 있습니다.` });

    if (totalFlows > 0)
      points.push({
        type: closedRate >= 50 ? 'positive' : 'warning',
        text: `리퍼럴 성사율 ${closedRate}% (전체 ${totalFlows}건 중 ${closed}건 성사) — ${closedRate < 50 ? '진행 중 건들의 팔로업을 독려하세요.' : '양호한 성사율을 유지하고 있습니다.'}`
      });

    return points;
  }

  if (tab === 'portfolio') {
    const points = [];
    const cats = {};
    memberStats.forEach(m => {
      if (!cats[m.category]) cats[m.category] = { count: 0, referrals: 0, red: 0 };
      cats[m.category].count++;
      cats[m.category].referrals += m.referrals;
      if (m.status === 'red') cats[m.category].red++;
    });
    const catList = Object.entries(cats).sort((a, b) => b[1].referrals - a[1].referrals);
    const topCat  = catList[0];
    const zeroCats = catList.filter(([, v]) => v.referrals === 0).map(([c]) => c);
    const weakCats = catList.filter(([, v]) => v.count > 0 && v.red / v.count >= 0.5).map(([c]) => c);
    const singles  = catList.filter(([, v]) => v.count === 1).map(([c]) => c);

    if (topCat)
      points.push({ type: 'positive', text: `리퍼럴 가장 활발한 직군: ${topCat[0]} (${topCat[1].referrals}건) — 타 직군의 롤모델로 미팅에서 소개해 주세요.` });

    if (zeroCats.length > 0)
      points.push({ type: 'warning', text: `리퍼럴 0건 직군: ${zeroCats.slice(0, 4).join(', ')} — 해당 직군의 리퍼럴 장벽을 파악하고 교육 기회를 제공하세요.` });

    if (weakCats.length > 0)
      points.push({ type: 'critical', text: `Red 멤버 비율 50% 이상 직군: ${weakCats.join(', ')} — 집중 관리가 필요합니다.` });

    if (singles.length > 0)
      points.push({ type: 'warning', text: `단독 직군(1명) ${singles.length}개: ${singles.slice(0, 4).join(', ')} — 해당 직군 내 상호 리퍼럴 파트너 발굴을 지원하세요.` });

    return points;
  }

  if (tab === 'alerts') {
    const points = [];
    const critical = memberStats.filter(m => m.status === 'red').length;

    if (critical === 0) {
      points.push({ type: 'positive', text: '즉시 개입이 필요한 멤버가 없습니다. 챕터가 안정적으로 운영되고 있습니다. 현재 상태 유지를 위한 긍정적 피드백을 멤버들에게 전달하세요.' });
    } else {
      points.push({ type: 'critical', text: `🔴 Red 멤버 ${critical}명 — 멤버십위원회 1:1 면담을 통해 활동 저조 원인(업무 과부하, 챕터 불만, 비즈니스 변화 등)을 파악하고 맞춤 지원 계획을 수립하세요.` });
      if (critical >= 3)
        points.push({ type: 'action', text: `다음 멤버십위원회 미팅 아젠다에 Red 멤버 ${critical}명 관리 계획 항목을 반드시 포함시키세요.` });
    }

    const noData = memberStats.filter(m => m.recs.length === 0);
    if (noData.length > 0)
      points.push({ type: 'warning', text: `활동 데이터 미입력 멤버 ${noData.length}명: ${noData.slice(0, 4).map(m => m.name).join(', ')}${noData.length > 4 ? ' 외' : ''} — 데이터 없이는 정확한 트래픽라이트 판정이 불가합니다.` });

    return points;
  }

  if (tab === 'input') {
    const points = [];
    const lastWeek    = getRecentWeeks(1)[0];
    const missingLast = memberStats.filter(m =>
      !weeklyRecords.some(r => r.member_id === m.id && r.week_start === lastWeek)
    ).length;
    const pending = referralFlows.filter(f => f.status === 'pending').length;

    if (missingLast > 0)
      points.push({ type: 'warning', text: `지난 주(${lastWeek}) 활동 미입력 멤버 ${missingLast}명 — 정확한 트래픽라이트 판정을 위해 빠른 입력이 필요합니다.` });
    else
      points.push({ type: 'positive', text: `지난 주 모든 멤버의 데이터가 입력되어 있습니다. 데이터 관리가 잘 이루어지고 있습니다.` });

    if (pending > 0)
      points.push({ type: 'warning', text: `리퍼럴 진행 중 ${pending}건 — 결과(성사/불발)를 업데이트하면 성사금액 통계가 더 정확해집니다.` });

    return points;
  }

  return null;
}

function renderAIDirector(tab) {
  const el = document.getElementById('ai-director-' + tab);
  if (!el) return;
  if (memberStats.length === 0) { el.style.display = 'none'; return; }

  const points = generateDirectorInsight(tab);
  if (!points || points.length === 0) { el.style.display = 'none'; return; }

  el.style.display = 'block';
  el.innerHTML = `
    <div class="aidc-header">
      <span class="aidc-icon">🤖</span>
      <span class="aidc-title">AI 챕터 디렉터</span>
      <span class="aidc-sub">의장단 · 멤버십위원회 참고용</span>
    </div>
    <ul class="aidc-list">
      ${points.map(p => `<li class="aidc-item ${p.type}">${p.text}</li>`).join('')}
    </ul>`;
}

function renderAllAIDirectors() {
  ['dashboard', 'members', 'network', 'portfolio', 'alerts', 'input'].forEach(renderAIDirector);
}

/* ─────────────────────────────────────────
   전체 렌더
───────────────────────────────────────── */
function renderAll() {
  renderDashboard();
  renderMembers();
  renderPortfolio();
  renderAlerts();
  renderAllAIDirectors();
}

/* ─────────────────────────────────────────
   초기화
───────────────────────────────────────── */
async function init() {
  try {
    await loadData();
    renderAll();
    initForms();
    initFilters();
  } catch (e) {
    console.error('init error:', e);
    document.getElementById('kpiGrid').innerHTML =
      `<div style="grid-column:1/-1;padding:20px;color:#CC0000;font-weight:700">
        ❌ 오류 발생: ${e.message}<br>
        <small style="font-weight:400">브라우저 콘솔(F12)에서 상세 확인</small>
      </div>`;
    document.getElementById('app').style.display = 'flex';
  }
}

initLogin();
initTabs();
