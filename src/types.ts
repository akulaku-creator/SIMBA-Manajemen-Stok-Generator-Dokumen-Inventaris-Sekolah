export interface Sekolah {
  id: string; // e.g. 'sekolah-smkn1-kota', 'sekolah-sman1-cihaurbeuti', 'sekolah-smkn2-bandung'
  nama: string; // Nama Satuan Pendidikan
  nama_sekolah?: string; // Alias nama_sekolah sesuai spesifikasi
  npsn: string; // 8 digit NPSN resmi
  alamat?: string;
  desa_kelurahan?: string;
  kecamatan?: string;
  kabupaten_kota?: string;
  kota?: string; // Kompatibilitas mundur
  provinsi?: string;
  kode_pos?: string;
  logo?: string; // Path atau data URI logo
  kop_surat?: string; // Format teks kop surat atau deskripsi kop
  email?: string;
  telepon?: string;
  status?: 'Negeri' | 'Swasta' | 'aktif' | 'nonaktif' | string;
  jenjang?: 'SD' | 'SMP' | 'SMA' | 'SMK';
  website?: string;
  kepalaSekolahNama?: string;
  kepalaSekolahNip?: string;
  isActive?: boolean;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PaperSize = 'A4' | 'F4';

/**
 * Daftar opsi Tahun Anggaran resmi hingga tahun 2033
 */
export const TAHUN_ANGGARAN_OPTIONS: number[] = [2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];

export type DocumentType = 
  | 'npb' 
  | 'spb' 
  | 'sppb' 
  | 'bast' 
  | 'ba_so' 
  | 'bast_stock_opname'
  | 'buku_penerimaan' 
  | 'buku_pengeluaran' 
  | 'buku_rekap' 
  | 'bundle'
  | 'kartu_barang'
  | 'kartu_persediaan'
  | 'mutasi_bos'
  | 'rekap_kodering';

export type KartuBarangPeriodType = 'bulan' | 'triwulan' | 'semester' | 'tahun';

export interface KartuBarangPeriodFilter {
  type: KartuBarangPeriodType;
  year: number;
  month?: number; // 0-11
  triwulan?: 1 | 2 | 3 | 4; // 1: Jan-Mar, 2: Apr-Jun, 3: Jul-Sep, 4: Okt-Des
  semester?: 1 | 2; // 1: Jan-Jun, 2: Jul-Des
}

export type JenisBarang = 'BHP' | 'Belanja Modal';

export interface KategoriBarangItem {
  id: string;
  nama: string;
  prefixKode?: string;
  kodeRekening?: string; // Standard Government Expenditure Account (e.g. 5.1.02.01.01.0024)
  namaRekening?: string; // Official account description
  jenisDefault?: JenisBarang;
  deskripsi?: string;
}

export interface KodeRekening {
  kode: string; // e.g. "5.1.02.01.01.0024" or "5.2.02.05.01.0005"
  nama: string; // e.g. "Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor"
  kategori: string; // e.g. "Bahan Pakai Habis"
  jenisAset?: JenisBarang;
}

export const DAFTAR_JABATAN_KEDINASAN = [
  'Guru',
  'Tenaga Kependidikan',
  'Kepala Sekolah',
  'Kepala Laboratorium',
  'Wakasek',
  'Caraka',
  'Satpam',
  'Pengurus Barang Pembantu'
] as const;

export type JabatanKedinasan = typeof DAFTAR_JABATAN_KEDINASAN[number];

export interface Pejabat {
  id: string;
  sekolah_id?: string;
  nama: string;
  nip: string;
  pangkatGolongan: string; // e.g. "Pembina / IV a", "Penata Muda / III a"
  jabatan: string; // e.g. "Kepala Sekolah", "Wakasek", "Pengurus Barang Pembantu"
  unitKerja?: string;
  role?: string;
  peran?: string;
}

export interface Barang {
  id: string;
  sekolah_id?: string;
  kodeBarang: string; // e.g. "1.01.03.01.01" atau "1.03.02.01.01"
  nusp: string; // Nomor Urut Pendaftaran Barang, e.g. "0001/2026"
  namaBarang: string;
  spesifikasi?: string;
  kodeRekening: string; // Standard Government Expenditure Account (5.1.02... / 5.2.02...)
  namaRekening: string;
  kategori: string;
  satuan: string; // Rim, Box, Buah, Botol, Pcs, Pak, Unit, Set, Zak, etc.
  hargaSatuan: number;
  stokAwal: number;
  stokSekarang: number;
  lokasiGudang?: string;
  jenisBarang?: JenisBarang; // 'BHP' (Barang Habis Pakai) vs 'Belanja Modal' (Aset Tetap)
}

export interface PengajuanItem {
  id: string;
  barangId: string;
  kodeBarang: string;
  nusp: string;
  kodeRekening?: string;
  namaRekening?: string;
  namaBarang: string;
  spesifikasi?: string;
  satuan: string;
  sisaBarang: number; // current stock before disbursement
  usulanJumlah: number; // quantity requested
  hargaSatuan: number;
  keperluan: string; // purpose/destination
}

export interface TransaksiPengeluaran {
  id: string;
  sekolah_id?: string;
  nomorUrut: number;
  tanggal: string; // YYYY-MM-DD
  unitPemohon: string; // e.g. "Subbag Tata Usaha / Lab IPA"
  keperluanUmum: string;
  
  // Linked Official Document Numbers
  noNPB: string;   // e.g. "012/NPB/SMAN1CHRBT/IX/2026"
  noSPB: string;   // e.g. "421.3/012/SPB-SMAN1CHRBT/IX/2026"
  noSPPB: string;  // e.g. "028/012/SPPB-SMAN1CHRBT/IX/2026"
  noBAST: string;  // e.g. "028/012/BAST-SMAN1CHRBT/IX/2026"
  
  items: PengajuanItem[];
  
  // Signatories
  pemohonId: string;
  pemohonNama?: string;
  pemohonNip?: string;
  sarprasId: string;
  pengurusBarangId: string;
  kepsekId: string;
  
  catatan?: string;
  status?: 'diajukan' | 'disetujui' | 'disalurkan';
  createdAt: string;
}

export interface ItemPenerimaan {
  barangId: string;
  namaBarang: string;
  kodeBarang: string;
  nusp: string;
  kodeRekening?: string;
  namaRekening?: string;
  satuan: string;
  jumlahMasuk: number;
  hargaSatuan: number;
  subtotal: number;
}

export interface TransaksiPenerimaan {
  id: string;
  sekolah_id?: string;
  tanggal: string; // YYYY-MM-DD
  noBukti: string; // e.g. "BOS-REG/09/2026/041"
  sumberDana: 'BOS Reguler' | 'BOS Kinerja' | 'BPOPP / APBD' | 'Komite / Hibah';
  penyedia: string; // e.g. "CV. Mitra Edukasi Sarana"
  items: ItemPenerimaan[];
  totalNilai: number;
  penerimaId: string; // Pejabat Pengurus Barang
  keterangan: string;
}

export interface KopSuratConfig {
  sekolah_id?: string;
  pemerintahDaerah: string; // e.g. "PEMERINTAH PROVINSI JAWA TIMUR"
  dinasPendidikan: string;  // e.g. "DINAS PENDIDIKAN"
  cabangDinas: string;      // e.g. "CABANG DINAS PENDIDIKAN WILAYAH SURABAYA"
  namaSekolah: string;      // e.g. "SMK NEGERI 1 GRAFIKA INDONESIA"
  alamatLengkap: string;    // e.g. "Jl. Pendidikan No. 45, Telp. (031) 8291234, Kota Surabaya 60231"
  emailWebsite: string;     // e.g. "Email: info@smkn1grafika.sch.id | Website: www.smkn1grafika.sch.id"
  npsn: string;             // e.g. "20531234"
  kotaSurat: string;        // e.g. "Surabaya"

  // Legacy field support for left logo
  logoUrl?: string;         // Preset or base64 or custom URL
  logoType?: 'tutwuri' | 'pemda' | 'custom' | 'none';

  // Specific Left Logo (Logo Provinsi / Pemda / Dinas)
  logoProvinsiUrl?: string;
  logoProvinsiType?: 'pemda' | 'tutwuri' | 'custom' | 'none';
  tampilkanLogoProvinsi?: boolean;

  // Specific Right Logo (Logo Sekolah / Lambang Satuan Pendidikan)
  logoSekolahUrl?: string;
  logoSekolahType?: 'tutwuri' | 'smk' | 'sma' | 'custom' | 'none';
  tampilkanLogoSekolah?: boolean;
}

export interface NumberingPatternConfig {
  sekolah_id?: string;
  schoolCode: string;
  patternNPB: string;  // e.g. "{NO}/NPB/{SEKOLAH}/{BULAN_ROMAN}/{TAHUN}"
  patternSPB: string;  // e.g. "421.3/{NO}/SPB-{SEKOLAH}/{BULAN_ROMAN}/{TAHUN}"
  patternSPPB: string; // e.g. "028/{NO}/SPPB-{SEKOLAH}/{BULAN_ROMAN}/{TAHUN}"
  patternBAST: string; // e.g. "028/{NO}/BAST-{SEKOLAH}/{BULAN_ROMAN}/{TAHUN}"
  patternBASO: string; // e.g. "028/{NO}/BAST-SO-BOS/{BULAN_ROMAN}/{TAHUN}"
  startCounterNPB?: number;
  startCounterSPB?: number;
  startCounterSPPB?: number;
  startCounterBAST?: number;
  startCounterBASO?: number;
}

export interface StockOpnameCategorySummary {
  kodeRekening: string;
  namaRekening: string;
  saldoAwalNilai: number;
  penerimaanNilai: number;
  pengeluaranNilai: number;
  sisaFisikNilai: number;
}

export type UserRole = 'super_admin' | 'admin' | 'operator' | 'pengguna';

export interface AppUser {
  id: string;
  sekolah_id?: string; // undefined or 'all' for super_admin (Dinas)
  nama: string;
  username: string;
  role: UserRole;
  pin?: string;
  password?: string;
  nip?: string;
  jabatan?: string;
  unitKerja?: string;
  email?: string;
  avatarColor?: string;
}

export type AuditAction = 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'RESET_TRANSAKSI' 
  | 'TAMBAH_TRANSAKSI' 
  | 'EDIT_TRANSAKSI'
  | 'HAPUS_TRANSAKSI'
  | 'TAMBAH_PENERIMAAN' 
  | 'EDIT_PENERIMAAN'
  | 'HAPUS_PENERIMAAN'
  | 'REVERSI_STOK'
  | 'TAMBAH_BARANG'
  | 'EDIT_BARANG'
  | 'HAPUS_BARANG'
  | 'TAMBAH_SEKOLAH'
  | 'UPDATE_SEKOLAH'
  | 'HAPUS_SEKOLAH'
  | 'UPDATE_USER' 
  | 'HAPUS_USER' 
  | 'UPDATE_KOP' 
  | 'UPDATE_NOMOR'
  | 'SWITCH_SEKOLAH'
  | 'EXPORT_DATA'
  | 'RESTORE_DATABASE'
  | 'SECURITY_CHECK'
  | 'VERIFIKASI_DOKUMEN'
  | 'ANOMALY_DETECTED';

export type AuditSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuditLog {
  id: string;
  sekolah_id?: string;
  nama_sekolah?: string;
  timestamp: string; // ISO string
  formattedDate: string; // Indonesian formatted date/time
  userId: string;
  username: string;
  userName: string;
  userRole: UserRole;
  action: AuditAction | string;
  title: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  severity?: AuditSeverity;
  ipAddress?: string;
  deviceInfo?: string;
  meta?: Record<string, unknown>;
}

export interface GoogleSheetFileItem {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface GoogleSheetSyncConfig {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  lastSyncedAt?: string;
  autoSyncOnChange?: boolean;
}

export interface GitHubSyncConfig {
  personalAccessToken: string;
  repoOwner: string;
  repoName: string;
  branch: string;
  filePath?: string;
  lastSyncedAt?: string;
  lastCommitSha?: string;
  lastCommitUrl?: string;
}
