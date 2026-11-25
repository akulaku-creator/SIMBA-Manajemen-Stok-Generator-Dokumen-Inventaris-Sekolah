import { getFirebaseIdToken } from './googleAuth';
import { getLocalApiToken, setLocalApiToken } from './credentialHelper';
import type {
  AppUser,
  Barang,
  KategoriBarangItem,
  KopSuratConfig,
  NumberingPatternConfig,
  Pejabat,
  TransaksiPenerimaan,
  TransaksiPengeluaran,
} from '../types';

export interface SimbaBootstrapResponse {
  isEmpty: boolean;
  kategoriList: KategoriBarangItem[];
  masterBarang: Barang[];
  pejabatList: Pejabat[];
  penerimaanList: TransaksiPenerimaan[];
  transaksiList: TransaksiPengeluaran[];
  kopConfig: KopSuratConfig | null;
  numberingConfig: NumberingPatternConfig | null;
  userList: AppUser[] | null;
  user?: {
    id?: number;
    uid: string;
    email: string;
    role: string;
  };
}

export interface SimbaSyncPayload {
  kategoriList: KategoriBarangItem[];
  masterBarang: Barang[];
  pejabatList: Pejabat[];
  penerimaanList: TransaksiPenerimaan[];
  transaksiList: TransaksiPengeluaran[];
  kopConfig: KopSuratConfig;
  numberingConfig: NumberingPatternConfig;
  userList: AppUser[];
  actionLabel?: string;
}

export async function getActiveApiBearerToken(): Promise<string | null> {
  const fbToken = await getFirebaseIdToken().catch(() => null);
  if (fbToken) return fbToken;
  return getLocalApiToken();
}

export async function fetchSimbaBootstrap(): Promise<SimbaBootstrapResponse | null> {
  const token = await getActiveApiBearerToken();
  if (!token) return null;

  const response = await fetch('/api/simba/bootstrap', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Gagal memuat data aplikasi.');
  }

  return response.json();
}

export async function syncSimbaState(payload: SimbaSyncPayload): Promise<boolean> {
  const token = await getActiveApiBearerToken();
  if (!token) return false;

  const response = await fetch('/api/simba/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error || 'Gagal menyimpan perubahan data.');
  }

  return true;
}

export async function loginLocalApi(
  identifier: string,
  password: string
): Promise<{
  backendReachable: boolean;
  authenticated: boolean;
  needsSetup?: boolean;
  user?: AppUser;
  error?: string;
  status?: number;
}> {
  try {
    const response = await fetch('/api/auth/local-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    if (response.status === 404 || response.status === 503) {
      return { backendReachable: false, authenticated: false };
    }
    const data = await response.json().catch(() => ({}));
    if (data?.authenticated && data?.sessionToken) {
      setLocalApiToken(data.sessionToken);
    }
    return {
      backendReachable: true,
      authenticated: Boolean(data?.authenticated),
      needsSetup: Boolean(data?.needsSetup),
      user: data?.user,
      error: !response.ok ? data?.error || 'Gagal autentikasi.' : undefined,
      status: response.status,
    };
  } catch {
    return { backendReachable: false, authenticated: false };
  }
}

export async function setupLocalCredentialApi(
  identifier: string,
  newPassword: string
): Promise<{
  backendReachable: boolean;
  authenticated: boolean;
  user?: AppUser;
  error?: string;
}> {
  try {
    const response = await fetch('/api/auth/setup-credential', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, newPassword }),
    });
    if (response.status === 404 || response.status === 503) {
      return { backendReachable: false, authenticated: false };
    }
    const data = await response.json().catch(() => ({}));
    if (response.ok && data?.authenticated && data?.sessionToken) {
      setLocalApiToken(data.sessionToken);
      return { backendReachable: true, authenticated: true, user: data.user };
    }
    return {
      backendReachable: true,
      authenticated: false,
      error: data?.error || 'Gagal mengatur kata sandi awal.',
    };
  } catch {
    return { backendReachable: false, authenticated: false };
  }
}

export async function verifyAdminPinApi(secret: string): Promise<{
  backendUsed: boolean;
  verified: boolean;
  hasConfiguredCredential?: boolean;
  error?: string;
}> {
  const token = await getActiveApiBearerToken();
  if (!token) {
    return { backendUsed: false, verified: false };
  }
  try {
    const response = await fetch('/api/auth/verify-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ secret }),
    });
    if (response.status === 404 || response.status === 503) {
      return { backendUsed: false, verified: false };
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        backendUsed: true,
        verified: false,
        hasConfiguredCredential: true,
        error: data?.error || 'PIN atau Kata Sandi Admin tidak sesuai.',
      };
    }
    return {
      backendUsed: true,
      verified: Boolean(data?.verified),
      hasConfiguredCredential: data?.hasConfiguredCredential !== false,
    };
  } catch {
    return { backendUsed: false, verified: false };
  }
}

export interface DbAuditLogRecord {
  id: number;
  tableName: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  recordPk: string | null;
  oldData: Record<string, any> | null;
  newData: Record<string, any> | null;
  changedFields: string[] | null;
  dbUser: string;
  appActor: string | null;
  clientAddr: string | null;
  executedAt: string;
}

export async function submitPenerimaanViaSp(payload: TransaksiPenerimaan): Promise<{ penerimaanId: number }> {
  const token = await getActiveApiBearerToken();
  if (!token) {
    throw new Error('Sesi autentikasi tidak ditemukan.');
  }
  const response = await fetch('/api/simba/penerimaan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Gagal menyimpan penerimaan melalui Stored Procedure.');
  }
  return { penerimaanId: Number(data.penerimaanId || 0) };
}

export async function submitPenyaluranViaSp(payload: TransaksiPengeluaran): Promise<{ penyaluranId: number }> {
  const token = await getActiveApiBearerToken();
  if (!token) {
    throw new Error('Sesi autentikasi tidak ditemukan.');
  }
  const response = await fetch('/api/simba/penyaluran', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Gagal menyimpan penyaluran melalui Stored Procedure.');
  }
  return { penyaluranId: Number(data.penyaluranId || 0) };
}

export async function fetchDbAuditLogs(limit = 100): Promise<DbAuditLogRecord[]> {
  const token = await getActiveApiBearerToken();
  if (!token) return [];
  const response = await fetch(`/api/simba/db-audit-logs?limit=${encodeURIComponent(limit)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return [];
  const data = await response.json().catch(() => ({}));
  return Array.isArray(data?.logs) ? data.logs : [];
}

