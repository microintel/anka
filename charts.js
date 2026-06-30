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

function renderDashCharts() {
  const graded = allGradedSubjects();
  const gradeCounts = {};
  graded.forEach(s => { const g = grade(s.pct); gradeCounts[g] = (gradeCounts[g] || 0) + 1; });

  makeChart('chartDashPie', {
    type: 'pie',
    data: {
      labels: Object.keys(gradeCounts),
      datasets: [{ data: Object.values(gradeCounts), backgroundColor: ['#5b7fa6','#7fa0c4','#a6bdd6','#d6a23a','#e0824a','#d6534a','#b03a32'] }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: chartDefaults, position: 'bottom' } } },
  });
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
  const idsToClean = ['chartAllStagesBar', 'chartAllStagesGrowth', 'chartStatsAllPie'];

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

  // Per-stage line + bar chart cards (one pair per stage, in current order)
  perStageEl.innerHTML = state.stages.map(s => `
    <div class="chart-card">
      <div class="chart-title">${escHtml(stageLabel(s))} — Term Growth</div>
      <div class="chart-wrap" style="height:210px;"><canvas id="chartLine-${s.id}"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">${escHtml(stageLabel(s))} — Subject %</div>
      <div class="chart-wrap" style="height:210px;"><canvas id="chartBar-${s.id}"></canvas></div>
    </div>
  `).join('');

  state.stages.forEach(stage => {
    let termLabels, termAvgs;
    if (stage.mode === 'semester') {
      termLabels = stage.terms.map(t => t.label);
      termAvgs = stage.terms.map(t => termAvg(stage.id, t.id));
    } else {
      termLabels = [stageLabel(stage)];
      termAvgs = [stageAvg(stageSubjects(stage.id))];
    }
    makeChart(`chartLine-${stage.id}`, {
      type: 'line',
      data: { labels: termLabels, datasets: [{ label: 'Average %', data: termAvgs, borderColor: '#5b7fa6', backgroundColor: 'rgba(91,127,166,0.15)', pointBackgroundColor: '#5b7fa6', pointRadius: 4, tension: 0.35, fill: true }] },
      options: lineChartOpts('Term', '%'),
    });

    const subs = stageSubjects(stage.id).filter(s => s.subjectType !== 'audit').map(s => {
      const t = calcSubjectTotal(s);
      return { name: s.name, pct: pct(t.scored, t.max) };
    }).sort((a, b) => b.pct - a.pct);

    makeChart(`chartBar-${stage.id}`, {
      type: 'bar',
      data: { labels: subs.map(s => s.name), datasets: [{ label: '%', data: subs.map(s => s.pct), backgroundColor: subs.map(s => s.pct >= 50 ? 'rgba(91,127,166,0.75)' : 'rgba(214,83,74,0.75)') }] },
      options: barChartOpts(true),
    });
  });

  // All-stages comparison + growth (uses stage order)
  const allLabels = state.stages.map(s => stageLabel(s));
  const allAvgs = state.stages.map(s => stageAvg(stageSubjects(s.id)));

  makeChart('chartAllStagesBar', {
    type: 'bar',
    data: { labels: allLabels, datasets: [{ label: 'Average %', data: allAvgs, backgroundColor: 'rgba(91,127,166,0.75)' }] },
    options: barChartOpts(false),
  });

  makeChart('chartAllStagesGrowth', {
    type: 'line',
    data: { labels: allLabels, datasets: [{ label: 'Average %', data: allAvgs, borderColor: '#d6a23a', backgroundColor: 'rgba(214,162,58,0.15)', pointBackgroundColor: '#d6a23a', pointRadius: 5, tension: 0.3, fill: true }] },
    options: lineChartOpts('Stage (in order)', '%'),
  });

  // All-stages pie — share of average % across every stage
  makeChart('chartStatsAllPie', {
    type: 'pie',
    data: { labels: allLabels, datasets: [{ data: allAvgs, backgroundColor: ['#5b7fa6','#7fa0c4','#a6bdd6','#d6a23a','#e0824a','#d6534a','#b03a32','#36506b'] }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: chartDefaults, position: 'bottom' } } },
  });
}

function renderCharts() {
  // Per-stage average bar
  const stageLabels = state.stages.map(s => stageLabel(s));
  const stageAvgs = state.stages.map(s => stageAvg(stageSubjects(s.id)));
  makeChart('chartStageComp', {
    type: 'bar',
    data: { labels: stageLabels, datasets: [{ label: 'Average %', data: stageAvgs, backgroundColor: 'rgba(91,127,166,0.75)' }] },
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
