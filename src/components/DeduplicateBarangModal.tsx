import { 
  AlertCircle, 
  AlertTriangle, 
  ArrowRight, 
  Boxes, 
  CheckCircle2, 
  FileCheck2, 
  GitMerge, 
  Layers, 
  Loader2, 
  RefreshCw, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  Trash2, 
  X 
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Barang, TransaksiPenerimaan, TransaksiPengeluaran } from '../types';
import { 
  auditDuplicateMasterBarang, 
  DeduplicationAuditReport, 
  executeDeduplicateAndMerge 
} from '../utils/barangDeduplicationHelper';
import { formatRupiah } from '../utils/numberGenerator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  masterBarang: Barang[];
  transaksiPengeluaranList: TransaksiPengeluaran[];
  transaksiPenerimaanList: TransaksiPenerimaan[];
  onApplyCleanedData: (
    cleanedBarang: Barang[],
    updatedTransaksi: TransaksiPengeluaran[],
    updatedPenerimaan: TransaksiPenerimaan[],
    summary: string
  ) => void;
}

export const DeduplicateBarangModal: React.FC<Props> = ({
  isOpen,
  onClose,
  masterBarang,
  transaksiPengeluaranList,
  transaksiPenerimaanList,
  onApplyCleanedData
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'needs_merge' | 'safe_purge'>('all');

  // Audit laporan barang ganda secara reaktif
  const auditReport: DeduplicationAuditReport = useMemo(() => {
    return auditDuplicateMasterBarang(
      masterBarang,
      transaksiPengeluaranList,
      transaksiPenerimaanList
    );
  }, [masterBarang, transaksiPengeluaranList, transaksiPenerimaanList]);

  if (!isOpen) return null;

  const handleExecute = () => {
    if (auditReport.totalBarangGanda === 0) {
      alert('Tidak ditemukan data barang ganda untuk dibersihkan.');
      return;
    }

    const confirmMsg = 
      `Konfirmasi Pembersihan Data Ganda:\n\n` +
      `• ${auditReport.totalBisaDihapusLangsung} barang ganda tanpa riwayat akan DIHAPUS PERMANEN.\n` +
      `• ${auditReport.totalPerluDimerge} barang ganda berelasi akan DIMERGE ke data master utama.\n` +
      `• Riwayat laporan mutasi dan saldo stok akan disinkronkan ulang secara akurat.\n\n` +
      `Lanjutkan proses pembersihan?`;

    if (!confirm(confirmMsg)) return;

    try {
      setIsProcessing(true);
      const res = executeDeduplicateAndMerge(
        masterBarang,
        transaksiPengeluaranList,
        transaksiPenerimaanList
      );

      onApplyCleanedData(
        res.cleanedMasterBarang,
        res.updatedTransaksiPengeluaranList,
        res.updatedTransaksiPenerimaanList,
        res.auditLogSummary
      );

      onClose();
    } catch (err: any) {
      console.error('Deduplication error:', err);
      alert('Terjadi kesalahan saat melakukan pembersihan data: ' + (err?.message || 'Gagal'));
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredGroups = auditReport.groups.filter(g => {
    if (activeTab === 'needs_merge') return g.usedDuplicatesCount > 0;
    if (activeTab === 'safe_purge') return g.unusedDuplicatesCount > 0;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/80 border border-indigo-400/40 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Audit &amp; Pembersihan Barang Ganda (Duplicate Purge)
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 px-2 py-0.5 rounded-full font-semibold">
                  SIMBA Integrity Engine
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Mendeteksi entri ganda, menghapus duplikat tanpa transaksi, dan menggabungkan (merge) riwayat ke master utama.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audit Stats Banner */}
        <div className="p-5 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Total Master Barang</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">{auditReport.totalMasterBarang}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Entri terdaftar</div>
            </div>

            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 shadow-2xs">
              <div className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">Barang Kembar/Duplikat</div>
              <div className="text-lg font-black text-amber-900 mt-0.5">{auditReport.totalBarangGanda}</div>
              <div className="text-[11px] text-amber-700 mt-0.5">{auditReport.totalGrupDuplikat} grup kesamaan</div>
            </div>

            <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 shadow-2xs">
              <div className="text-[10px] font-bold uppercase text-indigo-800 tracking-wider">Stok Akan Diakumulasi</div>
              <div className="text-lg font-black text-indigo-900 mt-0.5">+{auditReport.totalStokTerakumulasi}</div>
              <div className="text-[11px] text-indigo-700 mt-0.5">Akumulasi ke master tunggal</div>
            </div>

            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 shadow-2xs">
              <div className="text-[10px] font-bold uppercase text-blue-800 tracking-wider">Relasi Trx Dialihkan</div>
              <div className="text-lg font-black text-blue-900 mt-0.5">{auditReport.totalPerluDimerge}</div>
              <div className="text-[11px] text-blue-700 mt-0.5">Re-mapping ID transaksi</div>
            </div>

          </div>

          {/* Quick Rules Reminder */}
          <div className="mt-3.5 flex items-start gap-2 bg-indigo-50/80 border border-indigo-200 rounded-lg p-2.5 text-xs text-indigo-900">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Kriteria Penggabungan Data (Merging Rule):</strong> Data barang dianggap kembar dan wajib digabung <em>jika dan hanya jika</em> <strong>Nama Barang/Spesifikasi</strong>, <strong>Kode Rekening Belanja</strong>, dan <strong>Harga Satuan</strong> bernilai sama persis. Entri digabung menjadi 1 data master tunggal, stok/sisa fisik diakumulasikan, dan riwayat transaksi penerimaan maupun pengeluaran dialihkan (*re-mapped*) ke ID master hasil penggabungan.
            </div>
          </div>
        </div>

        {/* Filter Tab & List Header */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua Grup ({auditReport.totalGrupDuplikat})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('safe_purge')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeTab === 'safe_purge'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Bisa Dihapus ({auditReport.totalBisaDihapusLangsung})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('needs_merge')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeTab === 'needs_merge'
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              Perlu Merge ({auditReport.totalPerluDimerge})
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            {filteredGroups.length} grup ditampilkan
          </span>
        </div>

        {/* Modal Body: List of Duplicate Groups */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-100/50">
          {auditReport.totalBarangGanda === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-md mx-auto shadow-xs my-6">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">
                Master Inventaris Bersih!
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tidak ditemukan data barang ganda pada tabel Master Inventaris. Seluruh barang unik dan siap digunakan untuk laporan mutasi.
              </p>
            </div>
          ) : (
            filteredGroups.map((group, groupIdx) => (
              <div 
                key={group.key || groupIdx}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
              >
                {/* Group Title Bar */}
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                      {groupIdx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {group.identitas}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                    <span className="font-mono bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-semibold" title="Kode Rekening Belanja">
                      {group.kodeRekening}
                    </span>
                    <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-200" title="Harga Satuan Sama">
                      {formatRupiah(group.hargaSatuan)}
                    </span>
                    <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded border border-indigo-200" title="Stok Akumulatif">
                      Stok Gabungan: {group.accumulatedStokSekarang}
                    </span>
                    <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                      {group.totalDuplicates} kembar
                    </span>
                  </div>
                </div>

                {/* Items in this group */}
                <div className="divide-y divide-slate-100 text-xs">
                  {group.items.map((item, itemIdx) => {
                    const b = item.barang;
                    return (
                      <div 
                        key={b.id || itemIdx}
                        className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          item.isPrimary ? 'bg-indigo-50/30' : 'bg-white'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {item.isPrimary ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-emerald-300">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                DATA UTAMA (DIPERTAHANKAN)
                              </span>
                            ) : item.action === 'merge_trx' ? (
                              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-blue-300">
                                <GitMerge className="w-3 h-3 text-blue-600" />
                                GANDA • AKAN DIMERGE ({item.totalTrxCount} TRX)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-rose-300">
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                GANDA • AKAN DIHAPUS (0 TRX)
                              </span>
                            )}

                            <span className="font-mono text-slate-500 text-[10px]">ID: {b.id}</span>
                          </div>

                          <div className="font-semibold text-slate-900 truncate">
                            {b.namaBarang}
                          </div>

                          <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span>Kode: <strong className="text-slate-700">{b.kodeBarang || '-'}</strong></span>
                            <span>NUSP: <strong className="text-slate-700">{b.nusp || '-'}</strong></span>
                            <span>Satuan: <strong className="text-slate-700">{b.satuan}</strong></span>
                            <span>Harga: <strong className="text-slate-700">{formatRupiah(b.hargaSatuan)}</strong></span>
                            <span>Stok: <strong className="text-slate-700">{b.stokSekarang}</strong></span>
                          </div>
                        </div>

                        {/* Transaction relation info */}
                        <div className="text-right shrink-0">
                          <div className="text-[11px] font-semibold text-slate-700">
                            Riwayat: {item.trxPenerimaanCount} Masuk • {item.trxPengeluaranCount} Keluar
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {item.isPrimary 
                              ? 'Menjadi target integrasi' 
                              : item.action === 'merge_trx' 
                              ? 'Relasi trx dipindah ke master utama' 
                              : 'Tidak terikat transaksi'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            {auditReport.totalBarangGanda > 0 ? (
              <span>
                Ditemukan <strong>{auditReport.totalBarangGanda} barang ganda</strong>. Klik tombol eksekusi untuk membersihkan dan menstabilkan laporan mutasi.
              </span>
            ) : (
              <span>Seluruh data barang sudah unik dan akurat.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Batal / Tutup
            </button>

            {auditReport.totalBarangGanda > 0 && (
              <button
                type="button"
                onClick={handleExecute}
                disabled={isProcessing}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses Deduplikasi...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Bersihkan &amp; Gabungkan Data ({auditReport.totalBarangGanda})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
