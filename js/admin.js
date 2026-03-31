/* ============================================================
   BNI STAR — Admin Panel
   ============================================================ */

const COLOR_PRESETS = [
  '#C0392B','#8E44AD','#2980B9','#1ABC9C',
  '#27AE60','#F39C12','#D35400','#566573',
  '#B03A2E','#117A8B','#784212','#1D8348'
];

let members = [];
let editingId = null;
let filterCat = '';
let filterQuery = '';
let deleteTargetId = null;
let currentColor = '#C0392B';
let isFeatured = false;
let currentPhotoData = ''; // base64 or URL

const $ = id => document.getElementById(id);

// ── Data ──────────────────────────────────────────────────────
function loadData() {
  members = loadMembers(); // from members-data.js
}
function save() {
  saveMembers(members); // from members-data.js
}

// ── Render ────────────────────────────────────────────────────
function renderStats() {
  const featured = members.filter(m => m.featured).length;
  const cats = new Set(members.map(m => m.category)).size;
  $('statsRow').innerHTML = `
    <div class="stat-card">
      <div class="stat-num">${members.length}</div>
      <div class="stat-label">전체 회원</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${featured}</div>
      <div class="stat-label">히어로 노출</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${cats}</div>
      <div class="stat-label">카테고리</div>
    </div>`;
}

function renderCatFilter() {
  const sel = $('catFilter');
  CATEGORIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.emoji + ' ' + c.name;
    sel.appendChild(opt);
  });
}

function renderList() {
  const q = filterQuery.toLowerCase();
  const list = members.filter(m => {
    const matchCat = !filterCat || m.category === filterCat;
    const matchQ = !q || m.name.includes(filterQuery) ||
      m.specialty.toLowerCase().includes(q) ||
      m.company.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  if (!list.length) {
    $('memberList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>검색 결과가 없습니다</p>
      </div>`;
    return;
  }

  $('memberList').innerHTML = list.map(m => {
    const cat = CATEGORIES.find(c => c.name === m.category);
    return `
      <div class="member-row" style="--c:${m.color}">
        <div class="row-avatar" style="background:${m.color}">
          ${m.photoUrl ? `<img src="${m.photoUrl}" alt="${m.name}">` : m.name.charAt(0)}
        </div>
        <div class="row-info">
          <div class="row-name">${m.name}</div>
          <div class="row-company">${m.company}</div>
          <div class="row-tags">
            <span class="row-cat" style="background:${cat ? cat.color : m.color}">${cat ? cat.emoji : ''} ${m.category}</span>
            ${m.featured ? '<span class="row-featured-badge">★ 히어로</span>' : ''}
          </div>
        </div>
        <div class="row-actions">
          <button class="action-btn featured ${m.featured ? 'on' : ''}" title="히어로 노출" onclick="toggleFeatured(${m.id})">
            ${m.featured ? '⭐' : '☆'}
          </button>
          <button class="action-btn edit" title="수정" onclick="openForm(${m.id})">✏️</button>
          <button class="action-btn del" title="삭제" onclick="confirmDelete(${m.id})">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

function refresh() {
  renderStats();
  renderList();
}

// ── CRUD ──────────────────────────────────────────────────────
function toggleFeatured(id) {
  const m = members.find(x => x.id === id);
  if (m) { m.featured = !m.featured; save(); refresh(); }
}

function confirmDelete(id) {
  const m = members.find(x => x.id === id);
  if (!m) return;
  deleteTargetId = id;
  $('confirmText').textContent = `"${m.name}" 회원을 삭제하시겠습니까?`;
  $('confirmOverlay').classList.add('open');
}
function doDelete() {
  members = members.filter(m => m.id !== deleteTargetId);
  save(); refresh();
  $('confirmOverlay').classList.remove('open');
  deleteTargetId = null;
}

// ── Form ──────────────────────────────────────────────────────
function openForm(id = null) {
  editingId = id;
  const m = id ? members.find(x => x.id === id) : null;
  $('formTitle').textContent = id ? '회원 수정' : '회원 추가';
  currentColor = m ? m.color : '#C0392B';
  isFeatured = m ? m.featured : false;
  currentPhotoData = m ? (m.photoUrl || '') : '';

  $('formBody').innerHTML = buildFormHTML(m);

  // color swatches
  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      currentColor = sw.dataset.color;
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
    });
    if (sw.dataset.color === currentColor) sw.classList.add('active');
  });

  // custom color input
  $('colorCustom').addEventListener('input', e => { currentColor = e.target.value; });

  // featured toggle
  const toggleEl = $('featuredToggle');
  if (isFeatured) toggleEl.classList.add('on');
  toggleEl.addEventListener('click', () => {
    isFeatured = !isFeatured;
    toggleEl.classList.toggle('on', isFeatured);
  });

  // photo upload
  $('fPhotoFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('파일 크기는 2MB 이하로 해주세요.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      currentPhotoData = ev.target.result;
      $('photoPreview').src = currentPhotoData;
      $('photoPreviewWrap').style.display = 'block';
      $('fPhotoUrl').value = '';
    };
    reader.readAsDataURL(file);
  });

  // photo url input
  $('fPhotoUrl').addEventListener('input', e => {
    const url = e.target.value.trim();
    currentPhotoData = url;
    if (url) {
      $('photoPreview').src = url;
      $('photoPreviewWrap').style.display = 'block';
    } else {
      $('photoPreviewWrap').style.display = 'none';
    }
  });

  // photo remove
  $('photoRemoveBtn').addEventListener('click', () => {
    currentPhotoData = '';
    $('fPhotoUrl').value = '';
    $('fPhotoFile').value = '';
    $('photoPreviewWrap').style.display = 'none';
  });

  $('formBtnCancel').onclick = closeForm;
  $('formBtnSave').onclick = submitForm;

  $('formOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function buildFormHTML(m) {
  const sw = COLOR_PRESETS.map(c =>
    `<div class="color-swatch" data-color="${c}" style="background:${c}"></div>`
  ).join('');

  const catOpts = CATEGORIES.map(c =>
    `<option value="${c.name}" ${m && m.category === c.name ? 'selected' : ''}>${c.emoji} ${c.name}</option>`
  ).join('');

  return `
    <div class="form-section">
      <div class="form-section-title">기본 정보</div>
      <div class="form-group">
        <label class="form-label">이름 <span class="req">*</span></label>
        <input class="form-input" id="fName" value="${m ? m.name : ''}" placeholder="홍길동">
      </div>
      <div class="form-group">
        <label class="form-label">회사명 <span class="req">*</span></label>
        <input class="form-input" id="fCompany" value="${m ? m.company : ''}" placeholder="(주)회사명">
      </div>
      <div class="form-group">
        <label class="form-label">카테고리 <span class="req">*</span></label>
        <select class="form-select" id="fCategory">
          <option value="">선택하세요</option>
          ${catOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">전문분야 <span class="req">*</span></label>
        <input class="form-input" id="fSpecialty" value="${m ? m.specialty : ''}" placeholder="세무·절세 컨설팅">
      </div>
      <div class="form-group">
        <label class="form-label">히어로 문구 (캐러셀 제목)</label>
        <input class="form-input" id="fHeadline" value="${m ? (m.headline || '') : ''}" placeholder="고객의 고민을 건드리는 한 문장">
      </div>
      <div class="form-group">
        <label class="form-label">찾는 고객 유형</label>
        <input class="form-input" id="fTarget" value="${m ? m.targetCustomer : ''}" placeholder="중소기업 대표, 스타트업 창업자">
      </div>
      <div class="form-group">
        <label class="form-label">소개</label>
        <textarea class="form-textarea" id="fDesc" placeholder="전문가 소개를 입력하세요">${m ? m.description : ''}</textarea>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">연락처</div>
      <div class="form-group">
        <label class="form-label">전화번호 <span class="req">*</span></label>
        <input class="form-input" id="fPhone" type="tel" value="${m ? m.phone : ''}" placeholder="010-0000-0000">
      </div>
      <div class="form-group">
        <label class="form-label">이메일</label>
        <input class="form-input" id="fEmail" type="email" value="${m ? m.email : ''}" placeholder="email@example.com">
      </div>
      <div class="form-group">
        <label class="form-label">주소</label>
        <input class="form-input" id="fAddress" value="${m ? m.address : ''}" placeholder="서울시 강남구...">
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">SNS · 웹사이트</div>
      <div class="form-group">
        <label class="form-label">인스타그램 (@ 제외)</label>
        <input class="form-input" id="fInsta" value="${m ? (m.instagram || '') : ''}" placeholder="username">
      </div>
      <div class="form-group">
        <label class="form-label">카카오톡 ID</label>
        <input class="form-input" id="fKakao" value="${m ? (m.kakao || '') : ''}" placeholder="kakao_id">
      </div>
      <div class="form-group">
        <label class="form-label">웹사이트</label>
        <input class="form-input" id="fWebsite" value="${m ? (m.website || '') : ''}" placeholder="www.example.com">
      </div>
      <div class="form-group">
        <label class="form-label">프로필 사진</label>
        <div class="photo-upload-area" id="photoUploadArea">
          <div class="photo-preview-wrap" id="photoPreviewWrap" style="display:${m && m.photoUrl ? 'block' : 'none'}">
            <img class="photo-preview" id="photoPreview" src="${m && m.photoUrl ? m.photoUrl : ''}" alt="미리보기">
            <button type="button" class="photo-remove-btn" id="photoRemoveBtn">✕ 제거</button>
          </div>
          <label class="photo-file-label" for="fPhotoFile">
            <span class="photo-file-icon">📁</span>
            <span>파일 선택 (JPG, PNG · 2MB 이하)</span>
          </label>
          <input type="file" id="fPhotoFile" class="photo-file-input" accept="image/*">
          <div class="photo-divider"><span>또는 URL 입력</span></div>
          <input class="form-input" id="fPhotoUrl" value="" placeholder="https://example.com/photo.jpg">
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">설정</div>
      <div class="form-group">
        <label class="form-label">대표 색상</label>
        <div class="color-row">
          ${sw}
          <input type="color" class="color-custom" id="colorCustom" value="${m ? m.color : '#C0392B'}" title="직접 선택">
        </div>
      </div>
      <div class="form-group">
        <div class="toggle-row">
          <span class="toggle-label">히어로 캐러셀 노출</span>
          <div class="toggle-switch" id="featuredToggle"></div>
        </div>
      </div>
    </div>

    <div class="form-submit-row">
      <button class="btn-cancel" id="formBtnCancel">취소</button>
      <button class="btn-save" id="formBtnSave">저장</button>
    </div>`;
}

function closeForm() {
  $('formOverlay').classList.remove('open');
  document.body.style.overflow = '';
  editingId = null;
}

function submitForm() {
  const name     = $('fName').value.trim();
  const company  = $('fCompany').value.trim();
  const category = $('fCategory').value;
  const specialty= $('fSpecialty').value.trim();
  const phone    = $('fPhone').value.trim();

  // Validate required
  let valid = true;
  [$('fName'), $('fCompany'), $('fCategory'), $('fSpecialty'), $('fPhone')].forEach(el => {
    if (!el.value.trim()) { el.classList.add('error'); valid = false; }
    else el.classList.remove('error');
  });
  if (!valid) {
    $('formSheet').scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const data = {
    name, company, category, specialty, phone,
    headline:      $('fHeadline').value.trim(),
    targetCustomer:$('fTarget').value.trim(),
    description:   $('fDesc').value.trim(),
    email:         $('fEmail').value.trim(),
    address:       $('fAddress').value.trim(),
    instagram:     $('fInsta').value.trim(),
    kakao:         $('fKakao').value.trim(),
    website:       $('fWebsite').value.trim(),
    photoUrl:      currentPhotoData,
    color:         currentColor,
    featured:      isFeatured,
  };

  if (editingId) {
    const idx = members.findIndex(m => m.id === editingId);
    members[idx] = { ...members[idx], ...data };
  } else {
    const maxId = members.reduce((max, m) => Math.max(max, m.id), 0);
    members.push({ id: maxId + 1, ...data });
  }

  save(); refresh(); closeForm();
}

// ── Event Wiring ──────────────────────────────────────────────
$('addBtn').onclick = () => openForm();
$('formClose').onclick = closeForm;
$('formOverlay').addEventListener('click', e => { if (e.target === $('formOverlay')) closeForm(); });
$('adminSearch').addEventListener('input', e => { filterQuery = e.target.value; renderList(); });
$('catFilter').addEventListener('change', e => { filterCat = e.target.value; renderList(); });
$('confirmCancel').onclick = () => { $('confirmOverlay').classList.remove('open'); deleteTargetId = null; };
$('confirmOk').onclick = doDelete;

// ── Init ──────────────────────────────────────────────────────
function init() {
  loadData();
  renderCatFilter();
  refresh();
}

// Start
init();
