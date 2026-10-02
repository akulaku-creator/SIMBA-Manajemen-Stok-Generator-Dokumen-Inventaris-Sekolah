import React from 'react';
import { KopSuratConfig, Pejabat } from '../../types';
import { formatTanggalIndonesia } from '../../utils/numberGenerator';
import { 
  formatJabatanWithStatus, 
  ResolvedOfficial, 
  resolveBendaharaBOS, 
  resolveKepalaSekolah, 
  resolvePengurusBarang, 
  resolveTimPemeriksa,
  resolveWakasekSarpras
} from '../../utils/pejabatResolver';

export interface BaseSignatoryProps {
  pejabatList?: Pejabat[];
  kopConfig?: KopSuratConfig;
  tanggalSurat?: string;
  className?: string;
  settings?: {
    pejabat?: {
      kepalaSekolah?: Pejabat | ResolvedOfficial;
      pengurusBarang?: Pejabat | ResolvedOfficial;
      [key: string]: any;
    } | Pejabat[];
    namaSekolah?: string;
    [key: string]: any;
  };
  pejabatSettings?: {
    kepalaSekolah?: Pejabat | ResolvedOfficial | any;
    pengurusBarang?: Pejabat | ResolvedOfficial | any;
    lokasi?: string;
    [key: string]: any;
  };
  pejabat?: {
    kepalaSekolah?: Pejabat | ResolvedOfficial;
    pengurusBarang?: Pejabat | ResolvedOfficial;
  };
  dataDokumen?: {
    lokasi?: string;
    tanggalCetak?: string;
    [key: string]: any;
  };
  customKepalaSekolah?: ResolvedOfficial | Pejabat;
  customPengurusBarang?: ResolvedOfficial | Pejabat;
}

/**
 * 1. SignatoryBukuPersediaan
 * Digunakan untuk:
 * - BUKU-01 (Buku Penerimaan Barang Persediaan)
 * - BUKU-REKAP (Buku Penerimaan & Pengeluaran / Rekapitulasi)
 * Spesifikasi: Pengurus Barang & Kepala Sekolah (Mengetahui)
 */
export const SignatoryBukuPersediaan: React.FC<BaseSignatoryProps> = ({
  pejabatList = [],
  kopConfig,
  tanggalSurat = new Date().toISOString().split('T')[0],
  className = '',
  settings,
  pejabat,
  pejabatSettings,
  dataDokumen,
  customKepalaSekolah,
  customPengurusBarang
}) => {
  const effectiveList: Pejabat[] = Array.isArray(pejabatSettings?.kepalaSekolah)
    ? (pejabatSettings?.kepalaSekolah as any)
    : Array.isArray(settings?.pejabat)
    ? settings.pejabat
    : Array.isArray(pejabatList) && pejabatList.length > 0
    ? pejabatList
    : [];

  const rawKepsek =
    customKepalaSekolah ||
    pejabat?.kepalaSekolah ||
    pejabatSettings?.kepalaSekolah ||
    (settings?.pejabat && !Array.isArray(settings.pejabat) ? settings.pejabat.kepalaSekolah : undefined);

  const kepsek: ResolvedOfficial = rawKepsek
    ? {
        id: rawKepsek.id || 'pejabat-kepsek',
        nama: rawKepsek.nama || '(Nama Kepala Sekolah)',
        nip: rawKepsek.nip || '-',
        pangkatGolongan: rawKepsek.pangkatGolongan || (rawKepsek as any)?.pangkat || '-',
        jabatan: rawKepsek.jabatan || 'Kepala Sekolah',
        statusJabatan: rawKepsek.statusJabatan,
        unitKerja: rawKepsek.unitKerja || 'Kuasa Pengguna Barang'
      }
    : resolveKepalaSekolah(effectiveList);

  const rawPengurus =
    customPengurusBarang ||
    pejabat?.pengurusBarang ||
    pejabatSettings?.pengurusBarang ||
    (settings?.pejabat && !Array.isArray(settings.pejabat) ? settings.pejabat.pengurusBarang : undefined);

  const pengurusBarang: ResolvedOfficial = rawPengurus
    ? {
        id: rawPengurus.id || 'pejabat-pengurus-barang',
        nama: rawPengurus.nama || '(Nama Pengurus Barang)',
        nip: rawPengurus.nip || '-',
        pangkatGolongan: rawPengurus.pangkatGolongan || (rawPengurus as any)?.pangkat || '-',
        jabatan: rawPengurus.jabatan || 'Pengurus Barang',
        statusJabatan: rawPengurus.statusJabatan,
        unitKerja: rawPengurus.unitKerja || 'Pengelola Persediaan Barang'
      }
    : resolvePengurusBarang(effectiveList);

  const getJabatanLabel = (p: any, defaultRole: string) => {
    if (!p) return defaultRole;
    const prefix = p.statusJabatan && p.statusJabatan !== 'Definitif'
      ? `${p.statusJabatan}. `
      : '';
    return `${prefix}${p.jabatanKedinasan || p.jabatan || defaultRole}`.trim();
  };

  const lokasiDisplay = dataDokumen?.lokasi || (pejabatSettings as any)?.lokasi || kopConfig?.kotaSurat || 'Cihaurbeuti';
  const tanggalDisplay = dataDokumen?.tanggalCetak || formatTanggalIndonesia(tanggalSurat);

  return (
    <div className={`doc-signature-block signature-block avoid-break ${className}`}>
      <div className="grid grid-cols-2 text-center text-xs">
        {/* Kolom 1 (Kiri): Mengetahui Kepala Sekolah */}
        <div>
          <p className="font-semibold text-slate-700">Mengetahui,</p>
          <p className="font-bold text-slate-900 uppercase">{getJabatanLabel(kepsek, 'KEPALA SEKOLAH')}</p>
          <p className="text-[8pt] text-slate-600 italic">Kuasa Pengguna Anggaran</p>
          <div className="doc-signature-space h-16 min-h-[64px]" />
          <p className="font-bold underline uppercase text-slate-900 tracking-wide">{kepsek.nama}</p>
          <p className="font-mono text-[8pt] text-slate-700">NIP. {kepsek.nip}</p>
          {((kepsek as any)?.pangkat || (kepsek.pangkatGolongan && kepsek.pangkatGolongan !== '-')) && (
            <p className="text-[8pt] text-slate-600">{(kepsek as any)?.pangkat || kepsek.pangkatGolongan}</p>
          )}
        </div>

        {/* Kolom 2 (Kanan): Pengurus Barang */}
        <div>
          <p className="text-slate-700">
            {lokasiDisplay}, {tanggalDisplay}
          </p>
          <p className="font-bold text-slate-900 uppercase">{getJabatanLabel(pengurusBarang, 'PENGURUS BARANG')}</p>
          <p className="text-[8pt] text-slate-600 italic">Pengurus Barang Persediaan</p>
          <div className="doc-signature-space h-16 min-h-[64px]" />
          <p className="font-bold underline uppercase text-slate-900 tracking-wide">{pengurusBarang.nama}</p>
          <p className="font-mono text-[8pt] text-slate-700">NIP. {pengurusBarang.nip}</p>
          {((pengurusBarang as any)?.pangkat || (pengurusBarang.pangkatGolongan && pengurusBarang.pangkatGolongan !== '-')) && (
            <p className="text-[8pt] text-slate-600">{(pengurusBarang as any)?.pangkat || pengurusBarang.pangkatGolongan}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export interface SignatoryBukuPengeluaranProps extends BaseSignatoryProps {}

/**
 * 1B. SignatoryBukuPengeluaran (Khusus BUKU-02: Buku Pengeluaran Barang Persediaan)
 *
 * Struktur Penandatangan BUKU-02:
 * - Sebelah Kiri (Mengetahui): Kepala Sekolah (kepalaSekolah)
 * - Sebelah Kanan: Pengurus Barang / Penyalur (pengurusBarang)
 *
 * Aturan Data: DILARANG melakukan hardcode nama atau NIP.
 * Ambil atribut penandatangan langsung dari state/database Pengaturan Pejabat Penandatangan (settings.pejabat).
 */
export const SignatoryBukuPengeluaran: React.FC<SignatoryBukuPengeluaranProps> = ({
  pejabatList = [],
  kopConfig,
  tanggalSurat = new Date().toISOString().split('T')[0],
  className = '',
  settings,
  pejabat,
  pejabatSettings,
  dataDokumen,
  customKepalaSekolah,
  customPengurusBarang
}) => {
  const effectiveList: Pejabat[] = Array.isArray(pejabatSettings?.kepalaSekolah)
    ? (pejabatSettings?.kepalaSekolah as any)
    : Array.isArray(settings?.pejabat)
    ? settings.pejabat
    : Array.isArray(pejabatList) && pejabatList.length > 0
    ? pejabatList
    : [];

  const rawKepsek =
    customKepalaSekolah ||
    pejabat?.kepalaSekolah ||
    pejabatSettings?.kepalaSekolah ||
    (settings?.pejabat && !Array.isArray(settings.pejabat) ? settings.pejabat.kepalaSekolah : undefined);

  const kepalaSekolah: ResolvedOfficial = rawKepsek
    ? {
        id: rawKepsek.id || 'pejabat-kepsek',
        nama: rawKepsek.nama || '(Nama Kepala Sekolah)',
        nip: rawKepsek.nip || '-',
        pangkatGolongan: rawKepsek.pangkatGolongan || (rawKepsek as any)?.pangkat || '-',
        jabatan: rawKepsek.jabatan || 'Kepala Sekolah',
        statusJabatan: rawKepsek.statusJabatan,
        unitKerja: rawKepsek.unitKerja || 'Kuasa Pengguna Barang'
      }
    : resolveKepalaSekolah(effectiveList);

  const rawPengurus =
    customPengurusBarang ||
    pejabat?.pengurusBarang ||
    pejabatSettings?.pengurusBarang ||
    (settings?.pejabat && !Array.isArray(settings.pejabat) ? settings.pejabat.pengurusBarang : undefined);

  const pengurusBarang: ResolvedOfficial = rawPengurus
    ? {
        id: rawPengurus.id || 'pejabat-pengurus-barang',
        nama: rawPengurus.nama || '(Nama Pengurus Barang)',
        nip: rawPengurus.nip || '-',
        pangkatGolongan: rawPengurus.pangkatGolongan || (rawPengurus as any)?.pangkat || '-',
        jabatan: rawPengurus.jabatan || 'Pengurus Barang',
        statusJabatan: rawPengurus.statusJabatan,
        unitKerja: rawPengurus.unitKerja || 'Pengelola Persediaan Barang'
      }
    : resolvePengurusBarang(effectiveList);

  const getJabatanLabel = (p: any, defaultRole: string) => {
    if (!p) return defaultRole;
    const prefix = p.statusJabatan && p.statusJabatan !== 'Definitif'
      ? `${p.statusJabatan}. `
      : '';
    return `${prefix}${p.jabatanKedinasan || p.jabatan || defaultRole}`.trim();
  };

  const kotaDisplay = dataDokumen?.lokasi || (pejabatSettings as any)?.lokasi || kopConfig?.kotaSurat || 'Cihaurbeuti';
  const tanggalDisplay = dataDokumen?.tanggalCetak || formatTanggalIndonesia(tanggalSurat);

  return (
    <div className={`doc-signature-block signature-block avoid-break ${className}`}>
      <div className="grid grid-cols-2 text-center text-xs">
        {/* Sebelah Kiri (Mengetahui): Kepala Sekolah */}
        <div>
          <p className="font-semibold text-slate-700">Mengetahui,</p>
          <p className="font-bold text-slate-900 uppercase tracking-tight">{getJabatanLabel(kepalaSekolah, 'KEPALA SEKOLAH')}</p>
          <p className="text-[8pt] text-slate-600 italic">Kuasa Pengguna Anggaran</p>
          <div className="doc-signature-space h-16 min-h-[64px]" />
          <p className="font-bold underline uppercase text-slate-900 tracking-wide">{kepalaSekolah.nama}</p>
          <p className="font-mono text-[8pt] text-slate-700">NIP. {kepalaSekolah.nip}</p>
          {((kepalaSekolah as any)?.pangkat || (kepalaSekolah.pangkatGolongan && kepalaSekolah.pangkatGolongan !== '-')) && (
            <p className="text-[8pt] text-slate-600">{(kepalaSekolah as any)?.pangkat || kepalaSekolah.pangkatGolongan}</p>
          )}
        </div>

        {/* Sebelah Kanan: Pengurus Barang / Penyalur */}
        <div>
          <p className="text-slate-700">
            {kotaDisplay}, {tanggalDisplay}
          </p>
          <p className="font-bold text-slate-900 uppercase tracking-tight">{getJabatanLabel(pengurusBarang, 'PENGURUS BARANG')}</p>
          <p className="text-[8pt] text-slate-600 italic">Pengurus Barang / Penyalur</p>
          <div className="doc-signature-space h-16 min-h-[64px]" />
          <p className="font-bold underline uppercase text-slate-900 tracking-wide">{pengurusBarang.nama}</p>
          <p className="font-mono text-[8pt] text-slate-700">NIP. {pengurusBarang.nip}</p>
          {((pengurusBarang as any)?.pangkat || (pengurusBarang.pangkatGolongan && pengurusBarang.pangkatGolongan !== '-')) && (
            <p className="text-[8pt] text-slate-600">{(pengurusBarang as any)?.pangkat || pengurusBarang.pangkatGolongan}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export interface SignatoryStockOpnameProps {
  pejabatList?: Pejabat[];
  kopConfig?: KopSuratConfig;
  tanggalSurat?: string;
  className?: string;
  settings?: {
    pejabat?: {
      kepalaSekolah?: Pejabat | ResolvedOfficial;
      wakasekSarpras?: Pejabat | ResolvedOfficial;
      pengurusBarang?: Pejabat | ResolvedOfficial;
    } | Pejabat[];
    namaSekolah?: string;
  };
  pejabatSettings?: {
    kepalaSekolah?: Pejabat | ResolvedOfficial;
    wakasekSarpras?: Pejabat | ResolvedOfficial;
    pengurusBarang?: Pejabat | ResolvedOfficial;
    namaSekolah?: string;
  };
  dataOpname?: {
    lokasi?: string;
    tanggalCetak?: string;
  };
  customKepalaSekolah?: ResolvedOfficial | Pejabat;
  customWakasekSarpras?: ResolvedOfficial | Pejabat;
  customPengurusBarang?: ResolvedOfficial | Pejabat;
}

export interface SignatorySectionProps {
  type?: string;
  pejabatSettings?: {
    kepalaSekolah?: Pejabat | ResolvedOfficial | any;
    pengurusBarang?: Pejabat | ResolvedOfficial | any;
    lokasi?: string;
    [key: string]: any;
  };
  dataDokumen?: {
    lokasi?: string;
    tanggalCetak?: string;
    [key: string]: any;
  };
  pejabatList?: Pejabat[];
  kopConfig?: KopSuratConfig;
  tanggalSurat?: string;
  className?: string;
  settings?: any;
}

/**
 * SignatorySection (Struktur Penandatangan 2 Kolom Baku)
 * - Kolom Kiri: Mengetahui / Menyetujui Kepala Sekolah (Kuasa Pengguna Anggaran)
 * - Kolom Kanan: Pengurus Barang (Penyalur / Pengelola Persediaan)
 * Digunakan untuk BAST-OPNAME serta dokumen persediaan 2 pihak.
 */
export const SignatorySection: React.FC<SignatorySectionProps> = ({
  type,
  pejabatSettings,
  dataDokumen,
  pejabatList = [],
  kopConfig,
  tanggalSurat = new Date().toISOString().split('T')[0],
  className = '',
  settings
}) => {
  const effectiveList: Pejabat[] = Array.isArray(pejabatSettings?.kepalaSekolah)
    ? (pejabatSettings?.kepalaSekolah as any)
    : Array.isArray(settings?.pejabat)
    ? settings.pejabat
    : Array.isArray(pejabatList) && pejabatList.length > 0
    ? pejabatList
    : [];

  const rawKepsek =
    pejabatSettings?.kepalaSekolah ||
    (settings?.pejabat && !Array.isArray(settings.pejabat) ? settings.pejabat.kepalaSekolah : undefined);

  const kepalaSekolah: ResolvedOfficial = rawKepsek
    ? {
        id: rawKepsek.id || 'pejabat-kepsek',
        nama: rawKepsek.nama || '(Nama Kepala Sekolah)',
        nip: rawKepsek.nip || '-',
        pangkatGolongan: rawKepsek.pangkatGolongan || (rawKepsek as any)?.pangkat || '-',
        jabatan: rawKepsek.jabatan || 'Kepala Sekolah',
        statusJabatan: rawKepsek.statusJabatan,
        unitKerja: rawKepsek.unitKerja || 'Kuasa Pengguna Anggaran'
      }
    : resolveKepalaSekolah(effectiveList);

  const rawPengurus =
    pejabatSettings?.pengurusBarang ||
    (settings?.pejabat && !Array.isArray(settings.pejabat) ? settings.pejabat.pengurusBarang : undefined);

  const pengurusBarang: ResolvedOfficial = rawPengurus
    ? {
        id: rawPengurus.id || 'pejabat-pengurus-barang',
        nama: rawPengurus.nama || '(Nama Pengurus Barang)',
        nip: rawPengurus.nip || '-',
        pangkatGolongan: rawPengurus.pangkatGolongan || (rawPengurus as any)?.pangkat || '-',
        jabatan: rawPengurus.jabatan || 'Pengurus Barang',
        statusJabatan: rawPengurus.statusJabatan,
        unitKerja: rawPengurus.unitKerja || 'Penyalur Persediaan'
      }
    : resolvePengurusBarang(effectiveList);

  // Helper Format Status Plt / Plh / Definitif
  const getJabatanLabel = (pejabat: any, defaultRole: string) => {
    if (!pejabat) return defaultRole;
    const prefix = pejabat.statusJabatan && pejabat.statusJabatan !== 'Definitif'
      ? `${pejabat.statusJabatan}. `
      : '';
    return `${prefix}${pejabat.jabatanKedinasan || defaultRole}`;
  };

  const lokasiDisplay = dataDokumen?.lokasi || (pejabatSettings as any)?.lokasi || kopConfig?.kotaSurat || 'Ciamis';
  const tanggalCetakDisplay = dataDokumen?.tanggalCetak || formatTanggalIndonesia(tanggalSurat);

  return (
    <div className={`grid grid-cols-2 text-center text-xs gap-4 mt-8 break-inside-avoid doc-signature-block avoid-break signature-area ${className}`}>
      {/* Kolom Kiri: Mengetahui Kepala Sekolah */}
      <div>
        <p className="font-bold uppercase text-slate-900">MENGETAHUI / MENYETUJUI,</p>
        <p className="font-bold uppercase text-slate-900">{getJabatanLabel(kepalaSekolah, 'KEPALA SEKOLAH')}</p>
        <p className="italic text-[8pt] text-slate-600">(Kuasa Pengguna Anggaran)</p>
        <div className="h-16 min-h-[64px]" />
        <p className="font-bold underline uppercase text-slate-900 tracking-wide">{kepalaSekolah?.nama || '(Nama Kepala Sekolah)'}</p>
        <p className="font-mono text-[8pt] text-slate-700">NIP. {kepalaSekolah?.nip || '-'}</p>
        {((kepalaSekolah as any)?.pangkat || (kepalaSekolah.pangkatGolongan && kepalaSekolah.pangkatGolongan !== '-')) && (
          <p className="text-[8pt] text-slate-600">{(kepalaSekolah as any)?.pangkat || kepalaSekolah.pangkatGolongan}</p>
        )}
      </div>

      {/* Kolom Kanan: Pengurus Barang */}
      <div>
        <p className="text-slate-800 mb-0.5">{lokasiDisplay}, {tanggalCetakDisplay}</p>
        <p className="font-bold uppercase text-slate-900">{getJabatanLabel(pengurusBarang, 'PENGURUS BARANG')}</p>
        <p className="italic text-[8pt] text-slate-600">(Penyalur / Pengelola Persediaan)</p>
        <div className="h-16 min-h-[64px]" />
        <p className="font-bold underline uppercase text-slate-900 tracking-wide">{pengurusBarang?.nama || '(Nama Pengurus Barang)'}</p>
        <p className="font-mono text-[8pt] text-slate-700">NIP. {pengurusBarang?.nip || '-'}</p>
        {((pengurusBarang as any)?.pangkat || (pengurusBarang.pangkatGolongan && pengurusBarang.pangkatGolongan !== '-')) && (
          <p className="text-[8pt] text-slate-600">{(pengurusBarang as any)?.pangkat || pengurusBarang.pangkatGolongan}</p>
        )}
      </div>
    </div>
  );
};

/**
 * 2. SignatoryStockOpname
 * Digunakan untuk:
 * - BAST-OPNAME (BAST Hasil Pemeriksaan Fisik Persediaan / Stock Opname)
 * Ukuran: A4 | Orientasi: Portrait (P)
 * Tanda Tangan (2 Kolom Utama):
 * - Kolom Kiri: Mengetahui / Menyetujui Kepala Sekolah (Kuasa Pengguna Anggaran)
 * - Kolom Kanan: Pengurus Barang (Penyalur / Pengelola Persediaan)
 * (Perhatian: Posisi Wakasek Sarpras & Petugas Sarpras dihapus/digantikan oleh Pengurus Barang)
 */
export const SignatoryStockOpname: React.FC<SignatoryStockOpnameProps> = (props) => {
  return (
    <SignatorySection
      type="BAST-OPNAME"
      pejabatSettings={{
        kepalaSekolah: props.customKepalaSekolah || props.pejabatSettings?.kepalaSekolah || (props.settings?.pejabat && !Array.isArray(props.settings.pejabat) ? props.settings.pejabat.kepalaSekolah : undefined),
        pengurusBarang: props.customPengurusBarang || props.pejabatSettings?.pengurusBarang || (props.settings?.pejabat && !Array.isArray(props.settings.pejabat) ? props.settings.pejabat.pengurusBarang : undefined),
        lokasi: (props.pejabatSettings as any)?.lokasi || props.dataOpname?.lokasi
      }}
      dataDokumen={{
        lokasi: (props.pejabatSettings as any)?.lokasi || props.dataOpname?.lokasi,
        tanggalCetak: props.dataOpname?.tanggalCetak
      }}
      pejabatList={props.pejabatList}
      kopConfig={props.kopConfig}
      tanggalSurat={props.tanggalSurat}
      className={props.className}
      settings={props.settings}
    />
  );
};

/**
 * 3. SignatoryKartuBarang
 * Digunakan untuk:
 * - LAMPIRAN-12 (Kartu Barang)
 * - LAMPIRAN-13 (Kartu Persediaan Barang)
 * Ukuran: A4 | Orientasi: Landscape (L)
 * Tanda Tangan: Pengurus Barang Persediaan
 */
export const SignatoryKartuBarang: React.FC<BaseSignatoryProps & {
  pejabatSettings?: any;
  dataDokumen?: any;
}> = ({
  pejabatList = [],
  kopConfig,
  tanggalSurat = new Date().toISOString().split('T')[0],
  className = '',
  settings,
  pejabat,
  pejabatSettings,
  dataDokumen,
  customPengurusBarang
}) => {
  const effectiveList: Pejabat[] = Array.isArray(pejabatSettings?.pengurusBarang)
    ? (pejabatSettings?.pengurusBarang as any)
    : Array.isArray(settings?.pejabat)
    ? settings.pejabat
    : Array.isArray(pejabatList) && pejabatList.length > 0
    ? pejabatList
    : [];

  const rawPengurus =
    customPengurusBarang ||
    pejabat?.pengurusBarang ||
    pejabatSettings?.pengurusBarang ||
    (settings?.pejabat && !Array.isArray(settings.pejabat) ? settings.pejabat.pengurusBarang : undefined);

  const pengurusBarang: ResolvedOfficial = rawPengurus
    ? {
        id: rawPengurus.id || 'pejabat-pengurus-barang',
        nama: rawPengurus.nama || '(Nama Pengurus Barang)',
        nip: rawPengurus.nip || '-',
        pangkatGolongan: rawPengurus.pangkatGolongan || (rawPengurus as any)?.pangkat || '-',
        jabatan: rawPengurus.jabatan || 'Pengurus Barang Persediaan',
        statusJabatan: rawPengurus.statusJabatan,
        unitKerja: rawPengurus.unitKerja || 'Pengelola Persediaan Barang'
      }
    : resolvePengurusBarang(effectiveList);

  const getJabatanLabel = (p: any, defaultRole: string) => {
    if (!p) return defaultRole;
    const prefix = p.statusJabatan && p.statusJabatan !== 'Definitif'
      ? `${p.statusJabatan}. `
      : '';
    return `${prefix}${p.jabatanKedinasan || p.jabatan || defaultRole}`.trim();
  };

  const kotaDisplay = dataDokumen?.lokasi || (pejabatSettings as any)?.lokasi || kopConfig?.kotaSurat || 'Cihaurbeuti';
  const tanggalDisplay = dataDokumen?.tanggalCetak || formatTanggalIndonesia(tanggalSurat);

  return (
    <div className={`doc-signature-block signature-block avoid-break ${className}`}>
      <div className="flex justify-end text-xs">
        <div className="w-80 text-center">
          <p className="text-slate-700">
            {kotaDisplay}, {tanggalDisplay}
          </p>
          <p className="font-bold text-slate-900 uppercase mt-0.5">{getJabatanLabel(pengurusBarang, 'PENGURUS BARANG PERSEDIAAN')}</p>
          <p className="text-[8pt] text-slate-600 italic">Pengurus Barang Persediaan</p>
          <div className="doc-signature-space h-16 min-h-[64px]" />
          <p className="font-bold underline uppercase text-slate-900 tracking-wide">{pengurusBarang.nama}</p>
          <p className="font-mono text-[8pt] text-slate-700">NIP. {pengurusBarang.nip}</p>
          {((pengurusBarang as any)?.pangkat || (pengurusBarang.pangkatGolongan && pengurusBarang.pangkatGolongan !== '-')) && (
            <p className="text-[8pt] text-slate-600">{(pengurusBarang as any)?.pangkat || pengurusBarang.pangkatGolongan}</p>
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
