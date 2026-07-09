// ══════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════
let currentSection = 'dashboard';

function renderNavTabs() {
  const nav = document.getElementById('navTabs');
  const stageTabs = state.stages.map(stage => {
    const def = STAGE_TYPES[stage.type] || STAGE_TYPES.custom;
    return `<button class="nav-tab" data-section="stage:${stage.id}" onclick="showSection('stage:${stage.id}')">${def.icon} ${escHtml(stageLabel(stage))}</button>`;
  }).join('');

  nav.innerHTML = `
    <button class="nav-tab" data-section="dashboard" onclick="showSection('dashboard')"><i class="bi bi-grid-1x2-fill"></i> Overview</button>
    ${stageTabs}
    <button class="nav-tab" data-section="charts" onclick="showSection('charts')"><i class="bi bi-graph-up-arrow"></i> Charts</button>
    <button class="nav-tab" data-section="stats" onclick="showSection('stats')"><i class="bi bi-bar-chart-line-fill"></i> Statistics</button>
    <button class="nav-tab nav-tab-add" data-section="add" onclick="showSection('add')"><i class="bi bi-plus-lg"></i> Stage</button>
  `;
  highlightActiveTab();
}

function highlightActiveTab() {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const el = document.querySelector(`.nav-tab[data-section="${currentSection}"]`);
  if (el) el.classList.add('active');
}

function showSection(name) {
  currentSection = name;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  highlightActiveTab();

  if (name === 'dashboard') {
    document.getElementById('section-dashboard').classList.add('active');
    renderDashboard();
    highlightBottomNav('dashboard');
  } else if (name === 'charts') {
    document.getElementById('section-charts').classList.add('active');
    renderCharts();
    highlightBottomNav('stages');
  } else if (name === 'stats') {
    document.getElementById('section-stats').classList.add('active');
    renderStatsPage();
    highlightBottomNav('stats');
  } else if (name === 'stages') {
    document.getElementById('section-stages').classList.add('active');
    renderStagesPage();
    highlightBottomNav('stages');
  } else if (name === 'add') {
    document.getElementById('section-add').classList.add('active');
    renderAddStagePage();
    highlightBottomNav('add');
  } else if (name === 'account') {
    document.getElementById('section-account').classList.add('active');
    renderAccountPage();
    highlightBottomNav('account');
  } else if (name.startsWith('stage:')) {
    const stageId = name.slice(6);
    document.getElementById('section-stage').classList.add('active');
    renderStageView(stageId);
    highlightBottomNav('stages');
  }

  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function highlightBottomNav(tab) {
  document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
  const el = document.querySelector(`.bottom-nav-item[data-tab="${tab}"]`);
  if (el) el.classList.add('active');
}

function renderStagesPage() {
  const wrap = document.getElementById('stages-page-cards');
  if (!state.stages.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="bi bi-journal-bookmark"></i></div><div class="empty-state-text">No stages yet</div><div class="empty-state-sub">Tap "Add" below to create your first stage</div></div>`;
    return;
  }
  wrap.innerHTML = state.stages.map((stage, i) => {
    const def = STAGE_TYPES[stage.type] || STAGE_TYPES.custom;
    if (stage.mode === 'cet') {
      const c = stage.cet || {};
      return `
      <div class="stage-card" onclick="showSection('stage:${stage.id}')">
        <div class="stage-card-label">Stage ${i + 1}</div>
        <div class="stage-card-name">${def.icon} ${escHtml(stageLabel(stage))}</div>
        <div class="stage-card-pct">${c.rank ? '#' + escHtml(String(c.rank)) : '—'}</div>
        <div class="stage-card-meta">${c.conversion ? fmt2(c.conversion) + '/100 conversion' : 'No details yet'}</div>
      </div>`;
    }
    const subs = stageSubjects(stage.id);
    const avg = stageAvg(subs);
    return `
    <div class="stage-card" onclick="showSection('stage:${stage.id}')">
      <div class="stage-card-label">Stage ${i + 1}</div>
      <div class="stage-card-name">${def.icon} ${escHtml(stageLabel(stage))}</div>
      <div class="stage-card-pct">${avg}%</div>
      <div class="stage-card-meta">${subs.length} subject${subs.length !== 1 ? 's' : ''} · ${stage.mode === 'annual' ? 'Annual' : stage.terms.length + ' semesters'}</div>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${avg}%"></div></div>
    </div>`;
  }).join('');
}

function refreshSection(name) { showSection(name); }
