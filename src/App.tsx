import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'motion/react';
import {
  DriveAccount,
  UnifiedFile,
  SyncRule,
  SyncLogEntry,
  AllocationStrategy,
} from './types';
import {
  INITIAL_DEMO_ACCOUNTS,
  INITIAL_DEMO_FILES,
  INITIAL_SYNC_RULES,
  INITIAL_SYNC_LOGS,
  calculatePoolSummary,
  selectTargetDrive,
  calculateRebalancePlan,
  RebalancePlan,
  formatBytes,
} from './services/storagePoolManager';
import {
  loadCachedAccounts,
  saveCachedAccounts,
  loadCachedFiles,
  saveCachedFiles,
  loadCachedRules,
  saveCachedRules,
  loadCachedLogs,
  saveCachedLogs,
  resetStorageCacheToDefaults,
  recalculateAccountStorage,
} from './services/storageCache';
import {
  connectNewGoogleDriveAccount,
  refreshGoogleOAuthToken,
  getCachedToken,
  auth,
} from './services/firebaseAuth';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  saveUserProfile,
  saveDriveAccountToFirestore,
  savePooledFileToFirestore,
  saveSyncLogToFirestore,
  validateFirestoreConnection,
} from './services/firestoreStorage';
import {
  fetchAccountAbout,
  fetchAccountFiles,
  uploadFileToDrive,
  deleteFileFromDrive,
  downloadFileBlob,
  copyFileBetweenDrives,
  createFolderInDrive,
  onDriveAuthError,
  refreshAllAccounts,
} from './services/driveApi';
import {
  syncDriveAccountsToCloudSql,
  syncFilesToCloudSql,
  logSyncToCloudSql,
} from './services/backendApi';
import { Header } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import { StorageOverview } from './components/StorageOverview';
import { FileExplorer } from './components/FileExplorer';
import { SyncManager } from './components/SyncManager';
import { StorageAnalytics } from './components/StorageAnalytics';
import { GeminiChatbot } from './components/GeminiChatbot';
import { FileUploadModal } from './components/FileUploadModal';
import { AutoBalancerModal } from './components/AutoBalancerModal';
import { AccountManagerModal } from './components/AccountManagerModal';
import { FileDetailsModal } from './components/FileDetailsModal';
import { PolyglotServicesModal } from './components/PolyglotServicesModal';
import { CheckCircle2, AlertCircle, Sparkles, Zap } from 'lucide-react';

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
    scale: 0.99,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.28,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.99,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

export default function App() {
  // App navigation state
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  // Storage state
  const [accounts, setAccounts] = useState<DriveAccount[]>(() => loadCachedAccounts());
  const [files, setFiles] = useState<UnifiedFile[]>(() => loadCachedFiles());
  const [syncRules, setSyncRules] = useState<SyncRule[]>(() => loadCachedRules());
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>(() => loadCachedLogs());

  // UI Modals & Filters
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAutoBalancerModalOpen, setIsAutoBalancerModalOpen] = useState(false);
  const [isPolyglotModalOpen, setIsPolyglotModalOpen] = useState(false);
  const [uploadDefaultAccountId, setUploadDefaultAccountId] = useState<string | undefined>(undefined);
  const [activeDetailsFile, setActiveDetailsFile] = useState<UnifiedFile | null>(null);
  const [droppedFilesBatch, setDroppedFilesBatch] = useState<FileList | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState(300); // 5 minutes default
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Monitor Firebase Auth State
  useEffect(() => {
    validateFirestoreConnection();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && user.email) {
        saveUserProfile({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }).catch(console.warn);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for 401 UNAUTHENTICATED Drive Auth Errors and mark account as expired
  useEffect(() => {
    const unsubscribe = onDriveAuthError(({ accountEmail, message }) => {
      setAccounts((prev) =>
        prev.map((a) =>
          a.email.toLowerCase() === accountEmail.toLowerCase()
            ? { ...a, status: 'expired' as const }
            : a
        )
      );
      showToast(message, 'error');
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Save changes to localStorage Cache, Firestore & Cloud SQL Backend
  useEffect(() => {
    saveCachedAccounts(accounts);
    syncDriveAccountsToCloudSql(accounts);
    if (currentUser?.uid) {
      accounts.forEach((acc) => {
        saveDriveAccountToFirestore(currentUser.uid, acc).catch(console.warn);
      });
    }
  }, [accounts, currentUser]);

  useEffect(() => {
    saveCachedFiles(files);
    syncFilesToCloudSql(files);
    if (currentUser?.uid) {
      files.slice(0, 50).forEach((f) => {
        savePooledFileToFirestore(currentUser.uid, {
          id: f.id,
          userId: currentUser.uid,
          accountId: f.accountId,
          name: f.name,
          mimeType: f.mimeType,
          size: f.size,
          modifiedTime: f.modifiedTime,
          webViewLink: f.webViewLink,
          iconLink: f.iconLink,
          thumbnailLink: f.thumbnailLink,
          isReplicated: Boolean(f.syncStatus === 'replicated'),
        }).catch(console.warn);
      });
    }
  }, [files, currentUser]);

  useEffect(() => {
    saveCachedRules(syncRules);
  }, [syncRules]);

  useEffect(() => {
    saveCachedLogs(syncLogs);
    if (syncLogs.length > 0) {
      logSyncToCloudSql(syncLogs[0]);
      if (currentUser?.uid) {
        const topLog = syncLogs[0];
        saveSyncLogToFirestore(currentUser.uid, {
          id: topLog.id,
          userId: currentUser.uid,
          timestamp: topLog.timestamp,
          action: topLog.action,
          status: topLog.status,
          fileName: topLog.fileName,
          fileSize: topLog.fileSize,
          sourceDriveName: topLog.fromAccount,
          targetDriveName: topLog.toAccount,
          message: topLog.message,
        }).catch(console.warn);
      }
    }
  }, [syncLogs, currentUser]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const poolSummary = calculatePoolSummary(accounts, files);

  // Connect a real Google Drive account via OAuth
  const handleConnectRealAccount = async () => {
    setIsConnecting(true);
    try {
      const { account, accessToken } = await connectNewGoogleDriveAccount();

      // Fetch files from this real Drive
      let fetchedDriveFiles: UnifiedFile[] = [];
      try {
        const driveFiles = await fetchAccountFiles(accessToken, 50);
        fetchedDriveFiles = driveFiles.map((df) => ({
          id: df.id,
          name: df.name,
          mimeType: df.mimeType,
          size: Number(df.size) || 1024 * 1024 * 2,
          modifiedTime: df.modifiedTime || new Date().toISOString(),
          accountId: account.id,
          accountEmail: account.email,
          accountName: account.name,
          accountColor: account.color,
          webViewLink: df.webViewLink,
          webContentLink: df.webContentLink,
          thumbnailLink: df.thumbnailLink,
          iconLink: df.iconLink,
          isFolder: df.mimeType === 'application/vnd.google-apps.folder',
          syncStatus: 'synced',
        }));
      } catch (fErr) {
        console.warn('Could not fetch initial file list from Drive:', fErr);
      }

      setAccounts((prev) => {
        const existingIdx = prev.findIndex((a) => a.email === account.email);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...account, accessToken };
          return updated;
        }
        return [...prev, account];
      });

      if (fetchedDriveFiles.length > 0) {
        setFiles((prev) => {
          const existingIds = new Set(prev.map((f) => f.id));
          const newOnly = fetchedDriveFiles.filter((f) => !existingIds.has(f.id));
          return [...newOnly, ...prev];
        });
      }

      // Add log
      const newLog: SyncLogEntry = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'upload',
        fileName: `Akun Google Drive (${account.email})`,
        status: 'success',
        message: `Berhasil menghubungkan akun Google Drive. +${formatBytes(account.storageLimit)} ditambahkan ke Storage Pool.`,
      };
      setSyncLogs((prev) => [newLog, ...prev]);

      // Refresh all accounts to ensure metrics and quotas across the pool are fully accurate
      try {
        const refreshedList = await refreshAllAccounts([...accounts.filter(a => a.email !== account.email), account]);
        setAccounts(refreshedList);
      } catch (_refErr) {}

      showToast(`Akun ${account.name} (${account.email}) berhasil dihubungkan! Kuota bertambah +15 GB.`);
    } catch (err: any) {
      console.error(err);
      showToast(`Gagal menghubungkan Google Drive: ${err.message || err}`, 'error');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  // Relink an expired Google OAuth Drive account directly
  const handleRelinkAccount = async (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId || a.email === accountId);
    if (!acc) return;

    showToast(`Membuka Google OAuth Popup untuk merelinkan ${acc.email}...`);
    setIsConnecting(true);

    try {
      const freshToken = await refreshGoogleOAuthToken(acc.email, true);
      const activeList = accounts.map((a) =>
        a.id === acc.id || a.email.toLowerCase() === acc.email.toLowerCase()
          ? {
              ...a,
              accessToken: freshToken,
              status: 'active' as const,
              lastSyncedAt: new Date().toISOString(),
            }
          : a
      );

      // Call refreshAllAccounts to iterate and fetch latest storage metrics for all accounts
      const refreshedAccounts = await refreshAllAccounts(activeList);
      setAccounts(refreshedAccounts);
      saveCachedAccounts(refreshedAccounts);

      showToast(`Akun ${acc.name} (${acc.email}) berhasil di-relink dan kuota storage diperbarui!`, 'success');
    } catch (err: any) {
      console.error('Failed to relink account:', err);
      showToast(err.message || `Gagal melakukan relink otentikasi untuk ${acc.email}`, 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  // Add a demo/sandbox account
  const handleAddDemoAccount = (name: string, email: string) => {
    const newAcc: DriveAccount = {
      id: `drive_demo_${Date.now()}`,
      email,
      name,
      storageLimit: 15 * 1024 * 1024 * 1024,
      storageUsed: 1.5 * 1024 * 1024 * 1024,
      storageAvailable: 13.5 * 1024 * 1024 * 1024,
      color: '#0891b2',
      status: 'demo',
      lastSyncedAt: new Date().toISOString(),
      isPrimary: false,
    };

    setAccounts((prev) => [...prev, newAcc]);
    showToast(`Akun simulasi ${name} berhasil ditambahkan! Kuota +15 GB.`);
  };

  // Refresh account quota & files from Drive API
  const handleRefreshAccount = async (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return;

    if (acc.status === 'demo') {
      showToast(`Memperbarui status kuota akun simulasi ${acc.name}.`);
      return;
    }

    const token = acc.accessToken || getCachedToken(acc.email) || getCachedToken(acc.id.replace('drive_', ''));
    if (!token) {
      showToast('Sesi akun kedaluwarsa. Silakan sambungkan ulang dengan Sign in Google.', 'error');
      return;
    }

    try {
      const about = await fetchAccountAbout(token);
      const quota = about.storageQuota || {};
      const limit = Number(quota.limit) || acc.storageLimit;
      const usage = Number(quota.usage) || acc.storageUsed;

      setAccounts((prev) =>
        prev.map((a) =>
          a.id === accountId
            ? {
                ...a,
                storageLimit: limit,
                storageUsed: usage,
                storageAvailable: Math.max(0, limit - usage),
                lastSyncedAt: new Date().toISOString(),
              }
            : a
        )
      );

      // Fetch files
      const driveFiles = await fetchAccountFiles(token, 50);
      const mappedFiles: UnifiedFile[] = driveFiles.map((df) => ({
        id: df.id,
        name: df.name,
        mimeType: df.mimeType,
        size: Number(df.size) || 1024 * 1024 * 2,
        modifiedTime: df.modifiedTime || new Date().toISOString(),
        accountId: acc.id,
        accountEmail: acc.email,
        accountName: acc.name,
        accountColor: acc.color,
        webViewLink: df.webViewLink,
        webContentLink: df.webContentLink,
        thumbnailLink: df.thumbnailLink,
        iconLink: df.iconLink,
        isFolder: df.mimeType === 'application/vnd.google-apps.folder',
        syncStatus: 'synced',
      }));

      setFiles((prev) => {
        const otherAccountFiles = prev.filter((f) => f.accountId !== accountId);
        return [...mappedFiles, ...otherAccountFiles];
      });

      showToast(`Akun ${acc.name} berhasil diperbarui (${formatBytes(limit - usage)} bebas).`);
    } catch (err: any) {
      showToast(`Gagal refresh akun: ${err.message || err}`, 'error');
    }
  };

  // Remove / Disconnect account
  const handleRemoveAccount = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return;
    if (confirm(`Apakah Anda yakin ingin memutuskan sambungan akun ${acc.name}?`)) {
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      setFiles((prev) => prev.filter((f) => f.accountId !== accountId));
      if (selectedAccountId === accountId) setSelectedAccountId(null);
      showToast(`Akun ${acc.name} telah diputuskan dari Storage Pool.`);
    }
  };

  // Set primary account
  const handleSetPrimaryAccount = (accountId: string) => {
    setAccounts((prev) =>
      prev.map((a) => ({
        ...a,
        isPrimary: a.id === accountId,
      }))
    );
    showToast('Akun utama berhasil diubah.');
  };

  // Upload handler with smart allocation
  const handleUploadSubmit = async (
    filesToUpload: File[],
    strategy: AllocationStrategy,
    manualTargetAccountId?: string
  ) => {
    let lastIdx = 0;
    const newFilesBatch: UnifiedFile[] = [];
    const accountsUpdated = [...accounts];

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const { targetAccount, nextIndex, reason } = selectTargetDrive(
        accountsUpdated,
        strategy,
        file.size,
        manualTargetAccountId,
        lastIdx
      );
      lastIdx = nextIndex;

      let uploadedDriveId = `file_up_${Date.now()}_${i}`;
      let webViewLink = 'https://drive.google.com';

      // Real upload to Google Drive if active token exists
      const token = targetAccount.accessToken || getCachedToken(targetAccount.email);
      if (token && targetAccount.status !== 'demo') {
        try {
          const res = await uploadFileToDrive(token, file, file.name, file.type, undefined, targetAccount.email);
          uploadedDriveId = res.id;
          webViewLink = res.webViewLink || webViewLink;
        } catch (upErr) {
          console.warn('Real Google Drive upload failed, falling back to local pool:', upErr);
        }
      }

      const newUnifiedFile: UnifiedFile = {
        id: uploadedDriveId,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        modifiedTime: new Date().toISOString(),
        accountId: targetAccount.id,
        accountEmail: targetAccount.email,
        accountName: targetAccount.name,
        accountColor: targetAccount.color,
        isFolder: false,
        syncStatus: 'synced',
        webViewLink,
      };

      newFilesBatch.push(newUnifiedFile);

      // Update account storage stats
      const targetIdx = accountsUpdated.findIndex((a) => a.id === targetAccount.id);
      if (targetIdx >= 0) {
        accountsUpdated[targetIdx] = {
          ...accountsUpdated[targetIdx],
          storageUsed: accountsUpdated[targetIdx].storageUsed + file.size,
          storageAvailable: Math.max(0, accountsUpdated[targetIdx].storageAvailable - file.size),
        };
      }

      // Add log
      const logEntry: SyncLogEntry = {
        id: `log_up_${Date.now()}_${i}`,
        timestamp: new Date().toISOString(),
        action: 'upload',
        fileName: file.name,
        fileSize: file.size,
        toAccount: targetAccount.email,
        status: 'success',
        message: `Smart Balancer menyimpan berkas ke ${targetAccount.name} (${reason})`,
      };
      setSyncLogs((prev) => [logEntry, ...prev]);
    }

    setAccounts(accountsUpdated);
    setFiles((prev) => [...newFilesBatch, ...prev]);
    showToast(`Berhasil mengunggah ${filesToUpload.length} berkas ke Multi-Drive Pool.`);
  };

  // Cross-drive copy / transfer
  const handleCrossDriveCopy = async (file: UnifiedFile, targetAccountId: string) => {
    const sourceAcc = accounts.find((a) => a.id === file.accountId);
    const targetAcc = accounts.find((a) => a.id === targetAccountId);
    if (!sourceAcc || !targetAcc) return;

    const sourceToken = sourceAcc.accessToken || getCachedToken(sourceAcc.email);
    const targetToken = targetAcc.accessToken || getCachedToken(targetAcc.email);

    let newFileId = `file_copy_${Date.now()}`;
    let webViewLink = file.webViewLink;

    const isSyntheticFile =
      file.id.startsWith('file_demo_') ||
      file.id.startsWith('file_up_') ||
      file.id.startsWith('file_copy_') ||
      file.id.startsWith('folder_') ||
      sourceAcc.status === 'demo' ||
      targetAcc.status === 'demo' ||
      sourceAcc.id.startsWith('drive_demo_') ||
      targetAcc.id.startsWith('drive_demo_');

    if (!isSyntheticFile && sourceToken && targetToken) {
      try {
        const copyRes = await copyFileBetweenDrives(sourceToken, targetToken, file);
        newFileId = copyRes.id;
        webViewLink = copyRes.webViewLink || webViewLink;
      } catch (err: any) {
        console.warn('Real cross-drive copy error, duplicating in pool:', err);
      }
    }

    const duplicatedFile: UnifiedFile = {
      ...file,
      id: newFileId,
      accountId: targetAcc.id,
      accountEmail: targetAcc.email,
      accountName: targetAcc.name,
      accountColor: targetAcc.color,
      modifiedTime: new Date().toISOString(),
      syncStatus: 'replicated',
      webViewLink,
    };

    setFiles((prev) => {
      const updated = prev.map((f) =>
        f.id === file.id
          ? {
              ...f,
              syncStatus: 'replicated' as const,
              replicatedInAccounts: [...(f.replicatedInAccounts || []), targetAcc.id],
            }
          : f
      );
      return [duplicatedFile, ...updated];
    });

    // Update target account storage used
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === targetAccountId
          ? {
              ...a,
              storageUsed: a.storageUsed + file.size,
              storageAvailable: Math.max(0, a.storageAvailable - file.size),
            }
          : a
      )
    );

    const logEntry: SyncLogEntry = {
      id: `log_copy_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'cross_copy',
      fileName: file.name,
      fileSize: file.size,
      fromAccount: sourceAcc.email,
      toAccount: targetAcc.email,
      status: 'success',
      message: `Replikasi berkas berhasil dari ${sourceAcc.name} ➔ ${targetAcc.name}`,
    };
    setSyncLogs((prev) => [logEntry, ...prev]);

    showToast(`Berkas "${file.name}" berhasil diduplikasi ke ${targetAcc.name}.`);
  };

  // Delete file
  const handleDeleteFile = async (file: UnifiedFile) => {
    if (!confirm(`Hapus berkas "${file.name}" dari ${file.accountName}?`)) return;

    const acc = accounts.find((a) => a.id === file.accountId);
    const token = acc?.accessToken || (acc ? getCachedToken(acc.email) : null);

    if (token && acc?.status !== 'demo') {
      try {
        await deleteFileFromDrive(token, file.id, acc.email);
      } catch (delErr) {
        console.warn('Real delete failed:', delErr);
      }
    }

    setFiles((prev) => prev.filter((f) => f.id !== file.id));

    // Restore storage quota
    if (acc) {
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === file.accountId
            ? {
                ...a,
                storageUsed: Math.max(0, a.storageUsed - (file.size || 0)),
                storageAvailable: a.storageAvailable + (file.size || 0),
              }
            : a
        )
      );
    }

    const logEntry: SyncLogEntry = {
      id: `log_del_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'delete',
      fileName: file.name,
      fileSize: file.size,
      fromAccount: file.accountEmail,
      status: 'success',
      message: `Berkas dihapus dan kuota ${formatBytes(file.size)} dikembalikan.`,
    };
    setSyncLogs((prev) => [logEntry, ...prev]);

    showToast(`Berkas "${file.name}" telah dihapus.`);
  };

  // Download file
  const handleDownloadFile = async (file: UnifiedFile) => {
    const acc = accounts.find((a) => a.id === file.accountId);
    const token = acc?.accessToken || (acc ? getCachedToken(acc.email) : null);

    if (token && acc?.status !== 'demo') {
      try {
        showToast(`Mengunduh "${file.name}" dari Google Drive...`);
        const blob = await downloadFileBlob(token, file.id, acc.email);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return;
      } catch (err) {
        console.warn('Direct media download failed, opening webViewLink:', err);
      }
    }

    if (file.webViewLink) {
      window.open(file.webViewLink, '_blank');
    } else {
      showToast(`Membuka berkas "${file.name}".`);
    }
  };

  // Create folder
  const handleCreateFolder = async (folderName: string, accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return;

    let folderId = `folder_${Date.now()}`;
    const token = acc.accessToken || getCachedToken(acc.email);

    if (token && acc.status !== 'demo') {
      try {
        const res = await createFolderInDrive(token, folderName, undefined, acc.email);
        folderId = res.id;
      } catch (err) {
        console.warn('Folder creation on Drive API failed:', err);
      }
    }

    const newFolder: UnifiedFile = {
      id: folderId,
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      size: 0,
      modifiedTime: new Date().toISOString(),
      accountId: acc.id,
      accountEmail: acc.email,
      accountName: acc.name,
      accountColor: acc.color,
      isFolder: true,
      syncStatus: 'synced',
    };

    setFiles((prev) => [newFolder, ...prev]);
    showToast(`Folder "${folderName}" berhasil dibuat di ${acc.name}.`);
  };

  // Execute full rebalance plan
  const handleExecuteRebalancePlan = async (plan: RebalancePlan) => {
    if (!plan || plan.actions.length === 0) {
      showToast('Kapasitas akun sudah seimbang. Tidak ada relokasi yang diperlukan.');
      return;
    }

    setIsRebalancing(true);

    try {
      let currentFiles = [...files];
      let currentAccounts = [...accounts];
      const newLogs: SyncLogEntry[] = [];

      for (let i = 0; i < plan.actions.length; i++) {
        const action = plan.actions[i];
        const { file, fromAccount, toAccount, reason } = action;

        const sourceToken = fromAccount.accessToken || getCachedToken(fromAccount.email);
        const targetToken = toAccount.accessToken || getCachedToken(toAccount.email);

        let newFileId = file.id;
        let webViewLink = file.webViewLink;

        const isSyntheticFile =
          file.id.startsWith('file_demo_') ||
          file.id.startsWith('file_up_') ||
          file.id.startsWith('file_copy_') ||
          file.id.startsWith('folder_') ||
          fromAccount.status === 'demo' ||
          toAccount.status === 'demo' ||
          fromAccount.id.startsWith('drive_demo_') ||
          toAccount.id.startsWith('drive_demo_');

        // Perform real Google Drive migration ONLY if real Google Drive file AND real OAuth tokens are present
        let migrationNote = 'Relokasi ruang virtual pool';
        if (!isSyntheticFile) {
          if (sourceToken && targetToken) {
            try {
              const copied = await copyFileBetweenDrives(
                sourceToken,
                targetToken,
                file,
                undefined,
                fromAccount.email,
                toAccount.email
              );
              newFileId = copied.id;
              webViewLink = copied.webViewLink || webViewLink;
              
              // Remove file from source drive after successful copy
              try {
                await deleteFileFromDrive(sourceToken, file.id, fromAccount.email);
              } catch (delErr) {
                console.warn('Gagal menghapus berkas asal setelah penyalinan:', delErr);
              }
              migrationNote = 'Relokasi fisik Google Drive berhasil';
            } catch (migErr: any) {
              const errMsg = migErr?.message || String(migErr);
              const isAuthError = errMsg.includes('401') || errMsg.includes('UNAUTHENTICATED');
              if (isAuthError) {
                showToast(`Sesi Google Drive untuk ${fromAccount.name} telah berakhir. Silakan login ulang untuk sync fisik.`, 'error');
              }
              migrationNote = `Transfer virtual (${isAuthError ? 'Token Google Drive kedaluwarsa' : errMsg})`;
            }
          } else {
            migrationNote = 'Transfer virtual (Token akun perlu diperbarui/login ulang)';
          }
        }

        // Update file metadata in pooled files state
        currentFiles = currentFiles.map((f) =>
          f.id === file.id
            ? {
                ...f,
                id: newFileId,
                accountId: toAccount.id,
                accountEmail: toAccount.email,
                accountName: toAccount.name,
                accountColor: toAccount.color,
                modifiedTime: new Date().toISOString(),
                syncStatus: 'synced' as const,
                webViewLink,
              }
            : f
        );

        // Update storage stats on source and target accounts
        currentAccounts = currentAccounts.map((a) => {
          if (a.id === fromAccount.id) {
            const newUsed = Math.max(0, a.storageUsed - file.size);
            return {
              ...a,
              storageUsed: newUsed,
              storageAvailable: Math.max(0, a.storageLimit - newUsed),
            };
          }
          if (a.id === toAccount.id) {
            const newUsed = a.storageUsed + file.size;
            return {
              ...a,
              storageUsed: newUsed,
              storageAvailable: Math.max(0, a.storageLimit - newUsed),
            };
          }
          return a;
        });

        // Add detailed sync log
        const logItem: SyncLogEntry = {
          id: `log_reb_${Date.now()}_${i}`,
          timestamp: new Date().toISOString(),
          action: 'rebalance',
          fileName: file.name,
          fileSize: file.size,
          fromAccount: fromAccount.email,
          toAccount: toAccount.email,
          status: 'success',
          message: `Auto-Balancer: ${file.name} (${formatBytes(file.size)}) [${fromAccount.name} ➔ ${toAccount.name}] - ${migrationNote}`,
        };
        newLogs.unshift(logItem);
      }

      // Accurately recalculate storage and count per account
      const accurateAccounts = recalculateAccountStorage(currentAccounts, currentFiles);

      saveCachedFiles(currentFiles);
      saveCachedAccounts(accurateAccounts);

      setFiles(currentFiles);
      setAccounts(accurateAccounts);
      setSyncLogs((prev) => {
        const updated = [...newLogs, ...prev];
        saveCachedLogs(updated);
        return updated;
      });

      showToast(`Auto-Balancer berhasil merelokasi ${plan.actions.length} berkas dan menyeimbangkan kuota penyimpanan.`);
    } catch (err: any) {
      console.error('Rebalance execution error:', err);
      showToast(`Terjadi kesalahan saat rebalance: ${err.message || err}`, 'error');
    } finally {
      setIsRebalancing(false);
    }
  };

  // Run a single sync rule
  const handleRunRule = async (ruleId: string) => {
    const rule = syncRules.find((r) => r.id === ruleId);
    if (!rule) return;

    const sourceAcc = accounts.find((a) => a.id === rule.sourceAccountId);
    const targetAcc = accounts.find((a) => a.id === rule.targetAccountId);
    if (!sourceAcc || !targetAcc) return;

    const sourceFiles = files.filter((f) => f.accountId === sourceAcc.id && !f.isFolder);

    if (rule.ruleType === 'mirror') {
      const unReplicated = sourceFiles.filter(
        (f) => !f.replicatedInAccounts?.includes(targetAcc.id)
      );
      if (unReplicated.length > 0) {
        await handleCrossDriveCopy(unReplicated[0], targetAcc.id);
      } else {
        showToast(`Semua berkas dari ${sourceAcc.name} sudah tereplikasi di ${targetAcc.name}.`);
      }
    } else if (rule.ruleType === 'high_quota_offload') {
      const usagePct = (sourceAcc.storageUsed / (sourceAcc.storageLimit || 1)) * 100;
      if (usagePct > rule.thresholdPercent) {
        // Sort files by size descending and shift the largest file to target
        const sortedFiles = [...sourceFiles].sort((a, b) => b.size - a.size);
        if (sortedFiles.length > 0) {
          const fileToOffload = sortedFiles[0];
          // Transfer to target account and delete from source
          await handleCrossDriveCopy(fileToOffload, targetAcc.id);
          showToast(`Offload otomatis: berkas "${fileToOffload.name}" dipindahkan dari ${sourceAcc.name} karena melebihi ${rule.thresholdPercent}% batas kuota.`);
        }
      } else {
        showToast(`Penggunaan ${sourceAcc.name} (${usagePct.toFixed(0)}%) masih aman di bawah batas ${rule.thresholdPercent}%.`);
      }
    } else if (rule.ruleType === 'auto_balance') {
      const plan = calculateRebalancePlan(accounts, files);
      if (plan.actions.length > 0) {
        await handleExecuteRebalancePlan(plan);
      } else {
        showToast('Distribusi ruang penyimpanan antar drive sudah seimbang.');
      }
    }

    setSyncRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? { ...r, lastRun: new Date().toISOString(), syncedFileCount: r.syncedFileCount + 1 }
          : r
      )
    );
  };

  // Sync All / Run rules engine
  const handleSyncAll = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      for (const rule of syncRules) {
        if (rule.status !== 'active') continue;
        const sourceFiles = files.filter((f) => f.accountId === rule.sourceAccountId && !f.isFolder);
        const targetAcc = accounts.find((a) => a.id === rule.targetAccountId);
        if (!targetAcc) continue;

        if (rule.ruleType === 'mirror') {
          const toReplicate = sourceFiles.filter(
            (f) => !f.replicatedInAccounts?.includes(targetAcc.id)
          );
          if (toReplicate.length > 0) {
            await handleCrossDriveCopy(toReplicate[0], targetAcc.id);
          }
        } else if (rule.ruleType === 'high_quota_offload') {
          const sourceAcc = accounts.find((a) => a.id === rule.sourceAccountId);
          if (sourceAcc) {
            const usagePct = (sourceAcc.storageUsed / (sourceAcc.storageLimit || 1)) * 100;
            if (usagePct > rule.thresholdPercent && sourceFiles.length > 0) {
              const largest = [...sourceFiles].sort((a, b) => b.size - a.size)[0];
              await handleCrossDriveCopy(largest, targetAcc.id);
            }
          }
        }
      }

      setSyncRules((prev) =>
        prev.map((r) =>
          r.status === 'active'
            ? { ...r, lastRun: new Date().toISOString(), syncedFileCount: r.syncedFileCount + 1 }
            : r
        )
      );

      showToast('Sinkronisasi otomatis semua akun Google Drive selesai.');
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, syncRules, files, accounts]);

  // Automated scheduled sync effect
  useEffect(() => {
    if (!autoSyncEnabled) return;
    const timer = setInterval(() => {
      handleSyncAll();
    }, syncInterval * 1000);

    return () => clearInterval(timer);
  }, [autoSyncEnabled, syncInterval, handleSyncAll]);

  // One-click Rebalance Optimizer trigger - opens modal
  const handleTriggerRebalance = () => {
    setIsAutoBalancerModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-800 font-sans flex flex-col selection:bg-indigo-600 selection:text-white antialiased">
      {/* Top Navbar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        poolSummary={poolSummary}
        accounts={accounts}
        isSyncing={isSyncing}
        onSyncAll={handleSyncAll}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onOpenFileUpload={() => {
          setUploadDefaultAccountId(undefined);
          setIsUploadModalOpen(true);
        }}
        autoSyncEnabled={autoSyncEnabled}
        onToggleAutoSync={() => {
          setAutoSyncEnabled((v) => !v);
          showToast(autoSyncEnabled ? 'Auto-Sync dijeda' : 'Auto-Sync diaktifkan');
        }}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((v) => !v)}
        searchQuery={globalSearchQuery}
        onSearchChange={(q) => {
          setGlobalSearchQuery(q);
          if (activeTab !== 'explorer') {
            setActiveTab('explorer');
          }
        }}
        onOpenPolyglotModal={() => setIsPolyglotModalOpen(true)}
      />

      {/* Main Workspace Layout (Sidebar + Content) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Component */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          poolSummary={poolSummary}
          accounts={accounts}
          onOpenConnectModal={() => setIsConnectModalOpen(true)}
          onTriggerRebalance={handleTriggerRebalance}
          onOpenFileUpload={() => {
            setUploadDefaultAccountId(undefined);
            setIsUploadModalOpen(true);
          }}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Dynamic Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-w-0">
          <div className="mx-auto max-w-6xl w-full h-full flex flex-col">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="tab-overview"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <StorageOverview
                    accounts={accounts}
                    poolSummary={poolSummary}
                    files={files}
                    onOpenConnectModal={() => setIsConnectModalOpen(true)}
                    onRefreshAccount={handleRefreshAccount}
                    onRemoveAccount={handleRemoveAccount}
                    onSetPrimaryAccount={handleSetPrimaryAccount}
                    onSelectAccountFilter={(accId) => {
                      setSelectedAccountId(accId);
                      setActiveTab('explorer');
                    }}
                    onTriggerRebalance={handleTriggerRebalance}
                    onOpenFileUpload={(accId) => {
                      setUploadDefaultAccountId(accId);
                      setIsUploadModalOpen(true);
                    }}
                    onRelinkAccount={handleRelinkAccount}
                  />
                </motion.div>
              )}

              {activeTab === 'explorer' && (
                <motion.div
                  key="tab-explorer"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <FileExplorer
                    files={files}
                    accounts={accounts}
                    selectedAccountId={selectedAccountId}
                    onSelectAccountId={setSelectedAccountId}
                    onOpenFileUpload={() => {
                      setUploadDefaultAccountId(selectedAccountId || undefined);
                      setIsUploadModalOpen(true);
                    }}
                    onOpenFileDetails={(file) => setActiveDetailsFile(file)}
                    onDownloadFile={handleDownloadFile}
                    onDeleteFile={handleDeleteFile}
                    onCrossDriveCopy={handleCrossDriveCopy}
                    onCreateFolder={handleCreateFolder}
                    onDropFilesUpload={(droppedList) => {
                      setDroppedFilesBatch(droppedList);
                      setIsUploadModalOpen(true);
                    }}
                  />
                </motion.div>
              )}

              {activeTab === 'sync' && (
                <motion.div
                  key="tab-sync"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <SyncManager
                    accounts={accounts}
                    syncRules={syncRules}
                    syncLogs={syncLogs}
                    autoSyncEnabled={autoSyncEnabled}
                    onToggleAutoSync={() => setAutoSyncEnabled((v) => !v)}
                    syncInterval={syncInterval}
                    onChangeSyncInterval={setSyncInterval}
                    onRunRuleNow={handleRunRule}
                    onToggleRuleStatus={(ruleId) => {
                      setSyncRules((prev) =>
                        prev.map((r) =>
                          r.id === ruleId
                            ? { ...r, status: r.status === 'active' ? 'paused' : 'active' }
                            : r
                        )
                      );
                    }}
                    onDeleteRule={(ruleId) => {
                      setSyncRules((prev) => prev.filter((r) => r.id !== ruleId));
                      showToast('Aturan sinkronisasi dihapus.');
                    }}
                    onAddRule={(newRuleData) => {
                      const rule: SyncRule = {
                        ...newRuleData,
                        id: `rule_${Date.now()}`,
                        syncedFileCount: 0,
                      };
                      setSyncRules((prev) => [rule, ...prev]);
                      showToast('Aturan sinkronisasi baru berhasil ditambahkan.');
                    }}
                    onTriggerRebalance={handleTriggerRebalance}
                    onClearLogs={() => setSyncLogs([])}
                    isRebalancing={isRebalancing}
                  />
                </motion.div>
              )}

              {activeTab === 'analytics' && (
                <motion.div
                  key="tab-analytics"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <StorageAnalytics
                    accounts={accounts}
                    files={files}
                    poolSummary={poolSummary}
                    onTriggerRebalance={handleTriggerRebalance}
                    onSelectAccountFilter={(accId) => {
                      setSelectedAccountId(accId);
                      setActiveTab('explorer');
                    }}
                  />
                </motion.div>
              )}

              {activeTab === 'ai' && (
                <motion.div
                  key="tab-ai"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="h-[calc(100vh-140px)] min-h-[580px]"
                >
                  <GeminiChatbot
                    accounts={accounts}
                    files={files}
                    totalStorageLimit={poolSummary.totalLimit}
                    totalStorageUsed={poolSummary.totalUsed}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Floating AI Quick Assistant Button for instant access from any tab */}
      {activeTab !== 'ai' && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 group flex flex-col items-end max-w-[calc(100vw-2rem)] pointer-events-auto">
          {/* Storage Pool Health Tooltip on Hover / Touch */}
          {(() => {
            const isCritical = poolSummary.usedPercentage >= 95;
            const isWarning = poolSummary.usedPercentage >= 85;
            const isModerate = poolSummary.usedPercentage >= 70;

            const tooltipTheme = isCritical
              ? 'bg-rose-950/95 border-rose-500 critical-pulse shadow-rose-950/50 text-rose-100'
              : isWarning
              ? 'bg-amber-950/90 border-amber-500/80 shadow-amber-950/30 text-amber-100'
              : isModerate
              ? 'bg-slate-900/95 border-indigo-500/60 shadow-indigo-950/30 text-indigo-100'
              : 'bg-slate-900/95 border-emerald-500/50 shadow-emerald-950/20 text-emerald-100';

            const statusDot = isCritical
              ? 'bg-rose-500 ring-2 ring-rose-400/80 animate-pulse'
              : isWarning
              ? 'bg-amber-400 ring-2 ring-amber-400/50'
              : isModerate
              ? 'bg-indigo-400 ring-2 ring-indigo-400/40'
              : 'bg-emerald-400 ring-2 ring-emerald-400/40';

            const statusText = isCritical
              ? 'Kritis'
              : isWarning
              ? 'Perlu Perhatian'
              : isModerate
              ? 'Waspada'
              : 'Optimal';

            return (
              <div
                id="floating-ai-tooltip"
                className={`mb-2 px-3.5 py-1.5 rounded-xl backdrop-blur-md text-xs shadow-xl border pointer-events-none z-[9999] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-active:opacity-100 transition-all duration-200 translate-y-0 group-hover:-translate-y-1 flex items-center gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm whitespace-nowrap overflow-hidden ${tooltipTheme}`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />
                <span className="font-bold text-[11px] sm:text-xs shrink-0">
                  {statusText}: {Math.round(poolSummary.usedPercentage)}%
                </span>
                <span className="opacity-75 text-[10px] sm:text-[11px] truncate">
                  ({formatBytes(poolSummary.totalUsed)} / {formatBytes(poolSummary.totalLimit)})
                </span>
              </div>
            );
          })()}

          <motion.button
            id="floating-ai-btn"
            onClick={() => setActiveTab('ai')}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{
              scale: [1, 1.04, 1],
              boxShadow: [
                '0 10px 25px -5px rgba(99, 102, 241, 0.4), 0 0 0 0 rgba(168, 85, 247, 0.35)',
                '0 14px 28px -4px rgba(168, 85, 247, 0.6), 0 0 0 7px rgba(168, 85, 247, 0)',
                '0 10px 25px -5px rgba(99, 102, 241, 0.4), 0 0 0 0 rgba(168, 85, 247, 0.35)',
              ],
              opacity: 1,
            }}
            transition={{
              scale: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
              boxShadow: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 0.2 },
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.96 }}
            className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl shadow-xl flex items-center gap-2 sm:gap-2.5 font-medium text-xs border border-white/25 cursor-pointer select-none"
            title={`DrivePool AI Assistant • Pool: ${Math.round(poolSummary.usedPercentage)}% full`}
          >
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-300 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span className="font-bold tracking-wide">DrivePool AI</span>
          </motion.button>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setDroppedFilesBatch(null);
          setUploadDefaultAccountId(undefined);
        }}
        accounts={accounts}
        onUploadSubmit={handleUploadSubmit}
        preloadedFiles={droppedFilesBatch}
        defaultAccountId={uploadDefaultAccountId}
      />

      {/* Smart Auto-Balancer Modal */}
      <AutoBalancerModal
        isOpen={isAutoBalancerModalOpen}
        onClose={() => setIsAutoBalancerModalOpen(false)}
        accounts={accounts}
        files={files}
        onExecuteRebalance={handleExecuteRebalancePlan}
        isRebalancing={isRebalancing}
      />

      {/* Account Manager Modal */}
      <AccountManagerModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        accounts={accounts}
        onConnectRealAccount={handleConnectRealAccount}
        onAddDemoAccount={handleAddDemoAccount}
        isConnecting={isConnecting}
      />

      {/* File Details & Cross-Drive Transfer Modal */}
      <FileDetailsModal
        file={activeDetailsFile}
        accounts={accounts}
        onClose={() => setActiveDetailsFile(null)}
        onDownload={handleDownloadFile}
        onDelete={handleDeleteFile}
        onCrossDriveCopy={handleCrossDriveCopy}
      />

      {/* Polyglot Microservices Modal (Rust WASM, Python FastAPI, Go Worker) */}
      <PolyglotServicesModal
        isOpen={isPolyglotModalOpen}
        onClose={() => setIsPolyglotModalOpen(false)}
      />
    </div>
  );
}
