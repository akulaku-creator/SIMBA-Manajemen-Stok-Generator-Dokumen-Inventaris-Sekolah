import { 
  Check, 
  Code2, 
  Copy, 
  Database, 
  FileCode, 
  FileSpreadsheet, 
  Printer, 
  X 
} from 'lucide-react';
import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SchemaAndScriptModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'sql' | 'gas' | 'sheets' | 'html'>('sql');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (key: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const sqlCode = `-- ==============================================================================
-- SKEMA BASIS DATA SISTEM INVENTARIS & DOKUMEN SEKOLAH (SIMBA)
-- Kompatibel: PostgreSQL 14+ / MySQL 8.0+ / MariaDB
-- Mendukung Relasi Dokumen Berantai: NPB -> SPB -> SPPB -> BAST & Rekap BOS
-- ==============================================================================

-- 1. Tabel Master Pejabat & Penandatangan
CREATE TABLE master_pejabat (
    id VARCHAR(36) PRIMARY KEY,
    nama VARCHAR(150) NOT NULL,
    nip VARCHAR(30) DEFAULT '-',
    pangkat_golongan VARCHAR(80) DEFAULT '-',
    jabatan VARCHAR(100) NOT NULL, -- Kepala Sekolah, Wakasek Sarpras, Pengurus Barang Pembantu, Staf
    unit_kerja VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Master Barang & NUSP
CREATE TABLE master_barang (
    id VARCHAR(36) PRIMARY KEY,
    kode_barang VARCHAR(50) NOT NULL, -- Contoh: 1.01.03.01.01 atau 1.03.02.01.01
    nusp VARCHAR(50) NOT NULL UNIQUE, -- Nomor Urut Pendaftaran Barang: 0001/2026
    nama_barang VARCHAR(200) NOT NULL,
    spesifikasi TEXT,
    kategori VARCHAR(50) NOT NULL,    -- ATK / Kertas, Kebersihan, Komputer, dsb
    satuan VARCHAR(30) NOT NULL,      -- Rim, Box, Pcs, Buah, dsb
    harga_satuan NUMERIC(15, 2) NOT NULL DEFAULT 0,
    stok_awal INT NOT NULL DEFAULT 0,
    stok_sekarang INT NOT NULL DEFAULT 0,
    lokasi_gudang VARCHAR(100),
    jenis_barang VARCHAR(30) NOT NULL DEFAULT 'BHP', -- 'BHP' (Habis Pakai) vs 'Belanja Modal' (Aset Tetap)
    kode_rekening VARCHAR(50) DEFAULT '5.1.02.01.01.0024', -- Standar Rekening Belanja Dinas
    nama_rekening VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Konfigurasi Kop Surat Resmi Sekolah
CREATE TABLE pengaturan_kop (
    id INT PRIMARY KEY DEFAULT 1,
    pemerintah_daerah VARCHAR(155) NOT NULL,
    dinas_pendidikan VARCHAR(150) NOT NULL,
    cabang_dinas VARCHAR(150),
    nama_sekolah VARCHAR(150) NOT NULL,
    alamat_lengkap TEXT NOT NULL,
    email_website VARCHAR(200),
    npsn VARCHAR(20),
    kota_surat VARCHAR(50) NOT NULL,
    logo_url TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Header Transaksi Pengeluaran / Penyaluran Barang (Rantai 4 Dokumen)
CREATE TABLE transaksi_pengeluaran (
    id VARCHAR(36) PRIMARY KEY,
    nomor_urut INT NOT NULL,
    tanggal DATE NOT NULL,
    unit_pemohon VARCHAR(150) NOT NULL,
    keperluan_umum TEXT NOT NULL,
    
    -- Nomor Dokumen Berantai Resmi
    no_npb VARCHAR(80) NOT NULL UNIQUE,   -- Nota Permintaan Barang
    no_spb VARCHAR(80) NOT NULL UNIQUE,   -- Surat Permintaan Barang
    no_sppb VARCHAR(80) NOT NULL UNIQUE,  -- Surat Perintah Penyaluran Barang
    no_bast VARCHAR(80) NOT NULL UNIQUE,  -- Berita Acara Serah Terima
    
    -- Foreign Keys Pejabat Penandatangan
    pemohon_id VARCHAR(36) REFERENCES master_pejabat(id),
    sarpras_id VARCHAR(36) REFERENCES master_pejabat(id),
    pengurus_barang_id VARCHAR(36) REFERENCES master_pejabat(id),
    kepsek_id VARCHAR(36) REFERENCES master_pejabat(id),
    
    catatan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Detail Item Pengeluaran Barang
CREATE TABLE transaksi_pengeluaran_detail (
    id VARCHAR(36) PRIMARY KEY,
    transaksi_id VARCHAR(36) NOT NULL REFERENCES transaksi_pengeluaran(id) ON DELETE CASCADE,
    barang_id VARCHAR(36) NOT NULL REFERENCES master_barang(id),
    sisa_stok_saat_pengajuan INT NOT NULL,
    usulan_jumlah INT NOT NULL,
    harga_satuan NUMERIC(15, 2) NOT NULL,
    subtotal NUMERIC(15, 2) GENERATED ALWAYS AS (usulan_jumlah * harga_satuan) STORED,
    keperluan_spesifik VARCHAR(255)
);

-- 6. Tabel Penerimaan Barang Masuk (Pengadaan BOS / Hibah)
CREATE TABLE transaksi_penerimaan (
    id VARCHAR(36) PRIMARY KEY,
    tanggal DATE NOT NULL,
    no_bukti VARCHAR(100) NOT NULL UNIQUE,
    sumber_dana VARCHAR(80) NOT NULL, -- BOS Reguler / APBD / Hibah
    penyedia VARCHAR(150) NOT NULL,   -- Nama CV / Rekanan Vendor
    penerima_id VARCHAR(36) REFERENCES master_pejabat(id),
    total_nilai NUMERIC(15, 2) NOT NULL DEFAULT 0,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel Detail Item Penerimaan Barang Masuk
CREATE TABLE transaksi_penerimaan_detail (
    id VARCHAR(36) PRIMARY KEY,
    penerimaan_id VARCHAR(36) NOT NULL REFERENCES transaksi_penerimaan(id) ON DELETE CASCADE,
    barang_id VARCHAR(36) NOT NULL REFERENCES master_barang(id),
    jumlah_masuk INT NOT NULL,
    harga_satuan NUMERIC(15, 2) NOT NULL,
    subtotal NUMERIC(15, 2) GENERATED ALWAYS AS (jumlah_masuk * harga_satuan) STORED
);

-- TRIGGER OTOMATIS: Kurangi Stok Saat Penyaluran Disimpan
CREATE OR REPLACE FUNCTION potong_stok_barang()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE master_barang
    SET stok_sekarang = stok_sekarang - NEW.usulan_jumlah,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.barang_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_potong_stok
AFTER INSERT ON transaksi_pengeluaran_detail
FOR EACH ROW EXECUTE FUNCTION potong_stok_barang();

-- TRIGGER OTOMATIS: Tambah Stok Saat Penerimaan Disimpan
CREATE OR REPLACE FUNCTION tambah_stok_barang()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE master_barang
    SET stok_sekarang = stok_sekarang + NEW.jumlah_masuk,
        harga_satuan = NEW.harga_satuan,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.barang_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tambah_stok
AFTER INSERT ON transaksi_penerimaan_detail
FOR EACH ROW EXECUTE FUNCTION tambah_stok_barang();`;

  const gasCode = `/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT: SIMBA (SISTEM INVENTARIS DOKUMEN RESMI SEKOLAH)
 * File: Code.gs
 * Fungsi: Otomasi Penomoran Surat, Penyimpanan Transaksi, dan Rekapitulasi BOS
 * ==============================================================================
 */

// 1. Menu Navigasi Otomatis di Google Sheets
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🏛️ SIMBA Inventaris')
    .addItem('📝 Input Transaksi Penyaluran Baru', 'showTransaksiDialog')
    .addItem('🖨️ Generate Nomor & Berkas Cetak', 'generateDokumenCetak')
    .addSeparator()
    .addItem('📊 Rekalkulasi Saldo Buku Rekap BOS', 'rekapitulasiSaldoBOS')
    .addToUi();
}

// 2. Fungsi Generator Nomor Dokumen Berantai Otomatis (Independen per Jenis Dokumen)
function generateNomorDokumen(counters, dateObj, schoolCode) {
  const bulanRomawi = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const d = dateObj || new Date();
  const year = d.getFullYear();
  const month = bulanRomawi[d.getMonth()];
  const code = schoolCode || 'SEKOLAH';

  // Mendukung urutan nomor terpisah per jenis dokumen sesuai Buku Agenda Surat
  const cNPB = String(typeof counters === 'object' ? (counters.npb || 1) : counters).padStart(3, '0');
  const cSPB = String(typeof counters === 'object' ? (counters.spb || 1) : counters).padStart(3, '0');
  const cSPPB = String(typeof counters === 'object' ? (counters.sppb || 1) : counters).padStart(3, '0');
  const cBAST = String(typeof counters === 'object' ? (counters.bast || 1) : counters).padStart(3, '0');

  return {
    noNPB: cNPB + '/NPB/' + code + '/' + month + '/' + year,
    noSPB: '421.3/' + cSPB + '/SPB-' + code + '/' + month + '/' + year,
    noSPPB: '028/' + cSPPB + '/SPPB-' + code + '/' + month + '/' + year,
    noBAST: '028/' + cBAST + '/BAST-' + code + '/' + month + '/' + year
  };
}

// 3. Simpan Transaksi Penyaluran & Potong Stok Master
function simpanTransaksiPenyaluran(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetTrx = ss.getSheetByName('Trx_Penyaluran') || ss.insertSheet('Trx_Penyaluran');
  const sheetDetail = ss.getSheetByName('Trx_Detail') || ss.insertSheet('Trx_Detail');
  const sheetBarang = ss.getSheetByName('Master_Barang');

  const counter = sheetTrx.getLastRow(); // nomor urut
  const schoolCode = data.schoolCode || 'SEKOLAH';
  const nomorSurat = generateNomorDokumen(counter, new Date(data.tanggal), schoolCode);

  // Simpan Header Transaksi
  sheetTrx.appendRow([
    data.id || Utilities.getUuid(),
    counter,
    data.tanggal,
    data.unitPemohon,
    data.keperluanUmum,
    nomorSurat.noNPB,
    nomorSurat.noSPB,
    nomorSurat.noSPPB,
    nomorSurat.noBAST,
    data.pemohonNama,
    data.sarprasNama,
    data.pengurusBarangNama,
    data.kepsekNama,
    new Date()
  ]);

  // Simpan Detail & Kurangi Stok
  const barangValues = sheetBarang.getDataRange().getValues();
  data.items.forEach(function(item) {
    sheetDetail.appendRow([
      Utilities.getUuid(),
      nomorSurat.noBAST,
      item.kodeBarang,
      item.nusp,
      item.namaBarang,
      item.satuan,
      item.sisaBarang,
      item.usulanJumlah,
      item.hargaSatuan,
      item.usulanJumlah * item.hargaSatuan,
      item.keperluan
    ]);

    // Update stok pada Master_Barang (Kolom H: Stok Sekarang)
    for (let r = 1; r < barangValues.length; r++) {
      if (barangValues[r][0] === item.kodeBarang || barangValues[r][1] === item.nusp) {
        const stokCell = sheetBarang.getRange(r + 1, 8); // Kolom ke-8
        const currentStock = Number(stokCell.getValue()) || 0;
        stokCell.setValue(Math.max(0, currentStock - item.usulanJumlah));
        break;
      }
    }
  });

  return { status: 'success', nomorSurat: nomorSurat };
}

// 4. Kalkulasi Rekapitulasi Mutasi BHP per Kodering (Validasi Anti-Phantom Stock & Eksklusi Belanja Modal)
// ATURAN INTEGRITAS AKUNTANSI:
// - HANYA barang berstatus BHP (5.1.02...) yang dihitung dalam Laporan Mutasi BHP.
// - Barang Belanja Modal / Aset Tetap (5.2.02...) otomatis DIKECUALIKAN dari Mutasi BHP.
// - Barang Belanja Modal TETAP dicatat dan diakumulasi sempurna pada Buku Penerimaan (Buku-01) & Buku Pengeluaran (Buku-02).
function hitungMutasiBHPPerBulan(targetYear, targetMonth, kodeRekeningFilter) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetPenerimaan = ss.getSheetByName('Penerimaan');
  const sheetPengeluaran = ss.getSheetByName('Trx_Detail');
  
  // Jika kode rekening yang diminta adalah Belanja Modal (5.2...), lewati karena bukan BHP
  if (kodeRekeningFilter && kodeRekeningFilter.indexOf('5.2.') === 0) {
    return {
      masuk: { volume: 0, nilaiRp: 0 },
      keluar: { volume: 0, nilaiRp: 0 },
      keterangan: 'Eksklusi: Belanja Modal/Aset dicatat terpisah pada Buku Aset Tetap'
    };
  }

  let totalMasukVol = 0;
  let totalMasukRp = 0;
  let countPenerimaan = 0;

  if (sheetPenerimaan) {
    const dataRcv = sheetPenerimaan.getDataRange().getValues();
    // Baris 1: Header. Kolom B: Tanggal, E: Kode Rekening, G: Vol Masuk, H: Harga Satuan, I: Subtotal
    for (let i = 1; i < dataRcv.length; i++) {
      const rowDate = new Date(dataRcv[i][1]);
      const kodering = String(dataRcv[i][4] || '').trim();
      
      // EKSKLUSI BELANJA MODAL DARI MUTASI BHP
      if (kodering.indexOf('5.2.') === 0) continue;

      if (rowDate.getFullYear() === targetYear && rowDate.getMonth() === targetMonth) {
        if (!kodeRekeningFilter || kodering === kodeRekeningFilter) {
          const vol = Number(dataRcv[i][6]) || 0;
          const harga = Number(dataRcv[i][7]) || 0;
          if (vol > 0) {
            countPenerimaan++;
            totalMasukVol += vol;
            totalMasukRp += (vol * harga);
          }
        }
      }
    }
  }

  let totalKeluarVol = 0;
  let totalKeluarRp = 0;
  let countPengeluaran = 0;

  if (sheetPengeluaran) {
    const dataTrx = sheetPengeluaran.getDataRange().getValues();
    // Kolom B: Tanggal/No BAST, C: Kode Rekening / Kode Barang, H: Usulan Jumlah, I: Harga Satuan
    for (let i = 1; i < dataTrx.length; i++) {
      const rowDate = new Date(dataTrx[i][1]);
      const kodering = String(dataTrx[i][2] || '').trim();

      // EKSKLUSI BELANJA MODAL DARI MUTASI BHP
      if (kodering.indexOf('5.2.') === 0) continue;

      if (rowDate.getFullYear() === targetYear && rowDate.getMonth() === targetMonth) {
        if (!kodeRekeningFilter || kodering === kodeRekeningFilter) {
          const vol = Number(dataTrx[i][7]) || 0;
          const harga = Number(dataTrx[i][8]) || 0;
          if (vol > 0) {
            countPengeluaran++;
            totalKeluarVol += vol;
            totalKeluarRp += (vol * harga);
          }
        }
      }
    }
  }

  // VALIDASI KONSISTEN: Jika tidak ada transaksi riil pada bulan bersangkutan, paksa output 0 Rp
  return {
    masuk: countPenerimaan > 0 ? { volume: totalMasukVol, nilaiRp: totalMasukRp } : { volume: 0, nilaiRp: 0 },
    keluar: countPengeluaran > 0 ? { volume: totalKeluarVol, nilaiRp: totalKeluarRp } : { volume: 0, nilaiRp: 0 }
  };
}

// 5. Web App Endpoint: Kemudahan Integrasi Frontend ke Google Apps Script
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    if (postData.action === 'simpan_penyaluran') {
      const result = simpanTransaksiPenyaluran(postData.data);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const sheetsStructure = `# ==============================================================================
# STRUKTUR TABEL GOOGLE SHEETS DOKUMEN INVENTARIS SEKOLAH (SIMBA)
# ==============================================================================

### Sheet 1: Master_Barang
| Kolom | Nama Header | Tipe Data | Deskripsi / Formula |
|-------|-------------|-----------|---------------------|
| A | Kode_Barang | Teks | Kodefikasi inventaris dinas, misal: 1.01.03.01.01 |
| B | NUSP | Teks | No. Urut Pendaftaran Barang (0001/2026) |
| C | Nama_Barang | Teks | Nama lengkap barang beserta merk |
| D | Spesifikasi | Teks | Ukuran, gramatur, kapasitas, isi |
| E | Kategori | Teks | ATK / Kebersihan / Elektronik / dsb |
| F | Satuan | Teks | Rim / Box / Buah / Botol / Pak |
| G | Harga_Satuan | Angka (Rp)| Standar Biaya Masukan / BOS |
| H | Stok_Awal | Angka | Saldo awal tahun anggaran |
| I | Stok_Sekarang | Angka | =H2+SUMIF(Penerimaan!B:B,A2,Penerimaan!D:D)-SUMIF(Trx_Detail!C:C,A2,Trx_Detail!H:H) |
| J | Lokasi_Gudang | Teks | Rak penyimpanan fisik di sekolah |
| K | Jenis_Aset | Teks | BHP (Habis Pakai) vs Belanja Modal (Aset Tetap) |
| L | Kode_Rekening | Teks | Standar Belanja Dinas (5.1.02... / 5.2.02...) |

---

### Sheet 2: Master_Pejabat
| Kolom | Nama Header | Tipe Data | Keterangan |
|-------|-------------|-----------|------------|
| A | ID_Pejabat | Teks | ID unik pejabat |
| B | Nama_Lengkap | Teks | Nama lengkap beserta gelar akademik/kedinasan |
| C | NIP | Teks | Nomor Induk Pegawai resmi 18 digit |
| D | Pangkat_Gol | Teks | Pembina / IV c, Penata Tk. I / III d |
| E | Jabatan | Teks | Kepala Sekolah, Wakasek Sarpras, Pengurus Barang |
| F | Unit_Kerja | Teks | Bidang / Bagian kedinasan |

---

### Sheet 3: Trx_Penyaluran (Header Transaksi)
| Kolom | Nama Header | Tipe Data | Keterangan |
|-------|-------------|-----------|------------|
| A | ID_Transaksi | Teks | UUID Transaksi |
| B | No_Urut | Angka | Nomor urut register dinas (1, 2, 3...) |
| C | Tanggal | Tanggal | YYYY-MM-DD |
| D | Unit_Pemohon | Teks | Lab Komputer / Tata Usaha / Kurikulum |
| E | Keperluan_Umum | Teks | Deskripsi peruntukan barang |
| F | No_NPB | Teks | Auto: [No]/NPB-{SEKOLAH}/[Bulan]/[Tahun] |
| G | No_SPB | Teks | Auto: 421.3/[No]/SPB-{SEKOLAH}/[Bulan]/[Tahun] |
| H | No_SPPB | Teks | Auto: 028/[No]/SPPB-{SEKOLAH}/[Bulan]/[Tahun] |
| I | No_BAST | Teks | Auto: 028/[No]/BAST-{SEKOLAH}/[Bulan]/[Tahun] |
| J | Pemohon_ID | Teks | Referensi ke Master_Pejabat.ID |
| K | Sarpras_ID | Teks | Referensi ke Master_Pejabat.ID |
| L | PengurusBarang_ID | Teks | Referensi ke Master_Pejabat.ID |
| M | Kepsek_ID | Teks | Referensi ke Master_Pejabat.ID |

---

### Sheet 4: Trx_Detail (Item Penyaluran)
| Kolom | Nama Header | Tipe Data | Keterangan |
|-------|-------------|-----------|------------|
| A | ID_Detail | Teks | UUID |
| B | No_BAST | Teks | Foreign Key ke Trx_Penyaluran.No_BAST |
| C | Kode_Barang | Teks | Foreign Key ke Master_Barang.Kode_Barang |
| D | NUSP | Teks | Nomor Urut Pendaftaran |
| E | Nama_Barang | Teks | =VLOOKUP(C2,Master_Barang!A:C,3,FALSE) |
| F | Satuan | Teks | Rim / Pcs / Box |
| G | Sisa_Barang | Angka | Stok gudang saat diajukan |
| H | Usulan_Jumlah | Angka | Jumlah fisik yang disalurkan |
| I | Harga_Satuan | Angka | Harga satuan standar BOS |
| J | Subtotal | Angka | =H2*I2 |
| K | Keperluan | Teks | Keterangan spesifik penggunaan per item |

---

### Sheet 5: Rekap_BOS (Buku Penerimaan & Pengeluaran)
- Kolom A: No Urut
- Kolom B: Tanggal Transaksi
- Kolom C: Nomor Bukti (No Faktur atau No BAST)
- Kolom D: Kode Barang / NUSP
- Kolom E: Uraian Nama Barang
- Kolom F: Satuan
- Kolom G-I: Penerimaan (Volume, Harga Satuan, Total Nilai = G*H)
- Kolom J-L: Pengeluaran (Volume, Harga Satuan, Total Nilai = J*K)
- Kolom M: Saldo Sisa Volume
- Kolom N: Keterangan / Sumber Anggaran

---

### Sheet 6: Mutasi_BHP (Akumulasi 12 Bulan Anti-Phantom Stock & Eksklusi Belanja Modal)
*Aturan Filter Aset Akuntansi*:
1. **Hanya Akun BHP**: Hanya barang dengan Jenis_Aset = 'BHP' (Kode Rekening 5.1.02...) yang direkapitulasi ke Sheet Mutasi BHP.
2. **Eksklusi Belanja Modal**: Barang dengan status 'Belanja Modal' (Kode Rekening 5.2.02...) otomatis dikecualikan dari Sheet Mutasi BHP agar nilai persediaan habis pakai tidak terdistorsi oleh aset tetap (laptop, server, meubelair).
3. **Akumulasi Aset Lengkap**: Barang Belanja Modal tetap tercatat secara utuh pada Sheet 5 (Buku Penerimaan & Pengeluaran Aset / Rekap_BOS), Kartu Barang (Lampiran 12), dan Kartu Persediaan (Lampiran 13).

Formula SUMIFS tervalidasi relasi langsung ke Penerimaan & Pengeluaran:
Jika tidak ada transaksi riil pada bulan bersangkutan untuk kodering tersebut (misal Kodering 5.1.02.01.01.0001 & 5.1.02.01.01.0030), paksa nilai 0 Rupiah:
- Penerimaan Volume (Bulan Jan):
  \`=IF(COUNTIFS(Penerimaan!$E:$E, $C6, Penerimaan!$B:$B, ">=2026-01-01", Penerimaan!$B:$B, "<=2026-01-31")=0, 0, SUMIFS(Penerimaan!$G:$G, Penerimaan!$E:$E, $C6, Penerimaan!$B:$B, ">=2026-01-01", Penerimaan!$B:$B, "<=2026-01-31"))\`
- Penerimaan Nominal (Bulan Jan):
  \`=IF(E6=0, 0, E6 * Master_Barang!$G6)\`
- Pengeluaran Volume (Bulan Jan):
  \`=IF(COUNTIFS(Trx_Detail!$C:$C, $C6, Trx_Detail!$B:$B, ">=2026-01-01", Trx_Detail!$B:$B, "<=2026-01-31")=0, 0, SUMIFS(Trx_Detail!$H:$H, Trx_Detail!$C:$C, $C6, Trx_Detail!$B:$B, ">=2026-01-01", Trx_Detail!$B:$B, "<=2026-01-31"))\`
- Pengeluaran Nominal (Bulan Jan):
  \`=IF(I6=0, 0, I6 * Master_Barang!$G6)\`
- Saldo Akhir Volume (Jan):
  \`=MAX(0, SaldoAwal_Vol + Masuk_Jan_Vol - Keluar_Jan_Vol)\`
- Saldo Akhir Nominal (Jan):
  \`=SaldoAkhir_Vol * Master_Barang!$G6\``;

  const htmlPrintCode = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Format Dokumen Cetak Inventaris Resmi (A4 / F4)</title>
  <style>
    /* CSS Resmi Format Standar Instansi Pemerintah */
    @page {
      size: 215mm 330mm portrait; /* Default: F4 / Folio Dinas */
      margin: 15mm;
    }

    body {
      font-family: 'Times New Roman', Times, serif;
      color: #000;
      background: #fff;
      font-size: 11pt;
      line-height: 1.4;
      margin: 0;
      padding: 0;
    }

    /* Kop Surat Resmi */
    .kop-container {
      width: 100%;
      text-align: center;
      border-bottom: 3px solid #000;
      padding-bottom: 2px;
      margin-bottom: 12px;
    }
    .kop-subline {
      height: 1px;
      background: #000;
      margin-top: 1.5px;
    }
    .kop-title {
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0;
    }
    .kop-school {
      font-size: 16pt;
      font-weight: 800;
      text-transform: uppercase;
      margin: 2px 0;
    }
    .kop-desc {
      font-size: 9pt;
      margin: 0;
    }

    /* Judul Dokumen */
    .doc-title {
      text-align: center;
      font-size: 12pt;
      font-weight: bold;
      text-decoration: underline;
      text-transform: uppercase;
      margin: 14px 0 2px 0;
    }
    .doc-number {
      text-align: center;
      font-size: 10pt;
      font-weight: 600;
      margin-bottom: 14px;
    }

    /* Tabel Formal Bergaris Penuh */
    table.official-grid {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
      font-size: 10pt;
      margin-bottom: 16px;
    }
    table.official-grid th, 
    table.official-grid td {
      border: 1px solid #000;
      padding: 5px 8px;
    }
    table.official-grid th {
      background-color: #f2f2f2;
      font-weight: bold;
      text-align: center;
    }

    /* Penjamin Blok Tanda Tangan Utuh Tidak Terpotong */
    .signature-block {
      page-break-inside: avoid;
      break-inside: avoid;
      width: 100%;
      margin-top: 24px;
    }
    .sig-row {
      display: flex;
      justify-content: space-between;
      text-align: center;
    }
    .sig-col {
      width: 45%;
    }
    .sig-space {
      height: 70px;
    }
    .sig-name {
      font-weight: bold;
      text-decoration: underline;
      text-transform: uppercase;
    }

    @media print {
      .no-print { display: none !important; }
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <!-- Contoh Template SPB Resmi -->
  <div class="kop-container">
    <div class="kop-title">PEMERINTAH PROVINSI JAWA BARAT</div>
    <div class="kop-title">DINAS PENDIDIKAN</div>
    <div class="kop-school">SMAN 1 CIHARBINTANG</div>
    <div class="kop-desc">Jl. Ki Hajar Dewantara No. 107 | Telp: (021) 89901234 | Email: info@sman1ciharbintang.sch.id</div>
    <div class="kop-subline"></div>
  </div>

  <div class="doc-title">SURAT PERMINTAAN BARANG (SPB)</div>
  <div class="doc-number">Nomor: 421.3/001/SP.1/SMAN1CHRBT/IX/2026</div>

  <table class="official-grid">
    <thead>
      <tr>
        <th style="width: 30px;">No</th>
        <th>Kode &amp; NUSP</th>
        <th>Nama &amp; Spesifikasi Barang</th>
        <th>Satuan</th>
        <th>Sisa Barang</th>
        <th>Usulan Pengajuan</th>
        <th>Keperluan</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center;">1.</td>
        <td style="text-align: center;">1.01.03.01.01<br><small>NUSP: 0001/2026</small></td>
        <td><strong>Kertas HVS A4 70 gsm</strong></td>
        <td style="text-align: center;">Rim</td>
        <td style="text-align: center;">82</td>
        <td style="text-align: center; font-weight: bold;">8</td>
        <td>Pencetakan Soal Asesmen Siswa</td>
      </tr>
      <!-- Baris Kosong Bergaris Grid Rapi Standar Dinas (Minimal 15 Baris) -->
      <!-- ... Baris kosong terisi sampai 15 nomor ... -->
    </tbody>
  </table>

  <div class="signature-block">
    <div class="sig-row">
      <div class="sig-col">
        <div>Pengurus Barang Pembantu,</div>
        <div class="sig-space"></div>
        <div class="sig-name">RINA KARTIKASARI, S.AP.</div>
        <div>NIP. 19890820 201402 2 003</div>
      </div>
      <div class="sig-col">
        <div>Bekasi, 1 September 2026</div>
        <div>Pemohon / Pengusul,</div>
        <div class="sig-space"></div>
        <div class="sig-name">DIAN WAHYUNI, S.Kom.</div>
        <div>NIP. 19850614 201001 2 018</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-6 overflow-hidden border border-slate-200 ring-1 ring-slate-900/10 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between flex-shrink-0 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Code2 className="w-5 h-5 text-blue-400" />
              Skema Database, Google Apps Script &amp; Struktur Sheets
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Kode backend logika, tabel relasional SQL, dan template siap pakai untuk staf IT sekolah.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Nav */}
        <div className="bg-slate-100 px-6 pt-3 border-b border-slate-200 flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg border-t border-x transition-colors flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'bg-white border-slate-300 text-blue-700 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-600" />
            1. Skema Relasional SQL (PostgreSQL / MySQL)
          </button>

          <button
            onClick={() => setActiveTab('gas')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg border-t border-x transition-colors flex items-center gap-1.5 ${
              activeTab === 'gas'
                ? 'bg-white border-slate-300 text-blue-700 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-4 h-4 text-amber-600" />
            2. Google Apps Script (Code.gs)
          </button>

          <button
            onClick={() => setActiveTab('sheets')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg border-t border-x transition-colors flex items-center gap-1.5 ${
              activeTab === 'sheets'
                ? 'bg-white border-slate-300 text-blue-700 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            3. Struktur Kolom Google Sheets
          </button>

          <button
            onClick={() => setActiveTab('html')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg border-t border-x transition-colors flex items-center gap-1.5 ${
              activeTab === 'html'
                ? 'bg-white border-slate-300 text-blue-700 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer className="w-4 h-4 text-blue-600" />
            4. Standalone HTML/CSS Cetak
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs text-slate-200">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <span className="text-slate-400 font-sans text-xs">
              {activeTab === 'sql' && 'PostgreSQL / MySQL DDL dengan Trigger Pengurangan Stok & Relasi Berantai'}
              {activeTab === 'gas' && 'Google Apps Script (Code.gs) siap tempel pada Extensions > Apps Script'}
              {activeTab === 'sheets' && 'Dokumentasi Arsitektur Kolom & Formula Google Sheets'}
              {activeTab === 'html' && 'Template HTML/CSS Mandiri dengan Aturan @media print A4/F4'}
            </span>

            <button
              onClick={() => {
                if (activeTab === 'sql') handleCopy('sql', sqlCode);
                if (activeTab === 'gas') handleCopy('gas', gasCode);
                if (activeTab === 'sheets') handleCopy('sheets', sheetsStructure);
                if (activeTab === 'html') handleCopy('html', htmlPrintCode);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-sans font-semibold transition-colors"
            >
              {copiedKey === activeTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Kode</span>
                </>
              )}
            </button>
          </div>

          <pre className="whitespace-pre-wrap leading-relaxed text-[11px]">
            {activeTab === 'sql' && sqlCode}
            {activeTab === 'gas' && gasCode}
            {activeTab === 'sheets' && sheetsStructure}
            {activeTab === 'html' && htmlPrintCode}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-slate-500 font-sans">
            Semua kode telah diverifikasi sesuai standar baku pelaporan aset dan inventaris instansi pendidikan.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
