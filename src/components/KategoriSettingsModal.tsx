import { 
  Check, 
  FolderPlus, 
  Layers, 
  Pencil, 
  Plus, 
  RotateCcw, 
  Tag, 
  Trash2, 
  X 
} from 'lucide-react';
import React, { useState } from 'react';
import { DEFAULT_KATEGORI_LIST } from '../data/defaultData';
import { JenisBarang, KategoriBarangItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  kategoriList: KategoriBarangItem[];
  onSaveKategoriList: (newList: KategoriBarangItem[]) => void;
}

export const KategoriSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  kategoriList,
  onSaveKategoriList
}) => {
  const [items, setItems] = useState<KategoriBarangItem[]>(kategoriList);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    nama: string;
    prefixKode: string;
    jenisDefault: JenisBarang;
    deskripsi: string;
  }>({
    nama: '',
    prefixKode: '1.01.03.',
    jenisDefault: 'BHP',
    deskripsi: ''
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingId('NEW');
    setFormData({
      nama: '',
      prefixKode: '1.01.03.',
      jenisDefault: 'BHP',
      deskripsi: ''
    });
    setErrorMsg(null);
  };

  const handleStartEdit = (kat: KategoriBarangItem) => {
    setEditingId(kat.id);
    setFormData({
      nama: kat.nama,
      prefixKode: kat.prefixKode || '1.01.03.',
      jenisDefault: kat.jenisDefault || 'BHP',
      deskripsi: kat.deskripsi || ''
    });
    setErrorMsg(null);
  };

  const handleCancelForm = () => {
    setEditingId(null);
    setErrorMsg(null);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      setErrorMsg('Nama kategori tidak boleh kosong.');
      return;
    }

    // Check duplicate
    const exists = items.some(
      it => it.nama.trim().toLowerCase() === formData.nama.trim().toLowerCase() && it.id !== editingId
    );
    if (exists) {
      setErrorMsg('Nama kategori sudah ada dalam daftar.');
      return;
    }

    let updated: KategoriBarangItem[];
    if (editingId === 'NEW') {
      const newItem: KategoriBarangItem = {
        id: `kat-${Date.now()}`,
        nama: formData.nama.trim(),
        prefixKode: formData.prefixKode.trim(),
        jenisDefault: formData.jenisDefault,
        deskripsi: formData.deskripsi.trim()
      };
      updated = [...items, newItem];
    } else {
      updated = items.map(it => {
        if (it.id === editingId) {
          return {
            ...it,
            nama: formData.nama.trim(),
            prefixKode: formData.prefixKode.trim(),
            jenisDefault: formData.jenisDefault,
            deskripsi: formData.deskripsi.trim()
          };
        }
        return it;
      });
    }

    setItems(updated);
    onSaveKategoriList(updated);
    setEditingId(null);
    setErrorMsg(null);
  };

  const handleDelete = (id: string, nama: string) => {
    if (items.length <= 1) {
      alert('Minimal harus tersisa 1 kategori barang.');
      return;
    }
    if (confirm(`Yakin ingin menghapus kategori "${nama}"? Data barang yang sudah ada tidak akan terhapus namun label kategorinya tetap tersimpan.`)) {
      const updated = items.filter(it => it.id !== id);
      setItems(updated);
      onSaveKategoriList(updated);
      if (editingId === id) setEditingId(null);
    }
  };

  const handleResetToDefault = () => {
    if (confirm('Kembalikan daftar kategori barang ke standar dinas bawaan?')) {
      setItems(DEFAULT_KATEGORI_LIST);
      onSaveKategoriList(DEFAULT_KATEGORI_LIST);
      setEditingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 ring-1 ring-slate-900/10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 border border-blue-400/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Manajemen Kategori Barang &amp; Prefix Kode</h3>
              <p className="text-[11px] text-blue-200/80">
                Sesuaikan daftar kategori dan format kode barang untuk dropdown Master Barang
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Top action row */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700">
              Daftar Kategori Terdaftar ({items.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                title="Reset ke kategori bawaan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Standar
              </button>
              {editingId !== 'NEW' && (
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="inline-flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-lg font-semibold shadow-xs transition-all active:scale-98"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Kategori
                </button>
              )}
            </div>
          </div>

          {/* Form Add / Edit */}
          {editingId && (
            <form onSubmit={handleSaveForm} className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <FolderPlus className="w-4 h-4 text-blue-600" />
                  {editingId === 'NEW' ? 'Tambah Kategori Baru' : 'Edit Kategori Barang'}
                </span>
                <span className="text-[10px] text-blue-700 font-mono">
                  {editingId === 'NEW' ? 'Item Baru' : `ID: ${editingId}`}
                </span>
              </div>

              {errorMsg && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Kategori <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="Contoh: ATK / Kertas, Obat-obatan, Aset Lab"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prefix Kode Otomatis
                  </label>
                  <input
                    type="text"
                    value={formData.prefixKode}
                    onChange={(e) => setFormData({ ...formData, prefixKode: e.target.value })}
                    placeholder="Contoh: 1.01.03.01."
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500">Awalan kode saat auto-generate kode barang</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Aset Default
                  </label>
                  <div className="flex gap-2">
                    <label className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                      formData.jenisDefault === 'BHP'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="jenisDefault"
                        value="BHP"
                        checked={formData.jenisDefault === 'BHP'}
                        onChange={() => setFormData({ ...formData, jenisDefault: 'BHP' })}
                        className="sr-only"
                      />
                      <span>BHP (Habis Pakai)</span>
                    </label>

                    <label className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                      formData.jenisDefault === 'Belanja Modal'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="jenisDefault"
                        value="Belanja Modal"
                        checked={formData.jenisDefault === 'Belanja Modal'}
                        onChange={() => setFormData({ ...formData, jenisDefault: 'Belanja Modal' })}
                        className="sr-only"
                      />
                      <span>Belanja Modal (Aset)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deskripsi / Catatan Kelompok
                  </label>
                  <input
                    type="text"
                    value={formData.deskripsi}
                    onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                    placeholder="Contoh: Kertas HVS, pulpen, map, spidol"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-blue-200/60">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  Simpan Kategori
                </button>
              </div>
            </form>
          )}

          {/* Table List */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3 w-8 text-center">No</th>
                  <th className="p-3">Nama Kategori</th>
                  <th className="p-3 w-28">Jenis Default</th>
                  <th className="p-3 w-32 font-mono">Prefix Kode</th>
                  <th className="p-3">Deskripsi / Contoh</th>
                  <th className="p-3 w-20 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((kat, idx) => (
                  <tr key={kat.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-blue-600" />
                        {kat.nama}
                      </div>
                    </td>
                    <td className="p-3">
                      {kat.jenisDefault === 'Belanja Modal' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          Modal / Aset
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          BHP
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-600">
                      {kat.prefixKode || '-'}
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {kat.deskripsi || '-'}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(kat)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit kategori"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(kat.id, kat.nama)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus kategori"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Kategori yang diubah akan langsung muncul pada pilihan dropdown Master Barang.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-xs transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
