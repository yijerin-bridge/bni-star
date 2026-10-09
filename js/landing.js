/* STAR 웰스 파트너스 — 랜딩 (전문가 개인 정보 비공개 버전) */

const FIELDS = [
  { role: '해외자산 · 달러 분산',          desc: '해외보험과 해외투자로 원화에 치우친 자산을 나눕니다.' },
  { role: '상속 · 증여 · 가업승계 세무',   desc: '증여와 상속, 가업승계에서 생기는 세금을 미리 설계합니다.' },
  { role: '상속 분쟁 · 자산 보호 법률',    desc: '변호사가 상속과 승계 과정의 분쟁을 예방하고, 분쟁이 생기면 대응합니다.' },
  { role: '은퇴 · 상속 재원 설계',         desc: '은퇴 이후의 현금 흐름과 상속세 납부 재원을 준비합니다.' },
  { role: '법인 · 사업체 리스크',          desc: '배상책임과 화재 등 사업체가 안고 있는 위험을 점검하고 보장을 설계합니다.' },
  { role: '수익형 건물 매입',              desc: '임대 수익이 나오는 건물과 꼬마빌딩의 매입을 처음부터 끝까지 함께합니다.' },
];

const CONCERNS = [
  { topic: '상속 · 증여',   q: '자녀에게 언제, 어떻게 넘겨야 세금이 줄어들까요?',     who: '세무 · 재원 설계' },
  { topic: '가업승계',      q: '회사를 물려주려는데 지분과 세금이 걱정됩니다.',        who: '세무 · 법률' },
  { topic: '해외자산 분산', q: '자산이 전부 원화와 국내 부동산에 묶여 있습니다.',      who: '해외자산' },
  { topic: '건물 매입',     q: '임대 수익이 나오는 건물을 사고 싶습니다.',             who: '부동산 · 세무' },
  { topic: '법인 리스크',   q: '사고나 소송 한 번에 회사가 흔들릴까 걱정됩니다.',      who: '리스크 · 법률' },
  { topic: '은퇴 · 노후',   q: '은퇴 후에도 지금의 생활을 유지하고 싶습니다.',         who: '은퇴 설계 · 해외자산' },
];

const $ = id => document.getElementById(id);
const selectedTopics = new Set();

function renderConcerns() {
  $('concernGrid').innerHTML = CONCERNS.map((c, i) => `
    <button type="button" class="concern" data-i="${i}">
      <span class="concern-topic">${c.topic}</span>
      <span class="concern-q">${c.q}</span>
      <span class="concern-who"><span>${c.who} 전문가</span><span>상담하기 →</span></span>
    </button>`).join('');
  $('concernGrid').addEventListener('click', e => {
    const btn = e.target.closest('.concern');
    if (!btn) return;
    selectedTopics.add(CONCERNS[btn.dataset.i].topic);
    syncChips();
    goToForm();
  });
}

function renderFields() {
  $('expertGrid').innerHTML = FIELDS.map((x, i) => `
    <article class="expert">
      <span class="expert-no">${String(i + 1).padStart(2, '0')}</span>
      <h3 class="expert-name">${x.role}</h3>
      <p class="expert-desc">${x.desc}</p>
    </article>`).join('');
}

function renderChips() {
  $('topicChips').innerHTML = CONCERNS.map(c =>
    `<button type="button" class="chip" aria-pressed="false" data-topic="${c.topic}">${c.topic}</button>`).join('');
  $('topicChips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const t = chip.dataset.topic;
    selectedTopics.has(t) ? selectedTopics.delete(t) : selectedTopics.add(t);
    syncChips();
  });
}

function syncChips() {
  document.querySelectorAll('#topicChips .chip').forEach(chip =>
    chip.setAttribute('aria-pressed', selectedTopics.has(chip.dataset.topic) ? 'true' : 'false'));
}

function goToForm() {
  $('consult').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => $('consultForm').elements.name.focus({ preventScroll: true }), 500);
}

function initForm() {
  const form = $('consultForm'), msg = $('formMsg'), btn = $('submitBtn');
  const fail = text => { msg.textContent = text; btn.disabled = false; btn.textContent = '상담 신청하기'; };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    msg.textContent = '';
    const f = form.elements;
    if (f.company.value) return; // 봇 차단
    const name = f.name.value.trim(), phone = f.phone.value.trim();
    if (!name) { fail('이름을 입력해 주세요.'); f.name.focus(); return; }
    if (phone.replace(/\D/g, '').length < 9) { fail('연락처를 정확히 입력해 주세요.'); f.phone.focus(); return; }
    if (!$('consentBox').checked) { fail('개인정보 수집·이용에 동의해 주세요.'); return; }

    btn.disabled = true; btn.textContent = '접수 중…';
    try {
      const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
      const { error } = await sb.from('consult_requests').insert([{
        name, phone,
        call_time: f.callTime.value.trim() || null,
        topics: [...selectedTopics].join(', ') || null,
        message: f.message.value.trim() || null,
      }]);
      if (error) throw error;
      form.hidden = true;
      $('consultDone').hidden = false;
    } catch (err) {
      console.error('상담 신청 저장 실패', err);
      fail('접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }
  });
}

renderConcerns();
renderFields();
renderChips();
initForm();
