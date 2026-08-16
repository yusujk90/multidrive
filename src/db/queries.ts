import { db } from './index.ts';
import { users, driveAccounts, pooledFiles, syncRules, syncLogs } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

// Helper to safely parse dates into Date instances for Drizzle PostgreSQL timestamp columns
function safeDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  if (typeof val === 'string' || typeof val === 'number') {
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return new Date();
}

// Helper to safely parse integers for PostgreSQL bigint columns (which reject decimal points like 123.4)
function safeBigInt(val: unknown, fallback: number = 0): number {
  if (val === null || val === undefined) return fallback;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return fallback;
  return Math.round(num);
}

// Ensure user exists in Cloud SQL
export async function getOrCreateUser(uid: string, email: string, displayName?: string, photoUrl?: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || null,
        photoUrl: photoUrl || null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || null,
          photoUrl: photoUrl || null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Failed to get or create user in Cloud SQL:', error);
    throw new Error('Database operation failed', { cause: error });
  }
}

// Save or sync drive accounts
export async function upsertDriveAccount(accountData: {
  id: string;
  userId: string;
  email: string;
  name: string;
  photoUrl?: string;
  storageLimit: number;
  storageUsed: number;
  storageAvailable: number;
  color?: string;
  status?: string;
  isPrimary?: boolean;
  lastSyncedAt?: any;
}) {
  try {
    const lastSynced = safeDate(accountData.lastSyncedAt);
    const storageLimit = safeBigInt(accountData.storageLimit, 16106127360);
    const storageUsed = safeBigInt(accountData.storageUsed, 0);
    const storageAvailable = safeBigInt(accountData.storageAvailable, 16106127360);

    const result = await db
      .insert(driveAccounts)
      .values({
        id: accountData.id,
        userId: accountData.userId,
        email: accountData.email,
        name: accountData.name,
        photoUrl: accountData.photoUrl || null,
        storageLimit,
        storageUsed,
        storageAvailable,
        color: accountData.color || '#4f46e5',
        status: accountData.status || 'active',
        isPrimary: accountData.isPrimary || false,
        lastSyncedAt: lastSynced,
      })
      .onConflictDoUpdate({
        target: driveAccounts.id,
        set: {
          email: accountData.email,
          name: accountData.name,
          photoUrl: accountData.photoUrl || null,
          storageLimit,
          storageUsed,
          storageAvailable,
          color: accountData.color || '#4f46e5',
          status: accountData.status || 'active',
          isPrimary: accountData.isPrimary || false,
          lastSyncedAt: lastSynced,
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Failed to upsert drive account:', error);
    throw new Error('Database operation failed', { cause: error });
  }
}

// Helper to ensure a referenced drive account exists in the database
export async function ensureDriveAccountExists(accountId: string, userUid: string, userEmail = 'user@example.com') {
  if (!accountId) return;
  // Ensure the parent user exists first to satisfy foreign key constraint on users.uid
  await getOrCreateUser(userUid, userEmail);

  // Check if the drive account exists in drive_accounts table
  const existingAccounts = await db
    .select({ id: driveAccounts.id })
    .from(driveAccounts)
    .where(eq(driveAccounts.id, accountId))
    .limit(1);

  // If missing, insert the account record first before proceeding
  if (!existingAccounts || existingAccounts.length === 0) {
    await db
      .insert(driveAccounts)
      .values({
        id: accountId,
        userId: userUid,
        email: userEmail || 'connected-drive@google.com',
        name: 'Google Drive Account',
        storageLimit: 16106127360,
        storageUsed: 0,
        storageAvailable: 16106127360,
        color: '#4f46e5',
        status: 'active',
        isPrimary: false,
        lastSyncedAt: new Date(),
      })
      .onConflictDoNothing();
  }
}

// Get user drive accounts
export async function getUserDriveAccounts(userUid: string) {
  try {
    return await db.select().from(driveAccounts).where(eq(driveAccounts.userId, userUid));
  } catch (error) {
    console.error('Failed to get drive accounts:', error);
    throw new Error('Database operation failed', { cause: error });
  }
}

// Unified database transaction helper that handles the parent-child relationship
// between users, drive accounts, and pooled files atomically.
export async function syncPooledFilesTransaction(
  userUid: string,
  filesList: Array<{
    id: string;
    accountId: string;
    name: string;
    mimeType: string;
    size: number;
    modifiedTime?: any;
    webViewLink?: string;
    iconLink?: string;
    thumbnailLink?: string;
    category?: string;
    isReplicated?: boolean;
  }>,
  userEmail = 'user@example.com'
) {
  if (!filesList || filesList.length === 0) return [];

  return await db.transaction(async (tx) => {
    // 1. Ensure parent user exists in users table
    await tx
      .insert(users)
      .values({
        uid: userUid,
        email: userEmail,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: userEmail,
          updatedAt: new Date(),
        },
      });

    // 2. Validate existence of parent drive accounts in drive_accounts table
    const uniqueAccountIds = Array.from(
      new Set(filesList.map((f) => f.accountId).filter((id): id is string => Boolean(id)))
    );

    for (const accId of uniqueAccountIds) {
      const existing = await tx
        .select({ id: driveAccounts.id })
        .from(driveAccounts)
        .where(eq(driveAccounts.id, accId))
        .limit(1);

      if (!existing || existing.length === 0) {
        await tx
          .insert(driveAccounts)
          .values({
            id: accId,
            userId: userUid,
            email: userEmail || 'connected-drive@google.com',
            name: 'Google Drive Account',
            storageLimit: 16106127360,
            storageUsed: 0,
            storageAvailable: 16106127360,
            color: '#4f46e5',
            status: 'active',
            isPrimary: false,
            lastSyncedAt: new Date(),
          })
          .onConflictDoNothing();
      }
    }

    // 3. Atomically insert or update child pooled_files records
    const results = [];
    for (const f of filesList) {
      const modTime = safeDate(f.modifiedTime);
      const sizeVal = safeBigInt(f.size, 0);

      const res = await tx
        .insert(pooledFiles)
        .values({
          id: f.id,
          userId: userUid,
          accountId: f.accountId,
          name: f.name,
          mimeType: f.mimeType,
          size: sizeVal,
          modifiedTime: modTime,
          webViewLink: f.webViewLink || null,
          iconLink: f.iconLink || null,
          thumbnailLink: f.thumbnailLink || null,
          category: f.category || 'other',
          isReplicated: f.isReplicated || false,
        })
        .onConflictDoUpdate({
          target: pooledFiles.id,
          set: {
            name: f.name,
            mimeType: f.mimeType,
            size: sizeVal,
            modifiedTime: modTime,
            webViewLink: f.webViewLink || null,
            iconLink: f.iconLink || null,
            thumbnailLink: f.thumbnailLink || null,
            category: f.category || 'other',
            isReplicated: f.isReplicated || false,
          },
        })
        .returning();
      results.push(res[0]);
    }

    return results;
  });
}

// Save or sync files catalog with automatic parent-child validation via transaction
export async function syncPooledFiles(
  userUid: string,
  filesList: Array<{
    id: string;
    accountId: string;
    name: string;
    mimeType: string;
    size: number;
    modifiedTime?: any;
    webViewLink?: string;
    iconLink?: string;
    thumbnailLink?: string;
    category?: string;
    isReplicated?: boolean;
  }>,
  userEmail = 'user@example.com'
) {
  try {
    return await syncPooledFilesTransaction(userUid, filesList, userEmail);
  } catch (error) {
    console.error('Failed to sync pooled files:', error);
    throw new Error('Database operation failed', { cause: error });
  }
}

// Log a sync operation
export async function addSyncLog(log: {
  id: string;
  userId: string;
  action: string;
  status: string;
  message: string;
  fileName?: string;
  fileSize?: number;
  sourceDriveName?: string;
  targetDriveName?: string;
  timestamp?: any;
}) {
  try {
    const logTime = safeDate(log.timestamp);
    const fileSizeVal = log.fileSize !== undefined && log.fileSize !== null ? safeBigInt(log.fileSize) : null;

    const res = await db
      .insert(syncLogs)
      .values({
        id: log.id,
        userId: log.userId,
        timestamp: logTime,
        action: log.action,
        status: log.status,
        fileName: log.fileName || null,
        fileSize: fileSizeVal,
        sourceDriveName: log.sourceDriveName || null,
        targetDriveName: log.targetDriveName || null,
        message: log.message,
      })
      .onConflictDoUpdate({
        target: syncLogs.id,
        set: {
          action: log.action,
          status: log.status,
          message: log.message,
          fileName: log.fileName || null,
          fileSize: fileSizeVal,
          sourceDriveName: log.sourceDriveName || null,
          targetDriveName: log.targetDriveName || null,
          timestamp: logTime,
        },
      })
      .returning();
    return res[0];
  } catch (error) {
    console.error('Failed to insert sync log:', error);
    throw new Error('Database operation failed', { cause: error });
  }
}

// Get recent sync logs
export async function getRecentSyncLogs(userUid: string, limit = 50) {
  try {
    return await db
      .select()
      .from(syncLogs)
      .where(eq(syncLogs.userId, userUid))
      .orderBy(desc(syncLogs.timestamp))
      .limit(limit);
  } catch (error) {
    console.error('Failed to get sync logs:', error);
    throw new Error('Database operation failed', { cause: error });
  }
}
