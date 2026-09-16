import {
  AlertCircle,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  Hash,
  HelpCircle,
  Info,
  Layers,
  Loader2,
  PackageCheck,
  PackagePlus,
  Plus,
  PlusCircle,
  ShieldCheck,
  Trash2,
  UserCheck,
  X
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Barang, ItemPenerimaan, Pejabat, TransaksiPenerimaan } from '../types';
import { formatRupiah } from '../utils/numberGenerator';
import { getBarangByRekening, getUniqueKodeRekening } from '../utils/rekeningHelper';
import { BatchAddBarangModal } from './BatchAddBarangModal';

interface Props {
  masterBarang: Barang[];
  pejabatList: Pejabat[];
  initialData?: TransaksiPenerimaan | null;
  onSavePenerimaan: (penerimaan: TransaksiPenerimaan) => void;
  onCancel: () => void;
}

// Utility: format number into dot-separated thousands string (e.g. 1500000 -> 1.500.000)
function formatThousands(value: number | string): string {
  if (value === '' || value === undefined || value === null) return '0';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '0';
  return new Intl.NumberFormat('id-ID').format(parseInt(digits, 10));
}

// Utility: parse dot-separated or raw string into clean integer
function parseThousands(value: string): number {
  const digits = value.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

export const PenerimaanForm: React.FC<Props> = ({
  masterBarang,
  pejabatList,
  initialData,
  onSavePenerimaan,
  onCancel
}) => {
  const isEditMode = Boolean(initialData);
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Transaction Header States (Grid 4 Kolom)
  const [tanggal, setTanggal] = useState(initialData?.tanggal || todayStr);
  const [noBukti, setNoBukti] = useState(
    initialData?.noBukti ||
    `BOS-REG/${new Date().getMonth() + 1}/${new Date().getFullYear()}/${String(
      Math.floor(100 + Math.random() * 900)
    )}`
  );
  const [sumberDana, setSumberDana] = useState<
    'BOS Reguler' | 'BOS Kinerja' | 'BPOPP / APBD' | 'Komite / Hibah'
  >(initialData?.sumberDana || 'BOS Reguler');
  const [penyedia, setPenyedia] = useState(initialData?.penyedia || 'CV. Sarana Edukasi Prima');
  const [keterangan, setKeterangan] = useState(initialData?.keterangan || 'Pengadaan Belanja Persediaan Habis Pakai ATK & Operasional');

  // Petugas Pengurus Barang Penerima diambil otomatis dari Menu Pengaturan
  const defaultPejabatPenerima = useMemo(() => {
    return (
      pejabatList.find(
        (p) =>
          p.id === 'pejabat-pengurus-barang' ||
          p.jabatan.toLowerCase().includes('pengurus barang') ||
          p.jabatan.toLowerCase().includes('sarpras')
      ) ||
      pejabatList[0] || {
        id: 'pejabat-pengurus-barang',
        nama: 'Pengurus Barang Pembantu',
        nip: '-',
        jabatan: 'Pengurus Barang Pembantu'
      }
    );
  }, [pejabatList]);

  const penerimaId = defaultPejabatPenerima.id;

  // Kode Rekening Belanja helpers
  const rekeningList = useMemo(() => getUniqueKodeRekening(masterBarang), [masterBarang]);
  const defaultRekening = rekeningList[0]?.kode || masterBarang[0]?.kodeRekening || '5.1.02.01.01.0024';
  const defaultBarangList = getBarangByRekening(masterBarang, defaultRekening);
  const initialBarang = defaultBarangList[0] || masterBarang[0];

  // Items State
  const [items, setItems] = useState<ItemPenerimaan[]>(() => {
    if (initialData && initialData.items && initialData.items.length > 0) {
      return initialData.items;
    }
    return [
      {
        barangId: initialBarang?.id || '',
        namaBarang: initialBarang?.namaBarang || '',
        kodeBarang: initialBarang?.kodeBarang || '',
        nusp: initialBarang?.nusp || '',
        kodeRekening: initialBarang?.kodeRekening || defaultRekening,
        namaRekening: initialBarang?.namaRekening || rekeningList[0]?.nama || 'Belanja Alat Tulis Kantor',
        satuan: initialBarang?.satuan || 'Rim',
        jumlahMasuk: 10,
        hargaSatuan: initialBarang?.hargaSatuan || 48500,
        subtotal: 10 * (initialBarang?.hargaSatuan || 48500)
      }
    ];
  });

  // Modal Dialog States
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Real-time calculations
  const grandTotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  }, [items]);

  const totalKuantitas = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.jumlahMasuk || 0), 0);
  }, [items]);

  // --- Handlers for Table Operations ---

  // 1. Handle select Kode Rekening (Step 1 Dependent Dropdown)
  const handleSelectRekening = (index: number, newKodeRekening: string) => {
    const matchingBarang = getBarangByRekening(masterBarang, newKodeRekening);
    const updated = [...items];
    const rekeningInfo = rekeningList.find((r) => r.kode === newKodeRekening);
    const fallbackNamaRekening = rekeningInfo?.nama || 'Belanja Persediaan';
    const qty = updated[index].jumlahMasuk || 1;

    if (matchingBarang.length > 0) {
      const currentMatch = matchingBarang.find((b) => b.id === updated[index].barangId);
      const targetBarang = currentMatch || matchingBarang[0];

      updated[index] = {
        ...updated[index],
        kodeRekening: newKodeRekening,
        namaRekening: targetBarang.namaRekening || fallbackNamaRekening,
        barangId: targetBarang.id,
        namaBarang: targetBarang.namaBarang,
        kodeBarang: targetBarang.kodeBarang,
        nusp: targetBarang.nusp,
        satuan: targetBarang.satuan,
        hargaSatuan: targetBarang.hargaSatuan,
        subtotal: qty * targetBarang.hargaSatuan
      };
    } else {
      updated[index] = {
        ...updated[index],
        kodeRekening: newKodeRekening,
        namaRekening: fallbackNamaRekening,
        barangId: '',
        namaBarang: '',
        kodeBarang: '',
        nusp: '',
        satuan: '-',
        hargaSatuan: 0,
        subtotal: 0
      };
    }
    setItems(updated);
  };

  // 2. Handle select Barang (Step 2 Dependent Dropdown)
  const handleSelectBarang = (index: number, barangId: string) => {
    const selected = masterBarang.find((b) => b.id === barangId);
    if (!selected) return;

    const updated = [...items];
    const qty = updated[index].jumlahMasuk || 1;
    updated[index] = {
      ...updated[index],
      barangId: selected.id,
      namaBarang: selected.namaBarang,
      kodeBarang: selected.kodeBarang,
      nusp: selected.nusp,
      kodeRekening: selected.kodeRekening,
      namaRekening: selected.namaRekening,
      satuan: selected.satuan,
      hargaSatuan: selected.hargaSatuan,
      subtotal: qty * selected.hargaSatuan
    };
    setItems(updated);
  };

  // 3. Quick Add Single Row
  const handleAddQuickRow = () => {
    const lastItemRekening = items[items.length - 1]?.kodeRekening;
    const targetRekening =
      lastItemRekening || rekeningList[0]?.kode || masterBarang[0]?.kodeRekening || '5.1.02.01.01.0024';
    const matchingBarang = getBarangByRekening(masterBarang, targetRekening);
    const b = matchingBarang[0] || masterBarang[0];

    const newItem: ItemPenerimaan = {
      barangId: b?.id || '',
      namaBarang: b?.namaBarang || '',
      kodeBarang: b?.kodeBarang || '',
      nusp: b?.nusp || '',
      kodeRekening: b?.kodeRekening || targetRekening,
      namaRekening:
        b?.namaRekening ||
        rekeningList.find((r) => r.kode === targetRekening)?.nama ||
        'Belanja Alat Tulis Kantor',
      satuan: b?.satuan || 'Pcs',
      jumlahMasuk: 1,
      hargaSatuan: b?.hargaSatuan || 0,
      subtotal: 1 * (b?.hargaSatuan || 0)
    };
    setItems([...items, newItem]);
    setErrorMsg(null);
  };

  // 4. Remove Single Row
  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      setErrorMsg('Tabel harus memiliki minimal 1 baris barang masuk.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
    setErrorMsg(null);
  };

  // 5. Quantity Change (Interactive)
  const handleQuantityChange = (index: number, qty: number) => {
    const updated = [...items];
    const validQty = Math.max(1, qty || 1);
    updated[index] = {
      ...updated[index],
      jumlahMasuk: validQty,
      subtotal: validQty * (updated[index].hargaSatuan || 0)
    };
    setItems(updated);
  };

  // 6. Price Change with Auto Currency Mask (Interactive)
  const handlePriceChange = (index: number, rawInput: string) => {
    const numericPrice = parseThousands(rawInput);
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      hargaSatuan: numericPrice,
      subtotal: (updated[index].jumlahMasuk || 1) * numericPrice
    };
    setItems(updated);
  };

  // 7. Batch Append from Pop-up Sub-Modal
  const handleAddBatch = (batchItems: ItemPenerimaan[]) => {
    if (batchItems.length === 0) return;

    // If only 1 placeholder row exists with 0 price and default qty, replace it
    const isSingleDefaultRow =
      items.length === 1 &&
      (!items[0].barangId || items[0].hargaSatuan === 0);

    if (isSingleDefaultRow) {
      setItems(batchItems);
    } else {
      // Append new items
      setItems((prev) => [...prev, ...batchItems]);
    }
    setErrorMsg(null);
  };

  // --- Validation & Submit Handlers ---
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!tanggal) {
      setErrorMsg('Tanggal penerimaan barang harus diisi.');
      return;
    }
    if (!noBukti.trim()) {
      setErrorMsg('No. Bukti / Faktur / SPK harus diisi.');
      return;
    }
    if (!penyedia.trim()) {
      setErrorMsg('Nama Rekanan / Penyedia (Vendor) harus diisi.');
      return;
    }
    if (items.length === 0) {
      setErrorMsg('Minimal 1 barang harus dimasukkan ke dalam daftar.');
      return;
    }

    // Validate each row: no empty barang, no zero qty, no zero price
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.barangId) {
        setErrorMsg(`Baris ke-${i + 1}: Silakan pilih komoditas barang yang valid.`);
        return;
      }
      if (!it.jumlahMasuk || it.jumlahMasuk <= 0) {
        setErrorMsg(`Baris ke-${i + 1} (${it.namaBarang || 'Barang'}): Jumlah masuk tidak boleh 0 atau kosong.`);
        return;
      }
      if (it.hargaSatuan === undefined || it.hargaSatuan <= 0) {
        setErrorMsg(`Baris ke-${i + 1} (${it.namaBarang || 'Barang'}): Harga satuan tidak boleh 0 atau kosong.`);
        return;
      }
    }

    // Open confirmation modal
    setIsConfirmOpen(true);
  };

  const handleFinalSave = () => {
    setIsSubmitting(true);

    const newPenerimaan: TransaksiPenerimaan = {
      ...(initialData || {}),
      id: initialData ? initialData.id : `rcv-${Date.now()}`,
      tanggal,
      noBukti: noBukti.trim(),
      sumberDana,
      penyedia: penyedia.trim(),
      keterangan: keterangan.trim(),
      penerimaId,
      items,
      totalNilai: grandTotal
    };

    // Small timeout to simulate async safety and guarantee spinner renders
    setTimeout(() => {
      onSavePenerimaan(newPenerimaan);
      setIsSubmitting(false);
      setIsConfirmOpen(false);
    }, 350);
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 ring-1 ring-slate-900/5 flex flex-col max-h-[92vh] overflow-hidden">
      
      {/* 1. TOP STICKY CONTAINER (Modal Header + 4-Column Grid + Sticky Action Bar) */}
      <div className="shrink-0 bg-white border-b border-slate-200 z-20 sticky top-0 shadow-xs">
        
        {/* Title Bar */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                {isEditMode ? `Koreksi / Edit Riwayat Penerimaan (${initialData?.noBukti})` : 'Catat Penerimaan Barang Masuk (Pengadaan BOS / APBD)'}
                {isEditMode && (
                  <span className="hidden sm:inline-block bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] px-2 py-0.5 rounded-full font-mono">
                    Mode Koreksi &amp; Penyesuaian Stok
                  </span>
                )}
              </h2>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                {isEditMode
                  ? 'Perbarui rincian faktur penerimaan pengadaan. Selisih jumlah masuk otomatis disinkronkan ke saldo stok gudang.'
                  : 'Menambah saldo stok fisik gudang dan otomatis terintegrasi pada Buku Penerimaan & Rekapitulasi BOS.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Tutup Form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Column Compact Grid Header */}
        <div className="p-4 sm:p-5 bg-slate-50/90 border-b border-slate-200/90 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* Kolom 1: Tanggal Penerimaan */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Tanggal Penerimaan
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden"
                required
              />
            </div>

            {/* Kolom 2: No. Bukti / Faktur / SPK */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-emerald-600" />
                No. Bukti / Faktur / SPK
              </label>
              <input
                type="text"
                value={noBukti}
                onChange={(e) => setNoBukti(e.target.value)}
                placeholder="Contoh: BOS-REG/09/2026/042"
                className="w-full text-xs font-mono font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden"
                required
              />
            </div>

            {/* Kolom 3: Sumber Anggaran */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                Sumber Anggaran
              </label>
              <select
                value={sumberDana}
                onChange={(e) => setSumberDana(e.target.value as any)}
                className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden"
              >
                <option value="BOS Reguler">BOS Reguler</option>
                <option value="BOS Kinerja">BOS Kinerja</option>
                <option value="BPOPP / APBD">BPOPP / APBD Provinsi/Kota</option>
                <option value="Komite / Hibah">Komite / Hibah</option>
              </select>
            </div>

            {/* Kolom 4: Nama Rekanan / Vendor */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                Nama Rekanan / Vendor
              </label>
              <input
                type="text"
                value={penyedia}
                onChange={(e) => setPenyedia(e.target.value)}
                placeholder="Contoh: CV. Sarana Edukasi Prima"
                className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden"
                required
              />
            </div>

          </div>

          {/* Info Banner Petugas Pengurus Barang (Otomatis dari Pengaturan) */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-emerald-50/60 border border-emerald-200/80 px-3 py-1.5 rounded-lg text-slate-600">
            <div className="flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Petugas Penerima Otomatis:{' '}
                <strong className="text-emerald-900">{defaultPejabatPenerima.nama}</strong>{' '}
                <span className="text-slate-500">({defaultPejabatPenerima.jabatan})</span>
              </span>
            </div>
            <div className="text-[10px] text-emerald-800/80 bg-white px-2 py-0.5 rounded border border-emerald-200 font-medium">
              Data Petugas diambil dari Pengaturan Pejabat Instansi
            </div>
          </div>
        </div>

        {/* Sticky Action Bar & Quick Tooling */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-800 uppercase flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              Daftar Barang Masuk
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
              {items.length} item barang
            </span>
            <span className="text-slate-400 hidden sm:inline">&bull;</span>
            <span className="text-slate-500 hidden sm:inline">
              Total: <strong className="font-mono text-emerald-700">{formatRupiah(grandTotal)}</strong>
            </span>
          </div>

          {/* Dual Input Buttons (Hybrid Mode) */}
          <div className="flex items-center gap-2">
            {/* 1. Quick Add Row Button */}
            <button
              type="button"
              onClick={handleAddQuickRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-all active:scale-98"
              title="Tambah 1 baris kosong di tabel untuk input cepat manual"
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" />
              + Baris Baru
            </button>

            {/* 2. Batch Pop-up Modal Button */}
            <button
              type="button"
              onClick={() => setIsBatchModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-lg shadow-2xs transition-all ring-1 ring-emerald-700/30"
              title="Buka pop-up untuk mencari, memilih, dan menambahkan banyak barang sekaligus"
            >
              <Boxes className="w-3.5 h-3.5 text-emerald-200" />
              + Tambah Banyak Barang (Pop-up)
            </button>
          </div>
        </div>

      </div>

      {/* 2. ERROR NOTIFICATION (if any) */}
      {errorMsg && (
        <div className="mx-5 my-2 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2.5 text-rose-800 text-xs shrink-0 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* 3. SCROLLABLE MAIN TABLE AREA (Fixed Width & Column Proportions) */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs bg-white">
          <table
            className="w-full text-xs text-left"
            style={{ tableLayout: 'fixed', width: '100%' }}
          >
            <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th style={{ width: '4%' }} className="p-2 text-center">No</th>
                <th style={{ width: '26%' }} className="p-2">Kategori / Kode Rekening</th>
                <th style={{ width: '26%' }} className="p-2">Nama Barang</th>
                <th style={{ width: '8%' }} className="p-2 text-center">Satuan</th>
                <th style={{ width: '8%' }} className="p-2 text-center">Jml Masuk</th>
                <th style={{ width: '12%' }} className="p-2 text-right">Harga Satuan (Rp)</th>
                <th style={{ width: '12%' }} className="p-2 text-right">Subtotal (Rp)</th>
                <th style={{ width: '4%' }} className="p-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {items.map((it, idx) => {
                const currentRowRekening = it.kodeRekening || rekeningList[0]?.kode || '5.1.02.01.01.0024';
                const filteredBarangList = getBarangByRekening(masterBarang, currentRowRekening);

                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* No (4%) */}
                    <td className="p-2 text-center font-medium text-slate-500">
                      {idx + 1}
                    </td>

                    {/* Kategori / Kode Rekening (26%) */}
                    <td className="p-2">
                      <select
                        value={currentRowRekening}
                        onChange={(e) => handleSelectRekening(idx, e.target.value)}
                        className="w-full border border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/60 rounded-md px-2 py-1 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden truncate"
                        title={it.namaRekening}
                      >
                        {rekeningList.map((rek) => (
                          <option key={rek.kode} value={rek.kode}>
                            {rek.displayName} ({rek.count})
                          </option>
                        ))}
                      </select>
                      <div className="text-[10px] text-emerald-800 font-medium truncate mt-0.5" title={it.namaRekening}>
                        {it.namaRekening}
                      </div>
                    </td>

                    {/* Nama Barang (26%) */}
                    <td className="p-2">
                      <select
                        value={it.barangId}
                        onChange={(e) => handleSelectBarang(idx, e.target.value)}
                        disabled={filteredBarangList.length === 0}
                        className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium disabled:bg-slate-100 disabled:text-slate-400 truncate"
                        title={it.namaBarang}
                      >
                        {filteredBarangList.length === 0 ? (
                          <option value="">-- Tidak ada barang pada rekening ini --</option>
                        ) : (
                          filteredBarangList.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.namaBarang} ({b.kodeBarang})
                            </option>
                          ))
                        )}
                      </select>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-mono">
                        <span className="truncate">{it.kodeBarang}</span>
                        {it.nusp && (
                          <span className="bg-slate-100 text-slate-600 px-1 rounded text-[9px] shrink-0">
                            NUSP: {it.nusp}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Satuan (8%) */}
                    <td className="p-2 text-center font-medium text-slate-700">
                      <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 text-[11px]">
                        {it.satuan || '-'}
                      </span>
                    </td>

                    {/* Jml Masuk (8%) */}
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="1"
                        value={it.jumlahMasuk}
                        onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value, 10) || 1)}
                        className="w-full border border-slate-300 rounded-md text-center py-1 font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden"
                      />
                    </td>

                    {/* Harga Satuan (Rp) (12%) - With Auto Currency Mask */}
                    <td className="p-2 text-right">
                      <input
                        type="text"
                        value={formatThousands(it.hargaSatuan)}
                        onChange={(e) => handlePriceChange(idx, e.target.value)}
                        placeholder="0"
                        className="w-full border border-slate-300 rounded-md text-right px-2 py-1 font-mono font-semibold text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden"
                      />
                    </td>

                    {/* Subtotal (Rp) (12%) - Real-time calculation */}
                    <td className="p-2 text-right font-mono font-bold text-slate-900 text-xs">
                      {formatThousands(it.subtotal)}
                    </td>

                    {/* Aksi (4%) - Tombol Hapus */}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={items.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none rounded transition-colors"
                        title="Hapus baris ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Ringkasan Kalkulasi Real-time */}
        <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl">
          <div className="flex items-center gap-3 text-xs text-slate-700">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <PackageCheck className="w-4 h-4 text-emerald-700" />
              Total Item: <strong>{items.length} barang</strong>
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="font-medium">
              Total Volume: <strong>{totalKuantitas} unit/satuan</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600 font-semibold">Total Nilai Pembelian BOS:</span>
            <span className="text-base sm:text-lg font-bold font-mono text-emerald-900 bg-white px-3 py-1 rounded-lg border border-emerald-300 shadow-2xs">
              {formatRupiah(grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. MODAL FOOTER ACTION (Sticky Bottom) */}
      <div className="shrink-0 bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
        >
          Batal
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePreSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-sm flex items-center gap-2 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan Transaksi...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan &amp; Tambah Stok Gudang</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 5. SUB-MODAL: BATCH ADD BARANG */}
      <BatchAddBarangModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        masterBarang={masterBarang}
        onAddBatch={handleAddBatch}
      />

      {/* 6. CONFIRMATION POP-UP (Keamanan Transaksi & Double-Submit Protection) */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Konfirmasi Simpan Penerimaan
                </h4>
                <p className="text-xs text-slate-500">
                  Periksa ringkasan sebelum stok gudang diperbarui.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs mb-5">
              <div className="flex justify-between">
                <span className="text-slate-500">No. Bukti / Faktur:</span>
                <span className="font-mono font-semibold text-slate-900">{noBukti}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal Transaksi:</span>
                <span className="font-semibold text-slate-900">{tanggal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sumber Dana:</span>
                <span className="font-semibold text-emerald-800">{sumberDana}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Penyedia (Vendor):</span>
                <span className="font-semibold text-slate-900">{penyedia}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jumlah Barang Masuk:</span>
                <span className="font-bold text-slate-900">{items.length} item ({totalKuantitas} unit)</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-700">Total Nilai BOS:</span>
                <span className="font-bold font-mono text-emerald-800">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              {isEditMode
                ? 'Apakah Anda yakin ingin menyimpan perubahan faktur ini? Selisih barang masuk otomatis disinkronkan ke saldo persediaan gudang.'
                : 'Apakah Anda yakin data ini sudah benar? Stok barang gudang akan otomatis bertambah sesuai volume yang dicatat.'}
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Periksa Kembali
              </button>
              <button
                type="button"
                onClick={handleFinalSave}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-sm flex items-center gap-2 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isEditMode ? 'Menyimpan Koreksi...' : 'Menyimpan...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isEditMode ? 'Ya, Simpan Koreksi & Sesuaikan Stok' : 'Ya, Simpan & Tambah Stok'}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
