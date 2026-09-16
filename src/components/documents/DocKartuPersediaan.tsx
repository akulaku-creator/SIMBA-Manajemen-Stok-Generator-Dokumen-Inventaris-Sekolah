import React, { useMemo } from 'react';
import { 
  Barang, 
  KartuBarangPeriodFilter, 
  KopSuratConfig, 
  Pejabat, 
  TransaksiPenerimaan, 
  TransaksiPengeluaran 
} from '../../types';
import { formatRupiah, formatTanggalIndonesia, MONTHS_ID } from '../../utils/numberGenerator';
import { KopSuratView } from '../KopSuratView';

export interface DocKartuPersediaanProps {
  barang: Barang;
  transaksiPenerimaanList: TransaksiPenerimaan[];
  transaksiPengeluaranList: TransaksiPengeluaran[];
  kopConfig: KopSuratConfig;
  pejabatList: Pejabat[];
  periodFilter: KartuBarangPeriodFilter;
  minRows?: number;
  isLast?: boolean;
}

export function getKartuPersediaanDateRange(filter: KartuBarangPeriodFilter): { startDate: Date; endDate: Date; labelPeriode: string } {
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

export const DocKartuPersediaan: React.FC<DocKartuPersediaanProps> = ({
  barang,
  transaksiPenerimaanList,
  transaksiPengeluaranList,
  kopConfig,
  pejabatList,
  periodFilter,
  minRows = 10,
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
    return getKartuPersediaanDateRange(periodFilter);
  }, [periodFilter]);

  // Compute financial & physical mutation data
  const { 
    rows, 
    totalMasuk, 
    totalKeluar, 
    saldoAkhir, 
    saldoAwalPeriode,
    saldoAwalRupiah,
    totalBertambahRupiah,
    totalBerkurangRupiah,
    saldoAkhirRupiah
  } = useMemo(() => {
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
    const initialSaldoRp = initialSaldo * barang.hargaSatuan;

    // 2. Events during period
    interface EventItem {
      tanggal: string;
      dateObj: Date;
      noBukti: string;
      jenis: 'masuk' | 'keluar';
      masuk: number;
      keluar: number;
      hargaSatuan: number;
      uraian: string;
      keterangan: string;
    }

    const events: EventItem[] = [];

    // Incoming transactions
    transaksiPenerimaanList.forEach(t => {
      const d = new Date(t.tanggal);
      if (d >= startDate && d <= endDate) {
        const item = t.items.find(i => i.barangId === barang.id);
        if (item && item.jumlahMasuk > 0) {
          events.push({
            tanggal: t.tanggal,
            dateObj: d,
            noBukti: t.noBukti || 'Faktur Penerimaan',
            jenis: 'masuk',
            masuk: item.jumlahMasuk,
            keluar: 0,
            hargaSatuan: item.hargaSatuan || barang.hargaSatuan,
            uraian: `Penerimaan dari ${t.penyedia || 'Penyedia'} (${t.sumberDana})`,
            keterangan: t.keterangan || 'Faktur / BAST Pengadaan'
          });
        }
      }
    });

    // Outgoing transactions
    transaksiPengeluaranList.forEach(t => {
      const d = new Date(t.tanggal);
      if (d >= startDate && d <= endDate) {
        const item = t.items.find(i => i.barangId === barang.id);
        if (item && item.usulanJumlah > 0) {
          events.push({
            tanggal: t.tanggal,
            dateObj: d,
            noBukti: t.noSPPB || t.noBAST || t.noSPB || 'Penyaluran',
            jenis: 'keluar',
            masuk: 0,
            keluar: item.usulanJumlah,
            hargaSatuan: barang.hargaSatuan,
            uraian: `Penyaluran ke ${t.unitPemohon}`,
            keterangan: t.keperluanUmum || 'Penggunaan dinas'
          });
        }
      }
    });

    // Sort chronologically; if same date, incoming comes before outgoing
    events.sort((a, b) => {
      const diff = a.dateObj.getTime() - b.dateObj.getTime();
      if (diff !== 0) return diff;
      return a.jenis === 'masuk' ? -1 : 1;
    });

    // Running balances
    let runningQty = initialSaldo;
    let sumMasukQty = 0;
    let sumKeluarQty = 0;
    let sumBertambahRp = 0;
    let sumBerkurangRp = 0;

    const rowList = events.map(ev => {
      const itemHarga = ev.hargaSatuan || barang.hargaSatuan;
      let bertambahRp = 0;
      let berkurangRp = 0;

      if (ev.jenis === 'masuk') {
        runningQty += ev.masuk;
        sumMasukQty += ev.masuk;
        bertambahRp = ev.masuk * itemHarga;
        sumBertambahRp += bertambahRp;
      } else {
        runningQty -= ev.keluar;
        sumKeluarQty += ev.keluar;
        berkurangRp = ev.keluar * itemHarga;
        sumBerkurangRp += berkurangRp;
      }

      const sisaRp = runningQty * itemHarga;

      return {
        ...ev,
        sisaQty: runningQty,
        bertambahRp,
        berkurangRp,
        sisaRp
      };
    });

    const finalSaldoRp = runningQty * barang.hargaSatuan;

    return {
      saldoAwalPeriode: initialSaldo,
      saldoAwalRupiah: initialSaldoRp,
      rows: rowList,
      totalMasuk: sumMasukQty,
      totalKeluar: sumKeluarQty,
      saldoAkhir: runningQty,
      totalBertambahRupiah: sumBertambahRp,
      totalBerkurangRupiah: sumBerkurangRp,
      saldoAkhirRupiah: finalSaldoRp
    };
  }, [barang, transaksiPenerimaanList, transaksiPengeluaranList, startDate, endDate]);

  const paddingRowsCount = Math.max(0, minRows - (rows.length + 1)); // +1 for saldo awal row

  const currentDateString = formatTanggalIndonesia(new Date().toISOString().split('T')[0]);

  return (
    <div 
      className="doc-content kartu-persediaan-page w-full bg-white text-black p-0 select-text flex flex-col justify-between"
      style={{
        pageBreakAfter: isLast ? 'auto' : 'always',
        breakAfter: isLast ? 'auto' : 'page',
        minHeight: '100%'
      }}
    >
      <div>
        {/* Header KOP Resmi */}
        <div className="doc-header-kop avoid-break">
          <KopSuratView config={kopConfig} />
        </div>

        {/* Lampiran 13 Label & Title */}
        <div className="relative mt-2 mb-4">
          <div className="text-right text-[10px] font-mono text-slate-600 uppercase tracking-wider mb-1">
            LAMPIRAN 13 (STANDAR BMD PEMDA)
          </div>
          <div className="text-center">
            <h2 className="text-base font-bold uppercase tracking-wider underline">
              KARTU PERSEDIAAN BARANG
            </h2>
            <div className="text-xs font-medium text-slate-700 mt-0.5">
              Periode: <span className="font-semibold text-black">{labelPeriode}</span>
            </div>
          </div>
        </div>

        {/* Identification Metadata Box */}
        <div className="grid grid-cols-2 gap-4 text-xs mb-3 border border-slate-700 p-2.5 bg-slate-50/40 rounded-sm">
          {/* Kolom Kiri */}
          <div className="space-y-1">
            <div className="flex">
              <span className="w-28 text-slate-600 font-medium">SKPD / Unit</span>
              <span className="w-3 text-center">:</span>
              <span className="font-bold flex-1">{kopConfig.instansiNama || 'Dinas Pendidikan'}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-600 font-medium">Gudang</span>
              <span className="w-3 text-center">:</span>
              <span className="font-semibold flex-1">{barang.lokasiGudang || 'Gudang Persediaan Sekolah'}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-600 font-medium">Nama Barang</span>
              <span className="w-3 text-center">:</span>
              <span className="font-bold flex-1 text-slate-900">{barang.namaBarang}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-600 font-medium">Satuan</span>
              <span className="w-3 text-center">:</span>
              <span className="font-semibold flex-1">{barang.satuan}</span>
            </div>
          </div>

          {/* Kolom Kanan */}
          <div className="space-y-1">
            <div className="flex">
              <span className="w-36 text-slate-600 font-medium">KARTU NO</span>
              <span className="w-3 text-center">:</span>
              <span className="font-bold font-mono text-blue-900 flex-1">
                KP-{barang.nusp || barang.kodeBarang}
              </span>
            </div>
            <div className="flex">
              <span className="w-36 text-slate-600 font-medium">Kode Barang / NUSP</span>
              <span className="w-3 text-center">:</span>
              <span className="font-mono font-medium flex-1">
                {barang.kodeBarang} {barang.nusp ? `(${barang.nusp})` : ''}
              </span>
            </div>
            <div className="flex">
              <span className="w-36 text-slate-600 font-medium">Spesifikasi</span>
              <span className="w-3 text-center">:</span>
              <span className="font-medium flex-1">{barang.spesifikasi || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-36 text-slate-600 font-medium">Kode Rekening</span>
              <span className="w-3 text-center">:</span>
              <span className="font-mono font-semibold text-slate-800 flex-1">
                {barang.kodeRekening}
              </span>
            </div>
          </div>
        </div>

        {/* Tabel Komprehensif Lampiran 13 */}
        <div className="overflow-x-auto w-full">
          <table className="doc-table w-full text-[10px] leading-tight border-collapse border border-black text-black" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr className="bg-slate-100 text-center font-bold">
                <th rowSpan={2} style={{ width: '3%' }} className="border border-black p-1">No</th>
                <th rowSpan={2} style={{ width: '8%' }} className="border border-black p-1">Tanggal</th>
                <th rowSpan={2} style={{ width: '13%' }} className="border border-black p-1">No. &amp; Tgl Surat Dasar Penerimaan / Pengeluaran</th>
                <th rowSpan={2} style={{ width: '15%' }} className="border border-black p-1">Uraian</th>
                <th colSpan={3} style={{ width: '12%' }} className="border border-black p-1">Barang-Barang (Qty)</th>
                <th rowSpan={2} style={{ width: '8%' }} className="border border-black p-1">Harga Satuan (Rp)</th>
                <th colSpan={3} style={{ width: '27%' }} className="border border-black p-1">Jumlah Harga Barang Diterima / Dikeluarkan / Sisa</th>
                <th rowSpan={2} style={{ width: '14%' }} className="border border-black p-1">Keterangan</th>
              </tr>
              <tr className="bg-slate-100 text-center font-bold">
                <th style={{ width: '4%' }} className="border border-black p-1">Masuk</th>
                <th style={{ width: '4%' }} className="border border-black p-1">Keluar</th>
                <th style={{ width: '4%' }} className="border border-black p-1">Sisa</th>
                <th style={{ width: '9%' }} className="border border-black p-1">Bertambah (Rp)</th>
                <th style={{ width: '9%' }} className="border border-black p-1">Berkurang (Rp)</th>
                <th style={{ width: '9%' }} className="border border-black p-1">Sisa (Rp)</th>
              </tr>
              <tr className="bg-slate-50 text-[9px] text-center font-medium italic text-slate-600">
                <td className="border border-black py-0.5">1</td>
                <td className="border border-black py-0.5">2</td>
                <td className="border border-black py-0.5">3</td>
                <td className="border border-black py-0.5">4</td>
                <td className="border border-black py-0.5">5</td>
                <td className="border border-black py-0.5">6</td>
                <td className="border border-black py-0.5">7</td>
                <td className="border border-black py-0.5">8</td>
                <td className="border border-black py-0.5">9</td>
                <td className="border border-black py-0.5">10</td>
                <td className="border border-black py-0.5">11</td>
                <td className="border border-black py-0.5">12</td>
              </tr>
            </thead>
            <tbody>
              {/* Baris Saldo Awal */}
              <tr className="bg-amber-50/50 font-semibold">
                <td className="border border-black p-1 text-center">-</td>
                <td className="border border-black p-1 text-center font-mono">
                  {formatTanggalIndonesia(startDate.toISOString().split('T')[0])}
                </td>
                <td className="border border-black p-1 text-center text-slate-500 font-mono">-</td>
                <td className="border border-black p-1">Saldo Awal Bawaan Periode</td>
                <td className="border border-black p-1 text-center text-slate-400">-</td>
                <td className="border border-black p-1 text-center text-slate-400">-</td>
                <td className="border border-black p-1 text-center font-bold">{saldoAwalPeriode}</td>
                <td className="border border-black p-1 text-right font-mono">{formatRupiah(barang.hargaSatuan)}</td>
                <td className="border border-black p-1 text-center text-slate-400">-</td>
                <td className="border border-black p-1 text-center text-slate-400">-</td>
                <td className="border border-black p-1 text-right font-bold font-mono text-emerald-800">
                  {formatRupiah(saldoAwalRupiah)}
                </td>
                <td className="border border-black p-1 text-slate-600 text-[9px]">Saldo Bawaan</td>
              </tr>

              {/* Baris Transaksi Mutasi */}
              {rows.map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="border border-black p-1 text-center">{idx + 1}</td>
                  <td className="border border-black p-1 text-center font-mono whitespace-nowrap">
                    {formatTanggalIndonesia(r.tanggal)}
                  </td>
                  <td className="border border-black p-1 font-mono text-[9px] break-all">
                    {r.noBukti}
                  </td>
                  <td className="border border-black p-1">
                    {r.uraian}
                  </td>
                  {/* Qty Masuk */}
                  <td className="border border-black p-1 text-center font-medium">
                    {r.masuk > 0 ? (
                      <span className="font-bold text-emerald-700">+{r.masuk}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  {/* Qty Keluar */}
                  <td className="border border-black p-1 text-center font-medium">
                    {r.keluar > 0 ? (
                      <span className="font-bold text-rose-700">-{r.keluar}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  {/* Qty Sisa */}
                  <td className="border border-black p-1 text-center font-bold">
                    {r.sisaQty}
                  </td>
                  {/* Harga Satuan */}
                  <td className="border border-black p-1 text-right font-mono">
                    {formatRupiah(r.hargaSatuan)}
                  </td>
                  {/* Bertambah Rp */}
                  <td className="border border-black p-1 text-right font-mono">
                    {r.bertambahRp > 0 ? (
                      <span className="font-semibold text-emerald-700">{formatRupiah(r.bertambahRp)}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  {/* Berkurang Rp */}
                  <td className="border border-black p-1 text-right font-mono">
                    {r.berkurangRp > 0 ? (
                      <span className="font-semibold text-rose-700">{formatRupiah(r.berkurangRp)}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  {/* Sisa Rp */}
                  <td className="border border-black p-1 text-right font-mono font-bold text-slate-900">
                    {formatRupiah(r.sisaRp)}
                  </td>
                  <td className="border border-black p-1 text-[9px] text-slate-600">
                    {r.keterangan}
                  </td>
                </tr>
              ))}

              {/* Padding empty rows */}
              {Array.from({ length: paddingRowsCount }).map((_, pIdx) => (
                <tr key={`pad-${pIdx}`} className="h-6">
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                </tr>
              ))}

              {/* Baris Total / Rekapitulasi Periode */}
              <tr className="bg-slate-200 font-bold text-black border-t-2 border-black">
                <td colSpan={4} className="border border-black p-1.5 text-center uppercase tracking-wider">
                  JUMLAH MUTASI PERIODE INI
                </td>
                <td className="border border-black p-1.5 text-center font-bold text-emerald-800">
                  {totalMasuk}
                </td>
                <td className="border border-black p-1.5 text-center font-bold text-rose-800">
                  {totalKeluar}
                </td>
                <td className="border border-black p-1.5 text-center font-black bg-slate-300">
                  {saldoAkhir}
                </td>
                <td className="border border-black p-1.5 text-center text-slate-500 font-mono">-</td>
                <td className="border border-black p-1.5 text-right font-mono font-bold text-emerald-800">
                  {formatRupiah(totalBertambahRupiah)}
                </td>
                <td className="border border-black p-1.5 text-right font-mono font-bold text-rose-800">
                  {formatRupiah(totalBerkurangRupiah)}
                </td>
                <td className="border border-black p-1.5 text-right font-mono font-black text-slate-900 bg-slate-300">
                  {formatRupiah(saldoAkhirRupiah)}
                </td>
                <td className="border border-black p-1.5 text-center text-[9px] text-slate-600">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Tanda Tangan */}
      <div className="mt-6 pt-3 text-xs leading-normal">
        <div className="flex justify-between items-start">
          {/* Mengetahui: Kepala Sekolah / Pengguna Barang */}
          <div className="text-center w-64">
            <div className="font-medium text-slate-700">Mengetahui,</div>
            <div className="font-bold text-slate-900 mb-16">{kepsek.jabatan}</div>
            <div className="font-bold underline text-slate-900 uppercase">{kepsek.nama}</div>
            <div className="text-[11px] text-slate-600 font-mono">NIP. {kepsek.nip}</div>
            <div className="text-[10px] text-slate-500">{kepsek.pangkatGolongan}</div>
          </div>

          {/* Pengurus Barang Pembantu */}
          <div className="text-center w-64">
            <div className="text-slate-700">
              {kopConfig.kabupatenKota || 'Cihar Bintang'}, {currentDateString}
            </div>
            <div className="font-bold text-slate-900 mb-16">{pengurusBarang.jabatan}</div>
            <div className="font-bold underline text-slate-900 uppercase">{pengurusBarang.nama}</div>
            <div className="text-[11px] text-slate-600 font-mono">NIP. {pengurusBarang.nip}</div>
            <div className="text-[10px] text-slate-500">{pengurusBarang.pangkatGolongan}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
