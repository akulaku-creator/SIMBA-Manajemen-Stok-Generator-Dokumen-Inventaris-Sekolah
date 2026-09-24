import { 
  AlertTriangle, 
  BookOpen, 
  Boxes, 
  Building2, 
  Check, 
  Download,
  Edit3, 
  FileSpreadsheet, 
  Layers, 
  Package, 
  Plus, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  Tag, 
  Trash2, 
  X 
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  DAFTAR_REKENING_BELANJA_MODAL, 
  MASTER_40_REKENING_OPTIONS, 
  MASTER_KODE_REKENING, 
  getNamaRekeningByKode, 
  getNamaRekeningDefault 
} from '../data/kodeRekeningData';
import { Barang, JenisBarang, KategoriBarangItem } from '../types';
import { exportMasterBarangToExcel } from '../utils/excelHelper';
import { formatRupiah } from '../utils/numberGenerator';
import { ImportBarangModal } from './ImportBarangModal';
import { KategoriRekeningSelect, SelectedRekening } from './KategoriRekeningSelect';

interface Props {
  barangList: Barang[];
  onAddBarang: (barang: Barang) => void;
  onUpdateBarang: (barang: Barang) => void;
  onDeleteBarang: (id: string) => void;
  onImportBarang?: (barangList: Barang[], mode: 'append' | 'replace') => void;
  onViewKartuBarang?: (barangId: string) => void;
  onViewKartuPersediaan?: (barangId: string) => void;
  kategoriList?: KategoriBarangItem[];
  onUpdateKategoriList?: (list: KategoriBarangItem[]) => void;
  onMigrateUnmappedCategories?: (targetCategoryName?: string) => void;
}

export const MasterBarangTable: React.FC<Props> = ({
  barangList,
  onAddBarang,
  onUpdateBarang,
  onDeleteBarang,
  onImportBarang,
  onViewKartuBarang,
  onViewKartuPersediaan,
  onMigrateUnmappedCategories
}) => {
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState<'Semua' | 'BHP' | 'Belanja Modal'>('Semua');
  const [filterKategori, setFilterKategori] = useState<string>('Semua');
  
  // Fitur Pencarian Cepat Kolom Kategori & Kode Rekening
  const [categorySearch, setCategorySearch] = useState<string>('');
  const [isCatSearchOpen, setIsCatSearchOpen] = useState<boolean>(false);
  const catSearchContainerRef = useRef<HTMLDivElement>(null);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        catSearchContainerRef.current &&
        !catSearchContainerRef.current.contains(event.target as Node)
      ) {
        setIsCatSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Saran Kategori berdasarkan teks yang diketik pada kolom kategori
  const categorySuggestions = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) {
      return MASTER_KODE_REKENING.slice(0, 10);
    }
    return MASTER_KODE_REKENING.filter(
      item =>
        item.kode.toLowerCase().includes(q) ||
        item.nama.toLowerCase().includes(q)
    ).slice(0, 15);
  }, [categorySearch]);

  // Helper untuk menyorot kata kunci pencarian kategori
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.trim().toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 text-yellow-950 px-0.5 rounded font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Auto-generate Kode Barang toggle
  const [autoGenerateKode, setAutoGenerateKode] = useState<boolean>(true);

  // Form State
  const [formData, setFormData] = useState<Partial<Barang>>({
    kodeBarang: '',
    nusp: '',
    kodeRekening: '5.1.02.01.01.0024',
    namaRekening: 'Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
    namaBarang: '',
    spesifikasi: '',
    kategori: 'Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
    satuan: 'Pcs',
    hargaSatuan: 25000,
    stokAwal: 10,
    stokSekarang: 10,
    lokasiGudang: 'Gudang TU',
    jenisBarang: 'BHP'
  });

  // Display Harga dengan pemisah ribuan
  const [displayHarga, setDisplayHarga] = useState<string>('25.000');

  // Calculate Auto Kode Barang based on Kategori & Rekening
  const generateAutoKode = (
    kategoriName: string,
    jenis: JenisBarang = 'BHP',
    excludeBarangId?: string | null
  ): string => {
    const matched = MASTER_KODE_REKENING.find(r => r.nama === kategoriName);
    let prefix = '1.01.03.01.';
    if (jenis === 'Belanja Modal' || matched?.jenisAset === 'Belanja Modal') {
      prefix = '1.03.02.01.';
    } else if (matched?.kode) {
      prefix = `1.01.03.${matched.kode.slice(-2)}.`;
    }

    // Filter items with same prefix
    const matchingItems = barangList.filter(
      b => b.id !== excludeBarangId && b.kodeBarang && b.kodeBarang.startsWith(prefix)
    );

    let maxSeq = 0;
    matchingItems.forEach(b => {
      const suffix = b.kodeBarang.slice(prefix.length).trim();
      const num = parseInt(suffix, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    });

    const nextSeq = String(maxSeq + 1).padStart(2, '0');
    return `${prefix}${nextSeq}`;
  };

  // Detect unmapped / legacy categories in barangList
  const unmappedBarangCount = useMemo(() => {
    const validCodes = new Set(MASTER_KODE_REKENING.map(r => r.kode));
    const validNames = new Set(MASTER_KODE_REKENING.map(r => r.nama.toLowerCase().trim()));
    return barangList.filter(b => {
      const hasValidCode = b.kodeRekening && validCodes.has(b.kodeRekening.trim());
      const hasValidName = b.kategori && validNames.has(b.kategori.toLowerCase().trim());
      return !hasValidCode && !hasValidName;
    }).length;
  }, [barangList]);

  // Counts for tabs
  const bhpCount = barangList.filter(b => b.jenisBarang !== 'Belanja Modal').length;
  const modalCount = barangList.filter(b => b.jenisBarang === 'Belanja Modal').length;

  const filtered = useMemo(() => {
    const qSearch = search.trim().toLowerCase();
    const qCat = categorySearch.trim().toLowerCase();

    return barangList.filter(b => {
      const matchSearch = !qSearch ||
        b.namaBarang.toLowerCase().includes(qSearch) ||
        b.kodeBarang.toLowerCase().includes(qSearch) ||
        b.nusp.toLowerCase().includes(qSearch) ||
        (b.spesifikasi && b.spesifikasi.toLowerCase().includes(qSearch)) ||
        (b.kodeRekening && b.kodeRekening.toLowerCase().includes(qSearch)) ||
        (b.kategori && b.kategori.toLowerCase().includes(qSearch)) ||
        (b.namaRekening && b.namaRekening.toLowerCase().includes(qSearch));

      const matchJenis = 
        filterJenis === 'Semua' ||
        (filterJenis === 'BHP' && b.jenisBarang !== 'Belanja Modal') ||
        (filterJenis === 'Belanja Modal' && b.jenisBarang === 'Belanja Modal');

      const matchCat = 
        filterKategori === 'Semua' || 
        b.kategori === filterKategori || 
        b.namaRekening === filterKategori ||
        b.kodeRekening === filterKategori;

      const matchCatSearch = !qCat || (
        (b.kategori && b.kategori.toLowerCase().includes(qCat)) ||
        (b.kodeRekening && b.kodeRekening.toLowerCase().includes(qCat)) ||
        (b.namaRekening && b.namaRekening.toLowerCase().includes(qCat))
      );

      return matchSearch && matchJenis && matchCat && matchCatSearch;
    });
  }, [barangList, search, filterJenis, filterKategori, categorySearch]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setAutoGenerateKode(true);
    const nextNusp = `${String(barangList.length + 1).padStart(4, '0')}/2026`;
    const defaultKode = '5.1.02.01.01.0024';
    const defaultNama = getNamaRekeningByKode(defaultKode);
    const autoKode = generateAutoKode(defaultNama, 'BHP', null);

    setFormData({
      kodeBarang: autoKode,
      nusp: nextNusp,
      kodeRekening: defaultKode,
      namaRekening: defaultNama,
      namaBarang: '',
      spesifikasi: '',
      kategori: defaultNama,
      satuan: 'Pcs',
      hargaSatuan: 25000,
      stokAwal: 10,
      stokSekarang: 10,
      lokasiGudang: 'Gudang TU',
      jenisBarang: 'BHP'
    });
    setDisplayHarga('25.000');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (barang: Barang) => {
    setEditingId(barang.id);
    setAutoGenerateKode(false); // Manual mode when editing to preserve existing code
    const kode = barang.kodeRekening || '5.1.02.01.01.0024';
    const nama = barang.namaRekening || getNamaRekeningByKode(kode);
    setFormData({
      ...barang,
      kodeRekening: kode,
      namaRekening: nama,
      kategori: barang.kategori || nama,
      jenisBarang: barang.jenisBarang || 'BHP'
    });
    setDisplayHarga(barang.hargaSatuan ? barang.hargaSatuan.toLocaleString('id-ID') : '0');
    setIsModalOpen(true);
  };

  // Switch Jenis Barang (BHP vs Belanja Modal)
  const handleSelectJenisBarang = (jenis: JenisBarang) => {
    let newKode = formData.kodeRekening || '5.1.02.01.01.0024';
    let newNama = formData.namaRekening || getNamaRekeningByKode(newKode);

    if (jenis === 'Belanja Modal') {
      if (!newKode.startsWith('5.2')) {
        newKode = '5.2.02.05.01.0005';
        newNama = 'Belanja Modal Peralatan Komputer (PC, Laptop, Server)';
      }
    } else {
      if (newKode.startsWith('5.2')) {
        newKode = '5.1.02.01.01.0024';
        newNama = 'Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor';
      }
    }

    const autoKode = autoGenerateKode ? generateAutoKode(newNama, jenis, editingId) : formData.kodeBarang;

    setFormData(prev => ({
      ...prev,
      jenisBarang: jenis,
      kategori: newNama,
      kodeRekening: newKode,
      namaRekening: newNama,
      kodeBarang: autoKode
    }));
  };

  // Single Source of Truth: Memilih Kategori & Kode Rekening Sekaligus (1 Kategori = 1 Rekening)
  const handleRekeningKategoriSelect = (selected: SelectedRekening) => {
    const suggestedJenis = selected.jenisAset || formData.jenisBarang || 'BHP';
    const autoKode = autoGenerateKode ? generateAutoKode(selected.nama, suggestedJenis, editingId) : formData.kodeBarang;

    setFormData(prev => ({
      ...prev,
      kategori: selected.nama,
      kodeRekening: selected.kode,
      namaRekening: selected.nama,
      jenisBarang: suggestedJenis,
      kodeBarang: autoKode
    }));
  };

  // Format Rupiah Input with dots
  const handleHargaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    const num = rawVal ? parseInt(rawVal, 10) : 0;
    setDisplayHarga(rawVal ? num.toLocaleString('id-ID') : '');
    setFormData(prev => ({ ...prev, hargaSatuan: num }));
  };

  // Re-generate auto code on demand
  const handleRegenerateKode = () => {
    const newCode = generateAutoKode(
      formData.kategori || 'Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
      formData.jenisBarang || 'BHP',
      editingId
    );
    setFormData(prev => ({ ...prev, kodeBarang: newCode }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaBarang || !formData.kodeBarang || !formData.nusp) return;

    const finalKodeRekening = formData.kodeRekening || '5.1.02.01.01.0024';
    const finalNamaRekening = formData.namaRekening || getNamaRekeningDefault(finalKodeRekening);
    // Unifikasi mutlak: Kategori = Uraian Rekening Belanja
    const finalKategori = finalNamaRekening;

    if (editingId) {
      onUpdateBarang({
        ...(formData as Barang),
        id: editingId,
        kategori: finalKategori,
        kodeRekening: finalKodeRekening,
        namaRekening: finalNamaRekening,
        jenisBarang: formData.jenisBarang || 'BHP'
      });
    } else {
      const newBarang: Barang = {
        id: `brg-${Date.now()}`,
        kodeBarang: formData.kodeBarang || '',
        nusp: formData.nusp || '',
        kodeRekening: finalKodeRekening,
        namaRekening: finalNamaRekening,
        namaBarang: formData.namaBarang || '',
        spesifikasi: formData.spesifikasi || '',
        kategori: finalKategori,
        satuan: formData.satuan || 'Pcs',
        hargaSatuan: Number(formData.hargaSatuan) || 0,
        stokAwal: Number(formData.stokAwal) || 0,
        stokSekarang: Number(formData.stokSekarang) || 0,
        lokasiGudang: formData.lokasiGudang || 'Gudang Utama',
        jenisBarang: formData.jenisBarang || 'BHP'
      };
      onAddBarang(newBarang);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Master Inventaris Barang, NUSP &amp; Klasifikasi Aset
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Data referensi tunggal terintegrasi: <span className="font-semibold text-blue-700">1 Kategori Barang = 1 Kode Rekening Belanja</span> (40 Master Rekening Resmi Pemda &amp; Inventaris SIMBA).
          </p>
        </div>

        {/* 3 Tombol Aksi Utama: Export ke Excel, Import dari Excel, + Tambah Barang Baru */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export Excel Button (Hijau / Emerald) */}
          <button
            type="button"
            onClick={() => exportMasterBarangToExcel(filtered)}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition-all active:scale-98 cursor-pointer"
            title={`Ekspor ${filtered.length} data barang ke berkas Excel (.xlsx) sesuai filter dan pencarian aktif`}
          >
            <Download className="w-4 h-4" />
            Export ke Excel
          </button>

          {/* Import Excel Button (Hijau / Emerald) */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition-all active:scale-98 cursor-pointer"
            title="Import inventaris barang dari file Excel (.xlsx, .xls, .csv)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import dari Excel
          </button>

          {/* Tambah Barang Baru Button (Biru Utama) */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Barang Baru
          </button>
        </div>
      </div>

      {/* Filter Tabs (Semua / BHP / Belanja Modal) & Search */}
      <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Segmented Filter Jenis Aset */}
          <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setFilterJenis('Semua')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterJenis === 'Semua'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Inventaris ({barangList.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterJenis('BHP')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterJenis === 'BHP'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
              title="Barang Habis Pakai (ATK, Kebersihan, Komputer consumable, dsbg.)"
            >
              <Package className="w-3.5 h-3.5" />
              BHP / Habis Pakai ({bhpCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterJenis('Belanja Modal')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterJenis === 'Belanja Modal'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-purple-700'
              }`}
              title="Aset Tetap & Peralatan (Laptop, PC, Proyektor, Meubelair, dsb.)"
            >
              <Building2 className="w-3.5 h-3.5" />
              Belanja Modal / Aset ({modalCount})
            </button>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> BHP masuk Laporan Mutasi BOS.
            <span className="w-2 h-2 rounded-full bg-purple-500 ml-2"></span> Belanja Modal terakumulasi di Buku Aset Tetap.
          </div>
        </div>

        {/* Search Bar & Kategori Filter Dinamis (40 Master Rekening) */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama barang, spesifikasi, kode barang, rekening, atau NUSP..."
              className="w-full text-xs pl-10 pr-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Filter Kategori:</span>
            <select
              id="filter_kategori"
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg py-2 px-3 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden w-full md:w-80 cursor-pointer truncate"
            >
              <option value="Semua">Semua Kategori (40 Master Resmi)</option>
              <optgroup label="40 Daftar Master Rekening Resmi">
                {MASTER_40_REKENING_OPTIONS.map((item) => (
                  <option key={item.kode} value={item.nama}>
                    {item.kode} - {item.nama}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Rekening Belanja Modal (Aset Tetap)">
                {DAFTAR_REKENING_BELANJA_MODAL.map((item) => (
                  <option key={item.kode} value={item.nama}>
                    {item.kode} - {item.nama}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Active Category Search Filter Tag */}
        {categorySearch && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Filter Aktif Kolom Kategori:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-semibold text-xs">
              <Tag className="w-3 h-3 text-blue-600" />
              &quot;{categorySearch}&quot;
              <button
                type="button"
                onClick={() => {
                  setCategorySearch('');
                  setIsCatSearchOpen(false);
                }}
                className="hover:bg-blue-200/60 p-0.5 rounded-full text-blue-700 hover:text-blue-900 cursor-pointer ml-0.5 transition-colors"
                title="Hapus filter kolom kategori"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
            <span className="text-[11px] text-slate-400">
              ({filtered.length} barang cocok)
            </span>
          </div>
        )}
      </div>

      {/* Warning & Safe Migration Handling for Unmapped Categories */}
      {unmappedBarangCount > 0 && (
        <div className="mb-3.5 px-4 py-3 bg-amber-50 border border-amber-200/90 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-semibold">Perhatian Penyelarasan Kategori:</span> Ditemukan <strong>{unmappedBarangCount}</strong> barang yang menggunakan kategori lawas yang belum diselaraskan ke 40 Master Rekening Resmi.
            </div>
          </div>
          {onMigrateUnmappedCategories && (
            <button
              type="button"
              onClick={() => onMigrateUnmappedCategories('Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              Selaraskan ke "5.1.02.01.01.0024 - Alat Tulis Kantor"
            </button>
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs ring-1 ring-slate-900/5">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5 w-10 text-center">No</th>
                <th className="p-3.5 w-24 text-center">Jenis Aset</th>
                <th className="p-3.5 w-32">Kode Barang</th>
                <th className="p-3.5 w-28">NUSP</th>
                <th className="p-3.5">Nama &amp; Spesifikasi Barang</th>
                
                {/* Kolom Kategori dengan Fitur Pencarian Cepat */}
                <th className="p-3 w-80 align-top normal-case">
                  <div className="flex items-center justify-between gap-1 mb-1.5 uppercase tracking-wider text-[11px] font-semibold text-slate-700">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-blue-600" />
                      Kategori &amp; Rekening
                    </span>
                    {categorySearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setCategorySearch('');
                          setIsCatSearchOpen(false);
                        }}
                        className="inline-flex items-center gap-0.5 text-[10px] text-rose-600 hover:text-rose-700 font-semibold bg-rose-50 hover:bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors normal-case"
                        title="Reset filter kategori"
                      >
                        <X className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>

                  {/* Search input pada kolom kategori */}
                  <div className="relative font-normal" ref={catSearchContainerRef}>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={categorySearch}
                        onChange={(e) => {
                          setCategorySearch(e.target.value);
                          setIsCatSearchOpen(true);
                        }}
                        onFocus={() => setIsCatSearchOpen(true)}
                        placeholder="Ketik kode (0024) atau nama..."
                        className={`w-full text-xs font-normal normal-case pl-8 pr-7 py-1.5 bg-white border rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden transition-all shadow-2xs ${
                          categorySearch
                            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 font-medium'
                            : 'border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                      />
                      {categorySearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setCategorySearch('');
                            setIsCatSearchOpen(false);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded"
                          title="Kosongkan filter kategori"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Popover Suggestions */}
                    {isCatSearchOpen && (
                      <div className="absolute left-0 top-full mt-1 w-88 max-w-[90vw] bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-left normal-case">
                        <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">Pilih dari Master Rekening</span>
                          <span className="text-[10px]">Ketik untuk memfilter</span>
                        </div>
                        <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                          {categorySuggestions.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-500">
                              Tidak ditemukan rekening &quot;{categorySearch}&quot;
                            </div>
                          ) : (
                            categorySuggestions.map((item) => {
                              const isSelected =
                                categorySearch.toLowerCase() === item.nama.toLowerCase() ||
                                categorySearch.toLowerCase() === item.kode.toLowerCase();
                              return (
                                <button
                                  key={item.kode}
                                  type="button"
                                  onClick={() => {
                                    setCategorySearch(item.nama);
                                    setIsCatSearchOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50/80 transition-colors flex flex-col gap-0.5 cursor-pointer ${
                                    isSelected ? 'bg-blue-50 text-blue-900 font-semibold' : 'text-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.2 rounded">
                                      {item.kode}
                                    </span>
                                    <span className="text-[10px] text-slate-500 uppercase font-medium">
                                      {item.jenisAset}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-700 line-clamp-1 leading-snug">
                                    {item.nama}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </th>

                <th className="p-3.5 w-16 text-center">Satuan</th>
                <th className="p-3.5 w-28 text-right">Harga Standar</th>
                <th className="p-3.5 w-24 text-center">Stok Saat Ini</th>
                <th className="p-3.5 w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    <div className="max-w-md mx-auto flex flex-col items-center gap-2">
                      <Package className="w-8 h-8 text-slate-300" />
                      <p className="font-medium text-slate-700">
                        {categorySearch
                          ? `Tidak ditemukan barang untuk kategori atau kode rekening "${categorySearch}".`
                          : 'Tidak ditemukan data barang yang sesuai kriteria pencarian.'}
                      </p>
                      {(search || categorySearch || filterKategori !== 'Semua' || filterJenis !== 'Semua') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch('');
                            setCategorySearch('');
                            setIsCatSearchOpen(false);
                            setFilterKategori('Semua');
                            setFilterJenis('Semua');
                          }}
                          className="mt-1 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Reset Semua Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((b, idx) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="p-3.5 text-center">
                      {b.jenisBarang === 'Belanja Modal' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          <Building2 className="w-3 h-3" />
                          Modal / Aset
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          <Package className="w-3 h-3" />
                          BHP
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-700 font-semibold">{b.kodeBarang}</td>
                    <td className="p-3.5">
                      <span className="font-mono text-[11px] text-blue-700 font-semibold bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded">
                        {b.nusp}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">{b.namaBarang}</div>
                      {b.spesifikasi && (
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{b.spesifikasi}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          categorySearch && (b.kodeRekening || '5.1.02.01.01.0024').toLowerCase().includes(categorySearch.toLowerCase().trim())
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'text-blue-700 bg-blue-50 border border-blue-200/80'
                        }`}>
                          {highlightMatch(b.kodeRekening || '5.1.02.01.01.0024', categorySearch)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-800 font-semibold leading-snug line-clamp-2" title={b.kategori || b.namaRekening}>
                        {highlightMatch(b.kategori || b.namaRekening, categorySearch)}
                      </div>
                    </td>
                    <td className="p-3.5 text-center font-medium text-slate-700">{b.satuan}</td>
                    <td className="p-3.5 text-right font-mono font-medium text-slate-800">{formatRupiah(b.hargaSatuan)}</td>
                    <td className="p-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${
                        b.stokSekarang === 0
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : b.stokSekarang <= 10
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {b.stokSekarang <= 10 && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                        {b.stokSekarang} {b.satuan}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onViewKartuBarang && (
                          <button
                            onClick={() => onViewKartuBarang(b.id)}
                            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="Tinjau &amp; Cetak Kartu Barang (Lampiran 12 - Mutasi Fisik)"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                          </button>
                        )}
                        {onViewKartuPersediaan && (
                          <button
                            onClick={() => onViewKartuPersediaan(b.id)}
                            className="p-1.5 text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                            title="Tinjau &amp; Cetak Kartu Persediaan Barang (Lampiran 11 - Mutasi Keuangan BOS)"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-600" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Barang"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Yakin ingin menghapus ${b.namaBarang}?`)) {
                              onDeleteBarang(b.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Barang"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Barang */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingId ? 'Edit Data Inventaris Barang' : 'Tambah Barang Baru'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pengisian inventaris dengan Kategori &amp; Kode Rekening terpadu (Single Source of Truth).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              {/* 1. JENIS ASET: BHP vs BELANJA MODAL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Klasifikasi Jenis Belanja &amp; Pelaporan <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectJenisBarang('BHP')}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.jenisBarang === 'BHP'
                        ? 'bg-blue-50/90 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${
                      formData.jenisBarang === 'BHP' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold flex items-center gap-1">
                        BHP (Habis Pakai)
                        {formData.jenisBarang === 'BHP' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        ATK, Kertas, Kebersihan, Bahan Komputer
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectJenisBarang('Belanja Modal')}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.jenisBarang === 'Belanja Modal'
                        ? 'bg-purple-50/90 border-purple-500 text-purple-900 ring-2 ring-purple-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${
                      formData.jenisBarang === 'Belanja Modal' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold flex items-center gap-1">
                        Belanja Modal (Aset)
                        {formData.jenisBarang === 'Belanja Modal' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        Laptop, PC, Proyektor, Meubelair
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. KATEGORI & KODE REKENING (SINGLE SOURCE OF TRUTH: SEARCHABLE SELECT DARI 40 MASTER) */}
              <div className="space-y-2 p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    Kategori &amp; Kode Rekening Belanja (40 Master Rekening Resmi) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold border border-blue-200/80">
                    1 Kategori = 1 Rekening
                  </span>
                </div>

                {/* Searchable Select Component */}
                <KategoriRekeningSelect
                  valueKode={formData.kodeRekening}
                  valueKategori={formData.kategori}
                  jenisBarang={formData.jenisBarang}
                  onSelect={handleRekeningKategoriSelect}
                />

                {/* Auto-Assigned Info Banner (Read-Only) */}
                <div className="p-2.5 bg-white border border-slate-200/90 rounded-lg flex items-center justify-between gap-3 text-xs shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                    <span className="font-mono text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded shrink-0">
                      {formData.kodeRekening || '5.1.02.01.01.0024'}
                    </span>
                    <span className="text-slate-800 font-medium truncate text-xs" title={formData.namaRekening}>
                      {formData.namaRekening || getNamaRekeningDefault(formData.kodeRekening || '5.1.02.01.01.0024')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Auto-Assigned &amp; Terkunci
                  </div>
                </div>
              </div>

              {/* 3. KODE BARANG & TOGGLE AUTO-GENERATE */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    Kodefikasi Inventaris &amp; NUSP
                  </label>

                  {/* Toggle Auto-Generate Kode Barang */}
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoGenerateKode}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setAutoGenerateKode(checked);
                        if (checked) {
                          const autoKode = generateAutoKode(
                            formData.kategori || 'Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
                            formData.jenisBarang || 'BHP',
                            editingId
                          );
                          setFormData(prev => ({ ...prev, kodeBarang: autoKode }));
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Auto-Generate Kode
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-700">Kode Barang</label>
                      {autoGenerateKode && (
                        <button
                          type="button"
                          onClick={handleRegenerateKode}
                          className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                          title="Generate ulang kode baru"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          Regenerate
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.kodeBarang}
                        onChange={(e) => setFormData({ ...formData, kodeBarang: e.target.value })}
                        placeholder="1.01.03.01.01"
                        readOnly={autoGenerateKode}
                        className={`w-full text-xs font-mono border rounded-lg px-3 py-2 focus:ring-2 focus:outline-hidden ${
                          autoGenerateKode
                            ? 'bg-blue-50/70 border-blue-200 text-blue-900 font-semibold cursor-default'
                            : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500/20 focus:border-blue-500'
                        }`}
                        required
                      />
                      {autoGenerateKode && (
                        <span className="absolute right-2.5 top-2 text-[9px] bg-blue-200/80 text-blue-800 px-1 rounded font-medium">
                          AUTO
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      NUSP (No. Urut Pendaftaran) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nusp}
                      onChange={(e) => setFormData({ ...formData, nusp: e.target.value })}
                      placeholder="0001/2026"
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden bg-white"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 4. NAMA BARANG, SPESIFIKASI & SATUAN */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Barang <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.namaBarang}
                  onChange={(e) => setFormData({ ...formData, namaBarang: e.target.value })}
                  placeholder="Contoh: Kertas HVS A4 80gr Sinar Dunia / Laptop Asus ExpertBook Core i5"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Spesifikasi Detail &amp; Merk</label>
                  <input
                    type="text"
                    value={formData.spesifikasi}
                    onChange={(e) => setFormData({ ...formData, spesifikasi: e.target.value })}
                    placeholder="Contoh: Ukuran 210 x 297 mm, warna putih / RAM 16GB, SSD 512GB"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Satuan Barang <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.satuan}
                    onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                    placeholder="Rim, Box, Buah, Pcs, Pak, Unit..."
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* 5. HARGA SATUAN FORMAT RUPIAH & STOK */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Satuan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="text"
                      value={displayHarga}
                      onChange={handleHargaChange}
                      placeholder="0"
                      className="w-full text-xs border border-slate-300 rounded-lg pl-8 pr-3 py-2 font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                      required
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Pemisah ribuan otomatis</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stok Awal Tahun
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stokAwal}
                    onChange={(e) => setFormData({ ...formData, stokAwal: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stok Saat Ini
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stokSekarang}
                    onChange={(e) => setFormData({ ...formData, stokSekarang: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden font-mono"
                    required
                  />
                </div>
              </div>

              {/* 6. LOKASI GUDANG */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lokasi Gudang / Rak Fisik</label>
                <input
                  type="text"
                  value={formData.lokasiGudang}
                  onChange={(e) => setFormData({ ...formData, lokasiGudang: e.target.value })}
                  placeholder="Contoh: Gudang TU Rak A1 / Ruang Server IT"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-all active:scale-98 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  {editingId ? 'Simpan Perubahan' : 'Simpan Barang Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import Excel Master Barang */}
      <ImportBarangModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingCount={barangList.length}
        onImport={(imported, mode) => {
          if (onImportBarang) {
            onImportBarang(imported, mode);
          } else {
            imported.forEach(b => onAddBarang(b));
          }
        }}
      />
    </div>
  );
};
