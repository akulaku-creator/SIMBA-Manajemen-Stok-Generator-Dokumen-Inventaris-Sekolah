import React from 'react';
import { KopSuratConfig, Pejabat, TransaksiPengeluaran } from '../../types';
import { formatTanggalIndonesia, getKalimatBast } from '../../utils/numberGenerator';
import { resolveKepalaSekolah, resolvePemohon, resolvePengurusBarang } from '../../utils/pejabatResolver';
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
  // Direct Binding Pejabat Penandatangan dari Master Pejabat (Otomatis tanpa input manual):
  // 1. Pihak Pertama (Yang Menyerahkan): Pengurus Barang Pembantu
  const pihakPertama = resolvePengurusBarang(pejabatList, transaksi.pengurusBarangId);

  // 2. Pihak Kedua (Yang Menerima): Pemohon / Penerima Barang
  const pihakKedua = resolvePemohon(pejabatList, transaksi);

  // 3. Mengetahui / Menyetujui: Kepala Sekolah (Kuasa Pengguna Barang)
  const kepsek = resolveKepalaSekolah(pejabatList, transaksi.kepsekId);

  const pembukaBast = getKalimatBast(transaksi.tanggal);

  return (
    <div className="doc-content font-serif text-black select-text w-full">
      {/* 1. Official Kop Surat Sekolah */}
      <div className="doc-header-kop avoid-break break-inside-avoid">
        <KopSuratView config={kopConfig} />
      </div>

      {/* 2. Judul Dokumen & Klausul Hukum (Metadata Block) */}
      <div className="doc-meta-block avoid-break break-inside-avoid my-1.5 print:my-1 text-xs">
        <div className="doc-title-block mb-1.5 text-center">
          <h2 className="font-bold text-base tracking-wide uppercase border-b-2 border-black inline-block pb-0.5">
            BERITA ACARA SERAH TERIMA (BAST PENYALURAN)
          </h2>
          <p className="text-xs font-mono font-semibold mt-0.5">Nomor: {transaksi.noBAST}</p>
        </div>

        {/* Legal Clause and References */}
        <p className="doc-desc text-[8.5pt] leading-tight text-slate-800 mb-1">
          Berdasarkan Surat Perintah Penyaluran Barang (SPPB) Nomor: <span className="font-semibold font-mono">{transaksi.noSPPB}</span> yang merujuk pada Surat Permintaan Barang (SPB) Nomor: <span className="font-semibold font-mono">{transaksi.noSPB}</span>:
        </p>
        
        <p className="doc-desc text-[8.5pt] leading-tight text-slate-800 font-medium mb-1.5">
          {pembukaBast}
        </p>

        {/* Identitas PIHAK I & PIHAK II (Grid 2 Kolom Rapi) */}
        <div className="grid grid-cols-2 gap-3 my-1 p-2 bg-slate-50/70 border border-slate-200/80 rounded-md print:bg-transparent print:p-0 print:border-none text-[8.5pt]">
          {/* PIHAK I: Penyalur */}
          <div>
            <p className="font-bold text-slate-900 border-b border-slate-300 pb-0.5 mb-1 text-[8.5pt] uppercase tracking-wide">
              PIHAK PERTAMA <span className="text-[7.5pt] font-normal lowercase italic text-slate-600">(yang menyerahkan)</span>:
            </p>
            <table className="w-full table-identity doc-meta-table">
              <tbody>
                <tr>
                  <td className="col-label font-medium w-16 text-slate-800">Nama</td>
                  <td className="col-colon w-3 text-center">:</td>
                  <td className="col-value font-bold text-slate-900">{pihakPertama.nama}</td>
                </tr>
                <tr>
                  <td className="col-label font-medium text-slate-800">NIP</td>
                  <td className="col-colon text-center">:</td>
                  <td className="col-value font-mono text-[8pt]">
                    {pihakPertama.nip && pihakPertama.nip !== '-' ? pihakPertama.nip : '-'}
                  </td>
                </tr>
                <tr>
                  <td className="col-label font-medium text-slate-800">Jabatan</td>
                  <td className="col-colon text-center">:</td>
                  <td className="col-value text-slate-900">{pihakPertama.jabatan || 'Pengurus Barang Pembantu'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* PIHAK II: Penerima */}
          <div>
            <p className="font-bold text-slate-900 border-b border-slate-300 pb-0.5 mb-1 text-[8.5pt] uppercase tracking-wide">
              PIHAK KEDUA <span className="text-[7.5pt] font-normal lowercase italic text-slate-600">(yang menerima)</span>:
            </p>
            <table className="w-full table-identity doc-meta-table">
              <tbody>
                <tr>
                  <td className="col-label font-medium w-16 text-slate-800">Nama</td>
                  <td className="col-colon w-3 text-center">:</td>
                  <td className="col-value font-bold text-slate-900">{pihakKedua.nama}</td>
                </tr>
                <tr>
                  <td className="col-label font-medium text-slate-800">NIP</td>
                  <td className="col-colon text-center">:</td>
                  <td className="col-value font-mono text-[8pt]">
                    {pihakKedua.nip && pihakKedua.nip !== '-' ? pihakKedua.nip : '-'}
                  </td>
                </tr>
                <tr>
                  <td className="col-label font-medium text-slate-800">Unit / Jabatan</td>
                  <td className="col-colon text-center">:</td>
                  <td className="col-value text-slate-900">{transaksi.unitPemohon || pihakKedua.jabatan}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p className="doc-desc text-[8.5pt] leading-tight text-slate-800 mt-1 mb-1">
          PIHAK PERTAMA telah menyerahkan barang persediaan kepada PIHAK KEDUA, dan PIHAK KEDUA menyatakan telah menerima barang tersebut dalam keadaan baik, cukup, dan lengkap dengan rincian sebagai berikut:
        </p>
      </div>

      {/* 3. Tabel Rincian Barang BAST dengan Proporsi Kolom Anti-Overflow */}
      <table 
        className="doc-table w-full border-collapse border border-black mb-1.5 text-xs" 
        style={{ tableLayout: 'fixed', width: '100%' }}
      >
        <colgroup>
          <col style={{ width: '5%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '42%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '20%' }} />
        </colgroup>
        <thead>
          <tr className="bg-slate-100 text-center font-bold text-[8.5pt]">
            <th rowSpan={2} className="border border-black px-1 py-1 text-center">No.</th>
            <th rowSpan={2} className="border border-black px-1.5 py-1 text-center">Kode Barang</th>
            <th rowSpan={2} className="border border-black px-2 py-1 text-left">Nama Barang / Spesifikasi</th>
            <th colSpan={2} className="border border-black px-1 py-1 text-center bg-slate-200/70">Persetujuan Penyaluran</th>
            <th rowSpan={2} className="border border-black px-2 py-1 text-left">Kondisi / Keterangan</th>
          </tr>
          <tr className="bg-slate-100 text-center font-bold text-[8pt]">
            <th className="border border-black px-1 py-1 text-center bg-slate-50">Jumlah</th>
            <th className="border border-black px-1 py-1 text-center bg-slate-50">Satuan</th>
          </tr>
        </thead>
        <tbody>
          {transaksi.items && transaksi.items.length > 0 ? (
            transaksi.items.map((item, index) => (
              <tr key={item.id || index} className="align-top avoid-break break-inside-avoid text-[8.5pt]">
                <td className="border border-black px-1 py-1 text-center font-medium">{index + 1}.</td>
                <td className="border border-black px-1 py-1 text-center font-mono text-[8pt] text-slate-900">
                  {item.kodeBarang || '-'}
                </td>
                <td className="border border-black px-2 py-1 text-left">
                  <div className="font-bold text-slate-900 leading-snug">{item.namaBarang}</div>
                  {item.spesifikasi && item.spesifikasi !== '-' && item.spesifikasi !== item.namaBarang && (
                    <div className="text-[7.5pt] text-slate-600 italic font-normal mt-0.5 leading-tight">
                      {item.spesifikasi}
                    </div>
                  )}
                  {item.kodeRekening && (
                    <div className="text-[7pt] font-mono text-slate-600 mt-0.5">
                      <span className="font-semibold text-slate-700">Kode Rekening:</span> {item.kodeRekening}
                    </div>
                  )}
                </td>
                <td className="border border-black px-1 py-1 text-center font-bold text-slate-900">
                  {item.usulanJumlah || item.jumlah}
                </td>
                <td className="border border-black px-1 py-1 text-center text-slate-800">
                  {item.satuan}
                </td>
                <td className="border border-black px-2 py-1 text-left text-[8pt] text-slate-800 leading-tight">
                  {item.keperluan ? `${item.keperluan} • Kondisi Baik (100%)` : 'Kondisi Baik & Lengkap (100%)'}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="p-3 text-center text-slate-500 italic">
                Tidak ada data barang yang diserahterimakan.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <p className="doc-desc text-[8pt] text-slate-700 italic mb-2">
        Demikian Berita Acara Serah Terima Barang ini dibuat dengan sebenarnya dalam rangkap secukupnya untuk dipergunakan sebagaimana mestinya.
      </p>

      {/* 4. Struktur Tanda Tangan BAST Standar Instansi (PIHAK I, PIHAK II, & MENGETAHUI KEPALA SEKOLAH) */}
      <div className="doc-signature-block avoid-break break-inside-avoid mt-3 print:mt-2 text-xs font-sans">
        {/* Tempat & Tanggal Dokumen Otomatis */}
        <div className="text-right text-xs mb-1.5 font-serif text-slate-900">
          {kopConfig.kotaSurat || 'Ciamis'}, {formatTanggalIndonesia(transaksi.tanggal)}
        </div>

        {/* Baris 1: PIHAK PERTAMA (Kiri) & PIHAK KEDUA (Kanan) */}
        <div className="grid grid-cols-2 gap-6 text-center mb-2">
          {/* PIHAK PERTAMA (Yang Menyerahkan) - Pengurus Barang Pembantu */}
          <div>
            <p className="font-bold text-slate-900 uppercase text-[9pt]">PIHAK PERTAMA</p>
            <p className="text-[8pt] text-slate-600 italic">(Yang Menyerahkan)</p>
            <p className="text-[8.5pt] font-semibold text-slate-800 uppercase mt-0.5">
              PENGURUS BARANG PEMBANTU
            </p>
            <div className="h-14 print:h-12 flex items-center justify-center">
              {/* Space for signature */}
            </div>
            <p className="font-bold underline text-slate-900 text-sm">{pihakPertama.nama || '-'}</p>
            <p className="text-xs text-slate-700 font-mono mt-0.5">
              NIP. {pihakPertama.nip && pihakPertama.nip !== '-' ? pihakPertama.nip : '-'}
            </p>
            {pihakPertama.pangkatGolongan && pihakPertama.pangkatGolongan !== '-' && (
              <p className="text-[8pt] text-slate-600">Pangkat/Gol: {pihakPertama.pangkatGolongan}</p>
            )}
          </div>

          {/* PIHAK KEDUA (Yang Menerima) - Pemohon / Penanggung Jawab Unit Kerja */}
          <div>
            <p className="font-bold text-slate-900 uppercase text-[9pt]">PIHAK KEDUA</p>
            <p className="text-[8pt] text-slate-600 italic">(Yang Menerima)</p>
            <p className="text-[8.5pt] font-semibold text-slate-800 uppercase mt-0.5">
              {transaksi.unitPemohon || pihakKedua.jabatan || 'PENANGGUNG JAWAB UNIT'}
            </p>
            <div className="h-14 print:h-12 flex items-center justify-center">
              {/* Space for signature */}
            </div>
            <p className="font-bold underline text-slate-900 text-sm">{pihakKedua.nama || '-'}</p>
            <p className="text-xs text-slate-700 font-mono mt-0.5">
              NIP. {pihakKedua.nip && pihakKedua.nip !== '-' ? pihakKedua.nip : '-'}
            </p>
            {pihakKedua.pangkatGolongan && pihakKedua.pangkatGolongan !== '-' && (
              <p className="text-[8pt] text-slate-600">Pangkat/Gol: {pihakKedua.pangkatGolongan}</p>
            )}
          </div>
        </div>

        {/* Baris 2: Mengetahui (Kepala Sekolah) & QR Code Validasi TTE */}
        <div className="flex items-end justify-between w-full mt-2 pt-1 border-t border-slate-200/50 print:border-none">
          {/* QR Code Digital Verification */}
          <div className="w-1/4 flex justify-start pb-0.5">
            <DocQRCode
              docType="BAST"
              docNumber={transaksi.noBAST}
              transaksi={transaksi}
              kopConfig={kopConfig}
              size="sm"
            />
          </div>

          {/* Mengetahui Kuasa Pengguna Barang (Kepala Sekolah) */}
          <div className="w-2/4 text-center">
            <p className="font-semibold text-slate-900 text-xs">Mengetahui / Menyetujui,</p>
            <p className="font-bold text-slate-900 uppercase text-[9pt]">
              KEPALA SEKOLAH
            </p>
            <p className="text-[8pt] text-slate-600 italic">Selaku Kuasa Pengguna Barang</p>
            <div className="h-14 print:h-12 flex items-center justify-center">
              {/* Space for signature */}
            </div>
            <p className="font-bold underline text-slate-900 text-sm">{kepsek.nama || '-'}</p>
            <p className="text-xs text-slate-700 font-mono mt-0.5">
              NIP. {kepsek.nip && kepsek.nip !== '-' ? kepsek.nip : '-'}
            </p>
            {kepsek.pangkatGolongan && kepsek.pangkatGolongan !== '-' && (
              <p className="text-[8pt] text-slate-600">Pangkat/Gol: {kepsek.pangkatGolongan}</p>
            )}
          </div>

          {/* Spacer Penyeimbang Kanan */}
          <div className="w-1/4" />
        </div>
      </div>
    </div>
  );
};
