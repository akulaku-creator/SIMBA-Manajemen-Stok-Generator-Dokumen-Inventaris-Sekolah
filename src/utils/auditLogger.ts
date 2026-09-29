import { AuditLog, AuditAction, AuditSeverity, UserRole, Sekolah } from '../types';

const AUDIT_STORAGE_KEY = 'simba_audit_logs';

/**
 * Realistic default seed audit logs showcasing multi-tenant isolation, 
 * security audits, and transactions across multiple schools.
 */
export const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-sec-001',
    sekolah_id: 'sekolah-smkn1-kota',
    nama_sekolah: 'SMK Negeri 1 Kota Pendidikan',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    formattedDate: new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(new Date(Date.now() - 1000 * 60 * 12)),
    userId: 'usr-admin-1',
    username: 'admin',
    userName: 'Ahmad Fauzi, S.Pd (Pengurus Barang)',
    userRole: 'admin',
    action: 'TAMBAH_TRANSAKSI',
    severity: 'INFO',
    title: 'Penerbitan Berkas Penyaluran Barang (NPB-SPB-SPPB-BAST)',
    details: 'Berhasil menerbitkan 4 berkas dokumen resmi penyaluran barang inventaris ke Unit Pemohon: Laboratorium Komputer TKJ (No. BAST: 028/001/BAST-SMKN1/IX/2026). Stok 5 rim kertas A4 dan 2 mouse optik terpotong otomatis.',
    status: 'SUCCESS',
    ipAddress: '192.168.1.45 (Local LAN)',
    deviceInfo: 'Chrome / Windows NT 10.0',
    meta: { noBAST: '028/001/BAST-SMKN1/IX/2026', totalItems: 2, totalValue: 260000 }
  },
  {
    id: 'audit-sec-002',
    sekolah_id: 'sekolah-sman1-cihaurbeuti',
    nama_sekolah: 'SMAN 1 Cihaurbeuti',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    formattedDate: new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(new Date(Date.now() - 1000 * 60 * 45)),
    userId: 'usr-ch-operator',
    username: 'operator.cihaurbeuti',
    userName: 'Dedi Kurniawan, S.Pd',
    userRole: 'operator',
    action: 'TAMBAH_PENERIMAAN',
    severity: 'INFO',
    title: 'Pencatatan Penerimaan Barang Belanja BOS Reguler',
    details: 'Mencatat pengadaan ATK dan bahan cetak dari CV Sumber Berkah Mandiri senilai Rp 4.850.000 (No. Bukti: BUKTI-BOS-CHRBT-01). Saldo barang bertambah secara otomatis.',
    status: 'SUCCESS',
    ipAddress: '192.168.10.12 (Koneksi Satker)',
    deviceInfo: 'Edge / Windows 11',
    meta: { noBukti: 'BUKTI-BOS-CHRBT-01', sumberDana: 'BOS Reguler', totalNilai: 4850000 }
  },
  {
    id: 'audit-sec-003',
    sekolah_id: 'sekolah-smkn2-bandung',
    nama_sekolah: 'SMKN 2 Bandung',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    formattedDate: new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(new Date(Date.now() - 1000 * 60 * 120)),
    userId: 'usr-bdg-admin',
    username: 'admin.smkn2',
    userName: 'Rina Sugiarti, M.T',
    userRole: 'admin',
    action: 'VERIFIKASI_DOKUMEN',
    severity: 'INFO',
    title: 'Pengecekan Integritas QR & Digital Hash Berkas',
    details: 'Verifikasi hash tanda tangan elektronik dan QR Code BAST-028/014/SMKN2/2026. Status integritas: VALID & ASLI (100% matched checksum).',
    status: 'SUCCESS',
    ipAddress: '10.0.12.88 (Jaringan Sekolah)',
    deviceInfo: 'Safari / macOS',
    meta: { docType: 'BAST', hash: 'SIMBA-BAST-202609-F9E2A1', isValid: true }
  },
  {
    id: 'audit-sec-004',
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    formattedDate: new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(new Date(Date.now() - 1000 * 60 * 240)),
    userId: 'usr-super-dinas',
    username: 'dinas',
    userName: 'Dr. H. Bambang Soediro, M.Pd (Pengawas Dinas)',
    userRole: 'super_admin',
    action: 'SECURITY_CHECK',
    severity: 'INFO',
    title: 'Pemeriksaan Integritas Isolasi Multi-Tenant Lintas Satker',
    details: 'Audit rutin partisi database: Seluruh transaksi dan saldo barang terisolasi 100% berdasarkan sekolah_id. Nol kebocoran data antar sekolah terdeteksi.',
    status: 'SUCCESS',
    ipAddress: '10.10.1.5 (Pusat Data Dinas Pendidikan)',
    deviceInfo: 'Chrome / Linux x86_64',
    meta: { inspectedTenants: 3, isolationScore: '100%', leaksDetected: 0 }
  },
  {
    id: 'audit-sec-005',
    sekolah_id: 'sekolah-smkn1-kota',
    nama_sekolah: 'SMK Negeri 1 Kota Pendidikan',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    formattedDate: new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(new Date(Date.now() - 1000 * 60 * 360)),
    userId: 'usr-staf-1',
    username: 'budi_sarpras',
    userName: 'Budi Santoso, S.Kom',
    userRole: 'pengguna',
    action: 'LOGIN',
    severity: 'INFO',
    title: 'Sesi Otentikasi Pengguna Berhasil',
    details: 'Pengguna berhasil masuk ke sistem dengan hak akses Staf Pemohon (SMK Negeri 1 Kota Pendidikan).',
    status: 'SUCCESS',
    ipAddress: '192.168.1.80 (Mobile Client)',
    deviceInfo: 'Chrome Mobile / Android 14'
  },
  {
    id: 'audit-sec-006',
    sekolah_id: 'sekolah-smkn1-kota',
    nama_sekolah: 'SMK Negeri 1 Kota Pendidikan',
    timestamp: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    formattedDate: new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(new Date(Date.now() - 1000 * 60 * 420)),
    userId: 'usr-unknown',
    username: 'tamu_unauthorized',
    userName: 'Pengguna Tak Dikenal',
    userRole: 'pengguna',
    action: 'SECURITY_CHECK',
    severity: 'HIGH',
    title: 'Upaya Akses Menu Administratif Ditolak',
    details: 'Sistem menolak otorisasi: Upaya membuka panel manajemen akun oleh akun non-administrator.',
    status: 'WARNING',
    ipAddress: '192.168.1.99',
    deviceInfo: 'Unknown Device',
    meta: { blockedRoute: '/api/admin/users', reason: 'Insufficient RBAC Privileges' }
  }
];

export const getAuditLogs = (): AuditLog[] => {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) {
      // Seed default logs if initial launch
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(DEFAULT_AUDIT_LOGS));
      return DEFAULT_AUDIT_LOGS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(DEFAULT_AUDIT_LOGS));
      return DEFAULT_AUDIT_LOGS;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to parse audit logs:', err);
    return DEFAULT_AUDIT_LOGS;
  }
};

export const saveAuditLogs = (logs: AuditLog[]): void => {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save audit logs:', err);
  }
};

export const logAuditEvent = (params: {
  userId: string;
  username: string;
  userName: string;
  userRole: UserRole;
  action: AuditAction | string;
  title: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  severity?: AuditSeverity;
  sekolah_id?: string;
  nama_sekolah?: string;
  ipAddress?: string;
  deviceInfo?: string;
  meta?: Record<string, unknown>;
}): AuditLog => {
  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(now);

  // Auto determine severity if not provided
  let calculatedSeverity: AuditSeverity = params.severity || 'INFO';
  if (!params.severity) {
    if (params.status === 'FAILED') calculatedSeverity = 'CRITICAL';
    else if (params.status === 'WARNING') calculatedSeverity = 'HIGH';
    else if (params.action.includes('RESET') || params.action.includes('HAPUS')) calculatedSeverity = 'MEDIUM';
    else calculatedSeverity = 'INFO';
  }

  // Device info fallback
  const clientDevice = params.deviceInfo || (typeof navigator !== 'undefined' ? `${navigator.userAgent.slice(0, 40)}...` : 'Web Browser');
  const clientIp = params.ipAddress || '192.168.1.1 (Client)';

  const newLog: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    sekolah_id: params.sekolah_id,
    nama_sekolah: params.nama_sekolah,
    timestamp: now.toISOString(),
    formattedDate,
    userId: params.userId,
    username: params.username,
    userName: params.userName,
    userRole: params.userRole,
    action: params.action,
    title: params.title,
    details: params.details,
    status: params.status,
    severity: calculatedSeverity,
    ipAddress: clientIp,
    deviceInfo: clientDevice,
    meta: params.meta
  };

  const current = getAuditLogs();
  // Keep the latest 500 logs for multi-tenant audit
  const updated = [newLog, ...current].slice(0, 500);
  saveAuditLogs(updated);

  return newLog;
};

export const clearAuditLogs = (): void => {
  localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify([]));
};

export const resetAuditLogsToDefault = (): AuditLog[] => {
  localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(DEFAULT_AUDIT_LOGS));
  return DEFAULT_AUDIT_LOGS;
};

export const exportAuditLogsToJSON = (logsToExport?: AuditLog[]): void => {
  const logs = logsToExport || getAuditLogs();
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Audit_Log_SIMBA_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportAuditLogsToCSV = (logsToExport?: AuditLog[]): void => {
  const logs = logsToExport || getAuditLogs();
  const headers = ['Waktu', 'Tingkat Keparahan', 'Satuan Pendidikan', 'Pengguna', 'Username', 'Peran', 'Aksi', 'Status', 'Judul', 'Keterangan Rinci', 'IP / Perangkat'];
  const rows = logs.map(l => [
    `"${l.formattedDate || l.timestamp}"`,
    `"${l.severity || 'INFO'}"`,
    `"${l.nama_sekolah || l.sekolah_id || 'Global / Dinas'}"`,
    `"${l.userName}"`,
    `"${l.username}"`,
    `"${l.userRole}"`,
    `"${l.action}"`,
    `"${l.status}"`,
    `"${(l.title || '').replace(/"/g, '""')}"`,
    `"${(l.details || '').replace(/"/g, '""')}"`,
    `"${l.ipAddress || ''}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Audit_Log_SIMBA_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Calculates security health and compliance metrics across tenants
 */
export const calculateSecurityMetrics = (logs: AuditLog[], sekolahList: Sekolah[] = []) => {
  let successCount = 0;
  let warningCount = 0;
  let failedCount = 0;
  let criticalCount = 0;

  logs.forEach(log => {
    if (log.status === 'SUCCESS') successCount++;
    else if (log.status === 'WARNING') warningCount++;
    else if (log.status === 'FAILED') failedCount++;

    if (log.severity === 'CRITICAL' || log.severity === 'HIGH') criticalCount++;
  });

  const total = logs.length;
  // Score formula: starts at 100, drops slightly if failed/warning exist
  let healthScore = 100;
  if (total > 0) {
    const deduction = (failedCount * 8) + (warningCount * 3);
    healthScore = Math.max(70, 100 - deduction);
  }

  return {
    total,
    successCount,
    warningCount,
    failedCount,
    criticalCount,
    healthScore,
    tenantCount: sekolahList.length,
    isolationActive: true,
    lastAuditTimestamp: logs[0]?.formattedDate || 'Belum ada kejadian'
  };
};
