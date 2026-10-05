import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Layers,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Table as TableIcon
} from 'lucide-react';
import { Barang, Pejabat, Sekolah, TransaksiPenerimaan, TransaksiPengeluaran } from '../../types';
import { formatRupiah } from '../../utils/numberGenerator';
import { DEFAULT_PRIMARY_SEKOLAH_ID } from '../../data/defaultSchools';

export interface MutasiBulanData {
  tambahVol?: number;
  tambahRp?: number;
  kurangVol?: number;
  kurangRp?: number;
  saldoVol?: number;
  saldoRp?: number;
}

export interface ItemMutasiDinas {
  id?: string;
  schoolId: string;
  namaSekolah: string;
  npsn?: string;
  kodeRekening: string;
  namaRekening?: string;
  kodeBarang?: string;
  namaBarang: string;
  satuan: string;
  hargaSatuan: number;
  saldoAwalVol: number;
  saldoAwalRp: number;
  mutasiBulanan: MutasiBulanData[]; // 12 bulan (0 = Jan, 11 = Des)
}

export interface DinasMutasiBhpReportProps {
  schoolsData?: ItemMutasiDinas[];
  selectedYear?: number;
  sekolahList?: Sekolah[];
  allMasterBarang?: Barang[];
  allTransaksi?: TransaksiPengeluaran[];
  allPenerimaan?: TransaksiPenerimaan[];
  allPejabat?: Pejabat[];
  onSelectSekolah?: (schoolId: string) => void;
}

const MONTHS = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
];

/**
 * Helper to compute 12-month consolidated mutations for a school's BHP inventory
 */
function buildAggregatedDataFromRaw(
  sekolahList: Sekolah[] = [],
  allMasterBarang: Barang[] = [],
  allTransaksi: TransaksiPengeluaran[] = [],
  allPenerimaan: TransaksiPenerimaan[] = [],
  targetYear: number = 2026
): ItemMutasiDinas[] {
  const result: ItemMutasiDinas[] = [];

  // Filter out Belanja Modal (Only Barang Habis Pakai / BHP)
  const bhpBarang = allMasterBarang.filter(b => b.jenisBarang !== 'Belanja Modal');

  // Filter transactions by year
  const filteredPenerimaan = allPenerimaan.filter(p => {
    if (!p.tanggal) return false;
    return new Date(p.tanggal).getFullYear() === targetYear;
  });

  const filteredPengeluaran = allTransaksi.filter(t => {
    if (!t.tanggal) return false;
    return new Date(t.tanggal).getFullYear() === targetYear;
  });

  // Create school lookup
  const schoolLookup = new Map<string, Sekolah>();
  sekolahList.forEach(s => schoolLookup.set(s.id, s));

  bhpBarang.forEach(barang => {
    const rawSchoolId = barang.sekolah_id || DEFAULT_PRIMARY_SEKOLAH_ID;
    const schoolObj = schoolLookup.get(rawSchoolId) || sekolahList[0] || {
      id: rawSchoolId,
      nama: 'SMAN 1 CIHAURBEUTI',
      npsn: '20211512'
    };

    const saldoAwalVol = barang.stokAwal || 0;
    const hargaSatuan = barang.hargaSatuan || 0;
    const saldoAwalRp = saldoAwalVol * hargaSatuan;

    let runningVolume = saldoAwalVol;
    const mutasiBulanan: MutasiBulanData[] = [];

    for (let m = 0; m < 12; m++) {
      let masukVol = 0;
      let masukRp = 0;

      // Inflow check
      filteredPenerimaan.forEach(p => {
        const dt = new Date(p.tanggal);
        if (dt.getMonth() === m) {
          const matchSchool = !p.sekolah_id || p.sekolah_id === rawSchoolId;
          if (matchSchool) {
            p.items?.forEach(it => {
              const matchId = it.barangId && it.barangId === barang.id;
              const matchCode = it.kodeBarang && barang.kodeBarang && it.kodeBarang === barang.kodeBarang;
              const matchName = it.namaBarang && barang.namaBarang && it.namaBarang.toLowerCase().trim() === barang.namaBarang.toLowerCase().trim();
              if ((matchId || matchCode || matchName) && it.jumlahMasuk > 0) {
                masukVol += it.jumlahMasuk;
                const price = it.hargaSatuan && it.hargaSatuan > 0 ? it.hargaSatuan : hargaSatuan;
                masukRp += (it.jumlahMasuk * price);
              }
            });
          }
        }
      });

      // Outflow check
      let keluarVol = 0;
      let keluarRp = 0;

      filteredPengeluaran.forEach(t => {
        const dt = new Date(t.tanggal);
        if (dt.getMonth() === m) {
          const matchSchool = !t.sekolah_id || t.sekolah_id === rawSchoolId;
          if (matchSchool) {
            t.items?.forEach(it => {
              const matchId = it.barangId && it.barangId === barang.id;
              const matchCode = it.kodeBarang && barang.kodeBarang && it.kodeBarang === barang.kodeBarang;
              const matchName = it.namaBarang && barang.namaBarang && it.namaBarang.toLowerCase().trim() === barang.namaBarang.toLowerCase().trim();
              const qty = it.usulanJumlah || 0;
              if ((matchId || matchCode || matchName) && qty > 0) {
                keluarVol += qty;
                const price = it.hargaSatuan && it.hargaSatuan > 0 ? it.hargaSatuan : hargaSatuan;
                keluarRp += (qty * price);
              }
            });
          }
        }
      });

      runningVolume = Math.max(0, runningVolume + masukVol - keluarVol);
      const saldoRp = runningVolume * hargaSatuan;

      mutasiBulanan.push({
        tambahVol: masukVol,
        tambahRp: masukRp,
        kurangVol: keluarVol,
        kurangRp: keluarRp,
        saldoVol: runningVolume,
        saldoRp: saldoRp
      });
    }

    result.push({
      id: barang.id,
      schoolId: schoolObj.id,
      namaSekolah: schoolObj.nama,
      npsn: schoolObj.npsn,
      kodeRekening: barang.kodeRekening || '5.1.02.01.01.0024',
      namaRekening: barang.namaRekening || 'Belanja Alat Tulis Kantor',
      kodeBarang: barang.kodeBarang,
      namaBarang: barang.namaBarang,
      satuan: barang.satuan || 'Buah',
      hargaSatuan: hargaSatuan,
      saldoAwalVol: saldoAwalVol,
      saldoAwalRp: saldoAwalRp,
      mutasiBulanan: mutasiBulanan
    });
  });

  return result;
}

export const DinasMutasiBhpReport: React.FC<DinasMutasiBhpReportProps> = ({
  schoolsData,
  selectedYear = 2026,
  sekolahList = [],
  allMasterBarang = [],
  allTransaksi = [],
  allPenerimaan = [],
  onSelectSekolah
}) => {
  const [selectedSchool, setSelectedSchool] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'detail' | 'agregat'>('detail');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Compute dataset: either from prop `schoolsData` or dynamically computed from raw collections
  const rawDataset = useMemo(() => {
    if (schoolsData && schoolsData.length > 0) {
      return schoolsData;
    }
    return buildAggregatedDataFromRaw(
      sekolahList,
      allMasterBarang,
      allTransaksi,
      allPenerimaan,
      selectedYear
    );
  }, [schoolsData, sekolahList, allMasterBarang, allTransaksi, allPenerimaan, selectedYear]);

  // Unique list of schools for selector dropdown
  const availableSchools = useMemo(() => {
    const map = new Map<string, { id: string; nama: string; npsn?: string }>();
    if (sekolahList && sekolahList.length > 0) {
      sekolahList.forEach(s => map.set(s.id, { id: s.id, nama: s.nama, npsn: s.npsn }));
    }
    rawDataset.forEach(item => {
      if (!map.has(item.schoolId)) {
        map.set(item.schoolId, { id: item.schoolId, nama: item.namaSekolah, npsn: item.npsn });
      }
    });
    return Array.from(map.values());
  }, [sekolahList, rawDataset]);

  // Filtered dataset for Detail Mode
  const filteredData = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return rawDataset.filter(item => {
      const matchSchool = selectedSchool === 'ALL' || item.schoolId === selectedSchool;
      const matchSearch =
        !q ||
        item.namaBarang.toLowerCase().includes(q) ||
        item.kodeRekening.includes(q) ||
        item.namaSekolah.toLowerCase().includes(q) ||
        (item.namaRekening && item.namaRekening.toLowerCase().includes(q));
      return matchSchool && matchSearch;
    });
  }, [rawDataset, selectedSchool, searchTerm]);

  // Aggregate Data Per School for Mode Agregat
  const schoolAggregates = useMemo(() => {
    const map = new Map<string, {
      schoolId: string;
      namaSekolah: string;
      npsn: string;
      jumlahItemBHP: number;
      saldoAwalRp: number;
      mutasiBulanan: {
        tambahVol: number;
        tambahRp: number;
        kurangVol: number;
        kurangRp: number;
        saldoVol: number;
        saldoRp: number;
      }[];
    }>();

    // Initialize with available schools
    availableSchools.forEach(sch => {
      map.set(sch.id, {
        schoolId: sch.id,
        namaSekolah: sch.nama,
        npsn: sch.npsn || '-',
        jumlahItemBHP: 0,
        saldoAwalRp: 0,
        mutasiBulanan: Array.from({ length: 12 }, () => ({
          tambahVol: 0,
          tambahRp: 0,
          kurangVol: 0,
          kurangRp: 0,
          saldoVol: 0,
          saldoRp: 0
        }))
      });
    });

    rawDataset.forEach(item => {
      let record = map.get(item.schoolId);
      if (!record) {
        record = {
          schoolId: item.schoolId,
          namaSekolah: item.namaSekolah,
          npsn: item.npsn || '-',
          jumlahItemBHP: 0,
          saldoAwalRp: 0,
          mutasiBulanan: Array.from({ length: 12 }, () => ({
            tambahVol: 0,
            tambahRp: 0,
            kurangVol: 0,
            kurangRp: 0,
            saldoVol: 0,
            saldoRp: 0
          }))
        };
        map.set(item.schoolId, record);
      }

      record.jumlahItemBHP += 1;
      record.saldoAwalRp += item.saldoAwalRp;

      item.mutasiBulanan.forEach((m, idx) => {
        if (record.mutasiBulanan[idx]) {
          record.mutasiBulanan[idx].tambahVol += m.tambahVol || 0;
          record.mutasiBulanan[idx].tambahRp += m.tambahRp || 0;
          record.mutasiBulanan[idx].kurangVol += m.kurangVol || 0;
          record.mutasiBulanan[idx].kurangRp += m.kurangRp || 0;
          record.mutasiBulanan[idx].saldoVol += m.saldoVol || 0;
          record.mutasiBulanan[idx].saldoRp += m.saldoRp || 0;
        }
      });
    });

    // Apply school filter & search filter to aggregated list as well
    const q = searchTerm.toLowerCase().trim();
    return Array.from(map.values()).filter(sch => {
      const matchSchool = selectedSchool === 'ALL' || sch.schoolId === selectedSchool;
      const matchSearch = !q || sch.namaSekolah.toLowerCase().includes(q) || sch.npsn.includes(q);
      return matchSchool && matchSearch;
    });
  }, [availableSchools, rawDataset, selectedSchool, searchTerm]);

  // Grand Totals for Detailed View
  const grandTotalDetail = useMemo(() => {
    let saldoAwalRp = 0;
    const bulanan = Array.from({ length: 12 }, () => ({
      tambahVol: 0,
      tambahRp: 0,
      kurangVol: 0,
      kurangRp: 0,
      saldoVol: 0,
      saldoRp: 0
    }));

    filteredData.forEach(row => {
      saldoAwalRp += row.saldoAwalRp;
      row.mutasiBulanan.forEach((m, idx) => {
        bulanan[idx].tambahVol += m.tambahVol || 0;
        bulanan[idx].tambahRp += m.tambahRp || 0;
        bulanan[idx].kurangVol += m.kurangVol || 0;
        bulanan[idx].kurangRp += m.kurangRp || 0;
        bulanan[idx].saldoVol += m.saldoVol || 0;
        bulanan[idx].saldoRp += m.saldoRp || 0;
      });
    });

    return { saldoAwalRp, bulanan };
  }, [filteredData]);

  // Grand Totals for Agregat View
  const grandTotalAgregat = useMemo(() => {
    let totalItems = 0;
    let saldoAwalRp = 0;
    let totalTambahTahunRp = 0;
    let totalKurangTahunRp = 0;
    let totalSaldoAkhirTahunRp = 0;

    const bulanan = Array.from({ length: 12 }, () => ({
      tambahRp: 0,
      kurangRp: 0,
      saldoRp: 0
    }));

    schoolAggregates.forEach(sch => {
      totalItems += sch.jumlahItemBHP;
      saldoAwalRp += sch.saldoAwalRp;

      let sumTambah = 0;
      let sumKurang = 0;

      sch.mutasiBulanan.forEach((m, idx) => {
        bulanan[idx].tambahRp += m.tambahRp;
        bulanan[idx].kurangRp += m.kurangRp;
        bulanan[idx].saldoRp += m.saldoRp;
        sumTambah += m.tambahRp;
        sumKurang += m.kurangRp;
      });

      totalTambahTahunRp += sumTambah;
      totalKurangTahunRp += sumKurang;
      totalSaldoAkhirTahunRp += sch.mutasiBulanan[11]?.saldoRp || 0;
    });

    return {
      totalItems,
      saldoAwalRp,
      totalTambahTahunRp,
      totalKurangTahunRp,
      totalSaldoAkhirTahunRp,
      bulanan
    };
  }, [schoolAggregates]);

  // Export to Excel (Full 12-Month Multi-Level Structure)
  const handleExportExcel = () => {
    try {
      setIsExporting(true);

      const wb = XLSX.utils.book_new();

      // ==========================================
      // SHEET 1: KONSOLIDASI RINCI 12 BULAN
      // ==========================================
      const headerRows: any[][] = [
        [`DAFTAR MUTASI BARANG HABIS PAKAI (BHP) BOS TAHUN ${selectedYear}`],
        [`CABANG DINAS PENDIDIKAN WILAYAH XIII / DINAS PENDIDIKAN PROVINSI JAWA BARAT`],
        [`REKAPITULASI KONSOLIDASI TINGKAT DINAS - FILTER: ${selectedSchool === 'ALL' ? 'SELURUH SEKOLAH' : selectedSchool}`],
        [] // empty spacer
      ];

      // Row 4: Level 1 Header
      const rowLvl1: any[] = [
        'NO',
        'NAMA SEKOLAH',
        'KODE REKENING',
        'NAMA BARANG',
        'SATUAN',
        'HARGA SATUAN',
        'SALDO AWAL JANUARI',
        '' // colSpan 2
      ];
      MONTHS.forEach(m => {
        rowLvl1.push(m, '', '', '', '', '');
      });

      // Row 5: Level 2 Header
      const rowLvl2: any[] = [
        '', '', '', '', '', '',
        '', '',
      ];
      MONTHS.forEach(() => {
        rowLvl2.push(
          'PENAMBAHAN', '',
          'PENGURANGAN', '',
          'SALDO AKHIR', ''
        );
      });

      // Row 6: Level 3 Header (VOL & RP)
      const rowLvl3: any[] = [
        '', '', '', '', '', '',
        'VOL', 'JUMLAH (Rp)'
      ];
      MONTHS.forEach(() => {
        rowLvl3.push(
          'VOL', 'JUMLAH (Rp)',
          'VOL', 'JUMLAH (Rp)',
          'VOL', 'JUMLAH (Rp)'
        );
      });

      const dataRows: any[][] = [];

      filteredData.forEach((row, idx) => {
        const itemRow: any[] = [
          idx + 1,
          row.namaSekolah,
          row.kodeRekening,
          row.namaBarang,
          row.satuan,
          row.hargaSatuan,
          row.saldoAwalVol || 0,
          row.saldoAwalRp || 0
        ];

        row.mutasiBulanan.forEach(m => {
          itemRow.push(
            m.tambahVol || 0,
            m.tambahRp || 0,
            m.kurangVol || 0,
            m.kurangRp || 0,
            m.saldoVol || 0,
            m.saldoRp || 0
          );
        });

        dataRows.push(itemRow);
      });

      // Grand Total Row in Excel
      const totalRow: any[] = [
        'TOTAL',
        'KONSOLIDASI SELURUH SEKOLAH',
        '', '', '', '',
        '', // Saldo Awal Vol
        grandTotalDetail.saldoAwalRp
      ];

      grandTotalDetail.bulanan.forEach(m => {
        totalRow.push(
          m.tambahVol,
          m.tambahRp,
          m.kurangVol,
          m.kurangRp,
          m.saldoVol,
          m.saldoRp
        );
      });

      dataRows.push(totalRow);

      const allSheet1Rows = [
        ...headerRows,
        rowLvl1,
        rowLvl2,
        rowLvl3,
        ...dataRows
      ];

      const ws1 = XLSX.utils.aoa_to_sheet(allSheet1Rows);

      // Define multi-tier merges for Sheet 1
      const merges1: XLSX.Range[] = [
        // Title merges
        { s: { r: 0, c: 0 }, e: { r: 0, c: 79 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 79 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 79 } },

        // Fixed Identitas Columns (Rows 4 to 6 -> indexes 4 to 6)
        { s: { r: 4, c: 0 }, e: { r: 6, c: 0 } }, // NO
        { s: { r: 4, c: 1 }, e: { r: 6, c: 1 } }, // NAMA SEKOLAH
        { s: { r: 4, c: 2 }, e: { r: 6, c: 2 } }, // KODE REKENING
        { s: { r: 4, c: 3 }, e: { r: 6, c: 3 } }, // NAMA BARANG
        { s: { r: 4, c: 4 }, e: { r: 6, c: 4 } }, // SATUAN
        { s: { r: 4, c: 5 }, e: { r: 6, c: 5 } }, // HARGA SATUAN

        // Saldo Awal Header (col 6 & 7)
        { s: { r: 4, c: 6 }, e: { r: 5, c: 7 } }, // SALDO AWAL JANUARI
      ];

      // Merge 12 Months Blocks
      MONTHS.forEach((_, idx) => {
        const colStart = 8 + (idx * 6);
        // Month title spans 6 columns across row 4
        merges1.push({
          s: { r: 4, c: colStart },
          e: { r: 4, c: colStart + 5 }
        });
        // Row 5: Penambahan spans 2 cols, Pengurangan spans 2 cols, Saldo Akhir spans 2 cols
        merges1.push(
          { s: { r: 5, c: colStart }, e: { r: 5, c: colStart + 1 } },
          { s: { r: 5, c: colStart + 2 }, e: { r: 5, c: colStart + 3 } },
          { s: { r: 5, c: colStart + 4 }, e: { r: 5, c: colStart + 5 } }
        );
      });

      // Total row label merge
      const totalRowIndex = allSheet1Rows.length - 1;
      merges1.push({
        s: { r: totalRowIndex, c: 0 },
        e: { r: totalRowIndex, c: 5 }
      });

      ws1['!merges'] = merges1;
      XLSX.utils.book_append_sheet(wb, ws1, 'KONSOLIDASI_RINCI_12_BULAN');

      // ==========================================
      // SHEET 2: REKAP AGREGAT PER SEKOLAH
      // ==========================================
      const sheet2Rows: any[][] = [
        [`REKAPITULASI AGREGAT MUTASI BARANG HABIS PAKAI (BHP) PER SEKOLAH`],
        [`CABANG DINAS PENDIDIKAN WILAYAH XIII - TAHUN ANGGARAN ${selectedYear}`],
        [],
        [
          'NO',
          'NAMA SATUAN PENDIDIKAN',
          'NPSN',
          'TOTAL ITEM BHP',
          'SALDO AWAL (Rp)',
          ...MONTHS.map(m => `SALDO AKHIR ${m} (Rp)`),
          'TOTAL PENAMBAHAN 1 TAHUN (Rp)',
          'TOTAL PENGURANGAN 1 TAHUN (Rp)',
          'SALDO AKHIR 31 DESEMBER (Rp)'
        ]
      ];

      schoolAggregates.forEach((sch, idx) => {
        let sumTambah = 0;
        let sumKurang = 0;
        sch.mutasiBulanan.forEach(m => {
          sumTambah += m.tambahRp;
          sumKurang += m.kurangRp;
        });

        sheet2Rows.push([
          idx + 1,
          sch.namaSekolah,
          sch.npsn,
          sch.jumlahItemBHP,
          sch.saldoAwalRp,
          ...sch.mutasiBulanan.map(m => m.saldoRp),
          sumTambah,
          sumKurang,
          sch.mutasiBulanan[11]?.saldoRp || 0
        ]);
      });

      // Grand total for Sheet 2
      sheet2Rows.push([
        'TOTAL',
        'KONSOLIDASI SELURUH SEKOLAH',
        '',
        grandTotalAgregat.totalItems,
        grandTotalAgregat.saldoAwalRp,
        ...grandTotalAgregat.bulanan.map(m => m.saldoRp),
        grandTotalAgregat.totalTambahTahunRp,
        grandTotalAgregat.totalKurangTahunRp,
        grandTotalAgregat.totalSaldoAkhirTahunRp
      ]);

      const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
      ws2['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 18 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 18 } },
        { s: { r: sheet2Rows.length - 1, c: 0 }, e: { r: sheet2Rows.length - 1, c: 2 } }
      ];

      XLSX.utils.book_append_sheet(wb, ws2, 'AGREGAT_PER_SEKOLAH');

      // Trigger download
      const fileName = `DAFTAR_MUTASI_BHP_DINAS_TA_${selectedYear}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('Gagal mengunduh file Excel. Pastikan data mutasi valid.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden p-4 sm:p-6 space-y-5">
      
      {/* ======================================================== */}
      {/* HEADER CONTROL & TITLE                                  */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase tracking-wider">
              Tingkat Cabang Dinas Wilayah XIII
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              TA {selectedYear} • AKTIF
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-700" />
            DAFTAR MUTASI BARANG HABIS PAKAI (BHP) BOS TAHUN {selectedYear}
          </h1>
          <p className="text-xs font-semibold text-slate-600 mt-0.5 uppercase tracking-wide">
            CABANG DINAS PENDIDIKAN WILAYAH XIII / DINAS PENDIDIKAN PROVINSI JAWA BARAT
          </p>
          <p className="text-[11px] text-slate-500">
            Rekapitulasi Konsolidasi 12 Bulan (Januari s.d. Desember) dari Seluruh Satuan Pendidikan
          </p>
        </div>

        {/* Action Buttons & View Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setViewMode('detail')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'detail'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Mode Konsolidasi Rinci</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agregat')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'agregat'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mode Agregat Per Sekolah</span>
            </button>
          </div>

          {/* Button Export Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            title="Export Excel 12 Bulan Lengkap (Multi-level Header & Formulas)"
          >
            {isExporting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Memproses Excel...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel 12 Bulan</span>
              </>
            )}
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            title="Cetak Dokumen"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* FILTER & SEARCH BAR                                      */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Filter Sekolah */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Sekolah:
            </span>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-800 max-w-[240px]"
            >
              <option value="ALL">-- Seluruh Sekolah (Konsolidasi) --</option>
              {availableSchools.map(sch => (
                <option key={sch.id} value={sch.id}>
                  {sch.nama} {sch.npsn ? `(${sch.npsn})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari Barang / Sekolah / Kode Rekening..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-3 text-xs text-slate-600 self-end sm:self-center">
          <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-medium">
            <span>Ditampilkan: </span>
            <strong className="text-indigo-700">
              {viewMode === 'detail' ? `${filteredData.length} Barang` : `${schoolAggregates.length} Sekolah`}
            </strong>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAMPILAN 1: MODE KONSOLIDASI RINCI (TABEL 12 BULAN LENGKAP) */}
      {/* ======================================================== */}
      {viewMode === 'detail' && (
        <div className="space-y-2">
          <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-xs max-h-[72vh]">
            <table className="w-full border-collapse text-[11px] whitespace-nowrap">
              <thead>
                {/* ROW 1: HEADER BULAN & KATEGORI */}
                <tr className="bg-slate-800 text-white text-center font-bold uppercase tracking-wider sticky top-0 z-20">
                  <th rowSpan={3} className="border border-slate-600 px-2.5 py-2 min-w-[40px]">NO</th>
                  <th rowSpan={3} className="border border-slate-600 px-3 py-2 min-w-[170px] text-left">NAMA SEKOLAH</th>
                  <th rowSpan={3} className="border border-slate-600 px-3 py-2 min-w-[130px]">KODE REKENING</th>
                  <th rowSpan={3} className="border border-slate-600 px-4 py-2 min-w-[220px] text-left">NAMA BARANG</th>
                  <th rowSpan={3} className="border border-slate-600 px-2.5 py-2 min-w-[70px]">SATUAN</th>
                  <th rowSpan={3} className="border border-slate-600 px-3 py-2 min-w-[100px] text-right">HARGA SATUAN</th>
                  <th colSpan={2} rowSpan={2} className="border border-slate-600 px-3 py-2 bg-slate-700">SALDO AWAL JANUARI</th>

                  {/* Loop Header 12 Bulan */}
                  {MONTHS.map((m, idx) => (
                    <th key={idx} colSpan={6} className="border border-slate-600 px-3 py-1 bg-indigo-900 border-l-2 border-l-amber-400">
                      {m}
                    </th>
                  ))}
                </tr>

                {/* ROW 2: PENAMBAHAN, PENGURANGAN & SALDO AKHIR BULAN */}
                <tr className="bg-slate-700 text-white text-center font-bold sticky top-[33px] z-20">
                  {MONTHS.map((_, idx) => (
                    <React.Fragment key={idx}>
                      <th colSpan={2} className="border border-slate-600 px-2 py-1 bg-emerald-800">PENAMBAHAN</th>
                      <th colSpan={2} className="border border-slate-600 px-2 py-1 bg-rose-800">PENGURANGAN</th>
                      <th colSpan={2} className="border border-slate-600 px-2 py-1 bg-slate-800">SALDO AKHIR</th>
                    </React.Fragment>
                  ))}
                </tr>

                {/* ROW 3: SUB-HEADER VOLUME & JUMLAH RP */}
                <tr className="bg-slate-100 text-slate-800 text-center font-semibold text-[10px] sticky top-[57px] z-20 border-b-2 border-slate-400">
                  <th className="border border-slate-300 px-2 py-1">VOL</th>
                  <th className="border border-slate-300 px-2 py-1">JUMLAH (Rp)</th>

                  {MONTHS.map((_, idx) => (
                    <React.Fragment key={idx}>
                      <th className="border border-slate-300 px-1 py-1 bg-emerald-50">VOL</th>
                      <th className="border border-slate-300 px-2 py-1 bg-emerald-50">JUMLAH (Rp)</th>
                      <th className="border border-slate-300 px-1 py-1 bg-rose-50">VOL</th>
                      <th className="border border-slate-300 px-2 py-1 bg-rose-50">JUMLAH (Rp)</th>
                      <th className="border border-slate-300 px-1 py-1 bg-slate-200">VOL</th>
                      <th className="border border-slate-300 px-2 py-1 bg-slate-200">JUMLAH (Rp)</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              {/* BODY DATA KONSOLIDASI */}
              <tbody className="divide-y divide-slate-200">
                {filteredData.length > 0 ? (
                  filteredData.map((row, index) => (
                    <tr key={row.id || index} className="hover:bg-slate-50 transition">
                      <td className="border border-slate-200 text-center p-1.5">{index + 1}</td>
                      <td className="border border-slate-200 font-semibold text-indigo-700 p-1.5 text-left">
                        {row.namaSekolah}
                      </td>
                      <td className="border border-slate-200 font-mono text-center p-1.5">{row.kodeRekening}</td>
                      <td className="border border-slate-200 font-medium p-1.5 text-left">
                        <div>{row.namaBarang}</div>
                        {row.namaRekening && (
                          <div className="text-[9px] text-slate-400 font-normal">{row.namaRekening}</div>
                        )}
                      </td>
                      <td className="border border-slate-200 text-center p-1.5">{row.satuan}</td>
                      <td className="border border-slate-200 text-right p-1.5">
                        {row.hargaSatuan > 0 ? row.hargaSatuan.toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="border border-slate-200 text-center p-1.5">
                        {row.saldoAwalVol > 0 ? row.saldoAwalVol : '-'}
                      </td>
                      <td className="border border-slate-200 text-right font-medium p-1.5">
                        {row.saldoAwalRp > 0 ? row.saldoAwalRp.toLocaleString('id-ID') : '-'}
                      </td>

                      {/* Loop Render Data Mutasi 12 Bulan */}
                      {MONTHS.map((_, mIdx) => {
                        const mutasiBulan = row.mutasiBulanan?.[mIdx] || {};
                        return (
                          <React.Fragment key={mIdx}>
                            <td className="border border-slate-200 text-center bg-emerald-50/30 p-1.5">
                              {mutasiBulan.tambahVol && mutasiBulan.tambahVol > 0 ? mutasiBulan.tambahVol : '-'}
                            </td>
                            <td className="border border-slate-200 text-right bg-emerald-50/30 p-1.5">
                              {mutasiBulan.tambahRp && mutasiBulan.tambahRp > 0
                                ? mutasiBulan.tambahRp.toLocaleString('id-ID')
                                : '-'}
                            </td>
                            <td className="border border-slate-200 text-center bg-rose-50/30 p-1.5">
                              {mutasiBulan.kurangVol && mutasiBulan.kurangVol > 0 ? mutasiBulan.kurangVol : '-'}
                            </td>
                            <td className="border border-slate-200 text-right bg-rose-50/30 p-1.5">
                              {mutasiBulan.kurangRp && mutasiBulan.kurangRp > 0
                                ? mutasiBulan.kurangRp.toLocaleString('id-ID')
                                : '-'}
                            </td>
                            <td className="border border-slate-200 text-center font-bold bg-slate-100 p-1.5">
                              {mutasiBulan.saldoVol !== undefined && mutasiBulan.saldoVol > 0
                                ? mutasiBulan.saldoVol
                                : '-'}
                            </td>
                            <td className="border border-slate-200 text-right font-bold bg-slate-100 p-1.5">
                              {mutasiBulan.saldoRp !== undefined && mutasiBulan.saldoRp > 0
                                ? mutasiBulan.saldoRp.toLocaleString('id-ID')
                                : '-'}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6 + 2 + (12 * 6)} className="text-center py-10 text-slate-400 italic">
                      Tidak ada data mutasi persediaan untuk filter yang dipilih.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* FOOTER TOTAL KONSOLIDASI */}
              {filteredData.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold sticky bottom-0 z-20">
                    <td colSpan={6} className="border border-slate-700 px-3 py-2 text-right uppercase tracking-wider text-xs">
                      TOTAL KONSOLIDASI SELURUH SEKOLAH :
                    </td>
                    <td className="border border-slate-700 text-center p-1.5">-</td>
                    <td className="border border-slate-700 text-right p-1.5 text-amber-300">
                      {grandTotalDetail.saldoAwalRp.toLocaleString('id-ID')}
                    </td>
                    {grandTotalDetail.bulanan.map((m, idx) => (
                      <React.Fragment key={idx}>
                        <td className="border border-slate-700 text-center bg-emerald-950/70 p-1.5">
                          {m.tambahVol > 0 ? m.tambahVol : '-'}
                        </td>
                        <td className="border border-slate-700 text-right bg-emerald-950/70 p-1.5 text-emerald-300">
                          {m.tambahRp > 0 ? m.tambahRp.toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="border border-slate-700 text-center bg-rose-950/70 p-1.5">
                          {m.kurangVol > 0 ? m.kurangVol : '-'}
                        </td>
                        <td className="border border-slate-700 text-right bg-rose-950/70 p-1.5 text-rose-300">
                          {m.kurangRp > 0 ? m.kurangRp.toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="border border-slate-700 text-center bg-slate-950 p-1.5">
                          {m.saldoVol > 0 ? m.saldoVol : '-'}
                        </td>
                        <td className="border border-slate-700 text-right bg-slate-950 p-1.5 text-amber-300">
                          {m.saldoRp > 0 ? m.saldoRp.toLocaleString('id-ID') : '-'}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>* Geser tabel secara horizontal untuk memeriksa mutasi 12 bulan penuh (Januari - Desember).</span>
            <span>Nilai Saldo Akhir Bulan = Saldo Awal + Penambahan - Pengurangan</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAMPILAN 2: MODE AGREGAT PER SEKOLAH                    */}
      {/* ======================================================== */}
      {viewMode === 'agregat' && (
        <div className="space-y-2">
          <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-xs max-h-[72vh]">
            <table className="w-full border-collapse text-[11px] whitespace-nowrap">
              <thead>
                <tr className="bg-slate-800 text-white text-center font-bold uppercase tracking-wider sticky top-0 z-20">
                  <th rowSpan={2} className="border border-slate-600 px-2.5 py-2 min-w-[40px]">NO</th>
                  <th rowSpan={2} className="border border-slate-600 px-3 py-2 min-w-[200px] text-left">NAMA SATUAN PENDIDIKAN</th>
                  <th rowSpan={2} className="border border-slate-600 px-3 py-2 min-w-[90px]">NPSN</th>
                  <th rowSpan={2} className="border border-slate-600 px-2.5 py-2 min-w-[80px]">TOTAL ITEM BHP</th>
                  <th rowSpan={2} className="border border-slate-600 px-3 py-2 min-w-[120px] bg-slate-700">SALDO AWAL (Rp)</th>
                  <th colSpan={12} className="border border-slate-600 px-3 py-1 bg-indigo-900">
                    SALDO AKHIR BULANAN (Rp)
                  </th>
                  <th rowSpan={2} className="border border-slate-600 px-3 py-2 min-w-[120px] bg-emerald-900">TOTAL PENAMBAHAN (Rp)</th>
                  <th rowSpan={2} className="border border-slate-600 px-3 py-2 min-w-[120px] bg-rose-900">TOTAL PENGURANGAN (Rp)</th>
                  <th rowSpan={2} className="border border-slate-600 px-3 py-2 min-w-[130px] bg-slate-900 text-amber-300">SALDO AKHIR 31 DES (Rp)</th>
                </tr>
                <tr className="bg-slate-700 text-white text-center font-semibold text-[10px] sticky top-[33px] z-20">
                  {MONTHS.map((m, idx) => (
                    <th key={idx} className="border border-slate-600 px-2 py-1 min-w-[90px]">
                      {m.slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {schoolAggregates.length > 0 ? (
                  schoolAggregates.map((sch, idx) => {
                    let sumTambah = 0;
                    let sumKurang = 0;
                    sch.mutasiBulanan.forEach(m => {
                      sumTambah += m.tambahRp;
                      sumKurang += m.kurangRp;
                    });
                    const saldoAkhirTahun = sch.mutasiBulanan[11]?.saldoRp || 0;

                    return (
                      <tr key={sch.schoolId || idx} className="hover:bg-slate-50 transition">
                        <td className="border border-slate-200 text-center p-2 font-medium">{idx + 1}</td>
                        <td className="border border-slate-200 font-bold text-slate-900 p-2 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <span>{sch.namaSekolah}</span>
                            {onSelectSekolah && (
                              <button
                                type="button"
                                onClick={() => onSelectSekolah(sch.schoolId)}
                                className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                                title="Buka Detail Mutasi Satuan Pendidikan"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Detail</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="border border-slate-200 text-center font-mono p-2">{sch.npsn}</td>
                        <td className="border border-slate-200 text-center p-2 font-semibold text-indigo-700">
                          {sch.jumlahItemBHP} Item
                        </td>
                        <td className="border border-slate-200 text-right p-2 font-medium">
                          {sch.saldoAwalRp.toLocaleString('id-ID')}
                        </td>

                        {/* 12 Months Saldo Akhir */}
                        {sch.mutasiBulanan.map((m, mIdx) => (
                          <td key={mIdx} className="border border-slate-200 text-right p-2">
                            {m.saldoRp > 0 ? m.saldoRp.toLocaleString('id-ID') : '-'}
                          </td>
                        ))}

                        <td className="border border-slate-200 text-right p-2 font-semibold text-emerald-700 bg-emerald-50/30">
                          {sumTambah > 0 ? sumTambah.toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="border border-slate-200 text-right p-2 font-semibold text-rose-700 bg-rose-50/30">
                          {sumKurang > 0 ? sumKurang.toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="border border-slate-200 text-right p-2 font-bold text-slate-900 bg-slate-100">
                          {saldoAkhirTahun.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={19} className="text-center py-10 text-slate-400 italic">
                      Tidak ada data agregat mutasi untuk filter yang dipilih.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* FOOTER TOTAL AGREGAT */}
              {schoolAggregates.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold sticky bottom-0 z-20">
                    <td colSpan={3} className="border border-slate-700 px-3 py-2 text-right uppercase tracking-wider text-xs">
                      TOTAL KONSOLIDASI SELURUH SEKOLAH :
                    </td>
                    <td className="border border-slate-700 text-center p-2 text-indigo-300">
                      {grandTotalAgregat.totalItems} Item
                    </td>
                    <td className="border border-slate-700 text-right p-2 text-amber-300">
                      {grandTotalAgregat.saldoAwalRp.toLocaleString('id-ID')}
                    </td>

                    {/* 12 Months Footer */}
                    {grandTotalAgregat.bulanan.map((m, idx) => (
                      <td key={idx} className="border border-slate-700 text-right p-2 text-indigo-200">
                        {m.saldoRp > 0 ? m.saldoRp.toLocaleString('id-ID') : '-'}
                      </td>
                    ))}

                    <td className="border border-slate-700 text-right p-2 text-emerald-300 bg-emerald-950/60">
                      {grandTotalAgregat.totalTambahTahunRp.toLocaleString('id-ID')}
                    </td>
                    <td className="border border-slate-700 text-right p-2 text-rose-300 bg-rose-950/60">
                      {grandTotalAgregat.totalKurangTahunRp.toLocaleString('id-ID')}
                    </td>
                    <td className="border border-slate-700 text-right p-2 text-amber-300 bg-slate-950">
                      {grandTotalAgregat.totalSaldoAkhirTahunRp.toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Institutional Sign-off footer info */}
      <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
          <span>Pengelolaan Persediaan &amp; Aset Milik Daerah (BOS/APBD) - Cabang Dinas Pendidikan Wilayah XIII</span>
        </div>
        <div className="font-mono text-slate-400">
          Format Baku 12 Bulan • Konsolidasi Multi-Tenant
        </div>
      </div>

    </div>
  );
};

export default DinasMutasiBhpReport;
