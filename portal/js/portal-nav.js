/* ============================================================
   BNI STAR Portal — Navigation Renderer
   ============================================================ */

function renderPortalLayout(opts = {}) {
  const session = requireAuth();
  if (!session) return null;

  const meta    = ROLE_META[session.roleType] || ROLE_META.member;
  const navItems = getNavItems(session);
  const currentPath = location.pathname;

  // ── Sidebar ──
  const sidebarHtml = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">BNI ★ <span>STAR</span></div>
      <div class="sidebar-user">
        <div class="su-name">${session.memberName || '사용자'}</div>
        <div class="su-role"><span class="badge ${meta.badge}">${meta.label}</span></div>
      </div>
      <nav class="sidebar-nav">
        ${navItems.map(item => `
          <a href="${item.href}" class="nav-item ${currentPath.includes(item.href.replace('/portal/','').replace('.html','')) ? 'active' : ''}">
            <span class="ni-icon">${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <a href="#" class="logout-link" id="logoutLink">← 역할 변경</a>
      </div>
    </aside>`;

  // ── Top Bar ──
  const topbarHtml = `
    <header class="topbar">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="menu-toggle" id="menuToggle">☰</button>
        <span class="topbar-title">${opts.title || 'BNI STAR Portal'}</span>
      </div>
      <div class="topbar-right">
        <span class="chapter-badge-top" id="chapterBadgeTop">—</span>
      </div>
    </header>`;

  // Inject into page
  document.body.insertAdjacentHTML('afterbegin', `
    <div class="portal-layout">
      ${sidebarHtml}
      <div class="main-content">
        ${topbarHtml}
        <div class="page-body" id="pageBody"></div>
      </div>
    </div>`);

  // Events
  document.getElementById('logoutLink').addEventListener('click', e => {
    e.preventDefault();
    clearSession();
    location.href = '/portal/';
  });
  const menuToggle = document.getElementById('menuToggle');
  const sidebar    = document.getElementById('sidebar');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) sidebar.classList.remove('open');
    });
  }

  // Chapter badge
  loadChapterBadge();

  return { session, meta, bodyEl: document.getElementById('pageBody') };
}

async function loadChapterBadge() {
  try {
    const { data } = await getSb().from('traffic_weekly_records').select('id').limit(1);
    document.getElementById('chapterBadgeTop').textContent = 'BNI STAR';
  } catch { document.getElementById('chapterBadgeTop').textContent = 'BNI STAR'; }
}
