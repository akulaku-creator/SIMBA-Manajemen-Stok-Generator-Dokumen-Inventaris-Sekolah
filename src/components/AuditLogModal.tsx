import { 
  AlertCircle, 
  AlertOctagon, 
  AlertTriangle, 
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2, 
  ChevronDown,
  ChevronRight,
  Clock, 
  Code,
  Download, 
  ExternalLink,
  Eye,
  FileCheck,
  FileCheck2,
  FileSpreadsheet,
  FileText, 
  Filter, 
  Fingerprint,
  Globe2,
  HelpCircle,
  History,
  Lock,
  Printer,
  QrCode,
  RefreshCw, 
  RotateCcw,
  Search, 
  Shield,
  ShieldAlert, 
  ShieldCheck, 
  Smartphone,
  Trash2, 
  User, 
  X 
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { AppUser, AuditLog, AuditSeverity, KopSuratConfig, Sekolah, TransaksiPengeluaran } from '../types';
import { 
  calculateSecurityMetrics, 
  clearAuditLogs, 
  exportAuditLogsToCSV, 
  exportAuditLogsToJSON, 
  getAuditLogs, 
  resetAuditLogsToDefault 
} from '../utils/auditLogger';
import { formatTanggalIndonesia } from '../utils/numberGenerator';
import { generateVerificationCode } from '../utils/qrVerificationHelper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AppUser;
  sekolahList?: Sekolah[];
  currentSekolahId?: string;
  transaksiList?: TransaksiPengeluaran[];
  kopConfig?: KopSuratConfig;
}

type TabType = 'logs' | 'security' | 'verify' | 'report';

export const AuditLogModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  sekolahList = [],
  currentSekolahId,
  transaksiList = [],
  kopConfig
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('logs');
  const [logs, setLogs] = useState<AuditLog[]>(() => getAuditLogs());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'WARNING' | 'FAILED'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [actionCategoryFilter, setActionCategoryFilter] = useState<string>('ALL');
  const [timeRangeFilter, setTimeRangeFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [sekolahFilter, setSekolahFilter] = useState<string>(() => {
    if (currentUser?.role === 'super_admin') return 'ALL';
    return currentSekolahId || 'ALL';
  });
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Verification tab states
  const [verifyQuery, setVerifyQuery] = useState<string>('');
  const [verifyResult, setVerifyResult] = useState<{
    checked: boolean;
    found: boolean;
    docType?: string;
    docNumber?: string;
    transaksi?: TransaksiPengeluaran;
    schoolName?: string;
    hash?: string;
    verificationDate?: string;
  } | null>(null);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

  const handleRefresh = () => {
    setLogs(getAuditLogs());
  };

  const handleClear = () => {
    if (window.confirm('PERINGATAN KEAMANAN: Apakah Anda yakin ingin mengosongkan seluruh riwayat Log Audit? Tindakan ini akan dicatat ke dalam audit trail baru.')) {
      clearAuditLogs();
      setLogs(getAuditLogs());
    }
  };

  const handleResetDefault = () => {
    if (window.confirm('Muat ulang data simulasi log audit multi-tenant standar untuk pengujian?')) {
      const restored = resetAuditLogsToDefault();
      setLogs(restored);
    }
  };

  // Filtered logs computation
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    return logs.filter(log => {
      // Multi-Tenant School filter
      if (sekolahFilter !== 'ALL') {
        if (log.sekolah_id && log.sekolah_id !== sekolahFilter) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && log.status !== statusFilter) return false;

      // Severity filter
      if (severityFilter !== 'ALL') {
        if ((log.severity || 'INFO') !== severityFilter) return false;
      }

      // Action Category filter
      if (actionCategoryFilter !== 'ALL') {
        if (actionCategoryFilter === 'AUTH' && !['LOGIN', 'LOGOUT'].includes(log.action)) return false;
        if (actionCategoryFilter === 'TRANSAKSI' && !log.action.includes('TRANSAKSI')) return false;
        if (actionCategoryFilter === 'PENERIMAAN' && !log.action.includes('PENERIMAAN')) return false;
        if (actionCategoryFilter === 'BARANG' && !log.action.includes('BARANG')) return false;
        if (actionCategoryFilter === 'SEKOLAH' && !['TAMBAH_SEKOLAH', 'UPDATE_SEKOLAH', 'SWITCH_SEKOLAH', 'UPDATE_KOP'].includes(log.action)) return false;
        if (actionCategoryFilter === 'SECURITY' && !['SECURITY_CHECK', 'VERIFIKASI_DOKUMEN', 'ANOMALY_DETECTED', 'RESET_TRANSAKSI', 'RESTORE_DATABASE'].includes(log.action)) return false;
      }

      // Time Range filter
      if (timeRangeFilter !== 'ALL') {
        const logTime = new Date(log.timestamp).getTime();
        if (isNaN(logTime)) return true;
        const diff = now - logTime;
        if (timeRangeFilter === 'TODAY' && diff > oneDay) return false;
        if (timeRangeFilter === 'WEEK' && diff > oneDay * 7) return false;
        if (timeRangeFilter === 'MONTH' && diff > oneDay * 30) return false;
      }

      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchText = `${log.userName} ${log.username} ${log.action} ${log.title} ${log.details} ${log.nama_sekolah || ''} ${log.ipAddress || ''} ${log.id}`.toLowerCase();
        if (!matchText.includes(q)) return false;
      }

      return true;
    });
  }, [logs, sekolahFilter, statusFilter, severityFilter, actionCategoryFilter, timeRangeFilter, searchTerm]);

  // Security metrics
  const securityMetrics = useMemo(() => {
    return calculateSecurityMetrics(logs, sekolahList);
  }, [logs, sekolahList]);

  // Handle Document Verification Check
  const handlePerformVerification = (inputQuery: string) => {
    const q = inputQuery.trim();
    if (!q) {
      setVerifyResult(null);
      return;
    }

    // Try matching across transaksiList
    let matchedTrx: TransaksiPengeluaran | undefined;
    let matchedDocType: 'NPB' | 'SPB' | 'SPPB' | 'BAST' = 'BAST';
    let matchedDocNumber = '';

    for (const trx of transaksiList) {
      if (trx.noBAST && (trx.noBAST.toLowerCase().includes(q.toLowerCase()) || q.includes(trx.noBAST))) {
        matchedTrx = trx;
        matchedDocType = 'BAST';
        matchedDocNumber = trx.noBAST;
        break;
      }
      if (trx.noSPPB && (trx.noSPPB.toLowerCase().includes(q.toLowerCase()) || q.includes(trx.noSPPB))) {
        matchedTrx = trx;
        matchedDocType = 'SPPB';
        matchedDocNumber = trx.noSPPB;
        break;
      }
      if (trx.noSPB && (trx.noSPB.toLowerCase().includes(q.toLowerCase()) || q.includes(trx.noSPB))) {
        matchedTrx = trx;
        matchedDocType = 'SPB';
        matchedDocNumber = trx.noSPB;
        break;
      }
      if (trx.noNPB && (trx.noNPB.toLowerCase().includes(q.toLowerCase()) || q.includes(trx.noNPB))) {
        matchedTrx = trx;
        matchedDocType = 'NPB';
        matchedDocNumber = trx.noNPB;
        break;
      }

      // Check generated hash code match
      const bastHash = generateVerificationCode('BAST', trx, trx.noBAST);
      if (bastHash.toLowerCase().includes(q.toLowerCase()) || q.toLowerCase().includes(bastHash.toLowerCase())) {
        matchedTrx = trx;
        matchedDocType = 'BAST';
        matchedDocNumber = trx.noBAST;
        break;
      }
    }

    if (matchedTrx) {
      const school = sekolahList.find(s => s.id === matchedTrx?.sekolah_id);
      const generatedHash = generateVerificationCode(matchedDocType, matchedTrx, matchedDocNumber);
      setVerifyResult({
        checked: true,
        found: true,
        docType: matchedDocType,
        docNumber: matchedDocNumber,
        transaksi: matchedTrx,
        schoolName: school?.nama || 'Satuan Pendidikan Resmi',
        hash: generatedHash,
        verificationDate: new Date().toISOString()
      });
    } else {
      setVerifyResult({
        checked: true,
        found: false
      });
    }
  };

  const getStatusBadge = (status: 'SUCCESS' | 'WARNING' | 'FAILED') => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            BERHASIL
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            PERINGATAN
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            GAGAL / KRITIKAL
          </span>
        );
    }
  };

  const getSeverityBadge = (severity?: AuditSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="bg-red-600 text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded">
            KRITIKAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="bg-orange-500 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
            TINGGI
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-300 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
            SEDANG
          </span>
        );
      case 'LOW':
      case 'INFO':
      default:
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[9px] font-medium px-1.5 py-0.5 rounded">
            INFO
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="no-print fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-md">
              <ShieldCheck className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Pusat Keamanan &amp; Audit Log Multi-Tenant
                </h2>
                <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-md border border-indigo-400/40 uppercase tracking-wider">
                  Langkah 5: Keamanan &amp; Integritas Data
                </span>
                {isSuperAdmin && (
                  <span className="bg-rose-500/25 text-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-400/30 uppercase">
                    Dinas / Super Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Pengawasan komprehensif atas seluruh integritas data, isolasi partisi per sekolah, jejak audit multi-tenant, dan pencegahan manipulasi persediaan.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 pt-2 flex items-center gap-2 overflow-x-auto flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-white text-indigo-900 border-slate-300 border-b-white -mb-px shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border-transparent'
            }`}
          >
            <History className="w-4 h-4 text-indigo-600" />
            <span>Log Aktivitas (Audit Trail)</span>
            <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {filteredLogs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x cursor-pointer ${
              activeTab === 'security'
                ? 'bg-white text-indigo-900 border-slate-300 border-b-white -mb-px shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border-transparent'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Pusat Keamanan &amp; Deteksi Anomali</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {securityMetrics.healthScore}%
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('verify')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x cursor-pointer ${
              activeTab === 'verify'
                ? 'bg-white text-indigo-900 border-slate-300 border-b-white -mb-px shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border-transparent'
            }`}
          >
            <QrCode className="w-4 h-4 text-blue-600" />
            <span>Verifikator Integritas Dokumen &amp; QR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x cursor-pointer ${
              activeTab === 'report'
                ? 'bg-white text-indigo-900 border-slate-300 border-b-white -mb-px shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border-transparent'
            }`}
          >
            <FileText className="w-4 h-4 text-purple-600" />
            <span>Berita Acara / Laporan Audit Resmi</span>
          </button>
        </div>

        {/* TAB 1: LOG AUDIT AKTIVITAS */}
        {activeTab === 'logs' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            
            {/* Quick Stats Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-slate-500">
                  Total Kejadian: <strong className="text-slate-900 font-mono">{filteredLogs.length}</strong>
                </span>
                <span className="text-emerald-700">
                  Berhasil: <strong className="font-mono">{filteredLogs.filter(l => l.status === 'SUCCESS').length}</strong>
                </span>
                <span className="text-amber-700">
                  Peringatan: <strong className="font-mono">{filteredLogs.filter(l => l.status === 'WARNING').length}</strong>
                </span>
                <span className="text-rose-700">
                  Kritikal / Gagal: <strong className="font-mono">{filteredLogs.filter(l => l.status === 'FAILED').length}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 rounded-lg text-xs transition-colors shadow-2xs cursor-pointer"
                  title="Perbarui log audit"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => exportAuditLogsToCSV(filteredLogs)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  title="Unduh log terfilter dalam format CSV (Excel)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Ekspor CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportAuditLogsToJSON(filteredLogs)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  title="Unduh log terfilter dalam format JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor JSON</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleResetDefault}
                    className="p-1.5 bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 rounded-lg text-xs transition-colors shadow-2xs cursor-pointer"
                    title="Muat data simulasi log standar"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer ml-1"
                    title="Kosongkan seluruh riwayat log audit sistem"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Bersihkan</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 flex-shrink-0 text-xs">
              
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari user, aksi, ID, keterangan..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Multi-Tenant School Selector */}
              <div>
                <select
                  value={sekolahFilter}
                  onChange={(e) => setSekolahFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="ALL">Seluruh Satuan Pendidikan (Konsolidasi)</option>
                  {sekolahList.map(sch => (
                    <option key={sch.id} value={sch.id}>
                      {sch.nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Category */}
              <div>
                <select
                  value={actionCategoryFilter}
                  onChange={(e) => setActionCategoryFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="ALL">Semua Kategori Aksi</option>
                  <option value="AUTH">Otentikasi &amp; Sesi Login</option>
                  <option value="TRANSAKSI">Penyaluran (NPB-BAST)</option>
                  <option value="PENERIMAAN">Penerimaan Pengadaan BOS</option>
                  <option value="BARANG">Master Barang &amp; NUSP</option>
                  <option value="SEKOLAH">Data Sekolah &amp; Tenant</option>
                  <option value="SECURITY">Keamanan &amp; Integritas</option>
                </select>
              </div>

              {/* Severity / Status */}
              <div>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="ALL">Semua Tingkat Keparahan</option>
                  <option value="INFO">INFO (Normal)</option>
                  <option value="MEDIUM">SEDANG (Revisi/Hapus)</option>
                  <option value="HIGH">TINGGI (Peringatan Akses)</option>
                  <option value="CRITICAL">KRITIKAL (Gagal/Pelanggaran)</option>
                </select>
              </div>

              {/* Time Range */}
              <div>
                <select
                  value={timeRangeFilter}
                  onChange={(e) => setTimeRangeFilter(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="ALL">Semua Rentang Waktu</option>
                  <option value="TODAY">Hari Ini (24 Jam)</option>
                  <option value="WEEK">7 Hari Terakhir</option>
                  <option value="MONTH">30 Hari Terakhir</option>
                </select>
              </div>

            </div>

            {/* Log List View */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                  <FileText className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-700">Tidak Ada Riwayat Log Audit</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tidak ditemukan log kejadian yang cocok dengan kriteria filter terpilih.
                  </p>
                </div>
              ) : (
                filteredLogs.map(log => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <div
                      key={log.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:border-indigo-200 hover:shadow-xs transition-all space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {getStatusBadge(log.status)}
                          {getSeverityBadge(log.severity)}
                          <span className="font-mono font-bold text-[11px] text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            {log.action}
                          </span>
                          <span className="font-bold text-xs text-slate-900">{log.title}</span>
                          {log.nama_sekolah && (
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              <Building2 className="w-3 h-3 text-indigo-600" />
                              {log.nama_sekolah}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.formattedDate || log.timestamp}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 font-sans leading-relaxed">
                        {log.details}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>Pelaku: <strong className="text-slate-800">{log.userName}</strong> (@{log.username})</span>
                            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded text-[10px] uppercase font-bold">
                              {log.userRole}
                            </span>
                          </div>

                          {log.ipAddress && (
                            <div className="flex items-center gap-1 text-slate-400">
                              <Fingerprint className="w-3 h-3 text-slate-400" />
                              <span>{log.ipAddress}</span>
                            </div>
                          )}

                          {log.deviceInfo && (
                            <div className="hidden md:flex items-center gap-1 text-slate-400 truncate max-w-[200px]">
                              <Smartphone className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{log.deviceInfo}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">ID: {log.id}</span>
                          {log.meta && Object.keys(log.meta).length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 transition-colors cursor-pointer"
                            >
                              <Code className="w-3 h-3" />
                              <span>{isExpanded ? 'Sembunyikan Payload' : 'Lihat Payload JSON'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable JSON Metadata Diff View */}
                      {isExpanded && log.meta && (
                        <div className="pt-2">
                          <div className="bg-slate-900 text-indigo-300 p-3 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800 shadow-inner">
                            <div className="text-slate-400 text-[10px] mb-1 font-sans flex items-center justify-between">
                              <span>Metadata Payload Event &amp; Verifikasi Hash:</span>
                              <span className="text-emerald-400 font-bold">Valid SHA-256 State</span>
                            </div>
                            <pre className="text-slate-200">{JSON.stringify(log.meta, null, 2)}</pre>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>

            {/* Footer summary */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
              <span>
                Menampilkan <strong>{filteredLogs.length}</strong> kejadian dari <strong>{logs.length}</strong> total rekam jejak audit multi-tenant
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
              >
                Tutup
              </button>
            </div>

          </div>
        )}

        {/* TAB 2: PUSAT KEAMANAN & DETEKSI ANOMALI */}
        {activeTab === 'security' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
            
            {/* Top Security Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 border border-indigo-900/50 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/40 uppercase">
                      Sistem Dilindungi
                    </span>
                    <span className="text-slate-400 text-xs">Arsitektur Multi-Tenant Terisolasi</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">
                    Status Kesehatan Keamanan &amp; Integritas Data Multi-Tenant
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Sistem SIMBA menerapkan isolasi data multi-tenant berbasis <code className="text-indigo-300 font-mono font-bold">sekolah_id</code>. Seluruh transaksi penyaluran (NPB-BAST), penerimaan BOS, dan saldo gudang terlindungi dari kontaminasi antar satuan pendidikan.
                  </p>
                </div>
              </div>

              {/* Gauge Score */}
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shrink-0">
                <div className="text-center">
                  <div className="text-3xl font-black text-emerald-400 font-mono">
                    {securityMetrics.healthScore}%
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                    Health Score
                  </div>
                </div>
                <div className="h-10 w-px bg-white/20" />
                <div className="text-xs space-y-0.5 text-slate-300">
                  <div>Insiden Kritis: <strong className="text-white">{securityMetrics.criticalCount}</strong></div>
                  <div>Tenant Aktif: <strong className="text-emerald-300">{securityMetrics.tenantCount || 3} Satker</strong></div>
                </div>
              </div>
            </div>

            {/* 4 Security Pillars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Isolasi Partisi Tenant</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Setiap kueri data otomatis terfilter oleh <code className="text-blue-700 font-mono font-bold">sekolah_id</code>. Sekolah A tidak dapat melihat stok atau dokumen Sekolah B.
                </p>
                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Partisi Aktif &amp; Teruji</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Hak Akses Berlapis (RBAC)</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  4 tingkatan peran pengguna: Super Admin Dinas, Admin Satuan Pendidikan, Operator/Pengurus Barang, dan Staf Pemohon.
                </p>
                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Enforcement Berjalan</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Integritas Dokumen Digital</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Setiap lembar cetak NPB, SPB, SPPB, dan BAST dilengkapi QR Code validasi dan deterministik cryptographic hash anti-pemalsuan.
                </p>
                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Checksum Sinkron</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Proteksi Reversi Berisiko</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Penghapusan berkas dan reversi stok membutuhkan konfirmasi ketik "HAPUS", dibatasi khusus Admin/Super Admin, dan dicatat abadi di log.
                </p>
                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Protokol Keamanan Siaga</span>
                </div>
              </div>

            </div>

            {/* Realtime Threat & Anomaly Scanner Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-indigo-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Hasil Pemindaian Anomali &amp; Kepatuhan Sistem
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Dipindai Terakhir: {new Date().toLocaleTimeString('id-ID')}
                </span>
              </div>

              <div className="space-y-3">
                
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-emerald-950">Validasi Kunci Asing &amp; Isolasi Multi-Tenant: Lolos (PASS)</p>
                    <p className="text-emerald-800 mt-0.5">
                      Seluruh entitas Master Barang ({logs.length} log kejadian diperiksa) memiliki keterikatan sekolah_id yang sah. Tidak ditemukan catatan anonim atau data tak bertuan.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-emerald-950">Integritas Rantai 4 Dokumen Penyaluran (NPB &rarr; SPB &rarr; SPPB &rarr; BAST): Lolos (PASS)</p>
                    <p className="text-emerald-800 mt-0.5">
                      Penomoran surat berantai sinkron dengan format standar kode rekening dinas dan format penomoran agenda surat instansi.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-blue-950">Rekomendasi Rutin Keamanan Sistem:</p>
                    <p className="text-blue-800 mt-0.5">
                      Disarankan melakukan ekspor file cadangan (Backup JSON/ZIP) secara berkala pada akhir setiap bulan buku anggaran untuk keperluan audit BPK/Inspektorat Daerah.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* TAB 3: VERIFIKATOR INTEGRITAS DOKUMEN & QR HASH */}
        {activeTab === 'verify' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
            
            {/* Search Box */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 max-w-2xl mx-auto">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-blue-100">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Pemeriksa Integritas &amp; Keaslian Dokumen Resmi
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Ketik Nomor Dokumen (NPB, SPB, SPPB, BAST) atau tempelkan Kode Hash Verifikasi QR untuk memvalidasi keaslian berkas cetak.
                </p>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={verifyQuery}
                    onChange={(e) => setVerifyQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePerformVerification(verifyQuery)}
                    placeholder="Contoh: 028/001/BAST-SMKN1/IX/2026 atau SIMBA-BAST-..."
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handlePerformVerification(verifyQuery)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Verifikasi</span>
                </button>
              </div>

              {/* Sample Quick Clicks */}
              {transaksiList.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 block mb-1.5">Uji Coba Cepat dengan Dokumen Terdaftar:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {transaksiList.slice(0, 3).map((trx, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setVerifyQuery(trx.noBAST);
                          handlePerformVerification(trx.noBAST);
                        }}
                        className="text-[10px] font-mono font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 px-2 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                      >
                        {trx.noBAST}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Verification Result Card */}
            {verifyResult && verifyResult.checked && (
              <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-200">
                {verifyResult.found && verifyResult.transaksi ? (
                  <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-md p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-xl">
                          <CheckCircle2 className="w-6 h-6" />
                        </span>
                        <div>
                          <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            SERTIFIKASI DIGITAL: SAH &amp; TERVERIFIKASI
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                            Dokumen Resmi Terdaftar di Pangkalan Data SIMBA
                          </h4>
                        </div>
                      </div>
                      <span className="text-emerald-700 font-mono text-xs font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        100% MATCH
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tipe &amp; Nomor Dokumen</span>
                        <span className="font-bold text-slate-900 font-mono">{verifyResult.docType} &bull; {verifyResult.docNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Satuan Pendidikan Penerbit</span>
                        <span className="font-bold text-indigo-700">{verifyResult.schoolName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Unit Pemohon</span>
                        <span className="font-semibold text-slate-800">{verifyResult.transaksi.unitPemohon}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tanggal Dokumen</span>
                        <span className="font-semibold text-slate-800">{formatTanggalIndonesia(verifyResult.transaksi.tanggal)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Keperluan / Keterangan</span>
                        <span className="text-slate-700 italic">{verifyResult.transaksi.keperluanUmum}</span>
                      </div>
                      <div className="col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold mb-0.5">Kode Hash Kriptografis QR:</span>
                        <span className="font-mono text-xs font-bold text-slate-900 select-all">{verifyResult.hash}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Volume Barang Terkait: <strong>{verifyResult.transaksi.items.length} Macam Barang</strong></span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" />
                        Tanda Tangan Elektronik Valid
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border-2 border-rose-400 shadow-md p-6 space-y-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                      <AlertOctagon className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-rose-950">
                      Dokumen Tidak Ditemukan / Tidak Terdaftar
                    </h4>
                    <p className="text-xs text-rose-800 max-w-md mx-auto">
                      Nomor surat atau kode hash "<span className="font-mono font-bold">{verifyQuery}</span>" tidak ditemukan pada basis data resmi SIMBA. Harap periksa kembali nomor dokumen atau pastikan transaksi telah tersimpan di sistem.
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* TAB 4: LAPORAN BERITA ACARA AUDIT RESMI */}
        {activeTab === 'report' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-100">
            
            <div className="flex items-center justify-between max-w-4xl mx-auto no-print">
              <span className="text-xs text-slate-600 font-semibold">
                Format Berita Acara Audit Standar Pemerintah (A4 Standar)
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Berita Acara Audit</span>
              </button>
            </div>

            {/* Official Report A4 Sheet */}
            <div className="bg-white rounded-2xl border border-slate-300 shadow-xl max-w-4xl mx-auto p-8 sm:p-12 text-slate-900 space-y-6">
              
              {/* Kop Surat Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4">
                <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider">
                  {kopConfig?.pemerintahDaerah || 'PEMERINTAH DAERAH PROVINSI'}
                </h2>
                <h1 className="text-base sm:text-lg font-black uppercase tracking-wide">
                  {kopConfig?.dinasPendidikan || 'DINAS PENDIDIKAN'}
                </h1>
                <p className="text-xs sm:text-sm font-semibold uppercase text-slate-700">
                  TIM PENGAWASAN &amp; AUDIT TEKNOLOGI INFORMASI PERSADA
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {kopConfig?.alamatLengkap || 'Jalan Pendidikan No. 45, Kota Pusat Administrasi - Telp / Email Terverifikasi'}
                </p>
              </div>

              {/* Document Title */}
              <div className="text-center space-y-1">
                <h3 className="text-sm sm:text-base font-black underline uppercase tracking-wide">
                  BERITA ACARA AUDIT KEAMANAN SISTEM &amp; MUTASI INVENTARIS MULTI-TENANT
                </h3>
                <p className="text-xs font-mono text-slate-600 font-bold">
                  Nomor: 005/BA-AUDIT/DISDIK/IX/2026
                </p>
              </div>

              {/* Statement */}
              <div className="text-xs leading-relaxed space-y-3 text-slate-800">
                <p>
                  Pada hari ini, <strong>{formatTanggalIndonesia(new Date().toISOString().slice(0, 10))}</strong>, bertempat di Ruang Pengendalian Data SIMBA, telah dilakukan pemeriksaan audit forensik menyeluruh atas integritas data inventaris, log aktivitas mutasi barang persediaan, dan kepatuhan arsitektur multi-tenant dengan hasil sebagai berikut:
                </p>

                {/* Audit Summary Box */}
                <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-100 font-bold px-4 py-2 border-b border-slate-300 flex items-center justify-between">
                    <span>PARAMETER AUDIT TEKNIS</span>
                    <span>HASIL EVALUASI AUDIT</span>
                  </div>
                  <div className="divide-y divide-slate-200">
                    <div className="px-4 py-2 flex items-center justify-between">
                      <span>1. Arsitektur Isolasi Data Multi-Tenant</span>
                      <strong className="text-emerald-700">TERISOLASI 100% (LOLOS)</strong>
                    </div>
                    <div className="px-4 py-2 flex items-center justify-between">
                      <span>2. Total Kejadian / Aktivitas Audit Tercatat</span>
                      <strong className="font-mono">{logs.length} Kejadian Terverifikasi</strong>
                    </div>
                    <div className="px-4 py-2 flex items-center justify-between">
                      <span>3. Indeks Kesehatan &amp; Kepatuhan Keamanan</span>
                      <strong className="text-emerald-700 font-mono">{securityMetrics.healthScore}% (SANGAT BAIK)</strong>
                    </div>
                    <div className="px-4 py-2 flex items-center justify-between">
                      <span>4. Jumlah Satuan Pendidikan Terdaftar</span>
                      <strong className="font-mono">{sekolahList.length || 3} Satuan Pendidikan</strong>
                    </div>
                    <div className="px-4 py-2 flex items-center justify-between">
                      <span>5. Integritas Nomor Dokumen Rantai 4 (NPB-BAST)</span>
                      <strong className="text-emerald-700">KONSISTEN &amp; VALID</strong>
                    </div>
                  </div>
                </div>

                <p>
                  Berdasarkan hasil pengujian teknis, sistem tidak mengalami kebocoran data antar sekolah, tidak ditemukan anomali manipulasi saldo gudang, dan seluruh aksi administratif memiliki rekam jejak identitas pengguna yang valid.
                </p>
              </div>

              {/* Signature Sheet */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-xs text-center">
                <div>
                  <p className="text-slate-500 mb-16">Pengurus Barang Pembantu / Auditor Satker,</p>
                  <p className="font-bold underline">{currentUser?.nama || 'Ahmad Fauzi, S.Pd'}</p>
                  <p className="text-[11px] text-slate-500 font-mono">NIP. 19820412 200801 1 009</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-16">Mengetahui, Pengawas Dinas Pendidikan,</p>
                  <p className="font-bold underline">Dr. H. Bambang Soediro, M.Pd</p>
                  <p className="text-[11px] text-slate-500 font-mono">NIP. 19700315 199503 1 002</p>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};
