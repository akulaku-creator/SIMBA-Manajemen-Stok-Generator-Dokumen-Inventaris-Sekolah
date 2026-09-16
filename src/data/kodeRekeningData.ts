import { KodeRekening } from '../types';

export const MASTER_KODE_REKENING: KodeRekening[] = [
  // 1. KELOMPOK BELANJA BARANG HABIS PAKAI (BHP) - 5.1.02.01...
  {
    kode: '5.1.02.01.01.0001',
    nama: 'Belanja Bahan-Bahan Bangunan dan Konstruksi',
    kategori: 'Bahan Material',
    jenisAset: 'BHP'
  },
  {
    kode: '5.1.02.01.01.0002',
    nama: 'Belanja Bahan Bakar dan Pelumas',
    kategori: 'Bahan Pakai Habis',
    jenisAset: 'BHP'
  },
  {
    kode: '5.1.02.01.01.0008',
    nama: 'Belanja Bahan Kimia',
    kategori: 'Bahan Praktik Siswa',
    jenisAset: 'BHP'
  },
  {
    kode: '5.1.02.01.01.0012',
    nama: 'Belanja Bahan Praktik Siswa dan Laboratorium',
    kategori: 'Bahan Praktik Siswa',
    jenisAset: 'BHP'
  },
  {
    kode: '5.1.02.01.01.0024',
    nama: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
    kategori: 'Bahan Pakai Habis',
    jenisAset: 'BHP'
  },
  {
    kode: '5.1.02.01.01.0025',
    nama: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover',
    kategori: 'Bahan Pakai Habis',
    jenisAset: 'BHP'
  },
  {
    kode: '5.1.02.01.01.0026',
    nama: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Bahan Cetak',
    kategori: 'Cetakan dan Penggandaan',
    jenisAset: 'BHP'
  },
  {
    kode: '5.1.02.01.01.0027',
    nama: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Benda Pos',
    kategori: 'Bahan Pakai Habis',
    jenisAset: 'BHP'
  },
  {
    kode: '5.1.02.01.01.0029',
    nama: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Bahan Komputer & Tinta/Toner',
    kategori: 'Bahan Pakai Habis',
    jenisAset: 'BHP'
  },
  {
    kode: '5.1.02.01.01.0030',
    nama: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Perabot Kantor',
    kategori: 'Aset/Perlengkapan',
    jenisAset: 'BHP'
  },
  {
    kode: '5.1.02.01.01.0031',
    nama: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Listrik',
    kategori: 'Bahan Pakai Habis',
    jenisAset: 'BHP'
  },
  {
    kode: '5.1.02.01.01.0036',
    nama: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Kebersihan dan Bahan Pembersih',
    kategori: 'Bahan Pakai Habis',
    jenisAset: 'BHP'
  },
  {
    kode: '5.1.02.01.01.0052',
    nama: 'Belanja Obat-Obatan dan Bahan Medis Habis Pakai / UKS',
    kategori: 'Bahan Pakai Habis',
    jenisAset: 'BHP'
  },
  {
    kode: '5.1.02.01.01.0064',
    nama: 'Belanja Alat/Bahan untuk Kegiatan Kantor-Perlengkapan Olahraga',
    kategori: 'Aset untuk Diserahkan / Disalurkan',
    jenisAset: 'BHP'
  },

  // 2. KELOMPOK BELANJA MODAL (ASET TETAP) - 5.2.02...
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

export function getNamaRekeningByKode(kode: string): string {
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
