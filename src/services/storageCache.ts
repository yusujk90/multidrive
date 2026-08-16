import { DriveAccount, UnifiedFile, SyncRule, SyncLogEntry } from '../types';
import {
  INITIAL_DEMO_ACCOUNTS,
  INITIAL_DEMO_FILES,
  INITIAL_SYNC_RULES,
  INITIAL_SYNC_LOGS,
} from './storagePoolManager';

const CACHE_KEYS = {
  ACCOUNTS: 'drivepool_v3_accounts',
  FILES: 'drivepool_v3_files',
  RULES: 'drivepool_v3_rules',
  LOGS: 'drivepool_v3_logs',
  LAST_SAVED: 'drivepool_v3_last_saved',
};

/**
 * Reconcile and calculate exact storage usage per account from pooled files
 * and base storage footprint, guaranteeing mathematical accuracy.
 */
export function recalculateAccountStorage(
  accounts: DriveAccount[],
  files: UnifiedFile[]
): DriveAccount[] {
  return accounts.map((acc) => {
    const accFiles = files.filter((f) => f.accountId === acc.id && !f.isFolder);
    const pooledFilesTotalSize = accFiles.reduce((sum, f) => sum + (Number(f.size) || 0), 0);

    // If account has files in the pool, ensure storageUsed is at least the sum of files
    // or properly tracks the allocated bytes without going below zero or above limit
    const calculatedUsed = Math.max(acc.storageUsed || 0, pooledFilesTotalSize);
    const finalUsed = Math.min(acc.storageLimit, calculatedUsed);
    const finalAvailable = Math.max(0, acc.storageLimit - finalUsed);

    return {
      ...acc,
      storageUsed: finalUsed,
      storageAvailable: finalAvailable,
      driveFilesCount: accFiles.length,
    };
  });
}

/**
 * Load accounts from persistent cache with validation
 */
export function loadCachedAccounts(): DriveAccount[] {
  try {
    const saved = localStorage.getItem(CACHE_KEYS.ACCOUNTS) || localStorage.getItem('drivepool_accounts');
    if (saved) {
      const parsed: DriveAccount[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load cached accounts:', e);
  }
  return INITIAL_DEMO_ACCOUNTS;
}

/**
 * Save accounts to persistent cache
 */
export function saveCachedAccounts(accounts: DriveAccount[]): void {
  try {
    localStorage.setItem(CACHE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    localStorage.setItem(CACHE_KEYS.LAST_SAVED, new Date().toISOString());
  } catch (e) {
    console.error('Failed to save accounts to cache:', e);
  }
}

/**
 * Load files from persistent cache with validation
 */
export function loadCachedFiles(): UnifiedFile[] {
  try {
    const saved = localStorage.getItem(CACHE_KEYS.FILES) || localStorage.getItem('drivepool_files');
    if (saved) {
      const parsed: UnifiedFile[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load cached files:', e);
  }
  return INITIAL_DEMO_FILES;
}

/**
 * Save files to persistent cache
 */
export function saveCachedFiles(files: UnifiedFile[]): void {
  try {
    localStorage.setItem(CACHE_KEYS.FILES, JSON.stringify(files));
    localStorage.setItem(CACHE_KEYS.LAST_SAVED, new Date().toISOString());
  } catch (e) {
    console.error('Failed to save files to cache:', e);
  }
}

/**
 * Load rules from persistent cache
 */
export function loadCachedRules(): SyncRule[] {
  try {
    const saved = localStorage.getItem(CACHE_KEYS.RULES) || localStorage.getItem('drivepool_rules');
    if (saved) {
      const parsed: SyncRule[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load cached rules:', e);
  }
  return INITIAL_SYNC_RULES;
}

/**
 * Save rules to persistent cache
 */
export function saveCachedRules(rules: SyncRule[]): void {
  try {
    localStorage.setItem(CACHE_KEYS.RULES, JSON.stringify(rules));
  } catch (e) {
    console.error('Failed to save rules to cache:', e);
  }
}

/**
 * Load logs from persistent cache
 */
export function loadCachedLogs(): SyncLogEntry[] {
  try {
    const saved = localStorage.getItem(CACHE_KEYS.LOGS) || localStorage.getItem('drivepool_logs');
    if (saved) {
      const parsed: SyncLogEntry[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load cached logs:', e);
  }
  return INITIAL_SYNC_LOGS;
}

/**
 * Save logs to persistent cache
 */
export function saveCachedLogs(logs: SyncLogEntry[]): void {
  try {
    localStorage.setItem(CACHE_KEYS.LOGS, JSON.stringify(logs.slice(0, 100)));
  } catch (e) {
    console.error('Failed to save logs to cache:', e);
  }
}

/**
 * Reset all storage cache to initial demo state
 */
export function resetStorageCacheToDefaults(): {
  accounts: DriveAccount[];
  files: UnifiedFile[];
  rules: SyncRule[];
  logs: SyncLogEntry[];
} {
  try {
    Object.values(CACHE_KEYS).forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem('drivepool_accounts');
    localStorage.removeItem('drivepool_files');
    localStorage.removeItem('drivepool_rules');
    localStorage.removeItem('drivepool_logs');
  } catch (e) {
    console.error('Failed to reset storage cache:', e);
  }

  saveCachedAccounts(INITIAL_DEMO_ACCOUNTS);
  saveCachedFiles(INITIAL_DEMO_FILES);
  saveCachedRules(INITIAL_SYNC_RULES);
  saveCachedLogs(INITIAL_SYNC_LOGS);

  return {
    accounts: INITIAL_DEMO_ACCOUNTS,
    files: INITIAL_DEMO_FILES,
    rules: INITIAL_SYNC_RULES,
    logs: INITIAL_SYNC_LOGS,
  };
}
