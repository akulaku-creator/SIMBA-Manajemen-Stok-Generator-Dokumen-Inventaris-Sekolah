import {
  AlertCircle,
  Building,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Table as TableIcon,
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
} from '../../types';
import { DEFAULT_PRIMARY_SEKOLAH_ID } from '../../data/defaultSchools';
import { DAFTAR_40_KODE_REKENING_RESMI, getNamaRekeningByKode } from '../../data/kodeRekeningData';
import { formatRupiah } from '../../utils/numberGenerator';
import { downloadDinasKoderingExcel } from '../../utils/excelDinasKoderingGenerator';

export interface Props {
  sekolahList: Sekolah[];
  allMasterBarang: Barang[];
  allTransaksi: TransaksiPengeluaran[];
  allPenerimaan: TransaksiPenerimaan[];
  allPejabat: Pejabat[];
  currentUser: AppUser;
  onSelectSekolah?: (sekolahId: string) => void;
  paperSize?: PaperSize;
  showToast?: (msg: string) => void;
}

const MONTHS_LABEL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const LaporanDinasKodering: React.FC<Props> = ({
  sekolahList = [],
  allMasterBarang = [],
  allTransaksi = [],
  allPenerimaan = [],
  allPejabat = [],
  currentUser,
  onSelectSekolah,
  showToast
}) => {
  // Filters
  const [selectedSekolah, setSelectedSekolah] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedPeriode, setSelectedPeriode] = useState<'all' | 'tw1' | 'tw2' | 'tw3' | 'tw4' | 'sem1' | 'sem2' | 'single'>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // 8 = September
  const [selectedKodering, setSelectedKodering] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // View States
  const [tableDisplayMode, setTableDisplayMode] = useState<'ringkas' | '12bulan'>('12bulan');
  const [groupingMode, setGroupingMode] = useState<'gabungan' | 'per_sekolah'>('gabungan');
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Drill-Down Drawer/Modal State
  const [drillDownKodering, setDrillDownKodering] = useState<string | null>(null);
  const [drillDownSelectedSchoolId, setDrillDownSelectedSchoolId] = useState<string | null>(null);

  // School lookup
  const schoolLookup = useMemo(() => {
    const map = new Map<string, Sekolah>();
    sekolahList.forEach(s => map.set(s.id, s));
    return map;
  }, [sekolahList]);

  // Handle Reset Filters
  const handleResetFilters = () => {
    setSelectedSekolah('ALL');
    setSelectedYear(2026);
    setSelectedPeriode('all');
    setSelectedMonth(8);
    setSelectedKodering('ALL');
    setSearchQuery('');
  };

  // Periode textual label
  const periodeLabel = useMemo(() => {
    switch (selectedPeriode) {
      case 'all': return `1 Tahun Penuh (Januari - Desember ${selectedYear})`;
      case 'sem1': return `Semester I (Januari - Juni ${selectedYear})`;
      case 'sem2': return `Semester II (Juli - Desember ${selectedYear})`;
      case 'tw1': return `Triwulan I (Januari - Maret ${selectedYear})`;
      case 'tw2': return `Triwulan II (April - Juni ${selectedYear})`;
      case 'tw3': return `Triwulan III (Juli - September ${selectedYear})`;
      case 'tw4': return `Triwulan IV (Oktober - Desember ${selectedYear})`;
      case 'single': return `Bulan ${MONTHS_LABEL[selectedMonth]} ${selectedYear}`;
      default: return `Tahun Anggaran ${selectedYear}`;
    }
  }, [selectedPeriode, selectedMonth, selectedYear]);

  // =========================================================================
  // CORE ENGINE: Aggregation by Kode Rekening across Schools (Multi-Tenant)
  // Preserves 100% calculation consistency with School Mutasi BOS
  // =========================================================================
  const aggregatedKoderingData = useMemo(() => {
    // 1. Filter out Belanja Modal (BHP only)
    const bhpItems = allMasterBarang.filter(b => b.jenisBarang !== 'Belanja Modal');

    // 2. Filter transactions by year
    const penerimaanYear = allPenerimaan.filter(p => {
      if (!p.tanggal) return false;
      return new Date(p.tanggal).getFullYear() === selectedYear;
    });

    const pengeluaranYear = allTransaksi.filter(t => {
      if (!t.tanggal) return false;
      return new Date(t.tanggal).getFullYear() === selectedYear;
    });

    // Determine target schools
    const targetSchools = selectedSekolah === 'ALL'
      ? sekolahList
      : sekolahList.filter(s => s.id === selectedSekolah);

    // Map: kodering -> breakdown per school
    // kodering -> Map(schoolId -> { saldoAwalRp, bulanan: [12], items: [], txs: [] })
    interface SchoolStat {
      sekolahId: string;
      namaSekolah: string;
      npsn: string;
      saldoAwalRp: number;
      bulanan: {
        bulanIndex: number;
        namaBulan: string;
        masukRp: number;
        keluarRp: number;
        saldoAkhirRp: number;
      }[];
      items: Barang[];
    }

    const koderingMap = new Map<string, {
      kodeRekening: string;
      namaRekening: string;
      schoolStats: Map<string, SchoolStat>;
    }>();

    // Populate all known 40 master koderings first so standard catalog is preserved
    DAFTAR_40_KODE_REKENING_RESMI.forEach(k => {
      koderingMap.set(k.kode, {
        kodeRekening: k.kode,
        namaRekening: k.nama,
        schoolStats: new Map()
      });
    });

    // Also include any custom kodering found in master barang
    bhpItems.forEach(b => {
      const kodering = b.kodeRekening || '5.1.02.01.01.0024';
      if (!koderingMap.has(kodering)) {
        koderingMap.set(kodering, {
          kodeRekening: kodering,
          namaRekening: b.namaRekening || getNamaRekeningByKode(kodering),
          schoolStats: new Map()
        });
      }
    });

    // Process each target school
    targetSchools.forEach(sch => {
      const schId = sch.id;
      // Filter items of this school
      const schBhp = bhpItems.filter(b => {
        const itemSch = b.sekolah_id || DEFAULT_PRIMARY_SEKOLAH_ID;
        return itemSch === schId;
      });

      // Filter transactions of this school
      const schPenerimaan = penerimaanYear.filter(p => (!p.sekolah_id || p.sekolah_id === schId));
      const schPengeluaran = pengeluaranYear.filter(t => (!t.sekolah_id || t.sekolah_id === schId));

      schBhp.forEach(b => {
        const kodering = b.kodeRekening || '5.1.02.01.01.0024';
        const kEntry = koderingMap.get(kodering)!;

        let sStat = kEntry.schoolStats.get(schId);
        if (!sStat) {
          sStat = {
            sekolahId: schId,
            namaSekolah: sch.nama,
            npsn: sch.npsn || '-',
            saldoAwalRp: 0,
            bulanan: Array.from({ length: 12 }, (_, m) => ({
              bulanIndex: m,
              namaBulan: MONTHS_LABEL[m],
              masukRp: 0,
              keluarRp: 0,
              saldoAkhirRp: 0
            })),
            items: []
          };
          kEntry.schoolStats.set(schId, sStat);
        }

        sStat.items.push(b);

        const stokAwal = b.stokAwal || 0;
        const hargaSatuan = b.hargaSatuan || 0;
        const itemSaldoAwalRp = stokAwal * hargaSatuan;
        sStat.saldoAwalRp += itemSaldoAwalRp;

        let runningVol = stokAwal;

        // Calculate 12 monthly changes for this item
        for (let m = 0; m < 12; m++) {
          let itemMasukVol = 0;
          let itemMasukRp = 0;

          schPenerimaan.forEach(p => {
            const dt = new Date(p.tanggal);
            if (dt.getMonth() === m) {
              p.items?.forEach(it => {
                const matchId = it.barangId && it.barangId === b.id;
                const matchCode = it.kodeBarang && b.kodeBarang && it.kodeBarang === b.kodeBarang;
                const matchName = it.namaBarang && b.namaBarang && it.namaBarang.toLowerCase().trim() === b.namaBarang.toLowerCase().trim();
                const matchKodering = !it.kodeRekening || it.kodeRekening === kodering;

                if ((matchId || matchCode || matchName) && matchKodering && it.jumlahMasuk > 0) {
                  itemMasukVol += it.jumlahMasuk;
                  const price = it.hargaSatuan && it.hargaSatuan > 0 ? it.hargaSatuan : hargaSatuan;
                  itemMasukRp += (it.jumlahMasuk * price);
                }
              });
            }
          });

          let itemKeluarVol = 0;
          let itemKeluarRp = 0;

          schPengeluaran.forEach(t => {
            const dt = new Date(t.tanggal);
            if (dt.getMonth() === m) {
              t.items?.forEach(it => {
                const matchId = it.barangId && it.barangId === b.id;
                const matchCode = it.kodeBarang && b.kodeBarang && it.kodeBarang === b.kodeBarang;
                const matchName = it.namaBarang && b.namaBarang && it.namaBarang.toLowerCase().trim() === b.namaBarang.toLowerCase().trim();
                const matchKodering = !it.kodeRekening || it.kodeRekening === kodering;
                const qty = it.usulanJumlah || 0;

                if ((matchId || matchCode || matchName) && matchKodering && qty > 0) {
                  itemKeluarVol += qty;
                  const price = it.hargaSatuan && it.hargaSatuan > 0 ? it.hargaSatuan : hargaSatuan;
                  itemKeluarRp += (qty * price);
                }
              });
            }
          });

          runningVol = Math.max(0, runningVol + itemMasukVol - itemKeluarVol);
          const itemSaldoAkhirRp = runningVol * hargaSatuan;

          sStat.bulanan[m].masukRp += itemMasukRp;
          sStat.bulanan[m].keluarRp += itemKeluarRp;
          sStat.bulanan[m].saldoAkhirRp += itemSaldoAkhirRp;
        }
      });
    });

    // Build consolidated list across all koderings
    const rows: {
      no: number;
      kodeRekening: string;
      namaRekening: string;
      saldoAwalRp: number;
      totalMasukRp: number;
      totalKeluarRp: number;
      saldoAkhirTahunRp: number;
      bulanan: {
        bulanIndex: number;
        namaBulan: string;
        masukRp: number;
        keluarRp: number;
        saldoAkhirRp: number;
      }[];
      sekolahCount: number;
      sekolahBreakdown: {
        sekolahId: string;
        namaSekolah: string;
        npsn: string;
        saldoAwalRp: number;
        totalMasukRp: number;
        totalKeluarRp: number;
        saldoAkhirRp: number;
        bulanan: {
          bulanIndex: number;
          namaBulan: string;
          masukRp: number;
          keluarRp: number;
          saldoAkhirRp: number;
        }[];
        items: Barang[];
      }[];
    }[] = [];

    // Sort by kodeRekening
    const sortedKoderings = Array.from(koderingMap.keys()).sort();

    let counter = 1;
    sortedKoderings.forEach(kodering => {
      const entry = koderingMap.get(kodering)!;
      const schoolStatsList = Array.from(entry.schoolStats.values());

      let aggSaldoAwalRp = 0;
      let aggTotalMasukRp = 0;
      let aggTotalKeluarRp = 0;

      const aggBulanan = Array.from({ length: 12 }, (_, m) => ({
        bulanIndex: m,
        namaBulan: MONTHS_LABEL[m],
        masukRp: 0,
        keluarRp: 0,
        saldoAkhirRp: 0
      }));

      const breakdown = schoolStatsList.map(s => {
        let schTotalMasuk = 0;
        let schTotalKeluar = 0;
        s.bulanan.forEach(m => {
          schTotalMasuk += m.masukRp;
          schTotalKeluar += m.keluarRp;
        });
        const schSaldoAkhir = s.bulanan[11]?.saldoAkhirRp || 0;

        aggSaldoAwalRp += s.saldoAwalRp;
        aggTotalMasukRp += schTotalMasuk;
        aggTotalKeluarRp += schTotalKeluar;

        s.bulanan.forEach((m, idx) => {
          aggBulanan[idx].masukRp += m.masukRp;
          aggBulanan[idx].keluarRp += m.keluarRp;
          aggBulanan[idx].saldoAkhirRp += m.saldoAkhirRp;
        });

        return {
          sekolahId: s.sekolahId,
          namaSekolah: s.namaSekolah,
          npsn: s.npsn,
          saldoAwalRp: s.saldoAwalRp,
          totalMasukRp: schTotalMasuk,
          totalKeluarRp: schTotalKeluar,
          saldoAkhirRp: schSaldoAkhir,
          bulanan: s.bulanan,
          items: s.items
        };
      });

      const aggSaldoAkhirTahunRp = aggBulanan[11]?.saldoAkhirRp || 0;

      rows.push({
        no: counter++,
        kodeRekening: entry.kodeRekening,
        namaRekening: entry.namaRekening,
        saldoAwalRp: aggSaldoAwalRp,
        totalMasukRp: aggTotalMasukRp,
        totalKeluarRp: aggTotalKeluarRp,
        saldoAkhirTahunRp: aggSaldoAkhirTahunRp,
        bulanan: aggBulanan,
        sekolahCount: breakdown.filter(b => (b.saldoAwalRp > 0 || b.totalMasukRp > 0 || b.totalKeluarRp > 0 || b.items.length > 0)).length,
        sekolahBreakdown: breakdown
      });
    });

    return rows;
  }, [allMasterBarang, allPenerimaan, allTransaksi, sekolahList, selectedSekolah, selectedYear]);

  // Filtered rows for display based on selectedKodering and Search Query
  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return aggregatedKoderingData.filter(row => {
      // Kodering filter
      if (selectedKodering !== 'ALL' && row.kodeRekening !== selectedKodering) {
        return false;
      }

      // Search query
      if (q) {
        const matchCode = row.kodeRekening.toLowerCase().includes(q);
        const matchName = row.namaRekening.toLowerCase().includes(q);
        const matchSchool = row.sekolahBreakdown.some(s => s.namaSekolah.toLowerCase().includes(q));
        if (!matchCode && !matchName && !matchSchool) return false;
      }

      return true;
    });
  }, [aggregatedKoderingData, selectedKodering, searchQuery]);

  // Grand Totals
  const grandTotal = useMemo(() => {
    let totalSekolah = selectedSekolah === 'ALL' ? sekolahList.length : 1;
    let totalKodering = 0;
    let saldoAwalRp = 0;
    let totalMasukRp = 0;
    let totalKeluarRp = 0;
    let saldoAkhirRp = 0;

    const bulanan = Array.from({ length: 12 }, (_, m) => ({
      bulanIndex: m,
      namaBulan: MONTHS_LABEL[m],
      masukRp: 0,
      keluarRp: 0,
      saldoAkhirRp: 0
    }));

    filteredRows.forEach(row => {
      // Only count active koderings
      if (row.saldoAwalRp > 0 || row.totalMasukRp > 0 || row.totalKeluarRp > 0 || row.saldoAkhirTahunRp > 0) {
        totalKodering++;
      }
      saldoAwalRp += row.saldoAwalRp;
      totalMasukRp += row.totalMasukRp;
      totalKeluarRp += row.totalKeluarRp;
      saldoAkhirRp += row.saldoAkhirTahunRp;

      row.bulanan.forEach((m, idx) => {
        bulanan[idx].masukRp += m.masukRp;
        bulanan[idx].keluarRp += m.keluarRp;
        bulanan[idx].saldoAkhirRp += m.saldoAkhirRp;
      });
    });

    return {
      totalSekolah,
      totalKodering,
      saldoAwalRp,
      totalMasukRp,
      totalKeluarRp,
      saldoAkhirRp,
      bulanan
    };
  }, [filteredRows, selectedSekolah, sekolahList]);

  // Drill-Down Selected Row details
  const activeDrillDownRow = useMemo(() => {
    if (!drillDownKodering) return null;
    return aggregatedKoderingData.find(r => r.kodeRekening === drillDownKodering) || null;
  }, [drillDownKodering, aggregatedKoderingData]);

  // Selected school inside drill-down
  const activeDrillDownSchool = useMemo(() => {
    if (!activeDrillDownRow || !drillDownSelectedSchoolId) return null;
    return activeDrillDownRow.sekolahBreakdown.find(s => s.sekolahId === drillDownSelectedSchoolId) || null;
  }, [activeDrillDownRow, drillDownSelectedSchoolId]);

  // Export Excel Handler
  const handleExportExcel = async () => {
    if (isExportingExcel) return;
    try {
      setIsExportingExcel(true);
      const schoolLabel = selectedSekolah === 'ALL'
        ? 'SELURUH SATUAN PENDIDIKAN'
        : (schoolLookup.get(selectedSekolah)?.nama || selectedSekolah).toUpperCase();

      await downloadDinasKoderingExcel(
        filteredRows,
        grandTotal,
        selectedYear,
        schoolLabel,
        tableDisplayMode === '12bulan'
      );
      if (showToast) showToast('Laporan Dinas Excel berhasil diunduh!');
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('Gagal mengekspor file Excel. Silakan coba kembali.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ========================================================================= */}
      {/* 1. HEADER DINAS RESMI (INSTITUTIONAL BRANDING)                           */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-700 via-blue-700 to-indigo-800 p-3 shadow-md shadow-indigo-600/20 flex items-center justify-center flex-shrink-0 text-white">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase tracking-wider">
                  Pengawasan Cabang Dinas Wilayah XIII
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  TA {selectedYear} • AKTIF
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5">
                REKAPITULASI PER KODERING BELANJA BARANG HABIS PAKAI (BHP) BOS
              </h1>
              <p className="text-xs font-semibold text-slate-600 mt-0.5 uppercase tracking-wide">
                CABANG DINAS PENDIDIKAN WILAYAH XIII • PEMERINTAH DAERAH PROVINSI JAWA BARAT
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Konsolidasi multi-sekolah berbasis kode akun belanja (Bagan Akun Standar) dan saldo kumulatif persediaan.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* View Mode Toggle: Mode Ringkas vs Mode 12 Bulan */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setTableDisplayMode('ringkas')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  tableDisplayMode === 'ringkas'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Mode Ringkas</span>
              </button>
              <button
                type="button"
                onClick={() => setTableDisplayMode('12bulan')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  tableDisplayMode === '12bulan'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Mode 12 Bulan (Penuh)</span>
              </button>
            </div>

            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="Ekspor ke Format Excel Baku (.xlsx) dengan Rumus & Kop Dinas"
            >
              {isExportingExcel ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </>
              )}
            </button>

            {/* Print / Cetak Button */}
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="Pratinjau & Cetak Laporan Resmi Dinas"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="pt-3 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-4">
            <span>
              Tahun Anggaran: <strong className="text-slate-800 font-semibold">{selectedYear}</strong>
            </span>
            <span>
              Periode: <strong className="text-slate-800 font-semibold">{periodeLabel}</strong>
            </span>
            <span>
              Jumlah Sekolah: <strong className="text-indigo-700 font-bold">{grandTotal.totalSekolah} Sekolah</strong>
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FILTER CONTROLS BAR (SEKOLAH, TAHUN, PERIODE, KODERING, SEARCH)       */}
      {/* ========================================================================= */}
      <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            Parameter &amp; Filter Laporan Dinas
          </span>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filter</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Filter Satuan Pendidikan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Satuan Pendidikan:
            </label>
            <select
              value={selectedSekolah}
              onChange={(e) => setSelectedSekolah(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="ALL">-- Semua Sekolah (Konsolidasi) --</option>
              {sekolahList.map(sch => (
                <option key={sch.id} value={sch.id}>
                  {sch.nama} {sch.npsn ? `(${sch.npsn})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter Tahun Anggaran */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tahun Anggaran:
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {TAHUN_ANGGARAN_OPTIONS.map(y => (
                <option key={y} value={y}>TA {y}</option>
              ))}
            </select>
          </div>

          {/* 3. Filter Periode */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Periode Laporan:
            </label>
            <select
              value={selectedPeriode}
              onChange={(e) => setSelectedPeriode(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="all">1 Tahun Penuh (Jan - Des)</option>
              <option value="sem1">Semester I (Jan - Jun)</option>
              <option value="sem2">Semester II (Jul - Des)</option>
              <option value="tw1">Triwulan I (Jan - Mar)</option>
              <option value="tw2">Triwulan II (Apr - Jun)</option>
              <option value="tw3">Triwulan III (Jul - Sep)</option>
              <option value="tw4">Triwulan IV (Okt - Des)</option>
              <option value="single">Bulanan Spesifik</option>
            </select>
          </div>

          {/* 4. Filter Kode Rekening */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kode Rekening Belanja:
            </label>
            <select
              value={selectedKodering}
              onChange={(e) => setSelectedKodering(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden truncate"
            >
              <option value="ALL">-- Semua Kode Rekening (40 Akun) --</option>
              {DAFTAR_40_KODE_REKENING_RESMI.map(k => (
                <option key={k.kode} value={k.kode} title={`${k.kode} - ${k.nama}`}>
                  {k.kode} - {k.nama.slice(0, 26)}...
                </option>
              ))}
            </select>
          </div>

          {/* 5. Pencarian Teks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pencarian Cepat:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kodering, uraian, sekolah..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DASHBOARD SUMMARY CARDS (DYNAMIC REKAPITULASI)                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Sekolah */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Total Sekolah</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900">{grandTotal.totalSekolah}</span>
            <span className="text-xs text-slate-500 font-medium">Sekolah</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Wilayah XIII</span>
        </div>

        {/* Card 2: Kodering */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Akun Kodering</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-indigo-700">{grandTotal.totalKodering}</span>
            <span className="text-xs text-slate-500 font-medium">Akun Aktif</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Bagan Akun Standar</span>
        </div>

        {/* Card 3: Saldo Awal */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Saldo Awal (1 Jan)</span>
          <div className="mt-1 text-base sm:text-lg font-black text-slate-800 truncate" title={formatRupiah(grandTotal.saldoAwalRp)}>
            {formatRupiah(grandTotal.saldoAwalRp)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Stok Awal Inventaris</span>
        </div>

        {/* Card 4: Mutasi Masuk */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase text-emerald-800 tracking-wider">Mutasi Masuk</span>
          <div className="mt-1 text-base sm:text-lg font-black text-emerald-700 truncate" title={formatRupiah(grandTotal.totalMasukRp)}>
            {formatRupiah(grandTotal.totalMasukRp)}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-1">Realisasi Penerimaan</span>
        </div>

        {/* Card 5: Mutasi Keluar */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200/80 bg-rose-50/20 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase text-rose-800 tracking-wider">Mutasi Keluar</span>
          <div className="mt-1 text-base sm:text-lg font-black text-rose-700 truncate" title={formatRupiah(grandTotal.totalKeluarRp)}>
            {formatRupiah(grandTotal.totalKeluarRp)}
          </div>
          <span className="text-[10px] text-rose-600 font-medium mt-1">Penyaluran / Pakai Habis</span>
        </div>

        {/* Card 6: Saldo Akhir */}
        <div className="bg-white p-4 rounded-2xl border border-indigo-200/80 bg-indigo-50/20 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase text-indigo-900 tracking-wider">Saldo Akhir</span>
          <div className="mt-1 text-base sm:text-lg font-black text-indigo-800 truncate" title={formatRupiah(grandTotal.saldoAkhirRp)}>
            {formatRupiah(grandTotal.saldoAkhirRp)}
          </div>
          <span className="text-[10px] text-indigo-600 font-medium mt-1">Sisa Stok Persediaan</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TABEL UTAMA LAPORAN DINAS (SESUAI FORMAT EXCEL REFERENSI)               */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Tabel Rekapitulasi Mutasi Per Kodering Tingkat Dinas
            </h2>
            <span className="text-xs text-slate-500 font-normal">
              ({filteredRows.length} Akun Belanja)
            </span>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Klik baris untuk membuka rincian kontribusi per sekolah</span>
          </div>
        </div>

        {/* MODE 1: MODE RINGKAS */}
        {tableDisplayMode === 'ringkas' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-3 text-center border-b border-slate-700 w-12">NO</th>
                  <th className="py-3 px-3 border-b border-slate-700 w-44">KODE REKENING</th>
                  <th className="py-3 px-4 border-b border-slate-700">URAIAN AKUN BELANJA</th>
                  <th className="py-3 px-3 text-center border-b border-slate-700 w-28">KONTRIBUTOR</th>
                  <th className="py-3 px-3 text-right border-b border-slate-700 w-36">SALDO AWAL (Rp)</th>
                  <th className="py-3 px-3 text-right border-b border-slate-700 w-36 bg-emerald-900/90 text-emerald-200">
                    MUTASI MASUK (Rp)
                  </th>
                  <th className="py-3 px-3 text-right border-b border-slate-700 w-36 bg-rose-900/90 text-rose-200">
                    MUTASI KELUAR (Rp)
                  </th>
                  <th className="py-3 px-3 text-right border-b border-slate-700 w-36 bg-indigo-900/90 text-indigo-200">
                    SALDO AKHIR (Rp)
                  </th>
                  <th className="py-3 px-3 text-center border-b border-slate-700 w-24">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRows.length > 0 ? (
                  filteredRows.map((row, idx) => {
                    const isZeroRow = row.saldoAwalRp === 0 && row.totalMasukRp === 0 && row.totalKeluarRp === 0 && row.saldoAkhirTahunRp === 0;
                    return (
                      <tr
                        key={row.kodeRekening}
                        onClick={() => setDrillDownKodering(row.kodeRekening)}
                        className={`hover:bg-indigo-50/60 cursor-pointer transition group ${
                          isZeroRow ? 'opacity-60 bg-slate-50/40' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-medium text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 group-hover:text-indigo-700">
                          {row.kodeRekening}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          <div>{row.namaRekening}</div>
                          {row.sekolahCount > 0 && (
                            <span className="text-[10px] text-slate-400">
                              Tersebar di {row.sekolahCount} Satuan Pendidikan
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            <Building className="w-3 h-3 text-slate-400" />
                            {row.sekolahCount} Sekolah
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                          {row.saldoAwalRp > 0 ? formatRupiah(row.saldoAwalRp) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-700 bg-emerald-50/30">
                          {row.totalMasukRp > 0 ? formatRupiah(row.totalMasukRp) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-rose-700 bg-rose-50/30">
                          {row.totalKeluarRp > 0 ? formatRupiah(row.totalKeluarRp) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 bg-indigo-50/30">
                          {row.saldoAkhirTahunRp > 0 ? formatRupiah(row.saldoAkhirTahunRp) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDrillDownKodering(row.kodeRekening);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Rincian</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400 italic">
                      Tidak ada data kode rekening yang sesuai dengan kriteria filter.
                    </td>
                  </tr>
                )}
              </tbody>
              {/* Grand Total Row */}
              {filteredRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold text-xs">
                    <td colSpan={4} className="py-3 px-4 text-right uppercase tracking-wider">
                      TOTAL KESELURUHAN KONSOLIDASI DINAS :
                    </td>
                    <td className="py-3 px-3 text-right text-amber-300">
                      {formatRupiah(grandTotal.saldoAwalRp)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-300 bg-emerald-950/70">
                      {formatRupiah(grandTotal.totalMasukRp)}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-300 bg-rose-950/70">
                      {formatRupiah(grandTotal.totalKeluarRp)}
                    </td>
                    <td className="py-3 px-3 text-right text-indigo-300 bg-indigo-950/70">
                      {formatRupiah(grandTotal.saldoAkhirRp)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* MODE 2: MODE 12 BULAN (EXCEL REFERENCE LAYOUT) */}
        {tableDisplayMode === '12bulan' && (
          <div className="overflow-x-auto max-h-[72vh]">
            <table className="w-full text-[11px] border-collapse whitespace-nowrap">
              <thead>
                {/* Level 1 Header: Title Columns + 12 Months */}
                <tr className="bg-slate-800 text-white font-bold uppercase text-center sticky top-0 z-20">
                  <th rowSpan={2} className="border border-slate-700 px-2.5 py-2 w-10">NO</th>
                  <th rowSpan={2} className="border border-slate-700 px-3 py-2 min-w-[130px]">KODE REKENING</th>
                  <th rowSpan={2} className="border border-slate-700 px-4 py-2 min-w-[240px] text-left">URAIAN AKUN BELANJA</th>
                  <th rowSpan={2} className="border border-slate-700 px-3 py-2 min-w-[110px] bg-slate-700">SALDO AWAL</th>

                  {/* 12 Months Headers */}
                  {MONTHS_LABEL.map((m, idx) => (
                    <th
                      key={idx}
                      colSpan={3}
                      className="border border-slate-700 px-2 py-1.5 bg-indigo-900 border-l-2 border-l-amber-400"
                    >
                      {m.toUpperCase()}
                    </th>
                  ))}
                  <th rowSpan={2} className="border border-slate-700 px-3 py-2 min-w-[80px]">AKSI</th>
                </tr>

                {/* Level 2 Header: Masuk, Keluar, Saldo Akhir for each month */}
                <tr className="bg-slate-700 text-white font-semibold text-[10px] text-center sticky top-[31px] z-20 border-b-2 border-slate-400">
                  {MONTHS_LABEL.map((_, idx) => (
                    <React.Fragment key={idx}>
                      <th className="border border-slate-600 px-2 py-1 bg-emerald-800 min-w-[85px]">MASUK</th>
                      <th className="border border-slate-600 px-2 py-1 bg-rose-800 min-w-[85px]">KELUAR</th>
                      <th className="border border-slate-600 px-2 py-1 bg-slate-800 min-w-[95px]">SALDO AKHIR</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRows.length > 0 ? (
                  filteredRows.map((row, idx) => {
                    const isZero = row.saldoAwalRp === 0 && row.totalMasukRp === 0 && row.totalKeluarRp === 0 && row.saldoAkhirTahunRp === 0;
                    return (
                      <tr
                        key={row.kodeRekening}
                        onClick={() => setDrillDownKodering(row.kodeRekening)}
                        className={`hover:bg-indigo-50/60 cursor-pointer transition ${isZero ? 'opacity-60 bg-slate-50/40' : ''}`}
                      >
                        <td className="border border-slate-200 text-center p-1.5 font-medium">{idx + 1}</td>
                        <td className="border border-slate-200 font-mono font-bold text-slate-900 p-1.5 text-center">
                          {row.kodeRekening}
                        </td>
                        <td className="border border-slate-200 font-medium text-slate-800 p-1.5 text-left">
                          <div>{row.namaRekening}</div>
                          {row.sekolahCount > 0 && (
                            <span className="text-[9px] text-slate-400 font-normal">
                              {row.sekolahCount} Sekolah Terlibat
                            </span>
                          )}
                        </td>
                        <td className="border border-slate-200 text-right p-1.5 font-medium">
                          {row.saldoAwalRp > 0 ? row.saldoAwalRp.toLocaleString('id-ID') : '-'}
                        </td>

                        {/* 12 Months Data Cells */}
                        {row.bulanan.map((m, mIdx) => (
                          <React.Fragment key={mIdx}>
                            <td className="border border-slate-200 text-right bg-emerald-50/30 p-1.5 text-emerald-800">
                              {m.masukRp > 0 ? m.masukRp.toLocaleString('id-ID') : '-'}
                            </td>
                            <td className="border border-slate-200 text-right bg-rose-50/30 p-1.5 text-rose-800">
                              {m.keluarRp > 0 ? m.keluarRp.toLocaleString('id-ID') : '-'}
                            </td>
                            <td className="border border-slate-200 text-right font-bold bg-slate-100 p-1.5 text-slate-900">
                              {m.saldoAkhirRp > 0 ? m.saldoAkhirRp.toLocaleString('id-ID') : '-'}
                            </td>
                          </React.Fragment>
                        ))}

                        <td className="border border-slate-200 text-center p-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDrillDownKodering(row.kodeRekening);
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded cursor-pointer"
                          >
                            Rincian
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4 + (12 * 3) + 1} className="text-center py-12 text-slate-400 italic">
                      Tidak ada data mutasi yang sesuai filter.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Grand Total Row */}
              {filteredRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold sticky bottom-0 z-20">
                    <td colSpan={3} className="border border-slate-700 px-3 py-2 text-right uppercase tracking-wider text-xs">
                      TOTAL KESELURUHAN KONSOLIDASI DINAS :
                    </td>
                    <td className="border border-slate-700 text-right p-1.5 text-amber-300">
                      {grandTotal.saldoAwalRp.toLocaleString('id-ID')}
                    </td>

                    {grandTotal.bulanan.map((m, idx) => (
                      <React.Fragment key={idx}>
                        <td className="border border-slate-700 text-right bg-emerald-950/70 p-1.5 text-emerald-300">
                          {m.masukRp > 0 ? m.masukRp.toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="border border-slate-700 text-right bg-rose-950/70 p-1.5 text-rose-300">
                          {m.keluarRp > 0 ? m.keluarRp.toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="border border-slate-700 text-right bg-slate-950 p-1.5 text-amber-300 font-black">
                          {m.saldoAkhirRp > 0 ? m.saldoAkhirRp.toLocaleString('id-ID') : '-'}
                        </td>
                      </React.Fragment>
                    ))}
                    <td className="border border-slate-700"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span>
            * Rumus baku persediaan: Saldo Akhir Bulan N = (Saldo Akhir Bulan N-1 + Mutasi Masuk) - Mutasi Keluar.
          </span>
          <span className="font-mono text-slate-400">
            Sumber Data: Transaksi Persediaan Riil Multi-Satuan Pendidikan Terverifikasi
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. DRILL DOWN DRAWER / MODAL: RINCIAN KONTRIBUSI SEKOLAH & TRANSAKSI      */}
      {/* ========================================================================= */}
      {drillDownKodering && activeDrillDownRow && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 uppercase">
                    Rincian Kontribusi Antar-Satuan Pendidikan
                  </span>
                  <span className="font-mono text-xs text-amber-300 font-bold">
                    {activeDrillDownRow.kodeRekening}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black tracking-tight mt-1 text-white">
                  {activeDrillDownRow.namaRekening}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Daftar sekolah yang mengelola dan mencatatkan mutasi belanja pada kode akun ini (TA {selectedYear}).
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDrillDownKodering(null);
                  setDrillDownSelectedSchoolId(null);
                }}
                className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-xl transition cursor-pointer"
                title="Tutup Jendela"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              
              {/* Top Stats for this Kodering */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Saldo Awal Gabungan</span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {formatRupiah(activeDrillDownRow.saldoAwalRp)}
                  </div>
                </div>
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase text-emerald-700">Total Mutasi Masuk</span>
                  <div className="text-sm font-bold text-emerald-800 mt-0.5">
                    {formatRupiah(activeDrillDownRow.totalMasukRp)}
                  </div>
                </div>
                <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-200">
                  <span className="text-[10px] font-bold uppercase text-rose-700">Total Mutasi Keluar</span>
                  <div className="text-sm font-bold text-rose-800 mt-0.5">
                    {formatRupiah(activeDrillDownRow.totalKeluarRp)}
                  </div>
                </div>
                <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-200">
                  <span className="text-[10px] font-bold uppercase text-indigo-700">Saldo Akhir Gabungan</span>
                  <div className="text-sm font-bold text-indigo-900 mt-0.5">
                    {formatRupiah(activeDrillDownRow.saldoAkhirTahunRp)}
                  </div>
                </div>
              </div>

              {/* Table of Schools Contributing to this Kodering */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Rincian Per Satuan Pendidikan ({activeDrillDownRow.sekolahBreakdown.length} Sekolah)
                </h4>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-10">NO</th>
                        <th className="py-2.5 px-3">SATUAN PENDIDIKAN</th>
                        <th className="py-2.5 px-3 text-center w-24">NPSN</th>
                        <th className="py-2.5 px-3 text-right">SALDO AWAL</th>
                        <th className="py-2.5 px-3 text-right text-emerald-700">TOTAL MASUK</th>
                        <th className="py-2.5 px-3 text-right text-rose-700">TOTAL KELUAR</th>
                        <th className="py-2.5 px-3 text-right text-indigo-700">SALDO AKHIR</th>
                        <th className="py-2.5 px-3 text-center w-28">DAFTAR BARANG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {activeDrillDownRow.sekolahBreakdown.map((s, sIdx) => {
                        const isSelected = drillDownSelectedSchoolId === s.sekolahId;
                        return (
                          <tr
                            key={s.sekolahId}
                            className={`hover:bg-slate-50 transition ${isSelected ? 'bg-indigo-50/70' : ''}`}
                          >
                            <td className="py-2 px-3 text-center text-slate-500">{sIdx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              {s.namaSekolah}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-slate-600">{s.npsn}</td>
                            <td className="py-2 px-3 text-right font-medium">
                              {s.saldoAwalRp > 0 ? formatRupiah(s.saldoAwalRp) : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-emerald-700">
                              {s.totalMasukRp > 0 ? formatRupiah(s.totalMasukRp) : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-rose-700">
                              {s.totalKeluarRp > 0 ? formatRupiah(s.totalKeluarRp) : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-indigo-900">
                              {s.saldoAkhirRp > 0 ? formatRupiah(s.saldoAkhirRp) : '-'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setDrillDownSelectedSchoolId(isSelected ? null : s.sekolahId)}
                                className={`text-[11px] font-bold px-2 py-1 rounded-md transition cursor-pointer flex items-center justify-center gap-1 w-full ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <span>{s.items.length} Item</span>
                                <ChevronDown className={`w-3 h-3 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sub-Level Drill Down: Specific Items of Selected School */}
              {activeDrillDownSchool && (
                <div className="p-4 bg-indigo-50/40 border border-indigo-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-indigo-700" />
                        Daftar Inventaris BHP Milik: {activeDrillDownSchool.namaSekolah}
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        Item barang yang terdaftar di bawah kode rekening {activeDrillDownRow.kodeRekening}
                      </p>
                    </div>

                    {onSelectSekolah && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSekolah(activeDrillDownSchool.sekolahId);
                          setDrillDownKodering(null);
                        }}
                        className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Buka Modul Sekolah</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase">
                        <tr>
                          <th className="py-2 px-3 text-center w-10">NO</th>
                          <th className="py-2 px-3">KODE BARANG</th>
                          <th className="py-2 px-3">NAMA BARANG</th>
                          <th className="py-2 px-3 text-center">SATUAN</th>
                          <th className="py-2 px-3 text-right">HARGA SATUAN</th>
                          <th className="py-2 px-3 text-center">STOK AWAL</th>
                          <th className="py-2 px-3 text-right">TOTAL NILAI AWAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeDrillDownSchool.items.length > 0 ? (
                          activeDrillDownSchool.items.map((b, bIdx) => {
                            const valAwal = (b.stokAwal || 0) * (b.hargaSatuan || 0);
                            return (
                              <tr key={b.id || bIdx} className="hover:bg-slate-50">
                                <td className="py-2 px-3 text-center text-slate-500">{bIdx + 1}</td>
                                <td className="py-2 px-3 font-mono text-slate-700">{b.kodeBarang || '-'}</td>
                                <td className="py-2 px-3 font-medium text-slate-900">{b.namaBarang}</td>
                                <td className="py-2 px-3 text-center text-slate-600">{b.satuan}</td>
                                <td className="py-2 px-3 text-right font-medium">{formatRupiah(b.hargaSatuan || 0)}</td>
                                <td className="py-2 px-3 text-center font-bold text-slate-800">{b.stokAwal || 0}</td>
                                <td className="py-2 px-3 text-right font-semibold text-slate-900">{formatRupiah(valAwal)}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="text-center py-6 text-slate-400 italic">
                              Tidak ada rincian barang individual untuk sekolah ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Pemerintah Daerah Provinsi Jawa Barat • Cabang Dinas Pendidikan Wilayah XIII
              </span>
              <button
                type="button"
                onClick={() => {
                  setDrillDownKodering(null);
                  setDrillDownSelectedSchoolId(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-xl transition cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL PRATINJAU CETAK LAPORAN RESMI DINAS                              */}
      {/* ========================================================================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
            
            {/* Modal Top Control Bar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-bold">Pratinjau Cetak Laporan Rekapitulasi Kodering Dinas</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Dokumen Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-2 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="p-8 sm:p-12 overflow-y-auto flex-1 font-serif text-black space-y-6 print:p-0 print:m-0">
              
              {/* Kop Surat Dinas */}
              <div className="text-center border-b-2 border-black pb-3 space-y-1">
                <p className="text-sm font-bold uppercase tracking-wider">PEMERINTAH DAERAH PROVINSI JAWA BARAT</p>
                <p className="text-base font-extrabold uppercase tracking-wide">DINAS PENDIDIKAN</p>
                <p className="text-lg font-black uppercase tracking-wide">CABANG DINAS PENDIDIKAN WILAYAH XIII</p>
                <p className="text-xs italic font-sans text-slate-700">
                  Wilayah Kerja: Kabupaten Ciamis, Kota Banjar, Kabupaten Pangandaran
                </p>
              </div>

              {/* Title */}
              <div className="text-center space-y-1 pt-2">
                <h3 className="text-base font-bold uppercase underline">
                  REKAPITULASI PER KODERING BELANJA BARANG HABIS PAKAI (BHP) BOS
                </h3>
                <p className="text-xs font-semibold uppercase font-sans">
                  TAHUN ANGGARAN {selectedYear} • {periodeLabel}
                </p>
                <p className="text-xs font-sans text-slate-700">
                  Konsolidasi: {selectedSekolah === 'ALL' ? `Seluruh Satuan Pendidikan (${sekolahList.length} Sekolah)` : schoolLookup.get(selectedSekolah)?.nama}
                </p>
              </div>

              {/* Printable Table */}
              <div className="pt-2">
                <table className="w-full border-collapse border border-black text-[10px] font-sans">
                  <thead>
                    <tr className="bg-slate-100 text-center font-bold">
                      <th className="border border-black p-1.5 w-8">NO</th>
                      <th className="border border-black p-1.5 w-32">KODE REKENING</th>
                      <th className="border border-black p-1.5 text-left">URAIAN AKUN BELANJA</th>
                      <th className="border border-black p-1.5 w-28 text-right">SALDO AWAL (Rp)</th>
                      <th className="border border-black p-1.5 w-28 text-right">MUTASI MASUK (Rp)</th>
                      <th className="border border-black p-1.5 w-28 text-right">MUTASI KELUAR (Rp)</th>
                      <th className="border border-black p-1.5 w-32 text-right">SALDO AKHIR (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r, i) => (
                      <tr key={r.kodeRekening}>
                        <td className="border border-black p-1.5 text-center">{i + 1}</td>
                        <td className="border border-black p-1.5 font-mono text-center font-bold">{r.kodeRekening}</td>
                        <td className="border border-black p-1.5">{r.namaRekening}</td>
                        <td className="border border-black p-1.5 text-right font-medium">
                          {r.saldoAwalRp > 0 ? r.saldoAwalRp.toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="border border-black p-1.5 text-right font-semibold">
                          {r.totalMasukRp > 0 ? r.totalMasukRp.toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="border border-black p-1.5 text-right font-semibold">
                          {r.totalKeluarRp > 0 ? r.totalKeluarRp.toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="border border-black p-1.5 text-right font-bold">
                          {r.saldoAkhirTahunRp > 0 ? r.saldoAkhirTahunRp.toLocaleString('id-ID') : '-'}
                        </td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="font-bold bg-slate-100">
                      <td colSpan={3} className="border border-black p-2 text-right uppercase">
                        TOTAL KESELURUHAN KONSOLIDASI :
                      </td>
                      <td className="border border-black p-2 text-right">{grandTotal.saldoAwalRp.toLocaleString('id-ID')}</td>
                      <td className="border border-black p-2 text-right">{grandTotal.totalMasukRp.toLocaleString('id-ID')}</td>
                      <td className="border border-black p-2 text-right">{grandTotal.totalKeluarRp.toLocaleString('id-ID')}</td>
                      <td className="border border-black p-2 text-right font-black">{grandTotal.saldoAkhirRp.toLocaleString('id-ID')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Legal Signatures Block */}
              <div className="pt-8 grid grid-cols-2 text-xs font-sans text-center">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-bold uppercase mt-1">KEPALA CABANG DINAS PENDIDIKAN WILAYAH XIII</p>
                  <div className="h-20" />
                  <p className="font-bold underline uppercase">DRA. HJ. IMAS ROHAYATI, M.PD.</p>
                  <p>Pembina Utama Muda / IV c</p>
                  <p>NIP. 19690321 199412 2 001</p>
                </div>
                <div>
                  <p>Ciamis, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="font-bold uppercase mt-1">PENANGGUNG JAWAB PENGELOLA PERSEDIAAN / ASET</p>
                  <div className="h-20" />
                  <p className="font-bold underline uppercase">H. DADANG KURNIAWAN, S.SOS., M.SI.</p>
                  <p>Penata Tingkat I / III d</p>
                  <p>NIP. 19760812 200212 1 003</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default LaporanDinasKodering;
