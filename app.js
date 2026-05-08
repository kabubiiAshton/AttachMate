// ── AttachMate App ──

document.addEventListener('DOMContentLoaded', () => {
  seedIfEmpty();

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // PWA install prompt
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('install-banner')?.classList.remove('hidden');
  });
  document.getElementById('btn-install')?.addEventListener('click', () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        deferredPrompt = null;
        document.getElementById('install-banner')?.classList.add('hidden');
      });
    }
  });

  // ── Session ──
  const saved = loadSession();
  if (saved) { showApp(saved); } else { showScreen('splash'); }

  // ── Splash ──
  q('#btn-get-started')?.addEventListener('click', () => showScreen('auth'));

  // ── Auth ──
  let authMode = 'login';
  let selectedRole = 'student';

  qs('.auth-tab').forEach(t => t.addEventListener('click', () => {
    qs('.auth-tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    authMode = t.dataset.tab;
    toggleAuthForms();
  }));

  qs('.role-card').forEach(c => c.addEventListener('click', () => {
    qs('.role-card').forEach(x => x.classList.remove('selected'));
    c.classList.add('selected');
    selectedRole = c.dataset.role;
    toggleRoleFields();
  }));

  q('#btn-auth-submit')?.addEventListener('click', handleAuth);
  q('#btn-demo-student')?.addEventListener('click', () => demoLogin('student'));
  q('#btn-demo-org')?.addEventListener('click', () => demoLogin('org'));
  q('#btn-logout')?.addEventListener('click', handleLogout);

  // ── Nav ──
  qs('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchPage(item.dataset.page));
  });

  // ── Search & Filters ──
  q('#opp-search')?.addEventListener('input', debounce(renderOpportunities, 300));
  qs('.chip').forEach(chip => chip.addEventListener('click', () => {
    const group = chip.dataset.group;
    qs(`.chip[data-group="${group}"]`).forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    renderOpportunities();
  }));

  // ── Modals ──
  qs('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
  });
  qs('[data-close-modal]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.closeModal)));

  // ── Org: Post opportunity ──
  q('#btn-post-opp')?.addEventListener('click', () => openModal('modal-post'));
  q('#btn-submit-opp')?.addEventListener('click', handlePostOpp);

  // ── AI Actions ──
  q('#btn-ai-match')?.addEventListener('click', handleAIMatch);
  q('#btn-gen-cover')?.addEventListener('click', handleGenCover);

  // ── Notifs ──
  q('#btn-notifs')?.addEventListener('click', () => { switchPage('notifications'); });

  // ── Profile Edit ──
  q('#btn-edit-profile')?.addEventListener('click', () => openModal('modal-profile'));
  q('#btn-save-profile')?.addEventListener('click', handleSaveProfile);

  updateNotifBadge();
});

// ── Helpers ──
const q = sel => document.querySelector(sel);
const qs = sel => document.querySelectorAll(sel);
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

function showScreen(name) {
  qs('.screen').forEach(s => s.classList.remove('active'));
  q(`#screen-${name}`)?.classList.add('active');
}

function showApp(user) {
  login(user);
  showScreen('app');
  renderAll();
  // Show install banner for PWA
  if (!window.matchMedia('(display-mode: standalone)').matches) {
    // will be shown if beforeinstallprompt fires
  }
}

function renderAll() {
  renderHeader();
  renderHome();
  renderOpportunities();
  renderApplications();
  renderNotifications();
  renderProfile();
  if (currentUser?.role === 'org') renderOrgDashboard();
}

// ── Header ──
function renderHeader() {
  if (!currentUser) return;
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  q('#header-avatar').textContent = initials;
  q('#header-avatar').title = currentUser.name;
}

// ── HOME PAGE ──
function renderHome() {
  if (!currentUser) return;
  const name = currentUser.name.split(' ')[0];

  if (currentUser.role === 'student') {
    q('#home-welcome-name').innerHTML = `Hello, <span>${name}</span> 👋`;
    q('#home-welcome-sub').textContent = 'Your next big career opportunity is here.';

    const apps = getApplications(currentUser.id);
    const opps = getOpps();
    q('#stat-applied').textContent = apps.length;
    q('#stat-opps').textContent = opps.length;
    q('#stat-accepted').textContent = apps.filter(a => a.status === 'accepted').length;

    // Featured opportunities
    renderFeaturedOpps(opps.slice(0, 4));
  } else {
    q('#home-welcome-name').innerHTML = `Welcome, <span>${name}</span> 👋`;
    q('#home-welcome-sub').textContent = 'Manage your attachment listings and applicants.';
    const myOpps = (DB.get('opps') || []).filter(o => o.orgId === currentUser.orgId || o.postedBy === currentUser.id);
    const apps = getOrgApplications(currentUser.id);
    q('#stat-applied').textContent = apps.length;
    q('#stat-opps').textContent = myOpps.length;
    q('#stat-accepted').textContent = apps.filter(a => a.status === 'accepted').length;
    renderFeaturedOpps(myOpps.slice(0, 4));
  }
}

function renderFeaturedOpps(opps) {
  const container = q('#featured-opps');
  if (!container) return;
  if (!opps.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No opportunities yet</div></div>`;
    return;
  }
  container.innerHTML = opps.map(o => oppCardHTML(o, true)).join('');
  container.querySelectorAll('.opp-card').forEach(card => {
    card.addEventListener('click', () => openOppDetail(card.dataset.oppId));
  });
}

// ── OPPORTUNITIES ──
function renderOpportunities() {
  const container = q('#opps-list');
  if (!container) return;

  const query = q('#opp-search')?.value || '';
  const activeIndustry = q('.chip[data-group="industry"].active')?.dataset.value || 'all';
  const activeLocation = q('.chip[data-group="location"].active')?.dataset.value || 'all';

  const opps = getOpps({ query, industry: activeIndustry, location: activeLocation });

  if (!opps.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No results found</div><div class="empty-sub">Try different filters or search terms</div></div>`;
    return;
  }

  container.innerHTML = opps.map(o => oppCardHTML(o)).join('');
  container.querySelectorAll('.opp-card').forEach(card => {
    card.addEventListener('click', () => openOppDetail(card.dataset.oppId));
  });
}

function oppCardHTML(opp, compact = false) {
  const org = getOrg(opp.orgId);
  const apps = getApplications(currentUser?.id || '');
  const applied = apps.find(a => a.oppId === opp.id);
  const deadlineDate = new Date(opp.deadline);
  const daysLeft = Math.ceil((deadlineDate - new Date()) / 86400000);
  const soonClass = daysLeft <= 7 ? 'soon' : '';

  return `
    <div class="opp-card" data-opp-id="${opp.id}">
      <div class="opp-header">
        <div class="org-logo" style="background:${orgBg(opp.industry)}">${org?.logo || '🏢'}</div>
        <div>
          <div class="opp-title">${opp.title}</div>
          <div class="opp-org">${org?.name || 'Organization'} · ${opp.location}</div>
        </div>
      </div>
      <div class="opp-tags">
        <span class="tag tag-industry">${opp.industry}</span>
        <span class="tag tag-duration">⏱ ${opp.duration}</span>
        <span class="tag tag-slots">👥 ${opp.slots} slots</span>
        ${opp.stipend ? `<span class="tag tag-location">💰 ${opp.stipend}</span>` : ''}
      </div>
      ${!compact ? `<div class="text-sm text-muted mb-1" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${opp.description}</div>` : ''}
      <div class="opp-footer">
        <div class="deadline ${soonClass}">📅 Deadline: ${new Date(opp.deadline).toLocaleDateString('en-KE', {day:'numeric',month:'short'})}</div>
        ${applied ? `<span class="status-badge status-${applied.status}"><span class="status-dot"></span>${applied.status}</span>` : '<span class="tag tag-match">View →</span>'}
      </div>
    </div>`;
}

function orgBg(industry) {
  const map = {
    'Technology': 'rgba(0,200,150,0.1)', 'Finance': 'rgba(0,168,255,0.1)',
    'Healthcare': 'rgba(239,68,68,0.1)', 'Consulting': 'rgba(124,58,237,0.1)',
    'Media': 'rgba(245,158,11,0.1)', 'Engineering': 'rgba(16,185,129,0.1)',
    'AgriTech': 'rgba(132,204,22,0.1)'
  };
  return map[industry] || 'rgba(255,255,255,0.05)';
}

function openOppDetail(oppId) {
  const opp = getOppById(oppId);
  if (!opp) return;
  const org = getOrg(opp.orgId);
  const apps = getApplications(currentUser?.id || '');
  const applied = apps.find(a => a.oppId === oppId);

  q('#detail-content').innerHTML = `
    <div style="display:flex;gap:1rem;align-items:flex-start;margin-bottom:1.25rem">
      <div class="org-logo" style="width:60px;height:60px;font-size:2rem;border-radius:16px;background:${orgBg(opp.industry)};display:flex;align-items:center;justify-content:center">${org?.logo || '🏢'}</div>
      <div>
        <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:1.1rem;margin-bottom:4px">${opp.title}</div>
        <div style="font-size:0.85rem;color:var(--text2)">${org?.name} · ${opp.location}</div>
        <div class="opp-tags" style="margin-top:0.5rem">
          <span class="tag tag-industry">${opp.industry}</span>
          <span class="tag tag-duration">⏱ ${opp.duration}</span>
        </div>
      </div>
    </div>

    <div class="profile-section">
      <div class="profile-section-title">📋 About this Role</div>
      <div style="font-size:0.9rem;line-height:1.7;color:var(--text2)">${opp.description}</div>
    </div>

    <div class="profile-section">
      <div class="profile-section-title">✅ Requirements</div>
      <div style="font-size:0.9rem;line-height:1.7;color:var(--text2)">${opp.requirements}</div>
    </div>

    <div class="profile-section">
      <div class="profile-section-title">🛠 Skills Needed</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.4rem">
        ${(opp.skills || []).map(s => `<span class="skill-tag">${s}</span>`).join('')}
      </div>
    </div>

    <div class="profile-section">
      <div class="profile-section-title">📊 Details</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;font-size:0.88rem">
        <div><div style="color:var(--text3);font-size:0.75rem;margin-bottom:2px">STIPEND</div><div>${opp.stipend || 'Non-stipendiary'}</div></div>
        <div><div style="color:var(--text3);font-size:0.75rem;margin-bottom:2px">SLOTS</div><div>${opp.slots} available</div></div>
        <div><div style="color:var(--text3);font-size:0.75rem;margin-bottom:2px">DEADLINE</div><div>${new Date(opp.deadline).toLocaleDateString('en-KE',{day:'numeric',month:'long',year:'numeric'})}</div></div>
        <div><div style="color:var(--text3);font-size:0.75rem;margin-bottom:2px">APPLICANTS</div><div>${opp.applied || 0} applied</div></div>
      </div>
    </div>

    ${applied
      ? `<div class="ai-card">
          <div class="ai-label">Application Status</div>
          <div class="ai-title flex items-center gap-sm"><span class="status-badge status-${applied.status}"><span class="status-dot"></span>${applied.status.charAt(0).toUpperCase()+applied.status.slice(1)}</span></div>
          <div class="ai-desc">Applied on ${applied.appliedDate}</div>
        </div>`
      : currentUser?.role === 'student'
        ? `<div id="apply-section">
            <div class="ai-card" style="margin-bottom:1rem">
              <div class="ai-label">✦ AI Cover Letter</div>
              <div class="ai-title">Need help writing?</div>
              <div class="ai-desc" style="margin-bottom:0.75rem">Let AI generate a cover letter based on your profile</div>
              <button class="btn btn-outline btn-sm" onclick="generateCoverForOpp('${oppId}')">Generate Cover Letter</button>
            </div>
            <div class="form-group">
              <label class="form-label">Cover Letter</label>
              <textarea class="form-textarea" id="apply-cover" placeholder="Why are you interested in this position? What makes you a great fit?" style="min-height:120px"></textarea>
            </div>
            <button class="btn btn-primary" onclick="submitApplication('${oppId}')">Apply Now →</button>
           </div>`
        : ''
    }`;

  q('#detail-opp-title').textContent = opp.title;
  openModal('modal-detail');
}

async function generateCoverForOpp(oppId) {
  if (!currentUser) return;
  const opp = getOppById(oppId);
  const org = getOrg(opp?.orgId);
  const textarea = q('#apply-cover');
  if (!textarea) return;

  textarea.placeholder = '⏳ Generating cover letter with AI...';
  textarea.disabled = true;

  const cover = await generateCoverLetter(currentUser, opp, org);
  textarea.disabled = false;
  if (cover) {
    textarea.value = cover;
    showToast('Cover letter generated! Edit it to personalize.', 'success');
  } else {
    textarea.placeholder = 'Write your cover letter here...';
    showToast('AI unavailable. Please write manually.', 'error');
  }
}

function submitApplication(oppId) {
  if (!currentUser) return;
  const cover = q('#apply-cover')?.value?.trim();
  if (!cover || cover.length < 30) {
    showToast('Please write a cover letter (at least 30 characters)', 'error');
    return;
  }
  const result = applyToOpp(currentUser.id, oppId, cover);
  if (result.error) {
    showToast(result.error, 'error');
  } else {
    showToast('Application submitted!', 'success');
    closeModal('modal-detail');
    renderApplications();
    updateNotifBadge();
    renderNotifications();
  }
}

// ── APPLICATIONS ──
function renderApplications() {
  const container = q('#apps-list');
  if (!container) return;

  if (currentUser?.role === 'org') {
    renderOrgApplicants();
    return;
  }

  const apps = getApplications(currentUser?.id || '');
  if (!apps.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">No applications yet</div><div class="empty-sub">Browse opportunities and apply to start tracking</div><button class="btn btn-outline mt-1" onclick="switchPage('opportunities')">Browse Opportunities</button></div>`;
    return;
  }

  container.innerHTML = apps.map(app => {
    const opp = getOppById(app.oppId);
    const org = getOrg(opp?.orgId);
    return `
      <div class="card" style="padding:1.1rem;margin-bottom:0.75rem">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem">
          <div>
            <div style="font-family:'Syne',sans-serif;font-weight:700;margin-bottom:2px">${opp?.title || 'Opportunity'}</div>
            <div style="font-size:0.82rem;color:var(--text2)">${org?.name || ''} · ${opp?.location || ''}</div>
          </div>
          <span class="status-badge status-${app.status}"><span class="status-dot"></span>${app.status.charAt(0).toUpperCase()+app.status.slice(1)}</span>
        </div>
        <div class="opp-tags">
          <span class="tag tag-industry">${opp?.industry || ''}</span>
          <span class="tag tag-duration">⏱ ${opp?.duration || ''}</span>
        </div>
        <div class="divider"></div>
        <div style="font-size:0.78rem;color:var(--text3)">Applied: ${app.appliedDate}</div>
        ${app.status === 'pending' ? `<div style="margin-top:0.5rem;font-size:0.8rem;color:var(--warn)">⏳ Under review by ${org?.name || 'organization'}</div>` : ''}
        ${app.status === 'accepted' ? `<div style="margin-top:0.5rem;font-size:0.8rem;color:var(--success)">✅ Congratulations! You've been accepted. Check your email.</div>` : ''}
        ${app.status === 'rejected' ? `<div style="margin-top:0.5rem;font-size:0.8rem;color:var(--text3)">Application not successful this time. Keep trying!</div>` : ''}
      </div>`;
  }).join('');
}

// ── ORG DASHBOARD ──
function renderOrgDashboard() {
  renderOrgApplicants();
}

function renderOrgApplicants() {
  const container = q('#apps-list');
  if (!container || currentUser?.role !== 'org') return;

  const apps = getOrgApplications(currentUser.id);
  if (!apps.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">No applicants yet</div><div class="empty-sub">Post an opportunity to start receiving applications</div></div>`;
    return;
  }

  container.innerHTML = apps.map(app => {
    const opp = getOppById(app.oppId);
    const student = null; // simplified
    return `
      <div class="card" style="padding:1.1rem;margin-bottom:0.75rem">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem">
          <div>
            <div style="font-family:'Syne',sans-serif;font-weight:700;margin-bottom:2px">Applicant #${app.id.slice(-4).toUpperCase()}</div>
            <div style="font-size:0.82rem;color:var(--text2)">For: ${opp?.title || 'Position'}</div>
          </div>
          <span class="status-badge status-${app.status}"><span class="status-dot"></span>${app.status.charAt(0).toUpperCase()+app.status.slice(1)}</span>
        </div>
        <div style="background:var(--bg2);border-radius:8px;padding:0.75rem;margin-bottom:0.75rem;font-size:0.83rem;color:var(--text2);line-height:1.5;max-height:80px;overflow:hidden">${app.coverLetter}</div>
        <div style="font-size:0.75rem;color:var(--text3);margin-bottom:0.75rem">Applied: ${app.appliedDate}</div>
        ${app.status === 'pending' ? `
          <div style="display:flex;gap:0.5rem">
            <button class="btn btn-success btn-sm" style="flex:1" onclick="updateStatus('${app.id}','accepted')">✅ Accept</button>
            <button class="btn btn-danger btn-sm" style="flex:1" onclick="updateStatus('${app.id}','rejected')">✗ Reject</button>
          </div>` : ''}
      </div>`;
  }).join('');
}

function updateStatus(appId, status) {
  updateAppStatus(appId, status);
  addNotification({
    type: status,
    title: status === 'accepted' ? '🎉 Application Accepted' : 'Application Update',
    msg: `An application has been ${status}`,
    icon: status === 'accepted' ? '🎉' : '📋',
    color: status === 'accepted' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'
  });
  renderOrgApplicants();
  updateNotifBadge();
  showToast(`Application ${status}!`, status === 'accepted' ? 'success' : 'error');
}

// ── POST OPP ──
function handlePostOpp() {
  const title = q('#post-title')?.value?.trim();
  const desc = q('#post-desc')?.value?.trim();
  const industry = q('#post-industry')?.value;
  const location = q('#post-location')?.value?.trim();
  const duration = q('#post-duration')?.value;
  const slots = parseInt(q('#post-slots')?.value) || 1;
  const deadline = q('#post-deadline')?.value;
  const stipend = q('#post-stipend')?.value?.trim();
  const skills = q('#post-skills')?.value?.trim().split(',').map(s => s.trim()).filter(Boolean);
  const req = q('#post-req')?.value?.trim();

  if (!title || !desc || !location || !deadline) {
    showToast('Please fill all required fields', 'error'); return;
  }

  const opp = DB.push('opps', {
    orgId: currentUser.id,
    title, description: desc, requirements: req || '',
    industry, location, duration, slots, applied: 0,
    deadline, stipend, skills, status: 'open',
    postedDate: new Date().toISOString().slice(0, 10),
    postedBy: currentUser.id
  });

  closeModal('modal-post');
  clearPostForm();
  renderOpportunities();
  renderHome();
  showToast('Opportunity posted successfully!', 'success');
}

function clearPostForm() {
  ['#post-title','#post-desc','#post-location','#post-stipend','#post-skills','#post-req','#post-deadline'].forEach(s => {
    const el = q(s); if (el) el.value = '';
  });
}

// ── NOTIFICATIONS ──
function renderNotifications() {
  const container = q('#notifs-list');
  if (!container) return;
  const notifs = DB.get('notifications') || [];

  if (!notifs.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔔</div><div class="empty-title">No notifications</div><div class="empty-sub">You're all caught up!</div></div>`;
    return;
  }

  container.innerHTML = notifs.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}">
      <div class="notif-icon-wrap" style="background:${n.color || 'rgba(0,200,150,0.08)'}">${n.icon || '🔔'}</div>
      <div class="notif-body">
        <div class="notif-msg"><strong>${n.title}</strong><br>${n.msg}</div>
        <div class="notif-time">${n.time}</div>
      </div>
      ${!n.read ? '<div style="width:8px;height:8px;background:var(--accent);border-radius:50%;flex-shrink:0;margin-top:4px"></div>' : ''}
    </div>`).join('');

  markAllRead();
  updateNotifBadge();
}

function updateNotifBadge() {
  const count = getUnreadCount();
  const badge = q('.badge-dot');
  if (badge) badge.style.display = count > 0 ? 'block' : 'none';
}

// ── AI MATCH ──
async function handleAIMatch() {
  if (!currentUser || currentUser.role !== 'student') return;
  const btn = q('#btn-ai-match');
  if (!btn) return;

  const origText = btn.innerHTML;
  btn.innerHTML = '<div class="spinner"></div> Matching...';
  btn.disabled = true;

  const opps = getOpps();
  const matches = await getAIMatches(currentUser, opps);

  btn.innerHTML = origText;
  btn.disabled = false;

  if (!matches || !matches.length) {
    showToast('Complete your profile for better AI matches', 'error');
    return;
  }

  const container = q('#ai-matches-container');
  if (container) {
    container.innerHTML = `
      <div class="section-header"><div class="section-title">✦ Your AI Matches</div></div>
      ${matches.map(m => {
        const opp = getOppById(m.id);
        const org = getOrg(opp?.orgId);
        if (!opp) return '';
        return `
          <div class="ai-card" onclick="openOppDetail('${opp.id}')" style="cursor:pointer">
            <div class="ai-label">✦ ${m.score}% Match</div>
            <div class="ai-title">${opp.title}</div>
            <div style="font-size:0.82rem;color:var(--text2);margin-bottom:0.4rem">${org?.name} · ${opp.location}</div>
            <div class="ai-desc">${m.reason}</div>
          </div>`;
      }).join('')}`;
    container.scrollIntoView({ behavior: 'smooth' });
  }

  addNotification({ type: 'match', title: '✦ AI Matches Ready', msg: `Found ${matches.length} opportunities matching your profile`, icon: '🤖', color: 'rgba(0,200,150,0.1)' });
  updateNotifBadge();
  showToast('AI matches found!', 'success');
}

// ── PROFILE ──
function renderProfile() {
  if (!currentUser) return;
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  q('#profile-avatar-text').textContent = initials;
  q('#profile-name').textContent = currentUser.name;
  q('#profile-role-text').textContent = currentUser.role === 'student'
    ? `${currentUser.course || 'Student'} · ${currentUser.university || 'University'}`
    : `${currentUser.orgType || 'Organization'} · ${currentUser.location || ''}`;

  const skillsContainer = q('#profile-skills');
  if (skillsContainer) {
    const skills = currentUser.skills || [];
    skillsContainer.innerHTML = skills.length
      ? skills.map(s => `<span class="skill-tag">${s}</span>`).join('')
      : '<span style="font-size:0.82rem;color:var(--text3)">No skills added yet</span>';
  }

  const infoContainer = q('#profile-info');
  if (infoContainer) {
    if (currentUser.role === 'student') {
      infoContainer.innerHTML = `
        <div class="profile-section">
          <div class="profile-section-title">📚 Academic</div>
          <div style="font-size:0.9rem;line-height:1.8">
            <div><span style="color:var(--text3)">Course: </span>${currentUser.course || '—'}</div>
            <div><span style="color:var(--text3)">University: </span>${currentUser.university || '—'}</div>
            <div><span style="color:var(--text3)">Year: </span>${currentUser.year || '—'}</div>
          </div>
        </div>
        <div class="profile-section">
          <div class="profile-section-title">📍 Preferences</div>
          <div style="font-size:0.9rem;line-height:1.8">
            <div><span style="color:var(--text3)">Location: </span>${currentUser.location || '—'}</div>
            <div><span style="color:var(--text3)">Interests: </span>${currentUser.interests || '—'}</div>
          </div>
        </div>`;
    } else {
      infoContainer.innerHTML = `
        <div class="profile-section">
          <div class="profile-section-title">🏢 Organization</div>
          <div style="font-size:0.9rem;line-height:1.8">
            <div><span style="color:var(--text3)">Type: </span>${currentUser.orgType || '—'}</div>
            <div><span style="color:var(--text3)">Location: </span>${currentUser.location || '—'}</div>
            <div><span style="color:var(--text3)">Contact: </span>${currentUser.email || '—'}</div>
          </div>
        </div>`;
    }
  }

  // Pre-fill profile edit form
  q('#edit-name').value = currentUser.name || '';
  q('#edit-email').value = currentUser.email || '';
  if (currentUser.role === 'student') {
    q('#edit-course').value = currentUser.course || '';
    q('#edit-university').value = currentUser.university || '';
    q('#edit-year').value = currentUser.year || '';
    q('#edit-skills').value = (currentUser.skills || []).join(', ');
    q('#edit-interests').value = currentUser.interests || '';
    q('#edit-location').value = currentUser.location || '';
  }
}

function handleSaveProfile() {
  if (!currentUser) return;
  currentUser.name = q('#edit-name').value.trim() || currentUser.name;
  currentUser.email = q('#edit-email').value.trim() || currentUser.email;
  if (currentUser.role === 'student') {
    currentUser.course = q('#edit-course').value.trim();
    currentUser.university = q('#edit-university').value.trim();
    currentUser.year = q('#edit-year').value;
    currentUser.skills = q('#edit-skills').value.split(',').map(s => s.trim()).filter(Boolean);
    currentUser.interests = q('#edit-interests').value.trim();
    currentUser.location = q('#edit-location').value.trim();
  }
  login(currentUser);
  renderProfile();
  renderHeader();
  closeModal('modal-profile');
  showToast('Profile saved!', 'success');
}

// ── AUTH ──
function toggleAuthForms() {
  const isReg = authMode === 'register';
  q('#auth-register-fields')?.classList.toggle('hidden', !isReg);
  q('#btn-auth-submit').textContent = isReg ? 'Create Account' : 'Sign In';
}

function toggleRoleFields() {
  const isOrg = selectedRole === 'org';
  q('#student-fields')?.classList.toggle('hidden', isOrg);
  q('#org-fields')?.classList.toggle('hidden', !isOrg);
}

function handleAuth() {
  const email = q('#auth-email')?.value?.trim();
  const password = q('#auth-password')?.value;
  const name = q('#auth-name')?.value?.trim();

  if (!email || !password) { showToast('Please enter email and password', 'error'); return; }

  if (authMode === 'login') {
    const users = DB.get('users') || [];
    const user = users.find(u => u.email === email);
    if (!user) { showToast('Account not found. Please register.', 'error'); return; }
    if (user.password !== btoa(password)) { showToast('Wrong password', 'error'); return; }
    showApp(user);
  } else {
    if (!name) { showToast('Please enter your name', 'error'); return; }
    const users = DB.get('users') || [];
    if (users.find(u => u.email === email)) { showToast('Email already registered', 'error'); return; }

    const user = {
      id: 'u_' + Date.now().toString(36),
      name, email, password: btoa(password),
      role: selectedRole,
      skills: selectedRole === 'student' ? [] : undefined,
      course: selectedRole === 'student' ? (q('#auth-course')?.value || '') : undefined,
      university: selectedRole === 'student' ? (q('#auth-university')?.value || '') : undefined,
      orgType: selectedRole === 'org' ? (q('#auth-org-type')?.value || '') : undefined,
      location: q('#auth-location')?.value || 'Nairobi',
      joinedDate: new Date().toLocaleDateString('en-KE')
    };

    DB.push('users', user);
    showApp(user);
    showToast(`Welcome to AttachMate, ${name.split(' ')[0]}!`, 'success');
  }
}

function demoLogin(role) {
  const demos = {
    student: {
      id: 'demo_student',
      name: 'Amara Ochieng',
      email: 'amara@demo.com',
      role: 'student',
      course: 'Computer Science',
      university: 'University of Nairobi',
      year: '3rd Year',
      skills: ['Python', 'JavaScript', 'Data Analysis', 'Git'],
      interests: 'Software Engineering, FinTech, AI',
      location: 'Nairobi',
      joinedDate: 'July 2025'
    },
    org: {
      id: 'demo_org',
      name: 'James Kariuki',
      email: 'james@techcorp.co.ke',
      role: 'org',
      orgType: 'Technology Company',
      location: 'Nairobi',
      joinedDate: 'July 2025'
    }
  };
  showApp(demos[role]);
}

function handleLogout() {
  logout();
  showScreen('splash');
  showToast('Signed out', 'success');
}

// ── MODAL ──
function openModal(id) {
  q(`#${id}`)?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  q(`#${id}`)?.classList.remove('open');
  document.body.style.overflow = '';
}

// ── PAGE SWITCH ──
function switchPage(name) {
  qs('.page').forEach(p => p.classList.remove('active'));
  q(`#page-${name}`)?.classList.add('active');

  qs('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === name);
  });

  if (name === 'notifications') renderNotifications();
  if (name === 'applications') renderApplications();
  if (name === 'home') renderHome();
}

// ── TOAST ──
function showToast(msg, type = '') {
  const container = q('#toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Expose globals for inline onclick
window.openOppDetail = openOppDetail;
window.submitApplication = submitApplication;
window.generateCoverForOpp = generateCoverForOpp;
window.updateStatus = updateStatus;
window.switchPage = switchPage;
window.handleAIMatch = handleAIMatch;
