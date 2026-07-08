// ══════════════════════════════════════════════════
//  EXPORT / IMPORT
// ══════════════════════════════════════════════════
function exportJSON() {
  const data = {
    stages: state.stages,
    subjects: state.subjects,
    profile: {
      name: userProfile.name,
      email: userProfile.email,
      createdDate: userProfile.createdDate,
    },
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `anka_backup_${(userProfile.name || 'user').replace(/\s+/g, '_')}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✓ Backup exported');
}

async function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data.stages) || !Array.isArray(data.subjects)) {
      throw new Error('Invalid backup format');
    }
    window.pendingImportData = data;

    const profileInfo = data.profile
      ? `<br><br><strong>Profile:</strong><br><i class="bi bi-person-circle"></i> ${escHtml(data.profile.name || 'User')}`
      : '';

    openModal('Restore Backup', `
      <div class="confirm-box">
        <div class="modal-title" style="text-align:center;border:none;margin-bottom:0.5rem;">Restore this backup?</div>
        <p class="confirm-msg">This will replace all current data with ${data.stages.length} stage(s) and ${data.subjects.length} subject(s).${profileInfo}</p>
      </div>
    `);
    setModalFooter([
      { label: 'Cancel', cls: 'btn-ghost', fn: 'closeModal()' },
      { label: 'Restore', cls: 'btn-danger', fn: 'confirmImport()' },
    ]);
  } catch (err) {
    toast('Invalid backup file');
  }
  event.target.value = '';
}

async function confirmImport() {
  const data = window.pendingImportData;
  if (!data) return;

  // Clear existing
  for (const s of state.stages) await dbDelete('stages', s.id);
  for (const s of state.subjects) await dbDelete('subjects', s.id);

  state.stages = data.stages;
  state.subjects = data.subjects;
  for (const s of state.stages) await dbPut('stages', s);
  for (const s of state.subjects) await dbPut('subjects', s);

  if (data.profile) {
    saveUserProfile(data.profile.name || 'User', data.profile.email || '');
  }

  closeModal();
  renderNavTabs();
  showSection('dashboard');
  toast('✓ Backup restored');
}



// ══════════════════════════════════════════════════
//  CLOUD BACKUP / RESTORE (Firestore)
// ══════════════════════════════════════════════════
async function backupToCloud() {
  if (!currentUser) { toast('Sign in first'); return; }
  try {
    await firestoreDB.collection('users').doc(currentUser.uid).set({
      stages: state.stages,
      subjects: state.subjects,
      profile: {
        name: userProfile.name,
        email: userProfile.email,
        createdDate: userProfile.createdDate,
      },
      updatedAt: new Date().toISOString(),
    });
    toast('✓ Backup saved to cloud');
  } catch (err) {
    toast('Cloud backup failed: ' + (err.message || err));
  }
}

async function restoreFromCloud(silent) {
  if (!currentUser) { if (!silent) toast('Sign in first'); return; }
  try {
    const doc = await firestoreDB.collection('users').doc(currentUser.uid).get();
    if (!doc.exists) { if (!silent) toast('No cloud backup found'); return; }

    const data = doc.data();
    if (!Array.isArray(data.stages) || !Array.isArray(data.subjects)) {
      if (!silent) toast('Cloud backup is invalid');
      return;
    }

    window.pendingImportData = data;

    if (silent) {
      await confirmImport();
    } else {
      openModal('Restore from Cloud', `
        <div class="confirm-box">
          <div class="modal-title" style="text-align:center;border:none;margin-bottom:0.5rem;">Restore cloud backup?</div>
          <p class="confirm-msg">This will replace all current data with ${data.stages.length} stage(s) and ${data.subjects.length} subject(s) from the cloud.</p>
        </div>
      `);
      setModalFooter([
        { label: 'Cancel', cls: 'btn-ghost', fn: 'closeModal()' },
        { label: 'Restore', cls: 'btn-danger', fn: 'confirmImport()' },
      ]);
    }
  } catch (err) {
    toast('Cloud restore failed: ' + (err.message || err));
  }
}



// ══════════════════════════════════════════════════
//  FACTORY RESET (local only — cloud untouched)
// ══════════════════════════════════════════════════
function confirmFactoryReset() {
  openModal('Factory Reset', `
    <div class="confirm-box">
      <div class="modal-title" style="text-align:center;border:none;margin-bottom:0.5rem;color:var(--red);">
        <i class="bi bi-exclamation-triangle-fill"></i> Erase all local data?
      </div>
      <p class="confirm-msg">
        This deletes every stage, subject and your profile details from <strong>this device only</strong>
        (${state.stages.length} stage(s), ${state.subjects.length} subject(s)).
        ${currentUser ? `Your cloud backup for <strong>${escHtml(currentUser.email || '')}</strong> will <strong>not</strong> be touched — restore it anytime with "Restore from Cloud".` : `You won't lose anything in the cloud since you're not signed in to any backup.`}
      </p>
    </div>
  `);
  setModalFooter([
    { label: 'Cancel', cls: 'btn-ghost', fn: 'closeModal()' },
    { label: 'Erase Everything', cls: 'btn-danger', fn: 'doFactoryReset()' },
  ]);
}

async function doFactoryReset() {
  // wipe IndexedDB stores
  for (const s of state.stages) await dbDelete('stages', s.id);
  for (const s of state.subjects) await dbDelete('subjects', s.id);
  state.stages = [];
  state.subjects = [];

  // wipe local profile fields
  ['userName', 'userEmail', 'userCreatedDate', 'userCreatedAt', 'userLastUpdated'].forEach(k => localStorage.removeItem(k));
  userProfile.name = 'User';
  userProfile.email = 'user@example.com';
  userProfile.createdDate = new Date().toLocaleDateString('en-IN');
  localStorage.setItem('userCreatedDate', userProfile.createdDate);
  localStorage.setItem('userCreatedAt', new Date().toISOString());

  // sign out so a reload doesn't auto-restore from cloud and undo the reset
  if (currentUser && typeof auth !== 'undefined') {
    try { await auth.signOut(); } catch (err) { /* ignore */ }
  }

  closeModal();
  renderNavTabs();
  showSection('dashboard');
  toast('✓ Local data erased and signed out');
}