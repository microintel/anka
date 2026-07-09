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
    if (stage.mode === 'cet') {
      const c = stage.cet || {};
      return `
      <div class="stage-card" onclick="showSection('stage:${stage.id}')">
        <div class="stage-card-label">Stage ${i + 1}</div>
        <div class="stage-card-name">${def.icon} ${escHtml(stageLabel(stage))}</div>
        <div class="stage-card-pct">${c.rank ? '#' + escHtml(String(c.rank)) : '—'}</div>
        <div class="stage-card-meta">${c.conversion ? fmt2(c.conversion) + '/100 conversion' : 'No details yet'}</div>
      </div>`;
    }
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

// ══════════════════════════════════════════════════
//  HOW TO USE (home screen info icon)
// ══════════════════════════════════════════════════
function showHowToUse() {
  openModal('How to Use Anka', `
    <div style="font-family: var(--font-body); font-size: 0.85rem; color: var(--text-secondary); line-height: 1.65;">
      <ol style="margin:0 0 0.9rem 1.1rem; padding:0; color:var(--text-secondary); line-height:1.75;">
        <li style="margin-bottom:0.6rem;"><strong style="color:var(--text-primary);"><i class="bi bi-plus-circle-fill" style="color:var(--accent);"></i> Add a stage</strong> — tap <strong>Add</strong> and pick a type (SSLC, Diploma, Engineering, PUC, Medical, ITI, or Custom), then choose annual or semester-wise.</li>
        <li style="margin-bottom:0.6rem;"><strong style="color:var(--text-primary);"><i class="bi bi-pencil-square" style="color:var(--accent);"></i> Enter your marks</strong> — open the stage and add subjects with internal/external marks; Anka works out totals, percentages and grades automatically.</li>
        <li style="margin-bottom:0.6rem;"><strong style="color:var(--text-primary);"><i class="bi bi-bar-chart-line-fill" style="color:var(--accent);"></i> Track your progress</strong> — check <strong>Statistics</strong> and <strong>Charts</strong> anytime to see trends, compare stages, and reorder them however you like.</li>
        <li style="margin-bottom:0.6rem;"><strong style="color:var(--text-primary);"><i class="bi bi-person-check-fill" style="color:var(--accent);"></i> Sign in to sync</strong> — from <strong>Account</strong>, sign in with Google or email/password so your data can travel with you across devices.</li>
        <li style="margin-bottom:0.6rem;"><strong style="color:var(--text-primary);"><i class="bi bi-cloud-arrow-up-fill" style="color:var(--accent);"></i> Back up to the cloud</strong> — tap <strong>Backup to Cloud</strong> to save everything to your account; <strong>Restore from Cloud</strong> pulls it back down on any device you sign into. <em>Each backup fully replaces the previous cloud copy, so make sure this device has your latest edits before backing up.</em></li>
        <li style="margin-bottom:0;"><strong style="color:var(--text-primary);"><i class="bi bi-file-earmark-arrow-down-fill" style="color:var(--accent);"></i> Export, print, or reset</strong> — use <strong>Export</strong> or <strong>PDF Report</strong> to keep an offline copy, or <strong>Factory Reset</strong> to wipe this device's local data without touching your cloud backup.</li>
      </ol>
      <p style="margin:0; padding-top:0.85rem; border-top:1px solid var(--border); color:var(--text-secondary);">
        <strong style="color:var(--accent);">Tip:</strong> you can revisit this guide anytime from the <i class="bi bi-info-circle"></i> icon here on Home, or from <strong>Account → About Anka</strong>.
      </p>
    </div>
  `);
  setModalFooter([{ label: 'Got it', cls: 'btn-solid', fn: 'closeModal()' }]);
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
