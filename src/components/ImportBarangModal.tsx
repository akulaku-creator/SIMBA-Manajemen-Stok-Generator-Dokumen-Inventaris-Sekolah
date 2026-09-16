import { 
  AlertCircle, 
  Boxes, 
  CheckCircle2, 
  Coins, 
  Download, 
  FileSpreadsheet, 
  Package, 
  PackagePlus, 
  UploadCloud, 
  X 
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { Barang } from '../types';
import { generateBarangTemplate, parseExcelBarang } from '../utils/excelHelper';
import { formatRupiah } from '../utils/numberGenerator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  existingCount: number;
  onImport: (barangList: Barang[], mode: 'append' | 'replace') => void;
}

export const ImportBarangModal: React.FC<Props> = ({
  isOpen,
  onClose,
  existingCount,
  onImport
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Barang[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setErrors([]);
    setParsedData([]);

    try {
      const result = await parseExcelBarang(file, existingCount);
      setParsedData(result.data);
      setErrors(result.errors);
    } catch (err: any) {
      setErrors([err?.message || 'Gagal membaca berkas Excel. Pastikan format file .xlsx, .xls, atau .csv valid.']);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleConfirmImport = () => {
    if (parsedData.length === 0) return;
    onImport(parsedData, importMode);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedData([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Metrics for preview
  const totalStok = parsedData.reduce((sum, item) => sum + (item.stokSekarang || 0), 0);
  const totalNilai = parsedData.reduce((sum, item) => sum + ((item.stokSekarang || 0) * (item.hargaSatuan || 0)), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 ring-1 ring-slate-900/10 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Import Master Barang & Persediaan dari Excel</h3>
              <p className="text-[11px] text-slate-300">
                Unggah data inventaris barang, kode rekening belanja, satuan, harga satuan, dan saldo stok
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Template Download Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-950 text-xs">
            <div className="flex items-center gap-2.5">
              <Boxes className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-semibold text-emerald-900">Format Template Excel Persediaan Sekolah</span>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Dilengkapi contoh Kode Rekening BOS (ATK &amp; Kertas), NUSP, spesifikasi, satuan, dan saldo awal.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={generateBarangTemplate}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-emerald-100/70 text-emerald-700 font-semibold rounded-lg border border-emerald-300 shadow-2xs transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Template Excel
            </button>
          </div>

          {/* Upload Dropzone */}
          {!selectedFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                isDragging 
                  ? 'border-emerald-500 bg-emerald-50/50' 
                  : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-800">
                Pilih atau seret berkas Excel inventaris barang (.xlsx, .xls, .csv)
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Data akan otomatis dipetakan ke Master Barang dan terhubung ke Buku Persediaan BOS
              </p>
            </div>
          ) : (
            /* File Info Bar */
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="truncate">
                  <span className="font-semibold text-slate-800 block truncate">{selectedFile.name}</span>
                  <span className="text-[11px] text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {parsedData.length} barang persediaan terbaca
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-rose-600 hover:text-rose-700 hover:underline px-2 py-1 font-medium"
              >
                Ganti Berkas
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {isProcessing && (
            <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              Memproses dan mengurai data inventaris barang...
            </div>
          )}

          {/* Warnings & Errors */}
          {errors.length > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Catatan Pemeriksaan ({errors.length}):
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-700 max-h-24 overflow-y-auto">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parsed Preview Table & Statistics */}
          {parsedData.length > 0 && (
            <div className="space-y-3.5">
              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500 block">Total Item Barang</span>
                  <span className="text-base font-bold text-slate-900">{parsedData.length} Barang</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500 block">Total Kuantitas Fisik</span>
                  <span className="text-base font-bold text-blue-700">{totalStok.toLocaleString('id-ID')} unit</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500 block">Estimasi Nilai Total Persediaan</span>
                  <span className="text-base font-bold text-emerald-700">{formatRupiah(totalNilai)}</span>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-8 text-center">No</th>
                      <th className="p-2.5">Nama Barang &amp; Spek</th>
                      <th className="p-2.5 w-24 text-center">Jenis Aset</th>
                      <th className="p-2.5 w-24">NUSP</th>
                      <th className="p-2.5 w-36">Kode Rekening</th>
                      <th className="p-2.5 w-24">Kategori</th>
                      <th className="p-2.5 w-16 text-center">Satuan</th>
                      <th className="p-2.5 w-24 text-right">Harga (Rp)</th>
                      <th className="p-2.5 w-16 text-center">Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="p-2">
                          <div className="font-semibold text-slate-900">{b.namaBarang}</div>
                          {b.spesifikasi && (
                            <div className="text-[10px] text-slate-500 truncate max-w-xs">{b.spesifikasi}</div>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {b.jenisBarang === 'Belanja Modal' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                              Modal / Aset
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                              BHP
                            </span>
                          )}
                        </td>
                        <td className="p-2 font-mono text-[11px] text-blue-600">{b.nusp}</td>
                        <td className="p-2 font-mono text-[10px] text-slate-600">
                          <div>{b.kodeRekening}</div>
                          <div className="text-[9px] text-slate-400 truncate max-w-[140px]">{b.namaRekening}</div>
                        </td>
                        <td className="p-2">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-200 whitespace-nowrap">
                            {b.kategori}
                          </span>
                        </td>
                        <td className="p-2 text-center font-medium text-slate-700">{b.satuan}</td>
                        <td className="p-2 text-right font-mono text-slate-900">{formatRupiah(b.hargaSatuan)}</td>
                        <td className="p-2 text-center font-bold text-blue-700">{b.stokSekarang}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mode Selection */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                <span className="font-semibold text-slate-800 block">Metode Penggabungan Inventaris:</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    importMode === 'append' ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-500/20' : 'bg-white border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="barangImportMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block text-[11px]">Tambahkan ke Stok Saat Ini (Append)</span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                        {existingCount} barang yang sudah ada tetap tersimpan, {parsedData.length} barang baru ditambahkan.
                      </span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    importMode === 'replace' ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-500/20' : 'bg-white border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="barangImportMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-amber-600"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block text-[11px]">Ganti / Timpa Seluruh Master Barang</span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                        Menghapus data barang lama dan menggantikannya secara menyeluruh dengan data dari file Excel.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </button>

            <button
              type="button"
              disabled={parsedData.length === 0 || isProcessing}
              onClick={handleConfirmImport}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-xs transition-all active:scale-98"
            >
              <PackagePlus className="w-4 h-4" />
              Impor {parsedData.length > 0 ? `${parsedData.length} Barang Persediaan` : 'Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
