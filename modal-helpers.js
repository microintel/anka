// ══════════════════════════════════════════════════
//  MODAL HELPERS
// ══════════════════════════════════════════════════
function openModal(title, bodyHTML) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalOverlay').classList.add('open');
}

function setModalFooter(buttons) {
  document.getElementById('modalFooter').innerHTML = buttons.map(b =>
    `<button class="btn ${b.cls}" onclick="${b.fn}">${b.label}</button>`
  ).join('');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function closeModalOnOverlay(e) {
  if (e.target.id === 'modalOverlay') closeModal();
}

