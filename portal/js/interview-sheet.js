/* 인터뷰 일정표 — 보기·출력용 (입력은 인터뷰 일정 메뉴에서) */
(async function () {
  const layout = renderPortalLayout({ title: '인터뷰 일정표' });
  if (!layout) return;
  const { session, bodyEl } = layout;
  if (!canAccessInterviews(session)) {
    bodyEl.innerHTML = `<div class="page-header"><div><h1>인터뷰 일정표</h1></div></div>
      <div class="empty-state"><div class="es-icon">🔒</div><p>인터뷰 일정은 의장단과 멤버십위원회만 볼 수 있습니다.</p></div>`;
    return;
  }
  bodyEl.innerHTML = `<div style="text-align:center;padding:48px;color:#9ca3af">불러오는 중...</div>`;
  const { data, error } = await getSb().from('member_interviews').select('*');
  if (error) { bodyEl.innerHTML = `<div class="empty-state"><p>불러오기 실패: ${error.message}</p></div>`; return; }

  const GUEST = { '박선주': '디렉터', '차규민': '앰버서더' };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // 인터뷰어·리뷰·멘토링 중 하나라도 입력된 사람만
  const rows = (data || []).filter(x => x.interviewer1 || x.interviewer2 || x.review_date || x.review_interviewer1 || x.review_interviewer2 || x.mentoring);
  const has = x => !!x.review_date;
  const byName = (a, b) => a.member_name.localeCompare(b.member_name, 'ko');
  const byRenew = (a, b) => (a.renewal_date || '9999').localeCompare(b.renewal_date || '9999');
  // 정렬 기준 — 인터뷰 일정(입력) 화면에서 고른 정렬을 그대로 이어받음
  const SORTS = {
    name:         { label: '이름순',   desc: '이름순', fn: byName },
    renewal_date: { label: '갱신일순', desc: '갱신일 빠른 순 → 이름순', fn: (a, b) => byRenew(a, b) || byName(a, b) },
    review_date:  { label: '리뷰일순', desc: '리뷰 일정 잡힌 순 → 갱신일 빠른 순',
      fn: (a, b) => (has(b) - has(a)) || (has(a) && has(b) ? a.review_date.localeCompare(b.review_date) : 0) || byRenew(a, b) || byName(a, b) },
  };
  let sortKey = 'name';
  try { const k = localStorage.getItem('ivSort'); if (SORTS[k]) sortKey = k; } catch {}

  const none = '<span class="none">—</span>';
  const d = s => s ? s.replace(/-/g, '.') : none;
  const ok = v => v ? ' <span class="ok">✓완료</span>' : '';
  const p = n => n ? `${esc(n)}${GUEST[n] ? `<small>${GUEST[n]}</small>` : ''}` : none;
  const mt = v => v === 'O' ? '<b class="mo">O</b>' : v === 'X' ? '<b class="mx">X</b>' : none;

  const cnt = {};
  const add = (n, k) => { if (!n) return; cnt[n] = cnt[n] || { r: 0, v: 0 }; cnt[n][k]++; };
  rows.forEach(x => { add(x.interviewer1, 'r'); add(x.interviewer2, 'r'); add(x.review_interviewer1, 'v'); add(x.review_interviewer2, 'v'); });
  const cl = Object.entries(cnt).map(([n, c]) => ({ n, ...c, t: c.r + c.v })).sort((a, b) => b.t - a.t || a.n.localeCompare(b.n, 'ko'));
  const nRev = rows.filter(has).length;
  const now = new Date();
  const today = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

  function render() {
  rows.sort(SORTS[sortKey].fn);
  // 갱신일순이면 갱신 인터뷰 칸을 앞으로, 6개월 리뷰는 오른쪽으로
  const renFirst = sortKey === 'renewal_date';
  const pair = (rev, ren) => renFirst ? ren + rev : rev + ren;
  bodyEl.innerHTML = `
    <div class="sh-bar no-print">
      <a href="/portal/interviews.html" class="btn btn-outline btn-sm">✏️ 입력하러 가기</a>
      <div class="sh-sort">정렬 ${Object.entries(SORTS).map(([k, v]) => `<button type="button" data-sort="${k}" class="${k === sortKey ? 'on' : ''}">${v.label}</button>`).join('')}</div>
      <button class="btn btn-primary btn-sm" id="printBtn">🖨️ 인쇄 / PDF 저장</button>
    </div>
    <div class="sh-paper">
      <h2>BNI STAR 인터뷰 일정</h2>
      <div class="sh-sub">${today} 기준 · 인터뷰어가 배정된 ${rows.length}명 (6개월 리뷰 예정 ${nRev}명) · ${SORTS[sortKey].desc}</div>
      <div class="sh-legend">${pair('<span class="l1">6개월 리뷰</span>', '<span class="l2">갱신 인터뷰</span>')}<span class="l3">멘토링(90일 리뷰)</span></div>
      <div class="sh-scroll"><table class="sh-table">
        <thead>
          <tr><th rowspan="2" class="h-base no">#</th><th rowspan="2" class="h-base name">인터뷰 대상</th>
            ${pair('<th colspan="3" class="h-rev">6개월 리뷰</th>', '<th colspan="3" class="h-ren">갱신 인터뷰</th>')}<th class="h-mt">멘토링</th></tr>
          <tr>${pair('<th class="s-rev">리뷰일</th><th class="s-rev">인터뷰어 1</th><th class="s-rev">인터뷰어 2</th>',
            '<th class="s-ren">갱신일</th><th class="s-ren">인터뷰어 1</th><th class="s-ren">인터뷰어 2</th>')}<th class="s-mt">90일 리뷰</th></tr>
        </thead>
        <tbody>${rows.map((x, i) => {
          const sep = sortKey === 'review_date' && i > 0 && has(rows[i - 1]) && !has(x);
          const rv = has(x) ? 'g-rev' : 'rev-off';
          return `<tr class="${sep ? 'sep' : ''}">
            <td class="no">${i + 1}</td><td class="name">${esc(x.member_name)}</td>
            ${pair(`<td class="${rv} date">${d(x.review_date)}${ok(x.review_done)}</td><td class="${rv}">${p(x.review_interviewer1)}</td><td class="${rv}">${p(x.review_interviewer2)}</td>`,
              `<td class="g-ren date">${d(x.renewal_date)}${ok(x.renewal_done)}</td><td class="g-ren">${p(x.interviewer1)}</td><td class="g-ren">${p(x.interviewer2)}</td>`)}
            <td class="g-mt">${mt(x.mentoring)}</td></tr>`;
        }).join('')}</tbody>
      </table></div>
      <div class="sh-sum"><b>인터뷰어 배정 횟수</b> (리뷰+갱신)&nbsp; ${cl.map(c => `<span class="sh-chip">${esc(c.n)}${GUEST[c.n] ? `<small>${GUEST[c.n]}</small>` : ''}<b>${c.t}</b> <small>리뷰${c.v}·갱신${c.r}</small></span>`).join('')}</div>
    </div>`;
  document.getElementById('printBtn').addEventListener('click', () => window.print());
  bodyEl.querySelectorAll('.sh-sort button').forEach(b => b.addEventListener('click', () => {
    sortKey = b.dataset.sort;
    try { localStorage.setItem('ivSort', sortKey); } catch {}
    render();
  }));
  }
  render();
})();
