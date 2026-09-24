import { CheckCircle2, QrCode, ShieldCheck } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { KopSuratConfig, TransaksiPengeluaran } from '../../types';
import {
  buildVerificationData,
  DocTypeShort,
  generateQRCodeDataUrl,
  generateVerificationCode,
  getVerificationUrl,
  VerificationData
} from '../../utils/qrVerificationHelper';

interface Props {
  docType: DocTypeShort;
  docNumber: string;
  transaksi: TransaksiPengeluaran;
  kopConfig?: KopSuratConfig;
  size?: 'sm' | 'md';
  className?: string;
  onClickVerify?: (data: VerificationData) => void;
}

export const DocQRCode: React.FC<Props> = ({
  docType,
  docNumber,
  transaksi,
  kopConfig,
  size = 'md',
  className = '',
  onClickVerify
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const verifCode = generateVerificationCode(docType, transaksi, docNumber);
  const verifUrl = getVerificationUrl(docType, transaksi, docNumber);
  const verifData = buildVerificationData(docType, transaksi, docNumber, kopConfig);

  useEffect(() => {
    let isMounted = true;
    generateQRCodeDataUrl(verifUrl, {
      width: size === 'sm' ? 140 : 180,
      margin: 1,
      errorCorrectionLevel: 'M'
    }).then((url) => {
      if (isMounted) {
        setQrDataUrl(url);
      }
    }).catch(err => {
      console.error('Failed to generate QR code:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [verifUrl, size]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClickVerify) {
      onClickVerify(verifData);
    } else {
      // Dispatch global window event so any parent or verification modal catches it
      window.dispatchEvent(
        new CustomEvent('simba:verify-doc', {
          detail: {
            ...verifData,
            transaksi
          }
        })
      );
    }
  };

  const isSmall = size === 'sm';

  return (
    <div
      onClick={handleClick}
      title="Klik untuk melihat bukti verifikasi keaslian dokumen digital SIMBA"
      className={`group relative inline-flex flex-col items-center bg-white border border-slate-300 rounded-md p-1.5 transition-all select-none cursor-pointer hover:border-blue-500 hover:shadow-md print:border-black print:shadow-none print:cursor-default ${
        isSmall ? 'max-w-[130px]' : 'max-w-[150px]'
      } ${className}`}
    >
      {/* Top Header Badge */}
      <div className="flex items-center gap-1 text-[6.5pt] font-sans font-bold text-slate-700 uppercase tracking-tight print:text-black">
        <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 print:text-black shrink-0" />
        <span>SIMBA VERIFIED</span>
      </div>

      {/* QR Code Container */}
      <div className="my-1 bg-white p-0.5 rounded border border-slate-200 print:border-none flex items-center justify-center">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`QR Verifikasi ${docType}`}
            className={isSmall ? 'w-15 h-15 object-contain' : 'w-18 h-18 object-contain'}
          />
        ) : (
          <div className={`${isSmall ? 'w-15 h-15' : 'w-18 h-18'} flex items-center justify-center bg-slate-50 text-slate-400`}>
            <QrCode className="w-6 h-6 animate-pulse text-slate-300" />
          </div>
        )}
      </div>

      {/* Bottom Info: Verification Code & Scan Instruction */}
      <div className="text-center font-sans">
        <div className="text-[5.5pt] text-slate-500 font-medium leading-none print:text-black">
          Scan / Pindai Validasi
        </div>
        <div className="font-mono text-[6pt] font-bold text-slate-800 tracking-tighter mt-0.5 select-all print:text-black">
          {verifCode}
        </div>
      </div>

      {/* Screen only interactive tooltip indicator */}
      <div className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center justify-center bg-blue-600 text-white rounded-full p-0.5 shadow-sm print:hidden">
        <CheckCircle2 className="w-3 h-3" />
      </div>
    </div>
  );
};
