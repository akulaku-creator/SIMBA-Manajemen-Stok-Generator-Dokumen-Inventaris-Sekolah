import {
  Boxes,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileText,
  Info,
  Package,
  Printer,
  Search,
  ShieldCheck
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {
  Barang,
  DocumentType,
  KartuBarangPeriodFilter,
  Pejabat,
  TAHUN_ANGGARAN_OPTIONS,
  TransaksiPenerimaan,
  TransaksiPengeluaran
} from '../types';
import { ALL_DOCUMENTS_CATALOG } from './DocumentListView';
import { formatRupiah, MONTHS_ID } from '../utils/numberGenerator';
import { buildVerificationData, DocTypeShort } from '../utils/qrVerificationHelper';
import { computeKartuPersediaanData } from './documents/DocKartuPersediaan';

interface Props {
  selectedDocType: DocumentType;
  // Transactions
  transaksiList: TransaksiPengeluaran[];
  filteredTransaksiList?: TransaksiPengeluaran[];
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
  // Pejabat & Signatory Selection
  pejabatList: Pejabat[];
  selectedKepalaSekolahId?: string;
  onSelectKepalaSekolah?: (id: string) => void;
  selectedPengurusBarangId?: string;
  onSelectPengurusBarang?: (id: string) => void;
  // Receipts
  transaksiPenerimaanList?: TransaksiPenerimaan[];
  // Excel BOS
  onExportExcelBOS?: () => void;
  isExportingBOS?: boolean;
  onFocusPreview?: () => void;
}

export const DocumentDetailPanel: React.FC<Props> = ({
  selectedDocType,
  transaksiList,
  filteredTransaksiList,
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
  pejabatList,
  selectedKepalaSekolahId,
  onSelectKepalaSekolah,
  selectedPengurusBarangId,
  onSelectPengurusBarang,
  transaksiPenerimaanList = [],
  onExportExcelBOS,
  isExportingBOS = false,
  onFocusPreview
}) => {
  const [isDescOpen, setIsDescOpen] = useState(false);
  const [barangSearchQuery, setBarangSearchQuery] = useState('');

  const docConfig = ALL_DOCUMENTS_CATALOG.find(d => d.id === selectedDocType) || ALL_DOCUMENTS_CATALOG[0];
  
  // Use reactive filtered transactions if provided, fallback to raw transaksiList
  const activeFilteredTrxList = filteredTransaksiList ?? transaksiList;
  const activeTrx = activeFilteredTrxList.find(t => t.id === selectedTransaksiId);

  const isOperasional = docConfig.category === 'operasional';
  const isKartuBarang = selectedDocType === 'kartu_barang';
  const isKartuPersediaan = selectedDocType === 'kartu_persediaan';
  const isIndukBOS = docConfig.category === 'induk';

  // Resolved single selected item
  const selectedBarang = useMemo(() => {
    return masterBarang.find(b => b.id === selectedBarangId) || masterBarang[0];
  }, [masterBarang, selectedBarangId]);

  // Filtered barang list for search
  const filteredBarangList = useMemo(() => {
    if (!barangSearchQuery.trim()) return masterBarang;
    const q = barangSearchQuery.toLowerCase();
    return masterBarang.filter(b => 
      b.namaBarang.toLowerCase().includes(q) ||
      b.kodeBarang.toLowerCase().includes(q) ||
      (b.nusp && b.nusp.toLowerCase().includes(q)) ||
      (b.spesifikasi && b.spesifikasi.toLowerCase().includes(q))
    );
  }, [masterBarang, barangSearchQuery]);

  // Compute live stock summary for selected item (identical to preview & PDF)
  const kartuPersediaanData = useMemo(() => {
    if (!selectedBarang || !isKartuPersediaan) return null;
    return computeKartuPersediaanData(
      selectedBarang,
      transaksiPenerimaanList,
      transaksiList,
      selectedMonth,
      selectedYear
    );
  }, [selectedBarang, isKartuPersediaan, transaksiPenerimaanList, transaksiList, selectedMonth, selectedYear]);

  const formatDateIndo = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
      {/* Header Panel: Judul Dokumen Aktif */}
      <div className="p-3 sm:p-3.5 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                {isKartuPersediaan ? 'LAMPIRAN 13' : docConfig.code}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                {isKartuPersediaan ? 'Standar BMD' : (docConfig.badgeLegal || 'Standar Penatausahaan')}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {docConfig.paperSize} • {docConfig.orientation}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                Tahun Anggaran {selectedYear}
              </span>
            </div>

            <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
              {isKartuPersediaan ? 'KARTU PERSEDIAAN BARANG' : docConfig.title}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Tombol Collapsible Maksud & Dasar Hukum Dokumen */}
            <button
              type="button"
              onClick={() => setIsDescOpen(!isDescOpen)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                isDescOpen
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200 shadow-2xs'
              }`}
              title="Tampilkan / Sembunyikan Deskripsi & Maksud Dokumen"
            >
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Info</span>
              {isDescOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {onFocusPreview && (
              <button
                type="button"
                onClick={onFocusPreview}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-600 font-semibold text-xs rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                title="Buka pratinjau lembar kertas dokumen"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pratinjau</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Info Dokumen */}
        {isDescOpen && (
          <div className="mt-2.5 p-2.5 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-slate-700 animate-in fade-in duration-150">
            <div className="flex items-start gap-2">
              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {isKartuPersediaan 
                  ? 'Kartu persediaan barang memuat riwayat mutasi per komoditas barang inventaris sekolah dengan saldo awal, rincian barang masuk/keluar, dan saldo akhir tahun anggaran berjalan.'
                  : docConfig.description}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* KONTEN PANEL: WORKFLOW SPESIFIK KARTU PERSEDIAAN ATAU WORKFLOW DOKUMEN LAIN */}
      {isKartuPersediaan ? (
        /* =========================================================================
           DEDICATED FOCUSED WORKFLOW FOR KARTU PERSEDIAAN BARANG (LAMPIRAN 13)
           1. Cari & Pilih 1 Barang
           2. Tampilkan Identitas Barang (Kode Barang & NUSP Terpisah)
           3. Ringkasan Stok Aktual (Saldo Awal, Masuk, Keluar, Saldo Akhir, Nilai Saldo)
           4. Tombol Aksi Bersih: [Pratinjau] [Cetak / Download PDF] [Cetak Semua Kartu]
           ========================================================================= */
        <div className="p-3 sm:p-3.5 space-y-3 overflow-y-auto max-h-[640px] text-xs">
          
          {/* 1. PEMILIHAN BARANG BERFOKUS PADA 1 BARANG */}
          <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-600" />
                <span>Pilih Barang Persediaan</span>
              </label>
              <span className="text-[10px] text-slate-500 font-medium">
                {filteredBarangList.length} dari {masterBarang.length} komoditas
              </span>
            </div>

            {/* Input Pencarian Barang */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={barangSearchQuery}
                onChange={(e) => setBarangSearchQuery(e.target.value)}
                placeholder="Cari kode barang / nama barang / NUSP..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Dropdown Hasil Pencarian */}
            <select
              value={selectedBarang?.id || ''}
              onChange={(e) => onSelectBarang(e.target.value)}
              className="w-full py-2 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
            >
              {filteredBarangList.map(b => (
                <option key={b.id} value={b.id}>
                  {b.namaBarang} (Kode: {b.kodeBarang} | NUSP: {b.nusp || '-'})
                </option>
              ))}
            </select>

            {/* Detail Identitas Barang Terpilih: Kode Barang & NUSP Terpisah */}
            {selectedBarang && (
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Nama Barang:</span>
                  <span className="font-bold text-slate-900">{selectedBarang.namaBarang}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Kode Barang:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedBarang.kodeBarang}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">NUSP:</span>
                  <span className="font-mono font-bold text-blue-900">{selectedBarang.nusp || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Spesifikasi:</span>
                  <span className="text-slate-700">{selectedBarang.spesifikasi || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Satuan:</span>
                  <span className="font-semibold text-slate-800">{selectedBarang.satuan}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">Harga Satuan:</span>
                  <span className="font-mono font-bold text-slate-900">{formatRupiah(selectedBarang.hargaSatuan)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 2. PILIH PERIODE (REAL-TIME FILTER BULAN & TAHUN) */}
          <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>2. Pilih Periode Laporan</span>
              </label>
              <span className="text-[10px] text-blue-700 font-semibold bg-blue-100/70 px-2 py-0.5 rounded font-mono">
                {selectedMonth === -1 ? '1 Tahun' : (selectedMonth >= 101 ? `Triwulan ${selectedMonth - 100}` : MONTHS_ID[selectedMonth])} {selectedYear}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="filter_kartu_bulan" className="text-[10px] font-semibold text-slate-500 block mb-1">
                  Bulan / Triwulan:
                </label>
                <select
                  id="filter_kartu_bulan"
                  value={selectedMonth}
                  onChange={(e) => onSelectMonth(Number(e.target.value))}
                  className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                >
                  <option value={-1}>1 Tahun Penuh</option>
                  <option value={101}>Triwulan I (Jan - Mar)</option>
                  <option value={102}>Triwulan II (Apr - Jun)</option>
                  <option value={103}>Triwulan III (Jul - Sep)</option>
                  <option value={104}>Triwulan IV (Okt - Des)</option>
                  {MONTHS_ID.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter_kartu_tahun" className="text-[10px] font-semibold text-slate-500 block mb-1">
                  Tahun Anggaran:
                </label>
                <select
                  id="filter_kartu_tahun"
                  value={selectedYear}
                  onChange={(e) => onSelectYear(Number(e.target.value))}
                  className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                >
                  {TAHUN_ANGGARAN_OPTIONS.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 3. RINGKASAN STOK BARANG TERPILIH */}
          {kartuPersediaanData && selectedBarang && (
            <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-blue-600" />
                  <span>3. Ringkasan Stok Periode Ini</span>
                </h3>
                <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                  {selectedBarang.satuan}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-blue-100 space-y-2 text-xs shadow-2xs">
                {/* Saldo Awal */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Saldo Awal:</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-800">
                      {kartuPersediaanData.sisaQtyAwal} {selectedBarang.satuan}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 block">
                      {formatRupiah(kartuPersediaanData.sisaRpAwal)}
                    </span>
                  </div>
                </div>

                {/* Masuk */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Total Masuk:</span>
                  <div className="text-right">
                    <span className="font-bold text-emerald-700">
                      +{kartuPersediaanData.totalMasuk} {selectedBarang.satuan}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 block">
                      +{formatRupiah(kartuPersediaanData.totalBertambahRp)}
                    </span>
                  </div>
                </div>

                {/* Keluar */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Total Keluar:</span>
                  <div className="text-right">
                    <span className="font-bold text-rose-700">
                      -{kartuPersediaanData.totalKeluar} {selectedBarang.satuan}
                    </span>
                    <span className="text-[10px] font-mono text-rose-600 block">
                      -{formatRupiah(kartuPersediaanData.totalBerkurangRp)}
                    </span>
                  </div>
                </div>

                {/* Saldo Akhir Qty */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                  <span className="font-bold text-slate-900">Saldo Akhir:</span>
                  <span className="font-black text-blue-950 text-sm">
                    {kartuPersediaanData.saldoAkhirQty} {selectedBarang.satuan}
                  </span>
                </div>

                {/* Nilai Saldo Akhir Rp */}
                <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-200">
                  <span className="text-slate-600 font-medium">Nilai Saldo Akhir:</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">
                    {formatRupiah(kartuPersediaanData.saldoAkhirRp)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. AKSI & CETAK DOKUMEN */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              {onFocusPreview && (
                <button
                  type="button"
                  onClick={onFocusPreview}
                  className="w-full py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span>Pratinjau</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Download PDF</span>
              </button>
            </div>

            {/* Tombol Terpisah Cetak Semua Kartu Persediaan */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onToggleBatchPrintAll(!isBatchPrintAll)}
                className={`w-full py-1.5 px-3 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer ${
                  isBatchPrintAll
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {isBatchPrintAll 
                  ? `Mode Cetak: Semua Barang Aktif (${masterBarang.length} Kartu) • Klik untuk kembali ke 1 Barang` 
                  : `Cetak Semua Kartu Persediaan (${masterBarang.length} Barang)`}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
           EXISTING WORKFLOW FOR OPERATIONAL DOCUMENTS & OTHER REPORT SHEETS
           ========================================================================= */
        <div className="p-3 sm:p-3.5 space-y-3 overflow-y-auto max-h-[640px] text-xs">

          {/* 1. SINGLE-LINE INFO STAT */}
          <div className="bg-slate-50/90 border border-slate-200 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 shadow-2xs">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-[11px]">
                Total Penyaluran: <strong id="stat_total_trx" className="text-slate-900 font-bold">{activeFilteredTrxList.length}</strong> Transaksi
              </span>
            </div>
            <div className="hidden sm:block h-3.5 w-px bg-slate-300 shrink-0" />
            <div className="flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[11px]">Komoditas: <strong className="text-slate-900 font-bold">{masterBarang.length} Item</strong></span>
            </div>
            <div className="hidden sm:block h-3.5 w-px bg-slate-300 shrink-0" />
            <div className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-[11px]">Penerimaan: <strong className="text-slate-900 font-bold">{transaksiPenerimaanList.length} Faktur</strong></span>
            </div>
          </div>

          {/* OPSI FILTER PERIODE & TRANSAKSI */}
          <div className="bg-blue-50/30 p-3.5 rounded-xl border border-blue-100/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Periode &amp; Transaksi</span>
              </h3>
              <span className="text-[10px] text-blue-700 font-semibold bg-blue-100/60 px-1.5 py-0.5 rounded font-mono">
                {activeFilteredTrxList.length} Trx
              </span>
            </div>

            {/* PERIODE: Filter Bulan & Tahun */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="filter_bulan" className="text-[10px] font-semibold text-slate-500 block mb-1">
                  Bulan / Triwulan:
                </label>
                <select
                  id="filter_bulan"
                  value={selectedMonth}
                  onChange={(e) => onSelectMonth(Number(e.target.value))}
                  className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                >
                  <option value={-1}>1 Tahun Penuh</option>
                  <option value={101}>Triwulan I (Jan - Mar)</option>
                  <option value={102}>Triwulan II (Apr - Jun)</option>
                  <option value={103}>Triwulan III (Jul - Sep)</option>
                  <option value={104}>Triwulan IV (Okt - Des)</option>
                  {MONTHS_ID.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter_tahun" className="text-[10px] font-semibold text-slate-500 block mb-1">
                  Tahun Anggaran:
                </label>
                <select
                  id="filter_tahun"
                  value={selectedYear}
                  onChange={(e) => onSelectYear(Number(e.target.value))}
                  className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                >
                  {TAHUN_ANGGARAN_OPTIONS.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transaksi Diterbitkan (untuk Dokumen Operasional) */}
            {isOperasional && (
              <div className="pt-1 space-y-2">
                <div>
                  <label htmlFor="select_transaksi" className="text-[10px] font-semibold text-slate-500 block mb-1">
                    Transaksi Diterbitkan:
                  </label>
                  <select
                    id="select_transaksi"
                    value={activeFilteredTrxList.length > 0 ? (selectedTransaksiId || activeTrx?.id || '') : ''}
                    onChange={(e) => onSelectTransaksi(e.target.value)}
                    disabled={activeFilteredTrxList.length === 0}
                    className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold text-xs focus:outline-hidden focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer truncate"
                  >
                    {activeFilteredTrxList.length === 0 ? (
                      <option value="">-- Tidak ada transaksi pada periode ini --</option>
                    ) : (
                      activeFilteredTrxList.map((t) => (
                        <option key={t.id} value={t.id}>
                          #{t.nomorUrut} - {t.unitPemohon} ({t.items.length} item)
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Ringkasan Konteks Transaksi Aktif */}
                {activeTrx && (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Unit Pemohon:</span>
                      <strong className="text-slate-900 font-semibold">{activeTrx.unitPemohon}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Tanggal:</span>
                      <strong className="text-slate-900 font-semibold">{formatDateIndo(activeTrx.tanggal || activeTrx.tanggalSurat)}</strong>
                    </div>
                  </div>
                )}

                {/* QR Code Verification Indicator */}
                {activeTrx && (
                  <div className="p-2 bg-emerald-50/90 border border-emerald-200 rounded-lg flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="p-1 bg-emerald-100 rounded text-emerald-700 shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="text-[10px] font-bold text-emerald-950 flex items-center gap-1">
                          QR Code Terverifikasi Aktif
                        </div>
                        <div className="text-[9px] text-emerald-700 font-mono truncate">
                          Validitas TTE Digital SIMBA
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const docShort: DocTypeShort = selectedDocType === 'npb' ? 'NPB' : selectedDocType === 'spb' ? 'SPB' : selectedDocType === 'sppb' ? 'SPPB' : 'BAST';
                        const docNo = docShort === 'NPB' ? activeTrx.noNPB : docShort === 'SPB' ? activeTrx.noSPB : docShort === 'SPPB' ? activeTrx.noSPPB : activeTrx.noBAST;
                        const verifData = buildVerificationData(docShort, activeTrx, docNo);
                        window.dispatchEvent(new CustomEvent('simba:verify-doc', { detail: { ...verifData, transaksi: activeTrx } }));
                      }}
                      className="px-2 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-xs transition-colors shrink-0 cursor-pointer"
                      title="Klik untuk membuka jendela verifikasi keaslian dokumen"
                    >
                      Cek Validasi
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Pemilihan Komoditas untuk Kartu Barang (Lampiran 12) */}
            {isKartuBarang && (
              <div className="pt-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500">Pilih Komoditas:</span>
                  <div className="inline-flex bg-white rounded-lg p-0.5 border border-slate-300">
                    <button
                      type="button"
                      onClick={() => onToggleBatchPrintAll(false)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                        !isBatchPrintAll ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      1 Barang
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleBatchPrintAll(true)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                        isBatchPrintAll ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Semua ({masterBarang.length})
                    </button>
                  </div>
                </div>

                {!isBatchPrintAll && (
                  <select
                    value={selectedBarangId}
                    onChange={(e) => onSelectBarang(e.target.value)}
                    className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium text-xs focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer truncate"
                  >
                    {masterBarang.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.namaBarang} (Stok: {b.stokSekarang} {b.satuan})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Ekspor Format Excel BOS jika relevan */}
            {isIndukBOS && onExportExcelBOS && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onExportExcelBOS}
                  disabled={isExportingBOS}
                  className="w-full py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExportingBOS ? 'Mengekspor Excel...' : 'Ekspor Format Resmi Excel (.xlsx)'}</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. RINCIAN BARANG DOKUMEN OPERASIONAL TERPILIH (JIKA ADA TRANSAKSI AKTIF) */}
          {isOperasional && activeTrx && (
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  Rincian Barang Terlampir
                </span>
                <span className="font-mono text-slate-500 font-normal text-[10px]">
                  {activeTrx.items.length} Barang
                </span>
              </h3>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="max-h-36 overflow-y-auto">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                      <tr>
                        <th className="py-1 px-2">No</th>
                        <th className="py-1 px-2">Nama Barang</th>
                        <th className="py-1 px-2 text-right">Jumlah</th>
                        <th className="py-1 px-2">Satuan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeTrx.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-1 px-2 text-slate-500">{idx + 1}</td>
                          <td className="py-1 px-2 font-medium text-slate-800">
                            {item.namaBarang}
                            {item.kodeBarang && (
                              <span className="block text-[8.5px] text-slate-400 font-mono">
                                {item.kodeBarang}
                              </span>
                            )}
                          </td>
                          <td className="py-1 px-2 text-right font-bold text-slate-900">
                            {item.usulanJumlah || item.jumlah}
                          </td>
                          <td className="py-1 px-2 text-slate-600">
                            {item.satuan}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
