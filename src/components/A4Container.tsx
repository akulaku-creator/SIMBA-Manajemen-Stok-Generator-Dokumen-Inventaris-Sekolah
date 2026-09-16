import React from 'react';

export interface A4ContainerProps {
  orientation?: 'portrait' | 'landscape';
  paperSize?: 'A4' | 'F4';
  breakAfter?: boolean;
  className?: string;
  id?: string;
  children: React.ReactNode;
}

/**
 * A4Container - Component WYSIWYG untuk mengunci ukuran kanvas dokumen
 * agar 100% presisi dengan ukuran fisik kertas A4 / F4 baik di layar maupun saat dicetak/PDF.
 *
 * Dimensi fisik:
 * - A4 Portrait: 210mm x 297mm (Margin: 10mm top/bottom, 15mm left/right)
 * - A4 Landscape: 297mm x 210mm (Margin: 10mm top/bottom, 15mm left/right)
 * - F4 Portrait: 215mm x 330mm
 * - F4 Landscape: 330mm x 215mm
 */
export const A4Container: React.FC<A4ContainerProps> = ({
  orientation = 'portrait',
  paperSize = 'A4',
  breakAfter = false,
  className = '',
  id,
  children
}) => {
  const isLandscape = orientation === 'landscape';
  const isF4 = paperSize === 'F4';

  const sizeClass = isF4
    ? isLandscape
      ? 'f4-landscape'
      : 'f4-portrait'
    : isLandscape
      ? 'a4-landscape'
      : 'a4-portrait';

  const breakClass = breakAfter ? 'break-after-page page-break-after' : '';

  return (
    <div
      id={id}
      className={`print-sheet a4-page-container page-container ${sizeClass} ${breakClass} ${className}`}
      data-paper-size={paperSize}
      data-orientation={orientation}
    >
      {children}
    </div>
  );
};
