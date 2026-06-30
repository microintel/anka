// ══════════════════════════════════════════════════
//  THEME (light / dark)
// ══════════════════════════════════════════════════
function setTheme(mode) {
  document.body.classList.toggle('theme-light', mode === 'light');
  localStorage.setItem('theme', mode);
  updateThemeButtons();
  if (typeof renderCharts === 'function' && currentSection === 'charts') renderCharts();
  if (typeof renderDashCharts === 'function' && currentSection === 'dashboard') renderDashCharts();
}

function updateThemeButtons() {
  const mode = localStorage.getItem('theme') || 'dark';
  const lb = document.getElementById('themeLightBtn');
  const db = document.getElementById('themeDarkBtn');
  if (lb && db) {
    lb.classList.toggle('active', mode === 'light');
    db.classList.toggle('active', mode === 'dark');
  }
}

// ══════════════════════════════════════════════════
//  USER PROFILE / ACCOUNT PAGE  (name + email only — no photo stored)
// ══════════════════════════════════════════════════
let userProfile = {
  name: localStorage.getItem('userName') || 'User',
  email: localStorage.getItem('userEmail') || 'user@example.com',
  createdDate: localStorage.getItem('userCreatedDate') || new Date().toLocaleDateString('en-IN'),
};
if (!localStorage.getItem('userCreatedAt')) {
  localStorage.setItem('userCreatedAt', new Date().toISOString());
}
if (!localStorage.getItem('userCreatedDate')) {
  localStorage.setItem('userCreatedDate', userProfile.createdDate);
}

function saveUserProfile(name, email) {
  userProfile.name = name;
  userProfile.email = email;
  localStorage.setItem('userName', name);
  localStorage.setItem('userEmail', email);
  if (!localStorage.getItem('userCreatedDate')) {
    userProfile.createdDate = new Date().toLocaleDateString('en-IN');
    localStorage.setItem('userCreatedDate', userProfile.createdDate);
  }
  localStorage.setItem('userLastUpdated', new Date().toISOString());
}

function toggleProfileEdit(isEdit) {
  const viewMode = document.getElementById('profileView');
  const editMode = document.getElementById('profileEditForm');
  const editBtn = document.getElementById('editBtn');
  const doneBtn = document.getElementById('doneBtn');

  if (isEdit) {
    viewMode.classList.add('hidden');
    editMode.classList.add('active');
    editBtn.style.display = 'none';
    doneBtn.style.display = 'inline-flex';

    document.getElementById('editNameInput').value = userProfile.name;
    document.getElementById('editEmailInput').value = userProfile.email;
  } else {
    viewMode.classList.remove('hidden');
    editMode.classList.remove('active');
    editBtn.style.display = 'inline-flex';
    doneBtn.style.display = 'none';
  }
}

function saveProfileChanges() {
  const newName = document.getElementById('editNameInput').value.trim();
  const newEmail = document.getElementById('editEmailInput').value.trim();

  if (!newName) {
    toast('Please enter your name');
    return;
  }

  if (!newEmail || !newEmail.includes('@')) {
    toast('Please enter a valid email');
    return;
  }

  saveUserProfile(newName, newEmail);

  renderAccountPage();
  toggleProfileEdit(false);
  toast('✓ Profile updated successfully!');
}

function memberSinceText() {
  const createdAt = localStorage.getItem('userCreatedAt');
  if (!createdAt) return '—';
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} mo`;
  return `${Math.floor(days / 365)} yr ${Math.floor((days % 365) / 30)} mo`;
}

function bestStageText() {
  if (!state.stages.length) return '—';
  let best = null, bestAvg = -1;
  state.stages.forEach(s => {
    const avg = stageAvg(stageSubjects(s.id));
    if (avg > bestAvg) { bestAvg = avg; best = s; }
  });
  return best ? `${stageLabel(best)} · ${bestAvg}%` : '—';
}

function lastActiveText() {
  const ts = localStorage.getItem('userLastUpdated');
  if (!ts) return 'Just now';
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function renderAccountHighlight() {
  const el = document.getElementById('accountHighlight');
  if (!el) return;
  el.innerHTML = `
    <div class="ahc-item">
      <div class="ahc-label"><i class="bi bi-calendar-heart"></i> Member For</div>
      <div class="ahc-value">${memberSinceText()}</div>
    </div>
    <div class="ahc-item">
      <div class="ahc-label"><i class="bi bi-trophy"></i> Best Stage</div>
      <div class="ahc-value accent">${escHtml(bestStageText())}</div>
    </div>
    <div class="ahc-item">
      <div class="ahc-label"><i class="bi bi-clock-history"></i> Last Updated</div>
      <div class="ahc-value">${lastActiveText()}</div>
    </div>`;
}

function renderAccountPage() {
  const initial = (userProfile.name || 'U')[0].toUpperCase();

  document.getElementById('profileAvatar').textContent = initial;
  document.getElementById('profileName').textContent = userProfile.name || 'User';
  document.getElementById('profileEmail').textContent = userProfile.email || 'user@example.com';
  document.getElementById('profileDate').textContent = 'Member since ' + userProfile.createdDate;

  document.getElementById('statStages').textContent = state.stages.length || '0';
  document.getElementById('statSubjects').textContent = state.subjects.length || '0';
  document.getElementById('statOverall').textContent = state.subjects.length
    ? stageAvg(state.subjects.filter(s => s.subjectType !== 'audit')) + '%'
    : '0%';

  renderAccountHighlight();
  updateThemeButtons();
}
