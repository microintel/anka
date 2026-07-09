// ══════════════════════════════════════════════════
//  RENDER STAGE VIEW (works for any stage, any mode)
// ══════════════════════════════════════════════════
const TYPE_BADGE = { theory: 'exam-regular', practical: 'exam-lab', audit: 'exam-arrear' };
const SEM_PALETTE = ['accent', 'accent2', 'accent3', 'accent4'];
let showMarksDetail = false;
let currentStageId = null;

function toggleInternalMarks() {
  showMarksDetail = !showMarksDetail;
  if (currentStageId) renderStageView(currentStageId);
}

function renderStageView(stageId) {
  const stage = getStage(stageId);
  const wrap = document.getElementById('stage-content');
  if (!stage) { wrap.innerHTML = ''; return; }

  currentStageId = stageId;
  const def = STAGE_TYPES[stage.type] || STAGE_TYPES.custom;
  const subs = stageSubjects(stageId);
  const avg = stageAvg(subs);

  document.getElementById('stage-title').innerHTML = `${def.icon} ${escHtml(stageLabel(stage))} <em>${stage.mode === 'annual' ? 'Annual' : 'Semester-wise'}</em>`;
  document.getElementById('stage-summary').textContent = `${subs.length} subject${subs.length !== 1 ? 's' : ''} · ${avg}% overall`;

  const controls = document.getElementById('stage-controls');
  controls.innerHTML = `
    <button class="btn btn-ghost" onclick="toggleInternalMarks()"><i class="bi bi-eye${showMarksDetail ? '-slash' : ''}-fill"></i> ${showMarksDetail ? 'Hide' : 'Show'} Marks</button>
    ${stage.mode === 'semester' ? `<button class="btn btn-ghost" onclick="addTerm('${stage.id}')"><i class="bi bi-plus-lg"></i> Add Semester</button>` : ''}
    <button class="btn btn-solid" onclick="openAddSubjectModal('${stage.id}', '${stage.terms[0]?.id || ''}')"><i class="bi bi-plus-lg"></i> Add Subject</button>
    <button class="btn btn-danger" onclick="confirmDeleteStage('${stage.id}')"><i class="bi bi-trash3-fill"></i> Delete Stage</button>
  `;

  wrap.classList.toggle('hide-marks', !showMarksDetail);

  if (stage.mode === 'annual') {
    const term = stage.terms[0];
    wrap.innerHTML = subs.length
      ? subjectTable(stage, term.id, termSubjects(stage.id, term.id), 0)
      : emptyState('No subjects recorded yet.', 'Add your first subject to begin');
    return;
  }

  // semester mode
  if (!stage.terms.length) {
    wrap.innerHTML = emptyState('No semesters yet.', 'Click "Add Semester" to begin');
    return;
  }

  wrap.innerHTML = stage.terms.map((term, idx) => {
    const tSubs = termSubjects(stage.id, term.id);
    const tAvg = termAvg(stage.id, term.id);
    return `
    <div class="semester-block" id="term-block-${term.id}">
      <div class="semester-header" id="term-hdr-${term.id}" onclick="toggleTerm('${term.id}')">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <span class="collapse-icon"><i class="bi bi-chevron-down"></i></span>
          <span class="semester-label">${escHtml(term.label)}</span>
          <span style="font-family:var(--font-mono);font-size:0.6rem;color:var(--text-dim);">${tSubs.length} subjects</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <span class="semester-avg">${tAvg}%</span>
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openAddSubjectModal('${stage.id}','${term.id}')"><i class="bi bi-plus-lg"></i> Subject</button>
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();confirmDeleteTerm('${stage.id}','${term.id}')"><i class="bi bi-x-lg"></i></button>
        </div>
      </div>
      <div class="semester-body" id="term-body-${term.id}">
        ${tSubs.length ? subjectTable(stage, term.id, tSubs, idx) : `<div class="empty-state" style="margin-bottom:1rem;"><div class="empty-state-text" style="font-size:0.9rem;">No subjects in this semester</div></div>`}
      </div>
    </div>`;
  }).join('');
}

function emptyState(text, sub) {
  return `<div class="empty-state"><div class="empty-state-icon"><i class="bi bi-journal-bookmark"></i></div><div class="empty-state-text">${text}</div><div class="empty-state-sub">${sub}</div></div>`;
}

function marksCell(label, m) {
  const min = +m.min || 0, max = +m.max || 0, ob = +m.obtained || 0;
  if (!max) return `<span style="color:var(--text-dim);font-size:0.72rem;">—</span>`;
  const below = ob < min;
  return `<div class="comp-pill"><span class="comp-pill-name">${label}${min ? ` (min ${fmt2(min)})` : ''}</span><span class="comp-pill-score" style="${below ? 'color:var(--red);' : ''}">${fmt2(ob)}/${fmt2(max)}</span></div>`;
}

// Component pill showing only name + obtained marks (no min/max)
function compPill(name, obtained) {
  return `<div class="comp-pill"><span class="comp-pill-name">${escHtml(name || 'Internal')}</span><span class="comp-pill-score">${fmt2(obtained)}</span></div>`;
}

function internalCell(subj) {
  const comps = internalComponents(subj);
  const { min, max } = internalMinMax(subj);
  const parts = [];
  if (comps.length) parts.push(...comps.map(c => compPill(c.name, c.obtained)));
  if (max) {
    const totalObt = comps.reduce((s, c) => s + (+c.obtained || 0), 0);
    const below = totalObt < min;
    parts.push(`<div class="comp-pill"><span class="comp-pill-name">Final IA${min ? ` (min ${fmt2(min)})` : ''}</span><span class="comp-pill-score" style="${below ? 'color:var(--red);' : ''}">${fmt2(totalObt)}/${fmt2(max)}</span></div>`);
  }
  if (!parts.length) return `<span style="color:var(--text-dim);font-size:0.72rem;">—</span>`;
  return parts.join('');
}

function subjectTable(stage, termIdForAdd, subs, colorIdx = 0) {
  const c = SEM_PALETTE[colorIdx % SEM_PALETTE.length];
  const cards = subs.map(s => {
    const t = calcSubjectTotal(s);
    const p = pct(t.scored, t.max);
    const passed = subjectPass(s);
    const typeCls = TYPE_BADGE[s.subjectType] || 'exam-regular';
    const resultHtml = s.subjectType === 'audit'
      ? `<span class="sc-result" style="color:${passed ? 'var(--accent-light)' : 'var(--red)'};">${passed ? 'Satisfactory' : 'Not Satisfactory'}</span>`
      : `<span class="sc-result" style="color:${passed ? 'var(--accent-light)' : 'var(--red)'};">${grade(p)}${passed ? '' : ' · Fail'}</span>`;

    return `<div class="subject-card">
      <div class="subject-card-head">
        <div class="subject-card-name">${escHtml(s.name)}</div>
        <span class="exam-badge ${typeCls}">${s.subjectType}</span>
      </div>
      <div class="subject-card-stats">
        <div class="sc-stat sc-internal">
          <span class="sc-stat-label">Internal</span>
          <div class="sc-stat-value">${internalCell(s)}</div>
        </div>
        <div class="sc-stat sc-external">
          <span class="sc-stat-label">External</span>
          <div class="sc-stat-value">${marksCell('External', s.external || {})}</div>
        </div>
      </div>
      <div class="subject-card-footer">
        <div class="sc-footer-left">
          <span class="marks-badge">${fmt2(t.scored)}/${fmt2(t.max)}</span>
          <span class="pct-badge ${pctClass(p)}">${p}%</span>
          ${resultHtml}
        </div>
        <div class="action-cell">
          <button class="btn btn-ghost btn-sm" onclick="openEditSubjectModal('${stage.id}','${s.id}')"><i class="bi bi-pencil-fill"></i> Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDelete('${stage.id}','${s.id}')"><i class="bi bi-trash3-fill"></i></button>
        </div>
      </div>
    </div>`;
  }).join('');

  return `<div class="subject-card-grid" style="--card-accent:var(--${c});--card-tint:var(--${c}-glow);">${cards}</div>`;
}

function toggleTerm(termId) {
  const hdr = document.getElementById('term-hdr-' + termId);
  const body = document.getElementById('term-body-' + termId);
  hdr.classList.toggle('collapsed');
  body.classList.toggle('collapsed');
}
