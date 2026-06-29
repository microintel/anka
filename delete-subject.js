// ══════════════════════════════════════════════════
//  DELETE SUBJECT
// ══════════════════════════════════════════════════
function confirmDelete(stage, semId, id) {
  const subj = state[stage].find(s=>s.id===id);
  openModal('Delete Subject', `
    <div class="confirm-box">
      <div class="modal-title" style="text-align:center;border:none;margin-bottom:0.5rem;">Are you sure?</div>
      <p class="confirm-msg">"${escHtml(subj?.name)}" will be permanently deleted from your vault.</p>
    </div>
  `);
  setModalFooter([
    { label:'Cancel', cls:'btn-ghost', fn:'closeModal()' },
    { label:'Delete', cls:'btn-danger', fn:`deleteSubject('${stage}','${semId}','${id}')` },
  ]);
}

async function deleteSubject(stage, semId, id) {
  state[stage] = state[stage].filter(s=>s.id!==id);
  await dbDelete(stage, id);
  closeModal();
  toast('Subject deleted');
  if (stage === 'sslc') renderSSLC();
  else renderStage(stage);
}

