import { Pejabat, StatusJabatan, TransaksiPengeluaran } from '../types';

export interface ResolvedOfficial {
  id?: string;
  nama: string;
  nip: string;
  pangkatGolongan: string;
  jabatan: string;
  jabatanKedinasan?: string;
  statusJabatan?: StatusJabatan;
  unitKerja?: string;
  isNonAsn?: boolean;
}

/**
 * Normalizes NIP string: checks whether it has a valid NIP format or is non-ASN/strip.
 */
export function formatNipDisplay(nip?: string): string {
  if (!nip || nip.trim() === '' || nip.trim() === '-' || nip.trim().toLowerCase() === 'non asn' || nip.trim().toLowerCase() === 'non-asn') {
    return '-';
  }
  return nip.trim();
}

/**
 * Format official title for print/document signatory:
 * Dynamically handles Plt. / Plh. prefixes according to official civil service conventions.
 * Example:
 * - If status is 'Plt.' and title is 'Kepala Sekolah', returns 'Plt. Kepala SMAN 1 CIHAURBEUTI' (or 'Plt. Kepala Sekolah')
 * - If status is 'Plh.' and title is 'Kepala Sekolah', returns 'Plh. Kepala SMAN 1 CIHAURBEUTI' (or 'Plh. Kepala Sekolah')
 * - If title already includes Plt. or Plh., avoids duplicate prefixing.
 */
export function formatJabatanWithStatus(
  pejabat: { jabatan?: string; statusJabatan?: StatusJabatan; nama?: string } | undefined,
  context?: { defaultTitle?: string; namaSekolah?: string; includeSchoolName?: boolean }
): string {
  if (!pejabat) {
    return context?.defaultTitle || 'Pejabat';
  }

  const baseTitle = (pejabat.jabatan || context?.defaultTitle || '').trim();
  const status = pejabat.statusJabatan?.trim() as StatusJabatan | undefined;
  const isPlt = status === 'Plt.' || baseTitle.toLowerCase().startsWith('plt.');
  const isPlh = status === 'Plh.' || baseTitle.toLowerCase().startsWith('plh.');

  // Clean title from existing Plt./Plh. prefix
  let cleanTitle = baseTitle;
  if (cleanTitle.toLowerCase().startsWith('plt.')) {
    cleanTitle = cleanTitle.substring(4).trim();
  } else if (cleanTitle.toLowerCase().startsWith('plh.')) {
    cleanTitle = cleanTitle.substring(4).trim();
  }

  // If school name should be appended for Kepala Sekolah (e.g. Plt. Kepala SMAN 1 Cihaurbeuti)
  if (context?.includeSchoolName && context.namaSekolah) {
    if (cleanTitle.toLowerCase().includes('kepala sekolah') || cleanTitle.toLowerCase() === 'kepala') {
      cleanTitle = `Kepala ${context.namaSekolah}`;
    }
  }

  if (isPlt) {
    return `Plt. ${cleanTitle}`;
  }
  if (isPlh) {
    return `Plh. ${cleanTitle}`;
  }
  return cleanTitle || baseTitle;
}

/**
 * Universal dynamic signatory extractor adhering to official civil service requirements.
 * Accepts either pejabatSettings object or raw pejabatList array.
 * Extracts accurate nama bergelar, NIP, pangkat/golongan, and status kedinasan.
 */
export function getSignatoryInfo(
  pejabatSettingsOrList: any,
  roleType: 'kepalaSekolah' | 'pengurusBarang' | 'pemohon' | 'sarpras' | 'bendahara'
): { nama: string; nip: string; jabatan: string; pangkat: string; statusJabatan?: StatusJabatan } {
  let settings: any = pejabatSettingsOrList;
  
  if (Array.isArray(pejabatSettingsOrList)) {
    const list: Pejabat[] = pejabatSettingsOrList;
    const kepsek = resolveKepalaSekolah(list);
    const pengurus = resolvePengurusBarang(list);
    settings = {
      kepalaSekolah: kepsek,
      pengurusBarang: pengurus
    };
  }

  const defaultJabatan =
    roleType === 'pengurusBarang'
      ? 'PENGURUS BARANG PEMBANTU'
      : roleType === 'kepalaSekolah'
      ? 'KEPALA SEKOLAH'
      : 'PEJABAT';

  if (!settings || !settings[roleType]) {
    return { 
      nama: roleType === 'pengurusBarang' ? 'Yati Cahyani, S.AP.' : 'Dra. Hj. Imas Rohayati, M.Pd.', 
      nip: roleType === 'pengurusBarang' ? '19870512 201101 2 007' : '19690321 199412 2 001', 
      jabatan: defaultJabatan, 
      pangkat: roleType === 'pengurusBarang' ? 'Penata / III c' : 'Pembina Utama Muda / IV c' 
    };
  }

  const p = settings[roleType];
  const pangkat = p.pangkat || p.pangkatGolongan || '';
  const jabatan = p.jabatanKedinasan || p.jabatan || defaultJabatan;
  const nip = p.nip && p.nip !== '-' ? p.nip : '-';

  return {
    nama: p.nama || (roleType === 'pengurusBarang' ? 'Yati Cahyani, S.AP.' : 'Kepala Sekolah'),
    nip,
    jabatan,
    pangkat,
    statusJabatan: p.statusJabatan
  };
}

/**
 * Dynamically resolves Kepala Sekolah from active pejabatList with priority:
 * 1. Matching role === 'kepala_sekolah'
 * 2. Matching id === 'pejabat-kepsek'
 * 3. Matching jabatan keyword 'kepala sekolah' / 'kuasa pengguna'
 * 4. Fallback to first officer or default
 */
export function resolveKepalaSekolah(pejabatList: Pejabat[], specificId?: string): ResolvedOfficial {
  const list = pejabatList || [];

  const kepsekOfficial = 
    list.find(p => p.role === 'kepala_sekolah') ||
    list.find(p => p.id === 'pejabat-kepsek' || p.id?.includes('kepsek')) ||
    list.find(p => p.jabatan && (
      p.jabatan.toLowerCase().includes('kepala sekolah') ||
      p.jabatan.toLowerCase().includes('kuasa pengguna')
    ));

  const specificOfficial = specificId ? list.find(p => p.id === specificId) : undefined;
  const isInvalidSpecific = specificOfficial && (
    specificOfficial.id === 'pejabat-sarpras' ||
    specificOfficial.id === 'pejabat-pengurus-barang' ||
    (specificOfficial.jabatan && (
      specificOfficial.jabatan.toLowerCase().includes('pengurus barang') ||
      specificOfficial.jabatan.toLowerCase().includes('sarpras') ||
      specificOfficial.jabatan.toLowerCase().includes('sarana')
    ))
  );

  const found = (!isInvalidSpecific && specificOfficial) ? specificOfficial : (kepsekOfficial || list[0]);

  return {
    id: found?.id || 'pejabat-kepsek',
    nama: found?.nama || 'Dra. Hj. Imas Rohayati, M.Pd.',
    nip: formatNipDisplay(found?.nip) !== '-' ? formatNipDisplay(found?.nip) : '19690321 199412 2 001',
    pangkatGolongan: found?.pangkatGolongan || 'Pembina Tingkat I / IV b',
    jabatan: found?.jabatan || 'Kepala Sekolah',
    statusJabatan: found?.statusJabatan || 'Definitif',
    unitKerja: found?.unitKerja || 'Kuasa Pengguna Barang'
  };
}

/**
 * Dynamically resolves Pengurus Barang Pembantu from active master pejabat:
 * Prioritas pencarian:
 * 1. Pejabat dengan nama mengandung 'Yati Cahyani' atau 'Yati'
 * 2. Pejabat dengan spesifik ID (jika valid)
 * 3. Pejabat dengan peran/role 'pengurus_barang'
 * 4. Pejabat dengan ID 'pejabat-pengurus-barang'
 * 5. Pejabat dengan jabatan mengandung 'pengurus barang' / 'pengelola persediaan'
 */
export function resolvePengurusBarang(pejabatList: Pejabat[], specificId?: string): ResolvedOfficial {
  const list = pejabatList || [];

  // Filter out any officials related to wakasek or sarpras
  const safeList = list.filter(p => 
    p.role !== 'sarpras' && 
    p.role !== 'wakasek_sarpras' && 
    p.id !== 'pejabat-sarpras' &&
    !p.jabatan?.toLowerCase().includes('sarpras') && 
    !p.jabatan?.toLowerCase().includes('sarana') && 
    !p.jabatan?.toLowerCase().includes('wakasek')
  );

  // 1. Prioritas Khusus: Jika ada pegawai atas nama Yati Cahyani di master data
  const yatiOfficial = safeList.find(p => p.nama.toLowerCase().includes('yati cahyani') || p.nama.toLowerCase().includes('yati'));
  if (yatiOfficial) {
    return {
      id: yatiOfficial.id,
      nama: yatiOfficial.nama,
      nip: formatNipDisplay(yatiOfficial.nip),
      pangkatGolongan: yatiOfficial.pangkatGolongan || 'Penata / III c',
      jabatan: yatiOfficial.jabatan || 'Pengurus Barang Pembantu',
      statusJabatan: yatiOfficial.statusJabatan || 'Definitif',
      unitKerja: yatiOfficial.unitKerja || 'Pengelola Persediaan Barang'
    };
  }

  // 2. Periksa specificId jika diberikan dan valid
  const specificOfficial = specificId ? safeList.find(p => p.id === specificId) : undefined;
  if (specificOfficial) {
    return {
      id: specificOfficial.id,
      nama: specificOfficial.nama,
      nip: formatNipDisplay(specificOfficial.nip),
      pangkatGolongan: specificOfficial.pangkatGolongan || 'Penata / III c',
      jabatan: specificOfficial.jabatan || 'Pengurus Barang Pembantu',
      statusJabatan: specificOfficial.statusJabatan || 'Definitif',
      unitKerja: specificOfficial.unitKerja || 'Pengelola Persediaan Barang'
    };
  }

  // 3. Cari pejabat resmi Pengurus Barang Pembantu dari master pejabat
  const pengurusOfficial = 
    safeList.find(p => p.role === 'pengurus_barang') ||
    safeList.find(p => p.id === 'pejabat-pengurus-barang' || p.id?.includes('pengurus-barang')) ||
    safeList.find(p => p.jabatan && (
      p.jabatan.toLowerCase().includes('pengurus barang') || 
      p.jabatan.toLowerCase().includes('pengelola barang') ||
      p.jabatan.toLowerCase().includes('pengelola persediaan') ||
      p.jabatan.toLowerCase().includes('penyimpan barang')
    )) ||
    safeList.find(p => 
      p.id !== 'pejabat-kepsek' && 
      !p.jabatan?.toLowerCase().includes('kepala sekolah') && 
      !p.jabatan?.toLowerCase().includes('bendahara')
    );

  const found = pengurusOfficial || safeList[0];

  return {
    id: found?.id || 'pejabat-pengurus-barang',
    nama: found?.nama || 'Yati Cahyani, S.AP.',
    nip: formatNipDisplay(found?.nip) !== '-' ? formatNipDisplay(found?.nip) : '19870512 201101 2 007',
    pangkatGolongan: found?.pangkatGolongan || 'Penata / III c',
    jabatan: found?.jabatan || 'Pengurus Barang Pembantu',
    statusJabatan: found?.statusJabatan || 'Definitif',
    unitKerja: found?.unitKerja || 'Pengelola Persediaan Barang'
  };
}

/**
 * Dynamically resolves Bendahara BOS / APBD from active master pejabat:
 * Prioritas pencarian:
 * 1. Role === 'bendahara_bos' atau 'bendahara'
 * 2. ID mengandung 'bendahara'
 * 3. Jabatan mengandung kata 'bendahara'
 * 4. Fallback jika tidak ditemukan
 */
export function resolveBendaharaBOS(pejabatList: Pejabat[], specificId?: string): ResolvedOfficial {
  const list = pejabatList || [];

  const specificOfficial = specificId ? list.find(p => p.id === specificId) : undefined;
  if (specificOfficial) {
    return {
      id: specificOfficial.id,
      nama: specificOfficial.nama,
      nip: formatNipDisplay(specificOfficial.nip),
      pangkatGolongan: specificOfficial.pangkatGolongan || '-',
      jabatan: specificOfficial.jabatan || 'Bendahara BOS',
      statusJabatan: specificOfficial.statusJabatan,
      unitKerja: specificOfficial.unitKerja || 'Pengelola Keuangan BOS'
    };
  }

  const bendaharaOfficial = 
    list.find(p => p.role === 'bendahara_bos' || p.role === 'bendahara') ||
    list.find(p => p.id === 'pejabat-bendahara' || p.id?.includes('bendahara')) ||
    list.find(p => p.jabatan && p.jabatan.toLowerCase().includes('bendahara'));

  if (bendaharaOfficial) {
    return {
      id: bendaharaOfficial.id,
      nama: bendaharaOfficial.nama,
      nip: formatNipDisplay(bendaharaOfficial.nip),
      pangkatGolongan: bendaharaOfficial.pangkatGolongan || '-',
      jabatan: bendaharaOfficial.jabatan || 'Bendahara BOS',
      statusJabatan: bendaharaOfficial.statusJabatan,
      unitKerja: bendaharaOfficial.unitKerja || 'Pengelola Keuangan BOS'
    };
  }

  // Fallback official if none explicitly tagged
  return {
    id: 'pejabat-bendahara-bos',
    nama: 'Hj. Ai Nurhayati, S.Pd.',
    nip: '19780814 200501 2 006',
    pangkatGolongan: 'Penata Tingkat I / III d',
    jabatan: 'Bendahara BOS',
    statusJabatan: 'Definitif',
    unitKerja: 'Pengelola Keuangan BOS'
  };
}

/**
 * Dynamically resolves Tim Pemeriksa Fisik (Stock Opname / Pemeriksa Teknis):
 * Prioritas pencarian:
 * 1. Role === 'tim_pemeriksa' atau 'pemeriksa'
 * 2. ID mengandung 'pemeriksa' atau 'sarpras'
 * 3. Jabatan mengandung kata 'pemeriksa' atau 'sarpras' atau 'sarana'
 */
export function resolveTimPemeriksa(pejabatList: Pejabat[], specificId?: string): ResolvedOfficial {
  const list = pejabatList || [];

  const specificOfficial = specificId ? list.find(p => p.id === specificId) : undefined;
  if (specificOfficial) {
    return {
      id: specificOfficial.id,
      nama: specificOfficial.nama,
      nip: formatNipDisplay(specificOfficial.nip),
      pangkatGolongan: specificOfficial.pangkatGolongan || '-',
      jabatan: specificOfficial.jabatan || 'Tim Pemeriksa Fisik',
      statusJabatan: specificOfficial.statusJabatan,
      unitKerja: specificOfficial.unitKerja || 'Tim Pemeriksa Fisik Persediaan'
    };
  }

  const pemeriksaOfficial = 
    list.find(p => p.role === 'tim_pemeriksa' || p.role === 'pemeriksa') ||
    list.find(p => p.jabatan && p.jabatan.toLowerCase().includes('pemeriksa')) ||
    list.find(p => p.role === 'sarpras') ||
    list.find(p => p.id === 'pejabat-sarpras' || p.id?.includes('sarpras')) ||
    list.find(p => p.jabatan && (p.jabatan.toLowerCase().includes('sarpras') || p.jabatan.toLowerCase().includes('sarana')) && !p.jabatan.toLowerCase().includes('kepala'));

  if (pemeriksaOfficial) {
    return {
      id: pemeriksaOfficial.id,
      nama: pemeriksaOfficial.nama,
      nip: formatNipDisplay(pemeriksaOfficial.nip),
      pangkatGolongan: pemeriksaOfficial.pangkatGolongan || '-',
      jabatan: pemeriksaOfficial.jabatan.toLowerCase().includes('pemeriksa') ? pemeriksaOfficial.jabatan : 'Tim Pemeriksa Fisik Persediaan',
      statusJabatan: pemeriksaOfficial.statusJabatan,
      unitKerja: pemeriksaOfficial.unitKerja || 'Tim Pemeriksa Fisik Persediaan'
    };
  }

  return {
    id: 'pejabat-tim-pemeriksa',
    nama: 'H. Dadan Hamdani, M.Pd.',
    nip: '19750210 200312 1 004',
    pangkatGolongan: 'Penata Tingkat I / III d',
    jabatan: 'Ketua Tim Pemeriksa Fisik',
    statusJabatan: 'Definitif',
    unitKerja: 'Tim Pemeriksa Fisik Persediaan'
  };
}

/**
 * Dynamically resolves Wakasek Sarana Prasarana with priority:
 * 1. Matching specific ID (transaksi.sarprasId)
 * 2. Matching role === 'sarpras'
 * 3. Matching id === 'pejabat-sarpras'
 * 4. Matching jabatan keyword 'sarpras' or 'sarana' or 'wakasek'
 * 5. Fallback to pejabatList item or default
 */
export function resolveWakasekSarpras(pejabatList: Pejabat[], specificId?: string): ResolvedOfficial {
  const list = pejabatList || [];

  // Prioritas utama: cari pejabat dengan jabatan/peran Wakasek Sarana Prasarana
  const sarprasOfficial = 
    list.find(p => p.role === 'sarpras') ||
    list.find(p => p.id === 'pejabat-sarpras' || p.id?.includes('sarpras')) ||
    list.find(p => p.jabatan && (p.jabatan.toLowerCase().includes('sarpras') || p.jabatan.toLowerCase().includes('sarana')) && !p.jabatan.toLowerCase().includes('kepala sekolah')) ||
    list.find(p => p.jabatan && p.jabatan.toLowerCase().includes('wakasek'));

  // Periksa specificId jika ada
  const specificOfficial = specificId ? list.find(p => p.id === specificId) : undefined;
  
  // Gunakan specificOfficial hanya jika relevan dengan sarpras/wakasek; jika tidak, gunakan sarprasOfficial
  const isSpecificSarpras = specificOfficial && (
    specificOfficial.role === 'sarpras' ||
    specificOfficial.id === 'pejabat-sarpras' ||
    (specificOfficial.jabatan && (specificOfficial.jabatan.toLowerCase().includes('sarpras') || specificOfficial.jabatan.toLowerCase().includes('sarana') || specificOfficial.jabatan.toLowerCase().includes('wakasek')))
  );

  const found = (isSpecificSarpras ? specificOfficial : (sarprasOfficial || specificOfficial || list[1] || list[0]));

  return {
    id: found?.id || 'pejabat-sarpras',
    nama: found?.nama || 'Ahmad Fauzi, S.Pd., M.T.',
    nip: formatNipDisplay(found?.nip),
    pangkatGolongan: found?.pangkatGolongan || '-',
    jabatan: found?.jabatan || 'WAKASEK SARANA PRASARANA',
    statusJabatan: found?.statusJabatan,
    unitKerja: found?.unitKerja || 'Wakasek Bidang Sarpras'
  };
}

/**
 * Dynamically resolves Pemohon / Penanggung Jawab Unit:
 * Handles flexible staff / non-ASN smoothly:
 * If non-ASN or no NIP, nip is '-' and isNonAsn is true.
 */
export function resolvePemohon(
  pejabatList: Pejabat[], 
  transaksi: Partial<TransaksiPengeluaran>
): ResolvedOfficial {
  const list = pejabatList || [];
  const byId = transaksi.pemohonId ? list.find(p => p.id === transaksi.pemohonId) : undefined;
  const byNama = (!byId && transaksi.pemohonNama) 
    ? list.find(p => p.nama && p.nama.toLowerCase().trim() === transaksi.pemohonNama?.toLowerCase().trim()) 
    : undefined;
  const matched = byId || byNama;

  const rawNip = matched ? matched.nip : (transaksi.pemohonNip || '');
  const nipFormatted = formatNipDisplay(rawNip);
  const isNonAsn = nipFormatted === '-';

  return {
    id: matched?.id || transaksi.pemohonId,
    nama: matched?.nama || transaksi.pemohonNama || 'Pemohon / Penanggung Jawab Unit',
    nip: nipFormatted,
    pangkatGolongan: matched?.pangkatGolongan || '',
    jabatan: matched?.jabatan || transaksi.unitPemohon || 'Penanggung Jawab Unit',
    statusJabatan: matched?.statusJabatan,
    unitKerja: transaksi.unitPemohon || matched?.unitKerja || 'Unit Pengguna',
    isNonAsn
  };
}
