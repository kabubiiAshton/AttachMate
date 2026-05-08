// ── AttachMate Data Layer ──
// Uses localStorage as the persistent database

const DB = {
  get(key) { try { return JSON.parse(localStorage.getItem('am_' + key)); } catch { return null; } },
  set(key, val) { localStorage.setItem('am_' + key, JSON.stringify(val)); },
  push(key, item) {
    const arr = this.get(key) || [];
    item.id = item.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    arr.unshift(item);
    this.set(key, arr);
    return item;
  }
};

// ── Seed Data ──
const SEED_ORGS = [
  { id: 'org1', name: 'Safaricom PLC', logo: '📱', industry: 'Technology', location: 'Nairobi', about: 'Kenya\'s leading telco and technology company', contact: 'internships@safaricom.co.ke' },
  { id: 'org2', name: 'KCB Bank', logo: '🏦', industry: 'Finance', location: 'Nairobi', about: 'Pan-African bank with presence in 7 countries', contact: 'talent@kcb.co.ke' },
  { id: 'org3', name: 'Aga Khan Hospital', logo: '🏥', industry: 'Healthcare', location: 'Nairobi', about: 'World-class tertiary hospital', contact: 'hr@agakhanhospitals.org' },
  { id: 'org4', name: 'Deloitte Kenya', logo: '📊', industry: 'Consulting', location: 'Nairobi', about: 'Global professional services firm', contact: 'attach@deloitte.co.ke' },
  { id: 'org5', name: 'Nation Media Group', logo: '📰', industry: 'Media', location: 'Nairobi', about: 'Leading media company in East Africa', contact: 'interns@nation.co.ke' },
  { id: 'org6', name: 'Kenya Power', logo: '⚡', industry: 'Engineering', location: 'Nairobi', about: 'National electricity distribution company', contact: 'hr@kplc.co.ke' },
  { id: 'org7', name: 'Equity Bank', logo: '💳', industry: 'Finance', location: 'Kisumu', about: 'Financial inclusion-focused bank', contact: 'interns@equitybank.co.ke' },
  { id: 'org8', name: 'Twiga Foods', logo: '🥬', industry: 'AgriTech', location: 'Nairobi', about: 'B2B food distribution platform', contact: 'talent@twiga.com' },
];

const SEED_OPPS = [
  {
    id: 'opp1', orgId: 'org1', title: 'Software Engineering Attachment',
    description: 'Join our engineering team to work on mobile money systems, APIs, and cloud infrastructure. You\'ll contribute to real production code used by millions of Kenyans.',
    requirements: 'Computer Science, Software Engineering or related field. Knowledge of Python or Java a plus.',
    industry: 'Technology', location: 'Nairobi', duration: '3 months',
    slots: 5, applied: 12, deadline: '2025-08-15', stipend: 'KES 15,000/month',
    skills: ['Python', 'Java', 'APIs', 'Git'], status: 'open', postedDate: '2025-07-01'
  },
  {
    id: 'opp2', orgId: 'org2', title: 'Finance & Credit Risk Intern',
    description: 'Work with our credit team to analyze loan portfolios, build financial models, and assist in risk assessment for SME lending.',
    requirements: 'Finance, Accounting, or Economics degree. Strong Excel skills required.',
    industry: 'Finance', location: 'Nairobi', duration: '6 months',
    slots: 3, applied: 8, deadline: '2025-07-30', stipend: 'KES 12,000/month',
    skills: ['Excel', 'Financial Modelling', 'Data Analysis'], status: 'open', postedDate: '2025-07-02'
  },
  {
    id: 'opp3', orgId: 'org3', title: 'Clinical Medicine Placement',
    description: 'A comprehensive clinical attachment across multiple departments including internal medicine, surgery, pediatrics, and emergency care.',
    requirements: 'Medical or Clinical students in their 4th year or above.',
    industry: 'Healthcare', location: 'Nairobi', duration: '2 months',
    slots: 10, applied: 34, deadline: '2025-08-01', stipend: 'Non-stipendiary',
    skills: ['Clinical Skills', 'Patient Care', 'Medical Documentation'], status: 'open', postedDate: '2025-07-03'
  },
  {
    id: 'opp4', orgId: 'org4', title: 'Audit & Assurance Trainee',
    description: 'Support senior auditors in financial statement audits for listed companies. Gain exposure to IFRS and ISA standards.',
    requirements: 'Accounting or Finance degree. CPA Part 1 an advantage.',
    industry: 'Consulting', location: 'Nairobi', duration: '3 months',
    slots: 4, applied: 19, deadline: '2025-08-20', stipend: 'KES 10,000/month',
    skills: ['Auditing', 'Accounting', 'Excel', 'Communication'], status: 'open', postedDate: '2025-07-04'
  },
  {
    id: 'opp5', orgId: 'org5', title: 'Digital Journalism Intern',
    description: 'Write stories, produce video content, and manage social media for our digital platforms reaching 4M+ monthly users.',
    requirements: 'Journalism, Communication, or Media Studies student.',
    industry: 'Media', location: 'Nairobi', duration: '3 months',
    slots: 2, applied: 7, deadline: '2025-07-25', stipend: 'KES 8,000/month',
    skills: ['Writing', 'Social Media', 'Photography', 'Video Editing'], status: 'open', postedDate: '2025-07-05'
  },
  {
    id: 'opp6', orgId: 'org6', title: 'Electrical Engineering Attachment',
    description: 'Field attachment covering grid maintenance, fault diagnostics, and new installations across distribution zones.',
    requirements: 'Electrical or Electronic Engineering student, Year 3+.',
    industry: 'Engineering', location: 'Nairobi', duration: '3 months',
    slots: 8, applied: 21, deadline: '2025-09-01', stipend: 'KES 9,000/month',
    skills: ['Electrical Systems', 'AutoCAD', 'Safety Procedures'], status: 'open', postedDate: '2025-07-06'
  },
  {
    id: 'opp7', orgId: 'org7', title: 'Banking Operations Trainee',
    description: 'Rotation across retail banking, customer service, teller operations, and back-office processing in Kisumu branches.',
    requirements: 'Business, Finance, or Economics student.',
    industry: 'Finance', location: 'Kisumu', duration: '3 months',
    slots: 6, applied: 5, deadline: '2025-08-10', stipend: 'KES 7,000/month',
    skills: ['Customer Service', 'Banking Operations', 'Communication'], status: 'open', postedDate: '2025-07-07'
  },
  {
    id: 'opp8', orgId: 'org8', title: 'Data & Product Intern',
    description: 'Analyze supply chain data, build dashboards, and work with the product team on features that impact thousands of vendors.',
    requirements: 'Statistics, Computer Science, or Business Analytics student.',
    industry: 'AgriTech', location: 'Nairobi', duration: '4 months',
    slots: 2, applied: 11, deadline: '2025-08-05', stipend: 'KES 18,000/month',
    skills: ['SQL', 'Python', 'Data Visualization', 'Product Thinking'], status: 'open', postedDate: '2025-07-08'
  },
];

function seedIfEmpty() {
  if (!DB.get('seeded')) {
    DB.set('orgs', SEED_ORGS);
    DB.set('opps', SEED_OPPS);
    DB.set('notifications', [
      { id: 'n1', type: 'match', title: 'New AI Match!', msg: 'We found 3 opportunities matching your profile', time: '2h ago', read: false, icon: '🤖', color: 'rgba(0,200,150,0.1)' },
      { id: 'n2', type: 'info', title: 'Welcome to AttachMate!', msg: 'Complete your profile to get better matches', time: '1d ago', read: false, icon: '🎉', color: 'rgba(0,168,255,0.1)' },
    ]);
    DB.set('seeded', true);
  }
}

function getOpps(filter = {}) {
  let opps = DB.get('opps') || SEED_OPPS;
  if (filter.industry && filter.industry !== 'all') {
    opps = opps.filter(o => o.industry.toLowerCase() === filter.industry.toLowerCase());
  }
  if (filter.query) {
    const q = filter.query.toLowerCase();
    opps = opps.filter(o =>
      o.title.toLowerCase().includes(q) ||
      o.description.toLowerCase().includes(q) ||
      getOrg(o.orgId)?.name.toLowerCase().includes(q)
    );
  }
  if (filter.location && filter.location !== 'all') {
    opps = opps.filter(o => o.location.toLowerCase() === filter.location.toLowerCase());
  }
  return opps;
}

function getOrg(orgId) {
  const orgs = DB.get('orgs') || SEED_ORGS;
  return orgs.find(o => o.id === orgId);
}

function getApplications(userId) {
  const apps = DB.get('applications') || [];
  return apps.filter(a => a.userId === userId);
}

function getOrgApplications(orgId) {
  const apps = DB.get('applications') || [];
  const orgOpps = (DB.get('opps') || []).filter(o => o.orgId === orgId).map(o => o.id);
  return apps.filter(a => orgOpps.includes(a.oppId));
}

function applyToOpp(userId, oppId, coverLetter) {
  const apps = DB.get('applications') || [];
  const already = apps.find(a => a.userId === userId && a.oppId === oppId);
  if (already) return { error: 'Already applied' };
  const app = DB.push('applications', {
    userId, oppId, coverLetter,
    status: 'pending',
    appliedDate: new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
  });
  addNotification({
    type: 'apply',
    title: 'Application Submitted!',
    msg: `Your application for "${getOppById(oppId)?.title}" is under review`,
    icon: '📨',
    color: 'rgba(0,168,255,0.1)'
  });
  return app;
}

function getOppById(oppId) {
  return (DB.get('opps') || SEED_OPPS).find(o => o.id === oppId);
}

function updateAppStatus(appId, status) {
  const apps = DB.get('applications') || [];
  const idx = apps.findIndex(a => a.id === appId);
  if (idx >= 0) { apps[idx].status = status; DB.set('applications', apps); }
}

function addNotification(n) {
  n.time = 'Just now';
  n.read = false;
  DB.push('notifications', n);
}

function getUnreadCount() {
  return (DB.get('notifications') || []).filter(n => !n.read).length;
}

function markAllRead() {
  const notifs = DB.get('notifications') || [];
  notifs.forEach(n => n.read = true);
  DB.set('notifications', notifs);
}

// Current session user
let currentUser = null;

function login(userData) {
  currentUser = userData;
  DB.set('currentUser', userData);
}

function logout() {
  currentUser = null;
  DB.set('currentUser', null);
}

function loadSession() {
  currentUser = DB.get('currentUser');
  return currentUser;
}
