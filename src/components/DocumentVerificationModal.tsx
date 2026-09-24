import {
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileCheck2,
  FileText,
  Package,
  QrCode,
  School,
  ShieldCheck,
  UserCheck,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { KopSuratConfig, TransaksiPengeluaran } from '../types';
import { formatTanggalIndonesia } from '../utils/numberGenerator';
import { DocTypeShort, getDocTypeName, VerificationData } from '../utils/qrVerificationHelper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: VerificationData | null;
  transaksi?: TransaksiPengeluaran | null;
  kopConfig?: KopSuratConfig;
}

export const DocumentVerificationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  data,
  transaksi,
  kopConfig
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !data) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(data.verificationCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(data.verificationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const docItems = transaksi?.items || [];
  const schoolName = kopConfig?.namaSekolah || data.namaSekolah || 'Satuan Pendidikan Resmi';

  return (
    <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0 border-b border-emerald-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide flex items-center gap-2">
                Verifikasi Keaslian Dokumen Digital
                <span className="bg-emerald-500/30 text-emerald-200 text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/40 uppercase font-semibold">
                  Resmi Terdaftar
                </span>
              </h2>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Sistem Informasi Manajemen Barang &amp; Aset (SIMBA)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          
          {/* Status Banner */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3.5 shadow-xs">
            <div className="p-2 bg-emerald-100 rounded-full text-emerald-700 shrink-0 mt-0.5">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-emerald-950 text-sm">
                  DOKUMEN RESMI DINAS TERVERIFIKASI
                </h3>
                <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
                  STATUS: SAH
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                Dokumen ini sah dan terdaftar secara valid dalam pangkalan data SIMBA. Diterbitkan secara resmi dengan identitas integritas digital dan dapat digunakan sebagai bukti operasional persediaan.
              </p>
            </div>
          </div>

          {/* Primary Meta Grid */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              
              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Jenis Dokumen</span>
                <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 mt-0.5">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  {data.docTypeName}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Nomor Dokumen</span>
                <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block truncate" title={data.docNumber}>
                  {data.docNumber || '-'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Satuan Pendidikan / Sekolah</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <School className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  {schoolName}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Tanggal Terbit</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  {formatTanggalIndonesia(data.tanggal)}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Unit Pemohon</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  {data.unitPemohon}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Keperluan / Keterangan</span>
                <span className="font-normal text-slate-700 mt-0.5 block truncate" title={data.keperluan}>
                  {data.keperluan}
                </span>
              </div>
            </div>

            {/* Verification Code Box */}
            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Kode Hash Verifikasi Unik (TTE)
                </span>
                <div className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 inline-block mt-0.5 select-all">
                  {data.verificationCode}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedCode ? 'Tersalin' : 'Salin Kode'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ExternalLink className="w-3.5 h-3.5 text-blue-600" />}
                  <span>{copiedLink ? 'Link Tersalin' : 'Salin Link'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Rincian Barang yang Tercantum dalam Dokumen */}
          {docItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <Package className="w-3.5 h-3.5 text-slate-600" />
                  Rincian Barang Terdaftar ({docItems.length} Item)
                </h4>
                <span className="text-[10px] text-slate-500">Tercatat dalam Buku Penyaluran</span>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-1.5 px-2.5 w-8 text-center">No</th>
                      <th className="py-1.5 px-2.5">Nama Barang &amp; Kode</th>
                      <th className="py-1.5 px-2.5 text-center w-24">Jumlah</th>
                      <th className="py-1.5 px-2.5 text-center w-20">Satuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {docItems.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2.5 text-center text-slate-500 font-medium">{idx + 1}</td>
                        <td className="py-1.5 px-2.5">
                          <div className="font-semibold text-slate-800">{item.namaBarang}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Kode: {item.kodeBarang || '-'}</div>
                        </td>
                        <td className="py-1.5 px-2.5 text-center font-bold text-slate-900">
                          {item.usulanJumlah || item.jumlah}
                        </td>
                        <td className="py-1.5 px-2.5 text-center text-slate-700 font-medium">
                          {item.satuan}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Legal / Validity Note */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 leading-relaxed">
            <p className="font-semibold text-slate-800 mb-0.5 flex items-center gap-1">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
              Ketentuan Validitas Dokumen Elektronik Sekolah:
            </p>
            Dokumen cetak yang dibubuhi QR Code terverifikasi ini merupakan salinan sah dari dokumen digital yang diterbitkan melalui aplikasi SIMBA. Verifikasi dapat dilakukan secara mandiri kapan saja dengan memindai kode QR menggunakan kamera ponsel atau pemindai kode QR standar.
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Terverifikasi pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
          >
            Tutup Informasi
          </button>
        </div>

      </div>
    </div>
  );
};
