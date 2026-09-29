import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  ExternalLink,
  Eye,
  Globe2,
  GraduationCap,
  Info,
  MapPin,
  Phone,
  Plus,
  Power,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { AppUser, Barang, Sekolah, TransaksiPengeluaran } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sekolahList: Sekolah[];
  currentSekolahId: string;
  onAddSekolah: (sekolah: Sekolah) => void;
  onUpdateSekolah: (sekolah: Sekolah) => void;
  onDeleteSekolah: (sekolahId: string) => void;
  onSelectSekolah: (sekolahId: string) => void;
  transaksiList?: TransaksiPengeluaran[];
  masterBarang?: Barang[];
  userList?: AppUser[];
}

export const MasterSekolahModal: React.FC<Props> = ({
  isOpen,
  onClose,
  sekolahList,
  currentSekolahId,
  onAddSekolah,
  onUpdateSekolah,
  onDeleteSekolah,
  onSelectSekolah,
  transaksiList = [],
  masterBarang = [],
  userList = []
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenjang, setFilterJenjang] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields - Sesuai Spesifikasi Langkah #3: MASTER DATA SEKOLAH
  // Minimal: id, nama_sekolah, npsn, alamat, desa_kelurahan, kecamatan, kabupaten_kota, provinsi, kode_pos, logo, kop_surat, email, telepon, status, created_at, updated_at
  const [npsn, setNpsn] = useState('');
  const [nama, setNama] = useState('');
  const [alamat, setAlamat] = useState('');
  const [desaKelurahan, setDesaKelurahan] = useState('');
  const [kecamatan, setKecamatan] = useState('');
  const [kabupatenKota, setKabupatenKota] = useState('Kota Bekasi');
  const [provinsi, setProvinsi] = useState('Jawa Barat');
  const [kodePos, setKodePos] = useState('');
  const [logo, setLogo] = useState('tutwuri');
  const [kopSurat, setKopSurat] = useState('');
  const [jenjang, setJenjang] = useState<'SD' | 'SMP' | 'SMA' | 'SMK'>('SMK');
  const [status, setStatus] = useState<'Negeri' | 'Swasta'>('Negeri');
  const [isOperasionalAktif, setIsOperasionalAktif] = useState(true);
  const [telepon, setTelepon] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [kepalaSekolahNama, setKepalaSekolahNama] = useState('');
  const [kepalaSekolahNip, setKepalaSekolahNip] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setNpsn('');
    setNama('');
    setAlamat('');
    setDesaKelurahan('');
    setKecamatan('');
    setKabupatenKota('Kota Bekasi');
    setProvinsi('Jawa Barat');
    setKodePos('');
    setLogo('tutwuri');
    setKopSurat('');
    setJenjang('SMK');
    setStatus('Negeri');
    setIsOperasionalAktif(true);
    setTelepon('');
    setEmail('');
    setWebsite('');
    setKepalaSekolahNama('');
    setKepalaSekolahNip('');
    setErrorMsg('');
    setIsFormOpen(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleStartEdit = (sch: Sekolah) => {
    setEditingId(sch.id);
    setNpsn(sch.npsn);
    setNama(sch.nama_sekolah || sch.nama);
    setAlamat(sch.alamat || '');
    setDesaKelurahan(sch.desa_kelurahan || '');
    setKecamatan(sch.kecamatan || '');
    setKabupatenKota(sch.kabupaten_kota || sch.kota || 'Jawa Barat');
    setProvinsi(sch.provinsi || 'Jawa Barat');
    setKodePos(sch.kode_pos || '');
    setLogo(sch.logo || (sch.jenjang === 'SMA' ? 'sma' : 'tutwuri'));
    setKopSurat(sch.kop_surat || '');
    setJenjang(sch.jenjang || 'SMK');
    setStatus((sch.status as any) || 'Negeri');
    setIsOperasionalAktif(sch.isActive !== false);
    setTelepon(sch.telepon || '');
    setEmail(sch.email || '');
    setWebsite(sch.website || '');
    setKepalaSekolahNama(sch.kepalaSekolahNama || '');
    setKepalaSekolahNip(sch.kepalaSekolahNip || '');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanNpsn = npsn.trim();
    const cleanNama = nama.trim();

    if (!cleanNpsn || !cleanNama) {
      setErrorMsg('NPSN dan Nama Satuan Pendidikan wajib diisi.');
      return;
    }

    if (!/^\d{8}$/.test(cleanNpsn)) {
      setErrorMsg('Format NPSN tidak valid. Harus tepat 8 digit angka numerik.');
      return;
    }

    // Check duplicate NPSN
    const duplicateNpsn = sekolahList.find(s => s.npsn === cleanNpsn && s.id !== editingId);
    if (duplicateNpsn) {
      setErrorMsg(`NPSN ${cleanNpsn} sudah terdaftar untuk sekolah "${duplicateNpsn.nama}".`);
      return;
    }

    const nowIso = new Date().toISOString();

    if (editingId) {
      // EDIT EXISTING SEKOLAH
      const existing = sekolahList.find(s => s.id === editingId);
      if (!existing) return;

      const updated: Sekolah = {
        ...existing,
        id: editingId,
        nama: cleanNama.toUpperCase(),
        nama_sekolah: cleanNama.toUpperCase(),
        npsn: cleanNpsn,
        alamat: alamat.trim(),
        desa_kelurahan: desaKelurahan.trim(),
        kecamatan: kecamatan.trim(),
        kabupaten_kota: kabupatenKota.trim(),
        kota: kabupatenKota.trim(),
        provinsi: provinsi.trim(),
        kode_pos: kodePos.trim(),
        logo: logo.trim(),
        kop_surat: kopSurat.trim() || `PEMERINTAH DAERAH PROVINSI ${provinsi.toUpperCase()} - DINAS PENDIDIKAN`,
        jenjang,
        status,
        telepon: telepon.trim(),
        email: email.trim(),
        website: website.trim(),
        kepalaSekolahNama: kepalaSekolahNama.trim(),
        kepalaSekolahNip: kepalaSekolahNip.trim(),
        isActive: isOperasionalAktif,
        updated_at: nowIso,
        updatedAt: nowIso
      };

      onUpdateSekolah(updated);
      resetForm();
    } else {
      // CREATE NEW SEKOLAH (Shared DB + Shared Schema + sekolah_id)
      const generatedId = `sekolah-${cleanNama.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 24)}-${cleanNpsn.slice(-4)}`;
      const newSekolah: Sekolah = {
        id: generatedId,
        nama: cleanNama.toUpperCase(),
        nama_sekolah: cleanNama.toUpperCase(),
        npsn: cleanNpsn,
        alamat: alamat.trim(),
        desa_kelurahan: desaKelurahan.trim(),
        kecamatan: kecamatan.trim(),
        kabupaten_kota: kabupatenKota.trim(),
        kota: kabupatenKota.trim(),
        provinsi: provinsi.trim(),
        kode_pos: kodePos.trim(),
        logo: logo.trim() || (jenjang === 'SMA' ? 'sma' : 'tutwuri'),
        kop_surat: kopSurat.trim() || `PEMERINTAH DAERAH PROVINSI ${provinsi.toUpperCase()} - DINAS PENDIDIKAN`,
        jenjang,
        status,
        telepon: telepon.trim(),
        email: email.trim(),
        website: website.trim(),
        kepalaSekolahNama: kepalaSekolahNama.trim(),
        kepalaSekolahNip: kepalaSekolahNip.trim(),
        isActive: isOperasionalAktif,
        created_at: nowIso,
        updated_at: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      onAddSekolah(newSekolah);
      resetForm();
    }
  };

  const handleDelete = (sch: Sekolah) => {
    if (sch.id === currentSekolahId) {
      alert('Tidak dapat menghapus sekolah yang sedang aktif dibuka dalam sesi Anda. Pilihlah sekolah lain terlebih dahulu.');
      return;
    }

    const hasTrx = transaksiList.some(t => t.sekolah_id === sch.id);
    const hasGoods = masterBarang.some(b => b.sekolah_id === sch.id);

    if (hasTrx || hasGoods) {
      alert(`Sekolah "${sch.nama}" tidak dapat dihapus karena memiliki data inventaris (${hasGoods ? 'Barang Aktif' : ''}) atau riwayat penyaluran barang (${hasTrx ? 'Transaksi Aktif' : ''}).`);
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus data sekolah "${sch.nama}" (NPSN: ${sch.npsn}) dari sistem SIMBA?`)) {
      onDeleteSekolah(sch.id);
    }
  };

  // Filtered List
  const filteredSekolah = useMemo(() => {
    return sekolahList.filter(s => {
      const matchSearch = s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.npsn.includes(searchQuery) ||
        (s.kabupaten_kota && s.kabupaten_kota.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.kota && s.kota.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.kecamatan && s.kecamatan.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchJenjang = filterJenjang === 'all' || s.jenjang === filterJenjang;
      const matchStatus = filterStatus === 'all' || 
        (filterStatus === 'aktif' && s.isActive !== false) ||
        (filterStatus === 'nonaktif' && s.isActive === false) ||
        (filterStatus === s.status);

      return matchSearch && matchJenjang && matchStatus;
    });
  }, [sekolahList, searchQuery, filterJenjang, filterStatus]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="my-auto w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modul Master Sekolah */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 border-b border-blue-900/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 ring-2 ring-white/20 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Master Data Satuan Pendidikan (Sekolah)</h2>
                <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Langkah 3: Master Data
                </span>
                <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30 px-2 py-0.5 rounded-full uppercase">
                  Super Admin / Dinas
                </span>
              </div>
              <p className="text-xs text-blue-200/90 mt-0.5">
                Kelola master entitas sekolah (`sekolah_id`), atribut wilayah, legalitas NPSN, dan pemisahan data mandiri.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary & Quick Actions */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-500">Total Terdaftar: </span>
              <span className="font-bold text-slate-800 font-mono">{sekolahList.length} Sekolah</span>
            </div>
            <div>
              <span className="text-slate-500">Status Aktif: </span>
              <span className="font-bold text-emerald-600 font-mono">
                {sekolahList.filter(s => s.isActive !== false).length} Unit
              </span>
            </div>
            <div>
              <span className="text-slate-500">Konteks Sesi Saat Ini: </span>
              <span className="font-bold text-blue-700">
                {sekolahList.find(s => s.id === currentSekolahId)?.nama || '-'}
              </span>
            </div>
          </div>

          {!isFormOpen && (
            <button
              type="button"
              onClick={handleStartAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Daftarkan Sekolah Baru</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Form Modal / Drawer */}
          {isFormOpen && (
            <form onSubmit={handleSave} className="bg-slate-50 border border-blue-200/80 rounded-2xl p-5 sm:p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-200 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {editingId ? 'Edit Data Satuan Pendidikan' : 'Pendaftaran Satuan Pendidikan Baru (Multi-Tenant)'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Tabel `sekolah` dengan primary key `id` dan identifier `sekolah_id` mandiri.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer px-2.5 py-1 rounded-lg border border-slate-200 bg-white"
                >
                  Batal
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Grid Form Fields - 16 Fields Minimal Sesuai Prompt Langkah 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
                
                {/* 1. ID Tenant (Auto/Fixed) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ID Sekolah (Tenant ID):
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editingId || (nama ? `sekolah-${nama.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 16)}-${npsn.slice(-4) || 'xxxx'}` : '(Otomatis di-generate)')}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-mono text-[11px] text-slate-600 cursor-not-allowed"
                  />
                </div>

                {/* 2. NPSN (8 Digit) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    NPSN (8 Digit Angka) <span className="text-red-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={npsn}
                    onChange={(e) => setNpsn(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 20231945"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold"
                  />
                </div>

                {/* 3. Nama Satuan Pendidikan / Sekolah */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Satuan Pendidikan (nama_sekolah) <span className="text-red-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: SMAN 1 CIHAURBEUTI atau SMKN 1 KOTA BEKASI"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 uppercase font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* 4. Jenjang Pendidikan */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenjang Pendidikan:</label>
                  <select
                    value={jenjang}
                    onChange={(e) => setJenjang(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="SMK">SMK (Sekolah Menengah Kejuruan)</option>
                    <option value="SMA">SMA (Sekolah Menengah Atas)</option>
                    <option value="SMP">SMP (Sekolah Menengah Pertama)</option>
                    <option value="SD">SD (Sekolah Dasar)</option>
                  </select>
                </div>

                {/* 5. Status Kelembagaan */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Kelembagaan:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="Negeri">Negeri</option>
                    <option value="Swasta">Swasta</option>
                  </select>
                </div>

                {/* 6. Status Operasional Tenant */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Operasional SIMBA:</label>
                  <select
                    value={isOperasionalAktif ? 'aktif' : 'nonaktif'}
                    onChange={(e) => setIsOperasionalAktif(e.target.value === 'aktif')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="aktif">Aktif (Operasional Penuh)</option>
                    <option value="nonaktif">Nonaktif / Penangguhan</option>
                  </select>
                </div>

                {/* 7. Pilihan Logo Instansi */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Logo Satuan Pendidikan:</label>
                  <select
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="tutwuri">Tutwuri Handayani (Kemendikbud)</option>
                    <option value="pemda">Logo Pemda Jawa Barat</option>
                    <option value="sma">Logo SMA Nasional</option>
                    <option value="smk">Logo SMK Bisa Hebat</option>
                    <option value="kemenag">Logo Kemenag RI</option>
                  </select>
                </div>

                {/* 8. Alamat Lengkap */}
                <div className="sm:col-span-4">
                  <label className="block font-bold text-slate-700 mb-1">Alamat Jalan &amp; Nomor (alamat):</label>
                  <input
                    type="text"
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    placeholder="Contoh: Jl. Kartawijaya No. 600"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* 9. Desa / Kelurahan */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Desa / Kelurahan (desa_kelurahan):</label>
                  <input
                    type="text"
                    value={desaKelurahan}
                    onChange={(e) => setDesaKelurahan(e.target.value)}
                    placeholder="Contoh: Cihaurbeuti / Duren Jaya"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* 10. Kecamatan */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kecamatan (kecamatan):</label>
                  <input
                    type="text"
                    value={kecamatan}
                    onChange={(e) => setKecamatan(e.target.value)}
                    placeholder="Contoh: Cihaurbeuti / Bekasi Timur"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* 11. Kabupaten / Kota */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kabupaten / Kota (kabupaten_kota):</label>
                  <input
                    type="text"
                    value={kabupatenKota}
                    onChange={(e) => setKabupatenKota(e.target.value)}
                    placeholder="Contoh: Kabupaten Ciamis / Kota Bekasi"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* 12. Kode Pos */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kode Pos (kode_pos):</label>
                  <input
                    type="text"
                    maxLength={5}
                    value={kodePos}
                    onChange={(e) => setKodePos(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 46261"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* 13. Provinsi */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Provinsi (provinsi):</label>
                  <input
                    type="text"
                    value={provinsi}
                    onChange={(e) => setProvinsi(e.target.value)}
                    placeholder="Jawa Barat"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* 14. Telepon */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telepon / Fax (telepon):</label>
                  <input
                    type="text"
                    value={telepon}
                    onChange={(e) => setTelepon(e.target.value)}
                    placeholder="(0265) 771234"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* 15. Email */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Resmi (email):</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@sman1cihaurbeuti.sch.id"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* 16. Website */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Website Sekolah:</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://sman1cihaurbeuti.sch.id"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Header Kop Surat Instansi (kop_surat) */}
                <div className="sm:col-span-4">
                  <label className="block font-bold text-slate-700 mb-1">
                    Instansi Induk / Deskripsi Kop Surat (kop_surat):
                  </label>
                  <input
                    type="text"
                    value={kopSurat}
                    onChange={(e) => setKopSurat(e.target.value)}
                    placeholder="Contoh: PEMERINTAH DAERAH PROVINSI JAWA BARAT - DINAS PENDIDIKAN - CABANG DINAS PENDIDIKAN WILAYAH XIII"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs"
                  />
                </div>

                {/* Kepala Sekolah & NIP */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nama Kepala Sekolah &amp; Gelar:</label>
                  <input
                    type="text"
                    value={kepalaSekolahNama}
                    onChange={(e) => setKepalaSekolahNama(e.target.value)}
                    placeholder="Dra. Hj. Imas Rohayati, M.Pd."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">NIP Kepala Sekolah:</label>
                  <input
                    type="text"
                    value={kepalaSekolahNip}
                    onChange={(e) => setKepalaSekolahNip(e.target.value)}
                    placeholder="19690321 199412 2 001"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{editingId ? 'Simpan Perubahan Master Data Sekolah' : 'Simpan & Daftarkan Sekolah ke SIMBA'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Search, Filter & Quick Stats Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NPSN, kecamatan, kab/kota..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
              <span className="text-slate-500 font-medium">Jenjang:</span>
              <select
                value={filterJenjang}
                onChange={(e) => setFilterJenjang(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Semua Jenjang</option>
                <option value="SMK">SMK</option>
                <option value="SMA">SMA</option>
                <option value="SMP">SMP</option>
                <option value="SD">SD</option>
              </select>

              <span className="text-slate-500 font-medium ml-2">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
                <option value="Negeri">Negeri</option>
                <option value="Swasta">Swasta</option>
              </select>
            </div>
          </div>

          {/* Table of Master Sekolah */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Satuan Pendidikan</th>
                    <th className="py-3 px-3">NPSN &amp; Legalitas</th>
                    <th className="py-3 px-3">Wilayah / Daerah</th>
                    <th className="py-3 px-3">Pimpinan &amp; Kontak</th>
                    <th className="py-3 px-3 text-center">Data Persediaan</th>
                    <th className="py-3 px-3 text-center">Isolasi Tenant</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSekolah.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        Tidak ada satuan pendidikan yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredSekolah.map((sch) => {
                      const isCurrent = sch.id === currentSekolahId;
                      const barangCount = masterBarang.filter(b => b.sekolah_id === sch.id).length;
                      const trxCount = transaksiList.filter(t => t.sekolah_id === sch.id).length;

                      return (
                        <tr
                          key={sch.id}
                          className={`hover:bg-slate-50/90 transition-colors ${
                            isCurrent ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          {/* Nama & Alamat */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-start gap-2.5">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isCurrent 
                                  ? 'bg-blue-600 text-white shadow-xs' 
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 truncate max-w-[240px]" title={sch.nama_sekolah || sch.nama}>
                                    {sch.nama_sekolah || sch.nama}
                                  </span>
                                  {isCurrent && (
                                    <span className="text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200 px-1.5 py-0.2 rounded-full">
                                      Sedang Dibuka
                                    </span>
                                  )}
                                  {sch.isActive === false && (
                                    <span className="text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.2 rounded-full">
                                      Nonaktif
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 truncate max-w-[280px]" title={sch.alamat}>
                                  {sch.alamat || 'Alamat belum diatur'}
                                  {sch.desa_kelurahan && `, ${sch.desa_kelurahan}`}
                                  {sch.kecamatan && `, Kec. ${sch.kecamatan}`}
                                </p>
                                <span className="font-mono text-[10px] text-slate-400">ID: {sch.id}</span>
                              </div>
                            </div>
                          </td>

                          {/* NPSN & Legalitas */}
                          <td className="py-3.5 px-3">
                            <div className="font-mono font-bold text-slate-800 tracking-wider">{sch.npsn}</div>
                            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                              <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                {sch.jenjang || 'SMK'} • {sch.status || 'Negeri'}
                              </span>
                            </div>
                          </td>

                          {/* Wilayah / Daerah */}
                          <td className="py-3.5 px-3">
                            <span className="font-semibold text-slate-800">
                              {sch.kabupaten_kota || sch.kota || '-'}
                            </span>
                            <div className="text-[10px] text-slate-500">
                              {sch.provinsi || 'Jawa Barat'} {sch.kode_pos ? `(${sch.kode_pos})` : ''}
                            </div>
                          </td>

                          {/* Pimpinan & Kontak */}
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-slate-800 max-w-[180px] truncate" title={sch.kepalaSekolahNama}>
                              {sch.kepalaSekolahNama || '-'}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {sch.kepalaSekolahNip ? `NIP. ${sch.kepalaSekolahNip}` : '-'}
                            </div>
                            {sch.telepon && (
                              <div className="text-[10px] text-slate-500 mt-0.5">{sch.telepon}</div>
                            )}
                          </td>

                          {/* Data Persediaan Counter */}
                          <td className="py-3.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium">
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded" title="Total Barang Terdata">
                                {barangCount} Brg
                              </span>
                              <span className="bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded" title="Total Transaksi Penyaluran">
                                {trxCount} Trx
                              </span>
                            </div>
                          </td>

                          {/* Isolasi Status */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Terisolasi
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {!isCurrent ? (
                                <button
                                  type="button"
                                  onClick={() => onSelectSekolah(sch.id)}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-[11px] shadow-xs"
                                  title="Pilih dan alihkan sesi kerja ke sekolah ini"
                                >
                                  Pilih Sesi
                                </button>
                              ) : (
                                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                                  Aktif
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleStartEdit(sch)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit Master Data Satuan Pendidikan"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(sch)}
                                disabled={isCurrent || barangCount > 0 || trxCount > 0}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                title={isCurrent ? 'Tidak dapat menghapus sekolah yang sedang dibuka' : (barangCount > 0 || trxCount > 0) ? 'Sekolah memiliki barang atau transaksi tersimpan' : 'Hapus Sekolah'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Arsitektur Multi-Tenant Callout Info */}
          <div className="p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/80 rounded-2xl flex items-start gap-3.5 text-xs text-blue-950">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="leading-relaxed">
              <div className="font-bold text-slate-900 mb-0.5">
                Kepatuhan Arsitektur Multi-Tenant Langkah 3: Master Data Sekolah (`sekolah`)
              </div>
              Setiap satuan pendidikan terdaftar memiliki identitas `id` permanen yang menjadi kunci partisi (`sekolah_id`) untuk tabel data: barang inventaris, transaksi penerimaan, penyaluran (NPB, SPB, SPPB, BAST), pejabat penandatangan, dan riwayat mutasi persediaan. Master kode rekening (40 Kodering Belanja) tetap berstatus <strong>GLOBAL / SHARED</strong> untuk keseragaman pelaporan keuangan daerah.
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-500">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span>Sistem Informasi Manajemen Barang &amp; Persediaan (SIMBA) Multi-Sekolah</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
