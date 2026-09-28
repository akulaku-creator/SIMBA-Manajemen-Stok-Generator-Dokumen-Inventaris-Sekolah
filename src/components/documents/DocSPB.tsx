import React from 'react';
import { KopSuratConfig, Pejabat, TransaksiPengeluaran } from '../../types';
import { formatTanggalIndonesia } from '../../utils/numberGenerator';
import { resolvePemohon, resolvePengurusBarang } from '../../utils/pejabatResolver';
import { KopSuratView } from '../KopSuratView';
import { DocQRCode } from './DocQRCode';

interface Props {
  transaksi: TransaksiPengeluaran;
  kopConfig: KopSuratConfig;
  pejabatList: Pejabat[];
  minRows?: number;
}

export const DocSPB: React.FC<Props> = ({
  transaksi,
  kopConfig,
  pejabatList
}) => {
  // Direct Binding: Penandatangan SPB otomatis dari Pengaturan Master Pejabat & Header Transaksi
  // 1. Kolom Kiri: Pemohon / Yang Meminta (Otomatis dari header transaksi / master pemohon)
  const pemohon = resolvePemohon(pejabatList, transaksi);

  // 2. Kolom Kanan: Pengurus Barang Pembantu (Otomatis dari Master Pejabat)
  const pengurusBarang = resolvePengurusBarang(pejabatList, transaksi.pengurusBarangId);

  return (
    <div className="doc-content font-serif text-black select-text w-full">
      {/* 1. Official Kop Surat Sekolah */}
      <div className="doc-header-kop avoid-break break-inside-avoid">
        <KopSuratView config={kopConfig} />
      </div>

      {/* 2. Judul Dokumen & Info Pemohon (Metadata Block) */}
      <div className="doc-meta-block avoid-break break-inside-avoid my-1.5 print:my-1">
        <div className="doc-title-block mb-2 text-center">
          <h2 className="font-bold text-base tracking-wide uppercase border-b-2 border-black inline-block pb-0.5">
            SURAT PERMINTAAN BARANG (SPB)
          </h2>
          <p className="text-xs font-mono font-semibold mt-0.5">Nomor: {transaksi.noSPB}</p>
        </div>

        {/* Info Pemohon (Tata Letak Ringkas & Rapi) */}
        <div className="my-1.5 p-0 bg-transparent text-xs">
          <div className="grid grid-cols-2 gap-4">
            <table className="w-full table-identity doc-meta-table">
              <tbody>
                <tr>
                  <td className="col-label font-medium w-28 text-slate-800">Nama Pemohon</td>
                  <td className="col-colon w-3 text-center">:</td>
                  <td className="col-value font-bold text-slate-900">{pemohon.nama}</td>
                </tr>
                <tr>
                  <td className="col-label font-medium text-slate-800">NIP / NUPTK</td>
                  <td className="col-colon text-center">:</td>
                  <td className="col-value font-mono text-[8.5pt]">
                    {pemohon.nip && pemohon.nip !== '-' ? pemohon.nip : '-'}
                  </td>
                </tr>
                <tr>
                  <td className="col-label font-medium text-slate-800">Jabatan / Unit</td>
                  <td className="col-colon text-center">:</td>
                  <td className="col-value font-semibold text-slate-900">
                    {transaksi.unitPemohon || pemohon.jabatan || 'Penanggung Jawab Unit'}
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="w-full table-identity doc-meta-table">
              <tbody>
                <tr>
                  <td className="col-label font-medium w-32 text-slate-800">Tanggal Permintaan</td>
                  <td className="col-colon w-3 text-center">:</td>
                  <td className="col-value font-semibold text-slate-900">
                    {formatTanggalIndonesia(transaksi.tanggal)}
                  </td>
                </tr>
                <tr>
                  <td className="col-label font-medium text-slate-800">No. Dasar (NPB)</td>
                  <td className="col-colon text-center">:</td>
                  <td className="col-value font-mono text-[8.5pt] font-semibold text-slate-900">
                    {transaksi.noNPB || '-'}
                  </td>
                </tr>
                <tr>
                  <td className="col-label font-medium text-slate-800">Peruntukan / Kegiatan</td>
                  <td className="col-colon text-center">:</td>
                  <td className="col-value text-slate-900 leading-tight">
                    {transaksi.keperluanUmum || '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Tabel Rincian SPB dengan Tata Letak & Proporsi Kolom Standar */}
      <table 
        className="doc-table w-full border-collapse border border-black mb-2 text-xs" 
        style={{ tableLayout: 'fixed', width: '100%' }}
      >
        <colgroup>
          <col style={{ width: '4%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '31%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '12%' }} />
        </colgroup>
        <thead>
          <tr className="bg-slate-100 text-center font-bold text-[8.5pt]">
            <th rowSpan={2} className="border border-black px-1 py-1 text-center">No.</th>
            <th rowSpan={2} className="border border-black px-1.5 py-1 text-center">Kode Barang</th>
            <th rowSpan={2} className="border border-black px-2 py-1 text-left">Nama Barang / NUSP / Spesifikasi</th>
            <th colSpan={2} className="border border-black px-1 py-1 text-center bg-slate-200/70">Pengajuan</th>
            <th colSpan={2} className="border border-black px-1 py-1 text-center bg-slate-200/70">Sisa Persediaan</th>
            <th rowSpan={2} className="border border-black px-1.5 py-1 text-left">Usul Pengajuan</th>
            <th rowSpan={2} className="border border-black px-2 py-1 text-left">Keperluan</th>
          </tr>
          <tr className="bg-slate-100 text-center font-bold text-[8pt]">
            <th className="border border-black px-1 py-1 text-center bg-slate-50">Jml</th>
            <th className="border border-black px-1 py-1 text-center bg-slate-50">Sat</th>
            <th className="border border-black px-1 py-1 text-center bg-slate-50">Jml</th>
            <th className="border border-black px-1 py-1 text-center bg-slate-50">Sat</th>
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
                  {item.nusp && item.nusp !== '-' && (
                    <div className="text-[7pt] text-slate-600 font-mono">NUSP: {item.nusp}</div>
                  )}
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
                {/* Grup Pengajuan Permintaan */}
                <td className="border border-black px-1 py-1 text-center font-bold text-slate-900">
                  {item.usulanJumlah || item.jumlah}
                </td>
                <td className="border border-black px-1 py-1 text-center text-slate-800">
                  {item.satuan}
                </td>
                {/* Grup Informasi Sisa Barang Persediaan */}
                <td className="border border-black px-1 py-1 text-center text-slate-700">
                  {item.sisaBarang ?? 0}
                </td>
                <td className="border border-black px-1 py-1 text-center text-slate-800">
                  {item.satuan}
                </td>
                {/* Usul Pengajuan Persetujuan */}
                <td className="border border-black px-1.5 py-1 text-left font-bold text-slate-900">
                  {item.usulanJumlah || item.jumlah} {item.satuan}
                </td>
                {/* Keperluan */}
                <td className="border border-black px-2 py-1 text-left text-[8pt] text-slate-800 leading-tight">
                  {item.keperluan || transaksi.keperluanUmum || '-'}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9} className="p-3 text-center text-slate-500 italic">
                Tidak ada rincian barang permintaan.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 4. Blok Tanda Tangan SPB (2 Kolom Sejajar Standar Resmi) */}
      <div className="doc-signature-block avoid-break break-inside-avoid mt-6 print:mt-4 text-xs font-sans">
        <div className="grid grid-cols-2 gap-8 text-center">
          {/* Kolom Kiri: Pemohon / Yang Meminta */}
          <div>
            <div className="invisible select-none leading-tight print:hidden">&nbsp;</div>
            <p className="font-semibold text-slate-900">Pemohon,</p>
            <p className="text-[8pt] text-slate-600 italic">
              {transaksi.unitPemohon || pemohon.jabatan || 'Penanggung Jawab Unit'}
            </p>
            <div className="h-16 print:h-14 flex items-center justify-center">
              {/* Optional Signature area placeholder */}
            </div>
            <p className="font-bold underline text-slate-900 text-sm">{pemohon.nama}</p>
            <p className="text-xs text-slate-700 font-mono mt-0.5">
              NIP. {pemohon.nip && pemohon.nip !== '-' ? pemohon.nip : '-'}
            </p>
            {pemohon.pangkatGolongan && pemohon.pangkatGolongan !== '-' && (
              <p className="text-[8pt] text-slate-600">Pangkat/Gol: {pemohon.pangkatGolongan}</p>
            )}
          </div>

          {/* Kolom Kanan: Pengurus Barang Pembantu */}
          <div>
            <p className="text-slate-800 mb-0.5">
              {kopConfig.kotaSurat || 'Ciamis'}, {formatTanggalIndonesia(transaksi.tanggal)}
            </p>
            <p className="font-semibold text-slate-900">Pengurus Barang Pembantu,</p>
            <p className="text-[8pt] text-slate-600 italic">
              Pengelola Persediaan Barang
            </p>
            <div className="h-16 print:h-14 flex items-center justify-center">
              {/* Optional Signature area placeholder */}
            </div>
            <p className="font-bold underline text-slate-900 text-sm">{pengurusBarang.nama}</p>
            <p className="text-xs text-slate-700 font-mono mt-0.5">
              NIP. {pengurusBarang.nip && pengurusBarang.nip !== '-' ? pengurusBarang.nip : '-'}
            </p>
            {pengurusBarang.pangkatGolongan && pengurusBarang.pangkatGolongan !== '-' && (
              <p className="text-[8pt] text-slate-600">Pangkat/Gol: {pengurusBarang.pangkatGolongan}</p>
            )}
          </div>
        </div>

        {/* Digital Verification QR Badge (TTE) - Compact at Bottom Center */}
        <div className="flex justify-center items-center mt-3 pt-2 border-t border-slate-200/60 print:border-none print:mt-1">
          <DocQRCode
            docType="SPB"
            docNumber={transaksi.noSPB}
            transaksi={transaksi}
            kopConfig={kopConfig}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
};
