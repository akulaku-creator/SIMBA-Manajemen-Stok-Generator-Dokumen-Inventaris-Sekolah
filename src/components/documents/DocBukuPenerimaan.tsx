import React from 'react';
import { KopSuratConfig, Pejabat, TransaksiPenerimaan } from '../../types';
import { formatRupiah, formatTanggalIndonesia, MONTHS_ID } from '../../utils/numberGenerator';
import { KopSuratView } from '../KopSuratView';

interface Props {
  transaksiPenerimaanList: TransaksiPenerimaan[];
  kopConfig: KopSuratConfig;
  pejabatList: Pejabat[];
  selectedMonth?: number; // 0-11 or undefined for all
  selectedYear?: number;
  minRows?: number;
}

export const DocBukuPenerimaan: React.FC<Props> = ({
  transaksiPenerimaanList,
  kopConfig,
  pejabatList,
  selectedMonth,
  selectedYear = new Date().getFullYear(),
  minRows = 14
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

  // Filter transactions by month/year if selected
  const filteredTrx = transaksiPenerimaanList.filter(trx => {
    const d = new Date(trx.tanggal);
    const matchYear = d.getFullYear() === selectedYear;
    const matchMonth = selectedMonth !== undefined && selectedMonth !== -1 ? d.getMonth() === selectedMonth : true;
    return matchYear && matchMonth;
  });

  // Flatten receipt items
  interface FlatRow {
    id: string;
    tanggal: string;
    penyedia: string;
    noBukti: string;
    kodeRekening: string;
    namaBarang: string;
    spesifikasi?: string;
    satuan: string;
    jumlahMasuk: number;
    hargaSatuan: number;
    subtotal: number;
    sumberDana: string;
    keterangan: string;
  }

  const rows: FlatRow[] = [];
  filteredTrx.forEach(trx => {
    trx.items.forEach((item, i) => {
      rows.push({
        id: `${trx.id}-${i}`,
        tanggal: trx.tanggal,
        penyedia: trx.penyedia,
        noBukti: trx.noBukti,
        kodeRekening: item.kodeRekening || '5.1.02.01.01.0024',
        namaBarang: item.namaBarang,
        satuan: item.satuan,
        jumlahMasuk: item.jumlahMasuk,
        hargaSatuan: item.hargaSatuan,
        subtotal: item.subtotal || (item.jumlahMasuk * item.hargaSatuan),
        sumberDana: trx.sumberDana,
        keterangan: trx.keterangan
      });
    });
  });

  // Sort by date ascending
  rows.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

  const totalKuantitas = rows.reduce((acc, r) => acc + r.jumlahMasuk, 0);
  const grandTotalNilai = rows.reduce((acc, r) => acc + r.subtotal, 0);
  const emptyRowsCount = Math.max(0, minRows - rows.length);

  const periodeLabel = selectedMonth !== undefined && selectedMonth !== -1
    ? `Bulan ${MONTHS_ID[selectedMonth]} Tahun ${selectedYear}`
    : `Tahun Anggaran ${selectedYear}`;

  return (
    <div className="doc-content font-serif text-black select-text">
      {/* Official Kop (Preserved Proportion) */}
      <div className="doc-header-kop avoid-break">
        <KopSuratView config={kopConfig} />
      </div>

      {/* Title */}
      <div className="doc-meta-block avoid-break">
        <div className="doc-title-block">
          <h2>BUKU PENERIMAAN BARANG PERSEDIAAN</h2>
          <p className="font-bold text-slate-800 tracking-wide">SUMBER DANA BANTUAN OPERASIONAL SEKOLAH (BOS) &amp; APBD</p>
          <p className="italic text-slate-700">Periode: {periodeLabel}</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto w-full">
        <table className="doc-table w-full border-collapse border border-black text-[8.5pt] mb-3" style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr className="bg-slate-100 text-center font-bold">
              <th style={{ width: '4%' }} className="border border-black px-1 py-1.5">No</th>
              <th style={{ width: '8%' }} className="border border-black px-1 py-1.5">Tanggal</th>
              <th style={{ width: '14%' }} className="border border-black px-1.5 py-1.5">Dari Siapa Diterima (Penyedia)</th>
              <th style={{ width: '9%' }} className="border border-black px-1 py-1.5">No. Bukti / Faktur</th>
              <th style={{ width: '10%' }} className="border border-black px-1 py-1.5">Kode Rekening Belanja</th>
              <th style={{ width: '16%' }} className="border border-black px-1.5 py-1.5">Uraian Nama Barang</th>
              <th style={{ width: '5%' }} className="border border-black px-1 py-1.5">Satuan</th>
              <th style={{ width: '5%' }} className="border border-black px-1 py-1.5">Kuantitas</th>
              <th style={{ width: '9%' }} className="border border-black px-1 py-1.5">Harga Satuan (Rp)</th>
              <th style={{ width: '10%' }} className="border border-black px-1 py-1.5 bg-emerald-50/50">Nilai Total (Rp)</th>
              <th style={{ width: '5%' }} className="border border-black px-1 py-1.5">Sumber Dana</th>
              <th style={{ width: '5%' }} className="border border-black px-1.5 py-1.5">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className="align-top hover:bg-slate-50/50">
                <td className="border border-black px-1 py-1 text-center font-medium">{idx + 1}.</td>
                <td className="border border-black px-1 py-1 text-center text-[8pt]">{formatTanggalIndonesia(row.tanggal)}</td>
                <td className="border border-black px-1.5 py-1 font-medium">{row.penyedia}</td>
                <td className="border border-black px-1 py-1 font-mono text-[8pt]">{row.noBukti}</td>
                <td className="border border-black px-1 py-1 font-mono text-[8pt]">{row.kodeRekening}</td>
                <td className="border border-black px-2 py-1 font-medium">{row.namaBarang}</td>
                <td className="border border-black px-1 py-1 text-center">{row.satuan}</td>
                <td className="border border-black px-1 py-1 text-center font-bold">{row.jumlahMasuk}</td>
                <td className="border border-black px-1.5 py-1 text-right font-mono text-[8pt]">
                  {formatRupiah(row.hargaSatuan).replace('Rp', '')}
                </td>
                <td className="border border-black px-1.5 py-1 text-right font-mono text-[8pt] font-semibold bg-emerald-50/15">
                  {formatRupiah(row.subtotal).replace('Rp', '')}
                </td>
                <td className="border border-black px-1 py-1 text-center text-[8pt]">{row.sumberDana}</td>
                <td className="border border-black px-1.5 py-1 text-[8pt] text-slate-700">{row.keterangan}</td>
              </tr>
            ))}

            {/* Empty filler rows for official print grid */}
            {Array.from({ length: emptyRowsCount }).map((_, i) => (
              <tr key={`empty-${i}`} className="h-6">
                <td className="border border-black px-1 py-1 text-center text-slate-300">{rows.length + i + 1}.</td>
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

            {/* Total Row */}
            <tr className="bg-slate-200/90 font-bold text-center">
              <td colSpan={7} className="border border-black px-2 py-1.5 text-right uppercase tracking-wider">
                JUMLAH TOTAL PENERIMAAN:
              </td>
              <td className="border border-black px-1 py-1.5 font-bold">{totalKuantitas}</td>
              <td className="border border-black px-1 py-1.5 bg-slate-100/50">-</td>
              <td className="border border-black px-1.5 py-1.5 text-right font-mono text-[9pt] font-extrabold bg-emerald-100/50">
                {formatRupiah(grandTotalNilai)}
              </td>
              <td colSpan={2} className="border border-black px-2 py-1.5 text-left text-[8pt] text-slate-700">
                Total {rows.length} item barang diterima
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signatures */}
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
