/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CheckCircle, Info, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { DashboardStats } from './components/DashboardStats';
import { DocumentViewer } from './components/DocumentViewer';
import { KopSettingsModal } from './components/KopSettingsModal';
import { MasterBarangTable } from './components/MasterBarangTable';
import { MasterPejabatTable } from './components/MasterPejabatTable';
import { MainTab, Navbar } from './components/Navbar';
import { NumberingSettingsModal } from './components/NumberingSettingsModal';
import { PenerimaanForm } from './components/PenerimaanForm';
import { ResetTransaksiModal } from './components/ResetTransaksiModal';
import { SchemaAndScriptModal } from './components/SchemaAndScriptModal';
import { StaffPermintaanNPBView } from './components/StaffPermintaanNPBView';
import { TransactionForm } from './components/TransactionForm';
import { UserManagementModal } from './components/UserManagementModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { LoginView } from './components/LoginView';
import { AuditLogModal } from './components/AuditLogModal';
import { SecurityDeleteConfirmModal } from './components/SecurityDeleteConfirmModal';
import { UnifiedSettingsModal } from './components/UnifiedSettingsModal';
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
  AppUser, 
  Barang, 
  GoogleSheetSyncConfig,
  KategoriBarangItem,
  KopSuratConfig, 
  NumberingPatternConfig, 
  PaperSize,
  Pejabat, 
  TransaksiPenerimaan, 
  TransaksiPengeluaran, 
  UserRole 
} from './types';
import { DEFAULT_NUMBERING_CONFIG } from './utils/numberGenerator';

export default function App() {
  // Persistence via localStorage with fallback to default data
  const [kopConfig, setKopConfig] = useState<KopSuratConfig>(() => {
    const saved = localStorage.getItem('simba_kop_config');
    return saved ? JSON.parse(saved) : DEFAULT_KOP_SURAT;
  });

  const [numberingConfig, setNumberingConfig] = useState<NumberingPatternConfig>(() => {
    const saved = localStorage.getItem('simba_numbering_config');
    return saved ? JSON.parse(saved) : DEFAULT_NUMBERING_CONFIG;
  });

  const [pejabatList, setPejabatList] = useState<Pejabat[]>(() => {
    const saved = localStorage.getItem('simba_pejabat_list');
    return saved ? JSON.parse(saved) : DEFAULT_PEJABAT;
  });

  const [masterBarang, setMasterBarang] = useState<Barang[]>(() => {
    const saved = localStorage.getItem('simba_master_barang');
    return saved ? JSON.parse(saved) : DEFAULT_BARANG;
  });

  const [kategoriList, setKategoriList] = useState<KategoriBarangItem[]>(() => {
    const saved = localStorage.getItem('simba_kategori_list');
    return saved ? JSON.parse(saved) : DEFAULT_KATEGORI_LIST;
  });

  const [transaksiList, setTransaksiList] = useState<TransaksiPengeluaran[]>(() => {
    const saved = localStorage.getItem('simba_transaksi_list');
    return saved ? JSON.parse(saved) : DEFAULT_TRANSAKSI_PENGELUARAN;
  });

  const [penerimaanList, setPenerimaanList] = useState<TransaksiPenerimaan[]>(() => {
    const saved = localStorage.getItem('simba_penerimaan_list');
    return saved ? JSON.parse(saved) : DEFAULT_TRANSAKSI_PENERIMAAN;
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
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(getLastBackupTime());
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    nama: 'Ratna Indrawati, S.Kom',
    username: 'admin.simba',
    role: 'admin',
    jabatan: 'Admin Sistem & Pengurus Barang',
    unitKerja: 'Sarana Prasarana'
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Handler: Save or Update Disbursement Transaction (NPB/SPB/SPPB/BAST)
  const handleSaveTransaksi = (trxData: TransaksiPengeluaran) => {
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
      
      if (currentUser.role !== 'pengguna') {
        setActiveTab('generator');
      }

      logAuditEvent({
        userId: currentUser.id,
        username: currentUser.username,
        userName: currentUser.nama,
        userRole: currentUser.role,
        action: 'TAMBAH_TRANSAKSI',
        title: `Pencatatan Penyaluran Baru #${trxData.nomorUrut}`,
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
      const remaining = transaksiList.filter(t => t.id !== trx.id);
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
        title: `Pencatatan Penerimaan Baru (${rcvData.noBukti})`,
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

  // Master Barang Handlers
  const handleAddBarang = (b: Barang) => {
    setMasterBarang([...masterBarang, b]);
    showToast(`Barang ${b.namaBarang} berhasil ditambahkan ke Master Barang.`);
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
      showToast(`Berhasil mengganti seluruh Master Barang dengan ${importedList.length} inventaris dari Excel.`);
    } else {
      setMasterBarang(prev => [...prev, ...importedList]);
      showToast(`Berhasil mengimpor ${importedList.length} inventaris barang dari file Excel.`);
    }
  };

  // Master Pejabat Handlers
  const handleAddPejabat = (p: Pejabat) => {
    setPejabatList([...pejabatList, p]);
    showToast(`Pejabat ${p.nama} berhasil ditambahkan.`);
  };

  const handleUpdatePejabat = (p: Pejabat) => {
    setPejabatList(pejabatList.map(item => item.id === p.id ? p : item));
    showToast(`Data pejabat ${p.nama} diperbarui.`);
  };

  const handleDeletePejabat = (id: string) => {
    const p = pejabatList.find(item => item.id === id);
    if (confirm(`Apakah Anda yakin ingin menghapus pejabat "${p?.nama}"?`)) {
      setPejabatList(pejabatList.filter(item => item.id !== id));
      showToast(`Pejabat berhasil dihapus.`);
    }
  };

  const handleImportPejabat = (importedList: Pejabat[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
      setPejabatList(importedList);
      showToast(`Berhasil mengganti seluruh Master Pejabat dengan ${importedList.length} data baru dari Excel.`);
    } else {
      setPejabatList(prev => [...prev, ...importedList]);
      showToast(`Berhasil mengimpor ${importedList.length} pejabat baru dari file Excel.`);
    }
  };

  const handleSelectForPrint = (trxId: string) => {
    setSelectedTransaksiId(trxId);
    setActiveTab('generator');
  };

  // Fitur Keamanan & Pembersihan Data (Reset Transaksi) - Khusus Admin
  const handleResetTransaksi = (restoreToStokAwal: boolean) => {
    if (currentUser.role !== 'admin') {
      alert('Akses Ditolak: Fitur kosongkan transaksi hanya dapat dijalankan oleh Admin sistem.');
      return;
    }

    // 1. Kosongkan seluruh transaksi pengeluaran dan penerimaan
    setTransaksiList([]);
    setPenerimaanList([]);
    setSelectedTransaksiId('');

    // 2. Jika opsi restore stok dipilih, kembalikan stok fisik ke stok awal
    if (restoreToStokAwal) {
      setMasterBarang(prev =>
        prev.map(b => ({
          ...b,
          stokSekarang: b.stokAwal
        }))
      );
    }

    showToast(
      restoreToStokAwal
        ? 'Seluruh riwayat transaksi telah dikosongkan dan stok barang dikembalikan ke stok awal. Data master barang & rekening tetap aman.'
        : 'Seluruh riwayat transaksi pengeluaran & penerimaan berhasil dikosongkan. Data master barang tetap aman.'
    );
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
        kopConfig,
        numberingConfig,
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
  }) => {
    setKopConfig(updated.kopConfig);
    setNumberingConfig(updated.numberingConfig);
    setPejabatList(updated.pejabatList);
    showToast('Seluruh konfigurasi instansi & pejabat berhasil disimpan serentak.');
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
        setKopConfig(restoredData.kopConfig);
      }
      if (restoredData.numberingConfig) {
        setNumberingConfig(restoredData.numberingConfig);
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
        schoolName={kopConfig.namaSekolah}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
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

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenNewTransaksi={() => setIsNewTransaksiModalOpen(true)}
        onOpenNewPenerimaan={() => setIsNewPenerimaanModalOpen(true)}
        onOpenKopSettings={() => setIsKopSettingsOpen(true)}
        onOpenNumberingSettings={() => setIsNumberingSettingsOpen(true)}
        onOpenUnifiedSettings={() => setIsUnifiedSettingsOpen(true)}
        onExecuteBackup={handleExecuteFullBackup}
        lastBackupTime={lastBackupTime}
        onOpenSchemaModal={() => setIsSchemaModalOpen(true)}
        schoolName={kopConfig.namaSekolah}
        currentUser={currentUser}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        onOpenResetTransaksi={() => setIsResetTransaksiOpen(true)}
        onOpenAuditLog={() => setIsAuditLogOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onSwitchRole={handleQuickSwitchRole}
        onOpenGoogleSheets={() => setIsGoogleSheetsOpen(true)}
        isGoogleSheetConnected={Boolean(googleSheetConfig?.spreadsheetId)}
        paperSize={paperSize}
        onSelectPaperSize={setPaperSize}
      />

      {/* Main Container */}
      <main className="flex-1 w-full">
        {/* ROLE 1: Pengguna (Staf/Guru) - Tampilan antarmuka ringkas khusus Permintaan Barang (NPB) */}
        {currentUser.role === 'pengguna' ? (
          <StaffPermintaanNPBView
            currentUser={currentUser}
            masterBarang={masterBarang}
            pejabatList={pejabatList}
            kopConfig={kopConfig}
            numberingConfig={numberingConfig}
            transaksiList={transaksiList}
            onSaveNPB={handleSaveTransaksi}
            onOpenUserSwitcher={() => setIsUserManagementOpen(true)}
          />
        ) : (
          <>
            {/* TAB 1: Dashboard & Daftar Transaksi (Admin & Operator) */}
            {activeTab === 'dashboard' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <DashboardStats
                  transaksiList={transaksiList}
                  penerimaanList={penerimaanList}
                  barangList={masterBarang}
                  pejabatList={pejabatList}
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
                />
              </div>
            )}

            {/* TAB 2: Generator Dokumen Cetak (Print / PDF) - (Admin & Operator) */}
            {activeTab === 'generator' && (
              <DocumentViewer
                transaksiList={transaksiList}
                transaksiPenerimaanList={penerimaanList}
                masterBarang={masterBarang}
                pejabatList={pejabatList}
                kopConfig={kopConfig}
                selectedTransaksiId={selectedTransaksiId}
                onSelectTransaksi={setSelectedTransaksiId}
                onOpenKopSettings={() => setIsKopSettingsOpen(true)}
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
                  barangList={masterBarang}
                  onAddBarang={handleAddBarang}
                  onUpdateBarang={handleUpdateBarang}
                  onDeleteBarang={handleDeleteBarang}
                  onImportBarang={handleImportBarang}
                  kategoriList={kategoriList}
                  onUpdateKategoriList={setKategoriList}
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

            {/* TAB 4: Master Pejabat (Hanya Admin) */}
            {activeTab === 'pejabat' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {currentUser.role === 'admin' ? (
                  <MasterPejabatTable
                    pejabatList={pejabatList}
                    onAddPejabat={handleAddPejabat}
                    onUpdatePejabat={handleUpdatePejabat}
                    onDeletePejabat={handleDeletePejabat}
                    onImportPejabat={handleImportPejabat}
                  />
                ) : (
                  <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2 max-w-lg mx-auto my-12">
                    <div className="text-amber-600 font-bold text-base">Akses Khusus Administrator</div>
                    <p className="text-xs text-slate-500">
                      Menu Master Pejabat dan struktur penandatangan dokumen dinas hanya dapat diubah oleh Administrator sistem.
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

      {/* MODAL: Input Transaksi Penyaluran Baru (Spreadsheet-like) */}
      {isNewTransaksiModalOpen && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="my-auto w-full max-w-6xl xl:max-w-7xl">
            <TransactionForm
              initialData={editingTransaksi || undefined}
              masterBarang={masterBarang}
              pejabatList={pejabatList}
              kopConfig={kopConfig}
              numberingConfig={numberingConfig}
              nextCounter={transaksiList.length + 1}
              transaksiList={transaksiList}
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
              masterBarang={masterBarang}
              pejabatList={pejabatList}
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
        kopConfig={kopConfig}
        numberingConfig={numberingConfig}
        pejabatList={pejabatList}
        masterBarang={masterBarang}
        transaksiList={transaksiList}
        penerimaanList={penerimaanList}
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
        kopConfig={kopConfig}
        onSave={(newKop) => {
          setKopConfig(newKop);
          showToast('Kop surat dan logo resmi sekolah berhasil diperbarui.');
        }}
      />

      {/* MODAL: Pengaturan Format Penomoran Surat Dinamis */}
      <NumberingSettingsModal
        isOpen={isNumberingSettingsOpen}
        onClose={() => setIsNumberingSettingsOpen(false)}
        config={numberingConfig}
        kopConfig={kopConfig}
        transaksiList={transaksiList}
        onSave={(newCfg) => {
          setNumberingConfig(newCfg);
          showToast('Format penomoran surat dinas berhasil diperbarui.');
        }}
      />

      {/* MODAL: Skema Database & Google Apps Script */}
      <SchemaAndScriptModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
      />

      {/* MODAL KEAMANAN: Kosongkan Riwayat Transaksi (Khusus Admin Berizin PIN) */}
      <ResetTransaksiModal
        isOpen={isResetTransaksiOpen}
        onClose={() => setIsResetTransaksiOpen(false)}
        onConfirmReset={handleResetTransaksi}
        transaksiCount={transaksiList.length}
        penerimaanCount={penerimaanList.length}
        currentUser={currentUser}
        onOpenAuditLog={() => setIsAuditLogOpen(true)}
      />

      {/* MODAL KEAMANAN: Log Audit Sistem & Jejak Keamanan (Khusus Admin) */}
      <AuditLogModal
        isOpen={isAuditLogOpen}
        onClose={() => setIsAuditLogOpen(false)}
      />

      {/* MODAL: Ganti Akun Pengguna / Layar Login */}
      {isLoginModalOpen && (
        <LoginView
          isModal={true}
          onCloseModal={() => setIsLoginModalOpen(false)}
          userList={userList}
          onLoginSuccess={handleLoginSuccess}
          schoolName={kopConfig.namaSekolah}
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
      />

      {/* MODAL: Integrasi & Sinkronisasi Google Sheets */}
      <GoogleSheetsModal
        isOpen={isGoogleSheetsOpen}
        onClose={() => setIsGoogleSheetsOpen(false)}
        masterBarang={masterBarang}
        transaksiList={transaksiList}
        penerimaanList={penerimaanList}
        kopConfig={kopConfig}
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
    </div>
  );
}
