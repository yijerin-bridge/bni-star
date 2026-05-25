/* ============================================================
   BNI STAR Portal — Dashboard
   ============================================================ */

const CRITERIA_P = { attendanceRate: 1.0, onoPerWeek: 1, referralPerWeek: 1 };

document.addEventListener('DOMContentLoaded', async () => {
  const layout = renderPortalLayout({ title: '대시보드' });
  if (!layout) return;
  const { session, bodyEl } = layout;

  bodyEl.innerHTML = `<div style="text-align:center;padding:48px;color:#9ca3af">데이터 불러오는 중...</div>`;

  try {
    // Fetch all data in parallel
    const [weeklyRes, referralRes] = await Promise.all([
      getSb().from('traffic_weekly_records').select('*').order('week_start', { ascending: false }),
      getSb().from('traffic_referral_flows').select('*').order('referral_date', { ascending: false }),
    ]);

    const weekly   = weeklyRes.data  || [];
    const referral = referralRes.data || [];

    const members = await loadPortalMembers();
    buildDashboard(session, bodyEl, members, weekly, referral);
  } catch (err) {
    bodyEl.innerHTML = `<div class="alert-banner crit">데이터 로드 실패: ${err.message}</div>`;
  }
});

function buildDashboard(session, el, members, weekly, referral) {
  const tier = ROLE_META[session.roleType]?.tier ?? 3;
  const isLeader = tier <= 2;

  // Calculate date windows
  const weeks = getRecentWeeks(8);
  const weeks4 = weeks.slice(0, 4);
  const weeksPrev = weeks.slice(4, 8);

  // Stats per member
  const statsMap = {};
  members.forEach(m => {
    const mid = m.legacy_id ?? m.id;
    statsMap[mid] = calcMemberStats(mid, weekly, referral, weeks4);
  });
  const statsPrevMap = {};
  members.forEach(m => {
    const mid = m.legacy_id ?? m.id;
    statsPrevMap[mid] = calcMemberStats(mid, weekly, referral, weeksPrev);
  });

  // Chapter-wide stats
  const allStats  = Object.values(statsMap);
  const greenCnt  = allStats.filter(s => s.light === 'green').length;
  const yellowCnt = allStats.filter(s => s.light === 'yellow').length;
  const redCnt    = allStats.filter(s => s.light === 'red').length;
  const prevAllStats = Object.values(statsPrevMap);
  const prevGreen  = prevAllStats.filter(s => s.light === 'green').length;
  const prevYellow = prevAllStats.filter(s => s.light === 'yellow').length;
  const prevRed    = prevAllStats.filter(s => s.light === 'red').length;

  const totalMembers = members.length;

  const w4Recs    = weekly.filter(w => weeks4.includes(w.week_start));
  const wPrevRecs = weekly.filter(w => weeksPrev.includes(w.week_start));

  const attendRecs     = w4Recs.filter(w => w.attended);
  const attendPct      = (totalMembers * weeks4.length) ? Math.round(attendRecs.length / (totalMembers * weeks4.length) * 100) : 0;
  const prevAttendRecs = wPrevRecs.filter(w => w.attended);
  const prevAttendPct  = (totalMembers * weeksPrev.length) ? Math.round(prevAttendRecs.length / (totalMembers * weeksPrev.length) * 100) : 0;

  const ref4     = referral.filter(r => weeks4.some(w    => sameWeek(r.referral_date, w)));
  const refPrev  = referral.filter(r => weeksPrev.some(w => sameWeek(r.referral_date, w)));
  const ref4Amt  = ref4.reduce((s,r)  => s + (Number(r.amount)||0), 0);
  const refPrevAmt = refPrev.reduce((s,r) => s + (Number(r.amount)||0), 0);

  const onoCnt  = w4Recs.reduce((s,w)    => s + (w.one_on_one||0), 0);
  const onoPrev = wPrevRecs.reduce((s,w) => s + (w.one_on_one||0), 0);

  const visitorCnt  = w4Recs.reduce((s,w)    => s + (w.visitors_count||0), 0);
  const visitorPrev = wPrevRecs.reduce((s,w) => s + (w.visitors_count||0), 0);

  const eduTotal  = totalMembers * weeks4.length;
  const eduCnt    = w4Recs.filter(w => w.education_attended).length;
  const eduPct    = eduTotal ? Math.round(eduCnt / eduTotal * 100) : 0;
  const eduPrevTotal = totalMembers * weeksPrev.length;
  const eduPrevCnt   = wPrevRecs.filter(w => w.education_attended).length;
  const eduPrevPct   = eduPrevTotal ? Math.round(eduPrevCnt / eduPrevTotal * 100) : 0;

  const perMemberAmt  = totalMembers ? Math.round(ref4Amt  / totalMembers) : 0;
  const perMemberPrev = totalMembers ? Math.round(refPrevAmt / totalMembers) : 0;

  // Personal stats
  const myId   = session.memberId;
  const myStats = myId ? calcMemberStats(myId, weekly, referral, weeks4) : null;

  // ── Render ──
  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>안녕하세요, ${session.memberName || ''}님 👋</h1>
        <p>${new Date().toLocaleDateString('ko-KR', {year:'numeric',month:'long',day:'numeric'})} · 최근 4주 기준</p>
      </div>
      ${isLeader ? `<a href="/portal/traffic-light.html" class="btn btn-primary btn-sm">트래픽라이트 →</a>` : ''}
    </div>

    ${isLeader ? `
    <!-- ════ 챕터 현황 ════ -->
    <div class="dash-section-label">📊 챕터 현황</div>
    ${renderChapterKPI(totalMembers, attendPct, prevAttendPct, ref4.length, refPrev.length, ref4Amt, refPrevAmt, onoCnt, onoPrev, visitorCnt, visitorPrev, eduPct, eduPrevPct, perMemberAmt, perMemberPrev)}

    <div class="section-row">
      <div class="card">
        <div class="card-title">트래픽라이트 현황</div>
        <div class="tl-row">
          <div class="tl-pill green">🟢 Green <span class="tl-num">${greenCnt}</span><span class="tl-cmp ${greenCnt>=prevGreen?'up':'down'}">${cmpArrow(greenCnt,prevGreen)}</span></div>
          <div class="tl-pill yellow">🟡 Yellow <span class="tl-num">${yellowCnt}</span><span class="tl-cmp ${yellowCnt<=prevYellow?'up':'down'}">${cmpArrow(yellowCnt,prevYellow,true)}</span></div>
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
      ${renderRankCard('리퍼럴 Top 5', topN(members, statsMap, 'referrals', 5))}
      ${renderRankCard('1:1 Top 5', topN(members, statsMap, 'ono', 5))}
    </div>
    ` : ''}

    <!-- ════ 내 현황 ════ -->
    ${myStats ? `
    <div class="dash-section-label" style="margin-top:${isLeader?'8px':'0'}">👤 내 현황</div>
    ${renderPersonalCard(session, myStats, weeks4.length)}
    ` : ''}

    <!-- ════ AI 디렉터 (리더 이상만) ════ -->
    ${isLeader ? `
    <div class="dash-section-label">🤖 AI 챕터 디렉터</div>
    <div id="aiDirectorCard" class="card" style="margin-bottom:16px;display:none"></div>
    ` : ''}

    <!-- ════ 최근 회의 ════ -->
    <div class="dash-section-label">📋 최근 회의</div>
    <div class="card" style="margin-bottom:16px">
      <div id="recentMeetings"><div style="color:#9ca3af;font-size:13px">회의록 로딩 중...</div></div>
    </div>

    <div class="section-row" style="margin-top:0">
      ${renderQuickNav(session)}
    </div>
  `;

  // Charts
  if (isLeader) {
    renderDistChart(greenCnt, yellowCnt, redCnt);
    renderWeeklyChart(referral, weeks);
    renderMonthlyChart(referral);
    renderAIDirector(allStats, members, referral, totalMembers);
  }

  // Load recent meetings async
  loadRecentMeetings(session);
}

/* ── Chapter KPI Block ── */
function renderChapterKPI(total, attend, pAttend, refCnt, pRefCnt, refAmt, pRefAmt, ono, pOno, visitor, pVisitor, edu, pEdu, perMember, pPerMember) {
  return `
  <div style="margin-bottom:8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text-muted)">📊 챕터 KPI · 최근 4주</div>
  <div class="kpi-grid">
    ${kpiCard('활성 멤버', total + '명', null)}
    ${kpiCard('출석률', attend + '%', deltaStr(attend, pAttend))}
    ${kpiCard('교육 참여율', edu + '%', deltaStr(edu, pEdu))}
    ${kpiCard('비지터 초대', visitor + '명', deltaStr(visitor, pVisitor))}
    ${kpiCard('리퍼럴', refCnt + '건', deltaStr(refCnt, pRefCnt))}
    ${kpiCard('감사장 금액', fmtAmt(refAmt), deltaStr(refAmt, pRefAmt))}
    ${kpiCard('1:1 횟수', ono + '회', deltaStr(ono, pOno))}
    ${kpiCard('1인당 감사장', fmtAmt(perMember), deltaStr(perMember, pPerMember))}
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
  const lightEmoji = { green: '🟢', yellow: '🟡', red: '🔴' }[stats.light] || '⚪';
  const lightLabel = { green: 'Green', yellow: 'Yellow', red: 'Red' }[stats.light] || '미입력';
  const accentColor = { green:'#16a34a', yellow:'#ca8a04', red:'#CC0000' }[stats.light] || '#e5e7eb';
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
  const items = getNavItems(session).slice(1); // exclude dashboard
  return items.map(item => `
    <a href="${item.href}" class="card" style="display:block;text-align:center;padding:20px;text-decoration:none;cursor:pointer;transition:box-shadow .15s" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,.1)'" onmouseout="this.style.boxShadow=''">
      <div style="font-size:28px;margin-bottom:8px">${item.icon}</div>
      <div style="font-weight:600;font-size:14px">${item.label}</div>
    </a>`).join('');
}

/* ── Load Recent Meetings ── */
async function loadRecentMeetings(session) {
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
      labels: ['Green','Yellow','Red'],
      datasets: [{ data: [g,y,r], backgroundColor: ['#16a34a','#ca8a04','#CC0000'], borderWidth: 0 }],
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Noto Sans KR', size: 12 } } } } },
  });
}

function renderWeeklyChart(referral, weeks) {
  const ctx = document.getElementById('chartWeekly');
  if (!ctx) return;
  const counts = weeks.map(w => referral.filter(r => sameWeek(r.referral_date, w)).length);
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: weeks.map(w => w.slice(5)),
      datasets: [{ data: counts, backgroundColor: '#CC0000', borderRadius: 4 }],
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } },
  });
}

function renderMonthlyChart(referral) {
  const ctx = document.getElementById('chartMonthly');
  if (!ctx) return;
  const monthMap = {};
  referral.forEach(r => {
    const m = r.referral_date?.slice(0,7);
    if (!m) return;
    monthMap[m] = (monthMap[m] || 0) + (Number(r.amount)||0);
  });
  const labels = Object.keys(monthMap).sort().slice(-6);
  const data   = labels.map(l => monthMap[l]);
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.map(l => l.slice(2)),
      datasets: [{ data, backgroundColor: '#1a1f2e', borderRadius: 4 }],
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => fmtAmt(v) } } } },
  });
}

/* ── Helpers ── */
function getRecentWeeks(n) {
  const today = new Date();
  const dow = today.getDay();
  const diff = (dow >= 3) ? dow - 3 : dow + 4;
  const wed = new Date(today); wed.setDate(today.getDate() - diff);
  const weeks = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(wed); d.setDate(wed.getDate() - i * 7);
    weeks.push(d.toISOString().slice(0, 10));
  }
  return weeks;
}

function sameWeek(dateStr, weekStart) {
  if (!dateStr || !weekStart) return false;
  const d = new Date(dateStr), ws = new Date(weekStart);
  const we = new Date(ws); we.setDate(ws.getDate() + 6);
  return d >= ws && d <= we;
}

function calcMemberStats(memberId, weekly, referral, weeks) {
  const wRecs = weekly.filter(w => weeks.includes(w.week_start) && w.member_id == memberId);
  const attendance = wRecs.filter(w => w.attended).length;
  const ono        = wRecs.reduce((s, w) => s + (w.one_on_one||0), 0);
  const visitors   = wRecs.reduce((s, w) => s + (w.visitors_count||0), 0);
  const referrals  = referral.filter(r => r.from_member_id == memberId && weeks.some(w => sameWeek(r.referral_date, w))).length;
  const n = weeks.length;
  const critAttend   = attendance >= Math.ceil(n * CRITERIA_P.attendanceRate);
  const critOno      = ono >= n * CRITERIA_P.onoPerWeek;
  const critReferral = referrals >= n * CRITERIA_P.referralPerWeek;
  let light = 'red';
  if (critAttend && critOno && critReferral) light = 'green';
  else if (critAttend && (critOno || critReferral)) light = 'yellow';
  else if (!wRecs.length) light = 'new';
  return { attendance, ono, visitors, referrals, light };
}

function topN(members, statsMap, field, n) {
  return members
    .map(m => ({ name: m.name, val: statsMap[m.legacy_id ?? m.id]?.[field] ?? 0 }))
    .sort((a,b) => b.val - a.val)
    .slice(0, n)
    .filter(x => x.val > 0)
    .map(x => ({ name: x.name, val: x.val + (field === 'referrals' ? '건' : '회') }));
}

function cmpArrow(curr, prev, invert = false) {
  const diff = curr - prev;
  if (diff === 0) return '';
  const positive = invert ? diff < 0 : diff > 0;
  return `${positive ? '▲' : '▼'} ${Math.abs(diff)}`;
}

function fmtAmt(v) {
  if (v >= 100000000) return (v/100000000).toFixed(1) + '억';
  if (v >= 10000)     return Math.round(v/10000) + '만';
  return v.toLocaleString() + '원';
}

/* ── AI 챕터 디렉터 ── */
function renderAIDirector(allStats, members, referral, total) {
  const el = document.getElementById('aiDirectorCard');
  if (!el || !allStats.length) return;

  const green  = allStats.filter(s => s.light === 'green').length;
  const yellow = allStats.filter(s => s.light === 'yellow').length;
  const red    = allStats.filter(s => s.light === 'red').length;
  const newM   = allStats.filter(s => s.light === 'new').length;
  const health = total ? Math.round((green * 100 + yellow * 50) / total) : 0;

  const points = [];

  // 전반적 건강도
  if (health >= 80)
    points.push({ type: 'positive', text: `챕터 건강 점수 ${health}점 — Green 멤버 ${green}명(${Math.round(green/total*100)}%)이 활발히 활동 중입니다.` });
  else if (health >= 60)
    points.push({ type: 'warning',  text: `챕터 건강 점수 ${health}점 — Yellow·Red 멤버 개별 면담을 통한 개선이 필요합니다.` });
  else
    points.push({ type: 'critical', text: `챕터 건강 점수 ${health}점으로 위험 수준입니다. 멤버십위원회의 즉각적인 개입이 필요합니다.` });

  // Red 멤버
  if (red > 0)
    points.push({ type: 'action', text: `🔴 Red 멤버 ${red}명(${Math.round(red/total*100)}%) — 멤버십위원회 1:1 면담을 즉시 진행하세요.` });

  // 미입력 멤버
  if (newM > 0)
    points.push({ type: 'warning', text: `⚪ 데이터 미입력 멤버 ${newM}명 — 정확한 현황 파악에 협조해 주세요.` });

  // 평균 리퍼럴
  const totalRefs = allStats.reduce((s, m) => s + (m.referrals || 0), 0);
  const avgRefs   = total ? (totalRefs / total).toFixed(1) : 0;
  if (parseFloat(avgRefs) < 1)
    points.push({ type: 'action', text: `4주 평균 리퍼럴 멤버당 ${avgRefs}건 — 목표(1건) 미달입니다.` });

  // 리퍼럴 MVP (statsMap 기준 상위 멤버)
  const topIdx = allStats.reduce((best, s, i, arr) => s.referrals > arr[best].referrals ? i : best, 0);
  const topMember = members[topIdx];
  if (topMember && allStats[topIdx]?.referrals > 0)
    points.push({ type: 'positive', text: `리퍼럴 MVP: ${topMember.name}님(${allStats[topIdx].referrals}건) — 미팅에서 공개 인정으로 챕터 문화를 강화하세요.` });

  if (!points.length) { el.style.display = 'none'; return; }

  const typeIcon = { positive: '✅', warning: '⚠️', critical: '🚨', action: '👉' };
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
