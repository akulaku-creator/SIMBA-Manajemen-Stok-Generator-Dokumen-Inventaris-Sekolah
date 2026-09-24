import { JenisBarang, KodeRekening } from '../types';

/**
 * 40 DAFTAR MASTER KODE REKENING & URAIAN RESMI
 * Sesuai Standar Bagan Akun Standar (BAS) Pemda / Permendagri & Inventaris SIMBA
 */
export const DAFTAR_40_KODE_REKENING_RESMI: {
  kode: string;
  nama: string;
  kategori: string;
  jenisAset: JenisBarang;
}[] = [
  { kode: '5.1.02.01.01.0001', nama: 'Bahan-Bahan Bangunan dan Konstruksi', kategori: 'Bahan-Bahan Bangunan dan Konstruksi', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0002', nama: 'Bahan-Bahan Kimia', kategori: 'Bahan-Bahan Kimia', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0004', nama: 'Bahan-Bahan Bakar dan Pelumas', kategori: 'Bahan-Bahan Bakar dan Pelumas', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0005', nama: 'Bahan-Bahan Baku', kategori: 'Bahan-Bahan Baku', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0008', nama: 'Bahan-Bahan/Bibit Tanaman', kategori: 'Bahan-Bahan/Bibit Tanaman', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0009', nama: 'Bahan-Isi Tabung Pemadam Kebakaran', kategori: 'Bahan-Isi Tabung Pemadam Kebakaran', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0010', nama: 'Bahan-Isi Tabung Gas', kategori: 'Bahan-Isi Tabung Gas', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0011', nama: 'Bahan-Bahan/Bibit Ternak/Bibit Ikan', kategori: 'Bahan-Bahan/Bibit Ternak/Bibit Ikan', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0012', nama: 'Bahan-Bahan Lainnya', kategori: 'Bahan-Bahan Lainnya', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0013', nama: 'Suku Cadang Alat Angkutan', kategori: 'Suku Cadang Alat Angkutan', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0016', nama: 'Belanja Suku Cadang-Suku Cadang Alat Laboratorium', kategori: 'Belanja Suku Cadang-Suku Cadang Alat Laboratorium', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0018', nama: 'Suku Cadang-Suku Cadang Alat Studio dan Komunikasi', kategori: 'Suku Cadang-Suku Cadang Alat Studio dan Komunikasi', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0019', nama: 'Suku Cadang-Suku Cadang Alat Pertanian', kategori: 'Suku Cadang-Suku Cadang Alat Pertanian', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0020', nama: 'Suku Cadang-Suku Cadang Alat Bengkel', kategori: 'Suku Cadang-Suku Cadang Alat Bengkel', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0024', nama: 'Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor', kategori: 'Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0025', nama: 'Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover', kategori: 'Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0026', nama: 'Alat/Bahan untuk Kegiatan Kantor-Bahan Cetak', kategori: 'Alat/Bahan untuk Kegiatan Kantor-Bahan Cetak', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0027', nama: 'Alat/Bahan untuk Kegiatan Kantor-Benda Pos', kategori: 'Alat/Bahan untuk Kegiatan Kantor-Benda Pos', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0029', nama: 'Alat/Bahan untuk Kegiatan Kantor-Bahan Komputer', kategori: 'Alat/Bahan untuk Kegiatan Kantor-Bahan Komputer', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0030', nama: 'Alat/Bahan untuk Kegiatan Kantor-Perabot Kantor', kategori: 'Alat/Bahan untuk Kegiatan Kantor-Perabot Kantor', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0031', nama: 'Alat/Bahan untuk Kegiatan Kantor-Alat Listrik', kategori: 'Alat/Bahan untuk Kegiatan Kantor-Alat Listrik', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0032', nama: 'Alat/Bahan untuk Kegiatan Kantor-Perlengkapan Dinas', kategori: 'Alat/Bahan untuk Kegiatan Kantor-Perlengkapan Dinas', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0034', nama: 'Alat/Bahan untuk Kegiatan Kantor-Perlengkapan Pendukung', kategori: 'Alat/Bahan untuk Kegiatan Kantor-Perlengkapan Pendukung', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0035', nama: 'Alat/Bahan untuk Kegiatan Kantor-Suvenir/Cendera Mata', kategori: 'Alat/Bahan untuk Kegiatan Kantor-Suvenir/Cendera Mata', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0036', nama: 'Alat/Bahan untuk Kegiatan Kantor-Alat/Bahan untuk Kebersihan', kategori: 'Alat/Bahan untuk Kegiatan Kantor-Alat/Bahan untuk Kebersihan', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0037', nama: 'Obat-Obatan', kategori: 'Obat-Obatan', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0043', nama: 'Natura dan Pakan-Natura', kategori: 'Natura dan Pakan-Natura', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0045', nama: 'Natura dan Pakan-Natura dan Pakan Lainnya', kategori: 'Natura dan Pakan-Natura dan Pakan Lainnya', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0052', nama: 'Makanan dan Minuman Rapat', kategori: 'Makanan dan Minuman Rapat', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0053', nama: 'Makan dan Minuman Jamuan Tamu', kategori: 'Makan dan Minuman Jamuan Tamu', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0055', nama: 'Makanan dan Minuman pada Fasilitas Pelayanan Urusan', kategori: 'Makanan dan Minuman pada Fasilitas Pelayanan Urusan', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0064', nama: 'Pakaian Dinas Lapangan', kategori: 'Pakaian Dinas Lapangan', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0066', nama: 'Belanja Pakaian Dinas Upacara (PDU)', kategori: 'Belanja Pakaian Dinas Upacara (PDU)', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0069', nama: 'Pakaian Teknik', kategori: 'Pakaian Teknik', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0071', nama: 'Pakaian Kerja Laboratorium', kategori: 'Pakaian Kerja Laboratorium', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0072', nama: 'Pakaian Kerja Bengkel', kategori: 'Pakaian Kerja Bengkel', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0074', nama: 'Pakaian Adat Daerah', kategori: 'Pakaian Adat Daerah', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0076', nama: 'Pakaian Olahraga', kategori: 'Pakaian Olahraga', jenisAset: 'BHP' },
  { kode: '5.1.02.01.01.0077', nama: 'Pakaian Paskibraka', kategori: 'Pakaian Paskibraka', jenisAset: 'BHP' },
  { kode: '5.1.02.01.02.0003', nama: 'Komponen-Komponen Peralatan', kategori: 'Komponen-Komponen Peralatan', jenisAset: 'BHP' }
];

/**
 * REKENING BELANJA MODAL (ASET TETAP - 5.2...)
 */
export const DAFTAR_REKENING_BELANJA_MODAL: {
  kode: string;
  nama: string;
  kategori: string;
  jenisAset: JenisBarang;
}[] = [
  {
    kode: '5.2.02.05.01.0005',
    nama: 'Belanja Modal Peralatan Komputer (PC, Laptop, Server)',
    kategori: 'Peralatan & Mesin',
    jenisAset: 'Belanja Modal'
  },
  {
    kode: '5.2.02.05.02.0001',
    nama: 'Belanja Modal Peralatan Jaringan Komputer & Router',
    kategori: 'Peralatan & Mesin',
    jenisAset: 'Belanja Modal'
  },
  {
    kode: '5.2.02.05.01.0007',
    nama: 'Belanja Modal Peralatan Studio Audio Visual & Proyektor',
    kategori: 'Peralatan & Mesin',
    jenisAset: 'Belanja Modal'
  },
  {
    kode: '5.2.02.10.01.0002',
    nama: 'Belanja Modal Meubelair & Perabot Kantor (Meja, Kursi, Lemari)',
    kategori: 'Aset Tetap Lainnya',
    jenisAset: 'Belanja Modal'
  },
  {
    kode: '5.2.02.10.02.0003',
    nama: 'Belanja Modal Alat Pendingin / AC & Perlengkapan Kantor',
    kategori: 'Peralatan & Mesin',
    jenisAset: 'Belanja Modal'
  },
  {
    kode: '5.2.02.02.01.0004',
    nama: 'Belanja Modal Alat Praktik & Laboratorium Siswa',
    kategori: 'Peralatan & Mesin',
    jenisAset: 'Belanja Modal'
  },
  {
    kode: '5.2.05.01.01.0001',
    nama: 'Belanja Modal Buku / Koleksi Kepustakaan Perpustakaan',
    kategori: 'Aset Tetap Lainnya',
    jenisAset: 'Belanja Modal'
  }
];

/**
 * MASTER KODE REKENING LENGKAP SIMBA (40 RESMI BHP + REKENING MODAL)
 */
export const MASTER_KODE_REKENING: KodeRekening[] = [
  ...DAFTAR_40_KODE_REKENING_RESMI,
  ...DAFTAR_REKENING_BELANJA_MODAL
];

/**
 * 40 Opsi Master Resmi yang Diformat Standar: [KODE_REKENING] - [URAIAN_KATEGORI]
 */
export const MASTER_40_REKENING_OPTIONS = DAFTAR_40_KODE_REKENING_RESMI.map(item => ({
  kode: item.kode,
  nama: item.nama,
  kategori: item.nama,
  jenisAset: item.jenisAset,
  label: `${item.kode} - ${item.nama}`
}));

/**
 * Seluruh Opsi Master Rekening Lengkap (Termasuk Aset Tetap / Modal jika ada)
 */
export const ALL_REKENING_MASTER_OPTIONS = MASTER_KODE_REKENING.map(item => ({
  kode: item.kode,
  nama: item.nama,
  kategori: item.nama,
  jenisAset: item.jenisAset,
  label: `${item.kode} - ${item.nama}`
}));

/**
 * Cari Master Rekening berdasarkan Kode atau Nama (Case-Insensitive)
 */
export function findMasterRekening(query: string) {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  return (
    MASTER_KODE_REKENING.find(r => r.kode === query.trim()) ||
    MASTER_KODE_REKENING.find(r => r.nama.toLowerCase() === q) ||
    MASTER_KODE_REKENING.find(r => `${r.kode} - ${r.nama}`.toLowerCase() === q) ||
    MASTER_KODE_REKENING.find(r => r.nama.toLowerCase().includes(q))
  );
}

/**
 * Mengambil uraian resmi nama rekening berdasarkan kode akun rekening secara presisi.
 */
export function getNamaRekeningByKode(kode: string): string {
  if (!kode) return 'Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor';
  const clean = kode.trim();
  const found = MASTER_KODE_REKENING.find(r => r.kode === clean);
  if (found) return found.nama;

  // Fallback heuristic based on prefix
  if (clean.startsWith('5.2')) {
    return 'Belanja Modal Peralatan dan Mesin / Aset Tetap';
  }
  return 'Belanja Persediaan Standar Operasional Sekolah';
}

export const getNamaRekeningDefault = getNamaRekeningByKode;

