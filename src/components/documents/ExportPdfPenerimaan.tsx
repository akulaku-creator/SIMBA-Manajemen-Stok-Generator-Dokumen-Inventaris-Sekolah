import React from 'react';
import { KopSuratConfig, Pejabat, TransaksiPenerimaan } from '../../types';
import { formatRupiah, formatTanggalIndonesia } from '../../utils/numberGenerator';
import { resolveKepalaSekolah, resolvePengurusBarang } from '../../utils/pejabatResolver';

export interface ExportPdfPenerimaanProps {
  dataPenerimaan?: TransaksiPenerimaan[] | any[];
  filterInfo?: string;
  pejabatSettings?: {
    kepalaSekolah?: {
      nama?: string;
      nip?: string;
      pangkat?: string;
      pangkatGolongan?: string;
      jabatan?: string;
      jabatanKedinasan?: string;
      statusJabatan?: string;
      [key: string]: any;
    };
    pengurusBarang?: {
      nama?: string;
      nip?: string;
      pangkat?: string;
      pangkatGolongan?: string;
      jabatan?: string;
      jabatanKedinasan?: string;
      statusJabatan?: string;
      [key: string]: any;
    };
    namaSekolah?: string;
    alamat?: string;
    telepon?: string;
    fax?: string;
    npsn?: string;
    lokasi?: string;
    kotaSurat?: string;
    [key: string]: any;
  };
  pejabatList?: Pejabat[];
  kopConfig?: KopSuratConfig;
}

export const ExportPdfPenerimaan: React.FC<ExportPdfPenerimaanProps> = ({
  dataPenerimaan = [],
  filterInfo,
  pejabatSettings,
  pejabatList = [],
  kopConfig
}) => {
  // Dynamic official signatories resolution
  const resolvedKepsek = resolveKepalaSekolah(pejabatList);
  const resolvedPengurus = resolvePengurusBarang(pejabatList);

  const kepalaSekolah = pejabatSettings?.kepalaSekolah || {
    nama: resolvedKepsek.nama,
    nip: resolvedKepsek.nip,
    pangkat: resolvedKepsek.pangkatGolongan,
    pangkatGolongan: resolvedKepsek.pangkatGolongan,
    jabatan: resolvedKepsek.jabatan,
    jabatanKedinasan: 'KEPALA SATUAN PENDIDIKAN',
    statusJabatan: resolvedKepsek.statusJabatan
  };

  const pengurusBarang = pejabatSettings?.pengurusBarang || {
    nama: resolvedPengurus.nama && resolvedPengurus.nama !== 'Pengurus Barang'
      ? resolvedPengurus.nama
      : 'RATNA INDRAWATI, S.KOM.',
    nip: resolvedPengurus.nip,
    pangkat: resolvedPengurus.pangkatGolongan,
    pangkatGolongan: resolvedPengurus.pangkatGolongan,
    jabatan: resolvedPengurus.jabatan,
    jabatanKedinasan: 'PENGURUS BARANG / PENYALUR',
    statusJabatan: resolvedPengurus.statusJabatan
  };

  const schoolInfo = {
    namaSekolah: pejabatSettings?.namaSekolah || kopConfig?.namaSekolah || "SMAN 1 CIHAURBEUTI",
    alamat: pejabatSettings?.alamat || kopConfig?.alamatLengkap || "Jl. Kartawijaya No. 600 Cihaurbeuti, Kab. Ciamis",
    telepon: pejabatSettings?.telepon || (kopConfig as any)?.telepon || "",
    fax: pejabatSettings?.fax || (kopConfig as any)?.fax || "",
    npsn: pejabatSettings?.npsn || kopConfig?.npsn || "20211512",
    lokasi: pejabatSettings?.lokasi || pejabatSettings?.kotaSurat || kopConfig?.kotaSurat || "Ciamis"
  };

  const totalSemuaNilai = dataPenerimaan.reduce((acc, curr) => acc + (Number(curr.totalNilai) || 0), 0);
  const [logoFailed, setLogoFailed] = React.useState(false);

  return (
    <div className="print-container p-6 bg-white font-sans text-xs text-black w-full box-border leading-normal">
      {/* 1. KOP SURAT RESMI DENGAN LOGO INSTANSI */}
      <div className="flex items-center gap-4 border-b-2 border-black pb-3 mb-4">
        {/* Logo Instansi (Logo Pemda Jawa Barat / SVG fallback) */}
        <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
          {!logoFailed ? (
            <img 
              src="/logo-jabar.png" 
              alt="Logo" 
              className="w-14 h-14 object-contain" 
              onError={() => setLogoFailed(true)} 
            />
          ) : (
            <div className="w-14 h-14 border border-black rounded-lg flex items-center justify-center p-1 bg-slate-50">
              <svg viewBox="0 0 100 100" className="w-full h-full fill-black" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 8 L85 24 V58 C85 78 50 92 50 92 C50 92 15 78 15 58 V24 Z" fill="none" stroke="currentColor" strokeWidth="3" />
                <path d="M50 22 L62 38 H38 Z" fill="currentColor" />
                <circle cx="50" cy="52" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <path d="M35 72 H65" stroke="currentColor" strokeWidth="3" />
              </svg>
            </div>
          )}
        </div>

        {/* Identitas Instansi Dinamis */}
        <div className="text-center flex-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-black leading-tight">
            PEMERINTAH DAERAH PROVINSI JAWA BARAT
          </h3>
          <h3 className="text-xs font-bold uppercase text-black leading-tight">
            DINAS PENDIDIKAN
          </h3>
          <h1 className="text-sm font-extrabold uppercase text-black tracking-wide leading-tight">
            {schoolInfo.namaSekolah}
          </h1>
          <p className="text-[10px] italic text-neutral-800 leading-tight mt-0.5">
            {schoolInfo.alamat}
            {schoolInfo.telepon ? ` • Telp: ${schoolInfo.telepon}` : ''}
            {schoolInfo.npsn ? ` • NPSN: ${schoolInfo.npsn}` : ''}
          </p>
        </div>
      </div>

      {/* 2. JUDUL LAPORAN */}
      <div className="text-center font-bold mb-6 uppercase">
        <h2 className="text-sm underline tracking-wide">REKAPITULASI PENERIMAAN BARANG PERSEDIAAN (DANA BOS)</h2>
        <p className="text-xs font-normal normal-case mt-1 text-neutral-800">
          Periode Filter: <span className="font-semibold">{filterInfo || 'Tahun Anggaran 2026'}</span>
        </p>
      </div>

      {/* 3. TABEL DATA PENERIMAAN */}
      <table className="w-full border-collapse border border-black mb-6 text-xs">
        <thead>
          <tr className="bg-gray-100 text-center font-bold">
            <th className="border border-black p-1.5 w-10">NO</th>
            <th className="border border-black p-1.5 w-24">TANGGAL</th>
            <th className="border border-black p-1.5 w-36">NO. BUKTI / FAKTUR</th>
            <th className="border border-black p-1.5 w-28">SUMBER DANA</th>
            <th className="border border-black p-1.5">PENYEDIA &amp; RINCIAN BARANG</th>
            <th className="border border-black p-1.5 w-32 text-right">TOTAL NILAI (RP)</th>
          </tr>
        </thead>
        <tbody>
          {dataPenerimaan.length > 0 ? (
            dataPenerimaan.map((item, idx) => {
              const rincianItems = item.items && item.items.length > 0
                ? item.items.map((it: any) => `${it.namaBarang} (${it.jumlahMasuk} ${it.satuan})`).join(', ')
                : (item.keterangan || item.rincianSingkat || '-');

              return (
                <tr key={item.id || idx} className="align-top hover:bg-neutral-50">
                  <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                  <td className="border border-black p-1.5 text-center whitespace-nowrap">
                    {formatTanggalIndonesia(item.tanggal)}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono text-[10px]">
                    {item.noBukti || item.noFaktur}
                  </td>
                  <td className="border border-black p-1.5 text-center">
                    {item.sumberDana || 'BOS Reguler'}
                  </td>
                  <td className="border border-black p-1.5">
                    <p className="font-bold text-slate-900">{item.penyedia}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">{rincianItems}</p>
                  </td>
                  <td className="border border-black p-1.5 text-right font-medium font-mono whitespace-nowrap">
                    {formatRupiah(item.totalNilai || 0)}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6} className="border border-black p-4 text-center italic text-slate-400">
                Tidak ada data penerimaan untuk filter yang dipilih.
              </td>
            </tr>
          )}
        </tbody>
        {dataPenerimaan.length > 0 && (
          <tfoot>
            <tr className="bg-gray-50 font-bold border-t-2 border-black">
              <td colSpan={5} className="border border-black p-2 text-right uppercase tracking-wider">
                Total Nilai Penerimaan ({dataPenerimaan.length} Berkas):
              </td>
              <td className="border border-black p-2 text-right font-mono font-extrabold text-xs whitespace-nowrap">
                {formatRupiah(totalSemuaNilai)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* 4. BLOK TANDA TANGAN (TIDAK TERPOTONG) */}
      <div className="grid grid-cols-2 text-center text-xs mt-10 break-inside-avoid signature-block avoid-break">
        <div>
          <p className="font-bold uppercase tracking-wider">MENGETAHUI,</p>
          <p className="font-bold uppercase tracking-wide">
            {kepalaSekolah?.statusJabatan && kepalaSekolah.statusJabatan !== 'Definitif' ? `${kepalaSekolah.statusJabatan} ` : ''}
            {kepalaSekolah?.jabatanKedinasan || kepalaSekolah?.jabatan || 'KEPALA SATUAN PENDIDIKAN'}
          </p>
          <div className="h-16"></div>
          <p className="font-bold underline uppercase tracking-wide">
            {kepalaSekolah?.nama || '(Nama Kepala Sekolah)'}
          </p>
          <p className="font-mono text-[11px] mt-0.5">
            NIP. {kepalaSekolah?.nip || '-'}
          </p>
          {(kepalaSekolah?.pangkatGolongan || kepalaSekolah?.pangkat) && (
            <p className="text-[10px] text-neutral-800">{kepalaSekolah.pangkatGolongan || kepalaSekolah.pangkat}</p>
          )}
        </div>
        <div>
          <p className="text-neutral-900 mb-0.5">
            {schoolInfo.lokasi}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="font-bold uppercase tracking-wide">
            {pengurusBarang?.statusJabatan && pengurusBarang.statusJabatan !== 'Definitif' ? `${pengurusBarang.statusJabatan} ` : ''}
            {pengurusBarang?.jabatanKedinasan || pengurusBarang?.jabatan || 'PENGURUS BARANG / PENYALUR'}
          </p>
          <div className="h-16"></div>
          <p className="font-bold underline uppercase tracking-wide">
            {pengurusBarang?.nama || '(Nama Pengurus Barang)'}
          </p>
          <p className="font-mono text-[11px] mt-0.5">
            NIP. {pengurusBarang?.nip || '-'}
          </p>
          {(pengurusBarang?.pangkatGolongan || pengurusBarang?.pangkat) && (
            <p className="text-[10px] text-neutral-800">{pengurusBarang.pangkatGolongan || pengurusBarang.pangkat}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportPdfPenerimaan;
