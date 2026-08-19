import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  addDoc,
  deleteDoc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import { app, auth, db } from './firebaseAuth';
import { DriveAccount, PooledFile, SyncLog } from '../types';

export { app, db };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let isFirestoreActive = true;

// Test initial connection to Firestore
export async function validateFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    isFirestoreActive = true;
  } catch (error: any) {
    if (error instanceof Error && (error.message.includes('not found') || error.message.includes('Database'))) {
      isFirestoreActive = false;
    } else {
      isFirestoreActive = true;
    }
  }
}

// Sync user profile to Firestore
export async function saveUserProfile(user: {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
}) {
  if (!isFirestoreActive) return;
  const path = `users/${user.uid}`;
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'User',
        photoUrl: user.photoURL || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (_error) {
    // Silently ignore if firestore is unprovisioned
  }
}

// Save connected drive accounts to Firestore
export async function saveDriveAccountToFirestore(userId: string, account: DriveAccount) {
  if (!isFirestoreActive) return;
  const path = `users/${userId}/drive_accounts/${account.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'drive_accounts', account.id), {
      id: account.id,
      userId,
      email: account.email,
      name: account.name,
      photoUrl: account.photoUrl || '',
      storageLimit: Number(account.storageLimit) || 16106127360,
      storageUsed: Number(account.storageUsed) || 0,
      storageAvailable: Number(account.storageAvailable) || 16106127360,
      color: account.color || '#4f46e5',
      status: account.status || 'active',
      isPrimary: Boolean(account.isPrimary),
      lastSyncedAt: account.lastSyncedAt || new Date().toISOString(),
    });
  } catch (_error) {
    // Silently ignore if firestore is unprovisioned
  }
}

// Save pooled files catalog to Firestore
export async function savePooledFileToFirestore(userId: string, file: Partial<PooledFile> & { id: string; accountId: string; name: string; mimeType: string }) {
  if (!isFirestoreActive) return;
  const path = `users/${userId}/pooled_files/${file.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'pooled_files', file.id), {
      id: file.id,
      userId,
      accountId: file.accountId,
      name: file.name,
      mimeType: file.mimeType,
      size: Number(file.size) || 0,
      modifiedTime: file.modifiedTime || new Date().toISOString(),
      webViewLink: file.webViewLink || '',
      iconLink: file.iconLink || '',
      thumbnailLink: file.thumbnailLink || '',
      category: file.category || 'other',
      isReplicated: Boolean(file.isReplicated),
    });
  } catch (_error) {
    // Silently ignore if firestore is unprovisioned
  }
}

// Save sync log to Firestore
export async function saveSyncLogToFirestore(userId: string, log: SyncLog) {
  if (!isFirestoreActive) return;
  const path = `users/${userId}/sync_logs/${log.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'sync_logs', log.id), {
      id: log.id,
      userId,
      timestamp: log.timestamp,
      action: log.action,
      status: log.status,
      fileName: log.fileName || '',
      fileSize: log.fileSize || 0,
      sourceDriveName: log.sourceDriveName || '',
      targetDriveName: log.targetDriveName || '',
      message: log.message,
    });
  } catch (_error) {
    // Silently ignore if firestore is unprovisioned
  }
}

// Save chat message to Firestore
export async function saveChatMessageToFirestore(
  userId: string,
  message: {
    id: string;
    role: 'user' | 'model' | 'assistant';
    content: string;
    modelUsed?: string;
    searchGrounding?: boolean;
    groundingUrls?: string;
    thinkingMode?: boolean;
    timestamp: string;
  }
) {
  if (!isFirestoreActive) return;
  const path = `users/${userId}/chat_messages/${message.id}`;
  try {
    const data: Record<string, any> = {
      id: message.id,
      userId,
      role: message.role || 'user',
      content: message.content || '',
      modelUsed: message.modelUsed || 'gemini-3.7-flash',
      searchGrounding: Boolean(message.searchGrounding),
      groundingUrls: message.groundingUrls || '',
      thinkingMode: Boolean(message.thinkingMode),
      timestamp: message.timestamp || new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', userId, 'chat_messages', message.id), data);
  } catch (_error) {
    // Silently ignore if firestore is unprovisioned
  }
}
