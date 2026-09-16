import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Calendar, 
  Download, 
  FileSpreadsheet, 
  Filter, 
  Printer, 
  Search, 
  Upload, 
  ZoomIn, 
  ZoomOut 
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Barang, KopSuratConfig, Pejabat, TAHUN_ANGGARAN_OPTIONS, TransaksiPenerimaan, TransaksiPengeluaran } from '../../types';
import { downloadBOSExcelFile } from '../../utils/excelBosGenerator';
import { calculateMutasiBOSData, NAMA_BULAN } from '../../utils/mutasiBosEngine';
import { formatRupiah, formatTanggalIndonesia } from '../../utils/numberGenerator';

interface Props {
  masterBarang: Barang[];
  transaksiPengeluaranList: TransaksiPengeluaran[];
  transaksiPenerimaanList: TransaksiPenerimaan[];
  kopConfig: KopSuratConfig;
  pejabatList: Pejabat[];
  targetYear?: number;
  onOpenImportModal?: () => void;
}

export const DocMutasiBOS: React.FC<Props> = ({
  masterBarang,
  transaksiPengeluaranList,
  transaksiPenerimaanList,
  kopConfig,
  pejabatList,
  targetYear = 2026,
  onOpenImportModal
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(targetYear);
  const [monthRangeMode, setMonthRangeMode] = useState<'all' | 'tw1' | 'tw2' | 'tw3' | 'tw4' | 'sem1' | 'sem2' | 'single'>('all');
  const [singleMonthIndex, setSingleMonthIndex] = useState<number>(8); // September (0-indexed = 8)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Pejabat for Signatures
  const kepsek = pejabatList.find(p => p.id === 'pejabat-kepsek') || pejabatList[0] || {
    nama: 'Drs. H. Bambang Suhartono, M.Pd.',
    nip: '19680512 199303 1 005',
    pangkatGolongan: 'Pembina Utama Muda / IV c',
    jabatan: 'Kepala Sekolah'
  };

  const pengurusBarang = pejabatList.find(p => p.id === 'pejabat-pengurus-barang') || pejabatList[2] || {
    nama: 'Rina Kartikasari, S.AP.',
    nip: '19890820 201402 2 003',
    pangkatGolongan: 'Penata Muda / III a',
    jabatan: 'Pengurus Barang Pembantu'
  };

  // Calculate mutation data
  const calculation = useMemo(() => {
    return calculateMutasiBOSData(
      masterBarang,
      transaksiPengeluaranList,
      transaksiPenerimaanList,
      kopConfig,
      selectedYear
    );
  }, [masterBarang, transaksiPengeluaranList, transaksiPenerimaanList, kopConfig, selectedYear]);

  // Determine which months to display on the web grid
  const visibleMonthIndices = useMemo(() => {
    switch (monthRangeMode) {
      case 'tw1': return [0, 1, 2]; // Jan, Feb, Mar
      case 'tw2': return [3, 4, 5]; // Apr, Mei, Jun
      case 'tw3': return [6, 7, 8]; // Jul, Agu, Sep
      case 'tw4': return [9, 10, 11]; // Okt, Nov, Des
      case 'sem1': return [0, 1, 2, 3, 4, 5]; // Jan - Jun
      case 'sem2': return [6, 7, 8, 9, 10, 11]; // Jul - Des
      case 'single': return [singleMonthIndex];
      case 'all':
      default:
        return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    }
  }, [monthRangeMode, singleMonthIndex]);

  // Filter groups and items by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return calculation.kelompokRekening;
    const q = searchQuery.toLowerCase();
    return calculation.kelompokRekening
      .map(group => {
        const matchesGroup = group.kodeRekening.toLowerCase().includes(q) || group.namaRekening.toLowerCase().includes(q);
        const filteredItems = group.items.filter(it =>
          matchesGroup ||
          it.namaBarang.toLowerCase().includes(q) ||
          it.kodeBarang.toLowerCase().includes(q)
        );
        return {
          ...group,
          items: filteredItems
        };
      })
      .filter(g => g.items.length > 0);
  }, [calculation.kelompokRekening, searchQuery]);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await downloadBOSExcelFile(
        masterBarang,
        transaksiPengeluaranList,
        transaksiPenerimaanList,
        kopConfig,
        pejabatList,
        selectedYear,
        12 // Full 12 months in excel
      );
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('Gagal mengunduh file Excel. Pastikan data barang valid.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Print Specific CSS for Wide Multi-Month Table */}
      <style>{`
        @media print {
          @page {
            size: 330mm 215mm landscape; /* F4 / Legal Landscape */
            margin: 0 !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: #ffffff !important;
            width: 100% !important;
            height: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-scroll-container {
            overflow: visible !important;
            width: 100% !important;
          }
          table {
            font-size: 8pt !important;
          }
          th, td {
            padding: 2px 3px !important;
          }
        }
      `}</style>

      {/* Action & Filter Toolbar (Hidden on Print) */}
      <div className="no-print w-full max-w-7xl px-4 py-3 bg-white rounded-xl shadow-xs border border-slate-200 mb-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Left: Search & Range Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari barang / kodering..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-44 sm:w-56"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-600">Rentang:</span>
            <select
              value={monthRangeMode}
              onChange={e => setMonthRangeMode(e.target.value as any)}
              className="border border-slate-300 rounded-lg py-1.5 px-2 bg-white text-slate-800 font-medium"
            >
              <option value="all">Semua 12 Bulan (Jan - Des)</option>
              <option value="sem1">Semester I (Januari - Juni)</option>
              <option value="sem2">Semester II (Juli - Desember)</option>
              <option value="tw1">Triwulan I (Jan - Mar)</option>
              <option value="tw2">Triwulan II (Apr - Jun)</option>
              <option value="tw3">Triwulan III (Jul - Sep)</option>
              <option value="tw4">Triwulan IV (Okt - Des)</option>
              <option value="single">Pilih 1 Bulan Spesifik</option>
            </select>
          </div>

          {monthRangeMode === 'single' && (
            <select
              value={singleMonthIndex}
              onChange={e => setSingleMonthIndex(parseInt(e.target.value, 10))}
              className="border border-slate-300 rounded-lg py-1.5 px-2 bg-white text-slate-800 font-medium"
            >
              {NAMA_BULAN.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-600">Tahun:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
              className="border border-slate-300 rounded-lg py-1.5 px-2 bg-white text-slate-800 font-medium"
            >
              {TAHUN_ANGGARAN_OPTIONS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Export Excel, Import, Print */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Zoom controls for comfortable viewing */}
          <div className="hidden lg:flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-slate-600">
            <button
              onClick={() => setZoomLevel(Math.max(70, zoomLevel - 10))}
              className="p-1 hover:bg-white rounded"
              title="Perkecil Grid"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1 font-semibold">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(Math.min(120, zoomLevel + 10))}
              className="p-1 hover:bg-white rounded"
              title="Perbesar Grid"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {onOpenImportModal && (
            <button
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-300 transition-colors shadow-2xs"
              title="Impor file Excel BOS lama untuk sinkronisasi master barang & saldo awal"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Impor Excel</span>
            </button>
          )}

          <button
            id="btn-export-excel-bos"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-semibold rounded-lg border border-emerald-700 transition-all shadow-xs disabled:opacity-50"
            title="Unduh file Excel (.xlsx) dengan formula live, header rapi, border, dan kalkulasi otomatis untuk sheet BOS & REKAP PER KODERING"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExporting ? 'Membuat .xlsx...' : 'Ekspor Excel (.xlsx)'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs active:scale-98 transition-all"
            title="Cetak Laporan / Simpan PDF Landscape"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* Main Document Body (Paper simulation & wide grid) */}
      <div 
        className="w-full max-w-[98vw] xl:max-w-7xl bg-white shadow-md rounded-2xl border border-slate-200 p-4 sm:p-6 transition-transform origin-top"
        style={{ transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined }}
      >
        {/* Document Header */}
        <div className="text-center mb-6 border-b pb-4 border-slate-200">
          <h1 className="text-base sm:text-lg md:text-xl font-extrabold uppercase text-slate-900 tracking-wide">
            DAFTAR MUTASI BARANG HABIS PAKAI BOS TAHUN {selectedYear}
          </h1>
          <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-700 mt-1">
            NAMA INSTANSI: {calculation.namaSekolah}
          </h2>
          <div className="text-[11px] text-slate-500 mt-1">
            Sumber Dana: Bantuan Operasional Sekolah (BOS) Reguler &bull; Periode: {
              monthRangeMode === 'all'
                ? `Januari s.d. Desember ${selectedYear}`
                : monthRangeMode === 'single'
                ? `Bulan ${NAMA_BULAN[singleMonthIndex]} ${selectedYear}`
                : `Triwulan / Semester Tahun ${selectedYear}`
            }
          </div>
        </div>

        {/* Multi-Month Table Grid (Horizontal Scrollable on screen, Full on Print) */}
        <div className="print-scroll-container overflow-x-auto w-full border border-slate-300 rounded-lg shadow-2xs">
          <table className="w-full text-left text-[11px] border-collapse min-w-max">
            {/* Table Head (3-Tier Layout) */}
            <thead className="bg-slate-800 text-white text-center font-bold tracking-tight">
              {/* Row 1 */}
              <tr>
                <th rowSpan={3} className="border border-slate-600 px-2 py-2 w-10 text-center">NO</th>
                <th rowSpan={3} className="border border-slate-600 px-3 py-2 w-48 text-center">PEMEGANG BARANG</th>
                <th colSpan={2} className="border border-slate-600 px-3 py-1 text-center bg-slate-900">BARANG PERSEDIAAN</th>
                <th colSpan={4} className="border border-slate-600 px-3 py-1 text-center bg-slate-850">
                  SALDO AWAL JANUARI {selectedYear}
                </th>
                {visibleMonthIndices.map(m => (
                  <th key={m} colSpan={12} className="border border-slate-600 px-2 py-1 text-center bg-slate-900">
                    MUTASI {NAMA_BULAN[m].toUpperCase()} {selectedYear}
                  </th>
                ))}
                <th rowSpan={3} className="border border-slate-600 px-3 py-2 text-center w-36">KETERANGAN</th>
              </tr>

              {/* Row 2 */}
              <tr className="bg-slate-700 text-[10px]">
                {/* Under BARANG PERSEDIAAN */}
                <th rowSpan={2} className="border border-slate-600 px-2 py-1.5 w-36">KODE REKENING</th>
                <th rowSpan={2} className="border border-slate-600 px-2 py-1.5 w-44">NAMA BARANG</th>

                {/* Under SALDO AWAL (4 cols) */}
                <th rowSpan={2} className="border border-slate-600 px-2 py-1 w-16">VOLUME</th>
                <th rowSpan={2} className="border border-slate-600 px-1.5 py-1 w-14">SATUAN</th>
                <th rowSpan={2} className="border border-slate-600 px-2 py-1 w-24">HARGA SATUAN</th>
                <th rowSpan={2} className="border border-slate-600 px-2 py-1 w-28">JUMLAH (Rp)</th>

                {/* Under each month (3 sub-groups) */}
                {visibleMonthIndices.map(m => (
                  <React.Fragment key={`sub-${m}`}>
                    <th colSpan={4} className="border border-slate-600 px-1 py-1 bg-emerald-900 text-emerald-100">
                      PENAMBAHAN / MASUK
                    </th>
                    <th colSpan={4} className="border border-slate-600 px-1 py-1 bg-red-950 text-red-100">
                      PENGURANGAN / KELUAR
                    </th>
                    <th colSpan={4} className="border border-slate-600 px-1 py-1 bg-blue-950 text-blue-100">
                      SALDO AKHIR
                    </th>
                  </React.Fragment>
                ))}
              </tr>

              {/* Row 3: Sub-column headers */}
              <tr className="bg-slate-800 text-[9px]">
                {visibleMonthIndices.map(m => (
                  <React.Fragment key={`cols-${m}`}>
                    {/* Masuk */}
                    <th className="border border-slate-600 px-1 py-1 w-12 text-emerald-200">VOL</th>
                    <th className="border border-slate-600 px-1 py-1 w-12 text-emerald-200">SAT</th>
                    <th className="border border-slate-600 px-1.5 py-1 w-20 text-emerald-200">HARGA</th>
                    <th className="border border-slate-600 px-2 py-1 w-24 text-emerald-200">JUMLAH (Rp)</th>

                    {/* Keluar */}
                    <th className="border border-slate-600 px-1 py-1 w-12 text-rose-200">VOL</th>
                    <th className="border border-slate-600 px-1 py-1 w-12 text-rose-200">SAT</th>
                    <th className="border border-slate-600 px-1.5 py-1 w-20 text-rose-200">HARGA</th>
                    <th className="border border-slate-600 px-2 py-1 w-24 text-rose-200">JUMLAH (Rp)</th>

                    {/* Saldo Akhir */}
                    <th className="border border-slate-600 px-1 py-1 w-12 text-blue-200">VOL</th>
                    <th className="border border-slate-600 px-1 py-1 w-12 text-blue-200">SAT</th>
                    <th className="border border-slate-600 px-1.5 py-1 w-20 text-blue-200">HARGA</th>
                    <th className="border border-slate-600 px-2 py-1 w-24 text-blue-200">JUMLAH (Rp)</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={8 + (visibleMonthIndices.length * 12) + 1} className="py-12 text-center text-slate-400">
                    Tidak ada data barang persediaan yang cocok dengan filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredGroups.map(group => {
                  return (
                    <React.Fragment key={group.kodeRekening}>
                      {/* Sub-Header Baris Kode Rekening Belanja */}
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-b border-slate-300">
                        <td 
                          colSpan={8 + (visibleMonthIndices.length * 12) + 1} 
                          className="px-3 py-1.5 text-xs text-slate-800 bg-slate-200/90 font-bold"
                        >
                          KODE REKENING: <span className="font-mono text-blue-800">{group.kodeRekening}</span> - {group.namaRekening}
                        </td>
                      </tr>

                      {/* Items under this group */}
                      {group.items.map((barang, itemIdx) => {
                        return (
                          <tr 
                            key={barang.id} 
                            className="hover:bg-blue-50/40 transition-colors border-b border-slate-200 text-[10px]"
                          >
                            {/* Col 1: NO */}
                            <td className="border-r border-slate-200 px-2 py-1 text-center font-mono text-slate-500">
                              {itemIdx + 1}
                            </td>

                            {/* Col 2: PEMEGANG BARANG */}
                            <td className="border-r border-slate-200 px-2 py-1 text-slate-700 truncate max-w-[180px]">
                              {calculation.namaSekolah}
                            </td>

                            {/* Col 3: KODE REKENING */}
                            <td className="border-r border-slate-200 px-2 py-1 font-mono text-slate-600 text-center">
                              {barang.kodeRekening}
                            </td>

                            {/* Col 4: NAMA BARANG */}
                            <td className="border-r border-slate-200 px-2 py-1 font-semibold text-slate-900">
                              {barang.namaBarang}
                            </td>

                            {/* Col 5: Saldo Awal Volume */}
                            <td className="border-r border-slate-200 px-2 py-1 text-right font-mono font-medium">
                              {barang.saldoAwalVolume.toLocaleString('id-ID')}
                            </td>

                            {/* Col 6: Satuan */}
                            <td className="border-r border-slate-200 px-1 py-1 text-center text-slate-600">
                              {barang.satuan}
                            </td>

                            {/* Col 7: Harga Satuan */}
                            <td className="border-r border-slate-200 px-2 py-1 text-right font-mono text-slate-700">
                              {formatRupiah(barang.hargaSatuan)}
                            </td>

                            {/* Col 8: Saldo Awal Jumlah (Rp) */}
                            <td className="border-r border-slate-200 px-2 py-1 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                              {formatRupiah(barang.saldoAwalJumlahRp)}
                            </td>

                            {/* Monthly Movement Columns */}
                            {visibleMonthIndices.map(m => {
                              const detail = barang.mutasiBulanan[m];
                              return (
                                <React.Fragment key={`${barang.id}-${m}`}>
                                  {/* PENAMBAHAN / MASUK */}
                                  <td className="border-r border-slate-200 px-1 py-1 text-right font-mono text-emerald-700">
                                    {detail.masukVolume > 0 ? detail.masukVolume.toLocaleString('id-ID') : '-'}
                                  </td>
                                  <td className="border-r border-slate-200 px-1 py-1 text-center text-slate-500">
                                    {detail.masukVolume > 0 ? detail.masukSatuan : '-'}
                                  </td>
                                  <td className="border-r border-slate-200 px-1 py-1 text-right font-mono text-slate-600">
                                    {detail.masukVolume > 0 ? formatRupiah(detail.masukHargaSatuan) : '-'}
                                  </td>
                                  <td className="border-r border-slate-200 px-2 py-1 text-right font-mono font-semibold text-emerald-800 bg-emerald-50/30">
                                    {detail.masukJumlahRp > 0 ? formatRupiah(detail.masukJumlahRp) : '-'}
                                  </td>

                                  {/* PENGURANGAN / KELUAR */}
                                  <td className="border-r border-slate-200 px-1 py-1 text-right font-mono text-rose-700">
                                    {detail.keluarVolume > 0 ? detail.keluarVolume.toLocaleString('id-ID') : '-'}
                                  </td>
                                  <td className="border-r border-slate-200 px-1 py-1 text-center text-slate-500">
                                    {detail.keluarVolume > 0 ? detail.keluarSatuan : '-'}
                                  </td>
                                  <td className="border-r border-slate-200 px-1 py-1 text-right font-mono text-slate-600">
                                    {detail.keluarVolume > 0 ? formatRupiah(detail.keluarHargaSatuan) : '-'}
                                  </td>
                                  <td className="border-r border-slate-200 px-2 py-1 text-right font-mono font-semibold text-rose-800 bg-rose-50/30">
                                    {detail.keluarJumlahRp > 0 ? formatRupiah(detail.keluarJumlahRp) : '-'}
                                  </td>

                                  {/* SALDO AKHIR */}
                                  <td className="border-r border-slate-200 px-1 py-1 text-right font-mono font-bold text-slate-900">
                                    {detail.saldoAkhirVolume.toLocaleString('id-ID')}
                                  </td>
                                  <td className="border-r border-slate-200 px-1 py-1 text-center text-slate-500">
                                    {detail.saldoAkhirSatuan}
                                  </td>
                                  <td className="border-r border-slate-200 px-1 py-1 text-right font-mono text-slate-600">
                                    {formatRupiah(detail.saldoAkhirHargaSatuan)}
                                  </td>
                                  <td className="border-r border-slate-200 px-2 py-1 text-right font-mono font-bold text-blue-900 bg-blue-50/40">
                                    {formatRupiah(detail.saldoAkhirJumlahRp)}
                                  </td>
                                </React.Fragment>
                              );
                            })}

                            {/* KETERANGAN */}
                            <td className="px-2 py-1 text-slate-600 text-[10px]">
                              {barang.keterangan || '-'}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Baris SUB TOTAL untuk Kode Rekening Ini */}
                      <tr className="bg-slate-200/90 font-bold text-slate-900 border-t border-b-2 border-slate-400 text-[10px]">
                        <td colSpan={4} className="border-r border-slate-300 px-3 py-1.5 text-right font-extrabold text-slate-800">
                          SUB TOTAL ({group.kodeRekening}):
                        </td>
                        <td colSpan={3} className="border-r border-slate-300"></td>
                        <td className="border-r border-slate-300 px-2 py-1.5 text-right font-mono font-extrabold text-slate-900 bg-slate-300/60">
                          {formatRupiah(group.subtotalSaldoAwalRp)}
                        </td>

                        {/* Monthly Subtotals */}
                        {visibleMonthIndices.map(m => {
                          const subM = group.subtotalBulanan[m];
                          return (
                            <React.Fragment key={`subtotal-${group.kodeRekening}-${m}`}>
                              <td colSpan={3} className="border-r border-slate-300"></td>
                              <td className="border-r border-slate-300 px-2 py-1.5 text-right font-mono font-bold text-emerald-900 bg-emerald-100/60">
                                {formatRupiah(subM.totalMasukRp)}
                              </td>

                              <td colSpan={3} className="border-r border-slate-300"></td>
                              <td className="border-r border-slate-300 px-2 py-1.5 text-right font-mono font-bold text-rose-900 bg-rose-100/60">
                                {formatRupiah(subM.totalKeluarRp)}
                              </td>

                              <td colSpan={3} className="border-r border-slate-300"></td>
                              <td className="border-r border-slate-300 px-2 py-1.5 text-right font-mono font-extrabold text-blue-950 bg-blue-100/60">
                                {formatRupiah(subM.totalSaldoAkhirRp)}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        <td className="border-l border-slate-300"></td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}

              {/* Baris TOTAL KESELURUHAN */}
              <tr className="bg-slate-300 font-extrabold text-slate-950 border-t-2 border-slate-500 text-xs">
                <td colSpan={4} className="border-r border-slate-400 px-4 py-2.5 text-right tracking-wider">
                  TOTAL KESELURUHAN MUTASI:
                </td>
                <td colSpan={3} className="border-r border-slate-400"></td>
                <td className="border-r border-slate-400 px-2 py-2 text-right font-mono font-black text-slate-950 bg-slate-400/50">
                  {formatRupiah(calculation.grandTotal.saldoAwalRp)}
                </td>

                {visibleMonthIndices.map(m => {
                  const gtM = calculation.grandTotal.bulanan[m];
                  return (
                    <React.Fragment key={`gt-${m}`}>
                      <td colSpan={3} className="border-r border-slate-400"></td>
                      <td className="border-r border-slate-400 px-2 py-2 text-right font-mono font-black text-emerald-950 bg-emerald-200/70">
                        {formatRupiah(gtM.masukRp)}
                      </td>

                      <td colSpan={3} className="border-r border-slate-400"></td>
                      <td className="border-r border-slate-400 px-2 py-2 text-right font-mono font-black text-rose-950 bg-rose-200/70">
                        {formatRupiah(gtM.keluarRp)}
                      </td>

                      <td colSpan={3} className="border-r border-slate-400"></td>
                      <td className="border-r border-slate-400 px-2 py-2 text-right font-mono font-black text-blue-950 bg-blue-200/80">
                        {formatRupiah(gtM.saldoAkhirRp)}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tanda Tangan Resmi Pejabat (Footer Laporan) */}
        <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 text-xs text-slate-800 break-inside-avoid">
          {/* Kolom Kiri: Kepala Sekolah */}
          <div className="text-center space-y-1">
            <p className="font-semibold text-slate-600">Mengetahui,</p>
            <p className="font-bold uppercase text-slate-900">{kepsek.jabatan}</p>
            <div className="h-16"></div>
            <p className="font-bold underline text-slate-900">{kepsek.nama}</p>
            <p className="text-[11px] text-slate-600">NIP. {kepsek.nip}</p>
          </div>

          {/* Kolom Kanan: Pengurus Barang Pembantu */}
          <div className="text-center space-y-1">
            <p className="text-slate-600">{kopConfig.kotaSurat || 'Bekasi'}, 31 Desember {selectedYear}</p>
            <p className="font-bold uppercase text-slate-900">{pengurusBarang.jabatan}</p>
            <div className="h-16"></div>
            <p className="font-bold underline text-slate-900">{pengurusBarang.nama}</p>
            <p className="text-[11px] text-slate-600">NIP. {pengurusBarang.nip}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
