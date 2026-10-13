/* 감사콜 — 포털 전체 현황 화면 */
(async function () {
  const layout = renderPortalLayout({ title: '감사콜' });
  if (!layout) return;
  const { bodyEl } = layout;
  const formUrl = `${location.origin}/portal/thanks-call-form.html`;

  bodyEl.innerHTML = `
    <div class="page-header">
      <div><h1>감사콜</h1><p>감사콜 캠페인 30주 기록 · 2026.08.31 ~ 2027.03.28</p></div>
    </div>
    <div id="tcRoot"><div style="text-align:center;padding:48px;color:#9ca3af">불러오는 중...</div></div>`;
  const root = document.getElementById('tcRoot');

  const [mRes, cRes] = await Promise.all([
    getSb().from('members').select('name').eq('is_active', true).order('name'),
    getSb().from('thanks_calls').select('*'),
  ]);
  let names = (mRes.data || []).map(m => m.name);
  if (!names.length) names = MEMBERS_DEFAULT.map(m => m.name).sort((a, b) => a.localeCompare(b, 'ko'));

  const linkBar = `
    <div class="tc-linkbar">
      <span style="font-size:13px;font-weight:700">📞 멤버 기록 링크</span>
      <code>${formUrl}</code>
      <button class="btn btn-primary btn-sm" id="tcCopy">🔗 링크 복사</button>
      <a class="btn btn-outline btn-sm" href="${formUrl}" target="_blank" rel="noopener">열기</a>
    </div>`;

  if (cRes.error) {
    console.error('감사콜 불러오기 실패', cRes.error);
    root.innerHTML = `<div class="tc-notice"><b>감사콜 기록을 불러오지 못했습니다.</b><br>저장 테이블이 아직 없으면 Supabase SQL Editor에서 <code>portal/thanks-call-schema.sql</code>을 한 번 실행해 주세요.<br><span style="font-size:12px">(${tcEsc(cRes.error.message)})</span></div>` + linkBar;
    bindCopy();
    return;
  }

  const calls = cRes.data || [];
  const today = tcToday(), cur = tcCurrentWeek(today);
  const byMember = {};
  calls.forEach(r => (byMember[r.member_name] ||= []).push(r));
  // 멤버 명단에 없는 이름으로 남은 기록(탈퇴 등)도 빠뜨리지 않고 표시
  Object.keys(byMember).forEach(n => { if (!names.includes(n)) names.push(n); });

  const stats = names.map(n => ({ name: n, rows: byMember[n] || [], p: tcProgress(byMember[n] || [], today) }));
  const lastCol = Math.min(Math.max(cur, 1) > TC_MID_WEEKS ? TC_TOTAL_WEEKS : TC_MID_WEEKS, TC_TOTAL_WEEKS);
  const cols = TC_WEEKS.filter(w => w.no <= lastCol);

  const sum = (f) => stats.reduce((s, x) => s + f(x.p), 0);
  const doneNow = stats.filter(x => x.p.doneThisWeek).length;

  const cell = (x, w) => {
    const rows = x.rows.filter(r => r.week_no === w.no).sort((a, b) => a.slot - b.slot);
    if (rows.length) {
      const tip = rows.map(r => `${r.call_date || '날짜 미입력'} · ${r.callee}${r.meeting ? ' · 만남 약속' : ''}${r.visitor ? ' · 비지터 초청' : ''}`).join('\n');
      const mark = rows.some(r => r.visitor) ? '🙋' : rows.some(r => r.meeting) ? '🤝' : rows.length > 1 ? rows.length : '✓';
      return `<span class="tc-cell ${rows.length >= w.slots ? 'done' : 'half'}" title="${tcEsc(tip)}">${mark}</span>`;
    }
    if (w.start > today) return `<span class="tc-cell future">·</span>`;
    if (w.no === cur)    return `<span class="tc-cell wait" title="이번 주 — 아직 기록 전">–</span>`;
    return `<span class="tc-cell miss" title="미기록">×</span>`;
  };

  const recent = [...calls].sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '')).slice(0, 30);

  root.innerHTML = `
    <div class="tc-sum">
      <div class="tc-sum-card"><div class="tc-sum-num">${cur ? 'W' + cur : '시작 전'}</div><div class="tc-sum-label">이번 주${cur ? ' · ' + TC_WEEKS[cur - 1].label + ' 시작' : ''}</div></div>
      <div class="tc-sum-card"><div class="tc-sum-num" style="color:#16a34a">${doneNow}<small> / ${names.length}명</small></div><div class="tc-sum-label">이번 주 기록 완료</div></div>
      <div class="tc-sum-card"><div class="tc-sum-num">${sum(p => p.calls)}<small> 통</small></div><div class="tc-sum-label">누적 감사콜</div></div>
      <div class="tc-sum-card"><div class="tc-sum-num">${sum(p => p.meetings)}<small> 건</small></div><div class="tc-sum-label">🤝 만남 약속</div></div>
      <div class="tc-sum-card"><div class="tc-sum-num">${sum(p => p.visitors)}<small> 건</small></div><div class="tc-sum-label">🙋 비지터 초청</div></div>
    </div>
    ${linkBar}
    <div class="tc-wrap">
      <table class="tc-table">
        <thead><tr>
          <th class="name">멤버</th>
          ${cols.map(w => `<th class="${w.no === cur ? 'cur' : ''}">W${w.no}<small>${w.label}</small></th>`).join('')}
          <th>기록 주</th><th>통화</th><th>만남</th><th>비지터</th>
        </tr></thead>
        <tbody>
          ${stats.map(x => `<tr>
            <td class="name"><a href="${formUrl}?m=${encodeURIComponent(x.name)}" target="_blank" rel="noopener" title="${tcEsc(x.name)} 기록 화면 열기">${tcEsc(x.name)}</a></td>
            ${cols.map(w => `<td>${cell(x, w)}</td>`).join('')}
            <td><b>${x.p.weeks}</b></td><td>${x.p.calls}</td><td>${x.p.meetings}</td><td>${x.p.visitors}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="tc-legend">
      <span><i class="tc-cell done">✓</i>기록</span><span><i class="tc-cell half">1</i>더블 위크 1통만</span>
      <span><i class="tc-cell miss">×</i>미기록</span><span><i class="tc-cell wait">–</i>이번 주 대기</span>
      <span>🤝 만남 약속 · 🙋 비지터 초청 · 칸에 마우스를 올리면 감사 드린 분이 보입니다</span>
    </div>
    <div class="card">
      <div class="card-title" style="margin-bottom:12px">최근 기록 ${recent.length ? `<span style="font-size:11px;font-weight:400;color:#9ca3af">· 최근 ${recent.length}건</span>` : ''}</div>
      ${recent.length ? `<div style="overflow-x:auto"><table class="tc-recent">
        <thead><tr><th>주차</th><th>멤버</th><th>통화 날짜</th><th>감사 드린 분</th><th>만남 약속</th><th>비지터 초청</th></tr></thead>
        <tbody>${recent.map(r => `<tr><td>W${r.week_no}</td><td><b>${tcEsc(r.member_name)}</b></td><td>${r.call_date || '—'}</td><td>${tcEsc(r.callee)}</td><td>${r.meeting ? '🤝' : ''}</td><td>${r.visitor ? '🙋' : ''}</td></tr>`).join('')}</tbody>
      </table></div>` : `<div class="empty-state"><div class="es-icon">📞</div><p>아직 기록이 없습니다. 위 링크를 멤버들에게 공유해 주세요.</p></div>`}
    </div>`;
  bindCopy();

  function bindCopy() {
    const btn = document.getElementById('tcCopy');
    btn?.addEventListener('click', () => {
      navigator.clipboard.writeText(formUrl).then(() => {
        btn.textContent = '✅ 복사됨'; setTimeout(() => { btn.textContent = '🔗 링크 복사'; }, 2000);
      }).catch(() => prompt('링크를 복사하세요:', formUrl));
    });
  }
})();
