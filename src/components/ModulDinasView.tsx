import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  BookOpen,
  Boxes,
  Building,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Copy,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe2,
  GraduationCap,
  Info,
  Layers,
  MapPin,
  Percent,
  Phone,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {
  AppUser,
  Barang,
  PaperSize,
  Pejabat,
  Sekolah,
  TAHUN_ANGGARAN_OPTIONS,
  TransaksiPenerimaan,
  TransaksiPengeluaran
} from '../types';
import { DinasMutasiBhpReport } from './dinas/DinasMutasiBhpReport';
import { formatRupiah, formatTanggalIndonesia, safeNumber } from '../utils/numberGenerator';

interface Props {
  sekolahList: Sekolah[];
  allMasterBarang: Barang[];
  allTransaksi: TransaksiPengeluaran[];
  allPenerimaan: TransaksiPenerimaan[];
  allPejabat: Pejabat[];
  currentUser: AppUser;
  onSelectSekolah: (sekolahId: string) => void;
  paperSize?: PaperSize;
  showToast: (msg: string) => void;
}

export type PeriodMode = 'year' | 'sem1' | 'sem2' | 'tw1' | 'tw2' | 'tw3' | 'tw4' | 'month';

export interface MutasiDinasItem {
  id: string;
  sekolahId: string;
  namaSekolah: string;
  npsn: string;
  kodeBarang: string;
  namaBarang: string;
  spesifikasi?: string;
  kodeRekening: string;
  namaRekening: string;
  satuan: string;
  hargaSatuan: number;
  jenisBarang: string;
  // Perhitungan Mutasi Terpisah: Kuantitas (Vol) & Nilai Rupiah (Rp)
  saldoAwalVol: number;
  saldoAwalRp: number;
  masukVol: number;
  masukRp: number;
  keluarVol: number;
  keluarRp: number;
  saldoAkhirVol: number;
  saldoAkhirRp: number;
  rasioPenyaluran: number; // %
}

export interface SchoolSummary {
  sekolahId: string;
  namaSekolah: string;
  npsn: string;
  jenjang: string;
  status: string;
  kabupatenKota: string;
  alamat?: string;
  telepon?: string;
  email?: string;
  totalJenisBarang: number;
  totalSaldoAwalRp: number;
  totalMasukRp: number;
  totalKeluarRp: number;
  totalSaldoAkhirRp: number;
  rasioPenyaluran: number;
  jumlahTransaksiPenerimaan: number;
  jumlahTransaksiPengeluaran: number;
}

/**
 * Helper to safely extract date components
 */
function parseDateParts(dateStr?: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return {
    year: d.getFullYear(),
    month: d.getMonth(), // 0 to 11
    day: d.getDate()
  };
}

/**
 * Checks whether a transaction occurred prior to the current selected period.
 * Used for carrying over prior inflows/outflows to calculate Period Saldo Awal.
 */
function isTransactionPrior(dateStr: string | undefined, targetYear: number, startM: number): boolean {
  const parts = parseDateParts(dateStr);
  if (!parts) return false;
  if (parts.year < targetYear) return true;
  if (parts.year === targetYear && parts.month < startM) return true;
  return false;
}

/**
 * Checks whether a transaction occurred during the current selected period.
 */
function isTransactionInPeriod(dateStr: string | undefined, targetYear: number, startM: number, endM: number): boolean {
  const parts = parseDateParts(dateStr);
  if (!parts) return false;
  if (parts.year !== targetYear) return false;
  return parts.month >= startM && parts.month <= endM;
}

/**
 * Robust cross-matching between transaction items and barang with multi-tenant isolation.
 */
function isItemMatchingBarang(it: any, b: Barang, transactionSchoolId?: string): boolean {
  if (transactionSchoolId && b.sekolah_id && transactionSchoolId !== b.sekolah_id) {
    return false;
  }
  if (it.barangId && it.barangId === b.id) {
    return true;
  }
  if (it.kodeBarang && b.kodeBarang && it.kodeBarang === b.kodeBarang) {
    return true;
  }
  if (it.namaBarang && b.namaBarang && it.namaBarang.toLowerCase().trim() === b.namaBarang.toLowerCase().trim()) {
    return true;
  }
  return false;
}

export const ModulDinasView: React.FC<Props> = ({
  sekolahList,
  allMasterBarang,
  allTransaksi,
  allPenerimaan,
  allPejabat,
  currentUser,
  onSelectSekolah,
  paperSize = 'A4',
  showToast
}) => {
  const [selectedSekolahFilter, setSelectedSekolahFilter] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('year');
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // 8 = September
  const [filterJenis, setFilterJenis] = useState<'all' | 'BHP' | 'Belanja Modal'>('all');
  const [filterKodering, setFilterKodering] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'mutasi12bulan' | 'tabel' | 'ranking' | 'cetak'>('mutasi12bulan');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Supervisi Modal State (Requirement 24.14)
  const [supervisiSekolah, setSupervisiSekolah] = useState<Sekolah | null>(null);
  const [supervisiNotes, setSupervisiNotes] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('simba_supervisi_notes') || '{}');
    } catch {
      return {};
    }
  });
  const [currentNoteInput, setCurrentNoteInput] = useState<string>('');

  // Determine active month range
  const { startMonth, endMonth } = useMemo(() => {
    switch (periodMode) {
      case 'year':
        return { startMonth: 0, endMonth: 11 };
      case 'sem1':
        return { startMonth: 0, endMonth: 5 };
      case 'sem2':
        return { startMonth: 6, endMonth: 11 };
      case 'tw1':
        return { startMonth: 0, endMonth: 2 };
      case 'tw2':
        return { startMonth: 3, endMonth: 5 };
      case 'tw3':
        return { startMonth: 6, endMonth: 8 };
      case 'tw4':
        return { startMonth: 9, endMonth: 11 };
      case 'month':
        return { startMonth: selectedMonth, endMonth: selectedMonth };
      default:
        return { startMonth: 0, endMonth: 11 };
    }
  }, [periodMode, selectedMonth]);

  const periodLabel = useMemo<string>(() => {
    switch (periodMode) {
      case 'year':
        return `Tahun Anggaran ${selectedYear} (Januari - Desember)`;
      case 'sem1':
        return `Semester I TA ${selectedYear} (Januari - Juni)`;
      case 'sem2':
        return `Semester II TA ${selectedYear} (Juli - Desember)`;
      case 'tw1':
        return `Triwulan I TA ${selectedYear} (Januari - Maret)`;
      case 'tw2':
        return `Triwulan II TA ${selectedYear} (April - Juni)`;
      case 'tw3':
        return `Triwulan III TA ${selectedYear} (Juli - September)`;
      case 'tw4':
        return `Triwulan IV TA ${selectedYear} (Oktober - Desember)`;
      case 'month':
        const names = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return `Bulan ${names[selectedMonth]} ${selectedYear}`;
      default:
        return `Tahun ${selectedYear}`;
    }
  }, [periodMode, selectedMonth, selectedYear]);

  // Lookup helper for school metadata
  const schoolMap = useMemo(() => {
    const map = new Map<string, Sekolah>();
    sekolahList.forEach(s => map.set(s.id, s));
    return map;
  }, [sekolahList]);

  // Unique list of koderings for filter
  const uniqueKoderings = useMemo(() => {
    const map = new Map<string, string>();
    allMasterBarang.forEach(b => {
      if (b.kodeRekening && b.namaRekening) {
        map.set(b.kodeRekening, b.namaRekening);
      }
    });
    return Array.from(map.entries()).map(([kode, nama]) => ({ kode, nama }));
  }, [allMasterBarang]);

  // Calculate detailed mutations across all or filtered schools (Zero NaN Data Flow)
  const detailedMutasiList = useMemo<MutasiDinasItem[]>(() => {
    return allMasterBarang
      .filter(b => {
        // Multi-Tenant School filter
        if (selectedSekolahFilter !== 'all' && b.sekolah_id !== selectedSekolahFilter) {
          return false;
        }
        // Jenis Barang filter
        if (filterJenis !== 'all') {
          const isModal = b.jenisBarang === 'Belanja Modal';
          if (filterJenis === 'Belanja Modal' && !isModal) return false;
          if (filterJenis === 'BHP' && isModal) return false;
        }
        // Kodering filter
        if (filterKodering !== 'all' && b.kodeRekening !== filterKodering) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const sch = schoolMap.get(b.sekolah_id || '');
          const matchBarang = (b.namaBarang || '').toLowerCase().includes(q) ||
            (b.kodeBarang || '').toLowerCase().includes(q) ||
            (b.kodeRekening || '').toLowerCase().includes(q) ||
            (b.namaRekening || '').toLowerCase().includes(q) ||
            (b.spesifikasi || '').toLowerCase().includes(q);
          const matchSchool = sch && (
            (sch.nama || '').toLowerCase().includes(q) ||
            (sch.npsn || '').includes(q)
          );
          if (!matchBarang && !matchSchool) return false;
        }
        return true;
      })
      .map(b => {
        const sch = schoolMap.get(b.sekolah_id || '');
        const namaSekolah = sch?.nama || sch?.nama_sekolah || 'SATUAN PENDIDIKAN RESMI';
        const npsn = sch?.npsn || '20231945';
        const baseStokAwal = safeNumber(b.stokAwal, 0);
        const hargaSatuan = safeNumber(b.hargaSatuan, 0);

        // 1. Calculate prior mutasi before active period start for Saldo Awal carryover
        let priorMasukVol = 0;
        let priorKeluarVol = 0;

        allPenerimaan.forEach(p => {
          if (p.sekolah_id && b.sekolah_id && p.sekolah_id !== b.sekolah_id) return;
          if (isTransactionPrior(p.tanggal, selectedYear, startMonth)) {
            p.items?.forEach(it => {
              if (isItemMatchingBarang(it, b, p.sekolah_id)) {
                priorMasukVol += safeNumber(it.jumlahMasuk ?? (it as any).jumlah, 0);
              }
            });
          }
        });

        allTransaksi.forEach(t => {
          if (t.sekolah_id && b.sekolah_id && t.sekolah_id !== b.sekolah_id) return;
          if (isTransactionPrior(t.tanggal, selectedYear, startMonth)) {
            t.items?.forEach(it => {
              if (isItemMatchingBarang(it, b, t.sekolah_id)) {
                priorKeluarVol += safeNumber(it.usulanJumlah ?? (it as any).jumlahDisetujui ?? (it as any).jumlahDiminta ?? (it as any).jumlah, 0);
              }
            });
          }
        });

        // Safe Saldo Awal at the start of the active period
        const saldoAwalVol = Math.max(0, baseStokAwal + priorMasukVol - priorKeluarVol);
        const saldoAwalRp = saldoAwalVol * hargaSatuan;

        // 2. Calculate Masuk (Penerimaan) strictly within active period
        let masukVol = 0;
        let masukRp = 0;

        allPenerimaan.forEach(p => {
          if (p.sekolah_id && b.sekolah_id && p.sekolah_id !== b.sekolah_id) return;
          if (isTransactionInPeriod(p.tanggal, selectedYear, startMonth, endMonth)) {
            p.items?.forEach(it => {
              if (isItemMatchingBarang(it, b, p.sekolah_id)) {
                const qty = safeNumber(it.jumlahMasuk ?? (it as any).jumlah, 0);
                const price = safeNumber(it.hargaSatuan, hargaSatuan);
                masukVol += qty;
                masukRp += (qty * price);
              }
            });
          }
        });

        // 3. Calculate Keluar (Penyaluran / Realisasi) strictly within active period
        let keluarVol = 0;
        let keluarRp = 0;

        allTransaksi.forEach(t => {
          if (t.sekolah_id && b.sekolah_id && t.sekolah_id !== b.sekolah_id) return;
          if (isTransactionInPeriod(t.tanggal, selectedYear, startMonth, endMonth)) {
            t.items?.forEach(it => {
              if (isItemMatchingBarang(it, b, t.sekolah_id)) {
                const qty = safeNumber(it.usulanJumlah ?? (it as any).jumlahDisetujui ?? (it as any).jumlahDiminta ?? (it as any).jumlah, 0);
                const price = safeNumber(it.hargaSatuan, hargaSatuan);
                keluarVol += qty;
                keluarRp += (qty * price);
              }
            });
          }
        });

        // 4. Saldo Akhir = Saldo Awal + Masuk - Keluar (Formula Intact)
        const saldoAkhirVol = Math.max(0, saldoAwalVol + masukVol - keluarVol);
        const saldoAkhirRp = saldoAkhirVol * hargaSatuan;

        // 5. Rasio Penyerapan (%) = Penyaluran / (Saldo Awal + Masuk)
        const totalKetersediaan = saldoAwalVol + masukVol;
        const rasioPenyaluran = totalKetersediaan > 0 ? Math.round((keluarVol / totalKetersediaan) * 100) : 0;

        return {
          id: b.id,
          sekolahId: b.sekolah_id || 'sekolah-default',
          namaSekolah,
          npsn,
          kodeBarang: b.kodeBarang || '1.01.03.01.01',
          namaBarang: b.namaBarang || 'Barang Persediaan',
          spesifikasi: b.spesifikasi || '',
          kodeRekening: b.kodeRekening || '5.1.02.01.01.0024',
          namaRekening: b.namaRekening || 'Belanja Alat Tulis Kantor',
          satuan: b.satuan || 'Pcs',
          hargaSatuan,
          jenisBarang: b.jenisBarang || 'BHP',
          saldoAwalVol,
          saldoAwalRp,
          masukVol,
          masukRp,
          keluarVol,
          keluarRp,
          saldoAkhirVol,
          saldoAkhirRp,
          rasioPenyaluran: isNaN(rasioPenyaluran) || !isFinite(rasioPenyaluran) ? 0 : rasioPenyaluran
        };
      });
  }, [
    allMasterBarang,
    allTransaksi,
    allPenerimaan,
    selectedSekolahFilter,
    selectedYear,
    startMonth,
    endMonth,
    filterJenis,
    filterKodering,
    searchQuery,
    schoolMap
  ]);

  // Aggregate Executive Statistics (Tingkat Wilayah / Dinas)
  const grandTotal = useMemo(() => {
    let awalRp = 0;
    let masukRp = 0;
    let keluarRp = 0;
    let akhirRp = 0;
    let totalMasukVol = 0;
    let totalKeluarVol = 0;

    detailedMutasiList.forEach(item => {
      awalRp += safeNumber(item.saldoAwalRp, 0);
      masukRp += safeNumber(item.masukRp, 0);
      keluarRp += safeNumber(item.keluarRp, 0);
      akhirRp += safeNumber(item.saldoAkhirRp, 0);
      totalMasukVol += safeNumber(item.masukVol, 0);
      totalKeluarVol += safeNumber(item.keluarVol, 0);
    });

    const totalKetersediaan = awalRp + masukRp;
    const rasioPenyerapan = totalKetersediaan > 0 ? (keluarRp / totalKetersediaan) * 100 : 0;
    const safeRasio = isNaN(rasioPenyerapan) || !isFinite(rasioPenyerapan) ? 0 : Math.round(rasioPenyerapan * 10) / 10;

    return {
      awalRp,
      masukRp,
      keluarRp,
      akhirRp,
      totalMasukVol,
      totalKeluarVol,
      totalItem: detailedMutasiList.length,
      rasioPenyerapan: safeRasio
    };
  }, [detailedMutasiList]);

  // Separate Clear Statistics (Requirement 24.9)
  const statsCounts = useMemo(() => {
    const filteredSchools = selectedSekolahFilter === 'all'
      ? sekolahList
      : sekolahList.filter(s => s.id === selectedSekolahFilter);

    const relevantPenerimaanCount = allPenerimaan.filter(p => {
      if (selectedSekolahFilter !== 'all' && p.sekolah_id !== selectedSekolahFilter) return false;
      return isTransactionInPeriod(p.tanggal, selectedYear, startMonth, endMonth);
    }).length;

    const relevantTransaksiCount = allTransaksi.filter(t => {
      if (selectedSekolahFilter !== 'all' && t.sekolah_id !== selectedSekolahFilter) return false;
      return isTransactionInPeriod(t.tanggal, selectedYear, startMonth, endMonth);
    }).length;

    return {
      jumlahSekolah: filteredSchools.length,
      jumlahJenisBarang: detailedMutasiList.length,
      jumlahTransaksi: relevantPenerimaanCount + relevantTransaksiCount,
      jumlahBarisMutasi: detailedMutasiList.length
    };
  }, [sekolahList, selectedSekolahFilter, allPenerimaan, allTransaksi, selectedYear, startMonth, endMonth, detailedMutasiList.length]);

  // Per-School Comparative Ranking & Analytics
  const schoolComparison = useMemo<SchoolSummary[]>(() => {
    const list: SchoolSummary[] = [];

    sekolahList.forEach(sch => {
      // If single school filter is applied, only evaluate that school
      if (selectedSekolahFilter !== 'all' && sch.id !== selectedSekolahFilter) return;

      const items = detailedMutasiList.filter(it => it.sekolahId === sch.id);
      let awal = 0;
      let masuk = 0;
      let keluar = 0;
      let akhir = 0;

      items.forEach(it => {
        awal += safeNumber(it.saldoAwalRp, 0);
        masuk += safeNumber(it.masukRp, 0);
        keluar += safeNumber(it.keluarRp, 0);
        akhir += safeNumber(it.saldoAkhirRp, 0);
      });

      const totalKetersediaan = awal + masuk;
      const rasio = totalKetersediaan > 0 ? Math.round((keluar / totalKetersediaan) * 100) : 0;
      const safeRasio = isNaN(rasio) || !isFinite(rasio) ? 0 : rasio;

      const trxPenerimaanCount = allPenerimaan.filter(p => {
        if (p.sekolah_id !== sch.id) return false;
        return isTransactionInPeriod(p.tanggal, selectedYear, startMonth, endMonth);
      }).length;

      const trxPengeluaranCount = allTransaksi.filter(t => {
        if (t.sekolah_id !== sch.id) return false;
        return isTransactionInPeriod(t.tanggal, selectedYear, startMonth, endMonth);
      }).length;

      list.push({
        sekolahId: sch.id,
        namaSekolah: sch.nama || sch.nama_sekolah,
        npsn: sch.npsn,
        jenjang: sch.jenjang || 'SMK',
        status: sch.status || 'Negeri',
        kabupatenKota: sch.kabupaten_kota || sch.kota || 'Jawa Barat',
        alamat: sch.alamat || '',
        telepon: sch.telepon || '',
        email: sch.email || '',
        totalJenisBarang: items.length,
        totalSaldoAwalRp: awal,
        totalMasukRp: masuk,
        totalKeluarRp: keluar,
        totalSaldoAkhirRp: akhir,
        rasioPenyaluran: safeRasio,
        jumlahTransaksiPenerimaan: trxPenerimaanCount,
        jumlahTransaksiPengeluaran: trxPengeluaranCount
      });
    });

    return list.sort((a, b) => b.totalSaldoAkhirRp - a.totalSaldoAkhirRp);
  }, [sekolahList, selectedSekolahFilter, detailedMutasiList, allPenerimaan, allTransaksi, selectedYear, startMonth, endMonth]);

  // Handle open supervisi modal for a school
  const handleOpenSupervisi = (schId: string) => {
    const sch = sekolahList.find(s => s.id === schId);
    if (!sch) return;
    setSupervisiSekolah(sch);
    setCurrentNoteInput(supervisiNotes[sch.id] || '');
  };

  const handleSaveSupervisiNote = () => {
    if (!supervisiSekolah) return;
    const updated = {
      ...supervisiNotes,
      [supervisiSekolah.id]: currentNoteInput
    };
    setSupervisiNotes(updated);
    try {
      localStorage.setItem('simba_supervisi_notes', JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
    showToast(`Catatan supervisi untuk ${supervisiSekolah.nama} berhasil disimpan.`);
  };

  // Copy Executive Summary for Official Memo
  const handleCopySummary = () => {
    const text = `LAPORAN EKSEKUTIF REKAPITULASI MUTASI BARANG PERSEDIAAN
DINAS PENDIDIKAN PROVINSI JAWA BARAT
Cakupan: ${selectedSekolahFilter === 'all' ? `Semua Satuan Pendidikan (${statsCounts.jumlahSekolah} Sekolah)` : (schoolMap.get(selectedSekolahFilter)?.nama || selectedSekolahFilter)}
Periode: ${periodLabel}
-----------------------------------------------------------
1. Satuan Pendidikan Terdaftar     : ${statsCounts.jumlahSekolah} Satker
2. Total Item Barang Inventaris    : ${grandTotal.totalItem} Item
3. Saldo Awal Ketersediaan (Rp)    : ${formatRupiah(grandTotal.awalRp)}
4. Realisasi Pengadaan / Masuk     : ${formatRupiah(grandTotal.masukRp)}
5. Realisasi Penyaluran / Keluar   : ${formatRupiah(grandTotal.keluarRp)}
6. Sisa Saldo Akhir Aset           : ${formatRupiah(grandTotal.akhirRp)}
7. Tingkat Penyerapan / Efektivitas: ${grandTotal.rasioPenyerapan}%
-----------------------------------------------------------
Dibuat secara otomatis melalui SIMBA (Sistem Informasi Manajemen Barang Multi-Tenant)`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    showToast('Ringkasan Laporan Dinas berhasil disalin ke clipboard!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Export to CSV / Excel compatible format
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Satuan Pendidikan',
      'NPSN',
      'Kode Barang',
      'Nama Barang',
      'Spesifikasi',
      'Kode Rekening',
      'Nama Rekening',
      'Jenis Barang',
      'Satuan',
      'Harga Satuan (Rp)',
      'Saldo Awal (Vol)',
      'Saldo Awal (Rp)',
      'Mutasi Masuk (Vol)',
      'Mutasi Masuk (Rp)',
      'Mutasi Keluar (Vol)',
      'Mutasi Keluar (Rp)',
      'Saldo Akhir (Vol)',
      'Saldo Akhir (Rp)',
      'Rasio Penyaluran (%)'
    ];

    const rows = detailedMutasiList.map((it, idx) => [
      idx + 1,
      `"${(it.namaSekolah || '').replace(/"/g, '""')}"`,
      `"${it.npsn}"`,
      `"${it.kodeBarang}"`,
      `"${(it.namaBarang || '').replace(/"/g, '""')}"`,
      `"${(it.spesifikasi || '').replace(/"/g, '""')}"`,
      `"${it.kodeRekening}"`,
      `"${(it.namaRekening || '').replace(/"/g, '""')}"`,
      `"${it.jenisBarang}"`,
      `"${it.satuan}"`,
      it.hargaSatuan,
      it.saldoAwalVol,
      it.saldoAwalRp,
      it.masukVol,
      it.masukRp,
      it.keluarVol,
      it.keluarRp,
      it.saldoAkhirVol,
      it.saldoAkhirRp,
      it.rasioPenyaluran
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Mutasi_Dinas_${selectedYear}_${periodMode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('File CSV Laporan Mutasi Dinas berhasil diunduh!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* 1. Executive Top Header (No-Print) */}
      <div className="no-print bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold bg-blue-600/30 text-blue-300 border border-blue-400/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Langkah 4: Modul Dinas
            </span>
            <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2.5 py-0.5 rounded-full uppercase">
              Shared DB &amp; Multi-Tenant
            </span>
            <span className="text-[10px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2.5 py-0.5 rounded-full uppercase">
              Supervisi Wilayah Dinas
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-blue-400 shrink-0" />
            <span>Modul Pengawasan Dinas: Laporan Mutasi Gabungan Satuan Pendidikan</span>
          </h1>
          <p className="text-xs sm:text-sm text-blue-200/90 max-w-3xl leading-relaxed">
            Rekapitulasi komprehensif perpindahan stok, penerimaan pengadaan BOS/APBD, dan realisasi penyaluran barang persediaan antar-satuan pendidikan di bawah naungan Dinas Pendidikan.
          </p>
        </div>

        {/* Quick Top Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer border border-white/15"
            title="Salin Ringkasan untuk Nota Dinas Pimpinan"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? 'Tersalin' : 'Salin Ringkasan'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
            title="Unduh Data Mentah Format Excel / CSV"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel / CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
            title="Cetak Format Dokumen Resmi Standar A4/F4"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan Dinas</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Summary Cards (Konsolidasi Wilayah Dinas) */}
      <div className="no-print grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Card 1: Total Sekolah */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Satuan Pendidikan</span>
            <Building className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono">
            {statsCounts.jumlahSekolah}
            <span className="text-xs text-slate-500 font-normal ml-1">Sekolah</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">
            {selectedSekolahFilter === 'all' ? 'Seluruh Unit Binaan' : '1 Unit Terpilih'}
          </p>
        </div>

        {/* Card 2: Total Item Terdaftar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Jenis Inventaris</span>
            <Boxes className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono">
            {grandTotal.totalItem}
            <span className="text-xs text-slate-500 font-normal ml-1">Item</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">
            {filterJenis === 'all' ? 'BHP & Belanja Modal' : filterJenis}
          </p>
        </div>

        {/* Card 3: Saldo Awal (Rp) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Saldo Awal</span>
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-slate-900 font-mono truncate" title={formatRupiah(grandTotal.awalRp)}>
            {formatRupiah(grandTotal.awalRp)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {periodMode === 'year' ? 'Stok 1 Jan' : 'Bawaan Periode'}
          </p>
        </div>

        {/* Card 4: Pengadaan Masuk (Rp) */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Penerimaan Masuk</span>
            <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-emerald-900 font-mono truncate" title={formatRupiah(grandTotal.masukRp)}>
            {formatRupiah(grandTotal.masukRp)}
          </div>
          <p className="text-[10px] text-emerald-700/80 mt-1">Pengadaan BOS &amp; APBD</p>
        </div>

        {/* Card 5: Realisasi Penyaluran (Rp) */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200/80 bg-blue-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-blue-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Penyaluran Keluar</span>
            <ArrowUpFromLine className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-blue-900 font-mono truncate" title={formatRupiah(grandTotal.keluarRp)}>
            {formatRupiah(grandTotal.keluarRp)}
          </div>
          <p className="text-[10px] text-blue-700/80 mt-1">Distribusi ke Unit/Staf</p>
        </div>

        {/* Card 6: Saldo Akhir Aset (Rp) */}
        <div className="bg-white p-4 rounded-2xl border border-purple-200/80 bg-purple-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-purple-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Sisa Saldo Aset</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-purple-900 font-mono truncate" title={formatRupiah(grandTotal.akhirRp)}>
            {formatRupiah(grandTotal.akhirRp)}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-purple-700 font-bold mt-1">
            <span>Rasio Salur: {grandTotal.rasioPenyerapan}%</span>
          </div>
        </div>

      </div>

      {/* 3. Panel Filter & Kontrol Agregat (No-Print) */}
      <div className="no-print bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* SubTab Navigation */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600 self-start flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setActiveSubTab('mutasi12bulan')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'mutasi12bulan'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Daftar Mutasi BHP 12 Bulan</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('tabel')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'tabel'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <Boxes className="w-4 h-4 text-blue-600" />
              <span>Rekap Mutasi Per Periode</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('ranking')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'ranking'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <span>Komparasi &amp; Ranking Sekolah</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('cetak')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'cetak'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>Pratinjau Cetak Dinas (A4/F4)</span>
            </button>
          </div>

          {/* Quick Search across all fields */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari barang, kodering, atau sekolah..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
            />
          </div>

        </div>

        {/* Detailed Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-xs">
          
          {/* Filter 1: Satuan Pendidikan (Multi-Tenant Selector, Requirement 24.12) */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Globe2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Satuan Pendidikan:</span>
            </label>
            <select
              value={selectedSekolahFilter}
              onChange={(e) => setSelectedSekolahFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="all">Semua Satuan Pendidikan</option>
              {sekolahList.map(sch => (
                <option key={sch.id} value={sch.id}>
                  {sch.nama} ({sch.npsn})
                </option>
              ))}
            </select>
          </div>

          {/* Filter 2: Tahun Anggaran */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
              <span>Tahun Anggaran:</span>
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {TAHUN_ANGGARAN_OPTIONS.map(y => (
                <option key={y} value={y}>
                  Tahun Anggaran {y}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Periode Pelaporan */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span>Periode Mutasi:</span>
            </label>
            <select
              value={periodMode}
              onChange={(e) => setPeriodMode(e.target.value as PeriodMode)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="year">1 Tahun Penuh (Jan - Des)</option>
              <option value="sem1">Semester I (Jan - Jun)</option>
              <option value="sem2">Semester II (Jul - Des)</option>
              <option value="tw1">Triwulan I (Jan - Mar)</option>
              <option value="tw2">Triwulan II (Apr - Jun)</option>
              <option value="tw3">Triwulan III (Jul - Sep)</option>
              <option value="tw4">Triwulan IV (Okt - Des)</option>
              <option value="month">Bulanan Spesifik</option>
            </select>
          </div>

          {/* Filter 4: Jenis Aset (BHP / Belanja Modal) */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>Jenis Aset Barang:</span>
            </label>
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="all">Semua Jenis (BHP &amp; Modal)</option>
              <option value="BHP">BHP (Barang Habis Pakai)</option>
              <option value="Belanja Modal">Belanja Modal (Aset Tetap)</option>
            </select>
          </div>

          {/* Filter 5: Kodering Belanja */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-600" />
              <span>Kode Rekening Belanja:</span>
            </label>
            <select
              value={filterKodering}
              onChange={(e) => setFilterKodering(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden truncate"
            >
              <option value="all">Semua Akun Rekening Belanja</option>
              {uniqueKoderings.map(k => (
                <option key={k.kode} value={k.kode} title={`${k.kode} - ${k.nama}`}>
                  {k.kode} - {k.nama.slice(0, 30)}...
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Sub-Filter for Specific Month if periodMode === 'month' */}
        {periodMode === 'month' && (
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center gap-3 text-xs">
            <span className="font-bold text-blue-900">Pilih Bulan Spesifik:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white border border-blue-300 rounded-lg px-3 py-1 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              {[
                'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
              ].map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {/* 4 Distinct Data Counter Badges (Requirement 24.9) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-600">Statistik Data:</span>
            <span className="bg-blue-100 text-blue-800 font-mono font-bold px-2 py-0.5 rounded-md">
              {statsCounts.jumlahSekolah} Sekolah
            </span>
            <span className="bg-indigo-100 text-indigo-800 font-mono font-bold px-2 py-0.5 rounded-md">
              {statsCounts.jumlahJenisBarang} Jenis Barang
            </span>
            <span className="bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded-md">
              {statsCounts.jumlahTransaksi} Transaksi
            </span>
            <span className="bg-purple-100 text-purple-800 font-mono font-bold px-2 py-0.5 rounded-md">
              {statsCounts.jumlahBarisMutasi} Baris Mutasi
            </span>
          </div>

          <div className="text-slate-400 font-mono text-[11px]">
            Periode: <strong className="text-slate-700">{periodLabel}</strong>
          </div>
        </div>
      </div>

      {/* SUB-TAB 0: DAFTAR MUTASI BHP 12 BULAN KONSOLIDASI DINAS (Januari s.d. Desember) */}
      {activeSubTab === 'mutasi12bulan' && (
        <div className="no-print">
          <DinasMutasiBhpReport
            sekolahList={sekolahList}
            allMasterBarang={allMasterBarang}
            allTransaksi={allTransaksi}
            allPenerimaan={allPenerimaan}
            allPejabat={allPejabat}
            selectedYear={selectedYear}
            onSelectSekolah={onSelectSekolah}
          />
        </div>
      )}

      {/* 4. SUB-TAB 1: TABEL REKAPITULASI MUTASI LINTAS SEKOLAH (No-Print) */}
      {activeSubTab === 'tabel' && (
        <div className="no-print bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <h2 className="font-extrabold text-sm text-slate-900">
                  Tabel Konsolidasi Mutasi Persediaan Antar-Satuan Pendidikan
                </h2>
                <p className="text-[11px] text-slate-500">
                  Data mutasi per sekolah, per barang, per periode, dan per kode rekening.
                </p>
              </div>
            </div>
            {/* Total Realisasi (Requirement 24.7) */}
            <div className="text-xs text-slate-600 font-mono bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              Total Realisasi: <strong className="text-blue-700 font-bold">{formatRupiah(grandTotal.keluarRp)}</strong>
            </div>
          </div>

          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left border-collapse text-xs min-w-[1050px]">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3 text-center w-10">No</th>
                  <th className="py-3 px-3 min-w-[180px]">Satuan Pendidikan</th>
                  <th className="py-3 px-3 min-w-[190px]">Kode &amp; Rekening Belanja</th>
                  <th className="py-3 px-3 min-w-[200px]">Nama Barang &amp; Spesifikasi</th>
                  <th className="py-3 px-2 text-center w-16">Satuan</th>
                  <th className="py-3 px-3 text-right min-w-[110px]">Harga (Rp)</th>
                  <th className="py-3 px-3 text-right bg-slate-50/50 min-w-[130px]">Saldo Awal</th>
                  <th className="py-3 px-3 text-right bg-emerald-50/40 text-emerald-800 min-w-[130px]">Masuk</th>
                  <th className="py-3 px-3 text-right bg-blue-50/40 text-blue-800 min-w-[130px]">Keluar</th>
                  <th className="py-3 px-3 text-right bg-purple-50/40 text-purple-900 min-w-[140px]">Saldo Akhir</th>
                  <th className="py-3 px-2 text-center w-20">% Salur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detailedMutasiList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-400">
                      <div className="max-w-md mx-auto space-y-2">
                        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-bold text-slate-700 text-sm">
                          Belum ada data mutasi untuk filter yang dipilih.
                        </p>
                        <p className="text-xs text-slate-400">
                          Silakan sesuaikan filter satuan pendidikan, periode pelaporan, atau kata kunci pencarian.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  detailedMutasiList.map((item, idx) => (
                    <tr key={`${item.sekolahId}-${item.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      
                      {/* Satuan Pendidikan */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleOpenSupervisi(item.sekolahId)}
                          className="font-bold text-slate-900 hover:text-blue-700 text-left transition-colors cursor-pointer group flex items-center gap-1"
                          title={`Klik untuk supervisi detail sekolah ${item.namaSekolah}`}
                        >
                          <span>{item.namaSekolah}</span>
                          <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <div className="text-[10px] text-slate-400 font-mono">NPSN: {item.npsn}</div>
                      </td>

                      {/* Kode & Rekening */}
                      <td className="py-3 px-3">
                        <div className="font-mono text-[11px] font-bold text-slate-700 select-all">
                          {item.kodeRekening}
                        </div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5" title={item.namaRekening}>
                          {item.namaRekening}
                        </div>
                      </td>

                      {/* Nama Barang & Spesifikasi */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 leading-tight" title={item.namaBarang}>
                          {item.namaBarang}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5" title={item.spesifikasi || item.kodeBarang}>
                          {item.spesifikasi ? item.spesifikasi : `Kode: ${item.kodeBarang}`}
                        </div>
                      </td>

                      {/* Satuan */}
                      <td className="py-3 px-2 text-center font-medium text-slate-600">{item.satuan}</td>
                      
                      {/* Harga Satuan */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {formatRupiah(item.hargaSatuan)}
                      </td>
                      
                      {/* Saldo Awal (Separated Vol & Rp) */}
                      <td className="py-3 px-3 text-right bg-slate-50/40">
                        <div className="font-bold font-mono text-slate-900">
                          {item.saldoAwalVol.toLocaleString('id-ID')} <span className="text-[10px] text-slate-400 font-normal">{item.satuan}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{formatRupiah(item.saldoAwalRp)}</div>
                      </td>

                      {/* Mutasi Masuk (Separated Vol & Rp) */}
                      <td className="py-3 px-3 text-right bg-emerald-50/30">
                        <div className="font-bold font-mono text-emerald-800">
                          +{item.masukVol.toLocaleString('id-ID')} <span className="text-[10px] text-emerald-600 font-normal">{item.satuan}</span>
                        </div>
                        <div className="text-[10px] text-emerald-600 font-mono">{formatRupiah(item.masukRp)}</div>
                      </td>

                      {/* Mutasi Keluar (Separated Vol & Rp) */}
                      <td className="py-3 px-3 text-right bg-blue-50/30">
                        <div className="font-bold font-mono text-blue-800">
                          -{item.keluarVol.toLocaleString('id-ID')} <span className="text-[10px] text-blue-600 font-normal">{item.satuan}</span>
                        </div>
                        <div className="text-[10px] text-blue-600 font-mono">{formatRupiah(item.keluarRp)}</div>
                      </td>

                      {/* Saldo Akhir (Separated Vol & Rp) */}
                      <td className="py-3 px-3 text-right bg-purple-50/30">
                        <div className="font-bold font-mono text-purple-950">
                          {item.saldoAkhirVol.toLocaleString('id-ID')} <span className="text-[10px] text-purple-700 font-normal">{item.satuan}</span>
                        </div>
                        <div className="text-[10px] text-purple-700 font-mono font-semibold">{formatRupiah(item.saldoAkhirRp)}</div>
                      </td>

                      {/* Rasio Penyaluran */}
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                          item.rasioPenyaluran >= 70
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.rasioPenyaluran >= 30
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.rasioPenyaluran}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                  <td colSpan={6} className="py-3.5 px-4 text-right uppercase tracking-wider text-[11px]">
                    Total Konsolidasi Wilayah Dinas:
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-900">
                    {formatRupiah(grandTotal.awalRp)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-emerald-800">
                    {formatRupiah(grandTotal.masukRp)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-blue-800">
                    {formatRupiah(grandTotal.keluarRp)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-purple-950">
                    {formatRupiah(grandTotal.akhirRp)}
                  </td>
                  <td className="py-3.5 px-2 text-center font-mono text-blue-800">
                    {grandTotal.rasioPenyerapan}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 5. SUB-TAB 2: ANALISIS & RANKING KOMPARASI ANTAR-SEKOLAH (No-Print) */}
      {activeSubTab === 'ranking' && (
        <div className="no-print space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900">
                    Peringkat Akumulasi Nilai Aset &amp; Penyerapan Penyaluran per Satuan Pendidikan
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Evaluasi kinerja pengelolaan barang persediaan antar-satuan pendidikan di wilayah dinas.
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {schoolComparison.length} Sekolah Terdaftar
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3 text-center w-12">Peringkat</th>
                    <th className="py-3 px-4 min-w-[200px]">Satuan Pendidikan</th>
                    <th className="py-3 px-3 text-center">Jenjang &amp; Kota</th>
                    <th className="py-3 px-3 text-center">Variasi Barang</th>
                    <th className="py-3 px-3 text-right">Saldo Awal (Rp)</th>
                    <th className="py-3 px-3 text-right text-emerald-800">Penerimaan Masuk</th>
                    <th className="py-3 px-3 text-right text-blue-800">Penyaluran Keluar</th>
                    <th className="py-3 px-3 text-right text-purple-900">Saldo Akhir Aset</th>
                    <th className="py-3 px-4 min-w-[150px]">Tingkat Penyerapan</th>
                    <th className="py-3 px-3 text-center">Aksi Supervisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schoolComparison.map((item, idx) => (
                    <tr key={item.sekolahId} className="hover:bg-slate-50/90 transition-colors">
                      <td className="py-3.5 px-3 text-center">
                        <span className={`w-7 h-7 rounded-xl inline-flex items-center justify-center font-extrabold text-xs font-mono ${
                          idx === 0 
                            ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                            : idx === 1
                            ? 'bg-slate-200 text-slate-700'
                            : idx === 2
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">{item.namaSekolah}</div>
                        <div className="text-[10px] text-slate-400 font-mono">NPSN: {item.npsn}</div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-700">
                          {item.jenjang} • {item.kabupatenKota}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-800">
                        {item.totalJenisBarang} Item
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-700">
                        {formatRupiah(item.totalSaldoAwalRp)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-emerald-800 font-semibold">
                        {formatRupiah(item.totalMasukRp)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-blue-800 font-semibold">
                        {formatRupiah(item.totalKeluarRp)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-purple-950 font-bold">
                        {formatRupiah(item.totalSaldoAkhirRp)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.rasioPenyaluran >= 70
                                ? 'bg-emerald-500'
                                : item.rasioPenyaluran >= 30
                                ? 'bg-blue-600'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, item.rasioPenyaluran))}%` }}
                          />
                        </div>
                        <div className="text-[10px] font-bold text-slate-600 flex justify-between">
                          <span>Realisasi</span>
                          <span className="font-mono">{item.rasioPenyaluran}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {/* Tombol Supervisi (Requirement 24.14) */}
                        <button
                          type="button"
                          onClick={() => handleOpenSupervisi(item.sekolahId)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold transition-colors cursor-pointer shadow-xs"
                          title="Buka panel supervisi detail satuan pendidikan"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Supervisi</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. SUB-TAB 3: PRATINJAU DOKUMEN CETAK BERKAS RESMI DINAS (Print-Ready A4/F4) */}
      <div className={`${activeSubTab === 'cetak' ? 'block' : 'hidden print:block'} bg-white text-black p-6 sm:p-10 rounded-2xl sm:rounded-3xl border border-slate-300 shadow-xl print:shadow-none print:border-none print:p-0 print:m-0`}>
        
        {/* Kop Surat Resmi Dinas Pendidikan Provinsi */}
        <div className="border-b-4 border-double border-black pb-3 mb-6 text-center leading-tight">
          <div className="text-sm sm:text-base font-bold tracking-wide uppercase">
            PEMERINTAH DAERAH PROVINSI JAWA BARAT
          </div>
          <div className="text-base sm:text-xl font-extrabold tracking-wider uppercase mt-0.5">
            DINAS PENDIDIKAN
          </div>
          <div className="text-xs sm:text-sm font-semibold uppercase mt-0.5">
            CABANG DINAS PENDIDIKAN WILAYAH III &amp; CADISDIK JAWA BARAT
          </div>
          <div className="text-[11px] text-slate-700 font-normal mt-1">
            Jl. Dr. Radjiman No. 6 Bandung, Jawa Barat 40171 | Telp: (022) 4264813 | Website: disdik.jabarprov.go.id
          </div>
        </div>

        {/* Judul Berkas Resmi */}
        <div className="text-center mb-6 space-y-1">
          <h2 className="text-base sm:text-lg font-extrabold uppercase underline tracking-wide">
            LAPORAN REKAPITULASI MUTASI BARANG PERSEDIAAN TINGKAT DINAS
          </h2>
          <p className="text-xs font-semibold">
            {periodLabel}
          </p>
          <p className="text-[11px] text-slate-600">
            Cakupan: {selectedSekolahFilter === 'all' ? `Semua Satuan Pendidikan Binaan (${statsCounts.jumlahSekolah} Sekolah)` : (schoolMap.get(selectedSekolahFilter)?.nama || selectedSekolahFilter)}
          </p>
        </div>

        {/* Tabel Berkas Cetak (Uses EXACT same dataset as preview, Requirement 24.17) */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-left border-collapse text-[10px] sm:text-[11px] border border-black">
            <thead>
              <tr className="bg-slate-100 border-b border-black font-bold text-center">
                <th className="border border-black py-2 px-1.5 w-8">No</th>
                <th className="border border-black py-2 px-2 text-left">Satuan Pendidikan</th>
                <th className="border border-black py-2 px-2">Kode Rekening</th>
                <th className="border border-black py-2 px-2 text-left">Nama Barang / Spesifikasi</th>
                <th className="border border-black py-2 px-1.5">Sat</th>
                <th className="border border-black py-2 px-2 text-right">Harga Sat.</th>
                <th className="border border-black py-2 px-2 text-right">Saldo Awal</th>
                <th className="border border-black py-2 px-2 text-right">Masuk</th>
                <th className="border border-black py-2 px-2 text-right">Keluar</th>
                <th className="border border-black py-2 px-2 text-right">Saldo Akhir</th>
              </tr>
            </thead>
            <tbody>
              {detailedMutasiList.slice(0, 150).map((item, idx) => (
                <tr key={`print-${item.sekolahId}-${item.id}-${idx}`} className="border-b border-black/40">
                  <td className="border border-black py-1.5 px-1.5 text-center font-mono">{idx + 1}</td>
                  <td className="border border-black py-1.5 px-2 font-bold">{item.namaSekolah}</td>
                  <td className="border border-black py-1.5 px-2 font-mono text-center">{item.kodeRekening}</td>
                  <td className="border border-black py-1.5 px-2">
                    <span className="font-semibold">{item.namaBarang}</span>
                    {item.spesifikasi && <span className="text-[9px] text-slate-600 block">({item.spesifikasi})</span>}
                  </td>
                  <td className="border border-black py-1.5 px-1.5 text-center">{item.satuan}</td>
                  <td className="border border-black py-1.5 px-2 text-right font-mono">{formatRupiah(item.hargaSatuan)}</td>
                  <td className="border border-black py-1.5 px-2 text-right font-mono">
                    {item.saldoAwalVol.toLocaleString('id-ID')} ({formatRupiah(item.saldoAwalRp)})
                  </td>
                  <td className="border border-black py-1.5 px-2 text-right font-mono font-semibold">
                    +{item.masukVol.toLocaleString('id-ID')} ({formatRupiah(item.masukRp)})
                  </td>
                  <td className="border border-black py-1.5 px-2 text-right font-mono font-semibold">
                    -{item.keluarVol.toLocaleString('id-ID')} ({formatRupiah(item.keluarRp)})
                  </td>
                  <td className="border border-black py-1.5 px-2 text-right font-mono font-bold">
                    {item.saldoAkhirVol.toLocaleString('id-ID')} ({formatRupiah(item.saldoAkhirRp)})
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-black font-bold">
                <td colSpan={6} className="border border-black py-2 px-3 text-right uppercase">
                  Jumlah Total Konsolidasi Wilayah Dinas:
                </td>
                <td className="border border-black py-2 px-2 text-right font-mono">
                  {formatRupiah(grandTotal.awalRp)}
                </td>
                <td className="border border-black py-2 px-2 text-right font-mono">
                  {formatRupiah(grandTotal.masukRp)}
                </td>
                <td className="border border-black py-2 px-2 text-right font-mono">
                  {formatRupiah(grandTotal.keluarRp)}
                </td>
                <td className="border border-black py-2 px-2 text-right font-mono">
                  {formatRupiah(grandTotal.akhirRp)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Tanda Tangan Pengesahan Pejabat Dinas */}
        <div className="grid grid-cols-2 gap-8 text-xs text-center mt-10 pt-4 break-inside-avoid">
          {/* Kolom Kiri: Mengetahui Pimpinan Dinas */}
          <div className="space-y-16">
            <div>
              <p className="font-semibold">Mengetahui,</p>
              <p className="font-bold uppercase">Kepala Dinas Pendidikan Provinsi Jawa Barat</p>
            </div>
            <div>
              <p className="font-bold underline uppercase">Drs. Wahyu Mijaya, S.H., M.Si.</p>
              <p className="font-mono text-[11px]">NIP. 19730617 199303 1 002</p>
              <p className="text-[10px] text-slate-500">Pembina Utama Madya / IV d</p>
            </div>
          </div>

          {/* Kolom Kanan: Pengurus Barang / Koordinator Aset Dinas */}
          <div className="space-y-16">
            <div>
              <p className="font-normal">Bandung, {formatTanggalIndonesia(new Date().toISOString())}</p>
              <p className="font-bold uppercase">Koordinator Sarpras &amp; Pengurus Barang Pengelola</p>
            </div>
            <div>
              <p className="font-bold underline uppercase">Drs. H. Mulyadi, M.M.</p>
              <p className="font-mono text-[11px]">NIP. 19700101 199503 1 002</p>
              <p className="text-[10px] text-slate-500">Pembina Tingkat I / IV b</p>
            </div>
          </div>
        </div>

      </div>

      {/* 7. MODAL SUPERVISI DETAIL SATUAN PENDIDIKAN (Requirement 24.14) */}
      {supervisiSekolah && (
        <div className="no-print fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="my-auto w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 font-extrabold text-lg">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold">
                      Supervisi Satuan Pendidikan: {supervisiSekolah.nama}
                    </h3>
                    <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full uppercase">
                      {supervisiSekolah.status || 'Negeri'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-200/80 mt-0.5">
                    NPSN: <span className="font-mono font-bold text-white">{supervisiSekolah.npsn}</span> • {supervisiSekolah.kabupaten_kota || supervisiSekolah.kota || 'Jawa Barat'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSupervisiSekolah(null)}
                className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Info Badges & Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Wilayah &amp; Alamat</div>
                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{supervisiSekolah.alamat || 'Alamat Belum Terdata'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Kontak Lembaga</div>
                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{supervisiSekolah.telepon || supervisiSekolah.email || '-'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Pimpinan Satuan Pendidikan</div>
                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{supervisiSekolah.kepalaSekolahNama || 'Kepala Sekolah Resmi'}</span>
                  </div>
                </div>
              </div>

              {/* Summary Mutasi Sekolah Terpilih */}
              {(() => {
                const schoolSummary = schoolComparison.find(s => s.sekolahId === supervisiSekolah.id);
                return (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <span>Ringkasan Keuangan &amp; Persediaan Periode Ini</span>
                    </h4>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Saldo Awal</div>
                        <div className="text-sm font-extrabold text-slate-900 font-mono mt-0.5">
                          {formatRupiah(schoolSummary?.totalSaldoAwalRp || 0)}
                        </div>
                      </div>
                      <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200">
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Penerimaan Masuk</div>
                        <div className="text-sm font-extrabold text-emerald-900 font-mono mt-0.5">
                          {formatRupiah(schoolSummary?.totalMasukRp || 0)}
                        </div>
                      </div>
                      <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200">
                        <div className="text-[10px] text-blue-700 font-bold uppercase">Penyaluran Realisasi</div>
                        <div className="text-sm font-extrabold text-blue-900 font-mono mt-0.5">
                          {formatRupiah(schoolSummary?.totalKeluarRp || 0)}
                        </div>
                      </div>
                      <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-200">
                        <div className="text-[10px] text-purple-700 font-bold uppercase">Sisa Saldo Aset</div>
                        <div className="text-sm font-extrabold text-purple-900 font-mono mt-0.5">
                          {formatRupiah(schoolSummary?.totalSaldoAkhirRp || 0)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                      <span className="font-semibold text-indigo-900">
                        Tingkat Penyerapan / Efektivitas Penyaluran:
                      </span>
                      <span className="font-mono font-bold text-indigo-900 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                        {schoolSummary?.rasioPenyaluran || 0}%
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Mutasi Daftar Barang Terpilih Sekolah */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-indigo-600" />
                    <span>Daftar Mutasi Barang Sekolah ({detailedMutasiList.filter(it => it.sekolahId === supervisiSekolah.id).length} Item)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Periode: {periodLabel}
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                      <tr>
                        <th className="py-2 px-2.5">No</th>
                        <th className="py-2 px-2.5">Nama Barang</th>
                        <th className="py-2 px-2 text-right">Harga</th>
                        <th className="py-2 px-2 text-right">Awal</th>
                        <th className="py-2 px-2 text-right text-emerald-800">Masuk</th>
                        <th className="py-2 px-2 text-right text-blue-800">Keluar</th>
                        <th className="py-2 px-2 text-right text-purple-900">Akhir</th>
                        <th className="py-2 px-2 text-center">% Salur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailedMutasiList
                        .filter(it => it.sekolahId === supervisiSekolah.id)
                        .map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="py-2 px-2.5 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-2.5">
                              <div className="font-semibold text-slate-900">{item.namaBarang}</div>
                              <div className="text-[9px] text-slate-400 font-mono">{item.kodeRekening}</div>
                            </td>
                            <td className="py-2 px-2 text-right font-mono">{formatRupiah(item.hargaSatuan)}</td>
                            <td className="py-2 px-2 text-right font-mono">{item.saldoAwalVol}</td>
                            <td className="py-2 px-2 text-right font-mono text-emerald-700">+{item.masukVol}</td>
                            <td className="py-2 px-2 text-right font-mono text-blue-700">-{item.keluarVol}</td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-purple-950">{item.saldoAkhirVol}</td>
                            <td className="py-2 px-2 text-center font-mono font-semibold">{item.rasioPenyaluran}%</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Catatan Supervisi Pembina / Pengawas Dinas */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                  <span>Catatan Supervisi &amp; Tindak Lanjut Dinas Pendidikan</span>
                </label>
                <textarea
                  rows={3}
                  value={currentNoteInput}
                  onChange={(e) => setCurrentNoteInput(e.target.value)}
                  placeholder="Ketik catatan pengawasan berkala, rekomendasi stock opname, atau instruksi perbaikan administrasi untuk satuan pendidikan ini..."
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveSupervisiNote}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Simpan Catatan Supervisi
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSupervisiSekolah(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={() => {
                  const schId = supervisiSekolah.id;
                  setSupervisiSekolah(null);
                  onSelectSekolah(schId);
                  showToast(`Berhasil beralih ke sesi sekolah: ${supervisiSekolah.nama}`);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
              >
                <span>Beralih ke Sesi Satuan Pendidikan Ini</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
