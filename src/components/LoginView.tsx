import { 
  AlertCircle, 
  ArrowRight, 
  Building2, 
  Check, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  KeyRound, 
  Lock, 
  LogIn, 
  Shield, 
  ShieldCheck, 
  Sparkles, 
  User, 
  UserCheck, 
  Users 
} from 'lucide-react';
import React, { useState } from 'react';
import { AppUser, UserRole } from '../types';
import { logAuditEvent } from '../utils/auditLogger';

interface Props {
  userList: AppUser[];
  onLoginSuccess: (user: AppUser) => void;
  schoolName: string;
  isModal?: boolean;
  onCloseModal?: () => void;
}

export const LoginView: React.FC<Props> = ({
  userList,
  onLoginSuccess,
  schoolName,
  isModal = false,
  onCloseModal
}) => {
  // Select active demo role or direct credential entry
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    const adminUser = userList.find(u => u.role === 'admin');
    return adminUser ? adminUser.id : (userList[0]?.id || '');
  });

  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginMethod, setLoginMethod] = useState<'quick' | 'credentials'>('quick');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Available users filtered by selected role
  const usersForRole = userList.filter(u => u.role === selectedRole);
  const activeSelectedUser = userList.find(u => u.id === selectedUserId) || usersForRole[0] || userList[0];

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    const firstUserOfRole = userList.find(u => u.role === role);
    if (firstUserOfRole) {
      setSelectedUserId(firstUserOfRole.id);
      setUsernameInput(firstUserOfRole.username);
      setPasswordInput(firstUserOfRole.pin || firstUserOfRole.password || '123456');
    }
    setErrorMsg('');
  };

  const handleQuickLogin = (userToLogin: AppUser) => {
    setIsLoading(true);
    setErrorMsg('');
    setTimeout(() => {
      logAuditEvent({
        userId: userToLogin.id,
        username: userToLogin.username,
        userName: userToLogin.nama,
        userRole: userToLogin.role,
        action: 'LOGIN',
        title: 'Login Berhasil',
        details: `Pengguna masuk via mode Quick-Login sebagai [${userToLogin.role.toUpperCase()}]`,
        status: 'SUCCESS'
      });
      setIsLoading(false);
      onLoginSuccess(userToLogin);
    }, 300);
  };

  const handleCredentialsLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const targetUsername = usernameInput.trim().toLowerCase();
    if (!targetUsername) {
      setErrorMsg('Silakan masukkan Username.');
      return;
    }

    const matchedUser = userList.find(u => u.username.toLowerCase() === targetUsername);

    if (!matchedUser) {
      logAuditEvent({
        userId: 'unknown',
        username: targetUsername,
        userName: 'Tidak Dikenal',
        userRole: 'pengguna',
        action: 'LOGIN',
        title: 'Gagal Login',
        details: `Percobaan login gagal: Username "${targetUsername}" tidak terdaftar dalam sistem`,
        status: 'FAILED'
      });
      setErrorMsg(`Username "${targetUsername}" tidak ditemukan.`);
      return;
    }

    // Verify PIN or password (default fallback '123456')
    const validPin = matchedUser.pin || '123456';
    const validPassword = matchedUser.password || '123456';
    const entered = passwordInput.trim();

    if (entered !== validPin && entered !== validPassword && entered !== '123456') {
      logAuditEvent({
        userId: matchedUser.id,
        username: matchedUser.username,
        userName: matchedUser.nama,
        userRole: matchedUser.role,
        action: 'LOGIN',
        title: 'Gagal Login (Password Salah)',
        details: `Percobaan login gagal untuk user @${matchedUser.username}: Password/PIN salah`,
        status: 'FAILED'
      });
      setErrorMsg('Password atau PIN yang Anda masukkan salah. (PIN Default: 123456)');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      logAuditEvent({
        userId: matchedUser.id,
        username: matchedUser.username,
        userName: matchedUser.nama,
        userRole: matchedUser.role,
        action: 'LOGIN',
        title: 'Login Berhasil',
        details: `Pengguna berhasil login terverifikasi kata sandi/PIN sebagai [${matchedUser.role.toUpperCase()}]`,
        status: 'SUCCESS'
      });
      setIsLoading(false);
      onLoginSuccess(matchedUser);
    }, 300);
  };

  const containerClass = isModal
    ? 'relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden'
    : 'min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-4 sm:p-6';

  return (
    <div className={isModal ? 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto' : containerClass}>
      <div className={isModal ? containerClass : 'w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 ring-1 ring-black/5'}>
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-800/40 relative">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-lg shadow-blue-500/20 ring-2 ring-white/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">SIMBA</h1>
                <span className="bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  RBAC &amp; Keamanan
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-100 font-medium mt-0.5">
                Sistem Inventarisasi &amp; Manajemen Barang Milik Daerah (BOS/APBD)
              </p>
              <p className="text-[11px] text-blue-200/80 font-normal">
                {schoolName || 'Satuan Pendidikan / Lembaga Sekolah'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <span className="bg-white/10 text-white/90 text-xs px-3 py-1.5 rounded-xl border border-white/15 backdrop-blur-xs font-mono">
              Tahun Anggaran 2026
            </span>
            {isModal && onCloseModal && (
              <button
                type="button"
                onClick={onCloseModal}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
              >
                Tutup
              </button>
            )}
          </div>
        </div>

        {/* Content Body: Role Selector + Login Form */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: 3 Role Cards Showcase & Selection */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Pilih Peran &amp; Hak Akses Pengguna (RBAC)
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Sistem menerapkan pembatasan hak akses berbasis peran resmi dinas pendidikan. Klik peran untuk memilih akun demo:
              </p>
            </div>

            {/* Role 1: Admin */}
            <div
              onClick={() => handleRoleChange('admin')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                selectedRole === 'admin'
                  ? 'border-purple-600 bg-purple-50/70 shadow-md ring-2 ring-purple-500/20'
                  : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">1. Administrator Sistem</h3>
                      <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                        Akses Penuh
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Wewenang tertinggi: Manajemen Master Barang, Data Pejabat Penandatangan, Penomoran Surat, Kop Surat, Manajemen Pengguna, <strong>Log Audit Keamanan</strong>, dan wewenang khusus <strong>Kosongkan Transaksi</strong> dengan proteksi PIN.
                    </p>
                    <div className="mt-2 text-[11px] text-purple-900 font-medium flex items-center gap-2">
                      <span>Akun Default: <strong>admin</strong></span>
                      <span>•</span>
                      <span>PIN: <strong>123456</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedRole === 'admin' ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300'
                  }`}>
                    {selectedRole === 'admin' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Role 2: Operator */}
            <div
              onClick={() => handleRoleChange('operator')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                selectedRole === 'operator'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-md ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">2. Operator Inventaris / Pengurus Barang</h3>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                        Transaksi &amp; Cetak
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Operasional harian: Pencatatan faktur barang masuk (dana BOS/APBD), proses penyaluran barang, cetak seluruh 12 dokumen standar dinas, mutasi 12 bulan BOS &amp; rekap kodering, serta sinkronisasi Google Sheets.
                    </p>
                    <div className="mt-2 text-[11px] text-emerald-900 font-medium flex items-center gap-2">
                      <span>Akun Default: <strong>operator</strong></span>
                      <span>•</span>
                      <span>PIN: <strong>123456</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedRole === 'operator' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                  }`}>
                    {selectedRole === 'operator' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Role 3: Pengguna / Guru */}
            <div
              onClick={() => handleRoleChange('pengguna')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                selectedRole === 'pengguna'
                  ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">3. Pengguna / Guru / Kepala Lab</h3>
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                        Hanya Menu NPB
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Antarmuka ramah &amp; ringkas khusus staf/guru pengajar: Pengajuan formulir Nota Permintaan Barang (NPB) untuk kegiatan KBM/kantor, pantau status persetujuan, dan cek sisa stok riil barang di gudang.
                    </p>
                    <div className="mt-2 text-[11px] text-blue-900 font-medium flex items-center gap-2">
                      <span>Akun Default: <strong>budi.guru</strong> / <strong>siti.guru</strong></span>
                      <span>•</span>
                      <span>PIN: <strong>123456</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedRole === 'pengguna' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                  }`}>
                    {selectedRole === 'pengguna' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Active Profile Card & Authentication Actions */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <div>
              {/* Switch Tab: 1-Click Fast Login vs Password/PIN verification */}
              <div className="flex items-center bg-slate-200/80 p-1 rounded-xl mb-5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setLoginMethod('quick')}
                  className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                    loginMethod === 'quick'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Masuk Cepat (1-Klik)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('credentials');
                    if (activeSelectedUser) {
                      setUsernameInput(activeSelectedUser.username);
                      setPasswordInput(activeSelectedUser.pin || activeSelectedUser.password || '123456');
                    }
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                    loginMethod === 'credentials'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Verifikasi Sandi / PIN
                </button>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* METHOD 1: QUICK LOGIN (Instant Card) */}
              {loginMethod === 'quick' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Pilih Akun yang Tersedia ({usersForRole.length} Pengguna):
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {usersForRole.map(u => (
                        <div
                          key={u.id}
                          onClick={() => setSelectedUserId(u.id)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            selectedUserId === u.id
                              ? 'bg-white border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                              : 'bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm ${u.avatarColor || 'bg-blue-600'}`}>
                              {u.nama.charAt(0)}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900">{u.nama}</div>
                              <div className="text-[10px] text-slate-500">
                                @{u.username} • {u.jabatan || u.unitKerja || '-'}
                              </div>
                            </div>
                          </div>
                          {selectedUserId === u.id && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Selected User Card Preview */}
                  {activeSelectedUser && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Profil Masuk Aktif
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${activeSelectedUser.avatarColor || 'bg-blue-600'}`}>
                          {activeSelectedUser.nama.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{activeSelectedUser.nama}</div>
                          <div className="text-[11px] text-slate-600">{activeSelectedUser.jabatan}</div>
                          <div className="text-[10px] text-slate-400 font-mono">NIP. {activeSelectedUser.nip || '-'}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isLoading || !activeSelectedUser}
                    onClick={() => activeSelectedUser && handleQuickLogin(activeSelectedUser)}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isLoading ? 'Memproses Masuk...' : `Masuk Sebagai ${activeSelectedUser?.role?.toUpperCase() || ''}`}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* METHOD 2: CREDENTIALS (USERNAME + PIN/PASSWORD) */}
              {loginMethod === 'credentials' && (
                <form onSubmit={handleCredentialsLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Username:
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="Masukkan username (contoh: admin, operator, budi.guru)"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Password / PIN Keamanan:
                      </label>
                      <span className="text-[10px] text-slate-400">Default: 123456</span>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Ketik password atau 6 digit PIN"
                        className="w-full pl-9 pr-10 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-[11px] text-blue-900 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-600" />
                      Kredensial Bawaan Sistem:
                    </p>
                    <ul className="space-y-0.5 text-slate-600 font-mono text-[10px]">
                      <li>• Admin: <strong className="text-slate-800">admin</strong> / PIN: <strong className="text-slate-800">123456</strong></li>
                      <li>• Operator: <strong className="text-slate-800">operator</strong> / PIN: <strong className="text-slate-800">123456</strong></li>
                      <li>• Pengguna: <strong className="text-slate-800">budi.guru</strong> / PIN: <strong className="text-slate-800">123456</strong></li>
                    </ul>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isLoading ? 'Memverifikasi Kredensial...' : 'Masuk dengan Kredensial'}</span>
                  </button>
                </form>
              )}
            </div>

            {/* Footer security note */}
            <div className="mt-6 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500">
              Sistem mencatat identitas &amp; waktu setiap sesi masuk dalam <strong>Log Audit Keamanan</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
