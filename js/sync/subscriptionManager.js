/* ========================================
   ExpenseIQ — Subscription Manager
   Supabase real-time postgres_changes subscriptions
   ======================================== */

class SubscriptionManager {
  constructor() {
    this.subscriptions = new Map();
    this.initialized = false;
  }

  static TABLES_TO_SUBSCRIBE = ['transactions', 'categories', 'budgets', 'goals', 'debts'];

  async init() {
    if (!window.supabaseClient || !Auth.isAuthenticated()) return;

    // Unsubscribe from any existing subscriptions first
    this.unsubscribeAll();

    for (const table of SubscriptionManager.TABLES_TO_SUBSCRIBE) {
      this.subscribeToTable(table);
    }
    this.initialized = true;
    console.log('SubscriptionManager: Initialized real-time subscriptions');
  }

  subscribeToTable(tableName) {
    const sb = window.supabaseClient;
    if (!sb) return;

    const user = Auth.getUser();
    if (!user) return;

    const channel = sb.channel('realtime:' + tableName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: tableName,
        filter: 'user_id=eq.' + user.id
      }, (payload) => {
        this.handleRealtimeChange(tableName, payload);
      })
      .subscribe((status) => {
        EventBus.emit('subscription:status', { table: tableName, status });
      });

    this.subscriptions.set(tableName, channel);
  }

  handleRealtimeChange(tableName, payload) {
    // Ignore changes originated from this device
    if (payload.new && payload.new.device_id === Utils.getDeviceId()) {
      return;
    }

    const stateKey = this.mapTableToStateKey(tableName);

    switch (payload.eventType) {
      case 'INSERT': {
        const existing = Store._state[stateKey]?.find(r => r.id === payload.new.id);
        if (!existing) {
          if (!Store._state[stateKey]) Store._state[stateKey] = [];
          Store._state[stateKey].push(payload.new);
          Store._saveToBoth(Store.KEYS[stateKey.toUpperCase()] || ('expenseiq_' + stateKey), Store._state[stateKey], stateKey);
          EventBus.emit(stateKey + ':remoteInsert', payload.new);
        }
        break;
      }

      case 'UPDATE': {
        const localIdx = Store._state[stateKey]?.findIndex(r => r.id === payload.new.id);
        if (localIdx !== undefined && localIdx >= 0) {
          const local = Store._state[stateKey][localIdx];
          if ((local.version || 0) > (payload.new.version || 0)) {
            // Local is newer — log conflict
            if (typeof syncEngine !== 'undefined') {
              syncEngine.logConflict(tableName, payload.new.id, local, payload.new);
            }
          } else {
            // Remote is newer or equal — use conflict resolver
            const resolved = ConflictResolver.resolve(local, payload.new,
              payload.new.conflict_resolution_strategy || 'last-write-wins');
            if (resolved.requiresManualResolution) {
              if (typeof syncEngine !== 'undefined') {
                syncEngine.logConflict(tableName, payload.new.id, local, payload.new);
              }
            } else {
              Store._state[stateKey][localIdx] = resolved;
              Store._saveToBoth(Store.KEYS[stateKey.toUpperCase()] || ('expenseiq_' + stateKey), Store._state[stateKey], stateKey);
            }
          }
          EventBus.emit(stateKey + ':remoteUpdate', payload.new);
        } else {
          // Record doesn't exist locally — add it
          if (!Store._state[stateKey]) Store._state[stateKey] = [];
          Store._state[stateKey].push(payload.new);
          Store._saveToBoth(Store.KEYS[stateKey.toUpperCase()] || ('expenseiq_' + stateKey), Store._state[stateKey], stateKey);
        }
        break;
      }

      case 'DELETE': {
        const deleteId = payload.old?.id;
        if (deleteId && Store._state[stateKey]) {
          Store._state[stateKey] = Store._state[stateKey].filter(r => r.id !== deleteId);
          Store._saveToBoth(Store.KEYS[stateKey.toUpperCase()] || ('expenseiq_' + stateKey), Store._state[stateKey], stateKey);
          EventBus.emit(stateKey + ':remoteDelete', payload.old);
        }
        break;
      }
    }

    this.triggerUIUpdate(tableName);
  }

  triggerUIUpdate(tableName) {
    const route = typeof Router !== 'undefined' ? Router.currentRoute : null;

    // Dashboard re-renders for all table changes
    if (route === '#/' && typeof Dashboard !== 'undefined') {
      Dashboard.render();
    }

    // Page-specific re-renders
    switch (tableName) {
      case 'transactions':
        if (route === '#/transactions' && typeof Transactions !== 'undefined') Transactions.render();
        break;
      case 'budgets':
        if (route === '#/budgets' && typeof Budgets !== 'undefined') Budgets.render();
        break;
      case 'categories':
        if (route === '#/categories' && typeof Categories !== 'undefined') Categories.render();
        break;
      case 'goals':
        if (route === '#/goals' && typeof Goals !== 'undefined') Goals.render();
        break;
      case 'debts':
        if (route === '#/debts' && typeof Debts !== 'undefined') Debts.render();
        break;
    }

    // Sidebar re-renders for badge updates
    if (typeof Sidebar !== 'undefined') Sidebar.render();
  }

  mapTableToStateKey(tableName) {
    const map = {
      'transactions': 'transactions',
      'categories': 'categories',
      'budgets': 'budgets',
      'goals': 'goals',
      'debts': 'debts'
    };
    return map[tableName] || tableName;
  }

  unsubscribeAll() {
    this.subscriptions.forEach((channel, table) => {
      try {
        channel.unsubscribe();
      } catch (e) {
        console.warn('Failed to unsubscribe from', table, e);
      }
    });
    this.subscriptions.clear();
    this.initialized = false;
  }
}

// Global instance
const subscriptionManager = new SubscriptionManager();
