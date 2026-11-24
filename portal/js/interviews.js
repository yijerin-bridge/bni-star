/* 멤버 인터뷰(갱신·6개월 리뷰) 일정 */
(async function () {
  const layout = renderPortalLayout({ title: '인터뷰 일정' });
  if (!layout) return;
  const { session, bodyEl } = layout;
  if (!canAccessInterviews(session)) {
    bodyEl.innerHTML = `
      <div class="page-header"><div><h1>인터뷰 일정</h1></div></div>
      <div class="empty-state"><div class="es-icon">🔒</div>
        <p>인터뷰 일정은 의장단과 멤버십위원회만 볼 수 있습니다.</p></div>`;
    return;
  }

  bodyEl.innerHTML = `
    <div class="page-header">
      <div><h1>인터뷰 일정</h1><p>갱신 인터뷰 · 6개월 리뷰(해당자만) · 멘토링(90일 리뷰) — 입력하면 바로 저장됩니다</p></div>
      <a href="/portal/interview-sheet.html" class="btn btn-outline btn-sm">🖨️ 일정표 보기 · 출력</a>
    </div>
    <div id="ivRoot"><div style="text-align:center;padding:48px;color:#9ca3af">불러오는 중...</div></div>`;
  const root = document.getElementById('ivRoot');

  const [mRes, iRes] = await Promise.all([
    getSb().from('members').select('name').eq('is_active', true).order('name'),
    getSb().from('member_interviews').select('*'),
  ]);
  if (iRes.error) {
    console.error('인터뷰 불러오기 실패', iRes.error);
    root.innerHTML = `<div class="iv-notice">인터뷰 저장 테이블이 아직 없습니다. <b>portal/interviews-schema.sql</b>을 Supabase SQL Editor에서 실행해 주세요.</div>`;
    return;
  }
  const names = (mRes.data || []).map(m => m.name);
  // 멘토링 칸은 interviews-schema-v3.sql 실행 후 사용 가능
  const hasMent = !(iRes.data || []).length || 'mentoring' in iRes.data[0];
  // 완료 체크는 interviews-schema-v4.sql 실행 후 사용 가능
  const hasDone = !(iRes.data || []).length || 'renewal_done' in iRes.data[0];
  const doneBox = (f, on, label) => `<td class="done${f === 'review_done' ? ' rv' : ''}" data-label="${label}"><label class="iv-done"><input type="checkbox" data-f="${f}"${on ? ' checked' : ''}${hasDone ? '' : ' disabled title="SQL 실행 필요"'}><span>완료</span></label></td>`;
  const byName = Object.fromEntries((iRes.data || []).map(r => [r.member_name, r]));
  // 멤버는 아니지만 인터뷰어로 참여하는 분
  const GUESTS = [{ name: '박선주', label: '디렉터' }, { name: '차규민', label: '앰버서더' }];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dday = (d, done) => {
    if (done) return '<span class="iv-dday ok">✓ 완료</span>';
    if (!d) return '';
    const n = Math.round((new Date(d + 'T00:00:00') - today) / 86400000);
    const txt = n === 0 ? 'D-day' : n > 0 ? `D-${n}` : `D+${-n}`;
    return `<span class="iv-dday${n >= 0 && n <= 30 ? ' soon' : ''}">${txt}</span>`;
  };

  root.innerHTML = `
    <datalist id="ivMembers">${GUESTS.map(g => `<option value="${esc(g.name)}" label="${esc(g.label)}">`).join('')}${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    <div class="iv-count" id="ivCount"></div>
    <div class="iv-sort">정렬
      <button type="button" data-sort="name" class="on">이름순</button>
      <button type="button" data-sort="renewal_date">갱신일순</button>
      <button type="button" data-sort="review_date">리뷰일순</button>
    </div>
    <div class="iv-wrap">
      <table class="iv-table">
        <thead>
          <tr class="grp"><th></th><th colspan="4">갱신 인터뷰</th><th colspan="4" class="rv rv-start">6개월 리뷰 <span style="font-weight:400;color:#9ca3af">(해당자만)</span></th><th class="mt">멘토링</th></tr>
          <tr><th>인터뷰 대상</th><th style="width:180px">갱신일자</th><th>인터뷰어 1</th><th>인터뷰어 2</th><th style="width:70px">완료</th>
              <th class="rv rv-start" style="width:180px">리뷰 날짜</th><th class="rv">인터뷰어 1</th><th class="rv">인터뷰어 2</th><th class="rv" style="width:70px">완료</th><th class="mt" style="width:110px">90일 리뷰</th></tr>
        </thead>
        <tbody>
          ${names.map(n => { const r = byName[n] || {}; return `
          <tr data-name="${esc(n)}">
            <td class="name">${esc(n)}</td>
            <td class="date" data-label="갱신일자"><div style="display:flex;align-items:center"><input type="date" data-f="renewal_date" value="${esc(r.renewal_date)}">${dday(r.renewal_date, r.renewal_done)}</div></td>
            <td data-label="갱신 인터뷰어 1"><input type="text" data-f="interviewer1" list="ivMembers" placeholder="이름" value="${esc(r.interviewer1)}"></td>
            <td data-label="갱신 인터뷰어 2"><input type="text" data-f="interviewer2" list="ivMembers" placeholder="이름" value="${esc(r.interviewer2)}"></td>
            ${doneBox('renewal_done', r.renewal_done, '갱신 인터뷰 완료')}
            <td class="date rv rv-start" data-label="6개월 리뷰 날짜 (해당자만)"><div style="display:flex;align-items:center"><input type="date" data-f="review_date" value="${esc(r.review_date)}">${dday(r.review_date, r.review_done)}</div></td>
            <td class="rv" data-label="리뷰 인터뷰어 1"><input type="text" data-f="review_interviewer1" list="ivMembers" placeholder="이름" value="${esc(r.review_interviewer1)}"></td>
            <td class="rv" data-label="리뷰 인터뷰어 2"><input type="text" data-f="review_interviewer2" list="ivMembers" placeholder="이름" value="${esc(r.review_interviewer2)}"></td>
            ${doneBox('review_done', r.review_done, '리뷰 완료')}
            <td class="mt" data-label="멘토링 (90일 리뷰)"><select data-f="mentoring" class="ment-${esc(r.mentoring || 'none')}"${hasMent ? '' : ' disabled title="SQL 실행 필요"'}>
              <option value="">—</option><option value="O"${r.mentoring === 'O' ? ' selected' : ''}>O</option><option value="X"${r.mentoring === 'X' ? ' selected' : ''}>X</option></select></td>
          </tr>`; }).join('')}
        </tbody>
      </table>
    </div>
    ${hasDone ? '' : '<div class="iv-notice" style="margin-top:10px">완료 체크를 쓰려면 <b>portal/interviews-schema-v4.sql</b>을 Supabase SQL Editor에서 실행해 주세요.</div>'}
    ${hasMent ? '' : '<div class="iv-notice" style="margin-top:10px">멘토링 칸을 쓰려면 <b>portal/interviews-schema-v3.sql</b>을 Supabase SQL Editor에서 실행해 주세요.</div>'}
    <p class="iv-note">인터뷰어 칸은 멤버와 박선주 디렉터·차규민 앰버서더가 자동완성되며, 다른 분도 직접 적을 수 있습니다. 날짜가 30일 이내로 다가오면 빨간색으로 표시됩니다. 6개월 리뷰를 하지 않는 멤버는 비워두면 됩니다.</p>`;

  // 인터뷰어별 배정 횟수 (화면 입력값 기준, 적게 맡은 순)
  function renderCounts() {
    const cnt = {};
    [...GUESTS.map(g => g.name), ...names].forEach(n => { cnt[n] = { r: 0, v: 0 }; });
    root.querySelectorAll('.iv-table input[type=text]').forEach(i => {
      const n = i.value.trim(); if (!n) return;
      if (!cnt[n]) cnt[n] = { r: 0, v: 0 };
      cnt[n][i.dataset.f.startsWith('review_') ? 'v' : 'r']++;
    });
    const rows = Object.entries(cnt).map(([n, c]) => ({ n, ...c, t: c.r + c.v }))
      .sort((a, b) => a.t - b.t || a.n.localeCompare(b.n, 'ko'));
    const max = Math.max(0, ...rows.map(x => x.t));
    const guest = n => GUESTS.find(g => g.name === n);
    document.getElementById('ivCount').innerHTML = `
      <div class="iv-count-head"><b>인터뷰어 배정 횟수</b><span>적게 맡은 순 · 갱신 + 리뷰 합계 · 최다 ${max}회</span></div>
      <div class="iv-chips">${rows.map(x => `
        <span class="iv-chip${x.t === 0 ? ' zero' : x.t === max && max > 0 ? ' top' : ''}" title="갱신 ${x.r}회 · 리뷰 ${x.v}회">
          ${esc(x.n)}${guest(x.n) ? `<small>${esc(guest(x.n).label)}</small>` : ''} <b>${x.t}</b>
        </span>`).join('')}</div>`;
  }
  renderCounts();

  // 정렬: 날짜순은 빠른 날짜부터, 날짜 없는 멤버는 맨 아래 (버튼 누를 때만 다시 정렬)
  function sortRows(key) {
    const tbody = root.querySelector('.iv-table tbody');
    const val = tr => key === 'name' ? '' : (tr.querySelector(`input[data-f="${key}"]`).value || '9999');
    [...tbody.rows].sort((a, b) => val(a).localeCompare(val(b)) || a.dataset.name.localeCompare(b.dataset.name, 'ko'))
      .forEach(tr => tbody.appendChild(tr));
    root.querySelectorAll('.iv-sort button').forEach(b => b.classList.toggle('on', b.dataset.sort === key));
    try { localStorage.setItem('ivSort', key); } catch {}
  }
  root.querySelectorAll('.iv-sort button').forEach(b => b.addEventListener('click', () => sortRows(b.dataset.sort)));
  try { const k = localStorage.getItem('ivSort'); if (k && k !== 'name') sortRows(k); } catch {}

  root.querySelectorAll('.iv-table input, .iv-table select').forEach(inp => {
    inp.addEventListener('change', async () => {
      const tr = inp.closest('tr');
      const row = { member_name: tr.dataset.name, updated_at: new Date().toISOString() };
      tr.querySelectorAll('input:not([disabled]), select:not([disabled])').forEach(i => {
        row[i.dataset.f] = i.type === 'checkbox' ? i.checked : (i.value.trim() || null);
      });
      inp.classList.remove('saved', 'err');
      const { error } = await getSb().from('member_interviews').upsert(row, { onConflict: 'member_name' });
      if (error) { console.error(error); inp.classList.add('err'); alert('저장 실패: ' + error.message); return; }
      inp.classList.add('saved');
      if (inp.tagName === 'SELECT') inp.className = 'saved ment-' + (inp.value || 'none');
      renderCounts();
      setTimeout(() => inp.classList.remove('saved'), 1200);
      // 날짜나 완료 체크가 바뀌면 D-day 표시 갱신
      [['renewal_date', 'renewal_done'], ['review_date', 'review_done']].forEach(([df, cf]) => {
        if (inp.dataset.f !== df && inp.dataset.f !== cf) return;
        const di = tr.querySelector(`input[data-f="${df}"]`);
        const old = di.parentElement.querySelector('.iv-dday'); if (old) old.remove();
        di.insertAdjacentHTML('afterend', dday(row[df], row[cf]));
      });
    });
  });
})();
