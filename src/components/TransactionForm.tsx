import { 
  AlertCircle, 
  Boxes,
  Building2,
  Calendar,
  CheckCircle2, 
  Edit3,
  FileCheck2, 
  FileText,
  Filter, 
  Hash,
  HelpCircle,
  Info,
  Layers, 
  Loader2,
  Package,
  PackageCheck,
  Plus, 
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles, 
  Trash2,
  UserCheck,
  X
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { 
  Barang, 
  KopSuratConfig, 
  NumberingPatternConfig,
  Pejabat, 
  PengajuanItem, 
  TransaksiPengeluaran 
} from '../types';
import { calculateNextDocumentCounters, deriveSchoolCode, formatRupiah, generateDocumentNumbers } from '../utils/numberGenerator';
import { getBarangByRekening, getUniqueKodeRekening } from '../utils/rekeningHelper';
import { BatchAddPenyaluranModal } from './BatchAddPenyaluranModal';

interface Props {
  masterBarang: Barang[];
  pejabatList: Pejabat[];
  kopConfig: KopSuratConfig;
  numberingConfig?: NumberingPatternConfig;
  nextCounter: number;
  transaksiList?: TransaksiPengeluaran[];
  initialData?: TransaksiPengeluaran | null;
  onSaveTransaksi: (transaksi: TransaksiPengeluaran) => void;
  onCancel: () => void;
}

export const TransactionForm: React.FC<Props> = ({
  masterBarang,
  pejabatList,
  kopConfig,
  numberingConfig,
  nextCounter,
  transaksiList,
  initialData,
  onSaveTransaksi,
  onCancel
}) => {
  const isEditMode = Boolean(initialData);
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. RESOLUSI OTOMATIS PEJABAT PENANDATANGAN DARI MASTER DATA / PENGATURAN
  // Pengguna tidak perlu memilih ulang Kepala Sekolah, Wakasek Sarpras, & Pengurus Barang Pembantu.
  const autoSarpras = useMemo(() => {
    return (
      pejabatList.find(p => p.id === 'pejabat-sarpras') ||
      pejabatList.find(p => p.jabatan.toLowerCase().includes('sarpras') || p.jabatan.toLowerCase().includes('sarana')) ||
      pejabatList[1] ||
      pejabatList[0] || {
        id: 'pejabat-sarpras',
        nama: 'Wakasek Sarpras',
        nip: '-',
        jabatan: 'Wakasek Sarana Prasarana'
      }
    );
  }, [pejabatList]);

  const autoPengurusBarang = useMemo(() => {
    return (
      pejabatList.find(p => p.id === 'pejabat-pengurus-barang') ||
      pejabatList.find(p => p.jabatan.toLowerCase().includes('pengurus barang') || p.jabatan.toLowerCase().includes('penyimpan')) ||
      pejabatList[2] ||
      pejabatList[0] || {
        id: 'pejabat-pengurus-barang',
        nama: 'Pengurus Barang Pembantu',
        nip: '-',
        jabatan: 'Pengurus Barang Pembantu'
      }
    );
  }, [pejabatList]);

  const autoKepsek = useMemo(() => {
    return (
      pejabatList.find(p => p.id === 'pejabat-kepsek') ||
      pejabatList.find(p => p.jabatan.toLowerCase().includes('kepala sekolah') || p.jabatan.toLowerCase().includes('kuasa pengguna')) ||
      pejabatList[0] || {
        id: 'pejabat-kepsek',
        nama: 'Kepala Sekolah',
        nip: '-',
        jabatan: 'Kepala Sekolah'
      }
    );
  }, [pejabatList]);

  // Default Pemohon
  const defaultInitialPemohon = pejabatList[3] || pejabatList[0];

  // 2. HEADER FORM TRANSAKSI (GRID RAPAT 4 KOLOM)
  const [tanggal, setTanggal] = useState(initialData?.tanggal || todayStr);
  const [pemohonId, setPemohonId] = useState(initialData?.pemohonId || defaultInitialPemohon?.id || '');
  const [unitPemohon, setUnitPemohon] = useState(
    initialData?.unitPemohon || defaultInitialPemohon?.unitKerja || defaultInitialPemohon?.jabatan || 'Subbag Tata Usaha & Kearsipan'
  );
  const [keperluanUmum, setKeperluanUmum] = useState(
    initialData?.keperluanUmum || 'Kebutuhan Administrasi Perkantoran & Pelayanan Sekolah'
  );

  // Handle Pemohon Change -> auto update unit
  const handlePemohonChange = (selectedId: string) => {
    setPemohonId(selectedId);
    const found = pejabatList.find(p => p.id === selectedId);
    if (found) {
      if (found.unitKerja) {
        setUnitPemohon(found.unitKerja);
      } else if (found.jabatan && !found.jabatan.toLowerCase().includes('kepala sekolah')) {
        setUnitPemohon(found.jabatan);
      }
    }
  };

  // 3. PENOMORAN SURAT INDEPENDEN (NPB, SPB, SPPB, BAST)
  const schoolCode = deriveSchoolCode(kopConfig?.namaSekolah, numberingConfig?.schoolCode);
  const counters = useMemo(() => {
    return calculateNextDocumentCounters(transaksiList || [], numberingConfig);
  }, [transaksiList, numberingConfig]);

  const autoNums = useMemo(() => {
    return generateDocumentNumbers(counters, tanggal, schoolCode, numberingConfig, kopConfig?.namaSekolah);
  }, [counters, tanggal, schoolCode, numberingConfig, kopConfig?.namaSekolah]);

  const [noNPB, setNoNPB] = useState(initialData?.noNPB || autoNums.noNPB);
  const [noSPB, setNoSPB] = useState(initialData?.noSPB || autoNums.noSPB);
  const [noSPPB, setNoSPPB] = useState(initialData?.noSPPB || autoNums.noSPPB);
  const [noBAST, setNoBAST] = useState(initialData?.noBAST || autoNums.noBAST);
  const [isCustomNumber, setIsCustomNumber] = useState(Boolean(initialData));

  useEffect(() => {
    if (!isCustomNumber && !initialData) {
      setNoNPB(autoNums.noNPB);
      setNoSPB(autoNums.noSPB);
      setNoSPPB(autoNums.noSPPB);
      setNoBAST(autoNums.noBAST);
    }
  }, [autoNums, isCustomNumber, initialData]);

  const handleDateChange = (newDate: string) => {
    setTanggal(newDate);
    if (!isCustomNumber && !initialData) {
      const generated = generateDocumentNumbers(counters, newDate, schoolCode, numberingConfig, kopConfig?.namaSekolah);
      setNoNPB(generated.noNPB);
      setNoSPB(generated.noSPB);
      setNoSPPB(generated.noSPPB);
      setNoBAST(generated.noBAST);
    }
  };

  const handleRefreshNumbers = () => {
    const generated = generateDocumentNumbers(counters, tanggal, schoolCode, numberingConfig, kopConfig?.namaSekolah);
    setNoNPB(generated.noNPB);
    setNoSPB(generated.noSPB);
    setNoSPPB(generated.noSPPB);
    setNoBAST(generated.noBAST);
    setIsCustomNumber(false);
  };

  // Rekening Belanja Helpers
  const rekeningList = useMemo(() => getUniqueKodeRekening(masterBarang), [masterBarang]);
  const defaultInitialRekening = rekeningList[0]?.kode || masterBarang[0]?.kodeRekening || '5.1.02.01.01.0024';

  // 4. ITEMS STATE - Default Empty State (0 baris saat modal dibuka baru)
  const [items, setItems] = useState<PengajuanItem[]>(() => {
    if (initialData && initialData.items && initialData.items.length > 0) {
      return initialData.items.map(it => {
        const mb = masterBarang.find(b => b.id === it.barangId);
        const effectiveStock = (mb?.stokSekarang ?? 0) + it.usulanJumlah;
        return {
          ...it,
          sisaBarang: effectiveStock
        };
      });
    }
    // Wajib dalam kondisi kosong (0 baris/tanpa dummy data)
    return [];
  });

  // Modal Dialog States
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit Keperluan Modal State
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editKeperluanText, setEditKeperluanText] = useState('');

  // 5. VALIDATION SAFETY NET (Cek Over-Stock Limit)
  const overStockItems = useMemo(() => {
    return items
      .map((it, idx) => ({ ...it, index: idx }))
      .filter(it => it.barangId && it.usulanJumlah > it.sisaBarang);
  }, [items]);

  const hasOverStock = overStockItems.length > 0;

  // Real-time calculation
  const totalItemCount = items.length;
  const totalQty = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.usulanJumlah) || 0), 0);
  }, [items]);

  const totalEstimasiNilai = useMemo(() => {
    return items.reduce((acc, it) => acc + ((Number(it.usulanJumlah) || 0) * (it.hargaSatuan || 0)), 0);
  }, [items]);

  // Handlers for Items
  const handleSelectRekening = (index: number, newKodeRekening: string) => {
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
        usulanJumlah: Math.min(
          Math.max(1, updated[index].usulanJumlah || 1),
          targetBarang.stokSekarang > 0 ? targetBarang.stokSekarang : 1
        )
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
        usulanJumlah: 0
      };
    }
    setItems(updated);
    setErrorMsg(null);
  };

  const handleSelectBarang = (index: number, barangId: string) => {
    const selected = masterBarang.find(b => b.id === barangId);
    if (!selected) {
      const updated = [...items];
      updated[index] = {
        ...updated[index],
        barangId: '',
        namaBarang: '',
        kodeBarang: '',
        nusp: '',
        satuan: '-',
        sisaBarang: 0,
        hargaSatuan: 0,
        usulanJumlah: 0
      };
      setItems(updated);
      return;
    }

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
      hargaSatuan: selected.hargaSatuan,
      usulanJumlah: Math.min(
        Math.max(1, updated[index].usulanJumlah || 1),
        selected.stokSekarang > 0 ? selected.stokSekarang : 1
      )
    };
    setItems(updated);
    setErrorMsg(null);
  };

  const handleItemFieldChange = (index: number, field: keyof PengajuanItem, value: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setItems(updated);
    setErrorMsg(null);
  };

  // Quick Add Row (+ Baris Baru)
  const handleAddQuickRow = () => {
    const newItem: PengajuanItem = {
      id: `item-${Date.now()}-${items.length + 1}`,
      barangId: '',
      kodeBarang: '',
      nusp: '',
      kodeRekening: '',
      namaRekening: '',
      namaBarang: '',
      spesifikasi: '',
      satuan: '-',
      sisaBarang: 0,
      usulanJumlah: 0,
      hargaSatuan: 0,
      keperluan: keperluanUmum
    };
    setItems(prev => [...prev, newItem]);
    setErrorMsg(null);
  };

  // Batch Add Row (+ Tambah Banyak Barang)
  const handleAddBatch = (batchItems: PengajuanItem[]) => {
    if (!batchItems || batchItems.length === 0) return;

    // Filter out rows that are unselected placeholders
    const validExistingItems = items.filter(it => it.barangId && it.barangId.trim() !== '');
    setItems([...validExistingItems, ...batchItems]);
    setErrorMsg(null);
  };

  // Remove Row
  const handleRemoveRow = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    setErrorMsg(null);
  };

  // Open Edit Keperluan Modal
  const handleOpenEditKeperluan = (idx: number) => {
    setEditingItemIndex(idx);
    setEditKeperluanText(items[idx].keperluan || keperluanUmum);
  };

  const handleSaveEditKeperluan = () => {
    if (editingItemIndex !== null) {
      handleItemFieldChange(editingItemIndex, 'keperluan', editKeperluanText);
      setEditingItemIndex(null);
    }
  };

  // Pre-Submit Validation
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (items.length === 0) {
      setErrorMsg('Harap tambahkan minimal 1 item barang persediaan.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.namaBarang || !it.barangId) {
        setErrorMsg(`Barang pada baris ${i + 1} belum dipilih.`);
        return;
      }
      if (it.usulanJumlah <= 0) {
        setErrorMsg(`Jumlah diminta pada baris ${i + 1} (${it.namaBarang}) harus lebih besar dari 0.`);
        return;
      }
      if (it.usulanJumlah > it.sisaBarang) {
        setErrorMsg(
          `Over-Stock Limit: Baris ${i + 1} (${it.namaBarang}) meminta ${it.usulanJumlah} ${it.satuan}, melampaui sisa stok gudang (${it.sisaBarang} ${it.satuan}).`
        );
        return;
      }
    }

    // Open confirmation modal
    setIsConfirmOpen(true);
  };

  // Final Submit: Simpan & Keluar Barang dengan Anti Double-Submit
  const handleConfirmSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const newTransaksi: TransaksiPengeluaran = {
      id: initialData ? initialData.id : `trx-${Date.now()}`,
      nomorUrut: initialData ? initialData.nomorUrut : nextCounter,
      tanggal,
      unitPemohon,
      keperluanUmum,
      noNPB,
      noSPB,
      noSPPB,
      noBAST,
      items,
      pemohonId: pemohonId || (defaultInitialPemohon?.id || pejabatList[0]?.id || ''),
      sarprasId: autoSarpras?.id || '',
      pengurusBarangId: autoPengurusBarang?.id || '',
      kepsekId: autoKepsek?.id || '',
      createdAt: initialData ? initialData.createdAt : new Date().toISOString()
    };

    // Simulate safe dispatch
    setTimeout(() => {
      onSaveTransaksi(newTransaksi);
    }, 250);
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[92vh] overflow-hidden">
      
      {/* =========================================================================
          1. STICKY TOP CONTAINER (Fixed Header, 4-Col Form, Numbering, Action Bar)
          ========================================================================= */}
      <div className="shrink-0 bg-white border-b border-slate-200 sticky top-0 z-20">
        
        {/* Modal Top Title Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30">
              {isEditMode ? <Edit3 className="w-5 h-5 text-amber-400" /> : <FileCheck2 className="w-5 h-5 text-blue-400" />}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                {isEditMode ? 'Koreksi / Edit Transaksi Penyaluran Barang' : 'Catat Penyaluran / Pengeluaran Barang'}
                <span className="hidden sm:inline-block bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {isEditMode ? 'Mode Koreksi & Penyesuaian Stok' : 'Rantai 4 Dokumen Cetak (NPB • SPB • SPPB • BAST)'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                {isEditMode 
                  ? 'Perbarui rincian barang atau nomor berkas. Selisih penambahan/pengurangan kuantitas otomatis disinkronkan ke stok gudang.' 
                  : 'Satu kali penginputan otomatis menerbitkan Berita Acara & Surat Perintah serta memotong stok gudang.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="inline-block bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs px-2.5 py-1 rounded-lg font-mono font-semibold">
              {isEditMode ? `Edit Reg #${initialData?.nomorUrut}` : `Transaksi #${nextCounter}`}
            </span>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1. PENYEDERHANAAN HEADER FORM: Grid Rapat 4 Kolom */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200/90">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Kolom 1: Tanggal Transaksi */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Tanggal Transaksi
              </label>
              <input
                type="date"
                id="input-tanggal-penyaluran"
                value={tanggal}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden shadow-2xs"
                required
              />
            </div>

            {/* Kolom 2: Nama Pemohon / Penerima */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                Nama Pemohon / Penerima
              </label>
              <select
                id="select-nama-pemohon"
                value={pemohonId}
                onChange={(e) => handlePemohonChange(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden shadow-2xs truncate"
                required
              >
                <option value="">-- Pilih Pemohon / Penerima --</option>
                {pejabatList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} ({p.jabatan})
                  </option>
                ))}
              </select>
            </div>

            {/* Kolom 3: Unit / Bagian Pemohon */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Unit / Bagian Pemohon
              </label>
              <input
                type="text"
                id="input-unit-pemohon"
                value={unitPemohon}
                onChange={(e) => setUnitPemohon(e.target.value)}
                placeholder="Contoh: Lab Komputer, Tata Usaha, Guru IPA..."
                className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden shadow-2xs placeholder:text-slate-400"
                required
              />
            </div>

            {/* Kolom 4: Keperluan Umum / Tujuan */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Keperluan Umum / Tujuan
              </label>
              <input
                type="text"
                id="input-keperluan-umum"
                value={keperluanUmum}
                onChange={(e) => setKeperluanUmum(e.target.value)}
                placeholder="Contoh: Kebutuhan KBM & Administrasi Sekolah..."
                className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden shadow-2xs placeholder:text-slate-400"
                required
              />
            </div>

          </div>

          {/* Info Banner Pejabat Penandatangan Otomatis (Hapus Field Dropdown dari Form) */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] bg-blue-50/70 border border-blue-200/80 px-3 py-1.5 rounded-lg text-slate-600">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                <strong>Pejabat Penandatangan Otomatis:</strong>{' '}
                Kepala Sekolah: <span className="text-blue-900 font-bold">{autoKepsek?.nama?.split(',')[0] || '-'}</span> &bull;{' '}
                Wakasek Sarpras: <span className="text-blue-900 font-bold">{autoSarpras?.nama?.split(',')[0] || '-'}</span> &bull;{' '}
                Pengurus Barang: <span className="text-blue-900 font-bold">{autoPengurusBarang?.nama?.split(',')[0] || '-'}</span>
              </span>
            </div>
            <div className="text-[10px] text-blue-800/80 bg-white px-2 py-0.5 rounded border border-blue-200 font-medium">
              Otomatis dari Master Data Pejabat
            </div>
          </div>
        </div>

        {/* Informasi Penomoran Surat Independen 4 Berkas */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Penomoran Dokumen Cetak Independen:
              </span>
              <span className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                Instansi: {schoolCode}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <button
                type="button"
                onClick={handleRefreshNumbers}
                className="text-slate-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
                title="Sinkronkan nomor dengan nomor urut terbaru"
              >
                <RefreshCw className="w-3 h-3" />
                Reset Pola
              </button>
              <button
                type="button"
                onClick={() => setIsCustomNumber(!isCustomNumber)}
                className="text-blue-600 hover:text-blue-800 font-medium underline"
              >
                {isCustomNumber ? 'Mode Otomatis' : 'Sesuaikan Manual'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
            <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between gap-1 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-500 shrink-0">1. NPB:</span>
              <input
                type="text"
                value={noNPB}
                disabled={!isCustomNumber}
                onChange={(e) => setNoNPB(e.target.value)}
                className={`w-full font-mono text-[11px] text-right font-semibold ${
                  isCustomNumber ? 'text-blue-700 bg-white border-b border-blue-400' : 'bg-transparent text-slate-800'
                }`}
              />
            </div>

            <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between gap-1 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-500 shrink-0">2. SPB:</span>
              <input
                type="text"
                value={noSPB}
                disabled={!isCustomNumber}
                onChange={(e) => setNoSPB(e.target.value)}
                className={`w-full font-mono text-[11px] text-right font-semibold ${
                  isCustomNumber ? 'text-blue-700 bg-white border-b border-blue-400' : 'bg-transparent text-slate-800'
                }`}
              />
            </div>

            <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between gap-1 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-500 shrink-0">3. SPPB:</span>
              <input
                type="text"
                value={noSPPB}
                disabled={!isCustomNumber}
                onChange={(e) => setNoSPPB(e.target.value)}
                className={`w-full font-mono text-[11px] text-right font-semibold ${
                  isCustomNumber ? 'text-blue-700 bg-white border-b border-blue-400' : 'bg-transparent text-slate-800'
                }`}
              />
            </div>

            <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between gap-1 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-500 shrink-0">4. BAST:</span>
              <input
                type="text"
                value={noBAST}
                disabled={!isCustomNumber}
                onChange={(e) => setNoBAST(e.target.value)}
                className={`w-full font-mono text-[11px] text-right font-semibold ${
                  isCustomNumber ? 'text-blue-700 bg-white border-b border-blue-400' : 'bg-transparent text-slate-800'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Sticky Action Bar & Hybrid Dual Input Tooling */}
        <div className="px-5 py-2.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="font-bold text-slate-800 uppercase flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              Rincian Barang Disalurkan
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
              {items.length} jenis barang
            </span>
            <span className="text-slate-400 hidden sm:inline">&bull;</span>
            <span className="text-slate-600 hidden sm:inline">
              Volume: <strong className="text-slate-900 font-bold">{totalQty} unit</strong>
            </span>
            <span className="text-slate-400 hidden sm:inline">&bull;</span>
            <span className="text-slate-600 hidden sm:inline">
              Estimasi: <strong className="font-mono text-emerald-700 font-bold">{formatRupiah(totalEstimasiNilai)}</strong>
            </span>
          </div>

          {/* Dual Input Buttons (Hybrid Mode) */}
          <div className="flex items-center gap-2">
            {/* 1. Quick Add Row Button */}
            <button
              type="button"
              id="btn-quick-add-row"
              onClick={handleAddQuickRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-all active:scale-98"
              title="Tambah 1 baris kosong secara cepat langsung di tabel"
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" />
              + Baris Baru
            </button>

            {/* 2. Batch Pop-up Modal Button */}
            <button
              type="button"
              id="btn-batch-add-modal"
              onClick={() => setIsBatchModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-lg shadow-2xs transition-all ring-1 ring-blue-700/30"
              title="Buka pop-up untuk mencari, memilih sisa stok, dan memasukkan banyak barang sekaligus"
            >
              <Boxes className="w-3.5 h-3.5 text-blue-200" />
              + Tambah Banyak Barang (Pop-up)
            </button>
          </div>
        </div>

      </div>

      {/* =========================================================================
          NOTIFICATIONS & SAFETY NET ALERTS (Over-Stock Limit & Error)
          ========================================================================= */}
      {hasOverStock && (
        <div className="mx-5 my-2 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs shrink-0 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <div>
            <strong className="block font-bold">Peringatan Over-Stock Limit!</strong>
            <span>
              Terdapat {overStockItems.length} barang yang jumlah dimintanya melampaui sisa stok gudang. Sistem menolak penyaluran barang melebihi stok fisik yang ada.
            </span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mx-5 my-2 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs shrink-0 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* =========================================================================
          2. OPTIMASI TABEL RINCIAN UTAMA (MENCEGAH SCROLL HORIZONTAL)
          table-layout: fixed; width: 100%;
          No (4%) | Kategori / Rekening (24%) | Nama Barang & NUSP (24%) | Satuan (7%) |
          Sisa Stok (8%) | Jml Diminta (8%) | Harga Satuan (10%) | Subtotal (11%) | Aksi (4%)
          ========================================================================= */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs bg-white">
          <table
            className="w-full text-xs text-left"
            style={{ tableLayout: 'fixed', width: '100%' }}
          >
            <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th style={{ width: '4%' }} className="p-2 text-center">No</th>
                <th style={{ width: '24%' }} className="p-2">Kategori / Kode Rekening</th>
                <th style={{ width: '24%' }} className="p-2">Nama Barang &amp; Kode/NUSP</th>
                <th style={{ width: '7%' }} className="p-2 text-center">Satuan</th>
                <th style={{ width: '8%' }} className="p-2 text-center">Sisa Stok</th>
                <th style={{ width: '8%' }} className="p-2 text-center">Jml Diminta</th>
                <th style={{ width: '10%' }} className="p-2 text-right">Harga Satuan (Rp)</th>
                <th style={{ width: '11%' }} className="p-2 text-right">Subtotal (Rp)</th>
                <th style={{ width: '4%' }} className="p-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center bg-slate-50/50">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3 py-6">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 border border-blue-200/80 flex items-center justify-center shadow-2xs">
                        <Boxes className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-800">
                          Belum Ada Barang Ditambahkan
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Belum ada barang ditambahkan. Klik <strong className="text-slate-700 font-semibold">+ Baris Baru</strong> atau <strong className="text-blue-700 font-semibold">+ Tambah Banyak Barang (Pop-up)</strong> untuk memulai.
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={handleAddQuickRow}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-all cursor-pointer active:scale-98"
                        >
                          <Plus className="w-3.5 h-3.5 text-slate-600" />
                          + Baris Baru
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsBatchModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-all ring-1 ring-blue-700/30 cursor-pointer active:scale-98"
                        >
                          <Boxes className="w-3.5 h-3.5 text-blue-200" />
                          + Tambah Banyak Barang (Pop-up)
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => {
                  const currentRowRekening = it.kodeRekening || rekeningList[0]?.kode || '5.1.02.01.01.0024';
                  const filteredBarangList = getBarangByRekening(masterBarang, currentRowRekening);
                  const isOverStock = it.barangId ? it.usulanJumlah > it.sisaBarang : false;
                  const isStokEmpty = it.barangId ? it.sisaBarang <= 0 : false;
                  const rowSubtotal = (Number(it.usulanJumlah) || 0) * (it.hargaSatuan || 0);

                  return (
                    <tr
                      key={it.id || idx}
                      className={`transition-colors ${
                        isOverStock
                          ? 'bg-rose-50/70 hover:bg-rose-50'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* No (4%) */}
                      <td className="p-2 text-center font-medium text-slate-500">
                        {idx + 1}
                      </td>

                      {/* Kategori / Kode Rekening (24%) */}
                      <td className="p-2 overflow-hidden">
                        <select
                          value={currentRowRekening}
                          onChange={(e) => handleSelectRekening(idx, e.target.value)}
                          className="w-full border border-blue-300 bg-blue-50/40 hover:bg-blue-50/80 rounded-md px-1.5 py-1 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden truncate"
                          title={it.namaRekening}
                        >
                          {rekeningList.map((rek) => (
                            <option key={rek.kode} value={rek.kode}>
                              {rek.displayName} ({rek.count})
                            </option>
                          ))}
                        </select>
                        <div className="text-[10px] text-blue-700 font-medium truncate mt-0.5" title={it.namaRekening}>
                          {it.namaRekening || 'Pilih Rekening'}
                        </div>
                      </td>

                      {/* Nama Barang & Kode/NUSP (24%) */}
                      <td className="p-2 overflow-hidden">
                        <select
                          value={it.barangId}
                          onChange={(e) => handleSelectBarang(idx, e.target.value)}
                          disabled={filteredBarangList.length === 0}
                          className={`w-full border rounded-md px-1.5 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium disabled:bg-slate-100 disabled:text-slate-400 truncate ${
                            !it.barangId ? 'border-amber-400 bg-amber-50/50 text-amber-900 font-semibold' : 'border-slate-300 bg-white text-slate-900'
                          }`}
                          title={it.namaBarang || '-- Pilih Barang --'}
                        >
                          {!it.barangId && (
                            <option value="">-- Pilih Barang --</option>
                          )}
                          {filteredBarangList.length === 0 ? (
                            <option value="">-- Tidak ada barang --</option>
                          ) : (
                            filteredBarangList.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.namaBarang} (Stok: {b.stokSekarang} {b.satuan})
                              </option>
                            ))
                          )}
                        </select>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 truncate">
                          <span className="font-mono text-slate-600">Kode: {it.kodeBarang || '-'}</span>
                          <span>&bull;</span>
                          <span className="font-mono text-slate-400">NUSP: {it.nusp || '-'}</span>
                        </div>
                        {it.keperluan && it.keperluan !== keperluanUmum && (
                          <div className="text-[9px] text-indigo-600 font-medium truncate mt-0.5" title={it.keperluan}>
                            Keperluan: {it.keperluan}
                          </div>
                        )}
                      </td>

                      {/* Satuan (7%) */}
                      <td className="p-2 text-center text-slate-700 font-medium overflow-hidden">
                        <span className="truncate block">{it.satuan}</span>
                      </td>

                      {/* Sisa Stok (8% - Indikator warna: Merah jika 0, Hijau jika tersedia) */}
                      <td className="p-2 text-center overflow-hidden">
                        {!it.barangId ? (
                          <span className="text-slate-400 font-mono text-[11px]">-</span>
                        ) : isStokEmpty ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            0
                          </span>
                        ) : it.sisaBarang <= 5 ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            {it.sisaBarang}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {it.sisaBarang}
                          </span>
                        )}
                      </td>

                      {/* Jml Diminta (8%) */}
                      <td className="p-2 text-center overflow-hidden">
                        <input
                          type="number"
                          min="1"
                          max={it.sisaBarang > 0 ? it.sisaBarang : 1}
                          disabled={!it.barangId}
                          value={it.usulanJumlah}
                          onChange={(e) => handleItemFieldChange(idx, 'usulanJumlah', parseInt(e.target.value, 10) || 0)}
                          className={`w-full text-center border rounded-md py-1 px-1 font-bold text-xs disabled:bg-slate-100 disabled:text-slate-400 ${
                            isOverStock
                              ? 'border-rose-500 bg-rose-100 text-rose-800 ring-1 ring-rose-500 focus:outline-hidden'
                              : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden'
                          }`}
                          title={isOverStock ? `Melebihi sisa stok gudang (${it.sisaBarang})!` : 'Jumlah yang diminta'}
                        />
                        {isOverStock && (
                          <span className="block text-[8px] text-rose-600 font-bold mt-0.5 leading-none truncate">
                            &gt; Stok ({it.sisaBarang})
                          </span>
                        )}
                      </td>

                      {/* Harga Satuan (Rp) (10%) */}
                      <td className="p-2 text-right font-mono text-[11px] text-slate-700 overflow-hidden truncate">
                        {formatRupiah(it.hargaSatuan)}
                      </td>

                      {/* Subtotal (Rp) (11% - hasil kalkulasi Jml x Harga) */}
                      <td className="p-2 text-right font-mono font-bold text-slate-900 overflow-hidden truncate">
                        {formatRupiah(rowSubtotal)}
                      </td>

                      {/* Aksi (4% - Tombol Hapus / Edit) */}
                      <td className="p-2 text-center overflow-hidden">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditKeperluan(idx)}
                            className="text-slate-400 hover:text-blue-600 p-1 rounded-md hover:bg-blue-50 transition-colors"
                            title="Edit keperluan khusus baris ini"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                            title="Hapus baris barang ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Live Table Summary Footer */}
        <div className="mt-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              Total Item: <strong className="text-slate-900 font-bold">{totalItemCount} barang</strong>
            </span>
            <span>&bull;</span>
            <span>
              Total Volume: <strong className="text-slate-900 font-bold">{totalQty} unit/satuan</strong>
            </span>
          </div>
          <div>
            <span>
              Estimasi Nilai Barang Disalurkan:{' '}
              <strong className="text-emerald-700 font-mono text-sm font-bold ml-1">
                {formatRupiah(totalEstimasiNilai)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. STICKY / FIXED BOTTOM ACTION FOOTER
          Anti Double-Submit Protection
          ========================================================================= */}
      <div className="shrink-0 px-5 py-3 bg-slate-100/90 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Penyaluran barang otomatis mengurangi sisa stok gudang dan mencatat log transaksi pada Buku BOS.
          </span>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Batal
          </button>

          <button
            type="button"
            id="btn-pre-submit-penyaluran"
            onClick={handlePreSubmit}
            disabled={isSubmitting || hasOverStock}
            className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-sm flex items-center gap-2 transition-all ring-1 ring-blue-700/30"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan Transaksi...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan &amp; Keluar Barang</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          SUB-MODAL: BATCH ADD BARANG PENYALURAN
          ========================================================================= */}
      <BatchAddPenyaluranModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        masterBarang={masterBarang}
        onAddBatch={handleAddBatch}
        defaultKeperluan={keperluanUmum}
      />

      {/* =========================================================================
          SUB-MODAL: EDIT KEPERLUAN KHUSUS ITEM
          ========================================================================= */}
      {editingItemIndex !== null && (
        <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                Edit Keperluan Khusus Baris #{editingItemIndex + 1}
              </h4>
              <button
                type="button"
                onClick={() => setEditingItemIndex(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs mb-4">
              <div>
                <span className="text-slate-500 font-semibold block mb-0.5">Nama Barang:</span>
                <span className="font-bold text-slate-800">{items[editingItemIndex]?.namaBarang}</span>
              </div>
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Keperluan / Peruntukan Khusus:
                </label>
                <textarea
                  value={editKeperluanText}
                  onChange={(e) => setEditKeperluanText(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  placeholder="Contoh: Operasional KBM Praktik Jurusan TKJ..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingItemIndex(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditKeperluan}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONFIRMATION POP-UP (Anti Double-Submit & Ringkasan Transaksi)
          ========================================================================= */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Konfirmasi Simpan &amp; Keluar Barang
                </h4>
                <p className="text-xs text-slate-500">
                  Periksa ringkasan sebelum stok gudang dikurangi.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal Penyaluran:</span>
                <span className="font-semibold text-slate-900">{tanggal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pemohon / Unit:</span>
                <span className="font-semibold text-slate-900">{unitPemohon}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">No. BAST / SPB:</span>
                <span className="font-mono font-semibold text-blue-700">{noBAST}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Ragam Barang:</span>
                <span className="font-bold text-slate-900">{totalItemCount} jenis ({totalQty} unit fisik)</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-700">Total Estimasi Nilai:</span>
                <span className="font-bold font-mono text-emerald-800">
                  {formatRupiah(totalEstimasiNilai)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              {isEditMode 
                ? 'Apakah Anda yakin ingin menyimpan perubahan transaksi ini? Selisih kuantitas barang otomatis disinkronkan ke saldo persediaan gudang.' 
                : 'Apakah Anda yakin data ini sudah benar? Stok barang di gudang akan otomatis terpotong sesuai kuantitas yang diajukan.'}
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Periksa Ulang
              </button>
              <button
                type="button"
                id="btn-confirm-final-submit"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-sm flex items-center gap-2 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isEditMode ? 'Menyimpan Koreksi...' : 'Memproses Penyaluran...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isEditMode ? 'Ya, Simpan Koreksi & Sesuaikan Stok' : 'Ya, Simpan & Potong Stok'}</span>
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
