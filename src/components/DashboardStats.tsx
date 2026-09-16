import { 
  AlertTriangle, 
  ArrowUpRight, 
  Boxes, 
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock, 
  FileSpreadsheet, 
  FileStack, 
  FileText, 
  Filter,
  Layers, 
  PackagePlus, 
  Pencil,
  Printer, 
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { AppUser, Barang, TransaksiPenerimaan, TransaksiPengeluaran } from '../types';
import { formatRupiah, formatTanggalIndonesia } from '../utils/numberGenerator';

interface Props {
  transaksiList: TransaksiPengeluaran[];
  penerimaanList: TransaksiPenerimaan[];
  barangList: Barang[];
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

  // Stat calculations
  const totalBarangCount = barangList.length;
  const stokMenipis = barangList.filter(b => b.stokSekarang <= 10);
  const totalNilaiBelanjaBOS = penerimaanList.reduce((acc, p) => acc + p.totalNilai, 0);
  const totalItemDisalurkan = transaksiList.reduce(
    (acc, t) => acc + t.items.reduce((sub, it) => sub + it.usulanJumlah, 0),
    0
  );

  // ==========================================
  // TABLE 1: TRANSAKSI PENYALURAN (Filter & Page)
  // ==========================================
  const [searchTrx, setSearchTrx] = useState('');
  const [monthTrx, setMonthTrx] = useState('all');
  const [yearTrx, setYearTrx] = useState('all');
  const [pageTrx, setPageTrx] = useState(1);
  const [pageSizeTrx, setPageSizeTrx] = useState(5);

  const availableYearsTrx = useMemo(() => {
    const years = new Set<string>();
    transaksiList.forEach(t => {
      if (t.tanggal) {
        const y = new Date(t.tanggal).getFullYear();
        if (!isNaN(y)) years.add(String(y));
      }
    });
    if (years.size === 0) years.add(String(new Date().getFullYear()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [transaksiList]);

  const filteredTransaksi = useMemo(() => {
    return transaksiList.filter(t => {
      // 1. Search filter
      if (searchTrx.trim()) {
        const q = searchTrx.toLowerCase().trim();
        const matchNo = (t.noSPB || '').toLowerCase().includes(q) ||
                        (t.noBAST || '').toLowerCase().includes(q) ||
                        (t.noNPB || '').toLowerCase().includes(q) ||
                        (t.noSPPB || '').toLowerCase().includes(q) ||
                        String(t.nomorUrut).includes(q);
        const matchUnit = (t.unitPemohon || '').toLowerCase().includes(q);
        const matchKeperluan = (t.keperluanUmum || '').toLowerCase().includes(q);
        const matchBarang = t.items.some(it => 
          (it.namaBarang || '').toLowerCase().includes(q) ||
          (it.kodeBarang || '').toLowerCase().includes(q)
        );
        if (!matchNo && !matchUnit && !matchKeperluan && !matchBarang) return false;
      }

      // 2. Month filter
      if (monthTrx !== 'all' && t.tanggal) {
        const d = new Date(t.tanggal);
        const m = String(d.getMonth() + 1);
        if (m !== monthTrx) return false;
      }

      // 3. Year filter
      if (yearTrx !== 'all' && t.tanggal) {
        const d = new Date(t.tanggal);
        const y = String(d.getFullYear());
        if (y !== yearTrx) return false;
      }

      return true;
    });
  }, [transaksiList, searchTrx, monthTrx, yearTrx]);

  const totalPagesTrx = Math.max(1, Math.ceil(filteredTransaksi.length / pageSizeTrx));
  const pagedTransaksi = useMemo(() => {
    const start = (pageTrx - 1) * pageSizeTrx;
    return filteredTransaksi.slice(start, start + pageSizeTrx);
  }, [filteredTransaksi, pageTrx, pageSizeTrx]);

  const resetFiltersTrx = () => {
    setSearchTrx('');
    setMonthTrx('all');
    setYearTrx('all');
    setPageTrx(1);
  };

  // ==========================================
  // TABLE 2: PENERIMAAN PENGADAAN (Filter & Page)
  // ==========================================
  const [searchRcv, setSearchRcv] = useState('');
  const [sumberDanaRcv, setSumberDanaRcv] = useState('all');
  const [monthRcv, setMonthRcv] = useState('all');
  const [yearRcv, setYearRcv] = useState('all');
  const [pageRcv, setPageRcv] = useState(1);
  const [pageSizeRcv, setPageSizeRcv] = useState(5);

  const availableYearsRcv = useMemo(() => {
    const years = new Set<string>();
    penerimaanList.forEach(p => {
      if (p.tanggal) {
        const y = new Date(p.tanggal).getFullYear();
        if (!isNaN(y)) years.add(String(y));
      }
    });
    if (years.size === 0) years.add(String(new Date().getFullYear()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [penerimaanList]);

  const filteredPenerimaan = useMemo(() => {
    return penerimaanList.filter(p => {
      // 1. Search
      if (searchRcv.trim()) {
        const q = searchRcv.toLowerCase().trim();
        const matchBukti = (p.noBukti || '').toLowerCase().includes(q);
        const matchPenyedia = (p.penyedia || '').toLowerCase().includes(q);
        const matchKeterangan = (p.keterangan || '').toLowerCase().includes(q);
        const matchBarang = p.items.some(it => 
          (it.namaBarang || '').toLowerCase().includes(q) ||
          (it.kodeBarang || '').toLowerCase().includes(q)
        );
        if (!matchBukti && !matchPenyedia && !matchKeterangan && !matchBarang) return false;
      }

      // 2. Sumber Dana
      if (sumberDanaRcv !== 'all' && p.sumberDana !== sumberDanaRcv) {
        return false;
      }

      // 3. Month
      if (monthRcv !== 'all' && p.tanggal) {
        const d = new Date(p.tanggal);
        const m = String(d.getMonth() + 1);
        if (m !== monthRcv) return false;
      }

      // 4. Year
      if (yearRcv !== 'all' && p.tanggal) {
        const d = new Date(p.tanggal);
        const y = String(d.getFullYear());
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
      
      {/* Top Banner Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-6 shadow-xs border border-slate-800 ring-1 ring-white/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 bg-blue-500/15 text-blue-300 border border-blue-400/30 text-xs px-2.5 py-0.5 rounded-full font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Standar Format Baku Instansi Pemerintah (A4 / F4)
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Sistem Manajemen Stok &amp; Generator Dokumen Inventaris Sekolah
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Satu alur input otomatis menerbitkan berkas legalitas berantai: 
              <span className="font-semibold text-amber-300 mx-1">NPB → SPB → SPPB → BAST</span> 
              dan pembukuan Rekapitulasi Realisasi Dana BOS persis sesuai standar audit inspektorat &amp; dinas pendidikan.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 flex-shrink-0">
            <button
              onClick={onOpenNewPenerimaan}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 border border-emerald-500/30 transition-all active:scale-98"
            >
              <PackagePlus className="w-4 h-4 text-emerald-200" />
              Catat Penerimaan (BOS)
            </button>

            <button
              onClick={onOpenNewTransaksi}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 border border-blue-400/30 transition-all active:scale-98"
            >
              <FileStack className="w-4 h-4" />
              Buat Pengajuan Baru
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Master Barang */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs ring-1 ring-slate-900/5 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ragam Barang</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{totalBarangCount}</span>
            <span className="text-xs text-slate-500 font-medium">item NUSP</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Terkodifikasi kode barang dinas
          </p>
        </div>

        {/* Card 2: Penyaluran Selesai */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs ring-1 ring-slate-900/5 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Transaksi Penyaluran</span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{transaksiList.length}</span>
            <span className="text-xs text-slate-500 font-medium">berkas selesai</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Total {totalItemDisalurkan} unit barang disalurkan
          </p>
        </div>

        {/* Card 3: Realisasi Belanja BOS */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs ring-1 ring-slate-900/5 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Penerimaan BOS</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold tracking-tight text-emerald-700 font-mono truncate">
              {formatRupiah(totalNilaiBelanjaBOS)}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {penerimaanList.length} faktur pengadaan belanja
          </p>
        </div>

        {/* Card 4: Stok Kritis Alert */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs ring-1 ring-slate-900/5 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Peringatan Gudang</span>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
              stokMenipis.length > 0 ? 'bg-amber-50 text-amber-600 border-amber-200/60' : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className={`text-2xl font-bold tracking-tight ${stokMenipis.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {stokMenipis.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">barang &le; 10 unit</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stokMenipis.length > 0 ? 'Perlu pengadaan belanja BOS baru' : 'Stok persediaan mencukupi'}
          </p>
        </div>
      </div>

      {/* =========================================================================
          MAIN SECTION 1: DAFTAR TRANSAKSI PENYALURAN (DILENGKAPI KOLOM AKSI & FILTER)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs ring-1 ring-slate-900/5 overflow-hidden">
        
        {/* Table Header & Controls Bar */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileStack className="w-4 h-4 text-blue-600" />
                Daftar Transaksi Penyaluran Barang &amp; Rantai Dokumen Cetak
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola berkas, koreksi selisih usulan, dan cetak bundel dokumen (NPB, SPB, SPPB, BAST).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                Total: <strong>{filteredTransaksi.length}</strong> transaksi
              </span>
              <button
                onClick={onOpenNewTransaksi}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg shadow-xs inline-flex items-center gap-1.5 transition-colors"
              >
                + Buat Pengajuan
              </button>
            </div>
          </div>

          {/* Global Search Bar & Date Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
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
                className="w-full pl-9 pr-8 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
              />
              {searchTrx && (
                <button
                  onClick={() => {
                    setSearchTrx('');
                    setPageTrx(1);
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
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
                className="w-full py-2 px-3 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-700 font-medium"
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
                className="w-full py-2 px-3 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-700 font-medium"
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
                className="w-full py-2 px-2.5 text-xs text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1 font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="sm:hidden">Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5 w-10 text-center">No</th>
                <th className="p-3.5 w-28">Tanggal</th>
                <th className="p-3.5 w-56">Unit Pemohon &amp; Keperluan</th>
                <th className="p-3.5">Rincian Barang Disalurkan</th>
                <th className="p-3.5 w-60">Rantai Nomor Dokumen</th>
                <th className="p-3.5 w-24 text-center">Status</th>
                <th className="p-3.5 w-28 text-center bg-slate-100/70 border-l border-slate-200">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedTransaksi.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <div className="space-y-1.5 py-4">
                      <FileStack className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700">Tidak ada transaksi penyaluran ditemukan.</p>
                      <p className="text-[11px] text-slate-500">
                        {searchTrx || monthTrx !== 'all' || yearTrx !== 'all'
                          ? 'Tidak ada data yang cocok dengan kriteria pencarian/filter Anda.'
                          : 'Riwayat transaksi penyaluran masih kosong. Klik "+ Buat Pengajuan" untuk memulai.'}
                      </p>
                      {(searchTrx || monthTrx !== 'all' || yearTrx !== 'all') && (
                        <button
                          onClick={resetFiltersTrx}
                          className="mt-2 text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
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
                  return (
                    <tr 
                      key={t.id} 
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      <td className="p-3.5 text-center text-slate-400 font-medium">{globalIdx}</td>
                      <td className="p-3.5 font-medium text-slate-800">
                        <div>{formatTanggalIndonesia(t.tanggal)}</div>
                        <span className="text-[10px] text-slate-400 font-mono">Reg #{t.nomorUrut}</span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {t.unitPemohon}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 italic">{t.keperluanUmum}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {t.items.map((it, i) => (
                            <span 
                              key={i} 
                              className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium"
                            >
                              {it.namaBarang} ({it.usulanJumlah} {it.satuan})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-[10px] text-slate-600 space-y-0.5">
                        <div><span className="text-slate-400">NPB:</span> {t.noNPB}</div>
                        <div><span className="text-slate-400">SPB:</span> {t.noSPB}</div>
                        <div><span className="text-slate-400">SPPB:</span> {t.noSPPB}</div>
                        <div><span className="text-blue-600 font-semibold">BAST:</span> {t.noBAST}</div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Siap Cetak
                        </span>
                      </td>

                      {/* KOLOM AKSI (EDIT, CETAK QUICK-ACTION, HAPUS) */}
                      <td className="p-3.5 text-center bg-slate-50/50 border-l border-slate-200">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {/* Tombol Edit (Ikon Pensil) */}
                          <button
                            type="button"
                            onClick={() => onEditTransaksi(t)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-100/70 bg-white border border-slate-200 rounded-lg shadow-2xs transition-all active:scale-95"
                            title="Edit / Koreksi Data Transaksi &amp; Sinkronkan Stok"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Tombol Cetak Quick-Action (Ikon Printer) */}
                          <button
                            type="button"
                            onClick={() => onSelectTransaksiForPrint(t.id)}
                            className="p-1.5 text-blue-700 hover:text-white hover:bg-blue-600 bg-blue-50 border border-blue-200 rounded-lg shadow-2xs transition-all active:scale-95"
                            title="Cetak Berkas Bundel Dokumen (NPB, SPB, SPPB, BAST)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Tombol Hapus (Ikon Trash - RBAC Admin Only) */}
                          <button
                            type="button"
                            onClick={() => onDeleteTransaksi(t)}
                            disabled={!isAdmin}
                            className={`p-1.5 rounded-lg border shadow-2xs transition-all ${
                              isAdmin 
                                ? 'text-rose-600 hover:text-white hover:bg-rose-600 bg-white border-rose-200 active:scale-95' 
                                : 'text-slate-300 bg-slate-100 border-slate-200 cursor-not-allowed opacity-60'
                            }`}
                            title={isAdmin ? "Hapus Transaksi & Reversi Stok Gudang" : "Akses Dibatasi: Hanya Administrator yang berhak menghapus data"}
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

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          
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
                className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-semibold text-slate-700"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setPageTrx(1)}
              disabled={pageTrx === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Halaman Pertama"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPageTrx(p => Math.max(1, p - 1))}
              disabled={pageTrx === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 font-mono">
              {pageTrx} / {totalPagesTrx}
            </span>

            <button
              onClick={() => setPageTrx(p => Math.min(totalPagesTrx, p + 1))}
              disabled={pageTrx === totalPagesTrx || filteredTransaksi.length === 0}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Halaman Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPageTrx(totalPagesTrx)}
              disabled={pageTrx === totalPagesTrx || filteredTransaksi.length === 0}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Halaman Terakhir"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* =========================================================================
          MAIN SECTION 2: RIWAYAT PENERIMAAN PENGADAAN (BOS) (KOLOM AKSI & FILTER)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs ring-1 ring-slate-900/5 overflow-hidden">
        
        {/* Table Header & Controls Bar */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Riwayat Penerimaan Pengadaan Barang Persediaan (Dana BOS / APBD)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mencatat faktur belanja barang masuk, menambah stok persediaan fisik gudang, dan sinkronisasi buku rekapitulasi BOS.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-800 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                Total: <strong>{filteredPenerimaan.length}</strong> faktur
              </span>
              <button
                onClick={onOpenNewPenerimaan}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg shadow-xs inline-flex items-center gap-1.5 transition-colors"
              >
                + Tambah Penerimaan
              </button>
            </div>
          </div>

          {/* Global Search & Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
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
                className="w-full pl-9 pr-8 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all placeholder:text-slate-400"
              />
              {searchRcv && (
                <button
                  onClick={() => {
                    setSearchRcv('');
                    setPageRcv(1);
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
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
                className="w-full py-2 px-3 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-700 font-medium"
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
                className="w-full py-2 px-3 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-700 font-medium"
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
                className="w-full py-2 px-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-700 font-medium"
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
                className="w-full py-2 px-2.5 text-xs text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1 font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="sm:hidden">Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5 w-10 text-center">No</th>
                <th className="p-3.5 w-28">Tanggal</th>
                <th className="p-3.5 w-44">No. Bukti / Faktur</th>
                <th className="p-3.5 w-36">Sumber Dana</th>
                <th className="p-3.5">Penyedia &amp; Rincian Barang</th>
                <th className="p-3.5 w-32 text-right">Total Nilai Pembelian</th>
                <th className="p-3.5 w-28 text-center bg-slate-100/70 border-l border-slate-200">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedPenerimaan.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <div className="space-y-1.5 py-4">
                      <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700">Tidak ada riwayat penerimaan barang ditemukan.</p>
                      <p className="text-[11px] text-slate-500">
                        {searchRcv || sumberDanaRcv !== 'all' || monthRcv !== 'all' || yearRcv !== 'all'
                          ? 'Tidak ada data yang cocok dengan kriteria pencarian/filter Anda.'
                          : 'Riwayat penerimaan masih kosong. Klik "+ Tambah Penerimaan" untuk mencatat faktur belanja.'}
                      </p>
                      {(searchRcv || sumberDanaRcv !== 'all' || monthRcv !== 'all' || yearRcv !== 'all') && (
                        <button
                          onClick={resetFiltersRcv}
                          className="mt-2 text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Hapus Filter Pencarian
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                pagedPenerimaan.map((p, idx) => {
                  const globalIdx = (pageRcv - 1) * pageSizeRcv + idx + 1;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 text-center text-slate-400 font-medium">{globalIdx}</td>
                      <td className="p-3.5 text-slate-800 font-medium">
                        {formatTanggalIndonesia(p.tanggal)}
                      </td>
                      <td className="p-3.5 font-mono text-slate-800 font-semibold">
                        {p.noBukti}
                      </td>
                      <td className="p-3.5">
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold text-[11px]">
                          {p.sumberDana}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">{p.penyedia}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{p.keterangan}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.items.map((it, i) => (
                            <span 
                              key={i}
                              className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                            >
                              {it.namaBarang} (+{it.jumlahMasuk} {it.satuan})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-700">
                        {formatRupiah(p.totalNilai)}
                      </td>

                      {/* KOLOM AKSI (EDIT, CETAK/LIHAT, HAPUS) */}
                      <td className="p-3.5 text-center bg-slate-50/50 border-l border-slate-200">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {/* Tombol Edit (Ikon Pensil) */}
                          <button
                            type="button"
                            onClick={() => onEditPenerimaan(p)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-100/70 bg-white border border-slate-200 rounded-lg shadow-2xs transition-all active:scale-95"
                            title="Edit / Koreksi Faktur Penerimaan &amp; Sinkronkan Stok"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Tombol Cetak Quick-Action (Ikon Printer) */}
                          <button
                            type="button"
                            onClick={() => onSelectPenerimaanForPrint && onSelectPenerimaanForPrint(p)}
                            className="p-1.5 text-emerald-700 hover:text-white hover:bg-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg shadow-2xs transition-all active:scale-95"
                            title="Pratinjau &amp; Cetak Bukti Penerimaan Rekap BOS"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Tombol Hapus (Ikon Trash - RBAC Admin Only) */}
                          <button
                            type="button"
                            onClick={() => onDeletePenerimaan(p)}
                            disabled={!isAdmin}
                            className={`p-1.5 rounded-lg border shadow-2xs transition-all ${
                              isAdmin 
                                ? 'text-rose-600 hover:text-white hover:bg-rose-600 bg-white border-rose-200 active:scale-95' 
                                : 'text-slate-300 bg-slate-100 border-slate-200 cursor-not-allowed opacity-60'
                            }`}
                            title={isAdmin ? "Hapus Faktur & Kurangi Saldo Stok Gudang" : "Akses Dibatasi: Hanya Administrator yang berhak menghapus data"}
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

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          
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
                className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-semibold text-slate-700"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setPageRcv(1)}
              disabled={pageRcv === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Halaman Pertama"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPageRcv(p => Math.max(1, p - 1))}
              disabled={pageRcv === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 font-mono">
              {pageRcv} / {totalPagesRcv}
            </span>

            <button
              onClick={() => setPageRcv(p => Math.min(totalPagesRcv, p + 1))}
              disabled={pageRcv === totalPagesRcv || filteredPenerimaan.length === 0}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Halaman Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPageRcv(totalPagesRcv)}
              disabled={pageRcv === totalPagesRcv || filteredPenerimaan.length === 0}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title="Halaman Terakhir"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
