import React, { useState } from 'react';
import { 
  AlertOctagon, 
  ArrowDownRight, 
  ArrowUpRight, 
  CheckCircle2, 
  Loader2, 
  RotateCcw, 
  ShieldAlert, 
  Trash2, 
  X 
} from 'lucide-react';
import { AppUser, TransaksiPenerimaan, TransaksiPengeluaran } from '../types';
import { formatRupiah, formatTanggalIndonesia } from '../utils/numberGenerator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  type: 'penyaluran' | 'penerimaan';
  transaksiPenyaluran?: TransaksiPengeluaran | null;
  transaksiPenerimaan?: TransaksiPenerimaan | null;
  onConfirmDelete: () => void;
}

export const SecurityDeleteConfirmModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  type,
  transaksiPenyaluran,
  transaksiPenerimaan,
  onConfirmDelete
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const isAdmin = currentUser.role === 'admin';

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!isAdmin || isProcessing) return;
    setIsProcessing(true);
    setTimeout(() => {
      onConfirmDelete();
      setIsProcessing(false);
      onClose();
    }, 300);
  };

  const isPenyaluran = type === 'penyaluran' && transaksiPenyaluran;
  const isPenerimaan = type === 'penerimaan' && transaksiPenerimaan;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header Alert */}
        <div className="bg-gradient-to-r from-rose-700 via-rose-800 to-red-900 text-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 rounded-xl border border-white/20">
                <ShieldAlert className="w-6 h-6 text-rose-100" />
              </div>
              <div>
                <span className="inline-block text-[10px] font-mono tracking-wider font-semibold uppercase px-2 py-0.5 rounded bg-rose-950/50 border border-white/20 text-rose-200 mb-1">
                  Protokol Keamanan &amp; Reversi Saldo
                </span>
                <h3 className="text-base font-bold text-white">
                  {isPenyaluran 
                    ? 'Hapus Transaksi Penyaluran Barang' 
                    : 'Hapus Riwayat Penerimaan Pengadaan (BOS)'}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="text-rose-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          
          {/* Role Check Warning */}
          {!isAdmin ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900 mb-0.5">Akses Dibatasi (Bukan Administrator)</p>
                <p>
                  Akun Anda saat ini memiliki peran <strong>{currentUser.role.toUpperCase()}</strong>. Fitur penghapusan transaksi dan pembalikan (reversi) saldo gudang hanya dapat dilakukan oleh pengguna ber-role <strong>Administrator</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <RotateCcw className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950">
                  {isPenyaluran 
                    ? 'Stok Gudang Akan Dikembalikan Otomatis (Restock)' 
                    : 'Stok Gudang Akan Dikurangi Otomatis'}
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  {isPenyaluran 
                    ? 'Menghapus transaksi pengeluaran ini akan secara otomatis mengembalikan seluruh volume barang terkait kembali ke saldo stok fisik gudang.' 
                    : 'Menghapus transaksi penerimaan ini akan secara otomatis mengurangi saldo fisik barang sesuai kuantitas faktur yang dihapus.'}
                </p>
              </div>
            </div>
          )}

          {/* Details Card */}
          {isPenyaluran && transaksiPenyaluran && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Reg &amp; Tanggal</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    #{transaksiPenyaluran.nomorUrut} &bull; {formatTanggalIndonesia(transaksiPenyaluran.tanggal)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">No. SPB / BAST</span>
                  <span className="font-semibold text-blue-700 font-mono">
                    {transaksiPenyaluran.noSPB}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase">Unit Pemohon</span>
                  <span className="font-medium text-slate-900">{transaksiPenyaluran.unitPemohon}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase">Keperluan</span>
                  <span className="text-slate-600 italic line-clamp-1">{transaksiPenyaluran.keperluanUmum}</span>
                </div>
              </div>

              {/* Restock items list */}
              <div className="pt-2.5 border-t border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                  Rincian Barang yang Akan Dikembalikan ke Gudang:
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {transaksiPenyaluran.items.map((it, i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px]"
                    >
                      <span className="font-medium text-slate-800">{it.namaBarang}</span>
                      <span className="font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        +{it.usulanJumlah} {it.satuan}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isPenerimaan && transaksiPenerimaan && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">No. Bukti / Faktur</span>
                  <span className="font-semibold text-slate-900 font-mono">{transaksiPenerimaan.noBukti}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Tanggal Faktur</span>
                  <span className="font-semibold text-slate-800">
                    {formatTanggalIndonesia(transaksiPenerimaan.tanggal)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Sumber Dana</span>
                  <span className="font-semibold text-emerald-700">{transaksiPenerimaan.sumberDana}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Total Nilai Pembelian</span>
                  <span className="font-bold text-emerald-800 font-mono">
                    {formatRupiah(transaksiPenerimaan.totalNilai)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase">Penyedia (Vendor)</span>
                  <span className="font-medium text-slate-900">{transaksiPenerimaan.penyedia}</span>
                </div>
              </div>

              {/* Stock reduction items list */}
              <div className="pt-2.5 border-t border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                  Rincian Barang yang Akan Dikurangi dari Saldo Gudang:
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {transaksiPenerimaan.items.map((it, i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px]"
                    >
                      <span className="font-medium text-slate-800">{it.namaBarang}</span>
                      <span className="font-bold font-mono text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                        -{it.jumlahMasuk} {it.satuan}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Audit trail notice */}
          <div className="text-[11px] text-slate-500 bg-slate-100/70 p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Tindakan ini akan dicatat ke dalam <strong>Security Audit Log</strong> dengan identitas <strong>{currentUser.nama}</strong>.
            </span>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors"
          >
            Batal
          </button>
          
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isAdmin || isProcessing}
            className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-98 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-xs flex items-center gap-2 transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses Reversi Stok...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{isPenyaluran ? 'Ya, Hapus & Kembalikan Stok' : 'Ya, Hapus & Kurangi Stok'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
