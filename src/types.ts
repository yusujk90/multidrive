export interface DriveAccount {
  id: string;
  email: string;
  name: string;
  photoUrl?: string;
  accessToken?: string;
  storageLimit: number; // in bytes
  storageUsed: number; // in bytes
  storageAvailable: number; // in bytes
  color: string;
  status: 'active' | 'expired' | 'syncing' | 'demo';
  lastSyncedAt?: string;
  isPrimary?: boolean;
  driveFilesCount?: number;
  userId?: string;
}

export interface UnifiedFile {
  id: string;
  name: string;
  mimeType: string;
  size: number; // in bytes
  modifiedTime: string;
  accountId: string;
  accountEmail: string;
  accountName: string;
  accountColor: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  isFolder: boolean;
  parentId?: string;
  syncStatus?: 'synced' | 'local' | 'replicated' | 'syncing';
  replicatedInAccounts?: string[]; // account IDs where a backup exists
  category?: string;
  userId?: string;
  isReplicated?: boolean;
}

export type PooledFile = UnifiedFile;

export type AllocationStrategy = 'max_free_space' | 'round_robin' | 'manual' | 'balanced_fill';

export interface SyncRule {
  id: string;
  name: string;
  sourceAccountId: string;
  targetAccountId: string;
  ruleType: 'mirror' | 'auto_balance' | 'backup_important' | 'high_quota_offload';
  status: 'active' | 'paused';
  fileTypes: string[]; // 'all' or specific mime categories like 'image', 'document'
  thresholdPercent: number; // for high_quota_offload, e.g., 85
  lastRun?: string;
  syncedFileCount: number;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  action: 'upload' | 'rebalance' | 'mirror' | 'cross_copy' | 'delete' | 'sync_check';
  fileName: string;
  fileSize?: number;
  fromAccount?: string;
  toAccount?: string;
  status: 'success' | 'running' | 'failed';
  message: string;
  sourceDriveName?: string;
  targetDriveName?: string;
  userId?: string;
}

export type SyncLog = SyncLogEntry;

export interface StoragePoolSummary {
  totalLimit: number;
  totalUsed: number;
  totalAvailable: number;
  usedPercentage: number;
  accountsCount: number;
  totalFilesCount: number;
  healthyDriveCount: number;
}
