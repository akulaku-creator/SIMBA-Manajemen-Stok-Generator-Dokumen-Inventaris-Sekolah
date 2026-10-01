import React from 'react';
import { KopSuratConfig, Pejabat } from '../../types';
import { formatTanggalIndonesia } from '../../utils/numberGenerator';
import { 
  formatJabatanWithStatus, 
  ResolvedOfficial, 
  resolveBendaharaBOS, 
  resolveKepalaSekolah, 
  resolvePengurusBarang, 
  resolveTimPemeriksa 
} from '../../utils/pejabatResolver';

export interface BaseSignatoryProps {
  pejabatList: Pejabat[];
  kopConfig: KopSuratConfig;
  tanggalSurat?: string;
  className?: string;
}

/**
 * 1. SignatoryBukuPersediaan
 * Digunakan untuk:
 * - BUKU-01 (Buku Penerimaan Barang Persediaan)
 * - BUKU-02 (Buku Pengeluaran Barang Persediaan)
 * - BUKU-REKAP (Buku Penerimaan & Pengeluaran / Rekapitulasi)
 * Spesifikasi: Pengurus/Penyimpan Barang & Kepala Satuan Pendidikan (Kepala Sekolah)
 */
export const SignatoryBukuPersediaan: React.FC<BaseSignatoryProps> = ({
  pejabatList,
  kopConfig,
  tanggalSurat = new Date().toISOString().split('T')[0],
  className = ''
}) => {
  const kepsek = resolveKepalaSekolah(pejabatList);
  const pengurusBarang = resolvePengurusBarang(pejabatList);

  const formattedKepsekJabatan = formatJabatanWithStatus(kepsek, {
    defaultTitle: 'Kepala Sekolah',
    namaSekolah: kopConfig.namaSekolah,
    includeSchoolName: true
  });

  const formattedPengurusJabatan = formatJabatanWithStatus(pengurusBarang, {
    defaultTitle: 'Pengurus Barang Pembantu'
  });

  return (
    <div className={`doc-signature-block signature-block avoid-break ${className}`}>
      <div className="grid grid-cols-2 text-center text-xs">
        {/* Kolom 1 (Kiri): Mengetahui Kepala Satuan Pendidikan */}
        <div>
          <p className="font-semibold text-slate-700">Mengetahui,</p>
          <p className="font-bold text-slate-900 uppercase">{formattedKepsekJabatan}</p>
          <p className="text-[8pt] text-slate-600 italic">Kuasa Pengguna Barang</p>
          <div className="doc-signature-space h-16 min-h-[64px]" />
          <p className="font-bold underline uppercase text-slate-900 tracking-wide">{kepsek.nama}</p>
          <p className="font-mono text-[8pt] text-slate-700">NIP. {kepsek.nip}</p>
          {kepsek.pangkatGolongan && (
            <p className="text-[8pt] text-slate-600">Pangkat/Gol: {kepsek.pangkatGolongan}</p>
          )}
        </div>

        {/* Kolom 2 (Kanan): Pengurus / Penyimpan Barang Persediaan */}
        <div>
          <p className="text-slate-700">
            {kopConfig.kotaSurat || 'Cihaurbeuti'}, {formatTanggalIndonesia(tanggalSurat)}
          </p>
          <p className="font-bold text-slate-900 uppercase">{formattedPengurusJabatan}</p>
          <p className="text-[8pt] text-slate-600 italic">Pengurus / Penyimpan Barang Persediaan</p>
          <div className="doc-signature-space h-16 min-h-[64px]" />
          <p className="font-bold underline uppercase text-slate-900 tracking-wide">{pengurusBarang.nama}</p>
          <p className="font-mono text-[8pt] text-slate-700">NIP. {pengurusBarang.nip}</p>
          {pengurusBarang.pangkatGolongan && (
            <p className="text-[8pt] text-slate-600">Pangkat/Gol: {pengurusBarang.pangkatGolongan}</p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 2. SignatoryStockOpname
 * Digunakan untuk:
 * - BAST-OPNAME (BAST Hasil Pemeriksaan Fisik Persediaan / Stock Opname)
 * Ukuran: A4 | Orientasi: Portrait (P)
 * Tanda Tangan: Tim Pemeriksa Fisik, Pengurus Barang Persediaan, & Kepala Sekolah (Mengetahui)
 */
export const SignatoryStockOpname: React.FC<BaseSignatoryProps> = ({
  pejabatList,
  kopConfig,
  tanggalSurat = new Date().toISOString().split('T')[0],
  className = ''
}) => {
  const timPemeriksa = resolveTimPemeriksa(pejabatList);
  const pengurusBarang = resolvePengurusBarang(pejabatList);
  const kepsek = resolveKepalaSekolah(pejabatList);

  const formattedKepsekJabatan = formatJabatanWithStatus(kepsek, {
    defaultTitle: 'Kepala Sekolah',
    namaSekolah: kopConfig.namaSekolah,
    includeSchoolName: true
  });

  const formattedPengurusJabatan = formatJabatanWithStatus(pengurusBarang, {
    defaultTitle: 'Pengurus Barang Persediaan'
  });

  const formattedPemeriksaJabatan = formatJabatanWithStatus(timPemeriksa, {
    defaultTitle: 'Tim Pemeriksa Fisik'
  });

  return (
    <div className={`doc-signature-block signature-block avoid-break ${className}`}>
      <div className="text-right text-xs mb-3 text-slate-800">
        <p>{kopConfig.kotaSurat || 'Cihaurbeuti'}, {formatTanggalIndonesia(tanggalSurat)}</p>
      </div>
      <div className="grid grid-cols-3 text-center text-xs gap-3">
        {/* Kolom 1: Tim Pemeriksa Fisik */}
        <div className="flex flex-col justify-between">
          <div>
            <p className="font-semibold text-slate-900">TIM PEMERIKSA FISIK,</p>
            <p className="font-bold text-slate-900 uppercase text-[8.5pt]">{formattedPemeriksaJabatan}</p>
            <p className="text-[7.5pt] text-slate-600 italic">Pemeriksa Teknis Lapangan</p>
          </div>
          <div className="mt-14">
            <p className="font-bold underline uppercase text-slate-900 tracking-wide">{timPemeriksa.nama}</p>
            <p className="font-mono text-[8pt] text-slate-700">NIP. {timPemeriksa.nip}</p>
            {timPemeriksa.pangkatGolongan && (
              <p className="text-[7.5pt] text-slate-600">Pangkat/Gol: {timPemeriksa.pangkatGolongan}</p>
            )}
          </div>
        </div>

        {/* Kolom 2: Pengurus Barang Persediaan */}
        <div className="flex flex-col justify-between">
          <div>
            <p className="font-semibold text-slate-900">YANG MENYERAHKAN,</p>
            <p className="font-bold text-slate-900 uppercase text-[8.5pt]">{formattedPengurusJabatan}</p>
            <p className="text-[7.5pt] text-slate-600 italic">Pengelola Fisik Persediaan</p>
          </div>
          <div className="mt-14">
            <p className="font-bold underline uppercase text-slate-900 tracking-wide">{pengurusBarang.nama}</p>
            <p className="font-mono text-[8pt] text-slate-700">NIP. {pengurusBarang.nip}</p>
            {pengurusBarang.pangkatGolongan && (
              <p className="text-[7.5pt] text-slate-600">Pangkat/Gol: {pengurusBarang.pangkatGolongan}</p>
            )}
          </div>
        </div>

        {/* Kolom 3: Mengetahui Kepala Sekolah */}
        <div className="flex flex-col justify-between">
          <div>
            <p className="font-semibold text-slate-900">MENGETAHUI / MENYETUJUI,</p>
            <p className="font-bold text-slate-900 uppercase text-[8.5pt]">{formattedKepsekJabatan}</p>
            <p className="text-[7.5pt] text-slate-600 italic">Kuasa Pengguna Barang</p>
          </div>
          <div className="mt-14">
            <p className="font-bold underline uppercase text-slate-900 tracking-wide">{kepsek.nama}</p>
            <p className="font-mono text-[8pt] text-slate-700">NIP. {kepsek.nip}</p>
            {kepsek.pangkatGolongan && (
              <p className="text-[7.5pt] text-slate-600">Pangkat/Gol: {kepsek.pangkatGolongan}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 3. SignatoryKartuBarang
 * Digunakan untuk:
 * - LAMPIRAN-12 (Kartu Barang)
 * - LAMPIRAN-13 (Kartu Persediaan Barang)
 * Ukuran: A4 | Orientasi: Landscape (L)
 * Tanda Tangan: Pengurus / Penyimpan Barang Persediaan
 */
export const SignatoryKartuBarang: React.FC<BaseSignatoryProps> = ({
  pejabatList,
  kopConfig,
  tanggalSurat = new Date().toISOString().split('T')[0],
  className = ''
}) => {
  const pengurusBarang = resolvePengurusBarang(pejabatList);
  const formattedPengurusJabatan = formatJabatanWithStatus(pengurusBarang, {
    defaultTitle: 'Pengurus / Penyimpan Barang'
  });

  return (
    <div className={`doc-signature-block signature-block avoid-break ${className}`}>
      <div className="flex justify-end text-xs">
        <div className="w-80 text-center">
          <p className="text-slate-700">
            {kopConfig.kotaSurat || 'Cihaurbeuti'}, {formatTanggalIndonesia(tanggalSurat)}
          </p>
          <p className="font-bold text-slate-900 uppercase mt-0.5">{formattedPengurusJabatan}</p>
          <p className="text-[8pt] text-slate-600 italic">Pengurus / Penyimpan Barang Persediaan</p>
          <div className="doc-signature-space h-16 min-h-[64px]" />
          <p className="font-bold underline uppercase text-slate-900 tracking-wide">{pengurusBarang.nama}</p>
          <p className="font-mono text-[8pt] text-slate-700">NIP. {pengurusBarang.nip}</p>
          {pengurusBarang.pangkatGolongan && (
            <p className="text-[8pt] text-slate-600">Pangkat/Gol: {pengurusBarang.pangkatGolongan}</p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 4. SignatorySheetBOS
 * Digunakan untuk:
 * - SHEET-BOS (Daftar Mutasi Barang Habis Pakai / BHP BOS 12 Bulan)
 * Ukuran: A4 | Orientasi: Landscape (L)
 * Tanda Tangan (3 Kolom): Bendahara BOS/APBD, Pengurus Barang Persediaan, & Kepala Satuan Pendidikan (Kepala Sekolah)
 */
export const SignatorySheetBOS: React.FC<BaseSignatoryProps & {
  customKepalaSekolah?: ResolvedOfficial;
  customPengurusBarang?: ResolvedOfficial;
  customBendaharaBos?: ResolvedOfficial;
}> = ({
  pejabatList,
  kopConfig,
  tanggalSurat = new Date().toISOString().split('T')[0],
  customKepalaSekolah,
  customPengurusBarang,
  customBendaharaBos,
  className = ''
}) => {
  const kepalaSekolah = customKepalaSekolah || resolveKepalaSekolah(pejabatList);
  const pengurusBarang = customPengurusBarang || resolvePengurusBarang(pejabatList);
  const bendaharaBos = customBendaharaBos || resolveBendaharaBOS(pejabatList);

  const formattedKepsekJabatan = formatJabatanWithStatus(kepalaSekolah, {
    defaultTitle: 'Kepala Sekolah',
    namaSekolah: kopConfig.namaSekolah,
    includeSchoolName: true
  });

  const formattedBendaharaJabatan = formatJabatanWithStatus(bendaharaBos, {
    defaultTitle: 'Bendahara BOS / APBD'
  });

  const formattedPengurusJabatan = formatJabatanWithStatus(pengurusBarang, {
    defaultTitle: 'Pengurus Barang Persediaan'
  });

  return (
    <div className={`doc-signature-block signature-block avoid-break mt-6 pt-4 border-t border-slate-200 ${className}`}>
      <div className="grid grid-cols-3 text-center text-xs text-slate-800">
        {/* Kolom 1: Mengetahui/Menyetujui Kepala Satuan Pendidikan */}
        <div className="flex flex-col justify-between">
          <div>
            <p className="font-semibold text-slate-700">Mengetahui/Menyetujui,</p>
            <p className="font-bold text-slate-900 uppercase">{formattedKepsekJabatan}</p>
            <p className="text-[8pt] text-slate-600 italic">Kuasa Pengguna Barang</p>
          </div>
          <div className="mt-16">
            <p className="font-bold underline text-slate-900 uppercase tracking-wide">
              {kepalaSekolah?.nama || '(Nama Kepala Sekolah)'}
            </p>
            <p className="text-[11px] text-slate-700 font-mono">NIP. {kepalaSekolah?.nip || '-'}</p>
            {kepalaSekolah?.pangkatGolongan && (
              <p className="text-[10px] text-slate-500">Pangkat/Gol: {kepalaSekolah.pangkatGolongan}</p>
            )}
          </div>
        </div>

        {/* Kolom 2: Bendahara BOS */}
        <div className="flex flex-col justify-between">
          <div>
            <p className="text-transparent select-none">&nbsp;</p>
            <p className="font-bold text-slate-900 uppercase">{formattedBendaharaJabatan}</p>
            <p className="text-[8pt] text-slate-600 italic">Pengelola Keuangan Sekolah</p>
          </div>
          <div className="mt-16">
            <p className="font-bold underline text-slate-900 uppercase tracking-wide">
              {bendaharaBos?.nama || '(Nama Bendahara BOS)'}
            </p>
            <p className="text-[11px] text-slate-700 font-mono">NIP. {bendaharaBos?.nip || '-'}</p>
            {bendaharaBos?.pangkatGolongan && (
              <p className="text-[10px] text-slate-500">Pangkat/Gol: {bendaharaBos.pangkatGolongan}</p>
            )}
          </div>
        </div>

        {/* Kolom 3: Pengurus Barang */}
        <div className="flex flex-col justify-between">
          <div>
            <p className="text-slate-700">
              {kopConfig.kotaSurat || 'Cihaurbeuti'}, {formatTanggalIndonesia(tanggalSurat)}
            </p>
            <p className="font-bold text-slate-900 uppercase">{formattedPengurusJabatan}</p>
            <p className="text-[8pt] text-slate-600 italic">Pengurus / Penyimpan Barang Persediaan</p>
          </div>
          <div className="mt-16">
            <p className="font-bold underline text-slate-900 uppercase tracking-wide">
              {pengurusBarang?.nama || '(Nama Pengurus Barang)'}
            </p>
            <p className="text-[11px] text-slate-700 font-mono">NIP. {pengurusBarang?.nip || '-'}</p>
            {pengurusBarang?.pangkatGolongan && (
              <p className="text-[10px] text-slate-500">Pangkat/Gol: {pengurusBarang.pangkatGolongan}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
