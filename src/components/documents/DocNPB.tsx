import React from 'react';
import { KopSuratConfig, Pejabat, TransaksiPengeluaran } from '../../types';
import { formatTanggalIndonesia } from '../../utils/numberGenerator';
import { resolvePemohon } from '../../utils/pejabatResolver';
import { KopSuratView } from '../KopSuratView';
import { DocQRCode } from './DocQRCode';

interface Props {
  transaksi: TransaksiPengeluaran;
  kopConfig: KopSuratConfig;
  pejabatList: Pejabat[];
  minRows?: number;
}

export const DocNPB: React.FC<Props> = ({ 
  transaksi, 
  kopConfig, 
  pejabatList
}) => {
  // Penandatangan Tunggal: Pemohon / Penanggung Jawab Unit
  const pemohon = resolvePemohon(pejabatList, transaksi);

  return (
    <div className="doc-content font-serif text-black select-text w-full">
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

      {/* Items Table with table-layout: fixed and specified percentage column widths */}
      <table className="doc-table w-full border-collapse border border-black mb-2" style={{ tableLayout: 'fixed', width: '100%' }}>
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
            <th className="border border-black px-1 py-1 text-center" style={{ width: '5%' }}>No.</th>
            <th className="border border-black px-1.5 py-1 text-center" style={{ width: '15%' }}>Kode Barang</th>
            <th className="border border-black px-2 py-1 text-left" style={{ width: '40%' }}>Nama Barang &amp; Spesifikasi</th>
            <th className="border border-black px-1 py-1 text-center" style={{ width: '10%' }}>Satuan</th>
            <th className="border border-black px-1 py-1 text-center" style={{ width: '10%' }}>Jumlah Diminta</th>
            <th className="border border-black px-2 py-1 text-left" style={{ width: '20%' }}>Keperluan / Keterangan</th>
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
                <td className="border border-black px-1 py-0.5 text-center text-slate-800">
                  {item.satuan}
                </td>
                <td className="border border-black px-1 py-0.5 text-center font-bold text-slate-900">
                  {item.usulanJumlah || item.jumlah}
                </td>
                <td className="border border-black px-2 py-0.5 text-left text-[8pt] text-slate-800">
                  {item.keperluan || transaksi.keperluanUmum || '-'}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="p-2 text-center text-slate-500 italic">
                Tidak ada data barang permintaan.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Signature block with avoid-break: QR Code Verifikasi (Kiri) & Penandatangan Pemohon (Kanan) */}
      <div className="doc-signature-block avoid-break mt-6 text-[10pt] font-sans">
        <div className="flex justify-between items-end">
          {/* Kolom Kiri: QR Code Verifikasi Dokumen Resmi SIMBA */}
          <div className="pb-1">
            <DocQRCode
              docType="NPB"
              docNumber={transaksi.noNPB}
              transaksi={transaksi}
              kopConfig={kopConfig}
            />
          </div>

          {/* Kolom Kanan: Pemohon / Penanggung Jawab Unit */}
          <div className="w-[280px] text-center">
            <div>
              {kopConfig.kotaSurat || 'Ciamis'}, {formatTanggalIndonesia(transaksi.tanggal)}
            </div>
            <div className="font-bold text-slate-900 mt-1">
              Pemohon / Penanggung Jawab Unit,
            </div>
            <div className="font-bold uppercase text-slate-900">
              {transaksi.unitPemohon || pemohon.jabatan || 'Unit Pengguna'}
            </div>
            <div style={{ height: '55px' }} />
            <div className="font-bold underline text-slate-900">
              {pemohon.nama}
            </div>
            <div>
              {pemohon.nip && pemohon.nip !== '-' ? `NIP. ${pemohon.nip}` : 'NIP. -'}
            </div>
            {pemohon.pangkatGolongan && pemohon.pangkatGolongan !== '-' && (
              <div>
                Pangkat/Gol: {pemohon.pangkatGolongan}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
