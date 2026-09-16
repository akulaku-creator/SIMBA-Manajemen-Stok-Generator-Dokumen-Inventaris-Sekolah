import { Barang } from '../types';

export interface RekeningOption {
  kode: string;
  nama: string;
  displayName: string;
  count: number;
}

/**
 * Extracts unique Kode Rekening Belanja from Master Barang list
 */
export const getUniqueKodeRekening = (masterBarang: Barang[]): RekeningOption[] => {
  const map = new Map<string, { nama: string; count: number }>();

  masterBarang.forEach((b) => {
    const kode = b.kodeRekening?.trim() || '5.1.02.01.01.0024';
    const rawNama = b.namaRekening?.trim() || 'Belanja Alat Tulis Kantor';

    if (!map.has(kode)) {
      map.set(kode, { nama: rawNama, count: 1 });
    } else {
      const existing = map.get(kode)!;
      existing.count += 1;
    }
  });

  return Array.from(map.entries())
    .map(([kode, { nama, count }]) => {
      // Clean up repetitive government account prefixes for readable dropdowns
      const shortNama = nama
        .replace(/^Belanja Alat\/Bahan untuk Kegiatan Kantor-/i, '')
        .replace(/^Belanja /i, '');
      return {
        kode,
        nama,
        displayName: `${kode} — ${shortNama}`,
        count
      };
    })
    .sort((a, b) => a.kode.localeCompare(b.kode));
};

/**
 * Returns list of goods belonging strictly to the selected Kode Rekening
 */
export const getBarangByRekening = (
  masterBarang: Barang[],
  kodeRekening: string
): Barang[] => {
  if (!kodeRekening) return masterBarang;
  return masterBarang.filter(
    (b) => (b.kodeRekening?.trim() || '5.1.02.01.01.0024') === kodeRekening.trim()
  );
};
