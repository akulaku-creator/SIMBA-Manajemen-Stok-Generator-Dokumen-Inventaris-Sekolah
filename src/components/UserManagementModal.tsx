import {
  AlertCircle,
  Building2,
  Edit2,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { AppUser, UserRole } from '../types';
import { APP_CONFIG } from '../config/appConfig';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userList: AppUser[];
  currentUserId: string;
  onAddUser: (user: AppUser) => void;
  onUpdateUser: (user: AppUser) => void;
  onDeleteUser: (userId: string) => void;
  onSwitchUser: (userId: string) => void;
  schoolName?: string;
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
  schoolName,
  currentUser
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form State
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('operator');
  const [pin, setPin] = useState('123456');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [unitKerja, setUnitKerja] = useState('');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const activeSchoolName = schoolName || APP_CONFIG.defaultSchool.namaSekolah;

  const filteredUsers = useMemo(() => {
    return userList.filter(u => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = u.nama.toLowerCase().includes(q);
      const matchUser = u.username.toLowerCase().includes(q);
      const matchRole = u.role.toLowerCase().includes(q);
      const matchNip = u.nip ? u.nip.toLowerCase().includes(q) : false;
      const matchJabatan = u.jabatan ? u.jabatan.toLowerCase().includes(q) : false;
      return matchName || matchUser || matchRole || matchNip || matchJabatan;
    });
  }, [userList, searchQuery]);

  const resetForm = () => {
    setEditingId(null);
    setNama('');
    setUsername('');
    setRole('operator');
    setPin('123456');
    setNip('');
    setJabatan('');
    setUnitKerja('');
    setEmail('');
    setErrorMsg('');
    setIsFormOpen(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleStartEdit = (u: AppUser) => {
    setEditingId(u.id);
    setNama(u.nama);
    setUsername(u.username);
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

    // Check duplicate username if adding new
    const duplicate = userList.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && u.id !== editingId
    );
    if (duplicate) {
      setErrorMsg(`Username "${username}" sudah digunakan pengguna lain.`);
      return;
    }

    if (editingId) {
      const existing = userList.find(u => u.id === editingId);
      if (existing) {
        onUpdateUser({
          ...existing,
          nama: nama.trim(),
          username: username.trim(),
          role: role,
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
        'bg-indigo-600',
        'bg-purple-600',
        'bg-emerald-600',
        'bg-amber-600',
        'bg-blue-600'
      ];
      const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
      const newUser: AppUser = {
        id: `user-${Date.now()}`,
        nama: nama.trim(),
        username: username.trim(),
        role: role,
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

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
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
            Operator Persediaan
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
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden ring-1 ring-slate-900/10 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-6 py-5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white tracking-tight">
                  Manajemen Pengguna Sekolah
                </h3>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  SINGLE-TENANT
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>{activeSchoolName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isFormOpen && (
              <button
                type="button"
                onClick={handleStartAdd}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Pengguna</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Form Create / Edit */}
          {isFormOpen && (
            <div className="bg-slate-50 border border-indigo-200/80 rounded-2xl p-4 sm:p-5 shadow-xs animate-in slide-in-from-top duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-sm text-slate-800">
                    {editingId ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Lengkap &amp; Gelar *</label>
                  <input
                    type="text"
                    required
                    value={nama}
                    onChange={e => setNama(e.target.value)}
                    placeholder="Contoh: Dedi Kurniawan, S.Pd."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIP (Opsional)</label>
                  <input
                    type="text"
                    value={nip}
                    onChange={e => setNip(e.target.value)}
                    placeholder="Contoh: 19850912 201001 1 011"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username Login *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().trim())}
                    placeholder="Contoh: operator"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kata Sandi / PIN *</label>
                  <input
                    type="text"
                    required
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="Contoh: 123456"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peran / Hak Akses (Role) *</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="admin">Admin Sekolah (Akses Penuh &amp; Pengaturan)</option>
                    <option value="operator">Operator Persediaan (Input Mutasi &amp; Cetak BAST)</option>
                    <option value="pengguna">Pengguna / Guru (Permohonan NPB Ruangan)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jabatan Kedinasan</label>
                  <input
                    type="text"
                    value={jabatan}
                    onChange={e => setJabatan(e.target.value)}
                    placeholder="Contoh: Pengurus Barang Pembantu"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Kerja / Ruangan</label>
                  <input
                    type="text"
                    value={unitKerja}
                    onChange={e => setUnitKerja(e.target.value)}
                    placeholder="Contoh: Subbag Tata Usaha"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email (Opsional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Contoh: user@sman1cihaurbeuti.sch.id"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer"
                  >
                    {editingId ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search bar and Add button for mobile */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari berdasarkan nama, username, NIP, atau jabatan..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {!isFormOpen && (
              <button
                type="button"
                onClick={handleStartAdd}
                className="sm:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah User</span>
              </button>
            )}
          </div>

          {/* User Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3 text-center w-12">No</th>
                  <th className="p-3">Nama Lengkap &amp; NIP</th>
                  <th className="p-3">Username &amp; Kontak</th>
                  <th className="p-3 text-center">Hak Akses</th>
                  <th className="p-3">Jabatan &amp; Unit</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                      Tidak ada pengguna yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => {
                    const isCurrent = u.id === currentUserId;
                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-slate-50/80 transition-colors ${isCurrent ? 'bg-indigo-50/40' : ''}`}
                      >
                        <td className="p-3 text-center font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span>{u.nama}</span>
                            {isCurrent && (
                              <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded">
                                Sesi Anda
                              </span>
                            )}
                          </div>
                          {u.nip && (
                            <div className="text-[11px] text-slate-400 font-mono">NIP: {u.nip}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-mono text-slate-700 font-semibold">@{u.username}</div>
                          {u.email && <div className="text-[10px] text-slate-400">{u.email}</div>}
                        </td>
                        <td className="p-3 text-center">
                          {getRoleBadge(u.role)}
                        </td>
                        <td className="p-3 text-slate-600">
                          <div className="font-medium text-slate-700">{u.jabatan || '-'}</div>
                          <div className="text-[10px] text-slate-400">{u.unitKerja || '-'}</div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => onSwitchUser(u.id)}
                                className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] transition-colors cursor-pointer"
                                title="Beralih ke pengguna ini"
                              >
                                Switch
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(u)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Edit pengguna"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Yakin ingin menghapus pengguna "${u.nama}"?`)) {
                                    onDeleteUser(u.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Total: <strong>{filteredUsers.length}</strong> pengguna terdaftar di {activeSchoolName}.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
