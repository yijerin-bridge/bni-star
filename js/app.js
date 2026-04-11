/* ============================================================
   BNI STAR — App Logic
   ============================================================ */

// Member data is provided by members-data.js (loaded before this file)
let MEMBERS = loadMembers();

// ── Supabase Tracking ─────────────────────────────────────────
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// 레퍼럴 링크로 들어온 경우 방문 기록
(function () {
  const ref = new URLSearchParams(location.search).get('ref');
  if (ref) {
    sessionStorage.setItem('bni_ref', ref);
    sb.from('referral_visits').insert({ ref_member_id: parseInt(ref) }).then(() => {});
  }
})();

function copyAddress(addr, el) {
  if (!addr) return;
  navigator.clipboard.writeText(addr).then(() => {
    const label = el.querySelector('.c-label');
    label.textContent = '✓ 복사됨!';
    setTimeout(() => { label.textContent = '주소 (탭하면 복사)'; }, 1800);
  });
}

function trackContact(targetId, targetName, actionType) {
  const ref = sessionStorage.getItem('bni_ref');
  sb.from('contact_actions').insert({
    ref_member_id:      ref ? parseInt(ref) : null,
    target_member_id:   targetId,
    target_member_name: targetName,
    action_type:        actionType,
  }).then(() => {});
}

// ── State ────────────────────────────────────────────────────
let slide = 0;
let featured = [];
let carouselTimer = null;
let touchX0 = 0;

// ── DOM refs ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const track        = $('carouselTrack');
const dots         = $('carouselDots');
const catGrid      = $('categoryGrid');
const membersGrid  = $('membersGrid');
const memberCount  = $('memberCount');
const modalOverlay = $('modalOverlay');
const modalContent = $('modalContent');
const catView      = $('categoryView');
const catTitle     = $('categoryViewTitle');
const catCount     = $('categoryCount');
const catGrid2     = $('categoryMembersGrid');
const searchOvl    = $('searchOverlay');
const searchInput  = $('searchInput');
const searchRes    = $('searchResults');

// ── Helpers ──────────────────────────────────────────────────
function initial(name) { return name.charAt(0); }

function avatarHTML(member, size) {
  const bg = `background:${member.color}`;
  const st = `width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*.37)}px;font-weight:900;color:white;overflow:hidden;flex-shrink:0;`;
  if (member.photoUrl) {
    return `<div style="${st}${bg}"><img src="${member.photoUrl}" alt="${member.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"></div>`;
  }
  return `<div style="${st}${bg}">${initial(member.name)}</div>`;
}

// ── Carousel ─────────────────────────────────────────────────
function initCarousel() {
  featured = [...MEMBERS].sort(() => Math.random() - .5);

  track.innerHTML = featured.map(m => `
    <div class="carousel-slide" style="--c:${m.color}" data-id="${m.id}">
      <div class="slide-bg"></div>
      <div class="slide-left">
        <span class="slide-cat">${m.category}</span>
        <div class="slide-headline">${m.headline || m.specialty}</div>
        <div class="slide-name"><strong>${m.name}</strong> · ${m.specialty}</div>
        <button class="slide-btn" style="color:${m.color}" onclick="openModal(${m.id})">
          프로필 보기 →
        </button>
      </div>
      <div class="slide-right">
        <div class="slide-avatar" style="background:linear-gradient(145deg,${m.color},rgba(0,0,0,.4))">
          ${m.photoUrl
            ? `<img src="${m.photoUrl}" alt="${m.name}">`
            : `<div class="slide-avatar-placeholder">
                <span class="initial">${initial(m.name)}</span>
                <span class="cam">📷 사진</span>
               </div>`}
        </div>
      </div>
    </div>`).join('');

  dots.innerHTML = featured.map((_, i) =>
    `<div class="dot${i===0?' on':''}" onclick="gotoSlide(${i})"></div>`
  ).join('');

  startTimer();

  track.addEventListener('touchstart', e => { touchX0 = e.changedTouches[0].screenX; }, { passive: true });
  track.addEventListener('touchend',   e => {
    const dx = touchX0 - e.changedTouches[0].screenX;
    if (Math.abs(dx) > 48) { gotoSlide(dx > 0 ? slide+1 : slide-1); resetTimer(); }
  }, { passive: true });

}

function gotoSlide(n) {
  slide = ((n % featured.length) + featured.length) % featured.length;
  track.style.transform = `translateX(-${slide * 100}%)`;
  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('on', i === slide));
}
function startTimer() { carouselTimer = setInterval(() => gotoSlide(slide+1), 4200); }
function resetTimer()  { clearInterval(carouselTimer); startTimer(); }

// ── Category grid ─────────────────────────────────────────────
function renderCategories() {
  catGrid.innerHTML = CATEGORIES.map(c => {
    const n = MEMBERS.filter(m => m.category === c.name).length;
    return `
      <div class="cat-item" onclick="openCatView('${c.name}')">
        <div class="cat-icon" style="background:${c.color}18">${c.emoji}</div>
        <span class="cat-name">${c.name}</span>
        ${n ? `<span class="cat-badge" style="background:${c.color}">${n}</span>` : ''}
      </div>`;
  }).join('');
}

// ── Member cards ──────────────────────────────────────────────
function cardHTML(m) {
  return `
    <div class="member-card" style="--c:${m.color}" onclick="openModal(${m.id})">
      <div class="card-avatar" style="background:${m.color}">
        ${m.photoUrl ? `<img src="${m.photoUrl}" alt="${m.name}">` : initial(m.name)}
      </div>
      <div class="card-name">${m.name}</div>
      <div class="card-co">${m.company}</div>
      <span class="card-spec" style="background:${m.color}">${m.specialty}</span>
      <div class="card-target">👤 ${m.targetCustomer}</div>
    </div>`;
}

function renderMembers(list = MEMBERS, container = membersGrid) {
  container.innerHTML = list.map(cardHTML).join('');
  if (container === membersGrid) memberCount.textContent = `${list.length}명`;
}

// ── Category view ─────────────────────────────────────────────
function openCatView(name) {
  const c = CATEGORIES.find(x => x.name === name);
  const list = MEMBERS.filter(m => m.category === name);
  catTitle.textContent = `${c ? c.emoji+' ' : ''}${name}`;
  catCount.textContent = `${list.length}명`;
  renderMembers(list, catGrid2);
  catView.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCatView() {
  catView.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Member modal ──────────────────────────────────────────────
function openModal(id) {
  const m = MEMBERS.find(x => x.id === id);
  if (!m) return;
  const c = CATEGORIES.find(x => x.name === m.category);

  modalContent.innerHTML = `
    <div class="m-header">
      <div class="m-avatar" style="background:${m.color};border-color:${m.color}40">
        ${m.photoUrl
          ? `<img src="${m.photoUrl}" alt="${m.name}">`
          : `<span style="font-size:2.1rem;font-weight:900;color:white">${initial(m.name)}</span>`}
      </div>
      <span class="m-badge" style="background:${m.color}">${c ? c.emoji+' ' : ''}${m.category}</span>
      <div class="m-name">${m.name}</div>
      <div class="m-co">${m.company}</div>
      <div class="m-spec">${m.specialty}</div>
    </div>

    <div class="m-section">
      <div class="m-label">소개</div>
      <div class="m-desc">${m.description}</div>
    </div>

    <div class="m-section">
      <div class="m-label">이런 분께 추천드려요</div>
      <div class="m-target">🎯 ${m.targetCustomer}</div>
    </div>

    <div class="m-section">
      <div class="m-label">연락처</div>
      <div class="contact-list">
        ${m.phone ? `
        <a href="tel:${m.phone}" class="contact-row phone" onclick="trackContact(${m.id},'${m.name}','phone')">
          <div class="c-icon">📞</div>
          <div><span class="c-label">전화번호</span><span class="c-val">${m.phone}</span></div>
        </a>` : ''}
        ${m.email ? `
        <a href="mailto:${m.email}" class="contact-row email" onclick="trackContact(${m.id},'${m.name}','email')">
          <div class="c-icon">✉️</div>
          <div><span class="c-label">이메일</span><span class="c-val">${m.email}</span></div>
        </a>` : ''}
        ${m.address ? `
        <div class="contact-row addr" onclick="copyAddress('${m.address.replace(/'/g,"\\'")}', this)" style="cursor:pointer">
          <div class="c-icon">📍</div>
          <div><span class="c-label">주소 (탭하면 복사)</span><span class="c-val">${m.address}</span></div>
        </div>` : ''}
        ${m.kakao ? `
        <a href="${m.kakao}" class="contact-row kakao" target="_blank" rel="noopener" onclick="trackContact(${m.id},'${m.name}','kakao')">
          <div class="c-icon">💬</div>
          <div><span class="c-label">카카오톡</span><span class="c-val">${m.kakao}</span></div>
        </a>` : ''}
        ${m.instagram ? `
        <a href="https://instagram.com/${m.instagram}" class="contact-row insta" target="_blank" rel="noopener" onclick="trackContact(${m.id},'${m.name}','instagram')">
          <div class="c-icon">📷</div>
          <div><span class="c-label">인스타그램</span><span class="c-val">@${m.instagram}</span></div>
        </a>` : ''}
        ${m.website ? `
        <a href="https://${m.website}" class="contact-row web" target="_blank" rel="noopener" onclick="trackContact(${m.id},'${m.name}','website')">
          <div class="c-icon">🌐</div>
          <div><span class="c-label">웹사이트</span><span class="c-val">${m.website}</span></div>
        </a>` : ''}
      </div>
    </div>

    ${(m.testimonials && m.testimonials.length) ? `
    <div class="m-section">
      <div class="m-label">실제 성과 후기</div>
      <div class="m-testimonials-list">
        ${m.testimonials.map(t => `
        <div class="m-testimonial">
          <div class="m-t-badge">⭐ 실제 성과</div>
          ${t.metric ? `<div class="m-t-metric"><span>${t.metric}</span></div>` : ''}
          ${t.quote  ? `<div class="m-t-quote">"${t.quote}"</div>` : ''}
          ${t.author ? `
          <div class="m-t-author">
            <div class="m-t-author-dot"></div>
            <span class="m-t-author-name">후기 남긴 <strong>${t.author}</strong></span>
          </div>` : ''}
        </div>`).join('')}
      </div>
    </div>` : ''}

    <div class="m-ctas">
      <a href="tel:${m.phone}" class="m-cta prim" style="background:${m.color}" onclick="trackContact(${m.id},'${m.name}','phone')">📞 전화하기</a>
      ${m.kakao
        ? `<a href="${m.kakao}" class="m-cta sec" target="_blank" rel="noopener" onclick="trackContact(${m.id},'${m.name}','kakao')">💬 카카오톡</a>`
        : `<a href="mailto:${m.email}" class="m-cta sec" onclick="trackContact(${m.id},'${m.name}','email')">✉️ 이메일</a>`}
    </div>`;

  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Search ────────────────────────────────────────────────────
function openSearch() {
  searchOvl.classList.add('open');
  setTimeout(() => searchInput.focus(), 300);
}
function closeSearch() {
  searchOvl.classList.remove('open');
  searchInput.value = '';
  renderSearchResults('');
}
function renderSearchResults(q) {
  if (!q.trim()) {
    searchRes.innerHTML = `
      <div class="search-placeholder">
        <div class="search-placeholder-icon">🔍</div>
        <p>전문가 이름이나 전문분야를 검색해보세요</p>
      </div>`;
    return;
  }
  const ql = q.toLowerCase();
  const hits = MEMBERS.filter(m =>
    m.name.includes(q) ||
    m.specialty.toLowerCase().includes(ql) ||
    m.category.toLowerCase().includes(ql) ||
    m.company.toLowerCase().includes(ql) ||
    m.targetCustomer.toLowerCase().includes(ql) ||
    m.description.toLowerCase().includes(ql)
  );
  if (!hits.length) {
    searchRes.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">😅</div>
        <p>"${q}"에 대한 검색 결과가 없습니다</p>
      </div>`;
    return;
  }
  searchRes.innerHTML = hits.map(m => `
    <div class="search-item" onclick="pickSearch(${m.id})">
      <div class="s-avatar" style="background:${m.color}">
        ${m.photoUrl ? `<img src="${m.photoUrl}" alt="${m.name}">` : initial(m.name)}
      </div>
      <div>
        <div class="s-name">${m.name}</div>
        <div class="s-spec">${m.specialty} · ${m.category}</div>
      </div>
      <span class="s-arrow">›</span>
    </div>`).join('');
}
function pickSearch(id) {
  closeSearch();
  setTimeout(() => openModal(id), 280);
}

// ── Problem search ─────────────────────────────────────────────
const KEYWORD_MAP = [
  { keywords: ['세금','절세','법인세','소득세','세무','세무사','부가세','신고'], categories: ['법률/세무'] },
  { keywords: ['보험','대출','금융','자금','투자','은행','대부'], categories: ['금융/보험'] },
  { keywords: ['마케팅','광고','sns','홍보','브랜딩','유튜브','인스타'], categories: ['마케팅/광고'] },
  { keywords: ['법률','법적','계약','소송','분쟁','상표','특허','법'], categories: ['법률/세무'] },
  { keywords: ['부동산','아파트','상가','임대','토지','건물','인테리어'], categories: ['부동산/인테리어'] },
  { keywords: ['it','앱','소프트웨어','홈페이지','시스템','개발','디지털'], categories: ['IT/디지털'] },
  { keywords: ['차','자동차','리스','차량','렌트'], categories: ['자동차'] },
  { keywords: ['병원','의원','건강','의료','치료'], categories: ['의료/건강'] },
  { keywords: ['교육','컨설팅','코칭','강의','멘토'], categories: ['교육/컨설팅'] },
  { keywords: ['뷰티','패션','헤어','피부','스타일'], categories: ['뷰티/패션'] },
  { keywords: ['음식','카페','식당','외식','식품'], categories: ['식품/외식'] },
  { keywords: ['여행','레저','숙박','관광','라이프'], categories: ['라이프/여행'] },
  { keywords: ['제조','유통','공장','납품','물류'], categories: ['제조/유통'] },
];

function setProblem(text) {
  document.getElementById('problemInput').value = text;
  searchProblem();
}

function searchProblem() {
  const q = document.getElementById('problemInput').value.trim();
  const res = document.getElementById('problemResults');
  if (!q) { res.innerHTML = ''; return; }

  const ql = q.toLowerCase();
  const matchedCats = new Set();
  KEYWORD_MAP.forEach(entry => {
    if (entry.keywords.some(k => ql.includes(k))) {
      entry.categories.forEach(c => matchedCats.add(c));
    }
  });

  const hits = MEMBERS.filter(m =>
    (matchedCats.size > 0 && matchedCats.has(m.category)) ||
    m.specialty.toLowerCase().includes(ql) ||
    m.description.toLowerCase().includes(ql) ||
    m.targetCustomer.toLowerCase().includes(ql)
  ).slice(0, 5);

  if (!hits.length) {
    res.innerHTML = `<div class="p-no-result">맞는 전문가를 찾지 못했어요. 검색창에서 찾아보세요 🔍</div>`;
    return;
  }

  res.innerHTML = `
    <div class="p-result-label">✨ 추천 전문가 ${hits.length}명</div>
    <div class="p-result-list">
      ${hits.map(m => `
        <div class="p-result-item" onclick="openModal(${m.id})">
          <div class="p-result-avatar" style="background:${m.color}">
            ${m.photoUrl ? `<img src="${m.photoUrl}" alt="${m.name}">` : initial(m.name)}
          </div>
          <div>
            <div class="p-result-name">${m.name}</div>
            <div class="p-result-spec">${m.specialty} · ${m.category}</div>
          </div>
          <span class="p-result-arr">›</span>
        </div>`).join('')}
    </div>`;
}

// ── Event wiring ──────────────────────────────────────────────
$('modalClose').onclick    = closeModal;
$('backBtn').onclick       = closeCatView;
$('catCloseBtn').onclick   = closeCatView;
$('searchBtn').onclick     = openSearch;
$('searchClose').onclick   = closeSearch;
$('searchClear').onclick   = () => { searchInput.value=''; searchInput.focus(); renderSearchResults(''); };
searchInput.addEventListener('input', e => renderSearchResults(e.target.value));
document.getElementById('problemInput').addEventListener('keydown', e => { if (e.key === 'Enter') searchProblem(); });
document.getElementById('problemInput').addEventListener('input', e => { if (!e.target.value.trim()) document.getElementById('problemResults').innerHTML = ''; });

modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeSearch(); closeCatView(); }
});

// ── Init ──────────────────────────────────────────────────────
function init() {
  initCarousel();
  renderCategories();
  renderMembers();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
