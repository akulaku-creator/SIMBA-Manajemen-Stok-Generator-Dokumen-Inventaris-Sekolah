import React, { useMemo } from 'react';
import { Barang, KopSuratConfig, Pejabat, TransaksiPenerimaan, TransaksiPengeluaran } from '../../types';
import { formatRupiah, formatTanggalIndonesia, getKalimatStockOpname, terbilang } from '../../utils/numberGenerator';
import { KopSuratView } from '../KopSuratView';

interface Props {
  masterBarang: Barang[];
  transaksiPenerimaanList: TransaksiPenerimaan[];
  transaksiPengeluaranList: TransaksiPengeluaran[];
  kopConfig: KopSuratConfig;
  pejabatList: Pejabat[];
  selectedMonth?: number; // 0-11 (Jan=0, Dec=11)
  selectedYear?: number;
  nomorDokumen?: string;
}

export const DocStockOpname: React.FC<Props> = ({
  masterBarang,
  transaksiPenerimaanList,
  transaksiPengeluaranList,
  kopConfig,
  pejabatList,
  selectedMonth = new Date().getMonth(),
  selectedYear = new Date().getFullYear(),
  nomorDokumen
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

  // Determine last day of selected month/year
  const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
  const cutoffDateString = lastDayOfMonth.toISOString().split('T')[0];

  // Opening sentence with formal terbilang:
  // e.g. "Pada hari ini Senin tanggal Tiga Puluh Satu Bulan Agustus Tahun Dua Ribu Dua Puluh Enam..."
  const kalimatPembuka = getKalimatStockOpname(cutoffDateString, kopConfig.namaSekolah);

  // Calculate stock opname per item up to the cutoff date (Eksklusi Belanja Modal: Hanya BHP)
  const stockOpnameItems = useMemo(() => {
    return masterBarang
      .filter(barang => barang.jenisBarang !== 'Belanja Modal')
      .map(barang => {
      // Incoming up to cutoff date
      const masuk = transaksiPenerimaanList
        .filter(t => new Date(t.tanggal) <= lastDayOfMonth)
        .reduce((sum, t) => {
          const item = t.items.find(i => i.barangId === barang.id);
          return sum + (item ? item.jumlahMasuk : 0);
        }, 0);

      // Outgoing up to cutoff date
      const keluar = transaksiPengeluaranList
        .filter(t => new Date(t.tanggal) <= lastDayOfMonth)
        .reduce((sum, t) => {
          const item = t.items.find(i => i.barangId === barang.id);
          return sum + (item ? item.usulanJumlah : 0);
        }, 0);

      // Current physical stock
      const sisaFisik = Math.max(0, barang.stokAwal + masuk - keluar);
      const totalNilaiSisa = sisaFisik * barang.hargaSatuan;

      return {
        ...barang,
        saldoAwalVolume: barang.stokAwal,
        saldoAwalNilai: barang.stokAwal * barang.hargaSatuan,
        masukVolume: masuk,
        masukNilai: masuk * barang.hargaSatuan,
        keluarVolume: keluar,
        keluarNilai: keluar * barang.hargaSatuan,
        sisaFisikVolume: sisaFisik,
        sisaFisikNilai: totalNilaiSisa
      };
    });
  }, [masterBarang, transaksiPenerimaanList, transaksiPengeluaranList, cutoffDateString]);

  // Group summary by standard Kode Rekening Belanja
  const summaryByKodeRekening = useMemo(() => {
    const groups: { [kode: string]: {
      kodeRekening: string;
      namaRekening: string;
      saldoAwalNilai: number;
      masukNilai: number;
      keluarNilai: number;
      sisaFisikNilai: number;
      jumlahItem: number;
    } } = {};

    stockOpnameItems.forEach(item => {
      const kode = item.kodeRekening || '5.1.02.01.01.0024';
      const nama = item.namaRekening || 'Belanja Alat/Bahan untuk Kegiatan Kantor';

      if (!groups[kode]) {
        groups[kode] = {
          kodeRekening: kode,
          namaRekening: nama,
          saldoAwalNilai: 0,
          masukNilai: 0,
          keluarNilai: 0,
          sisaFisikNilai: 0,
          jumlahItem: 0
        };
      }

      groups[kode].saldoAwalNilai += item.saldoAwalNilai;
      groups[kode].masukNilai += item.masukNilai;
      groups[kode].keluarNilai += item.keluarNilai;
      groups[kode].sisaFisikNilai += item.sisaFisikNilai;
      groups[kode].jumlahItem += 1;
    });

    return Object.values(groups).sort((a, b) => a.kodeRekening.localeCompare(b.kodeRekening));
  }, [stockOpnameItems]);

  const grandTotalSisaNilai = summaryByKodeRekening.reduce((sum, g) => sum + g.sisaFisikNilai, 0);
  const grandTotalSaldoAwal = summaryByKodeRekening.reduce((sum, g) => sum + g.saldoAwalNilai, 0);
  const grandTotalMasuk = summaryByKodeRekening.reduce((sum, g) => sum + g.masukNilai, 0);
  const grandTotalKeluar = summaryByKodeRekening.reduce((sum, g) => sum + g.keluarNilai, 0);

  const defaultDocNumber = `028/009/BAST-SO-BOS/${['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][selectedMonth]}/${selectedYear}`;
  const noSurat = nomorDokumen || defaultDocNumber;

  return (
    <div className="doc-content font-serif text-black select-text">
      {/* Kop Surat Resmi (Preserved Proportion) */}
      <div className="doc-header-kop avoid-break">
        <KopSuratView config={kopConfig} />
      </div>

      {/* Header Dokumen & Narasi Pembuka (Metadata Block) */}
      <div className="doc-meta-block avoid-break">
        <div className="doc-title-block">
          <h2>BERITA ACARA INVENTARIS FISIK PERSEDIAAN (STOCK OPNAME)</h2>
          <p className="font-bold text-slate-800 tracking-wide">DANA BANTUAN OPERASIONAL SEKOLAH (BOS)</p>
          <p className="font-mono text-slate-700">Nomor: {noSurat}</p>
        </div>

        {/* Kalimat Pembuka Formal Terbilang Tanggal */}
        <p className="doc-desc">
          {kalimatPembuka}
        </p>

        {/* Identitas Pihak I & II (Spasi Rapat) */}
        <div className="my-1 pl-2 space-y-1 text-[8pt]">
          {/* Pihak 1 */}
          <div className="grid grid-cols-[20px_130px_10px_1fr] items-start">
            <span className="font-bold">1.</span>
            <span className="font-medium text-slate-700">Nama Lengkap</span>
            <span>:</span>
            <span className="font-bold text-slate-900">{kepsek.nama}</span>

            <span></span>
            <span className="text-slate-600">NIP</span>
            <span>:</span>
            <span className="font-mono">{kepsek.nip}</span>

            <span></span>
            <span className="text-slate-600">Pangkat / Golongan</span>
            <span>:</span>
            <span>{kepsek.pangkatGolongan}</span>

            <span></span>
            <span className="text-slate-600">Jabatan</span>
            <span>:</span>
            <span className="font-semibold">{kepsek.jabatan} (selaku Kuasa Pengguna Barang)</span>
          </div>

          <p className="text-[7.5pt] italic text-slate-600 pl-5">
            Selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>.
          </p>

          {/* Pihak 2 */}
          <div className="grid grid-cols-[20px_130px_10px_1fr] items-start pt-0.5">
            <span className="font-bold">2.</span>
            <span className="font-medium text-slate-700">Nama Lengkap</span>
            <span>:</span>
            <span className="font-bold text-slate-900">{pengurusBarang.nama}</span>

            <span></span>
            <span className="text-slate-600">NIP</span>
            <span>:</span>
            <span className="font-mono">{pengurusBarang.nip}</span>

            <span></span>
            <span className="text-slate-600">Pangkat / Golongan</span>
            <span>:</span>
            <span>{pengurusBarang.pangkatGolongan}</span>

            <span></span>
            <span className="text-slate-600">Jabatan</span>
            <span>:</span>
            <span className="font-semibold">{pengurusBarang.jabatan} (Pengelola Persediaan)</span>
          </div>

          <p className="text-[7.5pt] italic text-slate-600 pl-5">
            Selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>.
          </p>
        </div>

        {/* Narasi Pelaksanaan Stock Opname */}
        <p className="doc-desc">
          Menyatakan dengan sebenarnya bahwa <strong>PIHAK KEDUA</strong> dengan disaksikan dan diperiksa bersama oleh <strong>PIHAK PERTAMA</strong> telah melaksanakan Pemeriksaan dan Inventarisasi Fisik Persediaan (Stock Opname) Barang Milik Daerah bersumber dari Dana Bantuan Operasional Sekolah (BOS) posisi per <strong>{formatTanggalIndonesia(cutoffDateString)}</strong>, dengan rincian rekapitulasi nilai fisik persediaan per Kode Rekening Belanja Standar sebagai berikut:
        </p>
      </div>

      {/* Tabel Ringkasan Nilai Persediaan per Kode Rekening Belanja */}
      <div className="mb-3">
        <table className="doc-table w-full border-collapse border border-black text-[8.5pt]">
          <thead>
            <tr className="bg-slate-100 text-center font-bold">
              <th className="border border-black px-1 py-1 w-8">No.</th>
              <th className="border border-black px-1.5 py-1 w-32">Kode Rekening</th>
              <th className="border border-black px-2 py-1 text-left">Uraian Akun Belanja Persediaan</th>
              <th className="border border-black px-1.5 py-1 w-24">Saldo Awal (Rp)</th>
              <th className="border border-black px-1.5 py-1 w-24">Penerimaan (Rp)</th>
              <th className="border border-black px-1.5 py-1 w-24">Penyaluran (Rp)</th>
              <th className="border border-black px-1.5 py-1 w-28 bg-blue-50/50">Nilai Fisik Sisa (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {summaryByKodeRekening.map((grp, idx) => (
              <tr key={grp.kodeRekening} className="align-top hover:bg-slate-50/40">
                <td className="border border-black px-1 py-1 text-center font-medium">{idx + 1}.</td>
                <td className="border border-black px-1.5 py-1 font-mono text-[8pt] text-slate-800">{grp.kodeRekening}</td>
                <td className="border border-black px-2 py-1 font-medium">{grp.namaRekening}</td>
                <td className="border border-black px-1.5 py-1 text-right font-mono text-[8pt]">
                  {formatRupiah(grp.saldoAwalNilai).replace('Rp', '')}
                </td>
                <td className="border border-black px-1.5 py-1 text-right font-mono text-[8pt] text-emerald-800">
                  {formatRupiah(grp.masukNilai).replace('Rp', '')}
                </td>
                <td className="border border-black px-1.5 py-1 text-right font-mono text-[8pt] text-amber-800">
                  {formatRupiah(grp.keluarNilai).replace('Rp', '')}
                </td>
                <td className="border border-black px-1.5 py-1 text-right font-mono text-[8.5pt] font-bold bg-blue-50/20">
                  {formatRupiah(grp.sisaFisikNilai)}
                </td>
              </tr>
            ))}

            {/* Total Row */}
            <tr className="bg-slate-200/90 font-bold">
              <td colSpan={3} className="border border-black px-2 py-1 text-right uppercase tracking-wider">
                JUMLAH TOTAL NILAI FISIK PERSEDIAAN:
              </td>
              <td className="border border-black px-1.5 py-1 text-right font-mono text-[8pt]">
                {formatRupiah(grandTotalSaldoAwal).replace('Rp', '')}
              </td>
              <td className="border border-black px-1.5 py-1 text-right font-mono text-[8pt]">
                {formatRupiah(grandTotalMasuk).replace('Rp', '')}
              </td>
              <td className="border border-black px-1.5 py-1 text-right font-mono text-[8pt]">
                {formatRupiah(grandTotalKeluar).replace('Rp', '')}
              </td>
              <td className="border border-black px-1.5 py-1 text-right font-mono text-[9pt] font-extrabold bg-blue-100/50">
                {formatRupiah(grandTotalSisaNilai)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Terbilang Nilai Total */}
      <div className="border border-black/80 bg-slate-50/70 p-2 text-[9pt] mb-3 rounded-xs">
        <p className="font-semibold text-slate-900">
          Terbilang: <span className="italic font-bold text-slate-950">"{terbilang(grandTotalSisaNilai).trim()} Rupiah"</span>
        </p>
      </div>

      {/* Rincian Fisik Singkat / Ringkasan Kondisi */}
      <div className="mb-3 text-[9pt]">
        <p className="font-semibold mb-1 text-slate-900">Hasil Pemeriksaan Fisik di Lokasi Penyimpanan/Gudang:</p>
        <ul className="list-disc list-inside space-y-0.5 text-slate-800 text-[8.5pt]">
          <li>Seluruh barang persediaan habis pakai tersimpan dalam kondisi <strong>Baik (B)</strong> dan tertata sesuai kartu gudang.</li>
          <li>Kesesuaian kuantitas antara saldo buku register dengan bukti fisik di lapangan adalah <strong>100% Cocok (Sesuai)</strong>.</li>
          <li>Tidak ditemukan adanya barang persediaan yang rusak berat, hilang, maupun kadaluwarsa pada periode pelaporan ini.</li>
        </ul>
      </div>

      {/* Kalimat Penutup */}
      <p className="text-justify mb-4 text-[9pt] leading-relaxed">
        Demikian Berita Acara Inventaris Fisik Persediaan (Stock Opname) ini dibuat dengan sebenarnya dalam rangkap 3 (tiga) untuk dipergunakan sebagai bahan pertanggungjawaban pengelolaan aset, penyusunan Laporan Keuangan Sekolah, serta rekonsiliasi persediaan ke Dinas Pendidikan.
      </p>

      {/* Blok Tanda Tangan Resmi Berjejer */}
      <div className="doc-signature-block avoid-break">
        <div className="grid grid-cols-2 text-center">
          {/* Kolom Kiri: Pihak Kedua */}
          <div>
            <p className="font-semibold text-slate-900">PIHAK KEDUA,</p>
            <p className="font-bold text-slate-900 uppercase">PENGURUS BARANG PEMBANTU</p>
            <p className="text-[8pt] text-slate-600 italic">Pengelola Fisik Persediaan</p>
            <div className="doc-signature-space" />
            <p className="font-bold underline uppercase tracking-wide">{pengurusBarang.nama}</p>
            <p className="font-mono text-[8pt]">NIP. {pengurusBarang.nip}</p>
            <p className="text-[8pt] text-slate-600">Pangkat/Gol: {pengurusBarang.pangkatGolongan}</p>
          </div>

          {/* Kolom Kanan: Pihak Pertama */}
          <div>
            <p>
              {kopConfig.kotaSurat}, {formatTanggalIndonesia(cutoffDateString)}
            </p>
            <p className="font-semibold text-slate-900 uppercase">MENGETAHUI:</p>
            <p className="font-bold text-slate-900 uppercase">KEPALA SEKOLAH</p>
            <p className="text-[8pt] text-slate-600 italic">Kuasa Pengguna Barang</p>
            <div className="doc-signature-space" />
            <p className="font-bold underline uppercase tracking-wide">{kepsek.nama}</p>
            <p className="font-mono text-[8pt]">NIP. {kepsek.nip}</p>
            <p className="text-[8pt] text-slate-600">Pangkat/Gol: {kepsek.pangkatGolongan}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
