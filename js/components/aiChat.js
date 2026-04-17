/* ========================================
   ExpenseIQ — AI Chat Widget Component
   Floating financial advisor chat
   ======================================== */

const AiChat = {
  _history: [],
  _open: false,
  _typing: false,

  init() {
    if (!AI.isAvailable()) return;

    // Create FAB button
    const btn = document.createElement('div');
    btn.id = 'ai-chat-fab';
    btn.innerHTML = '<i data-lucide="message-circle"></i>';
    btn.title = 'AI Financial Advisor';
    btn.onclick = () => this.toggle();
    document.body.appendChild(btn);

    // Create chat widget
    const widget = document.createElement('div');
    widget.id = 'ai-chat-widget';
    widget.className = 'ai-chat-widget hidden';
    widget.innerHTML = `
      <div class="ai-chat-header">
        <span>💰 AI Advisor</span>
        <div class="ai-chat-actions">
          <button onclick="AiChat.clear()" title="Clear Chat">Clear</button>
          <button onclick="AiChat.close()" title="Close">✕</button>
        </div>
      </div>
      <div id="ai-chat-messages" class="ai-chat-messages"></div>
      <div class="ai-chat-input-row">
        <input type="text" id="ai-chat-input" placeholder="Ask about your finances..." />
        <button onclick="AiChat.send()" class="ai-chat-send"><i data-lucide="send"></i></button>
      </div>
    `;
    document.body.appendChild(widget);

    document.getElementById('ai-chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.send();
    });

    this.addMessage('assistant',
      'Hi! I\'m your AI financial advisor. Ask me anything about your spending, ' +
      'savings, or budgets. Try: "Where am I overspending?" or "How can I save more?"'
    );

    if (window.lucide) lucide.createIcons();
  },

  toggle() {
    this._open = !this._open;
    const widget = document.getElementById('ai-chat-widget');
    widget?.classList.toggle('hidden', !this._open);
    if (this._open) document.getElementById('ai-chat-input')?.focus();
  },

  close() {
    this._open = false;
    document.getElementById('ai-chat-widget')?.classList.add('hidden');
  },

  clear() {
    this._history = [];
    const msgs = document.getElementById('ai-chat-messages');
    if (msgs) msgs.innerHTML = '';
    this.addMessage('assistant',
      'Chat cleared. What would you like to know about your finances?'
    );
  },

  async send() {
    const input = document.getElementById('ai-chat-input');
    const message = input?.value.trim();
    if (!message || this._typing) return;
    input.value = '';

    this.addMessage('user', message);
    this._history.push({ role: 'user', content: message });
    this.showTyping();

    const response = await AI.getFinancialAdvice(message, this._history.slice(-10));
    this.hideTyping();

    const reply = response || 'Sorry, I couldn\'t process that. Please try again.';
    this._history.push({ role: 'assistant', content: reply });
    this.addMessage('assistant', reply);
  },

  addMessage(role, text) {
    const msgs = document.getElementById('ai-chat-messages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = 'ai-chat-msg ' + role;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  },

  showTyping() {
    this._typing = true;
    const msgs = document.getElementById('ai-chat-messages');
    if (!msgs) return;
    const typing = document.createElement('div');
    typing.className = 'ai-chat-msg assistant typing-indicator';
    typing.id = 'ai-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;
  },

  hideTyping() {
    this._typing = false;
    document.getElementById('ai-typing')?.remove();
  }
};
