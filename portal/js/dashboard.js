/* ============================================================
   BNI STAR Portal — Dashboard  (weekly_records 기반)
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  const layout = renderPortalLayout({ title: '대시보드' });
  if (!layout) return;
  const { session, bodyEl } = layout;

  bodyEl.innerHTML = `<div style="text-align:center;padding:48px;color:#9ca3af">데이터 불러오는 중...</div>`;

  try {
    const [weeklyRes, members] = await Promise.all([
      getSb().from('weekly_records').select('*').order('week_date', { ascending: false }),
      loadPortalMembers(),
    ]);

    const weekly = weeklyRes.data || [];
    buildDashboard(session, bodyEl, members, weekly);
  } catch (err) {
    bodyEl.innerHTML = `<div class="alert-banner crit">데이터 로드 실패: ${err.message}</div>`;
  }
});

function buildDashboard(session, el, members, weekly) {
  const tier = ROLE_META[session.roleType]?.tier ?? 3;
  const isLeader = tier <= 2;

  const weeks  = getRecentWeeks(8);
  const weeks4 = weeks.slice(0, 4);
  const weeksPrev = weeks.slice(4, 8);

  const statsMap     = {};
  const statsPrevMap = {};
  members.forEach(m => {
    statsMap[m.name]     = calcMemberStats(m.name, weekly, weeks4);
    statsPrevMap[m.name] = calcMemberStats(m.name, weekly, weeksPrev);
  });

  const allStats  = Object.values(statsMap);
  const greenCnt  = allStats.filter(s => s.light === 'green').length;
  const amberCnt = allStats.filter(s => s.light === 'amber').length;
  const redCnt    = allStats.filter(s => s.light === 'red').length;
  const prevAllStats = Object.values(statsPrevMap);
  const prevGreen  = prevAllStats.filter(s => s.light === 'green').length;
  const prevAmber = prevAllStats.filter(s => s.light === 'amber').length;
  const prevRed    = prevAllStats.filter(s => s.light === 'red').length;

  const totalMembers = members.length;
  const w4Recs    = weekly.filter(w => weeks4.includes(w.week_date));
  const wPrevRecs = weekly.filter(w => weeksPrev.includes(w.week_date));

  const attendCount = r => (r.attended || r.sick || r.substitute) ? 1 : 0;

  const attendRecs    = w4Recs.filter(attendCount);
  const attendPct     = (totalMembers * weeks4.length) ? Math.round(attendRecs.length / (totalMembers * weeks4.length) * 100) : 0;
  const prevAttendPct = (totalMembers * weeksPrev.length) ? Math.round(wPrevRecs.filter(attendCount).length / (totalMembers * weeksPrev.length) * 100) : 0;

  const ref4Cnt     = w4Recs.reduce((s,w) => s + (w.given_t1||0) + (w.given_t2||0), 0);
  const refPrevCnt  = wPrevRecs.reduce((s,w) => s + (w.given_t1||0) + (w.given_t2||0), 0);

  const tyfcb4      = w4Recs.reduce((s,w) => s + (Number(w.tyfcb)||0), 0);
  const tyfcbPrev   = wPrevRecs.reduce((s,w) => s + (Number(w.tyfcb)||0), 0);

  const onoCnt      = w4Recs.reduce((s,w) => s + (w.one_on_one||0), 0);
  const onoPrev     = wPrevRecs.reduce((s,w) => s + (w.one_on_one||0), 0);

  const visitorCnt  = w4Recs.reduce((s,w) => s + (w.visitors||0), 0);
  const visitorPrev = wPrevRecs.reduce((s,w) => s + (w.visitors||0), 0);

  const perMemberAmt  = totalMembers ? Math.round(tyfcb4  / totalMembers) : 0;
  const perMemberPrev = totalMembers ? Math.round(tyfcbPrev / totalMembers) : 0;

  const cutoff4w     = new Date(weeks4[weeks4.length - 1]);
  const cutoffPrev   = new Date(weeksPrev[weeksPrev.length - 1]);
  const newMemberCnt  = members.filter(m => m.joined_date && new Date(m.joined_date) >= cutoff4w).length;
  const newMemberPrev = members.filter(m => m.joined_date && new Date(m.joined_date) >= cutoffPrev && new Date(m.joined_date) < cutoff4w).length;

  const convRate     = visitorCnt  > 0 ? Math.round(newMemberCnt  / visitorCnt  * 100) : 0;
  const convRatePrev = visitorPrev > 0 ? Math.round(newMemberPrev / visitorPrev * 100) : 0;

  const myName  = session.memberName;
  const myStats = myName ? calcMemberStats(myName, weekly, weeks4) : null;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>안녕하세요, ${session.memberName || ''}님 👋</h1>
        <p>${new Date().toLocaleDateString('ko-KR', {year:'numeric',month:'long',day:'numeric'})} · 최근 4주 기준</p>
      </div>
      ${isLeader ? `<a href="/portal/traffic-light.html" class="btn btn-primary btn-sm">트래픽라이트 →</a>` : ''}
    </div>

    ${isLeader ? `
    <div class="dash-section-label">🤖 AI 챕터 디렉터</div>
    <div id="aiDirectorCard" class="card" style="margin-bottom:16px;display:none"></div>

    <div class="dash-section-label">📊 챕터 현황</div>
    ${renderChapterKPI({ totalMembers, newMemberCnt, newMemberPrev, visitorCnt, visitorPrev, convRate, convRatePrev,
      ref4Cnt, refPrevCnt, tyfcb4, tyfcbPrev, perMemberAmt, perMemberPrev, onoCnt, onoPrev, attendPct, prevAttendPct })}

    <div class="section-row">
      <div class="card">
        <div class="card-title">트래픽라이트 현황</div>
        <div class="tl-row">
          <div class="tl-pill green">🟢 Green <span class="tl-num">${greenCnt}</span><span class="tl-cmp ${greenCnt>=prevGreen?'up':'down'}">${cmpArrow(greenCnt,prevGreen)}</span></div>
          <div class="tl-pill amber">🟡 Amber <span class="tl-num">${amberCnt}</span><span class="tl-cmp ${amberCnt<=prevAmber?'up':'down'}">${cmpArrow(amberCnt,prevAmber,true)}</span></div>
          <div class="tl-pill red">🔴 Red <span class="tl-num">${redCnt}</span><span class="tl-cmp ${redCnt<=prevRed?'up':'down'}">${cmpArrow(redCnt,prevRed,true)}</span></div>
        </div>
        <canvas id="chartDist" height="160"></canvas>
      </div>
      <div class="card">
        <div class="card-title">주간 리퍼럴 건수 (최근 8주)</div>
        <canvas id="chartWeekly" height="160"></canvas>
        <div class="card-title" style="margin-top:16px">월별 감사장 금액</div>
        <canvas id="chartMonthly" height="140"></canvas>
      </div>
    </div>

    <div class="section-row">
      ${renderRankCard('리퍼럴 Top 5',   topN(members, statsMap, 'referrals', 5, '건'))}
      ${renderRankCard('1:1 Top 5',      topN(members, statsMap, 'ono',       5, '회'))}
    </div>
    ` : ''}

    ${myStats ? `
    <div class="dash-section-label" style="margin-top:${isLeader?'8px':'0'}">👤 내 현황</div>
    ${renderPersonalCard(session, myStats, weeks4.length)}
    ` : ''}

    <div class="dash-section-label">📋 최근 회의</div>
    <div class="card" style="margin-bottom:16px">
      <div id="recentMeetings"><div style="color:#9ca3af;font-size:13px">회의록 로딩 중...</div></div>
    </div>

    <div class="section-row" style="margin-top:0">
      ${renderQuickNav(session)}
    </div>
  `;

  if (isLeader) {
    renderDistChart(greenCnt, amberCnt, redCnt);
    renderWeeklyChart(weekly, weeks);
    renderMonthlyChart(weekly);
    renderAIDirector(allStats, members, totalMembers);
  }

  loadRecentMeetings();
}

/* ── Chapter KPI ── */
function renderChapterKPI({ totalMembers, newMemberCnt, newMemberPrev, visitorCnt, visitorPrev, convRate, convRatePrev,
  ref4Cnt, refPrevCnt, tyfcb4, tyfcbPrev, perMemberAmt, perMemberPrev, onoCnt, onoPrev, attendPct, prevAttendPct }) {
  return `
  <div style="margin-bottom:8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text-muted)">챕터 KPI · 최근 4주</div>
  <div class="kpi-grid" style="grid-template-columns:repeat(5,1fr)">
    ${kpiCard('활성 멤버',     totalMembers + '명',    null)}
    ${kpiCard('출석률',         attendPct + '%',        deltaStr(attendPct, prevAttendPct))}
    ${kpiCard('신규 멤버',     newMemberCnt + '명',     deltaStr(newMemberCnt, newMemberPrev))}
    ${kpiCard('비지터 초대',   visitorCnt + '명',       deltaStr(visitorCnt, visitorPrev))}
    ${kpiCard('비지터 전환율', convRate + '%',          deltaStr(convRate, convRatePrev))}
    ${kpiCard('원투원',        onoCnt + '회',           deltaStr(onoCnt, onoPrev))}
    ${kpiCard('리퍼럴',        ref4Cnt + '건',          deltaStr(ref4Cnt, refPrevCnt))}
    ${kpiCard('감사장 금액',   fmtAmt(tyfcb4),         deltaStr(tyfcb4, tyfcbPrev))}
    ${kpiCard('밸류시트(인당)', fmtAmt(perMemberAmt),  deltaStr(perMemberAmt, perMemberPrev))}
  </div>`;
}

function kpiCard(label, value, delta) {
  return `<div class="kpi-card"><div class="kpi-label">${label}</div><div class="kpi-num">${value}</div>${delta ? `<div class="kpi-delta ${delta.cls}">${delta.txt}</div>` : ''}</div>`;
}

function deltaStr(curr, prev) {
  if (prev === 0 && curr === 0) return null;
  const diff = curr - prev;
  if (diff === 0) return { cls: 'neutral', txt: '→ 동일' };
  const pct = prev !== 0 ? Math.round(Math.abs(diff) / prev * 100) : 100;
  return diff > 0
    ? { cls: 'up',   txt: `▲ +${pct}% vs 이전` }
    : { cls: 'down', txt: `▼ -${pct}% vs 이전` };
}

/* ── Personal Card ── */
function renderPersonalCard(session, stats, weeks) {
  const lightEmoji = { green:'🟢', amber:'🟡', red:'🔴' }[stats.light] || '⚪';
  const lightLabel = { green:'Green', amber:'Amber', red:'Red' }[stats.light] || '활동 저조';
  const accentColor = { green:'#16a34a', amber:'#ca8a04', red:'#CC0000' }[stats.light] || '#e5e7eb';
  return `
  <div class="card" style="border-left:4px solid ${accentColor};margin-bottom:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:20px">${lightEmoji}</span>
        <span style="font-size:15px;font-weight:700;color:${accentColor}">${lightLabel}</span>
        <span style="font-size:11px;color:#9ca3af">최근 ${weeks}주</span>
      </div>
      <a href="/portal/my-performance.html" class="btn btn-outline btn-sm">상세 보기 →</a>
    </div>
    <div class="kpi-grid" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px">
      ${myKpiCard('출석', stats.attendance + '/' + weeks + '회')}
      ${myKpiCard('비지터 초대', stats.visitors + '명')}
      ${myKpiCard('1:1 미팅', stats.ono + '회')}
      ${myKpiCard('리퍼럴', stats.referrals + '건')}
    </div>
  </div>`;
}

function myKpiCard(label, value) {
  return `<div class="kpi-card" style="padding:12px 14px"><div class="kpi-label">${label}</div><div class="kpi-num" style="font-size:20px">${value}</div></div>`;
}

/* ── Rank Card ── */
function renderRankCard(title, list) {
  const numClass = i => i===0?'top1':i===1?'top2':i===2?'top3':'';
  return `
  <div class="card">
    <div class="card-title">${title}</div>
    <div class="rank-list">
      ${list.map((item,i) => `
        <div class="rank-item">
          <span class="rank-num ${numClass(i)}">${i+1}</span>
          <span class="rank-name">${item.name}</span>
          <span class="rank-val">${item.val}</span>
        </div>`).join('')}
      ${list.length === 0 ? '<div style="color:#9ca3af;font-size:13px">데이터 없음</div>' : ''}
    </div>
  </div>`;
}

/* ── Quick Nav ── */
function renderQuickNav(session) {
  const items = getNavItems(session).slice(1);
  return items.map(item => `
    <a href="${item.href}" class="card" style="display:block;text-align:center;padding:20px;text-decoration:none;cursor:pointer;transition:box-shadow .15s" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,.1)'" onmouseout="this.style.boxShadow=''">
      <div style="font-size:28px;margin-bottom:8px">${item.icon}</div>
      <div style="font-weight:600;font-size:14px">${item.label}</div>
    </a>`).join('');
}

/* ── Load Recent Meetings ── */
async function loadRecentMeetings() {
  const el = document.getElementById('recentMeetings');
  if (!el) return;
  try {
    const { data } = await getSb().from('meetings')
      .select('*').order('meeting_date', { ascending: false }).limit(5);
    if (!data || data.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="es-icon">📋</div><p>등록된 회의록이 없습니다</p></div>';
      return;
    }
    const typeLabel = { weekly_bni:'주간회의', board:'의장단', membership:'멤버십위원회', leader_team:'리더팀' };
    el.innerHTML = data.map(m => `
      <a href="/portal/meeting-detail.html?id=${m.id}" class="meeting-item">
        <span class="mi-date">${m.meeting_date}</span>
        <span class="mi-type-badge ${m.meeting_type}">${typeLabel[m.meeting_type]||m.meeting_type}</span>
        <span class="mi-title">${m.title || '회의록'}</span>
        <span class="mi-status ${m.status}">${m.status === 'published' ? '✓ 완료' : '초안'}</span>
      </a>`).join('');
  } catch {
    el.innerHTML = '<div style="color:#9ca3af;font-size:13px">회의록을 불러올 수 없습니다</div>';
  }
}

/* ── Charts ── */
function renderDistChart(g, y, r) {
  const ctx = document.getElementById('chartDist');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Green','Amber','Red'],
      datasets: [{ data: [g,y,r], backgroundColor: ['#16a34a','#ca8a04','#CC0000'], borderWidth: 0 }],
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { family:'Noto Sans KR', size:12 } } } } },
  });
}

function renderWeeklyChart(weekly, weeks) {
  const ctx = document.getElementById('chartWeekly');
  if (!ctx) return;
  const counts = weeks.map(w => {
    const recs = weekly.filter(r => r.week_date === w);
    return recs.reduce((s,r) => s + (r.given_t1||0) + (r.given_t2||0), 0);
  });
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: weeks.map(w => w.slice(5)),
      datasets: [{ data: counts, backgroundColor: '#CC0000', borderRadius: 4 }],
    },
    options: { responsive: true, plugins: { legend: { display:false } }, scales: { y: { beginAtZero:true, ticks:{ stepSize:1 } } } },
  });
}

function renderMonthlyChart(weekly) {
  const ctx = document.getElementById('chartMonthly');
  if (!ctx) return;
  const monthMap = {};
  weekly.forEach(r => {
    const m = r.week_date?.slice(0,7);
    if (!m) return;
    monthMap[m] = (monthMap[m] || 0) + (Number(r.tyfcb)||0);
  });
  const labels = Object.keys(monthMap).sort().slice(-6);
  const data   = labels.map(l => monthMap[l]);
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.map(l => l.slice(2)),
      datasets: [{ data, backgroundColor: '#1a1f2e', borderRadius: 4 }],
    },
    options: { responsive: true, plugins: { legend: { display:false } }, scales: { y: { beginAtZero:true, ticks:{ callback: v => fmtAmt(v) } } } },
  });
}

/* ── Helpers ── */
function toLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getRecentWeeks(n) {
  const today = new Date();
  const dow  = today.getDay();
  const diff = (dow >= 3) ? dow - 3 : dow + 4;
  const wed  = new Date(today); wed.setDate(today.getDate() - diff);
  const weeks = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(wed); d.setDate(wed.getDate() - i * 7);
    weeks.push(toLocalDate(d));
  }
  return weeks;
}

/* traffic-light.js와 동일한 채점 함수 */
function _scoreAbsence(n)    { return n > 2 ? 0 : n === 2 ? 5 : n === 1 ? 10 : 15; }
function _scoreLate(n)       { return n >= 2 ? 0 : n === 1 ? 5 : 10; }
function _scoreRef(avg)      { return avg < 0.5 ? 0 : avg < 0.75 ? 5 : avg < 1.0 ? 10 : avg < 1.2 ? 15 : 20; }
function _scoreTyfcb(tot)    { return tot < 25000000 ? 0 : tot < 50000000 ? 5 : tot < 100000000 ? 10 : 15; }
function _scoreVisitor(avg)  { return avg < 0.1 ? 0 : avg < 0.2 ? 5 : avg < 0.4 ? 10 : avg < 0.6 ? 15 : 20; }
function _scoreOno(avg)      { return avg < 1 ? 0 : avg < 2 ? 5 : 10; }
function _scoreCeu(tot)      { return tot < 5 ? 0 : tot < 15 ? 5 : 10; }

function calcMemberStats(memberName, weekly, weeks) {
  // KPI용: 주어진 weeks 범위 내 집계
  const wRecs = weekly.filter(w => weeks.includes(w.week_date) && w.member_name === memberName);
  const attendance = wRecs.filter(w => w.attended || w.sick || w.substitute).length;
  const ono        = wRecs.reduce((s,w) => s + (w.one_on_one||0), 0);
  const visitors   = wRecs.reduce((s,w) => s + (w.visitors||0), 0);
  const referrals  = wRecs.reduce((s,w) => s + (w.given_t1||0) + (w.given_t2||0), 0);

  // 트래픽라이트 색상: 전체 기록 기준 7항목 채점 (traffic-light.js와 동일)
  const allRecs  = weekly.filter(w => w.member_name === memberName);
  const recorded = allRecs.length;
  if (!recorded) return { attendance, ono, visitors, referrals, light: 'gray' };

  const absN   = allRecs.filter(w => w.absent).length;
  const lateN  = allRecs.filter(w => w.late).length;
  const totRef = allRecs.reduce((s,w) => s + (w.given_t1||0) + (w.given_t2||0), 0);
  const totVis = allRecs.reduce((s,w) => s + (w.visitors||0), 0);
  const totOno = allRecs.reduce((s,w) => s + (w.one_on_one||0), 0);
  const totTyf = allRecs.reduce((s,w) => s + (Number(w.tyfcb)||0), 0);
  const totCeu = allRecs.reduce((s,w) => s + (w.ceu||0), 0);

  const total =
    _scoreAbsence(absN) +
    _scoreLate(lateN) +
    _scoreRef(totRef / recorded) +
    _scoreTyfcb(totTyf) +
    _scoreVisitor(totVis / recorded) +
    _scoreOno(totOno / recorded) +
    _scoreCeu(totCeu);
  const light = total >= 70 ? 'green' : total >= 50 ? 'amber' : total >= 30 ? 'red' : 'gray';

  return { attendance, ono, visitors, referrals, light };
}

function topN(members, statsMap, field, n, unit) {
  return members
    .map(m => ({ name: m.name, val: statsMap[m.name]?.[field] ?? 0 }))
    .sort((a,b) => b.val - a.val)
    .slice(0, n)
    .filter(x => x.val > 0)
    .map(x => ({ name: x.name, val: x.val + unit }));
}

function cmpArrow(curr, prev, invert = false) {
  const diff = curr - prev;
  if (diff === 0) return '';
  const positive = invert ? diff < 0 : diff > 0;
  return `${positive ? '▲' : '▼'} ${Math.abs(diff)}`;
}

function fmtAmt(v) {
  const n = Number(v) || 0;
  if (n >= 100000000) return (n/100000000).toFixed(1) + '억원';
  return n.toLocaleString('ko-KR') + '원';
}

/* ── AI 챕터 디렉터 ── */
function renderAIDirector(allStats, members, total) {
  const el = document.getElementById('aiDirectorCard');
  if (!el || !allStats.length) return;

  const green  = allStats.filter(s => s.light === 'green').length;
  const amber = allStats.filter(s => s.light === 'amber').length;
  const red    = allStats.filter(s => s.light === 'red').length;
  const newM   = allStats.filter(s => s.light === 'new').length;
  const health = total ? Math.round((green * 100 + amber * 50) / total) : 0;

  const points = [];

  if (health >= 80)
    points.push({ type:'positive', text:`챕터 건강 점수 ${health}점 — Green 멤버 ${green}명(${Math.round(green/total*100)}%)이 활발히 활동 중입니다.` });
  else if (health >= 60)
    points.push({ type:'warning',  text:`챕터 건강 점수 ${health}점 — Amber·Red 멤버 개별 면담을 통한 개선이 필요합니다.` });
  else
    points.push({ type:'critical', text:`챕터 건강 점수 ${health}점으로 위험 수준입니다. 멤버십위원회의 즉각적인 개입이 필요합니다.` });

  if (red > 0)
    points.push({ type:'action', text:`🔴 Red 멤버 ${red}명(${Math.round(red/total*100)}%) — 멤버십위원회 1:1 면담을 즉시 진행하세요.` });

  if (newM > 0)
    points.push({ type:'warning', text:`⚫ 활동 저조 멤버 ${newM}명 — 면담 및 활동 독려를 검토해 주세요.` });

  const totalRefs = allStats.reduce((s,m) => s + (m.referrals||0), 0);
  const avgRefs   = total ? (totalRefs / total).toFixed(1) : 0;
  if (parseFloat(avgRefs) < 1)
    points.push({ type:'action', text:`4주 평균 리퍼럴 멤버당 ${avgRefs}건 — 목표(주 1건) 미달입니다.` });

  const topIdx    = allStats.reduce((best,s,i,arr) => s.referrals > arr[best].referrals ? i : best, 0);
  const topMember = members[topIdx];
  if (topMember && allStats[topIdx]?.referrals > 0)
    points.push({ type:'positive', text:`리퍼럴 MVP: ${topMember.name}님(${allStats[topIdx].referrals}건) — 미팅에서 공개 인정으로 챕터 문화를 강화하세요.` });

  if (!points.length) { el.style.display = 'none'; return; }

  const typeIcon = { positive:'✅', warning:'⚠️', critical:'🚨', action:'👉' };
  el.style.display = 'block';
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <span style="font-size:22px">🤖</span>
      <div>
        <div style="font-weight:700;font-size:14px">AI 챕터 디렉터</div>
        <div style="font-size:11px;color:#9ca3af">의장단 · 멤버십위원회 참고용 자동 분석</div>
      </div>
    </div>
    <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px">
      ${points.map(p => `
        <li style="display:flex;gap:10px;font-size:13px;line-height:1.5;padding:8px 12px;border-radius:8px;background:${
          p.type==='positive'?'#f0fdf4':p.type==='critical'?'#fff1f2':p.type==='action'?'#eff6ff':'#fefce8'}">
          <span>${typeIcon[p.type]}</span><span>${p.text}</span>
        </li>`).join('')}
    </ul>`;
}
