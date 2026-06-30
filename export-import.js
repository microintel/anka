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
