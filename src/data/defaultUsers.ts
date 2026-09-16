import { AppUser } from '../types';

export const DEFAULT_USERS: AppUser[] = [
  {
    id: 'user-admin-1',
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
  }
];
