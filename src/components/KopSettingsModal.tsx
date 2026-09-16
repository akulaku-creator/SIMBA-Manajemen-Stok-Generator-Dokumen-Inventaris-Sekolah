import { Building2, Check, Eye, EyeOff, FileText, Image as ImageIcon, Link2, RotateCcw, Sparkles, Trash2, Upload, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { KopSuratConfig } from '../types';
import { KopSuratView } from './KopSuratView';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  kopConfig: KopSuratConfig;
  onSave: (config: KopSuratConfig) => void;
}

export const KopSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  kopConfig,
  onSave
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'logos' | 'text'>('logos');
  
  const [formData, setFormData] = useState<KopSuratConfig>({
    ...kopConfig,
    tampilkanLogoProvinsi: kopConfig.tampilkanLogoProvinsi !== false,
    tampilkanLogoSekolah: kopConfig.tampilkanLogoSekolah !== false,
    logoProvinsiType: kopConfig.logoProvinsiType || (kopConfig.logoType as any) || 'pemda',
    logoSekolahType: kopConfig.logoSekolahType || 'tutwuri',
    logoProvinsiUrl: kopConfig.logoProvinsiUrl || (kopConfig.logoType === 'custom' ? kopConfig.logoUrl : undefined),
    logoSekolahUrl: kopConfig.logoSekolahUrl || undefined
  });

  const [logoProvinsiPreview, setLogoProvinsiPreview] = useState<string | undefined>(
    kopConfig.logoProvinsiUrl || (kopConfig.logoType === 'custom' ? kopConfig.logoUrl : undefined)
  );
  const [logoSekolahPreview, setLogoSekolahPreview] = useState<string | undefined>(
    kopConfig.logoSekolahUrl || undefined
  );

  const [provinsiUrlInput, setProvinsiUrlInput] = useState('');
  const [sekolahUrlInput, setSekolahUrlInput] = useState('');
  const [showProvinsiUrlField, setShowProvinsiUrlField] = useState(false);
  const [showSekolahUrlField, setShowSekolahUrlField] = useState(false);

  // Sync state whenever modal opens or external kopConfig changes
  useEffect(() => {
    if (isOpen) {
      const initialProvinsiUrl = kopConfig.logoProvinsiUrl || (kopConfig.logoType === 'custom' ? kopConfig.logoUrl : undefined);
      const initialSekolahUrl = kopConfig.logoSekolahUrl || undefined;

      setFormData({
        ...kopConfig,
        tampilkanLogoProvinsi: kopConfig.tampilkanLogoProvinsi !== false,
        tampilkanLogoSekolah: kopConfig.tampilkanLogoSekolah !== false,
        logoProvinsiType: kopConfig.logoProvinsiType || (kopConfig.logoType as any) || 'pemda',
        logoSekolahType: kopConfig.logoSekolahType || 'tutwuri',
        logoProvinsiUrl: initialProvinsiUrl,
        logoSekolahUrl: initialSekolahUrl
      });

      setLogoProvinsiPreview(initialProvinsiUrl);
      setLogoSekolahPreview(initialSekolahUrl);
      setProvinsiUrlInput(initialProvinsiUrl?.startsWith('http') ? initialProvinsiUrl : '');
      setSekolahUrlInput(initialSekolahUrl?.startsWith('http') ? initialSekolahUrl : '');
    }
  }, [isOpen, kopConfig]);

  if (!isOpen) return null;

  // Handle Upload Logo Provinsi
  const handleUploadProvinsi = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoProvinsiPreview(result);
      setFormData(prev => ({
        ...prev,
        logoProvinsiUrl: result,
        logoProvinsiType: 'custom',
        tampilkanLogoProvinsi: true,
        // sync legacy fields
        logoUrl: result,
        logoType: 'custom'
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Upload Logo Sekolah
  const handleUploadSekolah = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoSekolahPreview(result);
      setFormData(prev => ({
        ...prev,
        logoSekolahUrl: result,
        logoSekolahType: 'custom',
        tampilkanLogoSekolah: true
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyProvinsiUrl = () => {
    if (!provinsiUrlInput.trim()) return;
    setLogoProvinsiPreview(provinsiUrlInput.trim());
    setFormData(prev => ({
      ...prev,
      logoProvinsiUrl: provinsiUrlInput.trim(),
      logoProvinsiType: 'custom',
      tampilkanLogoProvinsi: true,
      logoUrl: provinsiUrlInput.trim(),
      logoType: 'custom'
    }));
  };

  const handleApplySekolahUrl = () => {
    if (!sekolahUrlInput.trim()) return;
    setLogoSekolahPreview(sekolahUrlInput.trim());
    setFormData(prev => ({
      ...prev,
      logoSekolahUrl: sekolahUrlInput.trim(),
      logoSekolahType: 'custom',
      tampilkanLogoSekolah: true
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: KopSuratConfig = {
      ...formData,
      logoProvinsiUrl: logoProvinsiPreview,
      logoSekolahUrl: logoSekolahPreview,
      logoUrl: logoProvinsiPreview, // maintain backward compatibility
      logoType: formData.logoProvinsiType as any
    };
    onSave(updated);
    onClose();
  };

  // Live preview current configuration object
  const currentPreviewConfig: KopSuratConfig = {
    ...formData,
    logoProvinsiUrl: logoProvinsiPreview,
    logoSekolahUrl: logoSekolahPreview,
    logoUrl: logoProvinsiPreview
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-4 overflow-hidden border border-slate-200 ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              Pengaturan Kop Surat &amp; Logo Resmi
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Sesuaikan logo pemerintah daerah/provinsi (kiri) dan logo sekolah (kanan) serta teks kop surat dinas.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Kop Preview Box (Always pinned at top for instant visual feedback) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Pratinjau Langsung Kop Surat (Live Preview):
            </span>
            <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
              Otomatis tercetak pada NPB, SPB, SPPB, BAST, dan Stock Opname
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs max-h-56 overflow-x-auto">
            <KopSuratView config={currentPreviewConfig} />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-100/70">
          <button
            type="button"
            onClick={() => setActiveSubTab('logos')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeSubTab === 'logos'
                ? 'border-blue-600 text-blue-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Pengaturan Logo (Provinsi &amp; Sekolah)
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('text')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeSubTab === 'text'
                ? 'border-blue-600 text-blue-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Teks Instansi, Sekolah &amp; Titimangsa
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(85vh-280px)] overflow-y-auto">
          
          {/* TAB 1: PENGATURAN LOGO PROVINSI & LOGO SEKOLAH */}
          {activeSubTab === 'logos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* KARTU 1: LOGO PROVINSI / PEMERINTAH DAERAH (SEBELAH KIRI) */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Logo Kiri: Provinsi / Pemda</h4>
                        <p className="text-[10px] text-slate-500">Lambang Pemprov / Pemkab / Pemkot</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tampilkanLogoProvinsi: !prev.tampilkanLogoProvinsi }))}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                        formData.tampilkanLogoProvinsi
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {formData.tampilkanLogoProvinsi ? (
                        <>
                          <Eye className="w-3 h-3 text-emerald-600" />
                          <span>Aktif</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 text-slate-500" />
                          <span>Disembunyikan</span>
                        </>
                      )}
                    </button>
                  </div>

                  {formData.tampilkanLogoProvinsi ? (
                    <div className="mt-4 space-y-3.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                          Pilihan Tipe Logo Provinsi:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, logoProvinsiType: 'pemda' }));
                            }}
                            className={`p-2 rounded-lg border text-center transition-all ${
                              formData.logoProvinsiType === 'pemda'
                                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-500'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="block text-[11px]">Lambang Pemda</span>
                            <span className="block text-[9px] text-slate-500 mt-0.5">Preset Vektor</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, logoProvinsiType: 'tutwuri' }));
                            }}
                            className={`p-2 rounded-lg border text-center transition-all ${
                              formData.logoProvinsiType === 'tutwuri'
                                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-500'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="block text-[11px]">Tut Wuri</span>
                            <span className="block text-[9px] text-slate-500 mt-0.5">Preset Resmi</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, logoProvinsiType: 'custom' }));
                            }}
                            className={`p-2 rounded-lg border text-center transition-all ${
                              formData.logoProvinsiType === 'custom'
                                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-500'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="block text-[11px]">Logo Kustom</span>
                            <span className="block text-[9px] text-slate-500 mt-0.5">Upload Sendiri</span>
                          </button>
                        </div>
                      </div>

                      {/* Area Upload Gambar Logo Provinsi */}
                      {formData.logoProvinsiType === 'custom' && (
                        <div className="p-3 bg-white border border-blue-200 rounded-xl space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                              {logoProvinsiPreview ? (
                                <img
                                  src={logoProvinsiPreview}
                                  alt="Preview Logo Provinsi"
                                  className="w-full h-full object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-[9px] text-slate-400 text-center px-1">Belum ada logo</span>
                              )}
                            </div>

                            <div className="flex-1 space-y-1.5">
                              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Pilih Berkas Gambar...</span>
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                  onChange={handleUploadProvinsi}
                                  className="hidden"
                                />
                              </label>

                              <p className="text-[10px] text-slate-500">
                                Format: PNG, JPG, WebP, SVG (Transparan lebih baik).
                              </p>
                            </div>
                          </div>

                          {/* Tombol alternatif URL atau Hapus */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                            <button
                              type="button"
                              onClick={() => setShowProvinsiUrlField(!showProvinsiUrlField)}
                              className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
                            >
                              <Link2 className="w-3 h-3" />
                              {showProvinsiUrlField ? 'Tutup Input URL' : 'Gunakan Link URL Gambar'}
                            </button>

                            {logoProvinsiPreview && (
                              <button
                                type="button"
                                onClick={() => {
                                  setLogoProvinsiPreview(undefined);
                                  setFormData(prev => ({ ...prev, logoProvinsiUrl: undefined }));
                                }}
                                className="text-[11px] text-red-600 hover:underline flex items-center gap-1 font-medium"
                              >
                                <Trash2 className="w-3 h-3" />
                                Hapus Logo
                              </button>
                            )}
                          </div>

                          {showProvinsiUrlField && (
                            <div className="flex gap-1.5 pt-1">
                              <input
                                type="url"
                                value={provinsiUrlInput}
                                onChange={(e) => setProvinsiUrlInput(e.target.value)}
                                placeholder="https://domain.com/logo-provinsi.png"
                                className="flex-1 text-xs border border-slate-300 rounded-lg px-2 py-1.5 font-mono"
                              />
                              <button
                                type="button"
                                onClick={handleApplyProvinsiUrl}
                                className="px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900"
                              >
                                Terapkan
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 p-4 text-center text-xs text-slate-500 bg-white rounded-lg border border-dashed border-slate-300">
                      Logo pemerintah provinsi di sisi kiri disembunyikan. Kop surat akan menyesuaikan secara simetris.
                    </div>
                  )}
                </div>
              </div>

              {/* KARTU 2: LOGO SEKOLAH / SATUAN PENDIDIKAN (SEBELAH KANAN) */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">2</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Logo Kanan: Logo Sekolah</h4>
                        <p className="text-[10px] text-slate-500">Logo Resmi Sekolah / Tut Wuri Handayani</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tampilkanLogoSekolah: !prev.tampilkanLogoSekolah }))}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                        formData.tampilkanLogoSekolah
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {formData.tampilkanLogoSekolah ? (
                        <>
                          <Eye className="w-3 h-3 text-emerald-600" />
                          <span>Aktif</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 text-slate-500" />
                          <span>Disembunyikan</span>
                        </>
                      )}
                    </button>
                  </div>

                  {formData.tampilkanLogoSekolah ? (
                    <div className="mt-4 space-y-3.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                          Pilihan Tipe Logo Sekolah:
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, logoSekolahType: 'tutwuri' }));
                            }}
                            className={`p-1.5 rounded-lg border text-center transition-all ${
                              formData.logoSekolahType === 'tutwuri'
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-500'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="block text-[11px]">Tut Wuri</span>
                            <span className="block text-[8px] text-slate-500">Resmi</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, logoSekolahType: 'smk' }));
                            }}
                            className={`p-1.5 rounded-lg border text-center transition-all ${
                              formData.logoSekolahType === 'smk'
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-500'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="block text-[11px]">Badge SMK</span>
                            <span className="block text-[8px] text-slate-500">Bisa-Hebat</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, logoSekolahType: 'sma' }));
                            }}
                            className={`p-1.5 rounded-lg border text-center transition-all ${
                              formData.logoSekolahType === 'sma'
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-500'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="block text-[11px]">Badge SMA</span>
                            <span className="block text-[8px] text-slate-500">Maju Hebat</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, logoSekolahType: 'custom' }));
                            }}
                            className={`p-1.5 rounded-lg border text-center transition-all ${
                              formData.logoSekolahType === 'custom'
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-500'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="block text-[11px]">Kustom</span>
                            <span className="block text-[8px] text-slate-500">Upload</span>
                          </button>
                        </div>
                      </div>

                      {/* Area Upload Gambar Logo Sekolah */}
                      {formData.logoSekolahType === 'custom' && (
                        <div className="p-3 bg-white border border-indigo-200 rounded-xl space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                              {logoSekolahPreview ? (
                                <img
                                  src={logoSekolahPreview}
                                  alt="Preview Logo Sekolah"
                                  className="w-full h-full object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-[9px] text-slate-400 text-center px-1">Belum ada logo</span>
                              )}
                            </div>

                            <div className="flex-1 space-y-1.5">
                              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Pilih Logo Sekolah...</span>
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                  onChange={handleUploadSekolah}
                                  className="hidden"
                                />
                              </label>

                              <p className="text-[10px] text-slate-500">
                                Format: PNG transparan, JPG, SVG logo sekolah.
                              </p>
                            </div>
                          </div>

                          {/* Alternatif URL atau Hapus Logo Sekolah */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                            <button
                              type="button"
                              onClick={() => setShowSekolahUrlField(!showSekolahUrlField)}
                              className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                            >
                              <Link2 className="w-3 h-3" />
                              {showSekolahUrlField ? 'Tutup Input URL' : 'Gunakan Link URL Gambar'}
                            </button>

                            {logoSekolahPreview && (
                              <button
                                type="button"
                                onClick={() => {
                                  setLogoSekolahPreview(undefined);
                                  setFormData(prev => ({ ...prev, logoSekolahUrl: undefined }));
                                }}
                                className="text-[11px] text-red-600 hover:underline flex items-center gap-1 font-medium"
                              >
                                <Trash2 className="w-3 h-3" />
                                Hapus Logo
                              </button>
                            )}
                          </div>

                          {showSekolahUrlField && (
                            <div className="flex gap-1.5 pt-1">
                              <input
                                type="url"
                                value={sekolahUrlInput}
                                onChange={(e) => setSekolahUrlInput(e.target.value)}
                                placeholder="https://domain.com/logo-sekolah.png"
                                className="flex-1 text-xs border border-slate-300 rounded-lg px-2 py-1.5 font-mono"
                              />
                              <button
                                type="button"
                                onClick={handleApplySekolahUrl}
                                className="px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900"
                              >
                                Terapkan
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 p-4 text-center text-xs text-slate-500 bg-white rounded-lg border border-dashed border-slate-300">
                      Logo sekolah di sisi kanan disembunyikan.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TEKS DINAS, SEKOLAH & ALAMAT */}
          {activeSubTab === 'text' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pemerintah Daerah (Provinsi / Kota / Kabupaten)
                  </label>
                  <input
                    type="text"
                    value={formData.pemerintahDaerah}
                    onChange={(e) => setFormData({ ...formData, pemerintahDaerah: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 uppercase font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dinas Pendidikan
                  </label>
                  <input
                    type="text"
                    value={formData.dinasPendidikan}
                    onChange={(e) => setFormData({ ...formData, dinasPendidikan: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 uppercase font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cabang Dinas Pendidikan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.cabangDinas}
                    onChange={(e) => setFormData({ ...formData, cabangDinas: e.target.value })}
                    placeholder="Contoh: CABANG DINAS PENDIDIKAN WILAYAH III"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 uppercase font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Resmi Sekolah
                  </label>
                  <input
                    type="text"
                    value={formData.namaSekolah}
                    onChange={(e) => setFormData({ ...formData, namaSekolah: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 uppercase font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Lengkap Sekolah &amp; Kontak Telepon/Fax
                </label>
                <input
                  type="text"
                  value={formData.alamatLengkap}
                  onChange={(e) => setFormData({ ...formData, alamatLengkap: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email &amp; Website Resmi
                  </label>
                  <input
                    type="text"
                    value={formData.emailWebsite}
                    onChange={(e) => setFormData({ ...formData, emailWebsite: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NPSN (Nomor Pokok Sekolah Nasional)
                  </label>
                  <input
                    type="text"
                    value={formData.npsn}
                    onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kota Pembuatan Surat (Titimangsa Tanda Tangan Dokumen)
                </label>
                <input
                  type="text"
                  value={formData.kotaSurat}
                  onChange={(e) => setFormData({ ...formData, kotaSurat: e.target.value })}
                  placeholder="Contoh: Bandung, Surabaya, Bekasi, Jakarta..."
                  className="w-full md:w-1/2 text-xs border border-slate-300 rounded-lg p-2.5 font-medium"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Kota ini otomatis dijadikan lokasi titimangsa tanda tangan (misal: "Bekasi, 15 September 2026").
                </p>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                // Reset to default
                setFormData(prev => ({
                  ...prev,
                  logoProvinsiType: 'pemda',
                  logoProvinsiUrl: undefined,
                  tampilkanLogoProvinsi: true,
                  logoSekolahType: 'tutwuri',
                  logoSekolahUrl: undefined,
                  tampilkanLogoSekolah: true
                }));
                setLogoProvinsiPreview(undefined);
                setLogoSekolahPreview(undefined);
              }}
              className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Kembalikan Logo ke Preset Default
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm flex items-center gap-2 transition-all active:scale-98"
              >
                <Check className="w-4 h-4" />
                Simpan Perubahan Kop &amp; Logo
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
