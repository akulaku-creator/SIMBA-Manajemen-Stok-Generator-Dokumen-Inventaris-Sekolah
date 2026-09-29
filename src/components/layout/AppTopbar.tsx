import {
  Bell,
  Building2,
  ChevronDown,
  FileCheck2,
  FileSpreadsheet,
  Globe2,
  Lock,
  Menu,
  PackagePlus,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  School,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import React from 'react';
import { AppUser, PaperSize, Sekolah } from '../../types';
import { MainTab } from '../Navbar';

interface TopbarProps {
  activeTab: MainTab;
  schoolName: string;
  currentUser: AppUser;
  onOpenMobileMenu: () => void;
  onOpenNewTransaksi: () => void;
  onOpenNewPenerimaan: () => void;
  paperSize?: PaperSize;
  onSelectPaperSize?: (size: PaperSize) => void;
  lastBackupTime?: string | null;
  sekolahList?: Sekolah[];
  currentSekolahId?: string;
  onSelectSekolah?: (sekolahId: string) => void;
  onOpenMasterSekolah?: () => void;
  onOpenAuditLog?: () => void;
}

export const AppTopbar: React.FC<TopbarProps> = ({
  activeTab,
  schoolName,
  currentUser,
  onOpenMobileMenu,
  onOpenNewTransaksi,
  onOpenNewPenerimaan,
  paperSize = 'A4',
  onSelectPaperSize,
  lastBackupTime,
  sekolahList = [],
  currentSekolahId,
  onSelectSekolah,
  onOpenMasterSekolah,
  onOpenAuditLog
}) => {
  const isSuperAdmin = currentUser.role === 'super_admin';
  const currentSekolah = sekolahList.find(s => s.id === currentSekolahId);

  const getTabTitle = (tab: MainTab) => {
    switch (tab) {
      case 'dashboard':
        return 'Dashboard & Penyaluran';
      case 'generator':
        return 'Generator Dokumen Legalitas';
      case 'dinas':
        return 'Modul Pengawasan Dinas - Laporan Mutasi Wilayah';
      case 'barang':
        return 'Master Barang Persediaan';
      case 'pejabat':
        return 'Master Pegawai & Pejabat';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        
        {/* Left Section: Mobile Menu Trigger + Breadcrumb + School Switcher */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0 flex flex-col justify-center">
            {/* Breadcrumb path */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="font-semibold text-slate-600">SIMBA</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-700 font-semibold truncate">
                {getTabTitle(activeTab)}
              </span>
            </div>

            {/* School identifier & Multi-Tenant Switcher */}
            <div className="flex items-center gap-2 mt-0.5">
              {isSuperAdmin ? (
                /* Super Admin / Dinas Interactive Switcher */
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200/80 text-blue-900 rounded-lg px-2 py-0.5 text-xs font-semibold shadow-2xs">
                  <Globe2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span className="text-[10px] uppercase font-bold text-blue-800 hidden md:inline">Sekolah:</span>
                  <select
                    value={currentSekolahId || ''}
                    onChange={(e) => onSelectSekolah && onSelectSekolah(e.target.value)}
                    className="bg-transparent text-blue-950 font-bold text-xs focus:outline-hidden cursor-pointer py-0.5 pr-1 max-w-[180px] sm:max-w-[240px] truncate"
                    title="Pilih Sekolah untuk Supervisi / Akses Multi-Tenant"
                  >
                    {sekolahList.map(sch => (
                      <option key={sch.id} value={sch.id} className="text-slate-900">
                        {sch.nama} (NPSN: {sch.npsn})
                      </option>
                    ))}
                  </select>
                  <span className="text-[9px] bg-blue-200 text-blue-900 px-1 py-0.2 rounded font-bold uppercase hidden sm:inline">
                    DINAS
                  </span>
                  {onOpenMasterSekolah && (
                    <button
                      type="button"
                      onClick={onOpenMasterSekolah}
                      className="p-1 text-blue-700 hover:text-blue-950 hover:bg-blue-200/70 rounded transition-colors cursor-pointer ml-0.5"
                      title="Buka Manajemen Master Sekolah"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                /* Standard Tenant Locked Indicator */
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600">
                  <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate font-semibold text-slate-800 max-w-[240px] md:max-w-none">
                    {schoolName || currentSekolah?.nama || 'SMK NEGERI 1 KOTA PENDIDIKAN'}
                  </span>
                  {currentSekolah?.npsn && (
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-1.5 py-0.5 rounded border border-slate-200">
                      NPSN: {currentSekolah.npsn}
                    </span>
                  )}
                  {onOpenAuditLog ? (
                    <button
                      type="button"
                      onClick={onOpenAuditLog}
                      className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 transition-colors cursor-pointer"
                      title="Status Isolasi Data Multi-Tenant Aktif - Klik untuk Buka Audit & Keamanan"
                    >
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span className="font-semibold">Terisolasi</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" title="Isolasi Data Mandiri Aktif">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Terisolasi</span>
                    </span>
                  )}
                  {currentUser.role === 'admin' && onOpenMasterSekolah && (
                    <button
                      type="button"
                      onClick={onOpenMasterSekolah}
                      className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer ml-0.5"
                      title="Lihat & Kelola Master Data Sekolah"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Quick CTAs, Paper Size & Status */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Paper Size Quick Selector (A4 / F4) */}
          {onSelectPaperSize && (
            <div className="hidden md:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => onSelectPaperSize('A4')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  paperSize === 'A4'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Format Standar ISO A4"
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => onSelectPaperSize('F4')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  paperSize === 'F4'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Format Standar Folio / F4 Dinas"
              >
                F4
              </button>
            </div>
          )}

          {/* Secondary CTA: Catat Penerimaan (BOS) */}
          <button
            type="button"
            onClick={onOpenNewPenerimaan}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Catat Belanja Penerimaan Barang (BOS/APBD)"
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            <span>Penerimaan (BOS)</span>
          </button>

          {/* Primary CTA: Buat Pengajuan Baru */}
          <button
            type="button"
            onClick={onOpenNewTransaksi}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
            title="Buat Transaksi Pengajuan Penyaluran Barang Baru"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden xs:inline">Buat Pengajuan</span>
            <span className="xs:hidden">Pengajuan</span>
          </button>

          {/* User Avatar badge */}
          <div className="flex items-center gap-2 pl-1 sm:pl-2 sm:border-l sm:border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs ring-2 ring-blue-500/20">
              {currentUser.nama ? currentUser.nama.slice(0, 2).toUpperCase() : 'RF'}
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};
