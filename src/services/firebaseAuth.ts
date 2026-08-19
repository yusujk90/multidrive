import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  Auth,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { DriveAccount } from '../types';
import { fetchAccountAbout } from './driveApi';

// Initialize Firebase App instance
export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth instance
export const auth: Auth = getAuth(app);

// Read 'firestoreDatabaseId' from firebase-applet-config.json
const config = firebaseConfig as { firestoreDatabaseId?: string; [key: string]: any };

/**
 * Defensive Firestore initialization function that reads the 'firestoreDatabaseId' from 'firebase-applet-config.json'.
 * If the value is '(default)' or missing, call getFirestore(app) without an ID;
 * otherwise, call getFirestore(app, config.firestoreDatabaseId) explicitly.
 * This resolves the 'Database (default) not found' error during production builds.
 */
export function initializeFirestore(firebaseApp: FirebaseApp, appConfig: typeof config): Firestore {
  const dbId = appConfig.firestoreDatabaseId;
  if (!dbId || typeof dbId !== 'string' || dbId.trim() === '' || dbId.trim() === '(default)' || dbId.trim().toLowerCase() === 'default') {
    return getFirestore(firebaseApp);
  }
  return getFirestore(firebaseApp, dbId.trim());
}

export const db: Firestore = initializeFirestore(app, config);

export function getDb(): Firestore {
  return db;
}

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
  'https://www.googleapis.com/auth/drive',
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

/**
 * SecureLocalStorage: Persistent and memory-backed Token Manager
 * with automatic expiration checks and safe base64 encoding.
 */
class SecureTokenManager {
  private storagePrefix = 'multidrive_sec_token_v1_';
  private memoryCache: Map<string, { token: string; expiresAt: number }> = new Map();

  private encode(data: string): string {
    try {
      return btoa(encodeURIComponent(data));
    } catch {
      return data;
    }
  }

  private decode(encoded: string): string {
    try {
      return decodeURIComponent(atob(encoded));
    } catch {
      return encoded;
    }
  }

  public setToken(accountEmail: string, token: string, expiresInSeconds: number = 3500): void {
    if (!accountEmail || !token) return;
    const cleanEmail = accountEmail.toLowerCase().trim();
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const payload = JSON.stringify({ token, expiresAt, email: cleanEmail });

    this.memoryCache.set(cleanEmail, { token, expiresAt });

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.storagePrefix + cleanEmail, this.encode(payload));
      }
    } catch (err) {
      console.warn('[SecureTokenManager] localStorage write unavailable:', err);
    }
  }

  public getToken(accountEmail: string): string | null {
    if (!accountEmail) return null;
    const cleanEmail = accountEmail.toLowerCase().trim();

    // 1. Check in-memory store
    const memEntry = this.memoryCache.get(cleanEmail);
    if (memEntry) {
      // 60-second buffer before expiry
      if (Date.now() < memEntry.expiresAt - 60000) {
        return memEntry.token;
      }
      this.memoryCache.delete(cleanEmail);
    }

    // 2. Check persistent localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(this.storagePrefix + cleanEmail);
        if (raw) {
          const parsed = JSON.parse(this.decode(raw));
          if (parsed && parsed.token && parsed.expiresAt) {
            if (Date.now() < parsed.expiresAt - 60000) {
              this.memoryCache.set(cleanEmail, { token: parsed.token, expiresAt: parsed.expiresAt });
              return parsed.token;
            }
            // Token expired in storage -> remove
            this.removeToken(cleanEmail);
          }
        }
      }
    } catch (err) {
      console.warn('[SecureTokenManager] localStorage read error:', err);
    }

    return null;
  }

  public isTokenExpired(accountEmail: string): boolean {
    return this.getToken(accountEmail) === null;
  }

  public removeToken(accountEmail: string): void {
    if (!accountEmail) return;
    const cleanEmail = accountEmail.toLowerCase().trim();
    this.memoryCache.delete(cleanEmail);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(this.storagePrefix + cleanEmail);
      }
    } catch (_e) {}
  }

  public clearAllTokens(): void {
    this.memoryCache.clear();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith(this.storagePrefix))
          .forEach((k) => window.localStorage.removeItem(k));
      }
    } catch (_e) {}
  }
}

export const SecureLocalStorage = new SecureTokenManager();
export const tokenManager = SecureLocalStorage;

export const setCachedToken = (key: string, token: string, expiresInSeconds: number = 3500) => {
  SecureLocalStorage.setToken(key, token, expiresInSeconds);
};

export const getCachedToken = (key: string): string | null => {
  return SecureLocalStorage.getToken(key);
};

/**
 * Initiate silent or prompt-based token refresh using Google Identity Services or Firebase Auth
 */
export async function refreshGoogleOAuthToken(
  accountEmail?: string,
  forcePrompt: boolean = false
): Promise<string> {
  const clientId = (firebaseConfig as any).oAuthClientId || '';

  // 1. Try Google Identity Services (GIS) token refresh
  if (clientId && window.google?.accounts?.oauth2) {
    try {
      const token = await new Promise<string>((resolve, reject) => {
        const clientConfig: any = {
          client_id: clientId,
          scope: SCOPES.join(' '),
          prompt: forcePrompt ? 'select_account' : '',
          callback: (resp: any) => {
            if (resp.error) {
              reject(new Error(typeof resp.error === 'string' ? resp.error : 'Sesi otentikasi Google berakhir'));
            } else if (resp.access_token) {
              resolve(resp.access_token);
            } else {
              reject(new Error('Tidak ada token yang dikembalikan dari Google'));
            }
          },
          error_callback: (err: any) => {
            reject(new Error(err?.message || 'Gagal memperbarui token Google'));
          },
        };
        if (accountEmail) {
          clientConfig.hint = accountEmail;
        }

        const tokenClient = window.google.accounts.oauth2.initTokenClient(clientConfig);
        tokenClient.requestAccessToken({ prompt: forcePrompt ? 'select_account' : '', hint: accountEmail } as any);
      });

      if (token) {
        if (accountEmail) {
          setCachedToken(accountEmail, token);
        }
        return token;
      }
    } catch (gisErr) {
      console.warn('[TokenRefresh] Silent GIS refresh failed, trying popup fallback:', gisErr);
    }
  }

  // 2. Fallback: Firebase Auth Google Auth Provider Popup
  const provider = new GoogleAuthProvider();
  SCOPES.forEach((scope) => provider.addScope(scope));
  if (accountEmail) {
    provider.setCustomParameters({ login_hint: accountEmail, prompt: forcePrompt ? 'select_account' : 'consent' });
  }

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);

  if (!credential?.accessToken) {
    throw new Error('Gagal memperbarui token akses Google Drive.');
  }

  const newToken = credential.accessToken;
  if (accountEmail) {
    setCachedToken(accountEmail, newToken);
  }
  return newToken;
}

/**
 * Wrapper utility that automatically detects 401 UNAUTHENTICATED errors,
 * refreshes the Google OAuth token silently, and retries the operation once.
 */
export async function executeWithTokenRefresh<T>(
  accountEmail: string,
  initialToken: string | undefined,
  operation: (token: string) => Promise<T>
): Promise<T> {
  let token = (initialToken && initialToken.trim() !== '') ? initialToken : getCachedToken(accountEmail);

  if (!token && accountEmail) {
    try {
      token = await refreshGoogleOAuthToken(accountEmail, false);
    } catch (_e) {
      // Ignore initial refresh failure and attempt operation with fallback
    }
  }

  try {
    return await operation(token || '');
  } catch (error: any) {
    const errStr = String(error?.message || error);
    const is401 =
      errStr.includes('401') ||
      errStr.includes('UNAUTHENTICATED') ||
      errStr.includes('Invalid Credentials') ||
      errStr.includes('authentication credential');

    if (is401 && accountEmail) {
      console.warn(`[TokenRefresh] Detected 401 error for ${accountEmail}. Retrying operation with fresh OAuth token...`);
      try {
        const freshToken = await refreshGoogleOAuthToken(accountEmail, false);
        if (freshToken) {
          setCachedToken(accountEmail, freshToken);
          return await operation(freshToken);
        }
      } catch (refreshErr) {
        console.warn(`[TokenRefresh] Automatic token refresh failed for ${accountEmail}:`, refreshErr);
      }

      // Notify UI listeners that this specific account requires OAuth re-linking
      const { notifyDriveAuthError, DriveAuthError } = await import('./driveApi');
      const userMsg = `Akun ${accountEmail} memerlukan login ulang (HTTP 401 UNAUTHENTICATED). Token Google OAuth telah kadaluwarsa.`;
      notifyDriveAuthError(accountEmail, userMsg);
      throw new DriveAuthError(userMsg, accountEmail, 401);
    }
    throw error;
  }
}

/**
 * Global HTTP Fetch interceptor that automatically injects the active OAuth token for an account,
 * checks for expiration in SecureLocalStorage, and intercepts 401 responses to perform silent refresh or mark account as expired.
 */
export async function fetchWithAuthInterceptor(
  url: string,
  options: RequestInit = {},
  accountEmail?: string,
  initialToken?: string
): Promise<Response> {
  return executeWithTokenRefresh(accountEmail || '', initialToken, async (token) => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      throw new Error(`401 Unauthorized: ${await response.text()}`);
    }

    return response;
  });
}

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
