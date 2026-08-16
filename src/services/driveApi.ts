import { UnifiedFile } from '../types';

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
export async function fetchAccountAbout(accessToken: string): Promise<DriveAboutResponse> {
  const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gagal membaca informasi Drive (${res.status}): ${errorText}`);
  }

  return await res.json();
}

/**
 * Fetch files from a specific Google Drive account
 */
export async function fetchAccountFiles(
  accessToken: string,
  pageSize: number = 60
): Promise<GoogleDriveFileItem[]> {
  const query = encodeURIComponent("trashed = false");
  const fields = encodeURIComponent(
    'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink,parents,trashed)'
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&pageSize=${pageSize}&fields=${fields}&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gagal memuat berkas Drive (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Upload a file directly to Google Drive via multipart upload
 */
export async function uploadFileToDrive(
  accessToken: string,
  file: File | Blob,
  fileName: string,
  mimeType: string,
  parentFolderId?: string
): Promise<GoogleDriveFileItem> {
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
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gagal mengunggah berkas (${res.status}): ${errorText}`);
  }

  return await res.json();
}

/**
 * Download file binary blob from Drive
 */
export async function downloadFileBlob(accessToken: string, fileId: string): Promise<Blob> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Gagal mengunduh berkas (${res.status})`);
  }

  return await res.blob();
}

/**
 * Delete a file from Google Drive
 */
export async function deleteFileFromDrive(accessToken: string, fileId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const errorText = await res.text();
    throw new Error(`Gagal menghapus berkas (${res.status}): ${errorText}`);
  }
}

/**
 * Create a new folder in Google Drive
 */
export async function createFolderInDrive(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<GoogleDriveFileItem> {
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
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gagal membuat folder (${res.status}): ${errorText}`);
  }

  return await res.json();
}

/**
 * Cross-Drive File Copy / Sync: Read from Source Drive and upload into Target Drive!
 */
export async function copyFileBetweenDrives(
  sourceToken: string,
  targetToken: string,
  file: UnifiedFile,
  targetFolderId?: string
): Promise<GoogleDriveFileItem> {
  // If it's a Google doc/sheet/slide type, we would export or duplicate, but for standard files download media blob
  let blob: Blob;
  
  if (file.mimeType.startsWith('application/vnd.google-apps.')) {
    // Export Google Docs format to PDF or standard format
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

    const exportRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(exportMime)}`,
      {
        headers: { Authorization: `Bearer ${sourceToken}` },
      }
    );
    if (!exportRes.ok) {
      throw new Error(`Gagal mengekspor dokumen Google (${exportRes.status})`);
    }
    blob = await exportRes.blob();
    const cleanName = file.name.endsWith(ext) ? file.name : `${file.name}${ext}`;
    return await uploadFileToDrive(targetToken, blob, cleanName, exportMime, targetFolderId);
  } else {
    blob = await downloadFileBlob(sourceToken, file.id);
    return await uploadFileToDrive(targetToken, blob, file.name, file.mimeType, targetFolderId);
  }
}
