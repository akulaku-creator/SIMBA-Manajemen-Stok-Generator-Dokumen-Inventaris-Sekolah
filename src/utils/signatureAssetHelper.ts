import { KopSuratConfig } from '../types';
import { sanitizeImageUrl } from './urlSanitizer';

const ALLOWED_RASTER_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

/**
 * Process and optimize uploaded signature or stamp image (PNG transparent recommended)
 * Preserves alpha transparency while resizing oversized images so localStorage stays lean.
 */
export async function processTransparentPngUpload(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    maxFileSizeMB?: number;
  } = {}
): Promise<{ dataUrl: string; isPng: boolean; width: number; height: number }> {
  const maxFileSizeMB = options.maxFileSizeMB ?? 5;
  const maxWidth = options.maxWidth ?? 480;
  const maxHeight = options.maxHeight ?? 320;

  if (!ALLOWED_RASTER_IMAGE_TYPES.has(file.type.toLowerCase())) {
    throw new Error('Berkas harus berupa gambar PNG, JPG, WebP, atau GIF (direkomendasikan .PNG transparan).');
  }

  if (file.size > maxFileSizeMB * 1024 * 1024) {
    throw new Error(`Ukuran gambar maksimal ${maxFileSizeMB}MB.`);
  }

  const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.readAsDataURL(file);
  });

  // Load into Image element to resize cleanly while preserving PNG transparency
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let targetWidth = img.naturalWidth || maxWidth;
      let targetHeight = img.naturalHeight || maxHeight;

      if (targetWidth > maxWidth || targetHeight > maxHeight) {
        const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
        targetWidth = Math.max(1, Math.round(targetWidth * ratio));
        targetHeight = Math.max(1, Math.round(targetHeight * ratio));
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl: rawDataUrl, isPng, width: targetWidth, height: targetHeight });
        return;
      }

      ctx.clearRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Export as PNG to preserve alpha transparency
      const optimizedDataUrl = canvas.toDataURL('image/png');
      resolve({
        dataUrl: optimizedDataUrl.length < rawDataUrl.length ? optimizedDataUrl : rawDataUrl,
        isPng,
        width: targetWidth,
        height: targetHeight
      });
    };
    img.onerror = () => reject(new Error('Gagal memproses dimensi gambar.'));
    img.src = rawDataUrl;
  });
}

/**
 * Determine if the institutional stamp should be rendered for a given signatory role
 */
export function resolveStampUrlForRole(
  kopConfig: KopSuratConfig | undefined,
  role: 'kepala_sekolah' | 'pengurus_barang' | 'bendahara_bos' | 'sarpras' | 'pemohon',
  isSingleOfficialDoc: boolean = false
): string | undefined {
  const safeStampUrl = sanitizeImageUrl(kopConfig?.stempelUrl);
  if (!safeStampUrl || kopConfig?.tampilkanStempel === false) {
    return undefined;
  }
  if (role === 'pemohon') {
    // Unit pemohon / penerima internal tidak memakai stempel instansi
    return undefined;
  }
  if (kopConfig?.stempelMode === 'all_officials') {
    return safeStampUrl;
  }
  // Default ('kepsek_and_single'): Kepala Sekolah selalu mendapat stempel, atau pejabat tunggal di dokumen tunggal (Kartu Barang, SPPB)
  if (role === 'kepala_sekolah' || isSingleOfficialDoc) {
    return safeStampUrl;
  }
  return undefined;
}
