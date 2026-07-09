// ══════════════════════════════════════════════════
//  THEME (light / dark)
// ══════════════════════════════════════════════════
function setTheme(mode) {
  document.body.classList.toggle('theme-light', mode === 'light');
  localStorage.setItem('theme', mode);
  updateThemeButtons();
  reapplyAccentColor(); // accent-dim differs between light/dark, recompute for new theme
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
//  ACCENT COLOUR (user-selectable brand colour)
// ══════════════════════════════════════════════════
const ACCENT_PRESETS = [
  { name: 'Purple', hex: '#7c5cff' },
  { name: 'Blue',   hex: '#3b82f6' },
  { name: 'Cyan',   hex: '#06b6d4' },
  { name: 'Green',  hex: '#10b981' },
  { name: 'Amber',  hex: '#f59e0b' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Red',    hex: '#ef4444' },
  { name: 'Slate',  hex: '#64748b' },
];

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function mixHex(hex, withHex, weight) {
  const c1 = hexToRgb(hex), c2 = hexToRgb(withHex);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * weight,
    c1.g + (c2.g - c1.g) * weight,
    c1.b + (c2.b - c1.b) * weight
  );
}

function applyAccentColor(hex, persist = true) {
  const { r, g, b } = hexToRgb(hex);
  const isLight = document.body.classList.contains('theme-light');
  const light = mixHex(hex, '#ffffff', 0.32);
  const dim = isLight ? mixHex(hex, '#ffffff', 0.68) : mixHex(hex, '#000000', 0.45);
  const glow = `rgba(${r},${g},${b},0.14)`;

  document.body.style.setProperty('--accent', hex);
  document.body.style.setProperty('--accent-light', light);
  document.body.style.setProperty('--accent-dim', dim);
  document.body.style.setProperty('--accent-glow', glow);

  if (persist) localStorage.setItem('accentColor', hex);
  updateAccentSwatches(hex);
}

function setAccentColor(hex) {
  applyAccentColor(hex, true);
}

function reapplyAccentColor() {
  const hex = localStorage.getItem('accentColor') || ACCENT_PRESETS[0].hex;
  applyAccentColor(hex, false);
}

function renderAccentSwatches() {
  const row = document.getElementById('accentSwatchRow');
  if (!row) return;
  const current = localStorage.getItem('accentColor') || ACCENT_PRESETS[0].hex;
  row.innerHTML = ACCENT_PRESETS.map(p =>
    `<button type="button" class="accent-swatch${p.hex.toLowerCase() === current.toLowerCase() ? ' active' : ''}" style="background:${p.hex}" title="${p.name}" data-hex="${p.hex}" onclick="setAccentColor('${p.hex}')"></button>`
  ).join('');
  const customPicker = document.getElementById('accentCustomPicker');
  if (customPicker) customPicker.value = current;
}

function updateAccentSwatches(hex) {
  const row = document.getElementById('accentSwatchRow');
  if (!row) return;
  row.querySelectorAll('.accent-swatch').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.hex.toLowerCase() === hex.toLowerCase());
  });
  const customPicker = document.getElementById('accentCustomPicker');
  if (customPicker) customPicker.value = hex;
}

// Apply saved accent colour immediately on load (before first paint of themed content)
reapplyAccentColor();

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

  const avatarEl = document.getElementById('profileAvatar');
  const photoURL = currentUser && currentUser.photoURL;
  if (photoURL) {
    // Signed in with Google (or another provider that supplies a photo) — show it.
    avatarEl.innerHTML = `<img src="${escHtml(photoURL)}" alt="Profile photo" referrerpolicy="no-referrer" onerror="this.parentElement.textContent='${initial}';">`;
  } else {
    avatarEl.textContent = initial;
  }

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
  renderAccentSwatches();
  renderCloudAuthSection();
  }


// ══════════════════════════════════════════════════
//  CLOUD AUTH (Google + Email/Password)
// ══════════════════════════════════════════════════
function showLoginModal() {
  openModal('Sign In', `
    <div class="profile-section">
      <button class="btn btn-solid" style="width:100%;margin-bottom:1rem;" onclick="signInWithGoogle()">
        <i class="bi bi-google"></i> Continue with Google
      </button>
      <div style="text-align:center;color:var(--text-secondary);font-size:0.75rem;margin:0.75rem 0;">— or use email —</div>
      <div class="edit-form-field">
        <label class="edit-form-label">Email</label>
        <input type="email" id="authEmailInput" class="edit-form-input" placeholder="you@example.com">
      </div>
      <div class="edit-form-field">
        <label class="edit-form-label">Password</label>
        <input type="password" id="authPasswordInput" class="edit-form-input" placeholder="••••••••">
      </div>
    </div>
  `);
  setModalFooter([
    { label: 'Cancel', cls: 'btn-ghost', fn: 'closeModal()' },
    { label: 'Create Account', cls: 'btn-ghost', fn: 'signUpWithEmail()' },
    { label: 'Sign In', cls: 'btn-solid', fn: 'signInWithEmailPassword()' },
  ]);
}

async function signInWithGoogle() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    closeModal();
    toast('✓ Signed in with Google');
  } catch (err) {
    toast(err.message || 'Google sign-in failed');
  }
}

async function signInWithEmailPassword() {
  const email = document.getElementById('authEmailInput').value.trim();
  const password = document.getElementById('authPasswordInput').value;
  if (!email || !password) { toast('Enter email and password'); return; }
  try {
    await auth.signInWithEmailAndPassword(email, password);
    closeModal();
    toast('✓ Signed in');
  } catch (err) {
    toast(err.message || 'Sign-in failed');
  }
}

async function signUpWithEmail() {
  const email = document.getElementById('authEmailInput').value.trim();
  const password = document.getElementById('authPasswordInput').value;
  if (!email || !password) { toast('Enter email and password'); return; }
  if (password.length < 6) { toast('Password must be at least 6 characters'); return; }
  try {
    await auth.createUserWithEmailAndPassword(email, password);
    closeModal();
    toast('✓ Account created');
  } catch (err) {
    toast(err.message || 'Sign-up failed');
  }
}

async function signOutUser() {
  await auth.signOut();
  toast('Signed out');
  renderAccountPage();
}

function renderCloudAuthSection() {
  const el = document.getElementById('cloudAuthSection');
  if (!el) return;

  if (!currentUser) {
    el.innerHTML = `
      <div class="account-label"><i class="bi bi-cloud-fill"></i> Cloud Sync</div>
      <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.75rem;">
        Sign in to back up your data to the cloud and restore it on any device.
      </p>
      <div class="account-actions">
        <button class="btn btn-solid btn-sm" onclick="showLoginModal()"><i class="bi bi-box-arrow-in-right"></i> Sign In</button>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="account-label"><i class="bi bi-cloud-check-fill"></i> Cloud Sync</div>
      <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.75rem;">
        Signed in as <strong>${escHtml(currentUser.email || currentUser.displayName || 'account')}</strong>
      </p>
      <div class="account-actions">
        <button class="btn btn-solid btn-sm" onclick="backupToCloud()"><i class="bi bi-cloud-arrow-up-fill"></i> Backup to Cloud</button>
        <button class="btn btn-ghost btn-sm" onclick="restoreFromCloud()"><i class="bi bi-cloud-arrow-down-fill"></i> Restore from Cloud</button>
        <button class="btn btn-ghost btn-sm" onclick="signOutUser()"><i class="bi bi-box-arrow-right"></i> Sign Out</button>
      </div>`;
  }
}