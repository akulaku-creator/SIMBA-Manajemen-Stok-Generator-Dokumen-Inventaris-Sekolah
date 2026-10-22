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
  settings?: any;
  pejabatSettings?: any;
  dataDokumen?: any;
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
  settings,
  pejabatSettings,
  dataDokumen,
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

  const isCompact = rows.length <= 5; // Deteksi jika data sedikit/kosong
  const paddingRowsCount = isCompact ? 0 : Math.max(0, minRows - (rows.length + 1)); // +1 for saldo awal row

  const currentDateString = formatTanggalIndonesia(new Date().toISOString().split('T')[0]);
  const schoolName = pejabatSettings?.namaSekolah || kopConfig?.namaSekolah || 'SMAN 1 CIHAURBEUTI';
  const kotaDisplay = pejabatSettings?.lokasi || dataDokumen?.lokasi || kopConfig?.kotaSurat || 'Ciamis';
  const tanggalDisplay = dataDokumen?.tanggalCetak || currentDateString;

  return (
    <div 
      className={`print-container doc-content kartu-barang-page w-full bg-white text-black p-2 font-sans select-text flex flex-col justify-between ${isCompact ? 'compact-mode' : ''}`}
      style={{
        pageBreakAfter: isLast ? 'auto' : 'always',
        breakAfter: isLast ? 'auto' : 'page',
        minHeight: isCompact ? 'auto' : '100%'
      }}
    >
      <div>
        {/* HEADER KARTU */}
        <div className="text-center font-bold text-xs uppercase mb-1.5 border-b pb-1 avoid-break">
          <p className="tracking-wider text-slate-700 text-[11px] font-bold">
            LAMPIRAN 12: KARTU BARANG
          </p>
          <h2 className="text-sm font-black text-slate-900 tracking-wide mt-0.5">
            KARTU BARANG PERSEDIAAN
          </h2>
          <p className="text-xs font-bold text-blue-900 mt-0.5">
            {schoolName} • Periode: {labelPeriode}
          </p>
        </div>

        {/* ATRIBUT BARANG (SKPD, Nama Barang, Kode, dll) */}
        <div className="grid grid-cols-2 text-[10px] mb-2 gap-x-4 border border-black p-1.5 bg-slate-50/50 rounded-xs avoid-break">
          <div className="space-y-0.5">
            <p><span className="font-semibold text-slate-700">Nama Barang:</span> <span className="font-bold text-slate-900">{barang?.namaBarang || '-'}</span></p>
            <p><span className="font-semibold text-slate-700">Kode Barang:</span> <span className="font-mono font-bold text-slate-900">{barang?.kodeBarang || '-'}</span></p>
            <p><span className="font-semibold text-slate-700">NUSP:</span> <span className="font-mono font-bold text-blue-900">{barang?.nusp || '-'}</span></p>
            <p><span className="font-semibold text-slate-700">Spesifikasi:</span> <span className="text-slate-800">{barang?.spesifikasi || '-'}</span></p>
          </div>
          <div className="space-y-0.5 text-right sm:text-left sm:pl-4">
            <p><span className="font-semibold text-slate-700">Satuan:</span> <span className="font-bold text-slate-900">{barang?.satuan || '-'}</span></p>
            <p><span className="font-semibold text-slate-700">Lokasi Gudang:</span> <span className="text-slate-800">{barang?.lokasiGudang || 'Gudang Utama'}</span></p>
            <p><span className="font-semibold text-slate-700">Kode Rekening:</span> <span className="font-mono text-slate-800">{barang?.kodeRekening || '-'}</span></p>
            <p className="truncate"><span className="font-semibold text-slate-700">Rekening:</span> <span className="text-slate-800 text-[9.5px]">{barang?.namaRekening || '-'}</span></p>
          </div>
        </div>

        {/* TABEL DATA KARTU */}
        <table className="doc-table w-full border-collapse border border-black mb-2 text-[10px] leading-tight" style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr className="bg-gray-100 text-center font-bold">
              <th style={{ width: '4%' }} className="border border-black p-1">No</th>
              <th style={{ width: '12%' }} className="border border-black p-1">Tanggal</th>
              <th style={{ width: '22%' }} className="border border-black p-1">No. BAST/Dokumen</th>
              <th style={{ width: '26%' }} className="border border-black p-1">Uraian / BUKU-01 / BUKU-02</th>
              <th style={{ width: '9%' }} className="border border-black p-1">Masuk (Vol)</th>
              <th style={{ width: '9%' }} className="border border-black p-1">Keluar (Vol)</th>
              <th style={{ width: '9%' }} className="border border-black p-1">Sisa (Vol)</th>
              <th style={{ width: '9%' }} className="border border-black p-1">Keterangan</th>
            </tr>
            <tr className="bg-slate-50 text-[9px] text-center text-slate-600">
              <th className="border border-black py-0.5">1</th>
              <th className="border border-black py-0.5">2</th>
              <th className="border border-black py-0.5">3</th>
              <th className="border border-black py-0.5">4</th>
              <th className="border border-black py-0.5">5</th>
              <th className="border border-black py-0.5">6</th>
              <th className="border border-black py-0.5">7</th>
              <th className="border border-black py-0.5">8</th>
            </tr>
          </thead>
          <tbody>
            {/* Saldo Awal Periode Row */}
            <tr className="bg-amber-50/40 font-medium text-center font-mono">
              <td className="border border-black p-1 text-center">1</td>
              <td className="border border-black p-1 text-center whitespace-nowrap">
                {saldoAwalDateString || '-'}
              </td>
              <td className="border border-black p-1 text-center text-slate-700">
                SALDO-AWAL
              </td>
              <td className="border border-black p-1 text-left font-sans font-semibold text-slate-800">
                Saldo Awal Periode
              </td>
              <td className="border border-black p-1 text-center text-slate-400">-</td>
              <td className="border border-black p-1 text-center text-slate-400">-</td>
              <td className="border border-black p-1 text-center font-bold text-blue-900">
                {saldoAwalPeriode}
              </td>
              <td className="border border-black p-1 text-left font-sans text-slate-600 text-[9px]">
                Saldo Awal Bawaan
              </td>
            </tr>

            {/* Dynamic Event Rows */}
            {rows.length > 0 ? (
              rows.map((row, idx) => (
                <tr key={`row-${idx}`} className="text-center font-mono hover:bg-slate-50">
                  <td className="border border-black p-1 text-center">{idx + 2}</td>
                  <td className="border border-black p-1 text-center whitespace-nowrap">
                    {formatTanggalIndonesia(row.tanggal)}
                  </td>
                  <td className="border border-black p-1 text-center truncate">
                    {row.noBukti}
                  </td>
                  <td className="border border-black p-1 text-left font-sans font-medium text-slate-900">
                    {row.keterangan || 'Mutasi Barang'}
                  </td>
                  <td className="border border-black p-1 text-center font-semibold text-emerald-800">
                    {row.masuk > 0 ? row.masuk : '-'}
                  </td>
                  <td className="border border-black p-1 text-center font-semibold text-amber-800">
                    {row.keluar > 0 ? row.keluar : '-'}
                  </td>
                  <td className="border border-black p-1 text-center font-bold">
                    {row.sisa}
                  </td>
                  <td className="border border-black p-1 text-left font-sans text-[9px] text-slate-600 truncate">
                    {row.keterangan}
                  </td>
                </tr>
              ))
            ) : null}

            {/* Blank padding rows only when NOT compact */}
            {!isCompact && Array.from({ length: paddingRowsCount }).map((_, pIdx) => (
              <tr key={`pad-${pIdx}`} className="h-6">
                <td className="border border-black p-1 text-center text-transparent">-</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {/* Total Row */}
            <tr className="bg-slate-100 font-bold border-t-2 border-black text-center font-mono">
              <td colSpan={4} className="border border-black p-1.5 uppercase font-sans tracking-wide">
                Jumlah Mutasi Periode Ini
              </td>
              <td className="border border-black p-1.5 font-bold text-emerald-800">
                {totalMasuk}
              </td>
              <td className="border border-black p-1.5 font-bold text-amber-800">
                {totalKeluar}
              </td>
              <td className="border border-black p-1.5 font-bold text-blue-900 bg-blue-50/70">
                {saldoAkhir}
              </td>
              <td className="border border-black p-1.5 text-left font-sans text-slate-700 text-[9px] italic">
                Saldo: {saldoAkhir} {barang.satuan}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* BLOK TANDA TANGAN (AUTO-FIT & TIDAK MENGGANTUNG) */}
      <SignatoryKartuBarang
        pejabatList={pejabatList}
        kopConfig={kopConfig}
        settings={settings}
        pejabatSettings={pejabatSettings}
        dataDokumen={dataDokumen}
        lokasi={kotaDisplay}
        tanggalCetak={tanggalDisplay}
        isCompact={isCompact}
        className={isCompact ? 'mt-2 pt-1' : 'mt-4 pt-2'}
      />
    </div>
  );
};
