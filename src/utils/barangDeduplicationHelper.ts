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
  kodeRekening: string;
  items: DuplicateGroupItem[];
  primaryItem: Barang;
  totalDuplicates: number;
  unusedDuplicatesCount: number;
  usedDuplicatesCount: number;
}

export interface DeduplicationAuditReport {
  totalMasterBarang: number;
  totalGrupDuplikat: number;
  totalBarangGanda: number;
  totalBisaDihapusLangsung: number;
  totalPerluDimerge: number;
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
 * Normalizes string for deduplication comparison (trims extra spaces and lowers case)
 */
function normalizeStr(str?: string): string {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Audit Master Inventaris Barang untuk mendeteksi data ganda berdasarkan:
 * 1. Kesamaan Kode Barang + Nama Barang
 * 2. Kesamaan Nama Barang + Spesifikasi
 * 3. Kesamaan NUSP (Nomor Urut Pendaftaran Barang) jika valid
 */
export function auditDuplicateMasterBarang(
  masterBarang: Barang[],
  transaksiPengeluaranList: TransaksiPengeluaran[] = [],
  transaksiPenerimaanList: TransaksiPenerimaan[] = []
): DeduplicationAuditReport {
  const pengeluaranCountMap = new Map<string, number>();
  const penerimaanCountMap = new Map<string, number>();

  // Count usage in Transaksi Pengeluaran
  transaksiPengeluaranList.forEach(trx => {
    trx.items?.forEach(it => {
      if (it.barangId) {
        pengeluaranCountMap.set(it.barangId, (pengeluaranCountMap.get(it.barangId) || 0) + 1);
      }
    });
  });

  // Count usage in Transaksi Penerimaan
  transaksiPenerimaanList.forEach(trx => {
    trx.items?.forEach(it => {
      if (it.barangId) {
        penerimaanCountMap.set(it.barangId, (penerimaanCountMap.get(it.barangId) || 0) + 1);
      }
    });
  });

  // Grouping by deduplication keys
  // Key strategy: Name + sanitized Kode / NUSP
  const groupMap = new Map<string, Barang[]>();

  masterBarang.forEach(barang => {
    const normNama = normalizeStr(barang.namaBarang);
    const normKode = normalizeStr(barang.kodeBarang);
    const normSpesifikasi = normalizeStr(barang.spesifikasi);
    const normNusp = normalizeStr(barang.nusp);

    // Primary unique identity key
    let dedupKey = '';
    if (normKode && normNama) {
      dedupKey = `code_name:${normKode}|${normNama}`;
    } else if (normNama && normSpesifikasi) {
      dedupKey = `name_spec:${normNama}|${normSpesifikasi}`;
    } else if (normNusp && normNusp !== '-' && normNusp !== '0000/2026') {
      dedupKey = `nusp:${normNusp}`;
    } else {
      dedupKey = `name_only:${normNama}`;
    }

    if (!groupMap.has(dedupKey)) {
      groupMap.set(dedupKey, []);
    }
    groupMap.get(dedupKey)!.push(barang);
  });

  const duplicateGroups: DuplicateGroup[] = [];
  let totalBarangGanda = 0;
  let totalBisaDihapusLangsung = 0;
  let totalPerluDimerge = 0;

  groupMap.forEach((items, key) => {
    if (items.length > 1) {
      // Find the best item to keep as primary master:
      // Priority:
      // 1. Most transactions (usage)
      // 2. Highest current/initial stock
      // 3. Lowest index / existing clean ID
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
        // Sort descending by total transaction count
        if (b.totalTrx !== a.totalTrx) return b.totalTrx - a.totalTrx;
        // Then by current stock
        if ((b.barang.stokSekarang || 0) !== (a.barang.stokSekarang || 0)) {
          return (b.barang.stokSekarang || 0) - (a.barang.stokSekarang || 0);
        }
        // Then by initial stock
        return (b.barang.stokAwal || 0) - (a.barang.stokAwal || 0);
      });

      const primary = itemsWithTrx[0].barang;

      const groupItems: DuplicateGroupItem[] = itemsWithTrx.map((item, idx) => {
        const isPrimary = idx === 0;
        let action: 'keep_primary' | 'merge_trx' | 'purge_unused' = 'keep_primary';

        if (!isPrimary) {
          if (item.totalTrx > 0) {
            action = 'merge_trx';
            totalPerluDimerge++;
          } else {
            action = 'purge_unused';
            totalBisaDihapusLangsung++;
          }
          totalBarangGanda++;
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
        identitas: `${primary.kodeBarang || '-'} • ${primary.namaBarang}`,
        kodeRekening: primary.kodeRekening || '5.1.02.01.01.0024',
        items: groupItems,
        primaryItem: primary,
        totalDuplicates: items.length - 1,
        unusedDuplicatesCount: groupItems.filter(i => i.action === 'purge_unused').length,
        usedDuplicatesCount: groupItems.filter(i => i.action === 'merge_trx').length
      });
    }
  });

  return {
    totalMasterBarang: masterBarang.length,
    totalGrupDuplikat: duplicateGroups.length,
    totalBarangGanda,
    totalBisaDihapusLangsung,
    totalPerluDimerge,
    groups: duplicateGroups
  };
}

/**
 * Menjalankan Pembersihan Barang Ganda (Duplicate Purge & Merge) secara atomic:
 * 1. Menghapus barang ganda tanpa transaksi.
 * 2. Menggabungkan (merge) ID barang ganda yang memiliki riwayat transaksi ke barang utama.
 * 3. Mengupdate seluruh relasi transaksi penyaluran dan penerimaan.
 * 4. Menghitung ulang saldo stok barang utama agar konsisten dan valid.
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
      auditLogSummary: 'Audit selesai: Tidak ditemukan barang ganda pada Master Inventaris.'
    };
  }

  // Mapping from duplicate barang ID -> primary barang ID
  const idRemapMap = new Map<string, string>();
  const idPurgeSet = new Set<string>();

  audit.groups.forEach(group => {
    const primaryId = group.primaryItem.id;
    group.items.forEach(item => {
      if (!item.isPrimary) {
        idPurgeSet.add(item.barang.id);
        if (item.action === 'merge_trx') {
          idRemapMap.set(item.barang.id, primaryId);
        }
      }
    });
  });

  // 1. Remap Transaksi Pengeluaran
  let remappedTrxPengeluaranCount = 0;
  const updatedTransaksiPengeluaranList = transaksiPengeluaranList.map(trx => {
    let hasChanged = false;
    const newItems = trx.items.map(it => {
      if (it.barangId && idRemapMap.has(it.barangId)) {
        hasChanged = true;
        remappedTrxPengeluaranCount++;
        return {
          ...it,
          barangId: idRemapMap.get(it.barangId)!
        };
      }
      return it;
    });

    if (hasChanged) {
      return { ...trx, items: newItems };
    }
    return trx;
  });

  // 2. Remap Transaksi Penerimaan
  let remappedTrxPenerimaanCount = 0;
  const updatedTransaksiPenerimaanList = transaksiPenerimaanList.map(trx => {
    let hasChanged = false;
    const newItems = trx.items.map(it => {
      if (it.barangId && idRemapMap.has(it.barangId)) {
        hasChanged = true;
        remappedTrxPenerimaanCount++;
        return {
          ...it,
          barangId: idRemapMap.get(it.barangId)!
        };
      }
      return it;
    });

    if (hasChanged) {
      return { ...trx, items: newItems };
    }
    return trx;
  });

  // 3. Clean Master Barang list
  // Retain only items NOT in idPurgeSet
  const remainingMaster = masterBarang.filter(b => !idPurgeSet.has(b.id));

  // 4. Recalculate stock for merged primary items
  const finalMasterBarang = remainingMaster.map(primaryBarang => {
    const isMergedGroupPrimary = audit.groups.some(g => g.primaryItem.id === primaryBarang.id);
    if (!isMergedGroupPrimary) {
      return primaryBarang;
    }

    // Hitung seluruh penerimaan untuk barang ini
    let totalMasuk = 0;
    updatedTransaksiPenerimaanList.forEach(trx => {
      trx.items?.forEach(it => {
        if (it.barangId === primaryBarang.id && it.jumlahMasuk > 0) {
          totalMasuk += it.jumlahMasuk;
        }
      });
    });

    // Hitung seluruh pengeluaran untuk barang ini
    let totalKeluar = 0;
    updatedTransaksiPengeluaranList.forEach(trx => {
      trx.items?.forEach(it => {
        if (it.barangId === primaryBarang.id && it.usulanJumlah > 0) {
          totalKeluar += it.usulanJumlah;
        }
      });
    });

    // Hitung saldo akhir yang akurat
    const newStokSekarang = Math.max(0, (primaryBarang.stokAwal || 0) + totalMasuk - totalKeluar);

    return {
      ...primaryBarang,
      stokSekarang: newStokSekarang
    };
  });

  const summary = `Pembersihan Selesai: ${audit.totalBisaDihapusLangsung} barang ganda tanpa riwayat telah dihapus, ${audit.totalPerluDimerge} barang ganda berhasil dimerge ke master utama (${remappedTrxPengeluaranCount + remappedTrxPenerimaanCount} relasi item transaksi diperbarui).`;

  return {
    cleanedMasterBarang: finalMasterBarang,
    updatedTransaksiPengeluaranList,
    updatedTransaksiPenerimaanList,
    purgedCount: audit.totalBisaDihapusLangsung,
    mergedCount: audit.totalPerluDimerge,
    remappedTrxPengeluaranCount,
    remappedTrxPenerimaanCount,
    auditLogSummary: summary
  };
}
