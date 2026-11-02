import { Barang, TransaksiPenerimaan, TransaksiPengeluaran, UserRole } from '../types';
import { buildMergeKey } from './barangDeduplicationHelper';
import { logAuditEvent } from './auditLogger';

export interface MutationRowItem {
  id?: string;
  barangId?: string;
  matchedBarangIds?: string[];
  namaBarang?: string;
  kodeRekening?: string;
  hargaSatuan?: number;
  saldoAwalVolume?: number;
  saldoAkhirVolume?: number;
  totalMasukVolume?: number;
  totalKeluarVolume?: number;
  stok?: number;
  stokAkhir?: number;
  stokSekarang?: number;
  [key: string]: any;
}

/**
 * Filter Sanitasi Laporan Mutasi (Ghost Record Removal)
 * Memastikan baris data pada laporan mutasi (Buku-01, Buku-02, Mutasi BHP)
 * HANYA menampilkan barang yang memenuhi setidaknya salah satu kriteria:
 * 1. Memiliki stok fisik saat ini di Master Barang (stok > 0), ATAU
 * 2. Memiliki catatan riwayat transaksi aktif di menu Penerimaan (BOS) maupun Penyaluran/Pengeluaran.
 *
 * Baris "hantu" yang tidak memiliki relasi ke Master yang valid atau tidak memiliki riwayat transaksi di-filter keluar.
 */
export function sanitizeMutationReport<T extends MutationRowItem>(
  mutationRows: T[],
  masterBarangList: Barang[],
  penerimaanList: TransaksiPenerimaan[],
  pengeluaranList: TransaksiPengeluaran[]
): T[] {
  // 1. Buat set ID barang yang valid dan aktif di master barang
  const validItemIds = new Set<string>();
  const validMasterKeys = new Set<string>();
  const masterStockMap = new Map<string, number>();

  masterBarangList.forEach(item => {
    if (item.id) {
      validItemIds.add(item.id);
      const stock = Math.max(0, Number(item.stokSekarang ?? item.stokAwal ?? 0));
      masterStockMap.set(item.id, stock);
    }
    const key = buildMergeKey(item);
    validMasterKeys.add(key);
  });

  // 2. Buat set ID dan key barang yang aktif dalam riwayat transaksi (Penerimaan & Pengeluaran)
  const activeTransactionItemIds = new Set<string>();
  const activeTransactionKeys = new Set<string>();

  penerimaanList.forEach(trx => {
    trx.items?.forEach(i => {
      const qty = Number(i.jumlahMasuk) || 0;
      if (qty > 0) {
        if (i.barangId) activeTransactionItemIds.add(i.barangId);
        activeTransactionKeys.add(buildMergeKey(i));
      }
    });
  });

  pengeluaranList.forEach(trx => {
    trx.items?.forEach(i => {
      const qty = Number(i.usulanJumlah) || 0;
      if (qty > 0) {
        if (i.barangId) activeTransactionItemIds.add(i.barangId);
        activeTransactionKeys.add(buildMergeKey(i));
      }
    });
  });

  // 3. Saring laporan mutasi
  return mutationRows.filter(row => {
    const rowId = row.barangId || row.id || '';
    const rowKey = buildMergeKey(row);

    // Periksa apakah ID tercatat di Master
    let hasMaster = validItemIds.has(rowId) || validMasterKeys.has(rowKey);
    if (!hasMaster && Array.isArray(row.matchedBarangIds)) {
      hasMaster = row.matchedBarangIds.some(id => validItemIds.has(id));
    }

    // Periksa apakah aktif bertransaksi (Penerimaan / Pengeluaran)
    let hasTransaction = activeTransactionItemIds.has(rowId) || activeTransactionKeys.has(rowKey);
    if (!hasTransaction && Array.isArray(row.matchedBarangIds)) {
      hasTransaction = row.matchedBarangIds.some(id => activeTransactionItemIds.has(id));
    }
    if (!hasTransaction) {
      const inVol = Number(row.totalMasukVolume) || 0;
      const outVol = Number(row.totalKeluarVolume) || 0;
      if (inVol > 0 || outVol > 0) {
        hasTransaction = true;
      }
    }

    // Periksa stok fisik
    const stockFromMaster = rowId ? (masterStockMap.get(rowId) || 0) : 0;
    const stockAkhir = Number(row.saldoAkhirVolume ?? row.stokAkhir ?? row.stokSekarang ?? row.stok ?? 0);
    const saldoAwal = Number(row.saldoAwalVolume ?? 0);
    const hasStock = stockAkhir > 0 || saldoAwal > 0 || stockFromMaster > 0;

    // Hapus data jika mutasi mencatat 0 di semua sisi dan tidak memiliki relasi master/transaksi aktif
    return (hasMaster && (hasStock || hasTransaction)) || (hasTransaction && hasStock) || (hasTransaction);
  });
}

export interface DataAnomalyAudit {
  totalMasterBarang: number;
  totalUniqueGroups: number;
  potentialDuplicatesCount: number;
  orphanTransactionsCount: number;
  stockDiscrepanciesCount: number;
  duplicateGroupList: {
    key: string;
    namaBarang: string;
    kodeRekening: string;
    hargaSatuan: number;
    count: number;
    items: Barang[];
  }[];
  discrepancyList: {
    barang: Barang;
    recordedStock: number;
    computedStock: number;
    diff: number;
    totalMasuk: number;
    totalKeluar: number;
  }[];
}

/**
 * Memeriksa potensi kerentanan dan anomali data di tabel Master & Transaksi
 */
export function auditDataAnomalies(
  masterBarang: Barang[],
  transaksiList: TransaksiPengeluaran[],
  penerimaanList: TransaksiPenerimaan[]
): DataAnomalyAudit {
  // 1. Grouping duplicates in Master Barang
  const groupMap = new Map<string, Barang[]>();
  masterBarang.forEach(item => {
    const key = buildMergeKey(item);
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(item);
  });

  const duplicateGroupList: DataAnomalyAudit['duplicateGroupList'] = [];
  let potentialDuplicatesCount = 0;

  groupMap.forEach((items, key) => {
    if (items.length > 1) {
      potentialDuplicatesCount += (items.length - 1);
      duplicateGroupList.push({
        key,
        namaBarang: items[0].namaBarang,
        kodeRekening: items[0].kodeRekening,
        hargaSatuan: items[0].hargaSatuan,
        count: items.length,
        items
      });
    }
  });

  // 2. Identify active valid item IDs
  const validMasterIds = new Set(masterBarang.map(b => b.id));

  let orphanTransactionsCount = 0;
  penerimaanList.forEach(trx => {
    trx.items?.forEach(it => {
      if (it.barangId && !validMasterIds.has(it.barangId)) {
        orphanTransactionsCount++;
      }
    });
  });
  transaksiList.forEach(trx => {
    trx.items?.forEach(it => {
      if (it.barangId && !validMasterIds.has(it.barangId)) {
        orphanTransactionsCount++;
      }
    });
  });

  // 3. Check stock discrepancies
  // Compute incoming and outgoing per key
  const inMap = new Map<string, number>();
  const outMap = new Map<string, number>();

  penerimaanList.forEach(trx => {
    trx.items?.forEach(it => {
      const key = buildMergeKey(it);
      inMap.set(key, (inMap.get(key) || 0) + (Number(it.jumlahMasuk) || 0));
    });
  });

  transaksiList.forEach(trx => {
    trx.items?.forEach(it => {
      const key = buildMergeKey(it);
      outMap.set(key, (outMap.get(key) || 0) + (Number(it.usulanJumlah) || 0));
    });
  });

  const discrepancyList: DataAnomalyAudit['discrepancyList'] = [];
  masterBarang.forEach(barang => {
    const key = buildMergeKey(barang);
    const masuk = inMap.get(key) || 0;
    const keluar = outMap.get(key) || 0;
    const computed = Math.max(0, (Number(barang.stokAwal) || 0) + masuk - keluar);
    const recorded = Number(barang.stokSekarang ?? barang.stokAwal ?? 0);

    if (computed !== recorded) {
      discrepancyList.push({
        barang,
        recordedStock: recorded,
        computedStock: computed,
        diff: computed - recorded,
        totalMasuk: masuk,
        totalKeluar: keluar
      });
    }
  });

  return {
    totalMasterBarang: masterBarang.length,
    totalUniqueGroups: groupMap.size,
    potentialDuplicatesCount,
    orphanTransactionsCount,
    stockDiscrepanciesCount: discrepancyList.length,
    duplicateGroupList,
    discrepancyList
  };
}

export interface CleanupResult {
  success: boolean;
  cleanedMaster: Barang[];
  cleanedPengeluaran: TransaksiPengeluaran[];
  cleanedPenerimaan: TransaksiPenerimaan[];
  duplicatesMergedCount: number;
  orphansPurgedCount: number;
  stockRecalculatedCount: number;
  summaryMessage: string;
}

/**
 * Eksekusi Pembersihan Data Anomali, Duplikasi, dan Rekalkulasi Stok Otomatis
 * Serta menyimpan kembali hasil bersih ke LocalStorage
 */
export function executeDataSanityAndCleanup(
  rawMasterBarang: Barang[],
  rawPengeluaranList: TransaksiPengeluaran[],
  rawPenerimaanList: TransaksiPenerimaan[],
  currentUser?: { id: string; username: string; nama: string; role: UserRole }
): CleanupResult {
  // 1. Group Master Barang by Unique Key: Nama + Kode Rekening + Harga
  const groupMap = new Map<string, Barang[]>();
  rawMasterBarang.forEach(item => {
    if (!item.namaBarang?.trim()) return; // skip corrupt items with no name
    const key = buildMergeKey(item);
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(item);
  });

  let duplicatesMergedCount = 0;
  const idRemapTable = new Map<string, string>(); // oldId -> primaryId
  const uniqueMasterList: Barang[] = [];

  groupMap.forEach((items) => {
    if (items.length === 1) {
      uniqueMasterList.push({ ...items[0] });
      idRemapTable.set(items[0].id, items[0].id);
    } else {
      duplicatesMergedCount += (items.length - 1);

      // Prioritas Primary: memiliki kodeBarang/nusp atau stok tertinggi
      items.sort((a, b) => {
        if (a.kodeBarang && !b.kodeBarang) return -1;
        if (!a.kodeBarang && b.kodeBarang) return 1;
        return (Number(b.stokAwal) || 0) - (Number(a.stokAwal) || 0);
      });

      const primary = { ...items[0] };
      let accumulatedStokAwal = 0;

      items.forEach(it => {
        accumulatedStokAwal += Math.max(0, Number(it.stokAwal) || 0);
        idRemapTable.set(it.id, primary.id);
      });

      primary.stokAwal = accumulatedStokAwal;
      uniqueMasterList.push(primary);
    }
  });

  // 2. Sanitasi & Remap Transaksi Penerimaan
  let orphansPurgedCount = 0;
  const cleanedPenerimaan: TransaksiPenerimaan[] = [];
  const seenPenerimaanKeys = new Set<string>();

  rawPenerimaanList.forEach(trx => {
    if (!trx.tanggal) return;
    const trxSig = trx.id ? `id_${trx.id}` : `${trx.noBukti}_${trx.tanggal}_${trx.penyedia}`;
    if (seenPenerimaanKeys.has(trxSig)) {
      orphansPurgedCount++;
      return;
    }
    seenPenerimaanKeys.add(trxSig);

    const validItems = (trx.items || []).filter(i => {
      const qty = Number(i.jumlahMasuk) || 0;
      return i.namaBarang?.trim() && qty > 0;
    }).map(i => {
      const primaryId = (i.barangId && idRemapTable.get(i.barangId)) || i.barangId;
      return {
        ...i,
        barangId: primaryId || ''
      };
    });

    if (validItems.length > 0) {
      cleanedPenerimaan.push({
        ...trx,
        items: validItems
      });
    } else {
      orphansPurgedCount++;
    }
  });

  // 3. Sanitasi & Remap Transaksi Penyaluran / Pengeluaran
  const cleanedPengeluaran: TransaksiPengeluaran[] = [];
  const seenPengeluaranKeys = new Set<string>();

  rawPengeluaranList.forEach(trx => {
    if (!trx.tanggal) return;
    const trxSig = trx.id ? `id_${trx.id}` : `${trx.noSPPB}_${trx.noBAST}_${trx.tanggal}_${trx.unitPemohon}`;
    if (seenPengeluaranKeys.has(trxSig)) {
      orphansPurgedCount++;
      return;
    }
    seenPengeluaranKeys.add(trxSig);

    const validItems = (trx.items || []).filter(i => {
      const qty = Number(i.usulanJumlah) || 0;
      return i.namaBarang?.trim() && qty > 0;
    }).map(i => {
      const primaryId = (i.barangId && idRemapTable.get(i.barangId)) || i.barangId;
      return {
        ...i,
        barangId: primaryId || ''
      };
    });

    if (validItems.length > 0) {
      cleanedPengeluaran.push({
        ...trx,
        items: validItems
      });
    } else {
      orphansPurgedCount++;
    }
  });

  // 4. Rekalkulasi Stok Riil (Re-calculate Stock)
  // Stok Sekarang = Stok Awal + Sum(Penerimaan) - Sum(Pengeluaran)
  const totalMasukPerKey = new Map<string, number>();
  const totalKeluarPerKey = new Map<string, number>();

  cleanedPenerimaan.forEach(trx => {
    trx.items.forEach(it => {
      const key = buildMergeKey(it);
      totalMasukPerKey.set(key, (totalMasukPerKey.get(key) || 0) + (Number(it.jumlahMasuk) || 0));
    });
  });

  cleanedPengeluaran.forEach(trx => {
    trx.items.forEach(it => {
      const key = buildMergeKey(it);
      totalKeluarPerKey.set(key, (totalKeluarPerKey.get(key) || 0) + (Number(it.usulanJumlah) || 0));
    });
  });

  let stockRecalculatedCount = 0;
  const finalCleanedMaster = uniqueMasterList.map(barang => {
    const key = buildMergeKey(barang);
    const totalMasuk = totalMasukPerKey.get(key) || 0;
    const totalKeluar = totalKeluarPerKey.get(key) || 0;
    const newStok = Math.max(0, (Number(barang.stokAwal) || 0) + totalMasuk - totalKeluar);

    if (newStok !== barang.stokSekarang) {
      stockRecalculatedCount++;
    }

    return {
      ...barang,
      stokSekarang: newStok
    };
  });

  // 5. Persist to localStorage
  try {
    localStorage.setItem('simba_master_barang', JSON.stringify(finalCleanedMaster));
    localStorage.setItem('simba_transaksi_list', JSON.stringify(cleanedPengeluaran));
    localStorage.setItem('simba_penyaluran', JSON.stringify(cleanedPengeluaran));
    localStorage.setItem('simba_penerimaan_list', JSON.stringify(cleanedPenerimaan));
    localStorage.setItem('simba_penerimaan', JSON.stringify(cleanedPenerimaan));
  } catch (err) {
    console.error('Failed to write cleaned data to localStorage:', err);
  }

  // 6. Audit Logging
  if (currentUser) {
    logAuditEvent({
      userId: currentUser.id,
      username: currentUser.username,
      userName: currentUser.nama,
      userRole: currentUser.role,
      action: 'UPDATE_SETTINGS',
      title: 'Pembersihan Data Anomali & Rekalkulasi Stok',
      details: `Berhasil menggabungkan ${duplicatesMergedCount} data ganda, membersihkan ${orphansPurgedCount} transaksi yatim/duplikat, dan mengalibrasi ulang stok ${stockRecalculatedCount} barang.`,
      status: 'SUCCESS'
    });
  }

  const summaryMessage = `Pembersihan berhasil! ${duplicatesMergedCount} data ganda digabungkan, ${orphansPurgedCount} entri yatim dibersihkan, dan ${stockRecalculatedCount} stok barang berhasil dikalibrasi ulang secara akurat.`;

  return {
    success: true,
    cleanedMaster: finalCleanedMaster,
    cleanedPengeluaran,
    cleanedPenerimaan,
    duplicatesMergedCount,
    orphansPurgedCount,
    stockRecalculatedCount,
    summaryMessage
  };
}

/**
 * Reset Cache Darurat & Muat Ulang Database Lokal
 */
export function executeEmergencyCacheReset(): void {
  // Simpan data kredensial dan sesi sementara agar pengguna tidak terputus paksa jika tidak diinginkan
  const currentAuth = localStorage.getItem('simba_auth_session');
  const currentUserId = localStorage.getItem('simba_current_user_id');

  // Bersihkan data lokal yang rentan korup
  localStorage.removeItem('simba_master_barang');
  localStorage.removeItem('simba_transaksi_list');
  localStorage.removeItem('simba_penyaluran');
  localStorage.removeItem('simba_penerimaan_list');
  localStorage.removeItem('simba_penerimaan');
  localStorage.removeItem('simba_kategori_list');

  // Kembalikan token auth
  if (currentAuth) localStorage.setItem('simba_auth_session', currentAuth);
  if (currentUserId) localStorage.setItem('simba_current_user_id', currentUserId);

  // Reload browser to rehydrate default seeds cleanly
  window.location.reload();
}
