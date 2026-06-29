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

const chartDefaults = {
  color: 'rgba(255,255,255,0.65)',
  font: { family: "system-ui, sans-serif", size: 10 },
};

function renderDashCharts(stageData) {
  // Overall line chart
  const labels = ['SSLC', 'Diploma', 'Engineering'];
  const avgs = [
    pct(state.sslc.reduce((a,b)=>a+(+b.scored||0),0), state.sslc.reduce((a,b)=>a+(+b.max||0),0)),
    stageAvg(state.diploma),
    stageAvg(state.engineering),
  ];

  makeChart('chartOverall', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Average %',
        data: avgs,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.10)',
        pointBackgroundColor: '#22c55e',
        pointRadius: 5,
        tension: 0.3,
        fill: true,
      }]
    },
    options: lineChartOpts('Stage', '%')
  });

  // Best vs worst bar
  const allSubjs = [
    ...state.sslc.map(s=>({name:s.name, pct:pct(+s.scored||0,+s.max||0)})),
    ...state.diploma.map(s=>{ const t=calcSubjectTotal(s); return {name:s.name, pct:pct(t.scored,t.max)}; }),
    ...state.engineering.map(s=>{ const t=calcSubjectTotal(s); return {name:s.name, pct:pct(t.scored,t.max)}; }),
  ].sort((a,b)=>b.pct-a.pct);
  const top5 = allSubjs.slice(0,5);
  const bot5 = allSubjs.slice(-5).reverse();
  const combined = [...top5, ...bot5];

  makeChart('chartBestWorst', {
    type: 'bar',
    data: {
      labels: combined.map(s => s.name.length>12?s.name.slice(0,12)+'…':s.name),
      datasets: [{
        data: combined.map(s=>s.pct),
        backgroundColor: combined.map((s,i)=> i<5 ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'),
        borderColor: combined.map((s,i)=> i<5 ? '#4ade80' : '#f87171'),
        borderWidth: 1,
      }]
    },
    options: barChartOpts('%')
  });
}

function renderSSLCChart() {
  const subjs = state.sslc;
  if (!subjs.length) return;
  makeChart('chartSSLC', {
    type: 'bar',
    data: {
      labels: subjs.map(s=>s.name.length>10?s.name.slice(0,10)+'…':s.name),
      datasets: [{
        label: 'Percentage',
        data: subjs.map(s=>pct(+s.scored||0,+s.max||0)),
        backgroundColor: 'rgba(34,197,94,0.45)',
        borderColor: '#22c55e',
        borderWidth: 1,
      }]
    },
    options: barChartOpts('%')
  });
}

function renderCharts() {
  // ── Diploma semesters bar ──
  const dipSems = state.semesters.diploma;
  makeChart('chartDipSem', {
    type: 'line',
    data: {
      labels: dipSems.map(s=>s.label),
      datasets: [{
        label: 'Avg %',
        data: dipSems.map(s=>semAvg('diploma',s.id)),
        backgroundColor: 'rgba(34,197,94,0.45)',
        borderColor: '#22c55e',
        borderWidth: 1,
      }]
    },
    options: barChartOpts('%')
  });

  // ── Engineering semesters bar ──
  const engSems = state.semesters.engineering;
  makeChart('chartEngSem', {
    type: 'line',
    data: {
      labels: engSems.map(s=>s.label),
      datasets: [{
        label: 'Avg %',
        data: engSems.map(s=>semAvg('engineering',s.id)),
        backgroundColor: 'rgba(34,197,94,0.35)',
        borderColor: '#4ade80',
        borderWidth: 1,
      }]
    },
    options: barChartOpts('%')
  });

  // ── All subjects list for downstream charts ──
  const allSubjs = [
    ...state.sslc.map(s=>{ const sc=+s.scored||0,mx=+s.max||0; return {name:s.name, pct:pct(sc,mx)}; }),
    ...state.diploma.map(s=>{ const t=calcSubjectTotal(s); return {name:s.name, pct:pct(t.scored,t.max)}; }),
    ...state.engineering.map(s=>{ const t=calcSubjectTotal(s); return {name:s.name, pct:pct(t.scored,t.max)}; }),
  ];

  // ── Grade distribution pie ──
  const gradeCounts = {O:0,'A+':0,A:0,'B+':0,B:0,C:0,F:0};
  allSubjs.forEach(s => { const g=grade(s.pct); gradeCounts[g]=(gradeCounts[g]||0)+1; });
  const gradeLabels = Object.keys(gradeCounts).filter(g=>gradeCounts[g]>0);
  const gradeColors = {
    'O':  'rgba(34,197,94,0.8)',
    'A+': 'rgba(74,222,128,0.8)',
    'A':  'rgba(96,165,250,0.8)',
    'B+': 'rgba(251,191,36,0.8)',
    'B':  'rgba(251,146,60,0.8)',
    'C':  'rgba(167,139,250,0.8)',
    'F':  'rgba(248,113,113,0.8)',
  };
  makeChart('chartGradePie', {
    type: 'pie',
    data: {
      labels: gradeLabels,
      datasets: [{
        data: gradeLabels.map(g=>gradeCounts[g]),
        backgroundColor: gradeLabels.map(g=>gradeColors[g]),
        borderColor: 'rgba(0,0,0,0.3)',
        borderWidth: 1,
      }]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ display:true, position:'right', labels:{color:'rgba(255,255,255,0.7)',font:{family:"system-ui",size:10},padding:10} }
      }
    }
  });

  // ── Stage comparison bar ──
  const stageAvgs = [
    pct(state.sslc.reduce((a,b)=>a+(+b.scored||0),0), state.sslc.reduce((a,b)=>a+(+b.max||0),0)),
    stageAvg(state.diploma),
    stageAvg(state.engineering),
  ];
  makeChart('chartStageComp', {
    type: 'bar',
    data: {
      labels: ['SSLC','Diploma','Engineering'],
      datasets: [{
        label: 'Overall %',
        data: stageAvgs,
        backgroundColor: ['rgba(34,197,94,0.55)','rgba(74,222,128,0.55)','rgba(96,165,250,0.55)'],
        borderColor: ['#22c55e','#4ade80','#60a5fa'],
        borderWidth: 1,
      }]
    },
    options: barChartOpts('%')
  });

  // ── SSLC subject bar ──
  const sslc = state.sslc;
  if (sslc.length) {
    makeChart('chartSSLCBar', {
      type: 'bar',
      data: {
        labels: sslc.map(s=>s.name.length>12?s.name.slice(0,12)+'…':s.name),
        datasets: [{
          label: '%',
          data: sslc.map(s=>pct(+s.scored||0,+s.max||0)),
          backgroundColor: sslc.map(s=>{ const p=pct(+s.scored||0,+s.max||0); return p>=70?'rgba(34,197,94,0.55)':p>=50?'rgba(251,191,36,0.55)':'rgba(239,68,68,0.55)'; }),
          borderColor: sslc.map(s=>{ const p=pct(+s.scored||0,+s.max||0); return p>=70?'#22c55e':p>=50?'#fbbf24':'#f87171'; }),
          borderWidth: 1,
        }]
      },
      options: barChartOpts('%')
    });
  }

  // ── SSLC Radar ──
  if (sslc.length >= 3) {
    makeChart('chartSSLCRadar', {
      type: 'radar',
      data: {
        labels: sslc.map(s=>s.name.length>8?s.name.slice(0,8)+'…':s.name),
        datasets: [{
          label: 'SSLC',
          data: sslc.map(s=>pct(+s.scored||0,+s.max||0)),
          backgroundColor: 'rgba(34,197,94,0.12)',
          borderColor: '#22c55e',
          pointBackgroundColor: '#22c55e',
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display:false } },
        scales: {
          r: {
            max: 100, min: 0,
            grid: { color: 'rgba(34,197,94,0.10)' },
            ticks: { color: 'rgba(255,255,255,0.45)', font:{family:"system-ui",size:9}, backdropColor:'transparent', stepSize:25 },
            pointLabels: { color: 'rgba(255,255,255,0.65)', font:{family:"system-ui",size:9} },
          }
        }
      }
    });
  }

  // ── Pass/Fail doughnut ──
  const passCount = allSubjs.filter(s=>s.pct>=40).length;
  const failCount = allSubjs.filter(s=>s.pct<40).length;
  makeChart('chartPassFail', {
    type: 'doughnut',
    data: {
      labels: ['Pass','Fail'],
      datasets: [{
        data: [passCount, failCount],
        backgroundColor: ['rgba(34,197,94,0.75)','rgba(239,68,68,0.75)'],
        borderColor: ['#22c55e','#ef4444'],
        borderWidth: 1,
      }]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      cutout: '60%',
      plugins:{
        legend:{ display:true, position:'bottom', labels:{color:'rgba(255,255,255,0.7)',font:{family:"system-ui",size:10}} }
      }
    }
  });

  // ── Top 8 subjects horizontal bar ──
  const top8 = [...allSubjs].sort((a,b)=>b.pct-a.pct).slice(0,8);
  makeChart('chartTop8', {
    type: 'bar',
    data: {
      labels: top8.map(s=>s.name.length>14?s.name.slice(0,14)+'…':s.name),
      datasets: [{
        label: '%',
        data: top8.map(s=>s.pct),
        backgroundColor: top8.map(s=>s.pct>=70?'rgba(34,197,94,0.55)':s.pct>=50?'rgba(251,191,36,0.55)':'rgba(239,68,68,0.55)'),
        borderColor: top8.map(s=>s.pct>=70?'#22c55e':s.pct>=50?'#fbbf24':'#f87171'),
        borderWidth: 1,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{
        x:{ min:0, max:100, grid:{color:'rgba(34,197,94,0.08)'}, ticks:{color:'rgba(255,255,255,0.45)',font:{family:"system-ui",size:9},callback:v=>v+'%'} },
        y:{ grid:{display:false}, ticks:{color:'rgba(255,255,255,0.65)',font:{family:"system-ui",size:9}} }
      }
    }
  });
}

function lineChartOpts(xLabel, yLabel) {
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false} },
    scales:{
      x:{ grid:{color:'rgba(34,197,94,0.08)'}, ticks:{color:'rgba(255,255,255,0.45)',font:{family:"system-ui",size:9}} },
      y:{ min:0,max:100, grid:{color:'rgba(34,197,94,0.08)'}, ticks:{color:'rgba(255,255,255,0.45)',font:{family:"system-ui",size:9}} }
    }
  };
}

function barChartOpts(yLabel) {
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false} },
    scales:{
      x:{ grid:{display:false}, ticks:{color:'rgba(255,255,255,0.45)',font:{family:"system-ui",size:9}} },
      y:{ min:0,max:100, grid:{color:'rgba(34,197,94,0.08)'}, ticks:{color:'rgba(255,255,255,0.45)',font:{family:"system-ui",size:9}, callback:v=>v+'%'} }
    }
  };
}

