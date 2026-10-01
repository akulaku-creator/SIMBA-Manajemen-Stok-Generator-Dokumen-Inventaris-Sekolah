import React, { useMemo } from 'react';
import { 
  Barang, 
  KartuBarangPeriodFilter, 
  KopSuratConfig, 
  Pejabat, 
  TransaksiPenerimaan, 
  TransaksiPengeluaran 
} from '../../types';
import { formatTanggalIndonesia, MONTHS_ID } from '../../utils/numberGenerator';
import { resolveKepalaSekolah, resolvePengurusBarang } from '../../utils/pejabatResolver';
import { KopSuratView } from '../KopSuratView';
import { isDateBeforePeriod, isDateInPeriod } from './DocKartuPersediaan';
import { SignatoryKartuBarang } from './SignatoryBlocks';

export interface DocKartuBarangProps {
  barang: Barang;
  transaksiPenerimaanList: TransaksiPenerimaan[];
  transaksiPengeluaranList: TransaksiPengeluaran[];
  kopConfig: KopSuratConfig;
  pejabatList: Pejabat[];
  periodFilter: KartuBarangPeriodFilter;
  minRows?: number;
  isLast?: boolean;
}

export function getKartuBarangDateRange(filter: KartuBarangPeriodFilter): { startDate: Date; endDate: Date; labelPeriode: string } {
  const { type, year, month = 0, triwulan = 1, semester = 1 } = filter;
  if (type === 'bulan') {
    const startDate = new Date(year, month, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const labelPeriode = `Bulan ${MONTHS_ID[month]} ${year}`;
    return { startDate, endDate, labelPeriode };
  }
  if (type === 'triwulan') {
    const startMonth = (triwulan - 1) * 3;
    const endMonth = startMonth + 2;
    const startDate = new Date(year, startMonth, 1, 0, 0, 0, 0);
    const endDate = new Date(year, endMonth + 1, 0, 23, 59, 59, 999);
    const labelPeriode = `Triwulan ${triwulan} (${MONTHS_ID[startMonth]} - ${MONTHS_ID[endMonth]} ${year})`;
    return { startDate, endDate, labelPeriode };
  }
  if (type === 'semester') {
    const startMonth = semester === 1 ? 0 : 6;
    const endMonth = semester === 1 ? 5 : 11;
    const startDate = new Date(year, startMonth, 1, 0, 0, 0, 0);
    const endDate = new Date(year, endMonth + 1, 0, 23, 59, 59, 999);
    const labelPeriode = `Semester ${semester === 1 ? 'I (Januari - Juni)' : 'II (Juli - Desember)'} ${year}`;
    return { startDate, endDate, labelPeriode };
  }
  // tahun
  const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
  const labelPeriode = `Tahun Anggaran ${year}`;
  return { startDate, endDate, labelPeriode };
}

export const DocKartuBarang: React.FC<DocKartuBarangProps> = ({
  barang,
  transaksiPenerimaanList,
  transaksiPengeluaranList,
  kopConfig,
  pejabatList,
  periodFilter,
  minRows = 12,
  isLast = false
}) => {
  const kepsek = resolveKepalaSekolah(pejabatList);
  const pengurusBarang = resolvePengurusBarang(pejabatList);

  const { startDate, endDate, labelPeriode } = useMemo(() => {
    return getKartuBarangDateRange(periodFilter);
  }, [periodFilter]);

  const targetYear = periodFilter.year;
  const targetMonth = periodFilter.type === 'bulan' ? (periodFilter.month ?? 0)
    : periodFilter.type === 'triwulan' ? (100 + (periodFilter.triwulan ?? 1))
    : -1;

  // Compute mutasi data
  const { rows, totalMasuk, totalKeluar, saldoAkhir, saldoAwalPeriode, saldoAwalDateString } = useMemo(() => {
    // 1. Transactions prior to target period
    const priorMasuk = transaksiPenerimaanList
      .filter(t => isDateBeforePeriod(t.tanggal, targetMonth, targetYear))
      .reduce((sum, t) => {
        const item = t.items.find(i => i.barangId === barang.id);
        return sum + (item ? Number(item.jumlahMasuk) || 0 : 0);
      }, 0);

    const priorKeluar = transaksiPengeluaranList
      .filter(t => isDateBeforePeriod(t.tanggal || t.createdAt, targetMonth, targetYear))
      .reduce((sum, t) => {
        const item = t.items.find(i => i.barangId === barang.id);
        return sum + (item ? Number(item.usulanJumlah) || 0 : 0);
      }, 0);

    const initialSaldo = Math.max(0, (Number(barang.stokAwal) || 0) + priorMasuk - priorKeluar);

    // Compute saldo awal date (last day of previous month/period)
    let saldoAwalDate = '';
    if (targetMonth === -1) {
      saldoAwalDate = `31 Desember ${targetYear - 1}`;
    } else if (targetMonth >= 101 && targetMonth <= 104) {
      const startM = (targetMonth - 101) * 3;
      const prevDate = new Date(targetYear, startM, 0);
      saldoAwalDate = `${prevDate.getDate()} ${MONTHS_ID[prevDate.getMonth()]} ${prevDate.getFullYear()}`;
    } else {
      const prevDate = new Date(targetYear, targetMonth, 0);
      saldoAwalDate = `${prevDate.getDate()} ${MONTHS_ID[prevDate.getMonth()]} ${prevDate.getFullYear()}`;
    }

    // 2. Events during period
    interface EventItem {
      tanggal: string;
      dateSortKey: string;
      noBukti: string;
      jenis: 'masuk' | 'keluar';
      masuk: number;
      keluar: number;
      keterangan: string;
    }

    const events: EventItem[] = [];

    // Incoming
    transaksiPenerimaanList.forEach(t => {
      if (isDateInPeriod(t.tanggal, targetMonth, targetYear)) {
        const item = t.items.find(i => i.barangId === barang.id);
        if (item && item.jumlahMasuk > 0) {
          events.push({
            tanggal: t.tanggal,
            dateSortKey: t.tanggal,
            noBukti: t.noBukti || 'Penerimaan BOS',
            jenis: 'masuk',
            masuk: Number(item.jumlahMasuk) || 0,
            keluar: 0,
            keterangan: `Penerimaan Barang - ${t.penyedia || 'Penyedia'}`
          });
        }
      }
    });

    // Outgoing
    transaksiPengeluaranList.forEach(t => {
      const rawDate = t.tanggal || t.createdAt;
      if (isDateInPeriod(rawDate, targetMonth, targetYear)) {
        const item = t.items.find(i => i.barangId === barang.id);
        if (item && item.usulanJumlah > 0) {
          const docDate = t.tanggal || (t.createdAt ? t.createdAt.split('T')[0] : '');
          const pemohon = t.unitPemohon || t.pemohonNama || 'Pemohon';
          events.push({
            tanggal: docDate,
            dateSortKey: docDate,
            noBukti: t.noSPPB || t.noBAST || t.noSPB || t.noNPB || 'Penyaluran',
            jenis: 'keluar',
            masuk: 0,
            keluar: Number(item.usulanJumlah) || 0,
            keterangan: `Pengeluaran Barang - ${pemohon}`
          });
        }
      }
    });

    // Sort chronologically: if same date, masuk comes before keluar
    events.sort((a, b) => {
      if (a.dateSortKey < b.dateSortKey) return -1;
      if (a.dateSortKey > b.dateSortKey) return 1;
      return a.jenis === 'masuk' ? -1 : 1;
    });

    // Running balance
    let running = initialSaldo;
    let sumMasuk = 0;
    let sumKeluar = 0;

    const rowList = events.map(ev => {
      if (ev.jenis === 'masuk') {
        running += ev.masuk;
        sumMasuk += ev.masuk;
      } else {
        running -= ev.keluar;
        sumKeluar += ev.keluar;
      }
      return {
        ...ev,
        sisa: running
      };
    });

    return {
      saldoAwalPeriode: initialSaldo,
      rows: rowList,
      totalMasuk: sumMasuk,
      totalKeluar: sumKeluar,
      saldoAkhir: running
    };
  }, [barang, transaksiPenerimaanList, transaksiPengeluaranList, startDate, endDate]);

  const paddingRowsCount = Math.max(0, minRows - (rows.length + 1)); // +1 for saldo awal row

  const currentDateString = formatTanggalIndonesia(new Date().toISOString().split('T')[0]);

  return (
    <div 
      className="doc-content kartu-barang-page w-full bg-white text-black p-0 select-text flex flex-col justify-between"
      style={{
        pageBreakAfter: isLast ? 'auto' : 'always',
        breakAfter: isLast ? 'auto' : 'page',
        minHeight: '100%'
      }}
    >
      <div>
        {/* Official Header with Kop Surat */}
        <div className="doc-header-kop avoid-break">
          <KopSuratView config={kopConfig} />
        </div>

        {/* Title & Metadata (doc-meta-block) */}
        <div className="doc-meta-block avoid-break">
          <div className="text-center my-3 border-b-2 border-black pb-2">
          <h2 className="text-base font-bold uppercase tracking-wider">
            KARTU BARANG PERSEDIAAN
          </h2>
          <div className="text-xs font-semibold text-slate-700 tracking-wide uppercase mt-0.5">
            LAMPIRAN 12 - STANDAR PENATAUSAHAAN BARANG MILIK DAERAH
          </div>
          <div className="text-xs font-bold text-blue-900 mt-1">
            Periode: {labelPeriode}
          </div>
        </div>

        {/* Header Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs mb-3 border border-black p-2.5 bg-slate-50/50">
          <div className="space-y-1">
            <div className="flex">
              <span className="w-36 font-semibold text-slate-800">Unit Kerja / Sekolah</span>
              <span className="w-3">:</span>
              <span className="font-bold flex-1">{kopConfig.namaSekolah}</span>
            </div>
            <div className="flex">
              <span className="w-36 font-semibold text-slate-800">Ruang / Lokasi Gudang</span>
              <span className="w-3">:</span>
              <span className="flex-1">{barang.lokasiGudang || 'Gudang Utama Persediaan'}</span>
            </div>
            <div className="flex">
              <span className="w-36 font-semibold text-slate-800">Nama Barang</span>
              <span className="w-3">:</span>
              <span className="font-bold flex-1">{barang.namaBarang}</span>
            </div>
            <div className="flex">
              <span className="w-36 font-semibold text-slate-800">Satuan</span>
              <span className="w-3">:</span>
              <span className="font-bold flex-1">{barang.satuan}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex">
              <span className="w-36 font-semibold text-slate-800">Spesifikasi</span>
              <span className="w-3">:</span>
              <span className="flex-1">{barang.spesifikasi || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-36 font-semibold text-slate-800">Kode Rekening</span>
              <span className="w-3">:</span>
              <span className="font-mono flex-1">{barang.kodeRekening}</span>
            </div>
            <div className="flex">
              <span className="w-36 font-semibold text-slate-800">Nama Rekening Belanja</span>
              <span className="w-3">:</span>
              <span className="flex-1 text-[11px] leading-tight">{barang.namaRekening}</span>
            </div>
            <div className="flex">
              <span className="w-36 font-semibold text-slate-800">Kode Barang</span>
              <span className="w-3">:</span>
              <span className="font-mono font-bold flex-1">{barang.kodeBarang}</span>
            </div>
            <div className="flex">
              <span className="w-36 font-semibold text-slate-800">NUSP</span>
              <span className="w-3">:</span>
              <span className="font-mono font-bold text-blue-900 flex-1">{barang.nusp || '-'}</span>
            </div>
          </div>
        </div>
        </div>

        {/* Mutation Table */}
        <table className="doc-table w-full border-collapse border border-black text-xs" style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr className="bg-slate-100 text-center font-bold">
              <th style={{ width: '5%' }} className="border border-black px-1 py-1">No</th>
              <th style={{ width: '13%' }} className="border border-black px-1 py-1">Tanggal</th>
              <th style={{ width: '24%' }} className="border border-black px-1 py-1">No. Bukti / Dasar Mutasi</th>
              <th style={{ width: '9%' }} className="border border-black px-1 py-1">Masuk</th>
              <th style={{ width: '9%' }} className="border border-black px-1 py-1">Keluar</th>
              <th style={{ width: '9%' }} className="border border-black px-1 py-1">Sisa</th>
              <th style={{ width: '31%' }} className="border border-black px-1 py-1">Keterangan</th>
            </tr>
            <tr className="bg-slate-50 text-[10px] text-center text-slate-600">
              <th className="border border-black py-0.5">1</th>
              <th className="border border-black py-0.5">2</th>
              <th className="border border-black py-0.5">3</th>
              <th className="border border-black py-0.5">4</th>
              <th className="border border-black py-0.5">5</th>
              <th className="border border-black py-0.5">6</th>
              <th className="border border-black py-0.5">7</th>
            </tr>
          </thead>
          <tbody>
            {/* Saldo Awal Periode Row */}
            <tr className="bg-amber-50/40 font-medium">
              <td className="border border-black px-2 py-1 text-center">1</td>
              <td className="border border-black px-2 py-1 text-center font-mono text-[11px] whitespace-nowrap">
                {saldoAwalDateString}
              </td>
              <td className="border border-black px-2 py-1 font-mono text-[11px] text-slate-700">
                SALDO-AWAL
              </td>
              <td className="border border-black px-2 py-1 text-center font-mono text-slate-400">-</td>
              <td className="border border-black px-2 py-1 text-center font-mono text-slate-400">-</td>
              <td className="border border-black px-2 py-1 text-center font-mono font-bold text-blue-900">
                {saldoAwalPeriode}
              </td>
              <td className="border border-black px-2 py-1 font-semibold text-slate-700">
                Saldo Awal Periode
              </td>
            </tr>

            {/* Dynamic Event Rows */}
            {rows.map((row, idx) => (
              <tr key={`row-${idx}`} className="hover:bg-slate-50">
                <td className="border border-black px-2 py-1 text-center">{idx + 2}</td>
                <td className="border border-black px-2 py-1 text-center font-mono text-[11px]">
                  {formatTanggalIndonesia(row.tanggal)}
                </td>
                <td className="border border-black px-2 py-1 font-mono text-[11px]">
                  {row.noBukti}
                </td>
                <td className="border border-black px-2 py-1 text-center font-mono font-semibold text-emerald-800">
                  {row.masuk > 0 ? row.masuk : '-'}
                </td>
                <td className="border border-black px-2 py-1 text-center font-mono font-semibold text-amber-800">
                  {row.keluar > 0 ? row.keluar : '-'}
                </td>
                <td className="border border-black px-2 py-1 text-center font-mono font-bold">
                  {row.sisa}
                </td>
                <td className="border border-black px-2 py-1 text-[11px]">
                  {row.keterangan}
                </td>
              </tr>
            ))}

            {/* Blank padding rows for clean print format */}
            {Array.from({ length: paddingRowsCount }).map((_, pIdx) => (
              <tr key={`pad-${pIdx}`} className="h-6">
                <td className="border border-black px-2 py-1 text-center text-transparent">-</td>
                <td className="border border-black px-2 py-1"></td>
                <td className="border border-black px-2 py-1"></td>
                <td className="border border-black px-2 py-1"></td>
                <td className="border border-black px-2 py-1"></td>
                <td className="border border-black px-2 py-1"></td>
                <td className="border border-black px-2 py-1"></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {/* Total Row */}
            <tr className="bg-slate-100 font-bold border-t-2 border-black">
              <td colSpan={3} className="border border-black px-3 py-1.5 text-center uppercase tracking-wide">
                Jumlah Mutasi Periode Ini
              </td>
              <td className="border border-black px-2 py-1.5 text-center font-mono text-emerald-800">
                {totalMasuk}
              </td>
              <td className="border border-black px-2 py-1.5 text-center font-mono text-amber-800">
                {totalKeluar}
              </td>
              <td className="border border-black px-2 py-1.5 text-center font-mono text-blue-900 bg-blue-50/70">
                {saldoAkhir}
              </td>
              <td className="border border-black px-2 py-1.5 text-slate-700 text-[11px] italic">
                Saldo Akhir Fisik: {saldoAkhir} {barang.satuan}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Signatures Section: Pengurus / Penyimpan Barang Persediaan */}
      <SignatoryKartuBarang
        pejabatList={pejabatList}
        kopConfig={kopConfig}
        className="mt-6 pt-2"
      />
    </div>
  );
};
