import * as XLSX from 'xlsx';
import { Barang, Pejabat } from '../types';

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
      'Belanja Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover',
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
      'Belanja Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover',
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
      (kodeRekening.endsWith('0025') ? 'Belanja Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover' : 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor');

    const spesifikasi = getVal(['spesifikasi', 'spek', 'keterangan', 'deskripsi', 'merk', 'ukuran']) || '-';

    // Jenis Aset (BHP vs Belanja Modal)
    const rawJenis = getVal(['jenis aset', 'jenis barang', 'jenis', 'tipe aset', 'tipe barang', 'tipe']);
    let jenisBarang: 'BHP' | 'Belanja Modal' = 'BHP';
    if (rawJenis && (rawJenis.toLowerCase().includes('modal') || rawJenis.toLowerCase().includes('aset') || rawJenis.toLowerCase().includes('tetap'))) {
      jenisBarang = 'Belanja Modal';
    } else if (kodeRekening.startsWith('5.2')) {
      jenisBarang = 'Belanja Modal';
    }
    
    // Category normalization
    const rawKat = getVal(['kategori', 'kelompok']);
    let kategori: string = 'ATK / Kertas';
    if (rawKat) {
      const match = VALID_CATEGORIES.find(c => c.toLowerCase() === rawKat.toLowerCase() || rawKat.toLowerCase().includes(c.toLowerCase()));
      if (match) {
        kategori = match;
      } else if (rawKat.toLowerCase().includes('bersih')) {
        kategori = 'Kebersihan';
      } else if (rawKat.toLowerCase().includes('komp') || rawKat.toLowerCase().includes('elektro')) {
        kategori = 'Elektronik & Komputer';
      } else if (rawKat.toLowerCase().includes('praktik') || rawKat.toLowerCase().includes('peraga')) {
        kategori = 'Alat Praktik/Peraga';
      } else if (rawKat.toLowerCase().includes('material')) {
        kategori = 'Bahan Material';
      } else if (rawKat.toLowerCase().includes('mesin') || rawKat.toLowerCase().includes('alat')) {
        kategori = 'Peralatan & Mesin (Aset)';
      } else if (rawKat.toLowerCase().includes('mebel') || rawKat.toLowerCase().includes('perabot')) {
        kategori = 'Perabot & Meubelair (Aset)';
      } else {
        kategori = rawKat;
      }
    } else if (jenisBarang === 'Belanja Modal') {
      kategori = 'Peralatan & Mesin (Aset)';
    }

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
