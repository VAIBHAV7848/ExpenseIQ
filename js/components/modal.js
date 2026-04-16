/* ========================================
   ExpenseIQ — Modal Component
   ======================================== */

const Modal = {
  activeModal: null,

  init() {
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.close();
      }
    });
  },

  show(options) {
    const overlay = document.getElementById('modal-overlay');
    
    // Build Modal HTML
    let buttonsHtml = '';
    if (options.buttons) {
       buttonsHtml = `<div class="form-group" style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
         ${options.buttons.map(btn => `<button type="${btn.type || 'button'}" class="btn ${btn.class}" id="${btn.id}">${btn.text}</button>`).join('')}
       </div>`;
    }

    const modalHtml = `
      <div class="modal ${options.class || ''}" id="current-modal">
        <button class="modal-close" id="modal-close-btn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <h2 class="modal-title">${options.title}</h2>
        <div class="modal-content">
          ${options.content}
        </div>
        ${buttonsHtml}
      </div>
    `;

    overlay.innerHTML = modalHtml;
    overlay.classList.remove('hidden');
    this.activeModal = document.getElementById('current-modal');

    // Add close listeners
    document.getElementById('modal-close-btn').addEventListener('click', () => this.close());

    // Execute callback
    if (options.onRender) {
      options.onRender(this.activeModal);
    }
  },

  close() {
    if (!this.activeModal) return;
    
    const overlay = document.getElementById('modal-overlay');
    this.activeModal.style.animation = 'scaleOut 0.2s ease-in forwards';
    
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
      this.activeModal = null;
    }, 200);
  }
};
