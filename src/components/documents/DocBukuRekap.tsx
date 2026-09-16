import React from 'react';
import { Barang, KopSuratConfig, Pejabat, TransaksiPenerimaan, TransaksiPengeluaran } from '../../types';
import { formatRupiah, formatTanggalIndonesia } from '../../utils/numberGenerator';
import { KopSuratView } from '../KopSuratView';

interface Props {
  transaksiPengeluaranList: TransaksiPengeluaran[];
  transaksiPenerimaanList: TransaksiPenerimaan[];
  masterBarang: Barang[];
  kopConfig: KopSuratConfig;
  pejabatList: Pejabat[];
  minRows?: number;
}

interface RekapRow {
  id: string;
  tanggal: string;
  noBukti: string;
  kodeBarang: string;
  nusp: string;
  namaBarang: string;
  satuan: string;
  tipe: 'masuk' | 'keluar';
  jumlahMasuk: number;
  hargaSatuanMasuk: number;
  totalMasuk: number;
  jumlahKeluar: number;
  hargaSatuanKeluar: number;
  totalKeluar: number;
  saldoJumlah: number;
  keterangan: string;
}

export const DocBukuRekap: React.FC<Props> = ({
  transaksiPengeluaranList,
  transaksiPenerimaanList,
  masterBarang,
  kopConfig,
  pejabatList,
  minRows = 16
}) => {
  const pengurusBarang = pejabatList.find(p => p.id === 'pejabat-pengurus-barang') || pejabatList[2] || {
    nama: 'Rina Kartikasari, S.AP.',
    nip: '19890820 201402 2 003',
    pangkatGolongan: 'Penata Muda / III a',
    jabatan: 'Pengurus Barang Pembantu'
  };

  const kepsek = pejabatList.find(p => p.id === 'pejabat-kepsek') || pejabatList[0] || {
    nama: 'Drs. H. Bambang Suhartono, M.Pd.',
    nip: '19680512 199303 1 005',
    pangkatGolongan: 'Pembina Utama Muda / IV c',
    jabatan: 'Kepala Sekolah'
  };

  // Compile combined ledger entries chronologically
  const rows: RekapRow[] = [];

  // 1. Add incoming items
  transaksiPenerimaanList.forEach(trx => {
    trx.items.forEach(item => {
      const subtotal = item.subtotal || (item.jumlahMasuk * item.hargaSatuan);
      rows.push({
        id: `rcv-${trx.id}-${item.barangId}`,
        tanggal: trx.tanggal,
        noBukti: trx.noBukti,
        kodeBarang: item.kodeBarang,
        nusp: item.nusp,
        namaBarang: item.namaBarang,
        satuan: item.satuan,
        tipe: 'masuk',
        jumlahMasuk: item.jumlahMasuk,
        hargaSatuanMasuk: item.hargaSatuan,
        totalMasuk: subtotal,
        jumlahKeluar: 0,
        hargaSatuanKeluar: 0,
        totalKeluar: 0,
        saldoJumlah: item.jumlahMasuk,
        keterangan: `${trx.sumberDana} (${trx.penyedia})`
      });
    });
  });

  // 2. Add outgoing disbursement items
  transaksiPengeluaranList.forEach(trx => {
    trx.items.forEach(item => {
      const subtotal = item.usulanJumlah * item.hargaSatuan;
      rows.push({
        id: `out-${trx.id}-${item.barangId}`,
        tanggal: trx.tanggal,
        noBukti: trx.noBAST,
        kodeBarang: item.kodeBarang,
        nusp: item.nusp,
        namaBarang: item.namaBarang,
        satuan: item.satuan,
        tipe: 'keluar',
        jumlahMasuk: 0,
        hargaSatuanMasuk: 0,
        totalMasuk: 0,
        jumlahKeluar: item.usulanJumlah,
        hargaSatuanKeluar: item.hargaSatuan,
        totalKeluar: subtotal,
        saldoJumlah: Math.max(0, item.sisaBarang - item.usulanJumlah),
        keterangan: `${trx.unitPemohon}: ${item.keperluan || trx.keperluanUmum}`
      });
    });
  });

  // Sort rows chronologically
  rows.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

  // Accumulate totals
  const grandTotalMasuk = rows.reduce((acc, r) => acc + r.totalMasuk, 0);
  const grandTotalKeluar = rows.reduce((acc, r) => acc + r.totalKeluar, 0);
  const totalVolumeMasuk = rows.reduce((acc, r) => acc + r.jumlahMasuk, 0);
  const totalVolumeKeluar = rows.reduce((acc, r) => acc + r.jumlahKeluar, 0);

  const totalEmptyRows = Math.max(0, minRows - rows.length);

  return (
    <div className="doc-content font-serif text-black select-text">
      {/* Official Kop (Preserved Proportion) */}
      <div className="doc-header-kop avoid-break">
        <KopSuratView config={kopConfig} />
      </div>

      {/* Report Title */}
      <div className="doc-meta-block avoid-break">
        <div className="doc-title-block">
          <h2>BUKU PENERIMAAN DAN PENGELUARAN BARANG PERSEDIAAN</h2>
          <p className="font-bold text-slate-800 tracking-wide">REKAPITULASI DANA BANTUAN OPERASIONAL SEKOLAH (BOS) &amp; APBD</p>
          <p className="italic text-slate-700">Tahun Anggaran {new Date().getFullYear()} — Semester Berjalan</p>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="overflow-x-auto w-full">
        <table className="doc-table w-full border-collapse border border-black text-[8.5pt] mb-3" style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr className="bg-slate-100 text-center font-bold">
              <th rowSpan={2} style={{ width: '3%' }} className="border border-black px-1 py-1">No</th>
              <th rowSpan={2} style={{ width: '8%' }} className="border border-black px-1 py-1">Tanggal</th>
              <th rowSpan={2} style={{ width: '11%' }} className="border border-black px-1 py-1">No. Bukti / Dokumen</th>
              <th rowSpan={2} style={{ width: '9%' }} className="border border-black px-1 py-1">Kode / NUSP</th>
              <th rowSpan={2} style={{ width: '17%' }} className="border border-black px-1.5 py-1">Uraian Nama Barang</th>
              <th rowSpan={2} style={{ width: '4%' }} className="border border-black px-1 py-1">Sat.</th>
              <th colSpan={3} style={{ width: '18%' }} className="border border-black px-1 py-1 bg-emerald-50/50">PENERIMAAN (MASUK)</th>
              <th colSpan={3} style={{ width: '18%' }} className="border border-black px-1 py-1 bg-amber-50/50">PENGELUARAN (DISALURKAN)</th>
              <th rowSpan={2} style={{ width: '4%' }} className="border border-black px-1 py-1">Sisa</th>
              <th rowSpan={2} style={{ width: '8%' }} className="border border-black px-1.5 py-1">Keterangan / Sumber</th>
            </tr>
            <tr className="bg-slate-50 text-center font-semibold text-[8pt]">
              <th style={{ width: '4%' }} className="border border-black px-1 py-0.5">Vol</th>
              <th style={{ width: '6%' }} className="border border-black px-1 py-0.5">Harga (Rp)</th>
              <th style={{ width: '8%' }} className="border border-black px-1 py-0.5">Total (Rp)</th>
              <th style={{ width: '4%' }} className="border border-black px-1 py-0.5">Vol</th>
              <th style={{ width: '6%' }} className="border border-black px-1 py-0.5">Harga (Rp)</th>
              <th style={{ width: '8%' }} className="border border-black px-1 py-0.5">Total (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id || idx} className="align-top hover:bg-slate-50/50">
                <td className="border border-black px-1 py-1 text-center font-medium">{idx + 1}.</td>
                <td className="border border-black px-1 py-1 text-center text-[8pt]">{formatTanggalIndonesia(row.tanggal)}</td>
                <td className="border border-black px-1 py-1 font-mono text-[8pt]">{row.noBukti}</td>
                <td className="border border-black px-1 py-1 font-mono text-[8pt]">
                  <div>{row.kodeBarang}</div>
                  <div className="text-[7pt] text-slate-500">{row.nusp}</div>
                </td>
                <td className="border border-black px-1.5 py-1 font-medium">{row.namaBarang}</td>
                <td className="border border-black px-1 py-1 text-center">{row.satuan}</td>

                {/* Masuk */}
                <td className="border border-black px-1 py-1 text-center font-medium bg-emerald-50/10">
                  {row.jumlahMasuk > 0 ? row.jumlahMasuk : '-'}
                </td>
                <td className="border border-black px-1 py-1 text-right text-[8pt] bg-emerald-50/10">
                  {row.hargaSatuanMasuk > 0 ? formatRupiah(row.hargaSatuanMasuk).replace('Rp', '') : '-'}
                </td>
                <td className="border border-black px-1 py-1 text-right font-medium text-[8pt] bg-emerald-50/10">
                  {row.totalMasuk > 0 ? formatRupiah(row.totalMasuk).replace('Rp', '') : '-'}
                </td>

                {/* Keluar */}
                <td className="border border-black px-1 py-1 text-center font-medium bg-amber-50/10">
                  {row.jumlahKeluar > 0 ? row.jumlahKeluar : '-'}
                </td>
                <td className="border border-black px-1 py-1 text-right text-[8pt] bg-amber-50/10">
                  {row.hargaSatuanKeluar > 0 ? formatRupiah(row.hargaSatuanKeluar).replace('Rp', '') : '-'}
                </td>
                <td className="border border-black px-1 py-1 text-right font-medium text-[8pt] bg-amber-50/10">
                  {row.totalKeluar > 0 ? formatRupiah(row.totalKeluar).replace('Rp', '') : '-'}
                </td>

                {/* Sisa & Ket */}
                <td className="border border-black px-1 py-1 text-center font-bold">{row.saldoJumlah}</td>
                <td className="border border-black px-1 py-1 text-[8pt]">{row.keterangan}</td>
              </tr>
            ))}

            {/* Standard blank grid rows */}
            {Array.from({ length: totalEmptyRows }).map((_, i) => (
              <tr key={`empty-${i}`} className="h-6">
                <td className="border border-black px-1 py-1 text-center text-slate-300">
                  {rows.length + i + 1}.
                </td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
              </tr>
            ))}

            {/* TOTAL / JUMLAH ACCUMULATION ROW */}
            <tr className="bg-slate-200/80 font-bold text-center">
              <td colSpan={6} className="border border-black px-2 py-1.5 text-right uppercase tracking-wider">
                JUMLAH TOTAL:
              </td>
              {/* Masuk Totals */}
              <td className="border border-black px-1 py-1.5">{totalVolumeMasuk}</td>
              <td className="border border-black px-1 py-1.5 bg-slate-100/50">-</td>
              <td className="border border-black px-1 py-1.5 text-right font-mono text-[8pt]">
                {formatRupiah(grandTotalMasuk)}
              </td>
              {/* Keluar Totals */}
              <td className="border border-black px-1 py-1.5">{totalVolumeKeluar}</td>
              <td className="border border-black px-1 py-1.5 bg-slate-100/50">-</td>
              <td className="border border-black px-1 py-1.5 text-right font-mono text-[8pt]">
                {formatRupiah(grandTotalKeluar)}
              </td>
              {/* Balance */}
              <td colSpan={2} className="border border-black px-2 py-1.5 text-left text-[8pt]">
                Saldo Buku: {formatRupiah(grandTotalMasuk - grandTotalKeluar)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legal Signatures */}
      <div className="doc-signature-block avoid-break">
        <div className="grid grid-cols-2 text-center">
          <div>
            <p className="font-semibold">Mengetahui,</p>
            <p className="font-bold text-slate-900 uppercase">Kepala {kopConfig.namaSekolah}</p>
            <p className="text-[8pt] text-slate-600 italic">Kuasa Pengguna Barang</p>
            <div className="doc-signature-space" />
            <p className="font-bold underline uppercase tracking-wide">{kepsek.nama}</p>
            <p className="font-mono text-[8pt]">NIP. {kepsek.nip}</p>
            <p className="text-[8pt] text-slate-600">Pangkat/Gol: {kepsek.pangkatGolongan}</p>
          </div>

          <div>
            <p>
              {kopConfig.kotaSurat}, {formatTanggalIndonesia(new Date().toISOString().split('T')[0])}
            </p>
            <p className="font-bold text-slate-900 uppercase">Pengurus Barang Pembantu</p>
            <p className="text-[8pt] text-slate-600 italic">Pengelola Aset Sekolah</p>
            <div className="doc-signature-space" />
            <p className="font-bold underline uppercase tracking-wide">{pengurusBarang.nama}</p>
            <p className="font-mono text-[8pt]">NIP. {pengurusBarang.nip}</p>
            <p className="text-[8pt] text-slate-600">Pangkat/Gol: {pengurusBarang.pangkatGolongan}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
