import {
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileCheck,
  FileDown,
  FileSpreadsheet,
  FileStack,
  FileText,
  Filter,
  Layers,
  LayoutGrid,
  PackageCheck,
  Printer,
  Search,
  Sparkles,
  Table,
  TrendingDown,
  TrendingUp,
  X
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {
  Barang,
  DocumentType,
  KartuBarangPeriodFilter,
  KartuBarangPeriodType,
  TAHUN_ANGGARAN_OPTIONS,
  TransaksiPenerimaan,
  TransaksiPengeluaran
} from '../types';
import { MONTHS_ID } from '../utils/numberGenerator';

export type CategoryTab = 'all' | 'operasional' | 'laporan' | 'kartu' | 'induk';

interface Props {
  activeDocType: DocumentType;
  onSelectDocType: (type: DocumentType) => void;
  onTriggerPrint: (type: DocumentType) => void;
  // Transactions
  transaksiList: TransaksiPengeluaran[];
  selectedTransaksiId: string;
  onSelectTransaksi: (id: string) => void;
  // Goods
  masterBarang: Barang[];
  selectedBarangId: string;
  onSelectBarang: (id: string) => void;
  isBatchPrintAll: boolean;
  onToggleBatchPrintAll: (batch: boolean) => void;
  // Period filter for Kartu
  kartuPeriodFilter: KartuBarangPeriodFilter;
  onUpdateKartuPeriodFilter: (newFilter: KartuBarangPeriodFilter) => void;
  // Period filter for Laporan & Stock Opname
  selectedMonth: number;
  onSelectMonth: (m: number) => void;
  selectedYear: number;
  onSelectYear: (y: number) => void;
  // Excel BOS Export
  onExportExcelBOS: () => void;
  isExportingBOS: boolean;
  // Receipts
  transaksiPenerimaanList?: TransaksiPenerimaan[];
}

interface DocCardDefinition {
  id: DocumentType;
  category: 'operasional' | 'laporan' | 'kartu' | 'induk';
  code: string;
  title: string;
  description: string;
  orientation: 'Portrait' | 'Landscape';
  paperSize: string;
  badgeLegal?: string;
  accentColor: {
    bg: string;
    border: string;
    text: string;
    iconBg: string;
    iconColor: string;
    activeRing: string;
  };
  icon: React.ComponentType<{ className?: string }>;
}

export const DocumentMenuGrid: React.FC<Props> = ({
  activeDocType,
  onSelectDocType,
  onTriggerPrint,
  transaksiList,
  selectedTransaksiId,
  onSelectTransaksi,
  masterBarang,
  selectedBarangId,
  onSelectBarang,
  isBatchPrintAll,
  onToggleBatchPrintAll,
  kartuPeriodFilter,
  onUpdateKartuPeriodFilter,
  selectedMonth,
  onSelectMonth,
  selectedYear,
  onSelectYear,
  onExportExcelBOS,
  isExportingBOS,
  transaksiPenerimaanList = []
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGridCollapsed, setIsGridCollapsed] = useState(false);
  const [trxSearchQuery, setTrxSearchQuery] = useState('');

  // Find active items
  const activeTrx = transaksiList.find(t => t.id === selectedTransaksiId) || transaksiList[0];
  const activeBarang = masterBarang.find(b => b.id === selectedBarangId) || masterBarang[0];

  // Filtered transactions for quick search
  const filteredTransaksiList = useMemo(() => {
    if (!trxSearchQuery.trim()) return transaksiList;
    const q = trxSearchQuery.toLowerCase();
    return transaksiList.filter(t => 
      t.nomorUrut.toString().includes(q) ||
      t.unitPemohon.toLowerCase().includes(q) ||
      (t.noNPB && t.noNPB.toLowerCase().includes(q)) ||
      (t.noSPB && t.noSPB.toLowerCase().includes(q)) ||
      (t.noSPPB && t.noSPPB.toLowerCase().includes(q)) ||
      (t.noBAST && t.noBAST.toLowerCase().includes(q)) ||
      (t.tanggalSurat && t.tanggalSurat.toLowerCase().includes(q))
    );
  }, [transaksiList, trxSearchQuery]);

  // Card definitions for all 13 documents
  const allDocCards: DocCardDefinition[] = [
    // Kategori A: Dokumen Operasional
    {
      id: 'npb',
      category: 'operasional',
      code: 'DOK-01',
      title: 'Nota Permintaan Barang (NPB)',
      description: 'Formulir pengajuan usulan kebutuhan barang persediaan yang diajukan oleh Guru / Unit Kerja Pemohon.',
      orientation: 'Portrait',
      paperSize: 'A4 / F4',
      badgeLegal: 'Alur Awal',
      accentColor: {
        bg: 'bg-blue-50/50 hover:bg-blue-50/90',
        border: 'border-blue-200 hover:border-blue-400',
        text: 'text-blue-900',
        iconBg: 'bg-blue-600 text-white',
        iconColor: 'text-blue-600',
        activeRing: 'ring-2 ring-blue-600 border-blue-600 shadow-md bg-blue-50/80'
      },
      icon: FileText
    },
    {
      id: 'spb',
      category: 'operasional',
      code: 'DOK-02',
      title: 'Surat Permintaan Barang (SPB)',
      description: 'Surat persetujuan resmi permintaan barang dari Pejabat Berwenang (Kasubbag TU / Kepala Sekolah) kepada Pengurus Barang.',
      orientation: 'Portrait',
      paperSize: 'A4 / F4',
      badgeLegal: 'Persetujuan Dinas',
      accentColor: {
        bg: 'bg-sky-50/50 hover:bg-sky-50/90',
        border: 'border-sky-200 hover:border-sky-400',
        text: 'text-sky-900',
        iconBg: 'bg-sky-600 text-white',
        iconColor: 'text-sky-600',
        activeRing: 'ring-2 ring-sky-600 border-sky-600 shadow-md bg-sky-50/80'
      },
      icon: FileCheck
    },
    {
      id: 'sppb',
      category: 'operasional',
      code: 'DOK-03',
      title: 'Surat Perintah Penyaluran (SPPB)',
      description: 'Perintah tertulis kepada Pengurus Barang untuk mengeluarkan dan menyerahkan barang persediaan dari gudang inventaris.',
      orientation: 'Portrait',
      paperSize: 'A4 / F4',
      badgeLegal: 'Otorisasi Gudang',
      accentColor: {
        bg: 'bg-cyan-50/50 hover:bg-cyan-50/90',
        border: 'border-cyan-200 hover:border-cyan-400',
        text: 'text-cyan-900',
        iconBg: 'bg-cyan-600 text-white',
        iconColor: 'text-cyan-600',
        activeRing: 'ring-2 ring-cyan-600 border-cyan-600 shadow-md bg-cyan-50/80'
      },
      icon: FileStack
    },
    {
      id: 'bast',
      category: 'operasional',
      code: 'DOK-04',
      title: 'Berita Acara Serah Terima (BAST)',
      description: 'Bukti sah hukum serah terima fisik barang persediaan antara Pengurus Barang dengan Pemohon barang bersangkutan.',
      orientation: 'Portrait',
      paperSize: 'A4 / F4',
      badgeLegal: 'Bukti Serah Terima',
      accentColor: {
        bg: 'bg-indigo-50/50 hover:bg-indigo-50/90',
        border: 'border-indigo-200 hover:border-indigo-400',
        text: 'text-indigo-900',
        iconBg: 'bg-indigo-600 text-white',
        iconColor: 'text-indigo-600',
        activeRing: 'ring-2 ring-indigo-600 border-indigo-600 shadow-md bg-indigo-50/80'
      },
      icon: FileDown
    },
    {
      id: 'bundle',
      category: 'operasional',
      code: 'BUNDEL-4IN1',
      title: 'Berkas Bundel Transaksi Lengkap',
      description: 'Mencetak langsung seluruh 4 berkas operasional (NPB, SPB, SPPB, dan BAST) secara berurutan dalam 1 alur transaksi.',
      orientation: 'Portrait',
      paperSize: 'A4 / F4 Multi-Halaman',
      badgeLegal: '1-Klik 4 Dokumen',
      accentColor: {
        bg: 'bg-violet-50/60 hover:bg-violet-50/95',
        border: 'border-violet-300 hover:border-violet-500',
        text: 'text-violet-950',
        iconBg: 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white',
        iconColor: 'text-violet-600',
        activeRing: 'ring-2 ring-violet-600 border-violet-600 shadow-md bg-violet-50/90'
      },
      icon: Layers
    },

    // Kategori B: Laporan Operasional & Buku Mutasi
    {
      id: 'buku_penerimaan',
      category: 'laporan',
      code: 'LAP-01',
      title: 'Buku Penerimaan Barang Persediaan',
      description: 'Buku register pencatatan barang masuk dari penyedia/rekanan berdasarkan faktur & kuitansi dana BOS.',
      orientation: 'Landscape',
      paperSize: 'A4 Landscape',
      badgeLegal: 'Buku Kasus Penerimaan',
      accentColor: {
        bg: 'bg-emerald-50/50 hover:bg-emerald-50/90',
        border: 'border-emerald-200 hover:border-emerald-400',
        text: 'text-emerald-950',
        iconBg: 'bg-emerald-600 text-white',
        iconColor: 'text-emerald-600',
        activeRing: 'ring-2 ring-emerald-600 border-emerald-600 shadow-md bg-emerald-50/80'
      },
      icon: TrendingUp
    },
    {
      id: 'buku_pengeluaran',
      category: 'laporan',
      code: 'LAP-02',
      title: 'Buku Pengeluaran Barang Persediaan',
      description: 'Buku register penyaluran barang keluar berdasarkan nomor urut SPPB & BAST unit pemohon.',
      orientation: 'Landscape',
      paperSize: 'A4 Landscape',
      badgeLegal: 'Buku Kasus Penyaluran',
      accentColor: {
        bg: 'bg-amber-50/50 hover:bg-amber-50/90',
        border: 'border-amber-200 hover:border-amber-400',
        text: 'text-amber-950',
        iconBg: 'bg-amber-600 text-white',
        iconColor: 'text-amber-600',
        activeRing: 'ring-2 ring-amber-600 border-amber-600 shadow-md bg-amber-50/80'
      },
      icon: TrendingDown
    },
    {
      id: 'buku_rekap',
      category: 'laporan',
      code: 'LAP-03',
      title: 'Rekap Penerimaan & Pengeluaran',
      description: 'Tabel rekapitulasi komparasi penerimaan dan pengeluaran barang persediaan saldo akhir periode BOS.',
      orientation: 'Landscape',
      paperSize: 'A4 Landscape',
      badgeLegal: 'Rekap Komparasi',
      accentColor: {
        bg: 'bg-blue-50/50 hover:bg-blue-50/90',
        border: 'border-blue-200 hover:border-blue-400',
        text: 'text-blue-950',
        iconBg: 'bg-blue-700 text-white',
        iconColor: 'text-blue-700',
        activeRing: 'ring-2 ring-blue-700 border-blue-700 shadow-md bg-blue-50/80'
      },
      icon: FileSpreadsheet
    },

    // Kategori C: Kartu Inventaris & Opname
    {
      id: 'kartu_barang',
      category: 'kartu',
      code: 'LAMP-12',
      title: 'Kartu Barang (Lampiran 12)',
      description: 'Kartu kendali fisik kuantitas barang persediaan per item sesuai Permendagri No. 19 Tahun 2016.',
      orientation: 'Portrait',
      paperSize: 'A4 Portrait',
      badgeLegal: 'Permendagri 19/2016',
      accentColor: {
        bg: 'bg-teal-50/50 hover:bg-teal-50/90',
        border: 'border-teal-200 hover:border-teal-400',
        text: 'text-teal-950',
        iconBg: 'bg-teal-700 text-white',
        iconColor: 'text-teal-700',
        activeRing: 'ring-2 ring-teal-700 border-teal-700 shadow-md bg-teal-50/80'
      },
      icon: BookOpen
    },
    {
      id: 'kartu_persediaan',
      category: 'kartu',
      code: 'LAMP-13',
      title: 'Kartu Persediaan (Lampiran 13)',
      description: 'Kartu nilai rupiah & mutasi saldo keuangan persediaan per item barang (Permendagri No. 19/2016).',
      orientation: 'Landscape',
      paperSize: 'A4 Landscape',
      badgeLegal: 'Permendagri 19/2016',
      accentColor: {
        bg: 'bg-cyan-50/50 hover:bg-cyan-50/90',
        border: 'border-cyan-200 hover:border-cyan-400',
        text: 'text-cyan-950',
        iconBg: 'bg-cyan-700 text-white',
        iconColor: 'text-cyan-700',
        activeRing: 'ring-2 ring-cyan-700 border-cyan-700 shadow-md bg-cyan-50/80'
      },
      icon: BookOpen
    },
    {
      id: 'bast_stock_opname',
      category: 'kartu',
      code: 'BA-SO',
      title: 'BAST Stock Opname BOS',
      description: 'Berita Acara Pemeriksaan Fisik Persediaan (Stock Opname) posisi per tanggal/bulan dengan pengesahan resmi.',
      orientation: 'Portrait',
      paperSize: 'A4 Portrait',
      badgeLegal: 'Pemeriksaan Fisik',
      accentColor: {
        bg: 'bg-purple-50/50 hover:bg-purple-50/90',
        border: 'border-purple-200 hover:border-purple-400',
        text: 'text-purple-950',
        iconBg: 'bg-purple-700 text-white',
        iconColor: 'text-purple-700',
        activeRing: 'ring-2 ring-purple-700 border-purple-700 shadow-md bg-purple-50/80'
      },
      icon: PackageCheck
    },

    // Kategori D: Mutasi BHP (Akumulasi 12 Bulan)
    {
      id: 'mutasi_bos',
      category: 'induk',
      code: 'SHEET-BOS',
      title: 'Mutasi BHP (Daftar Mutasi Barang Habis Pakai BOS 12 Bulan)',
      description: 'Daftar Mutasi Barang Habis Pakai (BHP) Dana BOS akumulasi Januari - Desember format resmi Dinas Pendidikan.',
      orientation: 'Landscape',
      paperSize: 'A4 Landscape / Multi',
      badgeLegal: 'Format Dinas 12 Bln',
      accentColor: {
        bg: 'bg-emerald-50/60 hover:bg-emerald-50/95',
        border: 'border-emerald-300 hover:border-emerald-500',
        text: 'text-emerald-950',
        iconBg: 'bg-emerald-800 text-white',
        iconColor: 'text-emerald-800',
        activeRing: 'ring-2 ring-emerald-800 border-emerald-800 shadow-md bg-emerald-50/90'
      },
      icon: FileSpreadsheet
    }
  ];

  // Filter cards by category & search query
  const displayedCards = useMemo(() => {
    return allDocCards.filter(card => {
      const matchCategory = activeCategory === 'all' || card.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        card.title.toLowerCase().includes(q) ||
        card.description.toLowerCase().includes(q) ||
        card.code.toLowerCase().includes(q) ||
        card.orientation.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [allDocCards, activeCategory, searchQuery]);

  // Counts by category
  const categoryCounts = useMemo(() => {
    return {
      all: allDocCards.length,
      operasional: allDocCards.filter(c => c.category === 'operasional').length,
      laporan: allDocCards.filter(c => c.category === 'laporan').length,
      kartu: allDocCards.filter(c => c.category === 'kartu').length,
      induk: allDocCards.filter(c => c.category === 'induk').length
    };
  }, [allDocCards]);

  const handlePreview = (type: DocumentType) => {
    onSelectDocType(type);
    // Smooth scroll to preview area
    setTimeout(() => {
      const previewEl = document.getElementById('document-preview-stage');
      if (previewEl) {
        previewEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const handlePrintCard = (type: DocumentType) => {
    onSelectDocType(type);
    setTimeout(() => {
      onTriggerPrint(type);
    }, 150);
  };

  return (
    <div className="no-print w-full bg-white border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        
        {/* Header Section: Title & Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Menu Laporan Rekapitulasi & Dokumen Operasional
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                <Sparkles className="w-3 h-3 text-blue-600" />
                Standar Permendagri & BOS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih dan cetak dokumen operasional transaksi harian, buku mutasi, kartu barang, maupun laporan induk tahunan.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {/* Quick Search */}
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari dokumen..."
                className="w-full text-xs pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  title="Hapus pencarian"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Collapse / Expand Toggle */}
            <button
              onClick={() => setIsGridCollapsed(!isGridCollapsed)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-all shrink-0"
              title={isGridCollapsed ? 'Tampilkan Menu Dokumen' : 'Sembunyikan Menu Dokumen'}
            >
              {isGridCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                  <span>Buka Menu ({displayedCards.length})</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                  <span>Tutup Menu</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Area */}
        {!isGridCollapsed && (
          <div className="pt-3">
            {/* 4 Category Tabs Navigation */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-thin">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeCategory === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Semua Dokumen</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeCategory === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                }`}>
                  {categoryCounts.all}
                </span>
              </button>

              <button
                onClick={() => setActiveCategory('operasional')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeCategory === 'operasional'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>A. Dokumen Operasional</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeCategory === 'operasional' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800'
                }`}>
                  {categoryCounts.operasional}
                </span>
              </button>

              <button
                onClick={() => setActiveCategory('laporan')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeCategory === 'laporan'
                    ? 'bg-emerald-700 text-white shadow-xs font-bold'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>B. Laporan & Buku Mutasi</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeCategory === 'laporan' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {categoryCounts.laporan}
                </span>
              </button>

              <button
                onClick={() => setActiveCategory('kartu')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeCategory === 'kartu'
                    ? 'bg-purple-700 text-white shadow-xs font-bold'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200/60'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>C. Kartu Inventaris & Opname</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeCategory === 'kartu' ? 'bg-purple-800 text-white' : 'bg-purple-100 text-purple-800'
                }`}>
                  {categoryCounts.kartu}
                </span>
              </button>

              <button
                onClick={() => setActiveCategory('induk')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeCategory === 'induk'
                    ? 'bg-indigo-700 text-white shadow-xs font-bold'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200/60'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>D. Mutasi BHP</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeCategory === 'induk' ? 'bg-indigo-800 text-white' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {categoryCounts.induk}
                </span>
              </button>
            </div>

            {/* Responsive Grid System: 1 column on mobile, 2 columns on tablet, 3 columns on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {displayedCards.map((card) => {
                const IconComponent = card.icon;
                const isActive = activeDocType === card.id;
                const isOperasional = card.category === 'operasional';
                const isLaporanMutasi = card.category === 'laporan';
                const isKartuBarangOrPersediaan = card.id === 'kartu_barang' || card.id === 'kartu_persediaan';
                const isStockOpname = card.id === 'bast_stock_opname';
                const isIndukBOS = card.category === 'induk';

                return (
                  <div
                    key={card.id}
                    id={`card-doc-${card.id}`}
                    className={`relative rounded-xl border p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 ${
                      isActive
                        ? card.accentColor.activeRing
                        : `${card.accentColor.bg} ${card.accentColor.border} hover:shadow-sm`
                    }`}
                  >
                    {/* Top Bar: Code, Badges & Orientation */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/90 border border-slate-300 text-slate-700 shadow-2xs">
                            {card.code}
                          </span>
                          {card.badgeLegal && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-900/5 text-slate-700 border border-slate-900/10">
                              {card.badgeLegal}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Orientation Badge */}
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                              card.orientation === 'Landscape'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-100 text-slate-800 border-slate-300'
                            }`}
                            title={`Format Orientasi Cetak: A4 ${card.orientation}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            A4 {card.orientation}
                          </span>

                          {/* Active Indicator */}
                          {isActive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs animate-pulse">
                              <CheckCircle2 className="w-3 h-3" />
                              Aktif
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Icon */}
                      <div className="flex items-start gap-3 mb-2">
                        <div className={`p-2 rounded-xl shrink-0 ${card.accentColor.iconBg} shadow-2xs`}>
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                            {card.title}
                          </h2>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                            {card.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Middle Section: Quick Filter / Interactive Parameters */}
                    <div className="my-3 pt-3 border-t border-slate-200/80">
                      {/* Parameter for Dokumen Operasional: Transaction Picker & Search */}
                      {isOperasional && (
                        <div className="space-y-2 bg-white/90 p-2.5 rounded-lg border border-slate-200/90 text-xs shadow-2xs">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                            <span className="flex items-center gap-1 text-slate-600">
                              <Filter className="w-3 h-3 text-blue-600" />
                              Filter & Pilih Transaksi:
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {filteredTransaksiList.length}/{transaksiList.length} Trx
                            </span>
                          </div>

                          {/* Quick Filter Search: No. Registrasi / Tanggal Transaksi / Nama Pemohon */}
                          <div className="relative">
                            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={trxSearchQuery}
                              onChange={(e) => setTrxSearchQuery(e.target.value)}
                              placeholder="Cari No. Reg / Tanggal / Pemohon..."
                              className="w-full text-[11px] pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400 transition-all"
                            />
                            {trxSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setTrxSearchQuery('')}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                title="Hapus filter"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>

                          <select
                            value={selectedTransaksiId}
                            onChange={(e) => onSelectTransaksi(e.target.value)}
                            className="w-full text-xs border border-slate-300 rounded-md py-1.5 px-2 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden truncate"
                          >
                            {filteredTransaksiList.length > 0 ? (
                              filteredTransaksiList.map((t) => (
                                <option key={t.id} value={t.id}>
                                  #{t.nomorUrut} - {t.unitPemohon} ({t.items.length} item) | {t.tanggalSurat}
                                </option>
                              ))
                            ) : (
                              <option disabled value="">Tidak ada transaksi yang cocok</option>
                            )}
                          </select>

                          {activeTrx && (
                            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-0.5 border-t border-slate-100 mt-1">
                              <span className="truncate max-w-[170px]" title={activeTrx.keperluan}>
                                Keperluan: {activeTrx.keperluan || 'Operasional Sekolah'}
                              </span>
                              <span className="font-medium text-slate-700 shrink-0 ml-1">{activeTrx.tanggalSurat}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Parameter for Laporan Operasional & Buku Mutasi: Periode Bulan, Triwulan, & Tahun */}
                      {isLaporanMutasi && (
                        <div className="space-y-1.5 bg-white/90 p-2.5 rounded-lg border border-slate-200/90 text-xs shadow-2xs">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                            <span className="flex items-center gap-1 text-slate-600">
                              <Calendar className="w-3 h-3 text-emerald-600" />
                              Periode Laporan BOS:
                            </span>
                            <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Bulan / Triwulan
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            <select
                              value={selectedMonth}
                              onChange={(e) => onSelectMonth(Number(e.target.value))}
                              className="text-xs border border-slate-300 rounded-md py-1.5 px-2 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden"
                            >
                              <optgroup label="Akumulasi">
                                <option value={-1}>Semua Bulan (Tahunan)</option>
                              </optgroup>
                              <optgroup label="Pilihan Triwulan">
                                <option value={2}>Triwulan I (Jan - Mar)</option>
                                <option value={5}>Triwulan II (Apr - Jun)</option>
                                <option value={8}>Triwulan III (Jul - Sep)</option>
                                <option value={11}>Triwulan IV (Okt - Des)</option>
                              </optgroup>
                              <optgroup label="Pilihan Bulan">
                                {MONTHS_ID.map((m, idx) => (
                                  <option key={m} value={idx}>{m}</option>
                                ))}
                              </optgroup>
                            </select>

                            <select
                              value={selectedYear}
                              onChange={(e) => onSelectYear(Number(e.target.value))}
                              className="text-xs border border-slate-300 rounded-md py-1.5 px-2 bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden"
                            >
                              {TAHUN_ANGGARAN_OPTIONS.map((y) => (
                                <option key={y} value={y}>Tahun {y}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Parameter for Kartu Barang (Lamp 12) & Kartu Persediaan (Lamp 13) */}
                      {isKartuBarangOrPersediaan && (
                        <div className="space-y-2 bg-white/80 p-2.5 rounded-lg border border-slate-200/90 text-xs">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                            <span className="flex items-center gap-1 text-slate-600">
                              <BookOpen className="w-3 h-3 text-teal-600" />
                              Filter Barang & Periode:
                            </span>
                            
                            {/* Toggle 1 Barang vs Semua Barang */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onToggleBatchPrintAll(false)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  !isBatchPrintAll ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                1 Barang
                              </button>
                              <button
                                type="button"
                                onClick={() => onToggleBatchPrintAll(true)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  isBatchPrintAll ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'
                                }`}
                                title="Cetak seluruh kartu barang/persediaan sekaligus"
                              >
                                Semua ({masterBarang.length})
                              </button>
                            </div>
                          </div>

                          {!isBatchPrintAll ? (
                            <select
                              value={selectedBarangId}
                              onChange={(e) => onSelectBarang(e.target.value)}
                              className="w-full text-xs border border-slate-300 rounded-md py-1.5 px-2 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-hidden truncate"
                            >
                              {masterBarang.map(b => (
                                <option key={b.id} value={b.id}>
                                  {b.namaBarang} (Stok: {b.stokSekarang} {b.satuan})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-[11px] font-medium text-teal-800 bg-teal-50 p-1 rounded border border-teal-200 flex items-center gap-1">
                              <Check className="w-3 h-3 text-teal-600" />
                              Mode Siap: {masterBarang.length} Halaman Siap Dicetak
                            </div>
                          )}

                          {/* Periode filter */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <select
                              value={kartuPeriodFilter.type}
                              onChange={(e) => onUpdateKartuPeriodFilter({
                                ...kartuPeriodFilter,
                                type: e.target.value as KartuBarangPeriodType
                              })}
                              className="text-xs border border-slate-300 rounded-md py-1 px-1.5 bg-white text-slate-800 font-medium"
                            >
                              <option value="bulan">Per Bulan</option>
                              <option value="triwulan">Triwulan</option>
                              <option value="semester">Semester</option>
                              <option value="tahun">Per Tahun</option>
                            </select>

                            <select
                              value={kartuPeriodFilter.year}
                              onChange={(e) => onUpdateKartuPeriodFilter({
                                ...kartuPeriodFilter,
                                year: Number(e.target.value)
                              })}
                              className="text-xs border border-slate-300 rounded-md py-1 px-1.5 bg-white text-slate-800 font-semibold"
                            >
                              {TAHUN_ANGGARAN_OPTIONS.map((y) => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Parameter for BAST Stock Opname */}
                      {isStockOpname && (
                        <div className="space-y-1.5 bg-white/80 p-2.5 rounded-lg border border-slate-200/90 text-xs">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                            <span className="flex items-center gap-1 text-slate-600">
                              <PackageCheck className="w-3 h-3 text-purple-600" />
                              Posisi Cut-Off Pemeriksaan Fisik:
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            <select
                              value={selectedMonth}
                              onChange={(e) => onSelectMonth(Number(e.target.value))}
                              className="text-xs border border-slate-300 rounded-md py-1.5 px-2 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-hidden"
                            >
                              <option value={-1}>Posisi Akhir Tahun</option>
                              {MONTHS_ID.map((m, idx) => (
                                <option key={m} value={idx}>Akhir {m}</option>
                              ))}
                            </select>

                            <select
                              value={selectedYear}
                              onChange={(e) => onSelectYear(Number(e.target.value))}
                              className="text-xs border border-slate-300 rounded-md py-1.5 px-2 bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-hidden"
                            >
                              {TAHUN_ANGGARAN_OPTIONS.map((y) => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Parameter for Laporan Induk BOS & Rekap Kodering */}
                      {isIndukBOS && (
                        <div className="space-y-1.5 bg-white/80 p-2.5 rounded-lg border border-slate-200/90 text-xs">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                            <span className="flex items-center gap-1 text-slate-600">
                              <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                              Tahun Anggaran BOS:
                            </span>
                            <span className="font-mono text-slate-500">12 Bulan (Jan - Des)</span>
                          </div>

                          <select
                            value={selectedYear}
                            onChange={(e) => onSelectYear(Number(e.target.value))}
                            className="w-full text-xs border border-slate-300 rounded-md py-1.5 px-2 bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden"
                          >
                            {TAHUN_ANGGARAN_OPTIONS.map((y) => (
                              <option key={y} value={y}>Tahun Anggaran {y}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Bottom Section: Primary Action Buttons */}
                    <div className="pt-2 flex items-center gap-2">
                      {/* Special for Berkas Bundel */}
                      {card.id === 'bundle' ? (
                        <div className="w-full grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handlePreview('bundle')}
                            className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                              isActive
                                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintCard('bundle')}
                            className="py-2 px-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-98"
                            title="Cetak sekaligus 4 dokumen (NPB, SPB, SPPB, BAST) dalam 1 alur transaksi"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak Semua Berkas</span>
                          </button>
                        </div>
                      ) : isIndukBOS ? (
                        /* Special for Sheet BOS & Rekap Kodering: Excel export button + Preview */
                        <div className="w-full grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handlePreview(card.id)}
                            className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                              isActive
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={onExportExcelBOS}
                            disabled={isExportingBOS}
                            className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg border border-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 disabled:opacity-50"
                            title="Ekspor ke format Excel (.xlsx)"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{isExportingBOS ? 'Ekspor...' : 'Export Excel'}</span>
                          </button>
                        </div>
                      ) : (
                        /* Standard Action Buttons: Preview & Cetak */
                        <div className="w-full grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handlePreview(card.id)}
                            className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                              isActive
                                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintCard(card.id)}
                            className="py-2 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg border border-blue-600 transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak {card.orientation === 'Landscape' ? 'Landscape' : 'A4'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {displayedCards.length === 0 && (
              <div className="py-12 text-center bg-slate-50 rounded-xl border border-slate-200">
                <Search className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Tidak ada dokumen yang cocok dengan kata kunci &quot;{searchQuery}&quot;</p>
                <button
                  onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                  className="mt-2 text-xs font-medium text-blue-600 hover:underline"
                >
                  Reset Filter & Pencarian
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
