import { Barang, KopSuratConfig, TransaksiPenerimaan, TransaksiPengeluaran } from '../types';

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
 */
export function calculateMutasiBOSData(
  masterBarang: Barang[],
  transaksiPengeluaranList: TransaksiPengeluaran[],
  transaksiPenerimaanList: TransaksiPenerimaan[],
  kopConfig: KopSuratConfig,
  targetYear: number = 2026
): MutasiBOSCalculationResult {
  const dynamicSchool = kopConfig?.namaSekolah?.trim() || 'SMAN 1 CIHAURBEUTI';

  // 1. Filter transaksi berdasarkan tahun
  const penerimaanTahunIni = (transaksiPenerimaanList || []).filter(p => {
    if (!p.tanggal) return false;
    const y = new Date(p.tanggal).getFullYear();
    return y === targetYear;
  });

  const pengeluaranTahunIni = (transaksiPengeluaranList || []).filter(t => {
    if (!t.tanggal) return false;
    const y = new Date(t.tanggal).getFullYear();
    return y === targetYear;
  });

  // 2. Eksklusi Belanja Modal: Laporan Mutasi BHP BOS hanya memuat Barang Habis Pakai (BHP)
  // Barang dengan status Belanja Modal secara otomatis DIKECUALIKAN
  const masterBarangBHP = (masterBarang || []).filter(b => b.jenisBarang !== 'Belanja Modal');

  const groupedMap = new Map<string, { namaRekening: string; items: Barang[] }>();

  masterBarangBHP.forEach(b => {
    const kodering = b.kodeRekening || '5.1.02.01.01.0024';
    const namaRekening = b.namaRekening || 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor';
    if (!groupedMap.has(kodering)) {
      groupedMap.set(kodering, { namaRekening, items: [] });
    }
    groupedMap.get(kodering)!.items.push(b);
  });

  // Urutkan kode rekening
  const sortedKoderings = Array.from(groupedMap.keys()).sort();

  const kelompokRekening: KelompokKodeRekening[] = [];

  sortedKoderings.forEach(kodering => {
    const group = groupedMap.get(kodering)!;
    const itemsResult: MutasiBarangItem[] = [];

    // Subtotal penampung
    let subtotalSaldoAwal = 0;
    const subtotalBulanan = NAMA_BULAN.map((namaBulan, bulanIndex) => ({
      bulanIndex,
      namaBulan,
      totalMasukRp: 0,
      totalKeluarRp: 0,
      totalSaldoAkhirRp: 0,
    }));

    group.items.forEach(barang => {
      const saldoAwalVolume = barang.stokAwal || 0;
      const hargaSatuan = barang.hargaSatuan || 0;
      const saldoAwalJumlahRp = saldoAwalVolume * hargaSatuan;
      subtotalSaldoAwal += saldoAwalJumlahRp;

      let runningVolume = saldoAwalVolume;
      const mutasiBulanan: MutasiBulanDetail[] = [];

      for (let m = 0; m < 12; m++) {
        // Cari barang masuk pada bulan m dengan validasi relasi langsung ke Tabel Penerimaan
        let masukVol = 0;
        let masukRp = 0;
        let hasRealPenerimaanTrx = false;

        penerimaanTahunIni.forEach(p => {
          const dt = new Date(p.tanggal);
          if (dt.getMonth() === m) {
            p.items?.forEach(it => {
              // 1. Validasi kecocokan barang (ID, Kode, atau Nama)
              const isIdMatch = Boolean(it.barangId && it.barangId === barang.id);
              const isCodeMatch = Boolean(it.kodeBarang && barang.kodeBarang && it.kodeBarang === barang.kodeBarang);
              const isNameMatch = Boolean(it.namaBarang && barang.namaBarang && it.namaBarang.toLowerCase().trim() === barang.namaBarang.toLowerCase().trim());
              
              // 2. Validasi keterikatan Kode Rekening (mencegah phantom inter-kodering cross match)
              const isRekeningMatch = !it.kodeRekening || it.kodeRekening === kodering;

              if ((isIdMatch || isCodeMatch || isNameMatch) && isRekeningMatch && it.jumlahMasuk > 0) {
                hasRealPenerimaanTrx = true;
                masukVol += it.jumlahMasuk;
                const effectivePrice = it.hargaSatuan && it.hargaSatuan > 0 ? it.hargaSatuan : hargaSatuan;
                masukRp += (it.jumlahMasuk * effectivePrice);
              }
            });
          }
        });

        // Validasi anti-phantom: Jika tidak ada transaksi penerimaan riil pada bulan bersangkutan, paksa 0
        if (!hasRealPenerimaanTrx) {
          masukVol = 0;
          masukRp = 0;
        }

        // Cari barang keluar pada bulan m dengan validasi relasi langsung ke Tabel Pengeluaran (SPB/BAST)
        let keluarVol = 0;
        let keluarRp = 0;
        let hasRealPengeluaranTrx = false;

        pengeluaranTahunIni.forEach(t => {
          const dt = new Date(t.tanggal);
          if (dt.getMonth() === m) {
            t.items?.forEach(it => {
              const isIdMatch = Boolean(it.barangId && it.barangId === barang.id);
              const isCodeMatch = Boolean(it.kodeBarang && barang.kodeBarang && it.kodeBarang === barang.kodeBarang);
              const isNameMatch = Boolean(it.namaBarang && barang.namaBarang && it.namaBarang.toLowerCase().trim() === barang.namaBarang.toLowerCase().trim());

              const isRekeningMatch = !it.kodeRekening || it.kodeRekening === kodering;

              if ((isIdMatch || isCodeMatch || isNameMatch) && isRekeningMatch && (it.usulanJumlah || 0) > 0) {
                hasRealPengeluaranTrx = true;
                const qty = it.usulanJumlah || 0;
                const effectivePrice = it.hargaSatuan && it.hargaSatuan > 0 ? it.hargaSatuan : hargaSatuan;
                keluarVol += qty;
                keluarRp += (qty * effectivePrice);
              }
            });
          }
        });

        // Validasi anti-phantom: Jika tidak ada transaksi pengeluaran riil pada bulan bersangkutan, paksa 0
        if (!hasRealPengeluaranTrx) {
          keluarVol = 0;
          keluarRp = 0;
        }

        // Saldo akhir bulan m
        runningVolume = Math.max(0, runningVolume + masukVol - keluarVol);
        const saldoAkhirRp = runningVolume * hargaSatuan;

        mutasiBulanan.push({
          bulanIndex: m,
          namaBulan: NAMA_BULAN[m],
          masukVolume: masukVol,
          masukSatuan: barang.satuan,
          masukHargaSatuan: hargaSatuan,
          masukJumlahRp: masukRp,
          keluarVolume: keluarVol,
          keluarSatuan: barang.satuan,
          keluarHargaSatuan: hargaSatuan,
          keluarJumlahRp: keluarRp,
          saldoAkhirVolume: runningVolume,
          saldoAkhirSatuan: barang.satuan,
          saldoAkhirHargaSatuan: hargaSatuan,
          saldoAkhirJumlahRp: saldoAkhirRp,
        });

        // Akumulasikan ke subtotal rekening
        subtotalBulanan[m].totalMasukRp += masukRp;
        subtotalBulanan[m].totalKeluarRp += keluarRp;
        subtotalBulanan[m].totalSaldoAkhirRp += saldoAkhirRp;
      }

      itemsResult.push({
        id: barang.id,
        kodeBarang: barang.kodeBarang,
        namaBarang: barang.namaBarang,
        kodeRekening: kodering,
        namaRekening: group.namaRekening,
        satuan: barang.satuan,
        hargaSatuan,
        saldoAwalVolume,
        saldoAwalSatuan: barang.satuan,
        saldoAwalHargaSatuan: hargaSatuan,
        saldoAwalJumlahRp,
        mutasiBulanan,
        keterangan: barang.spesifikasi || barang.lokasiGudang || '',
      });
    });

    // Validasi Rekapitulasi Tingkat Kodering:
    // Pastikan jika tidak ada transaksi riil masuk/keluar untuk kodering ini, nominal dipaksa 0 secara konsisten
    for (let m = 0; m < 12; m++) {
      let anyPenerimaanThisKodering = false;
      penerimaanTahunIni.forEach(p => {
        const dt = new Date(p.tanggal);
        if (dt.getMonth() === m) {
          p.items?.forEach(it => {
            const matchKodering = it.kodeRekening === kodering || group.items.some(b => b.id === it.barangId);
            if (matchKodering && it.jumlahMasuk > 0) anyPenerimaanThisKodering = true;
          });
        }
      });

      let anyPengeluaranThisKodering = false;
      pengeluaranTahunIni.forEach(t => {
        const dt = new Date(t.tanggal);
        if (dt.getMonth() === m) {
          t.items?.forEach(it => {
            const matchKodering = it.kodeRekening === kodering || group.items.some(b => b.id === it.barangId);
            if (matchKodering && (it.usulanJumlah || 0) > 0) anyPengeluaranThisKodering = true;
          });
        }
      });

      if (!anyPenerimaanThisKodering) {
        subtotalBulanan[m].totalMasukRp = 0;
      }
      if (!anyPengeluaranThisKodering) {
        subtotalBulanan[m].totalKeluarRp = 0;
      }
    }

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
