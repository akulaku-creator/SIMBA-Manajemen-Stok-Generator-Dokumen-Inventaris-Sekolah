import { Barang, JenisBarang, TransaksiPenerimaan, TransaksiPengeluaran } from '../types';
import { getNamaRekeningByKode } from '../data/kodeRekeningData';

export interface DuplicateGroupItem {
  barang: Barang;
  trxPenerimaanCount: number;
  trxPengeluaranCount: number;
  totalTrxCount: number;
  isPrimary: boolean;
  action: 'keep_primary' | 'merge_trx' | 'purge_unused';
}

export interface DuplicateGroup {
  key: string;
  identitas: string;
  namaBarang: string;
  kodeRekening: string;
  hargaSatuan: number;
  items: DuplicateGroupItem[];
  primaryItem: Barang;
  totalDuplicates: number;
  unusedDuplicatesCount: number;
  usedDuplicatesCount: number;
  accumulatedStokAwal: number;
  accumulatedStokSekarang: number;
}

export interface DeduplicationAuditReport {
  totalMasterBarang: number;
  totalGrupDuplikat: number;
  totalBarangGanda: number;
  totalBisaDihapusLangsung: number;
  totalPerluDimerge: number;
  totalStokTerakumulasi: number;
  groups: DuplicateGroup[];
}

export interface DeduplicationExecutionResult {
  cleanedMasterBarang: Barang[];
  updatedTransaksiPengeluaranList: TransaksiPengeluaran[];
  updatedTransaksiPenerimaanList: TransaksiPenerimaan[];
  purgedCount: number;
  mergedCount: number;
  remappedTrxPengeluaranCount: number;
  remappedTrxPenerimaanCount: number;
  auditLogSummary: string;
}

/**
 * Normalizes string for comparison (trims extra spaces and lowers case)
 */
function normalizeStr(str?: string): string {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Unique key gabungan 3 Komponen Kunci (Merging Rule):
 * 1. Nama Barang / Spesifikasi
 * 2. Kode Rekening Belanja
 * 3. Harga Satuan
 *
 * Contoh: "kertas hvs a4 70 gsm_5.1.02.01.01.0025_48500"
 */
export function buildMergeKey(item: Partial<Barang> | { namaBarang?: string; kodeRekening?: string; hargaSatuan?: number }): string {
  const normNama = normalizeStr(item.namaBarang);
  const normKode = (item.kodeRekening || '5.1.02.01.01.0024').trim();
  const harga = Math.round(Number(item.hargaSatuan) || 0);
  return `${normNama}_${normKode}_${harga}`;
}

/**
 * Audit Master Inventaris Barang untuk mendeteksi data ganda/kembar berdasarkan:
 * JIKA DAN HANYA JIKA ketiga komponen bernilai sama persis:
 * 1. Nama Barang / Spesifikasi
 * 2. Kode Rekening Belanja
 * 3. Harga Satuan
 */
export function auditDuplicateMasterBarang(
  masterBarang: Barang[],
  transaksiPengeluaranList: TransaksiPengeluaran[] = [],
  transaksiPenerimaanList: TransaksiPenerimaan[] = []
): DeduplicationAuditReport {
  const pengeluaranCountMap = new Map<string, number>();
  const penerimaanCountMap = new Map<string, number>();

  // Hitung riwayat pemakaian di Transaksi Pengeluaran
  transaksiPengeluaranList.forEach(trx => {
    trx.items?.forEach(it => {
      if (it.barangId) {
        pengeluaranCountMap.set(it.barangId, (pengeluaranCountMap.get(it.barangId) || 0) + 1);
      }
    });
  });

  // Hitung riwayat pemakaian di Transaksi Penerimaan
  transaksiPenerimaanList.forEach(trx => {
    trx.items?.forEach(it => {
      if (it.barangId) {
        penerimaanCountMap.set(it.barangId, (penerimaanCountMap.get(it.barangId) || 0) + 1);
      }
    });
  });

  // Grouping by key: NamaBarang + KodeRekening + HargaSatuan
  const groupMap = new Map<string, Barang[]>();

  masterBarang.forEach(barang => {
    const key = buildMergeKey(barang);
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(barang);
  });

  const duplicateGroups: DuplicateGroup[] = [];
  let totalBarangGanda = 0;
  let totalBisaDihapusLangsung = 0;
  let totalPerluDimerge = 0;
  let totalStokTerakumulasi = 0;

  groupMap.forEach((items, key) => {
    if (items.length > 1) {
      // Prioritas penentuan data master utama (Primary Item) yang dipertahankan:
      // 1. Memiliki riwayat transaksi terbanyak
      // 2. Memiliki kode barang lengkap / NUSP valid
      // 3. Stok tertinggi / urutan pertama
      const itemsWithTrx = items.map(b => {
        const outCount = pengeluaranCountMap.get(b.id) || 0;
        const inCount = penerimaanCountMap.get(b.id) || 0;
        return {
          barang: b,
          outCount,
          inCount,
          totalTrx: outCount + inCount
        };
      });

      itemsWithTrx.sort((a, b) => {
        if (b.totalTrx !== a.totalTrx) return b.totalTrx - a.totalTrx;
        if (a.barang.kodeBarang && !b.barang.kodeBarang) return -1;
        if (!a.barang.kodeBarang && b.barang.kodeBarang) return 1;
        if ((b.barang.stokSekarang || 0) !== (a.barang.stokSekarang || 0)) {
          return (b.barang.stokSekarang || 0) - (a.barang.stokSekarang || 0);
        }
        return (b.barang.stokAwal || 0) - (a.barang.stokAwal || 0);
      });

      const primary = itemsWithTrx[0].barang;

      let groupStokAwal = 0;
      let groupStokSekarang = 0;

      const groupItems: DuplicateGroupItem[] = itemsWithTrx.map((item, idx) => {
        const isPrimary = idx === 0;
        let action: 'keep_primary' | 'merge_trx' | 'purge_unused' = 'keep_primary';

        groupStokAwal += (item.barang.stokAwal || 0);
        groupStokSekarang += (item.barang.stokSekarang || 0);

        if (!isPrimary) {
          if (item.totalTrx > 0) {
            action = 'merge_trx';
            totalPerluDimerge++;
          } else {
            action = 'purge_unused';
            totalBisaDihapusLangsung++;
          }
          totalBarangGanda++;
          totalStokTerakumulasi += (item.barang.stokSekarang || 0);
        }

        return {
          barang: item.barang,
          trxPenerimaanCount: item.inCount,
          trxPengeluaranCount: item.outCount,
          totalTrxCount: item.totalTrx,
          isPrimary,
          action
        };
      });

      duplicateGroups.push({
        key,
        identitas: `${primary.namaBarang} (${primary.kodeRekening || '-'})`,
        namaBarang: primary.namaBarang,
        kodeRekening: primary.kodeRekening || '5.1.02.01.01.0024',
        hargaSatuan: primary.hargaSatuan,
        items: groupItems,
        primaryItem: primary,
        totalDuplicates: items.length - 1,
        unusedDuplicatesCount: groupItems.filter(i => i.action === 'purge_unused').length,
        usedDuplicatesCount: groupItems.filter(i => i.action === 'merge_trx').length,
        accumulatedStokAwal: groupStokAwal,
        accumulatedStokSekarang: groupStokSekarang
      });
    }
  });

  return {
    totalMasterBarang: masterBarang.length,
    totalGrupDuplikat: duplicateGroups.length,
    totalBarangGanda,
    totalBisaDihapusLangsung,
    totalPerluDimerge,
    totalStokTerakumulasi,
    groups: duplicateGroups
  };
}

/**
 * FUNGSI UTAMA PENGGABUNGAN DATA (MERGE DUPLICATE MASTER ITEMS)
 *
 * Menggabungkan data barang kembar secara otomatis berdasarkan kriteria:
 * - Nama Barang / Spesifikasi sama
 * - Kode Rekening Belanja sama
 * - Harga Satuan sama
 *
 * Menjumlahkan stok/sisa fisik secara akumulatif,
 * dan mengalihkan (re-mapping) referensi ID transaksi penerimaan & pengeluaran ke ID master tunggal.
 */
export const mergeDuplicateMasterItems = (
  masterList: Barang[],
  transaksiPengeluaranList: TransaksiPengeluaran[] = [],
  transaksiPenerimaanList: TransaksiPenerimaan[] = []
): {
  cleanedMasterBarang: Barang[];
  updatedTransaksiPengeluaranList: TransaksiPengeluaran[];
  updatedTransaksiPenerimaanList: TransaksiPenerimaan[];
  mergedCount: number;
  remappedTrxPengeluaranCount: number;
  remappedTrxPenerimaanCount: number;
  summary: string;
} => {
  const map = new Map<string, Barang & { mergedIds?: string[] }>();
  const idRemapMap = new Map<string, string>(); // duplicateId -> primaryId

  // Hitung riwayat transaksi setiap item agar item yang paling aktif menjadi primary
  const trxUsageMap = new Map<string, number>();
  transaksiPengeluaranList.forEach(t => t.items?.forEach(i => {
    if (i.barangId) trxUsageMap.set(i.barangId, (trxUsageMap.get(i.barangId) || 0) + 1);
  }));
  transaksiPenerimaanList.forEach(t => t.items?.forEach(i => {
    if (i.barangId) trxUsageMap.set(i.barangId, (trxUsageMap.get(i.barangId) || 0) + 1);
  }));

  // Urutkan masterList: yang memiliki transaksi terbanyak atau kode lengkap diproses dahulu
  const sortedMaster = [...masterList].sort((a, b) => {
    const usageA = trxUsageMap.get(a.id) || 0;
    const usageB = trxUsageMap.get(b.id) || 0;
    if (usageB !== usageA) return usageB - usageA;
    if (a.kodeBarang && !b.kodeBarang) return -1;
    if (!a.kodeBarang && b.kodeBarang) return 1;
    return (b.stokSekarang || 0) - (a.stokSekarang || 0);
  });

  let mergedCount = 0;

  sortedMaster.forEach(item => {
    // Buat unique key gabungan Nama, Kode Rekening, dan Harga
    const key = buildMergeKey(item);

    if (!map.has(key)) {
      // Jika belum ada, masukkan sebagai master unik baru
      map.set(key, { 
        ...item,
        mergedIds: []
      });
    } else {
      // Jika sudah ada, gabungkan stok dan tandai untuk merge relasi
      const existing = map.get(key)!;
      existing.stokAwal = (existing.stokAwal || 0) + (item.stokAwal || 0);
      existing.stokSekarang = (existing.stokSekarang || 0) + (item.stokSekarang || 0);
      (existing as any).stok = existing.stokSekarang;

      // Lengkapi data master jika data duplikat memiliki spesifikasi / lokasi yang lebih lengkap
      if (!existing.spesifikasi && item.spesifikasi) {
        existing.spesifikasi = item.spesifikasi;
      }
      if (!existing.lokasiGudang && item.lokasiGudang) {
        existing.lokasiGudang = item.lokasiGudang;
      }
      if (!existing.nusp && item.nusp) {
        existing.nusp = item.nusp;
      }

      // Catat ID duplikat untuk mapping ulang transaksi
      if (!existing.mergedIds) existing.mergedIds = [];
      existing.mergedIds.push(item.id);
      idRemapMap.set(item.id, existing.id);
      mergedCount++;
    }
  });

  // Re-map Transaksi Pengeluaran
  let remappedTrxPengeluaranCount = 0;
  const updatedTransaksiPengeluaranList = transaksiPengeluaranList.map(trx => {
    let hasChanged = false;
    const newItems = trx.items.map(it => {
      if (it.barangId && idRemapMap.has(it.barangId)) {
        hasChanged = true;
        remappedTrxPengeluaranCount++;
        const targetId = idRemapMap.get(it.barangId)!;
        const targetMaster = Array.from(map.values()).find(m => m.id === targetId);
        return {
          ...it,
          barangId: targetId,
          namaBarang: targetMaster ? targetMaster.namaBarang : it.namaBarang,
          kodeBarang: targetMaster ? targetMaster.kodeBarang : it.kodeBarang,
          nusp: targetMaster ? targetMaster.nusp : it.nusp,
          kodeRekening: targetMaster ? targetMaster.kodeRekening : it.kodeRekening,
          namaRekening: targetMaster ? targetMaster.namaRekening : it.namaRekening
        };
      }
      return it;
    });

    return hasChanged ? { ...trx, items: newItems } : trx;
  });

  // Re-map Transaksi Penerimaan
  let remappedTrxPenerimaanCount = 0;
  const updatedTransaksiPenerimaanList = transaksiPenerimaanList.map(trx => {
    let hasChanged = false;
    const newItems = trx.items.map(it => {
      if (it.barangId && idRemapMap.has(it.barangId)) {
        hasChanged = true;
        remappedTrxPenerimaanCount++;
        const targetId = idRemapMap.get(it.barangId)!;
        const targetMaster = Array.from(map.values()).find(m => m.id === targetId);
        return {
          ...it,
          barangId: targetId,
          namaBarang: targetMaster ? targetMaster.namaBarang : it.namaBarang,
          kodeBarang: targetMaster ? targetMaster.kodeBarang : it.kodeBarang,
          nusp: targetMaster ? targetMaster.nusp : it.nusp,
          kodeRekening: targetMaster ? targetMaster.kodeRekening : it.kodeRekening,
          namaRekening: targetMaster ? targetMaster.namaRekening : it.namaRekening
        };
      }
      return it;
    });

    return hasChanged ? { ...trx, items: newItems } : trx;
  });

  const cleanedMasterBarang = Array.from(map.values()).map(item => {
    const { mergedIds, ...rest } = item;
    return rest as Barang;
  });

  const summary = mergedCount > 0
    ? `Penggabungan Berhasil: ${mergedCount} data barang kembar berhasil digabungkan menjadi entri master tunggal dengan stok terakumulasi. ${remappedTrxPengeluaranCount + remappedTrxPenerimaanCount} relasi item transaksi dialihkan ke ID master gabungan.`
    : 'Pemeriksaan Selesai: Seluruh data master barang telah unik berdasarkan Nama, Kode Rekening, dan Harga Satuan.';

  return {
    cleanedMasterBarang,
    updatedTransaksiPengeluaranList,
    updatedTransaksiPenerimaanList,
    mergedCount,
    remappedTrxPengeluaranCount,
    remappedTrxPenerimaanCount,
    summary
  };
};

/**
 * Eksekusi deduplikasi dan penggabungan master barang
 */
export function executeDeduplicateAndMerge(
  masterBarang: Barang[],
  transaksiPengeluaranList: TransaksiPengeluaran[] = [],
  transaksiPenerimaanList: TransaksiPenerimaan[] = []
): DeduplicationExecutionResult {
  const audit = auditDuplicateMasterBarang(
    masterBarang,
    transaksiPengeluaranList,
    transaksiPenerimaanList
  );

  if (audit.totalBarangGanda === 0) {
    return {
      cleanedMasterBarang: [...masterBarang],
      updatedTransaksiPengeluaranList: [...transaksiPengeluaranList],
      updatedTransaksiPenerimaanList: [...transaksiPenerimaanList],
      purgedCount: 0,
      mergedCount: 0,
      remappedTrxPengeluaranCount: 0,
      remappedTrxPenerimaanCount: 0,
      auditLogSummary: 'Audit selesai: Tidak ditemukan barang ganda berdasarkan Nama, Kode Rekening, dan Harga Satuan.'
    };
  }

  const mergeResult = mergeDuplicateMasterItems(
    masterBarang,
    transaksiPengeluaranList,
    transaksiPenerimaanList
  );

  return {
    cleanedMasterBarang: mergeResult.cleanedMasterBarang,
    updatedTransaksiPengeluaranList: mergeResult.updatedTransaksiPengeluaranList,
    updatedTransaksiPenerimaanList: mergeResult.updatedTransaksiPenerimaanList,
    purgedCount: audit.totalBisaDihapusLangsung,
    mergedCount: mergeResult.mergedCount,
    remappedTrxPengeluaranCount: mergeResult.remappedTrxPengeluaranCount,
    remappedTrxPenerimaanCount: mergeResult.remappedTrxPenerimaanCount,
    auditLogSummary: mergeResult.summary
  };
}

export interface CleanMutationMonthlyDetail {
  bulanIndex: number;
  namaBulan: string;
  masukVolume: number;
  masukHargaSatuan: number;
  masukJumlahRp: number;
  keluarVolume: number;
  keluarHargaSatuan: number;
  keluarJumlahRp: number;
  saldoAkhirVolume: number;
  saldoAkhirHargaSatuan: number;
  saldoAkhirJumlahRp: number;
}

export interface CleanMutationItem {
  id: string;
  kodeBarang: string;
  nusp: string;
  namaBarang: string;
  spesifikasi: string;
  kodeRekening: string;
  namaRekening: string;
  kategori: string;
  satuan: string;
  hargaSatuan: number;
  saldoAwalVolume: number;
  saldoAwalJumlahRp: number;
  totalMasukVolume: number;
  totalMasukJumlahRp: number;
  totalKeluarVolume: number;
  totalKeluarJumlahRp: number;
  saldoAkhirVolume: number;
  saldoAkhirJumlahRp: number;
  mutasiBulanan: CleanMutationMonthlyDetail[];
  keterangan: string;
  jenisBarang?: JenisBarang;
  matchedBarangIds: string[];
}

/**
 * REVISI LOGIKA AGREGASI LAPORAN MUTASI (SINGLE SOURCE OF TRUTH)
 *
 * Mengagregasi mutasi barang persediaan langsung dari data transaksi riil (Left Join)
 * dan Master Inventaris dengan aturan ketat:
 * 1. Tidak membaca data mentah ganda (Deduplikasi berbasis Nama + Kode Rekening + Harga Satuan).
 * 2. Hanya menyertakan barang yang benar-benar tercatat dalam transaksi riil atau memiliki saldo awal sah (> 0).
 * 3. Menghilangkan baris kosong atau baris duplikat yang tidak valid.
 * 4. Menjamin rumus saldo: Saldo Awal + Penambahan - Pengurangan = Saldo Akhir dengan presisi matematika 100%.
 */
export const getCleanMutationData = (
  masterBarang: Barang[] = [],
  penerimaanList: TransaksiPenerimaan[] = [],
  pengeluaranList: TransaksiPengeluaran[] = [],
  options?: {
    targetYear?: number;
    excludeBelanjaModal?: boolean;
    requireActivity?: boolean;
  }
): CleanMutationItem[] => {
  const targetYear = options?.targetYear;
  const excludeBelanjaModal = options?.excludeBelanjaModal ?? true;
  const requireActivity = options?.requireActivity ?? true;

  const NAMA_BULAN_LIST = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const createMonthsArray = (harga: number): CleanMutationMonthlyDetail[] => {
    return Array.from({ length: 12 }, (_, i) => ({
      bulanIndex: i,
      namaBulan: NAMA_BULAN_LIST[i],
      masukVolume: 0,
      masukHargaSatuan: harga,
      masukJumlahRp: 0,
      keluarVolume: 0,
      keluarHargaSatuan: harga,
      keluarJumlahRp: 0,
      saldoAkhirVolume: 0,
      saldoAkhirHargaSatuan: harga,
      saldoAkhirJumlahRp: 0
    }));
  };

  const uniqueMap = new Map<string, CleanMutationItem>();

  // 1. Initial Left Join / Seed dari Master Barang (Deduplikasi baseline & akumulasi saldo awal sah)
  masterBarang.forEach(b => {
    if (excludeBelanjaModal && (b.jenisBarang === 'Belanja Modal' || b.kodeRekening?.startsWith('5.2'))) {
      return;
    }

    const key = buildMergeKey(b);
    const harga = Math.max(0, Number(b.hargaSatuan) || 0);
    const stokAwal = Math.max(0, Number(b.stokAwal) || 0);

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, {
        id: b.id,
        kodeBarang: (b.kodeBarang || '').trim(),
        nusp: (b.nusp || '').trim(),
        namaBarang: (b.namaBarang || '').trim(),
        spesifikasi: (b.spesifikasi || '').trim(),
        kodeRekening: (b.kodeRekening || '5.1.02.01.01.0024').trim(),
        namaRekening: (b.namaRekening || getNamaRekeningByKode(b.kodeRekening) || b.kategori || '').trim(),
        kategori: (b.kategori || b.namaRekening || '').trim(),
        satuan: (b.satuan || 'Pcs').trim(),
        hargaSatuan: harga,
        saldoAwalVolume: stokAwal,
        saldoAwalJumlahRp: stokAwal * harga,
        totalMasukVolume: 0,
        totalMasukJumlahRp: 0,
        totalKeluarVolume: 0,
        totalKeluarJumlahRp: 0,
        saldoAkhirVolume: stokAwal,
        saldoAkhirJumlahRp: stokAwal * harga,
        mutasiBulanan: createMonthsArray(harga),
        keterangan: (b.spesifikasi || b.lokasiGudang || '').trim(),
        jenisBarang: b.jenisBarang || 'BHP',
        matchedBarangIds: [b.id]
      });
    } else {
      const existing = uniqueMap.get(key)!;
      existing.saldoAwalVolume += stokAwal;
      existing.saldoAwalJumlahRp = existing.saldoAwalVolume * existing.hargaSatuan;
      if (!existing.matchedBarangIds.includes(b.id)) {
        existing.matchedBarangIds.push(b.id);
      }
      if (!existing.kodeBarang && b.kodeBarang) existing.kodeBarang = b.kodeBarang.trim();
      if (!existing.nusp && b.nusp) existing.nusp = b.nusp.trim();
      if (!existing.spesifikasi && b.spesifikasi) existing.spesifikasi = b.spesifikasi.trim();
    }
  });

  // 2. Direct Aggregation dari Transaksi Penerimaan (Penerimaan Hasil Pengadaan)
  penerimaanList.forEach(trx => {
    if (!trx.tanggal) return;
    const d = new Date(trx.tanggal);
    const trxYear = d.getFullYear();
    const monthIndex = d.getMonth();

    if (targetYear !== undefined && trxYear !== targetYear) {
      // Transaksi tahun sebelum targetYear dikontribusikan ke saldo awal
      if (trxYear < targetYear) {
        trx.items?.forEach(it => {
          const matchedMaster = masterBarang.find(mb => mb.id === it.barangId);
          const effectiveKode = (it.kodeRekening || matchedMaster?.kodeRekening || '5.1.02.01.01.0024').trim();
          if (excludeBelanjaModal && effectiveKode.startsWith('5.2')) return;
          const effectiveHarga = Math.max(0, Number(it.hargaSatuan) || Number(matchedMaster?.hargaSatuan) || 0);
          const key = buildMergeKey({
            namaBarang: it.namaBarang,
            kodeRekening: effectiveKode,
            hargaSatuan: effectiveHarga
          });
          if (uniqueMap.has(key)) {
            const entry = uniqueMap.get(key)!;
            entry.saldoAwalVolume += (Number(it.jumlahMasuk) || 0);
            entry.saldoAwalJumlahRp = entry.saldoAwalVolume * entry.hargaSatuan;
          }
        });
      }
      return;
    }

    trx.items?.forEach(it => {
      const matchedMaster = masterBarang.find(mb => mb.id === it.barangId);
      const effectiveKode = (it.kodeRekening || matchedMaster?.kodeRekening || '5.1.02.01.01.0024').trim();
      if (excludeBelanjaModal && effectiveKode.startsWith('5.2')) return;

      const effectiveHarga = Math.max(0, Number(it.hargaSatuan) || Number(matchedMaster?.hargaSatuan) || 0);
      const key = buildMergeKey({
        namaBarang: it.namaBarang,
        kodeRekening: effectiveKode,
        hargaSatuan: effectiveHarga
      });

      if (!uniqueMap.has(key)) {
        // Left join: Barang tercatat di transaksi penerimaan namun belum terdaftar di master
        uniqueMap.set(key, {
          id: it.barangId || `rcv-syn-${key}`,
          kodeBarang: (it.kodeBarang || matchedMaster?.kodeBarang || '').trim(),
          nusp: (it.nusp || matchedMaster?.nusp || '').trim(),
          namaBarang: (it.namaBarang || '').trim(),
          spesifikasi: (it.spesifikasi || matchedMaster?.spesifikasi || '').trim(),
          kodeRekening: effectiveKode,
          namaRekening: (it.namaRekening || getNamaRekeningByKode(effectiveKode) || '').trim(),
          kategori: (it.namaRekening || '').trim(),
          satuan: (it.satuan || matchedMaster?.satuan || 'Pcs').trim(),
          hargaSatuan: effectiveHarga,
          saldoAwalVolume: 0,
          saldoAwalJumlahRp: 0,
          totalMasukVolume: 0,
          totalMasukJumlahRp: 0,
          totalKeluarVolume: 0,
          totalKeluarJumlahRp: 0,
          saldoAkhirVolume: 0,
          saldoAkhirJumlahRp: 0,
          mutasiBulanan: createMonthsArray(effectiveHarga),
          keterangan: (it.spesifikasi || '').trim(),
          jenisBarang: 'BHP',
          matchedBarangIds: it.barangId ? [it.barangId] : []
        });
      }

      const entry = uniqueMap.get(key)!;
      const qty = Math.max(0, Number(it.jumlahMasuk) || 0);
      const subtotal = Number(it.subtotal) || (qty * entry.hargaSatuan);

      entry.totalMasukVolume += qty;
      entry.totalMasukJumlahRp += subtotal;

      if (monthIndex >= 0 && monthIndex < 12) {
        entry.mutasiBulanan[monthIndex].masukVolume += qty;
        entry.mutasiBulanan[monthIndex].masukJumlahRp += subtotal;
      }
      if (it.barangId && !entry.matchedBarangIds.includes(it.barangId)) {
        entry.matchedBarangIds.push(it.barangId);
      }
    });
  });

  // 3. Direct Aggregation dari Transaksi Penyaluran / Pengeluaran (SPB, SPPB, BAST)
  pengeluaranList.forEach(trx => {
    if (!trx.tanggal) return;
    const d = new Date(trx.tanggal);
    const trxYear = d.getFullYear();
    const monthIndex = d.getMonth();

    if (targetYear !== undefined && trxYear !== targetYear) {
      if (trxYear < targetYear) {
        trx.items?.forEach(it => {
          const matchedMaster = masterBarang.find(mb => mb.id === it.barangId);
          const effectiveKode = (it.kodeRekening || matchedMaster?.kodeRekening || '5.1.02.01.01.0024').trim();
          if (excludeBelanjaModal && effectiveKode.startsWith('5.2')) return;
          const effectiveHarga = Math.max(0, Number(it.hargaSatuan) || Number(matchedMaster?.hargaSatuan) || 0);
          const key = buildMergeKey({
            namaBarang: it.namaBarang,
            kodeRekening: effectiveKode,
            hargaSatuan: effectiveHarga
          });
          if (uniqueMap.has(key)) {
            const entry = uniqueMap.get(key)!;
            entry.saldoAwalVolume = Math.max(0, entry.saldoAwalVolume - (Number(it.usulanJumlah) || 0));
            entry.saldoAwalJumlahRp = entry.saldoAwalVolume * entry.hargaSatuan;
          }
        });
      }
      return;
    }

    trx.items?.forEach(it => {
      const matchedMaster = masterBarang.find(mb => mb.id === it.barangId);
      const effectiveKode = (it.kodeRekening || matchedMaster?.kodeRekening || '5.1.02.01.01.0024').trim();
      if (excludeBelanjaModal && effectiveKode.startsWith('5.2')) return;

      const effectiveHarga = Math.max(0, Number(it.hargaSatuan) || Number(matchedMaster?.hargaSatuan) || 0);
      const key = buildMergeKey({
        namaBarang: it.namaBarang,
        kodeRekening: effectiveKode,
        hargaSatuan: effectiveHarga
      });

      if (!uniqueMap.has(key)) {
        // Left join: Barang disalurkan di transaksi pengeluaran namun belum ada di master
        uniqueMap.set(key, {
          id: it.barangId || `out-syn-${key}`,
          kodeBarang: (it.kodeBarang || matchedMaster?.kodeBarang || '').trim(),
          nusp: (it.nusp || matchedMaster?.nusp || '').trim(),
          namaBarang: (it.namaBarang || '').trim(),
          spesifikasi: (it.spesifikasi || matchedMaster?.spesifikasi || '').trim(),
          kodeRekening: effectiveKode,
          namaRekening: (it.namaRekening || getNamaRekeningByKode(effectiveKode) || '').trim(),
          kategori: (it.namaRekening || '').trim(),
          satuan: (it.satuan || matchedMaster?.satuan || 'Pcs').trim(),
          hargaSatuan: effectiveHarga,
          saldoAwalVolume: 0,
          saldoAwalJumlahRp: 0,
          totalMasukVolume: 0,
          totalMasukJumlahRp: 0,
          totalKeluarVolume: 0,
          totalKeluarJumlahRp: 0,
          saldoAkhirVolume: 0,
          saldoAkhirJumlahRp: 0,
          mutasiBulanan: createMonthsArray(effectiveHarga),
          keterangan: (it.spesifikasi || '').trim(),
          jenisBarang: 'BHP',
          matchedBarangIds: it.barangId ? [it.barangId] : []
        });
      }

      const entry = uniqueMap.get(key)!;
      const qty = Math.max(0, Number(it.usulanJumlah) || 0);
      const subtotal = qty * entry.hargaSatuan;

      entry.totalKeluarVolume += qty;
      entry.totalKeluarJumlahRp += subtotal;

      if (monthIndex >= 0 && monthIndex < 12) {
        entry.mutasiBulanan[monthIndex].keluarVolume += qty;
        entry.mutasiBulanan[monthIndex].keluarJumlahRp += subtotal;
      }
      if (it.barangId && !entry.matchedBarangIds.includes(it.barangId)) {
        entry.matchedBarangIds.push(it.barangId);
      }
    });
  });

  // 4. Centralized Saldo Calculation:
  // Saldo Awal + Penambahan - Pengurangan = Saldo Akhir (Bulanan dan Kumulatif)
  uniqueMap.forEach(item => {
    let runningVolume = item.saldoAwalVolume;
    for (let m = 0; m < 12; m++) {
      runningVolume = Math.max(0, runningVolume + item.mutasiBulanan[m].masukVolume - item.mutasiBulanan[m].keluarVolume);
      item.mutasiBulanan[m].saldoAkhirVolume = runningVolume;
      item.mutasiBulanan[m].saldoAkhirJumlahRp = runningVolume * item.hargaSatuan;
    }
    item.saldoAkhirVolume = runningVolume;
    item.saldoAkhirJumlahRp = runningVolume * item.hargaSatuan;
  });

  // 5. Filter Sanitasi Barang Aktif (Rule 1 & Rule 2):
  // Hilangkan baris kosong jika barang pada master tidak memiliki riwayat transaksi DAN tidak memiliki saldo awal sah (> 0)
  const result = Array.from(uniqueMap.values()).filter(item => {
    if (!requireActivity) return true;
    const hasInitial = (item.saldoAwalVolume > 0);
    const hasMasuk = (item.totalMasukVolume > 0);
    const hasKeluar = (item.totalKeluarVolume > 0);
    return hasInitial || hasMasuk || hasKeluar;
  });

  return result;
};
