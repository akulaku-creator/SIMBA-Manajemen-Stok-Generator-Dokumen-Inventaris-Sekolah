import { 
  AlertCircle, 
  AlertOctagon, 
  AlertTriangle, 
  Check, 
  CheckCircle2, 
  Database, 
  Eye, 
  EyeOff, 
  FileText, 
  Info, 
  KeyRound, 
  Lock, 
  Package, 
  RotateCcw, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  X 
} from 'lucide-react';
import React, { useState } from 'react';
import { AppUser } from '../types';
import { logAuditEvent } from '../utils/auditLogger';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transaksiCount: number;
  penerimaanCount: number;
  onConfirmReset: (restoreToStokAwal: boolean) => void;
  currentUser: AppUser;
  onOpenAuditLog?: () => void;
}

export const ResetTransaksiModal: React.FC<Props> = ({
  isOpen,
  onClose,
  transaksiCount,
  penerimaanCount,
  onConfirmReset,
  currentUser,
  onOpenAuditLog
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [alasanReset, setAlasanReset] = useState('');
  const [restoreStock, setRestoreStock] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isAdmin = currentUser.role === 'admin';
  const REQUIRED_KEYWORD = 'KOSONGKAN TRANSAKSI';
  const isKeywordMatch = confirmText.trim().toUpperCase() === REQUIRED_KEYWORD;
  const isFormValid = isKeywordMatch && adminPin.trim().length > 0 && isAdmin;

  const handleExecute = () => {
    setErrorMsg('');

    if (!isAdmin) {
      setErrorMsg('Akses Ditolak: Hanya pengguna dengan peran Administrator yang berwenang mengosongkan data transaksi.');
      return;
    }

    if (!isKeywordMatch) {
      setErrorMsg(`Ketik kalimat persetujuan "${REQUIRED_KEYWORD}" secara tepat.`);
      return;
    }

    // Verify Admin PIN / Password (default: 123456 or admin password)
    const validPin = currentUser.pin || '123456';
    const validPassword = currentUser.password || 'admin';
    const entered = adminPin.trim();

    if (entered !== validPin && entered !== validPassword && entered !== '123456') {
      logAuditEvent({
        userId: currentUser.id,
        username: currentUser.username,
        userName: currentUser.nama,
        userRole: currentUser.role,
        action: 'RESET_TRANSAKSI',
        title: 'Gagal Verifikasi PIN Reset Transaksi',
        details: `Percobaan pengosongan transaksi ditolak: PIN/Password admin salah dimasukkan oleh @${currentUser.username}`,
        status: 'FAILED'
      });
      setErrorMsg('PIN atau Kata Sandi Admin yang dimasukkan salah. (Default PIN: 123456)');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      // Record Audit Trail Log
      logAuditEvent({
        userId: currentUser.id,
        username: currentUser.username,
        userName: currentUser.nama,
        userRole: currentUser.role,
        action: 'RESET_TRANSAKSI',
        title: 'Pengosongan Riwayat Transaksi Berhasil',
        details: `Admin ${currentUser.nama} (@${currentUser.username}) mengosongkan ${transaksiCount} transaksi penyaluran dan ${penerimaanCount} penerimaan barang masuk BOS. Perlakuan stok: ${restoreStock ? 'Kembalikan stok sekarang ke stok awal' : 'Pertahankan angka stok berjalan'}. Alasan: "${alasanReset || 'Pembersihan data berkala / Tutup buku anggaran'}".`,
        status: 'SUCCESS',
        meta: {
          transaksiDihapus: transaksiCount,
          penerimaanDihapus: penerimaanCount,
          kembalikanStok: restoreStock,
          alasan: alasanReset || '-'
        }
      });

      onConfirmReset(restoreStock);
      setIsProcessing(false);
      setConfirmText('');
      setAdminPin('');
      setAlasanReset('');
      onClose();
    }, 450);
  };

  return (
    <div className="no-print fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden ring-1 ring-red-500/20">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Keamanan Reset Data: Kosongkan Transaksi</h3>
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  Khusus Admin
                </span>
              </div>
              <p className="text-xs text-red-100 mt-0.5">
                Pembersihan seluruh mutasi persediaan dengan verifikasi PIN &amp; pencatatan Log Audit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs text-slate-700 max-h-[78vh] overflow-y-auto">
          
          {/* NON-ADMIN BLOCKED WARNING */}
          {!isAdmin && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex gap-3 text-red-900">
              <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-red-950">Akses Dibatasi (Hak Akses RBAC)</p>
                <p className="mt-1 text-red-800 leading-relaxed">
                  Akun Anda saat ini masuk sebagai <strong>{currentUser.role.toUpperCase()}</strong>. Fitur pengosongan data transaksi hanya dapat dioperasikan oleh <strong>Administrator Sistem</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Warning Banner */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-red-900">
            <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-red-950">
                Peringatan Tindakan Permanen &amp; Audit Trail
              </p>
              <p className="leading-relaxed text-red-800">
                Fitur ini akan menghapus dan mengosongkan seluruh riwayat dokumen transaksi penyaluran dan faktur belanja BOS. Tindakan ini akan dicatat permanen dalam <strong>Log Audit Keamanan</strong>.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-xl flex items-center gap-2 text-xs text-red-900 font-medium">
              <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Details of what is deleted and what is preserved */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Deleted section */}
            <div className="bg-red-50/70 border border-red-200/80 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-red-700 font-bold mb-1.5">
                <Trash2 className="w-4 h-4" />
                <span>Data yang Akan Dihapus:</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-700">
                <li className="flex items-center justify-between py-0.5 border-b border-red-100">
                  <span>Penyaluran (NPB/SPB/SPPB/BAST)</span>
                  <span className="font-mono font-bold text-red-700 bg-red-100/80 px-1.5 py-0.2 rounded">
                    {transaksiCount}
                  </span>
                </li>
                <li className="flex items-center justify-between py-0.5 border-b border-red-100">
                  <span>Penerimaan Barang Masuk (BOS)</span>
                  <span className="font-mono font-bold text-red-700 bg-red-100/80 px-1.5 py-0.2 rounded">
                    {penerimaanCount}
                  </span>
                </li>
                <li className="flex items-center justify-between py-0.5">
                  <span>Riwayat Mutasi Fisik</span>
                  <span className="text-red-700 font-semibold">Dibersihkan</span>
                </li>
              </ul>
            </div>

            {/* Preserved section */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold mb-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Data yang Tetap Aman:</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-700">
                <li className="flex items-center gap-1.5 py-0.5 border-b border-emerald-100">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span><strong>Master Data Barang &amp; NUSP</strong></span>
                </li>
                <li className="flex items-center gap-1.5 py-0.5 border-b border-emerald-100">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span><strong>Kode Rekening Belanja</strong></span>
                </li>
                <li className="flex items-center gap-1.5 py-0.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span><strong>Master Pejabat &amp; Kop Surat</strong></span>
                </li>
              </ul>
            </div>
          </div>

          {/* Stock Treatment Options */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-blue-600" />
              Perlakuan Saldo Fisik Stok Barang:
            </p>
            
            <div className="space-y-1.5">
              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                restoreStock 
                  ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-500/20' 
                  : 'bg-white border-slate-200 hover:bg-slate-100/60'
              }`}>
                <input
                  type="radio"
                  name="stock_choice"
                  checked={restoreStock}
                  onChange={() => setRestoreStock(true)}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-semibold text-slate-900">
                    Kembalikan Stok Sekarang ke Stok Awal (Direkomendasikan)
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Nilai <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">stokSekarang</code> akan disamakan dengan <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">stokAwal</code>.
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                !restoreStock 
                  ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-500/20' 
                  : 'bg-white border-slate-200 hover:bg-slate-100/60'
              }`}>
                <input
                  type="radio"
                  name="stock_choice"
                  checked={!restoreStock}
                  onChange={() => setRestoreStock(false)}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-semibold text-slate-900">
                    Pertahankan Angka Stok Berjalan Saat Ini
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Hanya menghapus riwayat dokumen transaksi, saldo stok fisik barang tidak diubah.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Admin Verification: PIN / Password & Reason */}
          <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-purple-950 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-purple-600" />
                Verifikasi Kata Sandi / PIN Administrator:
              </label>
              <span className="text-[10px] text-purple-700 font-mono">
                Akun: @{currentUser.username} (Default PIN: 123456)
              </span>
            </div>

            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="Masukkan PIN Admin (contoh: 123456)"
                className="w-full pl-3 pr-10 py-2 bg-white border border-purple-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-purple-950 mb-1">
                Alasan / Keperluan Reset Data (Tercatat di Log Audit):
              </label>
              <input
                type="text"
                value={alasanReset}
                onChange={(e) => setAlasanReset(e.target.value)}
                placeholder="Contoh: Tutup Buku Tahun Anggaran 2025 / Persiapan TA 2026"
                className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Safety text confirmation */}
          <div className="bg-amber-50/70 border border-amber-300/80 rounded-xl p-3.5 space-y-2">
            <label className="block font-bold text-slate-900">
              Konfirmasi Frasa Keamanan:
            </label>
            <p className="text-[11px] text-slate-600">
              Ketik kalimat persetujuan berikut: 
              <strong className="text-red-700 bg-red-100/80 px-2 py-0.5 rounded font-mono ml-1">
                {REQUIRED_KEYWORD}
              </strong>
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Ketik "${REQUIRED_KEYWORD}" di sini...`}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500 uppercase"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
            >
              Batal
            </button>
            {onOpenAuditLog && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuditLog();
                }}
                className="text-[11px] text-slate-500 hover:text-purple-700 underline font-medium"
              >
                Lihat Log Audit
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleExecute}
            disabled={!isFormValid || isProcessing}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-md ${
              isFormValid && !isProcessing
                ? 'bg-red-600 hover:bg-red-700 active:scale-98 cursor-pointer'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {isProcessing ? 'Memverifikasi & Mengosongkan...' : 'Kosongkan Seluruh Riwayat Transaksi'}
          </button>
        </div>
      </div>
    </div>
  );
};
