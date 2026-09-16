import { NumberingPatternConfig } from '../types';

export const MONTHS_ROMAN = [
  'I', 'II', 'III', 'IV', 'V', 'VI',
  'VII', 'VIII', 'IX', 'X', 'XI', 'XII'
];

export const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const DAYS_ID = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

export const ANGKA_KATA = [
  '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
];

export const DEFAULT_NUMBERING_PATTERN: NumberingPatternConfig = {
  schoolCode: 'SMKN1-KP',
  patternNPB: '{NO}/NPB/{SEKOLAH}/{BULAN_ROMAN}/{TAHUN}',
  patternSPB: '421.3/{NO}/SPB-{SEKOLAH}/{BULAN_ROMAN}/{TAHUN}',
  patternSPPB: '028/{NO}/SPPB-{SEKOLAH}/{BULAN_ROMAN}/{TAHUN}',
  patternBAST: '028/{NO}/BAST-{SEKOLAH}/{BULAN_ROMAN}/{TAHUN}',
  patternBASO: '028/{NO}/BAST-SO-BOS/{BULAN_ROMAN}/{TAHUN}',
  startCounterNPB: 12,
  startCounterSPB: 9,
  startCounterSPPB: 8,
  startCounterBAST: 7,
  startCounterBASO: 1,
};

export const DEFAULT_NUMBERING_CONFIG = DEFAULT_NUMBERING_PATTERN;

/**
 * Intelligently derive a clean short school code from a school name
 * e.g. "SMK NEGERI 1 KOTA PENDIDIKAN" -> "SMKN1-KP"
 * e.g. "SMAN 1 CIRANJANG BARAT" -> "SMAN1-CHRBT"
 * e.g. "SMP NEGERI 2 BANDUNG" -> "SMPN2-BDG"
 */
export function deriveSchoolCode(namaSekolah?: string, fallback: string = 'SEKOLAH'): string {
  if (!namaSekolah || !namaSekolah.trim()) return fallback;
  const clean = namaSekolah.trim();
  const words = clean.replace(/[^\w\s]/gi, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return fallback;

  // If already a single concise code (<= 12 chars)
  if (words.length === 1 && clean.length <= 12) {
    return clean.toUpperCase();
  }

  let prefix = '';
  let remainingWords = [...words];

  const w0 = words[0]?.toUpperCase() || '';
  const w1 = words[1]?.toUpperCase() || '';
  const w2 = words[2]?.toUpperCase() || '';

  if (['SMK', 'SMA', 'SMP', 'SD'].includes(w0)) {
    if (w1 === 'NEGERI' && /^\d+$/.test(w2)) {
      prefix = `${w0}N${w2}`;
      remainingWords = words.slice(3);
    } else if (w1 === 'NEGERI') {
      prefix = `${w0}N`;
      remainingWords = words.slice(2);
    } else if (/^\d+$/.test(w1)) {
      prefix = `${w0}${w1}`;
      remainingWords = words.slice(2);
    } else {
      prefix = w0;
      remainingWords = words.slice(1);
    }
  }

  if (remainingWords.length > 0) {
    const suffix = remainingWords.map(w => {
      if (/^\d+$/.test(w)) return w;
      if (w.length <= 3) return w;
      return w.substring(0, 3);
    }).join('').toUpperCase();
    return `${prefix ? prefix + (prefix.length > 5 ? '-' : '') : ''}${suffix}`.substring(0, 15);
  }

  return prefix || fallback;
}

/**
 * Convert number to Indonesian words (terbilang)
 */
export function terbilang(n: number): string {
  if (n < 0) return 'Minus ' + terbilang(Math.abs(n));
  if (n === 0) return 'Nol';
  if (n < 12) {
    return ANGKA_KATA[n];
  } else if (n < 20) {
    return terbilang(n - 10) + ' Belas';
  } else if (n < 100) {
    return terbilang(Math.floor(n / 10)) + ' Puluh ' + (n % 10 !== 0 ? terbilang(n % 10) : '');
  } else if (n < 200) {
    return 'Seratus ' + (n - 100 !== 0 ? terbilang(n - 100) : '');
  } else if (n < 1000) {
    return terbilang(Math.floor(n / 100)) + ' Ratus ' + (n % 100 !== 0 ? terbilang(n % 100) : '');
  } else if (n < 2000) {
    return 'Seribu ' + (n - 1000 !== 0 ? terbilang(n - 1000) : '');
  } else if (n < 1000000) {
    return terbilang(Math.floor(n / 1000)) + ' Ribu ' + (n % 1000 !== 0 ? terbilang(n % 1000) : '');
  } else if (n < 1000000000) {
    return terbilang(Math.floor(n / 1000000)) + ' Juta ' + (n % 1000000 !== 0 ? terbilang(n % 1000000) : '');
  } else if (n < 1000000000000) {
    return terbilang(Math.floor(n / 1000000000)) + ' Miliar ' + (n % 1000000000 !== 0 ? terbilang(n % 1000000000) : '');
  }
  return n.toString();
}

/**
 * Format currency to IDR
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format plain date to formal Indonesian string: "12 September 2026"
 */
export function formatTanggalIndonesia(dateString: string): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = d.getDate();
  const month = MONTHS_ID[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format full date with day name: "Kamis, 12 September 2026"
 */
export function formatHariTanggalIndonesia(dateString: string): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const dayName = DAYS_ID[d.getDay()];
  const day = d.getDate();
  const month = MONTHS_ID[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${day} ${month} ${year}`;
}

/**
 * Formal BAST opening sentence in Indonesian:
 * "Pada hari ini Kamis tanggal Tiga bulan September tahun Dua Ribu Dua Puluh Enam..."
 */
export function getKalimatBast(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'Pada hari ini kami yang bertanda tangan di bawah ini:';
  
  const dayName = DAYS_ID[d.getDay()];
  const dayWord = terbilang(d.getDate()).trim();
  const monthName = MONTHS_ID[d.getMonth()];
  const yearWord = terbilang(d.getFullYear()).trim();
  
  return `Pada hari ini ${dayName} tanggal ${dayWord} bulan ${monthName} tahun ${yearWord}, yang bertanda tangan di bawah ini:`;
}

/**
 * Formal Stock Opname opening sentence in Indonesian:
 * "Pada hari ini Senin tanggal Tiga Puluh Satu Bulan Agustus Tahun Dua Ribu Dua Puluh Enam, bertempat di [Nama Sekolah], kami yang bertanda tangan di bawah ini:"
 */
export function getKalimatStockOpname(dateString: string, namaSekolah: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return `Pada hari ini bertempat di ${namaSekolah}, kami yang bertanda tangan di bawah ini:`;
  
  const dayName = DAYS_ID[d.getDay()];
  const dayWord = terbilang(d.getDate()).trim();
  const monthName = MONTHS_ID[d.getMonth()];
  const yearWord = terbilang(d.getFullYear()).trim();
  
  return `Pada hari ini ${dayName} tanggal ${dayWord} Bulan ${monthName} Tahun ${yearWord}, bertempat di ${namaSekolah}, kami yang bertanda tangan di bawah ini:`;
}

export interface DocumentCounters {
  npb: number;
  spb: number;
  sppb: number;
  bast: number;
  baso?: number;
}

/**
 * Extract sequence number from an existing document string, e.g. "001", "421.3/009/SPB-...", "028/008/SPPB-..."
 * Reliably ignores classification codes (028, 421, 421.3, 900) and year tokens.
 */
export function extractDocSequenceNumber(
  docNo: string,
  docType?: 'NPB' | 'SPB' | 'SPPB' | 'BAST' | 'BASO',
  patternTemplate?: string
): number | null {
  if (!docNo || typeof docNo !== 'string') return null;
  const trimmed = docNo.trim();
  if (!trimmed) return null;

  // 1. If patternTemplate is provided and contains {NO}, try template matching
  if (patternTemplate && patternTemplate.includes('{NO}')) {
    try {
      const escaped = patternTemplate
        .replace(/[.+^$[\]\\(){}|]/g, '\\$&')
        .replace(/\\\{NO\\\}/gi, '(\\d+)')
        .replace(/\\\{NO_RAW\\\}/gi, '(\\d+)')
        .replace(/\\\{[^}]+\\\}/g, '[^/\\-\\s]+');
      const patternRegex = new RegExp(`(?:^|\\b)${escaped}(?:$|\\b)`, 'i');
      const match = trimmed.match(patternRegex);
      if (match && match[1]) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > 0) return val;
      }
    } catch {
      // ignore regex construction errors and proceed to heuristics
    }
  }

  // 2. High-precision extraction by document type relative position
  if (docType === 'SPB') {
    // 421.3/009/SPB-... -> capture 009 right before /SPB
    const m1 = trimmed.match(/(?:^|\/|\-)(\d{1,6})(?:\/|\-)SPB/i);
    if (m1) return parseInt(m1[1], 10);
    const m2 = trimmed.match(/SPB(?:\/|\-)(\d{1,6})/i);
    if (m2) return parseInt(m2[1], 10);
  }

  if (docType === 'SPPB') {
    // 028/008/SPPB-... -> capture 008 right before /SPPB
    const m1 = trimmed.match(/(?:^|\/|\-)(\d{1,6})(?:\/|\-)SPPB/i);
    if (m1) return parseInt(m1[1], 10);
    const m2 = trimmed.match(/SPPB(?:\/|\-)(\d{1,6})/i);
    if (m2) return parseInt(m2[1], 10);
  }

  if (docType === 'BAST') {
    // 028/007/BAST-... -> capture 007 right before /BAST
    const m1 = trimmed.match(/(?:^|\/|\-)(\d{1,6})(?:\/|\-)BAST(?!\-SO)/i);
    if (m1) return parseInt(m1[1], 10);
    const m2 = trimmed.match(/BAST(?!\-SO)(?:\/|\-)(\d{1,6})/i);
    if (m2) return parseInt(m2[1], 10);
  }

  if (docType === 'NPB') {
    // 012/NPB/... -> capture 012 right before /NPB
    const m1 = trimmed.match(/(?:^|\/|\-)(\d{1,6})(?:\/|\-)NPB/i);
    if (m1) return parseInt(m1[1], 10);
    const m2 = trimmed.match(/NPB(?:\/|\-)(\d{1,6})/i);
    if (m2) return parseInt(m2[1], 10);
  }

  if (docType === 'BASO') {
    const m1 = trimmed.match(/(?:^|\/|\-)(\d{1,6})(?:\/|\-)(?:BAST\-SO|BA\-SO)/i);
    if (m1) return parseInt(m1[1], 10);
    const m2 = trimmed.match(/(?:BAST\-SO|BA\-SO)(?:\/|\-)(\d{1,6})/i);
    if (m2) return parseInt(m2[1], 10);
  }

  // 3. Fallback: Parse segments between slashes
  const segments = trimmed.split('/');
  for (const seg of segments) {
    const cleanSeg = seg.trim();
    if (/^\d{1,5}$/.test(cleanSeg)) {
      const num = parseInt(cleanSeg, 10);
      // Skip known administrative classification codes
      if (['028', '421', '900', '005', '800', '420'].includes(cleanSeg)) continue;
      // Skip 4-digit years
      if (num >= 2020 && num <= 2040) continue;
      if (num > 0) return num;
    }
  }

  // 4. Standalone match ignoring common codes
  const allMatches = Array.from(trimmed.matchAll(/(?:^|[\/\-\.\s])(\d{1,5})(?:[\/\-\.\s]|$)/g));
  for (const match of allMatches) {
    const val = parseInt(match[1], 10);
    if (['028', '421', '900', '005'].includes(match[1])) continue;
    if (val >= 2020 && val <= 2040) continue;
    if (val > 0) return val;
  }

  return null;
}

/**
 * Calculate independent auto-increment counters for each document type based on previous records.
 * Each document type (NPB, SPB, SPPB, BAST) scans its respective field independently,
 * ensuring document registers never share a uniform number.
 */
export function calculateNextDocumentCounters(
  transaksiList: { noNPB?: string; noSPB?: string; noSPPB?: string; noBAST?: string; nomorUrut?: number }[],
  config?: Partial<NumberingPatternConfig>
): DocumentCounters {
  let maxNPB = 0;
  let maxSPB = 0;
  let maxSPPB = 0;
  let maxBAST = 0;
  let maxBASO = 0;

  if (Array.isArray(transaksiList)) {
    transaksiList.forEach((t) => {
      // 1. NPB
      if (t.noNPB) {
        const num = extractDocSequenceNumber(t.noNPB, 'NPB', config?.patternNPB);
        if (num !== null && num > maxNPB) maxNPB = num;
      }
      // 2. SPB
      if (t.noSPB) {
        const num = extractDocSequenceNumber(t.noSPB, 'SPB', config?.patternSPB);
        if (num !== null && num > maxSPB) maxSPB = num;
      }
      // 3. SPPB
      if (t.noSPPB) {
        const num = extractDocSequenceNumber(t.noSPPB, 'SPPB', config?.patternSPPB);
        if (num !== null && num > maxSPPB) maxSPPB = num;
      }
      // 4. BAST
      if (t.noBAST) {
        const num = extractDocSequenceNumber(t.noBAST, 'BAST', config?.patternBAST);
        if (num !== null && num > maxBAST) maxBAST = num;
      }
    });
  }

  // Check if manual starting counter offsets are configured
  const startNPB = config?.startCounterNPB || 1;
  const startSPB = config?.startCounterSPB || 1;
  const startSPPB = config?.startCounterSPPB || 1;
  const startBAST = config?.startCounterBAST || 1;
  const startBASO = config?.startCounterBASO || 1;

  return {
    npb: Math.max(startNPB, maxNPB > 0 ? maxNPB + 1 : startNPB),
    spb: Math.max(startSPB, maxSPB > 0 ? maxSPB + 1 : startSPB),
    sppb: Math.max(startSPPB, maxSPPB > 0 ? maxSPPB + 1 : startSPPB),
    bast: Math.max(startBAST, maxBAST > 0 ? maxBAST + 1 : startBAST),
    baso: Math.max(startBASO, maxBASO > 0 ? maxBASO + 1 : startBASO)
  };
}

/**
 * Dynamic parser for document numbering pattern
 * Reads {SEKOLAH} dynamically from settings without any hardcoded text.
 * Variables: {NO}, {NO_RAW}, {KODE_DOK}, {SEKOLAH}, {KODE_SEKOLAH}, {INSTANSI}, {KODE_INSTANSI}, {NAMA_SEKOLAH}, {BULAN_ROMAN}, {BULAN}, {TAHUN}, {TANGGAL}
 */
export function parseDynamicNumber(
  pattern: string,
  counter: number,
  dateString: string,
  schoolCode: string,
  docCode: string,
  fullSchoolName?: string
): string {
  const d = new Date(dateString || new Date());
  const year = isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  const monthIndex = isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth();
  const monthNumber = String(monthIndex + 1).padStart(2, '0');
  const romanMonth = MONTHS_ROMAN[monthIndex] || 'I';
  const dayNumber = isNaN(d.getTime()) ? String(new Date().getDate()).padStart(2, '0') : String(d.getDate()).padStart(2, '0');
  const paddedNo = String(counter).padStart(3, '0');
  const rawNo = String(counter);

  // Dynamic school code: read schoolCode or derive from fullSchoolName dynamically without hardcoding
  const cleanSchool = (schoolCode || deriveSchoolCode(fullSchoolName) || 'SEKOLAH').trim();
  const cleanFullName = (fullSchoolName || '').trim();

  // Replace case-insensitive tokens
  let result = pattern
    .replace(/\{NO_SPB\}/gi, paddedNo)
    .replace(/\{NO_NPB\}/gi, paddedNo)
    .replace(/\{NO_SPPB\}/gi, paddedNo)
    .replace(/\{NO_BAST\}/gi, paddedNo)
    .replace(/\{NO_BASO\}/gi, paddedNo)
    .replace(/\{NO\}/gi, paddedNo)
    .replace(/\{NO_RAW\}/gi, rawNo)
    .replace(/\{KODE_DOK\}/gi, docCode)
    .replace(/\{KODE_SEKOLAH\}/gi, cleanSchool)
    .replace(/\{SEKOLAH\}/gi, cleanSchool)
    .replace(/\{KODE_INSTANSI\}/gi, cleanSchool)
    .replace(/\{INSTANSI\}/gi, cleanSchool)
    .replace(/\{NAMA_SEKOLAH\}/gi, cleanFullName || cleanSchool)
    .replace(/\{BULAN_ROMAN\}/gi, romanMonth)
    .replace(/\{BULAN\}/gi, monthNumber)
    .replace(/\{TAHUN\}/gi, String(year))
    .replace(/\{TANGGAL\}/gi, dayNumber);

  return result;
}

/**
 * Generate linked sequential document numbers based on dynamic pattern
 * Supports independent auto-increment counters per document type
 */
export function generateDocumentNumbers(
  counter: number | Partial<DocumentCounters>,
  dateString: string,
  schoolShort?: string,
  patterns?: Partial<NumberingPatternConfig>,
  fullSchoolName?: string
) {
  const effectiveSchool = patterns?.schoolCode || schoolShort || deriveSchoolCode(fullSchoolName) || DEFAULT_NUMBERING_PATTERN.schoolCode;
  const cfg = {
    ...DEFAULT_NUMBERING_PATTERN,
    ...patterns,
    schoolCode: effectiveSchool
  };

  const npbCounter = typeof counter === 'number' ? counter : (counter.npb ?? 1);
  const spbCounter = typeof counter === 'number' ? counter : (counter.spb ?? 1);
  const sppbCounter = typeof counter === 'number' ? counter : (counter.sppb ?? 1);
  const bastCounter = typeof counter === 'number' ? counter : (counter.bast ?? 1);
  const basoCounter = typeof counter === 'number' ? counter : (counter.baso ?? 1);

  return {
    noNPB: parseDynamicNumber(cfg.patternNPB, npbCounter, dateString, cfg.schoolCode, 'NPB', fullSchoolName),
    noSPB: parseDynamicNumber(cfg.patternSPB, spbCounter, dateString, cfg.schoolCode, 'SPB', fullSchoolName),
    noSPPB: parseDynamicNumber(cfg.patternSPPB, sppbCounter, dateString, cfg.schoolCode, 'SPPB', fullSchoolName),
    noBAST: parseDynamicNumber(cfg.patternBAST, bastCounter, dateString, cfg.schoolCode, 'BAST', fullSchoolName),
    noBASO: parseDynamicNumber(cfg.patternBASO, basoCounter, dateString, cfg.schoolCode, 'BA-SO', fullSchoolName)
  };
}
