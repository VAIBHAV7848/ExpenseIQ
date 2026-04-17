/* ========================================
   ExpenseIQ — Network Detector
   Online/offline detection with heartbeat
   ======================================== */

class NetworkDetector extends EventTarget {
  constructor() {
    super();
    this.isConnected = navigator.onLine;
    this.lastOnlineAt = navigator.onLine ? new Date() : null;
    this.lastOfflineAt = navigator.onLine ? null : new Date();
    this.heartbeatInterval = null;
  }

  async init() {
    // Listen to browser online/offline events
    window.addEventListener('online', () => {
      if (!this.isConnected) {
        this.isConnected = true;
        this.lastOnlineAt = new Date();
        this.dispatchEvent(new CustomEvent('online'));
        console.log('NetworkDetector: Back online');
      }
    });

    window.addEventListener('offline', () => {
      if (this.isConnected) {
        this.isConnected = false;
        this.lastOfflineAt = new Date();
        this.dispatchEvent(new CustomEvent('offline'));
        console.log('NetworkDetector: Gone offline');
      }
    });

    // Start heartbeat — ping every 15 seconds
    this.heartbeatInterval = setInterval(() => this.checkConnectivity(), 15000);

    // Initial check
    await this.checkConnectivity();
  }

  async checkConnectivity() {
    if (!window.CONFIG || !CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') {
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(CONFIG.SUPABASE_URL + '/rest/v1/', {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'apikey': CONFIG.SUPABASE_ANON_KEY
        }
      });

      clearTimeout(timeout);

      if (!this.isConnected) {
        this.isConnected = true;
        this.lastOnlineAt = new Date();
        this.dispatchEvent(new CustomEvent('online'));
      }
    } catch (error) {
      if (this.isConnected && !navigator.onLine) {
        this.isConnected = false;
        this.lastOfflineAt = new Date();
        this.dispatchEvent(new CustomEvent('offline'));
      }
    }
  }

  isOnline() {
    return this.isConnected && navigator.onLine;
  }

  on(event, callback) {
    this.addEventListener(event, callback);
  }

  off(event, callback) {
    this.removeEventListener(event, callback);
  }

  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
