import { 
  AlertCircle, 
  Building2, 
  Check, 
  Clock, 
  Eye, 
  EyeOff, 
  KeyRound, 
  Lock, 
  LogIn, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  User, 
  X 
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AppUser } from '../types';
import { logAuditEvent } from '../utils/auditLogger';

interface Props {
  userList: AppUser[];
  onLoginSuccess: (user: AppUser, rememberMe?: boolean) => void;
  schoolName: string;
  isModal?: boolean;
  onCloseModal?: () => void;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 Menit (300.000 ms)
const STORAGE_FAILED_KEY = 'simba_login_failed_attempts';
const STORAGE_LOCKOUT_KEY = 'simba_login_lockout_until';

export const LoginView: React.FC<Props> = ({
  userList,
  onLoginSuccess,
  schoolName,
  isModal = false,
  onCloseModal
}) => {
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Rate Limiting & Lockout States
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_FAILED_KEY);
    return saved ? parseInt(saved, 10) || 0 : 0;
  });

  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => {
    const saved = localStorage.getItem(STORAGE_LOCKOUT_KEY);
    if (!saved) return null;
    const time = parseInt(saved, 10);
    return time > Date.now() ? time : null;
  });

  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (!lockoutUntil) return 0;
    return Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
  });

  // Countdown timer effect for lockout
  useEffect(() => {
    if (!lockoutUntil) {
      setSecondsRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        // Unlock automatically
        setLockoutUntil(null);
        setFailedAttempts(0);
        localStorage.removeItem(STORAGE_LOCKOUT_KEY);
        localStorage.removeItem(STORAGE_FAILED_KEY);
        setErrorMsg('');
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const isLockedOut = Boolean(lockoutUntil && secondsRemaining > 0);

  // Format MM:SS for countdown timer
  const formatTimer = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    setErrorMsg('');
    const rawInput = identifier.trim();
    const cleanPass = password.trim();

    if (!rawInput) {
      setErrorMsg('Silakan masukkan Username, NIP, atau Email Dinas.');
      return;
    }

    if (!cleanPass) {
      setErrorMsg('Silakan masukkan Kata Sandi atau PIN Pengamanan.');
      return;
    }

    // Identify user by Username, NIP, or Email
    const targetClean = rawInput.toLowerCase();
    const targetDigits = rawInput.replace(/\s+/g, '');

    const matchedUser = userList.find(u => {
      const matchUsername = u.username.toLowerCase() === targetClean;
      const matchEmail = u.email ? u.email.toLowerCase() === targetClean : false;
      const matchNip = u.nip ? u.nip.replace(/\s+/g, '') === targetDigits : false;
      return matchUsername || matchEmail || matchNip;
    });

    // Verification check: password or pin
    const isPasswordValid = matchedUser && (
      (matchedUser.password && cleanPass === matchedUser.password) ||
      (matchedUser.pin && cleanPass === matchedUser.pin)
    );

    if (!matchedUser || !isPasswordValid) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem(STORAGE_FAILED_KEY, String(newAttempts));

      if (newAttempts >= MAX_ATTEMPTS) {
        // Trigger 5-Minute Lockout
        const lockTime = Date.now() + LOCKOUT_DURATION_MS;
        setLockoutUntil(lockTime);
        setSecondsRemaining(Math.ceil(LOCKOUT_DURATION_MS / 1000));
        localStorage.setItem(STORAGE_LOCKOUT_KEY, String(lockTime));

        logAuditEvent({
          userId: matchedUser ? matchedUser.id : 'unknown',
          username: rawInput,
          userName: matchedUser ? matchedUser.nama : 'Tidak Dikenal',
          userRole: matchedUser ? matchedUser.role : 'pengguna',
          action: 'LOGIN_LOCKED',
          title: 'Akun Dikunci Sementara (Rate Limit)',
          details: `Percobaan login gagal mencapai batas ${MAX_ATTEMPTS} kali. Akses dari klien ini diblokir sementara selama 5 menit.`,
          status: 'FAILED'
        });

        setErrorMsg(`Percobaan login gagal mencapai batas maksimum (${MAX_ATTEMPTS}x). Akses dikunci sementara selama 5 menit demi keamanan sistem.`);
      } else {
        const remainingChances = MAX_ATTEMPTS - newAttempts;

        logAuditEvent({
          userId: matchedUser ? matchedUser.id : 'unknown',
          username: rawInput,
          userName: matchedUser ? matchedUser.nama : 'Tidak Dikenal',
          userRole: matchedUser ? matchedUser.role : 'pengguna',
          action: 'LOGIN',
          title: 'Gagal Login',
          details: `Percobaan login gagal (${newAttempts}/${MAX_ATTEMPTS}) untuk identitas "${rawInput}".`,
          status: 'FAILED'
        });

        setErrorMsg(`Kredensial tidak sesuai. Sisa kesempatan login: ${remainingChances} kali sebelum akun dikunci.`);
      }
      return;
    }

    // Login successful
    setIsLoading(true);

    setTimeout(() => {
      // Reset failed counter
      setFailedAttempts(0);
      setLockoutUntil(null);
      localStorage.removeItem(STORAGE_FAILED_KEY);
      localStorage.removeItem(STORAGE_LOCKOUT_KEY);

      logAuditEvent({
        userId: matchedUser.id,
        username: matchedUser.username,
        userName: matchedUser.nama,
        userRole: matchedUser.role,
        action: 'LOGIN',
        title: 'Login Berhasil',
        details: `Autentikasi resmi berhasil sebagai [${matchedUser.role.toUpperCase()}] oleh ${matchedUser.nama}.`,
        status: 'SUCCESS'
      });

      setIsLoading(false);
      onLoginSuccess(matchedUser, rememberMe);
    }, 400);
  };

  const containerWrapper = isModal
    ? 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto'
    : 'min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 sm:p-6 selection:bg-blue-600 selection:text-white';

  const cardWrapper = isModal
    ? 'relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto ring-1 ring-black/5'
    : 'w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto ring-1 ring-black/5';

  return (
    <div className={containerWrapper}>
      <div className={cardWrapper}>
        
        {/* Top Header Banner with Institutional Identity */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-7 border-b border-blue-900/40 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-lg shadow-blue-500/20 ring-2 ring-white/20 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">SIMBA</h1>
                  <span className="bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Sistem Penatausahaan Aset
                  </span>
                </div>
                <p className="text-xs text-blue-100 font-medium">
                  {schoolName || 'Satuan Pendidikan / Lembaga Pengguna Barang'}
                </p>
                <p className="text-[11px] text-slate-300">
                  Pemerintah Daerah • Pengelolaan Persediaan &amp; Aset Milik Daerah (BOS/APBD)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="bg-white/10 text-white/90 text-xs px-3 py-1 rounded-lg border border-white/15 backdrop-blur-xs font-mono">
                T.A. 2026
              </span>
              {isModal && onCloseModal && (
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-xl transition-colors cursor-pointer"
                  title="Tutup Jendela"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Body: Left Information Pillar & Right Authentication Form */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          
          {/* LEFT: Institutional & Security Assurance */}
          <div className="md:col-span-5 bg-slate-50 border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 border border-blue-200 px-2.5 py-1 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                  Keamanan Sistem Terjamin
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-2.5">
                  Portal Autentikasi Pegawai &amp; Operator
                </h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Aplikasi dilengkapi proteksi berlapis untuk menjaga integritas data barang milik daerah dan pembukuan dana BOS.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-2.5 text-xs text-slate-700">
                  <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Hak Akses Berbasis Peran (RBAC)</span>
                    <p className="text-[11px] text-slate-500">Pemisahan wewenang Administrator, Operator Inventaris, dan Staf Pengguna Barang.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-700">
                  <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Log Audit Digital Terpusat</span>
                    <p className="text-[11px] text-slate-500">Seluruh riwayat login, input barang, penyaluran, dan perubahan data tersimpan rapi.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-700">
                  <div className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Perlindungan Brute-Force</span>
                    <p className="text-[11px] text-slate-500">Penguncian otomatis sementara setelah 5 kali kesalahan kredensial.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>Sesi terenkripsi dan terlindungi otentikasi lokal browser.</span>
            </div>
          </div>

          {/* RIGHT: Official Standard Credentials Form */}
          <div className="md:col-span-7 flex flex-col justify-center">
            
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600" />
                Masuk ke Sistem SIMBA
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Silakan masukkan kredensial resmi akun Anda untuk memulai sesi kerja.
              </p>
            </div>

            {/* Lockout Notification Banner */}
            {isLockedOut && (
              <div className="mb-5 p-4 bg-red-50 border-2 border-red-300 rounded-2xl flex items-start gap-3 text-red-900 animate-pulse">
                <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-red-900 flex items-center gap-1.5">
                    <span>Akses Dikunci Sementara (Rate Limit Aktif)</span>
                  </div>
                  <p className="text-red-800 leading-relaxed">
                    Sistem mendeteksi 5 kali kegagalan masuk berturut-turut. Akses login dihentikan sementara selama 5 menit demi mencegah intrusi.
                  </p>
                  <div className="inline-flex items-center gap-1.5 font-mono font-bold text-sm bg-red-100 text-red-900 px-2.5 py-1 rounded-lg border border-red-300 mt-1">
                    <Clock className="w-4 h-4 text-red-700 animate-spin" />
                    <span>Tersisa: {formatTimer(secondsRemaining)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* General Error Banner */}
            {!isLockedOut && errorMsg && (
              <div className="mb-5 p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Official Standard Authentication Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              {/* Field 1: Username / NIP / Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Username, NIP, atau Email Kedinasan:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    disabled={isLockedOut || isLoading}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Masukkan username, NIP pegawai, atau email"
                    autoComplete="username"
                    required
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden transition-all disabled:opacity-50 disabled:bg-slate-100 cursor-text"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Bisa menggunakan Username akun, 18 digit NIP resmi, atau Email terdaftar.
                </p>
              </div>

              {/* Field 2: Password / PIN with Show/Hide Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Kata Sandi atau PIN Pengamanan:
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    disabled={isLockedOut || isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ketik kata sandi atau 6-digit PIN"
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden transition-all disabled:opacity-50 disabled:bg-slate-100 cursor-text"
                  />
                  <button
                    type="button"
                    disabled={isLockedOut || isLoading}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-40"
                    title={showPassword ? 'Sembunyikan Sandi' : 'Tampilkan Sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Field 3: Remember Me Checkbox */}
              <div className="pt-1 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    disabled={isLockedOut || isLoading}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                  />
                  <span>Ingat Saya di Perangkat Ini</span>
                </label>
              </div>

              {/* Field 4: Main Login Button */}
              <button
                type="submit"
                disabled={isLockedOut || isLoading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 hover:from-blue-800 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Kredensial &amp; Sesi...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk ke Sistem SIMBA</span>
                  </>
                )}
              </button>

            </form>

            <div className="mt-5 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500">
              Setiap aktivitas login dan penyaluran barang tercatat otomatis dalam <strong>Log Audit Keamanan</strong>.
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
