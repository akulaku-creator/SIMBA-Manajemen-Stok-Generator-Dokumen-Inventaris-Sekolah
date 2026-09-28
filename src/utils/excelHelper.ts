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

export function parseNominal(val: any, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (!val) return fallback;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? fallback : parsed;
}

export function generateBarangTemplate(): void {
  // Struktur Template Resmi:
  // Kolom A (Indeks 0) : No.
  // Kolom B (Indeks 1) : Kode Rekening / Kategori [kode_rekening]
  // Kolom C (Indeks 2) : Kode Barang / Kode Aset [kode_barang]
  // Kolom D (Indeks 3) : Nama Barang [nama_barang]
  // Kolom E (Indeks 4) : Spesifikasi / Merk [spesifikasi]
  // Kolom F (Indeks 5) : Satuan [satuan]
  // Kolom G (Indeks 6) : Harga Satuan (Rp) [harga_satuan]
  // Kolom H (Indeks 7) : Stok Awal [stok_awal]
  // Kolom I (Indeks 8) : Lokasi Gudang [lokasi_gudang]
  const headers = [
    'No.',
    'Kode Rekening',
    'Kode Barang',
    'Nama Barang',
    'Spesifikasi',
    'Satuan',
    'Harga Satuan (Rp)',
    'Stok Awal',
    'Lokasi Gudang'
  ];

  const sampleData = [
    [
      1,
      '5.1.02.01.01.0025',
      '1.01.03.01.25',
      'Kertas HVS A4 80gr Sinar Dunia',
      'Ukuran 210 x 297 mm, 500 lembar/rim',
      'Rim',
      48500,
      100,
      'Gudang TU - Rak A1'
    ],
    [
      2,
      '5.1.02.01.01.0025',
      '1.01.03.01.26',
      'Kertas HVS F4 / Folio 75gr PaperOne',
      'Ukuran 215 x 330 mm, 500 lembar/rim',
      'Rim',
      52000,
      80,
      'Gudang TU - Rak A2'
    ],
    [
      3,
      '5.2.02.05.01.0005',
      '1.03.02.01.01',
      'Laptop Asus ExpertBook B1400 Core i5',
      'Intel Core i5-1135G7, RAM 16GB, SSD 512GB, Win 11 Pro',
      'Unit',
      11850000,
      5,
      'Ruang Server & IT'
    ],
    [
      4,
      '5.2.02.10.01.0002',
      '1.03.01.02.01',
      'Lemari Arsip Besi 2 Pintu Kaca Lion',
      'Bahan plat baja 0.8mm powder coating, 4 rak ambalan',
      'Unit',
      3450000,
      3,
      'Gudang Sarpras'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // Kolom A (0): No.
    { wch: 22 }, // Kolom B (1): Kode Rekening
    { wch: 18 }, // Kolom C (2): Kode Barang
    { wch: 38 }, // Kolom D (3): Nama Barang
    { wch: 38 }, // Kolom E (4): Spesifikasi
    { wch: 12 }, // Kolom F (5): Satuan
    { wch: 18 }, // Kolom G (6): Harga Satuan (Rp)
    { wch: 12 }, // Kolom H (7): Stok Awal
    { wch: 22 }  // Kolom I (8): Lokasi Gudang
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

  // 1. Baca data berbasis Array 2D (AOA) untuk mendeteksi indeks kolom presisi
  const rawAoa: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
  
  if (!rawAoa || rawAoa.length === 0) {
    throw new Error('File Excel tidak memiliki baris data inventaris barang.');
  }

  // 2. Temukan baris header (baris pertama yang berisi teks bermakna)
  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(rawAoa.length, 6); r++) {
    const rowValues = rawAoa[r] || [];
    const hasText = rowValues.some((v: any) => typeof v === 'string' && v.trim().length > 1);
    if (hasText) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Format kolom template Excel tidak sesuai');
  }

  const headerRow = rawAoa[headerRowIndex] || [];
  const normalizedHeaders = headerRow.map((h: any) => normalizeKey(String(h || '')));

  // 3. VALIDASI HEADER TEMPLATE RESMI
  // Cek apakah berkas memiliki kolom-kolom yang sesuai dengan template resmi
  const hasNamaBarangHeader = normalizedHeaders.some((h: string) => 
    h.includes('nama barang') || h.includes('nama item') || h.includes('uraian barang') || h === 'nama' || h === 'barang'
  );
  const hasKodeBarangHeader = normalizedHeaders.some((h: string) => 
    h.includes('kode barang') || h.includes('kode aset') || h.includes('kd barang')
  );
  const hasKodeRekeningHeader = normalizedHeaders.some((h: string) => 
    h.includes('kode rekening') || h.includes('rekening') || h === 'kategori'
  );
  const hasSpesifikasiOrSatuanHeader = normalizedHeaders.some((h: string) => 
    h.includes('spesifikasi') || h.includes('spek') || h.includes('merk') || h.includes('satuan') || h.includes('harga')
  );

  // Jika kolom-kolom pokok template tidak ditemukan sama sekali, tolak dengan pesan resmi
  const recognizedHeaderCount = [
    hasNamaBarangHeader,
    hasKodeBarangHeader,
    hasKodeRekeningHeader,
    hasSpesifikasiOrSatuanHeader
  ].filter(Boolean).length;

  if (recognizedHeaderCount < 2) {
    throw new Error('Format kolom template Excel tidak sesuai');
  }

  // Cari indeks kolom dinamis dari header (jika pengguna menggeser posisi kolom)
  let colIdxRekening = -1;
  let colIdxKodeBarang = -1;
  let colIdxNamaBarang = -1;
  let colIdxSpesifikasi = -1;
  let colIdxSatuan = -1;
  let colIdxHarga = -1;
  let colIdxStok = -1;
  let colIdxLokasi = -1;

  normalizedHeaders.forEach((h: string, idx: number) => {
    if (h.includes('nama barang') || h.includes('uraian barang') || h.includes('nama item') || h === 'nama') {
      if (colIdxNamaBarang === -1) colIdxNamaBarang = idx;
    } else if (h.includes('kode barang') || h.includes('kode aset') || h.includes('kd barang')) {
      if (colIdxKodeBarang === -1) colIdxKodeBarang = idx;
    } else if (h.includes('kode rekening') || h.includes('rekening') || h === 'kategori') {
      if (colIdxRekening === -1) colIdxRekening = idx;
    } else if (h.includes('spesifikasi') || h.includes('spek') || h.includes('merk')) {
      if (colIdxSpesifikasi === -1) colIdxSpesifikasi = idx;
    } else if (h.includes('satuan') || h === 'unit') {
      if (colIdxSatuan === -1) colIdxSatuan = idx;
    } else if (h.includes('harga')) {
      if (colIdxHarga === -1) colIdxHarga = idx;
    } else if (h.includes('stok') || h.includes('saldo')) {
      if (colIdxStok === -1) colIdxStok = idx;
    } else if (h.includes('lokasi') || h.includes('gudang')) {
      if (colIdxLokasi === -1) colIdxLokasi = idx;
    }
  });

  // Default fallback ke struktur kolom template resmi jika header tidak bertuliskan teks eksplisit:
  // Kolom A (0): No.
  // Kolom B (1): Kode Rekening
  // Kolom C (2): Kode Barang
  // Kolom D (3): Nama Barang (WAJIB DIBACA SEBAGAI NAMA BARANG)
  // Kolom E (4): Spesifikasi
  // Kolom F (5): Satuan
  // Kolom G (6): Harga Satuan
  // Kolom H (7): Stok Awal
  // Kolom I (8): Lokasi Gudang
  if (colIdxRekening === -1) colIdxRekening = 1;
  if (colIdxKodeBarang === -1) colIdxKodeBarang = 2;
  if (colIdxNamaBarang === -1) colIdxNamaBarang = 3; // FIX: Pastikan indeks 3 = Nama Barang
  if (colIdxSpesifikasi === -1) colIdxSpesifikasi = 4;
  if (colIdxSatuan === -1) colIdxSatuan = 5;
  if (colIdxHarga === -1) colIdxHarga = 6;
  if (colIdxStok === -1) colIdxStok = 7;
  if (colIdxLokasi === -1) colIdxLokasi = 8;

  // Baca juga data berbasis object keys dari SheetJS
  const rawObjects: Record<string, any>[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });

  const data: Barang[] = [];
  const errors: string[] = [];
  const dataRows = rawAoa.slice(headerRowIndex + 1);

  dataRows.forEach((row, index) => {
    const rowObj: Record<string, any> = rawObjects[index] || {};
    const rowNum = headerRowIndex + index + 2;

    // TANGANI BAIK PEMBACAAN BERBASIS HEADER TEXT MAUPUN INDEKS KOLOM ARRAY:
    // Kolom B (Indeks 1) : Kode Rekening / Kategori [kode_rekening]
    const kodeRekeningRaw = (
      rowObj['Kode Rekening'] ??
      rowObj['kode_rekening'] ??
      rowObj['kode rekening'] ??
      rowObj['Kategori'] ??
      rowObj['kategori'] ??
      row[colIdxRekening] ??
      row[1] ??
      ''
    );
    const kodeRekening = String(kodeRekeningRaw).trim();

    // Kolom C (Indeks 2) : Kode Barang / Kode Aset [kode_barang]
    const kodeBarangRaw = (
      rowObj['Kode Barang'] ??
      rowObj['kode_barang'] ??
      rowObj['kode barang'] ??
      rowObj['Kode Aset'] ??
      rowObj['kode_aset'] ??
      rowObj['kd barang'] ??
      row[colIdxKodeBarang] ??
      row[2] ??
      ''
    );
    const kodeBarang = String(kodeBarangRaw).trim();

    // Kolom D (Indeks 3) : Nama Barang [nama_barang] (WAJIB DIBACA SEBAGAI NAMA BARANG, TIDAK TERTUKAR DENGAN KODE BARANG)
    const namaBarangRaw = (
      rowObj['Nama Barang'] ??
      rowObj['nama_barang'] ??
      rowObj['nama barang'] ??
      rowObj['Uraian Barang'] ??
      rowObj['uraian barang'] ??
      rowObj['Nama Item'] ??
      row[colIdxNamaBarang] ??
      row[3] ??
      ''
    );
    const namaBarang = String(namaBarangRaw).trim();

    // Kolom E (Indeks 4) : Spesifikasi / Merk [spesifikasi]
    const spesifikasiRaw = (
      rowObj['Spesifikasi'] ??
      rowObj['spesifikasi'] ??
      rowObj['Merk'] ??
      rowObj['merk'] ??
      rowObj['Spek'] ??
      rowObj['keterangan'] ??
      row[colIdxSpesifikasi] ??
      row[4] ??
      ''
    );
    const spesifikasi = String(spesifikasiRaw).trim() || '-';

    // Kolom F (Indeks 5) : Satuan [satuan]
    const satuanRaw = (
      rowObj['Satuan'] ??
      rowObj['satuan'] ??
      rowObj['Unit'] ??
      rowObj['unit'] ??
      row[colIdxSatuan] ??
      row[5] ??
      'Pcs'
    );
    const satuan = String(satuanRaw).trim() || 'Pcs';

    // Kolom G (Indeks 6) : Harga Satuan (Rp) [harga_satuan]
    const hargaSatuanRaw = (
      rowObj['Harga Satuan'] ??
      rowObj['harga_satuan'] ??
      rowObj['Harga Satuan (Rp)'] ??
      rowObj['harga satuan'] ??
      rowObj['Harga'] ??
      row[colIdxHarga] ??
      row[6] ??
      0
    );
    const hargaSatuan = parseNominal(hargaSatuanRaw);

    // Kolom H (Indeks 7) : Stok Awal (Opsional)
    const stokAwalRaw = (
      rowObj['Stok Awal'] ??
      rowObj['stok_awal'] ??
      rowObj['Saldo Awal'] ??
      row[colIdxStok] ??
      row[7] ??
      0
    );
    const stokAwal = parseNominal(stokAwalRaw);

    // Kolom I (Indeks 8) : Lokasi Gudang (Opsional)
    const lokasiGudangRaw = (
      rowObj['Lokasi Gudang'] ??
      rowObj['lokasi_gudang'] ??
      rowObj['Lokasi'] ??
      row[colIdxLokasi] ??
      row[8] ??
      'Gudang Utama'
    );
    const lokasiGudang = String(lokasiGudangRaw).trim() || 'Gudang Utama';

    // Abaikan baris kosong
    if (!namaBarang && !kodeBarang && !kodeRekening && !spesifikasiRaw) {
      return;
    }

    if (!namaBarang) {
      errors.push(`Baris ${rowNum}: Nama barang kosong.`);
      return;
    }

    const kodeBarangFinal = kodeBarang || '1.01.03.01.99';
    const kodeRekeningFinal = kodeRekening || '5.1.02.01.01.0025';
    const namaRekening = getNamaRekeningByKode(kodeRekeningFinal);

    // Jenis Aset (BHP vs Belanja Modal)
    let jenisBarang: 'BHP' | 'Belanja Modal' = 'BHP';
    if (kodeRekeningFinal.startsWith('5.2')) {
      jenisBarang = 'Belanja Modal';
    }

    // NUSP otomatis jika tidak ditentukan
    const generatedNusp = `${String(currentCount + data.length + 1).padStart(4, '0')}/${new Date().getFullYear()}`;

    data.push({
      id: `brg-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      kodeBarang: kodeBarangFinal,
      nusp: generatedNusp,
      kodeRekening: kodeRekeningFinal,
      namaRekening,
      namaBarang,
      spesifikasi,
      kategori: namaRekening,
      satuan,
      hargaSatuan,
      stokAwal,
      stokSekarang: stokAwal,
      lokasiGudang,
      jenisBarang
    });
  });

  return { data, errors };
}

// -------------------------------------------------------------
// FILTER-AWARE ASYNC EXCEL EXPORT (HIGH-PERFORMANCE / CHUNKING)
// -------------------------------------------------------------

export type ExportProgressCallback = (percent: number, statusText: string) => void;

/**
 * Asynchronous, Chunked, Non-blocking Export Master Barang to .xlsx
 * Uses pure JSON-to-Sheet conversion to prevent UI freezes & browser "not responding" errors.
 */
export async function exportMasterBarangToExcel(
  barangList: Barang[],
  onProgress?: ExportProgressCallback,
  customFileName?: string
): Promise<void> {
  // 1. Initial yield to allow React to paint loading UI and disable button
  onProgress?.(5, 'Menyiapkan data inventaris...');
  await new Promise((resolve) => setTimeout(resolve, 80));

  const total = barangList.length;
  const CHUNK_SIZE = 200;
  const formattedData: Record<string, any>[] = [];

  // 2. Process in chunks to prevent locking main thread
  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = barangList.slice(i, i + CHUNK_SIZE);
    
    chunk.forEach((b, cIdx) => {
      const idx = i + cIdx;
      const stokAwal = Number(b.stokAwal || 0);
      const stokSekarang = Number(b.stokSekarang ?? stokAwal);
      const hargaSatuan = Number(b.hargaSatuan || 0);
      const totalNilai = stokSekarang * hargaSatuan;

      formattedData.push({
        'No': idx + 1,
        'Jenis Aset': b.jenisBarang || 'BHP',
        'Kode Rekening': String(b.kodeRekening || '').trim(),
        'Kategori / Nama Rekening': b.kategori || b.namaRekening || '-',
        'Kode Barang': String(b.kodeBarang || '').trim(),
        'NUSP': String(b.nusp || '-').trim(),
        'Nama Barang': b.namaBarang || '',
        'Spesifikasi': b.spesifikasi || '-',
        'Satuan': b.satuan || 'Pcs',
        'Stok Awal': stokAwal,
        'Stok Sekarang': stokSekarang,
        'Harga Satuan (Rp)': hargaSatuan,
        'Total Nilai Persediaan (Rp)': totalNilai,
        'Lokasi Gudang': b.lokasiGudang || '-'
      });
    });

    const percent = Math.min(75, Math.round(10 + ((i + chunk.length) / (total || 1)) * 65));
    onProgress?.(percent, `Menata data (${Math.min(i + chunk.length, total)}/${total})...`);
    
    // Non-blocking yield to browser event loop
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // 3. Compile worksheet using high-performance SheetJS json_to_sheet (no DOM parsing)
  onProgress?.(80, 'Mengompilasi worksheet Excel...');
  await new Promise((resolve) => setTimeout(resolve, 30));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Set explicit column widths for clean readability
  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 14 }, // Jenis Aset
    { wch: 22 }, // Kode Rekening
    { wch: 28 }, // Kategori / Nama Rekening
    { wch: 18 }, // Kode Barang
    { wch: 14 }, // NUSP
    { wch: 34 }, // Nama Barang
    { wch: 24 }, // Spesifikasi
    { wch: 10 }, // Satuan
    { wch: 12 }, // Stok Awal
    { wch: 14 }, // Stok Sekarang
    { wch: 18 }, // Harga Satuan
    { wch: 24 }, // Total Nilai
    { wch: 16 }  // Lokasi Gudang
  ];

  // 4. Build workbook
  onProgress?.(90, 'Membangun workbook .xlsx...');
  await new Promise((resolve) => setTimeout(resolve, 30));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Master_Barang');

  // 5. Trigger download without blocking browser
  onProgress?.(98, 'Mengunduh file Excel...');
  await new Promise((resolve) => setTimeout(resolve, 30));

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = customFileName || `Master_Barang_${dateStr}.xlsx`;
  
  XLSX.writeFile(workbook, fileName, { compression: true });
  onProgress?.(100, 'Selesai!');
}

/**
 * Asynchronous, Chunked, Non-blocking Export Master Pegawai to .xlsx
 */
export async function exportMasterPegawaiToExcel(
  pejabatList: Pejabat[],
  onProgress?: ExportProgressCallback,
  customFileName?: string
): Promise<void> {
  onProgress?.(10, 'Menyiapkan data pegawai...');
  await new Promise((resolve) => setTimeout(resolve, 80));

  const total = pejabatList.length;
  const CHUNK_SIZE = 200;
  const formattedData: Record<string, any>[] = [];

  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = pejabatList.slice(i, i + CHUNK_SIZE);
    chunk.forEach((p, cIdx) => {
      const idx = i + cIdx;
      formattedData.push({
        'No': idx + 1,
        'Nama Pegawai & Gelar': p.nama || '-',
        'NIP': p.nip || '-',
        'Pangkat / Golongan': p.pangkatGolongan || '-',
        'Jabatan Kedinasan': p.jabatan || '-',
        'Unit Kerja': p.unitKerja || '-'
      });
    });

    const percent = Math.min(80, Math.round(15 + ((i + chunk.length) / (total || 1)) * 65));
    onProgress?.(percent, `Menata data (${Math.min(i + chunk.length, total)}/${total})...`);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  onProgress?.(85, 'Mengompilasi worksheet Excel...');
  await new Promise((resolve) => setTimeout(resolve, 30));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 34 }, // Nama Pegawai
    { wch: 24 }, // NIP
    { wch: 26 }, // Pangkat / Golongan
    { wch: 30 }, // Jabatan Kedinasan
    { wch: 26 }  // Unit Kerja
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Master_Pegawai');

  onProgress?.(95, 'Mengunduh file Excel...');
  await new Promise((resolve) => setTimeout(resolve, 30));

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = customFileName || `Master_Pegawai_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, fileName, { compression: true });
  onProgress?.(100, 'Selesai!');
}
