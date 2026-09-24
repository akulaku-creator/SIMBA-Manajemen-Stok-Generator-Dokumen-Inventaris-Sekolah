import {
  Bell,
  Building2,
  FileCheck2,
  FileSpreadsheet,
  Menu,
  PackagePlus,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  School,
  Search,
  Shield,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import React from 'react';
import { AppUser, PaperSize } from '../../types';
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
  lastBackupTime
}) => {
  const getTabTitle = (tab: MainTab) => {
    switch (tab) {
      case 'dashboard':
        return 'Dashboard & Penyaluran';
      case 'generator':
        return 'Generator Dokumen Legalitas';
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
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        
        {/* Left Section: Mobile Menu Trigger + Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            {/* Breadcrumb path */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>SIMBA</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-700 font-semibold truncate">
                {getTabTitle(activeTab)}
              </span>
            </div>

            {/* School identifier */}
            <div className="hidden sm:flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate font-medium">{schoolName || 'SMAN 1 Cihaurbeuti'}</span>
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
