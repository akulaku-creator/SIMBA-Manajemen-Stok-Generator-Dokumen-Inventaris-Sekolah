import React from 'react';
import { KopSuratConfig, Pejabat, TransaksiPengeluaran } from '../../types';
import { formatTanggalIndonesia } from '../../utils/numberGenerator';
import { resolvePemohon, resolvePengurusBarang, resolveWakasekSarpras } from '../../utils/pejabatResolver';
import { KopSuratView } from '../KopSuratView';
import { DocQRCode } from './DocQRCode';

interface Props {
  transaksi: TransaksiPengeluaran;
  kopConfig: KopSuratConfig;
  pejabatList: Pejabat[];
  minRows?: number;
}

export const DocSPPB: React.FC<Props> = ({ 
  transaksi, 
  kopConfig, 
  pejabatList
}) => {
  // Pemohon / PJ Unit Penerima
  const pemohon = resolvePemohon(pejabatList, transaksi);

  // Pengurus Barang Pembantu yang ditugaskan
  const pengurusBarang = resolvePengurusBarang(pejabatList, transaksi.pengurusBarangId);

  // Penandatangan Utama: Wakasek Sarana Prasarana
  const sarpras = resolveWakasekSarpras(pejabatList, transaksi.sarprasId);

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

      {/* Disbursed Goods Table with table-layout: fixed and specified percentage column widths */}
      <table className="doc-table w-full border-collapse border border-black mb-2" style={{ tableLayout: 'fixed', width: '100%' }}>
        <colgroup>
          <col style={{ width: '4%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '40%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '26%' }} />
        </colgroup>
        <thead>
          <tr className="bg-slate-100 text-center font-bold text-[8.5pt]">
            <th rowSpan={2} className="border border-black px-1 py-1 text-center" style={{ width: '4%' }}>No.</th>
            <th rowSpan={2} className="border border-black px-1.5 py-1 text-center" style={{ width: '14%' }}>Kode Barang</th>
            <th rowSpan={2} className="border border-black px-2 py-1 text-left" style={{ width: '40%' }}>Nama Barang / Spesifikasi</th>
            <th colSpan={2} className="border border-black px-1.5 py-1 text-center bg-slate-200/70" style={{ width: '16%' }}>Persetujuan Pengeluaran</th>
            <th rowSpan={2} className="border border-black px-2 py-1 text-left" style={{ width: '26%' }}>Keterangan</th>
          </tr>
          <tr className="bg-slate-100 text-center font-bold text-[8pt]">
            <th className="border border-black px-1 py-1 text-center bg-slate-50" style={{ width: '8%' }}>Jumlah</th>
            <th className="border border-black px-1 py-1 text-center bg-slate-50" style={{ width: '8%' }}>Satuan</th>
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
                  {item.keperluan || 'Kondisi Baik / Sesuai Permintaan'}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="p-2 text-center text-slate-500 italic">
                Tidak ada data barang yang dikeluarkan.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Signature Section: QR Code Verifikasi (Kiri) & Wakasek Sarpras (Kanan) */}
      <div className="doc-signature-block avoid-break mt-6 text-[10pt] font-sans">
        <div className="flex justify-between items-end">
          {/* Kolom Kiri: QR Code Verifikasi Dokumen Resmi SIMBA */}
          <div className="pb-1">
            <DocQRCode
              docType="SPPB"
              docNumber={transaksi.noSPPB}
              transaksi={transaksi}
              kopConfig={kopConfig}
            />
          </div>

          {/* Kolom Kanan: Wakasek Sarana Prasarana */}
          <div className="w-[280px] text-center">
            <div>Ditetapkan di: {kopConfig.kotaSurat || 'Ciamis'}</div>
            <div>Pada tanggal: {formatTanggalIndonesia(transaksi.tanggal)}</div>
            <div className="font-bold text-slate-900 mt-1">Menyetujui / Memerintahkan,</div>
            <div className="font-bold uppercase text-slate-900">WAKASEK SARANA PRASARANA</div>
            <div style={{ height: '55px' }} />
            <div className="font-bold underline text-slate-900">{sarpras.nama || '-'}</div>
            <div>{sarpras.nip && sarpras.nip !== '-' ? `NIP. ${sarpras.nip}` : 'NIP. -'}</div>
            {sarpras.pangkatGolongan && sarpras.pangkatGolongan !== '-' && (
              <div>Pangkat/Gol: {sarpras.pangkatGolongan}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
