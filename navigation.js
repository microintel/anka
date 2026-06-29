// ══════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  document.querySelector(`[data-section="${name}"]`).classList.add('active');
  refreshSection(name);
}

function refreshSection(name) {
  if (name === 'dashboard') renderDashboard();
  if (name === 'sslc')      renderSSLC();
  if (name === 'diploma')   renderStage('diploma');
  if (name === 'engineering') renderStage('engineering');
  if (name === 'charts')    renderCharts();
}

