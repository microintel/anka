// ══════════════════════════════════════════════════
//  RENDER DASHBOARD
// ══════════════════════════════════════════════════
function renderDashboard() {
  // Stage cards
  const stageData = [
    { key:'sslc', label:'Stage I', name:'SSLC', subjects: state.sslc, section:'sslc' },
    { key:'diploma', label:'Stage II', name:'Diploma', subjects: state.diploma, section:'diploma' },
    { key:'engineering', label:'Stage III', name:'Engineering', subjects: state.engineering, section:'engineering' },
  ];

  const cardsEl = document.getElementById('dash-stage-cards');
  cardsEl.innerHTML = stageData.map(s => {
    const avg = s.key === 'sslc'
      ? (s.subjects.length ? pct(s.subjects.reduce((a,b)=>a+(+b.scored||0),0), s.subjects.reduce((a,b)=>a+(+b.max||0),0)) : 0)
      : stageAvg(s.subjects);
    return `
    <div class="stage-card" onclick="showSection('${s.section}')">
      <div class="stage-card-label">${s.label}</div>
      <div class="stage-card-name">${s.name}</div>
      <div class="stage-card-pct"><span class="counter" data-target="${avg}">0</span>%</div>
      <div class="stage-card-meta">${s.subjects.length} subject${s.subjects.length!==1?'s':''}</div>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${avg}%"></div></div>
    </div>`;
  }).join('');

  // Counters animate
  animateCounters();

  // Stats
  const allSubjects = [
    ...state.sslc.map(s=>({name:s.name, pct: pct(+s.scored||0,+s.max||0)})),
    ...state.diploma.map(s=>{ const t=calcSubjectTotal(s); return {name:s.name, pct:pct(t.scored,t.max)}; }),
    ...state.engineering.map(s=>{ const t=calcSubjectTotal(s); return {name:s.name, pct:pct(t.scored,t.max)}; }),
  ];

  const best   = allSubjects.sort((a,b)=>b.pct-a.pct)[0];
  const worst  = [...allSubjects].sort((a,b)=>a.pct-b.pct)[0];
  const total  = state.sslc.length + state.diploma.length + state.engineering.length;
  const overallPct = allSubjects.length ? (allSubjects.reduce((a,b)=>a+b.pct,0)/allSubjects.length).toFixed(1) : 0;

  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-cell">
      <div class="stat-label">Total Subjects</div>
      <div class="stat-value">${total}</div>
      <div class="stat-sub">across all stages</div>
    </div>
    <div class="stat-cell">
      <div class="stat-label">Overall Average</div>
      <div class="stat-value">${overallPct}%</div>
      <div class="stat-sub">${grade(overallPct)} grade</div>
    </div>
    <div class="stat-cell">
      <div class="stat-label">Best Subject</div>
      <div class="stat-value" style="font-size:0.9rem;">${best?.name||'—'}</div>
      <div class="stat-sub">${best?.pct||0}%</div>
    </div>
    <div class="stat-cell">
      <div class="stat-label">Needs Attention</div>
      <div class="stat-value" style="font-size:0.9rem;color:var(--red);">${worst?.name||'—'}</div>
      <div class="stat-sub">${worst?.pct||0}%</div>
    </div>
  `;

  // Charts
  renderDashCharts(stageData);
}

function animateCounters() {
  document.querySelectorAll('.counter[data-target]').forEach(el => {
    const target = parseFloat(el.dataset.target);
    let cur = 0;
    const step = target/40;
    const timer = setInterval(()=>{
      cur = Math.min(cur+step, target);
      el.textContent = cur.toFixed(1);
      if (cur >= target) clearInterval(timer);
    }, 20);
  });
}

