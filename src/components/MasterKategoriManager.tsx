import React, { useState, useMemo } from 'react';
import { 
  Tag, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  Boxes, 
  CheckCircle2, 
  HelpCircle,
  Package,
  Building2
} from 'lucide-react';
import { Barang, KategoriBarangItem, JenisBarang } from '../types';

export interface CategoryFormData {
  kodeRekening: string;
  namaKategori: string;
  jenis: 'BHP' | 'Belanja Modal' | string;
  id?: string;
}

export interface MasterKategoriManagerProps {
  categories?: KategoriBarangItem[];
  barangList?: Barang[];
  onSaveCategory: (formData: CategoryFormData, editingId?: string | null) => void;
  onDeleteCategory: (categoryId: string) => void;
  onClose: () => void;
}

export const MasterKategoriManager: React.FC<MasterKategoriManagerProps> = ({
  categories = [],
  barangList = [],
  onSaveCategory,
  onDeleteCategory,
  onClose
}) => {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    kodeRekening: '',
    namaKategori: '',
    jenis: 'BHP'
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterJenis, setFilterJenis] = useState<'Semua' | 'BHP' | 'Belanja Modal'>('Semua');
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  // Map how many barang use each category/rekening
  const usageMap = useMemo(() => {
    const map = new Map<string, { count: number; sampleNames: string[] }>();
    barangList.forEach(b => {
      const keys = [
        b.kategori?.trim().toLowerCase(),
        b.namaRekening?.trim().toLowerCase(),
        b.kodeRekening?.trim()
      ].filter(Boolean) as string[];

      keys.forEach(k => {
        const existing = map.get(k) || { count: 0, sampleNames: [] };
        existing.count += 1;
        if (existing.sampleNames.length < 3 && !existing.sampleNames.includes(b.namaBarang)) {
          existing.sampleNames.push(b.namaBarang);
        }
        map.set(k, existing);
      });
    });
    return map;
  }, [barangList]);

  // Check usage for a specific category
  const getCategoryUsage = (cat: KategoriBarangItem) => {
    const byName = usageMap.get(cat.nama?.trim().toLowerCase());
    const byRekening = usageMap.get(cat.namaRekening?.trim().toLowerCase());
    const byKode = cat.kodeRekening ? usageMap.get(cat.kodeRekening.trim()) : undefined;

    const count = Math.max(byName?.count || 0, byRekening?.count || 0, byKode?.count || 0);
    const samples = Array.from(new Set([
      ...(byName?.sampleNames || []),
      ...(byRekening?.sampleNames || []),
      ...(byKode?.sampleNames || [])
    ]));

    return { count, samples };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKode = formData.kodeRekening.trim();
    const cleanNama = formData.namaKategori.trim();

    if (!cleanKode || !cleanNama) {
      alert('Kode Rekening dan Nama Kategori / Uraian Rekening wajib diisi!');
      return;
    }

    onSaveCategory(
      {
        kodeRekening: cleanKode,
        namaKategori: cleanNama,
        jenis: formData.jenis || 'BHP'
      },
      isEditing
    );

    setFormData({ kodeRekening: '', namaKategori: '', jenis: 'BHP' });
    setIsEditing(null);
    setDeleteWarning(null);
  };

  const handleEditClick = (cat: KategoriBarangItem) => {
    setIsEditing(cat.id);
    setFormData({
      id: cat.id,
      kodeRekening: cat.kodeRekening || '',
      namaKategori: cat.nama || cat.namaRekening || '',
      jenis: cat.jenisDefault || (cat.kodeRekening?.startsWith('5.2') ? 'Belanja Modal' : 'BHP')
    });
    setDeleteWarning(null);
    // Smooth scroll to top form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setFormData({ kodeRekening: '', namaKategori: '', jenis: 'BHP' });
    setDeleteWarning(null);
  };

  const handleDeleteClick = (cat: KategoriBarangItem) => {
    const usage = getCategoryUsage(cat);

    // Strict validation: cannot delete if currently used by goods in inventory
    if (usage.count > 0) {
      const sampleText = usage.samples.length > 0 
        ? `\n\nContoh barang yang masih menggunakannya:\n• ${usage.samples.join('\n• ')}`
        : '';
      const msg = `Tidak dapat menghapus kategori "${cat.nama}" (${cat.kodeRekening || '-'}). Kategori ini sedang aktif digunakan oleh ${usage.count} barang pada master inventaris.${sampleText}\n\nSilakan ubah kategori barang terkait ke kategori lain terlebih dahulu jika ingin menghapusnya.`;
      setDeleteWarning(msg);
      alert(msg);
      return;
    }

    // Confirmation if not in use
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus kategori "${cat.nama}" (${cat.kodeRekening || '-'})? Tindakan ini tidak dapat dibatalkan.`
    );
    if (confirmDelete) {
      onDeleteCategory(cat.id);
      setDeleteWarning(null);
      if (isEditing === cat.id) {
        handleCancelEdit();
      }
    }
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return categories.filter(cat => {
      const catJenis = cat.jenisDefault || (cat.kodeRekening?.startsWith('5.2') ? 'Belanja Modal' : 'BHP');
      const matchJenis = filterJenis === 'Semua' || catJenis === filterJenis;

      const matchQuery = !q ||
        (cat.nama && cat.nama.toLowerCase().includes(q)) ||
        (cat.namaRekening && cat.namaRekening.toLowerCase().includes(q)) ||
        (cat.kodeRekening && cat.kodeRekening.toLowerCase().includes(q)) ||
        (cat.id && cat.id.toLowerCase().includes(q));

      return matchJenis && matchQuery;
    });
  }, [categories, searchQuery, filterJenis]);

  const bhpCount = categories.filter(c => (c.jenisDefault || (c.kodeRekening?.startsWith('5.2') ? 'Belanja Modal' : 'BHP')) === 'BHP').length;
  const modalCount = categories.filter(c => (c.jenisDefault || (c.kodeRekening?.startsWith('5.2') ? 'Belanja Modal' : 'BHP')) === 'Belanja Modal').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* HEADER MODAL */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white tracking-wide">
                Kelola Master Kategori &amp; Kode Rekening Belanja
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Konfigurasi dinamis kategori inventaris terpadu (<span className="text-indigo-300 font-semibold">{categories.length} Kategori &amp; Rekening Aktif</span>).
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-white hover:bg-slate-800 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base transition-colors"
            title="Tutup (Esc)"
          >
            ✕
          </button>
        </div>

        {/* KONTEN UTAMA DENGAN SCROLL */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* BANNER NOTIFIKASI DELETE WARNING */}
          {deleteWarning && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2.5 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 whitespace-pre-line leading-relaxed">
                {deleteWarning}
              </div>
              <button 
                type="button" 
                onClick={() => setDeleteWarning(null)}
                className="text-rose-500 hover:text-rose-800 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* FORM TAMBAH / EDIT KATEGORI */}
          <form 
            onSubmit={handleSubmit} 
            className={`p-4 sm:p-5 rounded-xl border transition-all ${
              isEditing 
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20 shadow-xs' 
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3 border-b border-slate-200/80 pb-2">
              <h4 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Edit3 className="w-4 h-4 text-amber-600" />
                    <span>Edit Kategori &amp; Rekening Belanja</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-indigo-600" />
                    <span>+ Tambah Kategori &amp; Rekening Baru</span>
                  </>
                )}
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                Single Source of Truth: 1 Kategori = 1 Kode Rekening
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              {/* Kode Rekening */}
              <div className="md:col-span-4">
                <label className="block font-semibold text-xs text-slate-700 mb-1">
                  Kode Rekening <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Contoh: 5.1.02.01.01.0024 atau 5.2.02.05.01.0001"
                  value={formData.kodeRekening}
                  onChange={(e) => setFormData({ ...formData, kodeRekening: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:font-normal placeholder:text-slate-400"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Format akun resmi standar BAS/Permendagri Pemda.
                </p>
              </div>

              {/* Nama Kategori / Uraian Rekening */}
              <div className="md:col-span-5">
                <label className="block font-semibold text-xs text-slate-700 mb-1">
                  Nama Kategori / Uraian Rekening <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Contoh: Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor"
                  value={formData.namaKategori}
                  onChange={(e) => setFormData({ ...formData, namaKategori: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Uraian akun ini otomatis digunakan sebagai nama kategori barang.
                </p>
              </div>

              {/* Jenis Aset */}
              <div className="md:col-span-3">
                <label className="block font-semibold text-xs text-slate-700 mb-1">
                  Jenis Aset
                </label>
                <select
                  value={formData.jenis}
                  onChange={(e) => setFormData({ ...formData, jenis: e.target.value as 'BHP' | 'Belanja Modal' })}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-800 cursor-pointer"
                >
                  <option value="BHP">BHP (Habis Pakai / 5.1...)</option>
                  <option value="Belanja Modal">Modal (Aset Tetap / 5.2...)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Menentukan buku pencatatan &amp; laporan mutasi.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 mt-2 border-t border-slate-200/80">
              {isEditing && (
                <button 
                  type="button" 
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
              )}
              <button 
                type="submit" 
                className={`px-4 py-2 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-98 ${
                  isEditing 
                    ? 'bg-amber-600 hover:bg-amber-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isEditing ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Kategori</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* TABEL DAFTAR KATEGORI & REKENING AKTIF */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Daftar Kategori &amp; Rekening Aktif ({filteredCategories.length} dari {categories.length})</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Daftar ini otomatis sinkron ke pilihan Kategori pada form Tambah/Edit Barang &amp; filter tabel inventaris.
                </p>
              </div>

              {/* Segmented Filter Jenis Aset */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 shrink-0 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setFilterJenis('Semua')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    filterJenis === 'Semua' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({categories.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterJenis('BHP')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    filterJenis === 'BHP' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-blue-700'
                  }`}
                >
                  BHP ({bhpCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterJenis('Belanja Modal')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    filterJenis === 'Belanja Modal' ? 'bg-purple-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-purple-700'
                  }`}
                >
                  Modal ({modalCount})
                </button>
              </div>
            </div>

            {/* Search Bar Dalam Modal */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode rekening (misal: 0024) atau nama uraian kategori..."
                className="w-full text-xs pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 placeholder:text-slate-400 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Table Container */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                      <th className="p-2.5 text-center w-12">No</th>
                      <th className="p-2.5 w-40">Kode Rekening</th>
                      <th className="p-2.5">Nama Kategori / Uraian Rekening</th>
                      <th className="p-2.5 w-28 text-center">Jenis</th>
                      <th className="p-2.5 w-32 text-center">Penggunaan</th>
                      <th className="p-2.5 text-center w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((cat, idx) => {
                        const usage = getCategoryUsage(cat);
                        const isBeingEdited = isEditing === cat.id;
                        const catJenis = cat.jenisDefault || (cat.kodeRekening?.startsWith('5.2') ? 'Belanja Modal' : 'BHP');

                        return (
                          <tr 
                            key={cat.id || idx} 
                            className={`transition-colors ${
                              isBeingEdited 
                                ? 'bg-amber-50/90 font-medium' 
                                : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="p-2.5 text-center text-slate-500 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-indigo-700 whitespace-nowrap">
                              <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-[11px]">
                                {cat.kodeRekening || '-'}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <div className="font-semibold text-slate-900 leading-snug">
                                {cat.nama || cat.namaRekening || '-'}
                              </div>
                              {cat.deskripsi && (
                                <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-md">
                                  {cat.deskripsi}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                catJenis === 'Belanja Modal'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {catJenis === 'Belanja Modal' ? (
                                  <>
                                    <Building2 className="w-2.5 h-2.5" />
                                    Modal
                                  </>
                                ) : (
                                  <>
                                    <Package className="w-2.5 h-2.5" />
                                    BHP
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              {usage.count > 0 ? (
                                <span 
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"
                                  title={`Digunakan oleh: ${usage.samples.join(', ')}`}
                                >
                                  <Boxes className="w-3 h-3 text-emerald-600" />
                                  {usage.count} barang
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">
                                  0 barang
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <button 
                                  type="button"
                                  onClick={() => handleEditClick(cat)}
                                  className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md font-bold text-[11px] transition-colors cursor-pointer"
                                  title="Edit Kategori & Rekening"
                                >
                                  Edit
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteClick(cat)}
                                  disabled={usage.count > 0}
                                  className={`px-2 py-1 rounded-md font-bold text-[11px] transition-colors ${
                                    usage.count > 0 
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                                      : 'bg-rose-100 hover:bg-rose-200 text-rose-800 cursor-pointer'
                                  }`}
                                  title={
                                    usage.count > 0 
                                      ? `Kategori tidak dapat dihapus karena digunakan oleh ${usage.count} barang di inventaris` 
                                      : 'Hapus Kategori'
                                  }
                                >
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                          {searchQuery 
                            ? `Tidak ditemukan kategori yang cocok dengan "${searchQuery}".` 
                            : 'Belum ada kategori yang terdaftar.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER MODAL */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Kategori yang sedang dipakai barang inventaris diproteksi otomatis dari penghapusan tidak sengaja.</span>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Selesai &amp; Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default MasterKategoriManager;
