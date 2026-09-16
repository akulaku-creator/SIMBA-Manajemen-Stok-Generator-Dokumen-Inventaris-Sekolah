/**
 * SIMBA Document Print & PDF Export Utility
 * Standardized for Indonesian Government Official Documents (A4 & F4)
 * Handles clean print invocation, dynamic document title for PDF file naming,
 * and eliminates right/bottom margin clipping during HTML-to-PDF generation.
 */

export interface PrintDocumentOptions {
  documentType: string;
  nomorSurat?: string;
  namaSekolah?: string;
  paperSize?: 'A4' | 'F4';
  orientation?: 'portrait' | 'landscape';
}

/**
 * Generates an official, clean PDF filename
 * Example: SIMBA_NPB_001_SMKN1_2025.pdf
 */
export function generatePdfFilename(options: PrintDocumentOptions): string {
  const sanitize = (str: string) => str.replace(/[/\\?%*:|"<> \.]+/g, '_');
  const typeCode = (options.documentType || 'DOKUMEN').toUpperCase();
  const nomor = options.nomorSurat ? `_${sanitize(options.nomorSurat)}` : '';
  const sekolah = options.namaSekolah ? `_${sanitize(options.namaSekolah).substring(0, 20)}` : '';
  return `SIMBA_${typeCode}${nomor}${sekolah}`;
}

/**
 * Triggers the browser print dialog with automatic title renaming for PDF download
 * and cleans up afterwards.
 */
export function triggerPrint(options?: PrintDocumentOptions): void {
  const originalTitle = document.title;

  if (options) {
    document.title = generatePdfFilename(options);
  }

  // Restore document title after print / save dialog closes
  const restoreTitle = () => {
    document.title = originalTitle;
    window.removeEventListener('afterprint', restoreTitle);
  };
  window.addEventListener('afterprint', restoreTitle);

  // Small delay to allow any pending DOM layouts to settle
  setTimeout(() => {
    window.print();
  }, 50);
}
