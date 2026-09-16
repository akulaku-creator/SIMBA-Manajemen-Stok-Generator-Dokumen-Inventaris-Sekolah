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

export const DocSPB: React.FC<Props> = ({
  transaksi,
  kopConfig,
  pejabatList,
  minRows = 10
}) => {
  // Pejabat 1: Kepala Sekolah (Kuasa Pengguna Barang)
  const kepsek = pejabatList.find(p => p.id === 'pejabat-kepsek') || {
    nama: 'Drs. H. Bambang Suhartono, M.Pd.',
    nip: '19680512 199303 1 005',
    pangkatGolongan: 'Pembina Utama Muda / IV c',
    jabatan: 'Kepala Sekolah'
  };

  // Pejabat 2: Pengurus Barang Pembantu (Pengelola Persediaan)
  const pengurusBarang = pejabatList.find(p => p.id === 'pejabat-pengurus-barang') || {
    nama: 'Rina Kartikasari, S.AP.',
    nip: '19890820 201402 2 003',
    pangkatGolongan: 'Penata Muda / III a',
    jabatan: 'Pengurus Barang Pembantu'
  };

  // Pemohon (Tercantum pada Header Dokumen)
  const pemohon = pejabatList.find(p => p.id === transaksi.pemohonId) || {
    nama: 'Staf / Guru Pengguna',
    nip: '-',
    pangkatGolongan: '-',
    jabatan: transaksi.unitPemohon
  };

  const totalEmptyRows = Math.max(0, minRows - (transaksi.items?.length || 0));

  return (
    <div className="doc-content font-serif text-black select-text w-full">
      {/* 1. Official Kop Surat Sekolah */}
      <div className="doc-header-kop avoid-break">
        <KopSuratView config={kopConfig} />
      </div>

      {/* 2. Judul Dokumen & Info Pemohon (Metadata Block) */}
      <div className="doc-meta-block avoid-break">
        <div className="doc-title-block">
          <h2>SURAT PERMINTAAN BARANG (SPB)</h2>
          <p>Nomor: {transaksi.noSPB}</p>
        </div>

        {/* Info Pemohon (Clean Layout Tanpa Border & Spasi Rapat) */}
        <div className="my-1.5 p-0 bg-transparent text-xs">
          <div className="grid grid-cols-2 gap-4">
            <table className="w-full table-identity doc-meta-table">
              <tbody>
                <tr>
                  <td className="col-label font-medium">Nama Pemohon</td>
                  <td className="col-colon">:</td>
                  <td className="col-value font-bold text-slate-900">{pemohon.nama}</td>
                </tr>
                <tr>
                  <td className="col-label font-medium">NIP / NUPTK</td>
                  <td className="col-colon">:</td>
                  <td className="col-value font-mono text-[8pt]">{pemohon.nip || '-'}</td>
                </tr>
                <tr>
                  <td className="col-label font-medium">Jabatan / Unit Kerja</td>
                  <td className="col-colon">:</td>
                  <td className="col-value font-semibold text-slate-900">{pemohon.jabatan} ({transaksi.unitPemohon})</td>
                </tr>
              </tbody>
            </table>

            <table className="w-full table-identity doc-meta-table">
              <tbody>
                <tr>
                  <td className="col-label font-medium">Tanggal Permintaan</td>
                  <td className="col-colon">:</td>
                  <td className="col-value font-semibold text-slate-900">
                    {formatTanggalIndonesia(transaksi.tanggal)}
                  </td>
                </tr>
                <tr>
                  <td className="col-label font-medium">No. Dasar (NPB)</td>
                  <td className="col-colon">:</td>
                  <td className="col-value font-mono text-[8pt]">{transaksi.noNPB || '-'}</td>
                </tr>
                <tr>
                  <td className="col-label font-medium">Peruntukan / Kegiatan</td>
                  <td className="col-colon">:</td>
                  <td className="col-value text-slate-900">{transaksi.keperluanUmum}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Tabel Rincian Barang Permintaan (Spasi Rapat & Full Width) */}
      <table className="doc-table w-full border-collapse border border-black mb-2">
        <thead>
          <tr className="bg-slate-100 text-center font-bold">
            <th className="w-7">No.</th>
            <th className="w-40 text-left">Kode &amp; Rekening Belanja</th>
            <th className="text-left">Nama Barang / Spesifikasi</th>
            <th className="w-14">Jumlah</th>
            <th className="w-14">Satuan</th>
            <th className="w-44 text-left">Keterangan / Keperluan</th>
          </tr>
        </thead>
        <tbody>
          {transaksi.items && transaksi.items.length > 0 ? (
            transaksi.items.map((item, index) => (
              <tr key={item.id || index} className="align-top avoid-break">
                <td className="text-center font-medium">{index + 1}.</td>
                <td>
                  <div className="font-mono text-[7.5pt] font-semibold text-slate-900">
                    {item.kodeRekening || '5.1.02.01.01.0024'}
                  </div>
                  <div className="text-[7.5pt] text-slate-600 leading-tight">
                    {item.namaRekening || 'Belanja Persediaan'}
                  </div>
                </td>
                <td>
                  <div className="font-semibold text-slate-900">{item.namaBarang}</div>
                  {item.spesifikasi && (
                    <div className="text-[7.5pt] text-slate-600 italic">
                      Spesifikasi: {item.spesifikasi}
                    </div>
                  )}
                  {item.kodeBarang && (
                    <div className="text-[7.5pt] text-slate-500 font-mono">
                      Kode: {item.kodeBarang} {item.nusp ? `• NUSP: ${item.nusp}` : ''}
                    </div>
                  )}
                </td>
                <td className="text-center font-bold text-slate-900">
                  {item.usulanJumlah}
                </td>
                <td className="text-center text-slate-800">
                  {item.satuan}
                </td>
                <td className="text-[8pt] text-slate-800">
                  {item.keperluan || transaksi.keperluanUmum || 'KBM & Pelayanan Sekolah'}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="p-2 text-center text-slate-500 italic">
                Tidak ada rincian barang permintaan.
              </td>
            </tr>
          )}

          {Array.from({ length: totalEmptyRows }).map((_, i) => (
            <tr key={`empty-spb-${i}`} className="h-5 avoid-break">
              <td className="text-center text-slate-300">
                {(transaksi.items?.length || 0) + i + 1}.
              </td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 4. Kolom Pengesahan Tanda Tangan Resmi (avoid-break) */}
      <div className="doc-signature-block avoid-break">
        <div className="grid grid-cols-2 text-center">
          {/* SEBELAH KIRI (Kepala Sekolah) */}
          <div>
            <p className="font-semibold text-slate-900">Mengetahui / Mengesahkan,</p>
            <p className="font-semibold text-slate-900">
              Kepala {kopConfig.namaSekolah || 'Satuan Pendidikan'}
            </p>
            <p className="text-[8pt] text-slate-600 italic">
              Selaku Kuasa Pengguna Barang
            </p>
            <div className="doc-signature-space" />
            <p className="font-bold underline uppercase text-slate-900 tracking-wide">
              {kepsek.nama}
            </p>
            <p className="text-[8pt] font-mono">
              NIP. {kepsek.nip || '-'}
            </p>
            {kepsek.pangkatGolongan && kepsek.pangkatGolongan !== '-' && (
              <p className="text-[8pt] text-slate-600">
                Pangkat/Gol: {kepsek.pangkatGolongan}
              </p>
            )}
          </div>

          {/* SEBELAH KANAN (Pengelola Persediaan) */}
          <div>
            <p>
              {kopConfig.kotaSurat || 'Kota'}, {formatTanggalIndonesia(transaksi.tanggal)}
            </p>
            <p className="font-semibold text-slate-900">
              Pengurus Barang Pembantu
            </p>
            <p className="text-[8pt] text-slate-600 italic">
              Pengelola Persediaan Barang
            </p>
            <div className="doc-signature-space" />
            <p className="font-bold underline uppercase text-slate-900 tracking-wide">
              {pengurusBarang.nama}
            </p>
            <p className="text-[8pt] font-mono">
              NIP. {pengurusBarang.nip || '-'}
            </p>
            {pengurusBarang.pangkatGolongan && pengurusBarang.pangkatGolongan !== '-' && (
              <p className="text-[8pt] text-slate-600">
                Pangkat/Gol: {pengurusBarang.pangkatGolongan}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
