import { DriveAccount, UnifiedFile } from '../types';
import { executeWithTokenRefresh } from './firebaseAuth';

export class DriveAuthError extends Error {
  accountEmail: string;
  statusCode: number;

  constructor(message: string, accountEmail: string, statusCode: number = 401) {
    super(message);
    this.name = 'DriveAuthError';
    this.accountEmail = accountEmail;
    this.statusCode = statusCode;
  }
}

type AuthErrorListener = (data: { accountEmail: string; message: string }) => void;
const authErrorListeners: Set<AuthErrorListener> = new Set();

export const onDriveAuthError = (listener: AuthErrorListener) => {
  authErrorListeners.add(listener);
  return () => {
    authErrorListeners.delete(listener);
  };
};

export const notifyDriveAuthError = (accountEmail: string, message: string) => {
  if (!accountEmail) return;
  authErrorListeners.forEach((listener) => {
    try {
      listener({ accountEmail, message });
    } catch (err) {
      console.error('Error in DriveAuthError listener:', err);
    }
  });
};

/**
 * Helper to check response status and throw DriveAuthError if 401 or UNAUTHENTICATED
 */
async function checkResponseStatus(res: Response, defaultErrorMsg: string, accountEmail?: string): Promise<void> {
  if (!res.ok) {
    const errorText = await res.text();
    const is401 =
      res.status === 401 ||
      errorText.includes('401') ||
      errorText.includes('UNAUTHENTICATED') ||
      errorText.includes('Invalid Credentials') ||
      errorText.includes('authentication credential');

    if (is401 && accountEmail) {
      const authMsg = `Akun ${accountEmail} memerlukan login ulang (HTTP 401 UNAUTHENTICATED). Token Google OAuth telah kadaluwarsa.`;
      notifyDriveAuthError(accountEmail, authMsg);
      throw new DriveAuthError(authMsg, accountEmail, 401);
    }

    throw new Error(`${defaultErrorMsg} (${res.status}): ${errorText}`);
  }
}

export interface DriveAboutResponse {
  user?: {
    displayName?: string;
    emailAddress?: string;
    photoLink?: string;
  };
  storageQuota?: {
    limit?: string;
    usage?: string;
    usageInDrive?: string;
    usageInDriveTrash?: string;
  };
}

export interface GoogleDriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  parents?: string[];
  trashed?: boolean;
}

/**
 * Fetch storage quota and profile from Google Drive API
 */
export async function fetchAccountAbout(
  accessToken: string,
  accountEmail?: string
): Promise<DriveAboutResponse> {
  return executeWithTokenRefresh(accountEmail || '', accessToken, async (token) => {
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await checkResponseStatus(res, 'Gagal membaca informasi Drive', accountEmail);
    return await res.json();
  });
}

/**
 * Fetch files from a specific Google Drive account
 */
export async function fetchAccountFiles(
  accessToken: string,
  pageSize: number = 60,
  accountEmail?: string
): Promise<GoogleDriveFileItem[]> {
  return executeWithTokenRefresh(accountEmail || '', accessToken, async (token) => {
    const query = encodeURIComponent('trashed = false');
    const fields = encodeURIComponent(
      'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink,parents,trashed)'
    );
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&pageSize=${pageSize}&fields=${fields}&orderBy=modifiedTime desc`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await checkResponseStatus(res, 'Gagal memuat berkas Drive', accountEmail);
    const data = await res.json();
    return data.files || [];
  });
}

/**
 * Upload a file directly to Google Drive via multipart upload
 */
export async function uploadFileToDrive(
  accessToken: string,
  file: File | Blob,
  fileName: string,
  mimeType: string,
  parentFolderId?: string,
  accountEmail?: string
): Promise<GoogleDriveFileItem> {
  return executeWithTokenRefresh(accountEmail || '', accessToken, async (token) => {
    const metadata: Record<string, any> = {
      name: fileName,
      mimeType: mimeType || 'application/octet-stream',
    };

    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const fileArrayBuffer = await file.arrayBuffer();
    const metadataString = JSON.stringify(metadata);

    const multipartRequestBody = new Blob([
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      metadataString,
      delimiter,
      `Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`,
      new Uint8Array(fileArrayBuffer),
      closeDelimiter,
    ]);

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    await checkResponseStatus(res, 'Gagal mengunggah berkas', accountEmail);
    return await res.json();
  });
}

/**
 * Download file binary blob from Drive
 */
export async function downloadFileBlob(
  accessToken: string,
  fileId: string,
  accountEmail?: string
): Promise<Blob> {
  return executeWithTokenRefresh(accountEmail || '', accessToken, async (token) => {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await checkResponseStatus(res, 'Gagal mengunduh berkas', accountEmail);
    return await res.blob();
  });
}

/**
 * Delete a file from Google Drive
 */
export async function deleteFileFromDrive(
  accessToken: string,
  fileId: string,
  accountEmail?: string
): Promise<void> {
  return executeWithTokenRefresh(accountEmail || '', accessToken, async (token) => {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok && res.status !== 204 && res.status !== 404) {
      await checkResponseStatus(res, 'Gagal menghapus berkas', accountEmail);
    }
  });
}

/**
 * Create a new folder in Google Drive
 */
export async function createFolderInDrive(
  accessToken: string,
  folderName: string,
  parentId?: string,
  accountEmail?: string
): Promise<GoogleDriveFileItem> {
  return executeWithTokenRefresh(accountEmail || '', accessToken, async (token) => {
    const metadata: Record<string, any> = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentId) {
      metadata.parents = [parentId];
    }

    const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,modifiedTime', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    await checkResponseStatus(res, 'Gagal membuat folder', accountEmail);
    return await res.json();
  });
}

/**
 * Cross-Drive File Copy / Transfer: Read from Source Drive and upload into Target Drive
 */
export async function copyFileBetweenDrives(
  sourceToken: string,
  targetToken: string,
  file: UnifiedFile,
  targetFolderId?: string,
  sourceEmail?: string,
  targetEmail?: string
): Promise<GoogleDriveFileItem> {
  // 1. Handle folders
  if (file.isFolder || file.mimeType.includes('folder')) {
    return await createFolderInDrive(targetToken, file.name, targetFolderId, targetEmail);
  }

  // 2. Handle Google Workspace native documents (Docs, Sheets, Slides)
  if (file.mimeType.startsWith('application/vnd.google-apps.')) {
    let exportMime = 'application/pdf';
    let ext = '.pdf';
    if (file.mimeType.includes('spreadsheet')) {
      exportMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      ext = '.xlsx';
    } else if (file.mimeType.includes('presentation')) {
      exportMime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      ext = '.pptx';
    } else if (file.mimeType.includes('document')) {
      exportMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      ext = '.docx';
    }

    const blob = await executeWithTokenRefresh(sourceEmail || file.accountEmail || '', sourceToken, async (sToken) => {
      const exportRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(exportMime)}`,
        {
          headers: { Authorization: `Bearer ${sToken}` },
        }
      );
      if (!exportRes.ok) {
        const errText = await exportRes.text();
        throw new Error(`Gagal mengekspor dokumen Google (${exportRes.status}): ${errText}`);
      }
      return await exportRes.blob();
    });

    const cleanName = file.name.endsWith(ext) ? file.name : `${file.name}${ext}`;
    return await uploadFileToDrive(targetToken, blob, cleanName, exportMime, targetFolderId, targetEmail);
  }

  // 3. Handle standard files (binary download from source drive + upload to target drive)
  const blob = await downloadFileBlob(sourceToken, file.id, sourceEmail || file.accountEmail);
  return await uploadFileToDrive(targetToken, blob, file.name, file.mimeType, targetFolderId, targetEmail);
}

/**
 * Iterates through all connected Drive accounts and fetches latest storage quota and user metrics.
 * Returns the updated array of DriveAccount objects to ensure UI reflects current quota accurately.
 */
export async function refreshAllAccounts(accounts: DriveAccount[]): Promise<DriveAccount[]> {
  const updatedAccounts: DriveAccount[] = await Promise.all(
    accounts.map(async (acc) => {
      // Keep sandbox/demo accounts unchanged
      if (acc.status === 'demo' || !acc.email || acc.email.includes('demo') || acc.email.includes('example.com')) {
        return acc;
      }

      try {
        const aboutData = await fetchAccountAbout(acc.accessToken || '', acc.email);
        const quota = aboutData.storageQuota || {};
        const limit = quota.limit ? Number(quota.limit) : acc.storageLimit;
        const usage = quota.usage ? Number(quota.usage) : acc.storageUsed;
        const available = Math.max(0, limit - usage);
        const userName = aboutData.user?.displayName || acc.name;
        const userPhoto = aboutData.user?.photoLink || acc.photoUrl;

        return {
          ...acc,
          name: userName,
          photoUrl: userPhoto,
          storageLimit: limit,
          storageUsed: usage,
          storageAvailable: available,
          status: 'active' as const,
          lastSyncedAt: new Date().toISOString(),
        };
      } catch (err: any) {
        console.warn(`[refreshAllAccounts] Failed to fetch metrics for ${acc.email}:`, err);
        const isExpired =
          String(err?.message || err).includes('401') ||
          String(err?.message || err).includes('UNAUTHENTICATED');
        return {
          ...acc,
          status: isExpired ? ('expired' as const) : acc.status,
        };
      }
    })
  );

  return updatedAccounts;
}
