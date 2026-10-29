import React from 'react';
import { KopSuratConfig, Pejabat, TransaksiPengeluaran } from '../../types';
import { formatRupiah, formatTanggalIndonesia } from '../../utils/numberGenerator';
import { resolveKepalaSekolah, resolvePengurusBarang } from '../../utils/pejabatResolver';

export interface ExportPdfLaporanPenyaluranProps {
  dataBerks?: {
    periode?: string;
    tanggalCetak?: string;
    items?: TransaksiPengeluaran[];
    totalNilai?: number;
    [key: string]: any;
  };
  pejabatSettings?: {
    kepalaSekolah?: {
      nama?: string;
      nip?: string;
      pangkatGolongan?: string;
      jabatan?: string;
      statusJabatan?: string;
      [key: string]: any;
    };
    pengurusBarang?: {
      nama?: string;
      nip?: string;
      pangkatGolongan?: string;
      jabatan?: string;
      statusJabatan?: string;
      [key: string]: any;
    };
    namaSekolah?: string;
    alamat?: string;
    telepon?: string;
    fax?: string;
    npsn?: string;
    kotaSurat?: string;
    [key: string]: any;
  };
  transaksiList?: TransaksiPengeluaran[];
  pejabatList?: Pejabat[];
  kopConfig?: KopSuratConfig;
  periode?: string;
  pemohonMap?: Record<string, Pejabat>;
}

export const ExportPdfLaporanPenyaluran: React.FC<ExportPdfLaporanPenyaluranProps> = ({
  dataBerks,
  pejabatSettings,
  transaksiList,
  pejabatList = [],
  kopConfig,
  periode,
  pemohonMap = {}
}) => {
  // Resolve official signatories dynamically from master if not passed directly in pejabatSettings
  const resolvedKepsek = resolveKepalaSekolah(pejabatList);
  const resolvedPengurus = resolvePengurusBarang(pejabatList);

  const kepalaSekolah = pejabatSettings?.kepalaSekolah || {
    nama: resolvedKepsek.nama,
    nip: resolvedKepsek.nip,
    pangkatGolongan: resolvedKepsek.pangkatGolongan,
    statusJabatan: resolvedKepsek.statusJabatan
  };

  const pengurusBarang = pejabatSettings?.pengurusBarang || {
    nama: resolvedPengurus.nama && resolvedPengurus.nama !== 'Pengurus Barang' 
      ? resolvedPengurus.nama 
      : 'Yati Cahyani, S.AP.',
    nip: resolvedPengurus.nip && resolvedPengurus.nip !== '-' ? resolvedPengurus.nip : '19870512 201101 2 007',
    pangkatGolongan: resolvedPengurus.pangkatGolongan || 'Penata / III c',
    statusJabatan: resolvedPengurus.statusJabatan
  };

  const schoolInfo = {
    namaSekolah: pejabatSettings?.namaSekolah || kopConfig?.namaSekolah || "SMAN 1 CIHAURBEUTI",
    alamat: pejabatSettings?.alamat || kopConfig?.alamatLengkap || "Jl. Kartawijaya No. 600 Cihaurbeuti, Kab. Ciamis",
    telepon: pejabatSettings?.telepon || (kopConfig as any)?.telepon || "",
    fax: pejabatSettings?.fax || (kopConfig as any)?.fax || "",
    npsn: pejabatSettings?.npsn || kopConfig?.npsn || "20211512",
    kotaSurat: pejabatSettings?.kotaSurat || kopConfig?.kotaSurat || "Ciamis"
  };

  // Determine list of transactions
  const rows: TransaksiPengeluaran[] = 
    dataBerks?.items || 
    transaksiList || 
    [];

  const periodeLabel = 
    dataBerks?.periode || 
    periode || 
    'Triwulan III (Jul–Sep) • Tahun 2026';

  const tanggalCetakLabel = 
    dataBerks?.tanggalCetak || 
    new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const totalNilaiKeseluruhan = dataBerks?.totalNilai !== undefined 
    ? dataBerks.totalNilai 
    : rows.reduce((acc, t) => 
        acc + t.items.reduce((s, it) => s + ((Number(it.usulanJumlah) || 0) * (Number(it.hargaSatuan) || 0)), 0), 
      0);

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
              alt="Logo Jawa Barat" 
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
            {schoolInfo.fax ? ` • Fax: ${schoolInfo.fax}` : ''}
            {schoolInfo.npsn ? ` • NPSN: ${schoolInfo.npsn}` : ''}
          </p>
        </div>
      </div>

      {/* 2. JUDUL LAPORAN */}
      <div className="text-center font-bold mb-5 uppercase">
        <h2 className="text-sm underline tracking-wide">REKAPITULASI PENYALURAN BARANG PERSEDIAAN</h2>
        <p className="text-xs font-normal normal-case mt-1 text-neutral-800">
          Periode: <span className="font-semibold">{periodeLabel}</span>
        </p>
      </div>

      {/* 3. TABEL DATA */}
      <table className="w-full border-collapse border border-black mb-6 text-xs">
        <thead>
          <tr className="bg-gray-100 text-center font-bold">
            <th className="border border-black p-1.5 w-8">NO</th>
            <th className="border border-black p-1.5 w-24">TANGGAL</th>
            <th className="border border-black p-1.5 w-32">NO. DOKUMEN</th>
            <th className="border border-black p-1.5">UNIT &amp; PEMOHON</th>
            <th className="border border-black p-1.5">RINCIAN BARANG</th>
            <th className="border border-black p-1.5 w-28 text-right">NILAI (Rp)</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="border border-black p-4 text-center text-neutral-500 italic">
                Tidak ada data penyaluran barang pada periode ini.
              </td>
            </tr>
          ) : (
            rows.map((t, idx) => {
              const totalNilai = t.items.reduce((s, it) => s + ((Number(it.usulanJumlah) || 0) * (Number(it.hargaSatuan) || 0)), 0);
              const pemohon = pemohonMap[t.pemohonId];
              const namaP = pemohon?.nama || (t.pemohonId && !t.pemohonId.startsWith('p-') ? t.pemohonId : '-') || '-';

              return (
                <tr key={t.id || idx} className="align-top hover:bg-neutral-50">
                  <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                  <td className="border border-black p-1.5 text-center whitespace-nowrap">
                    {formatTanggalIndonesia(t.tanggal)}
                  </td>
                  <td className="border border-black p-1.5 font-mono text-[10px]">
                    {t.noSPB || t.noBAST || t.noNPB || `Reg #${t.nomorUrut}`}
                  </td>
                  <td className="border border-black p-1.5">
                    <div className="font-bold">{t.unitPemohon}</div>
                    <div className="text-[10px] text-neutral-600">{namaP}</div>
                  </td>
                  <td className="border border-black p-1.5 text-[10px]">
                    {t.items && t.items.length > 0 ? (
                      <ul className="list-disc list-inside space-y-0.5">
                        {t.items.map((it, iIdx) => (
                          <li key={it.id || iIdx}>
                            {it.namaBarang} ({it.usulanJumlah} {it.satuan})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-neutral-400 italic">-</span>
                    )}
                  </td>
                  <td className="border border-black p-1.5 text-right font-mono font-bold whitespace-nowrap">
                    {formatRupiah(totalNilai)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="bg-gray-100 font-bold border-t-2 border-black">
              <td colSpan={5} className="border border-black p-1.5 text-right uppercase tracking-wider">
                Total Nilai Penyaluran ({rows.length} Berkas):
              </td>
              <td className="border border-black p-1.5 text-right font-mono font-extrabold text-xs whitespace-nowrap">
                {formatRupiah(totalNilaiKeseluruhan)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* 4. BLOK TANDA TANGAN (AUTO-FIT & TIDAK TERPOTONG) */}
      <div className="grid grid-cols-2 text-center text-xs mt-6 break-inside-avoid signature-block avoid-break">
        {/* Sebelah Kiri (Mengetahui) */}
        <div>
          <p className="font-bold uppercase tracking-wider">MENGETAHUI,</p>
          <p className="font-bold uppercase tracking-wide">
            {kepalaSekolah?.statusJabatan && kepalaSekolah.statusJabatan !== 'Definitif' ? `${kepalaSekolah.statusJabatan} ` : ''}
            KEPALA SATUAN PENDIDIKAN
          </p>
          <div className="h-16" />
          <p className="font-bold underline uppercase tracking-wide">
            {kepalaSekolah?.nama || '-'}
          </p>
          <p className="font-mono text-[11px] mt-0.5">
            NIP. {kepalaSekolah?.nip || '-'}
          </p>
          {kepalaSekolah?.pangkatGolongan && (
            <p className="text-[10px] text-neutral-800">{kepalaSekolah.pangkatGolongan}</p>
          )}
        </div>

        {/* Sebelah Kanan (Penyalur) */}
        <div>
          <p className="text-neutral-900 mb-0.5">
            {schoolInfo.kotaSurat}, {tanggalCetakLabel}
          </p>
          <p className="font-bold uppercase tracking-wide">
            {pengurusBarang?.statusJabatan && pengurusBarang.statusJabatan !== 'Definitif' ? `${pengurusBarang.statusJabatan} ` : ''}
            PENGURUS BARANG / PENYALUR
          </p>
          <div className="h-16" />
          <p className="font-bold underline uppercase tracking-wide">
            {pengurusBarang?.nama || 'RATNA INDRAWATI, S.KOM.'}
          </p>
          <p className="font-mono text-[11px] mt-0.5">
            NIP. {pengurusBarang?.nip || '-'}
          </p>
          {pengurusBarang?.pangkatGolongan && (
            <p className="text-[10px] text-neutral-800">{pengurusBarang.pangkatGolongan}</p>
          )}
        </div>
      </div>
    </div>
  );
};
export default ExportPdfLaporanPenyaluran;
