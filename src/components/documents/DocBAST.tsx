import React from 'react';
import { KopSuratConfig, Pejabat, TransaksiPengeluaran } from '../../types';
import { formatTanggalIndonesia, getKalimatBast } from '../../utils/numberGenerator';
import { KopSuratView } from '../KopSuratView';

interface Props {
  transaksi: TransaksiPengeluaran;
  kopConfig: KopSuratConfig;
  pejabatList: Pejabat[];
  minRows?: number;
}

export const DocBAST: React.FC<Props> = ({ 
  transaksi, 
  kopConfig, 
  pejabatList, 
  minRows = 6 
}) => {
  const kepsek = pejabatList.find(p => p.id === 'pejabat-kepsek') || {
    nama: 'Drs. H. Bambang Suhartono, M.Pd.',
    nip: '19680512 199303 1 005',
    pangkatGolongan: 'Pembina Utama Muda / IV c',
    jabatan: 'Kepala Sekolah'
  };

  const pihakPertama = pejabatList.find(p => p.id === transaksi.pengurusBarangId) || {
    nama: 'Rina Kartikasari, S.AP.',
    nip: '19890820 201402 2 003',
    pangkatGolongan: 'Penata Muda / III a',
    jabatan: 'Pengurus Barang Pembantu'
  };

  const pihakKedua = pejabatList.find(p => p.id === transaksi.pemohonId) || {
    nama: 'Staf Pemohon',
    nip: '-',
    pangkatGolongan: '-',
    jabatan: transaksi.unitPemohon
  };

  const totalEmptyRows = Math.max(0, minRows - transaksi.items.length);
  const pembukaBast = getKalimatBast(transaksi.tanggal);

  return (
    <div className="doc-content font-serif text-black select-text w-full">
      {/* Official Kop Surat */}
      <div className="doc-header-kop avoid-break">
        <KopSuratView config={kopConfig} />
      </div>

      {/* Document Title & Legal Clause (Metadata Block) */}
      <div className="doc-meta-block avoid-break">
        <div className="doc-title-block">
          <h2>BERITA ACARA SERAH TERIMA BARANG (BAST)</h2>
          <p>Nomor: {transaksi.noBAST}</p>
        </div>

        {/* Legal Clause and References (Spasi Rapat) */}
        <p className="doc-desc">
          Berdasarkan Surat Perintah Penyaluran Barang (SPPB) Nomor: <span className="font-semibold font-mono">{transaksi.noSPPB}</span> yang merujuk pada Surat Permintaan Barang (SPB) Nomor: <span className="font-semibold font-mono">{transaksi.noSPB}</span>:
        </p>
        
        <p className="doc-desc font-medium">
          {pembukaBast}
        </p>

        {/* PIHAK I & PIHAK II Identitas Grid (Spasi Rapat & Clean Layout Tanpa Border) */}
        <div className="grid grid-cols-2 gap-4 my-1.5 p-0 bg-transparent text-xs">
          {/* PIHAK I Identitas */}
          <div>
            <p className="font-bold text-slate-900 border-b border-slate-300 pb-0.5 mb-1 text-[8.5pt]">
              PIHAK PERTAMA (Yang Menyerahkan):
            </p>
            <table className="w-full table-identity doc-meta-table">
              <tbody>
                <tr>
                  <td className="col-label font-medium">Nama</td>
                  <td className="col-colon">:</td>
                  <td className="col-value font-bold">{pihakPertama.nama}</td>
                </tr>
                <tr>
                  <td className="col-label font-medium">NIP</td>
                  <td className="col-colon">:</td>
                  <td className="col-value font-mono text-[8pt]">{pihakPertama.nip}</td>
                </tr>
                <tr>
                  <td className="col-label font-medium">Jabatan</td>
                  <td className="col-colon">:</td>
                  <td className="col-value">{pihakPertama.jabatan}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* PIHAK II Identitas */}
          <div>
            <p className="font-bold text-slate-900 border-b border-slate-300 pb-0.5 mb-1 text-[8.5pt]">
              PIHAK KEDUA (Yang Menerima):
            </p>
            <table className="w-full table-identity doc-meta-table">
              <tbody>
                <tr>
                  <td className="col-label font-medium">Nama</td>
                  <td className="col-colon">:</td>
                  <td className="col-value font-bold">{pihakKedua.nama}</td>
                </tr>
                <tr>
                  <td className="col-label font-medium">NIP</td>
                  <td className="col-colon">:</td>
                  <td className="col-value font-mono text-[8pt]">{pihakKedua.nip || '-'}</td>
                </tr>
                <tr>
                  <td className="col-label font-medium">Unit Kerja</td>
                  <td className="col-colon">:</td>
                  <td className="col-value">{pihakKedua.jabatan} ({transaksi.unitPemohon})</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p className="doc-desc">
          PIHAK PERTAMA telah menyerahkan barang persediaan kepada PIHAK KEDUA, dan PIHAK KEDUA menyatakan telah menerima barang tersebut dalam keadaan baik, cukup, dan lengkap dengan rincian sebagai berikut:
        </p>
      </div>

      {/* Table of Goods with Spasi Rapat & Full Width (Tanpa Kolom NUSP) */}
      <table className="doc-table w-full border-collapse border border-black mb-1.5">
        <thead>
          <tr className="bg-slate-100/75 text-center font-bold">
            <th className="w-8">No.</th>
            <th className="w-28">Kode Barang</th>
            <th className="text-left">Nama &amp; Spesifikasi Barang</th>
            <th className="w-16">Satuan</th>
            <th className="w-20">Jumlah</th>
            <th className="w-24">Kondisi</th>
            <th className="w-40 text-left">Keperluan / Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {transaksi.items.map((item, index) => (
            <tr key={item.id || index} className="align-top avoid-break">
              <td className="text-center font-medium">{index + 1}.</td>
              <td className="text-center font-mono text-[8pt]">{item.kodeBarang}</td>
              <td className="font-medium">
                <div>{item.namaBarang}</div>
                {item.spesifikasi && (
                  <div className="text-[7.5pt] text-slate-600 italic">{item.spesifikasi}</div>
                )}
              </td>
              <td className="text-center">{item.satuan}</td>
              <td className="text-center font-bold">{item.usulanJumlah}</td>
              <td className="text-center text-[8pt] font-semibold text-emerald-950">
                Baik (100%)
              </td>
              <td className="text-[8pt]">{item.keperluan || '-'}</td>
            </tr>
          ))}

          {/* Empty rows to preserve formal standard layout (7 kolom proporsional) */}
          {Array.from({ length: totalEmptyRows }).map((_, i) => (
            <tr key={`empty-${i}`} className="h-5 avoid-break">
              <td className="text-center text-slate-300">
                {transaksi.items.length + i + 1}.
              </td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="doc-desc">
        Demikian Berita Acara Serah Terima Barang ini dibuat dengan sebenarnya dalam rangkap secukupnya untuk dipergunakan sebagaimana mestinya.
      </p>

      {/* 3-Point Government Legal Signatures (avoid-break with compact height) */}
      <div className="doc-signature-block avoid-break">
        <div className="grid grid-cols-2 text-center mb-2">
          <div>
            <p className="font-bold text-slate-900">PIHAK KEDUA</p>
            <p className="text-[8pt] text-slate-700">Yang Menerima,</p>
            <div className="doc-signature-space" />
            <p className="font-bold underline uppercase tracking-wide">{pihakKedua.nama}</p>
            <p className="font-mono text-[8pt]">NIP. {pihakKedua.nip || '-'}</p>
            <p className="text-[8pt] text-slate-600">{pihakKedua.jabatan}</p>
          </div>

          <div>
            <p className="font-bold text-slate-900">PIHAK PERTAMA</p>
            <p className="text-[8pt] text-slate-700">Yang Menyerahkan,</p>
            <div className="doc-signature-space" />
            <p className="font-bold underline uppercase tracking-wide">{pihakPertama.nama}</p>
            <p className="font-mono text-[8pt]">NIP. {pihakPertama.nip}</p>
            <p className="text-[8pt] text-slate-600">Pangkat/Gol: {pihakPertama.pangkatGolongan}</p>
          </div>
        </div>

        {/* Principal Knowing */}
        <div className="text-center w-full max-w-xs mx-auto">
          <p className="font-semibold text-slate-900">Mengetahui,</p>
          <p className="font-bold text-slate-900">Kepala {kopConfig.namaSekolah}</p>
          <p className="text-[8pt] text-slate-600 italic">Kuasa Pengguna Barang</p>
          <div className="doc-signature-space" />
          <p className="font-bold underline uppercase tracking-wide">{kepsek.nama}</p>
          <p className="font-mono text-[8pt]">NIP. {kepsek.nip}</p>
          <p className="text-[8pt] text-slate-600">Pangkat/Gol: {kepsek.pangkatGolongan}</p>
        </div>
      </div>
    </div>
  );
};
