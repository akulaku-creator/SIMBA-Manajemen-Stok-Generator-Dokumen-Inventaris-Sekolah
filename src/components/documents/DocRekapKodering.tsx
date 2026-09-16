import { 
  Download, 
  FileSpreadsheet, 
  Filter, 
  Printer, 
  Search, 
  TrendingDown, 
  TrendingUp 
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Barang, KopSuratConfig, Pejabat, TAHUN_ANGGARAN_OPTIONS, TransaksiPenerimaan, TransaksiPengeluaran } from '../../types';
import { downloadBOSExcelFile } from '../../utils/excelBosGenerator';
import { calculateMutasiBOSData, NAMA_BULAN } from '../../utils/mutasiBosEngine';
import { formatRupiah } from '../../utils/numberGenerator';

interface Props {
  masterBarang: Barang[];
  transaksiPengeluaranList: TransaksiPengeluaran[];
  transaksiPenerimaanList: TransaksiPenerimaan[];
  kopConfig: KopSuratConfig;
  pejabatList: Pejabat[];
  targetYear?: number;
}

export const DocRekapKodering: React.FC<Props> = ({
  masterBarang,
  transaksiPengeluaranList,
  transaksiPenerimaanList,
  kopConfig,
  pejabatList,
  targetYear = 2026
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(targetYear);
  const [monthRangeMode, setMonthRangeMode] = useState<'all' | 'sem1' | 'sem2' | 'tw1' | 'tw2' | 'tw3' | 'tw4' | 'single'>('all');
  const [singleMonthIndex, setSingleMonthIndex] = useState<number>(8); // September
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

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

  const calculation = useMemo(() => {
    return calculateMutasiBOSData(
      masterBarang,
      transaksiPengeluaranList,
      transaksiPenerimaanList,
      kopConfig,
      selectedYear
    );
  }, [masterBarang, transaksiPengeluaranList, transaksiPenerimaanList, kopConfig, selectedYear]);

  const visibleMonthIndices = useMemo(() => {
    switch (monthRangeMode) {
      case 'tw1': return [0, 1, 2];
      case 'tw2': return [3, 4, 5];
      case 'tw3': return [6, 7, 8];
      case 'tw4': return [9, 10, 11];
      case 'sem1': return [0, 1, 2, 3, 4, 5];
      case 'sem2': return [6, 7, 8, 9, 10, 11];
      case 'single': return [singleMonthIndex];
      case 'all':
      default:
        return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    }
  }, [monthRangeMode, singleMonthIndex]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return calculation.rekapKodering;
    const q = searchQuery.toLowerCase();
    return calculation.rekapKodering.filter(r =>
      r.kodeRekening.toLowerCase().includes(q) ||
      r.namaRekening.toLowerCase().includes(q)
    );
  }, [calculation.rekapKodering, searchQuery]);

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
        12
      );
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('Gagal mengekspor file Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <style>{`
        @media print {
          @page {
            size: 330mm 215mm landscape;
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
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print w-full max-w-7xl px-4 py-3 bg-white rounded-xl shadow-xs border border-slate-200 mb-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kodering / uraian..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 w-44 sm:w-56"
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
              <option value="sem1">Semester I (Jan - Jun)</option>
              <option value="sem2">Semester II (Jul - Des)</option>
              <option value="tw1">Triwulan I (Jan - Mar)</option>
              <option value="tw2">Triwulan II (Apr - Jun)</option>
              <option value="tw3">Triwulan III (Jul - Sep)</option>
              <option value="tw4">Triwulan IV (Okt - Des)</option>
              <option value="single">Pilih 1 Bulan</option>
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

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-semibold rounded-lg border border-emerald-700 transition-all shadow-xs disabled:opacity-50"
            title="Unduh file Excel (.xlsx) dengan sheet BOS & REKAP PER KODERING"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExporting ? 'Membuat .xlsx...' : 'Ekspor Excel (.xlsx)'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs active:scale-98 transition-all"
            title="Cetak Laporan / Simpan PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* Document Body */}
      <div className="w-full max-w-[98vw] xl:max-w-7xl bg-white shadow-md rounded-2xl border border-slate-200 p-4 sm:p-6">
        {/* Header */}
        <div className="text-center mb-6 border-b pb-4 border-slate-200">
          <h1 className="text-base sm:text-lg md:text-xl font-extrabold uppercase text-slate-900 tracking-wide">
            REKAPITULASI PER KODERING BELANJA BARANG HABIS PAKAI BOS TAHUN {selectedYear}
          </h1>
          <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-700 mt-1">
            NAMA INSTANSI: {calculation.namaSekolah}
          </h2>
          <div className="text-[11px] text-slate-500 mt-1">
            Rekapitulasi Akumulasi Per Kode Rekening Belanja &bull; Tahun Anggaran {selectedYear}
          </div>
        </div>

        {/* Table */}
        <div className="print-scroll-container overflow-x-auto w-full border border-slate-300 rounded-lg shadow-2xs">
          <table className="w-full text-left text-[11px] border-collapse min-w-max">
            <thead className="bg-slate-800 text-white text-center font-bold tracking-tight">
              {/* Row 1 */}
              <tr>
                <th rowSpan={2} className="border border-slate-600 px-2 py-2 w-10 text-center">NO</th>
                <th rowSpan={2} className="border border-slate-600 px-3 py-2 w-36 text-center">KODERING</th>
                <th rowSpan={2} className="border border-slate-600 px-4 py-2 w-72 text-center">
                  URAIAN (NAMA KATEGORI REKENING)
                </th>
                <th rowSpan={2} className="border border-slate-600 px-3 py-2 w-32 text-center bg-slate-850">
                  SALDO AWAL {selectedYear}
                </th>
                {visibleMonthIndices.map(m => (
                  <th key={m} colSpan={3} className="border border-slate-600 px-2 py-1 text-center bg-slate-900">
                    MUTASI {NAMA_BULAN[m].toUpperCase()}
                  </th>
                ))}
              </tr>

              {/* Row 2: Sub-columns for each month */}
              <tr className="bg-slate-700 text-[10px]">
                {visibleMonthIndices.map(m => (
                  <React.Fragment key={`subcol-${m}`}>
                    <th className="border border-slate-600 px-2 py-1.5 w-28 bg-emerald-950 text-emerald-200">
                      MUTASI MASUK (Rp)
                    </th>
                    <th className="border border-slate-600 px-2 py-1.5 w-28 bg-rose-950 text-rose-200">
                      MUTASI KELUAR (Rp)
                    </th>
                    <th className="border border-slate-600 px-2 py-1.5 w-32 bg-blue-950 text-blue-200">
                      SALDO AKHIR S.D {NAMA_BULAN[m].substring(0, 3).toUpperCase()}
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4 + (visibleMonthIndices.length * 3)} className="py-10 text-center text-slate-400">
                    Tidak ada data kodering yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  return (
                    <tr key={row.kodeRekening} className="hover:bg-blue-50/40 border-b border-slate-200 text-[11px]">
                      <td className="border-r border-slate-200 px-2 py-2 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="border-r border-slate-200 px-2 py-2 font-mono font-bold text-blue-900 text-center">
                        {row.kodeRekening}
                      </td>
                      <td className="border-r border-slate-200 px-3 py-2 font-semibold text-slate-800">
                        {row.namaRekening}
                      </td>
                      <td className="border-r border-slate-200 px-3 py-2 text-right font-mono font-bold text-slate-900 bg-slate-50/60">
                        {formatRupiah(row.saldoAwalRp)}
                      </td>

                      {visibleMonthIndices.map(m => {
                        const b = row.bulanan[m];
                        return (
                          <React.Fragment key={`${row.kodeRekening}-${m}`}>
                            <td className="border-r border-slate-200 px-2 py-2 text-right font-mono text-emerald-800 font-medium">
                              {b.masukRp > 0 ? formatRupiah(b.masukRp) : '-'}
                            </td>
                            <td className="border-r border-slate-200 px-2 py-2 text-right font-mono text-rose-800 font-medium">
                              {b.keluarRp > 0 ? formatRupiah(b.keluarRp) : '-'}
                            </td>
                            <td className="border-r border-slate-200 px-2 py-2 text-right font-mono font-bold text-blue-950 bg-blue-50/40">
                              {formatRupiah(b.saldoAkhirRp)}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })
              )}

              {/* TOTAL ROW */}
              <tr className="bg-slate-200 font-black text-slate-950 border-t-2 border-slate-400 text-xs">
                <td colSpan={3} className="border-r border-slate-300 px-4 py-2.5 text-right tracking-wider">
                  TOTAL KESELURUHAN KODERING:
                </td>
                <td className="border-r border-slate-300 px-3 py-2.5 text-right font-mono font-black text-slate-950 bg-slate-300/80">
                  {formatRupiah(calculation.grandTotal.saldoAwalRp)}
                </td>

                {visibleMonthIndices.map(m => {
                  const gtM = calculation.grandTotal.bulanan[m];
                  return (
                    <React.Fragment key={`total-rekap-${m}`}>
                      <td className="border-r border-slate-300 px-2 py-2.5 text-right font-mono font-black text-emerald-950 bg-emerald-100">
                        {formatRupiah(gtM.masukRp)}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 text-right font-mono font-black text-rose-950 bg-rose-100">
                        {formatRupiah(gtM.keluarRp)}
                      </td>
                      <td className="border-r border-slate-300 px-2 py-2.5 text-right font-mono font-black text-blue-950 bg-blue-100">
                        {formatRupiah(gtM.saldoAkhirRp)}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Signatures */}
        <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 text-xs text-slate-800 break-inside-avoid">
          <div className="text-center space-y-1">
            <p className="font-semibold text-slate-600">Mengetahui,</p>
            <p className="font-bold uppercase text-slate-900">{kepsek.jabatan}</p>
            <div className="h-16"></div>
            <p className="font-bold underline text-slate-900">{kepsek.nama}</p>
            <p className="text-[11px] text-slate-600">NIP. {kepsek.nip}</p>
          </div>

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
