import { 
  AlertCircle, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Building2, 
  Check, 
  CheckCircle2, 
  Database, 
  ExternalLink, 
  FileSpreadsheet, 
  FolderSync, 
  Link as LinkIcon, 
  Loader2, 
  LogOut, 
  Plus, 
  RefreshCw, 
  Search, 
  Sparkles, 
  Table, 
  Trash2, 
  Unlink, 
  User as UserIcon, 
  X 
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { 
  Barang, 
  GoogleSheetFileItem, 
  GoogleSheetSyncConfig, 
  KopSuratConfig, 
  TransaksiPenerimaan, 
  TransaksiPengeluaran 
} from '../types';
import { 
  getAccessToken, 
  getCurrentGoogleUser, 
  googleSignIn, 
  initAuth, 
  logoutGoogle 
} from '../utils/googleAuth';
import { 
  createInventorySpreadsheet, 
  getSpreadsheetDetails, 
  importMasterBarangFromSheet, 
  listUserSpreadsheets, 
  syncAllDataToSpreadsheet 
} from '../utils/googleSheetsService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  masterBarang: Barang[];
  transaksiList: TransaksiPengeluaran[];
  penerimaanList: TransaksiPenerimaan[];
  kopConfig: KopSuratConfig;
  sheetConfig: GoogleSheetSyncConfig | null;
  onUpdateSheetConfig: (config: GoogleSheetSyncConfig | null) => void;
  onImportBarang: (items: Barang[]) => void;
  showToast: (message: string) => void;
}

export const GoogleSheetsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  masterBarang,
  transaksiList,
  penerimaanList,
  kopConfig,
  sheetConfig,
  onUpdateSheetConfig,
  onImportBarang,
  showToast,
}) => {
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Tab mode
  const [activeTab, setActiveTab] = useState<'sync' | 'create' | 'drive' | 'link'>('sync');

  // Drive files
  const [driveFiles, setDriveFiles] = useState<GoogleSheetFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Manual URL / ID input
  const [manualInput, setManualInput] = useState('');
  const [isValidatingManual, setIsValidatingManual] = useState(false);

  // Sync / Action Loading
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // User Confirmation Dialog for Destructive / Mutating operations (Workspace API compliance)
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'export_overwrite' | 'import_replace' | 'disconnect';
    pendingPayload?: any;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: 'export_overwrite',
  });

  // Init auth state on load
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = initAuth(
      (currentUser, cachedToken) => {
        setUser(currentUser);
        setToken(cachedToken);
      },
      () => {
        setUser(getCurrentGoogleUser());
        getAccessToken().then(t => setToken(t));
      }
    );

    // Initial check
    const cur = getCurrentGoogleUser();
    if (cur) {
      setUser(cur);
      getAccessToken().then(t => setToken(t));
    }

    return () => unsubscribe();
  }, [isOpen]);

  // Load drive files when authenticated and Drive tab selected
  useEffect(() => {
    if (isOpen && token && (activeTab === 'drive' || !sheetConfig)) {
      handleFetchDriveFiles();
    }
  }, [isOpen, token, activeTab]);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        showToast(`Berhasil masuk sebagai ${res.user.email || 'Pengguna Google'}`);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setAuthError(err.message || 'Gagal masuk dengan akun Google. Periksa koneksi internet Anda.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await logoutGoogle();
    setUser(null);
    setToken(null);
    showToast('Berhasil keluar dari akun Google.');
  };

  const handleFetchDriveFiles = async () => {
    if (!token) return;
    setIsLoadingFiles(true);
    setActionError(null);
    try {
      const files = await listUserSpreadsheets(token);
      setDriveFiles(files);
    } catch (err: any) {
      setActionError(err.message || 'Gagal memuat berkas spreadsheet dari Google Drive.');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleConnectSpreadsheet = async (spreadsheetId: string, titleHint?: string) => {
    if (!token) {
      showToast('Silakan masuk dengan akun Google terlebih dahulu.');
      return;
    }

    setActionError(null);
    try {
      const details = await getSpreadsheetDetails(token, spreadsheetId);
      const newConfig: GoogleSheetSyncConfig = {
        spreadsheetId: details.spreadsheetId,
        spreadsheetTitle: details.title || titleHint || 'SIMBA Inventaris Sekolah',
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${details.spreadsheetId}/edit`,
        lastSyncedAt: sheetConfig?.spreadsheetId === details.spreadsheetId ? sheetConfig.lastSyncedAt : undefined,
      };

      onUpdateSheetConfig(newConfig);
      setActiveTab('sync');
      showToast(`Terhubung ke spreadsheet: "${details.title}"`);
    } catch (err: any) {
      setActionError(err.message || 'Gagal menghubungkan spreadsheet.');
    }
  };

  const handleConnectManual = async () => {
    const raw = manualInput.trim();
    if (!raw) return;

    // Extract ID if full URL passed
    let id = raw;
    const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      id = match[1];
    }

    setIsValidatingManual(true);
    setActionError(null);
    try {
      await handleConnectSpreadsheet(id);
      setManualInput('');
    } finally {
      setIsValidatingManual(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!token) {
      showToast('Silakan masuk dengan Google terlebih dahulu.');
      return;
    }

    setIsCreatingSheet(true);
    setActionError(null);
    try {
      const result = await createInventorySpreadsheet(token, kopConfig.namaSekolah, {
        masterBarang,
        transaksiList,
        penerimaanList,
        kopConfig,
      });

      const newConfig: GoogleSheetSyncConfig = {
        spreadsheetId: result.spreadsheetId,
        spreadsheetTitle: result.title,
        spreadsheetUrl: result.spreadsheetUrl,
        lastSyncedAt: new Date().toISOString(),
      };

      onUpdateSheetConfig(newConfig);
      setActiveTab('sync');
      showToast(`Spreadsheet baru berhasil dibuat dan disinkronkan di Google Drive!`);
    } catch (err: any) {
      console.error('Create sheet error:', err);
      setActionError(err.message || 'Gagal membuat spreadsheet di Google Drive.');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Trigger export with mandatory Workspace safety confirmation
  const requestExportToSpreadsheet = () => {
    if (!sheetConfig) return;

    setConfirmationDialog({
      isOpen: true,
      title: 'Konfirmasi Sinkronisasi & Perbarui Data Google Sheets',
      description: `Apakah Anda yakin ingin menimpa data pada spreadsheet "${sheetConfig.spreadsheetTitle}"? Sistem akan memperbarui tab Master_Barang (${masterBarang.length} item), Log_Penyaluran_BOS (${transaksiList.length} transaksi), dan Penerimaan_BOS (${penerimaanList.length} transaksi).`,
      actionType: 'export_overwrite',
    });
  };

  const executeExportToSpreadsheet = async () => {
    if (!token || !sheetConfig) return;

    setIsSyncing(true);
    setActionError(null);
    try {
      await syncAllDataToSpreadsheet(token, sheetConfig.spreadsheetId, {
        masterBarang,
        transaksiList,
        penerimaanList,
        kopConfig,
      });

      const updatedConfig: GoogleSheetSyncConfig = {
        ...sheetConfig,
        lastSyncedAt: new Date().toISOString(),
      };
      onUpdateSheetConfig(updatedConfig);
      showToast('Data inventaris & log transaksi berhasil disinkronkan ke Google Sheets!');
    } catch (err: any) {
      console.error('Sync error:', err);
      setActionError(err.message || 'Gagal sinkronisasi data ke Google Sheets.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger import from sheet
  const requestImportFromSpreadsheet = () => {
    if (!sheetConfig) return;

    setConfirmationDialog({
      isOpen: true,
      title: 'Konfirmasi Impor Data dari Google Sheets',
      description: `Apakah Anda ingin membaca data Master Barang dari spreadsheet "${sheetConfig.spreadsheetTitle}"? Data baru dari spreadsheet akan ditambahkan ke katalog SIMBA.`,
      actionType: 'import_replace',
    });
  };

  const executeImportFromSpreadsheet = async () => {
    if (!token || !sheetConfig) return;

    setIsImporting(true);
    setActionError(null);
    try {
      const result = await importMasterBarangFromSheet(token, sheetConfig.spreadsheetId);
      if (result.items.length === 0) {
        setActionError('Tidak ada baris data barang yang ditemukan pada sheet tersebut.');
        return;
      }

      onImportBarang(result.items);
      showToast(`Berhasil mengimpor ${result.items.length} item barang dari Google Sheets (Sheet: ${result.sheetUsed})!`);
    } catch (err: any) {
      console.error('Import error:', err);
      setActionError(err.message || 'Gagal mengimpor data barang dari Google Sheets.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmAction = async () => {
    const { actionType } = confirmationDialog;
    setConfirmationDialog(prev => ({ ...prev, isOpen: false }));

    if (actionType === 'export_overwrite') {
      await executeExportToSpreadsheet();
    } else if (actionType === 'import_replace') {
      await executeImportFromSpreadsheet();
    } else if (actionType === 'disconnect') {
      onUpdateSheetConfig(null);
      showToast('Tautan Google Spreadsheet berhasil dilepas.');
    }
  };

  const filteredDriveFiles = driveFiles.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-700/80 rounded-xl ring-1 ring-white/20 shadow-xs">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Integrasi Google Sheets</h3>
                <span className="bg-emerald-500/30 text-emerald-100 border border-emerald-400/40 text-[10px] font-bold px-2 py-0.5 rounded">
                  Cloud Live Sync
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Sinkronkan Master Barang, Penyaluran BOS, dan Penerimaan secara dua arah dengan Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Account Authentication Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'Google User'} 
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full border border-slate-300 shadow-xs"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">{user.displayName || 'Akun Google'}</span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terhubung
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">{user.email}</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">Akun Google Belum Terhubung</span>
                    <p className="text-[11px] text-slate-500">
                      Masuk untuk membuat atau menyinkronkan spreadsheet langsung di Google Drive Anda
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-700 bg-white hover:bg-red-50 border border-slate-300 hover:border-red-300 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar Akun
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isLoggingIn}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl shadow-xs text-xs font-semibold flex items-center gap-2 transition-all hover:shadow-sm"
                >
                  {isLoggingIn ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                  )}
                  <span>{isLoggingIn ? 'Menghubungkan...' : 'Masuk dengan Google'}</span>
                </button>
              )}
            </div>
          </div>

          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {actionError && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Connected Spreadsheet Banner */}
          {sheetConfig ? (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-xs mt-0.5">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{sheetConfig.spreadsheetTitle}</h4>
                      <span className="text-[10px] bg-emerald-200/80 text-emerald-800 font-bold px-2 py-0.5 rounded">
                        Aktif
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 mt-1">
                      <span>ID: <code className="font-mono text-emerald-900 bg-emerald-100/80 px-1 py-0.2 rounded">{sheetConfig.spreadsheetId}</code></span>
                      {sheetConfig.lastSyncedAt && (
                        <span className="text-slate-500">
                          Sinkron terakhir: {new Date(sheetConfig.lastSyncedAt).toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={sheetConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200/80 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka di Google Sheets
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmationDialog({
                        isOpen: true,
                        title: 'Lepas Tautan Spreadsheet',
                        description: `Apakah Anda yakin ingin melepas tautan dengan spreadsheet "${sheetConfig.spreadsheetTitle}"? Data di Google Drive Anda tetap aman dan tidak akan terhapus.`,
                        actionType: 'disconnect',
                      });
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Lepas tautan spreadsheet ini"
                  >
                    <Unlink className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sync Actions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-emerald-200/80">
                {/* Export Card */}
                <div className="bg-white p-3.5 rounded-lg border border-emerald-200/90 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                      <ArrowUpFromLine className="w-4 h-4 text-emerald-600" />
                      <span>Kirim / Sinkronkan Data ke Google Sheets</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                      Memperbarui Master Barang ({masterBarang.length}), Log Penyaluran ({transaksiList.length}), dan Penerimaan ({penerimaanList.length}) ke Google Sheets.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={requestExportToSpreadsheet}
                    disabled={isSyncing || !token}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FolderSync className="w-4 h-4" />
                    )}
                    <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                  </button>
                </div>

                {/* Import Card */}
                <div className="bg-white p-3.5 rounded-lg border border-blue-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                      <ArrowDownToLine className="w-4 h-4 text-blue-600" />
                      <span>Tarik / Impor Master Barang dari Google Sheets</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                      Membaca data barang dari sheet <code className="font-mono text-blue-800 bg-blue-50 px-1 py-0.2 rounded">Master_Barang</code> untuk ditambahkan ke katalog SIMBA.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={requestImportFromSpreadsheet}
                    disabled={isImporting || !token}
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isImporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowDownToLine className="w-4 h-4" />
                    )}
                    <span>{isImporting ? 'Membaca Sheet...' : 'Impor dari Spreadsheet'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Belum Ada Spreadsheet yang Ditautkan</strong>
                <span>
                  Pilih salah satu opsi di bawah untuk membuat spreadsheet baru secara otomatis atau memilih spreadsheet yang sudah ada di Google Drive Anda.
                </span>
              </div>
            </div>
          )}

          {/* Tab Navigation for Spreadsheet Setup */}
          <div>
            <div className="flex border-b border-slate-200 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('sync')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'sync'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FolderSync className="w-4 h-4" />
                Status &amp; Sinkronisasi
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'create'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Plus className="w-4 h-4" />
                Buat Spreadsheet Baru
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('drive')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'drive'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Table className="w-4 h-4" />
                Pilih dari Google Drive
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('link')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'link'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                Tautkan via URL / ID
              </button>
            </div>

            {/* Tab 1: Status & Info */}
            {activeTab === 'sync' && (
              <div className="pt-4 space-y-3">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Format Tab &amp; Kolom yang Dikelola di Google Sheets
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 block">1. Master_Barang</span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Kode Barang, Nama, Kategori, Satuan, Harga Satuan, Stok Awal, Stok Sisa, Rekening Belanja.
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 block">2. Log_Penyaluran_BOS</span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      No NPB, SPB, SPPB, BAST, Tanggal, Unit Kerja Pemohon, Total Nilai, dan Rincian Barang.
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 block">3. Penerimaan_BOS</span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      No Bukti Faktur, Sumber Dana (BOS Reguler/Kinerja), Penyedia Toko, dan Item Masuk.
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 block">4. Kop_Instansi</span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Nama Sekolah, Alamat, NPSN, Kota Tanda Tangan, dan Timestamp Sinkronisasi.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Create New Spreadsheet */}
            {activeTab === 'create' && (
              <div className="pt-4 space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Pembuatan Spreadsheet Resmi SIMBA di Google Drive
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Sistem akan secara otomatis membuat berkas spreadsheet baru di Google Drive akun Anda dengan judul:
                    <br />
                    <strong className="text-slate-900 font-mono text-[11px] block mt-1 bg-white p-2 border rounded-md">
                      SIMBA BOS - Inventaris &amp; Pengeluaran [{kopConfig.namaSekolah || 'Sekolah'}] {new Date().getFullYear()}
                    </strong>
                  </p>

                  <div className="text-[11px] text-slate-500 space-y-1 mb-4">
                    <p>✓ Menyiapkan struktur 4 lembar kerja (Master_Barang, Log_Penyaluran_BOS, Penerimaan_BOS, Kop_Instansi)</p>
                    <p>✓ Mengunggah {masterBarang.length} item data barang dan {transaksiList.length} riwayat penyaluran yang ada saat ini</p>
                    <p>✓ Siap dibuka dan dibagikan (*shared*) ke tim bendahara BOS atau kepala sekolah</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateNewSheet}
                    disabled={isCreatingSheet || !token}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isCreatingSheet ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>{isCreatingSheet ? 'Sedang Membuat Berkas...' : 'Buat Spreadsheet Baru Sekarang'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Pick from Google Drive */}
            {activeTab === 'drive' && (
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari berkas spreadsheet di Drive..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchDriveFiles}
                    disabled={isLoadingFiles || !token}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                    Segarkan
                  </button>
                </div>

                {isLoadingFiles ? (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="text-xs">Memuat daftar spreadsheet dari Google Drive...</span>
                  </div>
                ) : filteredDriveFiles.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                    {filteredDriveFiles.map(file => {
                      const isSelected = sheetConfig?.spreadsheetId === file.id;
                      return (
                        <div
                          key={file.id}
                          className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-300'
                              : 'bg-white border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-slate-900 truncate block">
                                {file.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID: {file.id}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <span className="text-[11px] text-emerald-700 font-bold px-2 py-0.5 bg-emerald-100 rounded">
                                Terpilih
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleConnectSpreadsheet(file.id, file.name)}
                                className="px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
                              >
                                Hubungkan
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    {token ? 'Tidak ada berkas spreadsheet yang cocok ditemukan di Google Drive.' : 'Silakan masuk dengan akun Google untuk melihat berkas Drive Anda.'}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Link via URL or ID */}
            {activeTab === 'link' && (
              <div className="pt-4 space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-800">
                    Masukkan URL Lengkap atau ID Google Spreadsheet
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualInput}
                      onChange={e => setManualInput(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                      className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleConnectManual}
                      disabled={isValidatingManual || !manualInput.trim() || !token}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {isValidatingManual ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <LinkIcon className="w-3.5 h-3.5" />
                      )}
                      <span>{isValidatingManual ? 'Memeriksa...' : 'Hubungkan'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Pastikan akun Google yang sedang masuk memiliki hak akses edit (*Editor*) pada spreadsheet tersebut.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Format tabel kompatibel dengan Microsoft Excel &amp; Google Workspace</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Mandatory User Confirmation Modal for Destructive / Mutating operations (Workspace API compliance) */}
      {confirmationDialog.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{confirmationDialog.title}</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {confirmationDialog.description}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <span>Rincian Tindakan:</span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                {confirmationDialog.actionType === 'export_overwrite' && (
                  <>
                    <li>Menulis ulang baris data pada sheet <code className="font-mono text-emerald-800 font-bold">Master_Barang</code></li>
                    <li>Menulis log transaksi pada sheet <code className="font-mono text-emerald-800 font-bold">Log_Penyaluran_BOS</code></li>
                    <li>Menulis riwayat belanja pada sheet <code className="font-mono text-emerald-800 font-bold">Penerimaan_BOS</code></li>
                  </>
                )}
                {confirmationDialog.actionType === 'import_replace' && (
                  <>
                    <li>Membaca data dari Google Sheets ke dalam aplikasi SIMBA</li>
                    <li>Menambahkan item barang baru ke dalam katalog sistem</li>
                  </>
                )}
                {confirmationDialog.actionType === 'disconnect' && (
                  <li>Melepas hubungan konfigurasi spreadsheet aktif di aplikasi</li>
                )}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setConfirmationDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-xs transition-colors ${
                  confirmationDialog.actionType === 'disconnect'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Lanjutkan &amp; Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
