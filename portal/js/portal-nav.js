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

  // AI 비서 버블
  initAIAssistant(session);

  return { session, meta, bodyEl: document.getElementById('pageBody') };
}

async function loadChapterBadge() {
  try {
    const { data } = await getSb().from('traffic_weekly_records').select('id').limit(1);
    document.getElementById('chapterBadgeTop').textContent = 'BNI STAR';
  } catch { document.getElementById('chapterBadgeTop').textContent = 'BNI STAR'; }
}

/* ── AI 비서 ── */
function initAIAssistant(session) {
  const style = document.createElement('style');
  style.textContent = `
    #ai-bubble { position:fixed;bottom:24px;right:24px;z-index:1000;width:52px;height:52px;border-radius:50%;background:#8B0000;color:#fff;border:none;font-size:22px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;transition:transform .15s; }
    #ai-bubble:hover { transform:scale(1.08); }
    #ai-panel { position:fixed;bottom:88px;right:24px;z-index:1000;width:360px;max-width:calc(100vw - 32px);background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.18);display:flex;flex-direction:column;overflow:hidden;max-height:520px;transition:opacity .2s,transform .2s; }
    #ai-panel.hidden { opacity:0;pointer-events:none;transform:translateY(12px); }
    #ai-panel-head { background:#8B0000;color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0; }
    #ai-panel-head span { font-size:14px;font-weight:700; }
    #ai-panel-close { background:none;border:none;color:#fff;font-size:18px;cursor:pointer;padding:0;line-height:1;opacity:.8; }
    #ai-panel-close:hover { opacity:1; }
    #ai-messages { flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px; }
    .ai-msg { max-width:88%;font-size:13px;line-height:1.6;padding:9px 12px;border-radius:12px;word-break:break-word; }
    .ai-msg.user { align-self:flex-end;background:#8B0000;color:#fff;border-bottom-right-radius:4px; }
    .ai-msg.assistant { align-self:flex-start;background:#f3f4f6;color:#1a1a1a;border-bottom-left-radius:4px; }
    .ai-msg.typing { color:#9ca3af;font-style:italic; }
    #ai-input-row { display:flex;gap:8px;padding:10px 12px;border-top:1px solid #e5e7eb;flex-shrink:0; }
    #ai-input { flex:1;border:1.5px solid #e5e7eb;border-radius:10px;padding:8px 12px;font-size:13px;font-family:inherit;outline:none;resize:none;max-height:80px; }
    #ai-input:focus { border-color:#8B0000; }
    #ai-send { background:#8B0000;color:#fff;border:none;border-radius:10px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap; }
    #ai-send:disabled { background:#d1d5db;cursor:not-allowed; }
  `;
  document.head.appendChild(style);

  document.body.insertAdjacentHTML('beforeend', `
    <button id="ai-bubble" title="AI 비서">✨</button>
    <div id="ai-panel" class="hidden">
      <div id="ai-panel-head">
        <span>✨ AI 비서</span>
        <button id="ai-panel-close">✕</button>
      </div>
      <div id="ai-messages">
        <div class="ai-msg assistant">안녕하세요! BNI STAR AI 비서입니다. 멤버 점수, 목표 현황, 채점 기준 등 챕터에 관한 질문을 해주세요.</div>
      </div>
      <div id="ai-input-row">
        <textarea id="ai-input" rows="1" placeholder="질문을 입력하세요..."></textarea>
        <button id="ai-send">전송</button>
      </div>
    </div>
  `);

  const bubble   = document.getElementById('ai-bubble');
  const panel    = document.getElementById('ai-panel');
  const closeBtn = document.getElementById('ai-panel-close');
  const input    = document.getElementById('ai-input');
  const sendBtn  = document.getElementById('ai-send');
  const msgBox   = document.getElementById('ai-messages');

  const chatHistory = []; // { role, content }
  let aiContext = null;

  bubble.addEventListener('click', () => {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      input.focus();
      loadAIContext();
    }
  });
  closeBtn.addEventListener('click', () => panel.classList.add('hidden'));

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  sendBtn.addEventListener('click', sendMessage);

  async function loadAIContext() {
    if (aiContext !== null) return; // 이미 로드됨
    aiContext = {};
    try {
      const today = new Date();
      const ym = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
      const [mRes, wRes, gRes] = await Promise.all([
        getSb().from('members').select('id,name,company').eq('is_active', true),
        getSb().from('weekly_records').select('*').gte('week_date', ym + '-01'),
        getSb().from('chapter_goals').select('metric_name,metric_unit,target_value,actual_value').eq('year_month', ym),
      ]);

      const members = mRes.data || [];
      const recs    = wRes.data || [];
      const goals   = (gRes.data || []).map(g => ({
        metric_name: g.metric_name,
        metric_unit: g.metric_unit,
        target_value: g.target_value,
        actual: g.actual_value,
      }));

      // 멤버별 간단 점수 집계 (scoring.js의 calcMemberScore 사용)
      const weeks = [...new Set(recs.map(r => r.week_date))];
      const memberScores = members.map(m => {
        const mr = recs.filter(r => r.member_id === m.id || r.member_name === m.name);
        if (!mr.length) return { name: m.name, company: m.company, light: 'gray', total: 0, breakdown: {} };
        const sc = typeof calcMemberScore === 'function' ? calcMemberScore(mr, Math.max(weeks.length, 1)) : { total: 0, light: 'gray', breakdown: {} };
        return { name: m.name, company: m.company, ...sc };
      });

      aiContext = { ym, members: memberScores, goals };
    } catch (e) {
      console.warn('AI context load failed:', e);
      aiContext = {};
    }
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMsg('user', text);
    chatHistory.push({ role: 'user', content: text });
    input.value = '';
    sendBtn.disabled = true;

    const typingEl = addMsg('assistant', '입력 중...', 'typing');

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory, context: aiContext || {} }),
      });
      const data = await res.json();
      typingEl.remove();
      const reply = data.reply || '응답을 받지 못했어요.';
      addMsg('assistant', reply);
      chatHistory.push({ role: 'assistant', content: reply });
    } catch {
      typingEl.remove();
      addMsg('assistant', '오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  function addMsg(role, text, extra = '') {
    const el = document.createElement('div');
    el.className = `ai-msg ${role}${extra ? ' ' + extra : ''}`;
    el.textContent = text;
    msgBox.appendChild(el);
    msgBox.scrollTop = msgBox.scrollHeight;
    return el;
  }
}
