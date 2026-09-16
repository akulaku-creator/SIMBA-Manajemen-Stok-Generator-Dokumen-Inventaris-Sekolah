import {
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  FileCheck,
  FileSpreadsheet,
  FileStack,
  FileText,
  Filter,
  Layers,
  LayoutGrid,
  PackageCheck,
  Search,
  SlidersHorizontal,
  Sparkles,
  Table,
  TrendingDown,
  TrendingUp,
  X
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { DocumentType } from '../types';

export interface DocumentItemConfig {
  id: DocumentType;
  category: 'operasional' | 'laporan' | 'kartu' | 'induk';
  code: string;
  title: string;
  description: string;
  orientation: 'Portrait' | 'Landscape';
  paperSize: string;
  badgeLegal?: string;
  status: 'Siap Cetak' | 'Terverifikasi' | 'Format Dinas' | 'BOS Aktif';
  icon: React.ComponentType<{ className?: string }>;
}

export const ALL_DOCUMENTS_CATALOG: DocumentItemConfig[] = [
  // 1. Dokumen Operasional (Transaksi Harian)
  {
    id: 'bundle',
    category: 'operasional',
    code: 'PAKET-4IN1',
    title: 'Berkas Bundel Dokumen Operasional (NPB, SPB, SPPB, BAST)',
    description: 'Cetak sekaligus 4 dokumen dalam 1 alur transaksi resmi tanpa perlu membuka satu per satu.',
    orientation: 'Portrait',
    paperSize: 'A4 Portrait (4 Halaman)',
    badgeLegal: 'Siklus Lengkap 1-Klik',
    status: 'Siap Cetak',
    icon: FileStack
  },
  {
    id: 'npb',
    category: 'operasional',
    code: 'DOC-NPB',
    title: '1. Nota Permintaan Barang (NPB)',
    description: 'Dokumen usulan kebutuhan barang dari unit kerja / guru pemohon sebelum diproses surat permintaan resmi.',
    orientation: 'Portrait',
    paperSize: 'A4 Portrait',
    badgeLegal: 'Permendagri No. 19/2016',
    status: 'Siap Cetak',
    icon: FileText
  },
  {
    id: 'spb',
    category: 'operasional',
    code: 'DOC-SPB',
    title: '2. Surat Permintaan Barang (SPB)',
    description: 'Surat permintaan resmi pengeluaran barang persediaan dari Pengurus Barang Pembantu ke Kepala Sekolah.',
    orientation: 'Portrait',
    paperSize: 'A4 Portrait',
    badgeLegal: 'Standar Penatausahaan',
    status: 'Siap Cetak',
    icon: FileCheck
  },
  {
    id: 'sppb',
    category: 'operasional',
    code: 'DOC-SPPB',
    title: '3. Surat Perintah Penyaluran Barang (SPPB)',
    description: 'Instruksi resmi Kepala Sekolah (Kuasa Pengguna Barang) untuk menyalurkan barang persediaan sekolah.',
    orientation: 'Portrait',
    paperSize: 'A4 Portrait',
    badgeLegal: 'Otorisasi Pimpinan',
    status: 'Siap Cetak',
    icon: TrendingDown
  },
  {
    id: 'bast',
    category: 'operasional',
    code: 'DOC-BAST',
    title: '4. Berita Acara Serah Terima (BAST Transaksi)',
    description: 'Bukti serah terima fisik barang persediaan kepada penerima/pemohon dengan tanda tangan bermaterai/sah.',
    orientation: 'Portrait',
    paperSize: 'A4 Portrait',
    badgeLegal: 'Bukti Sah Penerimaan',
    status: 'Siap Cetak',
    icon: Layers
  },

  // 2. Laporan & Buku Mutasi Berkala
  {
    id: 'buku_penerimaan',
    category: 'laporan',
    code: 'BUKU-01',
    title: 'Buku Penerimaan Barang Persediaan',
    description: 'Pencatatan faktur/surat jalan penerimaan barang masuk dari rekanan/toko beserta rincian harga satuan.',
    orientation: 'Landscape',
    paperSize: 'A4 Landscape',
    badgeLegal: 'Buku Mutasi Masuk',
    status: 'Terverifikasi',
    icon: TrendingUp
  },
  {
    id: 'buku_pengeluaran',
    category: 'laporan',
    code: 'BUKU-02',
    title: 'Buku Pengeluaran Barang Persediaan',
    description: 'Rekapitulasi penyaluran barang keluar berdasarkan nomor urut SPPB dan penyerahan kepada masing-masing unit.',
    orientation: 'Landscape',
    paperSize: 'A4 Landscape',
    badgeLegal: 'Buku Mutasi Keluar',
    status: 'Terverifikasi',
    icon: TrendingDown
  },
  {
    id: 'buku_rekap',
    category: 'laporan',
    code: 'BUKU-REKAP',
    title: 'Buku Penerimaan & Pengeluaran (Rekapitulasi)',
    description: 'Rekapitulasi lengkap saldo awal, seluruh mutasi masuk dan keluar, serta sisa stok akhir per item barang.',
    orientation: 'Landscape',
    paperSize: 'A4 Landscape',
    badgeLegal: 'Rekap Saldo Bulanan',
    status: 'Terverifikasi',
    icon: Table
  },

  // 3. Kartu Inventaris & Stock Opname
  {
    id: 'bast_stock_opname',
    category: 'kartu',
    code: 'BAST-OPNAME',
    title: 'BAST Hasil Pemeriksaan Fisik Persediaan (Stock Opname)',
    description: 'Berita acara pemeriksaan fisik persediaan per akhir bulan/semester/tahunan ditandatangani Kepala Sekolah.',
    orientation: 'Portrait',
    paperSize: 'A4 Portrait',
    badgeLegal: 'Standar Audit BPK / BOS',
    status: 'Siap Cetak',
    icon: PackageCheck
  },
  {
    id: 'kartu_barang',
    category: 'kartu',
    code: 'LAMPIRAN-12',
    title: 'Kartu Barang (Lampiran 12)',
    description: 'Kartu riwayat kuantitas fisik mutasi keluar-masuk per komoditas barang persediaan.',
    orientation: 'Landscape',
    paperSize: 'A4 Landscape',
    badgeLegal: 'Lampiran 12 Permendagri',
    status: 'Format Dinas',
    icon: BookOpen
  },
  {
    id: 'kartu_persediaan',
    category: 'kartu',
    code: 'LAMPIRAN-13',
    title: 'Kartu Persediaan Barang (Lampiran 13)',
    description: 'Kartu persediaan lengkap dengan nilai nominal rupiah saldo awal, penerimaan, penggunaan, dan sisa aset.',
    orientation: 'Landscape',
    paperSize: 'A4 Landscape',
    badgeLegal: 'Lampiran 13 Akuntansi',
    status: 'Format Dinas',
    icon: BookOpen
  },

  // 4. Mutasi BHP (Daftar Mutasi Barang Habis Pakai BOS 12 Bulan)
  {
    id: 'mutasi_bos',
    category: 'induk',
    code: 'SHEET-BOS',
    title: 'Mutasi BHP (Daftar Mutasi Barang Habis Pakai BOS 12 Bulan)',
    description: 'Daftar Mutasi Barang Habis Pakai (BHP) Dana BOS akumulasi Januari - Desember format resmi Dinas Pendidikan.',
    orientation: 'Landscape',
    paperSize: 'A4 Landscape / Multi',
    badgeLegal: 'Format Dinas Pendidikan',
    status: 'BOS Aktif',
    icon: FileSpreadsheet
  }
];

interface Props {
  selectedDocType: DocumentType;
  onSelectDocType: (type: DocumentType) => void;
  activeTransactionInfo?: {
    nomorUrut: number;
    unitPemohon: string;
    tanggalSurat: string;
    itemsCount: number;
  };
  activePeriodInfo?: string;
}

export const DocumentListView: React.FC<Props> = ({
  selectedDocType,
  onSelectDocType,
  activeTransactionInfo,
  activePeriodInfo
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'operasional' | 'laporan' | 'kartu' | 'induk'>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return ALL_DOCUMENTS_CATALOG.filter((doc) => {
      // Category filter
      if (activeCategory !== 'all' && doc.category !== activeCategory) {
        return false;
      }
      // Status filter
      if (selectedStatusFilter !== 'all' && doc.status !== selectedStatusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = doc.title.toLowerCase().includes(q);
        const matchesCode = doc.code.toLowerCase().includes(q);
        const matchesDesc = doc.description.toLowerCase().includes(q);
        const matchesLegal = doc.badgeLegal?.toLowerCase().includes(q) || false;
        if (!matchesTitle && !matchesCode && !matchesDesc && !matchesLegal) {
          return false;
        }
      }
      return true;
    });
  }, [activeCategory, selectedStatusFilter, searchQuery]);

  // Counts per category
  const counts = useMemo(() => {
    return {
      all: ALL_DOCUMENTS_CATALOG.length,
      operasional: ALL_DOCUMENTS_CATALOG.filter(d => d.category === 'operasional').length,
      laporan: ALL_DOCUMENTS_CATALOG.filter(d => d.category === 'laporan').length,
      kartu: ALL_DOCUMENTS_CATALOG.filter(d => d.category === 'kartu').length,
      induk: ALL_DOCUMENTS_CATALOG.filter(d => d.category === 'induk').length
    };
  }, []);

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
      {/* Header Search & Filter Bar (Compact Enterprise Dashboard Style) */}
      <div className="p-3 sm:p-3.5 border-b border-slate-100 bg-white">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <LayoutGrid className="w-4 h-4 text-blue-600 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate">
              Katalog Dokumen & Format Dinas
            </h2>
          </div>

          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
            {filteredDocs.length} Dokumen
          </span>
        </div>

        {/* Compact Search Bar & Status Filter */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode atau nama dokumen..."
              className="w-full text-xs pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Hapus pencarian"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="text-[11px] py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:bg-white focus:outline-hidden shrink-0"
          >
            <option value="all">Semua Status</option>
            <option value="BOS Aktif">BOS Aktif</option>
            <option value="Format Dinas">Format Dinas</option>
          </select>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pt-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all border ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            Semua ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('operasional')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all border flex items-center gap-1 ${
              activeCategory === 'operasional'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>Operasional ({counts.operasional})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('laporan')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all border flex items-center gap-1 ${
              activeCategory === 'laporan'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>Mutasi ({counts.laporan})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('kartu')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all border flex items-center gap-1 ${
              activeCategory === 'kartu'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span>Kartu ({counts.kartu})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('induk')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all border flex items-center gap-1 ${
              activeCategory === 'induk'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3 h-3" />
            <span>Mutasi BHP ({counts.induk})</span>
          </button>
        </div>
      </div>

      {/* Compact Document List Rows (Clean, Space-Efficient, Radio + Icon + Code + Title + Format Tag) */}
      <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
        {filteredDocs.map((doc) => {
          const isSelected = selectedDocType === doc.id;
          const IconComponent = doc.icon;

          return (
            <div
              key={doc.id}
              id={`doc-row-${doc.id}`}
              onClick={() => onSelectDocType(doc.id)}
              className={`px-3 py-2 sm:py-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-all border-l-4 ${
                isSelected
                  ? 'bg-blue-50/80 border-blue-600 text-blue-950 font-semibold shadow-2xs'
                  : 'hover:bg-slate-50/90 border-transparent text-slate-700'
              }`}
            >
              {/* Sisi Kiri: Radio + Icon + Code & Title */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Radio Indicator */}
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  isSelected ? 'border-blue-600 bg-blue-600 text-white ring-2 ring-blue-500/20' : 'border-slate-300 bg-white'
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>

                {/* Icon Dokumen */}
                <div className={`p-1.5 rounded-md shrink-0 transition-colors ${
                  isSelected 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  <IconComponent className="w-3.5 h-3.5" />
                </div>

                {/* Document Code & Title in single line */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 shrink-0">
                    {doc.code}
                  </span>
                  <span className={`text-xs truncate ${isSelected ? 'font-bold text-blue-950' : 'font-medium text-slate-800'}`}>
                    {doc.title}
                  </span>
                </div>
              </div>

              {/* Sisi Kanan: Format Tag (A4) + Khusus (BOS) jika relevan, sembunyikan repeated 'Siap Cetak' */}
              <div className="flex items-center gap-1.5 shrink-0">
                {doc.status === 'BOS Aktif' && (
                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    BOS
                  </span>
                )}

                <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${
                  doc.orientation === 'Landscape'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  {doc.paperSize.includes('Multi') ? 'A4 Multi' : doc.orientation === 'Landscape' ? 'A4 L' : 'A4 P'}
                </span>

                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" title="Dokumen terpilih" />
                )}
              </div>
            </div>
          );
        })}

        {filteredDocs.length === 0 && (
          <div className="py-12 px-4 text-center">
            <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Tidak ada dokumen yang sesuai</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Coba gunakan kata kunci pencarian yang lain atau ubah filter kategori.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
                setSelectedStatusFilter('all');
              }}
              className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
