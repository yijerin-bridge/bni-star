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
      <div><h1>인터뷰 일정</h1><p>갱신 인터뷰 · 6개월 리뷰(해당자만) — 입력하면 바로 저장됩니다</p></div>
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
  const byName = Object.fromEntries((iRes.data || []).map(r => [r.member_name, r]));
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dday = d => {
    if (!d) return '';
    const n = Math.round((new Date(d + 'T00:00:00') - today) / 86400000);
    const txt = n === 0 ? 'D-day' : n > 0 ? `D-${n}` : `D+${-n}`;
    return `<span class="iv-dday${n >= 0 && n <= 30 ? ' soon' : ''}">${txt}</span>`;
  };

  root.innerHTML = `
    <datalist id="ivMembers">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    <div class="iv-wrap">
      <table class="iv-table">
        <thead>
          <tr class="grp"><th></th><th colspan="3">갱신 인터뷰</th><th colspan="3" class="rv rv-start">6개월 리뷰 <span style="font-weight:400;color:#9ca3af">(해당자만)</span></th></tr>
          <tr><th>인터뷰 대상</th><th style="width:180px">갱신일자</th><th>인터뷰어 1</th><th>인터뷰어 2</th>
              <th class="rv rv-start" style="width:180px">리뷰 날짜</th><th class="rv">인터뷰어 1</th><th class="rv">인터뷰어 2</th></tr>
        </thead>
        <tbody>
          ${names.map(n => { const r = byName[n] || {}; return `
          <tr data-name="${esc(n)}">
            <td class="name">${esc(n)}</td>
            <td class="date" data-label="갱신일자"><div style="display:flex;align-items:center"><input type="date" data-f="renewal_date" value="${esc(r.renewal_date)}">${dday(r.renewal_date)}</div></td>
            <td data-label="갱신 인터뷰어 1"><input type="text" data-f="interviewer1" list="ivMembers" placeholder="이름" value="${esc(r.interviewer1)}"></td>
            <td data-label="갱신 인터뷰어 2"><input type="text" data-f="interviewer2" list="ivMembers" placeholder="이름" value="${esc(r.interviewer2)}"></td>
            <td class="date rv rv-start" data-label="6개월 리뷰 날짜 (해당자만)"><div style="display:flex;align-items:center"><input type="date" data-f="review_date" value="${esc(r.review_date)}">${dday(r.review_date)}</div></td>
            <td class="rv" data-label="리뷰 인터뷰어 1"><input type="text" data-f="review_interviewer1" list="ivMembers" placeholder="이름" value="${esc(r.review_interviewer1)}"></td>
            <td class="rv" data-label="리뷰 인터뷰어 2"><input type="text" data-f="review_interviewer2" list="ivMembers" placeholder="이름" value="${esc(r.review_interviewer2)}"></td>
          </tr>`; }).join('')}
        </tbody>
      </table>
    </div>
    <p class="iv-note">인터뷰어 칸은 멤버 이름이 자동완성되며, 외부 인원도 직접 적을 수 있습니다. 날짜가 30일 이내로 다가오면 빨간색으로 표시됩니다. 6개월 리뷰를 하지 않는 멤버는 비워두면 됩니다.</p>`;

  root.querySelectorAll('.iv-table input').forEach(inp => {
    inp.addEventListener('change', async () => {
      const tr = inp.closest('tr');
      const row = { member_name: tr.dataset.name, updated_at: new Date().toISOString() };
      tr.querySelectorAll('input').forEach(i => { row[i.dataset.f] = i.value.trim() || null; });
      inp.classList.remove('saved', 'err');
      const { error } = await getSb().from('member_interviews').upsert(row, { onConflict: 'member_name' });
      if (error) { console.error(error); inp.classList.add('err'); alert('저장 실패: ' + error.message); return; }
      inp.classList.add('saved');
      setTimeout(() => inp.classList.remove('saved'), 1200);
      if (inp.type === 'date') {
        const old = inp.parentElement.querySelector('.iv-dday'); if (old) old.remove();
        inp.insertAdjacentHTML('afterend', dday(row[inp.dataset.f]));
      }
    });
  });
})();
