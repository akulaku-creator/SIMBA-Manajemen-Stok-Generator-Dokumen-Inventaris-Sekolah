import ExcelJS from 'exceljs';
import { Barang, KopSuratConfig, Pejabat, TransaksiPenerimaan, TransaksiPengeluaran } from '../types';
import { calculateMutasiBOSData, NAMA_BULAN } from './mutasiBosEngine';

/**
 * Utility helper: convert 1-based column index to Excel column letter (1 -> A, 27 -> AA)
 */
export function getExcelColLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};

const MEDIUM_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'medium', color: { argb: 'FF475569' } },
  left: { style: 'medium', color: { argb: 'FF475569' } },
  bottom: { style: 'medium', color: { argb: 'FF475569' } },
  right: { style: 'medium', color: { argb: 'FF475569' } },
};

/**
 * Generate standard Dinas-compatible Excel workbook containing:
 * - Sheet "BOS" (Multi-month landscape mutation table with formulas)
 * - Sheet "REKAP PER KODERING" (Monthly expenditure summary with formulas)
 */
export async function generateBOSExcelWorkbook(
  masterBarang: Barang[],
  transaksiPengeluaranList: TransaksiPengeluaran[],
  transaksiPenerimaanList: TransaksiPenerimaan[],
  kopConfig: KopSuratConfig,
  pejabatList: Pejabat[],
  targetYear: number = 2026,
  monthsCount: number = 12 // default: all 12 months (Jan - Dec)
): Promise<ExcelJS.Workbook> {
  const calculation = calculateMutasiBOSData(
    masterBarang,
    transaksiPengeluaranList,
    transaksiPenerimaanList,
    kopConfig,
    targetYear
  );

  const schoolName = calculation.namaSekolah;
  const numMonths = Math.min(12, Math.max(1, monthsCount));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SIMBA - Sistem Manajemen Mutasi Barang Sekolah';
  workbook.created = new Date();

  // Find Pejabat for Signatures
  const kepsek = pejabatList.find(p => p.id === 'pejabat-kepsek') || pejabatList[0] || {
    nama: 'Drs. H. Bambang Suhartono, M.Pd.',
    nip: '19680512 199303 1 005',
    pangkatGolongan: 'Pembina Utama Muda / IV c',
    jabatan: 'Kepala Sekolah'
  };

  const pengurusBarang = pejabatList.find(p => p.id === 'pejabat-pengurus-barang') || pejabatList[2] || {
    nama: 'Rina Kartikasari, S.AP.',
    nip: '19890820 201402 2 003',
    pangkatGolongan: 'Penata Muda / III a',
    jabatan: 'Pengurus Barang Pembantu'
  };

  // ==========================================
  // SHEET 1: "BOS"
  // ==========================================
  const wsBOS = workbook.addWorksheet('BOS', {
    views: [{ state: 'frozen', xSplit: 4, ySplit: 6 }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  });

  // Calculate total columns
  // Fixed: Col 1(NO), 2(PEMEGANG), 3(KODERING), 4(NAMA), 5-8(SALDO AWAL: Vol, Sat, Harga, Jumlah) = 8 cols
  // Per month: 12 cols (Masuk 4, Keluar 4, Saldo Akhir 4)
  // Last: KETERANGAN = 1 col
  const totalColsBOS = 8 + (numMonths * 12) + 1;
  const lastColLetterBOS = getExcelColLetter(totalColsBOS);

  // Row 1: Title
  wsBOS.mergeCells(`A1:${lastColLetterBOS}1`);
  const titleCellBOS = wsBOS.getCell('A1');
  titleCellBOS.value = `DAFTAR MUTASI BARANG HABIS PAKAI BOS TAHUN ${targetYear}`;
  titleCellBOS.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0F172A' } };
  titleCellBOS.alignment = { horizontal: 'center', vertical: 'middle' };
  wsBOS.getRow(1).height = 28;

  // Row 2: School Name
  wsBOS.mergeCells(`A2:${lastColLetterBOS}2`);
  const schoolCellBOS = wsBOS.getCell('A2');
  schoolCellBOS.value = `NAMA INSTANSI: ${schoolName.toUpperCase()}`;
  schoolCellBOS.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF334155' } };
  schoolCellBOS.alignment = { horizontal: 'center', vertical: 'middle' };
  wsBOS.getRow(2).height = 20;

  // Row 3: Blank
  wsBOS.getRow(3).height = 10;

  // Header styling
  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' } // Slate 800
  };
  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Arial',
    size: 9,
    bold: true,
    color: { argb: 'FFFFFFFF' }
  };
  const subHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF334155' } // Slate 700
  };

  // Build Multi-Level Table Headers (Rows 4, 5, 6)
  wsBOS.getRow(4).height = 24;
  wsBOS.getRow(5).height = 22;
  wsBOS.getRow(6).height = 24;

  // Col A: NO (merge A4:A6)
  wsBOS.mergeCells('A4:A6');
  const cellA4 = wsBOS.getCell('A4');
  cellA4.value = 'NO';
  cellA4.fill = headerFill;
  cellA4.font = headerFont;
  cellA4.alignment = { horizontal: 'center', vertical: 'middle' };
  wsBOS.getColumn(1).width = 6;

  // Col B: PEMEGANG BARANG (merge B4:B6)
  wsBOS.mergeCells('B4:B6');
  const cellB4 = wsBOS.getCell('B4');
  cellB4.value = 'PEMEGANG BARANG';
  cellB4.fill = headerFill;
  cellB4.font = headerFont;
  cellB4.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  wsBOS.getColumn(2).width = 24;

  // Col C-D: BARANG PERSEDIAAN (merge C4:D4)
  wsBOS.mergeCells('C4:D4');
  const cellC4 = wsBOS.getCell('C4');
  cellC4.value = 'BARANG PERSEDIAAN';
  cellC4.fill = headerFill;
  cellC4.font = headerFont;
  cellC4.alignment = { horizontal: 'center', vertical: 'middle' };

  // Col C: KODE REKENING (merge C5:C6)
  wsBOS.mergeCells('C5:C6');
  const cellC5 = wsBOS.getCell('C5');
  cellC5.value = 'KODE REKENING';
  cellC5.fill = subHeaderFill;
  cellC5.font = headerFont;
  cellC5.alignment = { horizontal: 'center', vertical: 'middle' };
  wsBOS.getColumn(3).width = 18;

  // Col D: NAMA BARANG (merge D5:D6)
  wsBOS.mergeCells('D5:D6');
  const cellD5 = wsBOS.getCell('D5');
  cellD5.value = 'NAMA BARANG';
  cellD5.fill = subHeaderFill;
  cellD5.font = headerFont;
  cellD5.alignment = { horizontal: 'center', vertical: 'middle' };
  wsBOS.getColumn(4).width = 28;

  // Col E-H: SALDO AWAL JANUARI (merge E4:H5)
  wsBOS.mergeCells('E4:H5');
  const cellE4 = wsBOS.getCell('E4');
  cellE4.value = `SALDO AWAL JANUARI ${targetYear}`;
  cellE4.fill = headerFill;
  cellE4.font = headerFont;
  cellE4.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 6 for Saldo Awal columns
  const saldoAwalHeaders = ['VOLUME', 'SATUAN', 'HARGA SATUAN', 'JUMLAH (Rp)'];
  const saldoAwalWidths = [10, 10, 15, 18];
  for (let i = 0; i < 4; i++) {
    const colNum = 5 + i;
    const cell = wsBOS.getCell(6, colNum);
    cell.value = saldoAwalHeaders[i];
    cell.fill = subHeaderFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    wsBOS.getColumn(colNum).width = saldoAwalWidths[i];
  }

  // Monthly Columns (Januari s.d. Desember)
  for (let m = 0; m < numMonths; m++) {
    const monthStartCol = 9 + (m * 12);
    const monthEndCol = monthStartCol + 11;
    const startLetter = getExcelColLetter(monthStartCol);
    const endLetter = getExcelColLetter(monthEndCol);

    // Row 4: Month Title Merged
    wsBOS.mergeCells(`${startLetter}4:${endLetter}4`);
    const monthHeaderCell = wsBOS.getCell(`${startLetter}4`);
    monthHeaderCell.value = `MUTASI ${NAMA_BULAN[m].toUpperCase()} ${targetYear}`;
    monthHeaderCell.fill = headerFill;
    monthHeaderCell.font = headerFont;
    monthHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 5: 3 Sub-groups (Masuk, Keluar, Saldo Akhir)
    // 1. Masuk
    const masukStartLetter = getExcelColLetter(monthStartCol);
    const masukEndLetter = getExcelColLetter(monthStartCol + 3);
    wsBOS.mergeCells(`${masukStartLetter}5:${masukEndLetter}5`);
    const masukCell = wsBOS.getCell(`${masukStartLetter}5`);
    masukCell.value = 'PENAMBAHAN / MASUK';
    masukCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } }; // Emerald 800
    masukCell.font = headerFont;
    masukCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // 2. Keluar
    const keluarStartLetter = getExcelColLetter(monthStartCol + 4);
    const keluarEndLetter = getExcelColLetter(monthStartCol + 7);
    wsBOS.mergeCells(`${keluarStartLetter}5:${keluarEndLetter}5`);
    const keluarCell = wsBOS.getCell(`${keluarStartLetter}5`);
    keluarCell.value = 'PENGURANGAN / KELUAR';
    keluarCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } }; // Red 800
    keluarCell.font = headerFont;
    keluarCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // 3. Saldo Akhir
    const saldoAkhirStartLetter = getExcelColLetter(monthStartCol + 8);
    const saldoAkhirEndLetter = getExcelColLetter(monthStartCol + 11);
    wsBOS.mergeCells(`${saldoAkhirStartLetter}5:${saldoAkhirEndLetter}5`);
    const saldoAkhirCell = wsBOS.getCell(`${saldoAkhirStartLetter}5`);
    saldoAkhirCell.value = `SALDO AKHIR ${NAMA_BULAN[m].toUpperCase()}`;
    saldoAkhirCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }; // Blue 800
    saldoAkhirCell.font = headerFont;
    saldoAkhirCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 6: Sub-column headers for each group
    const subColNames = ['VOLUME', 'SATUAN', 'HARGA SATUAN', 'JUMLAH (Rp)'];
    const subColWidths = [9, 9, 14, 16];

    for (let g = 0; g < 3; g++) {
      for (let sc = 0; sc < 4; sc++) {
        const cNum = monthStartCol + (g * 4) + sc;
        const cell = wsBOS.getCell(6, cNum);
        cell.value = subColNames[sc];
        cell.fill = subHeaderFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        wsBOS.getColumn(cNum).width = subColWidths[sc];
      }
    }
  }

  // Last Col: KETERANGAN
  const ketColNum = totalColsBOS;
  const ketLetter = getExcelColLetter(ketColNum);
  wsBOS.mergeCells(`${ketLetter}4:${ketLetter}6`);
  const ketCell = wsBOS.getCell(`${ketLetter}4`);
  ketCell.value = 'KETERANGAN';
  ketCell.fill = headerFill;
  ketCell.font = headerFont;
  ketCell.alignment = { horizontal: 'center', vertical: 'middle' };
  wsBOS.getColumn(ketColNum).width = 20;

  // Apply borders to header area (Rows 4-6)
  for (let r = 4; r <= 6; r++) {
    for (let c = 1; c <= totalColsBOS; c++) {
      const cell = wsBOS.getCell(r, c);
      cell.border = THIN_BORDER;
    }
  }

  // DATA ROWS & GROUP SUBTOTALS
  let currentRow = 7;
  let itemCounter = 1;
  const subtotalRows: number[] = [];

  calculation.kelompokRekening.forEach(group => {
    // 1. Group Sub-Header Row: Kode Rekening
    const groupHeaderRow = currentRow;
    wsBOS.mergeCells(`A${groupHeaderRow}:${lastColLetterBOS}${groupHeaderRow}`);
    const grpCell = wsBOS.getCell(`A${groupHeaderRow}`);
    grpCell.value = `KODE REKENING: ${group.kodeRekening} - ${group.namaRekening.toUpperCase()}`;
    grpCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' } // Slate 100
    };
    grpCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    grpCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    wsBOS.getRow(groupHeaderRow).height = 22;

    for (let c = 1; c <= totalColsBOS; c++) {
      wsBOS.getCell(groupHeaderRow, c).border = THIN_BORDER;
    }
    currentRow++;

    const groupStartItemRow = currentRow;

    // 2. Data Items under this group
    group.items.forEach(barang => {
      const itemRow = currentRow;
      wsBOS.getRow(itemRow).height = 20;

      // Col A: NO
      const cA = wsBOS.getCell(`A${itemRow}`);
      cA.value = itemCounter++;
      cA.alignment = { horizontal: 'center', vertical: 'middle' };

      // Col B: PEMEGANG BARANG
      const cB = wsBOS.getCell(`B${itemRow}`);
      cB.value = schoolName;
      cB.alignment = { horizontal: 'left', vertical: 'middle' };

      // Col C: KODE REKENING
      const cC = wsBOS.getCell(`C${itemRow}`);
      cC.value = barang.kodeRekening;
      cC.alignment = { horizontal: 'center', vertical: 'middle' };

      // Col D: NAMA BARANG
      const cD = wsBOS.getCell(`D${itemRow}`);
      cD.value = barang.namaBarang;
      cD.alignment = { horizontal: 'left', vertical: 'middle' };

      // Col E: Saldo Awal Volume
      const cE = wsBOS.getCell(`E${itemRow}`);
      cE.value = barang.saldoAwalVolume;
      cE.numFmt = '#,##0';
      cE.alignment = { horizontal: 'right', vertical: 'middle' };

      // Col F: Satuan
      const cF = wsBOS.getCell(`F${itemRow}`);
      cF.value = barang.satuan;
      cF.alignment = { horizontal: 'center', vertical: 'middle' };

      // Col G: Harga Satuan
      const cG = wsBOS.getCell(`G${itemRow}`);
      cG.value = barang.hargaSatuan;
      cG.numFmt = '#,##0';
      cG.alignment = { horizontal: 'right', vertical: 'middle' };

      // Col H: Saldo Awal Jumlah (Rp) - EXCEL FORMULA: =E{row}*G{row}
      const cH = wsBOS.getCell(`H${itemRow}`);
      cH.value = {
        formula: `E${itemRow}*G${itemRow}`,
        result: barang.saldoAwalJumlahRp
      };
      cH.numFmt = '#,##0';
      cH.alignment = { horizontal: 'right', vertical: 'middle' };

      // Mutasi Bulanan
      for (let m = 0; m < numMonths; m++) {
        const detail = barang.mutasiBulanan[m];
        const mStartCol = 9 + (m * 12);

        // --- MASUK (4 cols: Vol, Satuan, Harga, Jumlah) ---
        const colMasukVol = getExcelColLetter(mStartCol);
        const colMasukSat = getExcelColLetter(mStartCol + 1);
        const colMasukHrg = getExcelColLetter(mStartCol + 2);
        const colMasukJml = getExcelColLetter(mStartCol + 3);

        const cMVol = wsBOS.getCell(`${colMasukVol}${itemRow}`);
        cMVol.value = detail.masukVolume;
        cMVol.numFmt = '#,##0';
        cMVol.alignment = { horizontal: 'right', vertical: 'middle' };

        const cMSat = wsBOS.getCell(`${colMasukSat}${itemRow}`);
        cMSat.value = detail.masukSatuan;
        cMSat.alignment = { horizontal: 'center', vertical: 'middle' };

        const cMHrg = wsBOS.getCell(`${colMasukHrg}${itemRow}`);
        cMHrg.value = detail.masukHargaSatuan;
        cMHrg.numFmt = '#,##0';
        cMHrg.alignment = { horizontal: 'right', vertical: 'middle' };

        // Masuk Jumlah Formula: ={Vol}*{Hrg}
        const cMJml = wsBOS.getCell(`${colMasukJml}${itemRow}`);
        cMJml.value = {
          formula: `${colMasukVol}${itemRow}*${colMasukHrg}${itemRow}`,
          result: detail.masukJumlahRp
        };
        cMJml.numFmt = '#,##0';
        cMJml.alignment = { horizontal: 'right', vertical: 'middle' };

        // --- KELUAR (4 cols: Vol, Satuan, Harga, Jumlah) ---
        const colKeluarVol = getExcelColLetter(mStartCol + 4);
        const colKeluarSat = getExcelColLetter(mStartCol + 5);
        const colKeluarHrg = getExcelColLetter(mStartCol + 6);
        const colKeluarJml = getExcelColLetter(mStartCol + 7);

        const cKVol = wsBOS.getCell(`${colKeluarVol}${itemRow}`);
        cKVol.value = detail.keluarVolume;
        cKVol.numFmt = '#,##0';
        cKVol.alignment = { horizontal: 'right', vertical: 'middle' };

        const cKSat = wsBOS.getCell(`${colKeluarSat}${itemRow}`);
        cKSat.value = detail.keluarSatuan;
        cKSat.alignment = { horizontal: 'center', vertical: 'middle' };

        const cKHrg = wsBOS.getCell(`${colKeluarHrg}${itemRow}`);
        cKHrg.value = detail.keluarHargaSatuan;
        cKHrg.numFmt = '#,##0';
        cKHrg.alignment = { horizontal: 'right', vertical: 'middle' };

        // Keluar Jumlah Formula: ={Vol}*{Hrg}
        const cKJml = wsBOS.getCell(`${colKeluarJml}${itemRow}`);
        cKJml.value = {
          formula: `${colKeluarVol}${itemRow}*${colKeluarHrg}${itemRow}`,
          result: detail.keluarJumlahRp
        };
        cKJml.numFmt = '#,##0';
        cKJml.alignment = { horizontal: 'right', vertical: 'middle' };

        // --- SALDO AKHIR (4 cols: Vol, Satuan, Harga, Jumlah) ---
        const colSaldoAkhirVol = getExcelColLetter(mStartCol + 8);
        const colSaldoAkhirSat = getExcelColLetter(mStartCol + 9);
        const colSaldoAkhirHrg = getExcelColLetter(mStartCol + 10);
        const colSaldoAkhirJml = getExcelColLetter(mStartCol + 11);

        // Saldo Akhir Volume Formula:
        // Month 0 (Jan): =E{row} + MasukVol - KeluarVol
        // Month > 0: =PrevSaldoAkhirVol + MasukVol - KeluarVol
        const prevVolCol = m === 0 ? 'E' : getExcelColLetter(9 + ((m - 1) * 12) + 8);
        const cSAVol = wsBOS.getCell(`${colSaldoAkhirVol}${itemRow}`);
        cSAVol.value = {
          formula: `${prevVolCol}${itemRow}+${colMasukVol}${itemRow}-${colKeluarVol}${itemRow}`,
          result: detail.saldoAkhirVolume
        };
        cSAVol.numFmt = '#,##0';
        cSAVol.alignment = { horizontal: 'right', vertical: 'middle' };

        const cSASat = wsBOS.getCell(`${colSaldoAkhirSat}${itemRow}`);
        cSASat.value = detail.saldoAkhirSatuan;
        cSASat.alignment = { horizontal: 'center', vertical: 'middle' };

        const cSAHrg = wsBOS.getCell(`${colSaldoAkhirHrg}${itemRow}`);
        cSAHrg.value = detail.saldoAkhirHargaSatuan;
        cSAHrg.numFmt = '#,##0';
        cSAHrg.alignment = { horizontal: 'right', vertical: 'middle' };

        // Saldo Akhir Jumlah Formula: ={SaldoAkhirVol}*{SaldoAkhirHrg}
        const cSAJml = wsBOS.getCell(`${colSaldoAkhirJml}${itemRow}`);
        cSAJml.value = {
          formula: `${colSaldoAkhirVol}${itemRow}*${colSaldoAkhirHrg}${itemRow}`,
          result: detail.saldoAkhirJumlahRp
        };
        cSAJml.numFmt = '#,##0';
        cSAJml.alignment = { horizontal: 'right', vertical: 'middle' };
      }

      // Keterangan
      const cKet = wsBOS.getCell(`${ketLetter}${itemRow}`);
      cKet.value = barang.keterangan || '';
      cKet.alignment = { horizontal: 'left', vertical: 'middle' };

      // Apply borders and font
      for (let c = 1; c <= totalColsBOS; c++) {
        const cl = wsBOS.getCell(itemRow, c);
        cl.border = THIN_BORDER;
        cl.font = { name: 'Arial', size: 9 };
      }

      currentRow++;
    });

    const groupEndItemRow = currentRow - 1;

    // 3. SUB TOTAL ROW FOR THIS KODE REKENING
    const subtotalRow = currentRow;
    subtotalRows.push(subtotalRow);
    wsBOS.getRow(subtotalRow).height = 22;

    // Merge A to D for Sub Total Label
    wsBOS.mergeCells(`A${subtotalRow}:D${subtotalRow}`);
    const subLabelCell = wsBOS.getCell(`A${subtotalRow}`);
    subLabelCell.value = `SUB TOTAL (${group.kodeRekening})`;
    subLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; // Slate 200
    subLabelCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    subLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

    // Empty Vol, Satuan, Harga for Subtotal
    wsBOS.getCell(`E${subtotalRow}`).value = '';
    wsBOS.getCell(`F${subtotalRow}`).value = '';
    wsBOS.getCell(`G${subtotalRow}`).value = '';

    // Subtotal Saldo Awal Jumlah (Col H) Formula: =SUM(H{start}:H{end})
    const subH = wsBOS.getCell(`H${subtotalRow}`);
    subH.value = {
      formula: `SUM(H${groupStartItemRow}:H${groupEndItemRow})`,
      result: group.subtotalSaldoAwalRp
    };
    subH.numFmt = '#,##0';
    subH.font = { name: 'Arial', size: 9, bold: true };
    subH.alignment = { horizontal: 'right', vertical: 'middle' };

    // Monthly Subtotals
    for (let m = 0; m < numMonths; m++) {
      const mStartCol = 9 + (m * 12);
      const colMasukJml = getExcelColLetter(mStartCol + 3);
      const colKeluarJml = getExcelColLetter(mStartCol + 7);
      const colSaldoAkhirJml = getExcelColLetter(mStartCol + 11);

      // Blank out non-jumlah subtotal cells
      for (let c = 0; c < 12; c++) {
        if (c !== 3 && c !== 7 && c !== 11) {
          wsBOS.getCell(subtotalRow, mStartCol + c).value = '';
        }
      }

      // Masuk Jumlah Subtotal Formula
      const subMasukCell = wsBOS.getCell(`${colMasukJml}${subtotalRow}`);
      subMasukCell.value = {
        formula: `SUM(${colMasukJml}${groupStartItemRow}:${colMasukJml}${groupEndItemRow})`,
        result: group.subtotalBulanan[m].totalMasukRp
      };
      subMasukCell.numFmt = '#,##0';
      subMasukCell.font = { name: 'Arial', size: 9, bold: true };
      subMasukCell.alignment = { horizontal: 'right', vertical: 'middle' };

      // Keluar Jumlah Subtotal Formula
      const subKeluarCell = wsBOS.getCell(`${colKeluarJml}${subtotalRow}`);
      subKeluarCell.value = {
        formula: `SUM(${colKeluarJml}${groupStartItemRow}:${colKeluarJml}${groupEndItemRow})`,
        result: group.subtotalBulanan[m].totalKeluarRp
      };
      subKeluarCell.numFmt = '#,##0';
      subKeluarCell.font = { name: 'Arial', size: 9, bold: true };
      subKeluarCell.alignment = { horizontal: 'right', vertical: 'middle' };

      // Saldo Akhir Jumlah Subtotal Formula
      const subSACell = wsBOS.getCell(`${colSaldoAkhirJml}${subtotalRow}`);
      subSACell.value = {
        formula: `SUM(${colSaldoAkhirJml}${groupStartItemRow}:${colSaldoAkhirJml}${groupEndItemRow})`,
        result: group.subtotalBulanan[m].totalSaldoAkhirRp
      };
      subSACell.numFmt = '#,##0';
      subSACell.font = { name: 'Arial', size: 9, bold: true };
      subSACell.alignment = { horizontal: 'right', vertical: 'middle' };
    }

    // Border and background for subtotal row
    for (let c = 1; c <= totalColsBOS; c++) {
      const cell = wsBOS.getCell(subtotalRow, c);
      cell.border = MEDIUM_BORDER;
      if (!cell.fill) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      }
    }

    currentRow++;
  });

  // GRAND TOTAL ROW
  const grandTotalRow = currentRow;
  wsBOS.getRow(grandTotalRow).height = 24;

  wsBOS.mergeCells(`A${grandTotalRow}:D${grandTotalRow}`);
  const grandTotalLabel = wsBOS.getCell(`A${grandTotalRow}`);
  grandTotalLabel.value = 'TOTAL KESELURUHAN';
  grandTotalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } }; // Slate 300
  grandTotalLabel.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  grandTotalLabel.alignment = { horizontal: 'right', vertical: 'middle' };

  // Grand Total Formula for Saldo Awal Jumlah: sum of each subtotal row
  const subtotalHCells = subtotalRows.map(r => `H${r}`).join(',');
  const gtH = wsBOS.getCell(`H${grandTotalRow}`);
  gtH.value = {
    formula: `SUM(${subtotalHCells})`,
    result: calculation.grandTotal.saldoAwalRp
  };
  gtH.numFmt = '#,##0';
  gtH.font = { name: 'Arial', size: 10, bold: true };
  gtH.alignment = { horizontal: 'right', vertical: 'middle' };

  // Monthly Grand Totals
  for (let m = 0; m < numMonths; m++) {
    const mStartCol = 9 + (m * 12);
    const colMasukJml = getExcelColLetter(mStartCol + 3);
    const colKeluarJml = getExcelColLetter(mStartCol + 7);
    const colSaldoAkhirJml = getExcelColLetter(mStartCol + 11);

    const sumMasukCells = subtotalRows.map(r => `${colMasukJml}${r}`).join(',');
    const gtMasuk = wsBOS.getCell(`${colMasukJml}${grandTotalRow}`);
    gtMasuk.value = {
      formula: `SUM(${sumMasukCells})`,
      result: calculation.grandTotal.bulanan[m].masukRp
    };
    gtMasuk.numFmt = '#,##0';
    gtMasuk.font = { name: 'Arial', size: 10, bold: true };
    gtMasuk.alignment = { horizontal: 'right', vertical: 'middle' };

    const sumKeluarCells = subtotalRows.map(r => `${colKeluarJml}${r}`).join(',');
    const gtKeluar = wsBOS.getCell(`${colKeluarJml}${grandTotalRow}`);
    gtKeluar.value = {
      formula: `SUM(${sumKeluarCells})`,
      result: calculation.grandTotal.bulanan[m].keluarRp
    };
    gtKeluar.numFmt = '#,##0';
    gtKeluar.font = { name: 'Arial', size: 10, bold: true };
    gtKeluar.alignment = { horizontal: 'right', vertical: 'middle' };

    const sumSACells = subtotalRows.map(r => `${colSaldoAkhirJml}${r}`).join(',');
    const gtSA = wsBOS.getCell(`${colSaldoAkhirJml}${grandTotalRow}`);
    gtSA.value = {
      formula: `SUM(${sumSACells})`,
      result: calculation.grandTotal.bulanan[m].saldoAkhirRp
    };
    gtSA.numFmt = '#,##0';
    gtSA.font = { name: 'Arial', size: 10, bold: true };
    gtSA.alignment = { horizontal: 'right', vertical: 'middle' };
  }

  for (let c = 1; c <= totalColsBOS; c++) {
    const cell = wsBOS.getCell(grandTotalRow, c);
    cell.border = MEDIUM_BORDER;
    if (!cell.fill) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } };
    }
  }

  currentRow += 2;

  // SIGNATURE SECTION
  const sigRowStart = currentRow;
  const sigColLeft = 'C';
  const sigColRight = getExcelColLetter(Math.max(10, totalColsBOS - 8));

  const kotaSurat = kopConfig?.kotaSurat || 'Bekasi';

  wsBOS.getCell(`${sigColLeft}${sigRowStart}`).value = 'Mengetahui,';
  wsBOS.getCell(`${sigColLeft}${sigRowStart + 1}`).value = kepsek.jabatan;
  wsBOS.getCell(`${sigColLeft}${sigRowStart + 5}`).value = kepsek.nama;
  wsBOS.getCell(`${sigColLeft}${sigRowStart + 5}`).font = { bold: true, underline: true };
  wsBOS.getCell(`${sigColLeft}${sigRowStart + 6}`).value = `NIP. ${kepsek.nip}`;

  wsBOS.getCell(`${sigColRight}${sigRowStart}`).value = `${kotaSurat}, 31 Desember ${targetYear}`;
  wsBOS.getCell(`${sigColRight}${sigRowStart + 1}`).value = pengurusBarang.jabatan;
  wsBOS.getCell(`${sigColRight}${sigRowStart + 5}`).value = pengurusBarang.nama;
  wsBOS.getCell(`${sigColRight}${sigRowStart + 5}`).font = { bold: true, underline: true };
  wsBOS.getCell(`${sigColRight}${sigRowStart + 6}`).value = `NIP. ${pengurusBarang.nip}`;


  // ==========================================
  // SHEET 2: "REKAP PER KODERING"
  // ==========================================
  const wsRekap = workbook.addWorksheet('REKAP PER KODERING', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 5 }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  });

  // Columns: NO(1), KODERING(2), URAIAN(3), SALDO AWAL(4)
  // Monthly (3 cols each: Masuk, Keluar, Saldo Akhir)
  const totalColsRekap = 4 + (numMonths * 3);
  const lastColLetterRekap = getExcelColLetter(totalColsRekap);

  // Title
  wsRekap.mergeCells(`A1:${lastColLetterRekap}1`);
  const rTitle = wsRekap.getCell('A1');
  rTitle.value = `REKAPITULASI PER KODERING BELANJA BARANG HABIS PAKAI BOS TAHUN ${targetYear}`;
  rTitle.font = { name: 'Arial', size: 13, bold: true };
  rTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsRekap.getRow(1).height = 26;

  // School
  wsRekap.mergeCells(`A2:${lastColLetterRekap}2`);
  const rSchool = wsRekap.getCell('A2');
  rSchool.value = `NAMA INSTANSI: ${schoolName.toUpperCase()}`;
  rSchool.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
  rSchool.alignment = { horizontal: 'center', vertical: 'middle' };
  wsRekap.getRow(2).height = 18;

  wsRekap.getRow(3).height = 10;

  // Headers (Rows 4-5)
  wsRekap.getRow(4).height = 24;
  wsRekap.getRow(5).height = 24;

  // Col A: NO
  wsRekap.mergeCells('A4:A5');
  const rA4 = wsRekap.getCell('A4');
  rA4.value = 'NO';
  rA4.fill = headerFill;
  rA4.font = headerFont;
  rA4.alignment = { horizontal: 'center', vertical: 'middle' };
  wsRekap.getColumn(1).width = 6;

  // Col B: KODERING
  wsRekap.mergeCells('B4:B5');
  const rB4 = wsRekap.getCell('B4');
  rB4.value = 'KODERING';
  rB4.fill = headerFill;
  rB4.font = headerFont;
  rB4.alignment = { horizontal: 'center', vertical: 'middle' };
  wsRekap.getColumn(2).width = 20;

  // Col C: URAIAN (Nama Kategori Rekening)
  wsRekap.mergeCells('C4:C5');
  const rC4 = wsRekap.getCell('C4');
  rC4.value = 'URAIAN (NAMA KATEGORI REKENING)';
  rC4.fill = headerFill;
  rC4.font = headerFont;
  rC4.alignment = { horizontal: 'center', vertical: 'middle' };
  wsRekap.getColumn(3).width = 38;

  // Col D: SALDO AWAL
  wsRekap.mergeCells('D4:D5');
  const rD4 = wsRekap.getCell('D4');
  rD4.value = `SALDO AWAL ${targetYear}`;
  rD4.fill = headerFill;
  rD4.font = headerFont;
  rD4.alignment = { horizontal: 'center', vertical: 'middle' };
  wsRekap.getColumn(4).width = 18;

  // Monthly 3-col groups
  for (let m = 0; m < numMonths; m++) {
    const mColStart = 5 + (m * 3);
    const mColEnd = mColStart + 2;
    const startL = getExcelColLetter(mColStart);
    const endL = getExcelColLetter(mColEnd);

    // Row 4: Month Header
    wsRekap.mergeCells(`${startL}4:${endL}4`);
    const mHead = wsRekap.getCell(`${startL}4`);
    mHead.value = `MUTASI ${NAMA_BULAN[m].toUpperCase()}`;
    mHead.fill = headerFill;
    mHead.font = headerFont;
    mHead.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 5: Masuk, Keluar, Saldo Akhir
    const cMasuk = wsRekap.getCell(5, mColStart);
    cMasuk.value = 'MUTASI MASUK (Rp)';
    cMasuk.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
    cMasuk.font = headerFont;
    cMasuk.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    wsRekap.getColumn(mColStart).width = 17;

    const cKeluar = wsRekap.getCell(5, mColStart + 1);
    cKeluar.value = 'MUTASI KELUAR (Rp)';
    cKeluar.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
    cKeluar.font = headerFont;
    cKeluar.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    wsRekap.getColumn(mColStart + 1).width = 17;

    const cSaldoAkhir = wsRekap.getCell(5, mColStart + 2);
    cSaldoAkhir.value = `SALDO AKHIR S.D ${NAMA_BULAN[m].toUpperCase().substring(0, 3)}`;
    cSaldoAkhir.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cSaldoAkhir.font = headerFont;
    cSaldoAkhir.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    wsRekap.getColumn(mColStart + 2).width = 19;
  }

  // Border for header
  for (let r = 4; r <= 5; r++) {
    for (let c = 1; c <= totalColsRekap; c++) {
      wsRekap.getCell(r, c).border = THIN_BORDER;
    }
  }

  // Data Rows for Rekap Kodering
  let rCurRow = 6;
  const rekapStartRow = rCurRow;

  calculation.rekapKodering.forEach((row, idx) => {
    const rw = rCurRow;
    wsRekap.getRow(rw).height = 20;

    // NO
    const cA = wsRekap.getCell(`A${rw}`);
    cA.value = idx + 1;
    cA.alignment = { horizontal: 'center', vertical: 'middle' };

    // KODERING
    const cB = wsRekap.getCell(`B${rw}`);
    cB.value = row.kodeRekening;
    cB.alignment = { horizontal: 'center', vertical: 'middle' };

    // URAIAN
    const cC = wsRekap.getCell(`C${rw}`);
    cC.value = row.namaRekening;
    cC.alignment = { horizontal: 'left', vertical: 'middle' };

    // SALDO AWAL (Nominal Rp)
    const cD = wsRekap.getCell(`D${rw}`);
    cD.value = row.saldoAwalRp;
    cD.numFmt = '#,##0';
    cD.alignment = { horizontal: 'right', vertical: 'middle' };

    // Monthly values with formula:
    // Saldo Akhir = (Saldo Awal / Previous Saldo Akhir + Masuk) - Keluar
    for (let m = 0; m < numMonths; m++) {
      const mColStart = 5 + (m * 3);
      const colMasuk = getExcelColLetter(mColStart);
      const colKeluar = getExcelColLetter(mColStart + 1);
      const colSA = getExcelColLetter(mColStart + 2);

      const mMasukCell = wsRekap.getCell(`${colMasuk}${rw}`);
      mMasukCell.value = row.bulanan[m].masukRp;
      mMasukCell.numFmt = '#,##0';
      mMasukCell.alignment = { horizontal: 'right', vertical: 'middle' };

      const mKeluarCell = wsRekap.getCell(`${colKeluar}${rw}`);
      mKeluarCell.value = row.bulanan[m].keluarRp;
      mKeluarCell.numFmt = '#,##0';
      mKeluarCell.alignment = { horizontal: 'right', vertical: 'middle' };

      // Previous balance column
      const prevBalCol = m === 0 ? 'D' : getExcelColLetter(5 + ((m - 1) * 3) + 2);
      const mSACell = wsRekap.getCell(`${colSA}${rw}`);
      mSACell.value = {
        formula: `(${prevBalCol}${rw}+${colMasuk}${rw})-${colKeluar}${rw}`,
        result: row.bulanan[m].saldoAkhirRp
      };
      mSACell.numFmt = '#,##0';
      mSACell.alignment = { horizontal: 'right', vertical: 'middle' };
      mSACell.font = { bold: true };
    }

    for (let c = 1; c <= totalColsRekap; c++) {
      const cell = wsRekap.getCell(rw, c);
      cell.border = THIN_BORDER;
      cell.font = { name: 'Arial', size: 9 };
    }

    rCurRow++;
  });

  const rekapEndRow = rCurRow - 1;

  // Rekap Total Row
  const rTotalRow = rCurRow;
  wsRekap.getRow(rTotalRow).height = 24;

  wsRekap.mergeCells(`A${rTotalRow}:C${rTotalRow}`);
  const rTotLabel = wsRekap.getCell(`A${rTotalRow}`);
  rTotLabel.value = 'TOTAL KESELURUHAN';
  rTotLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } };
  rTotLabel.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  rTotLabel.alignment = { horizontal: 'right', vertical: 'middle' };

  // Total Saldo Awal Formula: =SUM(D6:D...)
  const rTotD = wsRekap.getCell(`D${rTotalRow}`);
  rTotD.value = {
    formula: `SUM(D${rekapStartRow}:D${rekapEndRow})`,
    result: calculation.grandTotal.saldoAwalRp
  };
  rTotD.numFmt = '#,##0';
  rTotD.font = { name: 'Arial', size: 10, bold: true };
  rTotD.alignment = { horizontal: 'right', vertical: 'middle' };

  // Total monthly columns
  for (let m = 0; m < numMonths; m++) {
    const mColStart = 5 + (m * 3);
    const colMasuk = getExcelColLetter(mColStart);
    const colKeluar = getExcelColLetter(mColStart + 1);
    const colSA = getExcelColLetter(mColStart + 2);

    const tMasuk = wsRekap.getCell(`${colMasuk}${rTotalRow}`);
    tMasuk.value = {
      formula: `SUM(${colMasuk}${rekapStartRow}:${colMasuk}${rekapEndRow})`,
      result: calculation.grandTotal.bulanan[m].masukRp
    };
    tMasuk.numFmt = '#,##0';
    tMasuk.font = { name: 'Arial', size: 10, bold: true };
    tMasuk.alignment = { horizontal: 'right', vertical: 'middle' };

    const tKeluar = wsRekap.getCell(`${colKeluar}${rTotalRow}`);
    tKeluar.value = {
      formula: `SUM(${colKeluar}${rekapStartRow}:${colKeluar}${rekapEndRow})`,
      result: calculation.grandTotal.bulanan[m].keluarRp
    };
    tKeluar.numFmt = '#,##0';
    tKeluar.font = { name: 'Arial', size: 10, bold: true };
    tKeluar.alignment = { horizontal: 'right', vertical: 'middle' };

    const tSA = wsRekap.getCell(`${colSA}${rTotalRow}`);
    tSA.value = {
      formula: `SUM(${colSA}${rekapStartRow}:${colSA}${rekapEndRow})`,
      result: calculation.grandTotal.bulanan[m].saldoAkhirRp
    };
    tSA.numFmt = '#,##0';
    tSA.font = { name: 'Arial', size: 10, bold: true };
    tSA.alignment = { horizontal: 'right', vertical: 'middle' };
  }

  for (let c = 1; c <= totalColsRekap; c++) {
    const cell = wsRekap.getCell(rTotalRow, c);
    cell.border = MEDIUM_BORDER;
    if (!cell.fill) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } };
    }
  }

  rCurRow += 2;

  // Signatures on Rekap sheet
  wsRekap.getCell(`C${rCurRow}`).value = 'Mengetahui,';
  wsRekap.getCell(`C${rCurRow + 1}`).value = kepsek.jabatan;
  wsRekap.getCell(`C${rCurRow + 5}`).value = kepsek.nama;
  wsRekap.getCell(`C${rCurRow + 5}`).font = { bold: true, underline: true };
  wsRekap.getCell(`C${rCurRow + 6}`).value = `NIP. ${kepsek.nip}`;

  const sigRightRekap = getExcelColLetter(Math.max(6, totalColsRekap - 3));
  wsRekap.getCell(`${sigRightRekap}${rCurRow}`).value = `${kotaSurat}, 31 Desember ${targetYear}`;
  wsRekap.getCell(`${sigRightRekap}${rCurRow + 1}`).value = pengurusBarang.jabatan;
  wsRekap.getCell(`${sigRightRekap}${rCurRow + 5}`).value = pengurusBarang.nama;
  wsRekap.getCell(`${sigRightRekap}${rCurRow + 5}`).font = { bold: true, underline: true };
  wsRekap.getCell(`${sigRightRekap}${rCurRow + 6}`).value = `NIP. ${pengurusBarang.nip}`;

  return workbook;
}

/**
 * Trigger client-side browser download of the generated .xlsx file
 */
export async function downloadBOSExcelFile(
  masterBarang: Barang[],
  transaksiPengeluaranList: TransaksiPengeluaran[],
  transaksiPenerimaanList: TransaksiPenerimaan[],
  kopConfig: KopSuratConfig,
  pejabatList: Pejabat[],
  targetYear: number = 2026,
  monthsCount: number = 12
): Promise<void> {
  const workbook = await generateBOSExcelWorkbook(
    masterBarang,
    transaksiPengeluaranList,
    transaksiPenerimaanList,
    kopConfig,
    pejabatList,
    targetYear,
    monthsCount
  );

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const cleanSchool = (kopConfig?.namaSekolah || 'SMAN_1_CIHAURBEUTI').replace(/[^a-zA-Z0-9_-]/g, '_');
  anchor.href = url;
  anchor.download = `Laporan_Mutasi_BOS_${targetYear}_${cleanSchool}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

export interface ParsedBOSExcelResult {
  barangList: Barang[];
  detectedYear: number;
  detectedSchool: string;
  penerimaanCreated: number;
  pengeluaranCreated: number;
  warnings: string[];
}

/**
 * Robust Import Parser: reads uploaded .xlsx file and parses items, accounts,
 * initial stock, and mutations from sheet "BOS" (or active sheet)
 */
export async function parseBOSExcelFile(file: File): Promise<ParsedBOSExcelResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const warnings: string[] = [];

  // Pick sheet named "BOS" or first worksheet
  let worksheet = workbook.getWorksheet('BOS');
  if (!worksheet) {
    worksheet = workbook.worksheets[0];
    warnings.push(`Sheet "BOS" tidak ditemukan langsung. Menggunakan sheet "${worksheet?.name || 'Sheet1'}".`);
  }

  if (!worksheet) {
    throw new Error('File Excel kosong atau tidak memiliki lembar kerja.');
  }

  // Detect Year and School Name from top rows
  let detectedYear = 2026;
  let detectedSchool = 'SMAN 1 CIHAURBEUTI';

  for (let r = 1; r <= 5; r++) {
    const row = worksheet.getRow(r);
    row.eachCell(cell => {
      const val = cell.text || '';
      const yearMatch = val.match(/20\d{2}/);
      if (yearMatch) {
        detectedYear = parseInt(yearMatch[0], 10);
      }
      if (val.toLowerCase().includes('instansi:') || val.toLowerCase().includes('sekolah:')) {
        const parts = val.split(':');
        if (parts[1]?.trim()) {
          detectedSchool = parts[1].trim();
        }
      }
    });
  }

  const parsedBarang: Barang[] = [];
  let currentKodering = '5.1.02.01.01.0024';
  let currentNamaRekening = 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor';

  worksheet.eachRow((row, rowNumber) => {
    // Header rows are usually row 1 to 6
    if (rowNumber <= 6) return;

    const cellA = row.getCell(1).text?.trim();
    const cellC = row.getCell(3).text?.trim();
    const cellD = row.getCell(4).text?.trim();

    // Check if this is a group header row (e.g. "KODE REKENING: 5.1.02.01.01.0001 - ...")
    if (cellA && cellA.toLowerCase().startsWith('kode rekening:')) {
      const parts = cellA.replace(/kode rekening:/i, '').split('-');
      currentKodering = parts[0]?.trim() || currentKodering;
      currentNamaRekening = parts.slice(1).join('-')?.trim() || currentNamaRekening;
      return;
    }

    // Check if this is a subtotal or grand total row
    if (cellA && (cellA.toLowerCase().includes('sub total') || cellA.toLowerCase().includes('total'))) {
      return;
    }

    // Regular item row: must have item name in cell D or cell C
    const namaBarang = cellD || (cellC && !cellC.includes('.') ? cellC : '');
    if (!namaBarang || namaBarang.toLowerCase().includes('sub total') || namaBarang.toLowerCase().includes('total')) {
      return;
    }

    // Kodering in Col C
    const kodering = cellC && cellC.includes('.') ? cellC : currentKodering;

    // Saldo Awal: Vol in Col E (5), Sat in Col F (6), Harga in Col G (7)
    const volRaw = row.getCell(5).value;
    const vol = typeof volRaw === 'number' ? volRaw : parseFloat(String(volRaw || '0').replace(/[^0-9.-]/g, '')) || 0;

    const satuan = row.getCell(6).text?.trim() || 'Pcs';

    const hrgRaw = row.getCell(7).value;
    const hrg = typeof hrgRaw === 'number' ? hrgRaw : parseFloat(String(hrgRaw || '0').replace(/[^0-9.-]/g, '')) || 0;

    // Calculate current stock from last saldo akhir or saldo awal
    let finalStok = vol;
    // Check Col 20 (Saldo Akhir Jan) or later month columns
    const colSaldoAkhirFirstMonth = row.getCell(20).value;
    if (typeof colSaldoAkhirFirstMonth === 'number') {
      finalStok = colSaldoAkhirFirstMonth;
    }

    const nuspNum = String(parsedBarang.length + 1).padStart(4, '0');
    parsedBarang.push({
      id: `imported-${Date.now()}-${parsedBarang.length + 1}`,
      kodeBarang: `1.01.03.01.${nuspNum}`,
      nusp: `${nuspNum}/${detectedYear}`,
      namaBarang,
      spesifikasi: row.getCell(row.cellCount || 153).text?.trim() || 'Hasil Impor Excel BOS',
      kodeRekening: kodering,
      namaRekening: currentNamaRekening,
      kategori: 'ATK / Kertas',
      satuan,
      hargaSatuan: hrg,
      stokAwal: vol,
      stokSekarang: finalStok,
      lokasiGudang: 'Gudang Utama Persediaan Sekolah'
    });
  });

  return {
    barangList: parsedBarang,
    detectedYear,
    detectedSchool,
    penerimaanCreated: 0,
    pengeluaranCreated: 0,
    warnings
  };
}
