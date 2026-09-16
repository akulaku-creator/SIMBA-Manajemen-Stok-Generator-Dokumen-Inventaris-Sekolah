import {
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileStack,
  FileText,
  HelpCircle,
  Info,
  Layers,
  Package,
  Printer,
  ShieldCheck,
  Sparkles,
  Table,
  Tag,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users
} from 'lucide-react';
import React, { useState } from 'react';
import {
  Barang,
  DocumentType,
  KartuBarangPeriodFilter,
  KartuBarangPeriodType,
  Pejabat,
  TAHUN_ANGGARAN_OPTIONS,
  TransaksiPenerimaan,
  TransaksiPengeluaran
} from '../types';
import { ALL_DOCUMENTS_CATALOG } from './DocumentListView';
import { MONTHS_ID } from '../utils/numberGenerator';

interface Props {
  selectedDocType: DocumentType;
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
  // Pejabat
  pejabatList: Pejabat[];
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
  transaksiPenerimaanList = [],
  onExportExcelBOS,
  isExportingBOS = false,
  onFocusPreview
}) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isDescOpen, setIsDescOpen] = useState(false);

  const docConfig = ALL_DOCUMENTS_CATALOG.find(d => d.id === selectedDocType) || ALL_DOCUMENTS_CATALOG[0];
  const activeTrx = transaksiList.find(t => t.id === selectedTransaksiId) || transaksiList[0];
  const activeBarang = masterBarang.find(b => b.id === selectedBarangId) || masterBarang[0];

  const kepalaSekolah = pejabatList.find(p => p.role === 'kepala_sekolah');
  const pengurusBarang = pejabatList.find(p => p.role === 'pengurus_barang');

  const isOperasional = docConfig.category === 'operasional';
  const isLaporanMutasi = docConfig.category === 'laporan';
  const isKartuBarang = selectedDocType === 'kartu_barang' || selectedDocType === 'kartu_persediaan';
  const isStockOpname = selectedDocType === 'bast_stock_opname';
  const isIndukBOS = docConfig.category === 'induk';

  const copyDocNumbers = () => {
    if (!activeTrx) return;
    const text = `NPB: ${activeTrx.noNPB}\nSPB: ${activeTrx.noSPB}\nSPPB: ${activeTrx.noSPPB}\nBAST: ${activeTrx.noBAST}`;
    navigator.clipboard.writeText(text);
    setCopiedText('Nomor Surat Disalin!');
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
      {/* Header Panel: Tempat Tunggal Penampilan Judul Dokumen (Google Enterprise Style) */}
      <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                {docConfig.code}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                {docConfig.badgeLegal || 'Standar Penatausahaan'}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {docConfig.paperSize} • {docConfig.orientation}
              </span>
            </div>

            {/* Judul Dokumen Utama (Hanya ditampilkan di sini, tidak berulang di action bar) */}
            <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
              {docConfig.title}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Tombol Collapsible Maksud & Deskripsi Dokumen */}
            <button
              type="button"
              onClick={() => setIsDescOpen(!isDescOpen)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                isDescOpen
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200 shadow-2xs'
              }`}
              title="Tampilkan / Sembunyikan Deskripsi & Maksud Dokumen"
            >
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Maksud Dokumen</span>
              {isDescOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {onFocusPreview && (
              <button
                type="button"
                onClick={onFocusPreview}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-600 font-semibold text-xs rounded-lg border border-slate-200 shadow-2xs transition-colors"
                title="Buka pratinjau lembar kertas dokumen"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pratinjau</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Deskripsi & Regulasi Dokumen */}
        {isDescOpen && (
          <div className="mt-2.5 p-2.5 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-slate-700 animate-in fade-in duration-150">
            <div className="flex items-start gap-2">
              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {docConfig.description}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Konten Detail Dokumen: Parameter & Rantai Dokumen Ditarik Lebih Tinggi */}
      <div className="p-3 sm:p-4 space-y-4 overflow-y-auto max-h-[620px] text-xs">
        
        {/* 1. Pengaturan Parameter Dokumen (Tampil Paling Atas Tanpa Terhalang Deskripsi) */}
        <div className="space-y-2.5 bg-blue-50/30 p-3 rounded-xl border border-blue-100/80">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Pengaturan Parameter Dokumen</span>
            </h3>
            {isOperasional && (
              <span className="font-mono text-[10px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.2 rounded">
                Total {transaksiList.length} Transaksi
              </span>
            )}
          </div>

          {/* Parameter untuk Dokumen Operasional (NPB, SPB, SPPB, BAST, Bundle) */}
          {isOperasional && (
            <div className="space-y-2.5">
              <label className="font-semibold text-slate-700 flex items-center justify-between">
                <span>Pilih Transaksi yang Dibuat Dokumennya:</span>
                <span className="font-mono text-[10px] text-slate-500">
                  Total {transaksiList.length} Transaksi
                </span>
              </label>

              <select
                value={selectedTransaksiId}
                onChange={(e) => onSelectTransaksi(e.target.value)}
                className="w-full py-2 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              >
                {transaksiList.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.nomorUrut} - {t.unitPemohon} ({t.items.length} item) | {t.tanggalSurat}
                  </option>
                ))}
              </select>

              {activeTrx && (
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Unit Kerja Pemohon:</span>
                    <span className="font-bold text-slate-800">{activeTrx.unitPemohon}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Tanggal Transaksi:</span>
                    <span className="font-semibold text-slate-700">{activeTrx.tanggalSurat}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-500 font-medium shrink-0">Keperluan Penggunaan:</span>
                    <span className="text-right text-slate-800 font-medium">{activeTrx.keperluan || 'Operasional Sekolah'}</span>
                  </div>

                  {/* Rantai Nomor Surat */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-700">Rantai Nomor Surat Dinas:</span>
                      <button
                        type="button"
                        onClick={copyDocNumbers}
                        className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold flex items-center gap-1"
                      >
                        {copiedText ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">{copiedText}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin Nomor</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                      <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                        <span className="text-slate-500 block">NPB:</span>
                        <span className="font-semibold text-slate-800 truncate block">{activeTrx.noNPB}</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                        <span className="text-slate-500 block">SPB:</span>
                        <span className="font-semibold text-slate-800 truncate block">{activeTrx.noSPB}</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                        <span className="text-slate-500 block">SPPB:</span>
                        <span className="font-semibold text-slate-800 truncate block">{activeTrx.noSPPB}</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                        <span className="text-slate-500 block">BAST:</span>
                        <span className="font-semibold text-blue-700 truncate block">{activeTrx.noBAST}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Parameter untuk Laporan Mutasi (Penerimaan, Pengeluaran, Rekapitulasi) */}
          {isLaporanMutasi && (
            <div className="space-y-2">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Periode Laporan Mutasi:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => onSelectMonth(Number(e.target.value))}
                  className="py-1.5 px-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
                >
                  <option value={-1}>Akumulasi 1 Tahun Penuh</option>
                  <option value={2}>Triwulan I (Jan - Mar)</option>
                  <option value={5}>Triwulan II (Apr - Jun)</option>
                  <option value={8}>Triwulan III (Jul - Sep)</option>
                  <option value={11}>Triwulan IV (Okt - Des)</option>
                  {MONTHS_ID.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => onSelectYear(Number(e.target.value))}
                  className="py-1.5 px-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
                >
                  {TAHUN_ANGGARAN_OPTIONS.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Parameter untuk Kartu Barang & Kartu Persediaan */}
          {isKartuBarang && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Mode Cetak Kartu:</span>
                <div className="inline-flex bg-white rounded-lg p-0.5 border border-slate-300">
                  <button
                    type="button"
                    onClick={() => onToggleBatchPrintAll(false)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      !isBatchPrintAll ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    1 Barang
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleBatchPrintAll(true)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      isBatchPrintAll ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Cetak Semua ({masterBarang.length})
                  </button>
                </div>
              </div>

              {!isBatchPrintAll ? (
                <div className="space-y-1">
                  <span className="text-slate-600 font-medium">Pilih Komoditas Barang:</span>
                  <select
                    value={selectedBarangId}
                    onChange={(e) => onSelectBarang(e.target.value)}
                    className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
                  >
                    {masterBarang.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.namaBarang} (Stok: {b.stokSekarang} {b.satuan}) - {b.kodeRekening}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-purple-100/70 text-purple-900 p-2 rounded-lg text-[11px] font-medium border border-purple-200">
                  Mode batch aktif: {masterBarang.length} lembar kartu barang akan dicetak sekaligus dengan pemisah halaman otomatis.
                </div>
              )}

              {/* Filter Periode Kartu */}
              <div className="space-y-1">
                <span className="text-slate-600 font-medium">Rentang Waktu Laporan:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={kartuPeriodFilter.type}
                    onChange={(e) => onUpdateKartuPeriodFilter({ ...kartuPeriodFilter, type: e.target.value as any })}
                    className="py-1 px-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium text-xs"
                  >
                    <option value="bulan">Per Bulan</option>
                    <option value="triwulan">Triwulan (3 Bulan)</option>
                    <option value="semester">Semester (6 Bulan)</option>
                    <option value="tahun">1 Tahun Penuh</option>
                  </select>

                  <select
                    value={kartuPeriodFilter.year}
                    onChange={(e) => onUpdateKartuPeriodFilter({ ...kartuPeriodFilter, year: Number(e.target.value) })}
                    className="py-1 px-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold text-xs"
                  >
                    {TAHUN_ANGGARAN_OPTIONS.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Parameter untuk BAST Stock Opname */}
          {isStockOpname && (
            <div className="space-y-2">
              <label className="font-semibold text-slate-700">Tanggal Cut-Off Pemeriksaan Fisik:</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => onSelectMonth(Number(e.target.value))}
                  className="py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
                >
                  <option value={-1}>Posisi Akhir Tahun</option>
                  {MONTHS_ID.map((m, idx) => (
                    <option key={m} value={idx}>Akhir {m}</option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => onSelectYear(Number(e.target.value))}
                  className="py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold"
                >
                  {TAHUN_ANGGARAN_OPTIONS.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Parameter untuk Laporan Induk BOS & Rekap Kodering */}
          {isIndukBOS && (
            <div className="space-y-2">
              <label className="font-semibold text-slate-700">Tahun Anggaran BOS:</label>
              <select
                value={selectedYear}
                onChange={(e) => onSelectYear(Number(e.target.value))}
                className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
              >
                {TAHUN_ANGGARAN_OPTIONS.map((year) => (
                  <option key={year} value={year}>Tahun Anggaran {year}</option>
                ))}
              </select>

              {onExportExcelBOS && (
                <button
                  type="button"
                  onClick={onExportExcelBOS}
                  disabled={isExportingBOS}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExportingBOS ? 'Mengekspor...' : 'Ekspor Format Resmi Excel (.xlsx)'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3. Lampiran & Rincian Barang (Attachments) */}
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-blue-600" />
              Lampiran & Rincian Barang Terlampir
            </span>
            {isOperasional && activeTrx && (
              <span className="font-mono text-slate-500 font-normal">
                {activeTrx.items.length} Barang
              </span>
            )}
          </h3>

          {isOperasional && activeTrx ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                    <tr>
                      <th className="py-1.5 px-2.5">No</th>
                      <th className="py-1.5 px-2.5">Nama Barang</th>
                      <th className="py-1.5 px-2.5 text-right">Jumlah</th>
                      <th className="py-1.5 px-2.5">Satuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeTrx.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-1.5 px-2.5 text-slate-500">{idx + 1}</td>
                        <td className="py-1.5 px-2.5 font-medium text-slate-800">
                          {item.namaBarang}
                          {item.kodeBarang && (
                            <span className="block text-[9px] text-slate-400 font-mono">
                              {item.kodeBarang}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-bold text-slate-900">
                          {item.jumlah}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-600">
                          {item.satuan}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">Total Komoditas Persediaan:</span>
                <span className="font-bold text-slate-900">{masterBarang.length} Item</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Transaksi Masuk:</span>
                <span className="font-bold text-slate-900">{transaksiPenerimaanList.length} Faktur</span>
              </div>
            </div>
          )}
        </div>

        {/* 4. Pihak Penandatangan Berwenang */}
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            Pihak Penandatangan Berwenang
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Kuasa Pengguna Barang</span>
              <span className="font-bold text-slate-900 block truncate">
                {kepalaSekolah?.nama || 'Kepala Sekolah'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono block truncate">
                NIP: {kepalaSekolah?.nip || '-'}
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Pengurus Barang Pembantu</span>
              <span className="font-bold text-slate-900 block truncate">
                {pengurusBarang?.nama || 'Pengurus Barang'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono block truncate">
                NIP: {pengurusBarang?.nip || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* 5. Riwayat Aktivitas & Status Kesiapan Dokumen */}
        <div className="pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Riwayat Aktivitas & Validasi
          </h3>

          <div className="space-y-1.5 text-slate-500 text-[11px]">
            <div className="flex items-center justify-between">
              <span>Status Format:</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                WYSIWYG Presisi 1:1 (@media print)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Margin Dokumen:</span>
              <span className="font-mono text-slate-700">10mm atas-bawah, 15mm kiri-kanan</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Validasi Penatausahaan:</span>
              <span className="font-medium text-blue-700">Standar Permendagri 19/2016</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
