// ══════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════
function toast(msg) {
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = 'toast';
  const success = msg.startsWith('✓ ');
  const cleanMsg = success ? msg.slice(2) : msg;
  el.innerHTML = `<i class="bi ${success ? 'bi-check-circle-fill' : 'bi-info-circle-fill'}"></i> ${escHtml(cleanMsg)}`;
  stack.appendChild(el);
  setTimeout(()=>el.remove(), 2800);
}

