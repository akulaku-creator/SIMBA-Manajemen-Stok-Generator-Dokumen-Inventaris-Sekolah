import { 
  AlertTriangle, 
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight, 
  Boxes, 
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock, 
  Eye,
  FileSpreadsheet, 
  FileStack, 
  FileText, 
  Filter,
  Layers, 
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
import { AppUser, Barang, Pejabat, TransaksiPenerimaan, TransaksiPengeluaran } from '../types';
import { formatRupiah, formatTanggalIndonesia } from '../utils/numberGenerator';

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
}

const MONTH_NAMES = [
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
  onSelectPenerimaanForPrint
}) => {
  const isAdmin = currentUser.role === 'admin';

  // Active view tab in transaction section: 'penyaluran' or 'penerimaan'
  const [activeTrxTab, setActiveTrxTab] = useState<'penyaluran' | 'penerimaan'>('penyaluran');

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

  // Stat calculations
  const totalBarangCount = barangList.length;

  // 1. Akumulasi Total Nilai Penyaluran (Rp)
  const totalNilaiPenyaluran = useMemo(() => {
    return transaksiList.reduce((acc, t) => {
      return acc + t.items.reduce((sub, it) => {
        const qty = Number(it.usulanJumlah) || 0;
        const price = Number(it.hargaSatuan) || 0;
        return sub + (qty * price);
      }, 0);
    }, 0);
  }, [transaksiList]);

  // 2. Akumulasi Total Sisa Stok Gudang (Rp) Real-Time
  const totalNilaiSisaStok = useMemo(() => {
    return barangList.reduce((acc, b) => {
      const stok = Number(b.stokSekarang) || 0;
      const price = Number(b.hargaSatuan) || 0;
      return acc + (stok * price);
    }, 0);
  }, [barangList]);

  // 3. Logika Peringatan Gudang: Hanya menghitung barang dengan stok riil <= threshold batas aman (10 unit)
  const SAFE_STOCK_THRESHOLD = 10;
  const stokMenipis = useMemo(() => {
    return barangList.filter(b => typeof b.stokSekarang === 'number' && b.stokSekarang <= SAFE_STOCK_THRESHOLD);
  }, [barangList]);
  const stokHabisCount = useMemo(() => {
    return barangList.filter(b => typeof b.stokSekarang === 'number' && b.stokSekarang <= 0).length;
  }, [barangList]);

  const totalNilaiBelanjaBOS = useMemo(() => {
    return penerimaanList.reduce((acc, p) => acc + (p.totalNilai || 0), 0);
  }, [penerimaanList]);

  const totalItemDisalurkan = useMemo(() => {
    return transaksiList.reduce(
      (acc, t) => acc + t.items.reduce((sub, it) => sub + (Number(it.usulanJumlah) || 0), 0),
      0
    );
  }, [transaksiList]);

  // ==========================================
  // TABLE 1: TRANSAKSI PENYALURAN (Filter & Page)
  // ==========================================
  const [searchTrx, setSearchTrx] = useState('');
  const [monthTrx, setMonthTrx] = useState('all');
  const [yearTrx, setYearTrx] = useState('all');
  const [pageTrx, setPageTrx] = useState(1);
  const [pageSizeTrx, setPageSizeTrx] = useState(10);
  const [sortFieldTrx, setSortFieldTrx] = useState<'nomor' | 'tanggal' | 'nilai' | 'pemohon'>('nomor');
  const [sortOrderTrx, setSortOrderTrx] = useState<'asc' | 'desc'>('desc');
  const [isMobileFilterOpenTrx, setIsMobileFilterOpenTrx] = useState(false);

  // Popover / Modal Item Detail State
  const [viewingDetailItems, setViewingDetailItems] = useState<{
    title: string;
    subtitle: string;
    type: 'penyaluran' | 'penerimaan';
    items: Array<{
      namaBarang: string;
      kodeBarang?: string;
      nusp?: string;
      satuan: string;
      jumlah: number;
      hargaSatuan?: number;
      subtotal?: number;
      keperluan?: string;
    }>;
  } | null>(null);

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

  // Filtering Penyaluran
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

      // 2. Month filter
      if (monthTrx !== 'all' && t.tanggal) {
        const m = (new Date(t.tanggal).getMonth() + 1).toString();
        if (m !== monthTrx) return false;
      }

      // 3. Year filter
      if (yearTrx !== 'all' && t.tanggal) {
        const y = new Date(t.tanggal).getFullYear().toString();
        if (y !== yearTrx) return false;
      }

      return true;
    });
  }, [transaksiList, searchTrx, monthTrx, yearTrx, pemohonMap]);

  // Sorting Penyaluran
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
      }
      return sortOrderTrx === 'asc' ? comp : -comp;
    });
  }, [filteredTransaksi, sortFieldTrx, sortOrderTrx]);

  // Pagination Penyaluran
  const totalPagesTrx = Math.max(1, Math.ceil(sortedTransaksi.length / pageSizeTrx));
  const pagedTransaksi = useMemo(() => {
    const start = (pageTrx - 1) * pageSizeTrx;
    return sortedTransaksi.slice(start, start + pageSizeTrx);
  }, [sortedTransaksi, pageTrx, pageSizeTrx]);

  const handleSortTrx = (field: 'nomor' | 'tanggal' | 'nilai' | 'pemohon') => {
    if (sortFieldTrx === field) {
      setSortOrderTrx(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortFieldTrx(field);
      setSortOrderTrx('desc');
    }
  };

  const resetFiltersTrx = () => {
    setSearchTrx('');
    setMonthTrx('all');
    setYearTrx('all');
    setPageTrx(1);
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
        const matchKeterangan = (p.keterangan || '').toLowerCase().includes(q);
        const matchItem = p.items.some(it => 
          (it.namaBarang || '').toLowerCase().includes(q) ||
          (it.kodeBarang || '').toLowerCase().includes(q)
        );
        if (!matchBukti && !matchPenyedia && !matchKeterangan && !matchItem) {
          return false;
        }
      }

      if (sumberDanaRcv !== 'all' && p.sumberDana !== sumberDanaRcv) {
        return false;
      }

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

  return (
    <div className="space-y-6">

      {/* =========================================================================
          1. DASHBOARD HEADER / HERO SECTION
          ========================================================================= */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          <div className="space-y-2.5 max-w-3xl">
            {/* Government Standard Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Standar Format Baku Instansi Pemerintah (A4/F4)</span>
            </div>

            {/* Main Title */}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug">
              Sistem Manajemen Stok &amp; Generator Dokumen Inventaris Sekolah
            </h1>

            {/* Description */}
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Satu alur input otomatis menciptakan berkas legalitas berantai:{' '}
              <span className="font-semibold text-blue-700">NPB &rarr; SPB &rarr; SPPB &rarr; BAST</span>,{' '}
              dan pembukuan rekapitulasi realisasi dana BOS persis sesuai standar audit dinas pendidikan.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenNewPenerimaan}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            >
              <PackagePlus className="w-4 h-4 text-emerald-600" />
              <span>Catat Penerimaan (BOS)</span>
            </button>

            <button
              type="button"
              onClick={onOpenNewTransaksi}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Buat Pengajuan Baru</span>
            </button>
          </div>

        </div>
      </section>

      {/* =========================================================================
          2. SUMMARY CARDS (4 MAIN CARDS)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Sisa Stok Gudang */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-blue-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Sisa Stok Gudang
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
              <Warehouse className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {formatRupiah(totalNilaiSisaStok)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Akumulasi nilai real-time {totalBarangCount} ragam barang
            </p>
          </div>
        </div>

        {/* Card 2: Total Nilai Penyaluran */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-blue-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Nilai Penyaluran
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {formatRupiah(totalNilaiPenyaluran)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {transaksiList.length} berkas ({totalItemDisalurkan.toLocaleString('id-ID')} unit barang keluar)
            </p>
          </div>
        </div>

        {/* Card 3: Penerimaan Belanja BOS */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-emerald-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Penerimaan Belanja BOS
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-700 font-mono">
              {formatRupiah(totalNilaiBelanjaBOS)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {penerimaanList.length} faktur pengadaan belanja BOS / APBD
            </p>
          </div>
        </div>

        {/* Card 4: Peringatan Gudang */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-amber-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Peringatan Gudang
            </span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-105 ${
              stokMenipis.length > 0 
                ? 'bg-amber-50 text-amber-600 border-amber-200' 
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-xl sm:text-2xl font-bold tracking-tight ${
              stokMenipis.length > 0 ? 'text-amber-600' : 'text-emerald-700'
            }`}>
              {stokMenipis.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">item &lt; 10 unit</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate">
            {stokMenipis.length > 0 
              ? `${stokHabisCount > 0 ? `${stokHabisCount} unit habis • ` : ''}Perlu pengadaan belanja BOS` 
              : 'Stok fisik seluruh item aman (&gt; 10 unit)'}
          </p>
        </div>

      </div>

      {/* =========================================================================
          3. TRANSACTION SECTION WITH INTEGRATED TAB SWITCHER
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        
        {/* Section Top Header */}
        <div className="p-5 border-b border-slate-200/80 bg-slate-50/50 space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileStack className="w-5 h-5 text-blue-600 shrink-0" />
                <span>
                  {activeTrxTab === 'penyaluran' 
                    ? 'Daftar Transaksi Penyaluran Barang & Rantai Dokumen Cetak'
                    : 'Riwayat Penerimaan Pengadaan Barang Persediaan (Dana BOS / APBD)'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {activeTrxTab === 'penyaluran'
                  ? 'Kelola berkas, koreksi selisih usulan, dan cetak bundel dokumen (NPB, SPB, SPPB, BAST).'
                  : 'Mencatat faktur belanja barang masuk, penambahan stok fisik gudang, dan sinkronisasi buku rekapitulasi BOS.'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-600 font-semibold bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                Total:{' '}
                <strong className="text-slate-900 font-bold">
                  {activeTrxTab === 'penyaluran' ? filteredTransaksi.length : filteredPenerimaan.length}
                </strong>{' '}
                transaksi
              </span>

              {activeTrxTab === 'penyaluran' ? (
                <button
                  type="button"
                  onClick={onOpenNewTransaksi}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-xl shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Buat Pengajuan</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenNewPenerimaan}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Tambah Penerimaan</span>
                </button>
              )}
            </div>
          </div>

          {/* Segmented View Switcher: Penyaluran vs Penerimaan */}
          <div className="flex items-center justify-between border-t border-slate-200/80 pt-3">
            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTrxTab('penyaluran')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTrxTab === 'penyaluran'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
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
                    ? 'bg-white text-emerald-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Penerimaan Belanja BOS ({penerimaanList.length})
              </button>
            </div>

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
              className="md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Filter</span>
            </button>
          </div>

          {/* Search & Filter Bar for PENYALURAN */}
          {activeTrxTab === 'penyaluran' && (
            <div className={`space-y-3 pt-1 ${isMobileFilterOpenTrx ? 'block' : 'hidden md:block'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                
                {/* Search Input */}
                <div className="sm:col-span-6 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTrx}
                    onChange={e => {
                      setSearchTrx(e.target.value);
                      setPageTrx(1);
                    }}
                    placeholder="Cari No. Dokumen (SPB/BAST), Unit Pemohon, Keperluan, atau Nama Barang..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
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

                {/* Filter Bulan */}
                <div className="sm:col-span-3">
                  <select
                    value={monthTrx}
                    onChange={e => {
                      setMonthTrx(e.target.value);
                      setPageTrx(1);
                    }}
                    className="w-full py-2 px-3 text-xs bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-700 font-semibold cursor-pointer"
                  >
                    {MONTH_NAMES.map(m => (
                      <option key={m.val} value={m.val}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Tahun */}
                <div className="sm:col-span-2">
                  <select
                    value={yearTrx}
                    onChange={e => {
                      setYearTrx(e.target.value);
                      setPageTrx(1);
                    }}
                    className="w-full py-2 px-3 text-xs bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-700 font-semibold cursor-pointer"
                  >
                    <option value="all">Semua Tahun</option>
                    {availableYearsTrx.map(y => (
                      <option key={y} value={y}>Tahun {y}</option>
                    ))}
                  </select>
                </div>

                {/* Reset Filter Button */}
                <div className="sm:col-span-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={resetFiltersTrx}
                    title="Reset Pencarian &amp; Filter"
                    className="w-full py-2 px-2.5 text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors flex items-center justify-center gap-1 font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="sm:hidden">Reset</span>
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Search & Filter Bar for PENERIMAAN */}
          {activeTrxTab === 'penerimaan' && (
            <div className={`space-y-3 pt-1 ${isMobileFilterOpenRcv ? 'block' : 'hidden md:block'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                
                {/* Search Input */}
                <div className="sm:col-span-5 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchRcv}
                    onChange={e => {
                      setSearchRcv(e.target.value);
                      setPageRcv(1);
                    }}
                    placeholder="Cari No. Faktur, Penyedia / Rekanan, Keterangan, atau Barang..."
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

                {/* Filter Sumber Dana */}
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

                {/* Filter Bulan */}
                <div className="sm:col-span-2">
                  <select
                    value={monthRcv}
                    onChange={e => {
                      setMonthRcv(e.target.value);
                      setPageRcv(1);
                    }}
                    className="w-full py-2 px-3 text-xs bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-700 font-semibold cursor-pointer"
                  >
                    {MONTH_NAMES.map(m => (
                      <option key={m.val} value={m.val}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Tahun */}
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

                {/* Reset Filter Button */}
                <div className="sm:col-span-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={resetFiltersRcv}
                    title="Reset Pencarian &amp; Filter"
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
            VIEW 1: TABEL TRANSAKSI PENYALURAN (DESKTOP) & CARD VIEW (MOBILE)
            ========================================================================= */}
        {activeTrxTab === 'penyaluran' && (
          <div>
            
            {/* Desktop Table View (Hidden on mobile < 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5 w-12 text-center">
                      <button 
                        type="button" 
                        onClick={() => handleSortTrx('nomor')}
                        className="inline-flex items-center gap-1 hover:text-blue-600 cursor-pointer"
                        title="Urutkan berdasarkan Nomor"
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
                    <th className="py-3 px-3.5 w-28 text-center">Status</th>
                    <th className="py-3 px-3.5 w-32 text-center bg-slate-100/70 border-l border-slate-200">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedTransaksi.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400">
                        <div className="space-y-2 py-4">
                          <FileStack className="w-10 h-10 text-slate-300 mx-auto" />
                          <p className="font-bold text-slate-700 text-sm">Tidak ada transaksi penyaluran ditemukan.</p>
                          <p className="text-xs text-slate-500">
                            {searchTrx || monthTrx !== 'all' || yearTrx !== 'all'
                              ? 'Tidak ada data yang cocok dengan kriteria pencarian/filter Anda.'
                              : 'Riwayat transaksi penyaluran masih kosong. Klik "+ Buat Pengajuan" untuk memulai.'}
                          </p>
                          {(searchTrx || monthTrx !== 'all' || yearTrx !== 'all') && (
                            <button
                              type="button"
                              onClick={resetFiltersTrx}
                              className="mt-2 text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Hapus Filter Pencarian
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

                          {/* Rincian Barang */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <span className="text-xs font-semibold text-slate-800">
                                {totalJenis} Jenis <span className="text-slate-500 font-normal">({totalVol} item)</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setViewingDetailItems({
                                  title: `Rincian Barang Disalurkan (${t.unitPemohon})`,
                                  subtitle: `Tanggal: ${formatTanggalIndonesia(t.tanggal)} • BAST: ${t.noBAST} • Reg. ${t.nomorUrut}`,
                                  type: 'penyaluran',
                                  items: t.items.map(it => ({
                                    namaBarang: it.namaBarang,
                                    kodeBarang: it.kodeBarang,
                                    nusp: it.nusp,
                                    satuan: it.satuan,
                                    jumlah: it.usulanJumlah,
                                    hargaSatuan: it.hargaSatuan,
                                    subtotal: (Number(it.usulanJumlah) || 0) * (it.hargaSatuan || 0),
                                    keperluan: it.keperluan || t.keperluanUmum
                                  }))
                                })}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 transition-colors cursor-pointer"
                                title="Klik untuk melihat rincian barang"
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

                          {/* STATUS */}
                          <td className="py-3 px-3.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Selesai
                            </span>
                          </td>

                          {/* AKSI (EDIT, CETAK, HAPUS) */}
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
                                title="Cetak Berkas Bundel Dokumen (NPB, SPB, SPPB, BAST)"
                                aria-label="Cetak Dokumen Transaksi"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Hapus */}
                              <button
                                type="button"
                                onClick={() => onDeleteTransaksi(t)}
                                disabled={!isAdmin}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg border shadow-2xs transition-all cursor-pointer ${
                                  isAdmin 
                                    ? 'text-rose-600 hover:text-white hover:bg-rose-600 bg-white border-rose-200' 
                                    : 'text-slate-300 bg-slate-100 border-slate-200 cursor-not-allowed opacity-60'
                                }`}
                                title={isAdmin ? "Hapus Transaksi & Reversi Stok Gudang" : "Akses Dibatasi: Hanya Administrator"}
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

            {/* Mobile Responsive Card View (Shown on screens < 768px) */}
            <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {pagedTransaksi.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <FileStack className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-xs">Tidak ada data transaksi penyaluran.</p>
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
                      {/* Card Header: Reg #, Date, Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center">
                            {globalIdx}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-800">Reg. {t.nomorUrut}</span>
                            <span className="text-[10px] text-slate-400 ml-1.5">• {formatTanggalIndonesia(t.tanggal)}</span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Selesai
                        </span>
                      </div>

                      {/* Unit Pemohon & Keperluan */}
                      <div>
                        <div className="text-xs font-bold text-slate-900">{t.unitPemohon}</div>
                        <div className="text-[11px] text-slate-500 italic mt-0.5">{t.keperluanUmum}</div>
                      </div>

                      {/* Pemohon & Barang info */}
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
                              subtitle: `Tanggal: ${formatTanggalIndonesia(t.tanggal)} • BAST: ${t.noBAST} • Reg. ${t.nomorUrut}`,
                              type: 'penyaluran',
                              items: t.items.map(it => ({
                                namaBarang: it.namaBarang,
                                kodeBarang: it.kodeBarang,
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

                      {/* Total Nilai Transaksi */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500">Total Nilai Penyaluran:</span>
                        <span className="text-xs font-bold font-mono text-slate-900">
                          {formatRupiah(totalNilaiTrx)}
                        </span>
                      </div>

                      {/* Action Buttons: Touch Target >= 44px */}
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

            {/* Pagination Controls */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              
              <div className="flex items-center gap-3 text-slate-500">
                <span>
                  Menampilkan {filteredTransaksi.length === 0 ? 0 : (pageTrx - 1) * pageSizeTrx + 1} - {Math.min(pageTrx * pageSizeTrx, filteredTransaksi.length)} dari {filteredTransaksi.length} data
                </span>
                <span className="text-slate-300">&bull;</span>
                <div className="flex items-center gap-1.5">
                  <span>Baris per halaman:</span>
                  <select
                    value={pageSizeTrx}
                    onChange={e => {
                      setPageSizeTrx(Number(e.target.value));
                      setPageTrx(1);
                    }}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
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
            VIEW 2: TABEL PENERIMAAN BELANJA BOS (DESKTOP & MOBILE)
            ========================================================= */}
        {activeTrxTab === 'penerimaan' && (
          <div>
            
            {/* Desktop Table View */}
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
                              : 'Riwayat penerimaan masih kosong. Klik "+ Tambah Penerimaan" untuk mencatat faktur belanja.'}
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

            {/* Pagination Controls for Penerimaan */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 text-slate-500">
                <span>
                  Menampilkan {filteredPenerimaan.length === 0 ? 0 : (pageRcv - 1) * pageSizeRcv + 1} - {Math.min(pageRcv * pageSizeRcv, filteredPenerimaan.length)} dari {filteredPenerimaan.length} data
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
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
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

      {/* Pop-over / Modal Detail Rincian Barang */}
      {viewingDetailItems && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
                      <th className="py-2.5 px-3">Nama Barang</th>
                      <th className="py-2.5 px-3 text-center w-24">Jumlah</th>
                      <th className="py-2.5 px-3 text-right w-28">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-right w-32">Subtotal</th>
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
                Total: <strong className="text-slate-900">{viewingDetailItems.items.length} jenis barang</strong> &bull;{' '}
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

    </div>
  );
};
