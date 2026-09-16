import {
  Boxes,
  Check,
  CheckSquare,
  Package,
  PlusCircle,
  Search,
  Square,
  X
} from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import { Barang, ItemPenerimaan } from '../types';
import { formatRupiah } from '../utils/numberGenerator';
import { getUniqueKodeRekening } from '../utils/rekeningHelper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  masterBarang: Barang[];
  onAddBatch: (items: ItemPenerimaan[]) => void;
}

interface ItemDraft {
  selected: boolean;
  jumlahMasuk: number;
  hargaSatuan: number;
}

// Utility: format number into dot-separated thousands string (e.g. 15000000 -> 15.000.000)
function formatThousands(value: number | string): string {
  if (value === '' || value === undefined || value === null) return '0';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '0';
  return new Intl.NumberFormat('id-ID').format(parseInt(digits, 10));
}

export const BatchAddBarangModal: React.FC<Props> = ({
  isOpen,
  onClose,
  masterBarang,
  onAddBatch
}) => {
  const [search, setSearch] = useState('');
  const [selectedRekening, setSelectedRekening] = useState<string>('all');

  // Draft state for each barang by ID
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});

  // Refs to focus quantity input when row is checked
  const qtyInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // List of unique rekening for filtering
  const rekeningList = useMemo(() => getUniqueKodeRekening(masterBarang), [masterBarang]);

  // Filtered barang list
  const filteredBarang = useMemo(() => {
    return masterBarang.filter((b) => {
      const matchSearch =
        !search.trim() ||
        b.namaBarang.toLowerCase().includes(search.toLowerCase()) ||
        b.kodeBarang.toLowerCase().includes(search.toLowerCase()) ||
        b.nusp.toLowerCase().includes(search.toLowerCase()) ||
        (b.spesifikasi && b.spesifikasi.toLowerCase().includes(search.toLowerCase())) ||
        (b.namaRekening && b.namaRekening.toLowerCase().includes(search.toLowerCase()));

      const matchRekening = selectedRekening === 'all' || b.kodeRekening === selectedRekening;

      return matchSearch && matchRekening;
    });
  }, [masterBarang, search, selectedRekening]);

  // Helper for item draft: Default bawaan seluruh baris JML MASUK = 0
  const getDraft = (b: Barang): ItemDraft => {
    if (drafts[b.id]) return drafts[b.id];
    return {
      selected: false,
      jumlahMasuk: 0,
      hargaSatuan: b.hargaSatuan || 0
    };
  };

  // Interactive Auto-Toggle logic:
  // - Saat dicentang: aktifkan input, set jumlahMasuk = 1, fokus ke input JML MASUK
  // - Saat uncheck: kembalikan jumlahMasuk = 0, nonaktifkan input, kalkulasi ulang subtotal
  const handleToggleSelect = (b: Barang) => {
    const current = getDraft(b);
    const willSelect = !current.selected;

    setDrafts((prev) => ({
      ...prev,
      [b.id]: {
        selected: willSelect,
        jumlahMasuk: willSelect ? (current.jumlahMasuk > 0 ? current.jumlahMasuk : 1) : 0,
        hargaSatuan: current.hargaSatuan > 0 ? current.hargaSatuan : b.hargaSatuan || 0
      }
    }));

    if (willSelect) {
      setTimeout(() => {
        const inputEl = qtyInputRefs.current[b.id];
        if (inputEl) {
          inputEl.focus();
          inputEl.select();
        }
      }, 50);
    }
  };

  const handleQtyChange = (b: Barang, rawVal: string) => {
    const cleanDigits = rawVal.replace(/\D/g, '');
    const num = cleanDigits ? parseInt(cleanDigits, 10) : 0;
    const current = getDraft(b);

    setDrafts((prev) => ({
      ...prev,
      [b.id]: {
        ...current,
        jumlahMasuk: Math.max(0, num),
        selected: true // Row is active
      }
    }));
  };

  const handlePriceChange = (b: Barang, rawStr: string) => {
    const cleanDigits = rawStr.replace(/\D/g, '');
    const num = cleanDigits ? parseInt(cleanDigits, 10) : 0;
    const current = getDraft(b);

    setDrafts((prev) => ({
      ...prev,
      [b.id]: {
        ...current,
        hargaSatuan: Math.max(0, num),
        selected: true
      }
    }));
  };

  // Selected count & total calculation:
  // Hitung Total Dipilih HANYA untuk baris yang memiliki nilai JML MASUK > 0 DAN berstatus dicentang
  const selectedBarangItems = useMemo(() => {
    const result: { barang: Barang; draft: ItemDraft }[] = [];
    masterBarang.forEach((b) => {
      const d = drafts[b.id];
      if (d && d.selected && d.jumlahMasuk > 0) {
        result.push({ barang: b, draft: d });
      }
    });
    return result;
  }, [masterBarang, drafts]);

  const selectedCount = selectedBarangItems.length;

  const grandTotalPreview = useMemo(() => {
    return selectedBarangItems.reduce(
      (acc, item) => acc + item.draft.jumlahMasuk * item.draft.hargaSatuan,
      0
    );
  }, [selectedBarangItems]);

  const handleSelectAllFiltered = () => {
    const nextDrafts = { ...drafts };
    filteredBarang.forEach((b) => {
      const cur = getDraft(b);
      nextDrafts[b.id] = {
        selected: true,
        jumlahMasuk: cur.jumlahMasuk > 0 ? cur.jumlahMasuk : 1,
        hargaSatuan: cur.hargaSatuan > 0 ? cur.hargaSatuan : b.hargaSatuan || 0
      };
    });
    setDrafts(nextDrafts);
  };

  const handleClearSelection = () => {
    const nextDrafts = { ...drafts };
    filteredBarang.forEach((b) => {
      const cur = getDraft(b);
      nextDrafts[b.id] = {
        selected: false,
        jumlahMasuk: 0,
        hargaSatuan: cur.hargaSatuan || b.hargaSatuan || 0
      };
    });
    setDrafts(nextDrafts);
  };

  const handleConfirmBatch = () => {
    if (selectedCount === 0) return;

    const newItems: ItemPenerimaan[] = selectedBarangItems.map(({ barang: b, draft }) => ({
      barangId: b.id,
      namaBarang: b.namaBarang,
      kodeBarang: b.kodeBarang,
      nusp: b.nusp,
      kodeRekening: b.kodeRekening,
      namaRekening: b.namaRekening,
      satuan: b.satuan,
      jumlahMasuk: draft.jumlahMasuk,
      hargaSatuan: draft.hargaSatuan,
      subtotal: draft.jumlahMasuk * draft.hargaSatuan
    }));

    onAddBatch(newItems);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Sub-Modal (Sticky) */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Pilih &amp; Tambah Banyak Barang (Batch Input)
              </h3>
              <p className="text-xs text-slate-300">
                Pilih beberapa item persediaan sekaligus, atur kuantitas &amp; harga, lalu masukkan ke tabel secara kolektif.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Controls (Sticky) */}
        <div className="bg-slate-50/90 backdrop-blur-xs p-4 border-b border-slate-200/80 space-y-3 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Search Input */}
            <div className="sm:col-span-7 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama barang, kode aset, NUSP, atau spesifikasi..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Rekening Belanja Filter */}
            <div className="sm:col-span-5 relative">
              <select
                value={selectedRekening}
                onChange={(e) => setSelectedRekening(e.target.value)}
                className="w-full py-2 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden truncate"
              >
                <option value="all">Semua Kode Rekening Belanja ({masterBarang.length} item)</option>
                {rekeningList.map((r) => (
                  <option key={r.kode} value={r.kode}>
                    {r.displayName} ({r.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Select Tooling Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-md font-medium transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                Pilih Semua ({filteredBarang.length})
              </button>
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 rounded-md font-medium transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Batalkan Pilihan ({selectedCount})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">
                Menampilkan <strong>{filteredBarang.length}</strong> dari {masterBarang.length} barang
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                <Check className="w-3 h-3" />
                {selectedCount} item dipilih
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredBarang.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-sm">Tidak ada barang yang cocok dengan kriteria filter.</p>
              <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau ganti pilihan rekening belanja.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table
                className="w-full text-xs text-left"
                style={{ tableLayout: 'fixed', width: '100%' }}
              >
                <thead className="bg-slate-100/90 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th style={{ width: '5%' }} className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const allSelected = filteredBarang.length > 0 && filteredBarang.every((b) => getDraft(b).selected);
                          if (allSelected) {
                            handleClearSelection();
                          } else {
                            handleSelectAllFiltered();
                          }
                        }}
                        className="p-1 rounded text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                        title="Pilih / Batalkan semua baris yang tampil"
                      >
                        {filteredBarang.length > 0 && filteredBarang.every((b) => getDraft(b).selected) ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                        )}
                      </button>
                    </th>
                    <th style={{ width: '22%' }} className="p-2.5">Kategori / Rekening</th>
                    <th style={{ width: '28%' }} className="p-2.5">Nama &amp; Kode Barang</th>
                    <th style={{ width: '9%' }} className="p-2.5 text-center">Satuan / Stok</th>
                    <th style={{ width: '12%' }} className="p-2.5 text-center">Jml Masuk</th>
                    <th style={{ width: '14%' }} className="p-2.5 text-right">Harga Satuan (Rp)</th>
                    <th style={{ width: '10%' }} className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredBarang.map((b) => {
                    const draft = getDraft(b);
                    const isChecked = draft.selected;
                    const subtotal = isChecked ? draft.jumlahMasuk * draft.hargaSatuan : 0;

                    return (
                      <tr
                        key={b.id}
                        className={`transition-colors ${
                          isChecked ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'bg-slate-50/30 hover:bg-slate-100/50 opacity-80'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(b)}
                            className="p-1 rounded text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                            title={isChecked ? 'Lepas centang barang ini' : 'Centang dan masukkan kuantitas barang'}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                            )}
                          </button>
                        </td>

                        {/* Rekening */}
                        <td className="p-2.5 truncate" title={`${b.kodeRekening} - ${b.namaRekening}`}>
                          <div className={`font-semibold text-[11px] truncate ${isChecked ? 'text-slate-800' : 'text-slate-500'}`}>
                            {b.namaRekening}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 truncate">
                            {b.kodeRekening}
                          </div>
                        </td>

                        {/* Nama Barang & NUSP */}
                        <td className="p-2.5">
                          <div className={`font-semibold leading-tight ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>
                            {b.namaBarang}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-mono">
                            <span>{b.kodeBarang}</span>
                            {b.nusp && (
                              <span className="bg-slate-100 text-slate-600 px-1 rounded text-[9px]">
                                NUSP: {b.nusp}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Satuan & Stok Saat Ini */}
                        <td className="p-2.5 text-center">
                          <span className={`font-medium ${isChecked ? 'text-slate-700' : 'text-slate-400'}`}>{b.satuan}</span>
                          <div className="text-[10px] text-slate-400">
                            Stok: {b.stokSekarang}
                          </div>
                        </td>

                        {/* Input Jumlah Masuk */}
                        <td className="p-2 text-center">
                          <input
                            ref={(el) => {
                              qtyInputRefs.current[b.id] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            disabled={!isChecked}
                            value={isChecked ? (draft.jumlahMasuk > 0 ? draft.jumlahMasuk : '0') : '0'}
                            onChange={(e) => handleQtyChange(b, e.target.value)}
                            onFocus={(e) => isChecked && e.target.select()}
                            placeholder="0"
                            className={`w-full py-1 text-center font-bold text-xs border rounded-md transition-all ${
                              isChecked
                                ? 'border-emerald-500 bg-white text-emerald-900 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden'
                                : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed select-none'
                            }`}
                          />
                        </td>

                        {/* Kolom Harga Satuan - Terkunci Readonly Mengikuti Master Barang */}
                        <td className="p-2 text-right">
                          <div className="relative">
                            <input
                              type="text"
                              readOnly
                              disabled={!isChecked}
                              value={
                                isChecked
                                  ? formatThousands(b.hargaSatuan || draft.hargaSatuan)
                                  : '0'
                              }
                              title="Harga satuan terkunci mengikuti acuan Master Barang"
                              className={`w-full py-1 px-2 text-right font-mono font-semibold text-xs border rounded-md transition-all ${
                                isChecked
                                  ? 'border-slate-300 bg-slate-100/90 text-slate-800 cursor-default select-none'
                                  : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed select-none'
                              }`}
                            />
                          </div>
                        </td>

                        {/* Subtotal */}
                        <td className="p-2.5 text-right font-mono font-bold text-[11px]">
                          {isChecked && subtotal > 0 ? (
                            <span className="text-emerald-800">
                              {formatThousands(subtotal)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">
                              0
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Sub-Modal (Sticky) */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 text-xs">
            <div className="text-slate-600">
              Total Dipilih: <strong className="text-slate-900 text-sm">{selectedCount}</strong> barang
            </div>
            <div className="h-4 w-px bg-slate-300" />
            <div className="text-slate-600">
              Estimasi Subtotal: <strong className="text-emerald-700 font-mono text-sm">{formatRupiah(grandTotalPreview)}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmBatch}
              disabled={selectedCount === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              Selesai &amp; Masukkan ke Tabel ({selectedCount})
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
