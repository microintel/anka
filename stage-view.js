// ══════════════════════════════════════════════════
//  RENDER STAGE VIEW (works for any stage, any mode)
// ══════════════════════════════════════════════════
const TYPE_BADGE = { theory: 'exam-regular', practical: 'exam-lab', audit: 'exam-arrear' };

function renderStageView(stageId) {
  const stage = getStage(stageId);
  const wrap = document.getElementById('stage-content');
  if (!stage) { wrap.innerHTML = ''; return; }

  const def = STAGE_TYPES[stage.type] || STAGE_TYPES.custom;
  const subs = stageSubjects(stageId);
  const avg = stageAvg(subs);

  document.getElementById('stage-title').innerHTML = `${def.icon} ${escHtml(stageLabel(stage))} <em>${stage.mode === 'annual' ? 'Annual' : 'Semester-wise'}</em>`;
  document.getElementById('stage-summary').textContent = `${subs.length} subject${subs.length !== 1 ? 's' : ''} · ${avg}% overall`;

  const controls = document.getElementById('stage-controls');
  controls.innerHTML = `
    ${stage.mode === 'semester' ? `<button class="btn btn-ghost" onclick="addTerm('${stage.id}')"><i class="bi bi-plus-lg"></i> Add Semester</button>` : ''}
    <button class="btn btn-solid" onclick="openAddSubjectModal('${stage.id}', '${stage.terms[0]?.id || ''}')"><i class="bi bi-plus-lg"></i> Add Subject</button>
    <button class="btn btn-danger" onclick="confirmDeleteStage('${stage.id}')"><i class="bi bi-trash3-fill"></i> Delete Stage</button>
  `;

  if (stage.mode === 'annual') {
    const term = stage.terms[0];
    wrap.innerHTML = subs.length
      ? subjectTable(stage, term.id, termSubjects(stage.id, term.id))
      : emptyState('No subjects recorded yet.', 'Add your first subject to begin');
    return;
  }

  // semester mode
  if (!stage.terms.length) {
    wrap.innerHTML = emptyState('No semesters yet.', 'Click "Add Semester" to begin');
    return;
  }

  wrap.innerHTML = stage.terms.map(term => {
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
        ${tSubs.length ? subjectTable(stage, term.id, tSubs) : `<div class="empty-state" style="margin-bottom:1rem;"><div class="empty-state-text" style="font-size:0.9rem;">No subjects in this semester</div></div>`}
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

function subjectTable(stage, termIdForAdd, subs) {
  const rows = subs.map(s => {
    const t = calcSubjectTotal(s);
    const p = pct(t.scored, t.max);
    const passed = subjectPass(s);
    const typeCls = TYPE_BADGE[s.subjectType] || 'exam-regular';
    return `<tr>
      <td style="font-family:var(--font-body);font-size:0.9rem;font-weight:500;">
        ${escHtml(s.name)}
        <div style="margin-top:0.25rem;"><span class="exam-badge ${typeCls}">${s.subjectType}</span></div>
      </td>
      <td data-label="Internal">${internalCell(s)}</td>
      <td data-label="External">${marksCell('External', s.external || {})}</td>
      <td data-label="Total" class="marks-badge" style="white-space:nowrap;">${fmt2(t.scored)}/${fmt2(t.max)}</td>
      <td data-label="%"><span class="pct-badge ${pctClass(p)}">${p}%</span></td>
      <td data-label="Result">
        ${s.subjectType === 'audit'
          ? `<span style="font-weight:600;color:${passed ? 'var(--accent-light)' : 'var(--red)'};">${passed ? 'Satisfactory' : 'Not Satisfactory'}</span>`
          : `<span style="font-weight:600;color:${passed ? 'var(--accent-light)' : 'var(--red)'};">${grade(p)}${passed ? '' : ' · Fail'}</span>`}
      </td>
      <td>
        <div class="action-cell">
          <button class="btn btn-ghost btn-sm" onclick="openEditSubjectModal('${stage.id}','${s.id}')"><i class="bi bi-pencil-fill"></i> Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDelete('${stage.id}','${s.id}')"><i class="bi bi-trash3-fill"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');

  return `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:0.5rem;">
    <table class="subject-table">
      <thead>
        <tr><th>Subject</th><th>Internal</th><th>External</th><th>Total</th><th>%</th><th>Result</th><th></th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function toggleTerm(termId) {
  const hdr = document.getElementById('term-hdr-' + termId);
  const body = document.getElementById('term-body-' + termId);
  hdr.classList.toggle('collapsed');
  body.classList.toggle('collapsed');
}
