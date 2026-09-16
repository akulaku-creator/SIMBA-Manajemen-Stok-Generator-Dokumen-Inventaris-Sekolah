import React from 'react';
import { KopSuratConfig, Pejabat, TransaksiPengeluaran } from '../../types';
import { formatTanggalIndonesia } from '../../utils/numberGenerator';
import { KopSuratView } from '../KopSuratView';

interface Props {
  transaksi: TransaksiPengeluaran;
  kopConfig: KopSuratConfig;
  pejabatList: Pejabat[];
  minRows?: number;
}

export const DocSPPB: React.FC<Props> = ({ 
  transaksi, 
  kopConfig, 
  pejabatList, 
  minRows = 10 
}) => {
  const pemohon = pejabatList.find(p => p.id === transaksi.pemohonId) || {
    nama: 'Staf Pemohon',
    nip: '-',
    pangkatGolongan: '-',
    jabatan: transaksi.unitPemohon
  };

  const pengurusBarang = pejabatList.find(p => p.id === transaksi.pengurusBarangId) || {
    nama: 'Rina Kartikasari, S.AP.',
    nip: '19890820 201402 2 003',
    pangkatGolongan: 'Penata Muda / III a',
    jabatan: 'Pengurus Barang Pembantu'
  };

  const sarpras = pejabatList.find(p => p.id === transaksi.sarprasId) || 
    pejabatList.find(p => p.jabatan.toLowerCase().includes('sarana') || p.jabatan.toLowerCase().includes('sarpras')) || {
    nama: 'Ahmad Fauzi, S.Pd., M.T.',
    nip: '19780415 200501 1 009',
    pangkatGolongan: 'Penata Tk. I / III d',
    jabatan: 'Wakasek Sarana Prasarana'
  };

  const totalEmptyRows = Math.max(0, minRows - transaksi.items.length);

  return (
    <div className="doc-content font-serif text-black select-text w-full">
      {/* Official Header Kop Surat */}
      <div className="doc-header-kop avoid-break">
        <KopSuratView config={kopConfig} />
      </div>

      {/* Document Title & Legal Order (Metadata Block) */}
      <div className="doc-meta-block avoid-break">
        <div className="doc-title-block">
          <h2>SURAT PERINTAH PENYALURAN BARANG (SPPB)</h2>
          <p>Nomor: {transaksi.noSPPB}</p>
        </div>

        {/* Legal Narrative Order (Spasi Rapat) */}
        <p className="doc-desc">
          Berdasarkan Surat Permintaan Barang (SPB) Nomor: <span className="font-semibold font-mono">{transaksi.noSPB}</span> tanggal {formatTanggalIndonesia(transaksi.tanggal)}, dengan ini diperintahkan kepada:
        </p>

        <div className="pl-1 my-1">
          <table className="w-full table-identity doc-meta-table">
            <tbody>
              <tr>
                <td className="col-label font-medium">Nama Petugas</td>
                <td className="col-colon">:</td>
                <td className="col-value font-bold">{pengurusBarang.nama}</td>
              </tr>
              <tr>
                <td className="col-label font-medium">NIP</td>
                <td className="col-colon">:</td>
                <td className="col-value font-mono text-[8pt]">{pengurusBarang.nip}</td>
              </tr>
              <tr>
                <td className="col-label font-medium">Jabatan Kedinasan</td>
                <td className="col-colon">:</td>
                <td className="col-value">{pengurusBarang.jabatan}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="doc-desc">
          Untuk menyalurkan/mengeluarkan barang persediaan dari gudang/penyimpanan sekolah kepada:
        </p>

        <div className="pl-1 my-1">
          <table className="w-full table-identity doc-meta-table">
            <tbody>
              <tr>
                <td className="col-label font-medium">Nama Penerima</td>
                <td className="col-colon">:</td>
                <td className="col-value font-bold">{pemohon.nama}</td>
              </tr>
              <tr>
                <td className="col-label font-medium">NIP</td>
                <td className="col-colon">:</td>
                <td className="col-value font-mono text-[8pt]">{pemohon.nip || '-'}</td>
              </tr>
              <tr>
                <td className="col-label font-medium">Jabatan / Unit</td>
                <td className="col-colon">:</td>
                <td className="col-value">{pemohon.jabatan} ({transaksi.unitPemohon})</td>
              </tr>
              <tr>
                <td className="col-label font-medium">Peruntukan</td>
                <td className="col-colon">:</td>
                <td className="col-value">{transaksi.keperluanUmum}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="doc-desc">
          Dengan rincian daftar barang yang disetujui untuk disalurkan sebagai berikut:
        </p>
      </div>

      {/* Disbursed Goods Table with Spasi Rapat & Full Width */}
      <table className="doc-table w-full border-collapse border border-black mb-2">
        <thead>
          <tr className="bg-slate-100/75 text-center font-bold">
            <th className="w-7">No.</th>
            <th className="w-24">Kode Barang</th>
            <th className="w-20">NUSP</th>
            <th className="text-left">Nama &amp; Spesifikasi Barang</th>
            <th className="w-14">Satuan</th>
            <th className="w-20">Disalurkan</th>
            <th className="w-40 text-left">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {transaksi.items.map((item, index) => (
            <tr key={item.id || index} className="align-top avoid-break">
              <td className="text-center font-medium">{index + 1}.</td>
              <td className="text-center font-mono text-[8pt]">{item.kodeBarang}</td>
              <td className="text-center font-mono text-[8pt]">{item.nusp}</td>
              <td>
                <div className="font-medium">{item.namaBarang}</div>
                {item.spesifikasi && (
                  <div className="text-[7.5pt] text-slate-600 italic">{item.spesifikasi}</div>
                )}
              </td>
              <td className="text-center">{item.satuan}</td>
              <td className="text-center font-bold text-slate-900">
                {item.usulanJumlah}
              </td>
              <td className="text-[8pt]">{item.keperluan || 'Kondisi Baik'}</td>
            </tr>
          ))}

          {/* Blank rows */}
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

      {/* Signature Section - Wakasek Sarana Prasarana (avoid-break) */}
      <div className="doc-signature-block avoid-break">
        <div className="flex justify-end text-center">
          <div className="w-72">
            <p>
              Ditetapkan di: {kopConfig.kotaSurat || 'Kota'}
            </p>
            <p>
              Pada tanggal: {formatTanggalIndonesia(transaksi.tanggal)}
            </p>
            <p className="font-bold text-slate-900 uppercase">
              {sarpras.jabatan || 'Wakasek Sarana Prasarana'}
            </p>
            <div className="doc-signature-space" />
            <p className="font-bold underline uppercase tracking-wide">{sarpras.nama}</p>
            <p className="font-mono text-[8pt]">NIP. {sarpras.nip || '-'}</p>
            {sarpras.pangkatGolongan && sarpras.pangkatGolongan !== '-' && (
              <p className="text-[8pt] text-slate-600">Pangkat/Gol: {sarpras.pangkatGolongan}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
