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
import { KopSuratView } from '../KopSuratView';

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

  const { startDate, endDate, labelPeriode } = useMemo(() => {
    return getKartuBarangDateRange(periodFilter);
  }, [periodFilter]);

  // Compute mutasi data
  const { rows, totalMasuk, totalKeluar, saldoAkhir, saldoAwalPeriode } = useMemo(() => {
    // 1. Transactions prior to startDate
    const priorMasuk = transaksiPenerimaanList
      .filter(t => new Date(t.tanggal) < startDate)
      .reduce((sum, t) => {
        const item = t.items.find(i => i.barangId === barang.id);
        return sum + (item ? item.jumlahMasuk : 0);
      }, 0);

    const priorKeluar = transaksiPengeluaranList
      .filter(t => new Date(t.tanggal) < startDate)
      .reduce((sum, t) => {
        const item = t.items.find(i => i.barangId === barang.id);
        return sum + (item ? item.usulanJumlah : 0);
      }, 0);

    const initialSaldo = Math.max(0, barang.stokAwal + priorMasuk - priorKeluar);

    // 2. Events during period
    interface EventItem {
      tanggal: string;
      dateObj: Date;
      noBukti: string;
      jenis: 'masuk' | 'keluar';
      masuk: number;
      keluar: number;
      keterangan: string;
    }

    const events: EventItem[] = [];

    // Incoming
    transaksiPenerimaanList.forEach(t => {
      const d = new Date(t.tanggal);
      if (d >= startDate && d <= endDate) {
        const item = t.items.find(i => i.barangId === barang.id);
        if (item && item.jumlahMasuk > 0) {
          events.push({
            tanggal: t.tanggal,
            dateObj: d,
            noBukti: t.noBukti || 'Penerimaan BOS',
            jenis: 'masuk',
            masuk: item.jumlahMasuk,
            keluar: 0,
            keterangan: `Penerimaan BOS - ${t.penyedia || t.sumberDana || 'Penyedia'}`
          });
        }
      }
    });

    // Outgoing
    transaksiPengeluaranList.forEach(t => {
      const d = new Date(t.tanggal);
      if (d >= startDate && d <= endDate) {
        const item = t.items.find(i => i.barangId === barang.id);
        if (item && item.usulanJumlah > 0) {
          events.push({
            tanggal: t.tanggal,
            dateObj: d,
            noBukti: t.noSPPB || t.noBAST || t.noSPB || t.noNPB || 'Penyaluran',
            jenis: 'keluar',
            masuk: 0,
            keluar: item.usulanJumlah,
            keterangan: `Penyaluran ke ${t.unitPemohon}`
          });
        }
      }
    });

    // Sort chronologically: if same date, masuk comes before keluar
    events.sort((a, b) => {
      const diff = a.dateObj.getTime() - b.dateObj.getTime();
      if (diff !== 0) return diff;
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
              <span className="w-36 font-semibold text-slate-800">Kode Barang / NUSP</span>
              <span className="w-3">:</span>
              <span className="font-mono flex-1">{barang.kodeBarang} / {barang.nusp}</span>
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
              <td className="border border-black px-2 py-1 text-center font-mono text-[11px]">
                {formatTanggalIndonesia(startDate.toISOString().split('T')[0])}
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

      {/* Signatures Section */}
      <div className="doc-signature-block avoid-break mt-8 pt-4">
        <div className="flex justify-end text-xs mb-2">
          <span>{kopConfig.kotaSurat || 'Bekasi'}, {currentDateString}</span>
        </div>

        <div className="grid grid-cols-2 gap-8 text-xs text-center">
          {/* Left: Kepala Sekolah */}
          <div className="flex flex-col justify-between h-32">
            <div>
              <p className="font-semibold">Mengetahui,</p>
              <p className="font-bold uppercase">{kepsek.jabatan || 'Kepala Sekolah'}</p>
            </div>
            <div>
              <p className="font-bold underline uppercase">{kepsek.nama}</p>
              <p className="text-[11px]">NIP. {kepsek.nip}</p>
              {kepsek.pangkatGolongan && (
                <p className="text-[10px] text-slate-600">{kepsek.pangkatGolongan}</p>
              )}
            </div>
          </div>

          {/* Right: Pengurus Barang */}
          <div className="flex flex-col justify-between h-32">
            <div>
              <p className="font-semibold">Petugas Penyimpan /</p>
              <p className="font-bold uppercase">{pengurusBarang.jabatan || 'Pengurus Barang Pembantu'}</p>
            </div>
            <div>
              <p className="font-bold underline uppercase">{pengurusBarang.nama}</p>
              <p className="text-[11px]">NIP. {pengurusBarang.nip}</p>
              {pengurusBarang.pangkatGolongan && (
                <p className="text-[10px] text-slate-600">{pengurusBarang.pangkatGolongan}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
