/* ========================================
   ExpenseIQ — Utility Functions
   ======================================== */

const Utils = {
  // Generate unique ID
  generateId(prefix = 'id') {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  // Get or create persistent device ID
  getDeviceId() {
    let id = localStorage.getItem('expenseiq_device_id');
    if (!id) {
      id = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('expenseiq_device_id', id);
    }
    return id;
  },

  // XSS-safe HTML escaping
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  },

  // Format currency in Indian format
  formatCurrency(amount, symbol = '₹') {
    if (amount === undefined || amount === null || isNaN(amount)) return symbol + '0';
    const formatter = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    return symbol + formatter.format(Math.abs(amount));
  },

  // Format INR without symbol
  formatINR(amount) {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount));
  },

  // Format date
  formatDate(dateStr, format = 'medium') {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const options = {
      short: { month: 'short', day: 'numeric' },
      medium: { month: 'short', day: 'numeric', year: 'numeric' },
      long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
      dayMonth: { month: 'short', day: 'numeric' }
    };
    return date.toLocaleDateString('en-IN', options[format] || options.medium);
  },

  // Relative date (Today, Yesterday, etc.)
  formatRelativeDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor((today - d) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return diff + ' days ago';
    return this.formatDate(dateStr, 'medium');
  },

  // Format relative timestamp
  formatRelativeTime(isoStr) {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return diffMin + 'm ago';
    if (diffHr < 24) return diffHr + 'h ago';
    if (diffDay < 7) return diffDay + 'd ago';
    return this.formatDate(isoStr, 'short');
  },

  // Get date string YYYY-MM-DD (local timezone, not UTC)
  toDateString(date) {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Get month string YYYY-MM
  toMonthString(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  },

  // Get month name
  getMonthName(monthIndex) {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return months[monthIndex];
  },

  // Get short month
  getShortMonth(monthIndex) {
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][monthIndex];
  },

  // Days in month
  daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  },

  // Days remaining in month
  daysRemaining() {
    const now = new Date();
    const total = this.daysInMonth(now.getFullYear(), now.getMonth());
    return total - now.getDate();
  },

  // Percentage
  percentage(value, total) {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  },

  // Debounce
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  // Animate counter
  animateCounter(element, target, duration = 1500) {
    if (!element) return;
    const start = 0;
    const startTime = performance.now();
    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(start + (target - start) * eased);
      element.textContent = this.formatCurrency(current);
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  },

  // Calculate trend percentage
  calcTrend(current, previous) {
    if (!previous) return { pct: 0, direction: 'up' };
    const pct = Math.round(((current - previous) / previous) * 100);
    return { pct: Math.abs(pct), direction: pct >= 0 ? 'up' : 'down' };
  },

  // Group array by key
  groupBy(arr, keyFn) {
    return arr.reduce((acc, item) => {
      const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
      (acc[key] = acc[key] || []).push(item);
      return acc;
    }, {});
  },

  // Sort comparator
  sortBy(key, order = 'desc') {
    return (a, b) => {
      const va = a[key], vb = b[key];
      if (order === 'asc') return va > vb ? 1 : va < vb ? -1 : 0;
      return va < vb ? 1 : va > vb ? -1 : 0;
    };
  },

  // Get today as YYYY-MM-DD
  today() {
    return this.toDateString(new Date());
  },

  // Check if same month
  isSameMonth(date1, date2) {
    const d1 = new Date(date1), d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
  },

  // Validate amount
  validateAmount(val) {
    const n = parseFloat(val);
    return !isNaN(n) && n > 0;
  },

  // Advance date by frequency
  advanceDate(dateStr, frequency) {
    const d = new Date(dateStr);
    switch (frequency) {
      case 'daily':
        d.setDate(d.getDate() + 1);
        break;
      case 'weekly':
        d.setDate(d.getDate() + 7);
        break;
      case 'monthly':
        d.setMonth(d.getMonth() + 1);
        break;
    }
    return this.toDateString(d);
  },

  // Get weekday name
  getWeekday(dateStr) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(dateStr).getDay()];
  },

  // Elite Liquid Glass Confetti burst (optimized canvas version - 120 FPS lag-free)
  triggerConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed; inset:0; pointer-events:none; z-index:999999;';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
    };
    resize();

    const colors = [
      'rgba(99, 102, 241, 0.45)',  // Indigo
      'rgba(14, 165, 233, 0.45)',  // Sky Blue
      'rgba(139, 92, 246, 0.45)',  // Violet
      'rgba(16, 185, 129, 0.45)',  // Emerald
      'rgba(245, 158, 11, 0.45)'   // Gold
    ];

    const particleCount = 80;
    const particles = [];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 16 + 6;
      const sizeW = Math.random() * 8 + 6;
      const sizeH = sizeW * (Math.random() > 0.5 ? 1.5 : 1);

      particles.push({
        x: centerX,
        y: centerY,
        w: sizeW,
        h: sizeH,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 10,
        rotation: Math.random() * Math.PI * 2,
        vRotation: Math.random() * 0.2 - 0.1,
        opacity: 1,
        shape: Math.random() > 0.7 ? 'circle' : 'rect'
      });
    }

    const gravity = 0.55;
    const drag = 0.96;
    const startTime = performance.now();

    const update = (now) => {
      const elapsed = now - startTime;
      if (elapsed > 1800) {
        canvas.remove();
        return;
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      particles.forEach(p => {
        p.vy += gravity;
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRotation;

        if (elapsed > 1000) {
          p.opacity = Math.max(0, 1 - (elapsed - 1000) / 800);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        if (p.shape === 'circle') {
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        } else {
          ctx.rect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      requestAnimationFrame(update);
    };

    requestAnimationFrame(update);
  },

  // Dynamic Ambient Aurora Preset configurations
  AuroraPresets: {
    cyberpunk: {
      name: 'Midnight Cyberpunk',
      color1: 'rgba(99, 102, 241, 0.35)', // Indigo
      color2: 'rgba(6, 182, 212, 0.30)', // Cyan
      lightColor1: 'rgba(99, 102, 241, 0.15)',
      lightColor2: 'rgba(6, 182, 212, 0.12)'
    },
    aurora: {
      name: 'Quartz Aurora',
      color1: 'rgba(139, 92, 246, 0.32)', // Violet
      color2: 'rgba(236, 72, 153, 0.28)', // Pink
      lightColor1: 'rgba(139, 92, 246, 0.15)',
      lightColor2: 'rgba(236, 72, 153, 0.12)'
    },
    boreal: {
      name: 'Northern Lights',
      color1: 'rgba(16, 185, 129, 0.32)', // Emerald
      color2: 'rgba(59, 130, 246, 0.28)', // Cobalt Blue
      lightColor1: 'rgba(16, 185, 129, 0.15)',
      lightColor2: 'rgba(59, 130, 246, 0.12)'
    },
    solar: {
      name: 'Solar Flame',
      color1: 'rgba(245, 158, 11, 0.32)', // Amber Gold
      color2: 'rgba(244, 63, 94, 0.28)', // Crimson Red
      lightColor1: 'rgba(245, 158, 11, 0.15)',
      lightColor2: 'rgba(244, 63, 94, 0.12)'
    },
    quartz: {
      name: 'Ivory Quartz',
      color1: 'rgba(148, 163, 184, 0.22)', // Muted Slate
      color2: 'rgba(203, 213, 225, 0.18)',
      lightColor1: 'rgba(148, 163, 184, 0.10)',
      lightColor2: 'rgba(203, 213, 225, 0.08)'
    }
  },

  applyAuroraPreset(presetKey) {
    const key = presetKey || localStorage.getItem('expenseiq_aurora') || 'cyberpunk';
    const p = this.AuroraPresets[key] || this.AuroraPresets.cyberpunk;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const c1 = isDark ? p.color1 : p.lightColor1;
    const c2 = isDark ? p.color2 : p.lightColor2;
    
    document.documentElement.style.setProperty('--glow-color-1', c1);
    document.documentElement.style.setProperty('--glow-color-2', c2);
    localStorage.setItem('expenseiq_aurora', key);
  }
};
