/* ========================================
   ExpenseIQ — Sync Engine (CORE)
   Orchestrates offline queue, retry, network detection,
   real-time subscriptions, and conflict resolution
   ======================================== */

class SyncEngine {
  constructor() {
    this.offlineStore = new OfflineStore();
    this.retryQueue = new RetryQueue();
    this.networkDetector = new NetworkDetector();
    this.isSyncing = false;
    this.lastSyncAt = null;
    this.pendingCount = 0;
    this.syncInterval = null;
  }

  async init() {
    try {
      await this.offlineStore.init();
    } catch (e) {
      console.warn('SyncEngine: IndexedDB init failed, continuing without offline store:', e);
    }

    await this.networkDetector.init();

    this.networkDetector.on('online', () => {
      console.log('SyncEngine: Network online — triggering full sync');
      this.fullSync();
    });

    this.networkDetector.on('offline', () => {
      EventBus.emit('sync:status', {
        status: 'offline',
        message: 'Offline — changes saved locally'
      });
    });

    EventBus.on('auth:changed', () => this.onAuthChanged());

    // Periodic sync every 30 seconds
    this.syncInterval = setInterval(() => this.fullSync(), 30000);

    // Initial full sync
    await this.fullSync();
  }

  async onAuthChanged() {
    if (typeof subscriptionManager !== 'undefined') {
      await subscriptionManager.init();
    }
    await this.fullSync();
  }

  /**
   * Push a single change through the sync pipeline
   * Called by Store methods after optimistic local update
   */
  async pushChange(tableName, operation, data) {
    // Inject required sync fields
    const user = Auth.getUser();
    data.user_id = user?.id;
    data.device_id = Utils.getDeviceId();
    data.last_modified_at = new Date().toISOString();
    data.sync_status = 'pending';

    // Enqueue to IndexedDB
    let queueEntry;
    try {
      queueEntry = await this.offlineStore.enqueueChange(tableName, operation, data);
    } catch (e) {
      // IndexedDB unavailable — create a virtual entry
      queueEntry = {
        id: 'vq_' + Date.now(),
        tableName,
        operation,
        data,
        timestamp: Date.now(),
        status: 'pending'
      };
    }

    this.pendingCount++;
    EventBus.emit('sync:pending', { count: this.pendingCount });

    // Attempt immediate sync if online and authenticated
    if (this.networkDetector.isOnline() && Auth.isAuthenticated()) {
      try {
        await this.executeSyncItem(queueEntry);
      } catch (e) {
        this.retryQueue.add(queueEntry.id, () => this.executeSyncItem(queueEntry));
      }
    } else {
      this.retryQueue.add(queueEntry.id, () => this.executeSyncItem(queueEntry));
      EventBus.emit('sync:queued', { table: tableName, count: this.pendingCount });
    }
  }

  /**
   * Execute a single sync queue item against Supabase
   */
  async executeSyncItem(queueEntry) {
    const { tableName, operation, data, id: queueId } = queueEntry;
    const sb = window.supabaseClient;
    if (!sb) throw new Error('Supabase not available');

    const userId = Auth.getUser()?.id;
    if (!userId) throw new Error('User not authenticated');

    // Map local field names to DB column names for budgets
    let dbData = { ...data };
    if (tableName === 'budgets') {
      if (dbData.totalBudget !== undefined) {
        dbData.total_budget = dbData.totalBudget;
        delete dbData.totalBudget;
      }
      if (dbData.categoryBudgets !== undefined) {
        dbData.category_budgets = dbData.categoryBudgets;
        delete dbData.categoryBudgets;
      }
    }

    // Clean up any fields that shouldn't go to DB
    delete dbData.sync_status;

    try {
      let error;
      switch (operation) {
        case 'insert': {
          const result = await sb.from(tableName).insert([dbData]);
          error = result.error;
          break;
        }
        case 'update': {
          const result = await sb.from(tableName).update(dbData)
            .eq('id', dbData.id)
            .eq('user_id', userId);
          error = result.error;
          break;
        }
        case 'upsert': {
          const result = await sb.from(tableName).upsert([dbData], { onConflict: 'id' });
          error = result.error;
          break;
        }
        case 'delete': {
          const result = await sb.from(tableName).delete()
            .eq('id', dbData.id)
            .eq('user_id', userId);
          error = result.error;
          break;
        }
        default:
          throw new Error('Unknown operation: ' + operation);
      }

      if (error) throw error;

      // Mark as synced
      try {
        await this.offlineStore.markSynced(queueId);
      } catch (e) { /* IndexedDB may be unavailable */ }

      this.pendingCount = Math.max(0, this.pendingCount - 1);
      EventBus.emit('sync:itemSynced', { table: tableName, operation });

      if (this.pendingCount === 0) {
        EventBus.emit('sync:status', {
          status: 'synced',
          message: 'All changes synced'
        });
      }
    } catch (error) {
      console.error('SyncEngine: Failed to sync item:', tableName, operation, error);
      try {
        await this.offlineStore.markFailed(queueId, error.message || String(error));
      } catch (e) { /* IndexedDB may be unavailable */ }
      throw error; // Rethrow so retryQueue can catch
    }
  }

  /**
   * Full sync — push all pending, then pull remote changes
   */
  async fullSync() {
    if (this.isSyncing) return;
    if (!Auth.isAuthenticated() || Auth.isGuest()) return;
    if (!this.networkDetector.isOnline()) return;

    this.isSyncing = true;
    EventBus.emit('sync:status', { status: 'syncing', message: 'Syncing...' });

    try {
      // 1. Push all pending from offline queue
      let pending = [];
      try {
        pending = await this.offlineStore.getPendingChanges();
      } catch (e) { /* IndexedDB may be unavailable */ }

      for (const item of pending) {
        try {
          await this.executeSyncItem(item);
        } catch (e) {
          // RetryQueue handles it
          continue;
        }
      }

      // 2. Pull all remote changes and merge
      await this.pullAndMerge();

      this.lastSyncAt = new Date().toISOString();
      EventBus.emit('sync:status', {
        status: 'synced',
        message: 'Synced just now'
      });
    } catch (error) {
      console.error('SyncEngine: fullSync error:', error);
      EventBus.emit('sync:status', {
        status: 'error',
        message: error.message || 'Sync failed'
      });
    } finally {
      this.isSyncing = false;
      try {
        await this.offlineStore.clearSynced();
      } catch (e) { /* OK */ }
    }
  }

  /**
   * Pull remote changes since last sync and merge with local state
   */
  async pullAndMerge() {
    const sb = window.supabaseClient;
    if (!sb) return;

    const userId = Auth.getUser()?.id;
    if (!userId) return;

    const since = this.lastSyncAt || '1970-01-01T00:00:00Z';
    const tables = ['transactions', 'categories', 'budgets', 'goals', 'debts'];

    for (const table of tables) {
      try {
        let query = sb.from(table).select('*').eq('user_id', userId);

        // Only fetch recent changes if we've synced before
        if (this.lastSyncAt) {
          query = query.gte('last_modified_at', since);
        }

        const { data: remote, error } = await query;
        if (error) {
          console.warn('SyncEngine: Pull failed for', table, error);
          continue;
        }
        if (!remote || remote.length === 0) continue;

        const stateKey = table;
        if (!Store._state[stateKey]) Store._state[stateKey] = [];

        for (const remoteRecord of remote) {
          const localIdx = Store._state[stateKey].findIndex(r => r.id === remoteRecord.id);

          if (localIdx === -1) {
            // New record from remote — add locally
            Store._state[stateKey].push(remoteRecord);
          } else {
            const localRecord = Store._state[stateKey][localIdx];
            if ((localRecord.version || 0) < (remoteRecord.version || 0)) {
              // Remote is newer — resolve conflict
              const resolved = ConflictResolver.resolve(
                localRecord,
                remoteRecord,
                remoteRecord.conflict_resolution_strategy || 'last-write-wins'
              );
              if (resolved.requiresManualResolution) {
                await this.logConflict(table, remoteRecord.id, localRecord, remoteRecord);
              } else {
                Store._state[stateKey][localIdx] = resolved;
              }
            }
            // If local version >= remote version, keep local (already updated)
          }
        }

        // Save updated state
        const key = Store.KEYS[stateKey.toUpperCase()] || ('expenseiq_' + stateKey);
        Store._saveToBoth(key, Store._state[stateKey], stateKey);
        EventBus.emit(table + ':synced');
      } catch (e) {
        console.warn('SyncEngine: Error pulling', table, e);
      }
    }
  }

  /**
   * Log a sync conflict for manual resolution
   */
  async logConflict(tableName, recordId, local, remote) {
    const conflict = {
      id: Utils.generateId('conflict'),
      user_id: Auth.getUser()?.id,
      table_name: tableName,
      record_id: recordId,
      local_version: local,
      remote_version: remote,
      resolution_strategy: 'manual',
      resolved_at: null,
      resolved_data: null,
      created_at: new Date().toISOString()
    };

    EventBus.emit('sync:conflict', conflict);

    if (typeof Toast !== 'undefined') {
      Toast.warning('Sync Conflict', 'A data conflict was detected. Review in Settings.');
    }

    // Log to Supabase
    const sb = window.supabaseClient;
    if (sb) {
      try {
        await sb.from('sync_conflicts').insert([conflict]);
      } catch (e) {
        console.warn('Failed to log conflict to Supabase:', e);
      }
    }
  }

  getStatus() {
    return {
      pendingCount: this.pendingCount,
      isSyncing: this.isSyncing,
      lastSyncAt: this.lastSyncAt,
      isOnline: this.networkDetector.isOnline(),
      retryQueue: this.retryQueue.getStatus()
    };
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.networkDetector.destroy();
    this.retryQueue.clear();
  }
}

// Global instance
const syncEngine = new SyncEngine();
