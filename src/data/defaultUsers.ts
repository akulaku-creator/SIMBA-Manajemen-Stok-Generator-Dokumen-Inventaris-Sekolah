import { AppUser } from '../types';

export const DEFAULT_USERS: AppUser[] = [
  {
    id: 'user-dinas-1',
    sekolah_id: undefined, // Dinas / Super Admin: Cross-school access
    nama: 'Drs. H. Mulyadi, M.M.',
    username: 'dinas',
    role: 'super_admin',
    pin: '123456',
    password: 'dinas',
    nip: '19700101 199503 1 002',
    jabatan: 'Koordinator Aset & Sarpras Dinas Pendidikan',
    unitKerja: 'Dinas Pendidikan Provinsi',
    email: 'dinas@disdik.jabarprov.go.id',
    avatarColor: 'bg-red-600'
  },
  {
    id: 'user-admin-1',
    sekolah_id: 'sekolah-smkn1-kota',
    nama: 'Ratna Indrawati, S.Kom.',
    username: 'admin',
    role: 'admin',
    pin: '123456',
    password: 'admin',
    nip: '19830514 200801 2 007',
    jabatan: 'Administrator Sistem & Pengelola Aset',
    unitKerja: 'Subbag Tata Usaha & IT',
    email: 'admin.simba@smkn1.sch.id',
    avatarColor: 'bg-purple-600'
  },
  {
    id: 'user-operator-1',
    sekolah_id: 'sekolah-smkn1-kota',
    nama: 'Rina Kartikasari, S.AP.',
    username: 'operator',
    role: 'operator',
    pin: '123456',
    password: 'operator',
    nip: '19890820 201402 2 003',
    jabatan: 'Pengurus Barang Pembantu',
    unitKerja: 'Pengelola Aset & Inventaris',
    email: 'rina.kartika@smkn1.sch.id',
    avatarColor: 'bg-emerald-600'
  },
  {
    id: 'user-guru-1',
    sekolah_id: 'sekolah-smkn1-kota',
    nama: 'Budi Santoso, S.Pd.',
    username: 'budi.guru',
    role: 'pengguna',
    pin: '123456',
    password: 'guru',
    nip: '19871105 201101 1 008',
    jabatan: 'Guru Produktif / PJ Lab Komputer',
    unitKerja: 'Program Keahlian TKJ & Multimedia',
    email: 'budi.santoso@smkn1.sch.id',
    avatarColor: 'bg-blue-600'
  },
  {
    id: 'user-guru-2',
    sekolah_id: 'sekolah-smkn1-kota',
    nama: 'Siti Rahmawati, S.Pd.',
    username: 'siti.guru',
    role: 'pengguna',
    pin: '123456',
    password: 'guru',
    nip: '19920318 201903 2 015',
    jabatan: 'Guru Mata Pelajaran / Wali Kelas X',
    unitKerja: 'Bidang Pembelajaran & Wali Kelas',
    email: 'siti.rahmawati@smkn1.sch.id',
    avatarColor: 'bg-amber-600'
  },
  {
    id: 'user-admin-chrbt',
    sekolah_id: 'sekolah-sman1-cihaurbeuti',
    nama: 'Dedi Kurniawan, S.Pd.',
    username: 'admin.cihaurbeuti',
    role: 'admin',
    pin: '123456',
    password: 'admin',
    nip: '19850912 201001 1 011',
    jabatan: 'Pengurus Barang & Sarpras SMAN 1 Cihaurbeuti',
    unitKerja: 'Subbag TU & Aset SMAN 1 Cihaurbeuti',
    email: 'dedi@sman1cihaurbeuti.sch.id',
    avatarColor: 'bg-indigo-600'
  }
];
