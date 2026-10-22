import React, { useEffect, useMemo, useState } from 'react';
import { 
  Barang, 
  KartuBarangPeriodFilter, 
  KopSuratConfig, 
  Pejabat, 
  TransaksiPenerimaan, 
  TransaksiPengeluaran 
} from '../../types';
import { formatRupiah, formatTanggalIndonesia, MONTHS_ID } from '../../utils/numberGenerator';
import { resolveKepalaSekolah, resolvePengurusBarang } from '../../utils/pejabatResolver';
import { KopSuratView } from '../KopSuratView';
import { SignatoryKartuBarang } from './SignatoryBlocks';

export interface DocKartuPersediaanProps {
  barang: Barang;
  transaksiPenerimaanList: TransaksiPenerimaan[];
  transaksiPengeluaranList: TransaksiPengeluaran[];
  kopConfig: KopSuratConfig;
  pejabatList: Pejabat[];
  settings?: any;
  pejabatSettings?: any;
  dataDokumen?: any;
  periodFilter?: KartuBarangPeriodFilter;
  selectedMonth?: number;
  selectedYear?: number;
  minRows?: number;
  isLast?: boolean;
}

export interface KartuPersediaanRow {
  type?: 'SALDO_AWAL' | 'MASUK' | 'KELUAR';
  tanggal: string;
  dateSortKey: string;
  noBukti: string;
  uraian: string;
  jenis: 'masuk' | 'keluar';
  masuk: number;
  keluar: number;
  qty_masuk?: number;
  qty_keluar?: number;
  sisaQty: number;
  hargaSatuan: number;
  bertambahRp: number;
  berkurangRp: number;
  sisaRp: number;
  keterangan: string;
  nama_supplier?: string;
  cv_penyalur?: string;
  penyedia?: string;
  unit_pemohon?: string;
  nama_pemohon?: string;
  unitPemohon?: string;
  pemohonNama?: string;
}

export interface KartuPersediaanData {
  labelPeriode: string;
  saldoAwalDateString: string;
  sisaQtyAwal: number;
  hargaSatuan: number;
  sisaRpAwal: number;
  rows: KartuPersediaanRow[];
  totalMasuk: number;
  totalKeluar: number;
  saldoAkhirQty: number;
  totalBertambahRp: number;
  totalBerkurangRp: number;
  saldoAkhirRp: number;
}

/**
 * Logika Pengisian Dinamis Kolom Uraian Tabel Kartu Persediaan Barang (Lampiran 13)
 * Menampilkan konteks sumber (Penyedia / Vendor / CV) untuk Barang Masuk
 * dan konteks tujuan (Unit / Pemohon) untuk Barang Keluar secara otomatis.
 */
export function generateUraianKartuPersediaan(row: {
  type?: string;
  qty_masuk?: number;
  qty_keluar?: number;
  masuk?: number;
  keluar?: number;
  jenis?: 'masuk' | 'keluar' | string;
  nama_supplier?: string;
  cv_penyalur?: string;
  penyedia?: string;
  unit_pemohon?: string;
  nama_pemohon?: string;
  unitPemohon?: string;
  pemohonNama?: string;
  keterangan?: string;
  uraian?: string;
}): string {
  if (row.type === 'SALDO_AWAL') {
    return 'Saldo Awal Bawaan Periode';
  }
  
  // Jika transaksi Barang Masuk (Penerimaan)
  const qtyMasuk = Number(row.qty_masuk ?? row.masuk ?? 0);
  if (qtyMasuk > 0 || row.jenis === 'masuk') {
    const supplier = (row.nama_supplier || row.cv_penyalur || row.penyedia || 'Penyedia').trim();
    return `Penerimaan Barang - ${supplier}`;
  }
  
  // Jika transaksi Barang Keluar (Penyaluran / Pengeluaran)
  const qtyKeluar = Number(row.qty_keluar ?? row.keluar ?? 0);
  if (qtyKeluar > 0 || row.jenis === 'keluar') {
    const pemohon = (row.unit_pemohon || row.nama_pemohon || row.unitPemohon || row.pemohonNama || 'Pemohon').trim();
    return `Pengeluaran Barang - ${pemohon}`;
  }
  
  return row.keterangan || row.uraian || '-';
}

/**
 * Safely parse date string into local { year, month, day }
 * Prevents UTC vs local timezone shifts where "YYYY-MM-DD" shifts to the previous day in UTC-X.
 */
export function parseDateParts(dateStr?: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim();
  const parts = clean.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; // 0-indexed month (0 = Jan, 8 = Sep)
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return { year: y, month: m, day: d };
    }
  }
  const dt = new Date(dateStr);
  if (!isNaN(dt.getTime())) {
    return { year: dt.getFullYear(), month: dt.getMonth(), day: dt.getDate() };
  }
  return null;
}

/**
 * Checks if a transaction date falls strictly before the target period.
 */
export function isDateBeforePeriod(dateStr: string, targetMonth: number, targetYear: number): boolean {
  const parts = parseDateParts(dateStr);
  if (!parts) return false;
  if (parts.year < targetYear) return true;
  if (parts.year > targetYear) return false;

  // Same year
  if (targetMonth === -1) {
    // 1 Full Year: transactions in previous years are prior, same year is not
    return false;
  }
  if (targetMonth >= 101 && targetMonth <= 104) {
    // Triwulan (101: Jan-Mar, 102: Apr-Jun, 103: Jul-Sep, 104: Okt-Des)
    const startMonth = (targetMonth - 101) * 3;
    return parts.month < startMonth;
  }
  // Standard month (0-11)
  return parts.month < targetMonth;
}

/**
 * Checks if a transaction date falls within the target period.
 */
export function isDateInPeriod(dateStr: string, targetMonth: number, targetYear: number): boolean {
  const parts = parseDateParts(dateStr);
  if (!parts) return false;
  if (parts.year !== targetYear) return false;

  if (targetMonth === -1) return true; // 1 Full Year
  if (targetMonth === 101) return parts.month >= 0 && parts.month <= 2;
  if (targetMonth === 102) return parts.month >= 3 && parts.month <= 5;
  if (targetMonth === 103) return parts.month >= 6 && parts.month <= 8;
  if (targetMonth === 104) return parts.month >= 9 && parts.month <= 11;
  return parts.month === targetMonth;
}

/**
 * Parse any numeric value safely to prevent NaN or undefined
 */
function parseNumeric(val: unknown): number {
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  if (!val) return 0;
  if (typeof val === 'string') {
    const clean = val.replace(/[^0-9.-]+/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

/**
 * Resolve Harga Satuan reliably from barang master or transactions
 */
function resolveBarangHargaSatuan(
  barang: Barang,
  transaksiPenerimaanList: TransaksiPenerimaan[],
  transaksiPengeluaranList: TransaksiPengeluaran[]
): number {
  const masterHarga = parseNumeric(barang.hargaSatuan);
  if (masterHarga > 0) return masterHarga;

  // Search in incoming penerimaan items
  for (const t of transaksiPenerimaanList) {
    const item = t.items.find(i => i.barangId === barang.id);
    if (item && parseNumeric(item.hargaSatuan) > 0) {
      return parseNumeric(item.hargaSatuan);
    }
  }

  // Search in outgoing pengeluaran items
  for (const t of transaksiPengeluaranList) {
    const item = t.items.find(i => i.barangId === barang.id);
    if (item && parseNumeric(item.hargaSatuan) > 0) {
      return parseNumeric(item.hargaSatuan);
    }
  }

  return 0;
}

/**
 * Primary calculation function for Kartu Persediaan Barang (Lampiran 13)
 */
export function computeKartuPersediaanData(
  barang: Barang,
  transaksiPenerimaanList: TransaksiPenerimaan[],
  transaksiPengeluaranList: TransaksiPengeluaran[],
  targetMonth: number,
  targetYear: number
): KartuPersediaanData {
  // 1. Determine Periode Label & Saldo Awal Date
  let labelPeriode = '';
  let saldoAwalDateString = '';

  if (targetMonth === -1) {
    labelPeriode = `Tahun Anggaran ${targetYear}`;
    saldoAwalDateString = `31 Desember ${targetYear - 1}`;
  } else if (targetMonth >= 101 && targetMonth <= 104) {
    const twNum = targetMonth - 100;
    const startM = (twNum - 1) * 3;
    const endM = startM + 2;
    labelPeriode = `Triwulan ${twNum === 1 ? 'I' : twNum === 2 ? 'II' : twNum === 3 ? 'III' : 'IV'} (${MONTHS_ID[startM]} - ${MONTHS_ID[endM]}) ${targetYear}`;
    
    // Saldo awal date is last day before triwulan starts
    const prevDate = new Date(targetYear, startM, 0);
    saldoAwalDateString = `${prevDate.getDate()} ${MONTHS_ID[prevDate.getMonth()]} ${prevDate.getFullYear()}`;
  } else {
    // Normal Month (0-11)
    const validMonth = Math.max(0, Math.min(11, targetMonth));
    labelPeriode = `Bulan ${MONTHS_ID[validMonth]} ${targetYear}`;

    // Last day of previous month (e.g. for September 2026 => 31 Agustus 2026)
    const prevDate = new Date(targetYear, validMonth, 0);
    saldoAwalDateString = `${prevDate.getDate()} ${MONTHS_ID[prevDate.getMonth()]} ${prevDate.getFullYear()}`;
  }

  // 2. Compute Saldo Awal Bawaan Periode (Accumulation of prior transactions)
  let priorMasuk = 0;
  transaksiPenerimaanList.forEach(t => {
    if (isDateBeforePeriod(t.tanggal, targetMonth, targetYear)) {
      const item = t.items.find(i => i.barangId === barang.id);
      if (item && item.jumlahMasuk) {
        priorMasuk += parseNumeric(item.jumlahMasuk);
      }
    }
  });

  let priorKeluar = 0;
  transaksiPengeluaranList.forEach(t => {
    const rawDate = t.tanggal || t.createdAt;
    if (isDateBeforePeriod(rawDate, targetMonth, targetYear)) {
      const item = t.items.find(i => i.barangId === barang.id);
      if (item && item.usulanJumlah) {
        priorKeluar += parseNumeric(item.usulanJumlah);
      }
    }
  });

  const baseStokAwal = parseNumeric(barang.stokAwal);
  const sisaQtyAwal = Math.max(0, baseStokAwal + priorMasuk - priorKeluar);
  const hargaSatuan = resolveBarangHargaSatuan(barang, transaksiPenerimaanList, transaksiPengeluaranList);
  
  // Fix Bug Nominal Nol: Sisa (Rp) = Sisa Qty × Harga Satuan
  const sisaRpAwal = sisaQtyAwal * hargaSatuan;

  // 3. Collect & Sort Events During Target Period
  const events: (KartuPersediaanRow & {
    jenis: 'masuk' | 'keluar';
  })[] = [];

  // Incoming
  transaksiPenerimaanList.forEach(t => {
    if (isDateInPeriod(t.tanggal, targetMonth, targetYear)) {
      const item = t.items.find(i => i.barangId === barang.id);
      if (item && item.jumlahMasuk > 0) {
        const itemHarga = parseNumeric(item.hargaSatuan) > 0 ? parseNumeric(item.hargaSatuan) : hargaSatuan;
        const supplier = (t.penyedia || (t as any).nama_supplier || (t as any).cv_penyalur || 'Penyedia').trim();
        const qtyMasuk = parseNumeric(item.jumlahMasuk);
        const dynamicUraian = generateUraianKartuPersediaan({
          type: 'MASUK',
          jenis: 'masuk',
          qty_masuk: qtyMasuk,
          masuk: qtyMasuk,
          nama_supplier: supplier,
          cv_penyalur: supplier,
          penyedia: supplier
        });

        events.push({
          type: 'MASUK',
          tanggal: t.tanggal,
          dateSortKey: t.tanggal,
          noBukti: t.noBukti ? `Faktur: ${t.noBukti} (${formatTanggalIndonesia(t.tanggal)})` : `Faktur Penerimaan (${formatTanggalIndonesia(t.tanggal)})`,
          uraian: dynamicUraian,
          jenis: 'masuk',
          masuk: qtyMasuk,
          keluar: 0,
          qty_masuk: qtyMasuk,
          qty_keluar: 0,
          sisaQty: 0,
          hargaSatuan: itemHarga,
          bertambahRp: 0,
          berkurangRp: 0,
          sisaRp: 0,
          nama_supplier: supplier,
          cv_penyalur: supplier,
          penyedia: supplier,
          keterangan: t.keterangan || (t.sumberDana ? `Belanja ${t.sumberDana}` : 'Pengadaan persediaan barang')
        });
      }
    }
  });

  // Outgoing
  transaksiPengeluaranList.forEach(t => {
    const rawDate = t.tanggal || t.createdAt;
    if (isDateInPeriod(rawDate, targetMonth, targetYear)) {
      const item = t.items.find(i => i.barangId === barang.id);
      if (item && item.usulanJumlah > 0) {
        const noDokumen = t.noSPPB || t.noBAST || t.noSPB || t.noNPB || 'SPPB Penyaluran';
        const docDate = t.tanggal || (t.createdAt ? t.createdAt.split('T')[0] : '');
        const dateNote = docDate ? ` (${formatTanggalIndonesia(docDate)})` : '';
        const pemohon = (t.unitPemohon || (t as any).unit_pemohon || t.pemohonNama || (t as any).nama_pemohon || 'Pemohon').trim();
        const qtyKeluar = parseNumeric(item.usulanJumlah);
        const dynamicUraian = generateUraianKartuPersediaan({
          type: 'KELUAR',
          jenis: 'keluar',
          qty_keluar: qtyKeluar,
          keluar: qtyKeluar,
          unit_pemohon: pemohon,
          nama_pemohon: pemohon,
          unitPemohon: pemohon
        });

        const targetKeperluan = t.keperluanUmum || item.keperluan || 'Kebutuhan operasional sekolah';
        const keteranganInformatif = `Pengeluaran ${qtyKeluar} ${barang.satuan} ${barang.namaBarang} untuk ${targetKeperluan}`;

        events.push({
          type: 'KELUAR',
          tanggal: docDate,
          dateSortKey: docDate,
          noBukti: `SPPB: ${noDokumen}${dateNote}`,
          uraian: dynamicUraian,
          jenis: 'keluar',
          masuk: 0,
          keluar: qtyKeluar,
          qty_masuk: 0,
          qty_keluar: qtyKeluar,
          sisaQty: 0,
          hargaSatuan: hargaSatuan,
          bertambahRp: 0,
          berkurangRp: 0,
          sisaRp: 0,
          unit_pemohon: pemohon,
          nama_pemohon: pemohon,
          unitPemohon: pemohon,
          keterangan: keteranganInformatif
        });
      }
    }
  });

  // Chronological sorting:
  // If dates differ, sort ascending by date.
  // If dates are identical, 'masuk' must come before 'keluar' to reflect inventory arrival first.
  events.sort((a, b) => {
    if (a.dateSortKey < b.dateSortKey) return -1;
    if (a.dateSortKey > b.dateSortKey) return 1;
    return a.jenis === 'masuk' ? -1 : 1;
  });

  // 4. Compute Running Balances
  let runningQty = sisaQtyAwal;
  let totalMasuk = 0;
  let totalKeluar = 0;
  let totalBertambahRp = 0;
  let totalBerkurangRp = 0;

  const rows: KartuPersediaanRow[] = events.map(ev => {
    let bertambahRp = 0;
    let berkurangRp = 0;

    if (ev.jenis === 'masuk') {
      runningQty += ev.masuk;
      totalMasuk += ev.masuk;
      bertambahRp = ev.masuk * ev.hargaSatuan;
      totalBertambahRp += bertambahRp;
    } else {
      runningQty -= ev.keluar;
      totalKeluar += ev.keluar;
      berkurangRp = ev.keluar * ev.hargaSatuan;
      totalBerkurangRp += berkurangRp;
    }

    const sisaRp = runningQty * hargaSatuan;

    return {
      type: ev.jenis === 'masuk' ? 'MASUK' : 'KELUAR',
      tanggal: ev.tanggal,
      dateSortKey: ev.dateSortKey,
      noBukti: ev.noBukti,
      uraian: ev.uraian || generateUraianKartuPersediaan(ev),
      jenis: ev.jenis,
      masuk: ev.masuk,
      keluar: ev.keluar,
      qty_masuk: ev.qty_masuk,
      qty_keluar: ev.qty_keluar,
      sisaQty: runningQty,
      hargaSatuan: ev.hargaSatuan,
      bertambahRp,
      berkurangRp,
      sisaRp,
      nama_supplier: ev.nama_supplier,
      cv_penyalur: ev.cv_penyalur,
      penyedia: ev.penyedia,
      unit_pemohon: ev.unit_pemohon,
      nama_pemohon: ev.nama_pemohon,
      unitPemohon: ev.unitPemohon,
      keterangan: ev.keterangan
    };
  });

  const saldoAkhirQty = runningQty;
  const saldoAkhirRp = saldoAkhirQty * hargaSatuan;

  return {
    labelPeriode,
    saldoAwalDateString,
    sisaQtyAwal,
    hargaSatuan,
    sisaRpAwal,
    rows,
    totalMasuk,
    totalKeluar,
    saldoAkhirQty,
    totalBertambahRp,
    totalBerkurangRp,
    saldoAkhirRp
  };
}

export const DocKartuPersediaan: React.FC<DocKartuPersediaanProps> = ({
  barang,
  transaksiPenerimaanList,
  transaksiPengeluaranList,
  kopConfig,
  pejabatList,
  settings,
  pejabatSettings,
  dataDokumen,
  periodFilter,
  selectedMonth,
  selectedYear,
  minRows = 10,
  isLast = false
}) => {
  const kepsek = resolveKepalaSekolah(pejabatList);
  const pengurusBarang = resolvePengurusBarang(pejabatList);

  // Dynamic filter resolution from toolbar props or periodFilter
  const activeYear = selectedYear ?? periodFilter?.year ?? new Date().getFullYear();
  let activeMonth: number = selectedMonth !== undefined ? selectedMonth : (periodFilter?.month ?? new Date().getMonth());
  if (selectedMonth !== undefined) {
    activeMonth = selectedMonth;
  } else if (periodFilter) {
    if (periodFilter.type === 'bulan' && periodFilter.month !== undefined) {
      activeMonth = periodFilter.month;
    } else if (periodFilter.type === 'tahun') {
      activeMonth = -1;
    } else if (periodFilter.type === 'triwulan' && periodFilter.triwulan) {
      activeMonth = 100 + periodFilter.triwulan;
    }
  }

  // Reactive state: refetching / re-query data whenever barang, month, year, or transactions change
  const [data, setData] = useState<KartuPersediaanData>(() =>
    computeKartuPersediaanData(barang, transaksiPenerimaanList, transaksiPengeluaranList, activeMonth, activeYear)
  );

  useEffect(() => {
    // Dynamic refresh when filter or data changes
    const updated = computeKartuPersediaanData(
      barang, 
      transaksiPenerimaanList, 
      transaksiPengeluaranList, 
      activeMonth, 
      activeYear
    );
    setData(updated);
  }, [
    barang.id,
    barang,
    activeMonth,
    activeYear,
    transaksiPenerimaanList,
    transaksiPengeluaranList
  ]);

  const {
    labelPeriode,
    saldoAwalDateString,
    sisaQtyAwal,
    hargaSatuan,
    sisaRpAwal,
    rows,
    totalMasuk,
    totalKeluar,
    saldoAkhirQty,
    totalBertambahRp,
    totalBerkurangRp,
    saldoAkhirRp
  } = data;

  const isCompact = rows.length <= 5; // Deteksi jika data sedikit/kosong
  const paddingRowsCount = isCompact ? 0 : Math.max(0, minRows - (rows.length + 1)); // +1 for saldo awal row

  const currentDateString = formatTanggalIndonesia(new Date().toISOString().split('T')[0]);
  const schoolName = pejabatSettings?.namaSekolah || kopConfig?.namaSekolah || 'SMAN 1 CIHAURBEUTI';
  const kotaDisplay = pejabatSettings?.lokasi || dataDokumen?.lokasi || kopConfig?.kotaSurat || 'Ciamis';
  const tanggalDisplay = dataDokumen?.tanggalCetak || currentDateString;

  return (
    <div 
      className={`print-container doc-content kartu-persediaan-page w-full bg-white text-black p-2 font-sans select-text flex flex-col justify-between ${isCompact ? 'compact-mode' : ''}`}
      style={{
        pageBreakAfter: isLast ? 'auto' : 'always',
        breakAfter: isLast ? 'auto' : 'page',
        minHeight: isCompact ? 'auto' : '100%'
      }}
    >
      <div>
        {/* HEADER KARTU */}
        <div className="text-center font-bold text-xs uppercase mb-1.5 border-b pb-1 avoid-break">
          <p className="tracking-wider text-slate-700 text-[11px] font-bold">
            LAMPIRAN 13: KARTU PERSEDIAAN BARANG
          </p>
          <h2 className="text-sm font-black text-slate-900 tracking-wide mt-0.5">
            KARTU PERSEDIAAN BARANG
          </h2>
          <p className="text-xs font-bold text-blue-900 mt-0.5">
            {schoolName} • Periode: {labelPeriode}
          </p>
        </div>

        {/* ATRIBUT BARANG (SKPD, Nama Barang, Kode, dll) */}
        <div className="grid grid-cols-2 text-[10px] mb-2 gap-x-4 border border-black p-1.5 bg-slate-50/50 rounded-xs avoid-break">
          <div className="space-y-0.5">
            <p><span className="font-semibold text-slate-700">Nama Barang:</span> <span className="font-bold text-slate-900">{barang?.namaBarang || '-'}</span></p>
            <p><span className="font-semibold text-slate-700">Kode Barang:</span> <span className="font-mono font-bold text-slate-900">{barang?.kodeBarang || '-'}</span></p>
            <p><span className="font-semibold text-slate-700">NUSP:</span> <span className="font-mono font-bold text-blue-900">{barang?.nusp || '-'}</span></p>
            <p><span className="font-semibold text-slate-700">Spesifikasi:</span> <span className="text-slate-800">{barang?.spesifikasi || '-'}</span></p>
          </div>
          <div className="space-y-0.5 text-right sm:text-left sm:pl-4">
            <p><span className="font-semibold text-slate-700">Satuan:</span> <span className="font-bold text-slate-900">{barang?.satuan || '-'}</span></p>
            <p><span className="font-semibold text-slate-700">Lokasi Gudang:</span> <span className="text-slate-800">{barang?.lokasiGudang || 'Gudang Utama'}</span></p>
            <p><span className="font-semibold text-slate-700">Kode Rekening:</span> <span className="font-mono text-slate-800">{barang?.kodeRekening || '-'}</span></p>
            <p className="truncate"><span className="font-semibold text-slate-700">Rekening:</span> <span className="text-slate-800 text-[9.5px]">{barang?.namaRekening || '-'}</span></p>
          </div>
        </div>

        {/* Tabel Komprehensif Lampiran 13 */}
        <div className="overflow-x-auto w-full">
          <table className="doc-table w-full text-[9.5px] leading-tight border-collapse border border-black text-black mb-2" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr className="bg-slate-100 text-center font-bold">
                <th rowSpan={2} style={{ width: '3%' }} className="border border-black p-1">No</th>
                <th rowSpan={2} style={{ width: '8%' }} className="border border-black p-1">Tanggal</th>
                <th rowSpan={2} style={{ width: '16%' }} className="border border-black p-1">No. Dasar Bukti</th>
                <th rowSpan={2} style={{ width: '15%' }} className="border border-black p-1">Uraian Transaksi</th>
                <th colSpan={3} style={{ width: '13%' }} className="border border-black p-1">Barang (Qty)</th>
                <th rowSpan={2} style={{ width: '8%' }} className="border border-black p-1">Harga Satuan</th>
                <th colSpan={3} style={{ width: '25%' }} className="border border-black p-1">Jumlah Harga (Rp)</th>
                <th rowSpan={2} style={{ width: '12%' }} className="border border-black p-1">Keterangan</th>
              </tr>
              <tr className="bg-slate-100 text-center font-bold text-[9px]">
                <th style={{ width: '4.3%' }} className="border border-black p-0.5">Masuk</th>
                <th style={{ width: '4.3%' }} className="border border-black p-0.5">Keluar</th>
                <th style={{ width: '4.4%' }} className="border border-black p-0.5">Sisa</th>
                <th style={{ width: '8.3%' }} className="border border-black p-0.5">Diterima</th>
                <th style={{ width: '8.3%' }} className="border border-black p-0.5">Dikeluarkan</th>
                <th style={{ width: '8.4%' }} className="border border-black p-0.5">Sisa (Rp)</th>
              </tr>
              <tr className="bg-slate-50 text-[8.5px] text-center font-medium italic text-slate-600">
                <td className="border border-black py-0.5">1</td>
                <td className="border border-black py-0.5">2</td>
                <td className="border border-black py-0.5">3</td>
                <td className="border border-black py-0.5">4</td>
                <td className="border border-black py-0.5">5</td>
                <td className="border border-black py-0.5">6</td>
                <td className="border border-black py-0.5">7</td>
                <td className="border border-black py-0.5">8</td>
                <td className="border border-black py-0.5">9</td>
                <td className="border border-black py-0.5">10</td>
                <td className="border border-black py-0.5">11</td>
                <td className="border border-black py-0.5">12</td>
              </tr>
            </thead>
            <tbody>
              {/* Baris Saldo Awal Bawaan Periode */}
              <tr className="bg-amber-50/50 font-semibold text-[9.5px]">
                <td className="border border-black p-1 text-center font-mono">1</td>
                <td className="border border-black p-1 text-center font-mono whitespace-nowrap">
                  {saldoAwalDateString || '-'}
                </td>
                <td className="border border-black p-1 text-center text-slate-500 font-mono">SALDO-AWAL</td>
                <td className="border border-black p-1 font-bold text-slate-900">
                  Saldo Awal Periode
                </td>
                <td className="border border-black p-1 text-center text-slate-400 font-mono">-</td>
                <td className="border border-black p-1 text-center text-slate-400 font-mono">-</td>
                <td className="border border-black p-1 text-center font-bold text-blue-900 font-mono">{sisaQtyAwal}</td>
                <td className="border border-black p-1 text-right font-mono">{formatRupiah(hargaSatuan)}</td>
                <td className="border border-black p-1 text-center text-slate-400 font-mono">-</td>
                <td className="border border-black p-1 text-center text-slate-400 font-mono">-</td>
                <td className="border border-black p-1 text-right font-bold font-mono text-emerald-800">
                  {formatRupiah(sisaRpAwal)}
                </td>
                <td className="border border-black p-1 text-slate-600 text-[8.5px]">Saldo Awal Bawaan</td>
              </tr>

              {/* Baris Transaksi Mutasi Periode Berjalan */}
              {rows.length > 0 ? (
                rows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors text-[9.5px]">
                    <td className="border border-black p-1 text-center font-mono">{idx + 2}</td>
                    <td className="border border-black p-1 text-center font-mono whitespace-nowrap">
                      {formatTanggalIndonesia(r.tanggal)}
                    </td>
                    <td className="border border-black p-1 font-mono text-[9px] truncate">
                      {r.noBukti}
                    </td>
                    <td className="border border-black p-1 font-medium text-slate-900 truncate">
                      {generateUraianKartuPersediaan(r)}
                    </td>
                    {/* Qty Masuk */}
                    <td className="border border-black p-1 text-center font-mono font-medium">
                      {r.masuk > 0 ? (
                        <span className="font-bold text-emerald-700">+{r.masuk}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    {/* Qty Keluar */}
                    <td className="border border-black p-1 text-center font-mono font-medium">
                      {r.keluar > 0 ? (
                        <span className="font-bold text-rose-700">-{r.keluar}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    {/* Qty Sisa */}
                    <td className="border border-black p-1 text-center font-mono font-bold">
                      {r.sisaQty}
                    </td>
                    {/* Harga Satuan */}
                    <td className="border border-black p-1 text-right font-mono">
                      {formatRupiah(r.hargaSatuan)}
                    </td>
                    {/* Bertambah Rp (Diterima) */}
                    <td className="border border-black p-1 text-right font-mono">
                      {r.bertambahRp > 0 ? (
                        <span className="font-semibold text-emerald-700">{formatRupiah(r.bertambahRp)}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    {/* Berkurang Rp (Dikeluarkan) */}
                    <td className="border border-black p-1 text-right font-mono">
                      {r.berkurangRp > 0 ? (
                        <span className="font-semibold text-rose-700">{formatRupiah(r.berkurangRp)}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    {/* Sisa Rp */}
                    <td className="border border-black p-1 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(r.sisaRp)}
                    </td>
                    <td className="border border-black p-1 text-[8.5px] text-slate-600 truncate">
                      {r.keterangan || '-'}
                    </td>
                  </tr>
                ))
              ) : null}

              {/* Padding empty rows only when NOT compact */}
              {!isCompact && Array.from({ length: paddingRowsCount }).map((_, pIdx) => (
                <tr key={`pad-${pIdx}`} className="h-6">
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1">&nbsp;</td>
                </tr>
              ))}

              {/* Baris Total / Rekapitulasi Periode */}
              <tr className="bg-slate-200 font-bold text-black border-t-2 border-black font-mono text-[9.5px]">
                <td colSpan={4} className="border border-black p-1 text-center uppercase tracking-wider font-bold font-sans">
                  TOTAL MUTASI PERIODE INI
                </td>
                <td className="border border-black p-1 text-center font-bold text-emerald-800">
                  {totalMasuk}
                </td>
                <td className="border border-black p-1 text-center font-bold text-rose-800">
                  {totalKeluar}
                </td>
                <td className="border border-black p-1 text-center font-black bg-slate-300 text-blue-950">
                  {saldoAkhirQty}
                </td>
                <td className="border border-black p-1 text-center text-slate-500">-</td>
                <td className="border border-black p-1 text-right font-bold text-emerald-800">
                  {formatRupiah(totalBertambahRp)}
                </td>
                <td className="border border-black p-1 text-right font-bold text-rose-800">
                  {formatRupiah(totalBerkurangRp)}
                </td>
                <td className="border border-black p-1 text-right font-black text-slate-900 bg-slate-300">
                  {formatRupiah(saldoAkhirRp)}
                </td>
                <td className="border border-black p-1 text-center text-[8.5px] text-slate-600 font-sans">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Ringkasan Akumulasi Total Mutasi Sesuai Format Administrasi BMD */}
        <div className="grid grid-cols-4 gap-2 my-1.5 text-[9.5px] border border-black p-1.5 bg-slate-50/70 rounded-xs avoid-break">
          <div>
            <div className="text-[8.5px] text-slate-600 font-semibold uppercase">Total Masuk</div>
            <div className="font-bold text-emerald-800">{totalMasuk} {barang.satuan}</div>
            <div className="text-[9px] font-mono font-semibold text-emerald-700">{formatRupiah(totalBertambahRp)}</div>
          </div>
          <div>
            <div className="text-[8.5px] text-slate-600 font-semibold uppercase">Total Keluar</div>
            <div className="font-bold text-rose-800">{totalKeluar} {barang.satuan}</div>
            <div className="text-[9px] font-mono font-semibold text-rose-700">{formatRupiah(totalBerkurangRp)}</div>
          </div>
          <div>
            <div className="text-[8.5px] text-slate-600 font-semibold uppercase">Saldo Awal</div>
            <div className="font-bold text-slate-800">{sisaQtyAwal} {barang.satuan}</div>
            <div className="text-[9px] font-mono text-slate-700">{formatRupiah(sisaRpAwal)}</div>
          </div>
          <div className="bg-blue-50/70 p-1 rounded border border-blue-200">
            <div className="text-[8.5px] text-blue-900 font-bold uppercase">Saldo Akhir</div>
            <div className="font-black text-blue-950">{saldoAkhirQty} {barang.satuan}</div>
            <div className="text-[9px] font-mono font-bold text-blue-900">{formatRupiah(saldoAkhirRp)}</div>
          </div>
        </div>
      </div>

      {/* Footer Tanda Tangan: Pengurus / Penyimpan Barang Persediaan */}
      <SignatoryKartuBarang
        pejabatList={pejabatList}
        kopConfig={kopConfig}
        settings={settings}
        pejabatSettings={pejabatSettings}
        dataDokumen={dataDokumen}
        lokasi={kotaDisplay}
        tanggalCetak={tanggalDisplay}
        isCompact={isCompact}
        className={isCompact ? 'mt-2 pt-1' : 'mt-4 pt-2'}
      />
    </div>
  );
};
