import { 
  Building2, 
  Check, 
  Database, 
  Download, 
  Eye, 
  EyeOff,
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
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  UploadCloud,
  FileArchive,
  FileJson,
  FileText,
  KeyRound,
  Lock,
  RefreshCw,
  ArrowRight,
  Github,
  GitBranch,
  Code2,
  ExternalLink,
  Send
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { 
  AppUser, 
  Barang, 
  GitHubSyncConfig,
  KategoriBarangItem, 
  KopSuratConfig, 
  NumberingPatternConfig, 
  Pejabat, 
  TransaksiPenerimaan, 
  TransaksiPengeluaran 
} from '../types';
import { logAuditEvent } from '../utils/auditLogger';
import { 
  BackupValidationResult,
  createBackupPayload,
  exportFullDatabase, 
  getLastBackupTime, 
  validateBackupFile 
} from '../utils/backupHelper';
import { 
  DEFAULT_GITHUB_CONFIG,
  getStoredGitHubConfig,
  GitHubPushResult,
  GitHubTestResult,
  pushUpdateToGitHub,
  saveStoredGitHubConfig,
  testGitHubConnection 
} from '../utils/githubSyncHelper';
import { 
  calculateNextDocumentCounters, 
  deriveSchoolCode, 
  parseDynamicNumber 
} from '../utils/numberGenerator';
import { KopSuratView } from './KopSuratView';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'all' | 'kop' | 'numbering' | 'pejabat' | 'backup' | 'github' | 'danger';
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
  onRestoreDatabase?: (
    restoredData: {
      masterBarang: Barang[];
      transaksiList: TransaksiPengeluaran[];
      penerimaanList: TransaksiPenerimaan[];
      pejabatList: Pejabat[];
      kategoriList?: KategoriBarangItem[];
      kopConfig?: KopSuratConfig;
      numberingConfig?: NumberingPatternConfig;
      userList?: AppUser[];
    },
    mode: 'replace' | 'merge'
  ) => void;
  onShowToast?: (message: string) => void;
  onOpenResetTransaksi?: () => void;
}

const VALID_SETTING_SECTIONS = ['all', 'kop', 'numbering', 'pejabat', 'backup', 'github', 'danger'] as const;
type SettingSection = typeof VALID_SETTING_SECTIONS[number];

function resolveSettingTab(tab: unknown): SettingSection {
  if (typeof tab === 'string' && (VALID_SETTING_SECTIONS as readonly string[]).includes(tab)) {
    return tab as SettingSection;
  }
  return 'all';
}

export const UnifiedSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialTab,
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
  onRestoreDatabase,
  onShowToast,
  onOpenResetTransaksi
}) => {
  // Navigation tabs within settings
  const [activeSection, setActiveSection] = useState<SettingSection>(() => resolveSettingTab(initialTab));

  // Local Form States
  const [kopData, setKopData] = useState<KopSuratConfig>({ ...kopConfig });
  const [numberingData, setNumberingData] = useState<NumberingPatternConfig>({ ...numberingConfig });
  const [pejabatData, setPejabatData] = useState<Pejabat[]>([...pejabatList]);

  // Backup timestamp status & loading
  const [lastBackup, setLastBackup] = useState<string | null>(getLastBackupTime());
  const [isBackupSuccess, setIsBackupSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Restore Database States
  const [dragActive, setDragActive] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isValidatingFile, setIsValidatingFile] = useState(false);
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [adminPinInput, setAdminPinInput] = useState('');
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [restorePinError, setRestorePinError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);

  // GitHub Sync States
  const [githubConfig, setGithubConfig] = useState<GitHubSyncConfig>(getStoredGitHubConfig());
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [isTestingGitHub, setIsTestingGitHub] = useState(false);
  const [gitHubTestResult, setGitHubTestResult] = useState<GitHubTestResult | null>(null);
  const [isPushingGitHub, setIsPushingGitHub] = useState(false);
  const [gitHubPushResult, setGitHubPushResult] = useState<GitHubPushResult | null>(null);
  const [customCommitMessage, setCustomCommitMessage] = useState('');

  // Sync state whenever modal opens or external configs change
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveSection(resolveSettingTab(initialTab));
      }
      setKopData({ ...kopConfig });
      setNumberingData({ ...numberingConfig });
      setPejabatData([...pejabatList]);
      setLastBackup(getLastBackupTime());
      setIsBackupSuccess(false);
      setRestoreFile(null);
      setValidationResult(null);
      setAdminPinInput('');
      setRestorePinError(null);
      setRestoreSuccessMsg(null);
      setIsRestoring(false);
      setIsValidatingFile(false);

      // GitHub fresh sync
      setGithubConfig(getStoredGitHubConfig());
      setGitHubTestResult(null);
      setGitHubPushResult(null);
      setIsTestingGitHub(false);
      setIsPushingGitHub(false);
      setCustomCommitMessage('');
    }
  }, [isOpen, initialTab, kopConfig, numberingConfig, pejabatList]);

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

  // Trigger Full Backup (JSON or ZIP)
  const handleExecuteBackup = async (format: 'json' | 'zip' = 'json') => {
    try {
      setIsExporting(true);
      const res = await exportFullDatabase({
        masterBarang,
        transaksiList,
        penerimaanList,
        pejabatList: pejabatData,
        kategoriList,
        kopConfig: kopData,
        numberingConfig: numberingData,
        userList,
        currentUser,
        format
      });

      setLastBackup(res.formattedDate);
      setIsBackupSuccess(true);
      if (onShowToast) {
        onShowToast(`Cadangan lengkap (${format.toUpperCase()}) berhasil diunduh: ${res.filename}`);
      }
      setTimeout(() => setIsBackupSuccess(false), 5000);
    } catch (err: any) {
      console.error('Backup error:', err);
      alert('Terjadi kesalahan saat memproses backup data: ' + (err?.message || 'Gagal membuat file cadangan.'));
    } finally {
      setIsExporting(false);
    }
  };

  // Restore Database Handlers
  const handleProcessFile = async (file: File) => {
    setRestoreFile(file);
    setRestorePinError(null);
    setRestoreSuccessMsg(null);
    setIsValidatingFile(true);
    try {
      const result = await validateBackupFile(file);
      setValidationResult(result);
    } catch (err: any) {
      setValidationResult({
        isValid: false,
        fileType: 'json',
        errorMessage: 'Gagal memproses berkas: ' + (err?.message || 'File tidak valid.')
      });
    } finally {
      setIsValidatingFile(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
    e.target.value = '';
  };

  const resetRestoreState = () => {
    setRestoreFile(null);
    setValidationResult(null);
    setAdminPinInput('');
    setRestorePinError(null);
    setRestoreSuccessMsg(null);
  };

  const handleExecuteRestore = () => {
    setRestorePinError(null);
    setRestoreSuccessMsg(null);

    if (currentUser.role !== 'admin') {
      setRestorePinError('Akses Ditolak: Hanya pengguna Administrator yang berwenang memulihkan basis data.');
      return;
    }

    if (!validationResult || !validationResult.isValid || !validationResult.payload) {
      setRestorePinError('Format berkas cadangan belum valid atau belum dipilih.');
      return;
    }

    // Verify Admin PIN / Password (default: 123456 or currentUser pin/password)
    const validPin = currentUser.pin || '123456';
    const validPassword = currentUser.password || 'admin';
    const entered = adminPinInput.trim();

    if (entered !== validPin && entered !== validPassword && entered !== '123456') {
      logAuditEvent({
        userId: currentUser.id,
        username: currentUser.username,
        userName: currentUser.nama,
        userRole: currentUser.role,
        action: 'RESTORE_DATABASE',
        title: 'Gagal Otorisasi PIN Pemulihan Database',
        details: `Percobaan pemulihan database ditolak: PIN/Password admin salah dimasukkan oleh @${currentUser.username}`,
        status: 'FAILED'
      });
      setRestorePinError('PIN atau Kata Sandi Admin tidak sesuai. (Default PIN: 123456)');
      return;
    }

    setIsRestoring(true);
    setTimeout(() => {
      if (onRestoreDatabase && validationResult.payload) {
        onRestoreDatabase(
          {
            masterBarang: validationResult.payload.data.masterBarang,
            transaksiList: validationResult.payload.data.transaksiPenyaluran,
            penerimaanList: validationResult.payload.data.transaksiPenerimaan,
            pejabatList: validationResult.payload.data.masterPejabat,
            kategoriList: validationResult.payload.data.masterKategori,
            kopConfig: validationResult.payload.data.kopConfig,
            numberingConfig: validationResult.payload.data.numberingConfig,
            userList: validationResult.payload.data.userList
          },
          restoreMode
        );
      }

      if (restoreMode === 'replace' && validationResult.payload) {
        if (validationResult.payload.data.kopConfig) {
          setKopData(validationResult.payload.data.kopConfig);
        }
        if (validationResult.payload.data.numberingConfig) {
          setNumberingData(validationResult.payload.data.numberingConfig);
        }
        if (validationResult.payload.data.masterPejabat) {
          setPejabatData(validationResult.payload.data.masterPejabat);
        }
      }

      setIsRestoring(false);
      setRestoreSuccessMsg(
        restoreMode === 'replace'
          ? `Basis data berhasil ditimpa secara penuh (${validationResult.summary?.totalBarang || 0} barang, ${validationResult.summary?.totalPenyaluran || 0} transaksi disinkronkan).`
          : `Data cadangan berhasil digabungkan (Merge Data) ke dalam sistem tanpa menghapus riwayat sebelumnya.`
      );
      setAdminPinInput('');
    }, 600);
  };

  // Handler Simpan & Uji Koneksi GitHub
  const handleSaveAndTestGitHub = async () => {
    setIsTestingGitHub(true);
    setGitHubTestResult(null);
    setGitHubPushResult(null);
    
    // Save to localStorage immediately
    saveStoredGitHubConfig(githubConfig);

    try {
      const result = await testGitHubConnection(githubConfig);
      setGitHubTestResult(result);
      if (result.success) {
        if (onShowToast) {
          onShowToast(`GitHub: Koneksi terverifikasi ke ${result.repoDetails?.fullName || githubConfig.repoName}!`);
        }
      } else {
        if (onShowToast) {
          onShowToast(`GitHub: ${result.message}`);
        }
      }
    } catch (err: any) {
      setGitHubTestResult({
        success: false,
        message: err.message || 'Gagal menguji koneksi GitHub.'
      });
      if (onShowToast) {
        onShowToast(`GitHub Error: ${err.message || 'Gagal terhubung.'}`);
      }
    } finally {
      setIsTestingGitHub(false);
    }
  };

  // Handler Auto-Push Update Versi ke GitHub (1-Click Release)
  const handlePushToGitHub = async (customMsg?: string) => {
    if (!githubConfig.personalAccessToken || !githubConfig.repoOwner || !githubConfig.repoName) {
      setActiveSection('github');
      if (onShowToast) {
        onShowToast('Silakan lengkapi Personal Access Token (PAT), Owner, dan Repo GitHub terlebih dahulu.');
      }
      return;
    }

    setIsPushingGitHub(true);
    setGitHubPushResult(null);

    try {
      // 1. Prepare full payload data
      const { payload } = createBackupPayload({
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

      // 2. Push to GitHub
      const res = await pushUpdateToGitHub(githubConfig, payload, customMsg || customCommitMessage);
      setGitHubPushResult(res);

      // Update state config with new lastSyncedAt & lastCommitSha
      setGithubConfig(prev => ({
        ...prev,
        lastSyncedAt: res.timestamp,
        lastCommitSha: res.commitSha,
        lastCommitUrl: res.commitUrl
      }));

      logAuditEvent({
        userId: currentUser.id,
        username: currentUser.username,
        userName: currentUser.nama,
        userRole: currentUser.role,
        action: 'SYNC_GITHUB',
        title: 'Auto-Push Update Versi ke GitHub',
        details: `Berhasil sinkronisasi basis data ke GitHub (${githubConfig.repoOwner}/${githubConfig.repoName} [${githubConfig.branch}] - Commit: ${res.commitSha || 'OK'}).`,
        status: 'SUCCESS'
      });

      if (onShowToast) {
        onShowToast(`Berhasil push update ke GitHub! Commit: #${res.commitSha || 'OK'}`);
      }
    } catch (err: any) {
      console.error('GitHub Push Error:', err);
      const errMsg = err?.message || 'Gagal melakukan sinkronisasi ke GitHub.';
      setGitHubPushResult({
        success: false,
        message: errMsg,
        timestamp: new Date().toLocaleTimeString('id-ID')
      });

      logAuditEvent({
        userId: currentUser.id,
        username: currentUser.username,
        userName: currentUser.nama,
        userRole: currentUser.role,
        action: 'SYNC_GITHUB',
        title: 'Gagal Auto-Push Update ke GitHub',
        details: `Gagal memperbarui berkas repositori GitHub: ${errMsg}`,
        status: 'FAILED'
      });

      if (onShowToast) {
        onShowToast(`Gagal push ke GitHub: ${errMsg}`);
      }
    } finally {
      setIsPushingGitHub(false);
    }
  };

  // Unified Save Button
  const handleSaveAll = () => {
    saveStoredGitHubConfig(githubConfig);
    onSaveUnifiedSettings({
      kopConfig: kopData,
      numberingConfig: numberingData,
      pejabatList: pejabatData
    });
    if (onShowToast) {
      onShowToast('Seluruh konfigurasi instansi, penandatangan & GitHub berhasil disimpan serentak!');
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
            4. Backup &amp; Pemulihan Data
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('github')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'github'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-800 hover:bg-slate-200/80 bg-slate-100/70'
            }`}
          >
            <Github className="w-3.5 h-3.5 text-slate-800" />
            5. GitHub / Developer
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('danger')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'danger'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-rose-700 hover:bg-rose-100/70 bg-rose-50/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            6. Danger Zone (Area Bahaya)
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

                  {/* BAST Penyaluran */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-3">
                      <span className="font-bold text-slate-900 block">4. Berita Acara Serah Terima (BAST Penyaluran)</span>
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
          {/* SECTION 4: BACKUP & PEMULIHAN DATA */}
          {/* ========================================================================= */}
          {(activeSection === 'all' || activeSection === 'backup') && (
            <div className="space-y-6">
              {/* CARD 1: EKSPOR DATA (BACKUP DATABASE) */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 bg-emerald-50/60 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                      4A
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                        Pencadangan Basis Data Penuh (Full Data Backup)
                        <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          JSON / ZIP
                        </span>
                      </h3>
                      <p className="text-[11px] text-emerald-800">
                        Ekspor seluruh basis data aplikasi secara instan dalam satu bundel arsip untuk arsip legalitas &amp; audit.
                      </p>
                    </div>
                  </div>
                  {lastBackup ? (
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs shrink-0 self-start sm:self-auto">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Backup Terakhir: <strong className="text-slate-800 font-semibold">{lastBackup}</strong></span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 shrink-0 self-start sm:self-auto">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Belum ada riwayat backup</span>
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-emerald-600" />
                        Cakupan Berkas Cadangan SIMBA
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                        File cadangan terenkapsulasi memuat seluruh struktur inti:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                        <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-medium">
                          📦 Master Barang: <strong className="text-slate-900 font-bold">{masterBarang.length} item</strong>
                        </div>
                        <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-medium">
                          📥 Riwayat Penerimaan: <strong className="text-slate-900 font-bold">{penerimaanList.length} berkas</strong>
                        </div>
                        <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-medium">
                          📤 Transaksi Penyaluran: <strong className="text-slate-900 font-bold">{transaksiList.length} berkas</strong>
                        </div>
                        <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-medium">
                          👥 Master Pejabat: <strong className="text-slate-900 font-bold">{pejabatData.length} orang</strong>
                        </div>
                        <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-medium">
                          📑 Konfigurasi Kop &amp; No. Surat
                        </div>
                        <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-medium">
                          🛡️ Log Audit Keamanan
                        </div>
                      </div>
                    </div>

                    {/* Export Action Buttons: JSON and ZIP */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 lg:w-56">
                      <button
                        type="button"
                        disabled={isExporting}
                        onClick={() => handleExecuteBackup('json')}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                        title="Unduh file backup langsung dalam format JSON mentah"
                      >
                        <FileJson className="w-4 h-4 text-emerald-100" />
                        <span>Unduh File JSON (.json)</span>
                      </button>

                      <button
                        type="button"
                        disabled={isExporting}
                        onClick={() => handleExecuteBackup('zip')}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                        title="Unduh bundel terkompresi ZIP yang memuat file JSON dan petunjuk README"
                      >
                        <FileArchive className="w-4 h-4 text-blue-100" />
                        <span>Unduh Bundel ZIP (.zip)</span>
                      </button>
                    </div>
                  </div>

                  {isBackupSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Berkas cadangan berhasil diekspor dan diunduh ke komputer Anda. Penanda waktu backup telah diperbarui!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD 4B: SINKRONISASI CLOUD GITHUB (1-CLICK RELEASE) */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center font-bold text-xs border border-white/20">
                      4B
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        Sinkronisasi Basis Data ke GitHub (1-Click Release)
                        <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          REST API Auto-Push
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-300">
                        Perbarui berkas repositori GitHub secara langsung dari web tanpa perlu Git CLI atau terminal.
                      </p>
                    </div>
                  </div>
                  {githubConfig.lastSyncedAt ? (
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-white/10 px-3 py-1 rounded-full border border-white/10 shrink-0 self-start sm:self-auto">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Release Terakhir: <strong className="text-white font-semibold">{githubConfig.lastSyncedAt}</strong></span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10 shrink-0 self-start sm:self-auto">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Belum pernah push ke GitHub</span>
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Target Repositori:
                        </span>
                        {githubConfig.repoOwner && githubConfig.repoName ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white border border-slate-300 text-xs font-mono font-bold text-blue-700">
                            <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                            {githubConfig.repoOwner}/{githubConfig.repoName} ({githubConfig.branch || 'main'})
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                            Belum Dikonfigurasi (Token / Repo)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                        Mengekspor struktur lengkap SIMBA ({masterBarang.length} master barang, {transaksiList.length} transaksi penyaluran, {penerimaanList.length} penerimaan) ke path <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-mono text-[11px]">{githubConfig.filePath || 'data/simba-database.json'}</code> di branch <strong className="font-semibold text-slate-800">{githubConfig.branch || 'main'}</strong>.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 lg:w-64">
                      <button
                        type="button"
                        disabled={isPushingGitHub}
                        onClick={() => handlePushToGitHub()}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                        title="Eksekusi REST API: ambil SHA terakhir, encode Base64, dan kirim PUT commit ke GitHub"
                      >
                        {isPushingGitHub ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Memproses Push ke GitHub...</span>
                          </>
                        ) : (
                          <>
                            <Github className="w-4 h-4 text-white" />
                            <span>Push &amp; Update Versi ke GitHub</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSection('github')}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
                      >
                        <Code2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Pengaturan GitHub API →</span>
                      </button>
                    </div>
                  </div>

                  {/* Push Result Banner */}
                  {gitHubPushResult && (
                    <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs animate-in fade-in ${
                      gitHubPushResult.success 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}>
                      {gitHubPushResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold">
                            {gitHubPushResult.success ? 'Berhasil Sinkronisasi Versi ke GitHub!' : 'Sinkronisasi GitHub Gagal'}
                          </p>
                          {gitHubPushResult.commitSha && (
                            <span className="font-mono text-[10px] bg-emerald-200/80 text-emerald-950 px-2 py-0.5 rounded font-bold">
                              SHA: #{gitHubPushResult.commitSha}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] leading-relaxed">{gitHubPushResult.message}</p>
                        {gitHubPushResult.commitUrl && (
                          <div className="pt-1">
                            <a
                              href={gitHubPushResult.commitUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 underline"
                            >
                              <span>Lihat Perubahan Commit di GitHub</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD 2: IMPOR / PEMULIHAN BASIS DATA (RESTORE DATA) */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                      4C
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                        Impor / Pemulihan Basis Data (Restore Data)
                        <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          Verifikasi Skema &amp; Proteksi PIN
                        </span>
                      </h3>
                      <p className="text-[11px] text-blue-800">
                        Unggah berkas cadangan (.json / .zip) untuk memulihkan atau menggabungkan seluruh catatan aset inventaris SIMBA.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  {/* DRAG AND DROP / FILE INPUT ZONE */}
                  {!restoreFile && (
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                        dragActive
                          ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
                          : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/30'
                      }`}
                    >
                      <input
                        type="file"
                        accept=".json,.zip,application/json,application/zip,application/x-zip-compressed"
                        onChange={handleFileInputChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Pilih berkas cadangan JSON atau ZIP"
                      />
                      <div className="space-y-3 pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center shadow-xs">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            Seret &amp; lepas berkas cadangan ke sini, atau <span className="text-blue-600 underline">klik untuk memilih</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Mendukung berkas arsip resmi SIMBA format <strong className="font-semibold text-slate-700">.JSON</strong> atau <strong className="font-semibold text-slate-700">.ZIP</strong>
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Validasi skema otomatis sebelum penimpaan database</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VALIDATING LOADING SPINNER */}
                  {isValidatingFile && (
                    <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs font-bold text-slate-800">Memvalidasi skema berkas cadangan SIMBA...</p>
                      <p className="text-[11px] text-slate-500">Memeriksa struktur Master Barang, Transaksi Penyaluran, dan Pejabat.</p>
                    </div>
                  )}

                  {/* VALIDATION FAILED ALERT */}
                  {!isValidatingFile && validationResult && !validationResult.isValid && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 text-rose-900 animate-in fade-in">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <h5 className="text-xs font-bold">Validasi Berkas Cadangan Gagal</h5>
                          <p className="text-xs text-rose-700 leading-relaxed">
                            {validationResult.errorMessage || 'Berkas cadangan tidak valid atau struktur tidak cocok dengan versi SIMBA.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={resetRestoreState}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Pilih Berkas Lain
                        </button>
                      </div>
                    </div>
                  )}

                  {/* VALIDATION SUCCESS: DISPLAY SUMMARY, OPTIONS, & PIN CONFIRMATION */}
                  {!isValidatingFile && validationResult && validationResult.isValid && validationResult.summary && (
                    <div className="space-y-4 animate-in fade-in">
                      {/* Summary Banner */}
                      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h5 className="text-xs font-bold text-emerald-950">
                                  Skema Berkas Valid &amp; Terverifikasi
                                </h5>
                                <span className="text-[10px] uppercase font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.2 rounded-full">
                                  {validationResult.fileType.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-xs text-emerald-800 font-medium">
                                Berkas: <span className="font-bold text-slate-800">{restoreFile?.name}</span>
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={resetRestoreState}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                          >
                            Ganti Berkas
                          </button>
                        </div>

                        {/* File Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          <div className="bg-white/80 p-2 rounded-xl border border-emerald-100 text-xs">
                            <span className="text-[10px] text-slate-500 block">Asal Sekolah:</span>
                            <span className="font-bold text-slate-800 line-clamp-1">{validationResult.summary.schoolName}</span>
                          </div>
                          <div className="bg-white/80 p-2 rounded-xl border border-emerald-100 text-xs">
                            <span className="text-[10px] text-slate-500 block">Waktu Cadangan:</span>
                            <span className="font-bold text-slate-800 text-[11px]">{validationResult.summary.exportedAt}</span>
                          </div>
                          <div className="bg-white/80 p-2 rounded-xl border border-emerald-100 text-xs">
                            <span className="text-[10px] text-slate-500 block">Master Barang:</span>
                            <span className="font-bold text-emerald-700">{validationResult.summary.totalBarang} Item</span>
                          </div>
                          <div className="bg-white/80 p-2 rounded-xl border border-emerald-100 text-xs">
                            <span className="text-[10px] text-slate-500 block">Transaksi Penyaluran:</span>
                            <span className="font-bold text-blue-700">{validationResult.summary.totalPenyaluran} Berkas</span>
                          </div>
                        </div>
                      </div>

                      {/* MODE PEMULIHAN (RESTORE OPTIONS) */}
                      <div className="space-y-2.5">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                          Pilih Mode Pemulihan Data:
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Option 1: Replace All Data */}
                          <div
                            onClick={() => setRestoreMode('replace')}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                              restoreMode === 'replace'
                                ? 'border-rose-500 bg-rose-50/50 shadow-xs'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                  <input
                                    type="radio"
                                    name="restoreMode"
                                    checked={restoreMode === 'replace'}
                                    onChange={() => setRestoreMode('replace')}
                                    className="text-rose-600 focus:ring-rose-500 cursor-pointer"
                                  />
                                  Timpa Keseluruhan Data
                                </span>
                                <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                                  Replace All Data
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                Mengosongkan data lama dan menggantinya dengan data dari file backup. Seluruh master barang dan riwayat transaksi akan persis sama dengan berkas cadangan.
                              </p>
                            </div>
                            <div className="text-[11px] font-semibold text-rose-700 bg-rose-100/70 px-2.5 py-1 rounded-lg border border-rose-200/80">
                              ⚠️ Catatan: Data lokal yang tidak ada di file cadangan akan terhapus.
                            </div>
                          </div>

                          {/* Option 2: Merge Data */}
                          <div
                            onClick={() => setRestoreMode('merge')}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                              restoreMode === 'merge'
                                ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                  <input
                                    type="radio"
                                    name="restoreMode"
                                    checked={restoreMode === 'merge'}
                                    onChange={() => setRestoreMode('merge')}
                                    className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  Gabungkan Data
                                </span>
                                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                  Merge Data
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                Menambahkan data baru yang belum ada tanpa menghapus data riwayat transaksi lama. Data transaksi yang sudah ada di database saat ini tetap dipertahankan.
                              </p>
                            </div>
                            <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                              🛡️ Aman: Riwayat transaksi lama tidak akan ditimpa atau dihapus.
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* PROTEKSI KONFIRMASI: PIN / PASSWORD ADMIN */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-slate-700" />
                          <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Proteksi Konfirmasi: Otorisasi Administrator
                          </h5>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Tindakan pemulihan database mengubah basis data inventaris sekolah. Masukkan PIN atau Kata Sandi Admin Anda untuk mengonfirmasi eksekusi ini. (Default PIN: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 text-slate-800 font-mono font-bold">123456</code>)
                        </p>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                              <KeyRound className="w-4 h-4" />
                            </div>
                            <input
                              type={showAdminPin ? 'text' : 'password'}
                              value={adminPinInput}
                              onChange={(e) => {
                                setAdminPinInput(e.target.value);
                                setRestorePinError(null);
                              }}
                              placeholder="Masukkan PIN / Sandi Admin..."
                              className="w-full pl-9 pr-10 py-2.5 bg-white text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowAdminPin(!showAdminPin)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                              title={showAdminPin ? 'Sembunyikan' : 'Tampilkan'}
                            >
                              {showAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={resetRestoreState}
                              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              disabled={isRestoring || !adminPinInput.trim()}
                              onClick={handleExecuteRestore}
                              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 ${
                                restoreMode === 'replace'
                                  ? 'bg-rose-600 hover:bg-rose-700'
                                  : 'bg-blue-600 hover:bg-blue-700'
                              }`}
                            >
                              {isRestoring ? (
                                <>
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Memulihkan Database...</span>
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>
                                    {restoreMode === 'replace'
                                      ? 'Konfirmasi Timpa Database (Replace All)'
                                      : 'Konfirmasi Gabungkan Data (Merge Data)'}
                                  </span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* PIN Error Message */}
                        {restorePinError && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700 font-semibold animate-in fade-in">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>{restorePinError}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* RESTORE SUCCESS MESSAGE */}
                  {restoreSuccessMsg && (
                    <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 font-semibold animate-in fade-in">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div className="space-y-0.5 flex-1">
                        <p className="font-bold text-emerald-950">Proses Pemulihan Database Selesai!</p>
                        <p className="text-emerald-800 font-normal">{restoreSuccessMsg}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 5: GITHUB / DEVELOPER SINKRONISASI API */}
          {/* ========================================================================= */}
          {(activeSection === 'all' || activeSection === 'github') && (
            <div className="space-y-6">
              {/* CARD 1: FORMULIR KONFIGURASI GITHUB API */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center font-bold text-xs border border-white/20">
                      <Github className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        Konfigurasi GitHub REST API &amp; Developer
                        <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                          Personal Access Token
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-300">
                        Atur kredensial GitHub untuk sinkronisasi otomatis, backup repository, dan 1-Click Release dari antarmuka web SIMBA.
                      </p>
                    </div>
                  </div>
                  {githubConfig.lastSyncedAt && (
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-white/10 px-3 py-1 rounded-full border border-white/10 shrink-0 self-start sm:self-auto">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Sinkron Terakhir: <strong className="text-white font-semibold">{githubConfig.lastSyncedAt}</strong></span>
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-5">
                  {/* Informational Guide */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 text-xs text-slate-600">
                    <Code2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-800">
                        Panduan Integrasi GitHub REST API SIMBA
                      </p>
                      <p className="text-[11px] leading-relaxed text-slate-600">
                        Gunakan Personal Access Token (PAT) dari akun GitHub Anda yang memiliki izin cakupan (scope) <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-800 font-bold">repo</code> (Read &amp; Write) untuk repositori privat, atau minimal izin menulis berkas. Kredensial disimpan secara aman di peramban lokal (localStorage) perangkat ini.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Personal Access Token (PAT) with Show/Hide */}
                    <div className="md:col-span-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                          Personal Access Token (PAT) GitHub
                          <span className="text-rose-500">*</span>
                        </label>
                        <a
                          href="https://github.com/settings/tokens"
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                        >
                          <span>Buat Token di GitHub</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="relative">
                        <input
                          type={showGithubToken ? 'text' : 'password'}
                          value={githubConfig.personalAccessToken}
                          onChange={e => setGithubConfig(prev => ({ ...prev, personalAccessToken: e.target.value }))}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx atau github_pat_xxxx"
                          className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 pr-24 font-mono text-xs text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGithubToken(!showGithubToken)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title={showGithubToken ? 'Sembunyikan Token' : 'Tampilkan Token'}
                        >
                          {showGithubToken ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Hide</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Show</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Token memerlukan scope <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700 font-semibold">repo</code> (Full control of private repositories) untuk repositori privat, atau minimal akses <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700 font-semibold">contents:write</code>.
                      </p>
                    </div>

                    {/* Repository Owner / Username */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        Repository Owner / Username
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={githubConfig.repoOwner}
                        onChange={e => setGithubConfig(prev => ({ ...prev, repoOwner: e.target.value }))}
                        placeholder="contoh: rifqihamdan"
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                      <p className="text-[11px] text-slate-500">
                        Nama akun pengguna atau organisasi pemilik repositori di GitHub (contoh: <code className="font-mono text-slate-700 font-semibold">rifqihamdan</code>).
                      </p>
                    </div>

                    {/* Repository Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Github className="w-3.5 h-3.5 text-blue-600" />
                        Repository Name
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={githubConfig.repoName}
                        onChange={e => setGithubConfig(prev => ({ ...prev, repoName: e.target.value }))}
                        placeholder="contoh: simba-app"
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                      <p className="text-[11px] text-slate-500">
                        Nama repositori target di GitHub (contoh: <code className="font-mono text-slate-700 font-semibold">simba-app</code>).
                      </p>
                    </div>

                    {/* Branch Utama */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                          Branch Utama
                          <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setGithubConfig(prev => ({ ...prev, branch: 'main' }))}
                            className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                              githubConfig.branch === 'main' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            main
                          </button>
                          <button
                            type="button"
                            onClick={() => setGithubConfig(prev => ({ ...prev, branch: 'master' }))}
                            className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                              githubConfig.branch === 'master' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            master
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={githubConfig.branch}
                        onChange={e => setGithubConfig(prev => ({ ...prev, branch: e.target.value }))}
                        placeholder="main atau master"
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                      <p className="text-[11px] text-slate-500">
                        Branch target untuk penyimpanan berkas versi terbaru (default: main).
                      </p>
                    </div>

                    {/* Path File Target */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileJson className="w-3.5 h-3.5 text-blue-600" />
                        Jalur Berkas Target (Path in Repo)
                      </label>
                      <input
                        type="text"
                        value={githubConfig.filePath || 'data/simba-database.json'}
                        onChange={e => setGithubConfig(prev => ({ ...prev, filePath: e.target.value }))}
                        placeholder="data/simba-database.json"
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                      <p className="text-[11px] text-slate-500">
                        Lokasi file JSON dalam struktur repositori GitHub (default: <code className="font-mono text-slate-700">data/simba-database.json</code>).
                      </p>
                    </div>
                  </div>

                  {/* Tombol Simpan & Uji Koneksi */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      Pastikan token dan nama repositori sesuai sebelum menguji koneksi.
                    </div>
                    <button
                      type="button"
                      disabled={isTestingGitHub}
                      onClick={handleSaveAndTestGitHub}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                    >
                      {isTestingGitHub ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Menguji Koneksi GitHub...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Simpan &amp; Uji Koneksi GitHub</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Connection Test Result Feedback Banner */}
                  {gitHubTestResult && (
                    <div className={`p-4 rounded-xl border flex items-start gap-3.5 text-xs animate-in fade-in ${
                      gitHubTestResult.success 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                        : 'bg-rose-50 border-rose-300 text-rose-950'
                    }`}>
                      {gitHubTestResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-bold text-sm">
                            {gitHubTestResult.success ? 'Koneksi GitHub Berhasil Terhubung!' : 'Uji Koneksi GitHub Gagal'}
                          </h4>
                          {gitHubTestResult.repoDetails && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 uppercase">
                              {gitHubTestResult.repoDetails.isPrivate ? 'Private Repo' : 'Public Repo'}
                            </span>
                          )}
                        </div>
                        <p className="leading-relaxed">{gitHubTestResult.message}</p>
                        {gitHubTestResult.repoDetails && (
                          <div className="mt-2 pt-2 border-t border-emerald-200/80 flex flex-wrap items-center gap-3 text-[11px] text-emerald-900 font-mono">
                            <span>Default Branch: <strong>{gitHubTestResult.repoDetails.defaultBranch}</strong></span>
                            <span>•</span>
                            <span>Izin Push: <strong>{gitHubTestResult.repoDetails.permissions?.push !== false ? 'Ya (Diizinkan)' : 'Tidak'}</strong></span>
                            <span>•</span>
                            <a
                              href={`https://github.com/${githubConfig.repoOwner}/${githubConfig.repoName}`}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-blue-700 hover:text-blue-900 font-bold underline inline-flex items-center gap-1"
                            >
                              <span>Buka Repositori ↗</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD 2: FITUR AUTO-PUSH UPDATE VERSI (1-CLICK RELEASE) */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        Fitur Auto-Push Update Versi (1-Click Release)
                        <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                          Otomatisasi REST API
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-300">
                        Kirim pembaruan kode &amp; basis data SIMBA langsung ke cabang utama GitHub dalam sekali klik.
                      </p>
                    </div>
                  </div>
                  {githubConfig.lastCommitSha && (
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-white/10 px-3 py-1 rounded-full border border-white/10 shrink-0 self-start sm:self-auto font-mono">
                      <span>Commit Terakhir: <strong className="text-emerald-400 font-bold">#{githubConfig.lastCommitSha}</strong></span>
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  {/* Penjelasan Alur Eksekusi JavaScript REST API */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Mekanisme Kerja Alur Eksekusi JavaScript (REST API)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-[11px] text-slate-600">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <span className="font-bold text-blue-700 block">1. Cek SHA Berkas</span>
                        <p className="text-slate-500">Mengambil SHA file/commit terakhir di target (<code className="font-mono text-[10px]">GET /contents</code>).</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <span className="font-bold text-blue-700 block">2. Encode UTF-8 Base64</span>
                        <p className="text-slate-500">Mengonversi seluruh basis data SIMBA terbaru ke format Base64 yang aman.</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <span className="font-bold text-blue-700 block">3. PUT Update File</span>
                        <p className="text-slate-500">Mengirim request commit otomatis ke GitHub API (<code className="font-mono text-[10px]">PUT /contents</code>).</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <span className="font-bold text-emerald-700 block">4. Notifikasi Toast</span>
                        <p className="text-slate-500">Menampilkan status sukses/error seketika tanpa perlu memuat ulang (reload) halaman.</p>
                      </div>
                    </div>
                  </div>

                  {/* Commit Message Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-slate-600" />
                        Pesan Commit (Commit Message)
                      </span>
                      <span className="text-[11px] text-slate-500 font-normal">Opsional (Default otomatis jika kosong)</span>
                    </label>
                    <input
                      type="text"
                      value={customCommitMessage}
                      onChange={e => setCustomCommitMessage(e.target.value)}
                      placeholder="feat(auto-update): sync SIMBA v2.6 Pro data from web"
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Action Push Button Row */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-slate-500">
                      Target: <span className="font-mono font-bold text-slate-800">{githubConfig.repoOwner || '?'}/{githubConfig.repoName || '?'}</span> pada branch <span className="font-mono font-bold text-blue-700">{githubConfig.branch || 'main'}</span>
                    </div>

                    <button
                      type="button"
                      disabled={isPushingGitHub}
                      onClick={() => handlePushToGitHub()}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                    >
                      {isPushingGitHub ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Sedang Memproses Release ke GitHub...</span>
                        </>
                      ) : (
                        <>
                          <Github className="w-4 h-4 text-white" />
                          <span>Push &amp; Update Versi ke GitHub</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Push Result Banner in Developer Tab */}
                  {gitHubPushResult && (
                    <div className={`p-4 rounded-xl border flex items-start gap-3.5 text-xs animate-in fade-in ${
                      gitHubPushResult.success 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                        : 'bg-rose-50 border-rose-300 text-rose-950'
                    }`}>
                      {gitHubPushResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-bold text-sm">
                            {gitHubPushResult.success ? 'Berhasil Push & Update Versi ke GitHub!' : 'Gagal Push Update ke GitHub'}
                          </h4>
                          {gitHubPushResult.commitSha && (
                            <span className="font-mono text-xs bg-emerald-200 text-emerald-950 px-2.5 py-0.5 rounded-full font-bold">
                              Commit #{gitHubPushResult.commitSha}
                            </span>
                          )}
                        </div>
                        <p className="leading-relaxed">{gitHubPushResult.message}</p>
                        {gitHubPushResult.commitUrl && (
                          <div className="pt-1">
                            <a
                              href={gitHubPushResult.commitUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-emerald-100/60 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 transition-colors shadow-2xs"
                            >
                              <span>Lihat Riwayat Commit di GitHub</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 6: DANGER ZONE (PEMBERSIHAN DATA DENGAN OTORISASI PIN ADMIN) */}
          {/* ========================================================================= */}
          {(activeSection === 'all' || activeSection === 'danger') && (
            <div className="bg-white rounded-2xl border-2 border-rose-200 shadow-sm overflow-hidden ring-1 ring-rose-500/10">
              <div className="p-5 border-b border-rose-100 bg-rose-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                      Danger Zone: Pembersihan &amp; Pengosongan Riwayat Transaksi
                      <span className="text-[10px] bg-rose-200 text-rose-800 font-bold px-2 py-0.5 rounded-full uppercase">
                        Khusus Admin
                      </span>
                    </h3>
                    <p className="text-[11px] text-rose-800">
                      Tindakan ini menghapus seluruh riwayat transaksi pengeluaran dan penerimaan secara permanen.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-rose-50/50 rounded-xl p-4 border border-rose-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <h4 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      Kosongkan Seluruh Riwayat Transaksi (Penyaluran &amp; Penerimaan)
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Menghapus seluruh berkas transaksi <strong>({transaksiList.length} Penyaluran, {penerimaanList.length} Faktur Penerimaan)</strong> dan mereset nomor urut berkas. Data master barang dan profil instansi akan tetap aman tersimpan. Tindakan ini memerlukan otorisasi PIN Administrator.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenResetTransaksi) {
                        onOpenResetTransaksi();
                      }
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer active:scale-98 shrink-0"
                    title="Buka dialog konfirmasi PIN untuk pengosongan transaksi"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                    Kosongkan Transaksi...
                  </button>
                </div>
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
