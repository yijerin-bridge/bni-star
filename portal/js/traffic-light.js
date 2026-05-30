/* ============================================================
   BNI STAR — Traffic Light v3 (주간 기반 채점)
   챕터 런칭: 2026-05-13 / 24주 / 매주 수요일
   ============================================================ */

/* ── 상수 ── */
const CHAPTER_LAUNCH = '2026-05-13';
const TODAY = new Date().toISOString().slice(0, 10);

// 런칭일부터 이번 주(수요일) +1주까지 자동 생성 — 매주 자동 확장
function getAllWeeks() {
  const arr = [];
  const start = new Date('2026-05-13T00:00:00Z');
  // 다음 수요일까지 포함 (이번 주 포함 보장)
  const cutoff = new Date(TODAY + 'T00:00:00Z');
  cutoff.setUTCDate(cutoff.getUTCDate() + 7);
  let d = new Date(start);
  while (d <= cutoff) {
    arr.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return arr;
}

// 채점용: 직전 24주 슬라이딩 윈도우
function getLast24Weeks(allWeeks) {
  const past = allWeeks.filter(w => w <= TODAY);
  return past.slice(-24);
}

// 페이지 로드 시 한 번만 계산
const WEEKS_ALL  = getAllWeeks();
const WEEKS_24   = getLast24Weeks(WEEKS_ALL); // 채점 기준 (최근 24주)

/* ── 채점 함수 (사용자 지정 기준) ── */
function scoreAbsence(n)      { return n > 2 ? 0 : n === 2 ? 5 : n === 1 ? 10 : 15; }
function scoreLate(n)         { return n >= 2 ? 0 : n === 1 ? 5 : 10; }
function scoreReferral(avg)   { return avg < 0.5 ? 0 : avg < 0.75 ? 5 : avg < 1.0 ? 10 : avg < 1.2 ? 15 : 20; }
function scoreTyfcb(total)    { return total < 25000000 ? 0 : total < 50000000 ? 5 : total < 100000000 ? 10 : 15; }
function scoreVisitor(avg)    { return avg < 0.1 ? 0 : avg < 0.2 ? 5 : avg < 0.4 ? 10 : avg < 0.6 ? 15 : 20; }
function scoreOno(avg)        { return avg < 1 ? 0 : avg < 2 ? 5 : 10; }
function scoreCeu(total)      { return total < 5 ? 0 : total < 15 ? 5 : 10; }

function calcMemberScore(recs) {
  const n = recs.length;
  const empty = { total:0, light:'gray',
    breakdown:{absence:0,late:0,referral:0,tyfcb:0,visitor:0,ono:0,ceu:0},
    stats:{n:0} };
  if (!n) return empty;

  const absN  = recs.filter(r => r.absent).length;
  const lateN = recs.filter(r => r.late).length;
  const totRef = recs.reduce((s,r) => s + (r.given_t1||0) + (r.given_t2||0), 0);
  const totVis = recs.reduce((s,r) => s + (r.visitors||0), 0);
  const totOno = recs.reduce((s,r) => s + (r.one_on_one||0), 0);
  const totTyf = recs.reduce((s,r) => s + (Number(r.tyfcb)||0), 0);
  const totCeu = recs.reduce((s,r) => s + (r.ceu||0), 0);

  const s1 = scoreAbsence(absN);
  const s2 = scoreLate(lateN);
  const s3 = scoreReferral(totRef / n);
  const s4 = scoreTyfcb(totTyf);
  const s5 = scoreVisitor(totVis / n);
  const s6 = scoreOno(totOno / n);
  const s7 = scoreCeu(totCeu);
  const total = s1+s2+s3+s4+s5+s6+s7;
  const light = total>=70?'green':total>=50?'yellow':total>=30?'red':'gray';

  return { total, light,
    breakdown:{absence:s1,late:s2,referral:s3,tyfcb:s4,visitor:s5,ono:s6,ceu:s7},
    stats:{n,absN,lateN,totRef,totVis,totOno,totTyf,totCeu,
           avgRef:(totRef/n).toFixed(2), avgVis:(totVis/n).toFixed(2), avgOno:(totOno/n).toFixed(2)} };
}

/* ── 전역 데이터 ── */
let allMembers = [], allWeeklyRecs = [];

async function loadAll() {
  const [memRes, recRes] = await Promise.all([
    getSb().from('members').select('id,legacy_id,name,company').eq('is_active', true).order('name'),
    getSb().from('weekly_records').select('*').order('week_date'),
  ]);
  allMembers    = (memRes.data || []).map(m => ({ ...m, uid: m.legacy_id ?? m.id }));
  allWeeklyRecs = recRes.data || [];
}

/* ── 초기화 ── */
async function initTrafficLight(session, bodyEl) {
  bodyEl.innerHTML = `
    <div class="page-header">
      <div><h1>트래픽라이트</h1><p>주간 기반 · 챕터 런칭 2026-05-13 · 24주</p></div>
    </div>
    <div class="tl-tab-bar">
      <button class="tl-tab active" data-tab="overview">📊 전체 현황</button>
      <button class="tl-tab" data-tab="detail">👤 개인 상세</button>
      <button class="tl-tab" data-tab="input">✏️ 주간 입력</button>
      <button class="tl-tab" data-tab="import">📁 PALMS 가져오기</button>
      <button class="tl-tab" data-tab="criteria">📋 점수 기준</button>
    </div>
    <div class="tl-panel active" id="tl-overview"></div>
    <div class="tl-panel"        id="tl-detail"></div>
    <div class="tl-panel"        id="tl-input"></div>
    <div class="tl-panel"        id="tl-import"></div>
    <div class="tl-panel"        id="tl-criteria"></div>
  `;
  bodyEl.querySelectorAll('.tl-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      bodyEl.querySelectorAll('.tl-tab').forEach(b => b.classList.remove('active'));
      bodyEl.querySelectorAll('.tl-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      bodyEl.querySelector('#tl-' + btn.dataset.tab).classList.add('active');
      const tab = btn.dataset.tab;
      if (tab === 'detail')   renderDetail();
      if (tab === 'input')    renderInput();
      if (tab === 'import')   renderImport();
      if (tab === 'criteria') renderCriteria();
    });
  });
  await loadAll();
  renderOverview();
}

/* ═══════════════════════════════════════════════
   탭 1: 전체 현황
═══════════════════════════════════════════════ */
function renderOverview() {
  const el = document.getElementById('tl-overview');

  // 멤버별 점수 계산
  const memberScores = allMembers.map(m => {
    const recs = allWeeklyRecs.filter(r => r.member_name === m.name);
    const sc   = calcMemberScore(recs);
    return { ...m, ...sc, recs };
  }).sort((a,b) => {
    const ord = { gray:0, red:1, yellow:2, green:3 };
    return (ord[b.light]??0) - (ord[a.light]??0) || b.total - a.total;
  });

  const green  = memberScores.filter(m=>m.light==='green').length;
  const yellow = memberScores.filter(m=>m.light==='yellow').length;
  const red    = memberScores.filter(m=>m.light==='red').length;
  const gray   = memberScores.filter(m=>m.light==='gray').length;
  const pastWeeks = WEEKS_ALL.filter(w => w <= TODAY).length;

  const aiTips = genAIOverview(memberScores);

  el.innerHTML = `
    ${aiTips.length ? `
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:20px">🤖</span>
        <span style="font-weight:700;font-size:14px">AI 챕터 디렉터</span>
        <span style="font-size:11px;color:#9ca3af">· ${pastWeeks}주차 기준</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:7px">
        ${aiTips.map(t=>`<div class="ai-tip ${t.type}"><span>${t.icon}</span><span>${t.text}</span></div>`).join('')}
      </div>
    </div>` : ''}

    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px">
      <span style="font-size:13px;color:#9ca3af">챕터 런칭 후 ${pastWeeks}주차 · 24주 중</span>
      <span class="score-badge green">🟢 ${green}명</span>
      <span class="score-badge yellow">🟡 ${yellow}명</span>
      <span class="score-badge red">🔴 ${red}명</span>
      <span class="score-badge gray">⚫ ${gray}명 (미입력)</span>
    </div>

    <div class="member-score-grid">
      ${memberScores.map(m => {
        const lEmoji = {green:'🟢',yellow:'🟡',red:'🔴',gray:'⚫'}[m.light]||'⚫';
        const wBars  = WEEKS_ALL.slice(0,pastWeeks).slice(-24).map(w => {
          const r = m.recs.find(x=>x.week_date===w);
          if (!r) return `<div class="ms-spark-bar" style="height:4px;background:#e5e7eb"></div>`;
          const sc = calcMemberScore([r]);
          const h  = Math.max(4, Math.round(sc.total/100*24));
          const col= {green:'#16a34a',yellow:'#ca8a04',red:'#CC0000',gray:'#9ca3af'}[sc.light];
          return `<div class="ms-spark-bar" style="height:${h}px;background:${col}" title="W${WEEKS_24.indexOf(w)+1}: ${sc.total}점"></div>`;
        });
        return `
        <div class="ms-card ${m.light}" onclick="showMemberDetail('${m.name}')">
          <div class="ms-name">${m.name}</div>
          <div class="ms-score-row">
            <span class="ms-score">${m.recs.length ? m.total : '—'}</span>
            <span class="ms-light">${lEmoji}</span>
          </div>
          <div class="ms-sparkline">${wBars.join('')}</div>
          <div class="ms-sub">${m.recs.length ? `${m.recs.length}주 기록 · T1:${m.stats.totRef||0} 비:${m.stats.totVis||0}` : '데이터 없음'}</div>
        </div>`;
      }).join('')}
    </div>
  `;
}

/* ═══════════════════════════════════════════════
   탭 2: 개인 상세
═══════════════════════════════════════════════ */
function renderDetail(preselect = null) {
  const el = document.getElementById('tl-detail');
  const names = allMembers.map(m=>m.name);

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <label style="font-size:13px;font-weight:600">멤버 선택</label>
      <select id="det-member" class="form-input" style="width:200px">
        <option value="">-- 선택 --</option>
        ${names.map(n=>`<option value="${n}" ${n===preselect?'selected':''}>${n}</option>`).join('')}
      </select>
    </div>
    <div id="det-body"></div>
  `;
  el.querySelector('#det-member').addEventListener('change', e => renderMemberDetail(e.target.value));
  if (preselect) renderMemberDetail(preselect);
}

function renderMemberDetail(name) {
  const el = document.getElementById('det-body');
  if (!name) { el.innerHTML = ''; return; }

  const recs = allWeeklyRecs.filter(r => r.member_name === name);
  const sc   = calcMemberScore(recs);
  const lEmoji = {green:'🟢',yellow:'🟡',red:'🔴',gray:'⚫'}[sc.light]||'⚫';
  const lightColor = {green:'#16a34a',yellow:'#ca8a04',red:'#CC0000',gray:'#9ca3af'}[sc.light]||'#9ca3af';

  el.innerHTML = `
    <!-- 점수 분해 카드 -->
    <div class="card" style="margin-bottom:16px;border-left:4px solid ${lightColor}">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">
        <span style="font-size:28px;font-weight:900">${sc.total}</span>
        <span style="font-size:20px">${lEmoji}</span>
        <span style="font-size:13px;color:#6b7280">${sc.stats.n||0}주 기록 기준 · ${WEEKS_ALL.filter(w=>w<=TODAY).length}주차</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px">
        ${[
          ['결석',     sc.breakdown.absence,  `/15`,  `${sc.stats.absN||0}번`],
          ['지각/조퇴', sc.breakdown.late,    `/10`,  `${sc.stats.lateN||0}번`],
          ['리퍼럴',   sc.breakdown.referral, `/20`,  `주평균 ${sc.stats.avgRef||'0.00'}건`],
          ['감사장',   sc.breakdown.tyfcb,    `/15`,  fmtWan(sc.stats.totTyf||0)+'원'],
          ['비지터',   sc.breakdown.visitor,  `/20`,  `주평균 ${sc.stats.avgVis||'0.00'}명`],
          ['1:1',     sc.breakdown.ono,      `/10`,  `주평균 ${sc.stats.avgOno||'0.00'}회`],
          ['교육',     sc.breakdown.ceu,      `/10`,  `누적 ${sc.stats.totCeu||0}점`],
        ].map(([label, score, max, detail]) => `
          <div style="background:#f9fafb;border-radius:8px;padding:10px 12px">
            <div style="font-size:10px;color:#9ca3af;margin-bottom:2px">${label}</div>
            <div style="font-size:16px;font-weight:700">${score}<span style="font-size:11px;font-weight:400;color:#9ca3af">${max}</span></div>
            <div style="font-size:10px;color:#6b7280;margin-top:2px">${detail}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- AI 개인 피드백 -->
    <div id="det-ai" class="card" style="margin-bottom:16px;display:none"></div>

    <!-- 24주 테이블 -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="card-title" style="margin:0">24주 주간 기록</div>
        <span style="font-size:11px;color:#9ca3af">미래 주차는 예상치 입력 가능</span>
      </div>
      <div style="overflow-x:auto">
        <table class="detail-table" id="week-table">
          <thead>
            <tr>
              <th style="text-align:left;width:60px">주차</th>
              <th style="text-align:left">날짜</th>
              <th>출결</th>
              <th>준T1</th><th>준T2</th>
              <th>비지터</th><th>1:1</th>
              <th>감사장</th><th>CEU</th>
              <th>점수</th><th></th>
            </tr>
          </thead>
          <tbody id="week-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  // AI 피드백
  const aiFb = genAIMember(name, recs, sc);
  const aiEl = document.getElementById('det-ai');
  if (aiFb.length) {
    aiEl.style.display='block';
    aiEl.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <span style="font-size:18px">🤖</span><span style="font-weight:700;font-size:13px">${name}님 개선 방향</span></div>
      ${aiFb.map(t=>`<div class="ai-tip ${t.type}" style="margin-bottom:6px"><span>${t.icon}</span><span>${t.text}</span></div>`).join('')}`;
  }

  renderWeekTable(name, recs);
}

function renderWeekTable(name, recs) {
  const tbody = document.getElementById('week-tbody');
  if (!tbody) return;
  const recMap = Object.fromEntries(recs.map(r=>[r.week_date, r]));

  // 전체 주차 기준으로 표시 (W번호는 WEEKS_ALL 기준)
  tbody.innerHTML = WEEKS_ALL.map((w, i) => {
    const r    = recMap[w];
    const past = w <= TODAY;
    const label = r ? (r.absent?'❌ 결석': r.late?'⚠️ 지각':'✅ 출석') : '—';
    const rowCls = past ? '' : 'projected-row';
    const weekSc = r ? calcMemberScore([r]) : null;

    return `
    <tr class="${rowCls}" id="wr-${i}">
      <td style="text-align:left;font-weight:700;color:#9ca3af">W${i+1}</td>
      <td style="text-align:left;white-space:nowrap">
        ${w} ${!past?'<span style="font-size:10px;color:#9ca3af">(예상)</span>':''}
        ${r?.is_estimated?'<span style="font-size:10px;color:#9ca3af">추정</span>':''}
      </td>
      <td>${label}</td>
      <td>${r?.given_t1??'—'}</td>
      <td>${r?.given_t2??'—'}</td>
      <td>${r?.visitors??'—'}</td>
      <td>${r?.one_on_one??'—'}</td>
      <td>${r ? fmtWan(r.tyfcb||0) : '—'}</td>
      <td>${r?.ceu??'—'}</td>
      <td style="font-weight:700">${weekSc ? weekSc.total : '—'}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="openWeekEdit('${w}','${name}')">
          ${r ? '수정' : '입력'}
        </button>
      </td>
    </tr>`;
  }).join('');
}

/* ── 주간 데이터 편집 모달 ── */
function openWeekEdit(weekDate, memberName) {
  const rec = allWeeklyRecs.find(r => r.week_date === weekDate && r.member_name === memberName);
  const past = weekDate <= TODAY;

  const attendVal = rec ? (rec.absent ? 'absent' : rec.late ? 'late' : 'present') : 'present';
  const modal = createModal(`
    <div style="font-size:16px;font-weight:700;margin-bottom:4px">${memberName}</div>
    <div style="font-size:12px;color:#9ca3af;margin-bottom:20px">${weekDate} ${past ? '(실제)' : '(예상)'}</div>

    <div class="form-group" style="margin-bottom:16px">
      <label class="form-label">출결</label>
      <div class="toggle-wrap" id="attend-toggle">
        <button class="toggle-btn ${attendVal==='present'?'active':''}" data-v="present" onclick="setAttendToggle(this)">✅ 출석</button>
        <button class="toggle-btn ${attendVal==='late'?'active':''}"    data-v="late"    onclick="setAttendToggle(this)">⚠️ 지각</button>
        <button class="toggle-btn ${attendVal==='absent'?'active':''}"  data-v="absent"  onclick="setAttendToggle(this)">❌ 결석</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div class="form-group">
        <label class="form-label">준T1 (리퍼럴)</label>
        <input type="number" id="ed-t1" class="form-input" value="${rec?.given_t1||0}" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">준T2 (소개)</label>
        <input type="number" id="ed-t2" class="form-input" value="${rec?.given_t2||0}" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">비지터</label>
        <input type="number" id="ed-vis" class="form-input" value="${rec?.visitors||0}" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">1:1</label>
        <input type="number" id="ed-ono" class="form-input" value="${rec?.one_on_one||0}" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">감사장 금액 (원)</label>
        <input type="number" id="ed-tyf" class="form-input" value="${rec?.tyfcb||0}" min="0" step="10000">
      </div>
      <div class="form-group">
        <label class="form-label">CEU 점수</label>
        <input type="number" id="ed-ceu" class="form-input" value="${rec?.ceu||0}" min="0">
      </div>
    </div>

    <div class="form-group" style="margin-bottom:16px">
      <label class="form-label">메모</label>
      <input type="text" id="ed-notes" class="form-input" value="${rec?.notes||''}" placeholder="선택 사항">
    </div>

    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn btn-outline" id="modal-cancel">취소</button>
      ${rec ? `<button class="btn btn-outline" id="modal-delete" style="color:#CC0000;border-color:#CC0000">삭제</button>` : ''}
      <button class="btn btn-primary" id="modal-save">저장</button>
    </div>
  `);

  window._editAttend = attendVal;
  modal.querySelector('#modal-cancel').addEventListener('click', () => modal.remove());

  if (rec) {
    modal.querySelector('#modal-delete')?.addEventListener('click', async () => {
      if (!confirm('이 주차 데이터를 삭제하시겠습니까?')) return;
      await getSb().from('weekly_records').delete().eq('id', rec.id);
      modal.remove();
      await reloadAndRefreshDetail(memberName);
    });
  }

  modal.querySelector('#modal-save').addEventListener('click', async () => {
    const av = window._editAttend || 'present';
    const data = {
      member_name: memberName,
      week_date:   weekDate,
      attended:    av !== 'absent',
      absent:      av === 'absent',
      late:        av === 'late',
      given_t1:    Number(document.getElementById('ed-t1').value)||0,
      given_t2:    Number(document.getElementById('ed-t2').value)||0,
      visitors:    Number(document.getElementById('ed-vis').value)||0,
      one_on_one:  Number(document.getElementById('ed-ono').value)||0,
      tyfcb:       Number(document.getElementById('ed-tyf').value)||0,
      ceu:         Number(document.getElementById('ed-ceu').value)||0,
      is_estimated: weekDate > TODAY,
      notes:       document.getElementById('ed-notes').value||null,
    };
    // member_id 매핑
    const mem = allMembers.find(m=>m.name===memberName);
    if (mem) data.member_id = mem.id;

    const { error } = await getSb().from('weekly_records').upsert(data, { onConflict: 'member_name,week_date' });
    if (error) { alert('저장 실패: '+error.message); return; }
    modal.remove();
    showToast('저장되었습니다');
    await reloadAndRefreshDetail(memberName);
  });
}
window.openWeekEdit = openWeekEdit;

function setAttendToggle(btn) {
  btn.closest('#attend-toggle').querySelectorAll('.toggle-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  window._editAttend = btn.dataset.v;
}
window.setAttendToggle = setAttendToggle;

async function reloadAndRefreshDetail(name) {
  await loadAll();
  // 현재 탭이 detail이면 갱신
  if (document.getElementById('tl-detail')?.classList.contains('active')) renderMemberDetail(name);
  // overview도 갱신
  renderOverview();
}

/* ═══════════════════════════════════════════════
   탭 3: 주간 입력 (멤버 전체 일괄)
═══════════════════════════════════════════════ */
function renderInput() {
  const el = document.getElementById('tl-input');
  const lastPast = [...WEEKS_ALL].filter(w => w <= TODAY).pop();

  el.innerHTML = `
    <div class="card" style="margin-bottom:12px">
      <div class="card-title">주차 선택 <span style="font-size:11px;font-weight:400;color:#9ca3af">· W${WEEKS_ALL.length}까지 자동 확장</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${WEEKS_ALL.map((w, i) => `
          <button class="btn btn-outline btn-sm ${w > TODAY ? 'projected-row' : ''}"
            style="${w===lastPast?'border-color:var(--red);color:var(--red);font-weight:700':''}"
            onclick="loadWeekInput('${w}', ${i+1})">
            W${i+1}<br><span style="font-size:10px">${w.slice(5)}</span>
          </button>`).join('')}
      </div>
    </div>
    <div id="week-input-body"></div>
  `;
}

async function loadWeekInput(weekDate, weekNum) {
  const el = document.getElementById('week-input-body');
  el.innerHTML = `<div style="text-align:center;padding:24px;color:#9ca3af">불러오는 중...</div>`;

  const recs = allWeeklyRecs.filter(r => r.week_date === weekDate);
  const recMap = Object.fromEntries(recs.map(r => [r.member_name, r]));
  const isPast = weekDate <= TODAY;

  el.innerHTML = `
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div class="card-title" style="margin:0">W${weekNum} · ${weekDate} ${!isPast?'<span style="font-size:12px;color:#9ca3af">(예상치)</span>':''}</div>
        <button class="btn btn-primary btn-sm" id="bulk-save">전체 저장</button>
      </div>
      <div style="overflow-x:auto">
        <table class="detail-table">
          <thead><tr>
            <th style="text-align:left">이름</th>
            <th>출결</th><th>준T1</th><th>준T2</th>
            <th>비지터</th><th>1:1</th><th>감사장(만원)</th><th>CEU</th>
          </tr></thead>
          <tbody>
            ${allMembers.map(m => {
              const r = recMap[m.name];
              const av = r ? (r.absent?'absent':r.late?'late':'present') : 'present';
              return `<tr>
                <td style="text-align:left;font-weight:600">${m.name}</td>
                <td>
                  <select class="form-input bulk-attend" data-name="${m.name}" style="padding:4px;font-size:12px">
                    <option value="present" ${av==='present'?'selected':''}>✅ 출석</option>
                    <option value="late"    ${av==='late'?'selected':''}>⚠️ 지각</option>
                    <option value="absent"  ${av==='absent'?'selected':''}>❌ 결석</option>
                  </select>
                </td>
                <td><input type="number" class="edit-input bulk-t1"  data-name="${m.name}" value="${r?.given_t1||0}" min="0"></td>
                <td><input type="number" class="edit-input bulk-t2"  data-name="${m.name}" value="${r?.given_t2||0}" min="0"></td>
                <td><input type="number" class="edit-input bulk-vis" data-name="${m.name}" value="${r?.visitors||0}"  min="0"></td>
                <td><input type="number" class="edit-input bulk-ono" data-name="${m.name}" value="${r?.one_on_one||0}" min="0"></td>
                <td><input type="number" class="edit-input bulk-tyf" data-name="${m.name}" value="${Math.round((r?.tyfcb||0)/10000)}" min="0" step="1"></td>
                <td><input type="number" class="edit-input bulk-ceu" data-name="${m.name}" value="${r?.ceu||0}" min="0"></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('bulk-save')?.addEventListener('click', async () => {
    const rows = allMembers.map(m => {
      const av  = el.querySelector(`.bulk-attend[data-name="${m.name}"]`)?.value || 'present';
      const tyf = Number(el.querySelector(`.bulk-tyf[data-name="${m.name}"]`)?.value||0);
      return {
        member_id:   m.id,
        member_name: m.name,
        week_date:   weekDate,
        attended:    av !== 'absent',
        absent:      av === 'absent',
        late:        av === 'late',
        given_t1:    Number(el.querySelector(`.bulk-t1[data-name="${m.name}"]`)?.value||0),
        given_t2:    Number(el.querySelector(`.bulk-t2[data-name="${m.name}"]`)?.value||0),
        visitors:    Number(el.querySelector(`.bulk-vis[data-name="${m.name}"]`)?.value||0),
        one_on_one:  Number(el.querySelector(`.bulk-ono[data-name="${m.name}"]`)?.value||0),
        tyfcb:       tyf * 10000,
        ceu:         Number(el.querySelector(`.bulk-ceu[data-name="${m.name}"]`)?.value||0),
        is_estimated: weekDate > TODAY,
      };
    });
    const { error } = await getSb().from('weekly_records').upsert(rows, { onConflict:'member_name,week_date' });
    if (error) { alert('저장 실패: '+error.message); return; }
    showToast(`W${weekNum} 전체 저장 완료`);
    await loadAll();
    renderOverview();
  });
}
window.loadWeekInput = loadWeekInput;

/* ═══════════════════════════════════════════════
   탭 4: PALMS 파일 가져오기 (monthly → weekly 분배)
═══════════════════════════════════════════════ */
function renderImport() {
  const el = document.getElementById('tl-import');
  el.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">PALMS 월별 리포트 → 주간 데이터로 변환</div>
      <p style="font-size:12px;color:#6b7280;margin-bottom:16px">
        BNI PALMS .xls/.xlsx 파일을 올리면 해당 월의 주차들에 균등 분배합니다.
      </p>
      <div class="upload-zone" id="uploadZone">
        <div style="font-size:36px;margin-bottom:8px">📊</div>
        <div style="font-weight:700;font-size:14px;margin-bottom:4px">파일 드래그 또는 클릭</div>
        <div style="font-size:12px;color:#9ca3af">.xls, .xlsx</div>
        <input type="file" id="palmsFile" accept=".xls,.xlsx" style="display:none">
      </div>
    </div>
    <div id="importPreview"></div>
  `;
  const zone = el.querySelector('#uploadZone');
  const inp  = el.querySelector('#palmsFile');
  zone.addEventListener('click', () => inp.click());
  inp.addEventListener('change', () => handleFile(inp.files[0]));
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag'); handleFile(e.dataTransfer.files[0]); });
}

async function handleFile(file) {
  if (!file) return;
  document.getElementById('importPreview').innerHTML = `<div style="text-align:center;padding:24px;color:#9ca3af">분석 중...</div>`;
  try {
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type:'array', codepage:949 });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
    showImportPreview(parsePALMS(rows));
  } catch(e) {
    document.getElementById('importPreview').innerHTML = `<div class="alert-banner crit">파싱 실패: ${e.message}</div>`;
  }
}

function parsePALMS(rows) {
  let periodStart='', periodEnd='';
  for (let i=0; i<Math.min(20,rows.length); i++) {
    const r = rows[i];
    for (let j=0; j<r.length; j++) {
      const cell = String(r[j]??'').trim();
      const tryS = v => { if (!periodStart && v) { const d=parseDateKR(v); if(d) periodStart=d; }};
      const tryE = v => { if (!periodEnd   && v) { const d=parseDateKR(v); if(d) periodEnd=d;   }};
      if (cell.includes('시작')) { tryS(cell.replace(/시작[：:\s]*/,'')); for(let k=j+1;k<Math.min(j+5,r.length);k++) tryS(String(r[k]??'').trim()); }
      if (cell.includes('종료')) { tryE(cell.replace(/종료[：:\s]*/,'')); for(let k=j+1;k<Math.min(j+5,r.length);k++) tryE(String(r[k]??'').trim()); }
    }
    if (periodStart && periodEnd) break;
  }

  let headerIdx = rows.findIndex(r => String(r[0]||'').includes('이름'));
  if (headerIdx < 0) headerIdx = rows.findIndex(r => /^[가-힣]{2,4}$/.test(String(r[0]||'').trim()));
  const hRow = rows[headerIdx]||[];
  const colMap = { name:0, attendance:2, absence:3, late_leave:4, sick_leave:5, substitute:6,
    given_t1:7, received_t1:8, received_t2:9, visitors:10, one_on_one:11, tyfcb:12, ceu:13 };
  hRow.forEach((h,i) => {
    const s=String(h||'').replace(/\s/g,'');
    if(s.includes('한글')||s==='이름') colMap.name=i;
    if(s==='출석') colMap.attendance=i; if(s==='결석') colMap.absence=i;
    if(s.includes('지각')) colMap.late_leave=i; if(s.includes('병가')) colMap.sick_leave=i;
    if(s==='준T1') colMap.given_t1=i; if(s==='준T2') colMap.given_t2=i;
    if(s==='받은T1') colMap.received_t1=i; if(s==='받은T2') colMap.received_t2=i;
    if(s.includes('비지터')) colMap.visitors=i;
    if(s.includes('1-2-1')||s.includes('121')) colMap.one_on_one=i;
    if(s.includes('감사장')) colMap.tyfcb=i; if(s==='CEU') colMap.ceu=i;
  });

  const skip = new Set(['합','비지터','bni','합계','total','']);
  const data = [];
  for (let i=headerIdx+1; i<rows.length; i++) {
    const row=rows[i];
    const name=String(row[colMap.name]||'').trim();
    if (!name || skip.has(name.toLowerCase()) || /^[A-Za-z]/.test(name)) continue;
    const n=f=>Math.max(0,Number(row[colMap[f]])||0);
    data.push({ member_name:name, attendance:n('attendance'), absence:n('absence'), late_leave:n('late_leave'),
      sick_leave:n('sick_leave'), substitute:n('substitute'), given_t1:n('given_t1'), given_t2:n('given_t2')||0,
      received_t1:n('received_t1'), received_t2:n('received_t2'), visitors:n('visitors'),
      one_on_one:n('one_on_one'), tyfcb:n('tyfcb'), ceu:n('ceu') });
  }
  return { periodStart, periodEnd, data };
}

function parseDateKR(str) {
  const s=String(str??'').trim(); if(!s||s==='0') return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const num=Number(s);
  if(!isNaN(num)&&num>40000&&num<60000) { const d=new Date(Date.UTC(1899,11,30)+num*86400000); return d.toISOString().slice(0,10); }
  const m=s.match(/(\d{2,4})[.\-\/\s]+(\d{1,2})[.\-\/\s]+(\d{1,2})/);
  if(!m) return '';
  let y=Number(m[1]); if(y<100) y+=2000;
  const mo=Number(m[2]),da=Number(m[3]);
  if(mo<1||mo>12||da<1||da>31) return '';
  return `${y}-${String(mo).padStart(2,'0')}-${String(da).padStart(2,'0')}`;
}

function showImportPreview(parsed) {
  const prev = document.getElementById('importPreview');
  let { periodStart, periodEnd, data } = parsed;

  // 이 기간에 속하는 24주 기준 주차 찾기
  const weeksInPeriod = WEEKS_24.filter(w => w >= (periodStart||'') && w <= (periodEnd||periodStart||''));

  const matched = data.map(d => {
    const mem = allMembers.find(m => m.name===d.member_name||m.name.replace(/\s/g,'')===d.member_name.replace(/\s/g,''));
    return { ...d, matched:!!mem, member_id:mem?.id||null };
  });

  prev.innerHTML = `
    <div class="card">
      <div class="card-title" style="margin-bottom:12px">파싱 결과</div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
        <div style="display:flex;gap:8px;align-items:center">
          <label style="font-size:12px;font-weight:600">시작일</label>
          <input type="date" id="imp-start" class="form-input" value="${periodStart}" style="width:150px">
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <label style="font-size:12px;font-weight:600">종료일</label>
          <input type="date" id="imp-end" class="form-input" value="${periodEnd}" style="width:150px">
        </div>
        ${!periodStart?'<span style="font-size:12px;color:#CC0000">⚠️ 기간 직접 입력 필요</span>':'<span style="font-size:12px;color:#16a34a">✓ 자동 인식</span>'}
      </div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:12px">
        해당 기간 주차: ${weeksInPeriod.length ? weeksInPeriod.map((w,i)=>`W${WEEKS_24.indexOf(w)+1}(${w.slice(5)})`).join(', ') : '기간을 입력하면 자동 계산'}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">
        <span style="font-size:12px">
          <span class="match-ok">매칭 ${matched.filter(m=>m.matched).length}명</span>
          ${matched.filter(m=>!m.matched).length?`&nbsp;·&nbsp;<span class="match-no">미매칭 ${matched.filter(m=>!m.matched).length}명</span>`:''}
        </span>
        <button class="btn btn-primary" id="confirmImport">주간 데이터로 가져오기</button>
      </div>
      <div class="preview-table-wrap">
        <table class="preview-table">
          <thead><tr><th>이름</th><th>매칭</th><th>출석</th><th>결석</th><th>준T1</th><th>준T2</th><th>비지터</th><th>1:1</th><th>감사장</th><th>CEU</th></tr></thead>
          <tbody>
            ${matched.map(m=>`<tr class="${m.matched?'':'unmatched'}">
              <td><strong>${m.member_name}</strong></td>
              <td class="${m.matched?'match-ok':'match-no'}">${m.matched?'✓':'✗'}</td>
              <td>${m.attendance}</td><td>${m.absence}</td><td>${m.given_t1}</td>
              <td>${m.given_t2||0}</td><td>${m.visitors}</td><td>${m.one_on_one}</td>
              <td>${fmtWan(m.tyfcb)}</td><td>${m.ceu}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('confirmImport')?.addEventListener('click', async () => {
    const ps = document.getElementById('imp-start')?.value;
    const pe = document.getElementById('imp-end')?.value || ps;
    if (!ps) { alert('시작일을 입력해주세요'); return; }
    const weeks = WEEKS_24.filter(w => w >= ps && w <= pe);
    if (!weeks.length) { alert('해당 기간에 속하는 주차가 없습니다'); return; }
    await importWeeklyFromPALMS(matched, weeks);
  });
}

async function importWeeklyFromPALMS(matched, weeks) {
  const n = weeks.length;
  const rows = [];
  for (const m of matched) {
    for (const w of weeks) {
      rows.push({
        member_id: m.member_id, member_name: m.member_name,
        week_date: w,
        attended: m.absence === 0,
        absent: false, late: false,
        given_t1:   Math.round(m.given_t1 / n),
        given_t2:   Math.round((m.given_t2||0) / n),
        visitors:   Math.round(m.visitors / n),
        one_on_one: Math.round(m.one_on_one / n),
        tyfcb:      Math.round(m.tyfcb / n),
        ceu:        Math.round(m.ceu / n),
        is_estimated: false,
      });
    }
  }
  const { error } = await getSb().from('weekly_records').upsert(rows, { onConflict:'member_name,week_date' });
  if (error) { alert('가져오기 실패: '+error.message); return; }
  showToast(`${rows.length}개 주간 레코드 저장 완료`);
  await loadAll();
  renderOverview();
  document.querySelector('.tl-tab[data-tab="overview"]')?.click();
}

/* ═══════════════════════════════════════════════
   탭 5: 점수 기준 (표시 전용)
═══════════════════════════════════════════════ */
function renderCriteria() {
  document.getElementById('tl-criteria').innerHTML = `
    <div class="card">
      <div class="card-title" style="margin-bottom:16px">트래픽라이트 점수 기준</div>
      <table class="detail-table">
        <thead><tr><th style="text-align:left">항목</th><th>만점</th><th style="text-align:left">기준</th></tr></thead>
        <tbody>
          <tr><td style="text-align:left;font-weight:600">결석</td><td>15</td><td style="text-align:left;font-size:12px">결석 0회=15점 / 1회=10점 / 2회=5점 / 3회 이상=0점</td></tr>
          <tr><td style="text-align:left;font-weight:600">지각/조퇴</td><td>10</td><td style="text-align:left;font-size:12px">0회=10점 / 1회=5점 / 2회 이상=0점</td></tr>
          <tr><td style="text-align:left;font-weight:600">리퍼럴(준)</td><td>20</td><td style="text-align:left;font-size:12px">주평균 1.2 이상=20 / 1.2미만=15 / 1.0미만=10 / 0.75미만=5 / 0.5미만=0</td></tr>
          <tr><td style="text-align:left;font-weight:600">감사장 금액</td><td>15</td><td style="text-align:left;font-size:12px">누적 1억 이상=15 / 5천만 이상=10 / 2천5백만 이상=5 / 미만=0</td></tr>
          <tr><td style="text-align:left;font-weight:600">비지터</td><td>20</td><td style="text-align:left;font-size:12px">주평균 0.6 이상=20 / 0.4 이상=15 / 0.2 이상=10 / 0.1 이상=5 / 미만=0</td></tr>
          <tr><td style="text-align:left;font-weight:600">1:1</td><td>10</td><td style="text-align:left;font-size:12px">주평균 2 이상=10 / 1 이상=5 / 미만=0</td></tr>
          <tr><td style="text-align:left;font-weight:600">교육(CEU)</td><td>10</td><td style="text-align:left;font-size:12px">누적 15 이상=10 / 5 이상=5 / 미만=0</td></tr>
        </tbody>
      </table>
      <div style="margin-top:20px;padding:16px;background:#f9fafb;border-radius:10px">
        <div style="font-weight:700;margin-bottom:8px">트래픽라이트 기준 (합계 100점)</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:13px">
          <span class="score-badge green">🟢 70점 이상</span>
          <span class="score-badge yellow">🟡 50~69점</span>
          <span class="score-badge red">🔴 30~49점</span>
          <span class="score-badge gray">⚫ 30점 미만</span>
        </div>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════
   AI 디렉터
═══════════════════════════════════════════════ */
function genAIOverview(memberScores) {
  if (!memberScores.length) return [];
  const total = memberScores.length;
  const green  = memberScores.filter(m=>m.light==='green').length;
  const yellow = memberScores.filter(m=>m.light==='yellow').length;
  const red    = memberScores.filter(m=>m.light==='red').length;
  const gray   = memberScores.filter(m=>m.light==='gray').length;
  const health = Math.round((green*100+yellow*60+red*30)/total);
  const tips   = [];

  if (health >= 80)      tips.push({type:'positive',icon:'✅',text:`챕터 건강 점수 ${health}점 — Green 멤버 ${green}명(${Math.round(green/total*100)}%)이 기준을 충족하고 있습니다.`});
  else if (health >= 60) tips.push({type:'warning', icon:'⚠️',text:`챕터 건강 점수 ${health}점 — 개선이 필요한 멤버가 많습니다. Yellow/Red 멤버 집중 면담을 권장합니다.`});
  else                   tips.push({type:'critical',icon:'🚨',text:`챕터 건강 점수 ${health}점으로 위험 수준입니다. 멤버십위원회의 즉각 개입이 필요합니다.`});

  if (red > 0) {
    const redNames = memberScores.filter(m=>m.light==='red').sort((a,b)=>a.total-b.total).slice(0,3).map(m=>m.name);
    tips.push({type:'action',icon:'👉',text:`🔴 Red 멤버 ${red}명 — 즉시 면담 권장: ${redNames.join(', ')}${red>3?' 외':''}`});
  }
  if (gray > 0) tips.push({type:'warning',icon:'⚠️',text:`⚫ 미입력 멤버 ${gray}명 — 데이터 입력을 독려해 주세요.`});

  const topM = memberScores.find(m=>m.light==='green'&&m.recs.length>0);
  if (topM) tips.push({type:'positive',icon:'🏆',text:`최고 점수: ${topM.name}님 ${topM.total}점 — 멤버십 모범 사례로 공유해 챕터 문화를 강화하세요.`});

  return tips;
}

function genAIMember(name, recs, sc) {
  const tips = [];
  if (!recs.length) return [{type:'warning',icon:'⚠️',text:'주간 데이터를 입력하거나 PALMS 파일을 가져오면 분석됩니다.'}];

  const lMsg = {green:'모든 기준 충족 — 훌륭합니다!',yellow:'일부 기준 미달 — 아래 항목을 개선하면 Green 달성 가능합니다.',red:'여러 기준 미달 — 담당자 면담이 필요합니다.',gray:'데이터 부족 — 더 많은 주차 입력이 필요합니다.'};
  tips.push({type:{green:'positive',yellow:'warning',red:'critical',gray:'warning'}[sc.light]||'warning',
    icon:{green:'✅',yellow:'⚠️',red:'🚨',gray:'⚫'}[sc.light],text:`현재 ${sc.total}점 · ${lMsg[sc.light]}`});

  if (sc.breakdown.absence < 15) tips.push({type:'action',icon:'👉',text:`결석 ${sc.stats.absN}회로 ${15-sc.breakdown.absence}점 감점 중 — 출석 관리가 필요합니다.`});
  if (sc.breakdown.late < 10)    tips.push({type:'action',icon:'👉',text:`지각/조퇴 ${sc.stats.lateN}회 — 시간 엄수로 ${10-sc.breakdown.late}점 회복 가능합니다.`});
  if (sc.breakdown.referral < 20) {
    const needed = sc.stats.avgRef < 0.5 ? 0.5 : sc.stats.avgRef < 0.75 ? 0.75 : sc.stats.avgRef < 1.0 ? 1.0 : 1.2;
    tips.push({type:'action',icon:'👉',text:`주평균 리퍼럴 ${sc.stats.avgRef}건 (목표 ${needed}건) — 1:1 미팅에서 적극적인 소개를 요청해 보세요.`});
  }
  if (sc.breakdown.tyfcb < 15) {
    const needed = sc.stats.totTyf < 25000000 ? '2,500만' : sc.stats.totTyf < 50000000 ? '5,000만' : '1억';
    tips.push({type:'action',icon:'👉',text:`감사장 누적 ${fmtWan(sc.stats.totTyf)}원 (다음 목표: ${needed}원) — 받은 리퍼럴이 성사되면 반드시 감사장을 기록하세요.`});
  }
  if (sc.breakdown.visitor < 20) tips.push({type:'action',icon:'👉',text:`주평균 비지터 ${sc.stats.avgVis}명 (목표 0.6명) — 주변 비즈니스 파트너를 방문객으로 초대해 보세요.`});
  if (sc.breakdown.ono < 10)     tips.push({type:'action',icon:'👉',text:`주평균 1:1 ${sc.stats.avgOno}회 (목표 2회) — 매주 2번의 1:1 미팅이 리퍼럴 활성화의 핵심입니다.`});
  if (sc.breakdown.ceu < 10)     tips.push({type:'action',icon:'👉',text:`CEU 누적 ${sc.stats.totCeu}점 (목표 15점) — 교육 세션에 빠짐없이 참여하세요.`});

  return tips;
}

/* ── 공통 헬퍼 ── */
function showMemberDetail(name) {
  document.querySelectorAll('.tl-tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tl-panel').forEach(p=>p.classList.remove('active'));
  document.querySelector('.tl-tab[data-tab="detail"]').classList.add('active');
  document.getElementById('tl-detail').classList.add('active');
  renderDetail(name);
}

function createModal(innerHtml) {
  const modal = document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px';
  modal.innerHTML=`<div style="background:#fff;border-radius:14px;padding:28px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto">${innerHtml}</div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
  return modal;
}

function fmtWan(v) {
  const n = Number(v)||0;
  if (n >= 100000000) return (n/100000000).toFixed(1)+'억';
  if (n >= 10000)     return Math.round(n/10000)+'만';
  return n.toLocaleString();
}

function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText='position:fixed;bottom:24px;right:24px;background:#1a1f2e;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:999;opacity:0;transition:opacity .3s';
  t.textContent=msg; document.body.appendChild(t);
  requestAnimationFrame(()=>{ t.style.opacity='1'; setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),300); },2000); });
}

window.showMemberDetail = showMemberDetail;
