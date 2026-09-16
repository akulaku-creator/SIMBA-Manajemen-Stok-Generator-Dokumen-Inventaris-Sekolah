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

export const DocNPB: React.FC<Props> = ({ 
  transaksi, 
  kopConfig, 
  pejabatList, 
  minRows = 12 
}) => {
  const pemohon = pejabatList.find(p => p.id === transaksi.pemohonId) || {
    nama: 'Staf Pemohon',
    nip: '-',
    pangkatGolongan: '-',
    jabatan: transaksi.unitPemohon
  };

  const sarpras = pejabatList.find(p => p.id === transaksi.sarprasId) || {
    nama: 'Ahmad Fauzi, S.Pd., M.T.',
    nip: '19780415 200501 1 009',
    pangkatGolongan: 'Penata Tk. I / III d',
    jabatan: 'Wakasek Sarana Prasarana'
  };

  const totalEmptyRows = Math.max(0, minRows - transaksi.items.length);

  return (
    <div className="doc-content font-serif text-black select-text">
      {/* Dynamic Header Kop Surat (Pengecualian: Tetap proporsional & elegan) */}
      <div className="doc-header-kop avoid-break">
        <KopSuratView config={kopConfig} />
      </div>

      {/* Document Title & Metadata Block */}
      <div className="doc-meta-block avoid-break">
        <div className="doc-title-block">
          <h2>NOTA PERMINTAAN BARANG (NPB)</h2>
          <p>Nomor: {transaksi.noNPB}</p>
        </div>

        {/* Metadata Info (Spasi Rapat & Clean Layout Tanpa Border) */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <table className="w-full table-identity doc-meta-table">
            <tbody>
              <tr>
                <td className="col-label font-medium">Kepada Yth.</td>
                <td className="col-colon">:</td>
                <td className="col-value font-semibold">Kepala Sekolah melalui Wakasek Sarpras</td>
              </tr>
              <tr>
                <td className="col-label font-medium">Dari Unit / Bagian</td>
                <td className="col-colon">:</td>
                <td className="col-value font-semibold">{transaksi.unitPemohon}</td>
              </tr>
            </tbody>
          </table>

          <table className="w-full table-identity doc-meta-table">
            <tbody>
              <tr>
                <td className="col-label font-medium">Tanggal Pengajuan</td>
                <td className="col-colon">:</td>
                <td className="col-value font-semibold">{formatTanggalIndonesia(transaksi.tanggal)}</td>
              </tr>
              <tr>
                <td className="col-label font-medium">Peruntukan / Acara</td>
                <td className="col-colon">:</td>
                <td className="col-value">{transaksi.keperluanUmum}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="doc-desc">
          Dengan ini kami mengajukan permohonan pengadaan/pengambilan barang persediaan untuk kebutuhan operasional sebagai berikut:
        </p>
      </div>

      {/* Items Table with Spasi Rapat & Full Width */}
      <table className="doc-table w-full border-collapse border border-black mb-2">
        <thead>
          <tr className="bg-slate-100/75 text-center font-bold">
            <th className="border border-black px-1.5 py-1 w-8">No.</th>
            <th className="border border-black px-1.5 py-1 w-24">Kode Barang</th>
            <th className="border border-black px-2 py-1">Nama &amp; Spesifikasi Barang</th>
            <th className="border border-black px-1.5 py-1 w-16">Satuan</th>
            <th className="border border-black px-1.5 py-1 w-20">Jumlah Diminta</th>
            <th className="border border-black px-2 py-1 w-44">Keperluan / Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {transaksi.items.map((item, index) => (
            <tr key={item.id || index} className="align-top avoid-break">
              <td className="border border-black px-1.5 py-0.5 text-center font-medium">{index + 1}.</td>
              <td className="border border-black px-1.5 py-0.5 font-mono text-[8pt] text-center">{item.kodeBarang}</td>
              <td className="border border-black px-2 py-0.5 font-medium">{item.namaBarang}</td>
              <td className="border border-black px-1.5 py-0.5 text-center">{item.satuan}</td>
              <td className="border border-black px-1.5 py-0.5 text-center font-bold">{item.usulanJumlah}</td>
              <td className="border border-black px-2 py-0.5 text-[8pt]">{item.keperluan || '-'}</td>
            </tr>
          ))}

          {/* Standard blank grid rows */}
          {Array.from({ length: totalEmptyRows }).map((_, i) => (
            <tr key={`empty-${i}`} className="h-5 avoid-break">
              <td className="border border-black px-1.5 py-0.5 text-center text-slate-300">
                {transaksi.items.length + i + 1}.
              </td>
              <td className="border border-black px-1.5 py-0.5"></td>
              <td className="border border-black px-2 py-0.5"></td>
              <td className="border border-black px-1.5 py-0.5"></td>
              <td className="border border-black px-1.5 py-0.5"></td>
              <td className="border border-black px-2 py-0.5"></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Signature block with avoid-break and compact signature space */}
      <div className="doc-signature-block avoid-break">
        <div className="grid grid-cols-2 text-center">
          <div>
            <p className="font-semibold">Mengetahui / Menyetujui,</p>
            <p className="font-medium text-slate-800">{sarpras.jabatan}</p>
            <div className="doc-signature-space" />
            <p className="font-bold underline uppercase tracking-wide">{sarpras.nama}</p>
            <p className="font-mono text-[8pt]">NIP. {sarpras.nip}</p>
            {sarpras.pangkatGolongan && sarpras.pangkatGolongan !== '-' && (
              <p className="text-[8pt] text-slate-600">Pangkat/Gol: {sarpras.pangkatGolongan}</p>
            )}
          </div>

          <div>
            <p>
              {kopConfig.kotaSurat || 'Kota'}, {formatTanggalIndonesia(transaksi.tanggal)}
            </p>
            <p className="font-semibold text-slate-800">Pemohon / Unit Pengguna,</p>
            <div className="doc-signature-space" />
            <p className="font-bold underline uppercase tracking-wide">{pemohon.nama}</p>
            <p className="font-mono text-[8pt]">NIP. {pemohon.nip || '-'}</p>
            <p className="text-[8pt] text-slate-600">{pemohon.jabatan}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
