import { 
  AlertCircle, 
  Check, 
  CheckCircle2, 
  FileSpreadsheet, 
  RefreshCw, 
  Upload, 
  X 
} from 'lucide-react';
import React, { useState } from 'react';
import { Barang } from '../types';
import { parseBOSExcelFile, ParsedBOSExcelResult } from '../utils/excelBosGenerator';
import { formatRupiah } from '../utils/numberGenerator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (importedBarang: Barang[], mode: 'append' | 'replace') => void;
}

export const ExcelImportBOSModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedBOSExcelResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrorMsg(null);
    setIsParsing(true);

    try {
      const result = await parseBOSExcelFile(selectedFile);
      if (result.barangList.length === 0) {
        setErrorMsg('Tidak ditemukan baris barang yang valid pada sheet "BOS". Pastikan format kolom sesuai standar dinas.');
      } else {
        setParsedResult(result);
      }
    } catch (err: any) {
      console.error('Error parsing excel:', err);
      setErrorMsg(err.message || 'Gagal membaca file Excel. Pastikan file berformat .xlsx yang valid.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedResult || parsedResult.barangList.length === 0) return;
    onImportComplete(parsedResult.barangList, importMode);
    onClose();
    // Reset state
    setFile(null);
    setParsedResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Impor Data Inventaris dari Excel BOS (.xlsx)</h2>
              <p className="text-xs text-slate-400">
                Parsing otomatis Sheet &quot;BOS&quot;: Kode Rekening, Nama Barang, Satuan, Harga, dan Saldo Awal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* File Upload Box */}
          <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center bg-slate-50/60 transition-colors">
            <input
              type="file"
              id="file-upload-excel-bos"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="file-upload-excel-bos"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-full">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                {file ? file.name : 'Klik untuk memilih file Excel (.xlsx) atau seret file ke sini'}
              </p>
              <p className="text-[11px] text-slate-500">
                Mendukung template standar Dinas (Sheet &quot;BOS&quot; dengan kolom Kode Rekening, Saldo Awal, &amp; Mutasi)
              </p>
            </label>
          </div>

          {/* Loading Indicator */}
          {isParsing && (
            <div className="flex items-center justify-center gap-2 text-xs text-blue-600 font-semibold py-4">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Memproses dan memparsing file Excel...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold">Gagal Mengimpor File</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Parsed Result Preview */}
          {parsedResult && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-[11px] font-semibold text-emerald-700">Total Barang Ditemukan</p>
                  <p className="text-lg font-extrabold text-emerald-900">{parsedResult.barangList.length} Item</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-[11px] font-semibold text-blue-700">Tahun Anggaran Terdeteksi</p>
                  <p className="text-lg font-extrabold text-blue-900">{parsedResult.detectedYear}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[11px] font-semibold text-slate-700">Instansi / Sekolah</p>
                  <p className="text-xs font-bold text-slate-900 truncate" title={parsedResult.detectedSchool}>
                    {parsedResult.detectedSchool}
                  </p>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="text-xs font-bold text-slate-800">Pilih Mode Impor ke Master Barang:</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span><strong>Tambahkan (Append)</strong> — Gabungkan dengan barang yang sudah ada</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-rose-700 font-semibold">
                      <strong>Ganti Seluruhnya (Replace)</strong> — Timpa seluruh master barang saat ini
                    </span>
                  </label>
                </div>
              </div>

              {/* Preview Table */}
              <div>
                <p className="text-xs font-bold text-slate-700 mb-2">
                  Pratinjau Data yang Siap Disinkronkan (Menampilkan 10 item pertama):
                </p>
                <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                      <tr>
                        <th className="px-3 py-2">No</th>
                        <th className="px-3 py-2">Kode Rekening</th>
                        <th className="px-3 py-2">Nama Barang</th>
                        <th className="px-3 py-2">Satuan</th>
                        <th className="px-3 py-2 text-right">Harga Satuan</th>
                        <th className="px-3 py-2 text-right">Saldo Awal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedResult.barangList.slice(0, 10).map((b, idx) => (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-mono text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-1.5 font-mono text-blue-700">{b.kodeRekening}</td>
                          <td className="px-3 py-1.5 font-medium text-slate-900">{b.namaBarang}</td>
                          <td className="px-3 py-1.5 text-slate-600">{b.satuan}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{formatRupiah(b.hargaSatuan)}</td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold text-emerald-700">{b.stokAwal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg"
          >
            Batal
          </button>

          {parsedResult && parsedResult.barangList.length > 0 && (
            <button
              onClick={handleConfirmImport}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 active:scale-98 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Simpan &amp; Sinkronkan {parsedResult.barangList.length} Barang ke Sistem</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
