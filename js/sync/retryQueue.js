/* ========================================
   ExpenseIQ — Retry Queue
   Exponential backoff with circuit breaker
   ======================================== */

class RetryQueue {
  constructor() {
    this.queue = new Map();
    this.delays = [1000, 2000, 4000, 8000, 16000];
    this.circuitOpen = false;
    this.consecutiveFailures = 0;
    this.circuitTimeout = null;
    this.timers = new Map();
  }

  /**
   * Add an async function to the retry queue
   * Immediately attempts execution, schedules retries on failure
   */
  add(id, asyncFn, maxRetries = 5) {
    if (this.queue.has(id)) return;

    this.queue.set(id, {
      fn: asyncFn,
      retryCount: 0,
      lastAttempt: null,
      maxRetries
    });

    this.executeWithRetry(id, asyncFn, 0);
  }

  remove(id) {
    this.queue.delete(id);
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id));
      this.timers.delete(id);
    }
  }

  has(id) {
    return this.queue.has(id);
  }

  async executeWithRetry(id, asyncFn, retryCount) {
    if (this.circuitOpen) {
      return; // Circuit is open, don't attempt
    }

    const entry = this.queue.get(id);
    if (!entry) return;

    entry.lastAttempt = Date.now();
    entry.retryCount = retryCount;

    try {
      await asyncFn();
      // Success — remove from queue and reset failure counter
      this.remove(id);
      this.consecutiveFailures = 0;
    } catch (error) {
      this.consecutiveFailures++;

      // Check circuit breaker threshold
      if (this.consecutiveFailures >= 10) {
        this.openCircuit();
        return;
      }

      // Schedule retry if under max
      if (retryCount < entry.maxRetries) {
        const delay = this.delays[Math.min(retryCount, this.delays.length - 1)];
        const timer = setTimeout(() => {
          this.executeWithRetry(id, asyncFn, retryCount + 1);
        }, delay);
        this.timers.set(id, timer);
      } else {
        // Max retries exceeded
        console.warn(`RetryQueue: Max retries reached for ${id}`);
        this.remove(id);
      }
    }
  }

  /**
   * Open the circuit breaker — stop all retries for 60 seconds
   */
  openCircuit() {
    if (this.circuitOpen) return;
    this.circuitOpen = true;
    console.warn('RetryQueue: Circuit breaker OPEN — pausing all retries for 60s');

    if (typeof EventBus !== 'undefined') {
      EventBus.emit('sync:status', { status: 'error', message: 'Sync paused — too many failures' });
    }

    this.circuitTimeout = setTimeout(() => {
      this.closeCircuit();
    }, 60000);
  }

  /**
   * Close the circuit breaker — resume retries
   */
  closeCircuit() {
    this.circuitOpen = false;
    this.consecutiveFailures = 0;
    console.log('RetryQueue: Circuit breaker CLOSED — resuming retries');

    if (typeof EventBus !== 'undefined') {
      EventBus.emit('sync:status', { status: 'syncing', message: 'Reconnecting...' });
    }

    // Retry all queued items
    this.queue.forEach((entry, id) => {
      this.executeWithRetry(id, entry.fn, entry.retryCount);
    });
  }

  getStatus() {
    return {
      queueSize: this.queue.size,
      circuitOpen: this.circuitOpen,
      failureCount: this.consecutiveFailures
    };
  }

  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.queue.clear();
    if (this.circuitTimeout) {
      clearTimeout(this.circuitTimeout);
      this.circuitTimeout = null;
    }
  }
}
