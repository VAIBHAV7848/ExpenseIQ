/* ========================================
   ExpenseIQ — Confirm Dialog Component
   ======================================== */

const ConfirmDialog = {
  show({ title, message, type = 'danger', confirmText = 'Confirm', cancelText = 'Cancel', onConfirm }) {
    const overlay = document.getElementById('confirm-dialog');
    
    let iconHtml = '';
    if (type === 'danger') {
      iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
    } else if (type === 'warning') {
      iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    }

    const html = `
      <div class="confirm-dialog">
        <div class="confirm-icon ${type}">${iconHtml}</div>
        <h3 class="confirm-title">${title}</h3>
        <p class="confirm-message">${message}</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" id="confirm-cancel">${cancelText}</button>
          <button class="btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">${confirmText}</button>
        </div>
      </div>
    `;

    overlay.innerHTML = html;
    overlay.classList.remove('hidden');

    const close = () => {
      const dialog = overlay.querySelector('.confirm-dialog');
      dialog.style.animation = 'scaleOut 0.2s ease-in forwards';
      setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.innerHTML = '';
      }, 200);
    };

    document.getElementById('confirm-cancel').addEventListener('click', close);
    document.getElementById('confirm-ok').addEventListener('click', () => {
      close();
      if (onConfirm) onConfirm();
    });
  }
};
