import { 
  Building2, 
  Check, 
  Database, 
  Download, 
  Eye, 
  FileCheck2, 
  Hash, 
  Image as ImageIcon, 
  Layers, 
  RotateCcw, 
  Save, 
  Sparkles, 
  Trash2, 
  Upload, 
  UserCheck, 
  Users, 
  Wand2, 
  X,
  Clock,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { 
  AppUser, 
  Barang, 
  KategoriBarangItem, 
  KopSuratConfig, 
  NumberingPatternConfig, 
  Pejabat, 
  TransaksiPenerimaan, 
  TransaksiPengeluaran 
} from '../types';
import { exportFullDatabase, getLastBackupTime } from '../utils/backupHelper';
import { 
  calculateNextDocumentCounters, 
  deriveSchoolCode, 
  parseDynamicNumber 
} from '../utils/numberGenerator';
import { KopSuratView } from './KopSuratView';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  kopConfig: KopSuratConfig;
  numberingConfig: NumberingPatternConfig;
  pejabatList: Pejabat[];
  masterBarang: Barang[];
  transaksiList: TransaksiPengeluaran[];
  penerimaanList: TransaksiPenerimaan[];
  kategoriList: KategoriBarangItem[];
  userList: AppUser[];
  currentUser: AppUser;
  onSaveUnifiedSettings: (updated: {
    kopConfig: KopSuratConfig;
    numberingConfig: NumberingPatternConfig;
    pejabatList: Pejabat[];
  }) => void;
  onShowToast?: (message: string) => void;
}

export const UnifiedSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  kopConfig,
  numberingConfig,
  pejabatList,
  masterBarang,
  transaksiList,
  penerimaanList,
  kategoriList,
  userList,
  currentUser,
  onSaveUnifiedSettings,
  onShowToast
}) => {
  // Navigation tabs within settings
  const [activeSection, setActiveSection] = useState<'all' | 'kop' | 'numbering' | 'pejabat' | 'backup'>('all');

  // Local Form States
  const [kopData, setKopData] = useState<KopSuratConfig>({ ...kopConfig });
  const [numberingData, setNumberingData] = useState<NumberingPatternConfig>({ ...numberingConfig });
  const [pejabatData, setPejabatData] = useState<Pejabat[]>([...pejabatList]);

  // Backup timestamp status
  const [lastBackup, setLastBackup] = useState<string | null>(getLastBackupTime());
  const [isBackupSuccess, setIsBackupSuccess] = useState(false);

  // Sync state whenever modal opens or external configs change
  useEffect(() => {
    if (isOpen) {
      setKopData({ ...kopConfig });
      setNumberingData({ ...numberingConfig });
      setPejabatData([...pejabatList]);
      setLastBackup(getLastBackupTime());
      setIsBackupSuccess(false);
    }
  }, [isOpen, kopConfig, numberingConfig, pejabatList]);

  // Derived Document Counters for Live Preview
  const detectedCounters = useMemo(() => {
    return calculateNextDocumentCounters(transaksiList || [], numberingData);
  }, [transaksiList, numberingData]);

  const today = new Date().toISOString().split('T')[0];
  const activeNPBCounter = numberingData.startCounterNPB ?? detectedCounters.npb;
  const activeSPBCounter = numberingData.startCounterSPB ?? detectedCounters.spb;
  const activeSPPBCounter = numberingData.startCounterSPPB ?? detectedCounters.sppb;
  const activeBASTCounter = numberingData.startCounterBAST ?? detectedCounters.bast;

  const previewNPB = parseDynamicNumber(numberingData.patternNPB, activeNPBCounter, today, numberingData.schoolCode, 'NPB', kopData.namaSekolah);
  const previewSPB = parseDynamicNumber(numberingData.patternSPB, activeSPBCounter, today, numberingData.schoolCode, 'SPB', kopData.namaSekolah);
  const previewSPPB = parseDynamicNumber(numberingData.patternSPPB, activeSPPBCounter, today, numberingData.schoolCode, 'SPPB', kopData.namaSekolah);
  const previewBAST = parseDynamicNumber(numberingData.patternBAST, activeBASTCounter, today, numberingData.schoolCode, 'BAST', kopData.namaSekolah);

  // Find key officials
  const kepsek = pejabatData.find(p => p.jabatan.toLowerCase().includes('kepala sekolah') || p.id === 'pejabat-kepsek') || pejabatData[0] || {
    id: 'pejabat-kepsek',
    nama: '',
    nip: '',
    pangkatGolongan: '',
    jabatan: 'Kepala Sekolah',
    unitKerja: 'Pimpinan Lembaga'
  };

  const pengurusBarang = pejabatData.find(p => p.jabatan.toLowerCase().includes('pengurus barang') || p.id === 'pejabat-pengurus-barang') || pejabatData[2] || {
    id: 'pejabat-pengurus-barang',
    nama: '',
    nip: '',
    pangkatGolongan: '',
    jabatan: 'Pengurus Barang Pembantu',
    unitKerja: 'Pengelola Aset & Inventaris'
  };

  const sarpras = pejabatData.find(p => p.jabatan.toLowerCase().includes('sarpras') || p.jabatan.toLowerCase().includes('sarana') || p.id === 'pejabat-sarpras') || pejabatData[1] || {
    id: 'pejabat-sarpras',
    nama: '',
    nip: '',
    pangkatGolongan: '',
    jabatan: 'Wakasek Sarana Prasarana',
    unitKerja: 'Wakasek Bidang Sarpras'
  };

  if (!isOpen) return null;

  // Handlers for Pejabat update
  const handleUpdatePejabatField = (pejabatId: string, field: keyof Pejabat, value: string) => {
    setPejabatData(prev => {
      const exists = prev.some(p => p.id === pejabatId);
      if (exists) {
        return prev.map(p => p.id === pejabatId ? { ...p, [field]: value } : p);
      } else {
        return [...prev, {
          id: pejabatId,
          nama: field === 'nama' ? value : '',
          nip: field === 'nip' ? value : '',
          pangkatGolongan: field === 'pangkatGolongan' ? value : '',
          jabatan: field === 'jabatan' ? value : '',
          unitKerja: field === 'unitKerja' ? value : ''
        }];
      }
    });
  };

  // Upload Logo Provinsi
  const handleUploadProvinsi = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file logo maksimal 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setKopData(prev => ({
        ...prev,
        logoProvinsiUrl: result,
        logoProvinsiType: 'custom',
        tampilkanLogoProvinsi: true,
        logoUrl: result,
        logoType: 'custom'
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Upload Logo Sekolah
  const handleUploadSekolah = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file logo maksimal 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setKopData(prev => ({
        ...prev,
        logoSekolahUrl: result,
        logoSekolahType: 'custom',
        tampilkanLogoSekolah: true
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Trigger Full Backup
  const handleExecuteBackup = () => {
    try {
      const res = exportFullDatabase({
        masterBarang,
        transaksiList,
        penerimaanList,
        pejabatList: pejabatData,
        kategoriList,
        kopConfig: kopData,
        numberingConfig: numberingData,
        userList,
        currentUser
      });

      setLastBackup(res.formattedDate);
      setIsBackupSuccess(true);
      if (onShowToast) {
        onShowToast(`Cadangan lengkap berhasil diunduh: ${res.filename}`);
      }
      setTimeout(() => setIsBackupSuccess(false), 5000);
    } catch (err) {
      console.error('Backup error:', err);
      alert('Terjadi kesalahan saat memproses backup data.');
    }
  };

  // Unified Save Button
  const handleSaveAll = () => {
    onSaveUnifiedSettings({
      kopConfig: kopData,
      numberingConfig: numberingData,
      pejabatList: pejabatData
    });
    if (onShowToast) {
      onShowToast('Seluruh konfigurasi instansi & penandatangan berhasil disimpan serentak!');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Pengaturan Terpadu Instansi
                <span className="text-[10px] bg-blue-500/30 text-blue-200 border border-blue-400/40 px-2 py-0.5 rounded-full font-semibold">
                  SIMBA v2.6 Pro
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pusat konfigurasi Identitas Instansi, Kop Surat, Pola Penomoran, Pejabat Penandatangan, dan Pencadangan Sistem.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="px-6 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto py-2.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveSection('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeSection === 'all'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            Tampilkan Semua Bagian
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('kop')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'kop'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            1. Identitas &amp; Kop Surat
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('numbering')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'numbering'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            2. Penomoran Surat
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('pejabat')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'pejabat'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            3. Pejabat Penandatangan
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('backup')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'backup'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-700 hover:bg-emerald-100/70 bg-emerald-50/60'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            4. Backup &amp; Pemulihan
          </button>
        </div>

        {/* Modal Body: Scrollable Cards */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-100/60 text-slate-800">
          
          {/* ========================================================================= */}
          {/* SECTION 1: IDENTITAS & KOP SURAT */}
          {/* ========================================================================= */}
          {(activeSection === 'all' || activeSection === 'kop') && (
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Identitas Lembaga &amp; Kop Surat Resmi</h3>
                    <p className="text-[11px] text-slate-500">Nama sekolah/dinas, alamat, kontak, dan logo untuk pencetakan dokumen A4/F4.</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Form Inputs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Pemerintah Daerah / Yayasan</label>
                    <input
                      type="text"
                      value={kopData.pemerintahDaerah}
                      onChange={e => setKopData(prev => ({ ...prev, pemerintahDaerah: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      placeholder="Contoh: PEMERINTAH DAERAH PROVINSI JAWA BARAT"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Dinas Pendidikan / Instansi Induk</label>
                    <input
                      type="text"
                      value={kopData.dinasPendidikan}
                      onChange={e => setKopData(prev => ({ ...prev, dinasPendidikan: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      placeholder="Contoh: DINAS PENDIDIKAN"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Cabang Dinas / Wilayah (Opsional)</label>
                    <input
                      type="text"
                      value={kopData.cabangDinas || ''}
                      onChange={e => setKopData(prev => ({ ...prev, cabangDinas: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      placeholder="Contoh: CABANG DINAS PENDIDIKAN WILAYAH III"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Nama Satuan Pendidikan / Sekolah *</label>
                    <input
                      type="text"
                      value={kopData.namaSekolah}
                      onChange={e => setKopData(prev => ({ ...prev, namaSekolah: e.target.value }))}
                      className="w-full border border-blue-300 bg-blue-50/30 rounded-lg px-3 py-2 text-xs font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      placeholder="Contoh: SMK NEGERI 1 KOTA PENDIDIKAN"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">Alamat Lengkap &amp; Telepon</label>
                    <input
                      type="text"
                      value={kopData.alamatLengkap}
                      onChange={e => setKopData(prev => ({ ...prev, alamatLengkap: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      placeholder="Contoh: Jl. Ki Hajar Dewantara No. 107, Telp. (021) 89901234"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Email &amp; Website</label>
                    <input
                      type="text"
                      value={kopData.emailWebsite}
                      onChange={e => setKopData(prev => ({ ...prev, emailWebsite: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      placeholder="Contoh: Email: info@smkn1kp.sch.id | Website: smkn1kp.sch.id"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">NPSN</label>
                      <input
                        type="text"
                        value={kopData.npsn || ''}
                        onChange={e => setKopData(prev => ({ ...prev, npsn: e.target.value }))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        placeholder="20231945"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Kota Penandatangan</label>
                      <input
                        type="text"
                        value={kopData.kotaSurat}
                        onChange={e => setKopData(prev => ({ ...prev, kotaSurat: e.target.value }))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        placeholder="Contoh: Bekasi"
                      />
                    </div>
                  </div>
                </div>

                {/* Logo Management Box */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                    Pengaturan Logo Kop Surat (Kiri &amp; Kanan)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    
                    {/* Logo Kiri: Logo Daerah / Provinsi */}
                    <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Logo Kiri (Daerah / Pemprov)</span>
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={kopData.tampilkanLogoProvinsi !== false}
                            onChange={e => setKopData(prev => ({ ...prev, tampilkanLogoProvinsi: e.target.checked }))}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          Aktifkan
                        </label>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg border border-slate-300 bg-white flex items-center justify-center overflow-hidden p-1 shrink-0">
                          {kopData.logoProvinsiUrl ? (
                            <img src={kopData.logoProvinsiUrl} alt="Logo Daerah" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <Building2 className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold text-[11px] shadow-2xs cursor-pointer">
                            <Upload className="w-3.5 h-3.5 text-blue-600" />
                            Unggah Logo Baru
                            <input type="file" accept="image/*" onChange={handleUploadProvinsi} className="hidden" />
                          </label>
                          {kopData.logoProvinsiUrl && (
                            <button
                              type="button"
                              onClick={() => setKopData(prev => ({ ...prev, logoProvinsiUrl: undefined, logoProvinsiType: 'pemda' }))}
                              className="block text-[10px] text-rose-600 hover:underline cursor-pointer"
                            >
                              Gunakan Logo Standar Pemda
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Logo Kanan: Logo Sekolah / Tut Wuri */}
                    <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Logo Kanan (Sekolah / Tut Wuri)</span>
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={kopData.tampilkanLogoSekolah !== false}
                            onChange={e => setKopData(prev => ({ ...prev, tampilkanLogoSekolah: e.target.checked }))}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          Aktifkan
                        </label>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg border border-slate-300 bg-white flex items-center justify-center overflow-hidden p-1 shrink-0">
                          {kopData.logoSekolahUrl ? (
                            <img src={kopData.logoSekolahUrl} alt="Logo Sekolah" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold text-[11px] shadow-2xs cursor-pointer">
                            <Upload className="w-3.5 h-3.5 text-blue-600" />
                            Unggah Logo Sekolah
                            <input type="file" accept="image/*" onChange={handleUploadSekolah} className="hidden" />
                          </label>
                          {kopData.logoSekolahUrl && (
                            <button
                              type="button"
                              onClick={() => setKopData(prev => ({ ...prev, logoSekolahUrl: undefined, logoSekolahType: 'tutwuri' }))}
                              className="block text-[10px] text-rose-600 hover:underline cursor-pointer"
                            >
                              Gunakan Logo Tut Wuri Standar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Live Mini Preview of Kop */}
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Pratinjau Mini Kop Surat Hasil Cetak:
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs scale-[0.85] origin-top">
                    <KopSuratView config={kopData} />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: FORMAT PENOMORAN SURAT */}
          {/* ========================================================================= */}
          {(activeSection === 'all' || activeSection === 'numbering') && (
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Format Pola Penomoran Otomatis</h3>
                    <p className="text-[11px] text-slate-500">Konfigurasi token variabel nomor surat untuk dokumen NPB, SPB, SPPB, dan BAST.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const defaultSchool = deriveSchoolCode(kopData.namaSekolah, 'SMKN1-KP');
                    setNumberingData(prev => ({
                      ...prev,
                      schoolCode: defaultSchool
                    }));
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 transition-colors"
                  title="Sinkronkan kode sekolah dari nama instansi"
                >
                  <Wand2 className="w-3 h-3 text-blue-600" />
                  Auto-Kode Sekolah
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* Kode Sekolah Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Kode Singkatan Sekolah / Satker (Token {'{SEKOLAH}'})
                    </label>
                    <input
                      type="text"
                      value={numberingData.schoolCode}
                      onChange={e => setNumberingData(prev => ({ ...prev, schoolCode: e.target.value.toUpperCase() }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-xs text-indigo-900 bg-indigo-50/30 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      placeholder="SMKN1-KP"
                    />
                  </div>
                  <div className="flex items-center text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div>
                      Variabel tersedia: <code className="text-indigo-600 font-bold">{'{NO}'}</code>, <code className="text-indigo-600 font-bold">{'{SEKOLAH}'}</code>, <code className="text-indigo-600 font-bold">{'{BULAN_ROMAN}'}</code>, <code className="text-indigo-600 font-bold">{'{TAHUN}'}</code>.
                    </div>
                  </div>
                </div>

                {/* Document Patterns & Live Previews */}
                <div className="space-y-3">
                  {/* NPB */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-3">
                      <span className="font-bold text-slate-900 block">1. Nota Permintaan (NPB)</span>
                      <span className="text-[10px] text-slate-500">Usulan barang oleh unit kerja</span>
                    </div>
                    <div className="md:col-span-5">
                      <input
                        type="text"
                        value={numberingData.patternNPB}
                        onChange={e => setNumberingData(prev => ({ ...prev, patternNPB: e.target.value }))}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                    <div className="md:col-span-4 bg-white px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-900 font-mono text-[11px] font-bold truncate">
                      {previewNPB}
                    </div>
                  </div>

                  {/* SPB */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-3">
                      <span className="font-bold text-slate-900 block">2. Surat Permintaan (SPB)</span>
                      <span className="text-[10px] text-slate-500">Diverifikasi &amp; disetujui Sarpras</span>
                    </div>
                    <div className="md:col-span-5">
                      <input
                        type="text"
                        value={numberingData.patternSPB}
                        onChange={e => setNumberingData(prev => ({ ...prev, patternSPB: e.target.value }))}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                    <div className="md:col-span-4 bg-white px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-900 font-mono text-[11px] font-bold truncate">
                      {previewSPB}
                    </div>
                  </div>

                  {/* SPPB */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-3">
                      <span className="font-bold text-slate-900 block">3. Perintah Penyaluran (SPPB)</span>
                      <span className="text-[10px] text-slate-500">Instruksi pengeluaran gudang</span>
                    </div>
                    <div className="md:col-span-5">
                      <input
                        type="text"
                        value={numberingData.patternSPPB}
                        onChange={e => setNumberingData(prev => ({ ...prev, patternSPPB: e.target.value }))}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                    <div className="md:col-span-4 bg-white px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-900 font-mono text-[11px] font-bold truncate">
                      {previewSPPB}
                    </div>
                  </div>

                  {/* BAST */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-3">
                      <span className="font-bold text-slate-900 block">4. Berita Acara (BAST)</span>
                      <span className="text-[10px] text-slate-500">Tanda terima serah fisik barang</span>
                    </div>
                    <div className="md:col-span-5">
                      <input
                        type="text"
                        value={numberingData.patternBAST}
                        onChange={e => setNumberingData(prev => ({ ...prev, patternBAST: e.target.value }))}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                    <div className="md:col-span-4 bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-900 font-mono text-[11px] font-bold truncate">
                      {previewBAST}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: MASTER PEJABAT PENANDATANGAN */}
          {/* ========================================================================= */}
          {(activeSection === 'all' || activeSection === 'pejabat') && (
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Master Pejabat Penandatangan Resmi</h3>
                    <p className="text-[11px] text-slate-500">Konfigurasi nama lengkap, NIP, pangkat/golongan, dan jabatan untuk tanda tangan berkas.</p>
                  </div>
                </div>
              </div>

              <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                
                {/* 1. Kepala Sekolah */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <UserCheck className="w-4 h-4 text-purple-600" />
                      Kepala Sekolah (Mengetahui)
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Nama Lengkap &amp; Gelar</label>
                    <input
                      type="text"
                      value={kepsek.nama}
                      onChange={e => handleUpdatePejabatField(kepsek.id, 'nama', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-semibold text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                      placeholder="Drs. H. Bambang Suhartono, M.Pd."
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">NIP</label>
                    <input
                      type="text"
                      value={kepsek.nip}
                      onChange={e => handleUpdatePejabatField(kepsek.id, 'nip', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                      placeholder="19680512 199303 1 005"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Pangkat / Golongan</label>
                    <input
                      type="text"
                      value={kepsek.pangkatGolongan}
                      onChange={e => handleUpdatePejabatField(kepsek.id, 'pangkatGolongan', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                      placeholder="Pembina Utama Muda / IV c"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Jabatan Resmi</label>
                    <input
                      type="text"
                      value={kepsek.jabatan}
                      onChange={e => handleUpdatePejabatField(kepsek.id, 'jabatan', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                      placeholder="Kepala Sekolah"
                    />
                  </div>
                </div>

                {/* 2. Pengurus Barang Pembantu */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      Pengurus Barang (Penyalur)
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Nama Lengkap &amp; Gelar</label>
                    <input
                      type="text"
                      value={pengurusBarang.nama}
                      onChange={e => handleUpdatePejabatField(pengurusBarang.id, 'nama', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-semibold text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      placeholder="Rina Kartikasari, S.AP."
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">NIP</label>
                    <input
                      type="text"
                      value={pengurusBarang.nip}
                      onChange={e => handleUpdatePejabatField(pengurusBarang.id, 'nip', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      placeholder="19890820 201402 2 003"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Pangkat / Golongan</label>
                    <input
                      type="text"
                      value={pengurusBarang.pangkatGolongan}
                      onChange={e => handleUpdatePejabatField(pengurusBarang.id, 'pangkatGolongan', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      placeholder="Penata Muda / III a"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Jabatan Resmi</label>
                    <input
                      type="text"
                      value={pengurusBarang.jabatan}
                      onChange={e => handleUpdatePejabatField(pengurusBarang.id, 'jabatan', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      placeholder="Pengurus Barang Pembantu"
                    />
                  </div>
                </div>

                {/* 3. Petugas Sarpras */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      Petugas Sarpras (Pemeriksa)
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Nama Lengkap &amp; Gelar</label>
                    <input
                      type="text"
                      value={sarpras.nama}
                      onChange={e => handleUpdatePejabatField(sarpras.id, 'nama', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-semibold text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      placeholder="Ahmad Fauzi, S.Pd., M.T."
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">NIP</label>
                    <input
                      type="text"
                      value={sarpras.nip}
                      onChange={e => handleUpdatePejabatField(sarpras.id, 'nip', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      placeholder="19780415 200501 1 009"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Pangkat / Golongan</label>
                    <input
                      type="text"
                      value={sarpras.pangkatGolongan}
                      onChange={e => handleUpdatePejabatField(sarpras.id, 'pangkatGolongan', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      placeholder="Penata Tingkat I / III d"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Jabatan Resmi</label>
                    <input
                      type="text"
                      value={sarpras.jabatan}
                      onChange={e => handleUpdatePejabatField(sarpras.id, 'jabatan', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      placeholder="Wakasek Sarana Prasarana"
                    />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 4: BACKUP & PEMULIHAN SISTEM */}
          {/* ========================================================================= */}
          {(activeSection === 'all' || activeSection === 'backup') && (
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950">Backup Data Keseluruhan (Full Data Backup)</h3>
                    <p className="text-[11px] text-emerald-800">Ekspor seluruh basis data aplikasi secara instan dalam 1 klik untuk pengamanan berkas &amp; audit.</p>
                  </div>
                </div>
                {lastBackup && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Backup Terakhir: <strong className="text-slate-800 font-semibold">{lastBackup}</strong></span>
                  </div>
                )}
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">
                      Ekspor Basis Data Penuh (JSON Bundle)
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                      Mencakup seluruh <strong>Master Barang ({masterBarang.length} data)</strong>, 
                      <strong> Riwayat Transaksi Penyaluran ({transaksiList.length} data)</strong>, 
                      <strong> Penerimaan Belanja BOS ({penerimaanList.length} data)</strong>, 
                      <strong> Master Pejabat ({pejabatData.length} data)</strong>, 
                      konfigurasi kop surat, dan log audit keamanan.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteBackup}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer active:scale-98 shrink-0"
                  >
                    <Download className="w-4 h-4 text-white" />
                    Backup Data Keseluruhan
                  </button>
                </div>

                {isBackupSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>File cadangan berhasil diekspor dan diunduh ke komputer Anda. Penanda waktu backup telah diperbarui!</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer: Unified Save Button */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            Perubahan konfigurasi akan disimpan ke penyimpanan lokal browser dan disinkronkan ke seluruh modul cetak.
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Batal / Tutup
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer active:scale-98"
            >
              <Save className="w-4 h-4" />
              Simpan Pengaturan
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
