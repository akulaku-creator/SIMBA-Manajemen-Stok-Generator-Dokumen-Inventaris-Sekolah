import {
  Building2,
  Menu,
  Palette,
  Receipt,
  Sparkles
} from 'lucide-react';
import React from 'react';
import { AppUser, PaperSize } from '../../types';
import { MainTab } from '../Navbar';
import { APP_CONFIG } from '../../config/appConfig';

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
  onOpenAuditLog?: () => void;
  onOpenThemeSettings?: () => void;
}

export const AppTopbar: React.FC<TopbarProps> = ({
  activeTab,
  schoolName,
  currentUser,
  onOpenMobileMenu,
  onOpenNewPenerimaan,
  paperSize = 'A4',
  onSelectPaperSize,
  onOpenThemeSettings
}) => {
  const getTabTitle = (tab: MainTab) => {
    switch (tab) {
      case 'dashboard':
        return 'Dashboard Operasional & Mutasi';
      case 'generator':
        return 'Generator Dokumen Legalitas (BUKU-01 s.d. BAST-SO)';
      case 'barang':
        return 'Master Barang Persediaan (BHP)';
      case 'pejabat':
        return 'Master Pegawai & Pejabat Penandatangan';
      default:
        return 'Dashboard';
    }
  };

  const effectiveSchoolName = schoolName || APP_CONFIG.defaultSchool.namaSekolah;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        
        {/* Left Section: Mobile Menu Trigger + Breadcrumb + School Direct Identity */}
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

            {/* School identifier (Single-Tenant Pure Header Branding) */}
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-700">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="font-bold text-slate-800 text-xs sm:text-sm tracking-tight truncate">
                  {effectiveSchoolName}
                </span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono font-semibold px-1.5 py-0.5 rounded border border-indigo-200 hidden sm:inline">
                  NPSN: {APP_CONFIG.defaultSchool.npsn}
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-1.5 py-0.5 rounded border border-slate-200 hidden md:inline">
                  {APP_CONFIG.defaultSchool.wilayah}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Global Actions (Paper Size, Penerimaan BOS, Profile) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Paper Size Quick Selector (A4 / F4) */}
          {onSelectPaperSize && (
            <div className="hidden md:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => onSelectPaperSize('A4')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  paperSize === 'A4'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
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
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Format Standar Folio / F4"
              >
                F4
              </button>
            </div>
          )}

          {/* Global Action: Catat Penerimaan (BOS) */}
          <button
            type="button"
            onClick={onOpenNewPenerimaan}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Catat Belanja Penerimaan Barang (BOS/APBD)"
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            <span>Penerimaan (BOS)</span>
          </button>

          {/* Quick Theme & Appearance Settings Button */}
          {onOpenThemeSettings && (
            <button
              type="button"
              onClick={onOpenThemeSettings}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50 hover:bg-indigo-50/70 text-slate-700 hover:text-indigo-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
              title="Kustomisasi Tema, Warna Aksen & Gaya Huruf (Live Preview)"
            >
              <Palette className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline">Tema</span>
            </button>
          )}

          {/* User Avatar badge */}
          <div className="flex items-center gap-2 pl-1 sm:pl-2 sm:border-l sm:border-slate-200">
            <div 
              className="w-8 h-8 rounded-full bg-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs ring-2 ring-indigo-500/20"
              title={`${currentUser.nama} (${currentUser.role})`}
            >
              {currentUser.nama ? currentUser.nama.slice(0, 2).toUpperCase() : 'AD'}
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};
