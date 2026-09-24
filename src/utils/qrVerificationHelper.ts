import QRCode from 'qrcode';
import { KopSuratConfig, TransaksiPengeluaran } from '../types';

export type DocTypeShort = 'NPB' | 'SPB' | 'SPPB' | 'BAST';

export interface VerificationData {
  docType: DocTypeShort;
  docTypeName: string;
  docNumber: string;
  transaksiId: string;
  verificationCode: string;
  tanggal: string;
  unitPemohon: string;
  keperluan: string;
  namaSekolah: string;
  verificationUrl: string;
  itemCount: number;
}

/**
 * Returns full name for each document type
 */
export function getDocTypeName(type: DocTypeShort): string {
  switch (type) {
    case 'NPB':
      return 'Nota Permintaan Barang (NPB)';
    case 'SPB':
      return 'Surat Permintaan Barang (SPB)';
    case 'SPPB':
      return 'Surat Perintah Penyaluran Barang (SPPB)';
    case 'BAST':
      return 'Berita Acara Serah Terima (BAST)';
    default:
      return 'Dokumen Resmi SIMBA';
  }
}

/**
 * Generates a deterministic, unique verification hash from transaction and document info
 */
function generateDeterministicHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(6, '0');
  return hex.slice(0, 6);
}

/**
 * Generates official verification code format: SIMBA-[DOCTYPE]-[YYYYMM]-[HASH]
 * Example: SIMBA-NPB-202609-A3F9C1
 */
export function generateVerificationCode(
  docType: DocTypeShort,
  transaksi: TransaksiPengeluaran,
  docNumber: string
): string {
  const dateStr = (transaksi.tanggal || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const ym = dateStr.slice(0, 6);
  const rawSeed = `${transaksi.id}_${docType}_${docNumber}_${transaksi.unitPemohon}_${transaksi.tanggal}`;
  const hash = generateDeterministicHash(rawSeed);
  return `SIMBA-${docType}-${ym}-${hash}`;
}

/**
 * Constructs the canonical verification URL
 */
export function getVerificationUrl(
  docType: DocTypeShort,
  transaksi: TransaksiPengeluaran,
  docNumber: string
): string {
  const verifCode = generateVerificationCode(docType, transaksi, docNumber);
  
  // Use window origin when available, or fallback
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://simba-app.web.app';
  
  const params = new URLSearchParams({
    verify: 'doc',
    type: docType.toLowerCase(),
    id: transaksi.id,
    no: docNumber || '',
    code: verifCode,
    t: (transaksi.tanggal || '').slice(0, 10)
  });

  return `${origin}/?${params.toString()}`;
}

/**
 * Compiles complete verification metadata for display
 */
export function buildVerificationData(
  docType: DocTypeShort,
  transaksi: TransaksiPengeluaran,
  docNumber: string,
  kopConfig?: KopSuratConfig
): VerificationData {
  const verificationCode = generateVerificationCode(docType, transaksi, docNumber);
  const verificationUrl = getVerificationUrl(docType, transaksi, docNumber);

  return {
    docType,
    docTypeName: getDocTypeName(docType),
    docNumber,
    transaksiId: transaksi.id,
    verificationCode,
    tanggal: transaksi.tanggal,
    unitPemohon: transaksi.unitPemohon || '-',
    keperluan: transaksi.keperluanUmum || '-',
    namaSekolah: kopConfig?.namaSekolah || 'Satuan Pendidikan Resmi',
    verificationUrl,
    itemCount: transaksi.items ? transaksi.items.length : 0
  };
}

/**
 * Asynchronously generates high-res data URL for QR Code
 */
export async function generateQRCodeDataUrl(
  text: string,
  options?: {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: options?.width || 200,
    margin: options?.margin ?? 1,
    errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });
}
