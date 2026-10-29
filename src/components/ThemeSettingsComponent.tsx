import { 
  Check, 
  CheckCircle2, 
  Laptop, 
  Moon, 
  Palette, 
  RefreshCcw, 
  Save, 
  Sparkles, 
  Sun, 
  Type
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ThemeConfig, ThemeFontFamily, ThemeFontSize, ThemeMode, ThemePrimaryColor } from '../types';
import { 
  DEFAULT_THEME_CONFIG, 
  getStoredThemeConfig, 
  saveStoredThemeConfig, 
  THEME_COLOR_PALETTES, 
  THEME_FONT_FAMILIES, 
  THEME_FONT_SIZES 
} from '../utils/themeHelper';

interface Props {
  onShowToast?: (message: string) => void;
  onThemeChanged?: (config: ThemeConfig) => void;
}

export const ThemeSettingsComponent: React.FC<Props> = ({
  onShowToast,
  onThemeChanged
}) => {
  // Theme Configuration State initialized from localStorage
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => getStoredThemeConfig());
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Live preview effect: apply changes to document root immediately
  useEffect(() => {
    saveStoredThemeConfig(themeConfig);
    if (onThemeChanged) {
      onThemeChanged(themeConfig);
    }
  }, [themeConfig, onThemeChanged]);

  const activePalette = THEME_COLOR_PALETTES.find(p => p.id === themeConfig.primaryColor) || THEME_COLOR_PALETTES[1];
  const activeFont = THEME_FONT_FAMILIES.find(f => f.id === themeConfig.fontFamily) || THEME_FONT_FAMILIES[0];
  const activeSize = THEME_FONT_SIZES.find(s => s.id === themeConfig.fontSize) || THEME_FONT_SIZES[1];

  const handleModeChange = (mode: ThemeMode) => {
    setThemeConfig(prev => ({
      ...prev,
      themeMode: mode,
      darkMode: mode === 'dark'
    }));
  };

  const handleColorChange = (color: ThemePrimaryColor) => {
    setThemeConfig(prev => ({
      ...prev,
      primaryColor: color
    }));
  };

  const handleFontChange = (font: ThemeFontFamily) => {
    setThemeConfig(prev => ({
      ...prev,
      fontFamily: font
    }));
  };

  const handleSizeChange = (size: ThemeFontSize) => {
    setThemeConfig(prev => ({
      ...prev,
      fontSize: size
    }));
  };

  const handleResetDefault = () => {
    if (confirm('Kembalikan seluruh pengaturan tema ke standar bawaan aplikasi?')) {
      setThemeConfig(DEFAULT_THEME_CONFIG);
      if (onShowToast) {
        onShowToast('Tema dikembalikan ke setelan standar sistem.');
      }
    }
  };

  const handleManualSave = () => {
    saveStoredThemeConfig(themeConfig);
    setSavedSuccess(true);
    if (onShowToast) {
      onShowToast('Preferensi tema & gaya visual berhasil disimpan ke penyimpanan browser!');
    }
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: activePalette.hex }}>
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              Pengaturan Tema &amp; Gaya Tampilan
              <span className="text-[10px] bg-white/20 text-white font-mono px-2 py-0.5 rounded-full uppercase tracking-wider">
                Live Preview
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Sesuaikan skema warna aksen, mode pencahayaan (Dark/Light), tipografi dinas, dan skala teks aplikasi SIMBA.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetDefault}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/20 transition-colors self-start sm:self-auto cursor-pointer"
          title="Reset ke Tema Bawaan"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          <span>Reset Default</span>
        </button>
      </div>

      {/* Main Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* 1. SKEMA WARNA AKSEN UTAMA */}
        <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-500" />
                <span>1. Skema Warna Aksen Utama (Primary Color)</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 capitalize">
                Aktif: <strong className="text-slate-800 dark:text-slate-200">{activePalette.label}</strong>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
              Warna aksen diterapkan pada tombol aksi primer, tab aktif, sorotan baris tabel, dan elemen interaktif.
            </p>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
              {THEME_COLOR_PALETTES.map((color) => {
                const isSelected = themeConfig.primaryColor === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => handleColorChange(color.id)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-slate-900 dark:border-white bg-slate-100/80 dark:bg-slate-700/80 shadow-xs' 
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    title={color.label}
                  >
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-2xs transition-transform hover:scale-110"
                      style={{ backgroundColor: color.hex }}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                    <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 text-center leading-tight">
                      {color.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. MODE TAMPILAN (DARK / LIGHT / SYSTEM) */}
        <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>2. Mode Tampilan (Pencahayaan Layar)</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Pilihan Pengguna
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
              Gunakan mode gelap untuk meredakan ketegangan mata di ruangan minim cahaya atau malam hari.
            </p>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Light Mode */}
              <button
                type="button"
                onClick={() => handleModeChange('light')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                  themeConfig.themeMode === 'light'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Sun className="w-4 h-4" />
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold">Light Mode</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Terang &amp; Bersih</div>
                </div>
              </button>

              {/* Dark Mode */}
              <button
                type="button"
                onClick={() => handleModeChange('dark')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                  themeConfig.themeMode === 'dark'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 shadow-xs ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-slate-200 flex items-center justify-center">
                  <Moon className="w-4 h-4" />
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold">Dark Mode</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Gelap &amp; Elegan</div>
                </div>
              </button>

              {/* System Auto Mode */}
              <button
                type="button"
                onClick={() => handleModeChange('system')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                  themeConfig.themeMode === 'system'
                    ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 shadow-xs ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center">
                  <Laptop className="w-4 h-4" />
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold">Auto Sistem</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Ikuti OS Device</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* 3. GAYA HURUF / FONT FAMILY */}
        <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Type className="w-4 h-4 text-emerald-500" />
              <span>3. Gaya Huruf (Tipografi Antarmuka)</span>
            </label>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Font Stack
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
            Pilih font visual aplikasi. Tipografi cetak dokumen fisik (A4/F4) tetap mempertahankan format kedinasan resmi.
          </p>

          <div className="space-y-2">
            {THEME_FONT_FAMILIES.map((font) => {
              const isSelected = themeConfig.fontFamily === font.id;
              return (
                <div
                  key={font.id}
                  onClick={() => handleFontChange(font.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-400 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold text-slate-900 dark:text-white ${font.id}`}>
                        {font.label}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-semibold px-2 py-0.2 rounded-full">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {font.desc}
                    </p>
                    <p className={`text-[11px] font-medium text-slate-700 dark:text-slate-300 pt-0.5 ${font.id}`}>
                      {font.sample}
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. UKURAN SKALA TEKS (FONT SCALING) */}
        <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span>4. Skala Ukuran Teks (Font Scaling)</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Skala Layar
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
              Menyesuaikan kerapatan font di layar untuk kenyamanan membaca atau memaksimalkan ruang kerja monitor.
            </p>

            <div className="space-y-2.5">
              {THEME_FONT_SIZES.map((size) => {
                const isSelected = themeConfig.fontSize === size.id;
                return (
                  <label
                    key={size.id}
                    onClick={() => handleSizeChange(size.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/40 ring-1 ring-purple-400 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-slate-900 dark:text-white ${size.id === 'text-[11px]' ? 'text-[11px]' : size.id === 'text-sm' ? 'text-sm' : 'text-xs'}`}>
                          {size.label}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 font-semibold px-2 py-0.2 rounded-full">
                            Skala {size.scaleFactor}x
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {size.desc}
                      </p>
                    </div>

                    <input
                      type="radio"
                      name="themeFontSize"
                      checked={isSelected}
                      onChange={() => handleSizeChange(size.id)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE LIVE PREVIEW CARD */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: activePalette.hex }} />
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Pratinjau Langsung (Live Interactive Preview)
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Aksen: <strong className="text-slate-800 dark:text-slate-200">{activePalette.name}</strong> • Font: <strong className="text-slate-800 dark:text-slate-200">{activeFont.label.split(' ')[0]}</strong> • Skala: <strong className="text-slate-800 dark:text-slate-200">{activeSize.label.split(' ')[0]}</strong>
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          {/* Mockup Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 inline-flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: activePalette.hex }}
              >
                <span>+ Catat Transaksi Baru</span>
              </button>

              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Filter Tahun 2026
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${activePalette.sampleBadgeClass}`}>
                BHP Belanja Operasional
              </span>
              <span className="text-[11px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-md font-semibold">
                NUSP: 5.1.02.01.01.0024
              </span>
            </div>
          </div>

          {/* Mockup Table Row */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 px-3">Kode Barang</th>
                  <th className="py-2 px-3">Nama Spesifikasi Barang</th>
                  <th className="py-2 px-3">Kategori Rekening</th>
                  <th className="py-2 px-3 text-right">Saldo Stok</th>
                  <th className="py-2 px-3 text-right">Nilai Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-2 px-3 font-mono">BRG-2026-001</td>
                  <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">Kertas HVS A4 75gr PaperOne</td>
                  <td className="py-2 px-3">Alat Tulis Kantor (BHP)</td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">45 Rim</td>
                  <td className="py-2 px-3 text-right font-mono font-semibold">Rp 2.475.000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200 dark:border-slate-700">
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Perubahan langsung aktif secara real-time dan tersimpan permanen di perangkat browser ini.
        </p>
        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Tersimpan!
            </span>
          )}
          <button
            type="button"
            onClick={handleManualSave}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-95 transition-all inline-flex items-center gap-1.5 cursor-pointer"
            style={{ backgroundColor: activePalette.hex }}
          >
            <Save className="w-4 h-4" />
            <span>Simpan Preferensi Tema</span>
          </button>
        </div>
      </div>

    </div>
  );
};
