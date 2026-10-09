/* STAR 웰스 파트너스 — 랜딩 */

const EXPERTS = [
  { id: 'yijerin', name: '이재린', role: '해외자산 · 달러 분산', firm: '브릿지자산관리',
    desc: '14년 경력의 투자·자산관리 전문가. 해외보험과 해외투자로 원화에 치우친 자산을 나눕니다.',
    photo: 'images/experts/yijerin.jpg', phone: '010-3127-6765', kakao: 'https://open.kakao.com/me/yijerin' },
  { id: 'leemj', name: '이명재', role: '상속 · 증여 · 가업승계 세무', firm: '세무법인 건율',
    desc: '증여와 상속, 가업승계에서 생기는 세금을 미리 설계합니다.',
    photo: '', phone: '010-3264-9026', kakao: 'https://open.kakao.com/o/shEa7Hpi' },
  { id: 'kangjh', name: '강종현', role: '상속 분쟁 · 자산 보호 법률', firm: '법무법인 청목',
    desc: '변호사. 상속과 승계 과정의 분쟁을 예방하고, 분쟁이 생기면 대응합니다.',
    photo: '', phone: '010-9178-5274', kakao: '' },
  { id: 'jungyj', name: '정영준', role: '은퇴 · 상속 재원 설계', firm: '와이즈앤밸류',
    desc: '생명보험과 재무설계로 은퇴 이후의 현금 흐름과 상속세 납부 재원을 준비합니다.',
    photo: 'images/experts/jungyj.jpg', phone: '010-2599-1901', kakao: 'https://open.kakao.com/o/sVdeyYli' },
  { id: 'nasy', name: '나성연', role: '법인 · 사업체 리스크', firm: 'KB손해보험',
    desc: '배상책임과 화재 등 사업체가 안고 있는 위험을 점검하고 보장을 설계합니다.',
    photo: 'images/experts/nasy.jpg', phone: '010-8245-5258', kakao: 'https://open.kakao.com/o/seO0n8ei' },
  { id: 'sonmi', name: '손미', role: '수익형 건물 매입', firm: '럭셔리 부동산',
    desc: '임대 수익이 나오는 건물과 꼬마빌딩의 매입을 처음부터 끝까지 함께합니다.',
    photo: 'images/experts/sonmi.jpg', phone: '010-8983-1005', kakao: '' },
];

const CONCERNS = [
  { topic: '상속 · 증여',   q: '자녀에게 언제, 어떻게 넘겨야 세금이 줄어들까요?',     who: ['이명재', '정영준'] },
  { topic: '가업승계',      q: '회사를 물려주려는데 지분과 세금이 걱정됩니다.',        who: ['이명재', '강종현'] },
  { topic: '해외자산 분산', q: '자산이 전부 원화와 국내 부동산에 묶여 있습니다.',      who: ['이재린'] },
  { topic: '건물 매입',     q: '임대 수익이 나오는 건물을 사고 싶습니다.',             who: ['손미', '이명재'] },
  { topic: '법인 리스크',   q: '사고나 소송 한 번에 회사가 흔들릴까 걱정됩니다.',      who: ['나성연', '강종현'] },
  { topic: '은퇴 · 노후',   q: '은퇴 후에도 지금의 생활을 유지하고 싶습니다.',         who: ['정영준', '이재린'] },
];

const $ = id => document.getElementById(id);
const selectedTopics = new Set();

function renderConcerns() {
  $('concernGrid').innerHTML = CONCERNS.map((c, i) => `
    <button type="button" class="concern" data-i="${i}">
      <span class="concern-topic">${c.topic}</span>
      <span class="concern-q">${c.q}</span>
      <span class="concern-who"><span>${c.who.join(' · ')}</span><span>상담하기 →</span></span>
    </button>`).join('');
  $('concernGrid').addEventListener('click', e => {
    const btn = e.target.closest('.concern');
    if (!btn) return;
    selectedTopics.add(CONCERNS[btn.dataset.i].topic);
    syncChips();
    goToForm();
  });
}

function renderExperts() {
  $('expertGrid').innerHTML = EXPERTS.map(x => `
    <article class="expert">
      ${x.photo
        ? `<img class="expert-photo" src="${x.photo}" alt="${x.name}" width="104" height="130" loading="lazy">`
        : `<div class="expert-mono" aria-hidden="true">${x.name[0]}</div>`}
      <div class="expert-body">
        <p class="expert-role">${x.role}</p>
        <h3 class="expert-name">${x.name}</h3>
        <p class="expert-firm">${x.firm}</p>
        <p class="expert-desc">${x.desc}</p>
        <div class="expert-actions">
          <a class="btn btn-line btn-sm" href="tel:${x.phone}">전화</a>
          ${x.kakao ? `<a class="btn btn-line btn-sm" href="${x.kakao}" target="_blank" rel="noopener">카카오톡</a>` : ''}
          <button type="button" class="btn btn-line btn-sm" data-expert="${x.name}">상담 신청</button>
        </div>
      </div>
    </article>`).join('');
  $('expertGrid').addEventListener('click', e => {
    const btn = e.target.closest('[data-expert]');
    if (!btn) return;
    $('expertSelect').value = btn.dataset.expert;
    goToForm();
  });
  $('expertSelect').insertAdjacentHTML('beforeend',
    EXPERTS.map(x => `<option value="${x.name}">${x.name} (${x.role})</option>`).join(''));
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
        expert: f.expert.value || null,
        message: f.message.value.trim() || null,
      }]);
      if (error) throw error;
      form.hidden = true;
      $('consultDone').hidden = false;
    } catch (err) {
      console.error('상담 신청 저장 실패', err);
      fail('접수 중 오류가 발생했습니다. 번거로우시겠지만 전화(010-3127-6765)로 문의해 주세요.');
    }
  });
}

renderConcerns();
renderExperts();
renderChips();
initForm();
