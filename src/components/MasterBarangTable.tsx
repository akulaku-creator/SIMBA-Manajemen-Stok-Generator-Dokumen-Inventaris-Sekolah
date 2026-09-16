import { 
  AlertTriangle, 
  BookOpen, 
  Boxes, 
  Building2, 
  Check, 
  Edit3, 
  FileSpreadsheet, 
  Layers, 
  Package, 
  Plus, 
  RefreshCw, 
  Search, 
  Sliders, 
  Sparkles, 
  Tag, 
  Trash2, 
  X 
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { DEFAULT_KATEGORI_LIST } from '../data/defaultData';
import { getNamaRekeningDefault, MASTER_KODE_REKENING } from '../data/kodeRekeningData';
import { Barang, JenisBarang, KategoriBarangItem } from '../types';
import { formatRupiah } from '../utils/numberGenerator';
import { ImportBarangModal } from './ImportBarangModal';
import { KategoriSettingsModal } from './KategoriSettingsModal';

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
}

export const MasterBarangTable: React.FC<Props> = ({
  barangList,
  onAddBarang,
  onUpdateBarang,
  onDeleteBarang,
  onImportBarang,
  onViewKartuBarang,
  onViewKartuPersediaan,
  kategoriList: externalKategoriList,
  onUpdateKategoriList: externalOnUpdateKategoriList
}) => {
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState<'Semua' | 'BHP' | 'Belanja Modal'>('Semua');
  const [filterKategori, setFilterKategori] = useState<string>('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isKategoriModalOpen, setIsKategoriModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Internal category state if not provided externally
  const [internalKategoriList, setInternalKategoriList] = useState<KategoriBarangItem[]>(() => {
    const saved = localStorage.getItem('simba_kategori_list');
    return saved ? JSON.parse(saved) : DEFAULT_KATEGORI_LIST;
  });

  const activeKategoriList = externalKategoriList || internalKategoriList;
  const handleSaveKategoriList = (newList: KategoriBarangItem[]) => {
    if (externalOnUpdateKategoriList) {
      externalOnUpdateKategoriList(newList);
    } else {
      setInternalKategoriList(newList);
      localStorage.setItem('simba_kategori_list', JSON.stringify(newList));
    }
  };

  // Auto-generate Kode Barang toggle
  const [autoGenerateKode, setAutoGenerateKode] = useState<boolean>(true);

  // Input Display Formatted Rupiah
  const [displayHarga, setDisplayHarga] = useState<string>('25.000');

  // Form State
  const [formData, setFormData] = useState<Partial<Barang>>({
    kodeBarang: '1.01.03.01.25',
    nusp: '0010/2026',
    kodeRekening: '5.1.02.01.01.0024',
    namaRekening: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
    namaBarang: '',
    spesifikasi: '',
    kategori: 'ATK / Kertas',
    satuan: 'Pcs',
    hargaSatuan: 25000,
    stokAwal: 10,
    stokSekarang: 10,
    lokasiGudang: 'Gudang TU',
    jenisBarang: 'BHP'
  });

  // Calculate Auto Kode Barang
  const generateAutoKode = (
    kategoriName: string,
    jenis: JenisBarang = 'BHP',
    excludeBarangId?: string | null
  ): string => {
    const matchedKat = activeKategoriList.find(k => k.nama === kategoriName);
    let prefix = matchedKat?.prefixKode;
    if (!prefix) {
      prefix = jenis === 'Belanja Modal' ? '1.03.02.01.' : '1.01.03.01.';
    }

    // Filter items with same prefix
    const matchingItems = barangList.filter(
      b => b.id !== excludeBarangId && b.kodeBarang && b.kodeBarang.startsWith(prefix!)
    );

    let maxSeq = 0;
    matchingItems.forEach(b => {
      const suffix = b.kodeBarang.slice(prefix!.length).trim();
      const num = parseInt(suffix, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    });

    const nextSeq = String(maxSeq + 1).padStart(2, '0');
    return `${prefix}${nextSeq}`;
  };

  // Dynamic Categories list from activeKategoriList
  const categoryOptions = useMemo(() => {
    const list = activeKategoriList.map(k => k.nama);
    // Also include any category that exists in barangList but not in activeKategoriList
    barangList.forEach(b => {
      if (b.kategori && !list.includes(b.kategori)) {
        list.push(b.kategori);
      }
    });
    return list;
  }, [activeKategoriList, barangList]);

  // Counts for tabs
  const bhpCount = barangList.filter(b => b.jenisBarang !== 'Belanja Modal').length;
  const modalCount = barangList.filter(b => b.jenisBarang === 'Belanja Modal').length;

  const filtered = barangList.filter(b => {
    const matchSearch = 
      b.namaBarang.toLowerCase().includes(search.toLowerCase()) ||
      b.kodeBarang.toLowerCase().includes(search.toLowerCase()) ||
      b.nusp.toLowerCase().includes(search.toLowerCase()) ||
      (b.spesifikasi && b.spesifikasi.toLowerCase().includes(search.toLowerCase())) ||
      (b.kodeRekening && b.kodeRekening.toLowerCase().includes(search.toLowerCase()));

    const matchJenis = 
      filterJenis === 'Semua' ||
      (filterJenis === 'BHP' && b.jenisBarang !== 'Belanja Modal') ||
      (filterJenis === 'Belanja Modal' && b.jenisBarang === 'Belanja Modal');

    const matchCat = filterKategori === 'Semua' || b.kategori === filterKategori;

    return matchSearch && matchJenis && matchCat;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setAutoGenerateKode(true);
    const nextNusp = `${String(barangList.length + 1).padStart(4, '0')}/2026`;
    const defaultKategori = activeKategoriList[0]?.nama || 'ATK / Kertas';
    const autoKode = generateAutoKode(defaultKategori, 'BHP', null);

    setFormData({
      kodeBarang: autoKode,
      nusp: nextNusp,
      kodeRekening: '5.1.02.01.01.0024',
      namaRekening: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
      namaBarang: '',
      spesifikasi: '',
      kategori: defaultKategori,
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
    setFormData({
      ...barang,
      jenisBarang: barang.jenisBarang || 'BHP'
    });
    setDisplayHarga(barang.hargaSatuan ? barang.hargaSatuan.toLocaleString('id-ID') : '0');
    setIsModalOpen(true);
  };

  // Switch Jenis Barang (BHP vs Belanja Modal)
  const handleSelectJenisBarang = (jenis: JenisBarang) => {
    let newKategori = formData.kategori || 'ATK / Kertas';
    let newKodeRekening = formData.kodeRekening || '5.1.02.01.01.0024';
    let newNamaRekening = formData.namaRekening || '';

    if (jenis === 'Belanja Modal') {
      // Find default category for modal
      const modalKat = activeKategoriList.find(k => k.jenisDefault === 'Belanja Modal');
      if (modalKat) {
        newKategori = modalKat.nama;
      } else if (!newKategori.toLowerCase().includes('aset')) {
        newKategori = 'Peralatan & Mesin (Aset)';
      }
      if (!newKodeRekening.startsWith('5.2')) {
        newKodeRekening = '5.2.02.05.01.0005';
        newNamaRekening = 'Belanja Modal Peralatan Komputer (PC, Laptop, Server)';
      }
    } else {
      // BHP
      const bhpKat = activeKategoriList.find(k => k.jenisDefault !== 'Belanja Modal');
      if (bhpKat) {
        newKategori = bhpKat.nama;
      } else {
        newKategori = 'ATK / Kertas';
      }
      if (newKodeRekening.startsWith('5.2')) {
        newKodeRekening = '5.1.02.01.01.0024';
        newNamaRekening = 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor';
      }
    }

    const autoKode = autoGenerateKode ? generateAutoKode(newKategori, jenis, editingId) : formData.kodeBarang;

    setFormData(prev => ({
      ...prev,
      jenisBarang: jenis,
      kategori: newKategori,
      kodeRekening: newKodeRekening,
      namaRekening: newNamaRekening,
      kodeBarang: autoKode
    }));
  };

  // Change Kategori
  const handleKategoriChange = (newKat: string) => {
    const katItem = activeKategoriList.find(k => k.nama === newKat);
    const suggestedJenis = katItem?.jenisDefault || formData.jenisBarang || 'BHP';
    const autoKode = autoGenerateKode ? generateAutoKode(newKat, suggestedJenis, editingId) : formData.kodeBarang;

    setFormData(prev => ({
      ...prev,
      kategori: newKat,
      jenisBarang: suggestedJenis,
      kodeBarang: autoKode
    }));
  };

  // Auto-Fill Nama Rekening based on Kode Rekening
  const handleKodeRekeningChange = (val: string) => {
    const clean = val.trim();
    const matched = MASTER_KODE_REKENING.find(r => r.kode === clean);
    const autoName = matched ? matched.nama : getNamaRekeningDefault(clean);

    let suggestedJenis = formData.jenisBarang;
    if (matched?.jenisAset) {
      suggestedJenis = matched.jenisAset;
    } else if (clean.startsWith('5.2')) {
      suggestedJenis = 'Belanja Modal';
    } else if (clean.startsWith('5.1')) {
      suggestedJenis = 'BHP';
    }

    setFormData(prev => {
      const updated = {
        ...prev,
        kodeRekening: val,
        namaRekening: autoName || prev.namaRekening,
        jenisBarang: suggestedJenis
      };
      if (autoGenerateKode && updated.kategori) {
        updated.kodeBarang = generateAutoKode(updated.kategori, suggestedJenis, editingId);
      }
      return updated;
    });
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
      formData.kategori || 'ATK / Kertas',
      formData.jenisBarang || 'BHP',
      editingId
    );
    setFormData(prev => ({ ...prev, kodeBarang: newCode }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaBarang || !formData.kodeBarang || !formData.nusp) return;

    if (editingId) {
      onUpdateBarang({
        ...(formData as Barang),
        id: editingId,
        kodeRekening: formData.kodeRekening || '5.1.02.01.01.0024',
        namaRekening: formData.namaRekening || 'Belanja Alat/Bahan untuk Kegiatan Kantor',
        jenisBarang: formData.jenisBarang || 'BHP'
      });
    } else {
      const newBarang: Barang = {
        id: `brg-${Date.now()}`,
        kodeBarang: formData.kodeBarang || '',
        nusp: formData.nusp || '',
        kodeRekening: formData.kodeRekening || '5.1.02.01.01.0024',
        namaRekening: formData.namaRekening || 'Belanja Alat/Bahan untuk Kegiatan Kantor',
        namaBarang: formData.namaBarang || '',
        spesifikasi: formData.spesifikasi || '',
        kategori: formData.kategori || 'ATK / Kertas',
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
            Manajemen inventaris dinas dengan pemisahan tegas antara <span className="font-semibold text-blue-700">Barang Habis Pakai (BHP)</span> dan <span className="font-semibold text-purple-700">Belanja Modal (Aset Tetap)</span>, auto-generate kode barang, dan harga BOS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Kelola Kategori Button */}
          <button
            type="button"
            onClick={() => setIsKategoriModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 shadow-2xs transition-all active:scale-98"
            title="Kelola daftar kategori barang dan prefix kode"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            Kelola Kategori
          </button>

          {/* Import Excel Button */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition-all active:scale-98"
            title="Import inventaris barang dari file Excel (.xlsx, .xls, .csv)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import dari Excel
          </button>

          {/* Tambah Barang Baru Button */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition-all active:scale-98"
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
            <span className="w-2 h-2 rounded-full bg-purple-500 ml-2"></span> Belanja Modal dikecualikan dari Opname BHP tapi terakumulasi di Buku Aset.
          </div>
        </div>

        {/* Search Bar & Kategori Filter */}
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
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Kategori:</span>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg py-2 px-3 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden w-full md:w-auto"
            >
              <option value="Semua">Semua Kategori</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
                <th className="p-3.5 w-36">Kategori &amp; Rekening</th>
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
                    Tidak ditemukan data barang yang sesuai kriteria pencarian.
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
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                        {b.kategori}
                      </span>
                      {b.kodeRekening && (
                        <div className="text-[10px] font-mono text-slate-500 mt-1">
                          {b.kodeRekening}
                        </div>
                      )}
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
                            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                            title="Tinjau &amp; Cetak Kartu Barang (Lampiran 12 - Mutasi Fisik)"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                          </button>
                        )}
                        {onViewKartuPersediaan && (
                          <button
                            onClick={() => onViewKartuPersediaan(b.id)}
                            className="p-1.5 text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors"
                            title="Tinjau &amp; Cetak Kartu Persediaan (Lampiran 13 - Nilai Rupiah Keuangan)"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit barang"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteBarang(b.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus barang"
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

      {/* Modal Add / Edit Master Barang & NUSP */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                {editingId ? 'Edit Data Master Barang' : 'Tambah Master Barang & NUSP'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Excel Import Banner (Helper Visual) */}
            {!editingId && (
              <div className="mx-5 mt-4 p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/80 border border-emerald-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0 shadow-2xs">
                <div className="flex items-start gap-2.5 text-emerald-950">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700 shrink-0 border border-emerald-200">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-emerald-900 text-xs flex items-center gap-1.5">
                      Punya Rekap Barang Banyak di Excel?
                      <span className="text-[10px] bg-emerald-200/70 text-emerald-800 px-1.5 py-0.2 rounded font-mono">XLSX / CSV</span>
                    </div>
                    <div className="text-[11px] text-emerald-700/90 mt-0.5">
                      Gunakan Batch Import untuk langsung memasukkan ratusan nama barang beserta jenis aset BHP &amp; Modal.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsImportModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-all active:scale-98 shrink-0 whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Buka Import Excel &rarr;
                </button>
              </div>
            )}

            {/* Form Scrollable */}
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* 1. SELEKSI JENIS ASET: BHP vs BELANJA MODAL */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>Klasifikasi / Jenis Aset Barang:</span>
                  <span className="text-[11px] font-normal text-slate-500">Menentukan integrasi ke laporan BOS</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectJenisBarang('BHP')}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
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
                        ATK, Kertas, Kebersihan, Komputer
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectJenisBarang('Belanja Modal')}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
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

              {/* 2. KATEGORI BARANG & KELOLA KATEGORI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Kategori Barang <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsKategoriModalOpen(true)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      <Sliders className="w-3 h-3" />
                      Kelola Kategori
                    </button>
                  </div>
                  <select
                    value={formData.kategori}
                    onChange={(e) => handleKategoriChange(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                  >
                    {categoryOptions.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
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
                            formData.kategori || 'ATK / Kertas',
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
                          className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
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

              {/* 4. NAMA BARANG & SPESIFIKASI */}
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Spesifikasi Detail &amp; Merk</label>
                <input
                  type="text"
                  value={formData.spesifikasi}
                  onChange={(e) => setFormData({ ...formData, spesifikasi: e.target.value })}
                  placeholder="Contoh: Ukuran 210 x 297 mm, warna putih / RAM 16GB, SSD 512GB"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* 5. KODE REKENING & AUTO-FILL NAMA REKENING */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Rekening Belanja
                  </label>
                  <input
                    type="text"
                    list="rekening-options"
                    value={formData.kodeRekening}
                    onChange={(e) => handleKodeRekeningChange(e.target.value)}
                    placeholder="Ketik / pilih misal: 5.1.02... atau 5.2.02..."
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                  />
                  <datalist id="rekening-options">
                    {MASTER_KODE_REKENING.map(r => (
                      <option key={r.kode} value={r.kode}>
                        {r.kode} - {r.nama} ({r.jenisAset})
                      </option>
                    ))}
                  </datalist>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {formData.kodeRekening?.startsWith('5.2') ? 'Rekening Belanja Modal (Aset Tetap)' : 'Rekening Belanja Operasional (BHP)'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Rekening Belanja <span className="text-[10px] text-emerald-600 font-medium">(Auto-Filled)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.namaRekening}
                    onChange={(e) => setFormData({ ...formData, namaRekening: e.target.value })}
                    placeholder="Nama pos rekening belanja dinas..."
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-100/80 text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* 6. HARGA SATUAN FORMAT RUPIAH & STOK */}
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

              {/* 7. LOKASI GUDANG */}
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
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-all active:scale-98"
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

      {/* Modal Manajemen Kategori Barang */}
      <KategoriSettingsModal
        isOpen={isKategoriModalOpen}
        onClose={() => setIsKategoriModalOpen(false)}
        kategoriList={activeKategoriList}
        onSaveKategoriList={handleSaveKategoriList}
      />
    </div>
  );
};
