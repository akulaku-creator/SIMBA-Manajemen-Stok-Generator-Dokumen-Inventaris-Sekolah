import ExcelJS from 'exceljs';
import { getExcelColLetter } from './excelBosGenerator';
import { NAMA_BULAN } from './mutasiBosEngine';

export interface DinasKoderingMonthly {
  bulanIndex: number;
  namaBulan: string;
  masukRp: number;
  keluarRp: number;
  saldoAkhirRp: number;
}

export interface DinasKoderingRow {
  no: number;
  kodeRekening: string;
  namaRekening: string;
  kategori?: string;
  saldoAwalRp: number;
  totalMasukRp: number;
  totalKeluarRp: number;
  saldoAkhirTahunRp: number;
  bulanan: DinasKoderingMonthly[];
  sekolahCount: number;
  sekolahBreakdown: {
    sekolahId: string;
    namaSekolah: string;
    npsn: string;
    saldoAwalRp: number;
    totalMasukRp: number;
    totalKeluarRp: number;
    saldoAkhirRp: number;
    bulanan: DinasKoderingMonthly[];
  }[];
}

export interface DinasGrandTotal {
  totalSekolah: number;
  totalKodering: number;
  saldoAwalRp: number;
  totalMasukRp: number;
  totalKeluarRp: number;
  saldoAkhirRp: number;
  bulanan: {
    bulanIndex: number;
    namaBulan: string;
    masukRp: number;
    keluarRp: number;
    saldoAkhirRp: number;
  }[];
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};

const MEDIUM_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'medium', color: { argb: 'FF334155' } },
  left: { style: 'medium', color: { argb: 'FF334155' } },
  bottom: { style: 'medium', color: { argb: 'FF334155' } },
  right: { style: 'medium', color: { argb: 'FF334155' } },
};

const EXCEL_CLEAN_NUM_FMT = '#,##0;-#,##0;""';

/**
 * Generates an official Dinas-grade Excel workbook with 12-month multi-level headers,
 * formula-based sums, Kop Dinas, and detailed breakdown sheets.
 */
export async function downloadDinasKoderingExcel(
  rows: DinasKoderingRow[],
  grandTotal: DinasGrandTotal,
  selectedYear: number = 2026,
  schoolFilterLabel: string = 'SELURUH SATUAN PENDIDIKAN',
  isFull12Months: boolean = true
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SIMBA - Cabang Dinas Pendidikan Wilayah XIII';
  workbook.created = new Date();

  // =========================================================================
  // SHEET 1: REKAP KODERING GABUNGAN DINAS (12 BULAN / RINGKAS)
  // =========================================================================
  const ws1 = workbook.addWorksheet('REKAP_KODERING_DINAS', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 5, activeCell: 'D6' }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  });

  const numMonths = isFull12Months ? 12 : 12;
  const totalCols = 4 + (numMonths * 3); // A..D + 36 cols = 40 cols

  // Header Dinas
  ws1.mergeCells(1, 1, 1, totalCols);
  const title1 = ws1.getCell('A1');
  title1.value = 'PEMERINTAH DAERAH PROVINSI JAWA BARAT - DINAS PENDIDIKAN';
  title1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
  title1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws1.mergeCells(2, 1, 2, totalCols);
  const title2 = ws1.getCell('A2');
  title2.value = 'CABANG DINAS PENDIDIKAN WILAYAH XIII (KABUPATEN CIAMIS, KOTA BANJAR, KABUPATEN PANGANDARAN)';
  title2.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
  title2.alignment = { horizontal: 'center', vertical: 'middle' };

  ws1.mergeCells(3, 1, 3, totalCols);
  const title3 = ws1.getCell('A3');
  title3.value = `REKAPITULASI PER KODERING BELANJA BARANG HABIS PAKAI (BHP) BOS TAHUN ANGGARAN ${selectedYear} - ${schoolFilterLabel}`;
  title3.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } };
  title3.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 4 & 5: Multi-Level Header
  // A: NO
  ws1.mergeCells('A4:A5');
  const hA = ws1.getCell('A4');
  hA.value = 'NO';
  ws1.getColumn(1).width = 6;

  // B: KODE REKENING
  ws1.mergeCells('B4:B5');
  const hB = ws1.getCell('B4');
  hB.value = 'KODE REKENING';
  ws1.getColumn(2).width = 20;

  // C: URAIAN REKENING
  ws1.mergeCells('C4:C5');
  const hC = ws1.getCell('C4');
  hC.value = 'URAIAN AKUN BELANJA';
  ws1.getColumn(3).width = 38;

  // D: SALDO AWAL (1 JANUARI)
  ws1.mergeCells('D4:D5');
  const hD = ws1.getCell('D4');
  hD.value = 'SALDO AWAL (Rp)';
  ws1.getColumn(4).width = 18;

  // Style base headers
  ['A4', 'B4', 'C4', 'D4'].forEach(addr => {
    const c = ws1.getCell(addr);
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  // Monthly Columns (E through ...)
  for (let m = 0; m < numMonths; m++) {
    const colStart = 5 + (m * 3);
    const colEnd = colStart + 2;

    // Row 4: Month Header
    ws1.mergeCells(4, colStart, 4, colEnd);
    const mHead = ws1.getCell(4, colStart);
    mHead.value = `MUTASI ${NAMA_BULAN[m].toUpperCase()}`;
    mHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    mHead.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    mHead.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 5: Masuk, Keluar, Saldo Akhir
    const cMasuk = ws1.getCell(5, colStart);
    cMasuk.value = 'MASUK (Rp)';
    cMasuk.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } }; // emerald
    cMasuk.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FFFFFFFF' } };
    cMasuk.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ws1.getColumn(colStart).width = 16;

    const cKeluar = ws1.getCell(5, colStart + 1);
    cKeluar.value = 'KELUAR (Rp)';
    cKeluar.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } }; // rose
    cKeluar.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FFFFFFFF' } };
    cKeluar.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ws1.getColumn(colStart + 1).width = 16;

    const cSaldo = ws1.getCell(5, colStart + 2);
    cSaldo.value = `SALDO S.D ${NAMA_BULAN[m].slice(0, 3).toUpperCase()}`;
    cSaldo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }; // blue
    cSaldo.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FFFFFFFF' } };
    cSaldo.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ws1.getColumn(colStart + 2).width = 18;
  }

  // Header borders
  for (let r = 4; r <= 5; r++) {
    for (let c = 1; c <= totalCols; c++) {
      ws1.getCell(r, c).border = THIN_BORDER;
    }
  }

  // Populate Data Rows
  let curRow = 6;
  const startDataRow = curRow;

  rows.forEach((row, idx) => {
    ws1.getRow(curRow).height = 20;

    // NO
    const cellA = ws1.getCell(`A${curRow}`);
    cellA.value = idx + 1;
    cellA.alignment = { horizontal: 'center', vertical: 'middle' };

    // KODE REKENING
    const cellB = ws1.getCell(`B${curRow}`);
    cellB.value = row.kodeRekening;
    cellB.alignment = { horizontal: 'center', vertical: 'middle' };
    cellB.font = { name: 'Consolas', size: 9 };

    // URAIAN
    const cellC = ws1.getCell(`C${curRow}`);
    cellC.value = row.namaRekening;
    cellC.alignment = { horizontal: 'left', vertical: 'middle' };

    // SALDO AWAL (Rp)
    const cellD = ws1.getCell(`D${curRow}`);
    cellD.value = row.saldoAwalRp;
    cellD.numFmt = EXCEL_CLEAN_NUM_FMT;
    cellD.alignment = { horizontal: 'right', vertical: 'middle' };

    // 12 Months with arithmetic formulas:
    // Saldo Akhir Month 0 = (Saldo Awal + Masuk) - Keluar
    // Saldo Akhir Month N = (Saldo Akhir Month N-1 + Masuk) - Keluar
    for (let m = 0; m < numMonths; m++) {
      const colStart = 5 + (m * 3);
      const colMasuk = getExcelColLetter(colStart);
      const colKeluar = getExcelColLetter(colStart + 1);
      const colSaldo = getExcelColLetter(colStart + 2);

      const cellMasuk = ws1.getCell(`${colMasuk}${curRow}`);
      cellMasuk.value = row.bulanan[m]?.masukRp || 0;
      cellMasuk.numFmt = EXCEL_CLEAN_NUM_FMT;
      cellMasuk.alignment = { horizontal: 'right', vertical: 'middle' };

      const cellKeluar = ws1.getCell(`${colKeluar}${curRow}`);
      cellKeluar.value = row.bulanan[m]?.keluarRp || 0;
      cellKeluar.numFmt = EXCEL_CLEAN_NUM_FMT;
      cellKeluar.alignment = { horizontal: 'right', vertical: 'middle' };

      const prevBalCol = m === 0 ? 'D' : getExcelColLetter(5 + ((m - 1) * 3) + 2);
      const cellSaldo = ws1.getCell(`${colSaldo}${curRow}`);
      cellSaldo.value = {
        formula: `(${prevBalCol}${curRow}+${colMasuk}${curRow})-${colKeluar}${curRow}`,
        result: row.bulanan[m]?.saldoAkhirRp || 0
      };
      cellSaldo.numFmt = EXCEL_CLEAN_NUM_FMT;
      cellSaldo.alignment = { horizontal: 'right', vertical: 'middle' };
      cellSaldo.font = { name: 'Arial', size: 9, bold: true };
    }

    for (let c = 1; c <= totalCols; c++) {
      ws1.getCell(curRow, c).border = THIN_BORDER;
      if (c <= 3) {
        ws1.getCell(curRow, c).font = { name: 'Arial', size: 9 };
      }
    }

    curRow++;
  });

  const endDataRow = curRow - 1;

  // Grand Total Row
  const totalRowIndex = curRow;
  ws1.getRow(totalRowIndex).height = 24;

  ws1.mergeCells(`A${totalRowIndex}:C${totalRowIndex}`);
  const totLabel = ws1.getCell(`A${totalRowIndex}`);
  totLabel.value = 'TOTAL KESELURUHAN KONSOLIDASI DINAS';
  totLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } };
  totLabel.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  totLabel.alignment = { horizontal: 'right', vertical: 'middle' };

  // Total Saldo Awal Formula
  const totD = ws1.getCell(`D${totalRowIndex}`);
  totD.value = {
    formula: `SUM(D${startDataRow}:D${endDataRow})`,
    result: grandTotal.saldoAwalRp
  };
  totD.numFmt = EXCEL_CLEAN_NUM_FMT;
  totD.font = { name: 'Arial', size: 10, bold: true };
  totD.alignment = { horizontal: 'right', vertical: 'middle' };

  // Total for Monthly Columns
  for (let m = 0; m < numMonths; m++) {
    const colStart = 5 + (m * 3);
    const colMasuk = getExcelColLetter(colStart);
    const colKeluar = getExcelColLetter(colStart + 1);
    const colSaldo = getExcelColLetter(colStart + 2);

    const tMasuk = ws1.getCell(`${colMasuk}${totalRowIndex}`);
    tMasuk.value = {
      formula: `SUM(${colMasuk}${startDataRow}:${colMasuk}${endDataRow})`,
      result: grandTotal.bulanan[m]?.masukRp || 0
    };
    tMasuk.numFmt = EXCEL_CLEAN_NUM_FMT;
    tMasuk.font = { name: 'Arial', size: 9, bold: true };
    tMasuk.alignment = { horizontal: 'right', vertical: 'middle' };

    const tKeluar = ws1.getCell(`${colKeluar}${totalRowIndex}`);
    tKeluar.value = {
      formula: `SUM(${colKeluar}${startDataRow}:${colKeluar}${endDataRow})`,
      result: grandTotal.bulanan[m]?.keluarRp || 0
    };
    tKeluar.numFmt = EXCEL_CLEAN_NUM_FMT;
    tKeluar.font = { name: 'Arial', size: 9, bold: true };
    tKeluar.alignment = { horizontal: 'right', vertical: 'middle' };

    const tSaldo = ws1.getCell(`${colSaldo}${totalRowIndex}`);
    tSaldo.value = {
      formula: `SUM(${colSaldo}${startDataRow}:${colSaldo}${endDataRow})`,
      result: grandTotal.bulanan[m]?.saldoAkhirRp || 0
    };
    tSaldo.numFmt = EXCEL_CLEAN_NUM_FMT;
    tSaldo.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E40AF' } };
    tSaldo.alignment = { horizontal: 'right', vertical: 'middle' };
  }

  for (let c = 1; c <= totalCols; c++) {
    const cell = ws1.getCell(totalRowIndex, c);
    cell.border = MEDIUM_BORDER;
    if (c >= 4) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    }
  }

  // =========================================================================
  // SHEET 2: KONTRIBUSI PER SEKOLAH (DETAIL DRILL-DOWN)
  // =========================================================================
  const ws2 = workbook.addWorksheet('KONTRIBUSI_PER_SEKOLAH', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 4, activeCell: 'D5' }]
  });

  ws2.mergeCells('A1:H1');
  const s2Title = ws2.getCell('A1');
  s2Title.value = `RINCIAN KONTRIBUSI MUTASI PER SATUAN PENDIDIKAN - TA ${selectedYear}`;
  s2Title.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } };
  s2Title.alignment = { horizontal: 'left', vertical: 'middle' };

  ws2.mergeCells('A2:H2');
  const s2Sub = ws2.getCell('A2');
  s2Sub.value = 'CABANG DINAS PENDIDIKAN WILAYAH XIII - PENGELOLAAN PERSEDIAAN & ASET DAERAH';
  s2Sub.font = { name: 'Arial', size: 9, color: { argb: 'FF64748B' } };
  s2Sub.alignment = { horizontal: 'left', vertical: 'middle' };

  const s2Headers = [
    'NO',
    'KODE REKENING',
    'URAIAN REKENING',
    'NAMA SATUAN PENDIDIKAN',
    'NPSN',
    'SALDO AWAL (Rp)',
    'TOTAL MASUK (Rp)',
    'TOTAL KELUAR (Rp)',
    'SALDO AKHIR (Rp)'
  ];

  const s2HeaderRow = ws2.getRow(4);
  s2HeaderRow.height = 24;
  s2Headers.forEach((h, idx) => {
    const c = s2HeaderRow.getCell(idx + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = THIN_BORDER;
  });

  ws2.getColumn(1).width = 6;
  ws2.getColumn(2).width = 18;
  ws2.getColumn(3).width = 32;
  ws2.getColumn(4).width = 30;
  ws2.getColumn(5).width = 12;
  ws2.getColumn(6).width = 18;
  ws2.getColumn(7).width = 18;
  ws2.getColumn(8).width = 18;
  ws2.getColumn(9).width = 18;

  let s2Row = 5;
  let counter = 1;

  rows.forEach(r => {
    r.sekolahBreakdown.forEach(s => {
      ws2.getRow(s2Row).height = 19;

      ws2.getCell(`A${s2Row}`).value = counter++;
      ws2.getCell(`A${s2Row}`).alignment = { horizontal: 'center', vertical: 'middle' };

      ws2.getCell(`B${s2Row}`).value = r.kodeRekening;
      ws2.getCell(`B${s2Row}`).alignment = { horizontal: 'center', vertical: 'middle' };
      ws2.getCell(`B${s2Row}`).font = { name: 'Consolas', size: 9 };

      ws2.getCell(`C${s2Row}`).value = r.namaRekening;
      ws2.getCell(`C${s2Row}`).alignment = { horizontal: 'left', vertical: 'middle' };

      ws2.getCell(`D${s2Row}`).value = s.namaSekolah;
      ws2.getCell(`D${s2Row}`).alignment = { horizontal: 'left', vertical: 'middle' };
      ws2.getCell(`D${s2Row}`).font = { name: 'Arial', size: 9, bold: true };

      ws2.getCell(`E${s2Row}`).value = s.npsn;
      ws2.getCell(`E${s2Row}`).alignment = { horizontal: 'center', vertical: 'middle' };

      ws2.getCell(`F${s2Row}`).value = s.saldoAwalRp;
      ws2.getCell(`F${s2Row}`).numFmt = EXCEL_CLEAN_NUM_FMT;
      ws2.getCell(`F${s2Row}`).alignment = { horizontal: 'right', vertical: 'middle' };

      ws2.getCell(`G${s2Row}`).value = s.totalMasukRp;
      ws2.getCell(`G${s2Row}`).numFmt = EXCEL_CLEAN_NUM_FMT;
      ws2.getCell(`G${s2Row}`).alignment = { horizontal: 'right', vertical: 'middle' };

      ws2.getCell(`H${s2Row}`).value = s.totalKeluarRp;
      ws2.getCell(`H${s2Row}`).numFmt = EXCEL_CLEAN_NUM_FMT;
      ws2.getCell(`H${s2Row}`).alignment = { horizontal: 'right', vertical: 'middle' };

      ws2.getCell(`I${s2Row}`).value = s.saldoAkhirRp;
      ws2.getCell(`I${s2Row}`).numFmt = EXCEL_CLEAN_NUM_FMT;
      ws2.getCell(`I${s2Row}`).alignment = { horizontal: 'right', vertical: 'middle' };
      ws2.getCell(`I${s2Row}`).font = { name: 'Arial', size: 9, bold: true };

      for (let c = 1; c <= 9; c++) {
        ws2.getCell(s2Row, c).border = THIN_BORDER;
      }

      s2Row++;
    });
  });

  // Download directly in browser via blob
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `REKAP_KODERING_DINAS_CADISDIK13_TA_${selectedYear}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
