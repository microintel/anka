// ══════════════════════════════════════════════════
//  PDF REPORT — full report incl. profile, stage order,
//  subject tables and every chart in the app
// ══════════════════════════════════════════════════
async function generatePDFReport() {
  if (!state.stages.length) { toast('Add a stage with subjects first'); return; }

  toast('Generating full report…');

  // Make sure every chart in the app has been rendered at least once
  // so its canvas has pixel data we can export as an image.
  if (typeof renderDashCharts === 'function') renderDashCharts();
  if (typeof renderStatsPage === 'function') renderStatsPage();
  if (typeof renderCharts === 'function') renderCharts();
  await new Promise(r => setTimeout(r, 350)); // let Chart.js finish painting

  const now = new Date().toLocaleString('en-IN');
  const overallPct = state.subjects.length
    ? stageAvg(state.subjects.filter(s => s.subjectType !== 'audit'))
    : 0;

  // ── Profile summary ──
  const profileHtml = `
    <div style="display:flex;align-items:center;gap:16px;border:1px solid #e6dfc8;border-radius:8px;padding:14px 18px;margin-bottom:18px;background:#faf7ee;">
      <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#3a5a7a,#c8922a);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:700;flex-shrink:0;">${escHtml((userProfile.name || 'U')[0].toUpperCase())}</div>
      <div style="flex:1;">
        <div style="font-size:1rem;font-weight:700;">${escHtml(userProfile.name || 'User')}</div>
        <div style="font-size:0.75rem;color:#666;">${escHtml(userProfile.email || '')} · Member since ${escHtml(userProfile.createdDate || '')}</div>
      </div>
      <div style="display:flex;gap:14px;text-align:center;">
        <div><div style="font-size:1.1rem;font-weight:700;color:#3a5a7a;">${state.stages.length}</div><div style="font-size:0.6rem;color:#888;text-transform:uppercase;">Stages</div></div>
        <div><div style="font-size:1.1rem;font-weight:700;color:#3a5a7a;">${state.subjects.length}</div><div style="font-size:0.6rem;color:#888;text-transform:uppercase;">Subjects</div></div>
        <div><div style="font-size:1.1rem;font-weight:700;color:#c8922a;">${overallPct}%</div><div style="font-size:0.6rem;color:#888;text-transform:uppercase;">Overall</div></div>
      </div>
    </div>`;

  // ── Stage order ──
  const orderHtml = `
    <h2 style="margin-top:8px;border-bottom:2px solid #c8922a;padding-bottom:4px;">Stage Order</h2>
    <ol style="margin:8px 0 4px 22px;font-size:12.5px;">
      ${state.stages.map(s => `<li style="margin-bottom:3px;">${escHtml(stageLabel(s))} — ${stageAvg(stageSubjects(s.id))}%</li>`).join('')}
    </ol>`;

  // ── Per-stage subject tables ──
  let stagesHtml = '';
  state.stages.forEach((stage, idx) => {
    const subs = stageSubjects(stage.id);
    if (!subs.length) return;
    const avg = stageAvg(subs);

    let body = '';
    if (stage.mode === 'annual') {
      body = subjectRowsHtml(subs);
    } else {
      body = stage.terms.map(term => {
        const tSubs = termSubjects(stage.id, term.id);
        if (!tSubs.length) return '';
        return `<h4 style="margin:14px 0 6px;color:#c8922a;">${escHtml(term.label)} — ${termAvg(stage.id, term.id)}%</h4>${subjectRowsHtml(tSubs)}`;
      }).join('');
    }

    stagesHtml += `
      <h2 style="margin-top:28px;border-bottom:2px solid #c8922a;padding-bottom:4px;">
        ${idx + 1}. ${escHtml(stageLabel(stage))} (${stage.mode === 'annual' ? 'Annual' : 'Semester-wise'}) — ${avg}%
      </h2>
      ${body}`;
  });

  // ── Charts gallery (every chart currently in the app) ──
  const chartBlock = (id, title) => {
    const inst = chartInstances[id];
    if (!inst) return '';
    let img;
    try { img = inst.toBase64Image(); } catch (e) { return ''; }
    return `
      <div style="break-inside:avoid;margin-bottom:16px;">
        <div style="font-size:0.78rem;font-weight:600;color:#444;margin-bottom:4px;">${escHtml(title)}</div>
        <img src="${img}" style="width:100%;max-width:320px;border:1px solid #e6e2d6;border-radius:6px;background:#fff;">
      </div>`;
  };

  const chartCells = [
    chartBlock('chartDashPie', 'Grade Distribution — All Subjects'),
    chartBlock('chartStageComp', 'Average % by Stage'),
    chartBlock('chartTermAvg', 'Semester-wise Average %'),
    chartBlock('chartGradePie', 'Grade Distribution'),
    chartBlock('chartPassFail', 'Pass vs Fail'),
    chartBlock('chartTop8', 'Top 8 Subjects by %'),
    chartBlock('chartAllStagesBar', 'All Stages — Comparison'),
    chartBlock('chartAllStagesGrowth', 'All Stages — Growth Trend'),
    chartBlock('chartStatsAllPie', 'All Stages — Share of Average %'),
    ...state.stages.map(s => chartBlock(`chartLine-${s.id}`, `${stageLabel(s)} — Term Growth`)),
    ...state.stages.map(s => chartBlock(`chartBar-${s.id}`, `${stageLabel(s)} — Subject %`)),
  ].filter(Boolean).join('');

  const chartsHtml = chartCells ? `
    <h2 style="margin-top:30px;border-bottom:2px solid #c8922a;padding-bottom:4px;page-break-before:always;">Visual Analytics</h2>
    <div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:10px;">${chartCells}</div>` : '';

  const html = `
  <div style="font-family:Arial,sans-serif;color:#222;padding:24px;">
    <h1 style="text-align:center;margin-bottom:0;">Academic Report</h1>
    <p style="text-align:center;color:#666;margin-top:4px;margin-bottom:18px;">Generated ${now}</p>
    ${profileHtml}
    ${orderHtml}
    ${stagesHtml || '<p>No subjects recorded yet.</p>'}
    ${chartsHtml}
    <p style="margin-top:30px;font-size:11px;color:#888;text-align:center;">Developed by Microintel</p>
  </div>`;

  const container = document.createElement('div');
  container.style.width = '780px';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    await html2pdf().set({
      margin: 10,
      filename: `academic_report_${Date.now()}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    }).from(container).save();
    toast('✓ Full PDF report generated');
  } catch (err) {
    toast('Failed to generate PDF');
  } finally {
    container.remove();
  }
}

function subjectRowsHtml(subs) {
  const rows = subs.map(s => {
    const t = calcSubjectTotal(s);
    const p = pct(t.scored, t.max);
    return `<tr>
      <td style="padding:4px 8px;border:1px solid #ddd;">${escHtml(s.name)}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;text-transform:capitalize;">${s.subjectType}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;text-align:center;">${t.intObtained}/${t.intMax}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;text-align:center;">${t.extObtained}/${t.extMax}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;text-align:center;">${t.scored}/${t.max}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;text-align:center;">${p}%</td>
      <td style="padding:4px 8px;border:1px solid #ddd;text-align:center;">${grade(p)}</td>
    </tr>`;
  }).join('');

  return `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px;">
    <thead>
      <tr style="background:#f5f0e6;">
        <th style="padding:4px 8px;border:1px solid #ddd;">Subject</th>
        <th style="padding:4px 8px;border:1px solid #ddd;">Type</th>
        <th style="padding:4px 8px;border:1px solid #ddd;">Internal</th>
        <th style="padding:4px 8px;border:1px solid #ddd;">External</th>
        <th style="padding:4px 8px;border:1px solid #ddd;">Total</th>
        <th style="padding:4px 8px;border:1px solid #ddd;">%</th>
        <th style="padding:4px 8px;border:1px solid #ddd;">Grade</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}
