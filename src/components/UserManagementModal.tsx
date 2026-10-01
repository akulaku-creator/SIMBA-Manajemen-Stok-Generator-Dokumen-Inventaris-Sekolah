import {
  AlertCircle,
  Building2,
  Edit2,
  ExternalLink,
  Filter,
  GraduationCap,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { AppUser, Sekolah, UserRole } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userList: AppUser[];
  currentUserId: string;
  onAddUser: (user: AppUser) => void;
  onUpdateUser: (user: AppUser) => void;
  onDeleteUser: (userId: string) => void;
  onSwitchUser: (userId: string) => void;
  sekolahList?: Sekolah[];
  currentSekolahId?: string;
  onSelectSekolah?: (sekolahId: string) => void;
  currentUser?: AppUser;
}

export const UserManagementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  userList,
  currentUserId,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onSwitchUser,
  sekolahList = [],
  currentSekolahId,
  onSelectSekolah,
  currentUser
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 1. Handling Context Session & Tenant Guard (Requirement 1, 2 & 3)
  const isDinasAdmin =
    (currentUser?.role as string) === 'SUPER_ADMIN' ||
    currentUser?.role === 'super_admin' ||
    currentUser?.sekolah_id === 'dinas_prov';

  // Lookup helper for school name & NPSN
  const schoolMap = useMemo(() => {
    const map = new Map<string, Sekolah>();
    sekolahList.forEach(s => map.set(s.id, s));
    return map;
  }, [sekolahList]);

  // Dedicated school ID for regular school accounts
  const schoolUserSekolahId = currentUser?.sekolah_id || currentSekolahId || 'sekolah-sman1-cihaurbeuti';

  // Dynamic school display name
  const activeSchoolName =
    (currentUser as any)?.nama_sekolah ||
    (currentUser?.sekolah_id ? (schoolMap.get(currentUser.sekolah_id)?.nama_sekolah || schoolMap.get(currentUser.sekolah_id)?.nama) : null) ||
    (currentSekolahId ? (schoolMap.get(currentSekolahId)?.nama_sekolah || schoolMap.get(currentSekolahId)?.nama) : null) ||
    'SMAN 1 CIHAURBEUTI';

  // Filter & Search States: Locked to school ID if Admin Sekolah
  const [filterSekolah, setFilterSekolah] = useState<string>(
    !isDinasAdmin ? schoolUserSekolahId : 'all'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sinkronisasi Tenant Filter otomatis saat user login / modal dibuka
  useEffect(() => {
    if (!isDinasAdmin) {
      setFilterSekolah(schoolUserSekolahId);
    } else {
      if (!filterSekolah) {
        setFilterSekolah('all');
      }
    }
  }, [isDinasAdmin, schoolUserSekolahId, isOpen]);

  // Form State
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [sekolahId, setSekolahId] = useState<string>('');
  const [role, setRole] = useState<UserRole>('pengguna');
  const [pin, setPin] = useState('123456');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [unitKerja, setUnitKerja] = useState('');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Restriksi data tabel pengguna (100% konsisten dengan sesi login dan isolasi tenant)
  const filteredUsers = useMemo(() => {
    const effectiveFilter = !isDinasAdmin ? schoolUserSekolahId : filterSekolah;

    return userList.filter(u => {
      // 1. Strict Tenant Isolation
      if (!isDinasAdmin) {
        // Admin Sekolah: HANYA boleh melihat user dari sekolah sendiri.
        // Akun Dinas / Super Admin atau akun sekolah lain DITOLAK TOTAL.
        if (
          u.role === 'super_admin' ||
          (u.role as string) === 'SUPER_ADMIN' ||
          u.sekolah_id === 'dinas_prov' ||
          !u.sekolah_id
        ) {
          return false;
        }
        if (u.sekolah_id !== schoolUserSekolahId) {
          return false;
        }
      } else {
        // Super Admin Dinas: Filter interaktif per sekolah atau dinas
        if (effectiveFilter !== 'all') {
          if (effectiveFilter === 'dinas_prov') {
            if (u.sekolah_id && u.sekolah_id !== 'dinas_prov') return false;
            if (u.role !== 'super_admin' && (u.role as string) !== 'SUPER_ADMIN') return false;
          } else {
            if (u.sekolah_id !== effectiveFilter) return false;
          }
        }
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const sch = u.sekolah_id ? schoolMap.get(u.sekolah_id) : null;
        const schName = sch ? (sch.nama_sekolah || sch.nama).toLowerCase() : 'dinas pendidikan';
        const schNpsn = sch?.npsn || '';
        
        const match =
          (u.nama || '').toLowerCase().includes(q) ||
          (u.username || '').toLowerCase().includes(q) ||
          (u.nip || '').includes(q) ||
          (u.role || '').toLowerCase().includes(q) ||
          (u.jabatan || '').toLowerCase().includes(q) ||
          (u.unitKerja || '').toLowerCase().includes(q) ||
          schName.includes(q) ||
          schNpsn.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [userList, isDinasAdmin, schoolUserSekolahId, filterSekolah, searchQuery, schoolMap]);

  const resetForm = () => {
    setNama('');
    setUsername('');
    setSekolahId(!isDinasAdmin ? schoolUserSekolahId : '');
    setRole('pengguna');
    setPin('123456');
    setNip('');
    setJabatan('');
    setUnitKerja('');
    setEmail('');
    setEditingId(null);
    setErrorMsg('');
    setIsFormOpen(false);
  };

  const handleStartAdd = () => {
    resetForm();
    if (!isDinasAdmin) {
      setSekolahId(schoolUserSekolahId);
      setRole('operator');
    } else {
      if (filterSekolah !== 'all') {
        setSekolahId(filterSekolah);
        if (filterSekolah === 'dinas_prov') {
          setRole('super_admin');
        } else {
          setRole('operator');
        }
      } else if (currentSekolahId) {
        setSekolahId(currentSekolahId);
        setRole('operator');
      } else {
        setSekolahId(sekolahList[0]?.id || 'sekolah-smkn1-kota');
        setRole('pengguna');
      }
    }
    setIsFormOpen(true);
  };

  const handleStartEdit = (u: AppUser) => {
    // School admin cannot edit dinas accounts
    if (!isDinasAdmin && (u.role === 'super_admin' || u.sekolah_id === 'dinas_prov')) {
      return;
    }
    setEditingId(u.id);
    setNama(u.nama);
    setUsername(u.username);
    setSekolahId(
      !isDinasAdmin
        ? schoolUserSekolahId
        : (u.sekolah_id || (u.role === 'super_admin' ? 'dinas_prov' : (currentSekolahId || '')))
    );
    setRole(u.role);
    setPin(u.pin || u.password || '123456');
    setNip(u.nip || '');
    setJabatan(u.jabatan || '');
    setUnitKerja(u.unitKerja || '');
    setEmail(u.email || '');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nama.trim() || !username.trim()) {
      setErrorMsg('Nama lengkap dan username wajib diisi.');
      return;
    }

    const effectiveSekolahId = !isDinasAdmin ? schoolUserSekolahId : sekolahId;
    if (!effectiveSekolahId) {
      setErrorMsg('Satuan Pendidikan / Instansi wajib dipilih.');
      return;
    }

    // Check duplicate username if adding new
    const duplicate = userList.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && u.id !== editingId
    );
    if (duplicate) {
      setErrorMsg(`Username "${username}" sudah digunakan pengguna lain.`);
      return;
    }

    const boundSekolahId = effectiveSekolahId === 'dinas_prov' ? undefined : effectiveSekolahId;
    const safeRole: UserRole = !isDinasAdmin && role === 'super_admin' ? 'admin' : role;

    if (editingId) {
      const existing = userList.find(u => u.id === editingId);
      if (existing) {
        onUpdateUser({
          ...existing,
          nama: nama.trim(),
          username: username.trim(),
          sekolah_id: boundSekolahId,
          role: safeRole,
          pin: pin.trim() || '123456',
          password: pin.trim() || '123456',
          nip: nip.trim() || undefined,
          jabatan: jabatan.trim() || undefined,
          unitKerja: unitKerja.trim() || undefined,
          email: email.trim() || undefined
        });
      }
    } else {
      const avatarColors = [
        'bg-blue-600',
        'bg-purple-600',
        'bg-emerald-600',
        'bg-amber-600',
        'bg-rose-600',
        'bg-indigo-600'
      ];
      const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
      const newUser: AppUser = {
        id: `user-${Date.now()}`,
        nama: nama.trim(),
        username: username.trim(),
        sekolah_id: boundSekolahId,
        role: safeRole,
        pin: pin.trim() || '123456',
        password: pin.trim() || '123456',
        nip: nip.trim() || undefined,
        jabatan: jabatan.trim() || undefined,
        unitKerja: unitKerja.trim() || undefined,
        email: email.trim() || undefined,
        avatarColor: randomColor
      };
      onAddUser(newUser);
    }

    resetForm();
  };

  // Handling switch school context khusus Super Admin Dinas
  const handleSwitchSchoolContext = (targetSekolahId: string) => {
    if (onSelectSekolah && isDinasAdmin) {
      onSelectSekolah(targetSekolahId);
      setFilterSekolah(targetSekolahId);
    }
  };

  // Standarisasi Warna & Hierarki Visual Role Badge (Requirement 2)
  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
            <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
            Super Admin (Dinas)
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
            <ShieldCheck className="w-3 h-3 text-purple-600 shrink-0" />
            Admin Sekolah
          </span>
        );
      case 'operator':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
            <Shield className="w-3 h-3 text-emerald-600 shrink-0" />
            Operator
          </span>
        );
      case 'pengguna':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
            <UserCheck className="w-3 h-3 text-blue-600 shrink-0" />
            Pengguna (Staf/Guru)
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="no-print fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden ring-1 ring-slate-900/10 flex flex-col max-h-[92vh]">
        
        {/* 1. Modal Header & Sesi Aktif Badge (Requirement 1 & 3) */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-6 py-5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold tracking-tight">Manajemen Pengguna &amp; Hak Akses</h3>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  Multi-Tenant RBAC
                </span>
                {/* Sesi Aktif Dynamic Badge: Cabang Dinas vs SMAN 1 CIHAURBEUTI */}
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs">
                  <Building2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>Sesi Aktif: {isDinasAdmin ? 'Cabang Dinas Pendidikan Wilayah XIII' : activeSchoolName}</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Kelola akun pengguna terikat satuan pendidikan resmi, pembagian peran, dan wewenang otorisasi sistem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-xl transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 text-xs text-slate-700 overflow-y-auto flex-1">
          {/* 2. Compact Role Legend (Replaces Large Cards) - Requirement 2 & 3 */}
          <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Hierarki Peran:</span>
            {isDinasAdmin && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-rose-700 bg-rose-50 border border-rose-200 text-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                Super Admin (Dinas)
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-purple-700 bg-purple-50 border border-purple-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
              Admin Sekolah
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              Operator (Operasional)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-blue-700 bg-blue-50 border border-blue-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
              Pengguna (Staf &amp; Guru)
            </span>
          </div>

          {/* Form Add / Edit User */}
          {isFormOpen ? (
            <form onSubmit={handleSave} className="bg-slate-50 border border-blue-200/80 rounded-2xl p-5 space-y-4 animate-in fade-in duration-150 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  {editingId ? 'Ubah Data Pengguna Terikat Sekolah' : 'Pendaftaran Pengguna Baru Terikat Satuan Pendidikan'}
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1 bg-white border border-slate-200 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
              </div>

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Dropdown Satuan Pendidikan (Terkunci jika akun sekolah) */}
                <div className="form-group md:col-span-2 bg-white p-3.5 rounded-xl border border-blue-200">
                  <label htmlFor="user_sekolah_id" className="block text-xs font-bold text-slate-900 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>Satuan Pendidikan / Instansi</span>
                      <span className="text-red-500">*</span>
                    </span>
                    {!isDinasAdmin && (
                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                        Terkunci Otomatis (Tenant Sekolah Anda)
                      </span>
                    )}
                  </label>
                  {isDinasAdmin ? (
                    <select
                      id="user_sekolah_id"
                      value={sekolahId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSekolahId(val);
                        if (val === 'dinas_prov' && role !== 'super_admin') {
                          setRole('super_admin');
                        } else if (val !== 'dinas_prov' && role === 'super_admin') {
                          setRole('admin');
                        }
                      }}
                      className="form-select w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      required
                    >
                      <option value="">-- Pilih Satuan Pendidikan --</option>
                      <option value="dinas_prov" className="font-bold text-rose-700">
                        🏢 Dinas Pendidikan (Super Admin / Lintas Sekolah)
                      </option>
                      {sekolahList.map((sekolah) => (
                        <option key={sekolah.id} value={sekolah.id}>
                          🏫 {sekolah.nama_sekolah || sekolah.nama} ({sekolah.npsn})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{activeSchoolName}</span>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 mt-1">
                    Setiap akun pengguna wajib terikat pada satuan pendidikan resmi untuk menjaga integritas multi-tenant SIMBA.
                  </p>
                </div>

                {/* 2. Nama Lengkap & Gelar */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap &amp; Gelar <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Dra. Hj. Siti Aminah, M.Pd."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    required
                  />
                </div>

                {/* 3. Username / Akun Login */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Username / Akun Login <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                    placeholder="Contoh: rina.operator / budi.guru"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    required
                  />
                </div>

                {/* 4. Password / PIN */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Password / PIN Masuk &amp; Keamanan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Contoh: 123456"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold"
                    required
                  />
                </div>

                {/* 5. Role / Hak Akses (Opsi Super Admin disembunyikan untuk non-dinas) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Peran &amp; Hak Akses (Role) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {isDinasAdmin && sekolahId === 'dinas_prov' ? (
                      <>
                        <option value="super_admin">Super Admin (Dinas Pendidikan - Hak Akses Penuh)</option>
                        <option value="admin">Admin Dinas</option>
                      </>
                    ) : (
                      <>
                        <option value="admin">Admin Sekolah - Pengelola Aset &amp; Master Data</option>
                        <option value="operator">Operator - Input Penyaluran, Penerimaan &amp; Cetak</option>
                        <option value="pengguna">Pengguna (Staf/Guru) - Usulan Permintaan Barang NPB</option>
                      </>
                    )}
                  </select>
                </div>

                {/* 6. NIP */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NIP / NUPTK (Opsional)
                  </label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Contoh: 19890820 201402 2 003"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* 7. Jabatan */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jabatan Struktural / Fungsional
                  </label>
                  <input
                    type="text"
                    value={jabatan}
                    onChange={(e) => setJabatan(e.target.value)}
                    placeholder="Contoh: Pengurus Barang / Guru Multimedia / PJ Lab"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* 8. Unit Kerja */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Unit Kerja / Bagian
                  </label>
                  <input
                    type="text"
                    value={unitKerja}
                    onChange={(e) => setUnitKerja(e.target.value)}
                    placeholder="Contoh: Subbag TU / Lab IPA / Guru RPL"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* 9. Email */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alamat Email (Opsional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Contoh: user@sekolah.sch.id"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl font-medium text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingId ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                </button>
              </div>
            </form>
          ) : (
            /* 3. Filter Section Bar (Requirement 1 & 3) */
            <div className="filter-bar flex flex-col md:flex-row items-stretch md:items-end justify-between gap-3 bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
              {/* Dropdown Filter Satuan Pendidikan */}
              <div className="w-full md:w-1/2 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-blue-600" />
                    Filter Satuan Pendidikan:
                  </label>
                  {!isDinasAdmin && (
                    <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                      Terkunci Otomatis
                    </span>
                  )}
                </div>
                <select
                  disabled={!isDinasAdmin}
                  value={isDinasAdmin ? filterSekolah : schoolUserSekolahId}
                  onChange={(e) => setFilterSekolah(e.target.value)}
                  className={`form-select w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all ${
                    !isDinasAdmin ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200 opacity-90' : ''
                  }`}
                >
                  {isDinasAdmin && (
                    <>
                      <option value="all">🌐 Semua Satuan Pendidikan (Konsolidasi Wilayah)</option>
                      <option value="dinas_prov" className="font-bold text-rose-700">
                        🏢 Dinas Pendidikan (Super Admin)
                      </option>
                    </>
                  )}
                  {sekolahList
                    .filter((sch) => isDinasAdmin || sch.id === schoolUserSekolahId)
                    .map((sch) => (
                      <option key={sch.id} value={sch.id}>
                        🏫 {sch.nama_sekolah || sch.nama} ({sch.npsn})
                      </option>
                    ))}
                </select>
              </div>

              {/* Quick Search Input */}
              <div className="flex-1 relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1 sm:hidden">Pencarian:</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama, username, NIP..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Button Tambah Pengguna Baru */}
              <button
                type="button"
                onClick={handleStartAdd}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Pengguna Baru</span>
              </button>
            </div>
          )}

          {/* User Table Header Summary */}
          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
            <span className="font-semibold">
              Menampilkan <strong className="text-slate-900 font-mono">{filteredUsers.length}</strong> dari{' '}
              <span className="font-mono">{userList.length}</span> akun pengguna terdaftar
            </span>
            {/* Tombol Reset hanya muncul untuk Super Admin Dinas */}
            {isDinasAdmin && filterSekolah !== 'all' && (
              <button
                type="button"
                onClick={() => setFilterSekolah('all')}
                className="text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer text-[11px]"
              >
                Reset ke Semua Sekolah
              </button>
            )}
          </div>

          {/* User Table with School Entity Column */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead className="bg-slate-100/80 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-12 text-center">No</th>
                    <th className="p-3 min-w-[180px]">Pengguna</th>
                    <th className="p-3 min-w-[200px]">Satuan Pendidikan / Instansi</th>
                    <th className="p-3 w-32">Username</th>
                    <th className="p-3 w-36">Peran (Role)</th>
                    <th className="p-3 min-w-[160px]">Jabatan &amp; Unit</th>
                    <th className="p-3 text-center w-36">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="max-w-sm mx-auto space-y-1.5">
                          <Users className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="font-bold text-slate-700 text-xs">
                            Tidak ada akun pengguna yang sesuai dengan filter sekolah atau pencarian.
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Silakan tambahkan pengguna baru untuk satuan pendidikan ini.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, idx) => {
                      const isCurrent = u.id === currentUserId;
                      const boundSchool = u.sekolah_id ? schoolMap.get(u.sekolah_id) : null;
                      const isDinasUser =
                        !u.sekolah_id ||
                        u.role === 'super_admin' ||
                        (u.role as string) === 'SUPER_ADMIN' ||
                        u.sekolah_id === 'dinas_prov';

                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-slate-50/80 transition-colors ${isCurrent ? 'bg-blue-50/40' : ''}`}
                        >
                          <td className="p-3 text-center font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                          
                          {/* 1. Pengguna */}
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shadow-xs shrink-0 ${
                                  u.avatarColor || 'bg-slate-600'
                                }`}
                              >
                                {u.nama.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{u.nama}</span>
                                  {isCurrent && (
                                    <span className="text-[9px] bg-blue-100 text-blue-800 border border-blue-200 px-1.5 py-0.2 rounded font-bold">
                                      Akun Anda
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {u.nip ? `NIP. ${u.nip}` : 'Non-NIP'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Satuan Pendidikan / Instansi */}
                          <td className="p-3">
                            {isDinasUser ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-bold text-[11px]">
                                <Building2 className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                                <span>Dinas Pendidikan (Lintas Satker)</span>
                              </div>
                            ) : boundSchool ? (
                              <div>
                                <div className="font-semibold text-slate-900 flex items-center gap-1">
                                  <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>{boundSchool.nama_sekolah || boundSchool.nama}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  NPSN: {boundSchool.npsn} • {boundSchool.kabupaten_kota || boundSchool.kota || 'Jawa Barat'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] font-mono">
                                {u.sekolah_id || 'Belum Terikat Sekolah'}
                              </span>
                            )}
                          </td>

                          {/* 3. Username */}
                          <td className="p-3 font-mono text-slate-700 font-medium">
                            @{u.username}
                          </td>

                          {/* 4. Peran (Role) */}
                          <td className="p-3">
                            {getRoleBadge(u.role)}
                          </td>

                          {/* 5. Jabatan & Unit */}
                          <td className="p-3">
                            <div className="text-slate-900 font-medium">{u.jabatan || '-'}</div>
                            <div className="text-[10px] text-slate-500">{u.unitKerja || '-'}</div>
                          </td>

                          {/* 6. Aksi */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {!isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSwitchUser(u.id);
                                    onClose();
                                  }}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200 transition-colors cursor-pointer"
                                  title={`Masuk dan beralih ke sesi akun ${u.nama}`}
                                >
                                  Ganti Akun
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleStartEdit(u)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Ubah data pengguna"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {!isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Apakah Anda yakin ingin menghapus akun pengguna "${u.nama}"?`)) {
                                      onDeleteUser(u.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus pengguna"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            Seluruh data akun pengguna terisolasi per <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono text-[10px]">sekolah_id</code> sesuai arsitektur multi-tenant SIMBA.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
