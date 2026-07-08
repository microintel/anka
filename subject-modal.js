// ══════════════════════════════════════════════════
//  ADD / EDIT SUBJECT MODAL
// ══════════════════════════════════════════════════
let modalCtx = {};

function openAddSubjectModal(stageId, termId) {
  modalCtx = { mode: 'add', stageId };
  const stage = getStage(stageId);
  openModal(`Add Subject — ${stageLabel(stage)}`, buildSubjectForm(stage, termId, null));
  setModalFooter([
    { label: 'Cancel', cls: 'btn-ghost', fn: 'closeModal()' },
    { label: 'Add Subject', cls: 'btn-solid', fn: 'saveSubject()' },
  ]);
  updateLivePreview();
}

function openEditSubjectModal(stageId, id) {
  const subj = state.subjects.find(s => s.id === id);
  if (!subj) return;
  const stage = getStage(stageId);
  modalCtx = { mode: 'edit', stageId, id };
  openModal('Edit Subject', buildSubjectForm(stage, subj.termId, subj));
  setModalFooter([
    { label: 'Cancel', cls: 'btn-ghost', fn: 'closeModal()' },
    { label: 'Save Changes', cls: 'btn-solid', fn: 'saveSubject()' },
  ]);
  updateLivePreview();
}

function buildSubjectForm(stage, termId, subj) {
  let termField = '';
  if (stage.mode === 'semester') {
    const opts = stage.terms.map(t =>
      `<option value="${t.id}" ${(subj?.termId || termId) === t.id ? 'selected' : ''}>${escHtml(t.label)}</option>`
    ).join('');
    termField = `
    <div class="form-field">
      <label class="form-label"><i class="bi bi-calendar3"></i> Semester</label>
      <select class="form-input" id="f-term">${opts}</select>
    </div>`;
  }

  const types = [
    { v: 'theory',    icon: 'bi-journal-text',     label: 'Theory' },
    { v: 'practical', icon: 'bi-flask',             label: 'Practical' },
    { v: 'audit',     icon: 'bi-clipboard-check',   label: 'Audit' },
  ];
  const curType = subj?.subjectType || 'theory';

  const i = subj?.internal || {};
  const e = subj?.external || {};

  modalCtx.comps = internalComponents(subj).map(c => ({ name: c.name, obtained: c.obtained }));
  if (!modalCtx.comps.length) modalCtx.comps.push({ name: '', obtained: '' });
  const iaMinMax = internalMinMax(subj);

  return `
  <div class="modal-top-grid">
    <div class="form-field">
      <label class="form-label"><i class="bi bi-pencil"></i> Subject Name</label>
      <input class="form-input" id="f-name" placeholder="e.g. Mathematics" value="${escHtml(subj?.name || '')}" oninput="updateLivePreview()">
    </div>
    ${termField}
  </div>

  <div class="form-field" style="margin-bottom:1rem;">
    <label class="form-label"><i class="bi bi-tag"></i> Subject Type</label>
    <div class="seg-control" id="f-subtype-seg">
      ${types.map(t => `<button type="button" class="seg-btn ${curType === t.v ? 'active' : ''}" data-val="${t.v}" onclick="selectSubType(this)"><i class="bi ${t.icon}"></i> ${t.label}</button>`).join('')}
    </div>
    <input type="hidden" id="f-subtype" value="${curType}">
  </div>

  <div class="mark-card">
    <div class="mark-card-head">
      <span><i class="bi bi-journal-check"></i> Internal Marks</span>
      <span class="mark-card-pct" id="f-int-pct">0%</span>
    </div>
    <div id="internal-comp-list">${renderInternalCompRows()}</div>
    <button type="button" class="btn btn-ghost btn-sm" style="margin-top:0.25rem;margin-bottom:0.75rem;" onclick="addInternalComponent()"><i class="bi bi-plus-lg"></i> Add Component</button>
    <div class="form-row triple" style="border-top:1px solid var(--border);padding-top:0.75rem;">
      <div class="form-field"><label class="form-label">Final IA Min</label><input class="form-input" type="number" step="0.01" id="f-int-min" placeholder="0" value="${iaMinMax.min || ''}" oninput="updateLivePreview()"></div>
      <div class="form-field"><label class="form-label">Final IA Max</label><input class="form-input" type="number" step="0.01" id="f-int-max" placeholder="50" value="${iaMinMax.max || ''}" oninput="updateLivePreview()"></div>
      <div class="form-field"><label class="form-label">Final IA Obtained</label><input class="form-input" id="f-int-obtained-display" value="${fmt2(modalCtx.comps.reduce((s,c)=>s+(+c.obtained||0),0))}" disabled></div>
    </div>
  </div>

  <div class="mark-card">
    <div class="mark-card-head">
      <span><i class="bi bi-mortarboard"></i> External / Final Exam</span>
      <span class="mark-card-pct" id="f-ext-pct">0%</span>
    </div>
    <div class="form-row triple">
      <div class="form-field"><label class="form-label">Min</label><input class="form-input" type="number" id="f-ext-min" placeholder="0" value="${e.min ?? ''}" oninput="updateLivePreview()"></div>
      <div class="form-field"><label class="form-label">Max</label><input class="form-input" type="number" id="f-ext-max" placeholder="60" value="${e.max ?? ''}" oninput="updateLivePreview()"></div>
      <div class="form-field"><label class="form-label">Obtained</label><input class="form-input" type="number" id="f-ext-obtained" placeholder="0" value="${e.obtained ?? ''}" oninput="updateLivePreview()"></div>
    </div>
  </div>

  <div class="live-total">
    <div>
      <div class="live-total-label"><i class="bi bi-calculator"></i> Total Score</div>
      <div class="live-total-value" id="live-total-value">0 / 0</div>
    </div>
    <div class="live-total-pct pct-mid" id="live-total-pct">0%</div>
  </div>`;
}

function renderInternalCompRows() {
  return modalCtx.comps.map((c, idx) => `
    <div class="form-row internal-comp-row" data-idx="${idx}" style="display:grid;grid-template-columns:2fr 1fr auto;gap:0.5rem;align-items:end;margin-bottom:0.6rem;">
      <div class="form-field"><label class="form-label">Name</label><input class="form-input" placeholder="e.g. Mse 1" value="${escHtml(c.name || '')}" oninput="updateInternalComp(${idx},'name',this.value)"></div>
      <div class="form-field"><label class="form-label">Obtained</label><input class="form-input" type="number" step="0.01" placeholder="0" value="${c.obtained ?? ''}" oninput="updateInternalComp(${idx},'obtained',this.value)"></div>
      <button type="button" class="btn btn-danger btn-sm" onclick="removeInternalComponent(${idx})" title="Remove"><i class="bi bi-trash3-fill"></i></button>
    </div>`).join('');
}

function refreshInternalCompList() {
  const el = document.getElementById('internal-comp-list');
  if (el) el.innerHTML = renderInternalCompRows();
  updateLivePreview();
}

function addInternalComponent() {
  modalCtx.comps.push({ name: '', obtained: '' });
  refreshInternalCompList();
}

function removeInternalComponent(idx) {
  modalCtx.comps.splice(idx, 1);
  if (!modalCtx.comps.length) modalCtx.comps.push({ name: '', obtained: '' });
  refreshInternalCompList();
}

function updateInternalComp(idx, field, val) {
  modalCtx.comps[idx][field] = val;
  updateLivePreview();
}

function selectSubType(btn) {
  document.querySelectorAll('#f-subtype-seg .seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('f-subtype').value = btn.dataset.val;
}

function updateLivePreview() {
  const comps = modalCtx.comps || [];
  const iMax = +document.getElementById('f-int-max')?.value || 0;
  const iObt = comps.reduce((s, c) => s + (+c.obtained || 0), 0);
  const eMax = +document.getElementById('f-ext-max')?.value || 0;
  const eObt = +document.getElementById('f-ext-obtained')?.value || 0;

  const intObtEl = document.getElementById('f-int-obtained-display');
  if (intObtEl) intObtEl.value = fmt2(iObt);

  const intPctEl = document.getElementById('f-int-pct');
  const extPctEl = document.getElementById('f-ext-pct');
  if (intPctEl) intPctEl.textContent = (iMax ? pct(iObt, iMax) : 0) + '%';
  if (extPctEl) extPctEl.textContent = (eMax ? pct(eObt, eMax) : 0) + '%';

  const totalMax = iMax + eMax;
  const totalObt = iObt + eObt;
  const totalPct = totalMax ? pct(totalObt, totalMax) : 0;

  const valEl = document.getElementById('live-total-value');
  const pctEl = document.getElementById('live-total-pct');
  if (valEl) valEl.textContent = `${fmt2(totalObt)} / ${fmt2(totalMax)}`;
  if (pctEl) {
    pctEl.textContent = totalPct + '%';
    pctEl.className = 'live-total-pct ' + pctClass(totalPct);
  }
}

async function saveSubject() {
  const { mode, stageId, id } = modalCtx;
  const stage = getStage(stageId);

  const name = document.getElementById('f-name')?.value?.trim();
  if (!name) { toast('Subject name is required'); return; }

  const termId = stage.mode === 'semester'
    ? document.getElementById('f-term').value
    : stage.terms[0].id;

  const subjectType = document.getElementById('f-subtype').value;

  const components = (modalCtx.comps || [])
    .filter(c => (c.name && String(c.name).trim()) || c.obtained)
    .map(c => ({
      name: (c.name && String(c.name).trim()) || 'Internal',
      obtained: +(+c.obtained || 0).toFixed(2),
    }));
  const internal = {
    min: +(+document.getElementById('f-int-min').value || 0).toFixed(2),
    max: +(+document.getElementById('f-int-max').value || 0).toFixed(2),
    components,
  };
  const external = {
    min: +document.getElementById('f-ext-min').value || 0,
    max: +document.getElementById('f-ext-max').value || 0,
    obtained: +document.getElementById('f-ext-obtained').value || 0,
  };

  const subj = { id: mode === 'edit' ? id : uid(), stageId, termId, name, subjectType, internal, external };

  if (mode === 'edit') {
    const idx = state.subjects.findIndex(s => s.id === id);
    state.subjects[idx] = subj;
  } else {
    state.subjects.push(subj);
  }
  await dbPut('subjects', subj);
  toast(mode === 'edit' ? 'Subject updated' : 'Subject added');
  closeModal();
  renderStageView(stageId);
}
