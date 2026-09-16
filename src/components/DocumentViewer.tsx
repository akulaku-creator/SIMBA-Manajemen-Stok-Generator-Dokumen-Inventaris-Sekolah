import { Printer } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { 
  Barang, 
  DocumentType, 
  KartuBarangPeriodFilter, 
  KartuBarangPeriodType,
  KopSuratConfig, 
  PaperSize, 
  Pejabat, 
  TransaksiPenerimaan, 
  TransaksiPengeluaran 
} from '../types';
import { A4Container } from './A4Container';
import { CentralPrintBar } from './CentralPrintBar';
import { DocumentDetailPanel } from './DocumentDetailPanel';
import { ALL_DOCUMENTS_CATALOG, DocumentListView } from './DocumentListView';
import { DocBAST } from './documents/DocBAST';
import { DocBukuPengeluaran } from './documents/DocBukuPengeluaran';
import { DocBukuPenerimaan } from './documents/DocBukuPenerimaan';
import { DocBukuRekap } from './documents/DocBukuRekap';
import { DocKartuBarang } from './documents/DocKartuBarang';
import { DocKartuPersediaan } from './documents/DocKartuPersediaan';
import { DocNPB } from './documents/DocNPB';
import { DocSPB } from './documents/DocSPB';
import { DocSPPB } from './documents/DocSPPB';
import { DocStockOpname } from './documents/DocStockOpname';
import { DocumentBundle } from './documents/DocumentBundle';
import { DocMutasiBOS } from './documents/DocMutasiBOS';
import { DocRekapKodering } from './documents/DocRekapKodering';
import { ExcelImportBOSModal } from './ExcelImportBOSModal';
import { downloadBOSExcelFile } from '../utils/excelBosGenerator';
import { MONTHS_ID } from '../utils/numberGenerator';

interface Props {
  transaksiList: TransaksiPengeluaran[];
  transaksiPenerimaanList: TransaksiPenerimaan[];
  masterBarang: Barang[];
  pejabatList: Pejabat[];
  kopConfig: KopSuratConfig;
  selectedTransaksiId: string;
  onSelectTransaksi: (id: string) => void;
  onOpenKopSettings?: () => void;
  initialDocType?: DocumentType;
  initialBarangId?: string;
  onImportBarang?: (items: Barang[], mode: 'append' | 'replace') => void;
}

export const DocumentViewer: React.FC<Props> = ({
  transaksiList,
  transaksiPenerimaanList,
  masterBarang,
  pejabatList,
  kopConfig,
  selectedTransaksiId,
  onSelectTransaksi,
  onOpenKopSettings,
  initialDocType,
  initialBarangId,
  onImportBarang
}) => {
  const [docType, setDocType] = useState<DocumentType>(initialDocType || 'spb');
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [minRows, setMinRows] = useState<number>(14);
  const [zoom, setZoom] = useState<number>(100);
  const [copies, setCopies] = useState<number>(1);
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'preview'>('split');

  // Month & Year filter for recap & stock opname
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // September (0-indexed = 8)
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Kartu Barang specific states
  const [selectedBarangId, setSelectedBarangId] = useState<string>(initialBarangId || masterBarang[0]?.id || '');
  const [isBatchPrintAll, setIsBatchPrintAll] = useState<boolean>(false);
  const [kartuPeriodFilter, setKartuPeriodFilter] = useState<KartuBarangPeriodFilter>({
    type: 'bulan',
    year: 2026,
    month: 8, // September
    triwulan: 3,
    semester: 2
  });

  // Excel BOS Modal state
  const [isImportBOSModalOpen, setIsImportBOSModalOpen] = useState<boolean>(false);
  const [isExportingBOS, setIsExportingBOS] = useState<boolean>(false);

  useEffect(() => {
    if (initialDocType) {
      setDocType(initialDocType);
    }
  }, [initialDocType]);

  useEffect(() => {
    if (initialBarangId) {
      setSelectedBarangId(initialBarangId);
    }
  }, [initialBarangId]);

  const activeTransaksi = transaksiList.find(t => t.id === selectedTransaksiId) || transaksiList[0];
  const activeBarang = masterBarang.find(b => b.id === selectedBarangId) || masterBarang[0];

  const isLandscape = docType === 'buku_penerimaan' || docType === 'buku_pengeluaran' || docType === 'buku_rekap' || docType === 'kartu_persediaan' || docType === 'mutasi_bos';
  const isBOSSheet = docType === 'mutasi_bos';

  const docConfig = ALL_DOCUMENTS_CATALOG.find(d => d.id === docType) || ALL_DOCUMENTS_CATALOG[0];
  const activePeriodInfo = selectedMonth === -1 
    ? `Akumulasi Penuh Tahun ${selectedYear}`
    : `${MONTHS_ID[selectedMonth]} ${selectedYear}`;

  const handleExportFullBOSExcel = async () => {
    try {
      setIsExportingBOS(true);
      await downloadBOSExcelFile(
        masterBarang,
        transaksiList,
        transaksiPenerimaanList,
        kopConfig,
        pejabatList,
        selectedYear,
        12
      );
    } catch (err) {
      console.error('Failed to export Excel BOS:', err);
      alert('Gagal mengekspor file Excel BOS.');
    } finally {
      setIsExportingBOS(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full flex flex-col items-center bg-slate-50/50 min-h-screen">
      {/* Dynamic Print CSS for active Paper Size & Orientation (Zero Margin @page Reset) */}
      <style>{`
        @media print {
          @page {
            size: ${
              isLandscape
                ? paperSize === 'A4' ? 'A4 landscape' : '330mm 215mm landscape'
                : paperSize === 'A4' ? 'A4 portrait' : '215mm 330mm portrait'
            };
            margin: 0 !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: #ffffff !important;
            width: 100% !important;
            height: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Menu Cetak Terpusat: Google Workspace Style, Sticky at Top */}
      <CentralPrintBar
        docTitle={docConfig.title}
        docCode={docConfig.code}
        docCategoryLabel={
          docConfig.category === 'operasional' ? 'Dokumen Operasional' :
          docConfig.category === 'laporan' ? 'Buku Mutasi Berkala' :
          docConfig.category === 'kartu' ? 'Kartu Inventaris & Stock Opname' :
          'Mutasi BHP'
        }
        isLandscape={isLandscape}
        paperSize={paperSize}
        onSelectPaperSize={setPaperSize}
        minRows={minRows}
        onSelectMinRows={setMinRows}
        copies={copies}
        onSelectCopies={setCopies}
        zoom={zoom}
        onZoomChange={setZoom}
        onResetZoom={() => setZoom(100)}
        onTriggerPrint={handlePrint}
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview(!showPreview)}
        activeViewMode={viewMode}
        onChangeViewMode={setViewMode}
        onOpenKopSettings={onOpenKopSettings}
        onExportExcel={handleExportFullBOSExcel}
        isExportingExcel={isExportingBOS}
        canExportExcel={isBOSSheet}
      />

      {/* Area Kelola Dokumen: Daftar Dokumen & Detail Dokumen */}
      {(viewMode === 'split' || viewMode === 'list') && (
        <div className="no-print w-full max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
            {/* Kolom Kiri: Daftar Dokumen yang Jelas (Search, Filter, Tanpa Tombol Cetak/Preview Individual) */}
            <div className="lg:col-span-7">
              <DocumentListView
                selectedDocType={docType}
                onSelectDocType={(type) => {
                  setDocType(type);
                }}
                activeTransactionInfo={activeTransaksi ? {
                  nomorUrut: activeTransaksi.nomorUrut,
                  unitPemohon: activeTransaksi.unitPemohon,
                  tanggalSurat: activeTransaksi.tanggalSurat,
                  itemsCount: activeTransaksi.items.length
                } : undefined}
                activePeriodInfo={activePeriodInfo}
              />
            </div>

            {/* Kolom Kanan: Panel Detail Dokumen */}
            <div className="lg:col-span-5">
              <DocumentDetailPanel
                selectedDocType={docType}
                transaksiList={transaksiList}
                selectedTransaksiId={selectedTransaksiId}
                onSelectTransaksi={onSelectTransaksi}
                masterBarang={masterBarang}
                selectedBarangId={selectedBarangId}
                onSelectBarang={setSelectedBarangId}
                isBatchPrintAll={isBatchPrintAll}
                onToggleBatchPrintAll={setIsBatchPrintAll}
                kartuPeriodFilter={kartuPeriodFilter}
                onUpdateKartuPeriodFilter={setKartuPeriodFilter}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
                selectedYear={selectedYear}
                onSelectYear={setSelectedYear}
                pejabatList={pejabatList}
                transaksiPenerimaanList={transaksiPenerimaanList}
                onExportExcelBOS={handleExportFullBOSExcel}
                isExportingBOS={isExportingBOS}
                onFocusPreview={() => {
                  setShowPreview(true);
                  setTimeout(() => {
                    document.getElementById('preview-canvas-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Screen Canvas Area (1:1 WYSIWYG Print Preview) */}
      {showPreview && (viewMode === 'split' || viewMode === 'preview') && (
        <div 
          id="preview-canvas-section"
          className="w-full bg-slate-200/70 border-t border-slate-300/80 min-h-screen py-8 px-4 flex flex-col items-center overflow-x-auto print:p-0 print:m-0 print:bg-white print:border-none"
        >
          {/* Preview Canvas Header Label (Hidden on Print) */}
          <div className="no-print mb-4 flex items-center justify-between gap-3 w-full max-w-4xl px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pratinjau Fisik Kertas (1:1 WYSIWYG)
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                • Margin Baku: 10mm / 15mm • Format: {paperSize} {isLandscape ? 'Landscape' : 'Portrait'}
              </span>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Cetak Sekarang (Ctrl+P)</span>
            </button>
          </div>

          <div 
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
            className="transition-transform duration-150 print:transform-none"
          >
          {/* Bundle Dokumen Operasional: Renders 4 separate A4Container sheets with page breaks */}
          {docType === 'bundle' && activeTransaksi && (
            <DocumentBundle
              transaksi={activeTransaksi}
              kopConfig={kopConfig}
              pejabatList={pejabatList}
              minRows={minRows}
              paperSize={paperSize}
            />
          )}

          {/* Dynamic Paper Container based on Orientation & Size for Single Documents */}
          {docType !== 'bundle' && !((docType === 'kartu_barang' || docType === 'kartu_persediaan') && isBatchPrintAll) && !isBOSSheet && (
            <A4Container
              paperSize={paperSize}
              orientation={isLandscape ? 'landscape' : 'portrait'}
            >
              {docType === 'npb' && activeTransaksi && (
                <DocNPB
                  transaksi={activeTransaksi}
                  kopConfig={kopConfig}
                  pejabatList={pejabatList}
                  minRows={minRows}
                />
              )}

              {docType === 'spb' && activeTransaksi && (
                <DocSPB
                  transaksi={activeTransaksi}
                  kopConfig={kopConfig}
                  pejabatList={pejabatList}
                  minRows={minRows}
                />
              )}

              {docType === 'sppb' && activeTransaksi && (
                <DocSPPB
                  transaksi={activeTransaksi}
                  kopConfig={kopConfig}
                  pejabatList={pejabatList}
                  minRows={minRows}
                />
              )}

              {docType === 'bast' && activeTransaksi && (
                <DocBAST
                  transaksi={activeTransaksi}
                  kopConfig={kopConfig}
                  pejabatList={pejabatList}
                  minRows={minRows}
                />
              )}

              {docType === 'bast_stock_opname' && (
                <DocStockOpname
                  masterBarang={masterBarang}
                  transaksiPenerimaanList={transaksiPenerimaanList}
                  transaksiPengeluaranList={transaksiList}
                  kopConfig={kopConfig}
                  pejabatList={pejabatList}
                  selectedMonth={selectedMonth === -1 ? 11 : selectedMonth}
                  selectedYear={selectedYear}
                />
              )}

              {docType === 'buku_penerimaan' && (
                <DocBukuPenerimaan
                  transaksiPenerimaanList={transaksiPenerimaanList}
                  kopConfig={kopConfig}
                  pejabatList={pejabatList}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  minRows={minRows}
                />
              )}

              {docType === 'buku_pengeluaran' && (
                <DocBukuPengeluaran
                  transaksiPengeluaranList={transaksiList}
                  kopConfig={kopConfig}
                  pejabatList={pejabatList}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  minRows={minRows}
                />
              )}

              {docType === 'buku_rekap' && (
                <DocBukuRekap
                  transaksiPengeluaranList={transaksiList}
                  transaksiPenerimaanList={transaksiPenerimaanList}
                  masterBarang={masterBarang}
                  kopConfig={kopConfig}
                  pejabatList={pejabatList}
                  minRows={minRows}
                />
              )}

              {docType === 'kartu_barang' && !isBatchPrintAll && activeBarang && (
                <DocKartuBarang
                  barang={activeBarang}
                  transaksiPenerimaanList={transaksiPenerimaanList}
                  transaksiPengeluaranList={transaksiList}
                  kopConfig={kopConfig}
                  pejabatList={pejabatList}
                  periodFilter={kartuPeriodFilter}
                  minRows={minRows}
                  isLast={true}
                />
              )}

              {docType === 'kartu_persediaan' && !isBatchPrintAll && activeBarang && (
                <DocKartuPersediaan
                  barang={activeBarang}
                  transaksiPenerimaanList={transaksiPenerimaanList}
                  transaksiPengeluaranList={transaksiList}
                  kopConfig={kopConfig}
                  pejabatList={pejabatList}
                  periodFilter={kartuPeriodFilter}
                  minRows={minRows}
                  isLast={true}
                />
              )}
            </A4Container>
          )}

        {/* BOS Sheet: Mutasi 12 Bulan Landscape Grid */}
        {docType === 'mutasi_bos' && (
          <DocMutasiBOS
            masterBarang={masterBarang}
            transaksiPengeluaranList={transaksiList}
            transaksiPenerimaanList={transaksiPenerimaanList}
            kopConfig={kopConfig}
            pejabatList={pejabatList}
            targetYear={selectedYear}
            onOpenImportModal={() => setIsImportBOSModalOpen(true)}
          />
        )}

        {/* Batch Print All Cards (Lampiran 12): Individual A4 sheets separated by page breaks */}
        {docType === 'kartu_barang' && isBatchPrintAll && (
          <div className="flex flex-col gap-10 print:gap-0 print:block">
            {masterBarang.map((barangItem, bIdx) => (
              <A4Container 
                key={barangItem.id} 
                paperSize={paperSize}
                orientation="landscape"
                breakAfter={bIdx < masterBarang.length - 1}
              >
                <DocKartuBarang
                  barang={barangItem}
                  transaksiPenerimaanList={transaksiPenerimaanList}
                  transaksiPengeluaranList={transaksiList}
                  kopConfig={kopConfig}
                  pejabatList={pejabatList}
                  periodFilter={kartuPeriodFilter}
                  minRows={minRows}
                  isLast={bIdx === masterBarang.length - 1}
                />
              </A4Container>
            ))}
          </div>
        )}

        {/* Batch Print All Kartu Persediaan (Lampiran 13): Individual Landscape sheets separated by page breaks */}
        {docType === 'kartu_persediaan' && isBatchPrintAll && (
          <div className="flex flex-col gap-10 print:gap-0 print:block">
            {masterBarang.map((barangItem, bIdx) => (
              <A4Container 
                key={barangItem.id} 
                paperSize={paperSize}
                orientation="landscape"
                breakAfter={bIdx < masterBarang.length - 1}
              >
                <DocKartuPersediaan
                  barang={barangItem}
                  transaksiPenerimaanList={transaksiPenerimaanList}
                  transaksiPengeluaranList={transaksiList}
                  kopConfig={kopConfig}
                  pejabatList={pejabatList}
                  periodFilter={kartuPeriodFilter}
                  minRows={minRows}
                  isLast={bIdx === masterBarang.length - 1}
                />
              </A4Container>
            ))}
          </div>
        )}
        </div>
      </div>
      )}

      {/* Excel BOS Import Modal */}
      <ExcelImportBOSModal
        isOpen={isImportBOSModalOpen}
        onClose={() => setIsImportBOSModalOpen(false)}
        onImportComplete={(imported, mode) => {
          if (onImportBarang) {
            onImportBarang(imported, mode);
          }
        }}
      />
    </div>
  );
};
