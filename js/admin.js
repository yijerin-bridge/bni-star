/* ============================================================
   BNI STAR — Admin Panel
   ============================================================ */

const ADMIN_ID   = 'yijerin';
const ADMIN_PASS = 'dlwofls1!';
// ── Supabase ──────────────────────────────────────────────────
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

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
let currentPhotoData = '';

const $ = id => document.getElementById(id);

// ── Auth ──────────────────────────────────────────────────────
function checkLogin() {
  if (sessionStorage.getItem('bnistar_admin') === '1') {
    showAdmin();
  }
}
function login() {
  const id  = $('loginId').value.trim();
  const pw  = $('loginPw').value;
  if (id === ADMIN_ID && pw === ADMIN_PASS) {
    sessionStorage.setItem('bnistar_admin', '1');
    $('loginError').classList.remove('show');
    $('loginOverlay').classList.add('hidden');
    showAdmin();
  } else {
    $('loginError').classList.add('show');
    $('loginPw').select();
  }
}
function logout() {
  sessionStorage.removeItem('bnistar_admin');
  location.reload();
}
function showAdmin() {
  $('adminApp').style.display = 'block';
  init();
}

// ── Data ──────────────────────────────────────────────────────
function loadData() {
  members = loadMembers();
}
function save() {
  saveMembers(members);
  pushToGitHub();
}

// ── GitHub Auto-Deploy ─────────────────────────────────────────
let deployTimer = null;
async function pushToGitHub() {
  // debounce: wait 1s after last save before pushing
  clearTimeout(deployTimer);
  deployTimer = setTimeout(async () => {
    showDeployBanner('배포 중...');
    try {
      const res = await fetch('/api/save-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members })
      });
      if (res.ok) {
        showDeployBanner('✓ 배포 완료 (~30초 후 반영)', true);
      } else {
        showDeployBanner('⚠️ 배포 실패 — 로컬 저장은 됐습니다', false, true);
      }
    } catch (e) {
      showDeployBanner('⚠️ 네트워크 오류', false, true);
    }
  }, 1000);
}

function showDeployBanner(msg, success = false, error = false) {
  let banner = document.getElementById('deployBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'deployBanner';
    banner.style.cssText = `
      position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
      padding:10px 20px; border-radius:20px; font-size:.85rem; font-weight:700;
      z-index:9999; transition:opacity .4s; box-shadow:0 4px 16px rgba(0,0,0,.2);
      white-space:nowrap;
    `;
    document.body.appendChild(banner);
  }
  banner.textContent = msg;
  banner.style.background = error ? '#E74C3C' : success ? '#27AE60' : '#1A1A2E';
  banner.style.color = 'white';
  banner.style.opacity = '1';
  if (success || error) {
    setTimeout(() => { banner.style.opacity = '0'; }, 3000);
  }
}

// ── Render ────────────────────────────────────────────────────
function renderStats() {
  const featured = members.filter(m => m.featured).length;
  const cats = CATEGORIES.length;
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
  sel.innerHTML = '<option value="">전체 카테고리</option>';
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

  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      currentColor = sw.dataset.color;
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
    });
    if (sw.dataset.color === currentColor) sw.classList.add('active');
  });

  $('colorCustom').addEventListener('input', e => { currentColor = e.target.value; });

  const toggleEl = $('featuredToggle');
  if (isFeatured) toggleEl.classList.add('on');
  toggleEl.addEventListener('click', () => {
    isFeatured = !isFeatured;
    toggleEl.classList.toggle('on', isFeatured);
  });

  $('fPhotoFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하로 해주세요.');
      e.target.value = '';
      return;
    }
    showDeployBanner('이미지 업로드 중...');
    const ext = file.name.split('.').pop().toLowerCase();
    const path = `member-${Date.now()}.${ext}`;
    const { data, error } = await sb.storage.from('member-photos').upload(path, file, { upsert: true });
    if (error) {
      showDeployBanner('⚠️ 이미지 업로드 실패', false, true);
      return;
    }
    const { data: { publicUrl } } = sb.storage.from('member-photos').getPublicUrl(data.path);
    currentPhotoData = publicUrl;
    $('photoPreview').src = publicUrl;
    $('photoPreviewWrap').style.display = 'block';
    $('fPhotoUrl').value = publicUrl;
    showDeployBanner('✓ 이미지 업로드 완료', true);
  });

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
        <label class="form-label">카카오 오픈채팅 URL</label>
        <input class="form-input" id="fKakao" value="${m ? (m.kakao || '') : ''}" placeholder="https://open.kakao.com/o/...">
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

// ── Tabs ──────────────────────────────────────────────────────
function switchTab(tab) {
  const isMembers = tab === 'members';
  $('panelMembers').style.display   = isMembers ? '' : 'none';
  $('panelAnalytics').style.display = isMembers ? 'none' : '';
  $('tabMembers').classList.toggle('active', isMembers);
  $('tabAnalytics').classList.toggle('active', !isMembers);
  if (!isMembers) loadAnalytics();
}

// ── Analytics ─────────────────────────────────────────────────
async function loadAnalytics() {
  $('analyticsBody').innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:#aaa">로딩 중...</td></tr>';

  const [{ data: visits }, { data: contacts }] = await Promise.all([
    sb.from('referral_visits').select('ref_member_id').order('created_at', { ascending: false }),
    sb.from('contact_actions').select('ref_member_id, target_member_id, target_member_name, action_type, created_at').order('created_at', { ascending: false }),
  ]);

  const visitMap = {};
  (visits || []).forEach(v => { visitMap[v.ref_member_id] = (visitMap[v.ref_member_id] || 0) + 1; });

  const contactMap = {};
  (contacts || []).forEach(c => {
    if (c.ref_member_id) contactMap[c.ref_member_id] = (contactMap[c.ref_member_id] || 0) + 1;
  });

  $('analyticsBody').innerHTML = members.map(m => `
    <tr>
      <td><strong>${m.name}</strong><br><span style="font-size:.75rem;color:#999">${m.company}</span></td>
      <td class="num-cell">${visitMap[m.id] || 0}</td>
      <td class="num-cell">${contactMap[m.id] || 0}</td>
      <td><button class="copy-link-btn" onclick="copyLink(${m.id},'${m.name}')">🔗 복사</button></td>
    </tr>`).join('');

  // 최근 컨택 내역 — 누구 링크로 → 누구에게 어떻게
  const recent = (contacts || []).slice(0, 30);
  const actionLabel = { phone:'전화', email:'이메일', kakao:'카카오톡', instagram:'인스타그램', website:'웹사이트' };
  const actionIcon  = { phone:'📞', email:'✉️', kakao:'💬', instagram:'📷', website:'🌐' };

  $('contactBreakdown').innerHTML = recent.length ? `
    <div class="breakdown-title">최근 컨택 내역 (${recent.length}건)</div>
    ${recent.map(c => {
      const ref  = members.find(m => m.id === c.ref_member_id);
      const icon = actionIcon[c.action_type] || '🔗';
      const label = actionLabel[c.action_type] || c.action_type;
      const time = new Date(c.created_at).toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
      const refText = ref ? `<strong>${ref.name}</strong> 링크로 유입` : '직접 방문';
      return `<div class="breakdown-row">
        <div class="brow-main">${refText} → ${icon} <strong>${c.target_member_name}</strong>에게 ${label}</div>
        <div class="brow-meta">${time}</div>
      </div>`;
    }).join('')}` : '<div style="padding:16px;text-align:center;color:#aaa;font-size:.85rem">아직 컨택 기록이 없습니다</div>';
}

function copyLink(memberId, memberName) {
  const url = `${location.origin}/?ref=${memberId}`;
  navigator.clipboard.writeText(url).then(() => showDeployBanner(`✓ ${memberName} 링크 복사됨`, true));
}

// ── Event Wiring ──────────────────────────────────────────────
$('loginBtn').onclick = login;
$('loginId').addEventListener('keydown', e => { if (e.key === 'Enter') $('loginPw').focus(); });
$('loginPw').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
$('logoutBtn').onclick = logout;
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
$('adminApp').style.display = 'none';
checkLogin();
