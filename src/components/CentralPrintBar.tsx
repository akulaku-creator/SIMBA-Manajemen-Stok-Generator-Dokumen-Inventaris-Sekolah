import { 
  Building2, 
  ChevronDown, 
  Copy, 
  Eye, 
  EyeOff, 
  FileSpreadsheet, 
  Maximize2, 
  Minus, 
  Plus, 
  Printer, 
  RotateCcw, 
  Settings2, 
  Sliders, 
  Sparkles, 
  ZoomIn, 
  ZoomOut,
  Check
} from 'lucide-react';
import React, { useState } from 'react';
import { DocumentType, PaperSize } from '../types';

interface Props {
  docTitle: string;
  docCode: string;
  docCategoryLabel: string;
  isLandscape: boolean;
  paperSize: PaperSize;
  onSelectPaperSize: (size: PaperSize) => void;
  minRows: number;
  onSelectMinRows: (rows: number) => void;
  copies: number;
  onSelectCopies: (copies: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onResetZoom: () => void;
  onTriggerPrint: () => void;
  showPreview: boolean;
  onTogglePreview: () => void;
  activeViewMode: 'split' | 'list' | 'preview';
  onChangeViewMode: (mode: 'split' | 'list' | 'preview') => void;
  onOpenKopSettings?: () => void;
  onExportExcel?: () => void;
  isExportingExcel?: boolean;
  canExportExcel?: boolean;
}

export const CentralPrintBar: React.FC<Props> = ({
  docTitle,
  docCode,
  docCategoryLabel,
  isLandscape,
  paperSize,
  onSelectPaperSize,
  minRows,
  onSelectMinRows,
  copies,
  onSelectCopies,
  zoom,
  onZoomChange,
  onResetZoom,
  onTriggerPrint,
  showPreview,
  onTogglePreview,
  activeViewMode,
  onChangeViewMode,
  onOpenKopSettings,
  onExportExcel,
  isExportingExcel = false,
  canExportExcel = false
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="no-print w-full bg-white border-b border-slate-200 sticky top-12 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-1 sm:py-1.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
          
          {/* Sisi Kiri: Ringkasan Format Dokumen Aktif (Title ditampilkan di panel detail kanan untuk hilangkan redundansi) */}
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white shadow-2xs ${
              isLandscape ? 'bg-amber-600' : 'bg-blue-600'
            }`}>
              <Printer className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap min-w-0 text-xs">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 shrink-0">
                {docCode}
              </span>
              <span className="text-[11px] font-medium text-slate-500 hidden md:inline truncate">
                {docCategoryLabel}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                isLandscape ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                {paperSize} {isLandscape ? 'Landscape' : 'Portrait'}
              </span>
            </div>
          </div>

          {/* Sisi Kanan: Menu Cetak Terpusat (Tombol Cetak, Mode Tampilan, Zoom, Pengaturan) */}
          <div className="flex items-center flex-wrap gap-1.5 justify-end">
            
            {/* 1. Pengalih Mode Tampilan */}
            <div className="hidden sm:inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => onChangeViewMode('split')}
                className={`px-2 py-1 rounded-md transition-all text-xs ${
                  activeViewMode === 'split'
                    ? 'bg-white text-blue-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilkan daftar dokumen dan pratinjau berdampingan"
              >
                Split
              </button>
              <button
                type="button"
                onClick={() => onChangeViewMode('preview')}
                className={`px-2 py-1 rounded-md transition-all text-xs ${
                  activeViewMode === 'preview'
                    ? 'bg-white text-blue-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilkan pratinjau lembar kertas penuh"
              >
                Pratinjau
              </button>
              <button
                type="button"
                onClick={() => onChangeViewMode('list')}
                className={`px-2 py-1 rounded-md transition-all text-xs ${
                  activeViewMode === 'list'
                    ? 'bg-white text-blue-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilkan daftar kelola dokumen"
              >
                Daftar
              </button>
            </div>

            {/* 2. Opsi Pratinjau & Zoom Controls */}
            <div className="flex items-center gap-0.5 border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-xs">
              <button
                type="button"
                onClick={onTogglePreview}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-medium transition-all text-xs ${
                  showPreview 
                    ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200' 
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
                title="Sembunyikan / Tampilkan Pratinjau Lembar Dokumen"
              >
                {showPreview ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                <span className="hidden lg:inline">{showPreview ? 'Pratinjau Aktif' : 'Pratinjau'}</span>
              </button>

              {showPreview && (
                <div className="hidden md:flex items-center pl-1 border-l border-slate-200 gap-0.5">
                  <button
                    type="button"
                    onClick={() => onZoomChange(Math.max(60, zoom - 10))}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded transition-colors"
                    title="Perkecil Pratinjau"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <span className="font-mono text-[10px] text-slate-700 font-bold px-1 w-8 text-center">
                    {zoom}%
                  </span>
                  <button
                    type="button"
                    onClick={() => onZoomChange(Math.min(140, zoom + 10))}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded transition-colors"
                    title="Perbesar Pratinjau"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                  {zoom !== 100 && (
                    <button
                      type="button"
                      onClick={onResetZoom}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded transition-colors"
                      title="Reset Zoom ke 100%"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 3. Pengaturan Cetak Popover Trigger */}
            <div className="relative">
              <button
                type="button"
                id="btn-print-settings"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  isSettingsOpen
                    ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-500/20'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
                title="Sesuaikan format kertas, jumlah salinan, dan spasi dokumen"
              >
                <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Pengaturan</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isSettingsOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
              </button>

              {/* Popover Pengaturan Cetak */}
              {isSettingsOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-50 text-xs space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-blue-600" />
                      Pengaturan Cetak
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                    >
                      Tutup
                    </button>
                  </div>

                  {/* Pengaturan 1: Ukuran Kertas */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 flex items-center justify-between">
                      <span>Ukuran Kertas Fisik:</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {paperSize === 'A4' ? '210 x 297 mm' : '215 x 330 mm (Folio)'}
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectPaperSize('A4')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                          paperSize === 'A4'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        A4 (Standar)
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectPaperSize('F4')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                          paperSize === 'F4'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        F4 / Folio Dinas
                      </button>
                    </div>
                  </div>

                  {/* Pengaturan 2: Jumlah Salinan (Copies) */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 flex items-center justify-between">
                      <span>Jumlah Salinan Cetak:</span>
                      <span className="text-[10px] text-slate-500">
                        {copies === 1 ? '1 Berkas Asli' : `${copies} Rangkap (Arsip & Pemohon)`}
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                        <button
                          type="button"
                          onClick={() => onSelectCopies(Math.max(1, copies - 1))}
                          className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 transition-colors border-r border-slate-200"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center font-bold text-slate-800 font-mono text-xs">
                          {copies}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectCopies(Math.min(10, copies + 1))}
                          className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 transition-colors border-l border-slate-200"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Salinan langsung di dialog printer
                      </span>
                    </div>
                  </div>

                  {/* Pengaturan 3: Kerapatan Baris Tabel (Min Rows) */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 flex items-center justify-between">
                      <span>Kerapatan Baris Tabel Dokumen:</span>
                      <span className="text-[10px] text-slate-500">Margin Baku 10/15mm</span>
                    </label>
                    <select
                      value={minRows}
                      onChange={(e) => onSelectMinRows(Number(e.target.value))}
                      className="w-full text-xs border border-slate-300 rounded-lg py-1.5 px-2.5 bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    >
                      <option value={10}>10 Baris (Ringkas)</option>
                      <option value={14}>14 Baris (Standar Ideal 1 Lembar)</option>
                      <option value={18}>18 Baris (Sedang)</option>
                      <option value={22}>22 Baris (Penuh)</option>
                    </select>
                  </div>

                  {/* Opsi Ekstra: Ubah Kop Surat */}
                  {onOpenKopSettings && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-slate-600 font-medium text-[11px]">Identitas Kop Dokumen:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSettingsOpen(false);
                          onOpenKopSettings();
                        }}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-xs flex items-center gap-1"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        Ubah Kop Surat
                      </button>
                    </div>
                  )}

                  {/* Opsi Ekstra: Ekspor Excel jika didukung */}
                  {canExportExcel && onExportExcel && (
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSettingsOpen(false);
                          onExportExcel();
                        }}
                        disabled={isExportingExcel}
                        className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>{isExportingExcel ? 'Mengekspor Excel...' : 'Ekspor Laporan Excel (.xlsx)'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. TOMBOL CETAK TERPUSAT */}
            <button
              type="button"
              id="btn-central-print"
              onClick={onTriggerPrint}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 transition-all active:scale-95 ring-2 ring-blue-600/20 cursor-pointer"
              title="Cetak dokumen aktif langsung ke printer atau simpan sebagai PDF (Ctrl + P)"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span className="tracking-wide">Cetak Dokumen</span>
              <kbd className="hidden md:inline-block bg-blue-700/90 text-blue-100 text-[9px] font-mono px-1 py-0.2 rounded border border-blue-500/50">
                Ctrl+P
              </kbd>
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};
