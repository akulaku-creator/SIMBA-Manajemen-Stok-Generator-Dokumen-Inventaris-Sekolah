import { 
  AppUser, 
  Barang, 
  KategoriBarangItem, 
  KopSuratConfig, 
  NumberingPatternConfig, 
  Pejabat, 
  TransaksiPenerimaan, 
  TransaksiPengeluaran 
} from '../types';
import { getAuditLogs, logAuditEvent } from './auditLogger';

export interface FullBackupPayload {
  appVersion: string;
  exportedAt: string;
  formattedDate: string;
  schoolName: string;
  metadata: {
    totalBarang: number;
    totalTransaksiPenyaluran: number;
    totalTransaksiPenerimaan: number;
    totalPejabat: number;
    totalKategori: number;
    totalAuditLogs: number;
    totalUsers: number;
    nilaiPersediaanBOS: number;
  };
  data: {
    masterBarang: Barang[];
    transaksiPenyaluran: TransaksiPengeluaran[];
    transaksiPenerimaan: TransaksiPenerimaan[];
    masterPejabat: Pejabat[];
    masterKategori: KategoriBarangItem[];
    kopConfig: KopSuratConfig;
    numberingConfig?: NumberingPatternConfig;
    userList: AppUser[];
    auditLogs: any[];
  };
}

const BACKUP_TIME_KEY = 'simba_last_backup_time';

export const getLastBackupTime = (): string | null => {
  return localStorage.getItem(BACKUP_TIME_KEY);
};

export const setLastBackupTime = (formattedTime: string): void => {
  localStorage.setItem(BACKUP_TIME_KEY, formattedTime);
};

export const exportFullDatabase = (params: {
  masterBarang: Barang[];
  transaksiList: TransaksiPengeluaran[];
  penerimaanList: TransaksiPenerimaan[];
  pejabatList: Pejabat[];
  kategoriList: KategoriBarangItem[];
  kopConfig: KopSuratConfig;
  numberingConfig?: NumberingPatternConfig;
  userList: AppUser[];
  currentUser?: AppUser;
}): { success: boolean; filename: string; formattedDate: string } => {
  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(now);

  const totalNilaiPenerimaan = params.penerimaanList.reduce((acc, p) => acc + (p.totalNilai || 0), 0);
  const auditLogs = getAuditLogs();

  const backupPayload: FullBackupPayload = {
    appVersion: 'SIMBA v2.6 Pro (Pengelolaan Persediaan BOS & Dokumen A4/F4)',
    exportedAt: now.toISOString(),
    formattedDate,
    schoolName: params.kopConfig?.namaSekolah || 'Sekolah',
    metadata: {
      totalBarang: params.masterBarang.length,
      totalTransaksiPenyaluran: params.transaksiList.length,
      totalTransaksiPenerimaan: params.penerimaanList.length,
      totalPejabat: params.pejabatList.length,
      totalKategori: params.kategoriList.length,
      totalAuditLogs: auditLogs.length,
      totalUsers: params.userList.length,
      nilaiPersediaanBOS: totalNilaiPenerimaan
    },
    data: {
      masterBarang: params.masterBarang,
      transaksiPenyaluran: params.transaksiList,
      transaksiPenerimaan: params.penerimaanList,
      masterPejabat: params.pejabatList,
      masterKategori: params.kategoriList,
      kopConfig: params.kopConfig,
      numberingConfig: params.numberingConfig,
      userList: params.userList,
      auditLogs
    }
  };

  const jsonString = JSON.stringify(backupPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

  // Sanitize filename
  const cleanSchool = (params.kopConfig?.namaSekolah || 'SIMBA')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 24);
  const dateSuffix = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const filename = `BACKUP_SIMBA_${cleanSchool}_${dateSuffix}.json`;

  // Trigger Download
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);

  // Update last backup timestamp
  setLastBackupTime(formattedDate);

  // Log to Audit System
  if (params.currentUser) {
    logAuditEvent({
      userId: params.currentUser.id,
      username: params.currentUser.username,
      userName: params.currentUser.nama,
      userRole: params.currentUser.role,
      action: 'BACKUP_DATABASE',
      title: 'Pencadangan Penuh Basis Data (Full Backup)',
      details: `Cadangan data lengkap diekspor ke file ${filename} (${params.masterBarang.length} barang, ${params.transaksiList.length} transaksi keluar, ${params.penerimaanList.length} penerimaan).`,
      status: 'SUCCESS'
    });
  }

  return {
    success: true,
    filename,
    formattedDate
  };
};
