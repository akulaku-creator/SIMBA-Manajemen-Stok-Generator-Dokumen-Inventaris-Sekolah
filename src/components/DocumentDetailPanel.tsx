import {
  Boxes,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Eye,
  FileText,
  Info,
  Package,
  Sparkles,
  Users
} from 'lucide-react';
import React, { useState } from 'react';
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
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isDescOpen, setIsDescOpen] = useState(false);

  const docConfig = ALL_DOCUMENTS_CATALOG.find(d => d.id === selectedDocType) || ALL_DOCUMENTS_CATALOG[0];
  const activeTrx = transaksiList.find(t => t.id === selectedTransaksiId) || transaksiList[0];

  // Resolve current active signatories
  const activeKepsek = pejabatList.find(p => p.id === selectedKepalaSekolahId) ||
    pejabatList.find(p => p.role === 'kepala_sekolah') ||
    pejabatList[0];

  const activePengurus = pejabatList.find(p => p.id === selectedPengurusBarangId) ||
    pejabatList.find(p => p.role === 'pengurus_barang') ||
    pejabatList[1] ||
    pejabatList[0];

  const isOperasional = docConfig.category === 'operasional';
  const isLaporanMutasi = docConfig.category === 'laporan';
  const isKartuBarang = selectedDocType === 'kartu_barang' || selectedDocType === 'kartu_persediaan';
  const isStockOpname = selectedDocType === 'bast_stock_opname';
  const isIndukBOS = docConfig.category === 'induk';

  const copyDocNumbers = () => {
    if (!activeTrx) return;
    const text = `NPB: ${activeTrx.noNPB}\nSPB: ${activeTrx.noSPB}\nSPPB: ${activeTrx.noSPPB}\nBAST: ${activeTrx.noBAST}`;
    navigator.clipboard.writeText(text);
    setCopiedText('Nomor Disalin!');
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
      {/* Header Panel: Judul Dokumen Aktif & Ringkasan Cepat */}
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

            <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
              {docConfig.title}
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
              <span className="hidden sm:inline">Info Dokumen</span>
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
                {docConfig.description}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Konten Card Parameter Ringkas */}
      <div className="p-3 sm:p-4 space-y-3.5 overflow-y-auto max-h-[640px] text-xs">

        {/* 1. RINGKASAN TRANSAKSI DALAM 1 BARIS RINGKAS */}
        <div className="bg-slate-50/90 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-slate-700 shadow-2xs">
          <div className="flex items-center gap-1.5">
            <Boxes className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-[11px]">Komoditas: <strong className="text-slate-900 font-bold">{masterBarang.length} Item</strong></span>
          </div>
          <div className="h-3.5 w-px bg-slate-300 shrink-0" />
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[11px]">Penyaluran: <strong className="text-slate-900 font-bold">{transaksiList.length} Transaksi</strong></span>
          </div>
          <div className="h-3.5 w-px bg-slate-300 shrink-0" />
          <div className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-[11px]">Penerimaan: <strong className="text-slate-900 font-bold">{transaksiPenerimaanList.length} Faktur</strong></span>
          </div>
        </div>

        {/* 2. CARD PARAMETER LAPORAN (Periode Laporan / Filter Spesifik Dokumen) */}
        <div className="space-y-2.5 bg-blue-50/30 p-3 rounded-xl border border-blue-100/80">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Parameter Laporan Dokumen</span>
            </h3>
            <span className="text-[10px] text-blue-700 font-semibold bg-blue-100/60 px-2 py-0.5 rounded">
              {docConfig.code}
            </span>
          </div>

          {/* PERIODE LAPORAN: Filter Triwulan/Bulan dan Tahun */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Periode Laporan (Bulan/Triwulan &amp; Tahun):</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => onSelectMonth(Number(e.target.value))}
                className="py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
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
                className="py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
              >
                {TAHUN_ANGGARAN_OPTIONS.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Parameter Tambahan Khusus Dokumen Operasional */}
          {isOperasional && (
            <div className="space-y-2 pt-1 border-t border-blue-100/60">
              <label className="font-semibold text-slate-700 flex items-center justify-between text-xs">
                <span>Pilih Transaksi yang Diterbitkan:</span>
                <span className="font-mono text-[10px] text-slate-500">
                  {transaksiList.length} Transaksi
                </span>
              </label>

              <select
                value={selectedTransaksiId}
                onChange={(e) => onSelectTransaksi(e.target.value)}
                className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              >
                {transaksiList.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.nomorUrut} - {t.unitPemohon} ({t.items.length} item) | {t.tanggalSurat}
                  </option>
                ))}
              </select>

              {activeTrx && (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Unit Pemohon:</span>
                    <span className="font-bold text-slate-800">{activeTrx.unitPemohon}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Tanggal Transaksi:</span>
                    <span className="font-medium text-slate-700">{activeTrx.tanggalSurat}</span>
                  </div>

                  {/* Rantai Nomor Surat */}
                  <div className="pt-1.5 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Rantai Nomor Surat:</span>
                      <button
                        type="button"
                        onClick={copyDocNumbers}
                        className="text-blue-600 hover:text-blue-800 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
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

                    <div className="grid grid-cols-2 gap-1 font-mono text-[9px]">
                      <div className="bg-slate-50 p-1 rounded border border-slate-200 truncate">
                        <span className="text-slate-400">NPB: </span>{activeTrx.noNPB}
                      </div>
                      <div className="bg-slate-50 p-1 rounded border border-slate-200 truncate">
                        <span className="text-slate-400">SPB: </span>{activeTrx.noSPB}
                      </div>
                      <div className="bg-slate-50 p-1 rounded border border-slate-200 truncate">
                        <span className="text-slate-400">SPPB: </span>{activeTrx.noSPPB}
                      </div>
                      <div className="bg-slate-50 p-1 rounded border border-slate-200 truncate font-semibold text-blue-700">
                        <span className="text-slate-400">BAST: </span>{activeTrx.noBAST}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Parameter Tambahan Khusus Kartu Barang & Persediaan */}
          {isKartuBarang && (
            <div className="space-y-2 pt-1 border-t border-blue-100/60">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 text-xs">Pilih Komoditas:</span>
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
                    Cetak Semua ({masterBarang.length})
                  </button>
                </div>
              </div>

              {!isBatchPrintAll && (
                <select
                  value={selectedBarangId}
                  onChange={(e) => onSelectBarang(e.target.value)}
                  className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium text-xs focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                >
                  {masterBarang.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.namaBarang} (Stok: {b.stokSekarang} {b.satuan}) - {b.kodeRekening}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Parameter Tambahan Khusus Laporan BOS */}
          {isIndukBOS && onExportExcelBOS && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onExportExcelBOS}
                disabled={isExportingBOS}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExportingBOS ? 'Mengekspor Excel...' : 'Ekspor Format Resmi Excel (.xlsx)'}</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. PIHAK PENANDATANGAN: DROPDOWN INTERAKTIF DENGAN PENAMPIL NIP OTOMATIS */}
        <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Pihak Penandatangan Berwenang</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Dropdown Kepala Sekolah / Kuasa Pengguna Barang */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
              <label className="text-[10px] text-slate-500 uppercase font-bold block">
                Kepala Sekolah / Kuasa Pengguna
              </label>
              {onSelectKepalaSekolah ? (
                <select
                  value={selectedKepalaSekolahId || activeKepsek?.id}
                  onChange={(e) => onSelectKepalaSekolah(e.target.value)}
                  className="w-full text-xs py-1.5 px-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                >
                  {pejabatList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({p.jabatan || 'Pejabat'})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-bold text-slate-900 block truncate">
                  {activeKepsek?.nama || 'Kepala Sekolah'}
                </span>
              )}

              {/* Penampil NIP Otomatis */}
              <div className="text-[10px] text-slate-600 font-mono bg-white p-1.5 rounded-md border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">NIP:</span>
                  <span className="font-semibold text-slate-800">{activeKepsek?.nip || '-'}</span>
                </div>
                {activeKepsek?.pangkatGolongan && (
                  <div className="text-[9px] text-slate-500 truncate mt-0.5 border-t border-slate-100 pt-0.5">
                    {activeKepsek.pangkatGolongan}
                  </div>
                )}
              </div>
            </div>

            {/* Dropdown Pengurus Barang Pembantu */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
              <label className="text-[10px] text-slate-500 uppercase font-bold block">
                Pengurus Barang Pembantu
              </label>
              {onSelectPengurusBarang ? (
                <select
                  value={selectedPengurusBarangId || activePengurus?.id}
                  onChange={(e) => onSelectPengurusBarang(e.target.value)}
                  className="w-full text-xs py-1.5 px-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                >
                  {pejabatList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({p.jabatan || 'Pejabat'})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-bold text-slate-900 block truncate">
                  {activePengurus?.nama || 'Pengurus Barang'}
                </span>
              )}

              {/* Penampil NIP Otomatis */}
              <div className="text-[10px] text-slate-600 font-mono bg-white p-1.5 rounded-md border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">NIP:</span>
                  <span className="font-semibold text-slate-800">{activePengurus?.nip || '-'}</span>
                </div>
                {activePengurus?.pangkatGolongan && (
                  <div className="text-[9px] text-slate-500 truncate mt-0.5 border-t border-slate-100 pt-0.5">
                    {activePengurus.pangkatGolongan}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Rincian Barang Dokumen Operasional Terpilih */}
        {isOperasional && activeTrx && (
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
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
              <div className="max-h-40 overflow-y-auto">
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
    </div>
  );
};
