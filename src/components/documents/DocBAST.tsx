import React from 'react';
import { KopSuratConfig, Pejabat, TransaksiPengeluaran } from '../../types';
import { formatTanggalIndonesia, getKalimatBast } from '../../utils/numberGenerator';
import { resolveKepalaSekolah, resolvePemohon, resolvePengurusBarang, resolveWakasekSarpras } from '../../utils/pejabatResolver';
import { KopSuratView } from '../KopSuratView';
import { DocQRCode } from './DocQRCode';

interface Props {
  transaksi: TransaksiPengeluaran;
  kopConfig: KopSuratConfig;
  pejabatList: Pejabat[];
  minRows?: number;
}

export const DocBAST: React.FC<Props> = ({ 
  transaksi, 
  kopConfig, 
  pejabatList 
}) => {
  // Pihak Mengetahui: Kepala Sekolah / Wakasek Sarana Prasarana
  const kepsek = resolveKepalaSekolah(pejabatList, transaksi.kepsekId);
  const sarpras = resolveWakasekSarpras(pejabatList, transaksi.sarprasId);

  // Pihak Pertama (Yang Menyerahkan): Pengurus Barang Pembantu
  const pihakPertama = resolvePengurusBarang(pejabatList, transaksi.pengurusBarangId);

  // Pihak Kedua (Yang Menerima): Pemohon / Penerima Barang
  const pihakKedua = resolvePemohon(pejabatList, transaksi);

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
          <h2>BERITA ACARA SERAH TERIMA (BAST PENYALURAN)</h2>
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
          {/* PIHAK I Identitas: Penyalur */}
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
                  <td className="col-value font-mono text-[8pt]">
                    {pihakPertama.nip && pihakPertama.nip !== '-' ? pihakPertama.nip : '-'}
                  </td>
                </tr>
                <tr>
                  <td className="col-label font-medium">Jabatan</td>
                  <td className="col-colon">:</td>
                  <td className="col-value">{pihakPertama.jabatan || 'Pengurus Barang Pembantu'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* PIHAK II Identitas: Penerima */}
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
                  <td className="col-value font-mono text-[8pt]">
                    {pihakKedua.nip && pihakKedua.nip !== '-' ? pihakKedua.nip : '-'}
                  </td>
                </tr>
                <tr>
                  <td className="col-label font-medium">Unit Kerja</td>
                  <td className="col-colon">:</td>
                  <td className="col-value">{transaksi.unitPemohon || pihakKedua.jabatan}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p className="doc-desc">
          PIHAK PERTAMA telah menyerahkan barang persediaan kepada PIHAK KEDUA, dan PIHAK KEDUA menyatakan telah menerima barang tersebut dalam keadaan baik, cukup, dan lengkap dengan rincian sebagai berikut:
        </p>
      </div>

      {/* Table of Goods with table-layout: fixed and specified percentage column widths */}
      <table className="doc-table w-full border-collapse border border-black mb-1.5" style={{ tableLayout: 'fixed', width: '100%' }}>
        <colgroup>
          <col style={{ width: '5%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '40%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '20%' }} />
        </colgroup>
        <thead>
          <tr className="bg-slate-100 text-center font-bold text-[8.5pt]">
            <th rowSpan={2} className="border border-black px-1 py-1 text-center" style={{ width: '5%' }}>No.</th>
            <th rowSpan={2} className="border border-black px-1.5 py-1 text-center" style={{ width: '15%' }}>Kode Barang</th>
            <th rowSpan={2} className="border border-black px-2 py-1 text-left" style={{ width: '40%' }}>Nama Barang / Spesifikasi</th>
            <th colSpan={2} className="border border-black px-1.5 py-1 text-center bg-slate-200/70" style={{ width: '20%' }}>Persetujuan Penyaluran</th>
            <th rowSpan={2} className="border border-black px-2 py-1 text-left" style={{ width: '20%' }}>Keterangan</th>
          </tr>
          <tr className="bg-slate-100 text-center font-bold text-[8pt]">
            <th className="border border-black px-1 py-1 text-center bg-slate-50" style={{ width: '10%' }}>Jumlah</th>
            <th className="border border-black px-1 py-1 text-center bg-slate-50" style={{ width: '10%' }}>Satuan</th>
          </tr>
        </thead>
        <tbody>
          {transaksi.items && transaksi.items.length > 0 ? (
            transaksi.items.map((item, index) => (
              <tr key={item.id || index} className="align-top avoid-break text-[8.5pt]">
                <td className="border border-black px-1 py-0.5 text-center font-medium">{index + 1}.</td>
                <td className="border border-black px-1 py-0.5 text-center font-mono text-[8pt] text-slate-900">
                  {item.kodeBarang || '-'}
                </td>
                <td className="border border-black px-2 py-0.5 text-left">
                  <div className="font-bold text-slate-900">{item.namaBarang}</div>
                  {item.spesifikasi && item.spesifikasi !== '-' && item.spesifikasi !== item.namaBarang && (
                    <div className="text-[7.5pt] text-slate-600 italic font-normal mt-0.5">{item.spesifikasi}</div>
                  )}
                </td>
                <td className="border border-black px-1 py-0.5 text-center font-bold text-slate-900">
                  {item.usulanJumlah || item.jumlah}
                </td>
                <td className="border border-black px-1 py-0.5 text-center text-slate-800">
                  {item.satuan}
                </td>
                <td className="border border-black px-2 py-0.5 text-left text-[8pt] text-slate-800">
                  {item.keperluan || 'Kondisi Baik (100%)'}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="p-2 text-center text-slate-500 italic">
                Tidak ada data barang yang diserahterimakan.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <p className="doc-desc">
        Demikian Berita Acara Serah Terima Barang ini dibuat dengan sebenarnya dalam rangkap secukupnya untuk dipergunakan sebagaimana mestinya.
      </p>

      {/* Dual-Side Signatures: Pihak Pertama (Kiri), Pihak Kedua (Kanan), Mengetahui: Wakasek Sarana Prasarana / Kepala Sekolah */}
      <div className="doc-signature-block avoid-break mt-4 text-[10pt] font-sans">
        {/* Tempat & Tanggal Otomatis */}
        <div className="text-right text-xs mb-2 font-serif">
          {kopConfig.kotaSurat || 'Ciamis'}, {formatTanggalIndonesia(transaksi.tanggal)}
        </div>

        {/* Baris 1: Pihak Pertama (Kiri) & Pihak Kedua (Kanan) */}
        <div className="grid grid-cols-2 text-center mb-4 gap-4">
          <div>
            <p className="font-bold text-slate-900 uppercase">PIHAK PERTAMA</p>
            <p className="font-bold text-slate-900 text-[9pt] uppercase">
              {pihakPertama.jabatan || 'PENGURUS BARANG PEMBANTU'}
            </p>
            <p className="text-[8pt] text-slate-600 italic">Yang Menyerahkan,</p>
            <div style={{ height: '50px' }} />
            <p className="font-bold underline text-slate-900">{pihakPertama.nama || '-'}</p>
            <p className="text-slate-900 text-[9pt]">
              {pihakPertama.nip && pihakPertama.nip !== '-' ? `NIP. ${pihakPertama.nip}` : 'NIP. -'}
            </p>
            {pihakPertama.pangkatGolongan && pihakPertama.pangkatGolongan !== '-' && (
              <p className="text-[8pt] text-slate-600">Pangkat/Gol: {pihakPertama.pangkatGolongan}</p>
            )}
          </div>

          <div>
            <p className="font-bold text-slate-900 uppercase">PIHAK KEDUA</p>
            <p className="font-bold text-slate-900 text-[9pt] uppercase">
              {transaksi.unitPemohon || pihakKedua.jabatan || 'PENANGGUNG JAWAB UNIT'}
            </p>
            <p className="text-[8pt] text-slate-600 italic">
              Yang Menerima ({pihakKedua.jabatan || 'Penerima Barang'}),
            </p>
            <div style={{ height: '50px' }} />
            <p className="font-bold underline text-slate-900">{pihakKedua.nama || '-'}</p>
            <p className="text-slate-900 text-[9pt]">
              {pihakKedua.nip && pihakKedua.nip !== '-' ? `NIP. ${pihakKedua.nip}` : 'NIP. -'}
            </p>
            {pihakKedua.pangkatGolongan && pihakKedua.pangkatGolongan !== '-' && (
              <p className="text-[8pt] text-slate-600">Pangkat/Gol: {pihakKedua.pangkatGolongan}</p>
            )}
          </div>
        </div>

        {/* Baris 2: Mengetahui (Kepala Sekolah) & QR Code Verifikasi */}
        <div className="flex justify-between items-end w-full mt-2">
          {/* Kolom Kiri: QR Code Verifikasi SIMBA */}
          <div className="pb-1 w-1/4">
            <DocQRCode
              docType="BAST"
              docNumber={transaksi.noBAST}
              transaksi={transaksi}
              kopConfig={kopConfig}
              size="sm"
            />
          </div>

          {/* Kolom Tengah: Mengetahui Kepala Sekolah */}
          <div className="text-center w-2/4">
            <p className="font-semibold text-slate-900">Mengetahui,</p>
            <p className="font-bold text-slate-900 uppercase">
              {kepsek.jabatan || `KEPALA ${kopConfig.namaSekolah ? kopConfig.namaSekolah.toUpperCase() : 'SEKOLAH'}`}
            </p>
            <p className="text-[8pt] text-slate-600 italic">Selaku Kuasa Pengguna Barang</p>
            <div style={{ height: '50px' }} />
            <p className="font-bold underline text-slate-900">{kepsek.nama || '-'}</p>
            <p className="text-slate-900 text-[9pt]">
              {kepsek.nip && kepsek.nip !== '-' ? `NIP. ${kepsek.nip}` : 'NIP. -'}
            </p>
            {kepsek.pangkatGolongan && kepsek.pangkatGolongan !== '-' && (
              <p className="text-[8pt] text-slate-600">Pangkat/Gol: {kepsek.pangkatGolongan}</p>
            )}
          </div>

          {/* Kolom Kanan: Spacer penyeimbang */}
          <div className="w-1/4" />
        </div>
      </div>
    </div>
  );
};
