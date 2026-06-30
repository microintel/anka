// ══════════════════════════════════════════════════
//  RENDER DASHBOARD
// ══════════════════════════════════════════════════
function renderDashboard() {
  const cardsEl = document.getElementById('dash-stage-cards');

  if (!state.stages.length) {
    cardsEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="bi bi-journal-bookmark"></i></div><div class="empty-state-text">No stages added yet.</div><div class="empty-state-sub">Click "+ Stage" in the navigation bar to begin (SSLC, Diploma, Engineering, PUC, Medical, ITI...)</div></div>`;
    document.getElementById('dash-stats').innerHTML = '';
    renderDashCharts();
    return;
  }

  cardsEl.innerHTML = state.stages.map((stage, i) => {
    const def = STAGE_TYPES[stage.type] || STAGE_TYPES.custom;
    const subs = stageSubjects(stage.id);
    const avg = stageAvg(subs);
    return `
    <div class="stage-card" onclick="showSection('stage:${stage.id}')">
      <div class="stage-card-label">Stage ${i + 1}</div>
      <div class="stage-card-name">${def.icon} ${escHtml(stageLabel(stage))}</div>
      <div class="stage-card-pct"><span class="counter" data-target="${avg}">0</span>%</div>
      <div class="stage-card-meta">${subs.length} subject${subs.length !== 1 ? 's' : ''} · ${stage.mode === 'annual' ? 'Annual' : stage.terms.length + ' semesters'}</div>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${avg}%"></div></div>
    </div>`;
  }).join('');

  animateCounters();

  const allSubjects = state.subjects
    .filter(s => s.subjectType !== 'audit')
    .map(s => {
      const t = calcSubjectTotal(s);
      return { name: s.name, pct: pct(t.scored, t.max) };
    });

  const best = [...allSubjects].sort((a, b) => b.pct - a.pct)[0];
  const worst = [...allSubjects].sort((a, b) => a.pct - b.pct)[0];
  const total = state.subjects.length;
  const overallPct = allSubjects.length ? (allSubjects.reduce((a, b) => a + b.pct, 0) / allSubjects.length).toFixed(1) : 0;
  const passCount = state.subjects.filter(s => subjectPass(s)).length;
  const passRate = total ? Math.round((passCount / total) * 100) : 0;

  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-cell">
      <div class="stat-label">Total Subjects</div>
      <div class="stat-value">${total}</div>
      <div class="stat-sub">across ${state.stages.length} stage${state.stages.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="stat-cell">
      <div class="stat-label">Overall Average</div>
      <div class="stat-value">${overallPct}%</div>
      <div class="stat-sub">${grade(overallPct)} grade</div>
    </div>
    <div class="stat-cell">
      <div class="stat-label">Pass Rate</div>
      <div class="stat-value">${passRate}%</div>
      <div class="stat-sub">${passCount} of ${total} passing</div>
    </div>
    <div class="stat-cell">
      <div class="stat-label">Stages Tracked</div>
      <div class="stat-value">${state.stages.length}</div>
      <div class="stat-sub">education stages</div>
    </div>
    <div class="stat-cell">
      <div class="stat-label">Best Subject</div>
      <div class="stat-value" style="font-size:0.9rem;">${escHtml(best?.name || '—')}</div>
      <div class="stat-sub">${best?.pct || 0}%</div>
    </div>
    <div class="stat-cell">
      <div class="stat-label">Needs Attention</div>
      <div class="stat-value" style="font-size:0.9rem;color:var(--red);">${escHtml(worst?.name || '—')}</div>
      <div class="stat-sub">${worst?.pct || 0}%</div>
    </div>
  `;

  renderDashCharts();
}

function animateCounters() {
  document.querySelectorAll('.counter[data-target]').forEach(el => {
    const target = parseFloat(el.dataset.target);
    let cur = 0;
    const step = target / 40 || 1;
    const timer = setInterval(() => {
      cur = Math.min(cur + step, target);
      el.textContent = cur.toFixed(1);
      if (cur >= target) clearInterval(timer);
    }, 20);
  });
}
