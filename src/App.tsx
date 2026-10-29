/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CheckCircle, Info, LayoutDashboard, Lock, ShieldAlert, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { DashboardStats } from './components/DashboardStats';
import { DocumentViewer } from './components/DocumentViewer';
import { KopSettingsModal } from './components/KopSettingsModal';
import { MasterBarangTable } from './components/MasterBarangTable';
import { MasterPejabatTable } from './components/MasterPejabatTable';
import { MainTab } from './components/Navbar';
import { AppSidebar } from './components/layout/AppSidebar';
import { AppTopbar } from './components/layout/AppTopbar';
import { NumberingSettingsModal } from './components/NumberingSettingsModal';
import { PenerimaanForm } from './components/PenerimaanForm';
import { ResetScopeOptions, ResetTransaksiModal } from './components/ResetTransaksiModal';
import { SchemaAndScriptModal } from './components/SchemaAndScriptModal';
import { StaffPermintaanNPBView } from './components/StaffPermintaanNPBView';
import { TransactionForm } from './components/TransactionForm';
import { UserManagementModal } from './components/UserManagementModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { APP_CONFIG } from './config/appConfig';
import { LoginView } from './components/LoginView';
import { AuditLogModal } from './components/AuditLogModal';
import { SecurityDeleteConfirmModal } from './components/SecurityDeleteConfirmModal';
import { UnifiedSettingsModal } from './components/UnifiedSettingsModal';
import { DocumentVerificationModal } from './components/DocumentVerificationModal';
import { buildVerificationData, DocTypeShort, VerificationData } from './utils/qrVerificationHelper';
import { logAuditEvent } from './utils/auditLogger';
import { exportFullDatabase, getLastBackupTime } from './utils/backupHelper';
import { 
  DEFAULT_BARANG, 
  DEFAULT_KATEGORI_LIST,
  DEFAULT_KOP_SURAT, 
  DEFAULT_PEJABAT, 
  DEFAULT_TRANSAKSI_PENERIMAAN, 
  DEFAULT_TRANSAKSI_PENGELUARAN 
} from './data/defaultData';
import { DEFAULT_USERS } from './data/defaultUsers';
import { 
  DEFAULT_PRIMARY_SEKOLAH_ID
} from './data/defaultSchools';
import { 
  AppUser, 
  Barang, 
  GoogleSheetSyncConfig,
  JenisBarang,
  KategoriBarangItem,
  KopSuratConfig, 
  NumberingPatternConfig, 
  PaperSize,
  Pejabat, 
  Sekolah,
  TransaksiPenerimaan, 
  TransaksiPengeluaran, 
  UserRole 
} from './types';
import { CategoryFormData } from './components/MasterKategoriManager';
import { DEFAULT_NUMBERING_CONFIG } from './utils/numberGenerator';
import { getNamaRekeningByKode } from './data/kodeRekeningData';
import { applyThemeConfig, getStoredThemeConfig } from './utils/themeHelper';

export default function App() {
  // Single-Tenant School Configuration (SMAN 1 CIHAURBEUTI)
  const defaultSchoolObj: Sekolah = useMemo(() => ({
    id: DEFAULT_PRIMARY_SEKOLAH_ID,
    nama: APP_CONFIG.defaultSchool.namaSekolah,
    nama_sekolah: APP_CONFIG.defaultSchool.namaSekolah,
    npsn: APP_CONFIG.defaultSchool.npsn,
    instansi: APP_CONFIG.defaultSchool.instansi,
    wilayah: APP_CONFIG.defaultSchool.wilayah,
    alamat: 'Jl. Kartawijaya No. 600, Cihaurbeuti',
    kabupaten_kota: 'Kabupaten Ciamis',
    kota: 'Ciamis',
    provinsi: 'Jawa Barat',
    telepon: '(0265) 771234',
    email: 'info@sman1cihaurbeuti.sch.id',
    website: 'https://sman1cihaurbeuti.sch.id',
    jenjang: 'SMA',
    status: 'Negeri',
    isActive: true
  }), []);

  const [sekolahList] = useState<Sekolah[]>([defaultSchoolObj]);
  const currentSekolahId = DEFAULT_PRIMARY_SEKOLAH_ID;

  // Single-Tenant Kop Surat Config
  const [kopConfig, setKopConfig] = useState<KopSuratConfig>(() => {
    const saved = localStorage.getItem('simba_kop_config');
    return saved ? JSON.parse(saved) : DEFAULT_KOP_SURAT;
  });

  // Single-Tenant Numbering Pattern Config
  const [numberingConfig, setNumberingConfig] = useState<NumberingPatternConfig>(() => {
    const saved = localStorage.getItem('simba_numbering_config');
    return saved ? JSON.parse(saved) : DEFAULT_NUMBERING_CONFIG;
  });

  const [pejabatList, setPejabatList] = useState<Pejabat[]>(() => {
    const saved = localStorage.getItem('simba_pejabat_list');
    let list: Pejabat[] = saved ? JSON.parse(saved) : DEFAULT_PEJABAT;
    return list.map(p => {
      let role = p.role;
      if (!role) {
        if (p.id?.includes('kepsek') || p.jabatan?.toLowerCase().includes('kepala sekolah')) {
          role = 'kepala_sekolah';
        } else if (p.id?.includes('pengurus-barang') || p.jabatan?.toLowerCase().includes('pengurus barang') || p.jabatan?.toLowerCase().includes('pengelola persediaan')) {
          role = 'pengurus_barang';
        } else if (p.id?.includes('sarpras') || p.jabatan?.toLowerCase().includes('sarpras') || p.jabatan?.toLowerCase().includes('sarana') || p.jabatan?.toLowerCase().includes('wakasek')) {
          role = 'sarpras';
        } else if (p.id?.includes('bendahara') || p.jabatan?.toLowerCase().includes('bendahara')) {
          role = 'bendahara_bos';
        }
      }
      return {
        ...p,
        role
      };
    });
  });

  const [masterBarang, setMasterBarang] = useState<Barang[]>(() => {
    const saved = localStorage.getItem('simba_master_barang');
    let list: Barang[] = saved ? JSON.parse(saved) : DEFAULT_BARANG;
    return list.map(b => {
      const kode = b.kodeRekening?.trim() || '5.1.02.01.01.0024';
      const officialName = getNamaRekeningByKode(kode);
      return {
        ...b,
        kodeRekening: kode,
        namaRekening: officialName,
        kategori: officialName
      };
    });
  });

  const [kategoriList, setKategoriList] = useState<KategoriBarangItem[]>(() => {
    const saved = localStorage.getItem('simba_kategori_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse simba_kategori_list from localStorage:', e);
      }
    }
    return DEFAULT_KATEGORI_LIST;
  });

  const [transaksiList, setTransaksiList] = useState<TransaksiPengeluaran[]>(() => {
    const saved = localStorage.getItem('simba_transaksi_list');
    let list: TransaksiPengeluaran[] = saved ? JSON.parse(saved) : DEFAULT_TRANSAKSI_PENGELUARAN;
    return list.map(trx => ({
      ...trx,
      items: trx.items.map(it => {
        const kode = it.kodeRekening?.trim() || '5.1.02.01.01.0024';
        const officialName = getNamaRekeningByKode(kode);
        return {
          ...it,
          kodeRekening: kode,
          namaRekening: officialName || it.namaRekening
        };
      })
    }));
  });

  const [penerimaanList, setPenerimaanList] = useState<TransaksiPenerimaan[]>(() => {
    const saved = localStorage.getItem('simba_penerimaan_list');
    let list: TransaksiPenerimaan[] = saved ? JSON.parse(saved) : DEFAULT_TRANSAKSI_PENERIMAAN;
    return list.map(rcv => ({
      ...rcv,
      items: rcv.items.map(it => {
        const kode = it.kodeRekening?.trim() || '5.1.02.01.01.0024';
        const officialName = getNamaRekeningByKode(kode);
        return {
          ...it,
          kodeRekening: kode,
          namaRekening: officialName || it.namaRekening
        };
      })
    }));
  });

  // User Management & Roles
  const [userList, setUserList] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem('simba_users_list');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const saved = localStorage.getItem('simba_current_user_id');
    return saved ? saved : (DEFAULT_USERS[0]?.id || 'user-admin-1');
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // 1. Check temporary browser session in sessionStorage
    const sessionAuth = sessionStorage.getItem('simba_auth_session');
    if (sessionAuth === 'true') {
      return true;
    }
    // 2. Check persistent session in localStorage ONLY if "Ingat Saya di Perangkat Ini" was activated
    const rememberMe = localStorage.getItem('simba_remember_me');
    const localAuth = localStorage.getItem('simba_auth_session');
    if (rememberMe === 'true' && localAuth === 'true') {
      return true;
    }
    // 3. Default: Always force login page at launch (Auth Guard)
    return false;
  });

  // UI Navigation & Modals State
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedTransaksiId, setSelectedTransaksiId] = useState<string>(
    transaksiList[0]?.id || ''
  );
  const [generatorInitialDocType, setGeneratorInitialDocType] = useState<DocumentType>('spb');
  const [generatorInitialBarangId, setGeneratorInitialBarangId] = useState<string>('');
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [isNewTransaksiModalOpen, setIsNewTransaksiModalOpen] = useState(false);
  const [editingTransaksi, setEditingTransaksi] = useState<TransaksiPengeluaran | null>(null);
  const [isNewPenerimaanModalOpen, setIsNewPenerimaanModalOpen] = useState(false);
  const [editingPenerimaan, setEditingPenerimaan] = useState<TransaksiPenerimaan | null>(null);
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: 'penyaluran' | 'penerimaan';
    transaksiPenyaluran?: TransaksiPengeluaran | null;
    transaksiPenerimaan?: TransaksiPenerimaan | null;
  }>({
    isOpen: false,
    type: 'penyaluran'
  });
  const [isKopSettingsOpen, setIsKopSettingsOpen] = useState(false);
  const [isNumberingSettingsOpen, setIsNumberingSettingsOpen] = useState(false);
  const [isUnifiedSettingsOpen, setIsUnifiedSettingsOpen] = useState(false);
  const [unifiedSettingsTab, setUnifiedSettingsTab] = useState<'all' | 'kop' | 'numbering' | 'pejabat' | 'backup' | 'github' | 'danger' | 'theme'>('all');
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(getLastBackupTime());

  // Inisialisasi Tema & Gaya Tampilan tersimpan secara instan pada saat aplikasi dimuat
  useEffect(() => {
    applyThemeConfig(getStoredThemeConfig());
  }, []);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isResetTransaksiOpen, setIsResetTransaksiOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [isGoogleSheetsOpen, setIsGoogleSheetsOpen] = useState(false);
  const [googleSheetConfig, setGoogleSheetConfig] = useState<GoogleSheetSyncConfig | null>(() => {
    const saved = localStorage.getItem('simba_gsheet_config');
    return saved ? JSON.parse(saved) : null;
  });
  const [forbiddenRoute, setForbiddenRoute] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Digital Document Verification Modal (QR Code Validasi)
  const [verificationModalState, setVerificationModalState] = useState<{
    isOpen: boolean;
    data: VerificationData | null;
    transaksi?: TransaksiPengeluaran | null;
  }>({
    isOpen: false,
    data: null
  });

  // Listen for verification requests (from QR code clicks on printed docs or buttons)
  useEffect(() => {
    const handleVerifyEvent = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        setVerificationModalState({
          isOpen: true,
          data: customEvt.detail,
          transaksi: customEvt.detail.transaksi || null
        });
      }
    };
    window.addEventListener('simba:verify-doc', handleVerifyEvent);
    return () => {
      window.removeEventListener('simba:verify-doc', handleVerifyEvent);
    };
  }, []);

  // Handle URL verification params (e.g. when QR code is scanned with mobile phone camera)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('verify') === 'doc') {
          const id = searchParams.get('id');
          const type = (searchParams.get('type') || 'npb').toUpperCase() as DocTypeShort;
          const no = searchParams.get('no') || '';

          const matched = transaksiList.find(t => t.id === id || t.noNPB === no || t.noSPB === no || t.noSPPB === no || t.noBAST === no);
          if (matched) {
            const docNo = no || (type === 'NPB' ? matched.noNPB : type === 'SPB' ? matched.noSPB : type === 'SPPB' ? matched.noSPPB : matched.noBAST);
            const matchedKop = kopConfig || DEFAULT_KOP_SURAT;
            const verifData = buildVerificationData(type, matched, docNo, matchedKop);
            setVerificationModalState({
              isOpen: true,
              data: verifData,
              transaksi: matched
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to parse URL verification parameters:', err);
    }
  }, [transaksiList, kopConfig]);

  const handleUpdateSheetConfig = (newCfg: GoogleSheetSyncConfig | null) => {
    setGoogleSheetConfig(newCfg);
    if (newCfg) {
      localStorage.setItem('simba_gsheet_config', JSON.stringify(newCfg));
    } else {
      localStorage.removeItem('simba_gsheet_config');
    }
  };

  // Sync to localStorage (Single-Tenant)
  useEffect(() => {
    localStorage.setItem('simba_kop_config', JSON.stringify(kopConfig));
  }, [kopConfig]);

  useEffect(() => {
    localStorage.setItem('simba_numbering_config', JSON.stringify(numberingConfig));
  }, [numberingConfig]);

  useEffect(() => {
    localStorage.setItem('simba_pejabat_list', JSON.stringify(pejabatList));
  }, [pejabatList]);

  useEffect(() => {
    localStorage.setItem('simba_master_barang', JSON.stringify(masterBarang));
  }, [masterBarang]);

  useEffect(() => {
    localStorage.setItem('simba_kategori_list', JSON.stringify(kategoriList));
  }, [kategoriList]);

  useEffect(() => {
    localStorage.setItem('simba_transaksi_list', JSON.stringify(transaksiList));
  }, [transaksiList]);

  useEffect(() => {
    localStorage.setItem('simba_penerimaan_list', JSON.stringify(penerimaanList));
  }, [penerimaanList]);

  useEffect(() => {
    localStorage.setItem('simba_users_list', JSON.stringify(userList));
  }, [userList]);

  useEffect(() => {
    localStorage.setItem('simba_current_user_id', currentUserId);
  }, [currentUserId]);

  const currentUser: AppUser = userList.find(u => u.id === currentUserId) || userList[0] || {
    id: 'user-admin-1',
    nama: 'Dedi Kurniawan, S.Pd.',
    username: 'admin',
    role: 'admin',
    jabatan: 'Administrator Sistem & Pengurus Barang',
    unitKerja: 'Subbag Tata Usaha & IT'
  };

  // ROUTE CONTROLLER (Single-Tenant Pure Navigation)
  useEffect(() => {
    const handleLocationChange = () => {
      const pathname = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase().replace('#', '');
      
      if (pathname.includes('generator') || hash === 'generator') {
        setActiveTab('generator');
      } else if (pathname.includes('master-barang') || hash === 'barang') {
        setActiveTab('barang');
      } else if (pathname.includes('master-pegawai') || hash === 'pejabat') {
        setActiveTab('pejabat');
      } else {
        setActiveTab('dashboard');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab);
    if (window.history.pushState) {
      const pathMap: Record<MainTab, string> = {
        dashboard: '/',
        generator: '/generator',
        barang: '/master-barang',
        pejabat: '/master-pegawai'
      };
      window.history.pushState(null, '', pathMap[tab] || '/');
    }
  };

  // Active School Entity (Single-Tenant)
  const activeSekolah: Sekolah = useMemo(() => {
    return {
      id: DEFAULT_PRIMARY_SEKOLAH_ID,
      nama: kopConfig.namaSekolah || APP_CONFIG.defaultSchool.namaSekolah,
      nama_sekolah: kopConfig.namaSekolah || APP_CONFIG.defaultSchool.namaSekolah,
      npsn: kopConfig.npsn || APP_CONFIG.defaultSchool.npsn,
      alamat: kopConfig.alamatLengkap,
      kota: kopConfig.kotaSurat,
      provinsi: 'Jawa Barat',
      status: 'Negeri',
      jenjang: 'SMA',
      isActive: true
    };
  }, [kopConfig]);

  const activeKopConfig: KopSuratConfig = kopConfig;
  const activeNumberingConfig: NumberingPatternConfig = numberingConfig;

  // Single-Tenant Datasets: Direct access without relational filtering overhead
  const scopedBarang = masterBarang;
  const scopedTransaksi = transaksiList;
  const scopedPenerimaan = penerimaanList;
  const scopedPejabat = pejabatList;

  // Synchronize selected transaction
  useEffect(() => {
    if (scopedTransaksi.length > 0) {
      if (!scopedTransaksi.some(t => t.id === selectedTransaksiId)) {
        setSelectedTransaksiId(scopedTransaksi[0].id);
      }
    } else {
      setSelectedTransaksiId('');
    }
  }, [scopedTransaksi, selectedTransaksiId]);

  const handleUpdateKopConfig = (newKop: KopSuratConfig) => {
    setKopConfig(newKop);
    localStorage.setItem('simba_kop_config', JSON.stringify(newKop));
    logAuditEvent({
      userId: currentUser.id,
      username: currentUser.username,
      userName: currentUser.nama,
      userRole: currentUser.role,
      action: 'UPDATE_KOP',
      title: `Pembaruan Kop Surat ${newKop.namaSekolah}`,
      details: `Kop surat dan identitas lembaga telah diperbarui untuk ${newKop.namaSekolah} (NPSN: ${newKop.npsn}).`,
      status: 'SUCCESS'
    });
    showToast('Identitas dan Kop Surat sekolah berhasil diperbarui.');
  };

  const handleUpdateNumberingConfig = (newCfg: NumberingPatternConfig) => {
    setNumberingConfig(newCfg);
    localStorage.setItem('simba_numbering_config', JSON.stringify(newCfg));
    logAuditEvent({
      userId: currentUser.id,
      username: currentUser.username,
      userName: currentUser.nama,
      userRole: currentUser.role,
      action: 'UPDATE_NOMOR',
      title: 'Pembaruan Format Nomor Surat',
      details: 'Pola format nomor NPB, SPB, SPPB, BAST berhasil diperbarui.',
      status: 'SUCCESS'
    });
    showToast('Pengaturan pola penomoran dokumen berhasil diperbarui.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  useEffect(() => {
    const handleCustomToast = (e: any) => {
      if (e?.detail) {
        showToast(String(e.detail));
      }
    };
    window.addEventListener('simba:toast', handleCustomToast);
    return () => window.removeEventListener('simba:toast', handleCustomToast);
  }, []);

  // Handler: Save or Update Disbursement Transaction (NPB/SPB/SPPB/BAST)
  const handleSaveTransaksi = (trxData: TransaksiPengeluaran) => {
    // Validasi Ketat: Jangan pernah mengizinkan stok menjadi negatif (Ketentuan Bagian F)
    for (const item of trxData.items) {
      const b = masterBarang.find(mb => mb.id === item.barangId);
      if (b) {
        const previousIssued = editingTransaksi 
          ? (editingTransaksi.items.find(it => it.barangId === b.id)?.usulanJumlah || 0)
          : 0;
        const availableStock = b.stokSekarang + previousIssued;
        if (item.usulanJumlah > availableStock) {
          alert('Stok tidak mencukupi. Jumlah pengeluaran melebihi stok tersedia.');
          return;
        }
      }
    }

    if (editingTransaksi) {
      // EDIT MODE: Re-calculate stock difference automatically
      const oldTrx = editingTransaksi;

      setMasterBarang(prev => 
        prev.map(b => {
          const oldQty = oldTrx.items.find(it => it.barangId === b.id)?.usulanJumlah || 0;
          const newQty = trxData.items.find(it => it.barangId === b.id)?.usulanJumlah || 0;
          const delta = newQty - oldQty; // positive: more items taken, deduct from stock
          if (delta !== 0) {
            return {
              ...b,
              stokSekarang: Math.max(0, b.stokSekarang - delta)
            };
          }
          return b;
        })
      );

      setTransaksiList(prev => prev.map(t => t.id === trxData.id ? trxData : t));
      setSelectedTransaksiId(trxData.id);
      setIsNewTransaksiModalOpen(false);
      setEditingTransaksi(null);

      logAuditEvent({
        userId: currentUser.id,
        username: currentUser.username,
        userName: currentUser.nama,
        userRole: currentUser.role,
        action: 'EDIT_TRANSAKSI',
        title: `Koreksi Transaksi Penyaluran #${trxData.nomorUrut} (${trxData.noSPB})`,
        details: `Koreksi data transaksi penyaluran #${trxData.nomorUrut} (${trxData.unitPemohon}). Selisih stok barang telah disinkronkan otomatis.`,
        status: 'SUCCESS'
      });

      showToast(`Transaksi #${trxData.nomorUrut} berhasil diperbarui! Selisih stok telah dikalkulasi ulang.`);
    } else {
      // CREATE MODE: Add new transaction and deduct stock
      setTransaksiList([trxData, ...transaksiList]);

      setMasterBarang(prev => 
        prev.map(b => {
          const matchingItem = trxData.items.find(it => it.barangId === b.id);
          if (matchingItem) {
            return {
              ...b,
              stokSekarang: Math.max(0, b.stokSekarang - matchingItem.usulanJumlah)
            };
          }
          return b;
        })
      );

      setSelectedTransaksiId(trxData.id);
      setIsNewTransaksiModalOpen(false);
      // Pengguna tetap berada di Dashboard / Daftar Transaksi (tidak otomatis dialihkan ke cetak)

      logAuditEvent({
        userId: currentUser.id,
        username: currentUser.username,
        userName: currentUser.nama,
        userRole: currentUser.role,
        action: 'TAMBAH_TRANSAKSI',
        title: `Pencatatan Penyaluran Baru #${trxData.nomorUrut} [${activeSekolah.nama}]`,
        details: `Menerbitkan 4 berkas dokumen (NPB, SPB, SPPB, BAST) untuk unit ${trxData.unitPemohon} (${trxData.items.length} item).`,
        status: 'SUCCESS'
      });

      showToast(`Transaksi #${trxData.nomorUrut} berhasil disimpan! Rantai 4 dokumen resmi (NPB, SPB, SPPB, BAST) siap dicetak.`);
    }
  };

  // Handler: Open Edit Transaction Modal
  const handleOpenEditTransaksi = (trx: TransaksiPengeluaran) => {
    setEditingTransaksi(trx);
    setIsNewTransaksiModalOpen(true);
  };

  // Handler: Prompt Delete Transaction (RBAC Check)
  const handlePromptDeleteTransaksi = (trx: TransaksiPengeluaran) => {
    if (currentUser.role !== 'admin') {
      showToast('Akses Ditolak: Fitur hapus transaksi hanya aktif untuk pengguna ber-role Admin.');
      return;
    }
    setDeleteModalState({
      isOpen: true,
      type: 'penyaluran',
      transaksiPenyaluran: trx
    });
  };

  // Handler: Confirm Delete Transaction & Auto Restock (Stock Reversal)
  const handleConfirmDeleteTransaksi = () => {
    const trx = deleteModalState.transaksiPenyaluran;
    if (!trx) return;

    // Automatic Stock Reversal: Restock items back to warehouse
    setMasterBarang(prev => 
      prev.map(b => {
        const matching = trx.items.find(it => it.barangId === b.id);
        if (matching) {
          return {
            ...b,
            stokSekarang: b.stokSekarang + matching.usulanJumlah
          };
        }
        return b;
      })
    );

    // Remove from transaction list
    setTransaksiList(prev => prev.filter(t => t.id !== trx.id));
    if (selectedTransaksiId === trx.id) {
      const remaining = scopedTransaksi.filter(t => t.id !== trx.id);
      setSelectedTransaksiId(remaining[0]?.id || '');
    }

    logAuditEvent({
      userId: currentUser.id,
      username: currentUser.username,
      userName: currentUser.nama,
      userRole: currentUser.role,
      action: 'HAPUS_TRANSAKSI',
      title: `Hapus Transaksi Penyaluran #${trx.nomorUrut} & Reversi Stok`,
      details: `Transaksi #${trx.nomorUrut} (${trx.noSPB}) untuk unit ${trx.unitPemohon} dihapus. Saldo stok barang telah dikembalikan (restocked) ke gudang.`,
      status: 'SUCCESS'
    });

    showToast(`Transaksi #${trx.nomorUrut} berhasil dihapus. Seluruh barang telah dikembalikan ke stok gudang.`);
  };

  // Handler: Save or Update Receipt of Goods (BOS)
  const handleSavePenerimaan = (rcvData: TransaksiPenerimaan) => {
    if (editingPenerimaan) {
      // EDIT MODE: Re-calculate stock difference and update price
      const oldRcv = editingPenerimaan;

      setMasterBarang(prev =>
        prev.map(b => {
          const oldQty = oldRcv.items.find(it => it.barangId === b.id)?.jumlahMasuk || 0;
          const newItem = rcvData.items.find(it => it.barangId === b.id);
          const newQty = newItem?.jumlahMasuk || 0;
          const delta = newQty - oldQty; // positive: more items arrived, add to stock
          
          if (delta !== 0 || (newItem && newItem.hargaSatuan !== b.hargaSatuan)) {
            return {
              ...b,
              stokSekarang: Math.max(0, b.stokSekarang + delta),
              hargaSatuan: newItem ? newItem.hargaSatuan : b.hargaSatuan
            };
          }
          return b;
        })
      );

      setPenerimaanList(prev => prev.map(p => p.id === rcvData.id ? rcvData : p));
      setIsNewPenerimaanModalOpen(false);
      setEditingPenerimaan(null);

      logAuditEvent({
        userId: currentUser.id,
        username: currentUser.username,
        userName: currentUser.nama,
        userRole: currentUser.role,
        action: 'EDIT_PENERIMAAN',
        title: `Koreksi Faktur Penerimaan (${rcvData.noBukti})`,
        details: `Memperbarui faktur penerimaan ${rcvData.noBukti} (${rcvData.sumberDana}) dari rekanan ${rcvData.penyedia}. Selisih stok disinkronkan otomatis.`,
        status: 'SUCCESS'
      });

      showToast(`Faktur ${rcvData.noBukti} berhasil diperbarui! Selisih stok telah disinkronkan.`);
    } else {
      // CREATE MODE: Add receipt, increase stock, and update price
      setPenerimaanList([rcvData, ...penerimaanList]);

      setMasterBarang(prev =>
        prev.map(b => {
          const item = rcvData.items.find(it => it.barangId === b.id);
          if (item) {
            return {
              ...b,
              stokSekarang: b.stokSekarang + item.jumlahMasuk,
              hargaSatuan: item.hargaSatuan
            };
          }
          return b;
        })
      );

      setIsNewPenerimaanModalOpen(false);

      logAuditEvent({
        userId: currentUser.id,
        username: currentUser.username,
        userName: currentUser.nama,
        userRole: currentUser.role,
        action: 'TAMBAH_PENERIMAAN',
        title: `Pencatatan Penerimaan Baru (${rcvData.noBukti}) [${activeSekolah.nama}]`,
        details: `Mencatat faktur belanja ${rcvData.sumberDana} dari ${rcvData.penyedia} dengan total nilai ${rcvData.totalNilai}.`,
        status: 'SUCCESS'
      });

      showToast(`Penerimaan barang dari ${rcvData.penyedia} (${rcvData.sumberDana}) berhasil dicatat. Stok bertambah & tercatat di Buku Rekap BOS.`);
    }
  };

  // Handler: Open Edit Receipt Modal
  const handleOpenEditPenerimaan = (rcv: TransaksiPenerimaan) => {
    setEditingPenerimaan(rcv);
    setIsNewPenerimaanModalOpen(true);
  };

  // Handler: Prompt Delete Receipt (RBAC Check)
  const handlePromptDeletePenerimaan = (rcv: TransaksiPenerimaan) => {
    if (currentUser.role !== 'admin') {
      showToast('Akses Ditolak: Fitur hapus penerimaan hanya aktif untuk pengguna ber-role Admin.');
      return;
    }
    setDeleteModalState({
      isOpen: true,
      type: 'penerimaan',
      transaksiPenerimaan: rcv
    });
  };

  // Handler: Confirm Delete Receipt & Auto Reduce Stock (Stock Reversal)
  const handleConfirmDeletePenerimaan = () => {
    const rcv = deleteModalState.transaksiPenerimaan;
    if (!rcv) return;

    // Automatic Stock Reversal: Subtract items from warehouse
    setMasterBarang(prev =>
      prev.map(b => {
        const matching = rcv.items.find(it => it.barangId === b.id);
        if (matching) {
          return {
            ...b,
            stokSekarang: Math.max(0, b.stokSekarang - matching.jumlahMasuk)
          };
        }
        return b;
      })
    );

    // Remove from receipt list
    setPenerimaanList(prev => prev.filter(p => p.id !== rcv.id));

    logAuditEvent({
      userId: currentUser.id,
      username: currentUser.username,
      userName: currentUser.nama,
      userRole: currentUser.role,
      action: 'HAPUS_PENERIMAAN',
      title: `Hapus Faktur Penerimaan ${rcv.noBukti} & Reversi Stok`,
      details: `Faktur belanja ${rcv.noBukti} (${rcv.sumberDana}) dihapus. Saldo stok gudang telah dikurangi sesuai volume faktur.`,
      status: 'SUCCESS'
    });

    showToast(`Faktur ${rcv.noBukti} berhasil dihapus. Saldo stok gudang telah dikurangi secara otomatis.`);
  };

  // Master Barang Handlers (Single-Tenant)
  const handleAddBarang = (b: Barang) => {
    setMasterBarang(prev => [...prev, b]);
    showToast(`Barang ${b.namaBarang} berhasil ditambahkan ke Master Barang [${activeSekolah.nama}].`);
  };

  const handleUpdateBarang = (b: Barang) => {
    setMasterBarang(masterBarang.map(item => item.id === b.id ? b : item));
    showToast(`Data barang ${b.namaBarang} diperbarui.`);
  };

  const handleDeleteBarang = (id: string) => {
    const b = masterBarang.find(item => item.id === id);
    if (confirm(`Apakah Anda yakin ingin menghapus "${b?.namaBarang}"?`)) {
      setMasterBarang(masterBarang.filter(item => item.id !== id));
      showToast(`Barang berhasil dihapus.`);
    }
  };

  const handleImportBarang = (importedList: Barang[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
      setMasterBarang(importedList);
      showToast(`Berhasil mengganti seluruh Master Barang [${activeSekolah.nama}] dengan ${importedList.length} inventaris dari Excel.`);
    } else {
      setMasterBarang(prev => [...prev, ...importedList]);
      showToast(`Berhasil mengimpor ${importedList.length} inventaris barang ke [${activeSekolah.nama}].`);
    }
  };

  // Master Pejabat Handlers (Single-Tenant)
  const handleAddPejabat = (p: Pejabat) => {
    setPejabatList(prev => [...prev, p]);
    showToast(`Pejabat ${p.nama} berhasil ditambahkan untuk [${activeSekolah.nama}].`);
  };

  const handleUpdatePejabat = (p: Pejabat) => {
    setPejabatList(pejabatList.map(item => item.id === p.id ? p : item));
    showToast(`Data pejabat ${p.nama} diperbarui.`);
  };

  const handleDeletePejabat = (id: string) => {
    const p = pejabatList.find(item => item.id === id);
    if (confirm(`Apakah Anda yakin ingin menghapus pegawai "${p?.nama}"?`)) {
      setPejabatList(pejabatList.filter(item => item.id !== id));
      showToast(`Pegawai berhasil dihapus.`);
    }
  };

  const handleImportPejabat = (importedList: Pejabat[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
      setPejabatList(importedList);
      showToast(`Berhasil mengganti data Pegawai [${activeSekolah.nama}] dengan ${importedList.length} data baru.`);
    } else {
      setPejabatList(prev => [...prev, ...importedList]);
      showToast(`Berhasil mengimpor ${importedList.length} pegawai baru ke [${activeSekolah.nama}].`);
    }
  };

  const handleSelectForPrint = (trxId: string, docType?: DocumentType) => {
    setSelectedTransaksiId(trxId);
    if (docType) {
      setGeneratorInitialDocType(docType);
    } else {
      setGeneratorInitialDocType('bundle');
    }
    setActiveTab('generator');
  };

  // Fitur Keamanan & Pembersihan Data (Reset Transaksi / Reset Scope Data) - Khusus Admin
  const handleResetTransaksi = (options: ResetScopeOptions) => {
    if (currentUser.role !== 'admin') {
      alert('Akses Ditolak: Fitur kosongkan data hanya dapat dijalankan oleh Admin sistem.');
      return;
    }

    const clearedItems: string[] = [];

    // 1. Penyaluran (NPB, SPB, SPPB, BAST)
    if (options.deletePenyaluran) {
      setTransaksiList([]);
      setSelectedTransaksiId('');
      clearedItems.push('Riwayat Penyaluran');
    }

    // 2. Penerimaan / Barang Masuk BOS
    if (options.deletePenerimaan) {
      setPenerimaanList([]);
      clearedItems.push('Faktur Penerimaan BOS');
    }

    // 3. Mutasi Stok & Master Data Barang
    if (options.deleteMasterBarang) {
      setMasterBarang([]);
      clearedItems.push('Master Data Barang & NUSP');
    } else if (options.deleteMutasiStok || options.deletePenyaluran || options.deletePenerimaan) {
      if (options.restoreStockToInitial) {
        setMasterBarang(prev =>
          prev.map(b => ({ ...b, stokSekarang: b.stokAwal }))
        );
        clearedItems.push('Stok Fisik Dikembalikan ke Stok Awal');
      } else {
        clearedItems.push('Stok Berjalan Dipertahankan');
      }
    }

    // 4. Master Data Pegawai
    if (options.deleteMasterPegawai) {
      setPejabatList([]);
      clearedItems.push('Master Data Pegawai');
    }

    // Master Kode Rekening Belanja (40 item resmi) TETAP AMAN / Permanen (Read-only)
    const summaryMsg = clearedItems.length > 0 
      ? `Pengosongan data [${activeSekolah.nama}] berhasil: ${clearedItems.join(', ')}. Master Kode Rekening Belanja tetap aman.`
      : 'Tidak ada modul data yang dipilih untuk dikosongkan.';

    showToast(summaryMsg);
  };

  // User Management Handlers
  const handleAddUser = (newUser: AppUser) => {
    setUserList(prev => [...prev, newUser]);
    showToast(`Pengguna baru "${newUser.nama}" (${newUser.role}) berhasil ditambahkan.`);
  };

  const handleUpdateUser = (updatedUser: AppUser) => {
    setUserList(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    showToast(`Data akun "${updatedUser.nama}" diperbarui.`);
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUserId) {
      alert('Tidak dapat menghapus akun yang sedang aktif digunakan.');
      return;
    }
    const target = userList.find(u => u.id === userId);
    setUserList(prev => prev.filter(u => u.id !== userId));
    showToast(`Akun "${target?.nama || ''}" berhasil dihapus.`);
  };

  const handleSwitchUser = (userId: string) => {
    const target = userList.find(u => u.id === userId);
    if (target) {
      setCurrentUserId(target.id);
      showToast(`Beralih akun sebagai: ${target.nama} (${target.role.toUpperCase()})`);
    }
  };

  const handleQuickSwitchRole = (role: UserRole) => {
    const targetUser = userList.find(u => u.role === role);
    if (targetUser) {
      setCurrentUserId(targetUser.id);
      showToast(`Beralih peran ke: ${role.toUpperCase()} (${targetUser.nama})`);
    } else {
      const updated = { ...currentUser, role };
      handleUpdateUser(updated);
      showToast(`Peran akun "${currentUser.nama}" diubah menjadi ${role.toUpperCase()}.`);
    }
  };

  const handleLoginSuccess = (user: AppUser, rememberMe?: boolean) => {
    setCurrentUserId(user.id);
    localStorage.setItem('simba_current_user_id', user.id);
    setIsAuthenticated(true);
    setIsLoginModalOpen(false);
    
    // Manage temporary vs persistent session
    sessionStorage.setItem('simba_auth_session', 'true');
    if (rememberMe) {
      localStorage.setItem('simba_auth_session', 'true');
      localStorage.setItem('simba_remember_me', 'true');
    } else {
      localStorage.removeItem('simba_auth_session');
      localStorage.removeItem('simba_remember_me');
    }

    // Role-Based Access Control (RBAC) initial landing route
    if (user.role === 'pengguna') {
      setActiveTab('npb_request');
    } else {
      setActiveTab('dashboard');
    }

    showToast(`Selamat datang, ${user.nama} (${user.role.toUpperCase()})`);
  };

  const handleLogout = () => {
    if (currentUser) {
      logAuditEvent({
        userId: currentUser.id,
        username: currentUser.username,
        userName: currentUser.nama,
        userRole: currentUser.role,
        action: 'LOGOUT',
        title: 'Sesi Pengguna Berakhir (Logout)',
        details: `Pengguna ${currentUser.nama} (@${currentUser.username}) keluar dari aplikasi SIMBA.`,
        status: 'SUCCESS'
      });
    }
    sessionStorage.removeItem('simba_auth_session');
    localStorage.removeItem('simba_auth_session');
    localStorage.removeItem('simba_remember_me');
    setIsAuthenticated(false);
    showToast('Anda telah berhasil keluar dari sistem.');
  };

  // Full Database Backup Execution (Satu-Klik)
  const handleExecuteFullBackup = async () => {
    try {
      const res = await exportFullDatabase({
        masterBarang,
        transaksiList,
        penerimaanList,
        pejabatList,
        kategoriList,
        kopConfig: activeKopConfig,
        numberingConfig: activeNumberingConfig,
        userList,
        currentUser
      });
      setLastBackupTime(res.formattedDate);
      showToast(`Cadangan lengkap basis data SIMBA berhasil diekspor: ${res.filename}`);
    } catch (err) {
      console.error('Backup error:', err);
      alert('Terjadi kesalahan saat memproses backup data.');
    }
  };

  // Unified Settings Save Handler
  const handleSaveUnifiedSettings = (updated: {
    kopConfig: KopSuratConfig;
    numberingConfig: NumberingPatternConfig;
    pejabatList: Pejabat[];
    kategoriList?: KategoriBarangItem[];
  }) => {
    handleUpdateKopConfig(updated.kopConfig);
    handleUpdateNumberingConfig(updated.numberingConfig);
    setPejabatList(updated.pejabatList);
    if (updated.kategoriList && updated.kategoriList.length > 0) {
      handleUpdateKategoriList(updated.kategoriList);
    }
    showToast(`Seluruh konfigurasi [${activeSekolah.nama}] & pejabat berhasil disimpan serentak.`);
  };

  // Single Source of Truth Category Management Handler with automatic barang migration
  const handleUpdateKategoriList = (newList: KategoriBarangItem[]) => {
    const oldCategories = kategoriList;
    const oldNames = new Set<string>(oldCategories.map(k => k.nama.trim()));
    const newNames = new Set<string>(newList.map(k => k.nama.trim()));
    const defaultCategoryName = newList[0]?.nama || 'Umum';

    // Map renamed categories (same id, different nama)
    const renameMap = new Map<string, string>();
    oldCategories.forEach(oldCat => {
      const match = newList.find(n => n.id === oldCat.id);
      if (match && match.nama.trim() !== oldCat.nama.trim()) {
        renameMap.set(oldCat.nama.trim(), match.nama.trim());
      }
    });

    // Detect deleted categories
    const deletedNames = new Set<string>();
    oldNames.forEach((name: string) => {
      if (!newNames.has(name) && !renameMap.has(name)) {
        deletedNames.add(name);
      }
    });

    // Auto-migrate masterBarang if any categories were renamed or deleted
    if (renameMap.size > 0 || deletedNames.size > 0) {
      setMasterBarang(prev => {
        const updatedBarang = prev.map(b => {
          const currentCat = (b.kategori || '').trim();
          if (renameMap.has(currentCat)) {
            return { ...b, kategori: renameMap.get(currentCat)! };
          }
          if (deletedNames.has(currentCat) || !newNames.has(currentCat)) {
            return { ...b, kategori: defaultCategoryName };
          }
          return b;
        });
        localStorage.setItem('simba_master_barang', JSON.stringify(updatedBarang));
        return updatedBarang;
      });
    }

    setKategoriList(newList);
    localStorage.setItem('simba_kategori_list', JSON.stringify(newList));
    showToast('Daftar Kategori Barang berhasil diperbarui dan disinkronkan ke seluruh sistem.');
  };

  // Handler CRUD Kategori Dinamis: Simpan atau Edit Kategori & Rekening
  const handleSaveCategory = (
    formData: CategoryFormData,
    editingId?: string | null
  ) => {
    const trimmedKode = formData.kodeRekening.trim();
    const trimmedNama = formData.namaKategori.trim();
    const jenisAset: JenisBarang = formData.jenis === 'Belanja Modal' || formData.jenis === 'Modal' ? 'Belanja Modal' : 'BHP';

    setKategoriList(prev => {
      let updated: KategoriBarangItem[];
      if (editingId) {
        const oldCat = prev.find(c => c.id === editingId);
        updated = prev.map(c => {
          if (c.id === editingId) {
            return {
              ...c,
              kodeRekening: trimmedKode,
              namaRekening: trimmedNama,
              nama: trimmedNama,
              jenisDefault: jenisAset,
              deskripsi: `Akun Belanja: ${trimmedKode} - ${trimmedNama}`
            };
          }
          return c;
        });

        // Sinkronisasi otomatis ke masterBarang jika nama atau kode rekening berubah
        if (oldCat && (oldCat.nama !== trimmedNama || oldCat.kodeRekening !== trimmedKode)) {
          setMasterBarang(prevBarang => {
            const updatedBarang = prevBarang.map(b => {
              if (b.kategori === oldCat.nama || b.kodeRekening === oldCat.kodeRekening || b.namaRekening === oldCat.nama) {
                return {
                  ...b,
                  kategori: trimmedNama,
                  kodeRekening: trimmedKode,
                  namaRekening: trimmedNama,
                  jenisBarang: jenisAset
                };
              }
              return b;
            });
            localStorage.setItem('simba_master_barang', JSON.stringify(updatedBarang));
            return updatedBarang;
          });
        }
      } else {
        const newCat: KategoriBarangItem = {
          id: `kat-custom-${Date.now()}`,
          nama: trimmedNama,
          kodeRekening: trimmedKode,
          namaRekening: trimmedNama,
          jenisDefault: jenisAset,
          prefixKode: jenisAset === 'Belanja Modal' ? '1.03.02.99.' : '1.01.03.99.',
          deskripsi: `Akun Belanja: ${trimmedKode} - ${trimmedNama}`
        };
        updated = [...prev, newCat];
      }
      localStorage.setItem('simba_kategori_list', JSON.stringify(updated));
      return updated;
    });

    showToast(editingId ? `Kategori "${trimmedNama}" berhasil diperbarui.` : `Kategori baru "${trimmedNama}" berhasil ditambahkan.`);
  };

  // Handler CRUD Kategori Dinamis: Hapus Kategori dengan Proteksi Integritas Data
  const handleDeleteCategory = (categoryId: string) => {
    const target = kategoriList.find(c => c.id === categoryId);
    if (!target) return;

    // Validasi: tidak dapat dihapus jika sedang digunakan oleh barang di inventaris
    const usedBy = masterBarang.filter(
      b => b.kategori === target.nama || b.kodeRekening === target.kodeRekening || b.namaRekening === target.nama
    );

    if (usedBy.length > 0) {
      alert(
        `Kategori "${target.nama}" (${target.kodeRekening || '-'}) tidak dapat dihapus karena sedang digunakan oleh ${usedBy.length} barang inventaris:\n• ${usedBy.slice(0, 3).map(b => b.namaBarang).join('\n• ')}${usedBy.length > 3 ? `\n...dan ${usedBy.length - 3} barang lainnya` : ''}\n\nSilakan ubah kategori barang terkait terlebih dahulu.`
      );
      return;
    }

    setKategoriList(prev => {
      const updated = prev.filter(c => c.id !== categoryId);
      localStorage.setItem('simba_kategori_list', JSON.stringify(updated));
      return updated;
    });
    showToast(`Kategori "${target.nama}" berhasil dihapus.`);
  };

  // Mass migration for legacy/unmapped barang categories
  const handleMigrateUnmappedCategories = (targetCategoryName?: string) => {
    const target = targetCategoryName || 'Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor';
    setMasterBarang(prev => {
      const updatedBarang = prev.map(b => {
        const kode = b.kodeRekening?.trim() || '5.1.02.01.01.0024';
        const officialName = getNamaRekeningByKode(kode);
        return {
          ...b,
          kodeRekening: kode,
          namaRekening: officialName,
          kategori: officialName || target
        };
      });
      localStorage.setItem('simba_master_barang', JSON.stringify(updatedBarang));
      return updatedBarang;
    });
    showToast(`Seluruh data barang berhasil diselaraskan ke Master Rekening Resmi.`);
  };

  // Restore Database Handler (Replace All or Merge)
  const handleRestoreDatabase = (
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
  ) => {
    if (mode === 'replace') {
      // REPLACE ALL DATA
      setMasterBarang(restoredData.masterBarang);
      setTransaksiList(restoredData.transaksiList);
      setPenerimaanList(restoredData.penerimaanList);
      setPejabatList(restoredData.pejabatList);
      if (restoredData.kategoriList && restoredData.kategoriList.length > 0) {
        setKategoriList(restoredData.kategoriList);
      }
      if (restoredData.kopConfig && restoredData.kopConfig.namaSekolah) {
        handleUpdateKopConfig(restoredData.kopConfig);
      }
      if (restoredData.numberingConfig) {
        handleUpdateNumberingConfig(restoredData.numberingConfig);
      }
      if (restoredData.userList && restoredData.userList.length > 0) {
        setUserList(restoredData.userList);
      }
      if (restoredData.transaksiList.length > 0) {
        setSelectedTransaksiId(restoredData.transaksiList[0].id);
      }

      logAuditEvent({
        userId: currentUser.id,
        username: currentUser.username,
        userName: currentUser.nama,
        userRole: currentUser.role,
        action: 'RESTORE_DATABASE',
        title: 'Pemulihan Database: Timpa Keseluruhan Data (Replace All)',
        details: `Seluruh database berhasil ditimpa dari file backup (${restoredData.masterBarang.length} barang, ${restoredData.transaksiList.length} transaksi penyaluran, ${restoredData.penerimaanList.length} penerimaan).`,
        status: 'SUCCESS'
      });
      showToast('Basis data berhasil dipulihkan secara penuh (Replace All Data)!');
    } else {
      // MERGE DATA: Tambahkan data baru tanpa menghapus data riwayat transaksi lama
      setMasterBarang(prev => {
        const map = new Map<string, Barang>();
        prev.forEach(b => map.set(b.id || b.kodeBarang, b));
        restoredData.masterBarang.forEach(b => {
          const key = b.id || b.kodeBarang;
          if (!map.has(key)) {
            map.set(key, b);
          }
        });
        return Array.from(map.values());
      });

      setTransaksiList(prev => {
        const map = new Map<string, TransaksiPengeluaran>();
        prev.forEach(t => map.set(t.id || t.noBAST, t));
        restoredData.transaksiList.forEach(t => {
          const key = t.id || t.noBAST;
          if (!map.has(key)) {
            map.set(key, t);
          }
        });
        return Array.from(map.values()).sort((a, b) => b.nomorUrut - a.nomorUrut);
      });

      setPenerimaanList(prev => {
        const map = new Map<string, TransaksiPenerimaan>();
        prev.forEach(p => map.set(p.id || p.noBukti, p));
        restoredData.penerimaanList.forEach(p => {
          const key = p.id || p.noBukti;
          if (!map.has(key)) {
            map.set(key, p);
          }
        });
        return Array.from(map.values()).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
      });

      setPejabatList(prev => {
        const map = new Map<string, Pejabat>();
        prev.forEach(p => map.set(p.id || p.nip || p.nama, p));
        restoredData.pejabatList.forEach(p => {
          const key = p.id || p.nip || p.nama;
          if (!map.has(key)) {
            map.set(key, p);
          }
        });
        return Array.from(map.values());
      });

      if (restoredData.kategoriList) {
        setKategoriList(prev => {
          const names = new Set(prev.map(k => k.nama.toLowerCase()));
          const additions = restoredData.kategoriList!.filter(k => !names.has(k.nama.toLowerCase()));
          return [...prev, ...additions];
        });
      }

      logAuditEvent({
        userId: currentUser.id,
        username: currentUser.username,
        userName: currentUser.nama,
        userRole: currentUser.role,
        action: 'RESTORE_DATABASE',
        title: 'Pemulihan Database: Gabungkan Data (Merge Data)',
        details: `Penggabungan data cadangan berhasil dilakukan tanpa menghapus riwayat transaksi yang ada.`,
        status: 'SUCCESS'
      });
      showToast('Data cadangan berhasil digabungkan (Merge Data) ke dalam basis data!');
    }
  };

  // If user is not authenticated, display the modern Login View directly
  if (!isAuthenticated) {
    return (
      <LoginView
        userList={userList}
        onLoginSuccess={handleLoginSuccess}
        schoolName={activeSekolah.nama}
        kopConfig={activeKopConfig}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col lg:flex-row font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="no-print fixed bottom-5 right-5 z-50 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3.5 rounded-xl shadow-2xl border border-slate-700/80 flex items-center gap-3 text-xs max-w-md ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="flex-1 font-medium">{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modern Collapsible Dark Navy Sidebar */}
      <div className="no-print">
        <AppSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          currentUser={currentUser}
          schoolName={activeSekolah.nama}
          onOpenGoogleSheets={() => setIsGoogleSheetsOpen(true)}
          onOpenUnifiedSettings={() => {
            setUnifiedSettingsTab('all');
            setIsUnifiedSettingsOpen(true);
          }}
          onExecuteBackup={handleExecuteFullBackup}
          onOpenAuditLog={() => setIsAuditLogOpen(true)}
          onOpenUserManagement={() => setIsUserManagementOpen(true)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
          onOpenResetTransaksi={() => setIsResetTransaksiOpen(true)}
        />
      </div>

      {/* Main Column: Topbar + Page Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="no-print">
          <AppTopbar
            activeTab={activeTab}
            schoolName={activeSekolah.nama}
            currentUser={currentUser}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onOpenNewTransaksi={() => {
              setEditingTransaksi(null);
              setIsNewTransaksiModalOpen(true);
            }}
            onOpenNewPenerimaan={() => {
              setEditingPenerimaan(null);
              setIsNewPenerimaanModalOpen(true);
            }}
            paperSize={paperSize}
            onSelectPaperSize={setPaperSize}
            lastBackupTime={lastBackupTime}
            onOpenAuditLog={() => setIsAuditLogOpen(true)}
            onOpenThemeSettings={() => {
              setUnifiedSettingsTab('theme');
              setIsUnifiedSettingsOpen(true);
            }}
          />
        </div>

        {/* Main Container */}
        <main className="flex-1 w-full">
        {currentUser.role === 'pengguna' ? (
          <StaffPermintaanNPBView
            currentUser={currentUser}
            masterBarang={scopedBarang}
            pejabatList={scopedPejabat}
            kopConfig={activeKopConfig}
            numberingConfig={activeNumberingConfig}
            transaksiList={scopedTransaksi}
            onSaveNPB={handleSaveTransaksi}
            onOpenUserSwitcher={() => setIsUserManagementOpen(true)}
          />
        ) : (
          <>
            {/* TAB 1: Dashboard & Daftar Transaksi (Admin & Operator) */}
            {activeTab === 'dashboard' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <DashboardStats
                  transaksiList={scopedTransaksi}
                  penerimaanList={scopedPenerimaan}
                  barangList={scopedBarang}
                  pejabatList={scopedPejabat}
                  currentUser={currentUser}
                  onSelectTransaksiForPrint={handleSelectForPrint}
                  onOpenNewTransaksi={() => {
                    setEditingTransaksi(null);
                    setIsNewTransaksiModalOpen(true);
                  }}
                  onOpenNewPenerimaan={() => {
                    setEditingPenerimaan(null);
                    setIsNewPenerimaanModalOpen(true);
                  }}
                  onEditTransaksi={handleOpenEditTransaksi}
                  onDeleteTransaksi={handlePromptDeleteTransaksi}
                  onEditPenerimaan={handleOpenEditPenerimaan}
                  onDeletePenerimaan={handlePromptDeletePenerimaan}
                  onSelectPenerimaanForPrint={(p) => {
                    setGeneratorInitialDocType('buku_penerimaan');
                    setActiveTab('generator');
                  }}
                  kopConfig={activeKopConfig}
                  schoolName={activeSekolah.nama}
                />
              </div>
            )}

            {/* TAB 2: Generator Dokumen Cetak (Print / PDF) - (Admin & Operator) */}
            {activeTab === 'generator' && (
              <DocumentViewer
                transaksiList={scopedTransaksi}
                transaksiPenerimaanList={scopedPenerimaan}
                masterBarang={scopedBarang}
                pejabatList={scopedPejabat}
                kopConfig={activeKopConfig}
                selectedTransaksiId={selectedTransaksiId}
                onSelectTransaksi={setSelectedTransaksiId}
                onOpenKopSettings={() => {
                  setUnifiedSettingsTab('kop');
                  setIsUnifiedSettingsOpen(true);
                }}
                initialDocType={generatorInitialDocType}
                initialBarangId={generatorInitialBarangId}
                onImportBarang={handleImportBarang}
                paperSize={paperSize}
                onSelectPaperSize={setPaperSize}
              />
            )}

            {/* TAB 3: Master Barang & NUSP (Admin & Operator) */}
            {activeTab === 'barang' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <MasterBarangTable
                  barangList={scopedBarang}
                  onAddBarang={handleAddBarang}
                  onUpdateBarang={handleUpdateBarang}
                  onDeleteBarang={handleDeleteBarang}
                  onImportBarang={handleImportBarang}
                  showToast={showToast}
                  kategoriList={kategoriList}
                  onUpdateKategoriList={handleUpdateKategoriList}
                  onSaveCategory={handleSaveCategory}
                  onDeleteCategory={handleDeleteCategory}
                  onMigrateUnmappedCategories={handleMigrateUnmappedCategories}
                  onViewKartuBarang={(barangId) => {
                    setGeneratorInitialDocType('kartu_barang');
                    setGeneratorInitialBarangId(barangId);
                    setActiveTab('generator');
                  }}
                  onViewKartuPersediaan={(barangId) => {
                    setGeneratorInitialDocType('kartu_persediaan');
                    setGeneratorInitialBarangId(barangId);
                    setActiveTab('generator');
                  }}
                />
              </div>
            )}

            {activeTab === 'pejabat' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {currentUser.role === 'admin' ? (
                  <MasterPejabatTable
                    pejabatList={scopedPejabat}
                    onAddPejabat={handleAddPejabat}
                    onUpdatePejabat={handleUpdatePejabat}
                    onDeletePejabat={handleDeletePejabat}
                    onImportPejabat={handleImportPejabat}
                  />
                ) : (
                  <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2 max-w-lg mx-auto my-12">
                    <div className="text-amber-600 font-bold text-base">Akses Khusus Administrator</div>
                    <p className="text-xs text-slate-500">
                      Menu Master Pegawai dan struktur penandatangan dokumen dinas hanya dapat diubah oleh Administrator sistem.
                    </p>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg mt-2"
                    >
                      Kembali ke Dashboard
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
      </div>

      {/* MODAL: Input Transaksi Penyaluran Baru (Spreadsheet-like) */}
      {isNewTransaksiModalOpen && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="my-auto w-full max-w-6xl xl:max-w-7xl">
            <TransactionForm
              initialData={editingTransaksi || undefined}
              masterBarang={scopedBarang}
              pejabatList={scopedPejabat}
              kopConfig={activeKopConfig}
              numberingConfig={activeNumberingConfig}
              nextCounter={scopedTransaksi.length + 1}
              transaksiList={scopedTransaksi}
              onSaveTransaksi={handleSaveTransaksi}
              onCancel={() => {
                setIsNewTransaksiModalOpen(false);
                setEditingTransaksi(null);
              }}
            />
          </div>
        </div>
      )}

      {/* MODAL: Input Penerimaan Barang Masuk (Dana BOS) */}
      {isNewPenerimaanModalOpen && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="my-auto w-full max-w-6xl">
            <PenerimaanForm
              initialData={editingPenerimaan || undefined}
              masterBarang={scopedBarang}
              pejabatList={scopedPejabat}
              onSavePenerimaan={handleSavePenerimaan}
              onCancel={() => {
                setIsNewPenerimaanModalOpen(false);
                setEditingPenerimaan(null);
              }}
            />
          </div>
        </div>
      )}

      {/* MODAL: Pengaturan Terpadu Instansi (One-Page Unified Settings) */}
      <UnifiedSettingsModal
        isOpen={isUnifiedSettingsOpen}
        onClose={() => setIsUnifiedSettingsOpen(false)}
        initialTab={unifiedSettingsTab}
        kopConfig={activeKopConfig}
        numberingConfig={activeNumberingConfig}
        pejabatList={scopedPejabat}
        masterBarang={scopedBarang}
        transaksiList={scopedTransaksi}
        penerimaanList={scopedPenerimaan}
        kategoriList={kategoriList}
        userList={userList}
        currentUser={currentUser}
        onSaveUnifiedSettings={handleSaveUnifiedSettings}
        onRestoreDatabase={handleRestoreDatabase}
        onShowToast={showToast}
        onOpenResetTransaksi={() => {
          setIsUnifiedSettingsOpen(false);
          setIsResetTransaksiOpen(true);
        }}
      />

      {/* MODAL: Pengaturan Kop Surat & Logo Sekolah */}
      <KopSettingsModal
        isOpen={isKopSettingsOpen}
        onClose={() => setIsKopSettingsOpen(false)}
        kopConfig={activeKopConfig}
        onSave={handleUpdateKopConfig}
      />

      {/* MODAL: Pengaturan Format Penomoran Surat Dinamis */}
      <NumberingSettingsModal
        isOpen={isNumberingSettingsOpen}
        onClose={() => setIsNumberingSettingsOpen(false)}
        config={activeNumberingConfig}
        kopConfig={activeKopConfig}
        transaksiList={scopedTransaksi}
        onSave={handleUpdateNumberingConfig}
      />

      {/* MODAL: Skema Database & Google Apps Script */}
      <SchemaAndScriptModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
      />

      {/* MODAL KEAMANAN: Kosongkan Riwayat Transaksi / Reset Scope Data (Khusus Admin Berizin PIN) */}
      <ResetTransaksiModal
        isOpen={isResetTransaksiOpen}
        onClose={() => setIsResetTransaksiOpen(false)}
        onConfirmReset={handleResetTransaksi}
        transaksiCount={scopedTransaksi.length}
        penerimaanCount={scopedPenerimaan.length}
        barangCount={scopedBarang.length}
        pegawaiCount={scopedPejabat.length}
        currentUser={currentUser}
        schoolName={activeSekolah.nama}
        onOpenAuditLog={() => setIsAuditLogOpen(true)}
      />

      {/* MODAL KEAMANAN: Log Audit Sistem & Integritas Data (Langkah 5) */}
      <AuditLogModal
        isOpen={isAuditLogOpen}
        onClose={() => setIsAuditLogOpen(false)}
        currentUser={currentUser}
        sekolahList={sekolahList}
        currentSekolahId={currentSekolahId}
        transaksiList={scopedTransaksi}
        kopConfig={activeKopConfig}
      />

      {/* MODAL: Ganti Akun Pengguna / Layar Login */}
      {isLoginModalOpen && (
        <LoginView
          isModal={true}
          onCloseModal={() => setIsLoginModalOpen(false)}
          userList={userList}
          onLoginSuccess={handleLoginSuccess}
          schoolName={activeSekolah.nama}
          kopConfig={activeKopConfig}
        />
      )}

      {/* MODAL: Manajemen Pengguna & Hak Akses (Khusus Admin) */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        userList={userList}
        currentUserId={currentUserId}
        onAddUser={handleAddUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
        onSwitchUser={handleSwitchUser}
        schoolName={activeSekolah.nama}
        currentUser={currentUser}
      />

      {/* MODAL: Integrasi & Sinkronisasi Google Sheets */}
      <GoogleSheetsModal
        isOpen={isGoogleSheetsOpen}
        onClose={() => setIsGoogleSheetsOpen(false)}
        masterBarang={scopedBarang}
        transaksiList={scopedTransaksi}
        penerimaanList={scopedPenerimaan}
        kopConfig={activeKopConfig}
        sheetConfig={googleSheetConfig}
        onUpdateSheetConfig={handleUpdateSheetConfig}
        onImportBarang={(items) => handleImportBarang(items, 'append')}
        showToast={showToast}
      />

      {/* MODAL KEAMANAN: Konfirmasi Hapus Transaksi & Reversi Stok Otomatis */}
      <SecurityDeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState(prev => ({ ...prev, isOpen: false }))}
        currentUser={currentUser}
        type={deleteModalState.type}
        transaksiPenyaluran={deleteModalState.transaksiPenyaluran}
        transaksiPenerimaan={deleteModalState.transaksiPenerimaan}
        onConfirmDelete={() => {
          if (deleteModalState.type === 'penyaluran') {
            handleConfirmDeleteTransaksi();
          } else {
            handleConfirmDeletePenerimaan();
          }
        }}
      />

      {/* MODAL KEABSAHAN: Verifikasi Digital Dokumen Resmi & Integritas QR Code */}
      <DocumentVerificationModal
        isOpen={verificationModalState.isOpen}
        onClose={() => setVerificationModalState(prev => ({ ...prev, isOpen: false }))}
        data={verificationModalState.data}
        transaksi={verificationModalState.transaksi}
        kopConfig={activeKopConfig}
      />
    </div>
  );
}
