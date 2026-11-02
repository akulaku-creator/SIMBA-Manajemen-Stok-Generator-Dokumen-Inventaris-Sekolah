import React, { useMemo, useState } from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  Check, 
  CheckCircle2, 
  Database, 
  Layers, 
  RefreshCw, 
  RotateCcw, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  Trash2, 
  Wand2 
} from 'lucide-react';
import { AppUser, Barang, TransaksiPenerimaan, TransaksiPengeluaran } from '../types';
import { 
  auditDataAnomalies, 
  DataAnomalyAudit, 
  executeDataSanityAndCleanup, 
  executeEmergencyCacheReset,
  CleanupResult
} from '../utils/dataMaintenanceHelper';

interface Props {
  masterBarang: Barang[];
  transaksiList: TransaksiPengeluaran[];
  penerimaanList: TransaksiPenerimaan[];
  currentUser?: AppUser;
  onCleanupComplete?: (cleaned: {
    masterBarang: Barang[];
    transaksiList: TransaksiPengeluaran[];
    penerimaanList: TransaksiPenerimaan[];
  }) => void;
  onShowToast?: (message: string) => void;
}

export const DataMaintenanceSettings: React.FC<Props> = ({
  masterBarang,
  transaksiList,
  penerimaanList,
  currentUser,
  onCleanupComplete,
  onShowToast
}) => {
  const [isRunningSanityCheck, setIsRunningSanityCheck] = useState(false);
  const [lastResult, setLastResult] = useState<CleanupResult | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  // Live Audit of current state
  const auditReport: DataAnomalyAudit = useMemo(() => {
    return auditDataAnomalies(masterBarang, transaksiList, penerimaanList);
  }, [masterBarang, transaksiList, penerimaanList]);

  const hasAnomalies = auditReport.potentialDuplicatesCount > 0 || 
    auditReport.orphanTransactionsCount > 0 || 
    auditReport.stockDiscrepanciesCount > 0;

  // Handler: Periksa & Bersihkan Data Anomali
  const handleSanityCheckAndCleanup = async () => {
    setIsRunningSanityCheck(true);
    setLastResult(null);

    // Small timeout to allow UI spinner to show
    await new Promise(r => setTimeout(r, 250));

    try {
      const result = executeDataSanityAndCleanup(
        masterBarang,
        transaksiList,
        penerimaanList,
        currentUser
      );

      setLastResult(result);

      if (onShowToast) {
        onShowToast(result.summaryMessage);
      }

      if (onCleanupComplete) {
        onCleanupComplete({
          masterBarang: result.cleanedMaster,
          transaksiList: result.cleanedPengeluaran,
          penerimaanList: result.cleanedPenerimaan
        });
      }
    } catch (err: any) {
      console.error('Gagal menjalankan sanitasi data:', err);
      alert('Terjadi kesalahan saat memproses pembersihan data: ' + (err?.message || 'Error'));
    } finally {
      setIsRunningSanityCheck(false);
    }
  };

  // Handler: Reset Cache Darurat
  const handleEmergencyResetConfirm = () => {
    setShowResetConfirmModal(false);
    executeEmergencyCacheReset();
  };

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Pemeliharaan &amp; Sanitasi Data Terpadu</h3>
                <span className="text-[10px] bg-amber-400/20 text-amber-200 border border-amber-400/30 font-bold px-2 py-0.5 rounded-full">
                  Sanity Check Engine
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Pembersihan otomatis data hantu/yatim, penggabungan duplikat kembar master barang (Nama + Kodering + Harga), eliminasi transaksi korup, dan kalibrasi ulang stok aktif secara akurat.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isRunningSanityCheck}
            onClick={handleSanityCheckAndCleanup}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isRunningSanityCheck ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Memproses Sanitasi...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 text-slate-950" />
                <span>Periksa &amp; Bersihkan Data Anomali</span>
              </>
            )}
          </button>
        </div>

        {/* Live Diagnostics Metrics Bar */}
        <div className="p-5 bg-slate-50/80 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500">Master Inventaris</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {auditReport.totalMasterBarang} <span className="text-xs font-normal text-slate-500">item</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {auditReport.totalUniqueGroups} identitas unik
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500">Potensi Duplikat</div>
            <div className={`text-base font-bold mt-0.5 ${auditReport.potentialDuplicatesCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {auditReport.potentialDuplicatesCount} <span className="text-xs font-normal text-slate-500">baris</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {auditReport.potentialDuplicatesCount > 0 ? 'Siap digabung otomatis' : 'Tidak ada duplikasi'}
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500">Transaksi Yatim / Anomali</div>
            <div className={`text-base font-bold mt-0.5 ${auditReport.orphanTransactionsCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {auditReport.orphanTransactionsCount} <span className="text-xs font-normal text-slate-500">entri</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {auditReport.orphanTransactionsCount > 0 ? 'Akan dibersihkan' : 'Semua relasi valid'}
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500">Status Sinkronisasi Stok</div>
            <div className={`text-base font-bold mt-0.5 ${auditReport.stockDiscrepanciesCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {auditReport.stockDiscrepanciesCount === 0 ? '100% Sinkron' : `${auditReport.stockDiscrepanciesCount} Perlu Kalibrasi`}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Saldo = Awal + Masuk - Keluar
            </div>
          </div>
        </div>
      </div>

      {/* Success / Result Feedback Banner */}
      {lastResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-start gap-3.5 text-xs text-emerald-950 animate-in fade-in duration-200 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-bold text-sm text-emerald-900">
                Pembersihan &amp; Rekalkulasi Data Berhasil!
              </h4>
              <span className="bg-emerald-200/80 text-emerald-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                Selesai
              </span>
            </div>
            <p className="text-slate-700 leading-relaxed">
              {lastResult.summaryMessage}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] font-semibold">
              <div className="p-2 bg-white/80 rounded-lg border border-emerald-200 text-emerald-900">
                Data Ganda Digabung: <span className="font-bold">{lastResult.duplicatesMergedCount}</span>
              </div>
              <div className="p-2 bg-white/80 rounded-lg border border-emerald-200 text-emerald-900">
                Entri Yatim/Duplikat: <span className="font-bold">{lastResult.orphansPurgedCount}</span>
              </div>
              <div className="p-2 bg-white/80 rounded-lg border border-emerald-200 text-emerald-900">
                Stok Dikalibrasi: <span className="font-bold">{lastResult.stockRecalculatedCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card 1: Sanity Check & Deduplication Details */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Sanitasi Relasi &amp; Data Ganda</h4>
                <p className="text-xs text-slate-500">Otomasi pemeriksaan integritas database SIMBA</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Memeriksa seluruh master barang dari duplikat kembar nama, kode rekening, dan harga satuan. Menggabungkan stok awal secara akumulatif, mengalihkan ID transaksi ke master utama, dan membuang baris laporan mutasi yang tidak memiliki riwayat transaksi maupun stok fisik.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-600">
                <span>Aturan Penggabungan (Merging):</span>
                <span className="font-bold text-slate-800">Nama + Rekening + Harga</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Filter Laporan Mutasi:</span>
                <span className="font-bold text-emerald-700">Validated Inner/Left Join</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Rekalkulasi Stok:</span>
                <span className="font-bold text-blue-700">Awal + Masuk - Penyaluran</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isRunningSanityCheck}
            onClick={handleSanityCheckAndCleanup}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {isRunningSanityCheck ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menjalankan Pembersihan...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Jalankan Periksa &amp; Bersihkan Sekarang</span>
              </>
            )}
          </button>
        </div>

        {/* Card 2: Emergency Cache Reset */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                <RotateCcw className="w-5 h-5 text-rose-700" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Reset Cache &amp; Muat Ulang Lokal</h4>
                <p className="text-xs text-slate-500">Pemulihan kondisi darurat jika cache peramban korup</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Jika peramban mengalami kesalahan tampilan (state korup, data tidak sinkron setelah pembaruan versi), tombol ini akan mengosongkan cache penyimpanan lokal browser dan memuat ulang database default tanpa merusak kode inti aplikasi.
            </p>

            <div className="bg-rose-50/60 rounded-xl p-3 border border-rose-200/80 text-xs text-rose-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                Peringatan: Gunakan fitur ini jika peramban menampilkan data janggal yang tidak bisa diatasi dengan refresh biasa.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowResetConfirmModal(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Cache / Muat Ulang Database Lokal</span>
          </button>
        </div>

      </div>

      {/* Confirmation Modal: Reset Cache Darurat */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-rose-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Konfirmasi Reset Cache Lokal</h4>
                <p className="text-xs text-slate-500">Pemulihan database lokal browser</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan mengosongkan penyimpanan lokal (localStorage) browser pada perangkat ini dan menginisialisasi ulang data default yang bersih. Sesi login Anda tetap dipertahankan.
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Apakah Anda yakin ingin melanjutkan reset cache darurat ini?</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleEmergencyResetConfirm}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition cursor-pointer active:scale-98"
              >
                Ya, Reset Cache &amp; Muat Ulang
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
