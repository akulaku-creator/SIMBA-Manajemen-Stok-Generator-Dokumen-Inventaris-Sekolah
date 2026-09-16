import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Download, 
  FileText, 
  Filter, 
  RefreshCw, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  User, 
  X 
} from 'lucide-react';
import React, { useState } from 'react';
import { AuditLog } from '../types';
import { clearAuditLogs, exportAuditLogsToJSON, getAuditLogs } from '../utils/auditLogger';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLog[]>(() => getAuditLogs());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'WARNING' | 'FAILED'>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  if (!isOpen) return null;

  const handleRefresh = () => {
    setLogs(getAuditLogs());
  };

  const handleClear = () => {
    if (window.confirm('Apakah Anda yakin ingin mengosongkan seluruh riwayat Log Audit Keamanan? Tindakan ini tidak dapat dibatalkan.')) {
      clearAuditLogs();
      setLogs([]);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (statusFilter !== 'ALL' && log.status !== statusFilter) return false;
    if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchText = `${log.userName} ${log.username} ${log.action} ${log.title} ${log.details}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

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
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200">
            <AlertCircle className="w-3 h-3 text-red-600" />
            GAGAL / DITOLAK
          </span>
        );
    }
  };

  return (
    <div className="no-print fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Log Audit Keamanan &amp; Riwayat Tindakan</h2>
                <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-purple-400/30 uppercase">
                  Khusus Admin
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Pencatatan digital seluruh aksi kritikal, verifikasi autentikasi, dan manipulasi data sistem
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search, Filters & Actions */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari user, aksi, kata kunci..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="ALL">Semua Status</option>
              <option value="SUCCESS">Berhasil Saja</option>
              <option value="WARNING">Peringatan Saja</option>
              <option value="FAILED">Gagal / Ditolak</option>
            </select>

            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="ALL">Semua Tipe Aksi</option>
              <option value="RESET_TRANSAKSI">Kosongkan Transaksi</option>
              <option value="LOGIN">Sesi Login</option>
              <option value="LOGOUT">Sesi Logout</option>
              <option value="TAMBAH_TRANSAKSI">Penyaluran Barang</option>
              <option value="TAMBAH_PENERIMAAN">Penerimaan BOS</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg text-xs transition-colors shadow-2xs"
              title="Perbarui data log"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={exportAuditLogsToJSON}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
              title="Unduh seluruh data log dalam format JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Log</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
              title="Kosongkan seluruh riwayat log audit"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bersihkan</span>
            </button>
          </div>
        </div>

        {/* Log List View */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-10 h-10 mx-auto stroke-1 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">Belum Ada Riwayat Log Audit</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Setiap aktivitas login, penyaluran, dan reset data akan tercatat otomatis di sini.
              </p>
            </div>
          ) : (
            filteredLogs.map(log => (
              <div
                key={log.id}
                className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-slate-300 transition-all space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(log.status)}
                    <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                    <span className="font-bold text-xs text-slate-900">{log.title}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{log.formattedDate}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 bg-slate-50/70 p-2 rounded-lg border border-slate-100 font-sans leading-relaxed">
                  {log.details}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Pelaku: <strong className="text-slate-800">{log.userName}</strong> (@{log.username})</span>
                    <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded text-[10px] uppercase font-bold">
                      {log.userRole}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">ID: {log.id}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <span>Menampilkan <strong>{filteredLogs.length}</strong> dari <strong>{logs.length}</strong> entri audit</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
