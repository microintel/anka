// ══════════════════════════════════════════════════
//  DELETE SUBJECT
// ══════════════════════════════════════════════════
function confirmDelete(stageId, id) {
  const subj = state.subjects.find(s => s.id === id);
  openModal('Delete Subject', `
    <div class="confirm-box">
      <div class="modal-title" style="text-align:center;border:none;margin-bottom:0.5rem;">Are you sure?</div>
      <p class="confirm-msg">"${escHtml(subj?.name)}" will be permanently deleted from your vault.</p>
    </div>
  `);
  setModalFooter([
    { label: 'Cancel', cls: 'btn-ghost', fn: 'closeModal()' },
    { label: 'Delete', cls: 'btn-danger', fn: `deleteSubject('${stageId}','${id}')` },
  ]);
}

async function deleteSubject(stageId, id) {
  state.subjects = state.subjects.filter(s => s.id !== id);
  await dbDelete('subjects', id);
  closeModal();
  toast('Subject deleted');
  renderStageView(stageId);
}
