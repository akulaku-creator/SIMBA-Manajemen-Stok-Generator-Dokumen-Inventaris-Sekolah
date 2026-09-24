import { Pejabat, TransaksiPengeluaran } from '../types';

export interface ResolvedOfficial {
  id?: string;
  nama: string;
  nip: string;
  pangkatGolongan: string;
  jabatan: string;
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
 * Dynamically resolves Kepala Sekolah from active pejabatList with priority:
 * 1. Matching role === 'kepala_sekolah'
 * 2. Matching id === 'pejabat-kepsek'
 * 3. Matching jabatan keyword 'kepala sekolah'
 * 4. Fallback to first officer or default
 */
export function resolveKepalaSekolah(pejabatList: Pejabat[], specificId?: string): ResolvedOfficial {
  const list = pejabatList || [];
  const found = 
    (specificId ? list.find(p => p.id === specificId) : undefined) ||
    list.find(p => p.role === 'kepala_sekolah') ||
    list.find(p => p.id === 'pejabat-kepsek') ||
    list.find(p => p.jabatan && p.jabatan.toLowerCase().includes('kepala sekolah')) ||
    list[0];

  return {
    id: found?.id || 'pejabat-kepsek',
    nama: found?.nama || 'Kepala Sekolah',
    nip: formatNipDisplay(found?.nip),
    pangkatGolongan: found?.pangkatGolongan || '-',
    jabatan: found?.jabatan || 'Kepala Sekolah',
    unitKerja: found?.unitKerja || 'Pimpinan Lembaga'
  };
}

/**
 * Dynamically resolves Pengurus Barang Pembantu with priority:
 * 1. Matching specific ID (transaksi.pengurusBarangId)
 * 2. Matching role === 'pengurus_barang'
 * 3. Matching id === 'pejabat-pengurus-barang'
 * 4. Matching jabatan keyword 'pengurus barang'
 * 5. Fallback to pejabatList item or default
 */
export function resolvePengurusBarang(pejabatList: Pejabat[], specificId?: string): ResolvedOfficial {
  const list = pejabatList || [];
  const found = 
    list.find(p => p.role === 'pengurus_barang') ||
    (specificId ? list.find(p => p.id === specificId) : undefined) ||
    list.find(p => p.id === 'pejabat-pengurus-barang') ||
    list.find(p => p.jabatan && p.jabatan.toLowerCase().includes('pengurus barang')) ||
    list.find(p => p.id !== 'pejabat-kepsek' && p.id !== 'pejabat-sarpras') ||
    list[2];

  return {
    id: found?.id || 'pejabat-pengurus-barang',
    nama: found?.nama || 'Pengurus Barang Pembantu',
    nip: formatNipDisplay(found?.nip),
    pangkatGolongan: found?.pangkatGolongan || '-',
    jabatan: found?.jabatan || 'Pengurus Barang Pembantu',
    unitKerja: found?.unitKerja || 'Pengelola Persediaan Barang'
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
    list.find(p => p.id === 'pejabat-sarpras') ||
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
    jabatan: 'WAKASEK SARANA PRASARANA',
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
    unitKerja: transaksi.unitPemohon || matched?.unitKerja || 'Unit Pengguna',
    isNonAsn
  };
}
