import { 
  Building2, 
  Calendar,
  ChevronDown, 
  Eye, 
  EyeOff, 
  FileSpreadsheet, 
  Minus, 
  Plus, 
  Printer, 
  RotateCcw, 
  Settings2, 
  Sliders, 
  ZoomIn, 
  ZoomOut
} from 'lucide-react';
import React, { useState } from 'react';
import { PaperSize, TAHUN_ANGGARAN_OPTIONS } from '../types';
import { MONTHS_ID } from '../utils/numberGenerator';

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
  // Periode Laporan Dropdown di Top Bar
  selectedMonth?: number;
  onSelectMonth?: (m: number) => void;
  selectedYear?: number;
  onSelectYear?: (y: number) => void;
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
  canExportExcel = false,
  selectedMonth,
  onSelectMonth,
  selectedYear,
  onSelectYear
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="no-print w-full bg-white border-b border-slate-200 sticky top-12 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          
          {/* Sisi Kiri: Label Dokumen Aktif (misal: Buku Penerimaan Barang Persediaan - A4 Landscape) */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white shadow-2xs ${
              isLandscape ? 'bg-amber-600' : 'bg-blue-600'
            }`}>
              <Printer className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
                  {docTitle} - {paperSize} {isLandscape ? 'Landscape' : 'Portrait'}
                </h1>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 shrink-0">
                  {docCode}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                {docCategoryLabel} &bull; Margin Standar Baku Dinas
              </p>
            </div>
          </div>

          {/* Sisi Kanan: Dropdown Periode Laporan, Toggle Pratinjau, dan 1 Tombol Utama [Cetak / Download PDF] */}
          <div className="flex items-center flex-wrap gap-2 justify-end shrink-0">
            
            {/* 1. Dropdown Periode Laporan */}
            {selectedMonth !== undefined && onSelectMonth && selectedYear !== undefined && onSelectYear && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <select
                  value={selectedMonth}
                  onChange={(e) => onSelectMonth(Number(e.target.value))}
                  className="bg-transparent text-slate-800 text-xs font-medium focus:outline-hidden cursor-pointer"
                  title="Pilih Periode Bulan / Triwulan / 1 Tahun Penuh"
                >
                  <option value={-1}>1 Tahun Penuh</option>
                  <option value={2}>Triwulan I (Jan-Mar)</option>
                  <option value={5}>Triwulan II (Apr-Jun)</option>
                  <option value={8}>Triwulan III (Jul-Sep)</option>
                  <option value={11}>Triwulan IV (Okt-Des)</option>
                  {MONTHS_ID.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
                <span className="text-slate-300">/</span>
                <select
                  value={selectedYear}
                  onChange={(e) => onSelectYear(Number(e.target.value))}
                  className="bg-transparent text-slate-800 text-xs font-bold focus:outline-hidden cursor-pointer"
                  title="Pilih Tahun Anggaran"
                >
                  {TAHUN_ANGGARAN_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 2. Toggle Pratinjau */}
            <div className="flex items-center gap-0.5 border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-xs shadow-2xs">
              <button
                type="button"
                id="btn-toggle-preview"
                onClick={onTogglePreview}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  showPreview 
                    ? 'bg-blue-600 text-white shadow-2xs' 
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
                title="Sembunyikan / Tampilkan Pratinjau Lembar Kertas Dokumen"
              >
                {showPreview ? <Eye className="w-3.5 h-3.5 text-white" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                <span>{showPreview ? 'Pratinjau' : 'Pratinjau Tertutup'}</span>
              </button>

              {showPreview && (
                <div className="hidden sm:flex items-center pl-1 border-l border-slate-200 gap-0.5">
                  <button
                    type="button"
                    onClick={() => onZoomChange(Math.max(60, zoom - 10))}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded transition-colors"
                    title="Perkecil Zoom"
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
                    title="Perbesar Zoom"
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

            {/* 3. Pengaturan Cetak Popover (Format Kertas & Salinan Ringkas) */}
            <div className="relative">
              <button
                type="button"
                id="btn-print-settings"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`inline-flex items-center gap-1 p-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  isSettingsOpen
                    ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-500/20'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-2xs'
                }`}
                title="Format kertas (A4 / F4) dan jumlah salinan"
              >
                <Settings2 className="w-4 h-4 text-slate-600" />
                <ChevronDown className={`w-3 h-3 transition-transform ${isSettingsOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
              </button>

              {/* Popover Pengaturan Cetak */}
              {isSettingsOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-50 text-xs space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-blue-600" />
                      Pengaturan Format Dokumen
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>

                  {/* Pengaturan Ukuran Kertas */}
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
                        className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
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
                        className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                          paperSize === 'F4'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        F4 / Folio Dinas
                      </button>
                    </div>
                  </div>

                  {/* Pengaturan Jumlah Salinan (Copies) */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 flex items-center justify-between">
                      <span>Jumlah Salinan Cetak:</span>
                      <span className="text-[10px] text-slate-500">
                        {copies === 1 ? '1 Berkas Asli' : `${copies} Rangkap`}
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                        <button
                          type="button"
                          onClick={() => onSelectCopies(Math.max(1, copies - 1))}
                          className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 transition-colors border-r border-slate-200 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center font-bold text-slate-800 font-mono text-xs">
                          {copies}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectCopies(Math.min(10, copies + 1))}
                          className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 transition-colors border-l border-slate-200 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Diteruskan ke dialog printer
                      </span>
                    </div>
                  </div>

                  {/* Pengaturan Kerapatan Baris Tabel (Min Rows) */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 flex items-center justify-between">
                      <span>Kerapatan Baris Tabel:</span>
                      <span className="text-[10px] text-slate-500">Standar 1 Lembar</span>
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
                        className="text-blue-600 hover:text-blue-800 font-semibold text-xs flex items-center gap-1 cursor-pointer"
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
                        className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>{isExportingExcel ? 'Mengekspor Excel...' : 'Ekspor Laporan Excel (.xlsx)'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. SATU TOMBOL UTAMA: [Cetak / Download PDF] YANG MENCOLOK */}
            <button
              type="button"
              id="btn-central-print"
              onClick={onTriggerPrint}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer ring-2 ring-blue-600/30"
              title="Cetak dokumen aktif langsung ke printer atau unduh format PDF (Ctrl + P)"
            >
              <Printer className="w-4 h-4 text-white" />
              <span className="tracking-wide">Cetak / Download PDF</span>
              <kbd className="hidden lg:inline-block bg-blue-700/90 text-blue-100 text-[10px] font-mono px-1.5 py-0.5 rounded border border-blue-500/50">
                Ctrl+P
              </kbd>
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};
