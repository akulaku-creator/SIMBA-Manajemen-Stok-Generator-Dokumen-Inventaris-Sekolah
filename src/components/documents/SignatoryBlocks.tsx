import React from 'react';
import { KopSuratConfig, Pejabat, StatusJabatan } from '../../types';
import { formatTanggalIndonesia } from '../../utils/numberGenerator';
import { 
  formatJabatanWithStatus, 
  ResolvedOfficial, 
  resolveBendaharaBOS, 
  resolveKepalaSekolah, 
  resolvePengurusBarang
} from '../../utils/pejabatResolver';
import { resolveStampUrlForRole } from '../../utils/signatureAssetHelper';
import { sanitizeImageUrl } from '../../utils/urlSanitizer';

export interface SignatureBlockWithImageProps {
  pejabatInfo: {
    jabatan?: string;
    nama?: string;
    nip?: string;
    pangkat?: string;
    pangkatGolongan?: string;
    statusJabatan?: StatusJabatan;
    tandaTanganUrl?: string;
  };
  signatureImgUrl?: string;
  stampImgUrl?: string;
  topLine?: string;
  secondaryTopLine?: string;
  subJabatan?: string;
  reserveTopLineSpace?: boolean;
  showPangkat?: boolean;
  isCompact?: boolean;
  className?: string;
  nameClassName?: string;
  jabatanClassName?: string;
}

/**
 * RenderSignatureBlockWithImage
 * Komponen cetak blok tanda tangan yang menyisipkan gambar PNG tanda tangan transparan
 * dan stempel instansi resmi tepat di atas nama terang pejabat penandatangan.
 */
export const RenderSignatureBlockWithImage: React.FC<SignatureBlockWithImageProps> = ({
  pejabatInfo,
  signatureImgUrl,
  stampImgUrl,
  topLine,
  secondaryTopLine,
  subJabatan,
  reserveTopLineSpace = false,
  showPangkat = false,
  isCompact = false,
  className = '',
  nameClassName = '',
  jabatanClassName = ''
}) => {
  const effectiveSignatureUrl = sanitizeImageUrl(signatureImgUrl || pejabatInfo?.tandaTanganUrl);
  const effectiveStampUrl = sanitizeImageUrl(stampImgUrl);
  const pangkatText = pejabatInfo?.pangkat || pejabatInfo?.pangkatGolongan;
  const formattedStatusPrefix =
    pejabatInfo?.statusJabatan &&
    pejabatInfo.statusJabatan !== 'Definitif' &&
    !(pejabatInfo.jabatan || '').toLowerCase().startsWith(pejabatInfo.statusJabatan.toLowerCase())
      ? `${pejabatInfo.statusJabatan.endsWith('.') ? pejabatInfo.statusJabatan : `${pejabatInfo.statusJabatan}.`} `
      : '';

  return (
    <div className={`relative text-center text-xs break-inside-avoid avoid-break ${className}`}>
      {topLine ? (
        <p className="text-slate-800 mb-0.5 leading-tight">{topLine}</p>
      ) : reserveTopLineSpace ? (
        <p className="text-transparent select-none mb-0.5 leading-tight" aria-hidden="true">&nbsp;</p>
      ) : null}

      {secondaryTopLine && (
        <p className="font-semibold uppercase text-slate-900 leading-tight">{secondaryTopLine}</p>
      )}

      <p className={`font-bold uppercase text-slate-900 leading-tight ${jabatanClassName}`}>
        {formattedStatusPrefix}
        {pejabatInfo?.jabatan || 'PEJABAT'}
      </p>

      {subJabatan && (
        <p className="italic text-[8pt] text-slate-600 leading-tight">{subJabatan}</p>
      )}

      {/* Area Tanda Tangan & Stempel (Tanda tangan sedikit menumpuk/overlap transparan dengan stempel) */}
      <div
        className={`relative flex justify-center items-center overflow-visible ${
          isCompact ? 'h-14 min-h-[52px] my-0.5' : 'h-20 min-h-[72px] my-1'
        }`}
      >
        {/* Stempel Instansi (jika ada) */}
        {effectiveStampUrl && (
          <img
            src={effectiveStampUrl}
            alt="Stempel Sekolah"
            className={`absolute object-contain opacity-85 pointer-events-none select-none mix-blend-multiply print:opacity-85 ${
              isCompact
                ? 'w-14 h-14 -translate-x-4'
                : 'w-20 h-20 -translate-x-5'
            }`}
          />
        )}

        {/* Gambar Tanda Tangan PNG Transparan (jika ada) */}
        {effectiveSignatureUrl && (
          <img
            src={effectiveSignatureUrl}
            alt={`Tanda Tangan ${pejabatInfo?.nama || ''}`}
            className={`absolute object-contain pointer-events-none select-none z-10 mix-blend-multiply ${
              isCompact ? 'h-12 max-w-[140px]' : 'h-16 max-w-[170px]'
            }`}
          />
        )}
      </div>

      {/* Nama Terang, NIP & Pangkat (Selalu berada di z-20 di bawah area gambar agar tidak tertutup) */}
      <p className={`font-bold underline uppercase text-slate-900 tracking-wide relative z-20 leading-tight ${nameClassName}`}>
        {pejabatInfo?.nama || '-'}
      </p>
      <p className="font-mono text-[8pt] text-slate-700 relative z-20 leading-tight mt-0.5">
        NIP. {pejabatInfo?.nip && pejabatInfo.nip !== '-' ? pejabatInfo.nip : '-'}
      </p>
      {showPangkat && pangkatText && pangkatText !== '-' && (
        <p className="text-[8pt] text-slate-600 relative z-20 leading-tight">
          Pangkat/Gol: {pangkatText}
        </p>
      )}
    </div>
  );
};

/**
 * Force mapping pejabat: Pastikan tidak ada fallback ke Wakasek
 * Objek penandatangan HANYA mengambil data dari:
 * - pejabatSettings.pengurusBarang (untuk Pengurus Barang / Penyalur)
 * - pejabatSettings.kepalaSekolah (untuk Kepala Sekolah / KPA)
 */
export const getSignatoryData = (pejabatSettings: any) => {
  const kepalaSekolah = pejabatSettings?.kepalaSekolah || {};
  // Paksa ambil pengurus barang, jika kosong fallback ke objek pengurusBarang / pengelolaPersediaan
  const pengurusBarang = pejabatSettings?.pengurusBarang || pejabatSettings?.pengelolaPersediaan || {};
  return { kepalaSekolah, pengurusBarang };
};

/**
 * RenderSignatureBlock (Komponen Penandatangan Dinamis Baku 2 Kolom)
 * - Kiri: Mengetahui / Menyetujui Kepala Sekolah (Kuasa Pengguna Anggaran)
 * - Kanan: Pengurus Barang (Penyalur / Pengelola Persediaan)
 */
export const RenderSignatureBlock: React.FC<{
  pejabatSettings?: any;
  kopConfig?: KopSuratConfig;
  tanggalCetak?: string;
  lokasi?: string;
  className?: string;
}> = ({ pejabatSettings, kopConfig, tanggalCetak, lokasi = 'Ciamis', className = '' }) => {
  const { kepalaSekolah, pengurusBarang } = getSignatoryData(pejabatSettings);
  const effectiveKop: KopSuratConfig | undefined = kopConfig || (pejabatSettings?.stempelUrl ? {
    ...({} as KopSuratConfig),
    stempelUrl: pejabatSettings.stempelUrl,
    tampilkanStempel: pejabatSettings.tampilkanStempel,
    stempelMode: pejabatSettings.stempelMode
  } : undefined);

  const kepsekStampUrl = resolveStampUrlForRole(effectiveKop, 'kepala_sekolah');
  const pengurusStampUrl = resolveStampUrlForRole(effectiveKop, 'pengurus_barang');

  return (
    <div className={`grid grid-cols-2 text-center text-xs gap-4 mt-8 break-inside-avoid doc-signature-block avoid-break signature-area ${className}`}>
      {/* KIRI: KEPALA SEKOLAH */}
      <RenderSignatureBlockWithImage
        topLine="MENGETAHUI / MENYETUJUI,"
        pejabatInfo={{
          jabatan: kepalaSekolah?.jabatanKedinasan || kepalaSekolah?.jabatan || 'KEPALA SEKOLAH',
          statusJabatan: kepalaSekolah?.statusJabatan,
          nama: kepalaSekolah?.nama || '(Nama Kepala Sekolah)',
          nip: kepalaSekolah?.nip || '-',
          pangkatGolongan: kepalaSekolah?.pangkatGolongan || kepalaSekolah?.pangkat
        }}
        subJabatan="(Kuasa Pengguna Anggaran)"
        signatureImgUrl={kepalaSekolah?.tandaTanganUrl}
        stampImgUrl={kepsekStampUrl}
      />

      {/* KANAN: PENGURUS BARANG (TIDAK BOLEH WAKASEK) */}
      <RenderSignatureBlockWithImage
        topLine={`${lokasi}, ${tanggalCetak || new Date().toLocaleDateString('id-ID')}`}
        pejabatInfo={{
          jabatan: pengurusBarang?.jabatanKedinasan || pengurusBarang?.jabatan || 'PENGURUS BARANG',
          statusJabatan: pengurusBarang?.statusJabatan,
          nama: pengurusBarang?.nama || '(Nama Pengurus Barang)',
          nip: pengurusBarang?.nip || '-',
          pangkatGolongan: pengurusBarang?.pangkatGolongan || pengurusBarang?.pangkat
        }}
        subJabatan="(Penyalur / Pengelola Persediaan)"
        signatureImgUrl={pengurusBarang?.tandaTanganUrl}
        stampImgUrl={pengurusStampUrl}
      />
    </div>
  );
};

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

  const rawPengurus =
    customPengurusBarang ||
    pejabat?.pengurusBarang ||
    pejabatSettings?.pengurusBarang ||
    pejabatSettings?.pengelolaPersediaan ||
    (settings?.pejabat && !Array.isArray(settings.pejabat) ? settings.pejabat.pengurusBarang : undefined);

  const resolvedKepsek = rawKepsek || resolveKepalaSekolah(effectiveList);
  const resolvedPengurus = rawPengurus || resolvePengurusBarang(effectiveList);

  const lokasiDisplay = dataDokumen?.lokasi || (pejabatSettings as any)?.lokasi || kopConfig?.kotaSurat || 'Ciamis';
  const tanggalDisplay = dataDokumen?.tanggalCetak || formatTanggalIndonesia(tanggalSurat);

  return (
    <RenderSignatureBlock
      pejabatSettings={{
        kepalaSekolah: resolvedKepsek,
        pengurusBarang: resolvedPengurus
      }}
      kopConfig={kopConfig}
      lokasi={lokasiDisplay}
      tanggalCetak={tanggalDisplay}
      className={className}
    />
  );
};

export interface SignatoryBukuPengeluaranProps extends BaseSignatoryProps {}

/**
 * 1B. SignatoryBukuPengeluaran (Khusus BUKU-02: Buku Pengeluaran Barang Persediaan)
 * Struktur Penandatangan BUKU-02:
 * - Sebelah Kiri (Mengetahui): Kepala Sekolah (kepalaSekolah)
 * - Sebelah Kanan: Pengurus Barang / Penyalur (pengurusBarang)
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

  const rawPengurus =
    customPengurusBarang ||
    pejabat?.pengurusBarang ||
    pejabatSettings?.pengurusBarang ||
    pejabatSettings?.pengelolaPersediaan ||
    (settings?.pejabat && !Array.isArray(settings.pejabat) ? settings.pejabat.pengurusBarang : undefined);

  const resolvedKepsek = rawKepsek || resolveKepalaSekolah(effectiveList);
  const resolvedPengurus = rawPengurus || resolvePengurusBarang(effectiveList);

  const lokasiDisplay = dataDokumen?.lokasi || (pejabatSettings as any)?.lokasi || kopConfig?.kotaSurat || 'Ciamis';
  const tanggalDisplay = dataDokumen?.tanggalCetak || formatTanggalIndonesia(tanggalSurat);

  return (
    <RenderSignatureBlock
      pejabatSettings={{
        kepalaSekolah: resolvedKepsek,
        pengurusBarang: resolvedPengurus
      }}
      kopConfig={kopConfig}
      lokasi={lokasiDisplay}
      tanggalCetak={tanggalDisplay}
      className={className}
    />
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
      pengurusBarang?: Pejabat | ResolvedOfficial;
    } | Pejabat[];
    namaSekolah?: string;
  };
  pejabatSettings?: {
    kepalaSekolah?: Pejabat | ResolvedOfficial;
    pengurusBarang?: Pejabat | ResolvedOfficial;
    namaSekolah?: string;
  };
  dataOpname?: {
    lokasi?: string;
    tanggalCetak?: string;
  };
  customKepalaSekolah?: ResolvedOfficial | Pejabat;
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

  const rawPengurus =
    pejabatSettings?.pengurusBarang ||
    pejabatSettings?.pengelolaPersediaan ||
    (settings?.pejabat && !Array.isArray(settings.pejabat) ? settings.pejabat.pengurusBarang : undefined);

  const resolvedKepsek = rawKepsek || resolveKepalaSekolah(effectiveList);
  const resolvedPengurus = rawPengurus || resolvePengurusBarang(effectiveList);

  const lokasiDisplay = dataDokumen?.lokasi || (pejabatSettings as any)?.lokasi || kopConfig?.kotaSurat || 'Ciamis';
  const tanggalCetakDisplay = dataDokumen?.tanggalCetak || formatTanggalIndonesia(tanggalSurat);

  return (
    <RenderSignatureBlock
      pejabatSettings={{
        kepalaSekolah: resolvedKepsek,
        pengurusBarang: resolvedPengurus
      }}
      kopConfig={kopConfig}
      lokasi={lokasiDisplay}
      tanggalCetak={tanggalCetakDisplay}
      className={className}
    />
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
 */
export const SignatoryStockOpname: React.FC<SignatoryStockOpnameProps> = (props) => {
  const effectiveList: Pejabat[] = Array.isArray(props.pejabatSettings?.kepalaSekolah)
    ? (props.pejabatSettings?.kepalaSekolah as any)
    : Array.isArray(props.settings?.pejabat)
    ? props.settings.pejabat
    : Array.isArray(props.pejabatList) && props.pejabatList.length > 0
    ? props.pejabatList
    : [];

  const rawKepsek =
    props.customKepalaSekolah ||
    props.pejabatSettings?.kepalaSekolah ||
    (props.settings?.pejabat && !Array.isArray(props.settings.pejabat) ? props.settings.pejabat.kepalaSekolah : undefined);

  const rawPengurus =
    props.customPengurusBarang ||
    props.pejabatSettings?.pengurusBarang ||
    (props.pejabatSettings as any)?.pengelolaPersediaan ||
    (props.settings?.pejabat && !Array.isArray(props.settings.pejabat) ? props.settings.pejabat.pengurusBarang : undefined);

  const resolvedKepsek = rawKepsek || resolveKepalaSekolah(effectiveList);
  const resolvedPengurus = rawPengurus || resolvePengurusBarang(effectiveList);

  const lokasiDisplay = (props.pejabatSettings as any)?.lokasi || props.dataOpname?.lokasi || props.kopConfig?.kotaSurat || 'Ciamis';
  const tanggalDisplay = props.dataOpname?.tanggalCetak || formatTanggalIndonesia(props.tanggalSurat || new Date().toISOString().split('T')[0]);

  return (
    <RenderSignatureBlock
      pejabatSettings={{
        kepalaSekolah: resolvedKepsek,
        pengurusBarang: resolvedPengurus
      }}
      kopConfig={props.kopConfig}
      lokasi={lokasiDisplay}
      tanggalCetak={tanggalDisplay}
      className={props.className}
    />
  );
};

/**
 * 3. SignatoryKartuBarang
 * Digunakan untuk:
 * - LAMPIRAN-12 (Kartu Barang)
 * - LAMPIRAN-13 (Kartu Persediaan Barang)
 * Ukuran: A4 | Orientasi: Landscape (L)
 * Tanda Tangan: Pengurus Barang Persediaan (TIDAK BOLEH WAKASEK)
 */
export const SignatoryKartuBarang: React.FC<BaseSignatoryProps & {
  pejabatSettings?: any;
  dataDokumen?: any;
  lokasi?: string;
  tanggalCetak?: string;
  isCompact?: boolean;
}> = ({
  pejabatList = [],
  kopConfig,
  tanggalSurat = new Date().toISOString().split('T')[0],
  className = '',
  settings,
  pejabat,
  pejabatSettings,
  dataDokumen,
  customPengurusBarang,
  lokasi,
  tanggalCetak,
  isCompact = false
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
    pejabatSettings?.pengelolaPersediaan ||
    (settings?.pejabat && !Array.isArray(settings.pejabat) ? settings.pejabat.pengurusBarang : undefined);

  const pengurusBarang: ResolvedOfficial = rawPengurus
    ? {
        id: rawPengurus.id || 'pejabat-pengurus-barang',
        nama: rawPengurus.nama || '(Nama Pengurus Barang)',
        nip: rawPengurus.nip || '-',
        pangkatGolongan: rawPengurus.pangkatGolongan || (rawPengurus as any)?.pangkat || '-',
        jabatan: rawPengurus.jabatanKedinasan || rawPengurus.jabatan || 'Pengurus Barang',
        statusJabatan: rawPengurus.statusJabatan,
        unitKerja: rawPengurus.unitKerja || 'Pengelola Persediaan Barang',
        tandaTanganUrl: rawPengurus.tandaTanganUrl
      }
    : resolvePengurusBarang(effectiveList);

  const kotaDisplay = lokasi || dataDokumen?.lokasi || (pejabatSettings as any)?.lokasi || kopConfig?.kotaSurat || 'Ciamis';
  const tanggalDisplay = tanggalCetak || dataDokumen?.tanggalCetak || formatTanggalIndonesia(tanggalSurat);
  const stampUrl = resolveStampUrlForRole(kopConfig, 'pengurus_barang', true);

  return (
    <div className={`signature-block doc-signature-block avoid-break break-inside-avoid ${isCompact ? 'compact-mode mt-2 pt-1' : 'mt-4 pt-2'} ${className}`}>
      <div className="flex justify-end text-center text-[10px]">
        <div className="w-64 sm:w-72">
          <RenderSignatureBlockWithImage
            topLine={`${kotaDisplay}, ${tanggalDisplay}`}
            pejabatInfo={{
              jabatan: (pengurusBarang as any)?.jabatanKedinasan || pengurusBarang?.jabatan || 'PENGURUS BARANG',
              statusJabatan: pengurusBarang?.statusJabatan,
              nama: pengurusBarang?.nama || '(Nama Pengurus Barang)',
              nip: pengurusBarang?.nip || '-'
            }}
            subJabatan="(Penyalur / Pengelola Persediaan)"
            signatureImgUrl={pengurusBarang?.tandaTanganUrl}
            stampImgUrl={stampUrl}
            isCompact={isCompact}
            jabatanClassName="text-[10px]"
            nameClassName="text-[10px]"
          />
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
  pejabatList = [],
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
    namaSekolah: kopConfig?.namaSekolah,
    includeSchoolName: true
  });

  const formattedBendaharaJabatan = formatJabatanWithStatus(bendaharaBos, {
    defaultTitle: 'Bendahara BOS / APBD'
  });

  const formattedPengurusJabatan = formatJabatanWithStatus(pengurusBarang, {
    defaultTitle: 'Pengurus Barang Persediaan'
  });

  const kepsekStampUrl = resolveStampUrlForRole(kopConfig, 'kepala_sekolah');
  const bendaharaStampUrl = resolveStampUrlForRole(kopConfig, 'bendahara_bos');
  const pengurusStampUrl = resolveStampUrlForRole(kopConfig, 'pengurus_barang');

  return (
    <div className={`doc-signature-block signature-block avoid-break mt-6 pt-4 border-t border-slate-200 ${className}`}>
      <div className="grid grid-cols-3 text-center text-xs text-slate-800 gap-4">
        {/* Kolom 1: Mengetahui/Menyetujui Kepala Satuan Pendidikan */}
        <RenderSignatureBlockWithImage
          topLine="Mengetahui/Menyetujui,"
          pejabatInfo={{
            jabatan: formattedKepsekJabatan,
            nama: kepalaSekolah?.nama || '(Nama Kepala Sekolah)',
            nip: kepalaSekolah?.nip || '-',
            pangkatGolongan: kepalaSekolah?.pangkatGolongan
          }}
          subJabatan="Kuasa Pengguna Barang"
          signatureImgUrl={kepalaSekolah?.tandaTanganUrl}
          stampImgUrl={kepsekStampUrl}
          showPangkat={true}
        />

        {/* Kolom 2: Bendahara BOS */}
        <RenderSignatureBlockWithImage
          reserveTopLineSpace={true}
          pejabatInfo={{
            jabatan: formattedBendaharaJabatan,
            nama: bendaharaBos?.nama || '(Nama Bendahara BOS)',
            nip: bendaharaBos?.nip || '-',
            pangkatGolongan: bendaharaBos?.pangkatGolongan
          }}
          subJabatan="Pengelola Keuangan Sekolah"
          signatureImgUrl={bendaharaBos?.tandaTanganUrl}
          stampImgUrl={bendaharaStampUrl}
          showPangkat={true}
        />

        {/* Kolom 3: Pengurus Barang */}
        <RenderSignatureBlockWithImage
          topLine={`${kopConfig?.kotaSurat || 'Cihaurbeuti'}, ${formatTanggalIndonesia(tanggalSurat)}`}
          pejabatInfo={{
            jabatan: formattedPengurusJabatan,
            nama: pengurusBarang?.nama || '(Nama Pengurus Barang)',
            nip: pengurusBarang?.nip || '-',
            pangkatGolongan: pengurusBarang?.pangkatGolongan
          }}
          subJabatan="Pengurus / Penyimpan Barang Persediaan"
          signatureImgUrl={pengurusBarang?.tandaTanganUrl}
          stampImgUrl={pengurusStampUrl}
          showPangkat={true}
        />
      </div>
    </div>
  );
};
