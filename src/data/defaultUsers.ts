import { AppUser } from '../types';

export const DEFAULT_USERS: AppUser[] = [
  {
    id: 'user-admin-1',
    nama: 'Dedi Kurniawan, S.Pd.',
    username: 'admin',
    role: 'admin',
    pin: '123456',
    password: 'admin',
    nip: '19850912 201001 1 011',
    jabatan: 'Administrator Sistem & Pengurus Barang',
    unitKerja: 'Subbag Tata Usaha & Pengelola Aset',
    email: 'admin.simba@sman1cihaurbeuti.sch.id',
    avatarColor: 'bg-indigo-600'
  },
  {
    id: 'user-operator-1',
    nama: 'Asep Saepudin, A.Md.',
    username: 'operator',
    role: 'operator',
    pin: '123456',
    password: 'operator',
    nip: '19900415 201802 1 004',
    jabatan: 'Operator Pengurus Barang Pembantu',
    unitKerja: 'Pengelola Aset & Inventaris',
    email: 'asep@sman1cihaurbeuti.sch.id',
    avatarColor: 'bg-emerald-600'
  },
  {
    id: 'user-guru-1',
    nama: 'Hj. Neneng Hasanah, S.Pd., M.M.',
    username: 'guru',
    role: 'pengguna',
    pin: '123456',
    password: 'guru',
    nip: '19860714 201201 2 008',
    jabatan: 'Guru Pembina & Penanggung Jawab Lab',
    unitKerja: 'Laboratorium Sains & Bahasa',
    email: 'neneng@sman1cihaurbeuti.sch.id',
    avatarColor: 'bg-blue-600'
  },
  {
    id: 'user-guru-2',
    nama: 'Budi Santoso, S.Pd.',
    username: 'budi.guru',
    role: 'pengguna',
    pin: '123456',
    password: 'guru',
    nip: '19871105 201101 1 008',
    jabatan: 'Guru Mata Pelajaran / PJ Lab Komputer',
    unitKerja: 'Bidang Pembelajaran & Lab',
    email: 'budi.santoso@sman1cihaurbeuti.sch.id',
    avatarColor: 'bg-amber-600'
  }
];
