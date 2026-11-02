import { Barang, KopSuratConfig, TransaksiPenerimaan, TransaksiPengeluaran } from '../types';
import { buildMergeKey, getCleanMutationData, CleanMutationItem } from './barangDeduplicationHelper';

export const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export interface MutasiBulanDetail {
  bulanIndex: number; // 0 = Januari, 11 = Desember
  namaBulan: string;
  // Masuk
  masukVolume: number;
  masukSatuan: string;
  masukHargaSatuan: number;
  masukJumlahRp: number;
  // Keluar
  keluarVolume: number;
  keluarSatuan: string;
  keluarHargaSatuan: number;
  keluarJumlahRp: number;
  // Saldo Akhir per akhir bulan ini
  saldoAkhirVolume: number;
  saldoAkhirSatuan: string;
  saldoAkhirHargaSatuan: number;
  saldoAkhirJumlahRp: number;
}

export interface MutasiBarangItem {
  id: string;
  kodeBarang: string;
  namaBarang: string;
  kodeRekening: string;
  namaRekening: string;
  satuan: string;
  hargaSatuan: number;
  // Saldo Awal per 1 Januari
  saldoAwalVolume: number;
  saldoAwalSatuan: string;
  saldoAwalHargaSatuan: number;
  saldoAwalJumlahRp: number;
  // Mutasi 12 bulan (Januari - Desember)
  mutasiBulanan: MutasiBulanDetail[];
  keterangan?: string;
}

export interface KelompokKodeRekening {
  kodeRekening: string;
  namaRekening: string;
  items: MutasiBarangItem[];
  // Subtotal akumulasi rupiah
  subtotalSaldoAwalRp: number;
  subtotalBulanan: {
    bulanIndex: number;
    namaBulan: string;
    totalMasukRp: number;
    totalKeluarRp: number;
    totalSaldoAkhirRp: number;
  }[];
}

export interface RekapKoderingRow {
  no: number;
  kodeRekening: string;
  namaRekening: string;
  saldoAwalRp: number;
  bulanan: {
    bulanIndex: number;
    namaBulan: string;
    masukRp: number;
    keluarRp: number;
    saldoAkhirRp: number;
  }[];
}

export interface MutasiBOSCalculationResult {
  tahun: number;
  namaSekolah: string;
  kelompokRekening: KelompokKodeRekening[];
  rekapKodering: RekapKoderingRow[];
  grandTotal: {
    saldoAwalRp: number;
    bulanan: {
      bulanIndex: number;
      namaBulan: string;
      masukRp: number;
      keluarRp: number;
      saldoAkhirRp: number;
    }[];
  };
}

/**
 * Core Engine: Menghitung seluruh mutasi saldo barang per bulan (Januari - Desember)
 * dan mengelompokkannya per Kode Rekening Belanja.
 * Menggunakan Single Source of Truth terpusat (getCleanMutationData).
 */
export function calculateMutasiBOSData(
  masterBarang: Barang[],
  transaksiPengeluaranList: TransaksiPengeluaran[],
  transaksiPenerimaanList: TransaksiPenerimaan[],
  kopConfig: KopSuratConfig,
  targetYear: number = 2026
): MutasiBOSCalculationResult {
  const dynamicSchool = kopConfig?.namaSekolah?.trim() || 'SMAN 1 CIHAURBEUTI';

  // 1. Ekstraksi data mutasi bersih dengan Left Join dari transaksi riil & deduplikasi terpusat
  // Menghilangkan baris kosong/ganda yang tidak memiliki riwayat transaksi atau saldo awal sah
  const cleanItems: CleanMutationItem[] = getCleanMutationData(
    masterBarang,
    transaksiPenerimaanList,
    transaksiPengeluaranList,
    { targetYear, excludeBelanjaModal: true, requireActivity: true }
  );

  // 2. Kelompokkan per Kode Rekening Belanja
  const groupedMap = new Map<string, { namaRekening: string; items: CleanMutationItem[] }>();

  cleanItems.forEach(item => {
    const kodering = item.kodeRekening || '5.1.02.01.01.0024';
    const namaRekening = item.namaRekening || 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor';
    if (!groupedMap.has(kodering)) {
      groupedMap.set(kodering, { namaRekening, items: [] });
    }
    groupedMap.get(kodering)!.items.push(item);
  });

  // Urutkan kode rekening secara leksikografis standar BAS Pemda
  const sortedKoderings = Array.from(groupedMap.keys()).sort();

  const kelompokRekening: KelompokKodeRekening[] = [];

  sortedKoderings.forEach(kodering => {
    const group = groupedMap.get(kodering)!;
    const itemsResult: MutasiBarangItem[] = [];

    let subtotalSaldoAwal = 0;
    const subtotalBulanan = NAMA_BULAN.map((namaBulan, bulanIndex) => ({
      bulanIndex,
      namaBulan,
      totalMasukRp: 0,
      totalKeluarRp: 0,
      totalSaldoAkhirRp: 0,
    }));

    // Urutkan barang di dalam rekening berdasarkan nama barang
    const sortedGroupItems = [...group.items].sort((a, b) => a.namaBarang.localeCompare(b.namaBarang));

    sortedGroupItems.forEach(item => {
      subtotalSaldoAwal += item.saldoAwalJumlahRp;

      const mutasiBulanan: MutasiBulanDetail[] = item.mutasiBulanan.map(mb => {
        // Akumulasikan ke subtotal kodering
        subtotalBulanan[mb.bulanIndex].totalMasukRp += mb.masukJumlahRp;
        subtotalBulanan[mb.bulanIndex].totalKeluarRp += mb.keluarJumlahRp;
        subtotalBulanan[mb.bulanIndex].totalSaldoAkhirRp += mb.saldoAkhirJumlahRp;

        return {
          bulanIndex: mb.bulanIndex,
          namaBulan: mb.namaBulan,
          masukVolume: mb.masukVolume,
          masukSatuan: item.satuan,
          masukHargaSatuan: item.hargaSatuan,
          masukJumlahRp: mb.masukJumlahRp,
          keluarVolume: mb.keluarVolume,
          keluarSatuan: item.satuan,
          keluarHargaSatuan: item.hargaSatuan,
          keluarJumlahRp: mb.keluarJumlahRp,
          saldoAkhirVolume: mb.saldoAkhirVolume,
          saldoAkhirSatuan: item.satuan,
          saldoAkhirHargaSatuan: item.hargaSatuan,
          saldoAkhirJumlahRp: mb.saldoAkhirJumlahRp,
        };
      });

      itemsResult.push({
        id: item.id,
        kodeBarang: item.kodeBarang,
        namaBarang: item.namaBarang,
        kodeRekening: kodering,
        namaRekening: group.namaRekening,
        satuan: item.satuan,
        hargaSatuan: item.hargaSatuan,
        saldoAwalVolume: item.saldoAwalVolume,
        saldoAwalSatuan: item.satuan,
        saldoAwalHargaSatuan: item.hargaSatuan,
        saldoAwalJumlahRp: item.saldoAwalJumlahRp,
        mutasiBulanan,
        keterangan: item.spesifikasi || item.keterangan || '',
      });
    });

    kelompokRekening.push({
      kodeRekening: kodering,
      namaRekening: group.namaRekening,
      items: itemsResult,
      subtotalSaldoAwalRp: subtotalSaldoAwal,
      subtotalBulanan,
    });
  });

  // 3. Bangun Rekapitulasi per Kodering
  const rekapKodering: RekapKoderingRow[] = kelompokRekening.map((kel, idx) => {
    return {
      no: idx + 1,
      kodeRekening: kel.kodeRekening,
      namaRekening: kel.namaRekening,
      saldoAwalRp: kel.subtotalSaldoAwalRp,
      bulanan: kel.subtotalBulanan.map(b => ({
        bulanIndex: b.bulanIndex,
        namaBulan: b.namaBulan,
        masukRp: b.totalMasukRp,
        keluarRp: b.totalKeluarRp,
        saldoAkhirRp: b.totalSaldoAkhirRp,
      })),
    };
  });

  // 4. Hitung Grand Total
  let grandTotalSaldoAwal = 0;
  const grandTotalBulanan = NAMA_BULAN.map((namaBulan, bulanIndex) => ({
    bulanIndex,
    namaBulan,
    masukRp: 0,
    keluarRp: 0,
    saldoAkhirRp: 0,
  }));

  rekapKodering.forEach(r => {
    grandTotalSaldoAwal += r.saldoAwalRp;
    r.bulanan.forEach((b, idx) => {
      grandTotalBulanan[idx].masukRp += b.masukRp;
      grandTotalBulanan[idx].keluarRp += b.keluarRp;
      grandTotalBulanan[idx].saldoAkhirRp += b.saldoAkhirRp;
    });
  });

  return {
    tahun: targetYear,
    namaSekolah: dynamicSchool,
    kelompokRekening,
    rekapKodering,
    grandTotal: {
      saldoAwalRp: grandTotalSaldoAwal,
      bulanan: grandTotalBulanan,
    },
  };
}
