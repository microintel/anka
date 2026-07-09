// ══════════════════════════════════════════════════
//  CHARTS
// ══════════════════════════════════════════════════
const chartInstances = {};

function makeChart(canvasId, config) {
  if (chartInstances[canvasId]) { chartInstances[canvasId].destroy(); }
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  chartInstances[canvasId] = new Chart(ctx, config);
}

function isLightTheme() { return document.body.classList.contains('theme-light'); }

// ── Per-stage colour palette ──
// Each stage gets a distinct, stable colour (based on its position in
// state.stages) so it can be told apart at a glance across every chart
// in the Statistics tab.
const STAGE_COLOR_PALETTE = [
  '#5b7fa6', // blue
  '#d6a23a', // amber
  '#3fa796', // teal
  '#e0824a', // orange
  '#9b7fd6', // purple
  '#d6534a', // red
  '#4ba3c3', // cyan
  '#c46b9e', // pink
  '#8aa646', // green
  '#b08968', // brown
];

function stageColor(stageId) {
  const idx = state.stages.findIndex(s => s.id === stageId);
  return STAGE_COLOR_PALETTE[(idx < 0 ? 0 : idx) % STAGE_COLOR_PALETTE.length];
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function stageColorAlpha(stageId, alpha) {
  return hexToRgba(stageColor(stageId), alpha);
}

const chartDefaults = {
  get color() { return isLightTheme() ? 'rgba(22,24,26,0.65)' : 'rgba(255,255,255,0.65)'; },
  font: { family: 'system-ui, sans-serif', size: 10 },
};
function chartGridColor() { return isLightTheme() ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'; }

function lineChartOpts(xLabel, yLabel) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: chartDefaults } },
    scales: {
      x: { ticks: chartDefaults, grid: { color: chartGridColor() }, title: { display: !!xLabel, text: xLabel, color: chartDefaults.color } },
      y: { ticks: chartDefaults, grid: { color: chartGridColor() }, title: { display: !!yLabel, text: yLabel, color: chartDefaults.color }, beginAtZero: true, max: 100 },
    },
  };
}

function barChartOpts(horizontal) {
  return {
    indexAxis: horizontal ? 'y' : 'x',
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: chartDefaults, grid: { color: chartGridColor() } },
      y: { ticks: chartDefaults, grid: { color: chartGridColor() } },
    },
  };
}

function allGradedSubjects() {
  return state.subjects.filter(s => s.subjectType !== 'audit').map(s => {
    const t = calcSubjectTotal(s);
    return { name: s.name, pct: pct(t.scored, t.max), pass: subjectPass(s) };
  });
}

const GRADE_ORDER = ['O', 'A+', 'A', 'B+', 'B', 'C', 'F'];
const GRADE_COLORS = {
  O:  '#06d6a0', 'A+': '#4de8bf', A: '#7c5cff', 'B+': '#a48cff',
  B:  '#ffb703', C: '#ff9f4a', F: '#ff5c6c',
};

function renderDashCharts() {
  const wrap = document.getElementById('dash-grade-dist');
  if (!wrap) return;

  // Clean up the old canvas-based chart instance if it still exists from a previous version
  if (chartInstances['chartDashPie']) { chartInstances['chartDashPie'].destroy(); delete chartInstances['chartDashPie']; }

  const graded = allGradedSubjects();
  if (!graded.length) {
    wrap.innerHTML = `<div class="empty-state-sub" style="padding:0.5rem 0;">No graded subjects yet.</div>`;
    return;
  }

  const gradeCounts = {};
  graded.forEach(s => { const g = grade(s.pct); gradeCounts[g] = (gradeCounts[g] || 0) + 1; });
  const total = graded.length;

  wrap.innerHTML = GRADE_ORDER.filter(g => gradeCounts[g]).map(g => {
    const count = gradeCounts[g];
    const share = Math.round((count / total) * 100);
    const color = GRADE_COLORS[g] || 'var(--accent)';
    return `
    <div class="grade-dist-cell" style="border-top-color:${color};">
      <div class="grade-dist-letter" style="color:${color};">${g}</div>
      <div class="grade-dist-count">${count}</div>
      <div class="grade-dist-label">subject${count === 1 ? '' : 's'}</div>
      <div class="grade-dist-bar"><div class="grade-dist-bar-fill" style="width:${share}%;background:${color};"></div></div>
      <div class="grade-dist-pct">${share}%</div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════
//  STATISTICS TAB — reorder stages, per-stage charts,
//  all-stage comparison, all-stage growth, share pie
// ══════════════════════════════════════════════════
function renderStageOrderList() {
  const wrap = document.getElementById('stage-order-list');
  if (!wrap) return;
  if (!state.stages.length) {
    wrap.innerHTML = `<div class="empty-state-sub" style="padding:0.5rem 0;">No stages yet — add one to set an order.</div>`;
    return;
  }
  wrap.innerHTML = state.stages.map((s, i) => {
    const def = STAGE_TYPES[s.type] || STAGE_TYPES.custom;
    return `
    <div class="order-row">
      <div class="order-row-num">${i + 1}</div>
      <span style="display:inline-block;width:0.7rem;height:0.7rem;border-radius:50%;background:${stageColor(s.id)};margin-right:0.5rem;flex-shrink:0;"></span>
      <div class="order-row-name">${def.icon} ${escHtml(stageLabel(s))}</div>
      <div class="order-row-actions">
        <button class="btn btn-ghost btn-sm" onclick="moveStage('${s.id}', -1)" ${i === 0 ? 'disabled' : ''}><i class="bi bi-arrow-up"></i></button>
        <button class="btn btn-ghost btn-sm" onclick="moveStage('${s.id}', 1)" ${i === state.stages.length - 1 ? 'disabled' : ''}><i class="bi bi-arrow-down"></i></button>
      </div>
    </div>`;
  }).join('');
}

function renderStatsPage() {
  renderStageOrderList();

  const perStageEl = document.getElementById('stats-per-stage');
  const idsToClean = ['chartAllStagesBar', 'chartAllStagesGrowth', 'chartStatsAllPie', 'chartIntExtByStage', 'chartPassRateByStage', 'chartTopBottomSubjects'];

  if (!state.stages.length) {
    perStageEl.innerHTML = `<div class="empty-state" style="flex:1 1 100%;"><div class="empty-state-icon"><i class="bi bi-bar-chart-line"></i></div><div class="empty-state-text">No stages to analyse</div><div class="empty-state-sub">Add a stage and a few subjects to see statistics</div></div>`;
    Object.keys(chartInstances).forEach(id => {
      if (id.startsWith('chartLine-') || id.startsWith('chartBar-') || idsToClean.includes(id)) {
        chartInstances[id].destroy();
        delete chartInstances[id];
      }
    });
    return;
  }

  // Marks-based stages only — CET stages track rank, not %, so they're
  // excluded from every percentage/average chart below.
  const nonCetStages = state.stages.filter(s => s.mode !== 'cet');

  // Per-stage line + bar chart cards (one pair per stage, in current order)
  // Each stage card is accented with the stage's own colour so it's
  // instantly recognisable across every chart below.
  // Note: SSLC skips the Term Growth chart, and Diploma/Engineering skip
  // the Subject % chart (per user preference).
  perStageEl.innerHTML = nonCetStages.map(s => `
    ${s.type === 'sslc' ? '' : `
    <div class="chart-card" style="border-top:3px solid ${stageColor(s.id)};">
      <div class="chart-title"><span style="display:inline-block;width:0.65rem;height:0.65rem;border-radius:50%;background:${stageColor(s.id)};margin-right:0.4rem;"></span>${escHtml(stageLabel(s))} — Term Growth</div>
      <div class="chart-wrap" style="height:210px;"><canvas id="chartLine-${s.id}"></canvas></div>
    </div>`}
    ${(s.type === 'diploma' || s.type === 'engineering') ? '' : `
    <div class="chart-card" style="border-top:3px solid ${stageColor(s.id)};">
      <div class="chart-title"><span style="display:inline-block;width:0.65rem;height:0.65rem;border-radius:50%;background:${stageColor(s.id)};margin-right:0.4rem;"></span>${escHtml(stageLabel(s))} — Subject %</div>
      <div class="chart-wrap" style="height:210px;"><canvas id="chartBar-${s.id}"></canvas></div>
    </div>`}
  `).join('');

  nonCetStages.forEach(stage => {
    let termLabels, termAvgs;
    if (stage.mode === 'semester') {
      termLabels = stage.terms.map(t => t.label);
      termAvgs = stage.terms.map(t => termAvg(stage.id, t.id));
    } else {
      termLabels = [stageLabel(stage)];
      termAvgs = [stageAvg(stageSubjects(stage.id))];
    }
    const sColor = stageColor(stage.id);
    if (stage.type !== 'sslc') {
      makeChart(`chartLine-${stage.id}`, {
        type: 'line',
        data: { labels: termLabels, datasets: [{ label: 'Average %', data: termAvgs, borderColor: sColor, backgroundColor: stageColorAlpha(stage.id, 0.15), pointBackgroundColor: sColor, pointRadius: 4, tension: 0.35, fill: true }] },
        options: lineChartOpts('Term', '%'),
      });
    } else if (chartInstances[`chartLine-${stage.id}`]) {
      chartInstances[`chartLine-${stage.id}`].destroy();
      delete chartInstances[`chartLine-${stage.id}`];
    }

    if (stage.type !== 'diploma' && stage.type !== 'engineering') {
      const subs = stageSubjects(stage.id).filter(s => s.subjectType !== 'audit').map(s => {
        const t = calcSubjectTotal(s);
        return { name: s.name, pct: pct(t.scored, t.max) };
      }).sort((a, b) => b.pct - a.pct);

      makeChart(`chartBar-${stage.id}`, {
        type: 'bar',
        data: { labels: subs.map(s => s.name), datasets: [{ label: '%', data: subs.map(s => s.pct), backgroundColor: subs.map(s => s.pct >= 50 ? stageColorAlpha(stage.id, 0.75) : 'rgba(214,83,74,0.75)') }] },
        options: barChartOpts(true),
      });
    } else if (chartInstances[`chartBar-${stage.id}`]) {
      chartInstances[`chartBar-${stage.id}`].destroy();
      delete chartInstances[`chartBar-${stage.id}`];
    }
  });

  // All-stages comparison + growth (uses stage order)
  // Each stage keeps its own colour here too, so the same stage is
  // recognisable whether you're looking at the bar, growth, or pie chart.
  const allLabels = nonCetStages.map(s => stageLabel(s));
  const allAvgs = nonCetStages.map(s => stageAvg(stageSubjects(s.id)));
  const allColors = nonCetStages.map(s => stageColor(s.id));
  const allColorsAlpha = nonCetStages.map(s => stageColorAlpha(s.id, 0.75));

  makeChart('chartAllStagesBar', {
    type: 'bar',
    data: { labels: allLabels, datasets: [{ label: 'Average %', data: allAvgs, backgroundColor: allColorsAlpha, borderColor: allColors, borderWidth: 1.5 }] },
    options: barChartOpts(false),
  });

  makeChart('chartAllStagesGrowth', {
    type: 'line',
    data: { labels: allLabels, datasets: [{ label: 'Average %', data: allAvgs, borderColor: 'rgba(214,162,58,0.55)', backgroundColor: 'rgba(214,162,58,0.1)', pointBackgroundColor: allColors, pointBorderColor: allColors, pointRadius: 6, tension: 0.3, fill: true }] },
    options: lineChartOpts('Stage (in order)', '%'),
  });

  // All-stages pie — share of average % across every stage
  makeChart('chartStatsAllPie', {
    type: 'pie',
    data: { labels: allLabels, datasets: [{ data: allAvgs, backgroundColor: allColors }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: chartDefaults, position: 'bottom' } } },
  });

  // ── Internal vs External — average by stage (grouped bar) ──
  const intAvgs = nonCetStages.map(s => stageIntExtAvg(s.id).intPct);
  const extAvgs = nonCetStages.map(s => stageIntExtAvg(s.id).extPct);
  makeChart('chartIntExtByStage', {
    type: 'bar',
    data: {
      labels: allLabels,
      datasets: [
        { label: 'Internal %', data: intAvgs, backgroundColor: 'rgba(6,214,160,0.7)', borderColor: '#06d6a0', borderWidth: 1.5 },
        { label: 'External %', data: extAvgs, backgroundColor: 'rgba(124,92,255,0.7)', borderColor: '#7c5cff', borderWidth: 1.5 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: chartDefaults, position: 'bottom' } },
      scales: {
        x: { ticks: chartDefaults, grid: { color: chartGridColor() } },
        y: { ticks: chartDefaults, grid: { color: chartGridColor() }, beginAtZero: true, max: 100 },
      },
    },
  });

  // ── Pass rate by stage (bar) ──
  const passRates = nonCetStages.map(s => stagePassRate(s.id));
  makeChart('chartPassRateByStage', {
    type: 'bar',
    data: { labels: allLabels, datasets: [{ label: 'Pass Rate %', data: passRates, backgroundColor: allColorsAlpha, borderColor: allColors, borderWidth: 1.5 }] },
    options: barChartOpts(false),
  });

  // ── Best & weakest subjects overall (top 5 + bottom 5, horizontal bar) ──
  const gradedSorted = allGradedSubjects().slice().sort((a, b) => b.pct - a.pct);
  const top = gradedSorted.slice(0, 5);
  const bottom = gradedSorted.length > 5 ? gradedSorted.slice(-5).reverse() : [];
  const combined = [...top, ...bottom.filter(b => !top.includes(b))];
  makeChart('chartTopBottomSubjects', {
    type: 'bar',
    data: {
      labels: combined.map(s => s.name),
      datasets: [{
        label: '%',
        data: combined.map(s => s.pct),
        backgroundColor: combined.map(s => s.pct >= 50 ? 'rgba(6,214,160,0.75)' : 'rgba(214,83,74,0.75)'),
      }],
    },
    options: barChartOpts(true),
  });
}

// Average internal % and external % across a stage's graded subjects
function stageIntExtAvg(stageId) {
  const subs = stageSubjects(stageId).filter(s => s.subjectType !== 'audit');
  let intS = 0, intM = 0, extS = 0, extM = 0;
  subs.forEach(s => {
    const t = calcSubjectTotal(s);
    intS += t.intObtained; intM += t.intMax;
    extS += t.extObtained; extM += t.extMax;
  });
  return { intPct: intM ? pct(intS, intM) : 0, extPct: extM ? pct(extS, extM) : 0 };
}

// % of subjects (incl. audit) that clear both internal & external minimums
function stagePassRate(stageId) {
  const subs = stageSubjects(stageId);
  if (!subs.length) return 0;
  const passed = subs.filter(subjectPass).length;
  return Math.round((passed / subs.length) * 1000) / 10;
}

function renderCharts() {
  // Per-stage average bar — each stage shown in its own colour
  // (CET stages track rank, not %, so they're excluded here too)
  const chartableStages = state.stages.filter(s => s.mode !== 'cet');
  const stageLabels = chartableStages.map(s => stageLabel(s));
  const stageAvgs = chartableStages.map(s => stageAvg(stageSubjects(s.id)));
  const stageBarColors = chartableStages.map(s => stageColorAlpha(s.id, 0.75));
  const stageBarBorders = chartableStages.map(s => stageColor(s.id));
  makeChart('chartStageComp', {
    type: 'bar',
    data: { labels: stageLabels, datasets: [{ label: 'Average %', data: stageAvgs, backgroundColor: stageBarColors, borderColor: stageBarBorders, borderWidth: 1.5 }] },
    options: barChartOpts(false),
  });

  // Grade distribution pie
  const graded = allGradedSubjects();
  const gradeCounts = {};
  graded.forEach(s => { const g = grade(s.pct); gradeCounts[g] = (gradeCounts[g] || 0) + 1; });
  makeChart('chartGradePie', {
    type: 'pie',
    data: {
      labels: Object.keys(gradeCounts),
      datasets: [{ data: Object.values(gradeCounts), backgroundColor: ['#5b7fa6','#7fa0c4','#a6bdd6','#d6a23a','#e0824a','#d6534a','#b03a32'] }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: chartDefaults, position: 'bottom' } } },
  });

  // Pass / fail pie (across all subjects incl. audit, using subjectPass)
  const passCount = state.subjects.filter(s => subjectPass(s)).length;
  const failCount = state.subjects.length - passCount;
  makeChart('chartPassFail', {
    type: 'pie',
    data: { labels: ['Pass', 'Fail'], datasets: [{ data: [passCount, failCount], backgroundColor: ['#5b7fa6', '#d6534a'] }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: chartDefaults, position: 'bottom' } } },
  });

  // Top 8 subjects
  const top8 = [...graded].sort((a, b) => b.pct - a.pct).slice(0, 8);
  makeChart('chartTop8', {
    type: 'bar',
    data: { labels: top8.map(s => s.name), datasets: [{ label: '%', data: top8.map(s => s.pct), backgroundColor: 'rgba(91,127,166,0.75)' }] },
    options: barChartOpts(true),
  });

  // Semester-wise average for each semester-mode stage (first one shown, or combined)
  const semStage = state.stages.find(s => s.mode === 'semester');
  if (semStage) {
    const tLabels = semStage.terms.map(t => t.label);
    const tAvgs = semStage.terms.map(t => termAvg(semStage.id, t.id));
    makeChart('chartTermAvg', {
      type: 'bar',
      data: { labels: tLabels, datasets: [{ label: `${stageLabel(semStage)} Avg %`, data: tAvgs, backgroundColor: 'rgba(91,127,166,0.75)' }] },
      options: barChartOpts(false),
    });
  } else if (chartInstances['chartTermAvg']) {
    chartInstances['chartTermAvg'].destroy();
  }
}
