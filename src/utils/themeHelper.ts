import { ThemeConfig, ThemeFontFamily, ThemeFontSize, ThemeMode, ThemePrimaryColor } from '../types';

export interface ColorPaletteItem {
  id: ThemePrimaryColor;
  label: string;
  name: string;
  hex: string;
  hoverHex: string;
  lightBgHex: string;
  darkBgHex: string;
  textColorHex: string;
  sampleBadgeClass: string;
}

export const THEME_COLOR_PALETTES: ColorPaletteItem[] = [
  {
    id: 'indigo',
    label: 'Indigo Modern',
    name: 'Indigo',
    hex: '#4f46e5',
    hoverHex: '#4338ca',
    lightBgHex: '#eef2ff',
    darkBgHex: '#312e81',
    textColorHex: '#3730a3',
    sampleBadgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  {
    id: 'blue',
    label: 'Classic Blue (Dinas)',
    name: 'Blue',
    hex: '#2563eb',
    hoverHex: '#1d4ed8',
    lightBgHex: '#eff6ff',
    darkBgHex: '#1e3a8a',
    textColorHex: '#1e40af',
    sampleBadgeClass: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    id: 'emerald',
    label: 'Emerald Green',
    name: 'Emerald',
    hex: '#059669',
    hoverHex: '#047857',
    lightBgHex: '#ecfdf5',
    darkBgHex: '#064e3b',
    textColorHex: '#065f46',
    sampleBadgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    id: 'purple',
    label: 'Royal Purple',
    name: 'Purple',
    hex: '#7c3aed',
    hoverHex: '#6d28d9',
    lightBgHex: '#f5f3ff',
    darkBgHex: '#4c1d95',
    textColorHex: '#5b21b6',
    sampleBadgeClass: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    id: 'amber',
    label: 'Amber Warm',
    name: 'Amber',
    hex: '#d97706',
    hoverHex: '#b45309',
    lightBgHex: '#fffbeb',
    darkBgHex: '#78350f',
    textColorHex: '#92400e',
    sampleBadgeClass: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    id: 'rose',
    label: 'Rose Crimson',
    name: 'Rose',
    hex: '#e11d48',
    hoverHex: '#be123c',
    lightBgHex: '#fff1f2',
    darkBgHex: '#881337',
    textColorHex: '#9f1239',
    sampleBadgeClass: 'bg-rose-100 text-rose-800 border-rose-200'
  },
  {
    id: 'slate',
    label: 'Slate Minimalist',
    name: 'Slate',
    hex: '#475569',
    hoverHex: '#334155',
    lightBgHex: '#f8fafc',
    darkBgHex: '#0f172a',
    textColorHex: '#1e293b',
    sampleBadgeClass: 'bg-slate-200 text-slate-800 border-slate-300'
  }
];

export const THEME_FONT_FAMILIES: { id: ThemeFontFamily; label: string; desc: string; sample: string; cssFont: string }[] = [
  {
    id: 'font-sans',
    label: 'Sans-Serif (Modern / Clean)',
    desc: 'Standar Plus Jakarta Sans & Inter yang bersih, tajam, dan mudah dibaca di layar digital.',
    sample: 'SIMBA SMAN 1 Cihaurbeuti 2026 • 123.450',
    cssFont: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  {
    id: 'font-serif',
    label: 'Serif (Formal Dokumen Kedinasan)',
    desc: 'Gaya huruf Times New Roman & Georgia klasik berwibawa khas tata naskah dinas resmi pemerintah.',
    sample: 'BERITA ACARA SERAH TERIMA • 2026',
    cssFont: "'Times New Roman', Georgia, Cambria, 'Liberation Serif', serif"
  },
  {
    id: 'font-mono',
    label: 'Monospace (Data & Kode Rekening)',
    desc: 'Tipografi JetBrains Mono berjarak tetap, sangat presisi untuk kode rekening, NUSP, dan nominal.',
    sample: '5.1.02.01.01.0024 • Rp 15.750.000',
    cssFont: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
  }
];

export const THEME_FONT_SIZES: { id: ThemeFontSize; label: string; desc: string; scaleFactor: string }[] = [
  {
    id: 'text-[11px]',
    label: 'Kompak / Ringkas (11px)',
    desc: 'Tampilan padat, menampilkan lebih banyak baris tabel dan data dalam satu pandangan layar.',
    scaleFactor: '0.92'
  },
  {
    id: 'text-xs',
    label: 'Standar / Normal (12px)',
    desc: 'Ukuran ideal seimbang untuk penggunaan harian operasional staf dan bendahara.',
    scaleFactor: '1.0'
  },
  {
    id: 'text-sm',
    label: 'Besar / Nyaman Dibaca (14px)',
    desc: 'Teks lebih besar dan kontras tinggi, sangat nyaman untuk monitor besar atau presentasi.',
    scaleFactor: '1.08'
  }
];

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  primaryColor: 'blue',
  darkMode: false,
  themeMode: 'light',
  fontFamily: 'font-sans',
  fontSize: 'text-xs'
};

const STORAGE_KEY = 'simba_theme_config';

/**
 * Retrieve saved Theme Configuration from browser localStorage
 */
export function getStoredThemeConfig(): ThemeConfig {
  if (typeof window === 'undefined') return DEFAULT_THEME_CONFIG;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_THEME_CONFIG;
    const parsed = JSON.parse(saved);
    return {
      primaryColor: parsed.primaryColor || 'blue',
      darkMode: Boolean(parsed.darkMode),
      themeMode: parsed.themeMode || (parsed.darkMode ? 'dark' : 'light'),
      fontFamily: parsed.fontFamily || 'font-sans',
      fontSize: parsed.fontSize || 'text-xs'
    };
  } catch (e) {
    console.error('Failed to parse simba_theme_config:', e);
    return DEFAULT_THEME_CONFIG;
  }
}

/**
 * Apply theme configuration directly to document root elements in real-time
 */
export function applyThemeConfig(config: ThemeConfig): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;

  // 1. Dark Mode Evaluation
  const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldBeDark = 
    config.themeMode === 'dark' || 
    (config.themeMode === 'system' && isSystemDark) || 
    (config.themeMode === undefined && config.darkMode);

  if (shouldBeDark) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }

  // 2. Primary Accent Color
  const palette = THEME_COLOR_PALETTES.find(p => p.id === config.primaryColor) || THEME_COLOR_PALETTES[1];
  root.setAttribute('data-primary-color', config.primaryColor);
  root.style.setProperty('--simba-primary', palette.hex);
  root.style.setProperty('--simba-primary-hover', palette.hoverHex);
  root.style.setProperty('--simba-primary-light', palette.lightBgHex);
  root.style.setProperty('--simba-primary-dark', palette.darkBgHex);
  root.style.setProperty('--simba-primary-text', palette.textColorHex);

  // 3. Font Family
  const fontObj = THEME_FONT_FAMILIES.find(f => f.id === config.fontFamily) || THEME_FONT_FAMILIES[0];
  root.setAttribute('data-font-family', config.fontFamily);
  root.style.setProperty('--simba-font-family', fontObj.cssFont);

  // Remove existing font classes on body and apply new one
  body.classList.remove('font-sans', 'font-serif', 'font-mono');
  body.classList.add(config.fontFamily);

  // 4. Font Scaling
  const sizeObj = THEME_FONT_SIZES.find(s => s.id === config.fontSize) || THEME_FONT_SIZES[1];
  root.setAttribute('data-font-size', config.fontSize);
  root.style.setProperty('--simba-font-scale', sizeObj.scaleFactor);

  // Update body classes for font scale
  body.classList.remove('font-scale-compact', 'font-scale-normal', 'font-scale-large');
  if (config.fontSize === 'text-[11px]') {
    body.classList.add('font-scale-compact');
  } else if (config.fontSize === 'text-sm') {
    body.classList.add('font-scale-large');
  } else {
    body.classList.add('font-scale-normal');
  }
}

/**
 * Save theme configuration to localStorage and immediately broadcast live visual update
 */
export function saveStoredThemeConfig(config: ThemeConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    applyThemeConfig(config);
  } catch (e) {
    console.error('Failed to save simba_theme_config:', e);
  }
}
