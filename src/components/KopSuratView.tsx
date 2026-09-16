import React from 'react';
import { KopSuratConfig } from '../types';

interface Props {
  config: KopSuratConfig;
}

export const KopSuratView: React.FC<Props> = ({ config }) => {
  // Determine Left Logo (Logo Provinsi / Pemda)
  const showLeft = config.tampilkanLogoProvinsi !== false;
  const leftType = config.logoProvinsiType || (config.logoType as any) || 'pemda';
  const leftUrl = config.logoProvinsiUrl || (leftType === 'custom' ? config.logoUrl : undefined);

  // Determine Right Logo (Logo Sekolah / Tut Wuri)
  const showRight = config.tampilkanLogoSekolah !== false;
  const rightType = config.logoSekolahType || 'tutwuri';
  const rightUrl = config.logoSekolahUrl;

  const renderTutWuriSvg = () => (
    <div className="w-20 h-20 rounded-full border-2 border-slate-900 flex items-center justify-center p-1 bg-amber-50/50">
      <svg viewBox="0 0 100 100" className="w-full h-full fill-slate-900" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M50 14 L55 28 L70 28 L58 37 L63 52 L50 42 L37 52 L42 37 L30 28 L45 28 Z" fill="currentColor" />
        <path d="M22 62 Q50 45 78 62 Q50 78 22 62 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="50" cy="58" r="5" fill="currentColor" />
        <path d="M30 76 Q50 68 70 76 Q50 86 30 76 Z" fill="currentColor" opacity="0.85" />
      </svg>
    </div>
  );

  const renderPemdaSvg = () => (
    <div className="w-20 h-20 border-2 border-slate-900 rounded-lg flex items-center justify-center p-1 bg-slate-100">
      <svg viewBox="0 0 100 100" className="w-full h-full fill-slate-900" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 8 L85 24 V58 C85 78 50 92 50 92 C50 92 15 78 15 58 V24 Z" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M50 22 L62 38 H38 Z" fill="currentColor" />
        <circle cx="50" cy="52" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M35 72 H65" stroke="currentColor" strokeWidth="3" />
      </svg>
    </div>
  );

  const renderSmkBadge = () => (
    <div className="w-20 h-20 rounded-full border-2 border-slate-900 flex flex-col items-center justify-center p-1 text-[8px] font-serif font-bold text-center leading-none bg-blue-50/40">
      <span className="text-[11px] text-blue-950 font-extrabold">SMK</span>
      <span className="text-[7px] text-slate-800 mt-0.5 tracking-tighter font-sans font-bold">BISA - HEBAT</span>
      <div className="w-10 h-[1.5px] bg-slate-900 my-0.5" />
      <span className="text-[7px] text-slate-900 font-serif">SIAP KERJA</span>
    </div>
  );

  const renderSmaBadge = () => (
    <div className="w-20 h-20 rounded-full border-2 border-slate-900 flex flex-col items-center justify-center p-1 text-[8px] font-serif font-bold text-center leading-none bg-emerald-50/40">
      <span className="text-[11px] text-emerald-950 font-extrabold">SMA</span>
      <span className="text-[7px] text-slate-800 mt-0.5 tracking-tighter font-sans font-bold">MAJU BERSAMA</span>
      <div className="w-10 h-[1.5px] bg-slate-900 my-0.5" />
      <span className="text-[7px] text-slate-900 font-serif">HEBAT SEMUA</span>
    </div>
  );

  return (
    <div className="w-full mb-4 print:mb-3 select-none doc-header-kop avoid-break">
      <div className="flex items-center justify-between gap-4 pb-2">
        {/* Left Logo: Logo Pemerintah Provinsi / Daerah / Dinas */}
        <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
          {showLeft && leftType !== 'none' ? (
            leftUrl ? (
              <img 
                src={leftUrl} 
                alt="Logo Pemerintah Provinsi/Daerah" 
                className="w-20 h-20 object-contain"
                referrerPolicy="no-referrer"
              />
            ) : leftType === 'tutwuri' ? (
              renderTutWuriSvg()
            ) : (
              renderPemdaSvg()
            )
          ) : (
            // Spacer to keep layout balanced if right logo is present
            <div className={`w-20 h-20 ${showRight ? 'block' : 'hidden'}`} />
          )}
        </div>

        {/* Center Header Text */}
        <div className="flex-1 text-center font-serif text-black leading-tight px-1 min-w-0 overflow-hidden">
          <h3 className="text-sm sm:text-base font-bold tracking-normal uppercase whitespace-nowrap overflow-hidden text-ellipsis">
            {config.pemerintahDaerah}
          </h3>
          <h2 className="text-base sm:text-lg font-bold tracking-normal uppercase whitespace-nowrap overflow-hidden text-ellipsis">
            {config.dinasPendidikan}
          </h2>
          {config.cabangDinas && (
            <h4 className="text-xs sm:text-sm font-semibold tracking-normal uppercase whitespace-nowrap overflow-hidden text-ellipsis">
              {config.cabangDinas}
            </h4>
          )}
          <h1 className="text-lg sm:text-xl font-extrabold tracking-normal uppercase my-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {config.namaSekolah}
          </h1>
          <p className="text-[10px] sm:text-[11px] font-normal leading-normal whitespace-nowrap overflow-hidden text-ellipsis">
            {config.alamatLengkap}
            {config.emailWebsite ? ` | ${config.emailWebsite}` : ''}
            {config.npsn ? ` | NPSN: ${config.npsn}` : ''}
          </p>
        </div>

        {/* Right Logo: Logo Sekolah / Satuan Pendidikan */}
        <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
          {showRight && rightType !== 'none' ? (
            rightUrl ? (
              <img 
                src={rightUrl} 
                alt="Logo Resmi Sekolah" 
                className="w-20 h-20 object-contain"
                referrerPolicy="no-referrer"
              />
            ) : rightType === 'smk' ? (
              renderSmkBadge()
            ) : rightType === 'sma' ? (
              renderSmaBadge()
            ) : (
              renderTutWuriSvg()
            )
          ) : (
            // Spacer to keep layout balanced if left logo is present
            <div className={`w-20 h-20 ${showLeft ? 'block' : 'hidden'}`} />
          )}
        </div>
      </div>

      {/* Official Government Double Border Line */}
      <div className="w-full">
        <div className="h-[3px] bg-black w-full" />
        <div className="h-[1px] bg-black w-full mt-[1.5px]" />
      </div>
    </div>
  );
};
