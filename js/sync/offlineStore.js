/* ========================================
   ExpenseIQ — Offline Store (IndexedDB)
   Manages offline queue and persistent fallback
   ======================================== */

class OfflineStore {
  constructor() {
    this.dbName = 'ExpenseIQOffline';
    this.dbVersion = 2;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Data stores for offline cache
        const stores = ['transactions', 'categories', 'budgets', 'goals', 'debts'];
        stores.forEach(name => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' });
          }
        });

        // Sync queue store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('status', 'status', { unique: false });
          queueStore.createIndex('table_name', 'tableName', { unique: false });
        }

        // Conflict log store
        if (!db.objectStoreNames.contains('conflict_log')) {
          db.createObjectStore('conflict_log', { keyPath: 'id' });
        }
      };
    });
  }

  _getStore(storeName, mode = 'readonly') {
    if (!this.db) throw new Error('IndexedDB not initialized');
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  _promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ─── Sync Queue ───

  async enqueueChange(tableName, operation, data) {
    const entry = {
      id: 'sq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      tableName,
      operation,
      data,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      lastError: null,
      deviceId: typeof Utils !== 'undefined' ? Utils.getDeviceId() : 'unknown'
    };

    const store = this._getStore('sync_queue', 'readwrite');
    await this._promisifyRequest(store.put(entry));
    return entry;
  }

  async getPendingChanges(limit = 50) {
    return new Promise((resolve, reject) => {
      const store = this._getStore('sync_queue', 'readonly');
      const index = store.index('status');
      const request = index.getAll(IDBKeyRange.only('pending'));

      request.onsuccess = () => {
        let results = request.result || [];
        results.sort((a, b) => a.timestamp - b.timestamp);
        if (limit) results = results.slice(0, limit);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markSynced(queueId) {
    const store = this._getStore('sync_queue', 'readwrite');
    const entry = await this._promisifyRequest(store.get(queueId));
    if (entry) {
      entry.status = 'synced';
      entry.synced_at = new Date().toISOString();
      await this._promisifyRequest(store.put(entry));
    }
  }

  async markFailed(queueId, errorMessage) {
    const store = this._getStore('sync_queue', 'readwrite');
    const entry = await this._promisifyRequest(store.get(queueId));
    if (entry) {
      entry.retryCount = (entry.retryCount || 0) + 1;
      entry.lastError = errorMessage;
      if (entry.retryCount > 5) {
        entry.status = 'failed';
      }
      await this._promisifyRequest(store.put(entry));
    }
  }

  async getFailedChanges() {
    return new Promise((resolve, reject) => {
      const store = this._getStore('sync_queue', 'readonly');
      const index = store.index('status');
      const request = index.getAll(IDBKeyRange.only('failed'));
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async clearSynced() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    return new Promise((resolve, reject) => {
      const store = this._getStore('sync_queue', 'readwrite');
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const entry = cursor.value;
          if (entry.status === 'synced' && entry.timestamp < cutoff) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ─── Record Storage (offline cache) ───

  async saveRecord(tableName, record) {
    try {
      const store = this._getStore(tableName, 'readwrite');
      await this._promisifyRequest(store.put(record));
    } catch (e) {
      console.warn('OfflineStore.saveRecord failed for', tableName, e);
    }
  }

  async getRecord(tableName, id) {
    try {
      const store = this._getStore(tableName, 'readonly');
      return await this._promisifyRequest(store.get(id));
    } catch (e) {
      return null;
    }
  }

  async getAllRecords(tableName) {
    try {
      const store = this._getStore(tableName, 'readonly');
      return await this._promisifyRequest(store.getAll());
    } catch (e) {
      return [];
    }
  }

  async deleteRecord(tableName, id) {
    try {
      const store = this._getStore(tableName, 'readwrite');
      await this._promisifyRequest(store.delete(id));
    } catch (e) {
      console.warn('OfflineStore.deleteRecord failed:', e);
    }
  }

  async clearAll() {
    const storeNames = ['transactions', 'categories', 'budgets', 'goals', 'debts', 'sync_queue', 'conflict_log'];
    for (const name of storeNames) {
      try {
        const store = this._getStore(name, 'readwrite');
        await this._promisifyRequest(store.clear());
      } catch (e) {
        // Store may not exist
      }
    }
  }
}
