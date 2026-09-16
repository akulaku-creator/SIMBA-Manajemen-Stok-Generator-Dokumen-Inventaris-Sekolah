import { 
  Check, 
  Edit2, 
  KeyRound, 
  Plus, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  UserCheck, 
  UserPlus, 
  Users, 
  X 
} from 'lucide-react';
import React, { useState } from 'react';
import { AppUser, UserRole } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userList: AppUser[];
  currentUserId: string;
  onAddUser: (user: AppUser) => void;
  onUpdateUser: (user: AppUser) => void;
  onDeleteUser: (userId: string) => void;
  onSwitchUser: (userId: string) => void;
}

export const UserManagementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  userList,
  currentUserId,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onSwitchUser
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('pengguna');
  const [pin, setPin] = useState('123456');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [unitKerja, setUnitKerja] = useState('');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setNama('');
    setUsername('');
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
    if (!nama.trim() || !username.trim()) {
      setErrorMsg('Nama lengkap dan username wajib diisi.');
      return;
    }

    // Check duplicate username if adding new
    const duplicate = userList.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.id !== editingId);
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
          role,
          pin: pin.trim() || '123456',
          password: pin.trim() || '123456',
          nip: nip.trim() || undefined,
          jabatan: jabatan.trim() || undefined,
          unitKerja: unitKerja.trim() || undefined,
          email: email.trim() || undefined
        });
      }
    } else {
      const avatarColors = ['bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-indigo-600'];
      const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
      const newUser: AppUser = {
        id: `user-${Date.now()}`,
        nama: nama.trim(),
        username: username.trim(),
        role,
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
          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
            <ShieldCheck className="w-3 h-3 text-purple-600" />
            Admin
          </span>
        );
      case 'operator':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
            <Shield className="w-3 h-3 text-emerald-600" />
            Operator
          </span>
        );
      case 'pengguna':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
            <UserCheck className="w-3 h-3 text-blue-600" />
            Pengguna (Staf/Guru)
          </span>
        );
    }
  };

  return (
    <div className="no-print fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden ring-1 ring-slate-900/10">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Manajemen Pengguna &amp; Hak Akses</h3>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  Role-Based Access
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Kelola akun pengguna, penetapan peran (Admin, Operator, Pengguna), dan hak otoritas sistem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-xs text-slate-700 max-h-[82vh] overflow-y-auto">
          {/* Permission Matrix Guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl">
              <div className="flex items-center gap-1.5 text-purple-900 font-bold mb-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Admin (Akses Penuh)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Master Data, Input Mutasi, Setting Penomoran, Laporan/Dokumen, Manajemen User, dan <strong>Kosongkan Transaksi</strong>.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold mb-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Operator (Operasional)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Input Transaksi Penyaluran &amp; Penerimaan BOS, Stok Opname fisik, serta Cetak Seluruh Laporan Dokumen Resmi.
              </p>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
              <div className="flex items-center gap-1.5 text-blue-900 font-bold mb-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Pengguna (Staf &amp; Guru)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Tampilan antarmuka ringkas khusus: <strong>Menu Permintaan Barang (NPB)</strong> untuk mengajukan usulan kebutuhan &amp; cetak NPB.
              </p>
            </div>
          </div>

          {/* Form Add / Edit User */}
          {isFormOpen ? (
            <form onSubmit={handleSave} className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  {editingId ? 'Ubah Data Pengguna' : 'Tambah Pengguna Baru'}
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Batal
                </button>
              </div>

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap &amp; Gelar <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Dra. Hj. Siti Aminah, M.Pd."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Username / Akun Login <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: rina.operator / budi.guru"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Password / PIN Masuk &amp; Keamanan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Contoh: 123456"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Peran &amp; Hak Akses (Role) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="admin">Admin - Akses Penuh &amp; Reset Data</option>
                    <option value="operator">Operator - Input Transaksi &amp; Cetak Dokumen</option>
                    <option value="pengguna">Pengguna (Staf/Guru) - Ringkas Usulan NPB</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NIP / NUPTK (Opsional)
                  </label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Contoh: 19890820 201402 2 003"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jabatan Struktural / Fungsional
                  </label>
                  <input
                    type="text"
                    value={jabatan}
                    onChange={(e) => setJabatan(e.target.value)}
                    placeholder="Contoh: Pengurus Barang / Guru Multimedia / PJ Lab"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Unit Kerja / Bagian
                  </label>
                  <input
                    type="text"
                    value={unitKerja}
                    onChange={(e) => setUnitKerja(e.target.value)}
                    placeholder="Contoh: Subbag TU / Lab IPA / Guru RPL"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {editingId ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center">
              <div className="font-semibold text-slate-800 text-sm">
                Daftar Akun Pengguna Terdaftar ({userList.length})
              </div>
              <button
                type="button"
                onClick={handleStartAdd}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Pengguna Baru
              </button>
            </div>
          )}

          {/* User Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Pengguna</th>
                  <th className="p-3">Username</th>
                  <th className="p-3">Peran (Role)</th>
                  <th className="p-3">Jabatan &amp; Unit</th>
                  <th className="p-3 text-center">Status / Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userList.map((u) => {
                  const isCurrent = u.id === currentUserId;
                  return (
                    <tr key={u.id} className={`hover:bg-slate-50/80 transition-colors ${isCurrent ? 'bg-blue-50/40' : ''}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${u.avatarColor || 'bg-slate-600'}`}>
                            {u.nama.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {u.nama}
                              {isCurrent && (
                                <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-medium">
                                  Akun Anda
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{u.nip ? `NIP. ${u.nip}` : 'Non-NIP'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-700 font-medium">
                        @{u.username}
                      </td>
                      <td className="p-3">
                        {getRoleBadge(u.role)}
                      </td>
                      <td className="p-3">
                        <div className="text-slate-900 font-medium">{u.jabatan || '-'}</div>
                        <div className="text-[10px] text-slate-500">{u.unitKerja || '-'}</div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => {
                                onSwitchUser(u.id);
                                onClose();
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium border border-slate-200 transition-colors"
                              title={`Beralih dan masuk sebagai ${u.nama}`}
                            >
                              Ganti ke Akun Ini
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(u)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Ubah data pengguna"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Hapus pengguna "${u.nama}"?`)) {
                                  onDeleteUser(u.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Hapus pengguna"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Perubahan data akun tersimpan permanen pada penyimpanan lokal.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
