import { 
  AlertCircle, 
  Box, 
  Calendar, 
  Check, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Eye, 
  FileCheck2, 
  FileText, 
  HelpCircle, 
  Layers, 
  Package, 
  PackageSearch, 
  Plus, 
  Printer, 
  Search, 
  Sparkles, 
  Trash2, 
  UserCheck, 
  X,
  Filter
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { 
  AppUser, 
  Barang, 
  KopSuratConfig, 
  NumberingPatternConfig, 
  Pejabat, 
  PengajuanItem, 
  TransaksiPengeluaran 
} from '../types';
import { formatTanggalIndonesia, generateDocumentNumbers, calculateNextDocumentCounters, deriveSchoolCode } from '../utils/numberGenerator';
import { getBarangByRekening, getUniqueKodeRekening } from '../utils/rekeningHelper';
import { DocNPB } from './documents/DocNPB';

interface Props {
  currentUser: AppUser;
  masterBarang: Barang[];
  pejabatList: Pejabat[];
  kopConfig: KopSuratConfig;
  numberingConfig?: NumberingPatternConfig;
  transaksiList: TransaksiPengeluaran[];
  onSaveNPB: (transaksi: TransaksiPengeluaran) => void;
  onOpenUserSwitcher: () => void;
}

export const StaffPermintaanNPBView: React.FC<Props> = ({
  currentUser,
  masterBarang,
  pejabatList,
  kopConfig,
  numberingConfig,
  transaksiList,
  onSaveNPB,
  onOpenUserSwitcher
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'riwayat' | 'katalog'>('form');
  const [previewNPB, setPreviewNPB] = useState<TransaksiPengeluaran | null>(null);

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [tanggal, setTanggal] = useState(todayStr);
  const [unitPemohon, setUnitPemohon] = useState(currentUser.unitKerja || 'Bidang Pembelajaran & Kesiswaan');
  const [keperluanUmum, setKeperluanUmum] = useState('Kebutuhan Operasional Kegiatan Belajar Mengajar & Pelayanan Sekolah');

  // Signatories
  // Look for matching pejabat or default
  const defaultPemohon = pejabatList.find(p => p.nama.toLowerCase().includes(currentUser.nama.toLowerCase()))?.id || pejabatList[0]?.id || '';
  const defaultSarpras = pejabatList.find(p => p.jabatan.toLowerCase().includes('sarana') || p.jabatan.toLowerCase().includes('sarpras'))?.id || pejabatList[1]?.id || '';
  const defaultPengurusBarang = pejabatList.find(p => p.jabatan.toLowerCase().includes('pengurus') || p.jabatan.toLowerCase().includes('pembantu'))?.id || pejabatList[2]?.id || '';
  const defaultKepsek = pejabatList.find(p => p.jabatan.toLowerCase().includes('kepala sekolah'))?.id || pejabatList[0]?.id || '';

  const [pemohonId, setPemohonId] = useState(defaultPemohon);
  const [sarprasId, setSarprasId] = useState(defaultSarpras);

  // Unique list of Kode Rekening Belanja from masterBarang
  const rekeningList = useMemo(() => getUniqueKodeRekening(masterBarang), [masterBarang]);

  const defaultInitialRekening = rekeningList[0]?.kode || masterBarang[0]?.kodeRekening || '5.1.02.01.01.0024';
  const defaultMatchingBarang = getBarangByRekening(masterBarang, defaultInitialRekening);
  const defaultInitialBarang = defaultMatchingBarang[0] || masterBarang[0];

  // Items requested
  const [items, setItems] = useState<PengajuanItem[]>([
    {
      id: `item-${Date.now()}-1`,
      barangId: defaultInitialBarang?.id || '',
      kodeBarang: defaultInitialBarang?.kodeBarang || '',
      nusp: defaultInitialBarang?.nusp || '',
      kodeRekening: defaultInitialBarang?.kodeRekening || defaultInitialRekening,
      namaRekening: defaultInitialBarang?.namaRekening || rekeningList[0]?.nama || 'Belanja Alat Tulis Kantor',
      namaBarang: defaultInitialBarang?.namaBarang || '',
      spesifikasi: defaultInitialBarang?.spesifikasi || '',
      satuan: defaultInitialBarang?.satuan || 'Pcs',
      sisaBarang: defaultInitialBarang?.stokSekarang || 0,
      usulanJumlah: 1,
      hargaSatuan: defaultInitialBarang?.hargaSatuan || 0,
      keperluan: 'Keperluan administrasi tugas KBM'
    }
  ]);

  // Search catalog filter
  const [searchKatalog, setSearchKatalog] = useState('');
  const [filterKategori, setFilterKategori] = useState('all');

  // Auto-generate No. NPB using dynamic school code and independent counter
  const schoolCode = deriveSchoolCode(kopConfig?.namaSekolah, numberingConfig?.schoolCode);
  const counters = useMemo(() => calculateNextDocumentCounters(transaksiList, numberingConfig), [transaksiList, numberingConfig]);
  const autoNums = useMemo(() => generateDocumentNumbers(counters, tanggal, schoolCode, numberingConfig, kopConfig?.namaSekolah), [counters, tanggal, schoolCode, numberingConfig, kopConfig?.namaSekolah]);

  // Filter Bertingkat: Select Rekening Belanja
  const handleItemRekeningChange = (index: number, newKodeRekening: string) => {
    const matchingBarang = getBarangByRekening(masterBarang, newKodeRekening);
    const updated = [...items];
    const rekeningInfo = rekeningList.find(r => r.kode === newKodeRekening);
    const fallbackNamaRekening = rekeningInfo?.nama || 'Belanja Persediaan';

    if (matchingBarang.length > 0) {
      const currentMatch = matchingBarang.find(b => b.id === updated[index].barangId);
      const targetBarang = currentMatch || matchingBarang[0];

      updated[index] = {
        ...updated[index],
        kodeRekening: newKodeRekening,
        namaRekening: targetBarang.namaRekening || fallbackNamaRekening,
        barangId: targetBarang.id,
        kodeBarang: targetBarang.kodeBarang,
        nusp: targetBarang.nusp,
        namaBarang: targetBarang.namaBarang,
        spesifikasi: targetBarang.spesifikasi || '',
        satuan: targetBarang.satuan,
        sisaBarang: targetBarang.stokSekarang,
        hargaSatuan: targetBarang.hargaSatuan,
        usulanJumlah: 1
      };
    } else {
      updated[index] = {
        ...updated[index],
        kodeRekening: newKodeRekening,
        namaRekening: fallbackNamaRekening,
        barangId: '',
        kodeBarang: '',
        nusp: '',
        namaBarang: '',
        spesifikasi: '',
        satuan: '-',
        sisaBarang: 0,
        hargaSatuan: 0,
        usulanJumlah: 1
      };
    }
    setItems(updated);
  };

  const handleAddItem = () => {
    const lastRekening = items[items.length - 1]?.kodeRekening;
    const targetRekening = lastRekening || rekeningList[0]?.kode || masterBarang[0]?.kodeRekening || '5.1.02.01.01.0024';
    const matchingBarang = getBarangByRekening(masterBarang, targetRekening);
    const firstAvailable = matchingBarang.find(b => !items.some(it => it.barangId === b.id)) || matchingBarang[0] || masterBarang[0];
    if (!firstAvailable) return;

    const newItem: PengajuanItem = {
      id: `item-${Date.now()}-${items.length + 1}`,
      barangId: firstAvailable.id,
      kodeBarang: firstAvailable.kodeBarang,
      nusp: firstAvailable.nusp,
      kodeRekening: firstAvailable.kodeRekening || targetRekening,
      namaRekening: firstAvailable.namaRekening || rekeningList.find(r => r.kode === targetRekening)?.nama || 'Belanja Alat Tulis Kantor',
      namaBarang: firstAvailable.namaBarang,
      spesifikasi: firstAvailable.spesifikasi || '',
      satuan: firstAvailable.satuan,
      sisaBarang: firstAvailable.stokSekarang,
      usulanJumlah: 1,
      hargaSatuan: firstAvailable.hargaSatuan,
      keperluan: keperluanUmum || 'Kebutuhan KBM'
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('Minimal 1 jenis barang yang diajukan dalam Nota Permintaan Barang.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemBarangChange = (index: number, newBarangId: string) => {
    const selected = masterBarang.find(b => b.id === newBarangId);
    if (!selected) return;

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      barangId: selected.id,
      kodeBarang: selected.kodeBarang,
      nusp: selected.nusp,
      kodeRekening: selected.kodeRekening,
      namaRekening: selected.namaRekening,
      namaBarang: selected.namaBarang,
      spesifikasi: selected.spesifikasi || '',
      satuan: selected.satuan,
      sisaBarang: selected.stokSekarang,
      hargaSatuan: selected.hargaSatuan
    };
    setItems(updated);
  };

  const handleItemQtyChange = (index: number, val: number) => {
    const updated = [...items];
    const item = updated[index];
    const qty = Math.max(1, isNaN(val) ? 1 : val);
    item.usulanJumlah = qty;
    setItems(updated);
  };

  const handleItemKeperluanChange = (index: number, val: string) => {
    const updated = [...items];
    updated[index].keperluan = val;
    setItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      alert('Pilih minimal 1 barang persediaan.');
      return;
    }

    // Check stock warning
    const overStock = items.find(it => it.usulanJumlah > it.sisaBarang);
    if (overStock) {
      if (!confirm(`Peringatan: Usulan jumlah untuk "${overStock.namaBarang}" (${overStock.usulanJumlah} ${overStock.satuan}) melebihi stok yang saat ini tersedia di gudang (${overStock.sisaBarang} ${overStock.satuan}). Tetap lanjutkan pengajuan usulan NPB?`)) {
        return;
      }
    }

    const generated = generateDocumentNumbers(counters, tanggal, schoolCode, numberingConfig, kopConfig?.namaSekolah);
    const nextCounter = counters.npb;

    const newTrx: TransaksiPengeluaran = {
      id: `trx-${Date.now()}`,
      nomorUrut: nextCounter,
      tanggal,
      unitPemohon: unitPemohon.trim(),
      keperluanUmum: keperluanUmum.trim(),
      noNPB: generated.noNPB,
      noSPB: generated.noSPB,
      noSPPB: generated.noSPPB,
      noBAST: generated.noBAST,
      items,
      pemohonId: pemohonId || (pejabatList[0]?.id ?? ''),
      sarprasId: sarprasId || (pejabatList[1]?.id ?? ''),
      pengurusBarangId: defaultPengurusBarang || (pejabatList[2]?.id ?? ''),
      kepsekId: defaultKepsek || (pejabatList[0]?.id ?? ''),
      status: 'diajukan',
      catatan: `Diajukan via portal guru oleh ${currentUser.nama}`,
      createdAt: new Date().toISOString()
    };

    onSaveNPB(newTrx);
    setPreviewNPB(newTrx);
    setActiveSubTab('riwayat');
  };

  // Filter Catalog
  const filteredCatalog = masterBarang.filter(b => {
    const matchSearch = b.namaBarang.toLowerCase().includes(searchKatalog.toLowerCase()) ||
      b.kodeBarang.toLowerCase().includes(searchKatalog.toLowerCase()) ||
      (b.spesifikasi && b.spesifikasi.toLowerCase().includes(searchKatalog.toLowerCase()));
    const matchKategori = filterKategori === 'all' || b.kategori === filterKategori;
    return matchSearch && matchKategori;
  });

  // Filter user's or school's NPBs
  const userNPBList = transaksiList;

  const handlePrintNPB = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Teacher / Staff Header Hero */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-blue-800/80">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs px-2.5 py-0.5 rounded-full font-medium">
              <UserCheck className="w-3.5 h-3.5 text-blue-300" />
              Portal Pengguna (Staf &amp; Guru) • Menu Nota Permintaan Barang (NPB)
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Halo, {currentUser.nama}
            </h1>
            <p className="text-xs text-blue-100 max-w-2xl leading-relaxed">
              Selamat datang di antarmuka pengajuan kebutuhan barang {kopConfig.namaSekolah}. 
              Silakan isi formulir di bawah ini untuk mengajukan usulan ATK, bahan KBM, atau perlengkapan operasional kelas.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-xl border border-white/15 backdrop-blur-xs">
            <div className="text-right">
              <div className="text-[11px] font-bold text-white">{currentUser.jabatan || 'Guru / Staf'}</div>
              <div className="text-[10px] text-blue-200">{currentUser.unitKerja || 'Satuan Pendidikan'}</div>
            </div>
            <button
              onClick={onOpenUserSwitcher}
              className="ml-2 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold transition-colors border border-white/20"
              title="Ganti akun atau uji peran lain"
            >
              Ganti Akun
            </button>
          </div>
        </div>

        {/* Tab Navigation for Staff */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={() => setActiveSubTab('form')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'form'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Plus className="w-4 h-4" />
            Ajukan Permintaan Barang (NPB)
          </button>

          <button
            onClick={() => setActiveSubTab('riwayat')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'riwayat'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Clock className="w-4 h-4" />
            Riwayat Pengajuan NPB ({userNPBList.length})
          </button>

          <button
            onClick={() => setActiveSubTab('katalog')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'katalog'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <PackageSearch className="w-4 h-4" />
            Katalog Stok Gudang
          </button>
        </div>
      </div>

      {/* SUBTAB 1: Formulir Pengajuan NPB */}
      {activeSubTab === 'form' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden ring-1 ring-slate-900/5">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Formulir Usulan Kebutuhan Barang (NPB)
                </h2>
                <p className="text-xs text-slate-500">
                  Nomor NPB otomatis digenerate sesuai format resmi sekolah
                </p>
              </div>
            </div>

            <span className="bg-blue-50 text-blue-700 font-mono font-bold text-xs px-2.5 py-1 rounded-lg border border-blue-200">
              No: {autoNums.noNPB}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs">
            {/* Header info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tanggal Pengajuan Usulan <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Unit Kerja / Pemohon <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={unitPemohon}
                  onChange={(e) => setUnitPemohon(e.target.value)}
                  placeholder="Contoh: Guru Matematika / Lab IPA / Kelas XI TKJ"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Keperluan Umum Pengajuan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={keperluanUmum}
                  onChange={(e) => setKeperluanUmum(e.target.value)}
                  placeholder="Contoh: Kebutuhan Asesmen Sumatif Akhir Semester"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            {/* Penandatangan NPB */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pejabat Pemohon (Tanda Tangan Kiri) <span className="text-red-500">*</span>
                </label>
                <select
                  value={pemohonId}
                  onChange={(e) => setPemohonId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                >
                  {pejabatList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nama} — {p.jabatan} ({p.unitKerja || '-'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mengetahui Wakasek Sarpras (Tanda Tangan Kanan) <span className="text-red-500">*</span>
                </label>
                <select
                  value={sarprasId}
                  onChange={(e) => setSarprasId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                >
                  {pejabatList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nama} — {p.jabatan}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Requested Items Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Filter className="w-4 h-4 text-blue-600" />
                    Daftar Barang yang Diajukan ({items.length} Item) — Filter Bertingkat
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pilih <strong>Kategori / Kode Rekening Belanja</strong> terlebih dahulu, lalu pilih <strong>Nama Barang</strong> dari opsi yang otomatis terfilter.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Tambah Barang
                </button>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                  <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-10 text-center">No</th>
                      <th className="p-3 w-60">1. Kategori / Kode Rekening</th>
                      <th className="p-3 w-64">2. Nama Barang (Terfilter)</th>
                      <th className="p-3 w-28 text-center">Sisa Stok</th>
                      <th className="p-3 w-28 text-center">Jumlah Usulan</th>
                      <th className="p-3">Untuk Keperluan</th>
                      <th className="p-3 w-12 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => {
                      const currentRowRekening = it.kodeRekening || rekeningList[0]?.kode || '5.1.02.01.01.0024';
                      const filteredBarangList = getBarangByRekening(masterBarang, currentRowRekening);
                      const isLow = it.usulanJumlah > it.sisaBarang;

                      return (
                        <tr key={it.id} className="hover:bg-slate-50/70">
                          <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          
                          {/* Step 1: Kode Rekening Dropdown */}
                          <td className="p-3">
                            <select
                              value={currentRowRekening}
                              onChange={(e) => handleItemRekeningChange(idx, e.target.value)}
                              className="w-full px-2 py-1.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                              title="Pilih Kode Rekening Belanja terlebih dahulu"
                            >
                              {rekeningList.map((rek) => (
                                <option key={rek.kode} value={rek.kode}>
                                  {rek.displayName} ({rek.count} barang)
                                </option>
                              ))}
                            </select>
                            <div className="text-[10px] text-blue-700 font-medium truncate mt-0.5" title={it.namaRekening}>
                              {it.namaRekening}
                            </div>
                          </td>

                          {/* Step 2: Nama Barang Dropdown (Filtered) */}
                          <td className="p-3">
                            <select
                              value={it.barangId}
                              onChange={(e) => handleItemBarangChange(idx, e.target.value)}
                              disabled={filteredBarangList.length === 0}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              {filteredBarangList.length === 0 ? (
                                <option value="">-- Tidak ada barang pada rekening ini --</option>
                              ) : (
                                filteredBarangList.map(b => (
                                  <option key={b.id} value={b.id}>
                                    {b.namaBarang} [{b.satuan}] — Stok: {b.stokSekarang} {b.satuan}
                                  </option>
                                ))
                              )}
                            </select>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[9px]">
                                {filteredBarangList.length} barang tersedia
                              </span>
                              {it.spesifikasi && (
                                <span className="truncate max-w-[140px] text-slate-400" title={it.spesifikasi}>
                                  {it.spesifikasi}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                              it.sisaBarang > 10 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : it.sisaBarang > 0 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                  : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {it.sisaBarang} {it.satuan}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={1}
                                value={it.usulanJumlah}
                                onChange={(e) => handleItemQtyChange(idx, parseInt(e.target.value, 10))}
                                className={`w-20 px-2.5 py-1.5 text-center font-bold rounded-lg border text-xs focus:ring-2 focus:outline-hidden ${
                                  isLow ? 'border-red-400 bg-red-50 text-red-800' : 'border-slate-300 bg-white'
                                }`}
                                required
                              />
                              <span className="text-[11px] text-slate-500 font-medium">{it.satuan}</span>
                            </div>
                            {isLow && (
                              <div className="text-[10px] text-red-600 font-semibold mt-0.5">
                                Melebihi stok gudang!
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={it.keperluan}
                              onChange={(e) => handleItemKeperluanChange(idx, e.target.value)}
                              placeholder="Keterangan peruntukan..."
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Hapus baris barang"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Setelah dikirim, lembar formulir NPB dapat langsung dicetak atau diunduh sebagai PDF resmi.
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-98"
              >
                <FileCheck2 className="w-4 h-4" />
                Kirim Usulan Nota Permintaan Barang (NPB)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBTAB 2: Riwayat Pengajuan NPB */}
      {activeSubTab === 'riwayat' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden ring-1 ring-slate-900/5">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Riwayat Pengajuan Nota Permintaan Barang (NPB)
              </h2>
              <p className="text-xs text-slate-500">
                Daftar berkas usulan kebutuhan barang sekolah yang siap dicetak dan ditandatangani
              </p>
            </div>

            <button
              onClick={() => setActiveSubTab('form')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              + Buat Usulan Baru
            </button>
          </div>

          {userNPBList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Package className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">Belum ada usulan barang yang diajukan.</p>
              <button
                onClick={() => setActiveSubTab('form')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
              >
                Mulai Ajukan Permintaan Barang (NPB)
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {userNPBList.map((trx, idx) => (
                <div key={trx.id} className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded text-xs">
                        {trx.noNPB}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        • {formatTanggalIndonesia(trx.tanggal)}
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {trx.status === 'disalurkan' ? 'Telah Disalurkan' : 'Usulan Diajukan'}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-900">
                      {trx.unitPemohon}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {trx.keperluanUmum}
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {trx.items.map((it, i) => (
                        <span key={i} className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                          {it.namaBarang} ({it.usulanJumlah} {it.satuan})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewNPB(trx)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Lihat &amp; Cetak NPB
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: Katalog Stok Gudang */}
      {activeSubTab === 'katalog' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden ring-1 ring-slate-900/5">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PackageSearch className="w-4 h-4 text-blue-600" />
                Katalog Ketersediaan Barang Gudang Sekolah
              </h2>
              <p className="text-xs text-slate-500">
                Cek ketersediaan fisik sebelum membuat usulan kebutuhan barang
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchKatalog}
                  onChange={(e) => setSearchKatalog(e.target.value)}
                  placeholder="Cari barang / kode..."
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden w-48"
                />
              </div>

              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="all">Semua Kategori</option>
                <option value="ATK / Kertas">ATK / Kertas</option>
                <option value="Kebersihan">Kebersihan</option>
                <option value="Elektronik & Komputer">Elektronik &amp; Komputer</option>
                <option value="Alat Praktik/Peraga">Alat Praktik/Peraga</option>
                <option value="Perlengkapan Umum">Perlengkapan Umum</option>
              </select>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCatalog.map(b => (
              <div key={b.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/30 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                    <span>{b.kodeBarang}</span>
                    <span className="bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded font-sans font-medium">
                      {b.kategori}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs line-clamp-2">
                    {b.namaBarang}
                  </h4>
                  {b.spesifikasi && (
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 italic">
                      {b.spesifikasi}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Stok Gudang:</span>
                    <span className={`font-mono font-bold text-xs ${
                      b.stokSekarang > 10 ? 'text-emerald-700' : b.stokSekarang > 0 ? 'text-amber-700' : 'text-red-600'
                    }`}>
                      {b.stokSekarang} {b.satuan}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setItems([{
                        id: `item-${Date.now()}`,
                        barangId: b.id,
                        kodeBarang: b.kodeBarang,
                        nusp: b.nusp,
                        kodeRekening: b.kodeRekening,
                        namaRekening: b.namaRekening,
                        namaBarang: b.namaBarang,
                        spesifikasi: b.spesifikasi || '',
                        satuan: b.satuan,
                        sisaBarang: b.stokSekarang,
                        usulanJumlah: 1,
                        hargaSatuan: b.hargaSatuan,
                        keperluan: keperluanUmum || 'Kebutuhan KBM'
                      }]);
                      setActiveSubTab('form');
                    }}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
                  >
                    Ajukan Barang Ini
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL PREVIEW & PRINT DOKUMEN NPB */}
      {previewNPB && (
        <div className="no-print fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            {/* Modal Control Toolbar */}
            <div className="no-print bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm">Pratinjau Nota Permintaan Barang (NPB)</h3>
                  <p className="text-[11px] text-slate-400">{previewNPB.noNPB}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintNPB}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Cetak / Simpan PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewNPB(null)}
                  className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Paper Container */}
            <div className="p-8 max-h-[80vh] overflow-y-auto bg-slate-100 flex justify-center">
              <div className="bg-white shadow-lg p-10 max-w-[210mm] w-full min-h-[297mm] text-black border border-slate-300">
                <DocNPB
                  transaksi={previewNPB}
                  kopConfig={kopConfig}
                  pejabatList={pejabatList}
                  minRows={10}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
