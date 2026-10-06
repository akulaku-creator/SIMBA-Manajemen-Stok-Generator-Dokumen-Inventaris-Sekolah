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
import { MasterSekolahModal } from './components/MasterSekolahModal';
import { ModulDinasView } from './components/ModulDinasView';
import { RouteForbiddenView } from './components/RouteForbiddenView';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
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
  DEFAULT_SEKOLAH_LIST, 
  DEFAULT_PRIMARY_SEKOLAH_ID, 
  DEFAULT_KOP_SURAT_BY_SEKOLAH, 
  DEFAULT_PEJABAT_BY_SEKOLAH,
  DEFAULT_BARANG_BY_SEKOLAH,
  DEFAULT_TRANSAKSI_BY_SEKOLAH,
  DEFAULT_PENERIMAAN_BY_SEKOLAH
} from './data/defaultSchools';
import { 
  AppUser, 
  Barang, 
  GoogleSheetSyncConfig,
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
import { DEFAULT_NUMBERING_CONFIG } from './utils/numberGenerator';
import { getNamaRekeningByKode } from './data/kodeRekeningData';

export default function App() {
  // Multi-Tenant School Management
  const [sekolahList, setSekolahList] = useState<Sekolah[]>(() => {
    const saved = localStorage.getItem('simba_sekolah_list');
    return saved ? JSON.parse(saved) : DEFAULT_SEKOLAH_LIST;
  });

  const [currentSekolahId, setCurrentSekolahId] = useState<string>(() => {
    const saved = localStorage.getItem('simba_active_sekolah_id');
    return saved ? saved : DEFAULT_PRIMARY_SEKOLAH_ID;
  });

  // Per-School Kop Surat Config Map
  const [kopConfigMap, setKopConfigMap] = useState<Record<string, KopSuratConfig>>(() => {
    const saved = localStorage.getItem('simba_kop_config_map');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    const single = localStorage.getItem('simba_kop_config');
    const baseDefault = single ? JSON.parse(single) : DEFAULT_KOP_SURAT;
    return {
      [DEFAULT_PRIMARY_SEKOLAH_ID]: { ...baseDefault, sekolah_id: DEFAULT_PRIMARY_SEKOLAH_ID },
      ...DEFAULT_KOP_SURAT_BY_SEKOLAH
    };
  });

  // Per-School Numbering Pattern Config Map
  const [numberingConfigMap, setNumberingConfigMap] = useState<Record<string, NumberingPatternConfig>>(() => {
    const saved = localStorage.getItem('simba_numbering_config_map');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    const single = localStorage.getItem('simba_numbering_config');
    const baseDefault = single ? JSON.parse(single) : DEFAULT_NUMBERING_CONFIG;
    return {
      [DEFAULT_PRIMARY_SEKOLAH_ID]: { ...baseDefault, sekolah_id: DEFAULT_PRIMARY_SEKOLAH_ID }
    };
  });

  const [pejabatList, setPejabatList] = useState<Pejabat[]>(() => {
    const saved = localStorage.getItem('simba_pejabat_list');
    let list: Pejabat[] = saved ? JSON.parse(saved) : DEFAULT_PEJABAT;
    // Auto-migrate: Tag with primary school if sekolah_id is missing and guarantee accurate roles
    list = list.map(p => {
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
        role,
        sekolah_id: p.sekolah_id || DEFAULT_PRIMARY_SEKOLAH_ID
      };
    });
    // Seed initial officials for other schools if not present
    for (const [schId, pejabats] of Object.entries(DEFAULT_PEJABAT_BY_SEKOLAH)) {
      if (!list.some(p => p.sekolah_id === schId)) {
        list.push(...pejabats);
      }
    }
    return list;
  });

  const [masterBarang, setMasterBarang] = useState<Barang[]>(() => {
    const saved = localStorage.getItem('simba_master_barang');
    let list: Barang[] = saved ? JSON.parse(saved) : DEFAULT_BARANG;
    // Auto-migrate & synchronize official descriptions for 40 official accounts:
    // Single Source of Truth: 1 Kategori Barang = 1 Kode Rekening Belanja + Tag sekolah_id
    list = list.map(b => {
      const kode = b.kodeRekening?.trim() || '5.1.02.01.01.0024';
      const officialName = getNamaRekeningByKode(kode);
      return {
        ...b,
        sekolah_id: b.sekolah_id || DEFAULT_PRIMARY_SEKOLAH_ID,
        kodeRekening: kode,
        namaRekening: officialName,
        kategori: officialName
      };
    });
    // Seed initial items for other schools if not present
    for (const [schId, items] of Object.entries(DEFAULT_BARANG_BY_SEKOLAH)) {
      if (!list.some(b => b.sekolah_id === schId)) {
        list.push(...items);
      }
    }
    return list;
  });

  const [kategoriList, setKategoriList] = useState<KategoriBarangItem[]>(() => {
    const saved = localStorage.getItem('simba_kategori_list');
    const list: KategoriBarangItem[] = saved ? JSON.parse(saved) : DEFAULT_KATEGORI_LIST;
    if (!saved || list.length < 40) {
      return DEFAULT_KATEGORI_LIST;
    }
    return list.map(kat => {
      const matchedDefault = DEFAULT_KATEGORI_LIST.find(d => d.nama.toLowerCase() === kat.nama.toLowerCase() || d.kodeRekening === kat.kodeRekening);
      const kode = kat.kodeRekening || matchedDefault?.kodeRekening || '5.1.02.01.01.0024';
      const officialName = getNamaRekeningByKode(kode);
      return {
        ...kat,
        nama: officialName,
        kodeRekening: kode,
        namaRekening: officialName
      };
    });
  });

  const [transaksiList, setTransaksiList] = useState<TransaksiPengeluaran[]>(() => {
    const saved = localStorage.getItem('simba_transaksi_list');
    let list: TransaksiPengeluaran[] = saved ? JSON.parse(saved) : DEFAULT_TRANSAKSI_PENGELUARAN;
    list = list.map(trx => ({
      ...trx,
      sekolah_id: trx.sekolah_id || DEFAULT_PRIMARY_SEKOLAH_ID,
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
    // Seed initial transactions for other schools if not present
    for (const [schId, trxs] of Object.entries(DEFAULT_TRANSAKSI_BY_SEKOLAH)) {
      if (!list.some(t => t.sekolah_id === schId)) {
        list.push(...trxs);
      }
    }
    return list;
  });

  const [penerimaanList, setPenerimaanList] = useState<TransaksiPenerimaan[]>(() => {
    const saved = localStorage.getItem('simba_penerimaan_list');
    let list: TransaksiPenerimaan[] = saved ? JSON.parse(saved) : DEFAULT_TRANSAKSI_PENERIMAAN;
    list = list.map(rcv => ({
      ...rcv,
      sekolah_id: rcv.sekolah_id || DEFAULT_PRIMARY_SEKOLAH_ID,
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
    // Seed initial penerimaan for other schools if not present
    for (const [schId, rcvs] of Object.entries(DEFAULT_PENERIMAAN_BY_SEKOLAH)) {
      if (!list.some(p => p.sekolah_id === schId)) {
        list.push(...rcvs);
      }
    }
    return list;
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
  const [unifiedSettingsTab, setUnifiedSettingsTab] = useState<'all' | 'kop' | 'numbering' | 'pejabat' | 'backup' | 'github' | 'danger'>('all');
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(getLastBackupTime());
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isResetTransaksiOpen, setIsResetTransaksiOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [isMasterSekolahOpen, setIsMasterSekolahOpen] = useState(false);
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
            const matchedKop = kopConfigMap[matched.sekolah_id || ''] || DEFAULT_KOP_SURAT_BY_SEKOLAH[matched.sekolah_id || ''] || DEFAULT_KOP_SURAT;
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
  }, [transaksiList, kopConfigMap]);

  const handleUpdateSheetConfig = (newCfg: GoogleSheetSyncConfig | null) => {
    setGoogleSheetConfig(newCfg);
    if (newCfg) {
      localStorage.setItem('simba_gsheet_config', JSON.stringify(newCfg));
    } else {
      localStorage.removeItem('simba_gsheet_config');
    }
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('simba_sekolah_list', JSON.stringify(sekolahList));
  }, [sekolahList]);

  useEffect(() => {
    localStorage.setItem('simba_active_sekolah_id', currentSekolahId);
  }, [currentSekolahId]);

  useEffect(() => {
    localStorage.setItem('simba_kop_config_map', JSON.stringify(kopConfigMap));
  }, [kopConfigMap]);

  useEffect(() => {
    localStorage.setItem('simba_numbering_config_map', JSON.stringify(numberingConfigMap));
  }, [numberingConfigMap]);

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
    sekolah_id: DEFAULT_PRIMARY_SEKOLAH_ID,
    nama: 'Ratna Indrawati, S.Kom',
    username: 'admin',
    role: 'admin',
    jabatan: 'Admin Sistem & Pengurus Barang',
    unitKerja: 'Subbag Tata Usaha & IT'
  };

  const isDinasUser = (currentUser?.role as string) === 'SUPER_ADMIN' || currentUser?.role === 'super_admin' || (currentUser?.role as string) === 'admin_dinas' || currentUser?.sekolah_id === 'dinas_prov' || currentUser?.username === 'dinas';

  // STRICT MULTI-TENANT ISOLATION GUARD:
  // If user is not super_admin / dinas, lock currentSekolahId to their assigned school!
  useEffect(() => {
    if (!isDinasUser && currentUser.sekolah_id) {
      if (currentSekolahId !== currentUser.sekolah_id) {
        setCurrentSekolahId(currentUser.sekolah_id);
        localStorage.setItem('simba_active_sekolah_id', currentUser.sekolah_id);
      }
    }
  }, [currentUser, isDinasUser, currentSekolahId]);

  // ROUTE CONTROLLER & RBAC URL SECURITY GUARD (Requirement 3: 403 Forbidden)
  useEffect(() => {
    const handleLocationChange = () => {
      const pathname = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase().replace('#', '');
      
      const isDinasTarget = pathname.includes('modul-dinas') || hash.includes('modul-dinas') || hash === 'dinas';
      const isSekolahTarget = pathname.includes('data-sekolah') || hash.includes('data-sekolah') || hash === 'sekolah';

      if (isDinasTarget || isSekolahTarget) {
        if (!isDinasUser) {
          const targetedRoute = isDinasTarget ? '/modul-dinas' : '/data-sekolah';
          setForbiddenRoute(targetedRoute);
          logAuditEvent({
            userId: currentUser.id,
            username: currentUser.username,
            userName: currentUser.nama,
            userRole: currentUser.role,
            action: 'SECURITY_ALERT',
            title: `Percobaan Akses Ilegal ${targetedRoute} (403 Forbidden)`,
            details: `Pengguna ${currentUser.nama} (@${currentUser.username}) dengan role ${currentUser.role} mengakses URL ${targetedRoute} secara manual. Akses diblokir oleh Route Controller.`,
            status: 'WARNING'
          });
        } else {
          setForbiddenRoute(null);
          if (isDinasTarget) {
            setActiveTab('dinas');
          } else if (isSekolahTarget) {
            setIsMasterSekolahOpen(true);
          }
        }
      } else {
        setForbiddenRoute(null);
        if (pathname.includes('generator') || hash === 'generator') {
          setActiveTab('generator');
        } else if (pathname.includes('master-barang') || hash === 'barang') {
          setActiveTab('barang');
        } else if (pathname.includes('master-pegawai') || hash === 'pejabat') {
          setActiveTab('pejabat');
        }
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [currentUser, isDinasUser]);

  const handleTabChange = (tab: MainTab) => {
    if (tab === 'dinas' && !isDinasUser) {
      setForbiddenRoute('/modul-dinas');
      logAuditEvent({
        userId: currentUser.id,
        username: currentUser.username,
        userName: currentUser.nama,
        userRole: currentUser.role,
        action: 'SECURITY_ALERT',
        title: 'Akses Ditolak: Rute Modul Dinas (403 Forbidden)',
        details: `Pengguna ${currentUser.nama} (@${currentUser.username}) dengan role ${currentUser.role} dilarang mengakses Modul Dinas.`,
        status: 'WARNING'
      });
      return;
    }
    setForbiddenRoute(null);
    setActiveTab(tab);
    if (window.history.pushState) {
      const pathMap: Record<MainTab, string> = {
        dashboard: '/',
        generator: '/generator',
        dinas: '/modul-dinas',
        barang: '/master-barang',
        pejabat: '/master-pegawai'
      };
      window.history.pushState(null, '', pathMap[tab] || '/');
    }
  };

  const handleOpenMasterSekolah = () => {
    if (!isDinasUser) {
      setForbiddenRoute('/data-sekolah');
      logAuditEvent({
        userId: currentUser.id,
        username: currentUser.username,
        userName: currentUser.nama,
        userRole: currentUser.role,
        action: 'SECURITY_ALERT',
        title: 'Akses Ditolak: Rute Master Sekolah (403 Forbidden)',
        details: `Pengguna ${currentUser.nama} (@${currentUser.username}) dilarang membuka Master Data Sekolah.`,
        status: 'WARNING'
      });
      return;
    }
    setForbiddenRoute(null);
    setIsMasterSekolahOpen(true);
    if (window.history.pushState) {
      window.history.pushState(null, '', '/data-sekolah');
    }
  };

  // Active School Tenant Object
  const activeSekolah = useMemo(() => {
    return sekolahList.find(s => s.id === currentSekolahId) || sekolahList[0] || {
      id: DEFAULT_PRIMARY_SEKOLAH_ID,
      nama: 'SMAN 1 CIHAURBEUTI',
      npsn: '20211512'
    };
  }, [sekolahList, currentSekolahId]);

  // Active School Kop Surat
  const activeKopConfig: KopSuratConfig = useMemo(() => {
    if (kopConfigMap[currentSekolahId]) {
      return kopConfigMap[currentSekolahId];
    }
    const preset = DEFAULT_KOP_SURAT_BY_SEKOLAH[currentSekolahId];
    if (preset) return preset;
    return {
      ...DEFAULT_KOP_SURAT,
      sekolah_id: currentSekolahId,
      namaSekolah: activeSekolah.nama,
      npsn: activeSekolah.npsn,
      alamatLengkap: activeSekolah.alamat ? `${activeSekolah.alamat}, Kota ${activeSekolah.kota || ''}` : DEFAULT_KOP_SURAT.alamatLengkap,
      kotaSurat: activeSekolah.kota || DEFAULT_KOP_SURAT.kotaSurat
    };
  }, [kopConfigMap, currentSekolahId, activeSekolah]);

  // Active School Numbering Pattern
  const activeNumberingConfig: NumberingPatternConfig = useMemo(() => {
    if (numberingConfigMap[currentSekolahId]) {
      return numberingConfigMap[currentSekolahId];
    }
    const code = activeSekolah.nama.replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase();
    return {
      ...DEFAULT_NUMBERING_CONFIG,
      sekolah_id: currentSekolahId,
      schoolCode: code || DEFAULT_NUMBERING_CONFIG.schoolCode
    };
  }, [numberingConfigMap, currentSekolahId, activeSekolah]);

  // STRICT DATA ISOLATION: Scoped Datasets for Active School
  const scopedBarang = useMemo(() => {
    return masterBarang.filter(b => b.sekolah_id === currentSekolahId || (!b.sekolah_id && currentSekolahId === DEFAULT_PRIMARY_SEKOLAH_ID));
  }, [masterBarang, currentSekolahId]);

  const scopedTransaksi = useMemo(() => {
    return transaksiList.filter(t => t.sekolah_id === currentSekolahId || (!t.sekolah_id && currentSekolahId === DEFAULT_PRIMARY_SEKOLAH_ID));
  }, [transaksiList, currentSekolahId]);

  const scopedPenerimaan = useMemo(() => {
    return penerimaanList.filter(p => p.sekolah_id === currentSekolahId || (!p.sekolah_id && currentSekolahId === DEFAULT_PRIMARY_SEKOLAH_ID));
  }, [penerimaanList, currentSekolahId]);

  const scopedPejabat = useMemo(() => {
    return pejabatList.filter(p => p.sekolah_id === currentSekolahId || (!p.sekolah_id && currentSekolahId === DEFAULT_PRIMARY_SEKOLAH_ID));
  }, [pejabatList, currentSekolahId]);

  // Synchronize selected transaction when active school changes
  useEffect(() => {
    if (scopedTransaksi.length > 0) {
      if (!scopedTransaksi.some(t => t.id === selectedTransaksiId)) {
        setSelectedTransaksiId(scopedTransaksi[0].id);
      }
    } else {
      setSelectedTransaksiId('');
    }
  }, [currentSekolahId, scopedTransaksi]);

  const handleSelectSekolah = (newSekolahId: string) => {
    if (currentUser.role !== 'super_admin') {
      showToast('Akses Dibatasi: Hanya pengguna Super Admin / Dinas yang dapat berpindah sekolah.');
      return;
    }
    setCurrentSekolahId(newSekolahId);
    localStorage.setItem('simba_active_sekolah_id', newSekolahId);
    const target = sekolahList.find(s => s.id === newSekolahId);
    logAuditEvent({
      userId: currentUser.id,
      username: currentUser.username,
      userName: currentUser.nama,
      userRole: currentUser.role,
      action: 'SWITCH_SEKOLAH',
      title: 'Supervisi Beralih Sekolah',
      details: `Beralih ke supervisi sekolah: ${target?.nama || newSekolahId} (NPSN: ${target?.npsn || '-'}).`,
      status: 'SUCCESS'
    });
    showToast(`Beralih ke: ${target?.nama || newSekolahId}`);
  };

  const handleAddSekolah = (newSekolah: Sekolah) => {
    // 1. Add to master sekolah list
    setSekolahList(prev => [...prev, newSekolah]);

    // 2. Automatically provision per-school Kop Surat
    const newKop: KopSuratConfig = {
      sekolah_id: newSekolah.id,
      pemerintahDaerah: `PEMERINTAH DAERAH PROVINSI ${(newSekolah.provinsi || 'JAWA BARAT').toUpperCase()}`,
      dinasPendidikan: 'DINAS PENDIDIKAN',
      cabangDinas: `CABANG DINAS PENDIDIKAN ${newSekolah.kabupaten_kota || newSekolah.kota ? `WILAYAH (${newSekolah.kabupaten_kota || newSekolah.kota})` : 'WILAYAH SETEMPAT'}`,
      namaSekolah: newSekolah.nama,
      alamatLengkap: `${newSekolah.alamat || ''}${newSekolah.kabupaten_kota || newSekolah.kota ? `, ${newSekolah.kabupaten_kota || newSekolah.kota}` : ''}${newSekolah.telepon ? `, Telp. ${newSekolah.telepon}` : ''}`,
      emailWebsite: `Email: ${newSekolah.email || '-'} | Website: ${newSekolah.website || '-'}`,
      npsn: newSekolah.npsn,
      kotaSurat: newSekolah.kabupaten_kota || newSekolah.kota || 'Kota',
      logoType: 'pemda',
      logoProvinsiType: 'pemda',
      tampilkanLogoProvinsi: true,
      logoSekolahType: (newSekolah.logo as any) || (newSekolah.jenjang === 'SMA' ? 'sma' : 'tutwuri'),
      tampilkanLogoSekolah: true
    };
    setKopConfigMap(prev => ({
      ...prev,
      [newSekolah.id]: newKop
    }));

    // 3. Automatically provision standard officials for this school
    const initialOfficials: Pejabat[] = [
      {
        id: `pejabat-ks-${newSekolah.id}`,
        sekolah_id: newSekolah.id,
        nama: newSekolah.kepalaSekolahNama || 'Kepala Satuan Pendidikan',
        nip: newSekolah.kepalaSekolahNip || '19720101 199802 1 001',
        jabatan: 'Kepala Sekolah',
        role: 'kepala_sekolah',
        peran: 'kepala_sekolah',
        pangkatGolongan: 'Pembina / IV/a'
      },
      {
        id: `pejabat-pb-${newSekolah.id}`,
        sekolah_id: newSekolah.id,
        nama: 'Pengurus Barang Sekolah',
        nip: '19860205 201101 2 003',
        jabatan: 'Pengurus Barang Pembantu',
        role: 'pengurus_barang',
        peran: 'pengurus_barang',
        pangkatGolongan: 'Penata / III/c'
      },
      {
        id: `pejabat-pp-${newSekolah.id}`,
        sekolah_id: newSekolah.id,
        nama: 'Petugas Pengeluaran Barang',
        nip: '19910510 201602 1 004',
        jabatan: 'Petugas Gudang & Pengeluaran',
        role: 'pengurus_barang',
        peran: 'pengurus_barang',
        pangkatGolongan: 'Pengatur / II/c'
      }
    ];
    setPejabatList(prev => [...prev, ...initialOfficials]);

    // 4. Log audit event
    logAuditEvent({
      userId: currentUser.id,
      username: currentUser.username,
      userName: currentUser.nama,
      userRole: currentUser.role,
      action: 'TAMBAH_BARANG',
      title: 'Pendaftaran Satuan Pendidikan Baru (Multi-Tenant)',
      details: `Sekolah baru didaftarkan: ${newSekolah.nama} (NPSN: ${newSekolah.npsn}, Jenjang: ${newSekolah.jenjang}).`,
      status: 'SUCCESS'
    });

    showToast(`Satuan pendidikan "${newSekolah.nama}" berhasil didaftarkan ke SIMBA!`);
  };

  const handleUpdateSekolah = (updated: Sekolah) => {
    setSekolahList(prev => prev.map(s => s.id === updated.id ? updated : s));

    // Update Kop Surat if present
    setKopConfigMap(prev => {
      const existing = prev[updated.id];
      if (!existing) return prev;
      return {
        ...prev,
        [updated.id]: {
          ...existing,
          namaSekolah: updated.nama,
          npsn: updated.npsn,
          kotaSurat: updated.kabupaten_kota || updated.kota || existing.kotaSurat,
          alamatLengkap: updated.alamat ? `${updated.alamat}, ${updated.kabupaten_kota || updated.kota || ''}` : existing.alamatLengkap
        }
      };
    });

    logAuditEvent({
      userId: currentUser.id,
      username: currentUser.username,
      userName: currentUser.nama,
      userRole: currentUser.role,
      action: 'UPDATE_KOP',
      title: 'Pembaruan Profil Satuan Pendidikan',
      details: `Data sekolah diperbarui: ${updated.nama} (NPSN: ${updated.npsn}).`,
      status: 'SUCCESS'
    });

    showToast(`Data sekolah "${updated.nama}" berhasil diperbarui.`);
  };

  const handleDeleteSekolah = (sekolahId: string) => {
    const target = sekolahList.find(s => s.id === sekolahId);
    setSekolahList(prev => prev.filter(s => s.id !== sekolahId));

    logAuditEvent({
      userId: currentUser.id,
      username: currentUser.username,
      userName: currentUser.nama,
      userRole: currentUser.role,
      action: 'RESTORE_DATABASE',
      title: 'Penghapusan Satuan Pendidikan',
      details: `Data sekolah dihapus: ${target?.nama || sekolahId} (NPSN: ${target?.npsn || '-'}).`,
      status: 'SUCCESS'
    });

    showToast(`Data sekolah "${target?.nama || sekolahId}" berhasil dihapus.`);
  };

  const handleUpdateKopConfig = (newKop: KopSuratConfig) => {
    const updated = { ...newKop, sekolah_id: currentSekolahId };
    setKopConfigMap(prev => ({
      ...prev,
      [currentSekolahId]: updated
    }));
    localStorage.setItem('simba_kop_config', JSON.stringify(updated));
    logAuditEvent({
      userId: currentUser.id,
      username: currentUser.username,
      userName: currentUser.nama,
      userRole: currentUser.role,
      action: 'UPDATE_KOP',
      title: `Pembaruan Kop Surat ${updated.namaSekolah}`,
      details: `Kop dinas dan identitas lembaga telah diperbarui untuk ${updated.namaSekolah} (NPSN: ${updated.npsn}).`,
      status: 'SUCCESS'
    });
    showToast(`Pengaturan Kop Surat untuk ${updated.namaSekolah} berhasil diperbarui.`);
  };

  const handleUpdateNumberingConfig = (newCfg: NumberingPatternConfig) => {
    const updated = { ...newCfg, sekolah_id: currentSekolahId };
    setNumberingConfigMap(prev => ({
      ...prev,
      [currentSekolahId]: updated
    }));
    localStorage.setItem('simba_numbering_config', JSON.stringify(updated));
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
      const trxWithTenant: TransaksiPengeluaran = {
        ...trxData,
        sekolah_id: trxData.sekolah_id || currentSekolahId
      };
      setTransaksiList([trxWithTenant, ...transaksiList]);

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

      setSelectedTransaksiId(trxWithTenant.id);
      setIsNewTransaksiModalOpen(false);
      
      if (currentUser.role !== 'pengguna') {
        setActiveTab('generator');
      }

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
    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      showToast('Akses Ditolak: Fitur hapus transaksi hanya aktif untuk pengguna ber-role Admin / Dinas.');
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
      const rcvWithTenant: TransaksiPenerimaan = {
        ...rcvData,
        sekolah_id: rcvData.sekolah_id || currentSekolahId
      };
      setPenerimaanList([rcvWithTenant, ...penerimaanList]);

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
    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      showToast('Akses Ditolak: Fitur hapus penerimaan hanya aktif untuk pengguna ber-role Admin / Dinas.');
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

  // Master Barang Handlers - Isolated to Current School
  const handleAddBarang = (b: Barang) => {
    const bWithTenant: Barang = {
      ...b,
      sekolah_id: b.sekolah_id || currentSekolahId
    };
    setMasterBarang(prev => [...prev, bWithTenant]);
    showToast(`Barang ${b.namaBarang} berhasil ditambahkan ke Master Barang [${activeSekolah.nama}].`);
  };

  const handleUpdateBarang = (b: Barang) => {
    setMasterBarang(masterBarang.map(item => item.id === b.id ? { ...b, sekolah_id: b.sekolah_id || item.sekolah_id || currentSekolahId } : item));
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
    const taggedList = importedList.map(item => ({
      ...item,
      sekolah_id: item.sekolah_id || currentSekolahId
    }));
    if (mode === 'replace') {
      setMasterBarang(prev => [...prev.filter(b => b.sekolah_id !== currentSekolahId), ...taggedList]);
      showToast(`Berhasil mengganti seluruh Master Barang [${activeSekolah.nama}] dengan ${importedList.length} inventaris dari Excel.`);
    } else {
      setMasterBarang(prev => [...prev, ...taggedList]);
      showToast(`Berhasil mengimpor ${importedList.length} inventaris barang ke [${activeSekolah.nama}].`);
    }
  };

  // Master Pejabat Handlers - Isolated to Current School
  const handleAddPejabat = (p: Pejabat) => {
    const pWithTenant: Pejabat = {
      ...p,
      sekolah_id: p.sekolah_id || currentSekolahId
    };
    setPejabatList(prev => [...prev, pWithTenant]);
    showToast(`Pejabat ${p.nama} berhasil ditambahkan untuk [${activeSekolah.nama}].`);
  };

  const handleUpdatePejabat = (p: Pejabat) => {
    setPejabatList(pejabatList.map(item => item.id === p.id ? { ...p, sekolah_id: p.sekolah_id || item.sekolah_id || currentSekolahId } : item));
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
    const taggedList = importedList.map(item => ({
      ...item,
      sekolah_id: item.sekolah_id || currentSekolahId
    }));
    if (mode === 'replace') {
      setPejabatList(prev => [...prev.filter(p => p.sekolah_id !== currentSekolahId), ...taggedList]);
      showToast(`Berhasil mengganti data Pegawai [${activeSekolah.nama}] dengan ${importedList.length} data baru.`);
    } else {
      setPejabatList(prev => [...prev, ...taggedList]);
      showToast(`Berhasil mengimpor ${importedList.length} pegawai baru ke [${activeSekolah.nama}].`);
    }
  };

  const handleSelectForPrint = (trxId: string) => {
    setSelectedTransaksiId(trxId);
    setActiveTab('generator');
  };

  // Fitur Keamanan & Pembersihan Data (Reset Transaksi / Reset Scope Data) - Khusus Admin / Super Admin (Isolated per School)
  const handleResetTransaksi = (options: ResetScopeOptions) => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      alert('Akses Ditolak: Fitur kosongkan data hanya dapat dijalankan oleh Admin sistem.');
      return;
    }

    const clearedItems: string[] = [];

    // 1. Penyaluran (NPB, SPB, SPPB, BAST) - Hanya untuk sekolah aktif
    if (options.deletePenyaluran) {
      setTransaksiList(prev => prev.filter(t => t.sekolah_id !== currentSekolahId));
      setSelectedTransaksiId('');
      clearedItems.push('Riwayat Penyaluran');
    }

    // 2. Penerimaan / Barang Masuk BOS - Hanya untuk sekolah aktif
    if (options.deletePenerimaan) {
      setPenerimaanList(prev => prev.filter(p => p.sekolah_id !== currentSekolahId));
      clearedItems.push('Faktur Penerimaan BOS');
    }

    // 3. Mutasi Stok & Master Data Barang - Hanya untuk sekolah aktif
    if (options.deleteMasterBarang) {
      setMasterBarang(prev => prev.filter(b => b.sekolah_id !== currentSekolahId));
      clearedItems.push('Master Data Barang & NUSP');
    } else if (options.deleteMutasiStok || options.deletePenyaluran || options.deletePenerimaan) {
      if (options.restoreStockToInitial) {
        setMasterBarang(prev =>
          prev.map(b => (b.sekolah_id === currentSekolahId ? { ...b, stokSekarang: b.stokAwal } : b))
        );
        clearedItems.push('Stok Fisik Dikembalikan ke Stok Awal');
      } else {
        clearedItems.push('Stok Berjalan Dipertahankan');
      }
    }

    // 4. Master Data Pegawai - Hanya untuk sekolah aktif
    if (options.deleteMasterPegawai) {
      setPejabatList(prev => prev.filter(p => p.sekolah_id !== currentSekolahId));
      clearedItems.push('Master Data Pegawai');
    }

    // Master Kode Rekening Belanja (40 item resmi) TETAP AMAN / Permanen (Read-only)
    const summaryMsg = clearedItems.length > 0 
      ? `Pengosongan data [${activeSekolah.nama}] berhasil: ${clearedItems.join(', ')}. Master Kode Rekening Belanja dan data sekolah lain tetap aman terlindungi.`
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
    const taggedPejabats = updated.pejabatList.map(p => ({
      ...p,
      sekolah_id: p.sekolah_id || currentSekolahId
    }));
    setPejabatList(prev => [
      ...prev.filter(p => p.sekolah_id !== currentSekolahId),
      ...taggedPejabats
    ]);
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
          onOpenMasterSekolah={isDinasUser ? handleOpenMasterSekolah : undefined}
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
            sekolahList={sekolahList}
            currentSekolahId={currentSekolahId}
            onSelectSekolah={handleSelectSekolah}
            onOpenMasterSekolah={isDinasUser ? handleOpenMasterSekolah : undefined}
            onOpenAuditLog={() => setIsAuditLogOpen(true)}
          />
        </div>

        {/* Main Container */}
        <main className="flex-1 w-full">
        {/* PROTEKSI KEAMANAN ROUTE: 403 Forbidden Screen jika rute dinas diakses oleh akun sekolah */}
        {forbiddenRoute ? (
          <RouteForbiddenView
            targetRoute={forbiddenRoute}
            currentUser={currentUser}
            schoolName={activeSekolah.nama}
            onBackToDashboard={() => {
              setForbiddenRoute(null);
              setActiveTab('dashboard');
              setIsMasterSekolahOpen(false);
              if (window.history.pushState) {
                window.history.pushState(null, '', '/');
              }
            }}
          />
        ) : currentUser.role === 'pengguna' ? (
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
                  onOpenDinasModule={() => handleTabChange('dinas')}
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

            {/* TAB DINAS: Modul Pengawasan & Laporan Mutasi Gabungan Seluruh Satuan Pendidikan (Langkah 4) */}
            {activeTab === 'dinas' && (
              isDinasUser ? (
                <ModulDinasView
                  sekolahList={sekolahList}
                  allMasterBarang={masterBarang}
                  allTransaksi={transaksiList}
                  allPenerimaan={penerimaanList}
                  allPejabat={pejabatList}
                  currentUser={currentUser}
                  onSelectSekolah={handleSelectSekolah}
                  paperSize={paperSize}
                  showToast={showToast}
                />
              ) : (
                <RouteForbiddenView
                  targetRoute="/modul-dinas"
                  currentUser={currentUser}
                  schoolName={activeSekolah.nama}
                  onBackToDashboard={() => {
                    setForbiddenRoute(null);
                    setActiveTab('dashboard');
                    if (window.history.pushState) {
                      window.history.pushState(null, '', '/');
                    }
                  }}
                />
              )
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

            {/* TAB 4: Master Pejabat (Hanya Admin / Super Admin) */}
            {activeTab === 'pejabat' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {(currentUser.role === 'admin' || currentUser.role === 'super_admin') ? (
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

      {/* MODAL KEAMANAN: Log Audit Sistem & Jejak Keamanan Multi-Tenant (Langkah 5) */}
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
        sekolahList={sekolahList}
        currentSekolahId={currentSekolahId}
        onSelectSekolah={handleSelectSekolah}
        currentUser={currentUser}
      />

      {/* MODAL: Master Data Satuan Pendidikan / Sekolah (Multi-Tenant Langkah 3) */}
      <MasterSekolahModal
        isOpen={isMasterSekolahOpen && isDinasUser}
        onClose={() => {
          setIsMasterSekolahOpen(false);
          if (window.location.pathname.includes('data-sekolah') && window.history.pushState) {
            window.history.pushState(null, '', '/');
          }
        }}
        sekolahList={sekolahList}
        currentSekolahId={currentSekolahId}
        onAddSekolah={handleAddSekolah}
        onUpdateSekolah={handleUpdateSekolah}
        onDeleteSekolah={handleDeleteSekolah}
        onSelectSekolah={handleSelectSekolah}
        transaksiList={transaksiList}
        masterBarang={masterBarang}
        userList={userList}
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
