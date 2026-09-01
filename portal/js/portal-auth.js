/* ============================================================
   BNI STAR Portal — Auth & Role Management (Dev Mode: no real auth)
   ============================================================ */

const PORTAL_SESSION_KEY = 'bni_portal_session';

const ROLE_META = {
  board:      { tier: 1, label: '의장단',       badge: 'badge-board',      color: '#8B0000' },
  leader:     { tier: 2, label: '리더팀',        badge: 'badge-leader',     color: '#1a5276' },
  membership: { tier: 2, label: '멤버십위원회', badge: 'badge-membership', color: '#145a32' },
  member:     { tier: 3, label: '일반멤버',      badge: 'badge-member',     color: '#555' },
};

/* ---------- Session ---------- */
function getSession() {
  try { return JSON.parse(sessionStorage.getItem(PORTAL_SESSION_KEY)) || null; }
  catch { return null; }
}

function setSession(data) {
  sessionStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(data));
}

function clearSession() {
  sessionStorage.removeItem(PORTAL_SESSION_KEY);
}

/* ---------- Auth Guard ---------- */
function requireAuth(redirectTo = '/portal/') {
  const s = getSession();
  if (!s) { location.href = redirectTo; return null; }
  return s;
}

/* ---------- Access Check ---------- */
function canAccess(session, requiredTier = 3, requiredTypes = null) {
  if (!session) return false;
  const meta = ROLE_META[session.roleType];
  if (!meta) return false;
  if (meta.tier > requiredTier) return false;
  if (requiredTypes && !requiredTypes.includes(session.roleType)) return false;
  return true;
}

// 트래픽라이트 접근 — 부의장, [멤버십] 트래픽라이트 담당만
// roleName 미배정(member_roles 미입력) 상태에서는 roleType 폴백 허용
function canAccessTraffic(s) {
  if (!s) return false;
  const hasRoleName = !!s.roleName;
  if (hasRoleName) {
    if (s.roleType === 'board'      && s.roleName === '부의장')               return true;
    if (s.roleType === 'membership' && s.roleName === '[멤버십] 트래픽라이트') return true;
    return false;
  }
  // roleName 미배정 폴백: board 또는 membership이면 허용
  return s.roleType === 'board' || s.roleType === 'membership';
}
// 트래픽라이트 데이터 입력/수정 (접근 가능한 동일 역할만)
function canEditTraffic(s) { return canAccessTraffic(s); }
// 회의록 작성
function canWriteMinutes(s, meetingType) {
  if (!s) return false;
  const t = s.roleType;
  if (t === 'board') return true;
  if (meetingType === 'weekly_bni') return true; // leader/membership도 작성 가능
  if (meetingType === 'membership' && t === 'membership') return true;
  if (meetingType === 'leader_team' && t === 'leader') return true;
  return false;
}
// 의장단 회의록 열람
function canReadBoardMinutes(s) { return canAccess(s, 1, ['board']); }
// 멤버 관리
function canManageMembers(s) { return canAccess(s, 1, ['board']); }
// 피처 피드백 관리 — 의장단 또는 PR코디
function canAccessFeatureFeedback(s) {
  if (!s) return false;
  if (s.roleType === 'board') return true;
  if (s.roleType === 'leader' && s.roleName && s.roleName.includes('PR')) return true;
  return false;
}

/* ---------- Nav Items by Role ---------- */
function getNavItems(session) {
  if (!session) return [];
  const t = session.roleType;
  const items = [
    { href: '/portal/dashboard.html',      icon: '⬜', label: '대시보드',      always: true },
  ];
  if (t === 'board') {
    items.push({ href: '/portal/goals.html', icon: '🎯', label: '목표 관리', always: false });
  }
  items.push(
    { href: '/portal/my-performance.html', icon: '📊', label: '내 성과',    always: true },
    { href: '/portal/meetings.html',       icon: '📋', label: '회의록',     always: true },
  );
  items.push({
    href: '/portal/traffic-light.html', icon: '🚦',
    label: canAccessTraffic(session) ? '트래픽라이트' : '내 트래픽라이트',
    always: false,
  });
  if (canAccessFeatureFeedback(session)) {
    items.push({ href: '/portal/feature-feedback-results.html', icon: '🎤', label: '피처 피드백', always: false });
  }
  items.push({ href: '/portal/handover.html', icon: '🤝', label: '인수인계',     always: true });
  items.push({ href: '/portal/history.html',  icon: '📜', label: '챕터 히스토리', always: true });
  if (t === 'board') {
    items.push({ href: '/portal/members.html', icon: '👥', label: '멤버 관리', always: false });
  }
  return items;
}

/* ---------- Supabase helper ---------- */
let _sb = null;
function getSb() {
  if (!_sb) _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  return _sb;
}

/* ---------- Load chapter members (with legacy fallback) ---------- */
async function loadPortalMembers() {
  try {
    const { data } = await getSb().from('members').select('*').eq('is_active', true).order('name');
    if (data && data.length > 0) return data;
  } catch {}
  // fallback to static members-data.js
  return (typeof MEMBERS_DEFAULT !== 'undefined') ? MEMBERS_DEFAULT.map(m => ({
    id: m.id, legacy_id: m.id, name: m.name, company: m.company,
    category: m.category, phone: m.phone, email: m.email, is_active: true,
    photo_url: m.photoUrl,
  })) : [];
}
