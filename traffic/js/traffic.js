/* ============================================================
   BNI STAR — Traffic Light Dashboard
   ============================================================ */

const TRAFFIC_PW = 'dlwofls1!';  // 비밀번호 여기서 변경

// Supabase (supabase-config.js에서 SUPABASE_URL, SUPABASE_ANON 로드됨)
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

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
let memberStats = [];  // 계산된 멤버별 통계
let chartInstances = {};  // Chart.js 인스턴스 보관

/* ─────────────────────────────────────────
   유틸
───────────────────────────────────────── */
function getMondayOf(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = d.getDay();
  const diff = (day === 0) ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
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
  return status === 'green' ? 'green' : status === 'yellow' ? 'yellow' : 'red';
}
function tlLabel(status) {
  return status === 'green' ? '🟢 Green' : status === 'yellow' ? '🟡 Yellow' : '🔴 Red';
}

/* ─────────────────────────────────────────
   트래픽라이트 계산 (최근 4주)
───────────────────────────────────────── */
function calcMemberStats() {
  const recentWeeks = getRecentWeeks(4);
  memberStats = members.map(m => {
    const recs = weeklyRecords.filter(r =>
      r.member_id === m.id && recentWeeks.includes(r.week_start)
    );
    const attendance = recs.filter(r => r.attended).length;
    const ono = recs.reduce((s, r) => s + (r.one_on_one || 0), 0);
    const referrals = recs.reduce((s, r) => s + (r.referrals_given || 0), 0);
    const cb = recs.reduce((s, r) => s + (r.closed_business_received || 0), 0);

    const critAttend = attendance >= CRITERIA.attendanceMin;
    const critOno = ono >= CRITERIA.onoMin;
    const critReferral = referrals >= CRITERIA.referralMin;
    const failCount = [critAttend, critOno, critReferral].filter(v => !v).length;

    let status = 'green';
    if (failCount === 1) status = 'yellow';
    if (failCount >= 2) status = 'red';

    // 추세: 최근 8주 주별 레퍼럴
    const allWeeks = getRecentWeeks(8);
    const trend = allWeeks.map(w => {
      const r = weeklyRecords.find(r => r.member_id === m.id && r.week_start === w);
      return r ? (r.referrals_given || 0) : 0;
    });

    // CB 받은 것 + 준 것 (레퍼럴 흐름에서)
    const cbReceived = referralFlows
      .filter(f => f.to_member_id === m.id && f.status === 'closed')
      .reduce((s, f) => s + (f.amount || 0), 0);
    const cbGiven = referralFlows
      .filter(f => f.from_member_id === m.id && f.status === 'closed')
      .reduce((s, f) => s + (f.amount || 0), 0);

    return {
      ...m, attendance, ono, referrals, cb: cbReceived || cb,
      cbGiven, status, critAttend, critOno, critReferral, trend, recs
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
  // 회원 데이터 (members-data.js)
  members = (typeof MEMBERS_DEFAULT !== 'undefined') ? MEMBERS_DEFAULT : [];

  // Supabase에서 활동 데이터 로드 (테이블 없어도 페이지 표시)
  try {
    const [{ data: wr, error: e1 }, { data: rf, error: e2 }] = await Promise.all([
      sb.from('traffic_weekly_records').select('*').order('week_start', { ascending: false }),
      sb.from('traffic_referral_flows').select('*').order('referral_date', { ascending: false }),
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
  const totalCB = memberStats.reduce((s, m) => s + m.cb, 0);
  const avgOno = total ? (memberStats.reduce((s, m) => s + m.ono, 0) / total).toFixed(1) : 0;
  const healthScore = total ? Math.round((green * 100 + yellow * 50) / total) : 0;

  // KPI
  document.getElementById('kpiGrid').innerHTML = [
    { label: '챕터 건강 점수', value: healthScore, unit: '점', colorClass: healthScore >= 70 ? 'up' : healthScore >= 50 ? 'flat' : 'down' },
    { label: '총 레퍼럴 (4주)', value: totalReferrals, unit: '건' },
    { label: '총 Closed Business', value: fmt(totalCB), unit: '' },
    { label: '평균 1:1 (4주)', value: avgOno, unit: '회' },
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
function renderMembers(filter = '', lightFilter = '') {
  let list = memberStats;
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
        <div class="mc-stat"><div class="mc-stat-val">${m.attendance}/4</div><div class="mc-stat-label">출석</div></div>
        <div class="mc-stat"><div class="mc-stat-val">${m.ono}</div><div class="mc-stat-label">1:1</div></div>
        <div class="mc-stat"><div class="mc-stat-val">${m.referrals}</div><div class="mc-stat-label">레퍼럴</div></div>
        <div class="mc-stat"><div class="mc-stat-val">${fmt(m.cb)}</div><div class="mc-stat-label">CB받음</div></div>
      </div>
      <div class="mc-criteria">
        <span class="mc-crit ${m.critAttend ? 'ok' : 'fail'}">${m.critAttend ? '✓' : '✗'} 출석</span>
        <span class="mc-crit ${m.critOno ? 'ok' : 'fail'}">${m.critOno ? '✓' : '✗'} 1:1</span>
        <span class="mc-crit ${m.critReferral ? 'ok' : 'fail'}">${m.critReferral ? '✓' : '✗'} 레퍼럴</span>
        <span style="flex:1"></span>
        <span style="font-size:.72rem;color:#999">CB줌 ${fmt(m.cbGiven)}</span>
      </div>
    </div>`).join('') || '<div class="empty-msg">해당하는 멤버 없음</div>';
}

/* ─────────────────────────────────────────
   ③ 레퍼럴 네트워크
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

  // 멤버별 레퍼럴 송수신 집계
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
      title: `${m.name}\n${m.category}\n레퍼럴 준: ${degreeMap[m.id]?.out || 0} / 받은: ${degreeMap[m.id]?.in || 0}`,
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
      <th>직군</th><th>인원</th><th>레퍼럴</th>
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
    if (m.referrals === 0) reasons.push('레퍼럴 0건 (4주)');

    // Yellow인데 3주 연속 악화 감지
    if (m.status === 'yellow') {
      const last3 = getRecentWeeks(3);
      const trend3 = last3.map(w => {
        const r = weeklyRecords.find(r => r.member_id === m.id && r.week_start === w);
        return r ? (r.referrals_given || 0) : 0;
      });
      if (trend3[0] >= trend3[1] && trend3[1] >= trend3[2] && trend3[2] === 0) {
        reasons.push('레퍼럴 3주 연속 하락');
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
function initForms() {
  // 멤버 셀렉트 채우기
  const opts = members.map(m => `<option value="${m.id}">${m.name} (${m.category})</option>`).join('');
  ['fMember', 'fFrom', 'fTo'].forEach(id => {
    document.getElementById(id).innerHTML = '<option value="">선택하세요</option>' + opts;
  });

  // 기본 날짜: 이번 주 월요일
  document.getElementById('fWeekStart').value = getMondayOf();
  document.getElementById('fRefDate').value = new Date().toISOString().slice(0, 10);

  // 주간 활동 저장
  document.getElementById('submitWeekly').addEventListener('click', async () => {
    const memberId = parseInt(document.getElementById('fMember').value);
    const weekStart = document.getElementById('fWeekStart').value;
    if (!memberId || !weekStart) return showMsg('weeklyMsg', '멤버와 날짜를 선택하세요', 'err');

    const payload = {
      member_id: memberId,
      week_start: getMondayOf(weekStart),
      attended: attendVal,
      one_on_one: parseInt(document.getElementById('fOno').value) || 0,
      referrals_given: parseInt(document.getElementById('fReferrals').value) || 0,
      closed_business_received: parseInt(document.getElementById('fCB').value) || 0,
      notes: document.getElementById('fNotes').value,
    };

    const { error } = await sb.from('traffic_weekly_records')
      .upsert(payload, { onConflict: 'member_id,week_start' });

    if (error) return showMsg('weeklyMsg', '저장 실패: ' + error.message, 'err');
    showMsg('weeklyMsg', '저장 완료!', 'ok');
    await loadData();
    renderAll();
    loadRecentWeekly();
  });

  // 레퍼럴 흐름 저장
  document.getElementById('submitReferral').addEventListener('click', async () => {
    const from = parseInt(document.getElementById('fFrom').value);
    const to = parseInt(document.getElementById('fTo').value);
    const date = document.getElementById('fRefDate').value;
    if (!from || !to || !date) return showMsg('referralMsg', '모든 필드를 입력하세요', 'err');
    if (from === to) return showMsg('referralMsg', '같은 멤버는 선택 불가', 'err');

    const { error } = await sb.from('traffic_referral_flows').insert({
      from_member_id: from,
      to_member_id: to,
      referral_date: date,
      amount: parseInt(document.getElementById('fRefAmount').value) || 0,
      status: document.getElementById('fRefStatus').value,
      description: document.getElementById('fRefDesc').value,
    });

    if (error) return showMsg('referralMsg', '저장 실패: ' + error.message, 'err');
    showMsg('referralMsg', '저장 완료!', 'ok');
    await loadData();
    renderAll();
    loadRecentReferral();
  });

  loadRecentWeekly();
  loadRecentReferral();
}

function setAttend(val) {
  attendVal = val;
  document.getElementById('toggleYes').classList.toggle('active', val);
  document.getElementById('toggleNo').classList.toggle('active', !val);
}

function showMsg(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = 'form-msg ' + type;
  setTimeout(() => { el.textContent = ''; el.className = 'form-msg'; }, 3000);
}

async function loadRecentWeekly() {
  const { data } = await sb.from('traffic_weekly_records')
    .select('*').order('created_at', { ascending: false }).limit(10);
  const list = data || [];
  document.getElementById('recentWeekly').innerHTML = list.length
    ? list.map(r => {
      const m = members.find(m => m.id === r.member_id);
      return `<div class="recent-item">
          <div class="recent-item-left">
            <div class="recent-item-week">${m?.name || '?'} · ${r.week_start}</div>
            <div class="recent-item-detail">${r.attended ? '✅ 출석' : '❌ 결석'} · 1:1 ${r.one_on_one}회 · 레퍼럴 ${r.referrals_given}건 · CB ${fmt(r.closed_business_received)}원</div>
          </div>
        </div>`;
    }).join('')
    : '<div class="empty-msg">입력 내역 없음</div>';
}

async function loadRecentReferral() {
  const { data } = await sb.from('traffic_referral_flows')
    .select('*').order('created_at', { ascending: false }).limit(10);
  const list = data || [];
  document.getElementById('recentReferral').innerHTML = list.length
    ? list.map(r => {
      const from = members.find(m => m.id === r.from_member_id);
      const to = members.find(m => m.id === r.to_member_id);
      const statusLabel = r.status === 'closed' ? '✅ 클로즈드' : r.status === 'rejected' ? '❌ 불발' : '⏳ 진행 중';
      return `<div class="recent-item">
          <div class="recent-item-left">
            <div class="recent-item-week">${from?.name || '?'} → ${to?.name || '?'}</div>
            <div class="recent-item-detail">${r.referral_date} · ${fmt(r.amount)}원 · ${statusLabel}</div>
          </div>
        </div>`;
    }).join('')
    : '<div class="empty-msg">레퍼럴 내역 없음</div>';
}

/* ─────────────────────────────────────────
   검색 필터
───────────────────────────────────────── */
function initFilters() {
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
   전체 렌더
───────────────────────────────────────── */
function renderAll() {
  renderDashboard();
  renderMembers();
  renderPortfolio();
  renderAlerts();
}

/* ─────────────────────────────────────────
   초기화
───────────────────────────────────────── */
async function init() {
  await loadData();
  renderAll();
  initForms();
  initFilters();
}

initLogin();
initTabs();
