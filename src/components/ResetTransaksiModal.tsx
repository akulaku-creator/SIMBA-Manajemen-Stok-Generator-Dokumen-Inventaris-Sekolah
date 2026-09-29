import { 
  AlertCircle, 
  AlertOctagon, 
  Building2,
  Check, 
  CheckCircle2, 
  Database, 
  Eye, 
  EyeOff, 
  KeyRound, 
  Lock, 
  Package, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  Users,
  X 
} from 'lucide-react';
import React, { useState } from 'react';
import { AppUser } from '../types';
import { logAuditEvent } from '../utils/auditLogger';

export interface ResetScopeOptions {
  deletePenyaluran: boolean;
  deletePenerimaan: boolean;
  deleteMutasiStok: boolean;
  deleteMasterBarang: boolean;
  deleteMasterPegawai: boolean;
  restoreStockToInitial: boolean;
  alasan: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transaksiCount: number;
  penerimaanCount: number;
  barangCount?: number;
  pegawaiCount?: number;
  onConfirmReset: (options: ResetScopeOptions) => void;
  currentUser: AppUser;
  schoolName?: string;
  onOpenAuditLog?: () => void;
}

export const ResetTransaksiModal: React.FC<Props> = ({
  isOpen,
  onClose,
  transaksiCount,
  penerimaanCount,
  barangCount = 0,
  pegawaiCount = 0,
  onConfirmReset,
  currentUser,
  schoolName,
  onOpenAuditLog
}) => {
  // Checkbox Scope Selections
  const [chkTransaksiPenyaluran, setChkTransaksiPenyaluran] = useState(true);
  const [chkTransaksiPenerimaan, setChkTransaksiPenerimaan] = useState(true);
  const [chkMutasiStok, setChkMutasiStok] = useState(true);
  const [chkMasterBarang, setChkMasterBarang] = useState(false);
  const [chkMasterPegawai, setChkMasterPegawai] = useState(false);

  // Security & Reason inputs
  const [adminPin, setAdminPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [alasanReset, setAlasanReset] = useState('');
  const [restoreStock, setRestoreStock] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';
  const hasAnyScope = chkTransaksiPenyaluran || chkTransaksiPenerimaan || chkMutasiStok || chkMasterBarang || chkMasterPegawai;
  const isTransactionRelatedSelected = chkTransaksiPenyaluran || chkTransaksiPenerimaan || chkMutasiStok;
  
  // Validation: Admin role, at least 1 scope checked, PIN entered, reason filled
  const isFormValid = isAdmin && hasAnyScope && adminPin.trim().length > 0 && alasanReset.trim().length > 0;

  const handleExecute = () => {
    setErrorMsg('');

    if (!isAdmin) {
      setErrorMsg('Akses Ditolak: Hanya pengguna dengan peran Administrator yang berwenang mengosongkan data.');
      return;
    }

    if (!hasAnyScope) {
      setErrorMsg('Harap pilih minimal satu modul data yang ingin dikosongkan.');
      return;
    }

    if (!adminPin.trim()) {
      setErrorMsg('Masukkan PIN atau Kata Sandi Administrator untuk verifikasi keamanan.');
      return;
    }

    if (!alasanReset.trim()) {
      setErrorMsg('Harap cantumkan alasan atau keperluan reset data untuk pencatatan log audit.');
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
        title: 'Gagal Verifikasi PIN Reset Data',
        details: `Percobaan reset data ditolak: PIN/Password admin salah dimasukkan oleh @${currentUser.username}`,
        status: 'FAILED'
      });
      setErrorMsg('PIN atau Kata Sandi Admin yang dimasukkan salah. (Default PIN: 123456)');
      return;
    }

    setIsProcessing(true);

    const scopeDetails: string[] = [];
    if (chkTransaksiPenyaluran) scopeDetails.push(`Penyaluran (${transaksiCount} berkas)`);
    if (chkTransaksiPenerimaan) scopeDetails.push(`Penerimaan BOS (${penerimaanCount} faktur)`);
    if (chkMutasiStok) scopeDetails.push('Riwayat Mutasi Fisik');
    if (chkMasterBarang) scopeDetails.push(`Master Barang (${barangCount} item)`);
    if (chkMasterPegawai) scopeDetails.push(`Master Pegawai (${pegawaiCount} orang)`);

    const stockTreatment = chkMasterBarang 
      ? 'Dikosongkan (Master barang dihapus)' 
      : restoreStock 
        ? 'Kembalikan stok fisik ke stok awal' 
        : 'Pertahankan stok berjalan';

    setTimeout(() => {
      // Record Audit Trail Log
      logAuditEvent({
        userId: currentUser.id,
        username: currentUser.username,
        userName: currentUser.nama,
        userRole: currentUser.role,
        sekolah_id: currentUser.sekolah_id,
        nama_sekolah: schoolName,
        action: 'RESET_TRANSAKSI',
        title: `Pengosongan Data [${schoolName || 'Satuan Pendidikan'}]`,
        details: `Admin ${currentUser.nama} (@${currentUser.username}) mengosongkan data scope sekolah [${schoolName || '-'}]: [${scopeDetails.join(', ')}]. Perlakuan stok: ${stockTreatment}. Master Rekening Belanja tetap aman. Alasan: "${alasanReset.trim()}".`,
        status: 'SUCCESS',
        meta: {
          scopePenyaluran: chkTransaksiPenyaluran,
          scopePenerimaan: chkTransaksiPenerimaan,
          scopeMutasiStok: chkMutasiStok,
          scopeMasterBarang: chkMasterBarang,
          scopeMasterPegawai: chkMasterPegawai,
          perlakuanStok: stockTreatment,
          alasan: alasanReset.trim()
        }
      });

      onConfirmReset({
        deletePenyaluran: chkTransaksiPenyaluran,
        deletePenerimaan: chkTransaksiPenerimaan,
        deleteMutasiStok: chkMutasiStok,
        deleteMasterBarang: chkMasterBarang,
        deleteMasterPegawai: chkMasterPegawai,
        restoreStockToInitial: restoreStock,
        alasan: alasanReset.trim()
      });

      setIsProcessing(false);
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
                <h3 className="text-base font-bold tracking-tight">Keamanan Reset Data / Kosongkan Transaksi</h3>
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  Khusus Admin
                </span>
              </div>
              <p className="text-xs text-red-100 mt-0.5">
                Pilih modul data yang ingin dikosongkan dengan otorisasi PIN &amp; pencatatan Log Audit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs text-slate-700 max-h-[78vh] overflow-y-auto">
          
          {/* Multi-Tenant Scope Banner */}
          <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Konteks Satuan Pendidikan: </span>
              <span className="font-extrabold text-blue-950">{schoolName || 'Satuan Pendidikan Terpilih'}</span>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Pengosongan data ini hanya berlaku secara lokal pada sekolah ini. Data sekolah lain dan 40 Rekening Belanja Resmi daerah tetap aman terlindungi.
              </p>
            </div>
          </div>

          {/* NON-ADMIN BLOCKED WARNING */}
          {!isAdmin && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex gap-3 text-red-900">
              <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-red-950">Akses Dibatasi (Hak Akses RBAC)</p>
                <p className="mt-1 text-red-800 leading-relaxed">
                  Akun Anda saat ini masuk sebagai <strong>{currentUser.role.toUpperCase()}</strong>. Fitur pengosongan data hanya dapat dioperasikan oleh <strong>Administrator Sistem</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Warning Banner */}
          <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 flex gap-3 text-red-900">
            <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-xs text-red-950">
                Peringatan Tindakan Permanen &amp; Pencatatan Audit Trail
              </p>
              <p className="leading-relaxed text-[11px] text-red-800">
                Modul yang dicentang di bawah akan dikosongkan secara permanen. Tindakan reset ini akan secara otomatis terekam dalam <strong>Log Audit Keamanan</strong> beserta identitas akun dan waktu eksekusi.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-xl flex items-center gap-2 text-xs text-red-900 font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: PEMILIHAN SCOPE DATA YANG AKAN DIHAPUS (CHECKBOX SELECTION) */}
          <div className="bg-red-50 p-4 rounded-xl border border-red-200 mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-red-800 text-sm">Pilih Scope Data yang Akan Dihapus:</h4>
              <span className="text-[11px] text-red-700 font-medium">Pilih modul yang ingin direset</span>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-2 p-2 bg-white/80 rounded-lg border border-red-100 hover:bg-white text-sm text-gray-800 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <input 
                    type="checkbox" 
                    id="chk_transaksi_penyaluran" 
                    checked={chkTransaksiPenyaluran}
                    onChange={(e) => setChkTransaksiPenyaluran(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500 h-4 w-4 cursor-pointer" 
                  />
                  <span>Riwayat Transaksi Penyaluran (NPB / SPB / SPPB / BAST)</span>
                </div>
                <span className="font-mono text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                  {transaksiCount} berkas
                </span>
              </label>

              <label className="flex items-center justify-between gap-2 p-2 bg-white/80 rounded-lg border border-red-100 hover:bg-white text-sm text-gray-800 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <input 
                    type="checkbox" 
                    id="chk_transaksi_penerimaan" 
                    checked={chkTransaksiPenerimaan}
                    onChange={(e) => setChkTransaksiPenerimaan(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500 h-4 w-4 cursor-pointer" 
                  />
                  <span>Riwayat Transaksi Penerimaan / Barang Masuk (BOS)</span>
                </div>
                <span className="font-mono text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                  {penerimaanCount} faktur
                </span>
              </label>

              <label className="flex items-center justify-between gap-2 p-2 bg-white/80 rounded-lg border border-red-100 hover:bg-white text-sm text-gray-800 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <input 
                    type="checkbox" 
                    id="chk_mutasi_stok" 
                    checked={chkMutasiStok}
                    onChange={(e) => setChkMutasiStok(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500 h-4 w-4 cursor-pointer" 
                  />
                  <span>Riwayat Mutasi Fisik &amp; Stok Persediaan</span>
                </div>
                <span className="text-[11px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                  Dibersihkan
                </span>
              </label>

              <label className="flex items-center justify-between gap-2 p-2 bg-white/80 rounded-lg border border-red-100 hover:bg-white text-sm text-gray-800 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <input 
                    type="checkbox" 
                    id="chk_master_barang" 
                    checked={chkMasterBarang}
                    onChange={(e) => setChkMasterBarang(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500 h-4 w-4 cursor-pointer" 
                  />
                  <span className="font-medium text-red-700">Kosongkan Master Data Barang &amp; NUSP (Opsional)</span>
                </div>
                <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  {barangCount} komoditas
                </span>
              </label>

              <label className="flex items-center justify-between gap-2 p-2 bg-white/80 rounded-lg border border-red-100 hover:bg-white text-sm text-gray-800 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <input 
                    type="checkbox" 
                    id="chk_master_pegawai" 
                    checked={chkMasterPegawai}
                    onChange={(e) => setChkMasterPegawai(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500 h-4 w-4 cursor-pointer" 
                  />
                  <span className="font-medium text-red-700">Kosongkan Master Data Pegawai (Opsional)</span>
                </div>
                <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  {pegawaiCount} pegawai
                </span>
              </label>
            </div>

            {/* Proteksi Master Kode Rekening Belanja: Permanen & Read-Only */}
            <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs text-emerald-950">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="font-bold text-emerald-900">Proteksi Master: </span>
                <span>Master Kode Rekening Belanja (40 Item Resmi) tetap bersifat permanen dan <strong>TIDAK BISA DIHAPUS</strong> (Read-only Master).</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: KONDISIONAL PERLAKUAN SALDO STOK */}
          {isTransactionRelatedSelected && (
            <div className={`p-3.5 rounded-xl border transition-all ${
              chkMasterBarang 
                ? 'bg-slate-100/80 border-slate-200 opacity-60' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-blue-600" />
                  Perlakuan Saldo Fisik Stok Barang:
                </p>
                {chkMasterBarang && (
                  <span className="text-[10px] text-slate-500 font-medium italic">
                    Dinonaktifkan karena Master Barang dipilih untuk dikosongkan
                  </span>
                )}
              </div>
              
              <div className="space-y-1.5">
                <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all ${
                  chkMasterBarang 
                    ? 'cursor-not-allowed bg-slate-50 border-slate-200' 
                    : restoreStock 
                      ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-500/20 cursor-pointer' 
                      : 'bg-white border-slate-200 hover:bg-slate-100/60 cursor-pointer'
                }`}>
                  <input
                    type="radio"
                    name="stock_choice"
                    disabled={chkMasterBarang}
                    checked={restoreStock && !chkMasterBarang}
                    onChange={() => setRestoreStock(true)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">
                      Kembalikan Stok Sekarang ke Stok Awal (Direkomendasikan)
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Nilai <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">stokSekarang</code> pada barang yang tersisa akan disamakan dengan <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">stokAwal</code>.
                    </div>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all ${
                  chkMasterBarang 
                    ? 'cursor-not-allowed bg-slate-50 border-slate-200' 
                    : !restoreStock 
                      ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-500/20 cursor-pointer' 
                      : 'bg-white border-slate-200 hover:bg-slate-100/60 cursor-pointer'
                }`}>
                  <input
                    type="radio"
                    name="stock_choice"
                    disabled={chkMasterBarang}
                    checked={!restoreStock && !chkMasterBarang}
                    onChange={() => setRestoreStock(false)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">
                      Pertahankan Angka Stok Berjalan Saat Ini
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Hanya menghapus riwayat dokumen transaksi, saldo stok fisik barang saat ini tetap dipertahankan.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* SECTION 3: ADMIN VERIFICATION (PIN / PASSWORD & ALASAN) */}
          <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-purple-950 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-purple-600" />
                Verifikasi Kata Sandi / PIN Administrator: <span className="text-red-600">*</span>
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
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-purple-950 mb-1">
                Alasan / Keperluan Reset Data (Wajib diisi untuk Log Audit): <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={alasanReset}
                onChange={(e) => setAlasanReset(e.target.value)}
                placeholder="Contoh: Tutup Buku Tahun Anggaran 2025 / Persiapan TA 2026 / Reset Pengujian"
                className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
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
                className="text-[11px] text-slate-500 hover:text-purple-700 underline font-medium cursor-pointer"
              >
                Lihat Log Audit
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleExecute}
            disabled={!isFormValid || isProcessing}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-md ${
              isFormValid && !isProcessing
                ? 'bg-red-600 hover:bg-red-700 active:scale-98 cursor-pointer'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {isProcessing ? 'Memverifikasi & Mengosongkan...' : 'Konfirmasi & Kosongkan Data Terpilih'}
          </button>
        </div>
      </div>
    </div>
  );
};
