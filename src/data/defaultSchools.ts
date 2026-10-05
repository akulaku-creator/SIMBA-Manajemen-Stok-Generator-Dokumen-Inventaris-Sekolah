import { Barang, KopSuratConfig, Pejabat, Sekolah, TransaksiPenerimaan, TransaksiPengeluaran } from '../types';

export const DEFAULT_PRIMARY_SEKOLAH_ID = 'sekolah-sman1-cihaurbeuti';

export const DEFAULT_SEKOLAH_LIST: Sekolah[] = [
  {
    id: 'sekolah-smkn1-kota',
    npsn: '20231945',
    nama: 'SMK NEGERI 1 KOTA PENDIDIKAN',
    nama_sekolah: 'SMK NEGERI 1 KOTA PENDIDIKAN',
    alamat: 'Jl. Ki Hajar Dewantara No. 107',
    desa_kelurahan: 'Duren Jaya',
    kecamatan: 'Bekasi Timur',
    kabupaten_kota: 'Kota Bekasi',
    kota: 'Bekasi',
    provinsi: 'Jawa Barat',
    kode_pos: '17111',
    logo: 'tutwuri',
    kop_surat: 'PEMERINTAH DAERAH PROVINSI JAWA BARAT - DINAS PENDIDIKAN - CADISDIK WILAYAH III',
    jenjang: 'SMK',
    status: 'Negeri',
    telepon: '(021) 89901234',
    email: 'info@smkn1kotapendidikan.sch.id',
    website: 'https://smkn1kotapendidikan.sch.id',
    kepalaSekolahNama: 'Drs. H. Bambang Suhartono, M.Pd.',
    kepalaSekolahNip: '19680512 199303 1 005',
    isActive: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sekolah-sman1-cihaurbeuti',
    npsn: '20211512',
    nama: 'SMAN 1 CIHAURBEUTI',
    nama_sekolah: 'SMAN 1 CIHAURBEUTI',
    alamat: 'Jl. Kartawijaya No. 600, Cihaurbeuti',
    desa_kelurahan: 'Cihaurbeuti',
    kecamatan: 'Cihaurbeuti',
    kabupaten_kota: 'Kabupaten Ciamis',
    kota: 'Ciamis',
    provinsi: 'Jawa Barat',
    kode_pos: '46261',
    logo: 'sma',
    kop_surat: 'PEMERINTAH DAERAH PROVINSI JAWA BARAT - DINAS PENDIDIKAN - CADISDIK WILAYAH XIII',
    jenjang: 'SMA',
    status: 'Negeri',
    telepon: '(0265) 771234',
    email: 'info@sman1cihaurbeuti.sch.id',
    website: 'https://sman1cihaurbeuti.sch.id',
    kepalaSekolahNama: 'Dra. Hj. Imas Rohayati, M.Pd.',
    kepalaSekolahNip: '19690321 199412 2 001',
    isActive: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sekolah-smkn2-bandung',
    npsn: '20219293',
    nama: 'SMK NEGERI 2 BANDUNG',
    nama_sekolah: 'SMK NEGERI 2 BANDUNG',
    alamat: 'Jl. Ciliwung No. 4',
    desa_kelurahan: 'Cihapit',
    kecamatan: 'Bandung Wetan',
    kabupaten_kota: 'Kota Bandung',
    kota: 'Bandung',
    provinsi: 'Jawa Barat',
    kode_pos: '40114',
    logo: 'tutwuri',
    kop_surat: 'PEMERINTAH DAERAH PROVINSI JAWA BARAT - DINAS PENDIDIKAN - CADISDIK WILAYAH VII',
    jenjang: 'SMK',
    status: 'Negeri',
    telepon: '(022) 7201234',
    email: 'info@smkn2bandung.sch.id',
    website: 'https://smkn2bandung.sch.id',
    kepalaSekolahNama: 'Drs. H. Asep Suryana, M.M.',
    kepalaSekolahNip: '19710815 199702 1 003',
    isActive: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export const DEFAULT_KOP_SURAT_BY_SEKOLAH: Record<string, KopSuratConfig> = {
  'sekolah-smkn1-kota': {
    sekolah_id: 'sekolah-smkn1-kota',
    pemerintahDaerah: 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
    dinasPendidikan: 'DINAS PENDIDIKAN',
    cabangDinas: 'CABANG DINAS PENDIDIKAN WILAYAH III',
    namaSekolah: 'SMK NEGERI 1 KOTA PENDIDIKAN',
    alamatLengkap: 'Jl. Ki Hajar Dewantara No. 107, Telp. (021) 89901234, Fax. (021) 89901235',
    emailWebsite: 'Email: info@smkn1kotapendidikan.sch.id | Website: https://smkn1kotapendidikan.sch.id',
    npsn: '20231945',
    kotaSurat: 'Bekasi',
    logoType: 'pemda',
    logoProvinsiType: 'pemda',
    tampilkanLogoProvinsi: true,
    logoSekolahType: 'tutwuri',
    tampilkanLogoSekolah: true
  },
  'sekolah-sman1-cihaurbeuti': {
    sekolah_id: 'sekolah-sman1-cihaurbeuti',
    pemerintahDaerah: 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
    dinasPendidikan: 'DINAS PENDIDIKAN',
    cabangDinas: 'CABANG DINAS PENDIDIKAN WILAYAH XIII',
    namaSekolah: 'SMAN 1 CIHAURBEUTI',
    alamatLengkap: 'Jl. Kartawijaya No. 600 Cihaurbeuti, Telp. (0265) 771234, Kab. Ciamis 46261',
    emailWebsite: 'Email: info@sman1cihaurbeuti.sch.id | Website: https://sman1cihaurbeuti.sch.id',
    npsn: '20211512',
    kotaSurat: 'Ciamis',
    logoType: 'pemda',
    logoProvinsiType: 'pemda',
    tampilkanLogoProvinsi: true,
    logoSekolahType: 'sma',
    tampilkanLogoSekolah: true
  },
  'sekolah-smkn2-bandung': {
    sekolah_id: 'sekolah-smkn2-bandung',
    pemerintahDaerah: 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
    dinasPendidikan: 'DINAS PENDIDIKAN',
    cabangDinas: 'CABANG DINAS PENDIDIKAN WILAYAH VII',
    namaSekolah: 'SMK NEGERI 2 BANDUNG',
    alamatLengkap: 'Jl. Ciliwung No. 4, Telp. (022) 7201234, Kota Bandung 40114',
    emailWebsite: 'Email: info@smkn2bandung.sch.id | Website: https://smkn2bandung.sch.id',
    npsn: '20219293',
    kotaSurat: 'Bandung',
    logoType: 'pemda',
    logoProvinsiType: 'pemda',
    tampilkanLogoProvinsi: true,
    logoSekolahType: 'smk',
    tampilkanLogoSekolah: true
  }
};

export const DEFAULT_PEJABAT_BY_SEKOLAH: Record<string, Pejabat[]> = {
  'sekolah-sman1-cihaurbeuti': [
    {
      id: 'pejabat-chrbt-kepsek',
      role: 'kepala_sekolah',
      sekolah_id: 'sekolah-sman1-cihaurbeuti',
      nama: 'Dra. Hj. Imas Rohayati, M.Pd.',
      nip: '19690321 199412 2 001',
      pangkatGolongan: 'Pembina Tingkat I / IV b',
      jabatan: 'Kepala Sekolah',
      unitKerja: 'Pimpinan SMAN 1 Cihaurbeuti'
    },
    {
      id: 'pejabat-chrbt-sarpras',
      role: 'sarpras',
      sekolah_id: 'sekolah-sman1-cihaurbeuti',
      nama: 'H. Dadan Hamdani, M.Pd.',
      nip: '19750210 200312 1 004',
      pangkatGolongan: 'Penata Tingkat I / III d',
      jabatan: 'Wakasek Sarana Prasarana',
      unitKerja: 'Sarpras SMAN 1 Cihaurbeuti'
    },
    {
      id: 'pejabat-chrbt-pengurus-barang',
      role: 'pengurus_barang',
      sekolah_id: 'sekolah-sman1-cihaurbeuti',
      nama: 'Endang Kusnandar, S.AP.',
      nip: '19870512 201101 1 007',
      pangkatGolongan: 'Penata / III c',
      jabatan: 'Pengurus Barang Pembantu',
      statusJabatan: 'Definitif',
      unitKerja: 'Pengelola Persediaan Barang'
    },
    {
      id: 'pejabat-chrbt-bendahara-bos',
      role: 'bendahara_bos',
      sekolah_id: 'sekolah-sman1-cihaurbeuti',
      nama: 'Yanti Rohmayanti, S.Pd.',
      nip: '19810815 200604 2 011',
      pangkatGolongan: 'Penata Tingkat I / III d',
      jabatan: 'Bendahara BOS',
      statusJabatan: 'Definitif',
      unitKerja: 'Pengelola Keuangan SMAN 1 Cihaurbeuti'
    },
    {
      id: 'pejabat-chrbt-tim-pemeriksa',
      role: 'tim_pemeriksa',
      sekolah_id: 'sekolah-sman1-cihaurbeuti',
      nama: 'Dedi Kusmayadi, S.Pd.',
      nip: '19790412 200501 1 008',
      pangkatGolongan: 'Penata / III c',
      jabatan: 'Tim Pemeriksa Fisik',
      statusJabatan: 'Definitif',
      unitKerja: 'Pemeriksa Fisik Barang Persediaan'
    }
  ],
  'sekolah-smkn2-bandung': [
    {
      id: 'pejabat-bdg-kepsek',
      role: 'kepala_sekolah',
      sekolah_id: 'sekolah-smkn2-bandung',
      nama: 'Drs. H. Asep Suryana, M.M.',
      nip: '19710815 199702 1 003',
      pangkatGolongan: 'Pembina Utama Muda / IV c',
      jabatan: 'Kepala Sekolah',
      statusJabatan: 'Definitif',
      unitKerja: 'Pimpinan SMKN 2 Bandung'
    },
    {
      id: 'pejabat-bdg-sarpras',
      role: 'sarpras',
      sekolah_id: 'sekolah-smkn2-bandung',
      nama: 'Yayan Hendrayana, S.T., M.Kom.',
      nip: '19800612 200801 1 015',
      pangkatGolongan: 'Penata Tingkat I / III d',
      jabatan: 'Wakasek Sarana Prasarana',
      statusJabatan: 'Definitif',
      unitKerja: 'Sarpras SMKN 2 Bandung'
    },
    {
      id: 'pejabat-bdg-pengurus-barang',
      role: 'pengurus_barang',
      sekolah_id: 'sekolah-smkn2-bandung',
      nama: 'Fitri Handayani, A.Md.',
      nip: '19910405 201503 2 004',
      pangkatGolongan: 'Pengatur Tingkat I / II d',
      jabatan: 'Pengurus Barang Pembantu',
      statusJabatan: 'Definitif',
      unitKerja: 'Pengelola Persediaan Barang'
    },
    {
      id: 'pejabat-bdg-bendahara-bos',
      sekolah_id: 'sekolah-smkn2-bandung',
      nama: 'Eni Suryani, S.E.',
      nip: '19830520 200801 2 009',
      pangkatGolongan: 'Penata / III c',
      jabatan: 'Bendahara BOS',
      statusJabatan: 'Definitif',
      unitKerja: 'Pengelola Keuangan SMKN 2 Bandung'
    },
    {
      id: 'pejabat-bdg-tim-pemeriksa',
      sekolah_id: 'sekolah-smkn2-bandung',
      nama: 'Cecep Sunandar, S.ST.',
      nip: '19821104 200902 1 005',
      pangkatGolongan: 'Penata / III c',
      jabatan: 'Tim Pemeriksa Fisik',
      statusJabatan: 'Definitif',
      unitKerja: 'Tim Pemeriksa Fisik Barang'
    }
  ]
};

export const DEFAULT_BARANG_BY_SEKOLAH: Record<string, Barang[]> = {
  'sekolah-sman1-cihaurbeuti': [
    {
      id: 'brg-chrbt-001',
      sekolah_id: 'sekolah-sman1-cihaurbeuti',
      kodeBarang: '1.01.03.01.01',
      nusp: '0001/2026',
      namaBarang: 'Kertas HVS F4 70 gsm Sinar Dunia',
      spesifikasi: 'Ukuran Folio 215 x 330 mm, 70 gram, putih bersih',
      kodeRekening: '5.1.02.01.01.0025',
      namaRekening: 'Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover',
      kategori: 'Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover',
      satuan: 'Rim',
      hargaSatuan: 54000,
      stokAwal: 60,
      stokSekarang: 45,
      lokasiGudang: 'Gudang Sarpras SMAN 1 Cihaurbeuti'
    },
    {
      id: 'brg-chrbt-002',
      sekolah_id: 'sekolah-sman1-cihaurbeuti',
      kodeBarang: '1.01.03.01.08',
      nusp: '0002/2026',
      namaBarang: 'Spidol Whiteboard Snowman Hitam',
      spesifikasi: 'Boardmarker dapat dihapus, non-toxic, isi 12 pcs/box',
      kodeRekening: '5.1.02.01.01.0024',
      namaRekening: 'Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
      kategori: 'Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
      satuan: 'Box',
      hargaSatuan: 84000,
      stokAwal: 25,
      stokSekarang: 18,
      lokasiGudang: 'Lemari ATK Ruang Guru'
    },
    {
      id: 'brg-chrbt-003',
      sekolah_id: 'sekolah-sman1-cihaurbeuti',
      kodeBarang: '1.01.03.02.04',
      nusp: '0003/2026',
      namaBarang: 'Tinta Printer Epson 003 Black Original',
      spesifikasi: 'Kemasan botol 65ml untuk Epson L3110 / L3210',
      kodeRekening: '5.1.02.01.01.0029',
      namaRekening: 'Alat/Bahan untuk Kegiatan Kantor-Bahan Komputer',
      kategori: 'Alat/Bahan untuk Kegiatan Kantor-Bahan Komputer',
      satuan: 'Botol',
      hargaSatuan: 95000,
      stokAwal: 15,
      stokSekarang: 10,
      lokasiGudang: 'Lemari Sarpras'
    },
    {
      id: 'brg-chrbt-004',
      sekolah_id: 'sekolah-sman1-cihaurbeuti',
      kodeBarang: '1.01.03.04.01',
      nusp: '0004/2026',
      namaBarang: 'Sabun Cuci Tangan Antiseptik Dettol 500ml',
      spesifikasi: 'Formula antibakteri kemasan botol pump',
      kodeRekening: '5.1.02.01.01.0030',
      namaRekening: 'Alat/Bahan untuk Kegiatan Kantor-Perabot Kantor',
      kategori: 'Alat/Bahan untuk Kegiatan Kantor-Perabot Kantor',
      satuan: 'Botol',
      hargaSatuan: 38000,
      stokAwal: 30,
      stokSekarang: 22,
      lokasiGudang: 'Gudang Kebersihan'
    },
    {
      id: 'brg-chrbt-005',
      sekolah_id: 'sekolah-sman1-cihaurbeuti',
      kodeBarang: '1.03.02.01.01',
      nusp: '0005/2026',
      namaBarang: 'Flashdisk SanDisk Ultra USB 3.0 64GB',
      spesifikasi: 'Kecepatan transfer hingga 130MB/s, garansi resmi 5 tahun',
      kodeRekening: '5.2.02.05.01.0005',
      namaRekening: 'Belanja Modal Peralatan Komputer',
      kategori: 'Belanja Modal Peralatan Komputer',
      satuan: 'Unit',
      hargaSatuan: 125000,
      stokAwal: 10,
      stokSekarang: 6,
      jenisBarang: 'Belanja Modal',
      lokasiGudang: 'Brankas Inventaris Sarpras'
    }
  ],
  'sekolah-smkn2-bandung': [
    {
      id: 'brg-bdg-001',
      sekolah_id: 'sekolah-smkn2-bandung',
      kodeBarang: '1.01.03.01.01',
      nusp: '0001/2026',
      namaBarang: 'Kertas HVS A4 80 gsm PaperOne',
      spesifikasi: 'Ukuran A4 210 x 297 mm, 80 gram, ekstra tebal',
      kodeRekening: '5.1.02.01.01.0025',
      namaRekening: 'Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover',
      kategori: 'Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover',
      satuan: 'Rim',
      hargaSatuan: 56000,
      stokAwal: 80,
      stokSekarang: 62,
      lokasiGudang: 'Gudang Administrasi TU'
    },
    {
      id: 'brg-bdg-002',
      sekolah_id: 'sekolah-smkn2-bandung',
      kodeBarang: '1.01.03.02.08',
      nusp: '0002/2026',
      namaBarang: 'Toner Cartridge HP LaserJet 85A CE285A',
      spesifikasi: 'Kapasitas hingga 1.600 halaman cetak, original HP',
      kodeRekening: '5.1.02.01.01.0029',
      namaRekening: 'Alat/Bahan untuk Kegiatan Kantor-Bahan Komputer',
      kategori: 'Alat/Bahan untuk Kegiatan Kantor-Bahan Komputer',
      satuan: 'Pcs',
      hargaSatuan: 495000,
      stokAwal: 8,
      stokSekarang: 5,
      lokasiGudang: 'Lemari Khusus Lab Multimedia'
    },
    {
      id: 'brg-bdg-003',
      sekolah_id: 'sekolah-smkn2-bandung',
      kodeBarang: '1.01.03.03.05',
      nusp: '0003/2026',
      namaBarang: 'Kabel UTP Cat6 Belden Original 305m',
      spesifikasi: 'Kabel jaringan Gigabit 4 pair 23 AWG 1 roll penuh',
      kodeRekening: '5.1.02.01.01.0036',
      namaRekening: 'Alat/Bahan untuk Kegiatan Kantor-Alat Listrik',
      kategori: 'Alat/Bahan untuk Kegiatan Kantor-Alat Listrik',
      satuan: 'Roll',
      hargaSatuan: 1650000,
      stokAwal: 5,
      stokSekarang: 3,
      lokasiGudang: 'Bengkel Teknik Komputer & Jaringan'
    },
    {
      id: 'brg-bdg-004',
      sekolah_id: 'sekolah-smkn2-bandung',
      kodeBarang: '1.01.03.04.02',
      nusp: '0004/2026',
      namaBarang: 'Karbol Pembersih Lantai Wipol 5 Liter',
      spesifikasi: 'Pembersih dan disinfektan lantai kemasan jerigen 5L',
      kodeRekening: '5.1.02.01.01.0030',
      namaRekening: 'Alat/Bahan untuk Kegiatan Kantor-Perabot Kantor',
      kategori: 'Alat/Bahan untuk Kegiatan Kantor-Perabot Kantor',
      satuan: 'Jerigen',
      hargaSatuan: 82000,
      stokAwal: 15,
      stokSekarang: 11,
      lokasiGudang: 'Gudang Cleaning Service'
    },
    {
      id: 'brg-bdg-005',
      sekolah_id: 'sekolah-smkn2-bandung',
      kodeBarang: '1.03.02.01.05',
      nusp: '0005/2026',
      namaBarang: 'Switch Hub TP-Link Gigabit 24-Port TL-SG1024D',
      spesifikasi: 'Rackmount 19 inch, 24 port 10/100/1000 Mbps switch',
      kodeRekening: '5.2.02.05.01.0005',
      namaRekening: 'Belanja Modal Peralatan Komputer',
      kategori: 'Belanja Modal Peralatan Komputer',
      satuan: 'Unit',
      hargaSatuan: 1250000,
      stokAwal: 4,
      stokSekarang: 2,
      jenisBarang: 'Belanja Modal',
      lokasiGudang: 'Server Room SMKN 2 Bandung'
    }
  ]
};

export const DEFAULT_TRANSAKSI_BY_SEKOLAH: Record<string, TransaksiPengeluaran[]> = {
  'sekolah-sman1-cihaurbeuti': [
    {
      id: 'trx-chrbt-001',
      sekolah_id: 'sekolah-sman1-cihaurbeuti',
      nomorUrut: 1,
      tanggal: '2026-02-12',
      unitPemohon: 'Panitia Asesmen Sumatif Akhir Jenjang',
      keperluanUmum: 'Penyaluran Kertas HVS dan Spidol untuk Ujian Sekolah & Administrasi Guru',
      noNPB: '001/NPB/SMAN1-CH/II/2026',
      noSPB: '001/SPB/SMAN1-CH/II/2026',
      noSPPB: '001/SPPB/SMAN1-CH/II/2026',
      noBAST: '001/BAST/SMAN1-CH/II/2026',
      pemohonId: 'pejabat-chrbt-sarpras',
      pemohonNama: 'H. Dadan Hamdani, M.Pd.',
      pemohonNip: '19750210 200312 1 004',
      sarprasId: 'pejabat-chrbt-sarpras',
      pengurusBarangId: 'pejabat-chrbt-pengurus-barang',
      kepsekId: 'pejabat-chrbt-kepsek',
      createdAt: '2026-02-12T08:00:00.000Z',
      items: [
        {
          id: 'item-chrbt-1',
          barangId: 'brg-chrbt-001',
          kodeBarang: '1.01.03.01.01',
          nusp: '0001/2026',
          namaBarang: 'Kertas HVS F4 70 gsm Sinar Dunia',
          satuan: 'Rim',
          sisaBarang: 60,
          usulanJumlah: 15,
          hargaSatuan: 54000,
          kodeRekening: '5.1.02.01.01.0025',
          namaRekening: 'Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover',
          keperluan: 'Penggandaan naskah ujian sekolah'
        },
        {
          id: 'item-chrbt-2',
          barangId: 'brg-chrbt-002',
          kodeBarang: '1.01.03.01.08',
          nusp: '0002/2026',
          namaBarang: 'Spidol Whiteboard Snowman Hitam',
          satuan: 'Box',
          sisaBarang: 25,
          usulanJumlah: 7,
          hargaSatuan: 84000,
          kodeRekening: '5.1.02.01.01.0024',
          namaRekening: 'Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
          keperluan: 'Distribusi ke ruang pengawas'
        }
      ]
    }
  ],
  'sekolah-smkn2-bandung': [
    {
      id: 'trx-bdg-001',
      sekolah_id: 'sekolah-smkn2-bandung',
      nomorUrut: 1,
      tanggal: '2026-02-18',
      unitPemohon: 'Bengkel Laboratorium Komputer & Jaringan (TKJ)',
      keperluanUmum: 'Penyaluran Kabel UTP dan Toner Printer untuk Uji Kompetensi Keahlian (UKK)',
      noNPB: '001/NPB/SMKN2-BDG/II/2026',
      noSPB: '001/SPB/SMKN2-BDG/II/2026',
      noSPPB: '001/SPPB/SMKN2-BDG/II/2026',
      noBAST: '001/BAST/SMKN2-BDG/II/2026',
      pemohonId: 'pejabat-bdg-sarpras',
      pemohonNama: 'Yayan Hendrayana, S.T., M.Kom.',
      pemohonNip: '19800612 200801 1 015',
      sarprasId: 'pejabat-bdg-sarpras',
      pengurusBarangId: 'pejabat-bdg-pengurus-barang',
      kepsekId: 'pejabat-bdg-kepsek',
      createdAt: '2026-02-18T08:00:00.000Z',
      items: [
        {
          id: 'item-bdg-1',
          barangId: 'brg-bdg-001',
          kodeBarang: '1.01.03.01.01',
          nusp: '0001/2026',
          namaBarang: 'Kertas HVS A4 80 gsm PaperOne',
          satuan: 'Rim',
          sisaBarang: 80,
          usulanJumlah: 18,
          hargaSatuan: 56000,
          kodeRekening: '5.1.02.01.01.0025',
          namaRekening: 'Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover',
          keperluan: 'Pencetakan lembar soal UKK'
        },
        {
          id: 'item-bdg-2',
          barangId: 'brg-bdg-003',
          kodeBarang: '1.01.03.03.05',
          nusp: '0003/2026',
          namaBarang: 'Kabel UTP Cat6 Belden Original 305m',
          satuan: 'Roll',
          sisaBarang: 5,
          usulanJumlah: 2,
          hargaSatuan: 1650000,
          kodeRekening: '5.1.02.01.01.0036',
          namaRekening: 'Alat/Bahan untuk Kegiatan Kantor-Alat Listrik',
          keperluan: 'Instalasi jaringan workstation UKK'
        }
      ]
    }
  ]
};

export const DEFAULT_PENERIMAAN_BY_SEKOLAH: Record<string, TransaksiPenerimaan[]> = {
  'sekolah-sman1-cihaurbeuti': [
    {
      id: 'rcv-chrbt-001',
      sekolah_id: 'sekolah-sman1-cihaurbeuti',
      tanggal: '2026-01-20',
      noBukti: 'BOS/CHRBT/2026/01/008',
      sumberDana: 'BOS Reguler',
      penyedia: 'CV Sinar Grafika Ciamis',
      keterangan: 'Pengadaan Kertas, Spidol dan Bahan Operasional Sekolah Semester Genap',
      totalNilai: 4850000,
      penerimaId: 'pejabat-chrbt-pengurus-barang',
      items: [
        {
          barangId: 'brg-chrbt-001',
          kodeBarang: '1.01.03.01.01',
          nusp: '0001/2026',
          namaBarang: 'Kertas HVS F4 70 gsm Sinar Dunia',
          satuan: 'Rim',
          jumlahMasuk: 50,
          hargaSatuan: 54000,
          subtotal: 2700000,
          kodeRekening: '5.1.02.01.01.0025',
          namaRekening: 'Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover'
        },
        {
          barangId: 'brg-chrbt-002',
          kodeBarang: '1.01.03.01.08',
          nusp: '0002/2026',
          namaBarang: 'Spidol Whiteboard Snowman Hitam',
          satuan: 'Box',
          jumlahMasuk: 20,
          hargaSatuan: 84000,
          subtotal: 1680000,
          kodeRekening: '5.1.02.01.01.0024',
          namaRekening: 'Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor'
        }
      ]
    }
  ],
  'sekolah-smkn2-bandung': [
    {
      id: 'rcv-bdg-001',
      sekolah_id: 'sekolah-smkn2-bandung',
      tanggal: '2026-01-22',
      noBukti: 'BOS/SMKN2/2026/01/014',
      sumberDana: 'BOS Reguler',
      penyedia: 'PT Sentra Mitra Bandung',
      keterangan: 'Pengadaan Alat Praktik Jaringan dan Bahan Operasional Sekolah',
      totalNilai: 7850000,
      penerimaId: 'pejabat-bdg-pengurus-barang',
      items: [
        {
          barangId: 'brg-bdg-001',
          kodeBarang: '1.01.03.01.01',
          nusp: '0001/2026',
          namaBarang: 'Kertas HVS A4 80 gsm PaperOne',
          satuan: 'Rim',
          jumlahMasuk: 60,
          hargaSatuan: 56000,
          subtotal: 3360000,
          kodeRekening: '5.1.02.01.01.0025',
          namaRekening: 'Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover'
        },
        {
          barangId: 'brg-bdg-003',
          kodeBarang: '1.01.03.03.05',
          nusp: '0003/2026',
          namaBarang: 'Kabel UTP Cat6 Belden Original 305m',
          satuan: 'Roll',
          jumlahMasuk: 2,
          hargaSatuan: 1650000,
          subtotal: 3300000,
          kodeRekening: '5.1.02.01.01.0036',
          namaRekening: 'Alat/Bahan untuk Kegiatan Kantor-Alat Listrik'
        }
      ]
    }
  ]
};

