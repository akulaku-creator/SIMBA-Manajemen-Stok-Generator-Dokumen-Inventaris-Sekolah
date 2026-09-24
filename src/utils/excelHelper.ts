import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Barang, Pejabat } from '../types';
import { getNamaRekeningByKode } from '../data/kodeRekeningData';

/**
 * Utility to normalize object keys (lowercase, trim, remove non-alphanumeric except space)
 */
function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean numeric values from strings like "Rp 45.000", "45,000", etc.
 */
function parseNumber(val: any, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (!val) return fallback;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? fallback : parsed;
}

// -------------------------------------------------------------
// PEJABAT EXCEL UTILITIES
// -------------------------------------------------------------

export function generatePejabatTemplate(): void {
  const headers = [
    'Nama Pejabat & Gelar',
    'NIP',
    'Pangkat / Golongan',
    'Jabatan Kedinasan',
    'Unit Kerja'
  ];

  const sampleData = [
    [
      'Drs. H. Bambang Suhartono, M.Pd.',
      '19680512 199303 1 005',
      'Pembina Utama Muda / IV c',
      'Kepala Sekolah',
      'Pimpinan Satuan Pendidikan'
    ],
    [
      'Ir. H. Agus Setyobudi, M.T.',
      '19720815 199802 1 003',
      'Pembina / IV a',
      'Wakasek Bidang Sarana Prasarana',
      'Manajemen Sarana'
    ],
    [
      'Sri Wahyuni, S.E.',
      '19840320 200801 2 009',
      'Penata / III c',
      'Pengurus Barang Pembantu',
      'Pengelolaan Aset & Persediaan'
    ],
    [
      'Ahmad Rofiqi, S.Kom.',
      '19910410 201503 1 004',
      'Penata Muda / III a',
      'Pemohon / Guru Pengajar',
      'Laboratorium Komputer & RPL'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  // Set column widths
  ws['!cols'] = [
    { wch: 35 },
    { wch: 25 },
    { wch: 28 },
    { wch: 32 },
    { wch: 28 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Master_Pejabat');
  XLSX.writeFile(wb, 'Template_Master_Pejabat_Sekolah.xlsx');
}

export async function parseExcelPejabat(file: File): Promise<{
  data: Pejabat[];
  errors: string[];
}> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw new Error('File Excel tidak memiliki lembar kerja (worksheet).');
  }

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
  
  if (!rawRows || rawRows.length === 0) {
    throw new Error('File Excel tidak memiliki baris data.');
  }

  const data: Pejabat[] = [];
  const errors: string[] = [];

  rawRows.forEach((row, index) => {
    // Map normalized keys
    const normalizedRow: Record<string, any> = {};
    Object.keys(row).forEach(k => {
      normalizedRow[normalizeKey(k)] = row[k];
    });

    const getVal = (candidates: string[]): string => {
      for (const c of candidates) {
        if (normalizedRow[c] !== undefined && String(normalizedRow[c]).trim() !== '') {
          return String(normalizedRow[c]).trim();
        }
      }
      // Partial search fallback
      for (const [key, value] of Object.entries(normalizedRow)) {
        if (candidates.some(c => key.includes(c)) && String(value).trim() !== '') {
          return String(value).trim();
        }
      }
      return '';
    };

    const nama = getVal(['nama pejabat gelar', 'nama pejabat', 'nama lengkap', 'nama', 'pejabat']);
    const nip = getVal(['nip', 'nomor induk pegawai', 'no nip']) || '-';
    const pangkatGolongan = getVal(['pangkat golongan', 'pangkat', 'golongan', 'pangkat ruang']) || '-';
    const jabatan = getVal(['jabatan kedinasan', 'jabatan', 'posisi', 'tugas']);
    const unitKerja = getVal(['unit kerja', 'unit', 'bagian', 'bidang']) || '';

    const rowNum = index + 2; // header is row 1

    if (!nama && !jabatan) {
      // Ignore completely empty trailing rows
      return;
    }

    if (!nama) {
      errors.push(`Baris ${rowNum}: Nama Pejabat kosong.`);
      return;
    }

    if (!jabatan) {
      errors.push(`Baris ${rowNum}: Jabatan untuk "${nama}" kosong.`);
      return;
    }

    data.push({
      id: `pejabat-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      nama,
      nip,
      pangkatGolongan,
      jabatan,
      unitKerja
    });
  });

  return { data, errors };
}

// -------------------------------------------------------------
// MASTER BARANG EXCEL UTILITIES
// -------------------------------------------------------------

export function generateBarangTemplate(): void {
  const headers = [
    'Kode Barang',
    'NUSP',
    'Jenis Aset (BHP / Belanja Modal)',
    'Kode Rekening',
    'Nama Rekening Belanja',
    'Nama Barang',
    'Spesifikasi',
    'Kategori',
    'Satuan',
    'Harga Satuan (Rp)',
    'Stok Awal',
    'Stok Sekarang',
    'Lokasi Gudang'
  ];

  const sampleData = [
    [
      '1.01.03.01.25',
      '0001/2026',
      'BHP',
      '5.1.02.01.01.0025',
      'Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover',
      'Kertas HVS A4 80gr Sinar Dunia',
      'Ukuran 210 x 297 mm, 500 lembar/rim',
      'ATK / Kertas',
      'Rim',
      48500,
      100,
      100,
      'Gudang TU - Rak A1'
    ],
    [
      '1.01.03.01.26',
      '0002/2026',
      'BHP',
      '5.1.02.01.01.0025',
      'Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover',
      'Kertas HVS F4 / Folio 75gr PaperOne',
      'Ukuran 215 x 330 mm, 500 lembar/rim',
      'ATK / Kertas',
      'Rim',
      52000,
      80,
      80,
      'Gudang TU - Rak A2'
    ],
    [
      '1.03.02.01.01',
      '0101/2026',
      'Belanja Modal',
      '5.2.02.05.01.0005',
      'Belanja Modal Peralatan Komputer (PC, Laptop, Server)',
      'Laptop Asus ExpertBook B1400 Core i5',
      'Intel Core i5-1135G7, RAM 16GB, SSD 512GB, Win 11 Pro',
      'Peralatan & Mesin (Aset)',
      'Unit',
      11850000,
      5,
      5,
      'Ruang Server & IT'
    ],
    [
      '1.03.01.02.01',
      '0102/2026',
      'Belanja Modal',
      '5.2.02.10.01.0002',
      'Belanja Modal Meubelair & Perabot Kantor (Meja, Kursi, Lemari)',
      'Lemari Arsip Besi 2 Pintu Kaca Lion',
      'Bahan plat baja 0.8mm powder coating, 4 rak ambalan',
      'Perabot & Meubelair (Aset)',
      'Unit',
      3450000,
      3,
      3,
      'Gudang Sarpras'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  // Set column widths
  ws['!cols'] = [
    { wch: 16 }, // Kode Barang
    { wch: 14 }, // NUSP
    { wch: 22 }, // Jenis Aset
    { wch: 20 }, // Kode Rekening
    { wch: 42 }, // Nama Rekening
    { wch: 35 }, // Nama Barang
    { wch: 35 }, // Spesifikasi
    { wch: 24 }, // Kategori
    { wch: 12 }, // Satuan
    { wch: 18 }, // Harga Satuan
    { wch: 12 }, // Stok Awal
    { wch: 14 }, // Stok Sekarang
    { wch: 24 }  // Lokasi Gudang
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Master_Barang');
  XLSX.writeFile(wb, 'Template_Master_Barang_Persediaan.xlsx');
}

export async function parseExcelBarang(
  file: File,
  currentCount: number = 0
): Promise<{
  data: Barang[];
  errors: string[];
}> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw new Error('File Excel tidak memiliki lembar kerja (worksheet).');
  }

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
  
  if (!rawRows || rawRows.length === 0) {
    throw new Error('File Excel tidak memiliki baris data inventaris barang.');
  }

  const data: Barang[] = [];
  const errors: string[] = [];

  const VALID_CATEGORIES: Barang['kategori'][] = [
    'ATK / Kertas',
    'Kebersihan',
    'Elektronik & Komputer',
    'Alat Praktik/Peraga',
    'Bahan Material',
    'Perlengkapan Umum'
  ];

  rawRows.forEach((row, index) => {
    // Map normalized keys
    const normalizedRow: Record<string, any> = {};
    Object.keys(row).forEach(k => {
      normalizedRow[normalizeKey(k)] = row[k];
    });

    const getVal = (candidates: string[]): string => {
      for (const c of candidates) {
        if (normalizedRow[c] !== undefined && String(normalizedRow[c]).trim() !== '') {
          return String(normalizedRow[c]).trim();
        }
      }
      for (const [key, value] of Object.entries(normalizedRow)) {
        if (candidates.some(c => key.includes(c)) && String(value).trim() !== '') {
          return String(value).trim();
        }
      }
      return '';
    };

    const rowNum = index + 2;

    const namaBarang = getVal(['nama barang', 'barang', 'uraian barang', 'nama item', 'item', 'nama']);
    if (!namaBarang) {
      // If line is empty, skip quietly, or report if other fields exist
      const hasAnyField = Object.values(normalizedRow).some(v => String(v).trim() !== '');
      if (hasAnyField) {
        errors.push(`Baris ${rowNum}: Nama barang kosong.`);
      }
      return;
    }

    const kodeBarang = getVal(['kode barang', 'kode', 'kd barang', 'kode register']) || '1.01.03.01.99';
    
    // NUSP generation if not specified
    const generatedNusp = `${String(currentCount + data.length + 1).padStart(4, '0')}/${new Date().getFullYear()}`;
    const nusp = getVal(['nusp', 'nomor urut pendaftaran', 'no register', 'register']) || generatedNusp;

    const kodeRekening = getVal(['kode rekening', 'rekening', 'kd rekening', 'kode akun']) || '5.1.02.01.01.0024';
    const namaRekening = getVal(['nama rekening belanja', 'nama rekening', 'uraian rekening', 'rekening belanja']) || 
      getNamaRekeningByKode(kodeRekening);

    const spesifikasi = getVal(['spesifikasi', 'spek', 'keterangan', 'deskripsi', 'merk', 'ukuran']) || '-';

    // Jenis Aset (BHP vs Belanja Modal)
    const rawJenis = getVal(['jenis aset', 'jenis barang', 'jenis', 'tipe aset', 'tipe barang', 'tipe']);
    let jenisBarang: 'BHP' | 'Belanja Modal' = 'BHP';
    if (rawJenis && (rawJenis.toLowerCase().includes('modal') || rawJenis.toLowerCase().includes('aset') || rawJenis.toLowerCase().includes('tetap'))) {
      jenisBarang = 'Belanja Modal';
    } else if (kodeRekening.startsWith('5.2')) {
      jenisBarang = 'Belanja Modal';
    }
    
    // Single Source of Truth: 1 Kategori Barang = 1 Kode Rekening Belanja
    const kategori: string = namaRekening;

    const satuan = getVal(['satuan', 'unit', 'kemasan']) || 'Pcs';

    // Numbers
    const rawHarga = getVal(['harga satuan rp', 'harga satuan', 'harga', 'tarif', 'unit price']);
    const hargaSatuan = parseNumber(rawHarga, 0);

    const rawStokAwal = getVal(['stok awal', 'saldo awal', 'jumlah awal']);
    const stokAwal = parseNumber(rawStokAwal, 0);

    const rawStokSekarang = getVal(['stok sekarang', 'stok akhir', 'sisa stok', 'stok', 'qty', 'jumlah']);
    const stokSekarang = rawStokSekarang ? parseNumber(rawStokSekarang, stokAwal) : (stokAwal > 0 ? stokAwal : 0);

    const lokasiGudang = getVal(['lokasi gudang', 'lokasi', 'gudang', 'rak', 'tempat simpan']) || 'Gudang Utama';

    data.push({
      id: `brg-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      kodeBarang,
      nusp,
      kodeRekening,
      namaRekening,
      namaBarang,
      spesifikasi,
      kategori,
      satuan,
      hargaSatuan,
      stokAwal,
      stokSekarang,
      lokasiGudang,
      jenisBarang
    });
  });

  return { data, errors };
}

// -------------------------------------------------------------
// FILTER-AWARE EXCEL EXPORT FUNCTIONS (EXCELJS)
// -------------------------------------------------------------

/**
 * Export Master Barang to stylized, filter-aware .xlsx spreadsheet
 * Columns: No, Jenis Aset, Kode Barang, NUSP, Nama & Spesifikasi Barang, Kode Rekening, Kategori, Satuan, Stok, Harga
 */
export async function exportMasterBarangToExcel(barangList: Barang[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SIMBA - Sistem Manajemen Inventaris Sekolah';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Master Barang', {
    views: [{ showGridLines: true }]
  });

  // Define Columns
  worksheet.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Jenis Aset', key: 'jenisBarang', width: 15 },
    { header: 'Kode Barang', key: 'kodeBarang', width: 18 },
    { header: 'NUSP', key: 'nusp', width: 14 },
    { header: 'Nama & Spesifikasi Barang', key: 'namaSpesifikasi', width: 38 },
    { header: 'Kode Rekening', key: 'kodeRekening', width: 20 },
    { header: 'Kategori', key: 'kategori', width: 22 },
    { header: 'Satuan', key: 'satuan', width: 12 },
    { header: 'Stok', key: 'stok', width: 12 },
    { header: 'Harga Satuan (Rp)', key: 'harga', width: 18 }
  ];

  // Style Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' } // Emerald 600
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF047857' } },
      left: { style: 'thin', color: { argb: 'FF047857' } },
      bottom: { style: 'medium', color: { argb: 'FF064E3B' } },
      right: { style: 'thin', color: { argb: 'FF047857' } }
    };
  });

  // Populate Data Rows
  barangList.forEach((b, idx) => {
    const namaDanSpek = b.spesifikasi && b.spesifikasi !== '-' && b.spesifikasi !== b.kodeBarang
      ? `${b.namaBarang} (${b.spesifikasi})`
      : b.namaBarang;

    const row = worksheet.addRow({
      no: idx + 1,
      jenisBarang: b.jenisBarang || 'BHP',
      kodeBarang: b.kodeBarang || '-',
      nusp: b.nusp || '-',
      namaSpesifikasi: namaDanSpek,
      kodeRekening: b.kodeRekening || '-',
      kategori: b.kategori || '-',
      satuan: b.satuan || 'Pcs',
      stok: b.stokSekarang ?? b.stokAwal ?? 0,
      harga: b.hargaSatuan || 0
    });

    row.height = 20;

    row.getCell('no').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('jenisBarang').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('kodeBarang').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('nusp').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('namaSpesifikasi').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('kodeRekening').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('kategori').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('satuan').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('stok').alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell('stok').numFmt = '#,##0';
    row.getCell('harga').alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell('harga').numFmt = '#,##0';

    const isEven = idx % 2 === 1;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: 'Calibri', size: 10 };
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }
        };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  // Adjust auto width dynamically
  worksheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const valStr = cell.value ? String(cell.value) : '';
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    });
    column.width = Math.max(column.width || 10, Math.min(maxLen + 4, 50));
  });

  // Download Trigger
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `Master_Barang_${dateStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Export Master Pegawai to stylized, filter-aware .xlsx spreadsheet
 * Columns: No, Nama Pegawai & Gelar, NIP, Pangkat/Golongan, Jabatan Kedinasan, Unit Kerja
 */
export async function exportMasterPegawaiToExcel(pejabatList: Pejabat[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SIMBA - Sistem Manajemen Inventaris Sekolah';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Master Pegawai', {
    views: [{ showGridLines: true }]
  });

  // Define Columns
  worksheet.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Nama Pegawai & Gelar', key: 'nama', width: 34 },
    { header: 'NIP', key: 'nip', width: 24 },
    { header: 'Pangkat / Golongan', key: 'pangkatGolongan', width: 26 },
    { header: 'Jabatan Kedinasan', key: 'jabatan', width: 30 },
    { header: 'Unit Kerja', key: 'unitKerja', width: 26 }
  ];

  // Style Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' } // Emerald 600
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF047857' } },
      left: { style: 'thin', color: { argb: 'FF047857' } },
      bottom: { style: 'medium', color: { argb: 'FF064E3B' } },
      right: { style: 'thin', color: { argb: 'FF047857' } }
    };
  });

  // Populate Data Rows
  pejabatList.forEach((p, idx) => {
    const row = worksheet.addRow({
      no: idx + 1,
      nama: p.nama || '-',
      nip: p.nip || '-',
      pangkatGolongan: p.pangkatGolongan || '-',
      jabatan: p.jabatan || '-',
      unitKerja: p.unitKerja || '-'
    });

    row.height = 20;

    row.getCell('no').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('nama').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('nip').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('pangkatGolongan').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('jabatan').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('unitKerja').alignment = { vertical: 'middle', horizontal: 'left' };

    const isEven = idx % 2 === 1;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: 'Calibri', size: 10 };
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }
        };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  // Adjust auto width dynamically
  worksheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const valStr = cell.value ? String(cell.value) : '';
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    });
    column.width = Math.max(column.width || 10, Math.min(maxLen + 4, 50));
  });

  // Download Trigger
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `Master_Pegawai_${dateStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
