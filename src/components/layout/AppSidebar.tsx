import {
  Boxes,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  FileSpreadsheet,
  Globe2,
  History,
  LayoutDashboard,
  LogIn,
  LogOut,
  Package,
  Printer,
  School,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  Users,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { AppUser, UserRole } from '../../types';
import { MainTab } from '../Navbar';

interface SidebarProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  currentUser: AppUser;
  schoolName: string;
  onOpenGoogleSheets?: () => void;
  onOpenUnifiedSettings?: () => void;
  onExecuteBackup?: () => void;
  onOpenAuditLog?: () => void;
  onOpenUserManagement?: () => void;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
  onOpenResetTransaksi?: () => void;
  onOpenMasterSekolah?: () => void;
}

export const AppSidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  currentUser,
  schoolName,
  onOpenGoogleSheets,
  onOpenUnifiedSettings,
  onExecuteBackup,
  onOpenAuditLog,
  onOpenUserManagement,
  onOpenLoginModal,
  onLogout,
  onOpenResetTransaksi,
  onOpenMasterSekolah
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';
  const isDinasUser = (currentUser?.role as string) === 'SUPER_ADMIN' || currentUser?.role === 'super_admin' || (currentUser?.role as string) === 'admin_dinas' || currentUser?.sekolah_id === 'dinas_prov' || currentUser?.username === 'dinas';

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      onClick: () => {
        onTabChange('dashboard');
        onCloseMobile();
      },
      isActive: activeTab === 'dashboard'
    },
    {
      id: 'generator',
      label: 'Cetak Dokumen',
      icon: Printer,
      badge: 'NPB-BAST',
      onClick: () => {
        onTabChange('generator');
        onCloseMobile();
      },
      isActive: activeTab === 'generator'
    },
    /* HANYA MUNCUL JIKA USER ADALAH SUPER ADMIN / ADMIN DINAS */
    ...(isDinasUser ? [{
      id: 'dinas',
      label: 'Laporan Dinas',
      icon: Building2,
      badge: 'MUTASI',
      onClick: () => {
        onTabChange('dinas');
        onCloseMobile();
      },
      isActive: activeTab === 'dinas'
    }] : []),
    {
      id: 'barang',
      label: 'Master Barang',
      icon: Boxes,
      badge: null,
      onClick: () => {
        onTabChange('barang');
        onCloseMobile();
      },
      isActive: activeTab === 'barang'
    },
    {
      id: 'pejabat',
      label: 'Master Pegawai',
      icon: Users,
      badge: null,
      onClick: () => {
        onTabChange('pejabat');
        onCloseMobile();
      },
      isActive: activeTab === 'pejabat'
    },
    {
      id: 'sheets',
      label: 'Sheets Sync',
      icon: FileSpreadsheet,
      badge: 'LIVE',
      onClick: () => {
        if (onOpenGoogleSheets) onOpenGoogleSheets();
        onCloseMobile();
      },
      isActive: false
    },
    {
      id: 'pengaturan',
      label: 'Pengaturan',
      icon: Settings,
      badge: null,
      onClick: () => {
        if (onOpenUnifiedSettings) onOpenUnifiedSettings();
        onCloseMobile();
      },
      isActive: false
    },
    {
      id: 'backup',
      label: 'Backup Data',
      icon: Database,
      badge: null,
      onClick: () => {
        if (onExecuteBackup) onExecuteBackup();
        onCloseMobile();
      },
      isActive: false
    },
    {
      id: 'audit',
      label: 'Audit & Keamanan',
      icon: ShieldCheck,
      badge: isDinasUser ? 'DINAS' : (isAdmin ? 'ADMIN' : null),
      onClick: () => {
        if (onOpenAuditLog) onOpenAuditLog();
        onCloseMobile();
      },
      isActive: false
    },
    /* HANYA MUNCUL JIKA USER ADALAH SUPER ADMIN DINAS */
    ...(isDinasUser && onOpenMasterSekolah ? [{
      id: 'sekolah',
      label: 'Data Sekolah',
      icon: School,
      badge: 'MASTER',
      onClick: () => {
        onOpenMasterSekolah();
        onCloseMobile();
      },
      isActive: false
    }] : [])
  ];

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-500/20 text-rose-300 border border-rose-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <Globe2 className="w-3 h-3 text-rose-400" />
            Dinas / Super Admin
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 border border-purple-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <ShieldCheck className="w-3 h-3 text-purple-400" />
            Admin
          </span>
        );
      case 'operator':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <Shield className="w-3 h-3 text-emerald-400" />
            Operator
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 border border-blue-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
            Pengguna
          </span>
        );
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0B132B] text-slate-200 select-none border-r border-slate-800">
      
      {/* 1. Header / Logo Brand */}
      <div className={`flex items-center justify-between p-4 border-b border-slate-800/80 ${isCollapsed ? 'justify-center px-2' : ''}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-900/40 shrink-0">
            <Package className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-wide text-white">SIMBA</span>
                <span className="text-[9px] font-bold bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-400/30 uppercase tracking-wider">
                  v2.6
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5" title={schoolName}>
                {schoolName || 'SMAN 1 Cihaurbeuti'}
              </p>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Tutup Menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Navigation Menu */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Menu Utama
          </div>
        )}

        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative cursor-pointer ${
                item.isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform ${item.isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
              
              {!isCollapsed && (
                <span className="flex-1 text-left truncate">{item.label}</span>
              )}

              {!isCollapsed && item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                  item.isActive 
                    ? 'bg-blue-700/60 text-blue-100' 
                    : 'bg-slate-800 text-slate-400 group-hover:text-slate-300'
                }`}>
                  {item.badge}
                </span>
              )}

              {/* Tooltip on collapse */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  {item.label}
                  {item.badge && <span className="ml-1.5 text-[9px] text-blue-300 font-bold">({item.badge})</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Collapse Toggle Button (Desktop) */}
      <div className="hidden lg:flex items-center justify-between p-3 border-t border-slate-800/80 text-xs">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer"
          title={isCollapsed ? 'Perlebar Sidebar' : 'Ciutkan Sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[11px] font-medium">Ciutkan Sidebar</span>
            </>
          )}
        </button>
      </div>

      {/* 4. Bottom User Profile Section with Dropdown */}
      <div className="p-3 border-t border-slate-800/80 relative">
        <button
          type="button"
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/70 transition-colors text-left cursor-pointer ${
            isCollapsed ? 'justify-center p-1.5' : ''
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
            {currentUser.nama ? currentUser.nama.slice(0, 2).toUpperCase() : 'RF'}
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white truncate" title={currentUser.nama}>
                  {currentUser.nama?.split(' ')[0] || 'Rifqi'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {getRoleBadge(currentUser.role)}
              </div>
            </div>
          )}
        </button>

        {/* Profile Dropdown Menu */}
        {isProfileMenuOpen && (
          <div className={`absolute bottom-full mb-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs ${
            isCollapsed ? 'left-2 w-52' : 'left-3 right-3'
          }`}>
            <div className="px-3 py-2 border-b border-slate-800">
              <div className="font-bold text-white truncate">{currentUser.nama}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">@{currentUser.username}</div>
            </div>

            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  if (onOpenLoginModal) onOpenLoginModal();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-400" />
                <span>Ganti Akun Pengguna</span>
              </button>

              {isAdmin && onOpenUserManagement && (
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenUserManagement();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left cursor-pointer"
                >
                  <UserCog className="w-3.5 h-3.5 text-purple-400" />
                  <span>Manajemen Pengguna</span>
                </button>
              )}

              {isDinasUser && onOpenMasterSekolah && (
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenMasterSekolah();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left cursor-pointer"
                >
                  <School className="w-3.5 h-3.5 text-rose-400" />
                  <span>Manajemen Sekolah (Dinas)</span>
                </button>
              )}

              {isAdmin && onOpenResetTransaksi && (
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenResetTransaksi();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors text-left cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Reset / Kosongkan Data</span>
                </button>
              )}

              <div className="my-1 border-t border-slate-800" />

              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  if (onLogout) onLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors text-left cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span>Keluar / Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className={`hidden lg:block shrink-0 transition-all duration-300 sticky top-0 h-screen z-40 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}>
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-72 z-50 lg:hidden transform transition-transform duration-300 shadow-2xl ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {sidebarContent}
      </aside>
    </>
  );
};
