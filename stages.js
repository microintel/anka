// ══════════════════════════════════════════════════
//  RENDER STAGE (diploma/engineering)
// ══════════════════════════════════════════════════
function renderStage(stage) {
  const sems = state.semesters[stage];
  const container = document.getElementById(`${stage}-semesters`);

  if (!sems.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📚</div><div class="empty-state-text">No semesters yet.</div><div class="empty-state-sub">Click "Add Semester" to begin</div></div>`;
    document.getElementById(`${stage}-summary`).textContent = '';
    return;
  }

  const allSubjs = state[stage];
  const totalS = allSubjs.reduce((a,s)=>{ const t=calcSubjectTotal(s); return a+t.scored; },0);
  const totalM = allSubjs.reduce((a,s)=>{ const t=calcSubjectTotal(s); return a+t.max; },0);
  const avg = pct(totalS,totalM);
  document.getElementById(`${stage}-summary`).textContent = `${allSubjs.length} subjects · ${sems.length} semesters · ${avg}% overall`;

  container.innerHTML = sems.map(sem => {
    const subjs = semSubjects(stage, sem.id);
    const avg = semAvg(stage, sem.id);
    return `
    <div class="semester-block" id="sem-block-${sem.id}">
      <div class="semester-header" id="sem-hdr-${sem.id}" onclick="toggleSem('${sem.id}')">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <span class="collapse-icon">▾</span>
          <span class="semester-label">${escHtml(sem.label)}</span>
          <span style="font-family:var(--font-mono);font-size:0.6rem;color:var(--text-dim);">${subjs.length} subjects</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <span class="semester-avg">${avg}%</span>
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openAddSubjectModal('${stage}','${sem.id}')">+ Subject</button>
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();confirmDeleteSem('${stage}','${sem.id}')">✕</button>
        </div>
      </div>
      <div class="semester-body" id="sem-body-${sem.id}">
        ${renderSemBody(stage, sem, subjs)}
      </div>
    </div>`;
  }).join('');
}

function renderSemBody(stage, sem, subjs) {
  if (!subjs.length) {
    return `<div class="empty-state" style="margin-bottom:1rem;">
      <div class="empty-state-text" style="font-size:0.9rem;">No subjects in this semester</div>
    </div>`;
  }

  const isEng = stage === 'engineering';

  const rows = subjs.map(s => {
    const t = calcSubjectTotal(s);
    const p = pct(t.scored, t.max);
    const compPills = (s.components||[]).length
      ? `<div class="comp-list">${(s.components||[]).map(c =>
          `<div class="comp-pill">
            <span class="comp-pill-name">${escHtml(c.name)}</span>
            <span class="comp-pill-score">${c.scored}/${c.max}</span>
          </div>`
        ).join('')}</div>`
      : `<span style="color:var(--text-dim);font-size:0.72rem;">—</span>`;
    return `<tr>
      <td style="font-family:var(--font-body);font-size:0.9rem;font-weight:500;">
        ${escHtml(s.name)}
        ${isEng ? `<div style="margin-top:0.25rem;"><span class="exam-badge exam-${s.examType||'regular'}">${s.examType||'regular'}</span></div>` : ''}
      </td>
      <td data-label="Internals">${compPills}</td>
      <td data-label="External" class="marks-badge" style="white-space:nowrap;">${s.external?.scored||0}/${s.external?.max||0}</td>
      <td data-label="Total" class="marks-badge" style="white-space:nowrap;">${t.scored}/${t.max}</td>
      <td data-label="%"><span class="pct-badge ${pctClass(p)}">${p}%</span></td>
      <td data-label="Grade" style="color:var(--green-light);font-weight:600;font-size:0.9rem;">${grade(p)}</td>
      <td>
        <div class="action-cell">
          <button class="btn btn-ghost btn-sm" onclick="openEditSubjectModal('${stage}','${sem.id}','${s.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDelete('${stage}','${sem.id}','${s.id}')">Del</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  return `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:0.5rem;">
    <table class="subject-table">
      <thead>
        <tr>
          <th>Subject</th>
          <th>Internals</th>
          <th>External</th>
          <th>Total</th>
          <th>%</th>
          <th>Grade</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function toggleSem(semId) {
  const hdr  = document.getElementById('sem-hdr-' + semId);
  const body = document.getElementById('sem-body-' + semId);
  hdr.classList.toggle('collapsed');
  body.classList.toggle('collapsed');
}

