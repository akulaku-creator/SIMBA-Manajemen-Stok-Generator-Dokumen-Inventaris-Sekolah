import { 
  AlertTriangle, 
  BookOpen, 
  Boxes, 
  Building2, 
  Check, 
  ChevronDown,
  Copy,
  Download,
  Edit3, 
  FileSpreadsheet, 
  GitMerge,
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
import { DEFAULT_KATEGORI_LIST } from '../data/defaultData';
import { Barang, JenisBarang, KategoriBarangItem, TransaksiPenerimaan, TransaksiPengeluaran } from '../types';
import { exportMasterBarangToExcel } from '../utils/excelHelper';
import { formatRupiah } from '../utils/numberGenerator';
import { ImportBarangModal } from './ImportBarangModal';
import { KategoriRekeningSelect, SelectedRekening } from './KategoriRekeningSelect';
import { MasterKategoriManager, CategoryFormData } from './MasterKategoriManager';
import { auditDuplicateMasterBarang } from '../utils/barangDeduplicationHelper';
import { DeduplicateBarangModal } from './DeduplicateBarangModal';

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
  onSaveCategory?: (formData: CategoryFormData, editingId?: string | null) => void;
  onDeleteCategory?: (id: string) => void;
  onMigrateUnmappedCategories?: (targetCategoryName?: string) => void;
  showToast?: (message: string) => void;
  transaksiList?: TransaksiPengeluaran[];
  penerimaanList?: TransaksiPenerimaan[];
  onDeduplicateAndMerge?: (
    cleanedBarang: Barang[],
    updatedTransaksi: TransaksiPengeluaran[],
    updatedPenerimaan: TransaksiPenerimaan[],
    summary: string
  ) => void;
}

export const MasterBarangTable: React.FC<Props> = ({
  barangList,
  onAddBarang,
  onUpdateBarang,
  onDeleteBarang,
  onImportBarang,
  onViewKartuBarang,
  onViewKartuPersediaan,
  kategoriList,
  onUpdateKategoriList,
  onSaveCategory,
  onDeleteCategory,
  onMigrateUnmappedCategories,
  showToast,
  transaksiList = [],
  penerimaanList = [],
  onDeduplicateAndMerge
}) => {
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState<'Semua' | 'BHP' | 'Belanja Modal'>('Semua');
  const [filterKategori, setFilterKategori] = useState<string>('Semua');
  const [isKategoriModalOpen, setIsKategoriModalOpen] = useState<boolean>(false);
  const [isDeduplicateModalOpen, setIsDeduplicateModalOpen] = useState<boolean>(false);
  
  // Audit data barang ganda
  const duplicateStats = useMemo(() => {
    return auditDuplicateMasterBarang(barangList, transaksiList, penerimaanList);
  }, [barangList, transaksiList, penerimaanList]);
  
  // Dropdown 'Aksi Lainnya' State & Ref
  const [isAksiLainnyaOpen, setIsAksiLainnyaOpen] = useState<boolean>(false);
  const aksiLainnyaRef = useRef<HTMLDivElement>(null);

  // Close dropdown 'Aksi Lainnya' when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        aksiLainnyaRef.current &&
        !aksiLainnyaRef.current.contains(event.target as Node)
      ) {
        setIsAksiLainnyaOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Source of Truth Master Kategori List (dari prop atau default)
  const allCategoryItems = useMemo<KategoriBarangItem[]>(() => {
    if (kategoriList && kategoriList.length > 0) {
      return kategoriList;
    }
    return DEFAULT_KATEGORI_LIST;
  }, [kategoriList]);

  const bhpCategories = useMemo(() => {
    return allCategoryItems.filter(
      c => (c.jenisDefault || (c.kodeRekening?.startsWith('5.2') ? 'Belanja Modal' : 'BHP')) === 'BHP'
    );
  }, [allCategoryItems]);

  const modalCategories = useMemo(() => {
    return allCategoryItems.filter(
      c => (c.jenisDefault || (c.kodeRekening?.startsWith('5.2') ? 'Belanja Modal' : 'BHP')) === 'Belanja Modal'
    );
  }, [allCategoryItems]);

  // Handler Simpan / Edit Kategori
  const handleCategorySave = (catFormData: CategoryFormData, editingId?: string | null) => {
    if (onSaveCategory) {
      onSaveCategory(catFormData, editingId);
    } else if (onUpdateKategoriList) {
      const cleanKode = catFormData.kodeRekening.trim();
      const cleanNama = catFormData.namaKategori.trim();
      const jenisAset: JenisBarang = catFormData.jenis === 'Belanja Modal' || catFormData.jenis === 'Modal' ? 'Belanja Modal' : 'BHP';

      let updated: KategoriBarangItem[];
      if (editingId) {
        updated = allCategoryItems.map(c => {
          if (c.id === editingId) {
            return {
              ...c,
              kodeRekening: cleanKode,
              namaRekening: cleanNama,
              nama: cleanNama,
              jenisDefault: jenisAset,
              deskripsi: `Akun Belanja: ${cleanKode} - ${cleanNama}`
            };
          }
          return c;
        });
      } else {
        const newCat: KategoriBarangItem = {
          id: `kat-custom-${Date.now()}`,
          nama: cleanNama,
          kodeRekening: cleanKode,
          namaRekening: cleanNama,
          jenisDefault: jenisAset,
          prefixKode: jenisAset === 'Belanja Modal' ? '1.03.02.99.' : '1.01.03.99.',
          deskripsi: `Akun Belanja: ${cleanKode} - ${cleanNama}`
        };
        updated = [...allCategoryItems, newCat];
      }
      onUpdateKategoriList(updated);
      if (showToast) {
        showToast(editingId ? `Kategori "${cleanNama}" berhasil diperbarui.` : `Kategori baru "${cleanNama}" berhasil ditambahkan.`);
      }
    }
  };

  // Handler Hapus Kategori dengan Validasi Penggunaan
  const handleCategoryDelete = (catId: string) => {
    if (onDeleteCategory) {
      onDeleteCategory(catId);
    } else if (onUpdateKategoriList) {
      const target = allCategoryItems.find(c => c.id === catId);
      if (!target) return;

      const usedBy = barangList.filter(
        b => b.kategori === target.nama || b.kodeRekening === target.kodeRekening || b.namaRekening === target.nama
      );

      if (usedBy.length > 0) {
        alert(
          `Kategori "${target.nama}" tidak dapat dihapus karena sedang digunakan oleh ${usedBy.length} barang inventaris.`
        );
        return;
      }

      const updated = allCategoryItems.filter(c => c.id !== catId);
      onUpdateKategoriList(updated);
      if (showToast) {
        showToast(`Kategori "${target.nama}" berhasil dihapus.`);
      }
    }
  };



  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Async Export Excel State (Loading, Progress Bar & Double-Click Prevention)
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ percent: number; statusText: string } | null>(null);

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

  // Calculate Auto Kode Barang based on Kategori & Rekening (Dinamis dari allCategoryItems)
  const generateAutoKode = (
    kategoriName: string,
    jenis: JenisBarang = 'BHP',
    excludeBarangId?: string | null
  ): string => {
    const matched = allCategoryItems.find(r => r.nama === kategoriName || r.namaRekening === kategoriName) ||
                    MASTER_KODE_REKENING.find(r => r.nama === kategoriName);
    let prefix = '1.01.03.01.';
    if (jenis === 'Belanja Modal' || matched?.jenisDefault === 'Belanja Modal' || (matched as any)?.jenisAset === 'Belanja Modal') {
      prefix = '1.03.02.01.';
    } else if (matched?.kodeRekening) {
      prefix = `1.01.03.${matched.kodeRekening.slice(-2)}.`;
    } else if ((matched as any)?.kode) {
      prefix = `1.01.03.${(matched as any).kode.slice(-2)}.`;
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

  // Detect unmapped / legacy categories in barangList against active categories list
  const unmappedBarangCount = useMemo(() => {
    const validCodes = new Set([
      ...allCategoryItems.map(r => r.kodeRekening?.trim()).filter(Boolean),
      ...MASTER_KODE_REKENING.map(r => r.kode)
    ]);
    const validNames = new Set([
      ...allCategoryItems.map(r => r.nama.toLowerCase().trim()),
      ...allCategoryItems.map(r => (r.namaRekening || '').toLowerCase().trim()).filter(Boolean),
      ...MASTER_KODE_REKENING.map(r => r.nama.toLowerCase().trim())
    ]);
    return barangList.filter(b => {
      const hasValidCode = b.kodeRekening && validCodes.has(b.kodeRekening.trim());
      const hasValidName = b.kategori && validNames.has(b.kategori.toLowerCase().trim());
      return !hasValidCode && !hasValidName;
    }).length;
  }, [barangList, allCategoryItems]);

  // Counts for tabs
  const bhpCount = barangList.filter(b => b.jenisBarang !== 'Belanja Modal' && !b.kodeRekening?.startsWith('5.2')).length;
  const modalCount = barangList.filter(b => b.jenisBarang === 'Belanja Modal' || b.kodeRekening?.startsWith('5.2')).length;

  /**
   * Fungsi filter master barang berdasarkan kategori / kode rekening
   * Memenuhi kriteria:
   * 1. Pencocokan Data (Matching Rule): Mencocokkan data barang berdasarkan kodeRekening atau ID Kategori secara presisi.
   * 2. Sinkronisasi Dynamic Master: Membandingkan kode rekening belanja pada barang (item.kodeRekening)
   *    dengan kode rekening pada kategori yang sedang dipilih pada dropdown filter (allCategoryItems).
   * 3. Reset State: Opsi default "Semua" menampilkan seluruh data tanpa menyaring berlebihan.
   */
  const filtered = useMemo(() => {
    const normSelected = (filterKategori || '').trim();
    const isAllCategory = !normSelected || normSelected === 'Semua' || normSelected.toLowerCase() === 'semua' || normSelected === 'all';

    // Sinkronisasi Dynamic Master: Dapatkan target kode rekening dan nama dari master kategori aktif
    let targetKodeRekening = '';
    let targetCategoryName = '';

    if (!isAllCategory) {
      const matchedCategory = allCategoryItems.find(
        c => c.kodeRekening?.trim() === normSelected ||
             c.id === normSelected ||
             c.nama?.trim().toLowerCase() === normSelected.toLowerCase() ||
             c.namaRekening?.trim().toLowerCase() === normSelected.toLowerCase()
      );

      if (matchedCategory) {
        targetKodeRekening = (matchedCategory.kodeRekening || '').trim();
        targetCategoryName = (matchedCategory.nama || matchedCategory.namaRekening || '').trim().toLowerCase();
      } else {
        if (normSelected.startsWith('5.')) {
          targetKodeRekening = normSelected;
        } else {
          targetCategoryName = normSelected.toLowerCase();
        }
      }
    }

    const query = search ? search.trim().toLowerCase() : '';

    return barangList.filter(item => {
      // 1. Filter berdasarkan Tab Jenis Aset (Semua / BHP / Modal)
      const isModal = 
        item.jenisBarang === 'Belanja Modal' || 
        (item as any).jenisAset?.toLowerCase().includes('modal') ||
        (item as any).jenisAset?.toLowerCase().includes('aset') ||
        item.kodeRekening?.startsWith('5.2');

      const matchTab = 
        filterJenis === 'Semua' || !filterJenis ? true :
        filterJenis === 'BHP' ? !isModal :
        (filterJenis === 'Belanja Modal' || filterJenis === 'Modal') ? isModal : true;

      // 2. Filter berdasarkan Kategori / Kode Rekening yang dipilih di Dropdown (Dynamic Master Sync)
      const itemKode = (item.kodeRekening || '').trim();
      const itemKategori = (item.kategori || '').trim().toLowerCase();
      const itemNamaRekening = (item.namaRekening || '').trim().toLowerCase();

      const matchCategory = isAllCategory ? true : Boolean(
        // Cocokkan persis kode rekening barang dengan kode rekening kategori yang dipilih
        (targetKodeRekening && itemKode === targetKodeRekening) ||
        // Cocokkan langsung dengan string yang dipilih
        (itemKode === normSelected) ||
        // Cocokkan nama kategori atau nama rekening
        (targetCategoryName && (itemKategori === targetCategoryName || itemNamaRekening === targetCategoryName)) ||
        (itemKategori === normSelected.toLowerCase()) ||
        (itemNamaRekening === normSelected.toLowerCase())
      );

      // 3. Filter berdasarkan Kolom Pencarian Teks (Nama, Kode, NUSP, Rekening, Spesifikasi)
      const matchSearch = !query || Boolean(
        item.namaBarang?.toLowerCase().includes(query) ||
        item.kodeBarang?.toLowerCase().includes(query) ||
        item.kodeRekening?.toLowerCase().includes(query) ||
        item.nusp?.toLowerCase().includes(query) ||
        (item.spesifikasi && item.spesifikasi.toLowerCase().includes(query)) ||
        (item.kategori && item.kategori.toLowerCase().includes(query)) ||
        (item.namaRekening && item.namaRekening.toLowerCase().includes(query))
      );

      return matchTab && matchCategory && matchSearch;
    });
  }, [barangList, search, filterJenis, filterKategori, allCategoryItems]);

  // Label display untuk kategori yang sedang aktif difilter
  const selectedCategoryDisplayLabel = useMemo(() => {
    if (!filterKategori || filterKategori === 'Semua') return '';
    const found = allCategoryItems.find(
      c => c.kodeRekening === filterKategori || c.id === filterKategori || c.nama === filterKategori
    );
    if (found) {
      return found.kodeRekening ? `${found.kodeRekening} - ${found.nama}` : found.nama;
    }
    return filterKategori;
  }, [filterKategori, allCategoryItems]);

  // Async Export Excel Handler (Non-blocking & Progress-aware)
  const handleExportExcelAsync = async () => {
    if (isExportingExcel) return;
    try {
      setIsExportingExcel(true);
      setExportProgress({ percent: 5, statusText: 'Memulai ekspor...' });
      
      // Jeda agar browser sempat merefleksikan perubahan UI
      await new Promise((resolve) => setTimeout(resolve, 100));

      await exportMasterBarangToExcel(filtered, (percent, statusText) => {
        setExportProgress({ percent, statusText });
      });

      if (showToast) {
        showToast(`Berhasil mengekspor ${filtered.length} data barang ke file Excel (.xlsx).`);
      }
    } catch (err) {
      console.error('Gagal melakukan ekspor Excel:', err);
      alert('Terjadi kesalahan saat mengunduh berkas Excel. Silakan coba kembali.');
    } finally {
      setIsExportingExcel(false);
      setExportProgress(null);
    }
  };

  const handleOpenAdd = (targetJenis?: JenisBarang) => {
    setEditingId(null);
    setAutoGenerateKode(true);
    const chosenJenis: JenisBarang = targetJenis || (filterJenis === 'Belanja Modal' ? 'Belanja Modal' : 'BHP');
    const nextNusp = `${String(barangList.length + 1).padStart(4, '0')}/2026`;
    const defaultKode = chosenJenis === 'Belanja Modal' ? '5.2.02.05.01.0005' : '5.1.02.01.01.0024';
    const defaultNama = getNamaRekeningByKode(defaultKode);
    const autoKode = generateAutoKode(defaultNama, chosenJenis, null);
    const defaultHarga = chosenJenis === 'Belanja Modal' ? 7500000 : 25000;

    setFormData({
      kodeBarang: autoKode,
      nusp: nextNusp,
      kodeRekening: defaultKode,
      namaRekening: defaultNama,
      namaBarang: '',
      spesifikasi: '',
      kategori: defaultNama,
      satuan: chosenJenis === 'Belanja Modal' ? 'Unit' : 'Pcs',
      hargaSatuan: defaultHarga,
      stokAwal: chosenJenis === 'Belanja Modal' ? 1 : 10,
      stokSekarang: chosenJenis === 'Belanja Modal' ? 1 : 10,
      lokasiGudang: chosenJenis === 'Belanja Modal' ? 'Lab Komputer / Ruang Guru' : 'Gudang TU',
      jenisBarang: chosenJenis
    });
    setDisplayHarga(defaultHarga.toLocaleString('id-ID'));
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

        {/* Grup Tombol Aksi: Aksi Lainnya (Dropdown) & + Tambah Barang Baru (Utama) */}
        <div className="flex items-center gap-2">
          {/* Dropdown Menu Aksi Lainnya */}
          <div className="relative inline-block text-left" ref={aksiLainnyaRef}>
            <button
              type="button"
              id="btn-aksi-lainnya"
              onClick={() => setIsAksiLainnyaOpen(prev => !prev)}
              className={`inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-lg border transition-all active:scale-98 cursor-pointer shadow-2xs ${
                isAksiLainnyaOpen
                  ? 'bg-slate-100 text-slate-900 border-slate-300 ring-2 ring-blue-500/20'
                  : duplicateStats.totalBarangGanda > 0
                  ? 'bg-amber-50 hover:bg-amber-100/80 text-amber-900 border-amber-300'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
              title="Aksi Tambahan: Export, Import, Kelola Kategori, dan Gabung Data Kembar"
              aria-haspopup="true"
              aria-expanded={isAksiLainnyaOpen}
            >
              <span>Aksi Lainnya</span>
              {duplicateStats.totalBarangGanda > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white leading-none">
                  {duplicateStats.totalBarangGanda}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isAksiLainnyaOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Popup Content */}
            {isAksiLainnyaOpen && (
              <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Opsi &amp; Alat Inventaris
                </div>

                {/* 1. Export ke Excel */}
                <button
                  type="button"
                  disabled={isExportingExcel}
                  onClick={() => {
                    setIsAksiLainnyaOpen(false);
                    handleExportExcelAsync();
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs flex items-center gap-2.5 hover:bg-emerald-50/60 text-slate-700 hover:text-emerald-800 transition-colors cursor-pointer group disabled:opacity-50"
                  title="Unduh data barang saat ini dalam format berkas Excel (.xlsx)"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                    {isExportingExcel ? (
                      <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 group-hover:text-emerald-800">Export ke Excel (.xlsx)</div>
                    <div className="text-[10px] text-slate-500">Unduh {filtered.length} data inventaris aktif</div>
                  </div>
                </button>

                {/* 2. Import dari Excel */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAksiLainnyaOpen(false);
                    setIsImportModalOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs flex items-center gap-2.5 hover:bg-blue-50/60 text-slate-700 hover:text-blue-800 transition-colors cursor-pointer group"
                  title="Impor data barang dari template Excel atau CSV"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 group-hover:text-blue-800">Import dari Excel</div>
                    <div className="text-[10px] text-slate-500">Unggah berkas .xlsx, .xls, .csv</div>
                  </div>
                </button>

                {/* 3. Gabung Data Kembar (Deduplikasi) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAksiLainnyaOpen(false);
                    setIsDeduplicateModalOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs flex items-center gap-2.5 hover:bg-amber-50/60 text-slate-700 hover:text-amber-800 transition-colors cursor-pointer group"
                  title="Audit dan gabungkan barang yang memiliki kesamaan nama, rekening, dan harga"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    duplicateStats.totalBarangGanda > 0
                      ? 'bg-amber-100 text-amber-700 group-hover:bg-amber-200'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                  }`}>
                    <GitMerge className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900 group-hover:text-amber-800">
                      <span>Gabung Data Kembar</span>
                      {duplicateStats.totalBarangGanda > 0 && (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-amber-500 text-white">
                          {duplicateStats.totalBarangGanda}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {duplicateStats.totalBarangGanda > 0
                        ? `${duplicateStats.totalBarangGanda} barang ganda terdeteksi`
                        : 'Audit & gabungkan barang dobel'}
                    </div>
                  </div>
                </button>

                <div className="my-1 border-t border-slate-100"></div>

                {/* 4. Kelola Kategori & Rekening */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAksiLainnyaOpen(false);
                    setIsKategoriModalOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs flex items-center gap-2.5 hover:bg-indigo-50/60 text-slate-700 hover:text-indigo-800 transition-colors cursor-pointer group"
                  title="Manajemen 40 kode rekening belanja resmi dan kategori dinamis"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 group-hover:text-indigo-800">Kelola Kategori &amp; Rekening</div>
                    <div className="text-[10px] text-slate-500">40 Akun belanja resmi Pemda</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Tambah Barang Baru Button (Biru Utama) */}
          <button
            type="button"
            id="btn-tambah-barang-utama"
            onClick={() => handleOpenAdd()}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition-all active:scale-98 cursor-pointer shrink-0"
            title="Tambah item inventaris barang baru ke sistem"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Barang Baru</span>
          </button>
        </div>
      </div>

      {/* Loading Progress Bar saat Export Berjalan */}
      {isExportingExcel && exportProgress && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 shadow-xs space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs text-emerald-950 font-medium">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <span>{exportProgress.statusText}</span>
            </div>
            <span className="font-mono font-bold text-emerald-700">{exportProgress.percent}%</span>
          </div>
          <div className="w-full bg-emerald-200/80 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-emerald-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${exportProgress.percent}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-emerald-700">
            Mengolah {filtered.length} data menggunakan chunking non-blocking agar peramban web tetap responsif.
          </p>
        </div>
      )}

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
              className="text-xs border border-slate-300 rounded-lg py-2 px-3 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden w-full md:w-72 cursor-pointer truncate"
            >
              <option value="Semua">Semua Kategori ({allCategoryItems.length} Master)</option>
              {bhpCategories.length > 0 && (
                <optgroup label="Barang Habis Pakai (BHP)">
                  {bhpCategories.map((item) => (
                    <option key={item.id} value={item.kodeRekening || item.id}>
                      {item.kodeRekening ? `${item.kodeRekening} - ${item.nama}` : item.nama}
                    </option>
                  ))}
                </optgroup>
              )}
              {modalCategories.length > 0 && (
                <optgroup label="Belanja Modal (Aset Tetap)">
                  {modalCategories.map((item) => (
                    <option key={item.id} value={item.kodeRekening || item.id}>
                      {item.kodeRekening ? `${item.kodeRekening} - ${item.nama}` : item.nama}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <button
              type="button"
              onClick={() => setIsKategoriModalOpen(true)}
              className="inline-flex items-center gap-1 text-xs text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer shrink-0"
              title="Buka Manajemen Master Kategori & Kode Rekening"
            >
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Kelola</span>
            </button>
          </div>
        </div>

        {/* Active Filter Tags */}
        {(filterKategori !== 'Semua' || search) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            {filterKategori !== 'Semua' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 font-semibold text-xs">
                <Tag className="w-3 h-3 text-indigo-600" />
                <span>Kategori: {selectedCategoryDisplayLabel}</span>
                <button
                  type="button"
                  onClick={() => setFilterKategori('Semua')}
                  className="hover:bg-indigo-200/60 p-0.5 rounded-full text-indigo-700 hover:text-indigo-900 cursor-pointer ml-0.5 transition-colors"
                  title="Hapus filter kategori"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {search && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-semibold text-xs">
                <Search className="w-3 h-3 text-blue-600" />
                <span>Pencarian: &quot;{search}&quot;</span>
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="hover:bg-blue-200/60 p-0.5 rounded-full text-blue-700 hover:text-blue-900 cursor-pointer ml-0.5 transition-colors"
                  title="Hapus kata kunci pencarian"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

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
                
                {/* Kolom Kategori & Rekening (Header Bersih & Rapi) */}
                <th className="p-3.5 w-60 text-left">
                  <div className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] font-semibold text-slate-700">
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    <span>Kategori &amp; Rekening</span>
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
                  <td colSpan={10} className="p-10 text-center">
                    <div className="max-w-lg mx-auto flex flex-col items-center justify-center text-center py-4">
                      {/* 1. Kasus Tab Belanja Modal Kosong */}
                      {filterJenis === 'Belanja Modal' ? (
                        <div className="space-y-3.5 animate-in fade-in duration-200">
                          <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto ring-8 ring-purple-50 shadow-xs">
                            <Building2 className="w-7 h-7" />
                          </div>
                          <div>
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200 mb-1.5">
                              Tab Belanja Modal / Aset Tetap
                            </span>
                            <h3 className="text-base font-bold text-slate-900">
                              Belum Ada Aset Belanja Modal
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                              {search || filterKategori !== 'Semua'
                                ? `Tidak ditemukan aset modal yang cocok dengan filter pencarian.`
                                : 'Belum ada aset tetap yang tercatat (seperti PC, Laptop, Proyektor, atau Meubelair). Aset modal akan terakumulasi di Buku Inventaris & Aset Tetap.'}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleOpenAdd('Belanja Modal')}
                              className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition-all active:scale-98 cursor-pointer"
                              title="Tambah inventaris belanja modal baru"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Tambah Aset Belanja Modal Baru</span>
                            </button>
                            {(search || filterKategori !== 'Semua') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSearch('');
                                  setFilterKategori('Semua');
                                }}
                                className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Reset Filter</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : filterJenis === 'BHP' ? (
                        /* 2. Kasus Tab BHP Kosong */
                        <div className="space-y-3.5 animate-in fade-in duration-200">
                          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto ring-8 ring-blue-50 shadow-xs">
                            <Package className="w-7 h-7" />
                          </div>
                          <div>
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200 mb-1.5">
                              Tab Barang Habis Pakai (BHP)
                            </span>
                            <h3 className="text-base font-bold text-slate-900">
                              Belum Ada Barang Habis Pakai (BHP)
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                              {search || filterKategori !== 'Semua'
                                ? `Tidak ditemukan barang BHP yang sesuai dengan pencarian atau kategori yang dipilih.`
                                : 'Belum ada barang habis pakai operasional (ATK, kertas, perlengkapan kebersihan, toner, bahan praktikum) yang tercatat di sistem.'}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleOpenAdd('BHP')}
                              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition-all active:scale-98 cursor-pointer"
                              title="Tambah barang habis pakai baru"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Tambah Barang Habis Pakai Baru</span>
                            </button>
                            {(search || filterKategori !== 'Semua') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSearch('');
                                  setFilterKategori('Semua');
                                }}
                                className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Reset Filter</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (search || filterKategori !== 'Semua') ? (
                        /* 3. Kasus Pencarian / Filter Kategori Tidak Ditemukan */
                        <div className="space-y-3.5 animate-in fade-in duration-200">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto ring-8 ring-slate-50 shadow-xs">
                            <Search className="w-7 h-7" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900">
                              Tidak Ditemukan Data Barang
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                              Tidak ada barang inventaris yang sesuai dengan {search ? `kata kunci "${search}"` : ''} {selectedCategoryDisplayLabel ? `pada kategori "${selectedCategoryDisplayLabel}"` : ''}.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSearch('');
                                setFilterKategori('Semua');
                                setFilterJenis('Semua');
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Reset Semua Filter</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAdd()}
                              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition-all active:scale-98 cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Tambah Barang Baru</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* 4. Kasus Master Inventaris Masih Kosong Total */
                        <div className="space-y-3.5 animate-in fade-in duration-200">
                          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto ring-8 ring-blue-50/50 shadow-xs">
                            <Boxes className="w-7 h-7" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900">
                              Master Inventaris Barang Masih Kosong
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                              Mulai kelola inventaris sekolah dengan menambahkan barang baru secara manual atau impor dari berkas Excel.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleOpenAdd()}
                              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition-all active:scale-98 cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Tambah Barang Pertama</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsImportModalOpen(true)}
                              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
                            >
                              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                              <span>Import dari Excel</span>
                            </button>
                          </div>
                        </div>
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
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded text-blue-700 bg-blue-50 border border-blue-200/80">
                          {b.kodeRekening || '5.1.02.01.01.0024'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-800 font-semibold leading-snug line-clamp-2" title={b.kategori || b.namaRekening}>
                        {b.kategori || b.namaRekening}
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

              {/* 2. KATEGORI & KODE REKENING (SINGLE SOURCE OF TRUTH: SEARCHABLE SELECT DARI MASTER AKTIF) */}
              <div className="space-y-2 p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    Kategori &amp; Kode Rekening Belanja <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsKategoriModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Kelola / Tambah Kategori</span>
                  </button>
                </div>

                {/* Searchable Select Component */}
                <KategoriRekeningSelect
                  valueKode={formData.kodeRekening}
                  valueKategori={formData.kategori}
                  jenisBarang={formData.jenisBarang}
                  kategoriList={allCategoryItems}
                  onOpenManager={() => setIsKategoriModalOpen(true)}
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
        showToast={showToast}
        onImport={(imported, mode) => {
          if (onImportBarang) {
            onImportBarang(imported, mode);
          } else {
            imported.forEach(b => onAddBarang(b));
          }
        }}
      />

      {/* Modal Manajemen Master Kategori & Kode Rekening Belanja */}
      {isKategoriModalOpen && (
        <MasterKategoriManager
          categories={allCategoryItems}
          barangList={barangList}
          onSaveCategory={handleCategorySave}
          onDeleteCategory={handleCategoryDelete}
          onClose={() => setIsKategoriModalOpen(false)}
        />
      )}

      {/* Modal Audit & Pembersihan Data Barang Ganda (Deduplikasi & Penggabungan Transaksi) */}
      {isDeduplicateModalOpen && (
        <DeduplicateBarangModal
          isOpen={isDeduplicateModalOpen}
          onClose={() => setIsDeduplicateModalOpen(false)}
          masterBarang={barangList}
          transaksiPengeluaranList={transaksiList}
          transaksiPenerimaanList={penerimaanList}
          onApplyCleanedData={(cleaned, updatedTrx, updatedRcv, summary) => {
            if (onDeduplicateAndMerge) {
              onDeduplicateAndMerge(cleaned, updatedTrx, updatedRcv, summary);
            } else {
              showToast?.(summary);
            }
            setIsDeduplicateModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
