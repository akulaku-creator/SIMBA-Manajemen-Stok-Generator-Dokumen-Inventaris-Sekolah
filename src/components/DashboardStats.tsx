import { 
  AlertTriangle, 
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight, 
  Boxes, 
  Building2,
  Calendar,
  CheckCircle2, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  Clock, 
  Download,
  Eye,
  FileSpreadsheet, 
  FileStack, 
  FileText, 
  Filter,
  Layers, 
  Loader2,
  Package,
  PackagePlus, 
  Pencil,
  Plus,
  Printer, 
  Receipt,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Warehouse,
  X
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { AppUser, Barang, KopSuratConfig, Pejabat, TransaksiPenerimaan, TransaksiPengeluaran } from '../types';
import { exportTransaksiToExcel } from '../utils/excelHelper';
import { formatRupiah, formatTanggalIndonesia } from '../utils/numberGenerator';
import { triggerPrint } from '../utils/printHelper';

interface Props {
  transaksiList: TransaksiPengeluaran[];
  penerimaanList: TransaksiPenerimaan[];
  barangList: Barang[];
  pejabatList?: Pejabat[];
  currentUser: AppUser;
  onSelectTransaksiForPrint: (id: string) => void;
  onOpenNewTransaksi: () => void;
  onOpenNewPenerimaan: () => void;
  onEditTransaksi: (transaksi: TransaksiPengeluaran) => void;
  onDeleteTransaksi: (transaksi: TransaksiPengeluaran) => void;
  onEditPenerimaan: (penerimaan: TransaksiPenerimaan) => void;
  onDeletePenerimaan: (penerimaan: TransaksiPenerimaan) => void;
  onSelectPenerimaanForPrint?: (penerimaan: TransaksiPenerimaan) => void;
  onOpenDinasModule?: () => void;
  kopConfig?: KopSuratConfig;
  schoolName?: string;
}

const MONTH_NAMES_ALL = [
  { val: 'all', label: 'Semua Bulan' },
  { val: '1', label: 'Januari' },
  { val: '2', label: 'Februari' },
  { val: '3', label: 'Maret' },
  { val: '4', label: 'April' },
  { val: '5', label: 'Mei' },
  { val: '6', label: 'Juni' },
  { val: '7', label: 'Juli' },
  { val: '8', label: 'Agustus' },
  { val: '9', label: 'September' },
  { val: '10', label: 'Oktober' },
  { val: '11', label: 'November' },
  { val: '12', label: 'Desember' }
];

export const DashboardStats: React.FC<Props> = ({
  transaksiList,
  penerimaanList,
  barangList,
  pejabatList = [],
  currentUser,
  onSelectTransaksiForPrint,
  onOpenNewTransaksi,
  onOpenNewPenerimaan,
  onEditTransaksi,
  onDeleteTransaksi,
  onEditPenerimaan,
  onDeletePenerimaan,
  onSelectPenerimaanForPrint,
  onOpenDinasModule,
  kopConfig,
  schoolName = 'SMAN 1 CIHAURBEUTI'
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';
  const isDinasUser = currentUser?.role?.toLowerCase() === 'super_admin' || currentUser?.role?.toLowerCase() === 'admin_dinas' || currentUser?.sekolah_id === 'dinas_prov' || currentUser?.username === 'dinas';

  // 1. BANNER MINIMIZE STATE (Requirement 2 & 3)
  const [isBannerMinimized, setIsBannerMinimized] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('simba_dashboard_banner_minimized') === 'true';
    } catch {
      return false;
    }
  });

  const toggleBanner = () => {
    setIsBannerMinimized(prev => {
      const next = !prev;
      try {
        sessionStorage.setItem('simba_dashboard_banner_minimized', String(next));
      } catch {}
      return next;
    });
  };

  // Active view tab in transaction section: 'penyaluran' or 'penerimaan'
  const [activeTrxTab, setActiveTrxTab] = useState<'penyaluran' | 'penerimaan'>('penyaluran');

  // Loading state for refresh (Requirement 16 & 24)
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Map Pejabat ID to Pejabat Info for Nama Pemohon resolution
  const pemohonMap = useMemo(() => {
    const map: Record<string, { nama: string; jabatan?: string }> = {};
    if (pejabatList) {
      pejabatList.forEach(p => {
        map[p.id] = { nama: p.nama, jabatan: p.jabatan };
      });
    }
    return map;
  }, [pejabatList]);

  // 2. AUDIT PERHITUNGAN SALDO STOK RIIL (Requirement 5)
  // Rumus Baku SIMBA: saldo akhir = saldo awal + total penerimaan - total penyaluran
  const getBarangStokSekarang = (b: Barang) => {
    const totalMasuk = (penerimaanList || []).reduce((acc, p) => {
      return acc + (p.items || []).reduce((sub, it) => (it.barangId === b.id || it.kodeBarang === b.kodeBarang ? sub + (Number(it.jumlahMasuk) || 0) : sub), 0);
    }, 0);
    const totalKeluar = (transaksiList || []).reduce((acc, t) => {
      return acc + (t.items || []).reduce((sub, it) => (it.barangId === b.id || it.kodeBarang === b.kodeBarang ? sub + (Number(it.usulanJumlah) || 0) : sub), 0);
    }, 0);
    const calculated = Math.max(0, (Number(b.stokAwal) || 0) + totalMasuk - totalKeluar);
    if (typeof b.stokSekarang === 'number' && !isNaN(b.stokSekarang)) {
      if (b.stokSekarang === 0 && calculated > 0) return calculated;
      return b.stokSekarang;
    }
    return calculated;
  };

  const totalBarangCount = barangList.length;

  // Akumulasi Total Sisa Stok Gudang (Rp) Real-Time
  const totalNilaiSisaStok = useMemo(() => {
    return barangList.reduce((acc, b) => {
      const stok = getBarangStokSekarang(b);
      const price = Number(b.hargaSatuan) || 0;
      return acc + (stok * price);
    }, 0);
  }, [barangList, penerimaanList, transaksiList]);

  // Akumulasi Total Nilai Penyaluran (Rp)
  const totalNilaiPenyaluran = useMemo(() => {
    return transaksiList.reduce((acc, t) => {
      return acc + t.items.reduce((sub, it) => {
        const qty = Number(it.usulanJumlah) || 0;
        const price = Number(it.hargaSatuan) || 0;
        return sub + (qty * price);
      }, 0);
    }, 0);
  }, [transaksiList]);

  // Total Unit Barang Keluar
  const totalItemDisalurkan = useMemo(() => {
    return transaksiList.reduce(
      (acc, t) => acc + t.items.reduce((sub, it) => sub + (Number(it.usulanJumlah) || 0), 0),
      0
    );
  }, [transaksiList]);

  // Akumulasi Penerimaan Belanja BOS (Rp)
  const totalNilaiBelanjaBOS = useMemo(() => {
    return penerimaanList.reduce((acc, p) => acc + (p.totalNilai || 0), 0);
  }, [penerimaanList]);

  // 3. LOGIKA KARTU PERINGATAN GUDANG (Requirement 6)
  // Kategori: Habis (stok <= 0), Hampir habis (stok > 0 && stok <= 10), Aman (> 10)
  const SAFE_STOCK_THRESHOLD = 10;
  const barangWithCalculatedStock = useMemo(() => {
    return barangList.map(b => ({
      ...b,
      stokHitung: getBarangStokSekarang(b)
    }));
  }, [barangList, penerimaanList, transaksiList]);

  const stokHabisList = useMemo(() => {
    return barangWithCalculatedStock.filter(b => b.stokHitung <= 0);
  }, [barangWithCalculatedStock]);

  const stokHampirHabisList = useMemo(() => {
    return barangWithCalculatedStock.filter(b => b.stokHitung > 0 && b.stokHitung <= SAFE_STOCK_THRESHOLD);
  }, [barangWithCalculatedStock]);

  const stokWarningList = useMemo(() => {
    return [...stokHabisList, ...stokHampirHabisList];
  }, [stokHabisList, stokHampirHabisList]);

  // Modal State untuk "Lihat Detail" Peringatan Gudang
  const [isWarningDetailModalOpen, setIsWarningDetailModalOpen] = useState(false);

  // ==========================================
  // TABLE 1: TRANSAKSI PENYALURAN (Filter, Sort & Pagination)
  // ==========================================
  const [searchTrx, setSearchTrx] = useState('');
  const [triwulanTrx, setTriwulanTrx] = useState<'all' | 'TW1' | 'TW2' | 'TW3' | 'TW4'>('all');
  const [monthTrx, setMonthTrx] = useState('all');
  const [yearTrx, setYearTrx] = useState('all');
  const [statusTrx, setStatusTrx] = useState<string>('all');
  const [unitPemohonTrx, setUnitPemohonTrx] = useState<string>('all');
  const [pageTrx, setPageTrx] = useState(1);
  const [pageSizeTrx, setPageSizeTrx] = useState(10);
  const [sortFieldTrx, setSortFieldTrx] = useState<'nomor' | 'tanggal' | 'nilai' | 'pemohon' | 'status'>('nomor');
  const [sortOrderTrx, setSortOrderTrx] = useState<'asc' | 'desc'>('desc');
  const [isMobileFilterOpenTrx, setIsMobileFilterOpenTrx] = useState(false);

  // Available Years
  const availableYearsTrx = useMemo(() => {
    const years = new Set<string>();
    transaksiList.forEach(t => {
      if (t.tanggal) {
        const y = new Date(t.tanggal).getFullYear();
        if (!isNaN(y)) years.add(y.toString());
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [transaksiList]);

  // Dynamic Available Unit Pemohon (Requirement 10: Jangan hardcode)
  const availableUnitPemohon = useMemo(() => {
    const set = new Set<string>();
    transaksiList.forEach(t => {
      if (t.unitPemohon?.trim()) set.add(t.unitPemohon.trim());
    });
    return Array.from(set).sort();
  }, [transaksiList]);

  // Triwulan to Months synchronization (Requirement 8)
  const availableMonthsTrx = useMemo(() => {
    if (triwulanTrx === 'TW1') {
      return [
        { val: 'all', label: 'Semua Bulan di TW 1' },
        { val: '1', label: 'Januari' },
        { val: '2', label: 'Februari' },
        { val: '3', label: 'Maret' }
      ];
    }
    if (triwulanTrx === 'TW2') {
      return [
        { val: 'all', label: 'Semua Bulan di TW 2' },
        { val: '4', label: 'April' },
        { val: '5', label: 'Mei' },
        { val: '6', label: 'Juni' }
      ];
    }
    if (triwulanTrx === 'TW3') {
      return [
        { val: 'all', label: 'Semua Bulan di TW 3' },
        { val: '7', label: 'Juli' },
        { val: '8', label: 'Agustus' },
        { val: '9', label: 'September' }
      ];
    }
    if (triwulanTrx === 'TW4') {
      return [
        { val: 'all', label: 'Semua Bulan di TW 4' },
        { val: '10', label: 'Oktober' },
        { val: '11', label: 'November' },
        { val: '12', label: 'Desember' }
      ];
    }
    return MONTH_NAMES_ALL;
  }, [triwulanTrx]);

  // Adjust month when triwulan changes
  const handleTriwulanChange = (tw: 'all' | 'TW1' | 'TW2' | 'TW3' | 'TW4') => {
    setTriwulanTrx(tw);
    setMonthTrx('all');
    setPageTrx(1);
  };

  // Popover / Modal Item Detail State (Requirement 19)
  const [viewingDetailItems, setViewingDetailItems] = useState<{
    title: string;
    subtitle: string;
    type: 'penyaluran' | 'penerimaan';
    items: Array<{
      namaBarang: string;
      kodeBarang?: string;
      kodeRekening?: string;
      namaRekening?: string;
      nusp?: string;
      satuan: string;
      jumlah: number;
      hargaSatuan?: number;
      subtotal?: number;
      keperluan?: string;
    }>;
  } | null>(null);

  // Modal PDF Preview State (Requirement 15)
  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState(false);

  // Combined Filtering Penyaluran (Requirement 11: Bekerja secara kombinasi)
  const filteredTransaksi = useMemo(() => {
    return transaksiList.filter(t => {
      // 1. Search filter
      if (searchTrx.trim()) {
        const q = searchTrx.toLowerCase().trim();
        const pemohon = pemohonMap[t.pemohonId];
        const matchUnit = (t.unitPemohon || '').toLowerCase().includes(q);
        const matchKeperluan = (t.keperluanUmum || '').toLowerCase().includes(q);
        const matchBast = (t.noBAST || '').toLowerCase().includes(q);
        const matchSpb = (t.noSPB || '').toLowerCase().includes(q);
        const matchNpb = (t.noNPB || '').toLowerCase().includes(q);
        const matchReg = `reg #${t.nomorUrut}`.toLowerCase().includes(q) || t.nomorUrut.toString() === q;
        const matchPemohonNama = (pemohon?.nama || '').toLowerCase().includes(q);
        const matchItem = t.items.some(it => 
          (it.namaBarang || '').toLowerCase().includes(q) ||
          (it.kodeBarang || '').toLowerCase().includes(q) ||
          (it.nusp || '').toLowerCase().includes(q)
        );

        if (!matchUnit && !matchKeperluan && !matchBast && !matchSpb && !matchNpb && !matchReg && !matchPemohonNama && !matchItem) {
          return false;
        }
      }

      // 2. Year filter
      if (yearTrx !== 'all' && t.tanggal) {
        const y = new Date(t.tanggal).getFullYear().toString();
        if (y !== yearTrx) return false;
      }

      // 3. Triwulan filter
      if (triwulanTrx !== 'all' && t.tanggal) {
        const m = new Date(t.tanggal).getMonth() + 1;
        if (triwulanTrx === 'TW1' && (m < 1 || m > 3)) return false;
        if (triwulanTrx === 'TW2' && (m < 4 || m > 6)) return false;
        if (triwulanTrx === 'TW3' && (m < 7 || m > 9)) return false;
        if (triwulanTrx === 'TW4' && (m < 10 || m > 12)) return false;
      }

      // 4. Month filter
      if (monthTrx !== 'all' && t.tanggal) {
        const m = (new Date(t.tanggal).getMonth() + 1).toString();
        if (m !== monthTrx) return false;
      }

      // 5. Status filter (Requirement 9)
      if (statusTrx !== 'all') {
        const rawStatus = ((t.status as string) || 'selesai').toLowerCase();
        if (statusTrx === 'selesai' && rawStatus !== 'selesai' && rawStatus !== 'disalurkan' && rawStatus !== 'disetujui') return false;
        if (statusTrx === 'diproses' && rawStatus !== 'diproses' && rawStatus !== 'diajukan') return false;
        if (statusTrx === 'draft' && rawStatus !== 'draft') return false;
        if (statusTrx === 'ditolak' && rawStatus !== 'ditolak') return false;
        if (statusTrx === 'dibatalkan' && rawStatus !== 'dibatalkan') return false;
      }

      // 6. Unit Pemohon filter (Requirement 10)
      if (unitPemohonTrx !== 'all') {
        if ((t.unitPemohon || '').trim() !== unitPemohonTrx) return false;
      }

      return true;
    });
  }, [transaksiList, searchTrx, yearTrx, triwulanTrx, monthTrx, statusTrx, unitPemohonTrx, pemohonMap]);

  // Sorting Penyaluran (Requirement 17)
  const sortedTransaksi = useMemo(() => {
    const list = [...filteredTransaksi];
    return list.sort((a, b) => {
      let comp = 0;
      if (sortFieldTrx === 'nomor') {
        comp = a.nomorUrut - b.nomorUrut;
      } else if (sortFieldTrx === 'tanggal') {
        comp = new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();
      } else if (sortFieldTrx === 'pemohon') {
        comp = (a.unitPemohon || '').localeCompare(b.unitPemohon || '');
      } else if (sortFieldTrx === 'nilai') {
        const nilaiA = a.items.reduce((s, it) => s + ((Number(it.usulanJumlah) || 0) * (Number(it.hargaSatuan) || 0)), 0);
        const nilaiB = b.items.reduce((s, it) => s + ((Number(it.usulanJumlah) || 0) * (Number(it.hargaSatuan) || 0)), 0);
        comp = nilaiA - nilaiB;
      } else if (sortFieldTrx === 'status') {
        const stA = (a.status as string) || 'selesai';
        const stB = (b.status as string) || 'selesai';
        comp = stA.localeCompare(stB);
      }
      return sortOrderTrx === 'asc' ? comp : -comp;
    });
  }, [filteredTransaksi, sortFieldTrx, sortOrderTrx]);

  // Pagination Penyaluran (Requirement 18)
  const totalPagesTrx = Math.max(1, Math.ceil(sortedTransaksi.length / pageSizeTrx));
  const pagedTransaksi = useMemo(() => {
    const start = (pageTrx - 1) * pageSizeTrx;
    return sortedTransaksi.slice(start, start + pageSizeTrx);
  }, [sortedTransaksi, pageTrx, pageSizeTrx]);

  const handleSortTrx = (field: 'nomor' | 'tanggal' | 'nilai' | 'pemohon' | 'status') => {
    if (sortFieldTrx === field) {
      setSortOrderTrx(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortFieldTrx(field);
      setSortOrderTrx('desc');
    }
  };

  // Reset Filters (Requirement 12)
  const resetFiltersTrx = () => {
    setSearchTrx('');
    setTriwulanTrx('all');
    setMonthTrx('all');
    setYearTrx('all');
    setStatusTrx('all');
    setUnitPemohonTrx('all');
    setPageTrx(1);
  };

  // Refresh Trigger (Requirement 16)
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 350);
  };

  // Periode label text for export
  const currentPeriodeText = useMemo(() => {
    const parts: string[] = [];
    if (triwulanTrx !== 'all') {
      const twLabels: Record<string, string> = {
        TW1: 'Triwulan I (Jan–Mar)',
        TW2: 'Triwulan II (Apr–Jun)',
        TW3: 'Triwulan III (Jul–Sep)',
        TW4: 'Triwulan IV (Okt–Des)'
      };
      parts.push(twLabels[triwulanTrx] || triwulanTrx);
    }
    if (monthTrx !== 'all') {
      const mObj = MONTH_NAMES_ALL.find(m => m.val === monthTrx);
      if (mObj) parts.push(`Bulan ${mObj.label}`);
    }
    if (yearTrx !== 'all') {
      parts.push(`Tahun ${yearTrx}`);
    } else {
      parts.push('Tahun 2026');
    }
    return parts.length > 0 ? parts.join(' • ') : 'Seluruh Periode Berjalan';
  }, [triwulanTrx, monthTrx, yearTrx]);

  // Export Excel Action (Requirement 13 & 14)
  const handleExportExcel = () => {
    exportTransaksiToExcel(filteredTransaksi, pemohonMap, {
      sekolahName: schoolName,
      periodeText: currentPeriodeText
    });
  };

  // Status Badge Component (Requirement 22)
  const renderStatusBadge = (status?: string) => {
    const s = ((status as string) || 'selesai').toLowerCase();
    if (s === 'selesai' || s === 'disalurkan' || s === 'disetujui') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Selesai
        </span>
      );
    }
    if (s === 'diproses' || s === 'diajukan') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-600" />
          Diproses
        </span>
      );
    }
    if (s === 'ditolak' || s === 'dibatalkan') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300">
          <X className="w-3 h-3 text-rose-600" />
          {s === 'ditolak' ? 'Ditolak' : 'Dibatalkan'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
        Draft
      </span>
    );
  };

  // ==========================================
  // TABLE 2: TRANSAKSI PENERIMAAN BELANJA BOS
  // ==========================================
  const [searchRcv, setSearchRcv] = useState('');
  const [sumberDanaRcv, setSumberDanaRcv] = useState('all');
  const [monthRcv, setMonthRcv] = useState('all');
  const [yearRcv, setYearRcv] = useState('all');
  const [pageRcv, setPageRcv] = useState(1);
  const [pageSizeRcv, setPageSizeRcv] = useState(10);
  const [isMobileFilterOpenRcv, setIsMobileFilterOpenRcv] = useState(false);

  const availableYearsRcv = useMemo(() => {
    const years = new Set<string>();
    penerimaanList.forEach(p => {
      if (p.tanggal) {
        const y = new Date(p.tanggal).getFullYear();
        if (!isNaN(y)) years.add(y.toString());
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [penerimaanList]);

  const filteredPenerimaan = useMemo(() => {
    return penerimaanList.filter(p => {
      if (searchRcv.trim()) {
        const q = searchRcv.toLowerCase().trim();
        const matchBukti = (p.noBukti || '').toLowerCase().includes(q);
        const matchPenyedia = (p.penyedia || '').toLowerCase().includes(q);
        const matchKet = (p.keterangan || '').toLowerCase().includes(q);
        const matchSumber = (p.sumberDana || '').toLowerCase().includes(q);
        const matchItem = p.items.some(it => 
          (it.namaBarang || '').toLowerCase().includes(q) ||
          (it.kodeBarang || '').toLowerCase().includes(q) ||
          (it.nusp || '').toLowerCase().includes(q)
        );
        if (!matchBukti && !matchPenyedia && !matchKet && !matchSumber && !matchItem) return false;
      }
      if (sumberDanaRcv !== 'all' && p.sumberDana !== sumberDanaRcv) return false;
      if (monthRcv !== 'all' && p.tanggal) {
        const m = (new Date(p.tanggal).getMonth() + 1).toString();
        if (m !== monthRcv) return false;
      }
      if (yearRcv !== 'all' && p.tanggal) {
        const y = new Date(p.tanggal).getFullYear().toString();
        if (y !== yearRcv) return false;
      }
      return true;
    });
  }, [penerimaanList, searchRcv, sumberDanaRcv, monthRcv, yearRcv]);

  const totalPagesRcv = Math.max(1, Math.ceil(filteredPenerimaan.length / pageSizeRcv));
  const pagedPenerimaan = useMemo(() => {
    const start = (pageRcv - 1) * pageSizeRcv;
    return filteredPenerimaan.slice(start, start + pageSizeRcv);
  }, [filteredPenerimaan, pageRcv, pageSizeRcv]);

  const resetFiltersRcv = () => {
    setSearchRcv('');
    setSumberDanaRcv('all');
    setMonthRcv('all');
    setYearRcv('all');
    setPageRcv(1);
  };

  const hasActiveFiltersTrx = searchTrx || triwulanTrx !== 'all' || monthTrx !== 'all' || yearTrx !== 'all' || statusTrx !== 'all' || unitPemohonTrx !== 'all';

  return (
    <div className="space-y-5 text-slate-800 animate-in fade-in duration-150">
      
      {/* =========================================================================
          1. OPTIMIZED COLLAPSIBLE BANNER HEADER (Requirement 2 & 3)
          ========================================================================= */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs transition-all overflow-hidden">
        {isBannerMinimized ? (
          /* Minimized State: Sleek single bar preserving page identity */
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3 bg-slate-50/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                SIMBA: Sistem Manajemen Stok &amp; Generator Dokumen Inventaris Sekolah
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold shrink-0">
                <ShieldCheck className="w-3 h-3 text-blue-600" />
                Standar Legalitas A4/F4
              </span>
            </div>
            <button
              type="button"
              onClick={toggleBanner}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer shrink-0"
              title="Tampilkan ringkasan sistem inventaris lengkap"
            >
              <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
              <span>[+] Tampilkan Ringkasan</span>
            </button>
          </div>
        ) : (
          /* Expanded State: Compact, reduced padding (-25%), no duplicate create button */
          <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Standar Format Baku Instansi Pemerintah (A4/F4)</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">&bull; Multi-Tenant Aktif</span>
              </div>

              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-snug">
                Sistem Manajemen Stok &amp; Generator Dokumen Inventaris Sekolah
              </h1>

              <p className="text-xs text-slate-600 leading-relaxed">
                Satu alur input otomatis menciptakan berkas legalitas berantai:{' '}
                <span className="font-semibold text-blue-700">NPB &rarr; SPB &rarr; SPPB &rarr; BAST</span>,{' '}
                dan pembukuan rekapitulasi realisasi dana BOS persis sesuai standar audit dinas pendidikan.
              </p>
            </div>

            {/* Banner Right Actions: Minimize toggle */}
            <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
              {onOpenDinasModule && isDinasUser && (
                <button
                  type="button"
                  onClick={onOpenDinasModule}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold shadow-2xs transition-all cursor-pointer"
                  title="Buka Modul Pengawasan Dinas & Laporan Mutasi Gabungan"
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-700" />
                  <span>Modul Dinas</span>
                </button>
              )}
              <button
                type="button"
                onClick={toggleBanner}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                title="Sembunyikan deskripsi panjang banner untuk meluaskan area tabel"
              >
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                <span>[−] Minimalkan</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          2. SUMMARY CARDS (4 MAIN CARDS) - (Requirement 4, 5, 6 & 24)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Card 1: Total Sisa Stok Gudang */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:border-blue-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Sisa Stok Gudang
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {isRefreshing ? (
                <div className="h-7 w-36 bg-slate-200 animate-pulse rounded-lg"></div>
              ) : barangList.length === 0 ? (
                <span className="text-base text-slate-400 font-sans font-normal">Belum ada data</span>
              ) : (
                formatRupiah(totalNilaiSisaStok)
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Nilai persediaan tersisa • {totalBarangCount} ragam barang
            </p>
          </div>
        </div>

        {/* Card 2: Total Nilai Penyaluran */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:border-indigo-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Nilai Penyaluran
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {isRefreshing ? (
                <div className="h-7 w-36 bg-slate-200 animate-pulse rounded-lg"></div>
              ) : (
                formatRupiah(totalNilaiPenyaluran)
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {transaksiList.length} transaksi • {totalItemDisalurkan.toLocaleString('id-ID')} unit barang keluar
            </p>
          </div>
        </div>

        {/* Card 3: Penerimaan Belanja BOS */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:border-emerald-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Penerimaan Belanja BOS
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-700 font-mono">
              {isRefreshing ? (
                <div className="h-7 w-36 bg-slate-200 animate-pulse rounded-lg"></div>
              ) : (
                formatRupiah(totalNilaiBelanjaBOS)
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {penerimaanList.length} transaksi penerimaan belanja
            </p>
          </div>
        </div>

        {/* Card 4: Peringatan Gudang (Requirement 6) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:border-amber-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Peringatan Gudang
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-105 ${
              stokWarningList.length > 0 
                ? 'bg-amber-50 text-amber-600 border-amber-200' 
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl sm:text-2xl font-bold tracking-tight ${
                stokWarningList.length > 0 ? 'text-amber-600' : 'text-emerald-700'
              }`}>
                {stokWarningList.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">item bermasalah</span>
            </div>
            {stokWarningList.length > 0 && (
              <button
                type="button"
                onClick={() => setIsWarningDetailModalOpen(true)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                title="Lihat daftar barang yang habis atau hampir habis"
              >
                Lihat Detail &rarr;
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate">
            {stokWarningList.length > 0 
              ? `${stokHabisList.length} habis • ${stokHampirHabisList.length} hampir habis` 
              : 'Seluruh item dalam kondisi aman (> 10 unit)'}
          </p>
        </div>

      </div>

      {/* =========================================================================
          3. TRANSACTION SECTION WITH SINGLE PRIMARY ACTION (Requirement 1 & 7)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        
        {/* Section Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/50 space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileStack className="w-5 h-5 text-blue-600 shrink-0" />
                <span>
                  {activeTrxTab === 'penyaluran' 
                    ? 'Daftar Transaksi Penyaluran Barang & Dokumen Cetak'
                    : 'Riwayat Penerimaan Pengadaan Barang Persediaan (Dana BOS)'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeTrxTab === 'penyaluran'
                  ? 'Kelola pengajuan, terbitkan berkas resmi (NPB, SPB, SPPB, BAST), dan pantau mutasi saldo.'
                  : 'Pencatatan faktur barang masuk dari rekanan/penyedia dan penambahan otomatis stok fisik gudang.'}
              </p>
            </div>

            {/* PRIMARY ACTIONS & CTAs (Requirement 1 & 7) */}
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
              {/* Secondary Action: Catat Penerimaan */}
              <button
                type="button"
                onClick={onOpenNewPenerimaan}
                className="text-xs bg-white hover:bg-slate-100 text-slate-700 font-bold px-3.5 py-2 rounded-xl border border-slate-300 shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Catat Belanja Penerimaan Barang (BOS/APBD)"
              >
                <PackagePlus className="w-4 h-4 text-emerald-600" />
                <span>Catat Penerimaan BOS</span>
              </button>

              {/* SINGLE PRIMARY ACTION: Buat Pengajuan Baru */}
              <button
                type="button"
                onClick={onOpenNewTransaksi}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl shadow-xs inline-flex items-center gap-2 transition-all cursor-pointer ring-2 ring-blue-500/20"
                title="Buat Transaksi Pengajuan Penyaluran Barang Baru"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ BUAT PENGAJUAN BARU</span>
              </button>
            </div>
          </div>

          {/* Segmented View Switcher & Action Tools */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-slate-200/80 pt-3">
            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold self-start">
              <button
                type="button"
                onClick={() => setActiveTrxTab('penyaluran')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTrxTab === 'penyaluran'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Penyaluran Barang ({transaksiList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTrxTab('penerimaan')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTrxTab === 'penerimaan'
                    ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Penerimaan Belanja BOS ({penerimaanList.length})
              </button>
            </div>

            {/* Quick Reporting Actions (Requirement 13 & 16) */}
            <div className="flex items-center gap-2 flex-wrap">
              {activeTrxTab === 'penyaluran' && (
                <>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    title="Export Data Hasil Filter ke File Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Export Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPdfExportModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    title="Export / Cetak Format Laporan Resmi PDF Sesuai Filter"
                  >
                    <Printer className="w-3.5 h-3.5 text-rose-700" />
                    <span>Export PDF</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                title="Segarkan data terbaru (Filter aktif tetap dipertahankan)"
              >
                <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                <span>Refresh</span>
              </button>

              {/* Mobile Filter Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  if (activeTrxTab === 'penyaluran') {
                    setIsMobileFilterOpenTrx(!isMobileFilterOpenTrx);
                  } else {
                    setIsMobileFilterOpenRcv(!isMobileFilterOpenRcv);
                  }
                }}
                className="md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                <span>Filter</span>
              </button>
            </div>
          </div>

          {/* =========================================================================
              SEARCH & MULTI-FILTER BAR FOR PENYALURAN (Requirement 8, 9, 10, 11, 12)
              ========================================================================= */}
          {activeTrxTab === 'penyaluran' && (
            <div className={`space-y-3 pt-1 ${isMobileFilterOpenTrx ? 'block' : 'hidden md:block'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5">
                
                {/* 1. Search Input */}
                <div className="sm:col-span-2 md:col-span-4 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTrx}
                    onChange={e => {
                      setSearchTrx(e.target.value);
                      setPageTrx(1);
                    }}
                    placeholder="Cari No Dokumen, Unit, Pemohon, Keperluan, Barang..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400 font-medium"
                  />
                  {searchTrx && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTrx('');
                        setPageTrx(1);
                      }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 2. Filter Triwulan (Requirement 8: TW 1, TW 2, TW 3, TW 4) */}
                <div className="sm:col-span-1 md:col-span-2">
                  <select
                    value={triwulanTrx}
                    onChange={e => handleTriwulanChange(e.target.value as any)}
                    className="w-full py-2 px-2.5 text-xs bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="all">Semua Triwulan</option>
                    <option value="TW1">TW 1 (Jan - Mar)</option>
                    <option value="TW2">TW 2 (Apr - Jun)</option>
                    <option value="TW3">TW 3 (Jul - Sep)</option>
                    <option value="TW4">TW 4 (Okt - Des)</option>
                  </select>
                </div>

                {/* 3. Filter Bulan (Menyesuaikan dengan Triwulan) */}
                <div className="sm:col-span-1 md:col-span-2">
                  <select
                    value={monthTrx}
                    onChange={e => {
                      setMonthTrx(e.target.value);
                      setPageTrx(1);
                    }}
                    className="w-full py-2 px-2.5 text-xs bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 font-semibold cursor-pointer"
                  >
                    {availableMonthsTrx.map(m => (
                      <option key={m.val} value={m.val}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Filter Tahun */}
                <div className="sm:col-span-1 md:col-span-1">
                  <select
                    value={yearTrx}
                    onChange={e => {
                      setYearTrx(e.target.value);
                      setPageTrx(1);
                    }}
                    className="w-full py-2 px-2 text-xs bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="all">Thn</option>
                    {availableYearsTrx.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* 5. Filter Status (Requirement 9: Semua, Draft, Diproses, Selesai, Ditolak, Dibatalkan) */}
                <div className="sm:col-span-1 md:col-span-1">
                  <select
                    value={statusTrx}
                    onChange={e => {
                      setStatusTrx(e.target.value);
                      setPageTrx(1);
                    }}
                    className="w-full py-2 px-2 text-xs bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="all">Status</option>
                    <option value="selesai">Selesai</option>
                    <option value="diproses">Diproses</option>
                    <option value="draft">Draft</option>
                    <option value="ditolak">Ditolak</option>
                    <option value="dibatalkan">Dibatalkan</option>
                  </select>
                </div>

                {/* 6. Filter Unit Pemohon (Requirement 10: Dinamis dari transaksi existing) */}
                <div className="sm:col-span-1 md:col-span-1">
                  <select
                    value={unitPemohonTrx}
                    onChange={e => {
                      setUnitPemohonTrx(e.target.value);
                      setPageTrx(1);
                    }}
                    className="w-full py-2 px-2 text-xs bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 font-semibold cursor-pointer truncate"
                    title={unitPemohonTrx !== 'all' ? unitPemohonTrx : 'Filter Unit Pemohon'}
                  >
                    <option value="all">Unit</option>
                    {availableUnitPemohon.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                {/* 7. Reset Filter Button (Requirement 12) */}
                <div className="sm:col-span-1 md:col-span-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={resetFiltersTrx}
                    disabled={!hasActiveFiltersTrx}
                    title="Reset Semua Filter"
                    className="w-full py-2 px-2 text-xs text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors flex items-center justify-center gap-1 font-semibold cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset</span>
                  </button>
                </div>

              </div>

              {/* Active Filter Indicators Bar */}
              {hasActiveFiltersTrx && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Filter Aktif:</span>
                  {searchTrx && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      Cari: &ldquo;{searchTrx}&rdquo;
                    </span>
                  )}
                  {triwulanTrx !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      {triwulanTrx === 'TW1' ? 'Triwulan I' : triwulanTrx === 'TW2' ? 'Triwulan II' : triwulanTrx === 'TW3' ? 'Triwulan III' : 'Triwulan IV'}
                    </span>
                  )}
                  {monthTrx !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      Bulan {MONTH_NAMES_ALL.find(m => m.val === monthTrx)?.label}
                    </span>
                  )}
                  {yearTrx !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      Tahun {yearTrx}
                    </span>
                  )}
                  {statusTrx !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      Status: {statusTrx}
                    </span>
                  )}
                  {unitPemohonTrx !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      Unit: {unitPemohonTrx}
                    </span>
                  )}
                  <span className="text-slate-400 ml-1">
                    (Menampilkan {filteredTransaksi.length} transaksi)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Filter Bar for Penerimaan */}
          {activeTrxTab === 'penerimaan' && (
            <div className={`space-y-3 pt-1 ${isMobileFilterOpenRcv ? 'block' : 'hidden md:block'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-5 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchRcv}
                    onChange={e => {
                      setSearchRcv(e.target.value);
                      setPageRcv(1);
                    }}
                    placeholder="Cari No. Faktur, Rekanan / Penyedia, Barang..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all placeholder:text-slate-400"
                  />
                  {searchRcv && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchRcv('');
                        setPageRcv(1);
                      }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={sumberDanaRcv}
                    onChange={e => {
                      setSumberDanaRcv(e.target.value);
                      setPageRcv(1);
                    }}
                    className="w-full py-2 px-3 text-xs bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-700 font-semibold cursor-pointer"
                  >
                    <option value="all">Semua Sumber Dana</option>
                    <option value="BOS Reguler">BOS Reguler</option>
                    <option value="BOS Kinerja">BOS Kinerja</option>
                    <option value="BPOPP / APBD">BPOPP / APBD</option>
                    <option value="Komite / Hibah">Komite / Hibah</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <select
                    value={monthRcv}
                    onChange={e => {
                      setMonthRcv(e.target.value);
                      setPageRcv(1);
                    }}
                    className="w-full py-2 px-3 text-xs bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-700 font-semibold cursor-pointer"
                  >
                    {MONTH_NAMES_ALL.map(m => (
                      <option key={m.val} value={m.val}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <select
                    value={yearRcv}
                    onChange={e => {
                      setYearRcv(e.target.value);
                      setPageRcv(1);
                    }}
                    className="w-full py-2 px-2 text-xs bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-700 font-semibold cursor-pointer"
                  >
                    <option value="all">Thn</option>
                    {availableYearsRcv.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={resetFiltersRcv}
                    title="Reset Filter Penerimaan"
                    className="w-full py-2 px-2.5 text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors flex items-center justify-center gap-1 font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="sm:hidden">Reset</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* =========================================================================
            TABEL TRANSAKSI PENYALURAN (Requirement 17, 18, 20, 21, 23)
            ========================================================================= */}
        {activeTrxTab === 'penyaluran' && (
          <div>
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5 w-12 text-center">
                      <button 
                        type="button" 
                        onClick={() => handleSortTrx('nomor')}
                        className="inline-flex items-center gap-1 hover:text-blue-600 cursor-pointer"
                        title="Urutkan berdasarkan Nomor Urut"
                      >
                        <span>No</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </button>
                    </th>
                    <th className="py-3 px-3.5 w-32">
                      <button 
                        type="button" 
                        onClick={() => handleSortTrx('tanggal')}
                        className="inline-flex items-center gap-1 hover:text-blue-600 cursor-pointer"
                        title="Urutkan berdasarkan Tanggal"
                      >
                        <span>Tanggal</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </button>
                    </th>
                    <th className="py-3 px-3.5 w-48">
                      <button 
                        type="button" 
                        onClick={() => handleSortTrx('pemohon')}
                        className="inline-flex items-center gap-1 hover:text-blue-600 cursor-pointer"
                        title="Urutkan berdasarkan Unit Pemohon"
                      >
                        <span>Unit Pemohon &amp; Keperluan</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </button>
                    </th>
                    <th className="py-3 px-3.5 w-44">Nama Pemohon</th>
                    <th className="py-3 px-3.5">Rincian Barang</th>
                    <th className="py-3 px-3.5 w-36 text-right">
                      <button 
                        type="button" 
                        onClick={() => handleSortTrx('nilai')}
                        className="inline-flex items-center gap-1 hover:text-blue-600 cursor-pointer ml-auto"
                        title="Urutkan berdasarkan Total Nilai"
                      >
                        <span>Total Nilai (Rp)</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </button>
                    </th>
                    <th className="py-3 px-3.5 w-28 text-center">
                      <button 
                        type="button" 
                        onClick={() => handleSortTrx('status')}
                        className="inline-flex items-center gap-1 hover:text-blue-600 cursor-pointer mx-auto"
                        title="Urutkan berdasarkan Status"
                      >
                        <span>Status</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </button>
                    </th>
                    <th className="py-3 px-3.5 w-32 text-center bg-slate-100/70 border-l border-slate-200">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedTransaksi.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400">
                        <div className="space-y-2 py-4 max-w-md mx-auto">
                          <FileStack className="w-10 h-10 text-slate-300 mx-auto" />
                          <p className="font-bold text-slate-700 text-sm">
                            {hasActiveFiltersTrx ? 'Data tidak ditemukan' : 'Belum ada transaksi'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {hasActiveFiltersTrx
                              ? 'Tidak ada transaksi penyaluran yang cocok dengan kombinasi filter yang Anda pilih.'
                              : 'Riwayat transaksi penyaluran masih kosong. Mulai dengan membuat pengajuan baru.'}
                          </p>
                          {hasActiveFiltersTrx ? (
                            <button
                              type="button"
                              onClick={resetFiltersTrx}
                              className="mt-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset Filter</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={onOpenNewTransaksi}
                              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-blue-700 shadow-2xs"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Buat Pengajuan Baru</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedTransaksi.map((t, idx) => {
                      const globalIdx = (pageTrx - 1) * pageSizeTrx + idx + 1;
                      const totalJenis = t.items.length;
                      const totalVol = t.items.reduce((acc, it) => acc + (Number(it.usulanJumlah) || 0), 0);
                      const totalNilaiTrx = t.items.reduce(
                        (acc, it) => acc + ((Number(it.usulanJumlah) || 0) * (Number(it.hargaSatuan) || 0)), 
                        0
                      );

                      const pemohon = pemohonMap[t.pemohonId];
                      const namaTampil = pemohon?.nama || (t.pemohonId && !t.pemohonId.startsWith('p-') && !t.pemohonId.startsWith('pej-') ? t.pemohonId : '-') || '-';
                      const jabatanTampil = pemohon?.jabatan;

                      return (
                        <tr 
                          key={t.id} 
                          className="hover:bg-blue-50/40 transition-colors group"
                        >
                          <td className="py-3 px-3.5 text-center text-slate-400 font-semibold">{globalIdx}</td>
                          <td className="py-3 px-3.5 font-medium text-slate-800">
                            <div>{formatTanggalIndonesia(t.tanggal)}</div>
                            <span className="text-[10px] text-slate-400 font-mono">Reg. {t.nomorUrut}</span>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                              {t.unitPemohon}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-1 italic">{t.keperluanUmum}</div>
                          </td>

                          {/* Kolom NAMA PEMOHON */}
                          <td className="py-3 px-3.5">
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-900 leading-tight">{namaTampil}</div>
                              {jabatanTampil && (
                                <div className="text-[10px] text-slate-500 line-clamp-1">{jabatanTampil}</div>
                              )}
                            </div>
                          </td>

                          {/* Rincian Barang (Requirement 19) */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <span className="text-xs font-semibold text-slate-800">
                                {totalJenis} Jenis <span className="text-slate-500 font-normal">({totalVol} unit)</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setViewingDetailItems({
                                  title: `Rincian Barang Disalurkan (${t.unitPemohon})`,
                                  subtitle: `Tanggal: ${formatTanggalIndonesia(t.tanggal)} • Dokumen: ${t.noSPB || t.noBAST} • Reg. #${t.nomorUrut}`,
                                  type: 'penyaluran',
                                  items: t.items.map(it => ({
                                    namaBarang: it.namaBarang,
                                    kodeBarang: it.kodeBarang,
                                    kodeRekening: it.kodeRekening,
                                    namaRekening: it.namaRekening,
                                    nusp: it.nusp,
                                    satuan: it.satuan,
                                    jumlah: it.usulanJumlah,
                                    hargaSatuan: it.hargaSatuan,
                                    subtotal: (Number(it.usulanJumlah) || 0) * (it.hargaSatuan || 0),
                                    keperluan: it.keperluan || t.keperluanUmum
                                  }))
                                })}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 transition-colors cursor-pointer"
                                title="Buka Detail Rincian Barang"
                              >
                                <Eye className="w-3 h-3 text-blue-600" />
                                Lihat Item...
                              </button>
                            </div>
                          </td>

                          {/* TOTAL NILAI (RP) */}
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                            {formatRupiah(totalNilaiTrx)}
                          </td>

                          {/* STATUS (Requirement 22) */}
                          <td className="py-3 px-3.5 text-center">
                            {renderStatusBadge(t.status as string)}
                          </td>

                          {/* AKSI: EDIT, CETAK, HAPUS (Requirement 20 & 21) */}
                          <td className="py-3 px-3.5 text-center bg-slate-50/50 border-l border-slate-200">
                            <div className="flex items-center justify-center gap-1.5">
                              
                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => onEditTransaksi(t)}
                                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-blue-700 hover:bg-blue-50 bg-white border border-slate-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                                title="Edit / Koreksi Data Transaksi"
                                aria-label="Edit Transaksi"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              {/* Cetak */}
                              <button
                                type="button"
                                onClick={() => onSelectTransaksiForPrint(t.id)}
                                className="w-8 h-8 flex items-center justify-center text-blue-700 hover:text-white hover:bg-blue-600 bg-blue-50 border border-blue-200 rounded-lg shadow-2xs transition-all cursor-pointer"
                                title="Cetak Berkas Bundel Dokumen Resmi (NPB, SPB, SPPB, BAST)"
                                aria-label="Cetak Dokumen Transaksi"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Hapus dengan konfirmasi modal */}
                              <button
                                type="button"
                                onClick={() => onDeleteTransaksi(t)}
                                disabled={!isAdmin}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg border shadow-2xs transition-all cursor-pointer ${
                                  isAdmin 
                                    ? 'text-rose-600 hover:text-white hover:bg-rose-600 bg-white border-rose-200' 
                                    : 'text-slate-300 bg-slate-100 border-slate-200 cursor-not-allowed opacity-60'
                                }`}
                                title={isAdmin ? `Hapus Transaksi Reg #${t.nomorUrut} & Reversi Stok Gudang` : "Akses Dibatasi: Hanya Administrator"}
                                aria-label="Hapus Transaksi"
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

            {/* Mobile Responsive View */}
            <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {pagedTransaksi.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <FileStack className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-xs">
                    {hasActiveFiltersTrx ? 'Data tidak ditemukan' : 'Belum ada transaksi'}
                  </p>
                </div>
              ) : (
                pagedTransaksi.map((t, idx) => {
                  const globalIdx = (pageTrx - 1) * pageSizeTrx + idx + 1;
                  const totalJenis = t.items.length;
                  const totalVol = t.items.reduce((acc, it) => acc + (Number(it.usulanJumlah) || 0), 0);
                  const totalNilaiTrx = t.items.reduce(
                    (acc, it) => acc + ((Number(it.usulanJumlah) || 0) * (Number(it.hargaSatuan) || 0)), 
                    0
                  );
                  const pemohon = pemohonMap[t.pemohonId];
                  const namaTampil = pemohon?.nama || (t.pemohonId && !t.pemohonId.startsWith('p-') && !t.pemohonId.startsWith('pej-') ? t.pemohonId : '-') || '-';

                  return (
                    <div 
                      key={t.id} 
                      className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center">
                            {globalIdx}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-800">Reg. #{t.nomorUrut}</span>
                            <span className="text-[10px] text-slate-400 ml-1.5">• {formatTanggalIndonesia(t.tanggal)}</span>
                          </div>
                        </div>
                        {renderStatusBadge(t.status as string)}
                      </div>

                      <div>
                        <div className="text-xs font-bold text-slate-900">{t.unitPemohon}</div>
                        <div className="text-[11px] text-slate-500 italic mt-0.5">{t.keperluanUmum}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">Pemohon:</div>
                          <div className="font-semibold text-slate-800 truncate">{namaTampil}</div>
                          <div className="text-[10px] text-slate-500 truncate">{pemohon?.jabatan || '-'}</div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">Rincian Barang:</div>
                          <div className="font-semibold text-slate-800">{totalJenis} Jenis ({totalVol} item)</div>
                          <button
                            type="button"
                            onClick={() => setViewingDetailItems({
                              title: `Rincian Barang Disalurkan (${t.unitPemohon})`,
                              subtitle: `Tanggal: ${formatTanggalIndonesia(t.tanggal)} • Dokumen: ${t.noSPB || t.noBAST} • Reg. #${t.nomorUrut}`,
                              type: 'penyaluran',
                              items: t.items.map(it => ({
                                namaBarang: it.namaBarang,
                                kodeBarang: it.kodeBarang,
                                kodeRekening: it.kodeRekening,
                                namaRekening: it.namaRekening,
                                nusp: it.nusp,
                                satuan: it.satuan,
                                jumlah: it.usulanJumlah,
                                hargaSatuan: it.hargaSatuan,
                                subtotal: (Number(it.usulanJumlah) || 0) * (it.hargaSatuan || 0),
                                keperluan: it.keperluan || t.keperluanUmum
                              }))
                            })}
                            className="text-[10px] font-semibold text-blue-600 hover:underline mt-0.5 inline-block cursor-pointer"
                          >
                            Lihat item lengkap &rarr;
                          </button>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500">Total Nilai Penyaluran:</span>
                        <span className="text-xs font-bold font-mono text-slate-900">
                          {formatRupiah(totalNilaiTrx)}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => onEditTransaksi(t)}
                          className="h-10 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-500" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectTransaksiForPrint(t.id)}
                          className="h-10 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteTransaksi(t)}
                          disabled={!isAdmin}
                          className={`h-10 flex items-center justify-center gap-1.5 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                            isAdmin 
                              ? 'bg-white border-rose-200 text-rose-600 hover:bg-rose-50' 
                              : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls (Requirement 18: 10, 25, 50, 100) */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              
              <div className="flex items-center gap-3 text-slate-500">
                <span>
                  Menampilkan {filteredTransaksi.length === 0 ? 0 : (pageTrx - 1) * pageSizeTrx + 1}–{Math.min(pageTrx * pageSizeTrx, filteredTransaksi.length)} dari {filteredTransaksi.length} transaksi
                </span>
                <span className="text-slate-300">&bull;</span>
                <div className="flex items-center gap-1.5">
                  <span>Data per halaman:</span>
                  <select
                    value={pageSizeTrx}
                    onChange={e => {
                      setPageSizeTrx(Number(e.target.value));
                      setPageTrx(1);
                    }}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPageTrx(1)}
                  disabled={pageTrx === 1}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Halaman Pertama"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPageTrx(p => Math.max(1, p - 1))}
                  disabled={pageTrx === 1}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 font-mono">
                  {pageTrx} / {totalPagesTrx}
                </span>

                <button
                  type="button"
                  onClick={() => setPageTrx(p => Math.min(totalPagesTrx, p + 1))}
                  disabled={pageTrx === totalPagesTrx || filteredTransaksi.length === 0}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPageTrx(totalPagesTrx)}
                  disabled={pageTrx === totalPagesTrx || filteredTransaksi.length === 0}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Halaman Terakhir"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>
        )}

        {/* =========================================================================
            VIEW 2: TABEL PENERIMAAN BELANJA BOS
            ========================================================================= */}
        {activeTrxTab === 'penerimaan' && (
          <div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5 w-12 text-center">No</th>
                    <th className="py-3 px-3.5 w-32">Tanggal</th>
                    <th className="py-3 px-3.5 w-40">No. Bukti / Faktur</th>
                    <th className="py-3 px-3.5 w-32">Sumber Dana</th>
                    <th className="py-3 px-3.5">Penyedia &amp; Rincian Barang</th>
                    <th className="py-3 px-3.5 w-36 text-right">Total Nilai (Rp)</th>
                    <th className="py-3 px-3.5 w-32 text-center bg-slate-100/70 border-l border-slate-200">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedPenerimaan.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        <div className="space-y-2 py-4">
                          <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
                          <p className="font-bold text-slate-700 text-sm">Tidak ada riwayat penerimaan belanja BOS.</p>
                          <p className="text-xs text-slate-500">
                            {searchRcv || sumberDanaRcv !== 'all' || monthRcv !== 'all' || yearRcv !== 'all'
                              ? 'Tidak ada data yang cocok dengan kriteria pencarian/filter Anda.'
                              : 'Riwayat penerimaan masih kosong. Klik "+ Catat Penerimaan BOS" untuk mencatat faktur belanja.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedPenerimaan.map((p, idx) => {
                      const globalIdx = (pageRcv - 1) * pageSizeRcv + idx + 1;
                      const totalRcvJenis = p.items.length;
                      const totalRcvVol = p.items.reduce((acc, it) => acc + (Number(it.jumlahMasuk) || 0), 0);

                      return (
                        <tr key={p.id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="py-3 px-3.5 text-center text-slate-400 font-semibold">{globalIdx}</td>
                          <td className="py-3 px-3.5 text-slate-800 font-medium">
                            {formatTanggalIndonesia(p.tanggal)}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-slate-800 font-semibold">
                            {p.noBukti}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold text-[10px]">
                              {p.sumberDana}
                            </span>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-slate-900">{p.penyedia}</div>
                            {p.keterangan && (
                              <div className="text-[11px] text-slate-500 line-clamp-1 italic">{p.keterangan}</div>
                            )}
                            <div className="flex items-center gap-2 whitespace-nowrap mt-1">
                              <span className="text-xs font-semibold text-slate-800">
                                {totalRcvJenis} Jenis <span className="text-slate-500 font-normal">({totalRcvVol} item)</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setViewingDetailItems({
                                  title: `Rincian Penerimaan Barang (${p.penyedia})`,
                                  subtitle: `No. Bukti: ${p.noBukti} • Tanggal: ${formatTanggalIndonesia(p.tanggal)} • Sumber: ${p.sumberDana}`,
                                  type: 'penerimaan',
                                  items: p.items.map(it => ({
                                    namaBarang: it.namaBarang,
                                    kodeBarang: it.kodeBarang,
                                    kodeRekening: it.kodeRekening,
                                    namaRekening: it.namaRekening,
                                    nusp: it.nusp,
                                    satuan: it.satuan,
                                    jumlah: it.jumlahMasuk,
                                    hargaSatuan: it.hargaSatuan,
                                    subtotal: it.subtotal || ((Number(it.jumlahMasuk) || 0) * (it.hargaSatuan || 0))
                                  }))
                                })}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors cursor-pointer"
                                title="Klik untuk melihat rincian barang yang diterima"
                              >
                                <Eye className="w-3 h-3 text-emerald-600" />
                                Lihat Item...
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-700 text-xs whitespace-nowrap">
                            {formatRupiah(p.totalNilai)}
                          </td>

                          {/* AKSI */}
                          <td className="py-3 px-3.5 text-center bg-slate-50/50 border-l border-slate-200">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onEditPenerimaan(p)}
                                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 bg-white border border-slate-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                                title="Edit Faktur Penerimaan"
                                aria-label="Edit Faktur"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => onSelectPenerimaanForPrint && onSelectPenerimaanForPrint(p)}
                                className="w-8 h-8 flex items-center justify-center text-emerald-700 hover:text-white hover:bg-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg shadow-2xs transition-all cursor-pointer"
                                title="Pratinjau &amp; Cetak Bukti Penerimaan Rekap BOS"
                                aria-label="Cetak Bukti Penerimaan"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => onDeletePenerimaan(p)}
                                disabled={!isAdmin}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg border shadow-2xs transition-all cursor-pointer ${
                                  isAdmin 
                                    ? 'text-rose-600 hover:text-white hover:bg-rose-600 bg-white border-rose-200' 
                                    : 'text-slate-300 bg-slate-100 border-slate-200 cursor-not-allowed opacity-60'
                                }`}
                                title={isAdmin ? "Hapus Faktur & Kurangi Saldo Stok Gudang" : "Akses Dibatasi: Hanya Administrator"}
                                aria-label="Hapus Faktur"
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

            {/* Mobile View for Penerimaan */}
            <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {pagedPenerimaan.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-xs">Tidak ada riwayat penerimaan belanja BOS.</p>
                </div>
              ) : (
                pagedPenerimaan.map((p, idx) => {
                  const globalIdx = (pageRcv - 1) * pageSizeRcv + idx + 1;
                  const totalRcvJenis = p.items.length;
                  const totalRcvVol = p.items.reduce((acc, it) => acc + (Number(it.jumlahMasuk) || 0), 0);

                  return (
                    <div 
                      key={p.id} 
                      className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center">
                            {globalIdx}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-800 font-mono">{p.noBukti}</span>
                            <span className="text-[10px] text-slate-400 ml-1.5">• {formatTanggalIndonesia(p.tanggal)}</span>
                          </div>
                        </div>
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                          {p.sumberDana}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-slate-900">{p.penyedia}</div>
                        {p.keterangan && <div className="text-[11px] text-slate-500 italic mt-0.5">{p.keterangan}</div>}
                      </div>

                      <div className="text-xs pt-1 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-800">{totalRcvJenis} Jenis ({totalRcvVol} item)</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-700">{formatRupiah(p.totalNilai)}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => onEditPenerimaan(p)}
                          className="h-10 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-500" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectPenerimaanForPrint && onSelectPenerimaanForPrint(p)}
                          className="h-10 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeletePenerimaan(p)}
                          disabled={!isAdmin}
                          className={`h-10 flex items-center justify-center gap-1.5 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                            isAdmin 
                              ? 'bg-white border-rose-200 text-rose-600 hover:bg-rose-50' 
                              : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 text-slate-500">
                <span>
                  Menampilkan {filteredPenerimaan.length === 0 ? 0 : (pageRcv - 1) * pageSizeRcv + 1}–{Math.min(pageRcv * pageSizeRcv, filteredPenerimaan.length)} dari {filteredPenerimaan.length} data
                </span>
                <span className="text-slate-300">&bull;</span>
                <div className="flex items-center gap-1.5">
                  <span>Baris per halaman:</span>
                  <select
                    value={pageSizeRcv}
                    onChange={e => {
                      setPageSizeRcv(Number(e.target.value));
                      setPageRcv(1);
                    }}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPageRcv(1)}
                  disabled={pageRcv === 1}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Halaman Pertama"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPageRcv(p => Math.max(1, p - 1))}
                  disabled={pageRcv === 1}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 font-mono">
                  {pageRcv} / {totalPagesRcv}
                </span>

                <button
                  type="button"
                  onClick={() => setPageRcv(p => Math.min(totalPagesRcv, p + 1))}
                  disabled={pageRcv === totalPagesRcv || filteredPenerimaan.length === 0}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPageRcv(totalPagesRcv)}
                  disabled={pageRcv === totalPagesRcv || filteredPenerimaan.length === 0}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Halaman Terakhir"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* =========================================================================
          MODAL 1: RINCIAN DETAIL BARANG (Requirement 19)
          ========================================================================= */}
      {viewingDetailItems && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 truncate">
                  <Boxes className={`w-4 h-4 shrink-0 ${viewingDetailItems.type === 'penyaluran' ? 'text-blue-600' : 'text-emerald-600'}`} />
                  <span className="truncate">{viewingDetailItems.title}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{viewingDetailItems.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingDetailItems(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Tutup (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-10">No</th>
                      <th className="py-2.5 px-3">Nama &amp; Kode Barang</th>
                      <th className="py-2.5 px-3">Kode Rekening</th>
                      <th className="py-2.5 px-3 text-center w-24">Jumlah</th>
                      <th className="py-2.5 px-3 text-right w-28">Harga</th>
                      <th className="py-2.5 px-3 text-right w-32">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingDetailItems.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900">{it.namaBarang}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {it.kodeBarang ? `Kode: ${it.kodeBarang}` : ''} {it.nusp ? `• NUSP: ${it.nusp}` : ''}
                          </div>
                          {it.keperluan && (
                            <div className="text-[10px] text-blue-600 italic mt-0.5">Keperluan: {it.keperluan}</div>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 border border-slate-200">
                            {it.kodeRekening || '5.1.02.01.01.0024'}
                          </span>
                          {it.namaRekening && (
                            <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{it.namaRekening}</div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800">
                          {it.jumlah} {it.satuan}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {it.hargaSatuan ? formatRupiah(it.hargaSatuan) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {it.subtotal ? formatRupiah(it.subtotal) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Total: <strong className="text-slate-900">{viewingDetailItems.items.length} jenis</strong> &bull;{' '}
                <strong className="text-slate-900">
                  {viewingDetailItems.items.reduce((s, it) => s + it.jumlah, 0)} item
                </strong>
                {viewingDetailItems.items.some(it => it.subtotal) && (
                  <>
                    {' '}&bull;{' '}
                    <strong className="text-emerald-700 font-mono">
                      {formatRupiah(viewingDetailItems.items.reduce((s, it) => s + (it.subtotal || 0), 0))}
                    </strong>
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => setViewingDetailItems(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: DETAIL PERINGATAN GUDANG (Requirement 6)
          ========================================================================= */}
      {isWarningDetailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            
            <div className="px-5 py-4 border-b border-amber-200 flex items-center justify-between bg-amber-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl border border-amber-200">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Peringatan Stok Gudang Kritis ({stokWarningList.length} Item)
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Daftar barang persediaan yang habis (&le; 0 unit) atau hampir habis (&le; 10 unit) per audit real-time
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWarningDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-10">No</th>
                      <th className="py-2.5 px-3">Nama &amp; Kode Barang</th>
                      <th className="py-2.5 px-3">Kategori Rekening</th>
                      <th className="py-2.5 px-3 text-center w-24">Sisa Stok</th>
                      <th className="py-2.5 px-3 text-right w-28">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-center w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stokWarningList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Seluruh item gudang dalam kondisi aman.
                        </td>
                      </tr>
                    ) : (
                      stokWarningList.map((b, idx) => {
                        const isHabis = b.stokHitung <= 0;
                        return (
                          <tr key={b.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900">{b.namaBarang}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Kode: {b.kodeBarang} • NUSP: {b.nusp}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-[11px] text-slate-600 line-clamp-1">{b.namaRekening || b.kategori}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              <span className={isHabis ? 'text-rose-600' : 'text-amber-600'}>
                                {b.stokHitung} {b.satuan}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              {formatRupiah(b.hargaSatuan)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isHabis ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  Habis
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Hampir Habis
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Peringatan: <strong>{stokHabisList.length} item habis</strong> dan{' '}
                <strong>{stokHampirHabisList.length} item hampir habis</strong>. Disarankan melakukan pengadaan Belanja BOS.
              </span>
              <button
                type="button"
                onClick={() => setIsWarningDetailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: EXPORT PDF LAPORAN RESMI (Requirement 15)
          ========================================================================= */}
      {isPdfExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header Dialog */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-xl border border-rose-200">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Cetak / Simpan PDF Laporan Penyaluran Barang
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Laporan resmi hasil filter aktif ({filteredTransaksi.length} berkas transaksi) sesuai format baku instansi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPdfExportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Document Preview Area */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100/70 font-serif">
              <div className="bg-white p-8 rounded-xl shadow-xs border border-slate-200 text-slate-900 text-xs space-y-4 max-w-3xl mx-auto">
                
                {/* Kop Surat Sekolah Resmi */}
                <div className="border-b-2 border-slate-900 pb-3 text-center space-y-0.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    {kopConfig?.pemerintahDaerah || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT'}
                  </h4>
                  <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-900">
                    {kopConfig?.dinasPendidikan || 'DINAS PENDIDIKAN'}
                  </h3>
                  <h2 className="font-extrabold text-base uppercase text-slate-950">
                    {schoolName || kopConfig?.namaSekolah || 'SMAN 1 CIHAURBEUTI'}
                  </h2>
                  <p className="text-[10px] text-slate-600 font-sans">
                    {kopConfig?.alamatLengkap || 'Jl. Kartawijaya No. 600, Cihaurbeuti'} • NPSN: {kopConfig?.npsn || '20211512'}
                  </p>
                </div>

                {/* Judul Laporan & Periode */}
                <div className="text-center pt-2 pb-1 space-y-1">
                  <h3 className="font-bold text-sm uppercase tracking-wide underline underline-offset-4">
                    REKAPITULASI PENYALURAN BARANG PERSEDIAAN
                  </h3>
                  <p className="text-xs font-sans text-slate-600">
                    Periode: <strong className="text-slate-900">{currentPeriodeText}</strong>
                  </p>
                </div>

                {/* Tabel Hasil Filter */}
                <div className="border border-slate-900 overflow-hidden">
                  <table className="w-full text-[11px] text-left border-collapse font-sans">
                    <thead className="bg-slate-100 font-bold border-b border-slate-900 text-slate-900 uppercase text-[10px]">
                      <tr>
                        <th className="p-2 w-8 text-center border-r border-slate-900">No</th>
                        <th className="p-2 w-24 border-r border-slate-900">Tanggal</th>
                        <th className="p-2 w-32 border-r border-slate-900">No. Dokumen</th>
                        <th className="p-2 border-r border-slate-900">Unit &amp; Pemohon</th>
                        <th className="p-2 border-r border-slate-900">Rincian Barang</th>
                        <th className="p-2 w-28 text-right">Nilai (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {filteredTransaksi.map((t, idx) => {
                        const totalNilai = t.items.reduce((s, it) => s + ((Number(it.usulanJumlah) || 0) * (Number(it.hargaSatuan) || 0)), 0);
                        const pemohon = pemohonMap[t.pemohonId];
                        const namaP = pemohon?.nama || (t.pemohonId && !t.pemohonId.startsWith('p-') ? t.pemohonId : '-') || '-';
                        return (
                          <tr key={t.id}>
                            <td className="p-2 text-center border-r border-slate-900">{idx + 1}</td>
                            <td className="p-2 border-r border-slate-900">{formatTanggalIndonesia(t.tanggal)}</td>
                            <td className="p-2 font-mono border-r border-slate-900 text-[10px]">
                              {t.noSPB || t.noBAST || `Reg #${t.nomorUrut}`}
                            </td>
                            <td className="p-2 border-r border-slate-900">
                              <div className="font-bold">{t.unitPemohon}</div>
                              <div className="text-[10px] text-slate-500">{namaP}</div>
                            </td>
                            <td className="p-2 border-r border-slate-900 text-[10px]">
                              {t.items.map(it => `${it.namaBarang} (${it.usulanJumlah} ${it.satuan})`).join(', ')}
                            </td>
                            <td className="p-2 text-right font-mono font-bold">
                              {formatRupiah(totalNilai)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-900">
                        <td colSpan={5} className="p-2 text-right uppercase border-r border-slate-900">
                          Total Nilai Penyaluran ({filteredTransaksi.length} berkas):
                        </td>
                        <td className="p-2 text-right font-mono text-xs">
                          {formatRupiah(filteredTransaksi.reduce((acc, t) => acc + t.items.reduce((s, it) => s + ((Number(it.usulanJumlah) || 0) * (Number(it.hargaSatuan) || 0)), 0), 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tanda Tangan Pejabat Pengesah */}
                <div className="pt-8 flex justify-between font-sans text-xs">
                  <div className="text-center space-y-12">
                    <p>Mengetahui,<br />Kepala Sekolah</p>
                    <p className="font-bold underline uppercase">
                      {kopConfig?.namaSekolah ? 'Kepala Satuan Pendidikan' : 'Dra. Hj. Imas Rohayati, M.Pd.'}
                    </p>
                  </div>
                  <div className="text-center space-y-12">
                    <p>{kopConfig?.kotaSurat || 'Ciamis'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />Pengurus Barang Pengguna</p>
                    <p className="font-bold underline uppercase">
                      {currentUser?.nama || 'Dedi Kurniawan, S.Pd.'}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer Dialog Action */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-sans">
                Dokumen siap dicetak ke format printer ISO A4 atau disimpan ke PDF.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPdfExportModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerPrint({
                      documentType: 'REKAP_PENYALURAN',
                      namaSekolah: schoolName
                    });
                  }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Simpan PDF</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
