// ══════════════════════════════════════════════════
//  STAGE MANAGEMENT (create / delete stages & terms)
// ══════════════════════════════════════════════════
function renderAddStagePage() {
  const opts = Object.keys(STAGE_TYPES).map(k =>
    `<option value="${k}">${STAGE_TYPES[k].label}</option>`
  ).join('');

  document.getElementById('add-stage-form').innerHTML = `
    <div class="form-row single">
      <div class="form-field">
        <label class="form-label">Stage Type</label>
        <select class="form-input" id="f-stage-type" onchange="onStageTypeChange()">${opts}</select>
      </div>
    </div>
    <div class="form-row single">
      <div class="form-field">
        <label class="form-label">Display Name</label>
        <input class="form-input" id="f-stage-label" value="${STAGE_TYPES.sslc.label}">
      </div>
    </div>
    <div class="form-row single" id="f-stage-mode-row">
      <div class="form-field">
        <label class="form-label">Marking Pattern</label>
        <select class="form-input" id="f-stage-mode">
          <option value="annual">Annual (single yearly result)</option>
          <option value="semester">Semester-wise</option>
        </select>
      </div>
    </div>
    <div class="form-row single" id="f-stage-cet-note" style="display:none;">
      <p style="font-size:0.8rem;color:var(--text-dim);margin:0;">CET stages don't track subjects or marks — just your previous-stage conversion score and your current rank. You'll fill these in after creating the stage.</p>
    </div>
    <div class="modal-footer" style="border-top:none;padding-top:0.5rem;">
      <button class="btn btn-ghost" onclick="showSection('dashboard')">Cancel</button>
      <button class="btn btn-solid" onclick="saveStage()"><i class="bi bi-plus-lg"></i> Create Stage</button>
    </div>
  `;
  onStageTypeChange();
}

function onStageTypeChange() {
  const type = document.getElementById('f-stage-type').value;
  const def = STAGE_TYPES[type];
  document.getElementById('f-stage-label').value = def.label;
  const isCet = type === 'cet';
  document.getElementById('f-stage-mode-row').style.display = isCet ? 'none' : '';
  document.getElementById('f-stage-cet-note').style.display = isCet ? '' : 'none';
  if (!isCet) document.getElementById('f-stage-mode').value = def.defaultMode;
}

async function saveStage() {
  const type = document.getElementById('f-stage-type').value;
  const label = document.getElementById('f-stage-label').value.trim() || STAGE_TYPES[type].label;

  let stage;
  if (type === 'cet') {
    stage = {
      id: uid(),
      type, label, mode: 'cet',
      order: state.stages.length,
      terms: [],
      cet: { conversion: 0, rank: '', categoryRank: '' },
    };
  } else {
    const mode = document.getElementById('f-stage-mode').value;
    stage = {
      id: uid(),
      type, label, mode,
      order: state.stages.length,
      terms: mode === 'annual'
        ? [{ id: 'annual', label: 'Annual' }]
        : [{ id: uid(), label: 'Semester 1' }],
    };
  }

  state.stages.push(stage);
  await dbPut('stages', stage);
  renderNavTabs();
  showSection('stage:' + stage.id);
  toast('✓ Stage added');
  if (type === 'cet') openEditCetModal(stage.id);
}

// ══════════════════════════════════════════════════
//  CET STAGE — conversion score + rank editor
// ══════════════════════════════════════════════════
function openEditCetModal(stageId) {
  const stage = getStage(stageId);
  const c = stage.cet || (stage.cet = { conversion: 0, rank: '', categoryRank: '' });

  openModal('CET Details', `
    <div class="form-row single">
      <div class="form-field">
        <label class="form-label">Previous Stage Conversion Score (out of 100)</label>
        <input class="form-input" type="number" step="0.01" min="0" max="100" id="f-cet-conversion" value="${c.conversion || ''}" placeholder="e.g. PUC marks converted to /100">
      </div>
    </div>
    <div class="form-row single">
      <div class="form-field">
        <label class="form-label">Current CET Rank</label>
        <input class="form-input" type="text" id="f-cet-rank" value="${escHtml(c.rank || '')}" placeholder="e.g. 4521">
      </div>
    </div>
    <div class="form-row single">
      <div class="form-field">
        <label class="form-label">Category Rank <span style="color:var(--text-dim);font-weight:400;">(optional)</span></label>
        <input class="form-input" type="text" id="f-cet-category-rank" value="${escHtml(c.categoryRank || '')}" placeholder="e.g. 812">
      </div>
    </div>
  `);
  setModalFooter([
    { label: 'Cancel', cls: 'btn-ghost', fn: 'closeModal()' },
    { label: 'Save', cls: 'btn-solid', fn: `saveCetDetails('${stageId}')` },
  ]);
}

async function saveCetDetails(stageId) {
  const stage = getStage(stageId);
  stage.cet = {
    conversion: +document.getElementById('f-cet-conversion').value || 0,
    rank: document.getElementById('f-cet-rank').value.trim(),
    categoryRank: document.getElementById('f-cet-category-rank').value.trim(),
  };
  await dbPut('stages', stage);
  closeModal();
  renderStageView(stageId);
  if (currentSection === 'dashboard') renderDashboard();
  toast('✓ CET details saved');
}

function confirmDeleteStage(stageId) {
  const stage = getStage(stageId);
  const count = stageSubjects(stageId).length;
  openModal('Delete Stage', `
    <div class="confirm-box">
      <div class="modal-title" style="text-align:center;border:none;margin-bottom:0.5rem;">Are you sure?</div>
      <p class="confirm-msg">"${escHtml(stageLabel(stage))}" with ${count} subject${count !== 1 ? 's' : ''} across all terms will be permanently removed.</p>
    </div>
  `);
  setModalFooter([
    { label: 'Cancel', cls: 'btn-ghost', fn: 'closeModal()' },
    { label: 'Delete Stage', cls: 'btn-danger', fn: `deleteStage('${stageId}')` },
  ]);
}

async function deleteStage(stageId) {
  const subs = stageSubjects(stageId);
  for (const s of subs) await dbDelete('subjects', s.id);
  state.subjects = state.subjects.filter(s => s.stageId !== stageId);
  state.stages = state.stages.filter(s => s.id !== stageId);
  await dbDelete('stages', stageId);
  closeModal();
  toast('Stage deleted');
  renderNavTabs();
  showSection('dashboard');
}

async function moveStage(stageId, dir) {
  sortStages();
  const idx = state.stages.findIndex(s => s.id === stageId);
  const swapIdx = idx + dir;
  if (idx < 0 || swapIdx < 0 || swapIdx >= state.stages.length) return;

  [state.stages[idx], state.stages[swapIdx]] = [state.stages[swapIdx], state.stages[idx]];
  for (let i = 0; i < state.stages.length; i++) {
    state.stages[i].order = i;
    await dbPut('stages', state.stages[i]);
  }

  renderNavTabs();
  if (currentSection === 'stats') renderStatsPage();
  if (currentSection === 'dashboard') renderDashboard();
  if (currentSection === 'stages') renderStagesPage();
  toast('Stage order updated');
}

async function addTerm(stageId) {
  const stage = getStage(stageId);
  const num = stage.terms.length + 1;
  stage.terms.push({ id: uid(), label: `Semester ${num}` });
  await dbPut('stages', stage);
  renderStageView(stageId);
  toast(`Semester ${num} added`);
}

function confirmDeleteTerm(stageId, termId) {
  const stage = getStage(stageId);
  const term = stage.terms.find(t => t.id === termId);
  const count = termSubjects(stageId, termId).length;
  openModal('Delete Semester', `
    <div class="confirm-box">
      <div class="modal-title" style="text-align:center;border:none;margin-bottom:0.5rem;">Are you sure?</div>
      <p class="confirm-msg">"${escHtml(term?.label)}" with ${count} subject${count !== 1 ? 's' : ''} will be permanently removed.</p>
    </div>
  `);
  setModalFooter([
    { label: 'Cancel', cls: 'btn-ghost', fn: 'closeModal()' },
    { label: 'Delete Semester', cls: 'btn-danger', fn: `deleteTerm('${stageId}','${termId}')` },
  ]);
}

async function deleteTerm(stageId, termId) {
  const toDelete = termSubjects(stageId, termId);
  for (const s of toDelete) await dbDelete('subjects', s.id);
  state.subjects = state.subjects.filter(s => !(s.stageId === stageId && s.termId === termId));
  const stage = getStage(stageId);
  stage.terms = stage.terms.filter(t => t.id !== termId);
  await dbPut('stages', stage);
  closeModal();
  renderStageView(stageId);
  toast('Semester deleted');
}
