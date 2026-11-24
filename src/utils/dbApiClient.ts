import { getFirebaseIdToken } from './googleAuth';
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
    id: number;
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

export async function fetchSimbaBootstrap(): Promise<SimbaBootstrapResponse | null> {
  const token = await getFirebaseIdToken();
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
  const token = await getFirebaseIdToken();
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
    throw new Error('Gagal menyimpan perubahan data.');
  }

  return true;
}
