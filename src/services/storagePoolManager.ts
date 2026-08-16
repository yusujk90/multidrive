import {
  DriveAccount,
  UnifiedFile,
  SyncRule,
  SyncLogEntry,
  StoragePoolSummary,
  AllocationStrategy,
} from '../types';

export const INITIAL_DEMO_ACCOUNTS: DriveAccount[] = [
  {
    id: 'drive_demo_primary',
    email: 'yusuf.personal@gmail.com',
    name: 'Akun Pribadi (Utama)',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60',
    storageLimit: 15 * 1024 * 1024 * 1024, // 15 GB
    storageUsed: 11.4 * 1024 * 1024 * 1024, // 11.4 GB (76%) - Overloaded
    storageAvailable: 3.6 * 1024 * 1024 * 1024,
    color: '#2563eb', // Blue
    status: 'demo',
    lastSyncedAt: new Date().toISOString(),
    isPrimary: true,
    driveFilesCount: 7,
  },
  {
    id: 'drive_demo_work',
    email: 'yusuf.project.dev@gmail.com',
    name: 'Akun Project & Kerja',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60',
    storageLimit: 15 * 1024 * 1024 * 1024, // 15 GB
    storageUsed: 4.6 * 1024 * 1024 * 1024, // 4.6 GB (30.6%)
    storageAvailable: 10.4 * 1024 * 1024 * 1024,
    color: '#059669', // Emerald
    status: 'demo',
    lastSyncedAt: new Date().toISOString(),
    isPrimary: false,
    driveFilesCount: 5,
  },
  {
    id: 'drive_demo_vault',
    email: 'yusuf.cloudvault.backup@gmail.com',
    name: 'Akun Backup & Arsip',
    photoUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&auto=format&fit=crop&q=60',
    storageLimit: 15 * 1024 * 1024 * 1024, // 15 GB
    storageUsed: 1.1 * 1024 * 1024 * 1024, // 1.1 GB (7.3%) - High free capacity
    storageAvailable: 13.9 * 1024 * 1024 * 1024,
    color: '#7c3aed', // Purple
    status: 'demo',
    lastSyncedAt: new Date().toISOString(),
    isPrimary: false,
    driveFilesCount: 4,
  },
];

export const INITIAL_DEMO_FILES: UnifiedFile[] = [
  {
    id: 'file_demo_1',
    name: 'Video_Dokumenter_Proyek_4K.mp4',
    mimeType: 'video/mp4',
    size: 3.2 * 1024 * 1024 * 1024, // 3.2 GB
    modifiedTime: new Date(Date.now() - 3600000 * 2).toISOString(),
    accountId: 'drive_demo_primary',
    accountEmail: 'yusuf.personal@gmail.com',
    accountName: 'Akun Pribadi (Utama)',
    accountColor: '#2563eb',
    isFolder: false,
    syncStatus: 'synced',
    webViewLink: 'https://drive.google.com',
  },
  {
    id: 'file_demo_2',
    name: 'Arsip_Foto_Event_RAW.zip',
    mimeType: 'application/zip',
    size: 2.4 * 1024 * 1024 * 1024, // 2.4 GB
    modifiedTime: new Date(Date.now() - 3600000 * 5).toISOString(),
    accountId: 'drive_demo_primary',
    accountEmail: 'yusuf.personal@gmail.com',
    accountName: 'Akun Pribadi (Utama)',
    accountColor: '#2563eb',
    isFolder: false,
    syncStatus: 'synced',
    webViewLink: 'https://drive.google.com',
  },
  {
    id: 'file_demo_3',
    name: 'Database_Backup_Production.tar.gz',
    mimeType: 'application/gzip',
    size: 2.1 * 1024 * 1024 * 1024, // 2.1 GB
    modifiedTime: new Date(Date.now() - 3600000 * 12).toISOString(),
    accountId: 'drive_demo_primary',
    accountEmail: 'yusuf.personal@gmail.com',
    accountName: 'Akun Pribadi (Utama)',
    accountColor: '#2563eb',
    isFolder: false,
    syncStatus: 'synced',
    webViewLink: 'https://drive.google.com',
  },
  {
    id: 'file_demo_4',
    name: 'Model_AI_Weights_Trained.bin',
    mimeType: 'application/octet-stream',
    size: 1.6 * 1024 * 1024 * 1024, // 1.6 GB
    modifiedTime: new Date(Date.now() - 3600000 * 18).toISOString(),
    accountId: 'drive_demo_primary',
    accountEmail: 'yusuf.personal@gmail.com',
    accountName: 'Akun Pribadi (Utama)',
    accountColor: '#2563eb',
    isFolder: false,
    syncStatus: 'synced',
    webViewLink: 'https://drive.google.com',
  },
  {
    id: 'file_demo_5',
    name: 'Dataset_Analytics_BigData.parquet',
    mimeType: 'application/octet-stream',
    size: 950 * 1024 * 1024, // 950 MB
    modifiedTime: new Date(Date.now() - 3600000 * 24).toISOString(),
    accountId: 'drive_demo_primary',
    accountEmail: 'yusuf.personal@gmail.com',
    accountName: 'Akun Pribadi (Utama)',
    accountColor: '#2563eb',
    isFolder: false,
    syncStatus: 'synced',
    webViewLink: 'https://drive.google.com',
  },
  {
    id: 'file_demo_6',
    name: 'Proposal_Pengembangan_Sistem_2026.pdf',
    mimeType: 'application/pdf',
    size: 8.4 * 1024 * 1024,
    modifiedTime: new Date(Date.now() - 3600000 * 30).toISOString(),
    accountId: 'drive_demo_primary',
    accountEmail: 'yusuf.personal@gmail.com',
    accountName: 'Akun Pribadi (Utama)',
    accountColor: '#2563eb',
    isFolder: false,
    syncStatus: 'replicated',
    replicatedInAccounts: ['drive_demo_vault'],
    webViewLink: 'https://drive.google.com',
  },
  {
    id: 'file_demo_7',
    name: 'Foto_Dokumentasi_Pelatihan_HD.jpg',
    mimeType: 'image/jpeg',
    size: 18.5 * 1024 * 1024,
    modifiedTime: new Date(Date.now() - 3600000 * 36).toISOString(),
    accountId: 'drive_demo_primary',
    accountEmail: 'yusuf.personal@gmail.com',
    accountName: 'Akun Pribadi (Utama)',
    accountColor: '#2563eb',
    isFolder: false,
    syncStatus: 'synced',
    webViewLink: 'https://drive.google.com',
  },
  {
    id: 'file_demo_8',
    name: 'Repository_Build_Artifacts.tar',
    mimeType: 'application/x-tar',
    size: 2.2 * 1024 * 1024 * 1024, // 2.2 GB
    modifiedTime: new Date(Date.now() - 3600000 * 8).toISOString(),
    accountId: 'drive_demo_work',
    accountEmail: 'yusuf.project.dev@gmail.com',
    accountName: 'Akun Project & Kerja',
    accountColor: '#059669',
    isFolder: false,
    syncStatus: 'synced',
    webViewLink: 'https://drive.google.com',
  },
  {
    id: 'file_demo_9',
    name: 'Design_Figma_Offline_Export.sketch',
    mimeType: 'application/octet-stream',
    size: 1.4 * 1024 * 1024 * 1024, // 1.4 GB
    modifiedTime: new Date(Date.now() - 3600000 * 14).toISOString(),
    accountId: 'drive_demo_work',
    accountEmail: 'yusuf.project.dev@gmail.com',
    accountName: 'Akun Project & Kerja',
    accountColor: '#059669',
    isFolder: false,
    syncStatus: 'synced',
    webViewLink: 'https://drive.google.com',
  },
  {
    id: 'file_demo_10',
    name: 'Dataset_Penjualan_Q1-Q4.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 24.6 * 1024 * 1024,
    modifiedTime: new Date(Date.now() - 3600000 * 20).toISOString(),
    accountId: 'drive_demo_work',
    accountEmail: 'yusuf.project.dev@gmail.com',
    accountName: 'Akun Project & Kerja',
    accountColor: '#059669',
    isFolder: false,
    syncStatus: 'synced',
    webViewLink: 'https://drive.google.com',
  },
  {
    id: 'file_demo_11',
    name: 'Dokumentasi_Arsitektur_MultiCloud.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 14.2 * 1024 * 1024,
    modifiedTime: new Date(Date.now() - 3600000 * 26).toISOString(),
    accountId: 'drive_demo_work',
    accountEmail: 'yusuf.project.dev@gmail.com',
    accountName: 'Akun Project & Kerja',
    accountColor: '#059669',
    isFolder: false,
    syncStatus: 'synced',
    webViewLink: 'https://drive.google.com',
  },
  {
    id: 'file_demo_12',
    name: 'Presentasi_Roadmap_Produk_2026.pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    size: 32.8 * 1024 * 1024,
    modifiedTime: new Date(Date.now() - 3600000 * 32).toISOString(),
    accountId: 'drive_demo_work',
    accountEmail: 'yusuf.project.dev@gmail.com',
    accountName: 'Akun Project & Kerja',
    accountColor: '#059669',
    isFolder: false,
    syncStatus: 'synced',
    webViewLink: 'https://drive.google.com',
  },
  {
    id: 'file_demo_13',
    name: 'Master_Design_Assets_Brand.zip',
    mimeType: 'application/zip',
    size: 480 * 1024 * 1024,
    modifiedTime: new Date(Date.now() - 3600000 * 40).toISOString(),
    accountId: 'drive_demo_vault',
    accountEmail: 'yusuf.cloudvault.backup@gmail.com',
    accountName: 'Akun Backup & Arsip',
    accountColor: '#7c3aed',
    isFolder: false,
    syncStatus: 'synced',
    webViewLink: 'https://drive.google.com',
  },
  {
    id: 'file_demo_14',
    name: 'Database_Backup_Dump_Latest.sql.gz',
    mimeType: 'application/gzip',
    size: 215 * 1024 * 1024,
    modifiedTime: new Date(Date.now() - 3600000 * 50).toISOString(),
    accountId: 'drive_demo_vault',
    accountEmail: 'yusuf.cloudvault.backup@gmail.com',
    accountName: 'Akun Backup & Arsip',
    accountColor: '#7c3aed',
    isFolder: false,
    syncStatus: 'synced',
    webViewLink: 'https://drive.google.com',
  },
  {
    id: 'file_demo_15',
    name: 'Koleksi_Ebook_Teknologi.pdf',
    mimeType: 'application/pdf',
    size: 120 * 1024 * 1024,
    modifiedTime: new Date(Date.now() - 3600000 * 60).toISOString(),
    accountId: 'drive_demo_vault',
    accountEmail: 'yusuf.cloudvault.backup@gmail.com',
    accountName: 'Akun Backup & Arsip',
    accountColor: '#7c3aed',
    isFolder: false,
    syncStatus: 'synced',
    webViewLink: 'https://drive.google.com',
  },
  {
    id: 'file_demo_16',
    name: 'Certificates_SSL_Archive.zip',
    mimeType: 'application/zip',
    size: 45 * 1024 * 1024,
    modifiedTime: new Date(Date.now() - 3600000 * 70).toISOString(),
    accountId: 'drive_demo_vault',
    accountEmail: 'yusuf.cloudvault.backup@gmail.com',
    accountName: 'Akun Backup & Arsip',
    accountColor: '#7c3aed',
    isFolder: false,
    syncStatus: 'synced',
    webViewLink: 'https://drive.google.com',
  },
];

export const INITIAL_SYNC_RULES: SyncRule[] = [
  {
    id: 'rule_1',
    name: 'Mirror Otomatis: Akun Utama ➜ Vault Backup',
    sourceAccountId: 'drive_demo_primary',
    targetAccountId: 'drive_demo_vault',
    ruleType: 'mirror',
    status: 'active',
    fileTypes: ['all'],
    thresholdPercent: 80,
    lastRun: new Date(Date.now() - 15 * 60000).toISOString(),
    syncedFileCount: 2,
  },
  {
    id: 'rule_2',
    name: 'Auto-Offload Kapasitas (>75% Quota)',
    sourceAccountId: 'drive_demo_primary',
    targetAccountId: 'drive_demo_work',
    ruleType: 'high_quota_offload',
    status: 'active',
    fileTypes: ['video', 'archive', 'image'],
    thresholdPercent: 75,
    lastRun: new Date(Date.now() - 45 * 60000).toISOString(),
    syncedFileCount: 4,
  },
];

export const INITIAL_SYNC_LOGS: SyncLogEntry[] = [
  {
    id: 'log_1',
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    action: 'mirror',
    fileName: 'Proposal_Pengembangan_Sistem_2026.pdf',
    fileSize: 8.4 * 1024 * 1024,
    fromAccount: 'yusuf.personal@gmail.com',
    toAccount: 'yusuf.cloudvault.backup@gmail.com',
    status: 'success',
    message: 'Sinkronisasi replikasi cadangan otomatis berhasil',
  },
  {
    id: 'log_2',
    timestamp: new Date(Date.now() - 42 * 60000).toISOString(),
    action: 'rebalance',
    fileName: 'Master_Design_Assets_Brand.zip',
    fileSize: 480 * 1024 * 1024,
    fromAccount: 'yusuf.personal@gmail.com',
    toAccount: 'yusuf.cloudvault.backup@gmail.com',
    status: 'success',
    message: 'Relokasi berkas besar untuk menghemat kuota akun utama (kuota > 75%)',
  },
  {
    id: 'log_3',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    action: 'upload',
    fileName: 'Presentasi_Roadmap_Produk_2026.pptx',
    fileSize: 32.8 * 1024 * 1024,
    toAccount: 'yusuf.project.dev@gmail.com',
    status: 'success',
    message: 'Smart Load Balancer mengalokasikan berkas ke drive dengan sisa kuota terbesar',
  },
];

/**
 * Format bytes into human readable string (GB, MB, KB, Bytes)
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Calculate total summary across all linked drive accounts
 */
export function calculatePoolSummary(accounts: DriveAccount[], files: UnifiedFile[]): StoragePoolSummary {
  let totalLimit = 0;
  let totalUsed = 0;

  accounts.forEach((acc) => {
    totalLimit += Number(acc.storageLimit) || 0;
    totalUsed += Number(acc.storageUsed) || 0;
  });

  const totalAvailable = Math.max(0, totalLimit - totalUsed);
  const usedPercentage = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
  const healthyDriveCount = accounts.filter(
    (acc) => ((Number(acc.storageUsed) || 0) / (Number(acc.storageLimit) || 1)) < 0.85
  ).length;

  return {
    totalLimit,
    totalUsed,
    totalAvailable,
    usedPercentage,
    accountsCount: accounts.length,
    totalFilesCount: files.length,
    healthyDriveCount,
  };
}

/**
 * Pick the optimal Drive account to receive an uploaded file based on chosen allocation strategy.
 * Implements a weighted round-robin, least-filled (projected percentage), and max-free-space logic
 * that accurately accounts for variable file sizes and real-time available headroom.
 */
export function selectTargetDrive(
  accounts: DriveAccount[],
  strategy: AllocationStrategy,
  fileSize: number = 0,
  manualAccountId?: string,
  lastUsedIndex: number = 0
): { targetAccount: DriveAccount; nextIndex: number; reason: string } {
  if (!accounts || accounts.length === 0) {
    throw new Error('Tidak ada akun Google Drive yang terhubung dalam pool.');
  }

  const safeFileSize = Math.max(0, Number(fileSize) || 0);

  // Helper to get sanitized real-time account metrics
  const getAccountMetrics = (acc: DriveAccount) => {
    const limit = Math.max(1, Number(acc.storageLimit) || 15 * 1024 * 1024 * 1024);
    const used = Math.min(limit, Math.max(0, Number(acc.storageUsed) || 0));
    const free = Math.max(0, limit - used);
    const currentPct = (used / limit) * 100;
    const projectedUsed = used + safeFileSize;
    const projectedPct = (projectedUsed / limit) * 100;
    const hasCapacity = free >= safeFileSize;

    return {
      account: acc,
      limit,
      used,
      free,
      currentPct,
      projectedUsed,
      projectedPct,
      hasCapacity,
    };
  };

  const accountMetrics = accounts.map(getAccountMetrics);

  // 1. Manual Account Selection
  if (manualAccountId) {
    const foundMetric = accountMetrics.find((m) => m.account.id === manualAccountId);
    if (foundMetric) {
      const targetIdx = accounts.findIndex((a) => a.id === manualAccountId);
      if (!foundMetric.hasCapacity && safeFileSize > 0) {
        return {
          targetAccount: foundMetric.account,
          nextIndex: targetIdx >= 0 ? targetIdx : lastUsedIndex,
          reason: `Pilihan Manual (${foundMetric.account.name}): Sisa kuota (${formatBytes(foundMetric.free)}) lebih kecil dari ukuran berkas (${formatBytes(safeFileSize)})`,
        };
      }
      return {
        targetAccount: foundMetric.account,
        nextIndex: targetIdx >= 0 ? targetIdx : lastUsedIndex,
        reason: `Dipilih secara manual: ${foundMetric.account.name} (Tersisa ${formatBytes(foundMetric.free)})`,
      };
    }
  }

  // Filter accounts with sufficient capacity for the incoming file
  const eligibleMetrics = accountMetrics.filter((m) => m.hasCapacity);
  const candidates = eligibleMetrics.length > 0 ? eligibleMetrics : accountMetrics;

  // 2. Weighted Round-Robin (WRR) Strategy
  if (strategy === 'round_robin') {
    // Weighted selection: prioritize drives with higher free space proportion
    // while cycling through eligible accounts to ensure fair spread
    const n = accounts.length;
    let chosenMetric = candidates[0];
    let chosenIndex = 0;

    // Look for next eligible account starting from (lastUsedIndex + 1)
    let foundNext = false;
    for (let step = 1; step <= n; step++) {
      const candidateIdx = (lastUsedIndex + step) % n;
      const metric = accountMetrics[candidateIdx];
      
      // If account can accommodate file size or no account has full space
      if (metric.hasCapacity || eligibleMetrics.length === 0) {
        chosenMetric = metric;
        chosenIndex = candidateIdx;
        foundNext = true;
        break;
      }
    }

    if (!foundNext) {
      // Fallback to the one with maximum free space
      const sortedByFree = [...candidates].sort((a, b) => b.free - a.free);
      chosenMetric = sortedByFree[0];
      chosenIndex = accounts.findIndex((a) => a.id === chosenMetric.account.id);
    }

    return {
      targetAccount: chosenMetric.account,
      nextIndex: chosenIndex,
      reason: `Weighted Round-Robin: ${chosenMetric.account.name} (Sisa ${formatBytes(chosenMetric.free)}, diproyeksikan ${chosenMetric.projectedPct.toFixed(1)}% terisi)`,
    };
  }

  // 3. Balanced Fill (Least-Filled Projected Percentage) Strategy
  if (strategy === 'balanced_fill') {
    // Sort by projected percentage after including the incoming file size
    const sorted = [...candidates].sort((a, b) => {
      // Primary: lowest projected usage percentage
      if (Math.abs(a.projectedPct - b.projectedPct) > 0.01) {
        return a.projectedPct - b.projectedPct;
      }
      // Secondary: largest absolute free space
      return b.free - a.free;
    });

    const best = sorted[0];
    const targetIdx = accounts.findIndex((a) => a.id === best.account.id);

    return {
      targetAccount: best.account,
      nextIndex: targetIdx >= 0 ? targetIdx : 0,
      reason: `Penyeimbang Proporsional (Least-Filled): ${best.account.name} (Saat ini ${best.currentPct.toFixed(0)}%, sisa ${formatBytes(best.free)})`,
    };
  }

  // 4. Max Free Space (Kapasitas Bebas Terbesar) Strategy (Default)
  const sortedByFreeSpace = [...candidates].sort((a, b) => {
    // Primary: largest remaining free bytes
    if (b.free !== a.free) {
      return b.free - a.free;
    }
    // Secondary: lowest current percentage
    return a.currentPct - b.currentPct;
  });

  const best = sortedByFreeSpace[0];
  const targetIdx = accounts.findIndex((a) => a.id === best.account.id);

  return {
    targetAccount: best.account,
    nextIndex: targetIdx >= 0 ? targetIdx : 0,
    reason: `Kapasitas Bebas Terbesar: ${best.account.name} (${formatBytes(best.free)} ruang kosong, ${best.currentPct.toFixed(0)}% terpakai)`,
  };
}

export interface RebalanceAction {
  file: UnifiedFile;
  fromAccount: DriveAccount;
  toAccount: DriveAccount;
  reason: string;
}

export interface RebalancePlan {
  isImbalanced: boolean;
  maxUsagePct: number;
  minUsagePct: number;
  imbalanceDelta: number;
  actions: RebalanceAction[];
  projectedAccounts: DriveAccount[];
  explanation: string;
}

/**
 * Intelligent Auto-Balancer Plan Calculator
 * Identifies overloaded drives (> threshold or significantly above average)
 * and plans migrations to drives with the lowest utilization.
 */
export function calculateRebalancePlan(
  accounts: DriveAccount[],
  files: UnifiedFile[]
): RebalancePlan {
  if (!accounts || accounts.length <= 1 || !files || files.length === 0) {
    return {
      isImbalanced: false,
      maxUsagePct: 0,
      minUsagePct: 0,
      imbalanceDelta: 0,
      actions: [],
      projectedAccounts: accounts,
      explanation: 'Tidak ada ketidakseimbangan atau akun tidak cukup untuk diseimbangkan.',
    };
  }

  const usageRatios = accounts.map((a) => ({
    account: a,
    pct: (Number(a.storageUsed) / (Number(a.storageLimit) || 1)) * 100,
  }));

  usageRatios.sort((a, b) => b.pct - a.pct);
  const maxUsagePct = usageRatios[0].pct;
  const minUsagePct = usageRatios[usageRatios.length - 1].pct;
  const imbalanceDelta = Math.max(0, maxUsagePct - minUsagePct);

  // Calculate target average percentage across the entire pool
  const totalLimit = accounts.reduce((acc, a) => acc + (Number(a.storageLimit) || 0), 0);
  const totalUsed = accounts.reduce((acc, a) => acc + (Number(a.storageUsed) || 0), 0);
  const avgUsagePct = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

  // Clone accounts for simulation
  const projectedAccounts: DriveAccount[] = accounts.map((a) => ({ ...a }));
  const actions: RebalanceAction[] = [];

  // Filter out folders, only movable files
  const movableFiles = files.filter((f) => !f.isFolder && (Number(f.size) || 0) > 0);

  // Track simulated file locations
  const simulatedFileLocations = new Map<string, string>();
  movableFiles.forEach((f) => simulatedFileLocations.set(f.id, f.accountId));

  // Multi-pass iterative balancing
  for (let pass = 0; pass < 8; pass++) {
    // Re-evaluate current simulation stats
    const currentSimulated = projectedAccounts.map((a) => ({
      acc: a,
      pct: (a.storageUsed / (a.storageLimit || 1)) * 100,
      free: Math.max(0, a.storageLimit - a.storageUsed),
    }));

    currentSimulated.sort((a, b) => b.pct - a.pct);

    const highest = currentSimulated[0];
    const lowest = currentSimulated[currentSimulated.length - 1];

    // If difference between highest and lowest is within acceptable balance threshold (e.g. <= 12%)
    if (highest.pct - lowest.pct <= 12 && highest.pct <= avgUsagePct + 5) {
      break;
    }

    // Candidate source accounts (above average or > 50%)
    const candidateSources = currentSimulated.filter(
      (s) => s.pct > avgUsagePct + 2 || s.pct - lowest.pct > 12
    );

    if (candidateSources.length === 0) break;

    let actionAddedInPass = false;

    for (const sourceSim of candidateSources) {
      const source = sourceSim.acc;
      // Get files currently located on this source in the simulation
      const sourceFiles = movableFiles
        .filter((f) => simulatedFileLocations.get(f.id) === source.id)
        .sort((a, b) => (Number(b.size) || 0) - (Number(a.size) || 0));

      for (const file of sourceFiles) {
        const fileSize = Number(file.size) || 0;
        const sourceCurrentPct = (source.storageUsed / (source.storageLimit || 1)) * 100;

        // Stop if source is already close to target average
        if (sourceCurrentPct <= avgUsagePct + 3) break;

        // Find candidate targets (other accounts with lowest usage and sufficient space)
        const candidateTargets = currentSimulated
          .filter((t) => t.acc.id !== source.id)
          .sort((a, b) => a.pct - b.pct);

        for (const targetSim of candidateTargets) {
          const target = targetSim.acc;
          const targetFree = Math.max(0, target.storageLimit - target.storageUsed);
          const targetProjPct = ((target.storageUsed + fileSize) / (target.storageLimit || 1)) * 100;

          // Ensure target has space and won't become higher than source was
          if (targetFree >= fileSize && targetProjPct < sourceCurrentPct - 2 && targetProjPct <= avgUsagePct + 10) {
            // Apply relocation in simulation
            source.storageUsed = Math.max(0, source.storageUsed - fileSize);
            source.storageAvailable = Math.max(0, source.storageLimit - source.storageUsed);

            target.storageUsed = target.storageUsed + fileSize;
            target.storageAvailable = Math.max(0, target.storageLimit - target.storageUsed);

            simulatedFileLocations.set(file.id, target.id);

            const origFrom = accounts.find((a) => a.id === file.accountId) || source;
            const origTo = accounts.find((a) => a.id === target.id) || target;

            actions.push({
              file,
              fromAccount: origFrom,
              toAccount: origTo,
              reason: `Relokasi berkas ${formatBytes(fileSize)} dari ${source.name} (${sourceCurrentPct.toFixed(0)}%) ke ${target.name} untuk meratakan beban kapasitas`,
            });

            actionAddedInPass = true;
            break;
          }
        }

        if (actionAddedInPass) break;
      }

      if (actionAddedInPass) break;
    }

    if (!actionAddedInPass) {
      // No more fitting moves possible
      break;
    }

    if (actions.length >= 8) break;
  }

  const isImbalanced = imbalanceDelta > 15 || actions.length > 0;
  const explanation = isImbalanced
    ? `Ditemukan selisih pemakaian ${imbalanceDelta.toFixed(0)}% antar akun. Auto-Balancer menyusun ${actions.length} relokasi berkas strategis.`
    : `Kapasitas pool sudah seimbang (selisih antar drive hanya ${imbalanceDelta.toFixed(0)}%).`;

  return {
    isImbalanced,
    maxUsagePct,
    minUsagePct,
    imbalanceDelta,
    actions,
    projectedAccounts,
    explanation,
  };
}

/**
 * Determine file category
 */
export function getFileCategory(mimeType: string, fileName: string): string {
  if (mimeType.includes('folder') || mimeType.includes('directory')) return 'folder';
  if (mimeType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i)) return 'image';
  if (mimeType.startsWith('video/') || fileName.match(/\.(mp4|mkv|avi|mov|wmv|webm)$/i)) return 'video';
  if (mimeType.startsWith('audio/') || fileName.match(/\.(mp3|wav|ogg|m4a|flac)$/i)) return 'audio';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    mimeType.includes('presentation') ||
    mimeType.includes('sheet') ||
    fileName.match(/\.(pdf|docx|doc|xlsx|xls|pptx|ppt|txt|md|csv)$/i)
  ) {
    return 'document';
  }
  if (fileName.match(/\.(zip|rar|7z|tar|gz|bz2)$/i) || mimeType.includes('zip') || mimeType.includes('compressed')) {
    return 'archive';
  }
  return 'other';
}
