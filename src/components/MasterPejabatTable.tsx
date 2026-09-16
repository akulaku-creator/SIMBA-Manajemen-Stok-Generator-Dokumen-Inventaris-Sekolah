import { Edit2, FileSpreadsheet, Plus, Trash2, UserCheck, Users, X } from 'lucide-react';
import React, { useState } from 'react';
import { Pejabat } from '../types';
import { ImportPejabatModal } from './ImportPejabatModal';

interface Props {
  pejabatList: Pejabat[];
  onAddPejabat: (pejabat: Pejabat) => void;
  onUpdatePejabat: (pejabat: Pejabat) => void;
  onDeletePejabat: (id: string) => void;
  onImportPejabat?: (pejabatList: Pejabat[], mode: 'append' | 'replace') => void;
}

export const MasterPejabatTable: React.FC<Props> = ({
  pejabatList,
  onAddPejabat,
  onUpdatePejabat,
  onDeletePejabat,
  onImportPejabat
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Pejabat>>({
    nama: '',
    nip: '',
    pangkatGolongan: '',
    jabatan: '',
    unitKerja: ''
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      nama: '',
      nip: '',
      pangkatGolongan: 'Penata Muda / III a',
      jabatan: '',
      unitKerja: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pejabat: Pejabat) => {
    setEditingId(pejabat.id);
    setFormData({ ...pejabat });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.jabatan) return;

    if (editingId) {
      onUpdatePejabat({
        ...(formData as Pejabat),
        id: editingId
      });
    } else {
      const newPejabat: Pejabat = {
        id: `pejabat-${Date.now()}`,
        nama: formData.nama || '',
        nip: formData.nip || '-',
        pangkatGolongan: formData.pangkatGolongan || '-',
        jabatan: formData.jabatan || '',
        unitKerja: formData.unitKerja || ''
      };
      onAddPejabat(newPejabat);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Master Pejabat &amp; Penandatangan Dokumen
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Data NIP, Nama Lengkap dengan Gelar, Pangkat/Golongan, dan Jabatan otomatis mengisi blok tanda tangan pada NPB, SPB, SPPB, dan BAST.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2.5 rounded-lg shadow-xs transition-all active:scale-98"
            title="Import daftar nama pejabat & tanda tangan dari berkas Excel (.xlsx, .xls, .csv)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import dari Excel
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition-all active:scale-98"
          >
            <Plus className="w-4 h-4" />
            Tambah Pejabat / Staf
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs ring-1 ring-slate-900/5">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5 w-10 text-center">No</th>
                <th className="p-3.5">Nama Pejabat &amp; Gelar</th>
                <th className="p-3.5 w-48">NIP</th>
                <th className="p-3.5 w-48">Pangkat / Golongan</th>
                <th className="p-3.5">Jabatan Kedinasan</th>
                <th className="p-3.5 w-40">Unit Kerja</th>
                <th className="p-3.5 w-20 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pejabatList.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[11px] font-bold border border-blue-100">
                        {p.nama.charAt(0)}
                      </div>
                      {p.nama}
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-slate-700">{p.nip}</td>
                  <td className="p-3.5 text-slate-700">{p.pangkatGolongan}</td>
                  <td className="p-3.5">
                    <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded text-[11px] border border-slate-200">
                      {p.jabatan}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-600">{p.unitKerja || '-'}</td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Pejabat"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeletePejabat(p.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Pejabat"
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

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                {editingId ? 'Edit Pejabat Penandatangan' : 'Tambah Pejabat Baru'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!editingId && (
              <div className="mx-5 mt-4 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-blue-900">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[11px]">Punya file Excel daftar guru / pejabat?</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsImportModalOpen(true);
                  }}
                  className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline shrink-0"
                >
                  Import Excel &rarr;
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap beserta Gelar
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: Drs. H. Bambang Suhartono, M.Pd."
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  N I P (Nomor Induk Pegawai)
                </label>
                <input
                  type="text"
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  placeholder="Contoh: 19680512 199303 1 005"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pangkat / Golongan Ruang
                </label>
                <input
                  type="text"
                  value={formData.pangkatGolongan}
                  onChange={(e) => setFormData({ ...formData, pangkatGolongan: e.target.value })}
                  placeholder="Contoh: Pembina Utama Muda / IV c, Penata / III c"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jabatan Kedinasan
                </label>
                <input
                  type="text"
                  value={formData.jabatan}
                  onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                  placeholder="Kepala Sekolah / Wakasek Sarana / Pengurus Barang Pembantu..."
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit Kerja / Bidang
                </label>
                <input
                  type="text"
                  value={formData.unitKerja}
                  onChange={(e) => setFormData({ ...formData, unitKerja: e.target.value })}
                  placeholder="Contoh: Manajemen Sarana / Lab Komputer"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-all active:scale-98"
                >
                  Simpan Pejabat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import Excel Pejabat */}
      <ImportPejabatModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingCount={pejabatList.length}
        onImport={(imported, mode) => {
          if (onImportPejabat) {
            onImportPejabat(imported, mode);
          } else {
            // Fallback: add sequentially
            imported.forEach(p => onAddPejabat(p));
          }
        }}
      />
    </div>
  );
};
