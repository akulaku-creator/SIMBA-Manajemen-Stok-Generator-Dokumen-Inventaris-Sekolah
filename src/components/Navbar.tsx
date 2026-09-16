import { 
  Building2, 
  ChevronDown, 
  Code2, 
  FileCheck2, 
  FileSpreadsheet, 
  Hash, 
  History, 
  Layers, 
  LogIn, 
  LogOut, 
  PackagePlus, 
  Printer, 
  RotateCcw, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  SlidersHorizontal, 
  Trash2, 
  UserCheck, 
  UserCog, 
  Users,
  Database,
  Download
} from 'lucide-react';
import React, { useState } from 'react';
import { AppUser, UserRole } from '../types';

export type MainTab = 'dashboard' | 'generator' | 'barang' | 'pejabat';

interface Props {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  onOpenNewTransaksi: () => void;
  onOpenNewPenerimaan: () => void;
  onOpenKopSettings: () => void;
  onOpenNumberingSettings: () => void;
  onOpenUnifiedSettings?: () => void;
  onExecuteBackup?: () => void;
  lastBackupTime?: string | null;
  onOpenSchemaModal: () => void;
  onOpenGoogleSheets?: () => void;
  isGoogleSheetConnected?: boolean;
  schoolName: string;
  currentUser: AppUser;
  onOpenUserManagement?: () => void;
  onOpenResetTransaksi?: () => void;
  onOpenAuditLog?: () => void;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
  onSwitchRole: (role: UserRole) => void;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  onTabChange,
  onOpenNewTransaksi,
  onOpenNewPenerimaan,
  onOpenKopSettings,
  onOpenNumberingSettings,
  onOpenUnifiedSettings,
  onExecuteBackup,
  lastBackupTime,
  onOpenSchemaModal,
  onOpenGoogleSheets,
  isGoogleSheetConnected,
  schoolName,
  currentUser,
  onOpenUserManagement,
  onOpenResetTransaksi,
  onOpenAuditLog,
  onOpenLoginModal,
  onLogout,
  onSwitchRole
}) => {
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const isAdmin = currentUser.role === 'admin';
  const isOperator = currentUser.role === 'operator';
  const isPengguna = currentUser.role === 'pengguna';

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 border border-purple-400/40 text-[10px] font-bold px-2 py-0.5 rounded-md">
            <ShieldCheck className="w-3 h-3 text-purple-400" />
            Admin
          </span>
        );
      case 'operator':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold px-2 py-0.5 rounded-md">
            <Shield className="w-3 h-3 text-emerald-400" />
            Operator
          </span>
        );
      case 'pengguna':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 border border-blue-400/40 text-[10px] font-bold px-2 py-0.5 rounded-md">
            <UserCheck className="w-3 h-3 text-blue-400" />
            Pengguna (Guru)
          </span>
        );
    }
  };

  return (
    <header className="no-print bg-slate-900 text-white border-b border-slate-800/90 sticky top-0 z-40 shadow-xs backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-12 gap-2.5">
          {/* Logo & App Name */}
          <div 
            className="flex items-center gap-2 cursor-pointer group flex-shrink-0" 
            onClick={() => onTabChange('dashboard')}
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center shadow-xs ring-1 ring-white/20 transition-transform group-hover:scale-105">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white">SIMBA</span>
                <span className="bg-blue-500/15 text-blue-300 border border-blue-400/30 text-[9px] font-semibold px-1 py-0.2 rounded tracking-wide">
                  A4/F4
                </span>
              </div>
            </div>
          </div>

          {/* Center Navigation Tabs (Only for Admin & Operator) */}
          {!isPengguna ? (
            <nav className="hidden lg:flex items-center gap-0.5 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800">
              <button
                id="nav-dashboard"
                onClick={() => onTabChange('dashboard')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Dashboard
              </button>

              <button
                id="nav-generator"
                onClick={() => onTabChange('generator')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'generator'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Dokumen
              </button>

              <button
                id="nav-barang"
                onClick={() => onTabChange('barang')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'barang'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Master Barang
              </button>

              {isAdmin && (
                <button
                  id="nav-pejabat"
                  onClick={() => onTabChange('pejabat')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'pejabat'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Master Pejabat
                </button>
              )}
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-2 bg-blue-950/50 border border-blue-800/60 px-2.5 py-0.5 rounded-lg text-xs text-blue-200">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Mode Ringkas: <strong>NPB Guru</strong></span>
            </div>
          )}

          {/* Right Actions & User Switcher */}
          <div className="flex items-center gap-1.5">
            {/* Google Sheets Live Sync Button */}
            {onOpenGoogleSheets && (
              <button
                onClick={onOpenGoogleSheets}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-all border shadow-xs ${
                  isGoogleSheetConnected
                    ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border-emerald-600/70'
                    : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white border-slate-700'
                }`}
                title="Integrasi & Sinkronisasi Google Sheets"
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 ${isGoogleSheetConnected ? 'text-emerald-400' : 'text-emerald-500'}`} />
                <span className="hidden sm:inline">Sheets</span>
                {isGoogleSheetConnected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-900 animate-pulse" title="Terhubung" />
                )}
              </button>
            )}

            {/* Operator & Admin Transaction Action Buttons */}
            {!isPengguna && (
              <>
                <button
                  onClick={onOpenNewPenerimaan}
                  className="hidden xl:inline-flex items-center gap-1 px-2 py-1 bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-semibold rounded-md border border-emerald-500/40 shadow-xs transition-colors"
                  title="Catat penerimaan belanja persediaan dana BOS / APBD"
                >
                  <PackagePlus className="w-3.5 h-3.5 text-emerald-200" />
                  + Masuk
                </button>

                <button
                  onClick={onOpenNewTransaksi}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md shadow-xs transition-all active:scale-98"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  + Penyaluran
                </button>
              </>
            )}

            {/* Admin-Only Config & Maintenance Tools */}
            {isAdmin && (
              <>
                {/* Tombol Pemusatan Form Pengaturan Instansi */}
                {onOpenUnifiedSettings ? (
                  <button
                    onClick={onOpenUnifiedSettings}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors shadow-2xs cursor-pointer"
                    title="Buka Form Pengaturan Terpadu Instansi (Kop Surat, Format Penomoran, Master Pejabat &amp; Backup)"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                    <span className="hidden lg:inline text-xs font-semibold">Pengaturan</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={onOpenNumberingSettings}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/90 rounded-md border border-transparent hover:border-slate-700 transition-colors"
                      title="Pengaturan Format Penomoran Surat (Admin)"
                    >
                      <Hash className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={onOpenKopSettings}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/90 rounded-md border border-transparent hover:border-slate-700 transition-colors"
                      title="Pengaturan Logo & Kop Surat (Admin)"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                {/* Tombol Backup Data Keseluruhan (Satu-Klik) */}
                {onExecuteBackup && (
                  <button
                    onClick={onExecuteBackup}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-emerald-200 hover:text-white bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 rounded-md text-xs font-semibold transition-colors shadow-2xs cursor-pointer group"
                    title={`Backup Data Keseluruhan (Satu-Klik)\n${lastBackupTime ? `Riwayat Terakhir: ${lastBackupTime}` : 'Belum pernah dicadangkan'}`}
                  >
                    <Database className="w-3.5 h-3.5 text-emerald-400 group-hover:animate-bounce" />
                    <span className="hidden md:inline">Backup</span>
                  </button>
                )}

                {onOpenUserManagement && (
                  <button
                    onClick={onOpenUserManagement}
                    className="p-1 text-slate-300 hover:text-white hover:bg-purple-950/80 rounded-md border border-transparent hover:border-purple-700/60 transition-colors"
                    title="Manajemen Pengguna & Hak Akses (Admin)"
                  >
                    <UserCog className="w-3.5 h-3.5 text-purple-400" />
                  </button>
                )}

                {/* Log Audit Keamanan - Khusus Admin */}
                {isAdmin && onOpenAuditLog && (
                  <button
                    onClick={onOpenAuditLog}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-950/70 hover:bg-purple-900/90 text-purple-300 hover:text-purple-100 border border-purple-800/80 rounded-md text-xs font-semibold transition-colors shadow-2xs"
                    title="Riwayat Log Audit Keamanan & Tindakan Sistem (Khusus Admin)"
                  >
                    <History className="w-3.5 h-3.5 text-purple-400" />
                    <span className="hidden xl:inline">Audit</span>
                  </button>
                )}

                {/* Reset Transaksi (Pembersihan Data) - Khusus Admin */}
                {isAdmin && onOpenResetTransaksi && (
                  <button
                    onClick={onOpenResetTransaksi}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-950/70 hover:bg-red-900/90 text-red-300 hover:text-red-100 border border-red-800/80 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                    title="Fitur Keamanan: Kosongkan Seluruh Riwayat Transaksi (Khusus Admin)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span className="hidden md:inline">Kosongkan Transaksi</span>
                  </button>
                )}
              </>
            )}

            {/* User Profile & Quick Role Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-all"
                title="Klik untuk membuka menu pengguna & ganti akun"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs ${currentUser.avatarColor || 'bg-blue-600'}`}>
                  {currentUser.nama.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-[11px] font-bold text-white leading-tight truncate max-w-[110px]">
                    {currentUser.nama.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {getRoleBadge(currentUser.role)}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Role Switcher & Auth Menu Popup */}
              {isRoleDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-2 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white truncate max-w-[180px]">{currentUser.nama}</div>
                      {getRoleBadge(currentUser.role)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">@{currentUser.username} • {currentUser.unitKerja || '-'}</div>
                  </div>

                  <div className="py-1.5">
                    <div className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1">
                      Pilihan Hak Akses Pengguna:
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSwitchRole('admin');
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                        currentUser.role === 'admin' 
                          ? 'bg-purple-900/60 text-purple-200 font-bold' 
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                        <div>
                          <div>Admin</div>
                          <div className="text-[10px] text-slate-400 font-normal">Akses penuh &amp; reset data</div>
                        </div>
                      </div>
                      {currentUser.role === 'admin' && <span className="text-purple-400 font-bold">✓</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSwitchRole('operator');
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                        currentUser.role === 'operator' 
                          ? 'bg-emerald-900/60 text-emerald-200 font-bold' 
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <div>
                          <div>Operator</div>
                          <div className="text-[10px] text-slate-400 font-normal">Input mutasi &amp; cetak dokumen</div>
                        </div>
                      </div>
                      {currentUser.role === 'operator' && <span className="text-emerald-400 font-bold">✓</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSwitchRole('pengguna');
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                        currentUser.role === 'pengguna' 
                          ? 'bg-blue-900/60 text-blue-200 font-bold' 
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-blue-400" />
                        <div>
                          <div>Pengguna (Staf/Guru)</div>
                          <div className="text-[10px] text-slate-400 font-normal">Hanya menu permohonan NPB</div>
                        </div>
                      </div>
                      {currentUser.role === 'pengguna' && <span className="text-blue-400 font-bold">✓</span>}
                    </button>
                  </div>

                  {/* Admin Specific Links */}
                  {isAdmin && (
                    <div className="pt-1 border-t border-slate-800 space-y-0.5">
                      {onOpenUnifiedSettings && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsRoleDropdownOpen(false);
                            onOpenUnifiedSettings();
                          }}
                          className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 font-medium"
                        >
                          <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                          <span>Pengaturan Terpadu Instansi</span>
                        </button>
                      )}

                      {onExecuteBackup && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsRoleDropdownOpen(false);
                            onExecuteBackup();
                          }}
                          className="w-full text-left px-3 py-1.5 text-emerald-300 hover:bg-emerald-950/60 rounded-lg flex items-center justify-between font-medium"
                        >
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-emerald-400" />
                            <span>Backup Data Keseluruhan</span>
                          </div>
                          {lastBackupTime && (
                            <span className="text-[9px] text-emerald-400/80 font-mono">
                              {lastBackupTime.split(',')[0]}
                            </span>
                          )}
                        </button>
                      )}

                      {onOpenUserManagement && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsRoleDropdownOpen(false);
                            onOpenUserManagement();
                          }}
                          className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 font-medium"
                        >
                          <UserCog className="w-4 h-4 text-purple-400" />
                          <span>Kelola Pengguna &amp; PIN</span>
                        </button>
                      )}

                      {onOpenAuditLog && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsRoleDropdownOpen(false);
                            onOpenAuditLog();
                          }}
                          className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 font-medium"
                        >
                          <History className="w-4 h-4 text-purple-400" />
                          <span>Log Audit Keamanan</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Account Switcher & Logout */}
                  <div className="pt-1.5 mt-1 border-t border-slate-800 space-y-0.5">
                    {onOpenLoginModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsRoleDropdownOpen(false);
                          onOpenLoginModal();
                        }}
                        className="w-full text-left px-3 py-1.5 text-blue-300 hover:bg-blue-950/50 rounded-lg flex items-center gap-2 font-medium"
                      >
                        <LogIn className="w-4 h-4 text-blue-400" />
                        <span>Ganti Akun / Menu Login</span>
                      </button>
                    )}

                    {onLogout && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsRoleDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-1.5 text-rose-300 hover:bg-rose-950/50 rounded-lg flex items-center gap-2 font-medium"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <span>Keluar / Logout</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation for Admin & Operator */}
        {!isPengguna && (
          <div className="flex lg:hidden items-center justify-around py-2 border-t border-slate-800 text-xs">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-2 py-1 rounded-md transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onTabChange('generator')}
              className={`px-2 py-1 rounded-md transition-colors ${activeTab === 'generator' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
            >
              Cetak Dokumen
            </button>
            <button
              onClick={() => onTabChange('barang')}
              className={`px-2 py-1 rounded-md transition-colors ${activeTab === 'barang' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
            >
              Barang
            </button>
            {isAdmin && (
              <button
                onClick={() => onTabChange('pejabat')}
                className={`px-2 py-1 rounded-md transition-colors ${activeTab === 'pejabat' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
              >
                Pejabat
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
