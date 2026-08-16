import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  Auth,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { app } from './firestoreStorage';
import { DriveAccount } from '../types';
import { fetchAccountAbout } from './driveApi';

export const auth: Auth = getAuth(app);

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (response: { access_token?: string; error?: any }) => void;
            error_callback?: (error: any) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/photoslibrary.readonly',
  'https://www.googleapis.com/auth/photoslibrary.appendonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const ACCOUNT_COLORS = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#dc2626', // Red
  '#0891b2', // Cyan
  '#db2777', // Pink
  '#4f46e5', // Indigo
];

let colorIndex = 0;
export const getNextAccountColor = () => {
  const color = ACCOUNT_COLORS[colorIndex % ACCOUNT_COLORS.length];
  colorIndex++;
  return color;
};

// In-memory token storage
const tokenCache: Record<string, string> = {};

export const setCachedToken = (key: string, token: string) => {
  tokenCache[key] = token;
};

export const getCachedToken = (key: string): string | null => {
  return tokenCache[key] || null;
};

/**
 * Fetch basic user profile using Google OAuth2 UserInfo endpoint
 */
async function fetchGoogleUserInfo(accessToken: string): Promise<{
  email: string;
  name: string;
  picture?: string;
  sub: string;
}> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error('Gagal mengambil data profil Google');
  }
  return await res.json();
}

/**
 * Obtain access token using Google Identity Services (GIS) Token Client
 */
function requestGISToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      return reject(new Error('Google Identity Services belum termuat. Mencoba metode alternatif...'));
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES.join(' '),
      prompt: 'select_account',
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(typeof resp.error === 'string' ? resp.error : 'Izin Google dibatalkan atau ditolak'));
        } else if (resp.access_token) {
          resolve(resp.access_token);
        } else {
          reject(new Error('Tidak ada access token yang dikembalikan dari Google.'));
        }
      },
      error_callback: (err) => {
        reject(new Error(err?.message || 'Gagal memulai otentikasi Google'));
      },
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });
}

/**
 * Connect a Google Drive account using GIS Token Client with Firebase popup fallback.
 * Allows connecting multiple distinct Google Drive accounts simultaneously.
 */
export const connectNewGoogleDriveAccount = async (): Promise<{
  account: DriveAccount;
  accessToken: string;
}> => {
  let accessToken: string | null = null;
  const clientId = (firebaseConfig as any).oAuthClientId || '';

  // 1. Try Google Identity Services first if client ID is available and GIS is loaded
  if (clientId && window.google?.accounts?.oauth2) {
    try {
      accessToken = await requestGISToken(clientId);
    } catch (gisError) {
      console.warn('GIS Token request encountered error, falling back to Firebase Auth:', gisError);
    }
  }

  // 2. Fallback to Firebase Auth signInWithPopup if GIS was not used or failed
  if (!accessToken) {
    const provider = new GoogleAuthProvider();
    SCOPES.forEach((scope) => provider.addScope(scope));
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses Google Drive. Pastikan izin telah diberikan.');
    }
    accessToken = credential.accessToken;
  }

  // 3. Fetch user profile and Drive quota
  let email = '';
  let name = 'Google Drive';
  let photoUrl: string | undefined;
  let uid = `drive_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    const userInfo = await fetchGoogleUserInfo(accessToken);
    email = userInfo.email;
    name = userInfo.name;
    photoUrl = userInfo.picture;
    uid = `drive_${userInfo.sub || userInfo.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
  } catch (profileErr) {
    console.warn('Could not fetch userinfo directly:', profileErr);
  }

  let limit = 15 * 1024 * 1024 * 1024;
  let usage = 0;

  try {
    const aboutData = await fetchAccountAbout(accessToken);
    if (aboutData.user?.emailAddress && !email) {
      email = aboutData.user.emailAddress;
    }
    if (aboutData.user?.displayName && name === 'Google Drive') {
      name = aboutData.user.displayName;
    }
    if (aboutData.user?.photoLink && !photoUrl) {
      photoUrl = aboutData.user.photoLink;
    }
    const quota = aboutData.storageQuota || {};
    if (quota.limit) limit = Number(quota.limit);
    if (quota.usage) usage = Number(quota.usage);
  } catch (aboutErr) {
    console.warn('Could not fetch Drive about quota:', aboutErr);
  }

  if (!email) {
    email = `user_${Date.now()}@gmail.com`;
  }

  const available = Math.max(0, limit - usage);

  setCachedToken(email, accessToken);
  setCachedToken(uid, accessToken);

  const account: DriveAccount = {
    id: uid,
    email,
    name,
    photoUrl,
    accessToken,
    storageLimit: limit,
    storageUsed: usage,
    storageAvailable: available,
    color: getNextAccountColor(),
    status: 'active',
    lastSyncedAt: new Date().toISOString(),
    isPrimary: false,
  };

  return { account, accessToken };
};

export const logoutCurrentAuth = async () => {
  await signOut(auth);
};
