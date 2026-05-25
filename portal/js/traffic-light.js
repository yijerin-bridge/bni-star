/* ============================================================
   BNI STAR Portal — Traffic Light (포털 통합 버전)
   portal-auth.js의 getSb() / requireAuth() 사용
   ============================================================ */

const CRITERIA = {
  attendanceRate: 1.0,
  onoPerWeek: 1,
  referralPerWeek: 1,
};

let members          = [];
let weeklyRecords    = [];
let referralFlows    = [];
let attendVal        = true;
let eduVal           = true;
let refTypeVal       = 'T1';
let selectedMonth    = { year: new Date().getFullYear(), month: new Date().getMonth() };
let memberStats      = [];
let chartInstances   = {};
let editingWeeklyId  = null;
let editingReferralId = null;
let recentWeeklyData  = [];
let recentReferralData = [];

/* ─── 유틸 ─── */
function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getMondayOf(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  const day = d.getDay();
  const diff = (day >= 3) ? 3 - day : 3 - day - 7;
  d.setDate(d.getDate() + diff);
  return toLocalDateStr(d);
}

function fmt(n) {
  if (n >= 100000000) return (n/100000000).toFixed(1)+'억';
  if (n >= 10000)     return (n/10000).toFixed(0)+'만';
  return n.toLocaleString();
}

function getRecentWeeks(n=4) {
  const weeks = [];
  const today = new Date();
  for (let i = n-1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i*7);
    weeks.push(getMondayOf(d.toISOString().slice(0,10)));
  }
  return weeks;
}

function tlClass(s) { return s==='green'?'green':s==='yellow'?'yellow':s==='new'?'new':'red'; }
function tlLabel(s) { return s==='green'?'🟢 Green':s==='yellow'?'🟡 Yellow':s==='new'?'⚪ 미입력':'🔴 Red'; }

/* ─── 데이터 로드 ─── */
async function loadData() {
  // Supabase members 테이블 우선, 없으면 MEMBERS_DEFAULT fallback
  try {
    const { data: dbMembers } = await getSb().from('members').select('*').eq('is_active', true).order('name');
    if (dbMembers && dbMembers.length > 0) {
      members = dbMembers.map(m => ({
        ...m,
        id:       m.legacy_id ?? m.id,   // traffic 테이블의 member_id(INT)와 조인
        photoUrl: m.photo_url || '',
        category: m.category || '기타',
        company:  m.company  || '',
      }));
    } else {
      members = typeof MEMBERS_DEFAULT !== 'undefined' ? [...MEMBERS_DEFAULT] : [];
    }
  } catch {
    members = typeof MEMBERS_DEFAULT !== 'undefined' ? [...MEMBERS_DEFAULT] : [];
  }

  try {
    const [{ data: wr, error: e1 }, { data: rf, error: e2 }] = await Promise.all([
      getSb().from('traffic_weekly_records').select('*').order('week_start', { ascending: false }),
      getSb().from('traffic_referral_flows').select('*').order('referral_date', { ascending: false }),
    ]);
    if (e1 || e2) showSchemaWarning();
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
  el.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#1A1A2E;color:white;padding:12px 20px;border-radius:12px;font-size:.85rem;z-index:999;text-align:center';
  el.innerHTML = '⚠️ Supabase 테이블 미생성 — SQL Editor에서 supabase-schema.sql 실행 필요';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 8000);
}

/* ─── 통계 계산 ─── */
function calcMemberStats() {
  const recentWeeks = getRecentWeeks(4);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-28);

  memberStats = members.map(m => {
    const recs = weeklyRecords.filter(r => r.member_id === m.id && recentWeeks.includes(r.week_start));
    const attendance = recs.filter(r => r.attended).length;
    const ono        = recs.reduce((s,r) => s+(r.one_on_one||0), 0);
    const education  = recs.filter(r => r.education).length;
    const visitors   = recs.reduce((s,r) => s+(r.visitors_invited||0), 0);
    const referrals  = referralFlows.filter(f => f.from_member_id===m.id && new Date(f.referral_date)>=cutoff).length;

    const weeks = recentWeeks.length;
    const critAttend   = attendance >= Math.ceil(weeks * CRITERIA.attendanceRate);
    const critOno      = ono        >= weeks * CRITERIA.onoPerWeek;
    const critReferral = referrals  >= weeks * CRITERIA.referralPerWeek;
    const failCount    = [critAttend, critOno, critReferral].filter(v => !v).length;

    let status = 'green';
    if (failCount === 1) status = 'yellow';
    if (failCount >= 2)  status = 'red';
    if (recs.length === 0) status = 'new';

    const allWeeks = getRecentWeeks(8);
    const trend = allWeeks.map(w => {
      const wDate = new Date(w), wEnd = new Date(w); wEnd.setDate(wEnd.getDate()+7);
      return referralFlows.filter(f => f.from_member_id===m.id && new Date(f.referral_date)>=wDate && new Date(f.referral_date)<wEnd).length;
    });

    const refAmountReceived = referralFlows.filter(f => f.to_member_id===m.id).reduce((s,f) => s+(f.amount||0), 0);
    const refAmountGiven    = referralFlows.filter(f => f.from_member_id===m.id).reduce((s,f) => s+(f.amount||0), 0);

    return { ...m, attendance, ono, education, visitors, referrals, refAmountReceived, refAmountGiven, status, critAttend, critOno, critReferral, trend, recs };
  });
}

function calcPrevPeriodStats() {
  const allWeeks8 = getRecentWeeks(8);
  const prevWeeks = allWeeks8.slice(0,4);
  const cutoffNew = new Date(); cutoffNew.setDate(cutoffNew.getDate()-28);
  const cutoffOld = new Date(); cutoffOld.setDate(cutoffOld.getDate()-56);

  return members.map(m => {
    const recs = weeklyRecords.filter(r => r.member_id===m.id && prevWeeks.includes(r.week_start));
    const attendance = recs.filter(r => r.attended).length;
    const ono        = recs.reduce((s,r) => s+(r.one_on_one||0), 0);
    const visitors   = recs.reduce((s,r) => s+(r.visitors_invited||0), 0);
    const referrals  = referralFlows.filter(f => f.from_member_id===m.id && new Date(f.referral_date)>=cutoffOld && new Date(f.referral_date)<cutoffNew).length;
    const refAmountReceived = referralFlows.filter(f => f.to_member_id===m.id && new Date(f.referral_date)>=cutoffOld && new Date(f.referral_date)<cutoffNew).reduce((s,f) => s+(f.amount||0), 0);
    const weeks = prevWeeks.length;
    const critAttend = attendance >= Math.ceil(weeks*CRITERIA.attendanceRate);
    const critOno    = ono >= weeks*CRITERIA.onoPerWeek;
    const critReferral = referrals >= weeks*CRITERIA.referralPerWeek;
    const failCount  = [critAttend, critOno, critReferral].filter(v => !v).length;
    const status     = recs.length===0 ? 'new' : failCount>=2 ? 'red' : failCount===1 ? 'yellow' : 'green';
    return { ...m, attendance, ono, visitors, referrals, refAmountReceived, status };
  });
}

function kpiDelta(curr, prev) {
  if (prev===0 && curr===0) return '';
  if (prev===0) return `<span class="kpi-delta up">신규</span>`;
  const diff = curr-prev, pct = Math.round(Math.abs(diff)/prev*100);
  if (diff===0) return `<span class="kpi-delta neutral">→ 동일</span>`;
  const up = diff>0;
  return `<span class="kpi-delta ${up?'up':'down'}">${up?'▲':'▼'} ${up?'+':''}${pct}% vs 이전 4주</span>`;
}

/* ─── 탭 ─── */
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-'+btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab==='network') renderNetwork();
      renderAIDirector(btn.dataset.tab);
    });
  });
  document.querySelectorAll('.input-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.input-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.input-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('ipanel-'+btn.dataset.itab).classList.add('active');
    });
  });
}

/* ─── ① 대시보드 ─── */
function renderDashboard() {
  const green  = memberStats.filter(m => m.status==='green').length;
  const yellow = memberStats.filter(m => m.status==='yellow').length;
  const red    = memberStats.filter(m => m.status==='red').length;
  const total  = memberStats.length;
  const totalReferrals = memberStats.reduce((s,m) => s+m.referrals, 0);
  const totalRefAmount = memberStats.reduce((s,m) => s+m.refAmountReceived, 0);
  const totalVisitors  = memberStats.reduce((s,m) => s+m.visitors, 0);
  const avgOno         = total ? memberStats.reduce((s,m) => s+m.ono, 0)/total : 0;
  const healthScore    = total ? Math.round((green*100+yellow*50)/total) : 0;

  const prev = calcPrevPeriodStats();
  const prevGreen     = prev.filter(m => m.status==='green').length;
  const prevYellow    = prev.filter(m => m.status==='yellow').length;
  const prevRed       = prev.filter(m => m.status==='red').length;
  const prevReferrals = prev.reduce((s,m) => s+m.referrals, 0);
  const prevRefAmount = prev.reduce((s,m) => s+m.refAmountReceived, 0);
  const prevVisitors  = prev.reduce((s,m) => s+m.visitors, 0);
  const prevAvgOno    = total ? prev.reduce((s,m) => s+m.ono, 0)/total : 0;
  const prevHealth    = total ? Math.round((prevGreen*100+prevYellow*50)/total) : 0;

  document.getElementById('kpiGrid').innerHTML = [
    { label:'챕터 건강 점수', value:healthScore,          unit:'점', curr:healthScore,    prev:prevHealth    },
    { label:'총 리퍼럴 (4주)', value:totalReferrals,      unit:'건', curr:totalReferrals, prev:prevReferrals },
    { label:'리퍼럴 성사금액', value:fmt(totalRefAmount), unit:'원', curr:totalRefAmount, prev:prevRefAmount },
    { label:'평균 1:1 (4주)',  value:avgOno.toFixed(1),   unit:'회', curr:avgOno,         prev:prevAvgOno    },
    { label:'비지터 초대 (4주)',value:totalVisitors,       unit:'명', curr:totalVisitors,  prev:prevVisitors  },
  ].map(k => `
    <div class="kpi-card">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.value}<small style="font-size:.7em;font-weight:500"> ${k.unit}</small></div>
      ${kpiDelta(k.curr, k.prev)}
    </div>`).join('');

  function cmpBadge(curr, p) {
    const diff = curr-p;
    if (diff===0) return `<span class="tl-prev">이전 ${p}명</span>`;
    const up = diff>0;
    return `<span class="tl-prev ${up?'tl-prev-up':'tl-prev-dn'}">${up?'▲':'▼'}${Math.abs(diff)} <em>이전 ${p}명</em></span>`;
  }
  document.getElementById('trafficDist').innerHTML = `
    <div class="tl-badge green"><div class="tl-count">${green}</div><div class="tl-label">🟢 Green</div>${cmpBadge(green,prevGreen)}</div>
    <div class="tl-badge yellow"><div class="tl-count">${yellow}</div><div class="tl-label">🟡 Yellow</div>${cmpBadge(yellow,prevYellow)}</div>
    <div class="tl-badge red"><div class="tl-count">${red}</div><div class="tl-label">🔴 Red</div>${cmpBadge(red,prevRed)}</div>`;

  renderChart('chartDist','doughnut',['Green','Yellow','Red'],[green,yellow,red],['#27AE60','#F39C12','#CC0000']);

  // 월별 리퍼럴
  const monthLabels=[], monthAmounts=[], monthCounts=[];
  for (let i=5; i>=0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
    const y=d.getFullYear(), mo=d.getMonth();
    const mStart=new Date(y,mo,1), mEnd=new Date(y,mo+1,0);
    const closed = referralFlows.filter(f => new Date(f.referral_date)>=mStart && new Date(f.referral_date)<=mEnd);
    monthLabels.push(`${y}.${String(mo+1).padStart(2,'0')}`);
    monthAmounts.push(closed.reduce((s,f) => s+(f.amount||0), 0));
    monthCounts.push(closed.length);
  }
  renderChartDual('chartTrend', monthLabels, monthAmounts, monthCounts);

  // 주간 리퍼럴 추이
  const weeks8 = getRecentWeeks(8);
  const weeklyRefCounts = weeks8.map(w => {
    const wStart=new Date(w+'T00:00:00'), wEnd=new Date(w+'T00:00:00'); wEnd.setDate(wEnd.getDate()+7);
    return referralFlows.filter(f => { const d=new Date(f.referral_date); return d>=wStart && d<wEnd; }).length;
  });
  renderChart('chartWeeklyTrend','bar', weeks8.map(w=>w.slice(5)), weeklyRefCounts, ['#CC0000']);

  const sorted    = [...memberStats].sort((a,b) => b.referrals-a.referrals);
  renderRankList('rankReferralTop',    sorted.slice(0,5),         m => `${m.referrals}건`);
  renderRankList('rankReferralBottom', sorted.slice(-5).reverse(),m => `${m.referrals}건`);
  const sortedOno = [...memberStats].sort((a,b) => b.ono-a.ono);
  renderRankList('rankOnoTop',    sortedOno.slice(0,5),         m => `${m.ono}회`);
  renderRankList('rankOnoBottom', sortedOno.slice(-5).reverse(),m => `${m.ono}회`);

  // 포털 topbar의 챕터 배지 업데이트 (있을 때만)
  const badge = document.getElementById('chapterBadgeTop');
  if (badge) badge.textContent = `BNI STAR · ${total}명`;
}

function renderRankList(id, list, valFn) {
  const numClass = ['gold','silver','bronze','',''];
  document.getElementById(id).innerHTML = list.map((m,i) => `
    <div class="rank-item">
      <span class="rank-num ${numClass[i]}">${i+1}</span>
      <div style="flex:1">
        <div class="rank-name">${m.name}</div>
        <div class="rank-cat">${m.category}</div>
      </div>
      <span class="rank-val">${valFn(m)}</span>
      <span class="rank-tl ${tlClass(m.status)}">${tlLabel(m.status)}</span>
    </div>`).join('') || '<div class="empty-msg">데이터 없음</div>';
}

function renderChart(id, type, labels, data, colors) {
  if (typeof Chart==='undefined') return;
  const ctx = document.getElementById(id); if (!ctx) return;
  if (chartInstances[id]) chartInstances[id].destroy();
  chartInstances[id] = new Chart(ctx, {
    type,
    data: { labels, datasets: [{
      data,
      backgroundColor: type==='doughnut' ? colors : colors[0]+'33',
      borderColor: colors[0], borderWidth: type==='line'?2:1,
      tension: 0.4, fill: type==='line', pointRadius: 3,
      borderRadius: type==='bar' ? 4 : 0,
    }]},
    options: {
      responsive:true, maintainAspectRatio:true,
      plugins: { legend: { display: type==='doughnut', position:'bottom', labels:{ font:{size:11}, padding:10, boxWidth:12 } } },
      scales: type!=='doughnut' ? { y:{beginAtZero:true,ticks:{font:{size:10}}}, x:{ticks:{font:{size:10}}} } : {},
    }
  });
}

function renderChartDual(id, labels, amounts, counts) {
  if (typeof Chart==='undefined') return;
  const ctx = document.getElementById(id); if (!ctx) return;
  if (chartInstances[id]) chartInstances[id].destroy();
  chartInstances[id] = new Chart(ctx, {
    data: { labels, datasets: [
      { type:'bar',  label:'성사금액(원)', data:amounts, backgroundColor:'#CC000033', borderColor:'#CC0000', borderWidth:1.5, yAxisID:'yAmt', order:2 },
      { type:'line', label:'성사 건수',   data:counts, borderColor:'#1A1A2E', backgroundColor:'transparent', borderWidth:2, pointRadius:4, pointBackgroundColor:'#1A1A2E', tension:0.35, yAxisID:'yCnt', order:1 },
    ]},
    options: {
      responsive:true, maintainAspectRatio:true,
      plugins: {
        legend:{ display:true, position:'bottom', labels:{font:{size:11},padding:10,boxWidth:12} },
        tooltip: { callbacks: { label: ctx => ctx.dataset.yAxisID==='yAmt' ? ` ${fmt(ctx.raw)}원` : ` ${ctx.raw}건` } },
      },
      scales: {
        yAmt:{ type:'linear', position:'left', beginAtZero:true, ticks:{font:{size:10}, callback:v=>v>=10000?(v/10000)+'만':v}, grid:{drawOnChartArea:true} },
        yCnt:{ type:'linear', position:'right', beginAtZero:true, ticks:{font:{size:10},stepSize:1}, grid:{drawOnChartArea:false} },
        x:{ ticks:{font:{size:10}} },
      },
    },
  });
}

/* ─── ② 개인 성과 ─── */
function calcMonthStats(year, month) {
  const monthStart = new Date(year, month, 1);
  const monthEnd   = new Date(year, month+1, 0);
  const wednesdays = [];
  for (let d=new Date(monthStart); d<=monthEnd; d.setDate(d.getDate()+1))
    if (d.getDay()===3) wednesdays.push(toLocalDateStr(new Date(d)));
  const totalMeetings = wednesdays.length;

  return members.map(m => {
    const recs = weeklyRecords.filter(r => r.member_id===m.id && wednesdays.includes(r.week_start));
    const attendance = recs.filter(r => r.attended).length;
    const ono        = recs.reduce((s,r) => s+(r.one_on_one||0), 0);
    const education  = recs.filter(r => r.education).length;
    const visitors   = recs.reduce((s,r) => s+(r.visitors_invited||0), 0);
    const referrals  = referralFlows.filter(f => f.from_member_id===m.id && new Date(f.referral_date)>=monthStart && new Date(f.referral_date)<=monthEnd).length;

    const critAttend   = attendance >= Math.ceil(totalMeetings*CRITERIA.attendanceRate);
    const critOno      = ono >= totalMeetings*CRITERIA.onoPerWeek;
    const critReferral = referrals >= totalMeetings*CRITERIA.referralPerWeek;
    const failCount    = [critAttend, critOno, critReferral].filter(v => !v).length;
    let status = 'green';
    if (failCount===1) status='yellow';
    if (failCount>=2)  status='red';
    if (recs.length===0) status='new';

    const refAmountReceived = referralFlows.filter(f=>f.to_member_id===m.id && new Date(f.referral_date)>=monthStart && new Date(f.referral_date)<=monthEnd).reduce((s,f)=>s+(f.amount||0),0);
    const refAmountGiven    = referralFlows.filter(f=>f.from_member_id===m.id && new Date(f.referral_date)>=monthStart && new Date(f.referral_date)<=monthEnd).reduce((s,f)=>s+(f.amount||0),0);

    return { ...m, attendance, totalMeetings, ono, education, visitors, referrals, refAmountReceived, refAmountGiven, status, critAttend, critOno, critReferral, recs };
  });
}

function renderMembers(filter='', lightFilter='') {
  const stats = calcMonthStats(selectedMonth.year, selectedMonth.month);
  let list = stats;
  if (filter) list = list.filter(m => m.name.includes(filter) || (m.category||'').includes(filter));
  if (lightFilter) list = list.filter(m => m.status===lightFilter);

  document.getElementById('memberGrid').innerHTML = list.map(m => `
    <div class="member-card ${tlClass(m.status)}">
      <div class="mc-header">
        <img class="mc-avatar" src="${m.photoUrl||''}" onerror="this.src=''" alt="${m.name}">
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
        <span class="mc-crit ${m.critAttend?'ok':'fail'}">${m.critAttend?'✓':'✗'} 출석</span>
        <span class="mc-crit ${m.critOno?'ok':'fail'}">${m.critOno?'✓':'✗'} 1:1</span>
        <span class="mc-crit ${m.critReferral?'ok':'fail'}">${m.critReferral?'✓':'✗'} 리퍼럴</span>
        <span style="flex:1"></span>
        <span style="font-size:.72rem;color:#999">준 금액 ${fmt(m.refAmountGiven)}원</span>
      </div>
    </div>`).join('') || '<div class="empty-msg">해당하는 멤버 없음</div>';
}

/* ─── ③ 네트워크 ─── */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script'); s.src=src; s.onload=resolve; s.onerror=reject;
    document.head.appendChild(s);
  });
}

async function renderNetwork() {
  const container = document.getElementById('networkContainer');
  if (!container) return;
  if (!window.vis) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#999">로딩 중...</div>';
    try { await loadScript('https://cdn.jsdelivr.net/npm/vis-network@9.1.9/dist/vis-network.min.js'); }
    catch { container.innerHTML = '<div style="text-align:center;padding:40px;color:#CC0000">vis-network 로드 실패</div>'; return; }
  }
  container.innerHTML = '';
  const degreeMap = {};
  members.forEach(m => { degreeMap[m.id]={out:0,in:0}; });
  referralFlows.forEach(f => {
    if (degreeMap[f.from_member_id]) degreeMap[f.from_member_id].out++;
    if (degreeMap[f.to_member_id])   degreeMap[f.to_member_id].in++;
  });
  const nodes = members.map(m => {
    const deg  = (degreeMap[m.id]?.out||0)+(degreeMap[m.id]?.in||0);
    const stat = memberStats.find(s => s.id===m.id);
    const color = stat?.status==='green'?'#27AE60':stat?.status==='yellow'?'#F39C12':'#CC0000';
    return { id:m.id, label:m.name, title:`${m.name}\n${m.category}\n준: ${degreeMap[m.id]?.out||0} / 받은: ${degreeMap[m.id]?.in||0}`, size:Math.max(12,12+deg*4), color:{background:color,border:color,highlight:{background:color,border:'#333'}}, font:{size:13,color:'#1E1E1E'} };
  });
  const maxAmt = Math.max(...referralFlows.map(f=>f.amount||0),1);
  const edges = referralFlows.map(f => ({ from:f.from_member_id, to:f.to_member_id, width:Math.max(1,Math.round((f.amount||0)/maxAmt*5)), label:f.amount?fmt(f.amount):'', title:f.description||'', arrows:'to', color:{color:'#CC0000'}, font:{size:10,color:'#666'} }));
  new window.vis.Network(container, { nodes:new window.vis.DataSet(nodes), edges:new window.vis.DataSet(edges) }, { physics:{stabilization:{iterations:200},barnesHut:{gravitationalConstant:-4000}}, interaction:{hover:true,tooltipDelay:100}, edges:{smooth:{type:'continuous'}} });
}

/* ─── ④ 직군 현황 ─── */
function renderPortfolio() {
  const cats = {};
  memberStats.forEach(m => {
    if (!cats[m.category]) cats[m.category]={count:0,referrals:0,green:0,yellow:0,red:0};
    cats[m.category].count++;
    cats[m.category].referrals += m.referrals;
    cats[m.category][m.status]++;
  });
  const labels = Object.keys(cats);
  renderChart('chartCategory',   'bar', labels, labels.map(c=>cats[c].count),    ['#1A1A2E']);
  renderChart('chartCatReferral','bar', labels, labels.map(c=>cats[c].referrals), ['#CC0000']);
  document.getElementById('catTable').innerHTML = `
    <thead><tr><th>직군</th><th>인원</th><th>리퍼럴</th><th><span class="tl-dot green"></span>Green</th><th><span class="tl-dot yellow"></span>Yellow</th><th><span class="tl-dot red"></span>Red</th></tr></thead>
    <tbody>${labels.map(c=>`<tr><td>${c}</td><td>${cats[c].count}</td><td>${cats[c].referrals}건</td><td style="color:var(--green);font-weight:700">${cats[c].green}</td><td style="color:var(--yellow);font-weight:700">${cats[c].yellow}</td><td style="color:var(--red);font-weight:700">${cats[c].red}</td></tr>`).join('')}</tbody>`;
}

/* ─── ⑤ 경고 ─── */
function renderAlerts() {
  const alerts = [];
  memberStats.forEach(m => {
    const reasons = [];
    const recentWeeks  = getRecentWeeks(4);
    const lastTwo      = recentWeeks.slice(-2);
    const twoWeekRecs  = m.recs.filter(r => lastTwo.includes(r.week_start));
    const consecutiveAbsent = twoWeekRecs.length===2 && twoWeekRecs.every(r => !r.attended);
    if (consecutiveAbsent) reasons.push('2주 연속 결석');
    if (m.ono===0) reasons.push('1:1 0회 (4주)');
    if (m.referrals===0) reasons.push('리퍼럴 0건 (4주)');
    if (reasons.length>0) alerts.push({ member:m, reasons, severity: m.status==='red'||consecutiveAbsent?'critical':'warning' });
  });
  alerts.sort(a => a.severity==='critical'?-1:1);
  document.getElementById('alertList').innerHTML = alerts.length
    ? alerts.map(a => `
      <div class="alert-item ${a.severity}">
        <div class="alert-header">
          <span class="alert-name">${a.member.name}</span>
          <span style="font-size:.78rem;color:var(--sub)">${a.member.category}</span>
          <span class="alert-badge ${a.severity}">${a.severity==='critical'?'즉시 액션':'모니터링'}</span>
          <span class="rank-tl ${tlClass(a.member.status)}" style="margin-left:auto">${tlLabel(a.member.status)}</span>
        </div>
        <ul class="alert-reasons">${a.reasons.map(r=>`<li>${r}</li>`).join('')}</ul>
      </div>`).join('')
    : '<div class="alert-empty">경고 대상 멤버 없음 🎉</div>';
}

/* ─── ⑥ 입력 폼 ─── */
function initForms(canEdit) {
  if (!canEdit) return;
  const opts = members.map(m => `<option value="${m.id}">${m.name} (${m.category})</option>`).join('');
  ['fMember','fFrom','fTo'].forEach(id => {
    const el = document.getElementById(id); if (el) el.innerHTML = '<option value="">선택하세요</option>'+opts;
  });
  document.getElementById('fWeekStart').value = getMondayOf();
  document.getElementById('fRefDate').value   = toLocalDateStr(new Date());

  document.getElementById('submitWeekly').addEventListener('click', async () => {
    const memberId  = parseInt(document.getElementById('fMember').value);
    const weekStart = document.getElementById('fWeekStart').value;
    if (!memberId||!weekStart) return showMsg('weeklyMsg','멤버와 날짜를 선택하세요','err');
    const payload = { member_id:memberId, week_start:getMondayOf(weekStart), attended:attendVal, one_on_one:parseInt(document.getElementById('fOno').value)||0, education:eduVal, visitors_invited:parseInt(document.getElementById('fVisitors').value)||0, notes:document.getElementById('fNotes').value };
    let error;
    if (editingWeeklyId) {
      ({ error } = await getSb().from('traffic_weekly_records').update(payload).eq('id',editingWeeklyId));
    } else {
      ({ error } = await getSb().from('traffic_weekly_records').upsert(payload, { onConflict:'member_id,week_start' }));
    }
    if (error) return showMsg('weeklyMsg','저장 실패: '+error.message,'err');
    showMsg('weeklyMsg', editingWeeklyId?'수정 완료!':'저장 완료!','ok');
    cancelWeeklyEdit();
    await loadData(); renderAll(); loadRecentWeekly();
  });

  document.getElementById('cancelWeekly').addEventListener('click', cancelWeeklyEdit);

  document.getElementById('submitReferral').addEventListener('click', async () => {
    const from = parseInt(document.getElementById('fFrom').value);
    const to   = parseInt(document.getElementById('fTo').value);
    const date = document.getElementById('fRefDate').value;
    if (!from||!to||!date) return showMsg('referralMsg','모든 필드를 입력하세요','err');
    if (from===to) return showMsg('referralMsg','같은 멤버는 선택 불가','err');
    const payload = { from_member_id:from, to_member_id:to, referral_date:date, referral_type:refTypeVal, introduced_name:refTypeVal==='T2'?document.getElementById('fIntroduced').value:null, amount:parseInt(document.getElementById('fRefAmount').value)||0, description:document.getElementById('fRefDesc').value };
    let error;
    if (editingReferralId) {
      ({ error } = await getSb().from('traffic_referral_flows').update(payload).eq('id',editingReferralId));
    } else {
      ({ error } = await getSb().from('traffic_referral_flows').insert(payload));
    }
    if (error) return showMsg('referralMsg','저장 실패: '+error.message,'err');
    showMsg('referralMsg', editingReferralId?'수정 완료!':'저장 완료!','ok');
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
  document.getElementById('fRefDesc').value = '';
  document.getElementById('fIntroduced').value = '';
  setRefType('T1');
}

function editWeekly(id) {
  const r = recentWeeklyData.find(x => x.id===id); if (!r) return;
  editingWeeklyId = id;
  document.getElementById('weeklyFormTitle').textContent = '주간 활동 수정';
  document.getElementById('submitWeekly').textContent = '수정 저장';
  document.getElementById('cancelWeekly').style.display = 'block';
  document.getElementById('fMember').value    = r.member_id;
  document.getElementById('fWeekStart').value = r.week_start;
  document.getElementById('fOno').value       = r.one_on_one||0;
  document.getElementById('fVisitors').value  = r.visitors_invited||0;
  document.getElementById('fNotes').value     = r.notes||'';
  setAttend(!!r.attended); setEdu(!!r.education);
  document.querySelector('[data-itab="weekly"]').click();
  document.getElementById('ipanel-weekly').querySelector('.card').scrollIntoView({ behavior:'smooth' });
}

async function deleteWeekly(id) {
  if (!confirm('이 활동 기록을 삭제하시겠습니까?')) return;
  const { error } = await getSb().from('traffic_weekly_records').delete().eq('id',id);
  if (error) return alert('삭제 실패: '+error.message);
  if (editingWeeklyId===id) cancelWeeklyEdit();
  await loadData(); renderAll(); loadRecentWeekly();
}

function editReferral(id) {
  const r = recentReferralData.find(x => x.id===id); if (!r) return;
  editingReferralId = id;
  document.getElementById('referralFormTitle').textContent = '리퍼럴 수정';
  document.getElementById('submitReferral').textContent = '수정 저장';
  document.getElementById('cancelReferral').style.display = 'block';
  document.getElementById('fFrom').value       = r.from_member_id;
  document.getElementById('fTo').value         = r.to_member_id;
  document.getElementById('fRefDate').value    = r.referral_date;
  document.getElementById('fRefAmount').value  = r.amount||0;
  document.getElementById('fRefDesc').value    = r.description||'';
  document.getElementById('fIntroduced').value = r.introduced_name||'';
  setRefType(r.referral_type||'T1');
  document.querySelector('[data-itab="referral"]').click();
  document.getElementById('ipanel-referral').querySelector('.card').scrollIntoView({ behavior:'smooth' });
}

async function deleteReferral(id) {
  if (!confirm('이 리퍼럴 기록을 삭제하시겠습니까?')) return;
  const { error } = await getSb().from('traffic_referral_flows').delete().eq('id',id);
  if (error) return alert('삭제 실패: '+error.message);
  if (editingReferralId===id) cancelReferralEdit();
  await loadData(); renderAll(); loadRecentReferral();
}

function setAttend(val) {
  attendVal = val;
  document.getElementById('toggleYes').classList.toggle('active', val);
  document.getElementById('toggleNo').classList.toggle('active', !val);
}
function setEdu(val) {
  eduVal = val;
  document.getElementById('toggleEduY').classList.toggle('active', val);
  document.getElementById('toggleEduN').classList.toggle('active', !val);
}
function setRefType(val) {
  refTypeVal = val;
  document.getElementById('toggleT1').classList.toggle('active', val==='T1');
  document.getElementById('toggleT2').classList.toggle('active', val==='T2');
  document.getElementById('rowIntroduced').style.display = val==='T2'?'block':'none';
  if (val==='T1') document.getElementById('fIntroduced').value='';
}
function showMsg(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent=msg; el.className='form-msg '+type;
  setTimeout(() => { el.textContent=''; el.className='form-msg'; }, 3000);
}

async function loadRecentWeekly() {
  const { data } = await getSb().from('traffic_weekly_records').select('*').order('created_at',{ascending:false}).limit(20);
  recentWeeklyData = data||[];
  document.getElementById('recentWeekly').innerHTML = recentWeeklyData.length
    ? recentWeeklyData.map(r => {
        const m = members.find(m => m.id===r.member_id);
        return `<div class="recent-item">
          <div class="recent-item-left">
            <div class="recent-item-week">${m?.name||'?'} · ${r.week_start}</div>
            <div class="recent-item-detail">${r.attended?'✅ 출석':'❌ 결석'} · 1:1 ${r.one_on_one}회 · 교육 ${r.education?'✅':'❌'} · 비지터 ${r.visitors_invited||0}명</div>
          </div>
          <div class="recent-item-actions">
            <button class="ri-edit-btn" onclick="editWeekly('${r.id}')">수정</button>
            <button class="ri-del-btn"  onclick="deleteWeekly('${r.id}')">삭제</button>
          </div></div>`;
      }).join('')
    : '<div class="empty-msg">입력 내역 없음</div>';
}

async function loadRecentReferral() {
  const { data } = await getSb().from('traffic_referral_flows').select('*').order('created_at',{ascending:false}).limit(20);
  recentReferralData = data||[];
  document.getElementById('recentReferral').innerHTML = recentReferralData.length
    ? recentReferralData.map(r => {
        const from = members.find(m => m.id===r.from_member_id);
        const to   = members.find(m => m.id===r.to_member_id);
        const typeLabel = r.referral_type==='T2' ? `T2${r.introduced_name?` (${r.introduced_name})`:''}` : 'T1';
        return `<div class="recent-item">
          <div class="recent-item-left">
            <div class="recent-item-week">${from?.name||'?'} → ${to?.name||'?'} <span style="font-size:.72rem;color:#999;font-weight:700">${typeLabel}</span></div>
            <div class="recent-item-detail">${r.referral_date} · ${fmt(r.amount)}원</div>
          </div>
          <div class="recent-item-actions">
            <button class="ri-edit-btn" onclick="editReferral('${r.id}')">수정</button>
            <button class="ri-del-btn"  onclick="deleteReferral('${r.id}')">삭제</button>
          </div></div>`;
      }).join('')
    : '<div class="empty-msg">리퍼럴 내역 없음</div>';
}

/* ─── 필터 ─── */
const MIN_MONTH = { year: 2026, month: 4 }; // 챕터 런칭: 2026-05

function updateMonthLabel() {
  document.getElementById('monthLabel').textContent = `${selectedMonth.year}년 ${selectedMonth.month+1}월`;
  const now = new Date();
  document.getElementById('monthNext').disabled = selectedMonth.year>=now.getFullYear() && selectedMonth.month>=now.getMonth();
  document.getElementById('monthPrev').disabled = selectedMonth.year<=MIN_MONTH.year && selectedMonth.month<=MIN_MONTH.month;
}

function initFilters() {
  updateMonthLabel();
  document.getElementById('monthPrev').addEventListener('click', () => {
    if (selectedMonth.year<=MIN_MONTH.year && selectedMonth.month<=MIN_MONTH.month) return;
    if (selectedMonth.month===0) { selectedMonth.month=11; selectedMonth.year--; }
    else selectedMonth.month--;
    updateMonthLabel();
    renderMembers(document.getElementById('memberSearch').value, document.getElementById('lightFilter').value);
    renderAIDirector('members');
  });
  document.getElementById('monthNext').addEventListener('click', () => {
    const now=new Date();
    if (selectedMonth.year>=now.getFullYear()&&selectedMonth.month>=now.getMonth()) return;
    if (selectedMonth.month===11) { selectedMonth.month=0; selectedMonth.year++; }
    else selectedMonth.month++;
    updateMonthLabel();
    renderMembers(document.getElementById('memberSearch').value, document.getElementById('lightFilter').value);
    renderAIDirector('members');
  });
  let debounce;
  document.getElementById('memberSearch').addEventListener('input', e => {
    clearTimeout(debounce);
    debounce = setTimeout(() => renderMembers(e.target.value, document.getElementById('lightFilter').value), 200);
  });
  document.getElementById('lightFilter').addEventListener('change', e => {
    renderMembers(document.getElementById('memberSearch').value, e.target.value);
  });
}

/* ─── AI 챕터 디렉터 ─── */
function generateDirectorInsight(tab) {
  const total = memberStats.length; if (total===0) return null;
  const green=memberStats.filter(m=>m.status==='green').length, yellow=memberStats.filter(m=>m.status==='yellow').length, red=memberStats.filter(m=>m.status==='red').length, newM=memberStats.filter(m=>m.status==='new').length;
  const healthScore=Math.round((green*100+yellow*50)/total);

  if (tab==='dashboard') {
    const points=[], greenPct=Math.round(green/total*100), redPct=Math.round(red/total*100);
    if (healthScore>=80) points.push({type:'positive',text:`챕터 건강 점수 ${healthScore}점 — Green 멤버 ${green}명(${greenPct}%)이 활발히 활동 중입니다.`});
    else if (healthScore>=60) points.push({type:'warning',text:`챕터 건강 점수 ${healthScore}점 — Yellow/Red 멤버 개별 면담을 통한 개선이 필요합니다.`});
    else points.push({type:'critical',text:`챕터 건강 점수 ${healthScore}점으로 위험 수준입니다. 멤버십위원회의 즉각적인 개입이 필요합니다.`});
    if (red>0) points.push({type:'action',text:`🔴 Red 멤버 ${red}명(${redPct}%) — 멤버십위원회 1:1 면담을 즉시 진행하세요.`});
    if (newM>0) points.push({type:'warning',text:`⚪ 데이터 미입력 멤버 ${newM}명 — 정확한 현황 파악에 협조해 주세요.`});
    const totalRefs=memberStats.reduce((s,m)=>s+m.referrals,0), avgRefs=(totalRefs/total).toFixed(1);
    if (parseFloat(avgRefs)<1) points.push({type:'action',text:`4주 평균 리퍼럴 멤버당 ${avgRefs}건 — 목표(1건) 미달입니다.`});
    const topRef=[...memberStats].sort((a,b)=>b.referrals-a.referrals)[0];
    if (topRef&&topRef.referrals>0) points.push({type:'positive',text:`리퍼럴 MVP: ${topRef.name}님(${topRef.referrals}건) — 미팅에서 공개 인정을 통해 챕터 문화를 강화하세요.`});
    return points;
  }
  if (tab==='members') {
    const stats=calcMonthStats(selectedMonth.year,selectedMonth.month), mGreen=stats.filter(m=>m.status==='green').length, mYellow=stats.filter(m=>m.status==='yellow').length, mRed=stats.filter(m=>m.status==='red').length;
    const failAttend=stats.filter(m=>!m.critAttend&&m.recs.length>0).length, failOno=stats.filter(m=>!m.critOno&&m.recs.length>0).length, failRef=stats.filter(m=>!m.critReferral&&m.recs.length>0).length;
    const points=[], ym=`${selectedMonth.year}년 ${selectedMonth.month+1}월`;
    points.push({type:mRed>total*0.2?'critical':mYellow>total*0.3?'warning':'positive',text:`${ym} 성과 현황 — 🟢 Green ${mGreen}명 · 🟡 Yellow ${mYellow}명 · 🔴 Red ${mRed}명`});
    const failItems=[{label:'출석 미달',count:failAttend},{label:'1:1 부족',count:failOno},{label:'리퍼럴 미달',count:failRef}].sort((a,b)=>b.count-a.count);
    if (failItems[0].count>0) points.push({type:'action',text:`가장 많은 멤버 부진 항목: "${failItems[0].label}" (${failItems[0].count}명)`});
    const redNames=stats.filter(m=>m.status==='red').map(m=>m.name);
    if (redNames.length>0&&redNames.length<=6) points.push({type:'critical',text:`즉시 면담 권장: ${redNames.join(', ')}`});
    else if (redNames.length>6) points.push({type:'critical',text:`🔴 Red 멤버 ${redNames.length}명 — 멤버십위원회 집중 관리 대상입니다.`});
    return points;
  }
  if (tab==='network') {
    const points=[];
    const isolated=members.filter(m=>referralFlows.filter(f=>f.from_member_id===m.id||f.to_member_id===m.id).length===0);
    const hubs=members.map(m=>({...m,cnt:referralFlows.filter(f=>f.from_member_id===m.id||f.to_member_id===m.id).length})).sort((a,b)=>b.cnt-a.cnt).slice(0,3).filter(m=>m.cnt>0);
    const t2Count=referralFlows.filter(f=>f.referral_type==='T2').length, totalAmt=referralFlows.reduce((s,f)=>s+(f.amount||0),0);
    if (hubs.length>0) points.push({type:'positive',text:`네트워크 허브: ${hubs.map(m=>m.name).join(', ')}`});
    if (isolated.length>0) points.push({type:'critical',text:`리퍼럴 고립 멤버 ${isolated.length}명: ${isolated.slice(0,5).map(m=>m.name).join(', ')}${isolated.length>5?' 외':''}`});
    if (t2Count>0) points.push({type:'positive',text:`T2(소개) 리퍼럴 ${t2Count}건 — 간접 네트워크가 활성화되고 있습니다.`});
    if (totalAmt>0) points.push({type:'positive',text:`총 리퍼럴 ${referralFlows.length}건 · 누적 금액 ${fmt(totalAmt)}원`});
    return points;
  }
  if (tab==='portfolio') {
    const points=[], cats={};
    memberStats.forEach(m=>{if(!cats[m.category])cats[m.category]={count:0,referrals:0,red:0};cats[m.category].count++;cats[m.category].referrals+=m.referrals;if(m.status==='red')cats[m.category].red++;});
    const catList=Object.entries(cats).sort((a,b)=>b[1].referrals-a[1].referrals);
    if (catList[0]) points.push({type:'positive',text:`리퍼럴 가장 활발한 직군: ${catList[0][0]} (${catList[0][1].referrals}건)`});
    const zeroCats=catList.filter(([,v])=>v.referrals===0).map(([c])=>c);
    if (zeroCats.length>0) points.push({type:'warning',text:`리퍼럴 0건 직군: ${zeroCats.slice(0,4).join(', ')}`});
    const weakCats=catList.filter(([,v])=>v.count>0&&v.red/v.count>=0.5).map(([c])=>c);
    if (weakCats.length>0) points.push({type:'critical',text:`Red 비율 50% 이상 직군: ${weakCats.join(', ')}`});
    return points;
  }
  if (tab==='alerts') {
    const points=[], critical=memberStats.filter(m=>m.status==='red').length;
    if (critical===0) points.push({type:'positive',text:'즉시 개입이 필요한 멤버가 없습니다. 챕터가 안정적으로 운영되고 있습니다.'});
    else { points.push({type:'critical',text:`🔴 Red 멤버 ${critical}명 — 멤버십위원회 1:1 면담을 통해 원인을 파악하고 맞춤 지원 계획을 수립하세요.`}); if(critical>=3) points.push({type:'action',text:`다음 멤버십위원회 미팅 아젠다에 Red 멤버 ${critical}명 관리 계획을 포함하세요.`}); }
    const noData=memberStats.filter(m=>m.recs.length===0);
    if (noData.length>0) points.push({type:'warning',text:`활동 데이터 미입력 멤버 ${noData.length}명: ${noData.slice(0,4).map(m=>m.name).join(', ')}${noData.length>4?' 외':''}`});
    return points;
  }
  if (tab==='input') {
    const points=[], lastWeek=getRecentWeeks(1)[0];
    const missingLast=memberStats.filter(m=>!weeklyRecords.some(r=>r.member_id===m.id&&r.week_start===lastWeek)).length;
    if (missingLast>0) points.push({type:'warning',text:`지난 주(${lastWeek}) 활동 미입력 멤버 ${missingLast}명`});
    else points.push({type:'positive',text:'지난 주 모든 멤버의 데이터가 입력되어 있습니다.'});
    return points;
  }
  return null;
}

function renderAIDirector(tab) {
  const el = document.getElementById('ai-director-'+tab); if (!el) return;
  if (memberStats.length===0) { el.style.display='none'; return; }
  const points = generateDirectorInsight(tab);
  if (!points||points.length===0) { el.style.display='none'; return; }
  el.style.display='block';
  el.innerHTML = `<div class="aidc-header"><span class="aidc-icon">🤖</span><span class="aidc-title">AI 챕터 디렉터</span><span class="aidc-sub">의장단 · 멤버십위원회 참고용</span></div><ul class="aidc-list">${points.map(p=>`<li class="aidc-item ${p.type}">${p.text}</li>`).join('')}</ul>`;
}

/* ─── 전체 렌더 ─── */
function renderAll() {
  renderDashboard();
  renderMembers();
  renderPortfolio();
  renderAlerts();
  ['dashboard','members','network','portfolio','alerts','input'].forEach(renderAIDirector);
}

/* ─── 초기화 (포털에서 호출) ─── */
async function initTrafficLight(canEdit) {
  try {
    await loadData();
    renderAll();
    initForms(canEdit);
    initFilters();
    initTabs();
  } catch (e) {
    console.error('traffic init error:', e);
    const kg = document.getElementById('kpiGrid');
    if (kg) kg.innerHTML = `<div style="grid-column:1/-1;padding:20px;color:#CC0000;font-weight:700">❌ 오류: ${e.message}</div>`;
  }
}
