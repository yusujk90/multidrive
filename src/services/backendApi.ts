import { auth } from './firebaseAuth';

export interface ConnectivityStatus {
  connected: boolean;
  status?: number;
  latencyMs?: number;
  googleDriveApiOnline?: boolean;
  error?: string;
  timestamp?: string;
}

export interface SmartAdvisorResponse {
  status: string;
  totalAccounts?: number;
  totalCapacityBytes?: number;
  totalUsedBytes?: number;
  usagePercent?: number;
  healthScore?: number;
  overUtilizedAccounts?: string[];
  recommendations: string[];
  timestamp?: string;
}

/**
 * Helper to retrieve current Firebase ID Token for authenticated API calls
 */
async function getIdTokenHeader(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) return { 'Content-Type': 'application/json' };
  try {
    const token = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  } catch (err) {
    return { 'Content-Type': 'application/json' };
  }
}

/**
 * Checks server health and internet reachability to Google Drive APIs
 */
export async function checkBackendConnectivity(): Promise<ConnectivityStatus> {
  try {
    const res = await fetch('/api/connectivity', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      return {
        connected: false,
        error: `Server HTTP ${res.status}`,
        googleDriveApiOnline: false,
      };
    }

    return await res.json();
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message || 'Gagal menghubungi backend',
      googleDriveApiOnline: false,
    };
  }
}

/**
 * Sync connected drive accounts to Cloud SQL database
 */
export async function syncDriveAccountsToCloudSql(accounts: any[]): Promise<void> {
  try {
    const headers = await getIdTokenHeader();
    if (!('Authorization' in headers)) return;

    await fetch('/api/drive-accounts/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({ accounts }),
    });
  } catch (err) {
    console.warn('Silent sync to Cloud SQL accounts failed:', err);
  }
}

/**
 * Sync pooled files metadata to Cloud SQL database
 */
export async function syncFilesToCloudSql(files: any[]): Promise<void> {
  try {
    const headers = await getIdTokenHeader();
    if (!('Authorization' in headers)) return;

    await fetch('/api/files/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({ files }),
    });
  } catch (err) {
    console.warn('Silent sync to Cloud SQL files failed:', err);
  }
}

/**
 * Persist sync operation log to Cloud SQL
 */
export async function logSyncToCloudSql(log: any): Promise<void> {
  try {
    const headers = await getIdTokenHeader();
    if (!('Authorization' in headers)) return;

    await fetch('/api/sync-logs', {
      method: 'POST',
      headers,
      body: JSON.stringify({ log }),
    });
  } catch (err) {
    console.warn('Silent sync log failed:', err);
  }
}

/**
 * Request smart storage balancing recommendations from the backend
 */
export async function fetchSmartBalanceAdvice(
  accounts: any[],
  files: any[]
): Promise<SmartAdvisorResponse> {
  try {
    const res = await fetch('/api/smart-balance-advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accounts, files }),
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    return {
      status: 'fallback',
      recommendations: [
        'Hubungkan beberapa akun Google Drive untuk memaksimalkan kapasitas penyimpanan terpadu.',
      ],
      healthScore: 90,
    };
  }
}
