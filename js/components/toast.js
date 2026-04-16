/* ========================================
   ExpenseIQ — Toast Notifications Component
   ======================================== */

const Toast = {
  icons: {
    success: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    error: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    warning: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    info: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
  },

  show(title, message, type = 'info', duration = 5000, onUndo = null) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let undoHtml = '';
    if (onUndo) {
      undoHtml = `<div class="toast-undo">Undo</div>`;
    }

    toast.innerHTML = `
      <div class="toast-icon">${this.icons[type]}</div>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
        ${undoHtml}
      </div>
      <div class="toast-close"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>
      <div class="toast-progress" style="animation-duration: ${duration}ms"></div>
    `;

    container.appendChild(toast);

    // Audio cue
    // const audio = new Audio('assets/pop.mp3'); audio.volume=0.2; audio.play().catch(e=>{});

    let timeout;
    
    const removeToast = () => {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => {
        if (toast.parentNode === container) container.removeChild(toast);
      });
      clearTimeout(timeout);
    };

    timeout = setTimeout(removeToast, duration);

    toast.querySelector('.toast-close').addEventListener('click', removeToast);
    
    if (onUndo) {
      toast.querySelector('.toast-undo').addEventListener('click', () => {
        onUndo();
        removeToast();
        this.show('Restored', 'Action was undone successfully.', 'success', 3000);
      });
    }

    return removeToast;
  },

  success(title, message, duration, onUndo) { this.show(title, message, 'success', duration, onUndo); },
  error(title, message, duration) { this.show(title, message, 'error', duration); },
  warning(title, message, duration) { this.show(title, message, 'warning', duration); },
  info(title, message, duration) { this.show(title, message, 'info', duration); }
};
