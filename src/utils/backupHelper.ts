import JSZip from 'jszip';
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

export interface BackupValidationResult {
  isValid: boolean;
  errorMessage?: string;
  fileType: 'json' | 'zip';
  payload?: FullBackupPayload;
  summary?: {
    appVersion: string;
    schoolName: string;
    exportedAt: string;
    totalBarang: number;
    totalPenyaluran: number;
    totalPenerimaan: number;
    totalPejabat: number;
    totalKategori: number;
    totalUsers: number;
  };
}

const BACKUP_TIME_KEY = 'simba_last_backup_time';

export const getLastBackupTime = (): string | null => {
  return localStorage.getItem(BACKUP_TIME_KEY);
};

export const setLastBackupTime = (formattedTime: string): void => {
  localStorage.setItem(BACKUP_TIME_KEY, formattedTime);
};

const createBackupPayload = (params: {
  masterBarang: Barang[];
  transaksiList: TransaksiPengeluaran[];
  penerimaanList: TransaksiPenerimaan[];
  pejabatList: Pejabat[];
  kategoriList: KategoriBarangItem[];
  kopConfig: KopSuratConfig;
  numberingConfig?: NumberingPatternConfig;
  userList: AppUser[];
  currentUser?: AppUser;
}): { payload: FullBackupPayload; formattedDate: string; now: Date } => {
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

  const payload: FullBackupPayload = {
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

  return { payload, formattedDate, now };
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
  format?: 'json' | 'zip';
}): Promise<{ success: boolean; filename: string; formattedDate: string }> => {
  return new Promise(async (resolve, reject) => {
    try {
      const { payload, formattedDate, now } = createBackupPayload(params);
      const jsonString = JSON.stringify(payload, null, 2);

      const cleanSchool = (params.kopConfig?.namaSekolah || 'SIMBA')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 24);
      const dateSuffix = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);

      let filename = '';
      let downloadBlob: Blob;

      if (params.format === 'zip') {
        const zip = new JSZip();
        zip.file(`simba_database_backup_${dateSuffix}.json`, jsonString);
        zip.file(
          'README_BACKUP.txt',
          `SIMBA (Sistem Informasi Manajemen Barang & Aset)
Berkas Cadangan Basis Data Penuh (Full Database Backup)
======================================================
Asal Instansi   : ${payload.schoolName}
Tanggal Ekspor  : ${formattedDate} (${now.toISOString()})
Versi Aplikasi  : ${payload.appVersion}
Total Barang    : ${payload.metadata.totalBarang}
Penyaluran      : ${payload.metadata.totalTransaksiPenyaluran}
Penerimaan      : ${payload.metadata.totalTransaksiPenerimaan}
Master Pejabat  : ${payload.metadata.totalPejabat}
Audit Log       : ${payload.metadata.totalAuditLogs} entri

Catatan Pemulihan:
Berkas ZIP ini dapat langsung diunggah ke menu SIMBA:
"Pengaturan Terpadu" -> "Tab 4. Backup & Pemulihan Data" -> "Impor / Pemulihan Basis Data".
`
        );
        downloadBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        filename = `BACKUP_SIMBA_${cleanSchool}_${dateSuffix}.zip`;
      } else {
        downloadBlob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        filename = `BACKUP_SIMBA_${cleanSchool}_${dateSuffix}.json`;
      }

      // Trigger Download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(downloadBlob);
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
          title: `Pencadangan Penuh Basis Data (${(params.format || 'json').toUpperCase()})`,
          details: `Cadangan data lengkap diekspor ke file ${filename} (${params.masterBarang.length} barang, ${params.transaksiList.length} penyaluran, ${params.penerimaanList.length} penerimaan).`,
          status: 'SUCCESS'
        });
      }

      resolve({
        success: true,
        filename,
        formattedDate
      });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Membaca dan memvalidasi struktur berkas cadangan (.json / .zip)
 */
export const validateBackupFile = async (file: File): Promise<BackupValidationResult> => {
  const fileNameLower = file.name.toLowerCase();
  const isZip = fileNameLower.endsWith('.zip') || file.type.includes('zip');
  const isJson = fileNameLower.endsWith('.json') || file.type.includes('json');

  if (!isZip && !isJson) {
    return {
      isValid: false,
      fileType: 'json',
      errorMessage: 'Format berkas tidak didukung. Harap unggah berkas cadangan berformat .json atau .zip.'
    };
  }

  let jsonContent = '';

  try {
    if (isZip) {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // Find .json file inside the zip
      const jsonFileEntry = Object.keys(zip.files).find(key => key.toLowerCase().endsWith('.json'));
      if (!jsonFileEntry) {
        return {
          isValid: false,
          fileType: 'zip',
          errorMessage: 'Berkas ZIP tidak memuat file database cadangan berekstensi .json di dalamnya.'
        };
      }

      jsonContent = await zip.files[jsonFileEntry].async('string');
    } else {
      jsonContent = await file.text();
    }
  } catch (readErr: any) {
    return {
      isValid: false,
      fileType: isZip ? 'zip' : 'json',
      errorMessage: `Gagal membaca isi berkas: ${readErr?.message || 'File rusak atau tidak dapat dibuka.'}`
    };
  }

  // Parse JSON
  let rawObj: any;
  try {
    rawObj = JSON.parse(jsonContent);
  } catch (parseErr) {
    return {
      isValid: false,
      fileType: isZip ? 'zip' : 'json',
      errorMessage: 'Format isi file bukan JSON yang valid. Berkas kemungkinan rusak atau terpotong.'
    };
  }

  // Normalize payload (supports direct payload or { data: ... })
  const dataBlock = rawObj.data || rawObj;

  const masterBarang = Array.isArray(dataBlock.masterBarang) ? dataBlock.masterBarang : null;
  const transaksiPenyaluran = Array.isArray(dataBlock.transaksiPenyaluran) 
    ? dataBlock.transaksiPenyaluran 
    : (Array.isArray(dataBlock.transaksiList) ? dataBlock.transaksiList : null);
  const transaksiPenerimaan = Array.isArray(dataBlock.transaksiPenerimaan)
    ? dataBlock.transaksiPenerimaan
    : (Array.isArray(dataBlock.penerimaanList) ? dataBlock.penerimaanList : null);
  const masterPejabat = Array.isArray(dataBlock.masterPejabat)
    ? dataBlock.masterPejabat
    : (Array.isArray(dataBlock.pejabatList) ? dataBlock.pejabatList : null);

  if (!masterBarang || !transaksiPenyaluran || !transaksiPenerimaan) {
    return {
      isValid: false,
      fileType: isZip ? 'zip' : 'json',
      errorMessage: 'Skema berkas cadangan tidak cocok dengan spesifikasi SIMBA. Kolom data inti (Master Barang, Penyaluran, atau Penerimaan) tidak ditemukan.'
    };
  }

  // Optional collections
  const masterKategori = Array.isArray(dataBlock.masterKategori) 
    ? dataBlock.masterKategori 
    : (Array.isArray(dataBlock.kategoriList) ? dataBlock.kategoriList : []);
  const kopConfig = dataBlock.kopConfig || rawObj.kopConfig || {};
  const numberingConfig = dataBlock.numberingConfig || rawObj.numberingConfig;
  const userList = Array.isArray(dataBlock.userList) ? dataBlock.userList : [];
  const auditLogs = Array.isArray(dataBlock.auditLogs) ? dataBlock.auditLogs : [];

  const normalizedPayload: FullBackupPayload = {
    appVersion: rawObj.appVersion || 'SIMBA v2.6 Pro Compatible',
    exportedAt: rawObj.exportedAt || new Date().toISOString(),
    formattedDate: rawObj.formattedDate || 'Waktu tidak terdata',
    schoolName: rawObj.schoolName || kopConfig.namaSekolah || 'Instansi Terdaftar',
    metadata: {
      totalBarang: masterBarang.length,
      totalTransaksiPenyaluran: transaksiPenyaluran.length,
      totalTransaksiPenerimaan: transaksiPenerimaan.length,
      totalPejabat: (masterPejabat || []).length,
      totalKategori: masterKategori.length,
      totalAuditLogs: auditLogs.length,
      totalUsers: userList.length,
      nilaiPersediaanBOS: rawObj.metadata?.nilaiPersediaanBOS || 0
    },
    data: {
      masterBarang,
      transaksiPenyaluran,
      transaksiPenerimaan,
      masterPejabat: masterPejabat || [],
      masterKategori,
      kopConfig,
      numberingConfig,
      userList,
      auditLogs
    }
  };

  return {
    isValid: true,
    fileType: isZip ? 'zip' : 'json',
    payload: normalizedPayload,
    summary: {
      appVersion: normalizedPayload.appVersion,
      schoolName: normalizedPayload.schoolName,
      exportedAt: normalizedPayload.formattedDate,
      totalBarang: masterBarang.length,
      totalPenyaluran: transaksiPenyaluran.length,
      totalPenerimaan: transaksiPenerimaan.length,
      totalPejabat: (masterPejabat || []).length,
      totalKategori: masterKategori.length,
      totalUsers: userList.length
    }
  };
};
