import {
  AlertCircle,
  Boxes,
  Check,
  CheckSquare,
  Coins,
  Edit3,
  FileText,
  Filter,
  Package,
  PackageCheck,
  PlusCircle,
  Search,
  Sparkles,
  Square,
  X,
  Zap
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Barang, PengajuanItem } from '../types';
import { formatRupiah } from '../utils/numberGenerator';
import { getUniqueKodeRekening } from '../utils/rekeningHelper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  masterBarang: Barang[];
  onAddBatch: (items: PengajuanItem[]) => void;
  defaultKeperluan?: string;
}

interface ItemDraft {
  selected: boolean;
  usulanJumlah: number;
  keperluan: string;
}

export const BatchAddPenyaluranModal: React.FC<Props> = ({
  isOpen,
  onClose,
  masterBarang,
  onAddBatch,
  defaultKeperluan = 'Kebutuhan Administrasi Perkantoran & Pelayanan Sekolah'
}) => {
  const [search, setSearch] = useState('');
  const [selectedRekening, setSelectedRekening] = useState<string>('all');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(true);

  // Global Keperluan state for bulk update across all selected items
  const [globalKeperluan, setGlobalKeperluan] = useState<string>(defaultKeperluan);

  // Draft state for each barang by ID
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});

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
        (b.namaRekening && b.namaRekening.toLowerCase().includes(search.toLowerCase())) ||
        (b.kategori && b.kategori.toLowerCase().includes(search.toLowerCase()));

      const matchRekening = selectedRekening === 'all' || b.kodeRekening === selectedRekening;
      const matchAvailability = !onlyAvailable || b.stokSekarang > 0;

      return matchSearch && matchRekening && matchAvailability;
    });
  }, [masterBarang, search, selectedRekening, onlyAvailable]);

  // Helper for item draft
  const getDraft = (b: Barang): ItemDraft => {
    if (drafts[b.id]) return drafts[b.id];
    return {
      selected: false,
      usulanJumlah: 0,
      keperluan: globalKeperluan || defaultKeperluan
    };
  };

  const handleToggleSelect = (b: Barang) => {
    if (b.stokSekarang <= 0) return; // Cannot select items with 0 stock
    const current = getDraft(b);
    const willSelect = !current.selected;
    setDrafts((prev) => ({
      ...prev,
      [b.id]: {
        ...current,
        selected: willSelect,
        usulanJumlah: willSelect ? (current.usulanJumlah > 0 ? current.usulanJumlah : 1) : 0,
        keperluan: current.keperluan || globalKeperluan || defaultKeperluan
      }
    }));
  };

  const handleQtyChange = (b: Barang, qty: number) => {
    const current = getDraft(b);
    const validQty = isNaN(qty) ? 0 : qty;
    setDrafts((prev) => ({
      ...prev,
      [b.id]: {
        ...current,
        usulanJumlah: validQty,
        selected: validQty > 0 && b.stokSekarang > 0
      }
    }));
  };

  const handleKeperluanChange = (b: Barang, text: string) => {
    const current = getDraft(b);
    setDrafts((prev) => ({
      ...prev,
      [b.id]: {
        ...current,
        keperluan: text
      }
    }));
  };

  // 1. FITUR QUICK AUTOFILL: [+ Ambil Semua Stok Tersedia] / [Isi Maksimal Stok]
  // Centang semua barang tampil yang ada stoknya DAN isi JML DIMINTA = SISA STOK GUDANG presisi
  const handleTakeAllAvailableStock = () => {
    const next: Record<string, ItemDraft> = { ...drafts };
    let affectedCount = 0;

    filteredBarang.forEach((b) => {
      if (b.stokSekarang > 0) {
        const cur = next[b.id] || {
          selected: false,
          usulanJumlah: 1,
          keperluan: globalKeperluan || defaultKeperluan
        };
        next[b.id] = {
          selected: true,
          usulanJumlah: b.stokSekarang, // Presisi diisi sama persis dengan sisa stok gudang
          keperluan: cur.keperluan || globalKeperluan || defaultKeperluan
        };
        affectedCount++;
      }
    });

    setDrafts(next);
  };

  // Pilih Semua yang Tersedia (Default Qty aman)
  const handleSelectAllAvailable = () => {
    const next: Record<string, ItemDraft> = { ...drafts };
    filteredBarang.forEach((b) => {
      if (b.stokSekarang > 0) {
        const cur = next[b.id] || {
          selected: false,
          usulanJumlah: b.stokSekarang >= 5 ? 5 : 1,
          keperluan: globalKeperluan || defaultKeperluan
        };
        next[b.id] = {
          ...cur,
          selected: true,
          usulanJumlah: cur.usulanJumlah > 0 ? Math.min(cur.usulanJumlah, b.stokSekarang) : 1,
          keperluan: cur.keperluan || globalKeperluan || defaultKeperluan
        };
      }
    });
    setDrafts(next);
  };

  // Deselect all
  const handleDeselectAll = () => {
    const next: Record<string, ItemDraft> = {};
    Object.keys(drafts).forEach((id) => {
      next[id] = { ...drafts[id], selected: false };
    });
    setDrafts(next);
  };

  // Bulk Apply Global Keperluan to all currently selected items
  const handleApplyGlobalKeperluanToSelected = () => {
    if (!globalKeperluan.trim()) return;
    setDrafts((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (next[id]?.selected) {
          next[id] = {
            ...next[id],
            keperluan: globalKeperluan
          };
        }
      });
      return next;
    });
  };

  // Selected items calculation & validation
  const selectedItemsData = useMemo(() => {
    const list: Array<{ barang: Barang; draft: ItemDraft }> = [];
    let hasOverStock = false;
    let hasZeroQty = false;

    (Object.entries(drafts) as [string, ItemDraft][]).forEach(([id, draft]) => {
      if (draft && draft.selected) {
        const b = masterBarang.find((item) => item.id === id);
        if (b) {
          list.push({ barang: b, draft });
          if (draft.usulanJumlah > b.stokSekarang) {
            hasOverStock = true;
          }
          if (draft.usulanJumlah <= 0) {
            hasZeroQty = true;
          }
        }
      }
    });

    const totalQty = list.reduce((acc, curr) => acc + (curr.draft.usulanJumlah || 0), 0);
    const totalNilai = list.reduce(
      (acc, curr) => acc + (curr.draft.usulanJumlah || 0) * (curr.barang.hargaSatuan || 0),
      0
    );

    return {
      list,
      count: list.length,
      totalQty,
      totalNilai,
      hasOverStock,
      hasZeroQty
    };
  }, [drafts, masterBarang]);

  // Submit batch to parent
  const handleApplyBatch = () => {
    if (selectedItemsData.count === 0) return;
    if (selectedItemsData.hasOverStock) {
      alert('Terdapat barang yang jumlah dimintanya melampaui sisa stok gudang. Harap sesuaikan kuantitas terlebih dahulu.');
      return;
    }
    if (selectedItemsData.hasZeroQty) {
      alert('Jumlah usulan barang yang dipilih minimal 1 unit.');
      return;
    }

    const itemsToAdd: PengajuanItem[] = selectedItemsData.list.map(({ barang: b, draft }) => ({
      id: `item-${Date.now()}-${b.id}`,
      barangId: b.id,
      kodeBarang: b.kodeBarang,
      nusp: b.nusp,
      kodeRekening: b.kodeRekening,
      namaRekening: b.namaRekening,
      namaBarang: b.namaBarang,
      spesifikasi: b.spesifikasi || '',
      satuan: b.satuan,
      sisaBarang: b.stokSekarang,
      usulanJumlah: draft.usulanJumlah,
      hargaSatuan: b.hargaSatuan,
      keperluan: (draft.keperluan && draft.keperluan.trim()) || globalKeperluan || defaultKeperluan
    }));

    onAddBatch(itemsToAdd);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl my-auto flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header Pop-up Modal */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-blue-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30">
              <Boxes className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                Pilih Barang untuk Penyaluran (Batch Mode)
                <span className="bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {masterBarang.length} Master Barang
                </span>
              </h3>
              <p className="text-[11px] text-blue-200/90">
                Pilih multi-barang sekaligus, terapkan keperluan serentak, dan gunakan tombol Ambil Semua Stok untuk mempercepat input usulan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Keperluan Bar (Bulk Header Input) */}
        <div className="bg-blue-50/70 border-b border-blue-200/80 px-4 py-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Global Keperluan:</span>
            </div>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={globalKeperluan}
                onChange={(e) => setGlobalKeperluan(e.target.value)}
                placeholder="Ketik keterangan keperluan untuk semua barang terpilih (contoh: Kebutuhan Praktik Siswa Lab)..."
                className="flex-1 text-xs px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden font-medium"
              />
              <button
                type="button"
                onClick={handleApplyGlobalKeperluanToSelected}
                disabled={selectedItemsData.count === 0 || !globalKeperluan.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-2xs flex items-center gap-1"
                title="Terapkan teks keperluan ini ke seluruh item yang sedang dicentang"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Terapkan ke {selectedItemsData.count} Item</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Toolbar (Search, Rekening Dropdown, Stok Tersedia Toggle) */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2.5">
          <div className="flex flex-col md:flex-row items-center gap-2.5">
            {/* Search Bar */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama barang, kode barang, NUSP, atau spesifikasi..."
                className="w-full text-xs pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden text-slate-800 placeholder-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Kategori / Kode Rekening */}
            <div className="w-full md:w-72 shrink-0">
              <div className="relative">
                <select
                  value={selectedRekening}
                  onChange={(e) => setSelectedRekening(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg py-2 pl-3 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden font-medium text-slate-800 truncate"
                >
                  <option value="all">Semua Kategori Rekening ({rekeningList.length})</option>
                  {rekeningList.map((rek) => (
                    <option key={rek.kode} value={rek.kode}>
                      {rek.displayName} ({rek.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Toggle Hanya Stok Tersedia */}
            <div className="flex items-center gap-2 shrink-0">
              <label className="inline-flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 select-none">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Hanya Stok Tersedia (&gt; 0)</span>
              </label>
            </div>
          </div>

          {/* Quick Selection Actions Bar (Including Quick Autofill Max Stock) */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">
                Menampilkan: <strong>{filteredBarang.length}</strong> dari {masterBarang.length} barang
              </span>
              {selectedItemsData.count > 0 && (
                <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full border border-blue-200">
                  <Check className="w-3 h-3 text-blue-600" />
                  {selectedItemsData.count} item terpilih
                </span>
              )}
            </div>

            {/* Tombol Aksi Masal */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* TOMBOL UTAMA: [+ Ambil Semua Stok Tersedia] */}
              <button
                type="button"
                id="btn-ambil-semua-stok"
                onClick={handleTakeAllAvailableStock}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title="Centang semua barang yang tampil dan isi jumlah diminta persis sama dengan sisa stok gudang"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>+ Ambil Semua Stok Tersedia</span>
              </button>

              <button
                type="button"
                onClick={handleSelectAllAvailable}
                className="text-blue-600 hover:text-blue-800 font-semibold hover:underline flex items-center gap-1 px-2 py-1 bg-blue-50/70 rounded-md border border-blue-200"
                title="Pilih semua barang yang ada stoknya dengan kuantitas default"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Pilih Semua yang Tersedia</span>
              </button>

              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-slate-500 hover:text-rose-600 font-medium hover:underline flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md border border-slate-200"
                title="Batalkan seluruh centang pilihan"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Hapus Pilihan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Warning over-stock limit banner */}
        {selectedItemsData.hasOverStock && (
          <div className="mx-4 my-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">
              Peringatan Over-Stock Limit: Beberapa barang terpilih meminta jumlah melebihi sisa stok gudang! Harap turunkan kuantitas permintaan.
            </span>
          </div>
        )}

        {/* Item List Table with table-layout: fixed and 100% width */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {filteredBarang.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-medium text-sm">Tidak ada barang yang sesuai dengan filter pencarian.</p>
              <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau matikan filter stok.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-xs text-left" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px] sticky top-0 z-10">
                  <tr>
                    {/* Sum of widths: 4% + 24% + 18% + 6% + 11% + 12% + 10% + 15% = 100% */}
                    <th style={{ width: '4%' }} className="p-2.5 text-center">Pilih</th>
                    <th style={{ width: '24%' }} className="p-2.5">Nama Barang &amp; Spesifikasi</th>
                    <th style={{ width: '18%' }} className="p-2.5">Kategori / Rekening</th>
                    <th style={{ width: '6%' }} className="p-2.5 text-center">Satuan</th>
                    <th style={{ width: '11%' }} className="p-2.5 text-center">Sisa Stok</th>
                    <th style={{ width: '12%' }} className="p-2.5 text-right">Harga Satuan (Rp)</th>
                    <th style={{ width: '10%' }} className="p-2.5 text-center">Jml Diminta</th>
                    <th style={{ width: '15%' }} className="p-2.5">Keperluan Khusus Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 bg-white">
                  {filteredBarang.map((b) => {
                    const draft = getDraft(b);
                    const isAvailable = b.stokSekarang > 0;
                    const isOverStock = draft.usulanJumlah > b.stokSekarang;

                    return (
                      <tr
                        key={b.id}
                        className={`transition-colors ${
                          draft.selected
                            ? isOverStock
                              ? 'bg-rose-50/70'
                              : 'bg-blue-50/60'
                            : isAvailable
                            ? 'hover:bg-slate-50/80'
                            : 'bg-slate-50/50 opacity-60'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={draft.selected}
                            disabled={!isAvailable}
                            onChange={() => handleToggleSelect(b)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                            title={!isAvailable ? 'Stok habis, tidak dapat dipilih' : 'Pilih barang ini'}
                          />
                        </td>

                        {/* Nama Barang & Spesifikasi */}
                        <td className="p-2.5 overflow-hidden">
                          <div className="font-bold text-slate-800 text-xs truncate" title={b.namaBarang}>
                            {b.namaBarang}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5 truncate">
                            <span>Kode: {b.kodeBarang}</span>
                            <span>&bull;</span>
                            <span>NUSP: {b.nusp}</span>
                          </div>
                          {b.spesifikasi && (
                            <div className="text-[10px] text-slate-400 truncate mt-0.5" title={b.spesifikasi}>
                              {b.spesifikasi}
                            </div>
                          )}
                        </td>

                        {/* Kategori / Rekening */}
                        <td className="p-2.5 overflow-hidden">
                          <span className="inline-block font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-full">
                            {b.kodeRekening}
                          </span>
                          <div className="text-[10px] text-blue-700 font-medium truncate mt-0.5" title={b.namaRekening}>
                            {b.namaRekening}
                          </div>
                        </td>

                        {/* Satuan */}
                        <td className="p-2.5 text-center font-medium text-slate-700 truncate">
                          {b.satuan}
                        </td>

                        {/* Sisa Stok Real-Time */}
                        <td className="p-2.5 text-center">
                          {isAvailable ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <PackageCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                              {b.stokSekarang} {b.satuan}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              Habis (0)
                            </span>
                          )}
                        </td>

                        {/* Kolom HARGA SATUAN (RP) - Readonly Terkunci Mengikuti Master Barang */}
                        <td className="p-2.5 text-right font-mono font-semibold text-slate-700 truncate">
                          <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100/80 px-1.5 py-0.5 rounded border border-slate-200" title="Terkunci mengikuti harga acuan Master Barang">
                            {formatRupiah(b.hargaSatuan || 0)}
                          </span>
                        </td>

                        {/* Input Jumlah Diminta - Disabled jika baris belum dicentang */}
                        <td className="p-2.5 text-center">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max={b.stokSekarang > 0 ? b.stokSekarang : 1}
                              value={draft.selected ? draft.usulanJumlah : 0}
                              disabled={!draft.selected || !isAvailable}
                              onChange={(e) => handleQtyChange(b, parseInt(e.target.value, 10))}
                              className={`w-full text-center text-xs font-bold border rounded-md py-1 px-1 focus:outline-hidden transition-all ${
                                !draft.selected || !isAvailable
                                  ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed select-none'
                                  : isOverStock
                                  ? 'border-rose-500 bg-rose-100 text-rose-800 focus:ring-2 focus:ring-rose-500'
                                  : 'border-blue-500 bg-white text-blue-900 focus:ring-2 focus:ring-blue-500'
                              }`}
                            />
                          </div>
                          {draft.selected && isOverStock && (
                            <span className="block text-[9px] text-rose-600 font-semibold mt-0.5 leading-tight">
                              Melebihi stok ({b.stokSekarang})!
                            </span>
                          )}
                        </td>

                        {/* Keperluan Khusus Item - Disabled jika baris belum dicentang */}
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={draft.selected ? draft.keperluan : ''}
                            disabled={!draft.selected || !isAvailable}
                            onChange={(e) => handleKeperluanChange(b, e.target.value)}
                            placeholder={draft.selected ? (globalKeperluan || "Catatan khusus item...") : "- (centang untuk mengisi) -"}
                            className="w-full text-xs border border-slate-300 rounded-md py-1 px-2 bg-white text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Summary & Dynamic Action Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-100 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
            <div>
              Item Terpilih:{' '}
              <strong className="text-blue-700 font-bold text-sm bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {selectedItemsData.count} jenis
              </strong>
            </div>
            <div>
              Total Volume Fisik:{' '}
              <strong className="text-slate-900 font-bold text-sm">
                {selectedItemsData.totalQty} unit
              </strong>
            </div>
            <div>
              Estimasi Nilai:{' '}
              <strong className="text-emerald-700 font-mono text-sm font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {formatRupiah(selectedItemsData.totalNilai)}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              id="btn-apply-batch-penyaluran"
              onClick={handleApplyBatch}
              disabled={
                selectedItemsData.count === 0 ||
                selectedItemsData.hasOverStock ||
                selectedItemsData.hasZeroQty
              }
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Selesai &amp; Masukkan ke Tabel ({selectedItemsData.count} Item)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
