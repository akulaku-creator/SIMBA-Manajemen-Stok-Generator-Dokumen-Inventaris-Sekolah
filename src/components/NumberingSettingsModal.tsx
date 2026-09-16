import React, { useMemo, useState } from 'react';
import { KopSuratConfig, NumberingPatternConfig, TransaksiPengeluaran } from '../types';
import { calculateNextDocumentCounters, deriveSchoolCode, parseDynamicNumber } from '../utils/numberGenerator';
import { Hash, RefreshCw, Check, X, Info, Sparkles, Building2, Wand2, Layers, RotateCcw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: NumberingPatternConfig;
  onSave: (newConfig: NumberingPatternConfig) => void;
  kopConfig?: KopSuratConfig;
  transaksiList?: TransaksiPengeluaran[];
}

export const NumberingSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  config,
  onSave,
  kopConfig,
  transaksiList
}) => {
  const [formData, setFormData] = useState<NumberingPatternConfig>({ ...config });

  // Calculate detected counters from history
  const detectedCounters = useMemo(() => {
    return calculateNextDocumentCounters(transaksiList || [], formData);
  }, [transaksiList, formData]);

  if (!isOpen) return null;

  const today = new Date().toISOString().split('T')[0];
  const activeNPBCounter = formData.startCounterNPB ?? detectedCounters.npb;
  const activeSPBCounter = formData.startCounterSPB ?? detectedCounters.spb;
  const activeSPPBCounter = formData.startCounterSPPB ?? detectedCounters.sppb;
  const activeBASTCounter = formData.startCounterBAST ?? detectedCounters.bast;
  const activeBASOCounter = formData.startCounterBASO ?? detectedCounters.baso ?? 1;

  const previewNPB = parseDynamicNumber(formData.patternNPB, activeNPBCounter, today, formData.schoolCode, 'NPB', kopConfig?.namaSekolah);
  const previewSPB = parseDynamicNumber(formData.patternSPB, activeSPBCounter, today, formData.schoolCode, 'SPB', kopConfig?.namaSekolah);
  const previewSPPB = parseDynamicNumber(formData.patternSPPB, activeSPPBCounter, today, formData.schoolCode, 'SPPB', kopConfig?.namaSekolah);
  const previewBAST = parseDynamicNumber(formData.patternBAST, activeBASTCounter, today, formData.schoolCode, 'BAST', kopConfig?.namaSekolah);
  const previewBASO = parseDynamicNumber(formData.patternBASO, activeBASOCounter, today, formData.schoolCode, 'BA-SO', kopConfig?.namaSekolah);

  const handleResetDefault = () => {
    const defaultSchool = deriveSchoolCode(kopConfig?.namaSekolah, 'SMKN1-KP');
    setFormData({
      schoolCode: defaultSchool,
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
    });
  };

  // Helper to derive school code dynamically from school name in Kop Surat
  const handleDeriveFromKop = () => {
    if (!kopConfig?.namaSekolah) return;
    const derived = deriveSchoolCode(kopConfig.namaSekolah);
    setFormData(prev => ({
      ...prev,
      schoolCode: derived
    }));
  };

  // Reset starting counters to detected historical maximums
  const handleResetToDetectedCounters = () => {
    setFormData(prev => ({
      ...prev,
      startCounterNPB: detectedCounters.npb,
      startCounterSPB: detectedCounters.spb,
      startCounterSPPB: detectedCounters.sppb,
      startCounterBAST: detectedCounters.bast,
      startCounterBASO: detectedCounters.baso ?? 1,
    }));
  };

  const applyUnifiedPattern = (samplePattern: string) => {
    setFormData(prev => ({
      ...prev,
      patternNPB: samplePattern.replace(/\{KODE_DOK\}/g, 'NPB'),
      patternSPB: samplePattern.replace(/\{KODE_DOK\}/g, 'SPB'),
      patternSPPB: samplePattern.replace(/\{KODE_DOK\}/g, 'SPPB'),
      patternBAST: samplePattern.replace(/\{KODE_DOK\}/g, 'BAST'),
    }));
  };

  const insertVariable = (field: keyof NumberingPatternConfig, token: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: ((prev[field] as string) || '') + token
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const variables = [
    { token: '{NO}', desc: 'Nomor urut 3 digit (contoh: 001, 009, 012)' },
    { token: '{NO_RAW}', desc: 'Nomor urut asli tanpa leading zero (contoh: 1, 9, 12)' },
    { token: '{KODE_DOK}', desc: 'Kode dokumen dinamis (NPB, SPB, SPPB, BAST, BA-SO)' },
    { token: '{SEKOLAH}', desc: `Kode singkatan sekolah dinamis (aktif: ${formData.schoolCode})` },
    { token: '{KODE_SEKOLAH}', desc: `Alias variabel {SEKOLAH} (${formData.schoolCode})` },
    { token: '{NAMA_SEKOLAH}', desc: `Nama lengkap sekolah (${kopConfig?.namaSekolah || 'Sekolah'})` },
    { token: '{BULAN_ROMAN}', desc: 'Bulan dalam angka Romawi (I, II, ..., IX, XII)' },
    { token: '{BULAN}', desc: 'Bulan 2 digit (01 - 12)' },
    { token: '{TAHUN}', desc: 'Tahun 4 digit (contoh: 2026)' },
    { token: '{TANGGAL}', desc: 'Tanggal 2 digit (01 - 31)' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-6 overflow-hidden border border-slate-200 ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between flex-shrink-0 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Hash className="w-5 h-5 text-blue-400" />
              Format Penomoran Surat Fleksibel (Dynamic Pattern)
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Konfigurasi pola nomor surat dinas instansi dengan variabel dinamis
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* Quick Info & Code */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-blue-950">Panduan Pengaturan Format Penomoran:</p>
              <p className="text-blue-800 leading-relaxed">
                Anda dapat menggunakan token seperti <code className="bg-blue-100/80 px-1 py-0.5 rounded font-mono font-bold text-blue-900">{`{NO}`}</code>, <code className="bg-blue-100/80 px-1 py-0.5 rounded font-mono font-bold text-blue-900">{`{SEKOLAH}`}</code>, <code className="bg-blue-100/80 px-1 py-0.5 rounded font-mono font-bold text-blue-900">{`{BULAN_ROMAN}`}</code>, dan <code className="bg-blue-100/80 px-1 py-0.5 rounded font-mono font-bold text-blue-900">{`{TAHUN}`}</code>. Sistem akan otomatis merekonstruksi penomoran secara presisi.
              </p>
            </div>
          </div>

          {/* School Code */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Variabel Sekolah / Instansi <span className="font-mono text-blue-600">{`{SEKOLAH}`} / {`{KODE_SEKOLAH}`}</span>
                </label>
                <input
                  type="text"
                  value={formData.schoolCode}
                  onChange={e => setFormData({ ...formData, schoolCode: e.target.value.toUpperCase() })}
                  placeholder="Contoh: SMKN1-KP, SMAN1, SMPN2"
                  className="w-full px-3 py-2 text-xs font-mono font-semibold uppercase border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="md:col-span-2 flex flex-col justify-center text-xs text-slate-600">
                <span className="font-medium text-slate-800">Digunakan secara dinamis pada seluruh nomor dokumen</span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Nilai ini mengisi token <span className="font-mono font-bold text-blue-700">{`{SEKOLAH}`}</span> pada format NPB, SPB, SPPB, dan BAST secara otomatis tanpa teks statis hardcoded.
                </span>
              </div>
            </div>

            {/* Quick sync from Kop Surat if available */}
            {kopConfig?.namaSekolah && (
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span>Nama Instansi pada Kop: <strong className="text-slate-800">{kopConfig.namaSekolah}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={handleDeriveFromKop}
                  className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-100/70 hover:bg-blue-100 rounded-md transition-colors flex items-center gap-1"
                  title="Ambil singkatan otomatis dari nama sekolah di Kop Surat"
                >
                  <Wand2 className="w-3 h-3" />
                  Tarik Singkatan dari Nama Sekolah
                </button>
              </div>
            )}
          </div>

          {/* Independent Document Counters Configuration */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Penomoran Urut Independen per Jenis Dokumen
                </h4>
              </div>
              <button
                type="button"
                onClick={handleResetToDetectedCounters}
                className="text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200 transition-colors"
                title="Sesuaikan nilai awal dengan urutan transaksi tertinggi yang sudah ada di database"
              >
                <RotateCcw className="w-3 h-3" />
                Deteksi Otomatis dari Riwayat
              </button>
            </div>
            
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Setiap jenis dokumen (NPB, SPB, SPPB, BAST) memiliki urutan buku register terpisah. Anda dapat menetapkan counter nomor urut berikutnya secara mandiri jika sistem melanjutkan nomor buku agenda fisik yang sudah berjalan:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Urutan NPB ({`{NO}`})
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.startCounterNPB ?? detectedCounters.npb}
                  onChange={e => setFormData({ ...formData, startCounterNPB: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-2.5 py-1 text-xs font-mono font-bold border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Terdeteksi: #{detectedCounters.npb}</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Urutan SPB ({`{NO}`})
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.startCounterSPB ?? detectedCounters.spb}
                  onChange={e => setFormData({ ...formData, startCounterSPB: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-2.5 py-1 text-xs font-mono font-bold border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Terdeteksi: #{detectedCounters.spb}</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Urutan SPPB ({`{NO}`})
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.startCounterSPPB ?? detectedCounters.sppb}
                  onChange={e => setFormData({ ...formData, startCounterSPPB: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-2.5 py-1 text-xs font-mono font-bold border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Terdeteksi: #{detectedCounters.sppb}</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Urutan BAST ({`{NO}`})
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.startCounterBAST ?? detectedCounters.bast}
                  onChange={e => setFormData({ ...formData, startCounterBAST: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-2.5 py-1 text-xs font-mono font-bold border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Terdeteksi: #{detectedCounters.bast}</span>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Terapkan Pola Cepat:
            </span>
            <button
              type="button"
              onClick={() => applyUnifiedPattern('{NO}/{KODE_DOK}/SP.1/{SEKOLAH}/{BULAN_ROMAN}/{TAHUN}')}
              className="px-2.5 py-1 text-[11px] font-mono bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
              title="Gunakan format pola SP.1 sekolah dinamis"
            >
              {`{NO}/{KODE_DOK}/SP.1/{SEKOLAH}/{BULAN_ROMAN}/{TAHUN}`}
            </button>
            <button
              type="button"
              onClick={() => applyUnifiedPattern('{NO}/{KODE_DOK}/{SEKOLAH}/{BULAN_ROMAN}/{TAHUN}')}
              className="px-2.5 py-1 text-[11px] font-mono bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors"
            >
              {`{NO}/{KODE_DOK}/{SEKOLAH}/{BULAN_ROMAN}/{TAHUN}`}
            </button>
          </div>

          {/* Document Patterns */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-200 flex items-center justify-between">
              <span>Pola Format Tiap Jenis Dokumen</span>
              <span className="text-[11px] text-slate-500 font-normal lowercase">live preview di sisi kanan</span>
            </h4>

            {/* NPB */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  1. Nota Permintaan Barang (NPB)
                </label>
                <div className="flex gap-1">
                  {variables.slice(0, 5).map(v => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => insertVariable('patternNPB', v.token)}
                      className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 rounded transition-colors"
                      title={v.desc}
                    >
                      +{v.token}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={formData.patternNPB}
                onChange={e => setFormData({ ...formData, patternNPB: e.target.value })}
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Contoh Hasil:</span>
                <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {previewNPB}
                </span>
              </div>
            </div>

            {/* SPB */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  2. Surat Permintaan Barang (SPB)
                </label>
                <div className="flex gap-1">
                  {variables.slice(0, 5).map(v => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => insertVariable('patternSPB', v.token)}
                      className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 rounded transition-colors"
                      title={v.desc}
                    >
                      +{v.token}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={formData.patternSPB}
                onChange={e => setFormData({ ...formData, patternSPB: e.target.value })}
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Contoh Hasil:</span>
                <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {previewSPB}
                </span>
              </div>
            </div>

            {/* SPPB */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  3. Surat Perintah Penyaluran Barang (SPPB)
                </label>
                <div className="flex gap-1">
                  {variables.slice(0, 5).map(v => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => insertVariable('patternSPPB', v.token)}
                      className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 rounded transition-colors"
                      title={v.desc}
                    >
                      +{v.token}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={formData.patternSPPB}
                onChange={e => setFormData({ ...formData, patternSPPB: e.target.value })}
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Contoh Hasil:</span>
                <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {previewSPPB}
                </span>
              </div>
            </div>

            {/* BAST Transaksi */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  4. Berita Acara Serah Terima (BAST Transaksi)
                </label>
                <div className="flex gap-1">
                  {variables.slice(0, 5).map(v => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => insertVariable('patternBAST', v.token)}
                      className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 rounded transition-colors"
                      title={v.desc}
                    >
                      +{v.token}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={formData.patternBAST}
                onChange={e => setFormData({ ...formData, patternBAST: e.target.value })}
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Contoh Hasil:</span>
                <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {previewBAST}
                </span>
              </div>
            </div>

            {/* BAST Stock Opname */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  5. Berita Acara Stock Opname (BAST-SO BOS)
                </label>
                <div className="flex gap-1">
                  {variables.slice(0, 5).map(v => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => insertVariable('patternBASO', v.token)}
                      className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 rounded transition-colors"
                      title={v.desc}
                    >
                      +{v.token}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={formData.patternBASO}
                onChange={e => setFormData({ ...formData, patternBASO: e.target.value })}
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Contoh Hasil:</span>
                <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {previewBASO}
                </span>
              </div>
            </div>
          </div>

          {/* Tokens Reference Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <h5 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Daftar Variabel Penomoran Tersedia
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {variables.map(v => (
                <div key={v.token} className="flex items-start gap-2 bg-white p-2 rounded-lg border border-slate-200">
                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[11px] flex-shrink-0">
                    {v.token}
                  </span>
                  <span className="text-[11px] text-slate-600 leading-tight">
                    {v.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleResetDefault}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Kembalikan ke Default
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Check className="w-4 h-4" />
                Simpan Format Penomoran
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
