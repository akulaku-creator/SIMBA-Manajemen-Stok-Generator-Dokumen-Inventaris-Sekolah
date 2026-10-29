import { Barang, TransaksiPenerimaan, TransaksiPengeluaran } from '../types';

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
export function buildMergeKey(item: Barang): string {
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
