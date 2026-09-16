import { Barang, GoogleSheetFileItem, KopSuratConfig, TransaksiPenerimaan, TransaksiPengeluaran } from '../types';

interface SheetDetails {
  spreadsheetId: string;
  title: string;
  sheets: Array<{
    sheetId: number;
    title: string;
  }>;
}

/**
 * List existing Google Spreadsheets in user's Google Drive
 */
export async function listUserSpreadsheets(accessToken: string): Promise<GoogleSheetFileItem[]> {
  try {
    const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const fields = encodeURIComponent('files(id,name,modifiedTime,webViewLink)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime desc&pageSize=20`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Gagal mengambil daftar spreadsheet (${res.status})`);
    }

    const data = await res.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      modifiedTime: f.modifiedTime,
      webViewLink: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
    }));
  } catch (error: any) {
    console.error('Error listUserSpreadsheets:', error);
    throw error;
  }
}

/**
 * Fetch spreadsheet metadata and list of sheet tabs
 */
export async function getSpreadsheetDetails(accessToken: string, spreadsheetId: string): Promise<SheetDetails> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties(sheetId,title)`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Gagal mengakses spreadsheet (${res.status})`);
  }

  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Untitled Spreadsheet',
    sheets: (data.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title,
    })),
  };
}

/**
 * Creates a brand new official Google Spreadsheet for SIMBA Inventaris
 */
export async function createInventorySpreadsheet(
  accessToken: string,
  schoolName: string,
  initialData?: {
    masterBarang?: Barang[];
    transaksiList?: TransaksiPengeluaran[];
    penerimaanList?: TransaksiPenerimaan[];
    kopConfig?: KopSuratConfig;
  }
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  const cleanSchool = schoolName?.trim() || 'Sekolah';
  const year = new Date().getFullYear();
  const title = `SIMBA BOS - Inventaris & Pengeluaran [${cleanSchool}] ${year}`;

  const requestBody = {
    properties: {
      title,
    },
    sheets: [
      { properties: { title: 'Master_Barang' } },
      { properties: { title: 'Log_Penyaluran_BOS' } },
      { properties: { title: 'Penerimaan_BOS' } },
      { properties: { title: 'Kop_Instansi' } },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Gagal membuat spreadsheet baru (${createRes.status})`);
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Populate headers and any initial data
  await syncAllDataToSpreadsheet(accessToken, spreadsheetId, {
    masterBarang: initialData?.masterBarang || [],
    transaksiList: initialData?.transaksiList || [],
    penerimaanList: initialData?.penerimaanList || [],
    kopConfig: initialData?.kopConfig,
  });

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
  };
}

/**
 * Ensure the required sheets exist in the spreadsheet
 */
async function ensureSheetTabsExist(accessToken: string, spreadsheetId: string, requiredSheetTitles: string[]) {
  const details = await getSpreadsheetDetails(accessToken, spreadsheetId);
  const existingTitles = new Set(details.sheets.map(s => s.title));

  const addSheetRequests: any[] = [];
  for (const title of requiredSheetTitles) {
    if (!existingTitles.has(title)) {
      addSheetRequests.push({
        addSheet: {
          properties: { title },
        },
      });
    }
  }

  if (addSheetRequests.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: addSheetRequests }),
    });
  }
}

/**
 * Synchronize all app data (Master Barang, Log Penyaluran, Penerimaan, Kop) into Google Sheets
 */
export async function syncAllDataToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  data: {
    masterBarang: Barang[];
    transaksiList: TransaksiPengeluaran[];
    penerimaanList: TransaksiPenerimaan[];
    kopConfig?: KopSuratConfig;
  }
): Promise<void> {
  // Ensure the tabs exist
  await ensureSheetTabsExist(accessToken, spreadsheetId, [
    'Master_Barang',
    'Log_Penyaluran_BOS',
    'Penerimaan_BOS',
    'Kop_Instansi',
  ]);

  // 1. Data Sheet: Master_Barang
  const masterHeader = [
    'Kode Barang',
    'Nama Barang',
    'Kategori',
    'Satuan',
    'Harga Satuan (Rp)',
    'Stok Awal',
    'Stok Sisa',
    'Kode Rekening',
    'Nama Rekening Belanja',
    'NUSP',
    'Spesifikasi',
    'Lokasi Gudang',
    'ID Sistem'
  ];

  const masterRows = data.masterBarang.map(b => [
    b.kodeBarang,
    b.namaBarang,
    b.kategori,
    b.satuan,
    b.hargaSatuan,
    b.stokAwal,
    b.stokSekarang,
    b.kodeRekening,
    b.namaRekening,
    b.nusp || '',
    b.spesifikasi || '',
    b.lokasiGudang || '',
    b.id
  ]);

  // 2. Data Sheet: Log_Penyaluran_BOS
  const logHeader = [
    'ID Transaksi',
    'Tanggal',
    'No. NPB',
    'No. SPB',
    'No. SPPB',
    'No. BAST',
    'Unit / Ruang Pemohon',
    'Keperluan',
    'Jumlah Jenis Item',
    'Total Kuantitas',
    'Total Nilai (Rp)',
    'Rincian Barang'
  ];

  const logRows = data.transaksiList.map(t => {
    const totalQty = t.items.reduce((acc, it) => acc + (it.usulanJumlah || 0), 0);
    const totalVal = t.items.reduce((acc, it) => acc + ((it.usulanJumlah || 0) * (it.hargaSatuan || 0)), 0);
    const itemsSummary = t.items.map(it => `${it.namaBarang} (${it.usulanJumlah} ${it.satuan})`).join('; ');

    return [
      t.id,
      t.tanggal,
      t.noNPB,
      t.noSPB,
      t.noSPPB,
      t.noBAST,
      t.unitPemohon,
      t.keperluanUmum || '',
      t.items.length,
      totalQty,
      totalVal,
      itemsSummary
    ];
  });

  // 3. Data Sheet: Penerimaan_BOS
  const penerimaanHeader = [
    'ID Penerimaan',
    'Tanggal',
    'No. Bukti / Faktur',
    'Sumber Dana',
    'Penyedia / Toko',
    'Total Nilai (Rp)',
    'Jumlah Item',
    'Keterangan',
    'Daftar Barang Masuk'
  ];

  const penerimaanRows = (data.penerimaanList || []).map(p => {
    const itemsSummary = (p.items || []).map(it => `${it.namaBarang} (+${it.jumlahMasuk} ${it.satuan})`).join('; ');
    return [
      p.id,
      p.tanggal,
      p.noBukti,
      p.sumberDana,
      p.penyedia,
      p.totalNilai,
      p.items?.length || 0,
      p.keterangan || '',
      itemsSummary
    ];
  });

  // 4. Data Sheet: Kop_Instansi
  const kopHeader = ['Parameter', 'Nilai Konfigurasi'];
  const kopRows = data.kopConfig ? [
    ['Pemerintah Daerah', data.kopConfig.pemerintahDaerah],
    ['Dinas Pendidikan', data.kopConfig.dinasPendidikan],
    ['Cabang Dinas', data.kopConfig.cabangDinas || ''],
    ['Nama Sekolah', data.kopConfig.namaSekolah],
    ['Alamat Lengkap', data.kopConfig.alamatLengkap],
    ['Email & Website', data.kopConfig.emailWebsite],
    ['NPSN', data.kopConfig.npsn],
    ['Kota Tanda Tangan', data.kopConfig.kotaSurat],
    ['Waktu Sinkronisasi Terakhir', new Date().toLocaleString('id-ID')]
  ] : [];

  // Batch clear and batch update values
  const rangesToUpdate = [
    {
      range: 'Master_Barang!A1:Z5000',
      values: [masterHeader, ...masterRows],
    },
    {
      range: 'Log_Penyaluran_BOS!A1:Z5000',
      values: [logHeader, ...logRows],
    },
    {
      range: 'Penerimaan_BOS!A1:Z5000',
      values: [penerimaanHeader, ...penerimaanRows],
    },
    {
      range: 'Kop_Instansi!A1:Z100',
      values: [kopHeader, ...kopRows],
    }
  ];

  // First clear ranges
  for (const item of rangesToUpdate) {
    const sheetTab = item.range.split('!')[0];
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTab + '!A1:Z5000')}:clear`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }).catch(err => console.warn('Clear error (non-fatal):', err));
  }

  // Write new values
  const batchBody = {
    valueInputOption: 'USER_ENTERED',
    data: rangesToUpdate,
  };

  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(batchBody),
  });

  if (!updateRes.ok) {
    const errData = await updateRes.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Gagal menyimpan data ke Google Sheets (${updateRes.status})`);
  }
}

/**
 * Import Master Barang from a Google Sheet tab
 */
export async function importMasterBarangFromSheet(
  accessToken: string,
  spreadsheetId: string,
  preferredSheetTitle?: string
): Promise<{ items: Barang[]; warnings: string[]; sheetUsed: string }> {
  const details = await getSpreadsheetDetails(accessToken, spreadsheetId);
  if (!details.sheets || details.sheets.length === 0) {
    throw new Error('Spreadsheet tidak memiliki lembar kerja (sheet) yang dapat dibaca.');
  }

  // Determine target sheet
  let targetSheet = details.sheets.find(s => s.title.toLowerCase() === 'master_barang' || s.title.toLowerCase() === 'master barang');
  if (!targetSheet && preferredSheetTitle) {
    targetSheet = details.sheets.find(s => s.title.toLowerCase() === preferredSheetTitle.toLowerCase());
  }
  if (!targetSheet) {
    targetSheet = details.sheets[0];
  }

  const range = `${targetSheet.title}!A1:Z1500`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Gagal membaca sheet ${targetSheet.title} (${res.status})`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  if (rows.length < 2) {
    return {
      items: [],
      warnings: [`Sheet "${targetSheet.title}" tidak memiliki baris data (hanya header atau kosong).`],
      sheetUsed: targetSheet.title,
    };
  }

  const headers = rows[0].map((h: any) => String(h || '').trim().toLowerCase());

  // Find column indices
  const findCol = (keywords: string[]) => {
    return headers.findIndex(h => keywords.some(k => h.includes(k.toLowerCase())));
  };

  const colNama = findCol(['nama barang', 'nama', 'barang', 'uraian']);
  const colKode = findCol(['kode barang', 'kode_barang', 'kode']);
  const colRekening = findCol(['kode rekening', 'rekening', 'kode_rekening']);
  const colNamaRekening = findCol(['nama rekening', 'nama_rekening', 'rekening belanja']);
  const colKategori = findCol(['kategori', 'kelompok']);
  const colSatuan = findCol(['satuan', 'unit']);
  const colHarga = findCol(['harga satuan', 'harga', 'tarif', 'nilai']);
  const colStokSekarang = findCol(['stok sekarang', 'stok sisa', 'sisa', 'stok']);
  const colStokAwal = findCol(['stok awal', 'saldo awal', 'awal']);
  const colNUSP = findCol(['nusp', 'no urut', 'register']);
  const colSpesifikasi = findCol(['spesifikasi', 'spek', 'merk', 'tipe']);
  const colLokasi = findCol(['lokasi gudang', 'lokasi', 'gudang', 'ruang']);

  if (colNama === -1) {
    throw new Error(`Kolom "Nama Barang" tidak ditemukan pada sheet "${targetSheet.title}". Pastikan ada kolom nama barang di baris pertama.`);
  }

  const items: Barang[] = [];
  const warnings: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawNama = String(row[colNama] || '').trim();
    if (!rawNama) continue;

    const parseNum = (val: any, def: number) => {
      if (typeof val === 'number') return val;
      if (!val) return def;
      // remove currency symbols and dots as thousands separators
      const cleaned = String(val).replace(/[Rp\s\.]/gi, '').replace(',', '.');
      const n = parseFloat(cleaned);
      return isNaN(n) ? def : n;
    };

    const harga = colHarga !== -1 ? parseNum(row[colHarga], 0) : 0;
    const stokSekarang = colStokSekarang !== -1 ? parseNum(row[colStokSekarang], 0) : 0;
    const stokAwal = colStokAwal !== -1 ? parseNum(row[colStokAwal], stokSekarang) : stokSekarang;

    // Validate or sanitize kategori
    let kategori: Barang['kategori'] = 'Perlengkapan Umum';
    if (colKategori !== -1 && row[colKategori]) {
      const rawKat = String(row[colKategori]).toLowerCase();
      if (rawKat.includes('atk') || rawKat.includes('kertas')) {
        kategori = 'ATK / Kertas';
      } else if (rawKat.includes('bersih') || rawKat.includes('kebersihan')) {
        kategori = 'Kebersihan';
      } else if (rawKat.includes('elektronik') || rawKat.includes('komputer')) {
        kategori = 'Elektronik & Komputer';
      } else if (rawKat.includes('praktik') || rawKat.includes('peraga')) {
        kategori = 'Alat Praktik/Peraga';
      } else if (rawKat.includes('material') || rawKat.includes('bahan')) {
        kategori = 'Bahan Material';
      }
    }

    const item: Barang = {
      id: `brg-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      namaBarang: rawNama,
      kodeBarang: colKode !== -1 && row[colKode] ? String(row[colKode]).trim() : `1.01.03.01.${String(i).padStart(2, '0')}`,
      nusp: colNUSP !== -1 && row[colNUSP] ? String(row[colNUSP]).trim() : `${String(i).padStart(4, '0')}/${new Date().getFullYear()}`,
      satuan: colSatuan !== -1 && row[colSatuan] ? String(row[colSatuan]).trim() : 'Pcs',
      hargaSatuan: harga,
      stokAwal: Math.max(0, stokAwal),
      stokSekarang: Math.max(0, stokSekarang),
      kodeRekening: colRekening !== -1 && row[colRekening] ? String(row[colRekening]).trim() : '5.1.02.01.01.0024',
      namaRekening: colNamaRekening !== -1 && row[colNamaRekening] ? String(row[colNamaRekening]).trim() : 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
      kategori,
      spesifikasi: colSpesifikasi !== -1 && row[colSpesifikasi] ? String(row[colSpesifikasi]).trim() : undefined,
      lokasiGudang: colLokasi !== -1 && row[colLokasi] ? String(row[colLokasi]).trim() : 'Gudang Inventaris Utama',
    };

    items.push(item);
  }

  return {
    items,
    warnings,
    sheetUsed: targetSheet.title,
  };
}
