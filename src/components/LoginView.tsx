import {
  AlertCircle,
  Eye,
  EyeOff,
  HelpCircle,
  Info,
  Lock,
  LogIn,
  Mail,
  Phone,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  X
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppUser, KopSuratConfig } from '../types';
import { DEFAULT_USERS } from '../data/defaultUsers';
import { logAuditEvent } from '../utils/auditLogger';

export interface LoginViewProps {
  userList?: AppUser[];
  onLoginSuccess?: (user: AppUser, rememberMe?: boolean) => void;
  onLogin?: (user: AppUser, rememberMe?: boolean) => void;
  schoolName?: string;
  kopConfig?: KopSuratConfig;
  pejabatSettings?: { namaSekolah?: string; [key: string]: any };
  appConfig?: { schoolName?: string; [key: string]: any };
  fiscalYear?: number | string;
  isModal?: boolean;
  onCloseModal?: () => void;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 Menit (300 detik)
const STORAGE_FAILED_KEY = 'simba_login_failed_attempts';
const STORAGE_LOCKOUT_KEY = 'simba_login_lockout_until';

export const LoginView: React.FC<LoginViewProps> = ({
  userList,
  onLoginSuccess,
  onLogin,
  schoolName = 'SMAN 1 CIHAURBEUTI',
  kopConfig,
  pejabatSettings,
  appConfig,
  fiscalYear,
  isModal = false,
  onCloseModal
}) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [trustDevice, setTrustDevice] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);

  const usernameInputRef = useRef<HTMLInputElement>(null);

  // Dynamic active fiscal year
  const activeYear = useMemo(() => {
    if (fiscalYear) return fiscalYear;
    const stored = localStorage.getItem('simba_fiscal_year') || localStorage.getItem('simba_tahun_anggaran');
    if (stored) return stored;
    return new Date().getFullYear();
  }, [fiscalYear]);

  // Dynamic School Name Resolution (Anti-hardcode "SMK NEGERI 1 KOTA PENDIDIKAN", default "SMAN 1 CIHAURBEUTI")
  const effectiveSchoolName = useMemo(() => {
    if (pejabatSettings?.namaSekolah && pejabatSettings.namaSekolah !== 'SMK NEGERI 1 KOTA PENDIDIKAN') {
      return pejabatSettings.namaSekolah;
    }
    if (appConfig?.schoolName && appConfig.schoolName !== 'SMK NEGERI 1 KOTA PENDIDIKAN') {
      return appConfig.schoolName;
    }
    if (kopConfig?.namaSekolah && kopConfig.namaSekolah !== 'SMK NEGERI 1 KOTA PENDIDIKAN') {
      return kopConfig.namaSekolah;
    }
    if (schoolName && schoolName !== 'SMK NEGERI 1 KOTA PENDIDIKAN') {
      return schoolName;
    }
    const saved = localStorage.getItem('simba_active_school_name');
    if (saved && saved !== 'SMK NEGERI 1 KOTA PENDIDIKAN') {
      return saved;
    }
    return 'SMAN 1 CIHAURBEUTI';
  }, [pejabatSettings, appConfig, kopConfig, schoolName]);

  // Dynamic School / Dinas Logo
  const resolvedLogoUrl = useMemo(() => {
    if (kopConfig?.logoSekolahUrl) return kopConfig.logoSekolahUrl;
    if (kopConfig?.logoProvinsiUrl) return kopConfig.logoProvinsiUrl;
    if (kopConfig?.logoUrl) return kopConfig.logoUrl;
    return null;
  }, [kopConfig]);

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

  const [rateLimitTime, setRateLimitTime] = useState<number>(() => {
    if (!lockoutUntil) return 0;
    return Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
  });

  const isRateLimited = rateLimitTime > 0;

  // Countdown timer effect for lockout
  useEffect(() => {
    if (!lockoutUntil) {
      setRateLimitTime(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setRateLimitTime(remaining);

      if (remaining <= 0) {
        // Unlock automatically
        setLockoutUntil(null);
        setFailedAttempts(0);
        localStorage.removeItem(STORAGE_LOCKOUT_KEY);
        localStorage.removeItem(STORAGE_FAILED_KEY);
        setErrorMsg('');
        clearInterval(interval);

        // Fokus kursor akan kembali diaktifkan pada input username setelah hitung mundur mencapai 00:00
        setTimeout(() => {
          usernameInputRef.current?.focus();
        }, 100);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRateLimited || isLoading) return;

    setErrorMsg('');
    const rawInput = username.trim();
    const cleanPass = password.trim();

    if (!rawInput) {
      setErrorMsg('Silakan masukkan Username, NIP, atau Email.');
      return;
    }

    if (!cleanPass) {
      setErrorMsg('Silakan masukkan Kata Sandi atau PIN.');
      return;
    }

    const effectiveUsers = (userList && userList.length > 0) ? userList : DEFAULT_USERS;

    // Identify user by Username, NIP, or Email
    const targetClean = rawInput.toLowerCase();
    const targetDigits = rawInput.replace(/\s+/g, '');

    const matchedUser = effectiveUsers.find(u => {
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
        setRateLimitTime(Math.ceil(LOCKOUT_DURATION_MS / 1000));
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

        setErrorMsg(`Kredensial tidak sesuai. Sisa kesempatan: ${remainingChances} kali sebelum akun dikunci.`);
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
      if (onLogin) {
        onLogin(matchedUser, trustDevice);
      } else if (onLoginSuccess) {
        onLoginSuccess(matchedUser, trustDevice);
      }
    }, 450);
  };

  const containerWrapper = isModal
    ? 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto'
    : 'min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,58,138,0.35),rgba(255,255,255,0))] flex items-center justify-center p-3 sm:p-6 selection:bg-indigo-600 selection:text-white';

  const cardWrapper = isModal
    ? 'relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden my-auto ring-1 ring-black/5'
    : 'w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden my-auto ring-1 ring-black/5';

  return (
    <div className={containerWrapper}>
      <div className={cardWrapper}>

        {/* Modal Close Button if opened in modal mode */}
        {isModal && onCloseModal && (
          <button
            type="button"
            onClick={onCloseModal}
            className="absolute top-4 right-4 z-20 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-xl transition-all cursor-pointer shadow-xs"
            title="Tutup Jendela"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col md:flex-row min-h-[580px]">
          
          {/* ========================================================= */}
          {/* SIDEBAR KIRI: BRANDING & FITUR (DESKTOP)                  */}
          {/* ========================================================= */}
          <div className="w-full md:w-5/12 bg-slate-900 text-white p-8 flex flex-col justify-between border-r border-slate-800 relative overflow-hidden">
            {/* Subtle background ornamentation */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-md shadow-indigo-600/30 overflow-hidden">
                  {resolvedLogoUrl ? (
                    <img src={resolvedLogoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" />
                  ) : (
                    <span>S</span>
                  )}
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full font-semibold border border-emerald-500/30 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  TA {activeYear} • AKTIF
                </span>
              </div>

              <h1 className="text-2xl font-black tracking-wider mb-1 text-white">SIMBA</h1>
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4">
                Sistem Penatausahaan Aset
              </p>

              <div className="text-xs text-slate-400 space-y-1 mb-6 border-b border-slate-800 pb-4">
                <p className="font-semibold text-slate-300">Cabang Dinas Pendidikan Wilayah XIII</p>
                <p>Pemerintah Daerah • Pengelolaan Persediaan &amp; Aset Milik Daerah</p>
                <p className="text-indigo-300 font-bold mt-1">
                  Satuan Pendidikan: {effectiveSchoolName}
                </p>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50 mb-6 text-xs italic text-slate-300">
                &ldquo;Kelola aset dan persediaan secara aman, terstruktur, dan terintegrasi.&rdquo;
              </div>

              {/* Feature Highlights */}
              <div className="space-y-4 text-xs">
                <div className="flex items-start space-x-3">
                  <span className="text-indigo-400 font-bold text-sm">✓</span>
                  <div>
                    <p className="font-semibold text-slate-200">Akses Berbasis Role</p>
                    <p className="text-slate-400 text-[11px]">
                      Setiap pengguna hanya dapat mengakses fitur sesuai kewenangannya.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="text-indigo-400 font-bold text-sm">✓</span>
                  <div>
                    <p className="font-semibold text-slate-200">Audit Aktivitas</p>
                    <p className="text-slate-400 text-[11px]">
                      Aktivitas penting pengguna tercatat secara otomatis.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="text-indigo-400 font-bold text-sm">✓</span>
                  <div>
                    <p className="font-semibold text-slate-200">Perlindungan Akun</p>
                    <p className="text-slate-400 text-[11px]">
                      Sistem melindungi akun dari percobaan login yang tidak sah.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 mt-8 pt-4 border-t border-slate-800 flex items-center gap-2 relative z-10">
              <Shield className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <span>Portal Resmi Penatausahaan Persediaan &amp; Aset Daerah</span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* AREA KANAN: FORM LOGIN RESMI (CLEAN PRODUCTION UI)         */}
          {/* ========================================================= */}
          <div className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-between bg-white">
            <div>
              {/* Mobile Compact Branding Header */}
              <div className="md:hidden mb-6 pb-4 border-b border-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg text-white">
                      S
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-black tracking-tight text-slate-900">SIMBA</span>
                        <span className="text-[9px] font-bold text-indigo-700 uppercase bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          Aset
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {effectiveSchoolName}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                    TA {activeYear}
                  </span>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-slate-800 mb-1">Masuk ke SIMBA</h2>
              <p className="text-xs text-slate-500 mb-6">Gunakan akun resmi Anda untuk mengakses sistem.</p>

              {/* ALERT RATE LIMIT (JIKA AKTIF) */}
              {isRateLimited && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between text-rose-700 text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      Akses Diblokir Sementara (Rate Limit)
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-600 mb-2 leading-relaxed">
                    Sistem mendeteksi kesalahan beruntun. Akses login ditangguhkan sementara demi menjaga keamanan akun.
                  </p>
                  <span className="inline-block bg-rose-100 text-rose-800 font-mono text-xs px-2 py-1 rounded border border-rose-300 font-bold">
                    Sisa Waktu: {String(Math.floor(rateLimitTime / 60)).padStart(2, '0')}:{String(rateLimitTime % 60).padStart(2, '0')}
                  </span>
                </div>
              )}

              {/* General Error Banner */}
              {!isRateLimited && errorMsg && (
                <div className="mb-5 p-3.5 bg-amber-50/90 border border-amber-300/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{errorMsg}</span>
                </div>
              )}

              {/* FORM INPUT */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username / NIP / Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      ref={usernameInputRef}
                      type="text"
                      disabled={isRateLimited || isLoading}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan Username / NIP"
                      autoComplete="username"
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kata Sandi / PIN
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      disabled={isRateLimited || isLoading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      className="w-full pl-9 pr-10 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed outline-none transition"
                    />
                    <button
                      type="button"
                      disabled={isRateLimited || isLoading}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-40"
                      title={showPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2 text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      disabled={isRateLimited || isLoading}
                      checked={trustDevice}
                      onChange={(e) => setTrustDevice(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
                    />
                    <span>Percayai perangkat ini</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsHelpModalOpen(true)}
                    className="text-indigo-600 font-medium hover:underline cursor-pointer"
                  >
                    Lupa Password/PIN?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isRateLimited || isLoading || !username.trim() || !password.trim()}
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold py-2.5 rounded-lg shadow-md transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Memverifikasi akun...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Masuk ke Sistem SIMBA</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* FOOTER KANAN (CLEAN PRODUCTION, NO DEMO) */}
            <div className="text-center text-[11px] text-slate-400 mt-8 pt-4 border-t border-slate-100">
              Sistem Penatausahaan Persediaan &amp; Aset Milik Daerah (BOS/APBD)
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* MODAL BANTUAN LUPA PASSWORD / RESET KREDENSIAL           */}
      {/* ========================================================= */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Bantuan Pemulihan Kredensial</h3>
                  <p className="text-[11px] text-slate-500">Prosedur resmi reset Kata Sandi atau PIN</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-600">
              <div className="p-3 bg-indigo-50/80 border border-indigo-200/80 rounded-xl text-indigo-900 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-700 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Demi perlindungan data inventaris daerah dan pencegahan manipulasi akun, reset kredensial wajib melalui verifikasi resmi administrator.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1.5">Langkah Pemulihan Akun:</h4>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-relaxed">
                  <li>
                    <strong>Tingkat Satuan Pendidikan:</strong> Hubungi Petugas Pengurus Barang atau Admin SIMBA di sekolah Anda ({effectiveSchoolName}) untuk mereset kata sandi melalui menu <em>Manajemen Pengguna</em>.
                  </li>
                  <li>
                    <strong>Tingkat Cabang Dinas:</strong> Hubungi Tim Teknis Aset Cabang Dinas Pendidikan Wilayah XIII dengan melampirkan NIP dan Surat Tugas kedinasan resmi.
                  </li>
                </ol>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-[11px]">
                <div className="font-semibold text-slate-800">Kontak Helpdesk &amp; Layanan Teknis:</div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>cadisdik.wil13@jabarprov.go.id</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Layanan SIMBA Cabang Dinas Wilayah XIII</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-xl transition-all cursor-pointer"
              >
                Saya Mengerti &amp; Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const LoginPage = LoginView;
export default LoginView;
