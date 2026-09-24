import React from 'react';
import { KopSuratConfig, Pejabat, TransaksiPengeluaran } from '../../types';
import { formatTanggalIndonesia } from '../../utils/numberGenerator';
import { resolveKepalaSekolah, resolvePemohon, resolvePengurusBarang } from '../../utils/pejabatResolver';
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
  // Penandatangan SPB: ACC Kepala Sekolah (Kiri) & Pengurus Barang Pembantu (Kanan)
  const kepsek = resolveKepalaSekolah(pejabatList, transaksi.kepsekId);
  const pengurusBarang = resolvePengurusBarang(pejabatList, transaksi.pengurusBarangId);

  // Pemohon / PJ Unit (Tercantum pada Metadata Header Dokumen)
  const pemohon = resolvePemohon(pejabatList, transaksi);

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
                  <td className="col-value font-semibold text-slate-900">{pemohon.jabatan}</td>
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

      {/* 3. Tabel Rincian SPB dengan table-layout: fixed dan Alokasi Persentase Proporsional */}
      <table className="doc-table w-full border-collapse border border-black mb-2" style={{ tableLayout: 'fixed', width: '100%' }}>
        <colgroup>
          <col style={{ width: '4%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '31%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '11%' }} />
        </colgroup>
        <thead>
          <tr className="bg-slate-100 text-center font-bold text-[8.5pt]">
            <th rowSpan={2} className="border border-black px-1 py-1 text-center" style={{ width: '4%' }}>No.</th>
            <th rowSpan={2} className="border border-black px-1.5 py-1 text-center" style={{ width: '15%' }}>Kode Barang</th>
            <th rowSpan={2} className="border border-black px-2 py-1 text-left" style={{ width: '31%' }}>Nama Barang / NUSP / Spesifikasi</th>
            <th colSpan={2} className="border border-black px-1 py-1 text-center bg-slate-200/70" style={{ width: '14%' }}>Pengajuan Permintaan</th>
            <th colSpan={2} className="border border-black px-1 py-1 text-center bg-slate-200/70" style={{ width: '14%' }}>Informasi Sisa Persediaan</th>
            <th rowSpan={2} className="border border-black px-1.5 py-1 text-left" style={{ width: '11%' }}>Usul Pengajuan Persetujuan</th>
            <th rowSpan={2} className="border border-black px-2 py-1 text-left" style={{ width: '11%' }}>Keperluan</th>
          </tr>
          <tr className="bg-slate-100 text-center font-bold text-[8pt]">
            <th className="border border-black px-1 py-1 text-center bg-slate-50" style={{ width: '7%' }}>Jumlah</th>
            <th className="border border-black px-1 py-1 text-center bg-slate-50" style={{ width: '7%' }}>Satuan</th>
            <th className="border border-black px-1 py-1 text-center bg-slate-50" style={{ width: '7%' }}>Jumlah</th>
            <th className="border border-black px-1 py-1 text-center bg-slate-50" style={{ width: '7%' }}>Satuan</th>
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
                  {item.nusp && item.nusp !== '-' && (
                    <div className="text-[7pt] text-slate-600 font-mono">NUSP: {item.nusp}</div>
                  )}
                  {item.spesifikasi && item.spesifikasi !== '-' && item.spesifikasi !== item.namaBarang && (
                    <div className="text-[7.5pt] text-slate-600 italic font-normal mt-0.5">
                      {item.spesifikasi}
                    </div>
                  )}
                </td>
                {/* Grup Pengajuan Permintaan */}
                <td className="border border-black px-1 py-0.5 text-center font-bold text-slate-900">
                  {item.usulanJumlah || item.jumlah}
                </td>
                <td className="border border-black px-1 py-0.5 text-center text-slate-800">
                  {item.satuan}
                </td>
                {/* Grup Informasi Sisa Barang Persediaan */}
                <td className="border border-black px-1 py-0.5 text-center text-slate-700">
                  {item.sisaBarang ?? 0}
                </td>
                <td className="border border-black px-1 py-0.5 text-center text-slate-800">
                  {item.satuan}
                </td>
                {/* Usul Pengajuan Persetujuan: Left aligned per requirement */}
                <td className="border border-black px-1.5 py-0.5 text-left font-bold text-slate-900">
                  {item.usulanJumlah || item.jumlah} {item.satuan}
                </td>
                {/* Keperluan: Left aligned */}
                <td className="border border-black px-2 py-0.5 text-left text-[8pt] text-slate-800">
                  {item.keperluan || transaksi.keperluanUmum || '-'}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9} className="p-2 text-center text-slate-500 italic">
                Tidak ada rincian barang permintaan.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 4. Kolom Pengesahan Tanda Tangan: ACC Kepala Sekolah (Kiri), QR Verifikasi (Tengah), & Pengurus Barang (Kanan) */}
      <div className="doc-signature-block avoid-break mt-6 text-[10pt] font-sans">
        <div className="flex justify-between items-start">
          {/* KOLOM KIRI: ACC Kepala Sekolah */}
          <div className="w-[38%] text-center">
            <div className="invisible select-none leading-normal">&nbsp;</div>
            <div className="font-bold text-slate-900">
              Menyetujui,
            </div>
            <div className="font-bold uppercase text-slate-900">
              {kepsek.jabatan || 'KEPALA SEKOLAH'}
            </div>
            <div style={{ height: '55px' }} />
            <div className="font-bold underline text-slate-900">
              {kepsek.nama || '-'}
            </div>
            <div className="text-slate-900">
              {kepsek.nip && kepsek.nip !== '-' ? `NIP. ${kepsek.nip}` : 'NIP. -'}
            </div>
            {kepsek.pangkatGolongan && kepsek.pangkatGolongan !== '-' && (
              <div className="text-slate-800 text-[9pt]">
                Pangkat/Gol: {kepsek.pangkatGolongan}
              </div>
            )}
          </div>

          {/* KOLOM TENGAH: QR Code Verifikasi Dokumen */}
          <div className="w-[24%] flex justify-center items-center pt-8">
            <DocQRCode
              docType="SPB"
              docNumber={transaksi.noSPB}
              transaksi={transaksi}
              kopConfig={kopConfig}
              size="sm"
            />
          </div>

          {/* KOLOM KANAN: Pengurus Barang Pembantu */}
          <div className="w-[38%] text-center">
            <div>
              {kopConfig.kotaSurat || 'Ciamis'}, {formatTanggalIndonesia(transaksi.tanggal)}
            </div>
            <div className="font-bold text-slate-900">
              Yang Mengajukan,
            </div>
            <div className="font-bold uppercase text-slate-900">
              {pengurusBarang.jabatan || 'PENGURUS BARANG PEMBANTU'}
            </div>
            <div style={{ height: '55px' }} />
            <div className="font-bold underline text-slate-900">
              {pengurusBarang.nama || '-'}
            </div>
            <div className="text-slate-900">
              {pengurusBarang.nip && pengurusBarang.nip !== '-' ? `NIP. ${pengurusBarang.nip}` : 'NIP. -'}
            </div>
            {pengurusBarang.pangkatGolongan && pengurusBarang.pangkatGolongan !== '-' && (
              <div className="text-slate-800 text-[9pt]">
                Pangkat/Gol: {pengurusBarang.pangkatGolongan}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
