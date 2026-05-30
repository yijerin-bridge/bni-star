/* ============================================================
   BNI STAR — Traffic Light v2 (PALMS 기반)
   ============================================================ */

let allMembers = [], allRecords = [], scoreConfig = {};
let currentPeriod = null; // { start: 'YYYY-MM-DD', label: 'YYYY.MM' }
let chartInstance = null;

/* ── 초기화 ── */
async function initTrafficLight(session, bodyEl) {
  bodyEl.innerHTML = `
    <div class="page-header">
      <div><h1>트래픽라이트</h1><p>PALMS 기반 월별 멤버 성과 분석</p></div>
    </div>
    <div class="tl-tab-bar">
      <button class="tl-tab active" data-tab="overview">📊 전체 현황</button>
      <button class="tl-tab" data-tab="detail">👤 개인 상세</button>
      <button class="tl-tab" data-tab="import">📁 파일 가져오기</button>
      <button class="tl-tab" data-tab="config">⚙️ 점수 설정</button>
    </div>
    <div class="tl-panel active" id="tl-overview"></div>
    <div class="tl-panel"        id="tl-detail"></div>
    <div class="tl-panel"        id="tl-import"></div>
    <div class="tl-panel"        id="tl-config"></div>
  `;

  bodyEl.querySelectorAll('.tl-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      bodyEl.querySelectorAll('.tl-tab').forEach(b => b.classList.remove('active'));
      bodyEl.querySelectorAll('.tl-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      bodyEl.querySelector('#tl-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'detail')   renderDetail();
      if (btn.dataset.tab === 'import')   renderImport();
      if (btn.dataset.tab === 'config')   renderConfig();
    });
  });

  await loadAll();
  renderOverview();
}

/* ── 데이터 로드 ── */
async function loadAll() {
  const [memRes, recRes, cfgRes] = await Promise.all([
    getSb().from('members').select('id,legacy_id,name,company').eq('is_active', true).order('name'),
    getSb().from('palms_records').select('*').order('period_start', { ascending: false }),
    getSb().from('palms_score_config').select('*').eq('id', 1).single(),
  ]);
  allMembers = (memRes.data || []).map(m => ({ ...m, uid: m.legacy_id ?? m.id }));
  allRecords = recRes.data || [];
  scoreConfig = cfgRes.data || defaultConfig();

  // 현재 기간 = 가장 최근 레코드 기간, 없으면 이번 달
  if (allRecords.length && !currentPeriod) {
    currentPeriod = allRecords[0].period_start;
  } else if (!currentPeriod) {
    const now = new Date();
    currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-01`;
  }
}

function defaultConfig() {
  return { attend_weight:30, attend_target:80, referral_weight:25, referral_target:2,
           tyfcb_weight:20, tyfcb_target:50, ono_weight:15, ono_target:2,
           ceu_weight:10, ceu_target:3, green_min:70, yellow_min:40 };
}

/* ── 점수 계산 ── */
function calcScore(rec, cfg = scoreConfig) {
  const total = (rec.attendance||0) + (rec.absence||0) + (rec.late_leave||0) + (rec.sick_leave||0);
  const attendPct   = total > 0 ? (rec.attendance||0) / total * 100 : 0;
  const referrals   = (rec.given_t1||0) + (rec.given_t2||0);
  const tyfcbWan    = (rec.tyfcb||0) / 10000;

  const s = (actual, target, weight) => Math.min(1, actual / Math.max(target, 1)) * weight;
  const score = Math.round(
    s(attendPct,     cfg.attend_target,   cfg.attend_weight)  +
    s(referrals,     cfg.referral_target, cfg.referral_weight)+
    s(tyfcbWan,      cfg.tyfcb_target,    cfg.tyfcb_weight)   +
    s(rec.one_on_one||0, cfg.ono_target,  cfg.ono_weight)     +
    s(rec.ceu||0,    cfg.ceu_target,      cfg.ceu_weight)
  );
  const light = score >= cfg.green_min ? 'green' : score >= cfg.yellow_min ? 'yellow' : 'red';
  return { score, light };
}

/* ── 기간 목록 (최근 6개월) ── */
function get6Periods() {
  const periods = [...new Set(allRecords.map(r => r.period_start))].sort().reverse().slice(0, 6);
  return periods;
}

function periodLabel(start) {
  const d = new Date(start); return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}`;
}

function prevPeriod(start) {
  const d = new Date(start); d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
}
function nextPeriod(start) {
  const d = new Date(start); d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
}

/* ════════════════════════════════════════
   탭 1: 전체 현황
════════════════════════════════════════ */
function renderOverview() {
  const el = document.getElementById('tl-overview');
  const periods = get6Periods();
  const hasPrev = allRecords.some(r => r.period_start < currentPeriod);
  const hasNext = allRecords.some(r => r.period_start > currentPeriod);

  const curRecs = allRecords.filter(r => r.period_start === currentPeriod);

  // 점수 계산
  const scored = curRecs.map(r => ({ ...r, ...calcScore(r) }));
  const green  = scored.filter(r => r.light === 'green').length;
  const yellow = scored.filter(r => r.light === 'yellow').length;
  const red    = scored.filter(r => r.light === 'red').length;

  // AI 디렉터 인사이트
  const aiTips = genAIOverview(scored, periods);

  el.innerHTML = `
    <!-- AI 디렉터 -->
    ${aiTips.length ? `
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span style="font-size:20px">🤖</span>
        <span style="font-weight:700;font-size:14px">AI 챕터 디렉터</span>
        <span style="font-size:11px;color:#9ca3af">· ${periodLabel(currentPeriod)} 분석</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${aiTips.map(t=>`<div class="ai-tip ${t.type}"><span>${t.icon}</span><span>${t.text}</span></div>`).join('')}
      </div>
    </div>` : ''}

    <!-- 기간 네비 + 요약 -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px">
      <div class="period-nav" style="margin:0">
        <button id="ov-prev" ${!hasPrev?'disabled':''}>&#8249;</button>
        <span class="period-label">${periodLabel(currentPeriod)}</span>
        <button id="ov-next" ${!hasNext?'disabled':''}>&#8250;</button>
      </div>
      <div style="display:flex;gap:10px">
        <span class="score-badge green">🟢 ${green}명</span>
        <span class="score-badge yellow">🟡 ${yellow}명</span>
        <span class="score-badge red">🔴 ${red}명</span>
        ${curRecs.length===0?'<span style="font-size:12px;color:#9ca3af">데이터 없음 — 파일을 가져오세요</span>':''}
      </div>
    </div>

    <!-- 멤버 그리드 -->
    <div class="member-score-grid" id="ov-grid"></div>
  `;

  el.querySelector('#ov-prev')?.addEventListener('click', () => {
    currentPeriod = prevPeriod(currentPeriod); renderOverview();
  });
  el.querySelector('#ov-next')?.addEventListener('click', () => {
    currentPeriod = nextPeriod(currentPeriod); renderOverview();
  });

  renderMemberGrid(scored, periods);
}

function renderMemberGrid(scored, periods) {
  const grid = document.getElementById('ov-grid');
  if (!grid) return;

  const lightEmoji = { green:'🟢', yellow:'🟡', red:'🔴', new:'⚪' };

  // 멤버 목록: 현재 기간 데이터 있는 멤버 + allMembers 병합
  const names = new Set(scored.map(r => r.member_name));
  const rows  = scored.length ? scored : allMembers.map(m => ({ member_name: m.name, light:'new', score:0 }));

  grid.innerHTML = rows.sort((a,b) => {
    const order = { red:0, yellow:1, green:2, new:3 };
    return (order[a.light]??3) - (order[b.light]??3) || (b.score||0) - (a.score||0);
  }).map(r => {
    const sparkBars = periods.map(p => {
      const rec = allRecords.find(x => x.period_start===p && x.member_name===r.member_name);
      if (!rec) return `<div class="ms-spark-bar" style="height:4px;background:#e5e7eb"></div>`;
      const { score, light } = calcScore(rec);
      const h = Math.max(4, Math.round(score / 100 * 24));
      const col = { green:'#16a34a', yellow:'#ca8a04', red:'#CC0000' }[light] || '#9ca3af';
      return `<div class="ms-spark-bar" style="height:${h}px;background:${col}" title="${periodLabel(p)}: ${score}점"></div>`;
    });

    return `
    <div class="ms-card ${r.light||'new'}" data-name="${r.member_name}" onclick="showMemberDetail('${r.member_name}')">
      <div class="ms-name">${r.member_name}</div>
      <div class="ms-score-row">
        <span class="ms-score">${r.score??'—'}</span>
        <span class="ms-light">${lightEmoji[r.light]||'⚪'}</span>
      </div>
      <div class="ms-sparkline">${sparkBars.join('')}</div>
      <div class="ms-sub">${r.given_t1!=null?`준T1:${r.given_t1} 1:1:${r.one_on_one??0} CEU:${r.ceu??0}`:''}</div>
    </div>`;
  }).join('');
}

function showMemberDetail(name) {
  document.querySelectorAll('.tl-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tl-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('.tl-tab[data-tab="detail"]').classList.add('active');
  document.getElementById('tl-detail').classList.add('active');
  renderDetail(name);
}

/* ════════════════════════════════════════
   탭 2: 개인 상세
════════════════════════════════════════ */
function renderDetail(preselect = null) {
  const el = document.getElementById('tl-detail');
  const names = [...new Set(allRecords.map(r => r.member_name))].sort((a,b) => a.localeCompare(b,'ko'));

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

  const recs  = allRecords.filter(r => r.member_name === name)
    .sort((a,b) => a.period_start.localeCompare(b.period_start));
  const periods = get6Periods().reverse(); // 오래된 순

  // 프로젝션: 데이터 없는 기간은 평균으로 추정
  const avgRec = avgRecord(recs);
  const rows = periods.map(p => {
    const rec = recs.find(r => r.period_start === p);
    const projected = !rec && avgRec;
    const data = rec || (projected ? { ...avgRec, period_start:p, period_end:p, id:null } : null);
    const scored = data ? calcScore(data) : null;
    return { period:p, data, scored, projected: projected && !rec };
  });

  // 차트 데이터
  const chartLabels  = rows.filter(r=>r.scored).map(r=>periodLabel(r.period));
  const chartScores  = rows.filter(r=>r.scored).map(r=>r.scored.score);
  const chartColors  = rows.filter(r=>r.scored).map(r=>
    r.projected ? '#d1d5db' : { green:'#16a34a', yellow:'#ca8a04', red:'#CC0000' }[r.scored.light]);

  // AI 개인 피드백
  const aiFeedback = genAIMember(name, recs, avgRec);

  el.innerHTML = `
    <!-- AI 개인 피드백 -->
    ${aiFeedback.length ? `
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:18px">🤖</span>
        <span style="font-weight:700;font-size:13px">${name}님 개인 피드백</span>
      </div>
      ${aiFeedback.map(t=>`<div class="ai-tip ${t.type}" style="margin-bottom:6px"><span>${t.icon}</span><span>${t.text}</span></div>`).join('')}
    </div>` : ''}

    <!-- 점수 추이 차트 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">점수 추이 (6개월)</div>
      <canvas id="det-chart" height="100"></canvas>
      <div style="font-size:11px;color:#9ca3af;margin-top:6px">* 회색 = 데이터 없는 기간 추정값</div>
    </div>

    <!-- 월별 상세 테이블 -->
    <div class="card">
      <div class="card-title" style="margin-bottom:12px">월별 상세</div>
      <div style="overflow-x:auto">
        <table class="detail-table" id="det-table">
          <thead>
            <tr>
              <th style="text-align:left">기간</th>
              <th>출석</th><th>결석</th><th>지각</th><th>준T1</th><th>준T2</th>
              <th>받은T1</th><th>1:1</th><th>감사장</th><th>CEU</th>
              <th>점수</th><th>등급</th><th></th>
            </tr>
          </thead>
          <tbody id="det-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  // 차트 렌더
  const ctx = document.getElementById('det-chart');
  if (ctx && chartLabels.length) {
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartLabels,
        datasets: [{
          data: chartScores, backgroundColor: chartColors, borderRadius: 4,
          borderColor: chartColors, borderWidth: 1.5,
        }]
      },
      options: {
        responsive: true, plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v+'점' } } }
      }
    });
  }

  renderDetailTable(rows, name);
}

function renderDetailTable(rows, name) {
  const tbody = document.getElementById('det-tbody');
  if (!tbody) return;
  const lightEmoji = { green:'🟢', yellow:'🟡', red:'🔴', new:'⚪' };
  const fmt = v => v >= 10000 ? Math.round(v/10000)+'만' : v?.toLocaleString() || '0';

  tbody.innerHTML = rows.map((row, i) => {
    const d = row.data;
    const s = row.scored;
    if (!d) return `<tr><td class="period-col">${periodLabel(row.period)}</td>
      <td colspan="11" style="color:#9ca3af">데이터 없음</td><td></td></tr>`;
    const cls = row.projected ? 'projected-row' : '';
    return `
    <tr class="${cls}" id="row-${i}">
      <td class="period-col">
        ${periodLabel(row.period)}
        ${row.projected ? '<span style="font-size:10px;color:#9ca3af">(추정)</span>' : ''}
      </td>
      <td class="editable" data-field="attendance">${d.attendance??0}</td>
      <td class="editable" data-field="absence">${d.absence??0}</td>
      <td class="editable" data-field="late_leave">${d.late_leave??0}</td>
      <td class="editable" data-field="given_t1">${d.given_t1??0}</td>
      <td class="editable" data-field="given_t2">${d.given_t2??0}</td>
      <td class="editable" data-field="received_t1">${d.received_t1??0}</td>
      <td class="editable" data-field="one_on_one">${d.one_on_one??0}</td>
      <td class="editable" data-field="tyfcb">${fmt(d.tyfcb)}</td>
      <td class="editable" data-field="ceu">${d.ceu??0}</td>
      <td style="font-weight:700">${s?.score??'—'}</td>
      <td>${lightEmoji[s?.light]||'—'}</td>
      <td>
        ${!row.projected && d.id ? `<button class="btn btn-outline btn-sm" onclick="editRow(${i})">수정</button>` : ''}
      </td>
    </tr>`;
  }).join('');

  window._detailRows = rows;
  window._detailName = name;
}

function editRow(i) {
  const rows = window._detailRows;
  const row  = rows[i];
  if (!row?.data) return;
  const d = row.data;
  const tr = document.getElementById(`row-${i}`);
  if (!tr) return;

  const fields = ['attendance','absence','late_leave','given_t1','given_t2','received_t1','one_on_one','tyfcb','ceu'];
  tr.querySelectorAll('.editable').forEach((td, idx) => {
    const f = fields[idx];
    const v = f === 'tyfcb' ? (d[f]||0) : (d[f]||0);
    td.innerHTML = `<input class="edit-input" type="number" data-field="${f}" value="${v}" min="0">`;
  });

  // 수정 → 저장 버튼으로 교체
  const actionTd = tr.querySelector('td:last-child');
  actionTd.innerHTML = `
    <button class="btn btn-primary btn-sm" id="save-row-${i}">저장</button>
    <button class="btn btn-outline btn-sm" onclick="renderDetailTable(window._detailRows, window._detailName)" style="margin-top:4px">취소</button>
  `;

  // 실시간 점수 미리보기
  const updatePreview = () => {
    const draft = { ...d };
    tr.querySelectorAll('.edit-input').forEach(inp => {
      draft[inp.dataset.field] = Number(inp.value) || 0;
    });
    const { score, light } = calcScore(draft);
    const lightEmoji = { green:'🟢', yellow:'🟡', red:'🔴' };
    tr.querySelectorAll('td')[10].textContent = score;
    tr.querySelectorAll('td')[11].textContent = lightEmoji[light] || '—';
  };
  tr.querySelectorAll('.edit-input').forEach(inp => inp.addEventListener('input', updatePreview));

  document.getElementById(`save-row-${i}`)?.addEventListener('click', async () => {
    const patch = {};
    tr.querySelectorAll('.edit-input').forEach(inp => {
      patch[inp.dataset.field] = Number(inp.value) || 0;
    });
    const { score, light } = calcScore({ ...d, ...patch });
    patch.score = score; patch.light = light; patch.is_manual = true;

    const { error } = await getSb().from('palms_records').update(patch).eq('id', d.id);
    if (error) { alert('저장 실패: ' + error.message); return; }
    showToast('저장되었습니다');
    await loadAll();
    renderDetailTable(
      get6Periods().reverse().map(p => {
        const rec = allRecords.find(r => r.period_start===p && r.member_name===window._detailName);
        const projected = !rec && avgRecord(allRecords.filter(r=>r.member_name===window._detailName));
        const data = rec || (projected ? { ...projected, period_start:p } : null);
        return { period:p, data, scored: data ? calcScore(data) : null, projected: !rec && !!projected };
      }),
      window._detailName
    );
  });
}
window.editRow = editRow;

/* 평균 레코드 계산 (프로젝션용) */
function avgRecord(recs) {
  if (!recs.length) return null;
  const fields = ['attendance','absence','late_leave','given_t1','given_t2','received_t1','one_on_one','tyfcb','ceu'];
  const avg = {};
  fields.forEach(f => { avg[f] = Math.round(recs.reduce((s,r)=>s+(r[f]||0),0)/recs.length); });
  return avg;
}

/* ════════════════════════════════════════
   탭 3: 파일 가져오기
════════════════════════════════════════ */
function renderImport() {
  const el = document.getElementById('tl-import');
  el.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">PALMS 리포트 가져오기</div>
      <p style="font-size:13px;color:#6b7280;margin-bottom:16px">
        BNI PALMS에서 내보낸 .xls / .xlsx 파일을 업로드하면 자동으로 파싱합니다.
      </p>
      <div class="upload-zone" id="uploadZone">
        <div style="font-size:36px;margin-bottom:8px">📊</div>
        <div style="font-weight:700;font-size:14px;margin-bottom:4px">파일을 여기에 드래그하거나 클릭해서 선택</div>
        <div style="font-size:12px;color:#9ca3af">.xls, .xlsx 지원</div>
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
  const prev = document.getElementById('importPreview');
  prev.innerHTML = `<div style="text-align:center;padding:24px;color:#9ca3af">파일 분석 중...</div>`;

  try {
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: 'array', codepage: 949 });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    const parsed = parsePALMS(rows);
    showImportPreview(parsed);
  } catch(e) {
    prev.innerHTML = `<div class="alert-banner crit">파일 파싱 실패: ${e.message}</div>`;
  }
}

function parsePALMS(rows) {
  // 기간 찾기
  let periodStart = '', periodEnd = '';
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const r = rows[i];
    for (let j = 0; j < r.length; j++) {
      const cell = String(r[j]||'').trim();
      if (cell.includes('시작') || cell === '시작:') {
        const val = String(r[j+1]||'').trim();
        if (val) periodStart = parseDateKR(val);
      }
      if (cell.includes('종료') || cell === '종료:') {
        const val = String(r[j+1]||'').trim();
        if (val) periodEnd = parseDateKR(val);
      }
    }
  }

  // 헤더 행 찾기 (첫 컬럼이 "이름" 포함)
  let headerIdx = rows.findIndex(r => String(r[0]||'').includes('이름'));
  if (headerIdx < 0) headerIdx = rows.findIndex(r => String(r[0]||'') === '한관우' || String(r[0]||'').length >= 2);

  // 컬럼 매핑: 헤더 기준
  const hRow = rows[headerIdx] || [];
  const colMap = {};
  const colNames = ['이름','출석','결석','지각','병가','대리인','준T1','준T2','받은T1','받은T2','비지터','1-2-1','감사장','CEU'];
  hRow.forEach((h, i) => {
    const s = String(h||'').replace(/\s/g,'').replace(/[()（）]/g,'');
    if (s.includes('한글') || s==='이름') colMap.name   = i;
    if (s==='출석') colMap.attendance = i;
    if (s==='결석') colMap.absence    = i;
    if (s.includes('지각')) colMap.late_leave = i;
    if (s.includes('병가')) colMap.sick_leave = i;
    if (s.includes('대리')) colMap.substitute = i;
    if (s==='준T1')  colMap.given_t1   = i;
    if (s==='준T2')  colMap.given_t2   = i;
    if (s==='받은T1') colMap.received_t1 = i;
    if (s==='받은T2') colMap.received_t2 = i;
    if (s.includes('비지터')) colMap.visitors = i;
    if (s.includes('1-2-1') || s.includes('121')) colMap.one_on_one = i;
    if (s.includes('감사장')) colMap.tyfcb = i;
    if (s==='CEU')   colMap.ceu = i;
  });

  // 폴백 컬럼 인덱스 (PDF 기준 순서)
  if (colMap.name    == null) colMap.name       = 0;
  if (colMap.attendance == null) colMap.attendance = 2;
  if (colMap.absence == null) colMap.absence    = 3;
  if (colMap.late_leave == null) colMap.late_leave = 4;
  if (colMap.sick_leave == null) colMap.sick_leave = 5;
  if (colMap.substitute == null) colMap.substitute = 6;
  if (colMap.given_t1 == null) colMap.given_t1  = 7;
  if (colMap.received_t1 == null) colMap.received_t1 = 8;
  if (colMap.received_t2 == null) colMap.received_t2 = 9;
  if (colMap.visitors == null) colMap.visitors  = 10;
  if (colMap.one_on_one == null) colMap.one_on_one = 11;
  if (colMap.tyfcb == null) colMap.tyfcb       = 12;
  if (colMap.ceu == null) colMap.ceu           = 13;

  // 데이터 파싱
  const skipNames = new Set(['합','비지터','bni','합계','total','']);
  const data = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const name = String(row[colMap.name]||'').trim();
    if (!name || skipNames.has(name.toLowerCase())) continue;
    if (/^[A-Za-z]/.test(name)) continue; // 영문 이름 행 스킵
    if (name === '합') break;

    const n = f => Math.max(0, Number(row[colMap[f]])||0);
    const rec = {
      member_name: name,
      attendance:  n('attendance'),
      absence:     n('absence'),
      late_leave:  n('late_leave'),
      sick_leave:  n('sick_leave'),
      substitute:  n('substitute'),
      given_t1:    n('given_t1'),
      given_t2:    n('given_t2'),
      received_t1: n('received_t1'),
      received_t2: n('received_t2'),
      visitors:    n('visitors'),
      one_on_one:  n('one_on_one'),
      tyfcb:       n('tyfcb'),
      ceu:         n('ceu'),
    };
    data.push(rec);
  }

  return { periodStart, periodEnd, data };
}

function parseDateKR(str) {
  // "26. 5. 1." → "2026-05-01"
  const m = str.match(/(\d+)[\.\s]+(\d+)[\.\s]+(\d+)/);
  if (!m) return '';
  let y = Number(m[1]);
  if (y < 100) y += 2000;
  return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
}

function showImportPreview(parsed) {
  const prev = document.getElementById('importPreview');
  const { periodStart, periodEnd, data } = parsed;

  // 멤버 매칭
  const matched = data.map(d => {
    const mem = allMembers.find(m =>
      m.name === d.member_name ||
      m.name.replace(/\s/g,'') === d.member_name.replace(/\s/g,'')
    );
    return { ...d, matched: !!mem, member_id: mem?.id || null };
  });

  const matchedCnt   = matched.filter(m=>m.matched).length;
  const unmatchedCnt = matched.filter(m=>!m.matched).length;

  prev.innerHTML = `
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px">
        <div>
          <div class="card-title" style="margin:0">파싱 결과</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:4px">
            기간: ${periodStart||'?'} ~ ${periodEnd||'?'} &nbsp;·&nbsp;
            <span class="match-ok">매칭 ${matchedCnt}명</span>
            ${unmatchedCnt ? ` &nbsp;·&nbsp; <span class="match-no">미매칭 ${unmatchedCnt}명</span>` : ''}
          </div>
        </div>
        <button class="btn btn-primary" id="confirmImport" ${!periodStart?'disabled':''}>
          ${periodStart ? `${periodLabel(periodStart)} 데이터 가져오기` : '기간 인식 실패'}
        </button>
      </div>
      <div class="preview-table-wrap">
        <table class="preview-table">
          <thead><tr>
            <th>이름</th><th>매칭</th><th>출석</th><th>결석</th><th>준T1</th><th>준T2</th>
            <th>받은T1</th><th>1:1</th><th>감사장</th><th>CEU</th><th>점수(예상)</th>
          </tr></thead>
          <tbody>
            ${matched.map(m => {
              const { score, light } = calcScore(m);
              const li = { green:'🟢', yellow:'🟡', red:'🔴' }[light];
              return `<tr class="${m.matched?'':'unmatched'}">
                <td><strong>${m.member_name}</strong></td>
                <td class="${m.matched?'match-ok':'match-no'}">${m.matched?'✓ 매칭':'✗ 없음'}</td>
                <td>${m.attendance}</td><td>${m.absence}</td>
                <td>${m.given_t1}</td><td>${m.given_t2}</td><td>${m.received_t1}</td>
                <td>${m.one_on_one}</td><td>${m.tyfcb?.toLocaleString()}</td><td>${m.ceu}</td>
                <td>${li} ${score}점</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('confirmImport')?.addEventListener('click', async () => {
    await importRecords(matched, periodStart, periodEnd);
  });
}

async function importRecords(matched, periodStart, periodEnd) {
  const btn = document.getElementById('confirmImport');
  if (btn) { btn.disabled = true; btn.textContent = '가져오는 중...'; }

  const rows = matched.map(m => {
    const { score, light } = calcScore(m);
    return {
      member_id: m.member_id,
      member_name: m.member_name,
      period_start: periodStart,
      period_end: periodEnd || periodStart,
      attendance: m.attendance, absence: m.absence, late_leave: m.late_leave,
      sick_leave: m.sick_leave, substitute: m.substitute,
      given_t1: m.given_t1, given_t2: m.given_t2,
      received_t1: m.received_t1, received_t2: m.received_t2,
      visitors: m.visitors, one_on_one: m.one_on_one,
      tyfcb: m.tyfcb, ceu: m.ceu,
      score, light, is_manual: false,
    };
  });

  const { error } = await getSb().from('palms_records').upsert(rows, { onConflict: 'member_name,period_start' });
  if (error) { alert('가져오기 실패: ' + error.message); if (btn) { btn.disabled=false; btn.textContent='다시 시도'; } return; }

  showToast(`${rows.length}명 데이터 가져오기 완료`);
  currentPeriod = periodStart;
  await loadAll();
  renderOverview();

  // 전체현황 탭으로 이동
  document.querySelectorAll('.tl-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tl-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('.tl-tab[data-tab="overview"]').classList.add('active');
  document.getElementById('tl-overview').classList.add('active');
}

/* ════════════════════════════════════════
   탭 4: 점수 설정
════════════════════════════════════════ */
function renderConfig() {
  const el = document.getElementById('tl-config');
  const c  = scoreConfig;
  el.innerHTML = `
    <div class="card">
      <div class="card-title">점수 기준 설정</div>
      <p style="font-size:12px;color:#9ca3af;margin-bottom:16px">각 항목의 가중치 합계는 100이 되어야 합니다. 목표치 미달 시 비례 감점.</p>

      <div class="config-row" style="font-size:11px;font-weight:700;color:#9ca3af;border-bottom:2px solid var(--border)">
        <span>항목</span><span style="text-align:center">목표치</span><span style="text-align:center">가중치(%)</span>
      </div>
      ${[
        { label:'출석률',      sub:'출석/(출석+결석+지각) %',    fTarget:'attend_target',   unit:'%',  fWeight:'attend_weight'   },
        { label:'리퍼럴(준)',  sub:'준T1+T2 건수/월',            fTarget:'referral_target', unit:'건', fWeight:'referral_weight' },
        { label:'감사장 금액', sub:'만원/월',                    fTarget:'tyfcb_target',    unit:'만', fWeight:'tyfcb_weight'    },
        { label:'1:1 횟수',   sub:'회/월',                      fTarget:'ono_target',      unit:'회', fWeight:'ono_weight'      },
        { label:'CEU',         sub:'점/월',                      fTarget:'ceu_target',      unit:'점', fWeight:'ceu_weight'      },
      ].map(row => `
        <div class="config-row">
          <div><div class="config-label">${row.label}</div><div class="config-sub">${row.sub}</div></div>
          <div style="text-align:center">
            <input class="config-input" type="number" id="cfg-${row.fTarget}" value="${c[row.fTarget]}" min="0" style="width:80px">
            <span style="font-size:11px;color:#9ca3af"> ${row.unit}</span>
          </div>
          <div style="text-align:center">
            <input class="config-input" type="number" id="cfg-${row.fWeight}" value="${c[row.fWeight]}" min="0" max="100" style="width:60px">
            <span style="font-size:11px;color:#9ca3af"> %</span>
          </div>
        </div>`).join('')}

      <div class="config-row">
        <div><div class="config-label">🟢 Green 기준</div><div class="config-sub">이상 점수</div></div>
        <div style="text-align:center">
          <input class="config-input" type="number" id="cfg-green_min" value="${c.green_min}" min="0" max="100" style="width:80px"> 점
        </div>
        <div></div>
      </div>
      <div class="config-row">
        <div><div class="config-label">🟡 Yellow 기준</div><div class="config-sub">이상 점수</div></div>
        <div style="text-align:center">
          <input class="config-input" type="number" id="cfg-yellow_min" value="${c.yellow_min}" min="0" max="100" style="width:80px"> 점
        </div>
        <div></div>
      </div>

      <div style="margin-top:16px;display:flex;gap:10px">
        <button class="btn btn-primary" id="saveConfig">설정 저장</button>
        <div id="configMsg" style="font-size:12px;color:#16a34a;line-height:36px"></div>
      </div>
    </div>
  `;

  document.getElementById('saveConfig').addEventListener('click', async () => {
    const patch = {};
    ['attend_target','attend_weight','referral_target','referral_weight',
     'tyfcb_target','tyfcb_weight','ono_target','ono_weight',
     'ceu_target','ceu_weight','green_min','yellow_min'].forEach(k => {
      const el2 = document.getElementById('cfg-'+k);
      if (el2) patch[k] = Number(el2.value) || 0;
    });
    const total = patch.attend_weight + patch.referral_weight + patch.tyfcb_weight + patch.ono_weight + patch.ceu_weight;
    if (total !== 100) { document.getElementById('configMsg').textContent = `⚠️ 가중치 합계 ${total}% (100이어야 함)`; document.getElementById('configMsg').style.color='#CC0000'; return; }

    const { error } = await getSb().from('palms_score_config').upsert({ id:1, ...patch });
    if (error) { alert('저장 실패: '+error.message); return; }
    Object.assign(scoreConfig, patch);
    document.getElementById('configMsg').textContent = '✓ 저장되었습니다';
    document.getElementById('configMsg').style.color = '#16a34a';
  });
}

/* ════════════════════════════════════════
   AI 디렉터
════════════════════════════════════════ */
function genAIOverview(scored, periods) {
  if (!scored.length) return [];
  const total  = scored.length;
  const green  = scored.filter(r=>r.light==='green').length;
  const yellow = scored.filter(r=>r.light==='yellow').length;
  const red    = scored.filter(r=>r.light==='red').length;
  const health = Math.round((green*100+yellow*50)/total);
  const tips   = [];

  if (health >= 80) tips.push({ type:'positive', icon:'✅', text:`챕터 건강 점수 ${health}점 — Green 멤버 ${green}명(${Math.round(green/total*100)}%)이 기준을 충족하고 있습니다.` });
  else if (health >= 60) tips.push({ type:'warning', icon:'⚠️', text:`챕터 건강 점수 ${health}점 — Yellow/Red 멤버 집중 면담이 필요합니다.` });
  else tips.push({ type:'critical', icon:'🚨', text:`챕터 건강 점수 ${health}점으로 위험 수준입니다. 멤버십위원회의 즉각 개입이 필요합니다.` });

  if (red > 0) {
    const redNames = scored.filter(r=>r.light==='red').sort((a,b)=>a.score-b.score).slice(0,3).map(r=>r.member_name);
    tips.push({ type:'action', icon:'👉', text:`🔴 Red 멤버 ${red}명 — 즉시 면담 권장: ${redNames.join(', ')}${red>3?' 외':''}.` });
  }

  const avgScore = Math.round(scored.reduce((s,r)=>s+r.score,0)/total);
  const weakRef  = scored.filter(r=>(r.given_t1||0)+(r.given_t2||0)===0);
  if (weakRef.length > total*0.3)
    tips.push({ type:'warning', icon:'⚠️', text:`리퍼럴 0건 멤버 ${weakRef.length}명(${Math.round(weakRef.length/total*100)}%) — 리퍼럴 교육 및 1:1 코칭을 권장합니다.` });

  const topMem = [...scored].sort((a,b)=>b.score-a.score)[0];
  if (topMem) tips.push({ type:'positive', icon:'🏆', text:`이달 MVP: ${topMem.member_name}님 (${topMem.score}점) — 미팅에서 공개 표창으로 챕터 문화를 강화하세요.` });

  return tips;
}

function genAIMember(name, recs, avg) {
  if (!recs.length) return [{ type:'warning', icon:'⚠️', text:'아직 데이터가 없습니다. PALMS 파일을 가져오면 자동 분석됩니다.' }];
  const latest = recs[recs.length - 1];
  const { score, light } = calcScore(latest);
  const tips = [];

  const lightMsg = { green:`Green — 모든 기준을 충족하고 있습니다.`, yellow:`Yellow — 일부 항목 개선이 필요합니다.`, red:`Red — 여러 항목이 기준 미달입니다. 면담이 필요합니다.` };
  tips.push({ type: light==='green'?'positive':light==='yellow'?'warning':'critical', icon: {green:'✅',yellow:'⚠️',red:'🚨'}[light], text: `현재 점수 ${score}점 · ${lightMsg[light]}` });

  // 약점 분석
  const cfg = scoreConfig;
  const totalMtg = (latest.attendance||0)+(latest.absence||0)+(latest.late_leave||0);
  const attendPct = totalMtg > 0 ? Math.round(latest.attendance/totalMtg*100) : 0;
  if (attendPct < cfg.attend_target) tips.push({ type:'action', icon:'👉', text:`출석률 ${attendPct}% (목표 ${cfg.attend_target}%) — 미달입니다. 병가/대리인 제도를 적극 활용하세요.` });

  const refs = (latest.given_t1||0)+(latest.given_t2||0);
  if (refs < cfg.referral_target) tips.push({ type:'action', icon:'👉', text:`리퍼럴 ${refs}건 (목표 ${cfg.referral_target}건) — 1:1 미팅에서 구체적인 도움 요청을 늘려보세요.` });

  const tyfcbWan = Math.round((latest.tyfcb||0)/10000);
  if (tyfcbWan < cfg.tyfcb_target) tips.push({ type:'action', icon:'👉', text:`감사장 금액 ${tyfcbWan}만원 (목표 ${cfg.tyfcb_target}만원) — 받은 리퍼럴 성사 후 감사장 입력을 잊지 마세요.` });

  if ((latest.one_on_one||0) < cfg.ono_target) tips.push({ type:'action', icon:'👉', text:`1:1 ${latest.one_on_one||0}회 (목표 ${cfg.ono_target}회) — 매주 1회 1:1 미팅을 목표로 하세요.` });

  // 추세
  if (recs.length >= 2) {
    const prev = calcScore(recs[recs.length-2]).score;
    const diff = score - prev;
    if (diff > 5)  tips.push({ type:'positive', icon:'📈', text:`지난달 대비 ${diff}점 향상! 좋은 흐름을 유지하세요.` });
    if (diff < -5) tips.push({ type:'warning',  icon:'📉', text:`지난달 대비 ${Math.abs(diff)}점 하락. 어떤 항목이 줄었는지 확인하세요.` });
  }

  return tips;
}

/* ── Helpers ── */
function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#1a1f2e;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:999;opacity:0;transition:opacity .3s';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(()=>{ t.style.opacity='1'; setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),300); },2000); });
}
window.showMemberDetail = showMemberDetail;
