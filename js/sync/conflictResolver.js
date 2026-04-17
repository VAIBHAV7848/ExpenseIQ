/* ========================================
   ExpenseIQ — Conflict Resolver
   Handles version conflicts between local and remote data
   ======================================== */

class ConflictResolver {
  static LAST_WRITE_WINS = 'last-write-wins';
  static LOCAL_WINS = 'local-wins';
  static REMOTE_WINS = 'remote-wins';
  static MANUAL = 'manual';

  /**
   * Resolve conflict between local and remote versions
   */
  static resolve(local, remote, strategy = ConflictResolver.LAST_WRITE_WINS) {
    if (!local) return remote;
    if (!remote) return local;

    switch (strategy) {
      case ConflictResolver.LAST_WRITE_WINS: {
        const localTime = new Date(local.last_modified_at || 0).getTime();
        const remoteTime = new Date(remote.last_modified_at || 0).getTime();
        return localTime >= remoteTime ? local : remote;
      }

      case ConflictResolver.LOCAL_WINS:
        return local;

      case ConflictResolver.REMOTE_WINS:
        return remote;

      case ConflictResolver.MANUAL:
        return {
          local,
          remote,
          requiresManualResolution: true
        };

      default:
        return ConflictResolver.resolve(local, remote, ConflictResolver.LAST_WRITE_WINS);
    }
  }

  /**
   * Check if two records can be automatically merged without conflict
   * For budgets: safe if categoryBudgets keys don't overlap
   * For others: safe if last_modified_at differs by < 5 seconds
   */
  static canAutoMerge(local, remote) {
    if (!local || !remote) return true;

    // Budget special case — check if category budget keys overlap
    if (local.category_budgets && remote.category_budgets) {
      const localKeys = Object.keys(local.category_budgets || {});
      const remoteKeys = Object.keys(remote.category_budgets || {});
      const overlap = localKeys.some(k => remoteKeys.includes(k));
      return !overlap;
    }

    // For all others: only auto-merge if timestamps are within 5 seconds
    const localTime = new Date(local.last_modified_at || 0).getTime();
    const remoteTime = new Date(remote.last_modified_at || 0).getTime();
    return Math.abs(localTime - remoteTime) < 5000;
  }

  /**
   * Smart merge for compatible records
   * Budgets: merge non-overlapping categoryBudgets keys
   * Default: fall back to last-write-wins
   */
  static smartMerge(local, remote) {
    // Budget special merge
    if (local.category_budgets !== undefined && remote.category_budgets !== undefined) {
      const mergedBudgets = {
        ...remote.category_budgets,
        ...local.category_budgets
      };

      return {
        ...remote,
        category_budgets: mergedBudgets,
        version: Math.max(local.version || 1, remote.version || 1) + 1,
        last_modified_at: new Date().toISOString()
      };
    }

    // Default: last-write-wins
    return ConflictResolver.resolve(local, remote, ConflictResolver.LAST_WRITE_WINS);
  }

  /**
   * Return an array of keys that differ between local and remote
   */
  static diff(local, remote) {
    if (!local || !remote) return [];
    const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);
    const diffKeys = [];

    allKeys.forEach(key => {
      if (key === 'version' || key === 'last_modified_at' || key === 'synced_at' || key === 'sync_status') return;
      const lv = JSON.stringify(local[key]);
      const rv = JSON.stringify(remote[key]);
      if (lv !== rv) diffKeys.push(key);
    });

    return diffKeys;
  }
}
