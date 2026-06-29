// ══════════════════════════════════════════════════
//  ADD / EDIT MODALS
// ══════════════════════════════════════════════════
let modalCtx = {};

function openAddSubjectModal(stage, semId) {
  modalCtx = { mode:'add', stage, semId };
  const title = stage === 'sslc' ? 'Add SSLC Subject' : `Add Subject — ${stage.charAt(0).toUpperCase()+stage.slice(1)}`;
  openModal(title, buildSubjectForm(stage, semId, null));
  setModalFooter([
    { label:'Cancel', cls:'btn-ghost', fn:'closeModal()' },
    { label:'Add Subject', cls:'btn-solid', fn:'saveSubject()' }
  ]);
}

function openEditSubjectModal(stage, semId, id) {
  const subj = state[stage].find(s=>s.id===id);
  if (!subj) return;
  modalCtx = { mode:'edit', stage, semId, id };
  openModal('Edit Subject', buildSubjectForm(stage, semId, subj));
  setModalFooter([
    { label:'Cancel', cls:'btn-ghost', fn:'closeModal()' },
    { label:'Save Changes', cls:'btn-solid', fn:'saveSubject()' }
  ]);
}

function buildSubjectForm(stage, semId, subj) {
  const sems = state.semesters[stage] || [];

  let semSelect = '';
  if (stage !== 'sslc') {
    const opts = sems.map(s => `<option value="${s.id}" ${subj?.sem===s.id||semId===s.id?'selected':''}>${s.label}</option>`).join('');
    semSelect = `
    <div class="form-row single">
      <div class="form-field">
        <label class="form-label">Semester</label>
        <select class="form-input" id="f-sem">${opts}</select>
      </div>
    </div>`;
  }

  let examTypeField = '';
  if (stage === 'engineering') {
    const types = ['regular','arrear','lab'];
    examTypeField = `
    <div class="form-row single" style="margin-bottom:0.75rem;">
      <div class="form-field">
        <label class="form-label">Exam Type</label>
        <select class="form-input" id="f-examtype">
          ${types.map(t=>`<option value="${t}" ${subj?.examType===t?'selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
        </select>
      </div>
    </div>`;
  }

  if (stage === 'sslc') {
    const comps = subj?.components || [];
    const extS = subj?.external?.scored ?? '';
    const extM = subj?.external?.max ?? '';
    const compRows = comps.map((c,i) => buildCompRow(i, c.name, c.scored, c.max)).join('');
    return `
    <div class="form-row single">
      <div class="form-field">
        <label class="form-label">Subject Name</label>
        <input class="form-input" id="f-name" placeholder="e.g. Mathematics" value="${escHtml(subj?.name||'')}">
      </div>
    </div>
    <div class="components-section">
      <div class="components-title">
        <span>Internal Components</span>
        <button class="btn btn-ghost btn-sm" type="button" onclick="addCompRow()">+ Add Component</button>
      </div>
      <div id="comp-list">${compRows}</div>
    </div>
    <div class="components-section">
      <div class="components-title"><span>External / End Exam</span></div>
      <div class="form-row">
        <div class="form-field">
          <label class="form-label">Scored</label>
          <input class="form-input" type="number" id="f-ext-scored" placeholder="0" value="${extS}">
        </div>
        <div class="form-field">
          <label class="form-label">Max Marks</label>
          <input class="form-input" type="number" id="f-ext-max" placeholder="100" value="${extM}">
        </div>
      </div>
    </div>`;
  }

  // Diploma / Engineering
  const comps = subj?.components || [];
  const extS = subj?.external?.scored ?? '';
  const extM = subj?.external?.max ?? 60;

  const compRows = comps.map((c,i) => buildCompRow(i, c.name, c.scored, c.max)).join('');

  return `
  ${semSelect}
  <div class="form-row single">
    <div class="form-field">
      <label class="form-label">Subject Name</label>
      <input class="form-input" id="f-name" placeholder="e.g. Engineering Mathematics" value="${escHtml(subj?.name||'')}">
    </div>
  </div>
  ${examTypeField}
  <div class="components-section">
    <div class="components-title">
      <span>Internal Components</span>
      <button class="btn btn-ghost btn-sm" type="button" onclick="addCompRow()">+ Add Component</button>
    </div>
    <div id="comp-list">${compRows}</div>
  </div>
  <div class="components-section">
    <div class="components-title"><span>External / End-Sem Exam</span></div>
    <div class="form-row">
      <div class="form-field">
        <label class="form-label">Scored</label>
        <input class="form-input" type="number" id="f-ext-scored" placeholder="0" value="${extS}">
      </div>
      <div class="form-field">
        <label class="form-label">Max Marks</label>
        <input class="form-input" type="number" id="f-ext-max" placeholder="60" value="${extM}">
      </div>
    </div>
  </div>`;
}

let compIdx = 0;
function buildCompRow(i, name='', scored='', max='') {
  compIdx = Math.max(compIdx, i+1);
  return `<div class="component-row" id="comp-row-${i}">
    <input class="form-input" placeholder="Component name (e.g. IA1)" value="${escHtml(name)}" data-comp-name="${i}">
    <input class="form-input" type="number" placeholder="0/${max||20}" value="${scored}" data-comp-scored="${i}" style="text-align:center;">
    <input class="form-input" type="number" placeholder="Max" value="${max}" data-comp-max="${i}" style="text-align:center;">
    <button class="remove-comp" onclick="removeCompRow(${i})">✕</button>
  </div>`;
}

function addCompRow() {
  const list = document.getElementById('comp-list');
  const div = document.createElement('div');
  div.innerHTML = buildCompRow(compIdx++);
  list.appendChild(div.firstElementChild);
}

function removeCompRow(i) {
  const el = document.getElementById('comp-row-' + i);
  if (el) el.remove();
}

async function saveSubject() {
  const { mode, stage, semId, id } = modalCtx;

  const name = document.getElementById('f-name')?.value?.trim();
  if (!name) { toast('Subject name is required'); return; }

  if (stage === 'sslc') {
    // Gather components
    const compListEl = document.getElementById('comp-list');
    const components = [];
    if (compListEl) {
      compListEl.querySelectorAll('.component-row').forEach(row => {
        const nameInp   = row.querySelector('[data-comp-name]');
        const scoredInp = row.querySelector('[data-comp-scored]');
        const maxInp    = row.querySelector('[data-comp-max]');
        if (nameInp && nameInp.value.trim()) {
          components.push({ name: nameInp.value.trim(), scored: +scoredInp.value||0, max: +maxInp.value||0 });
        }
      });
    }
    const extScored = +document.getElementById('f-ext-scored')?.value || 0;
    const extMax    = +document.getElementById('f-ext-max')?.value || 0;
    const external  = { scored: extScored, max: extMax };
    const subj = { id: mode==='edit'?id:uid(), name, components, external };
    // Legacy compat: keep scored/max as totals for dashboard
    const intTotal = components.reduce((a,c)=>a+(+c.scored||0),0);
    const intMax   = components.reduce((a,c)=>a+(+c.max||0),0);
    subj.scored = intTotal + extScored;
    subj.max    = intMax + extMax;
    if (mode === 'edit') {
      const idx = state.sslc.findIndex(s=>s.id===id);
      state.sslc[idx] = subj;
    } else {
      state.sslc.push(subj);
    }
    await dbPut('sslc', subj);
    toast(mode==='edit'?'Subject updated':'Subject added');
    closeModal();
    renderSSLC();
    return;
  }

  const fSem = document.getElementById('f-sem')?.value || semId;
  const examType = document.getElementById('f-examtype')?.value || 'regular';

  // Gather components
  const compList = document.getElementById('comp-list');
  const components = [];
  compList.querySelectorAll('.component-row').forEach(row => {
    const nameInp   = row.querySelector('[data-comp-name]');
    const scoredInp = row.querySelector('[data-comp-scored]');
    const maxInp    = row.querySelector('[data-comp-max]');
    if (nameInp && nameInp.value.trim()) {
      components.push({ name: nameInp.value.trim(), scored: +scoredInp.value||0, max: +maxInp.value||0 });
    }
  });

  const external = {
    scored: +document.getElementById('f-ext-scored').value || 0,
    max:    +document.getElementById('f-ext-max').value || 60,
  };

  const subj = { id: mode==='edit'?id:uid(), sem: fSem, name, examType, components, external };
  if (mode === 'edit') {
    const idx = state[stage].findIndex(s=>s.id===id);
    state[stage][idx] = subj;
  } else {
    state[stage].push(subj);
  }
  await dbPut(stage, subj);
  toast(mode==='edit'?'Subject updated':'Subject added');
  closeModal();
  renderStage(stage);
}

