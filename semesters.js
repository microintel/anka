// ══════════════════════════════════════════════════
//  SEMESTER MANAGEMENT
// ══════════════════════════════════════════════════
async function addSemester(stage) {
  const sems = state.semesters[stage];
  const num = sems.length + 1;
  const prefix = stage === 'diploma' ? 'd' : 'e';
  sems.push({ id: prefix + uid(), label: `Semester ${num}` });
  await saveSemesters();
  renderStage(stage);
  toast(`Semester ${num} added`);
}

function confirmDeleteSem(stage, semId) {
  const sem = state.semesters[stage].find(s=>s.id===semId);
  const subCount = semSubjects(stage, semId).length;
  openModal('Delete Semester', `
    <div class="confirm-box">
      <div class="modal-title" style="text-align:center;border:none;margin-bottom:0.5rem;">Are you sure?</div>
      <p class="confirm-msg">"${escHtml(sem?.label)}" with ${subCount} subject${subCount!==1?'s':''} will be permanently removed.</p>
    </div>
  `);
  setModalFooter([
    { label:'Cancel', cls:'btn-ghost', fn:'closeModal()' },
    { label:'Delete Semester', cls:'btn-danger', fn:`deleteSemester('${stage}','${semId}')` },
  ]);
}

async function deleteSemester(stage, semId) {
  // Remove all subjects in semester
  const toDelete = state[stage].filter(s=>s.sem===semId);
  for (const s of toDelete) await dbDelete(stage, s.id);
  state[stage] = state[stage].filter(s=>s.sem!==semId);
  // Remove semester
  state.semesters[stage] = state.semesters[stage].filter(s=>s.id!==semId);
  await saveSemesters();
  closeModal();
  renderStage(stage);
  toast('Semester deleted');
}

