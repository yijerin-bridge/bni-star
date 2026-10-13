/* 감사콜 — 멤버 개인 기록 화면 */
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
const $ = id => document.getElementById(id);
const LS_KEY = 'tc_member';
let me = '', myRows = [], openWeek = null, showBack = false;

function toast(text) {
  const t = $('toast'); t.textContent = text; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1800);
}
function showError(text) {
  $('errBox').innerHTML = text ? `<div class="notice">${tcEsc(text)}</div>` : '';
}

async function loadMembers() {
  let names = [];
  try {
    const { data } = await sb.from('members').select('name').eq('is_active', true).order('name');
    names = (data || []).map(m => m.name);
  } catch {}
  if (!names.length) names = MEMBERS_DEFAULT.map(m => m.name).sort((a, b) => a.localeCompare(b, 'ko'));
  const sel = $('memberSel');
  names.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; sel.appendChild(o); });

  const fromUrl = new URLSearchParams(location.search).get('m') || '';
  let saved = ''; try { saved = localStorage.getItem(LS_KEY) || ''; } catch {}
  const pick = [fromUrl, saved].find(n => n && names.includes(n));
  if (pick) { sel.value = pick; selectMember(pick); }
  sel.addEventListener('change', () => selectMember(sel.value));
}

async function selectMember(name) {
  me = name; openWeek = null;
  try { name ? localStorage.setItem(LS_KEY, name) : localStorage.removeItem(LS_KEY); } catch {}
  $('mine').hidden = !name; $('pickHint').hidden = !!name;
  showError('');
  if (name) await reload();
}

async function reload() {
  const { data, error } = await sb.from('thanks_calls').select('*').eq('member_name', me);
  if (error) {
    console.error('감사콜 불러오기 실패', error);
    showError('기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요. 계속되면 운영진에게 알려 주세요.');
    myRows = [];
  } else { myRows = data || []; }
  render();
}

function render() {
  const p = tcProgress(myRows);
  const elapsed = Math.min(p.cur, TC_TOTAL_WEEKS);
  $('stats').innerHTML = [
    [`${p.weeks}<small style="font-size:12px;color:#9ca3af;font-weight:500">/${elapsed}</small>`, '기록 주차'],
    [p.calls, '감사콜'], [p.meetings, '만남 약속'], [p.visitors, '비지터 초청'],
  ].map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');

  if (openWeek === null && p.cur > 0 && !p.doneThisWeek) openWeek = p.cur;

  const today = tcToday();
  const card = w => {
    const rows = myRows.filter(r => r.week_no === w.no).sort((a, b) => a.slot - b.slot);
    const future = w.start > today, cur = w.no === p.cur;
    let sum, cls = '';
    if (rows.length) sum = rows.map(r => tcEsc(r.callee)).join(', ');
    else if (future) { sum = '예정'; cls = 'todo'; }
    else if (cur) { sum = '이번 주 — 아직 기록 전'; cls = 'todo'; }
    else { sum = '미기록'; cls = 'miss'; }
    const need = w.slots, mark = rows.length >= need ? '✅' : rows.length ? `${rows.length}/${need}` : '';
    const marks = [rows.some(r => r.meeting) ? '🤝' : '', rows.some(r => r.visitor) ? '🙋' : ''].join('');
    return `
      <div class="wk ${cur ? 'cur' : ''} ${future ? 'future' : ''} ${openWeek === w.no ? 'open' : ''}" data-w="${w.no}">
        <button type="button" class="wk-head" ${future ? 'disabled' : ''}>
          <span class="wk-no">W${w.no}${w.slots > 1 ? ' ×2' : ''}</span>
          <span class="wk-date">${w.label}</span>
          <span class="wk-sum ${cls}">${sum}</span>
          <span class="wk-mark">${marks} ${mark}</span>
        </button>
        <div class="wk-body">${future ? '' : Array.from({ length: w.slots }, (_, i) => slotForm(w, i + 1, rows.find(r => r.slot === i + 1))).join('')}</div>
      </div>`;
  };
  const front = TC_WEEKS.filter(w => w.no <= TC_MID_WEEKS), back = TC_WEEKS.filter(w => w.no > TC_MID_WEEKS);
  const backOpen = showBack || p.cur > TC_MID_WEEKS;
  $('weeks').innerHTML =
    `<div class="sect">앞면 W1 ~ W16 · 2026.08.31 ~ 12.20 · W1은 더블 감사 위크(두 통)</div>` +
    front.map(card).join('') +
    `<div class="sect">뒷면 W17 ~ W30 · 2026.12.21 ~ 2027.03.28</div>` +
    (backOpen ? back.map(card).join('') : `<button type="button" class="more-btn" id="moreBtn">W17 ~ W30 보기</button>`);
}

function slotForm(w, slot, row) {
  const today = tcToday();
  const date = row?.call_date || (today >= w.start && today <= w.end ? today : '');
  return `
    <div class="slot" data-slot="${slot}">
      ${w.slots > 1 ? `<div class="slot-title">${slot}번째 통화</div>` : '<div style="height:10px"></div>'}
      <div class="row2">
        <input type="date" class="f-date" value="${date}" min="${w.start}" max="${w.end}" aria-label="통화 날짜">
        <input type="text" class="f-callee" value="${tcEsc(row?.callee || '')}" maxlength="40" placeholder="감사 드린 분 (성함)" aria-label="감사 드린 분">
      </div>
      <div class="checks">
        <label class="check"><input type="checkbox" class="f-meeting" ${row?.meeting ? 'checked' : ''}>만남 약속</label>
        <label class="check"><input type="checkbox" class="f-visitor" ${row?.visitor ? 'checked' : ''}>비지터 초청</label>
      </div>
      <div class="actions">
        <button type="button" class="btn act-save">${row ? '수정 저장' : '기록하기'}</button>
        ${row ? '<button type="button" class="btn btn-del act-del">삭제</button>' : ''}
      </div>
    </div>`;
}

$('weeks').addEventListener('click', async e => {
  if (e.target.id === 'moreBtn') { showBack = true; render(); return; }
  const wk = e.target.closest('.wk'); if (!wk) return;
  const weekNo = Number(wk.dataset.w);

  if (e.target.closest('.wk-head')) {
    if (wk.classList.contains('future')) return;
    openWeek = openWeek === weekNo ? 0 : weekNo; render(); return;
  }
  const slotEl = e.target.closest('.slot'); if (!slotEl) return;
  const slot = Number(slotEl.dataset.slot);
  const btn = e.target.closest('button'); if (!btn) return;

  if (btn.classList.contains('act-save')) {
    const callee = slotEl.querySelector('.f-callee').value.trim();
    if (!callee) { toast('감사 드린 분 성함을 입력해 주세요'); slotEl.querySelector('.f-callee').focus(); return; }
    btn.disabled = true;
    const { error } = await sb.from('thanks_calls').upsert({
      member_name: me, week_no: weekNo, slot, callee,
      call_date: slotEl.querySelector('.f-date').value || null,
      meeting: slotEl.querySelector('.f-meeting').checked,
      visitor: slotEl.querySelector('.f-visitor').checked,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'member_name,week_no,slot' });
    if (error) { console.error(error); btn.disabled = false; toast('저장하지 못했습니다. 다시 시도해 주세요'); return; }
    const w = TC_WEEKS[weekNo - 1];
    const saved = myRows.filter(r => r.week_no === weekNo && r.slot !== slot).length + 1;
    openWeek = saved >= w.slots ? 0 : weekNo;   // 더블 위크는 두 통 다 적을 때까지 열어 둠
    toast('감사콜 했습니다! 기록되었습니다');
    await reload();
  }
  if (btn.classList.contains('act-del')) {
    if (!confirm(`W${weekNo} 기록을 삭제할까요?`)) return;
    btn.disabled = true;
    const { error } = await sb.from('thanks_calls').delete().eq('member_name', me).eq('week_no', weekNo).eq('slot', slot);
    if (error) { console.error(error); btn.disabled = false; toast('삭제하지 못했습니다'); return; }
    toast('삭제되었습니다');
    await reload();
  }
});

loadMembers();
