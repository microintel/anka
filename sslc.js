// ══════════════════════════════════════════════════
//  RENDER SSLC
// ══════════════════════════════════════════════════
function renderSSLC() {
  const subjs = state.sslc;
  const tbody = document.getElementById('sslc-tbody');
  const emptyEl = document.getElementById('sslc-empty');
  const chartWrap = document.getElementById('sslc-chart-wrap');

  if (!subjs.length) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    chartWrap.style.display = 'none';
    document.getElementById('sslc-summary').textContent = '';
    return;
  }

  emptyEl.style.display = 'none';
  chartWrap.style.display = 'block';

  // Support both legacy (scored/max) and new component model
  function getSSLCTotals(s) {
    if (s.components && s.components.length) {
      return calcSubjectTotal(s);
    }
    // Legacy
    return { scored: +s.scored||0, max: +s.max||0, intScored: +s.scored||0, intMax: +s.max||0, extS: 0, extM: 0 };
  }

  const totalS = subjs.reduce((a,s)=>{ const t=getSSLCTotals(s); return a+t.scored; },0);
  const totalM = subjs.reduce((a,s)=>{ const t=getSSLCTotals(s); return a+t.max; },0);
  const avg = pct(totalS,totalM);
  document.getElementById('sslc-summary').textContent = `${subjs.length} subjects · ${totalS}/${totalM} · ${avg}% · ${grade(avg)}`;

  tbody.innerHTML = subjs.map(s => {
    const t = getSSLCTotals(s);
    const p = pct(t.scored, t.max);
    const compPills = (s.components||[]).length
      ? `<div class="comp-list">${(s.components||[]).map(c =>
          `<div class="comp-pill">
            <span class="comp-pill-name">${escHtml(c.name)}</span>
            <span class="comp-pill-score">${c.scored}/${c.max}</span>
          </div>`
        ).join('')}</div>`
      : `<span style="color:var(--text-dim);font-size:0.72rem;">${s.scored||0}/${s.max||0}</span>`;
    const extDisplay = (s.external?.max > 0)
      ? `<span class="marks-badge">${s.external.scored||0}/${s.external.max}</span>`
      : `<span style="color:var(--text-dim);font-size:0.72rem;">—</span>`;
    return `<tr>
      <td style="font-family:var(--font-body);font-size:0.9rem;font-weight:500;">${escHtml(s.name)}</td>
      <td data-label="Internals">${compPills}</td>
      <td data-label="External">${extDisplay}</td>
      <td data-label="Total" class="marks-badge" style="white-space:nowrap;">${t.scored}/${t.max}</td>
      <td data-label="%"><span class="pct-badge ${pctClass(p)}">${p}%</span></td>
      <td data-label="Grade" style="color:var(--green-light);font-weight:600;">${grade(p)}</td>
      <td>
        <div class="action-cell">
          <button class="btn btn-ghost btn-sm" onclick="openEditSubjectModal('sslc',null,'${s.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDelete('sslc',null,'${s.id}')">Del</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Chart
  renderSSLCChart();
}

