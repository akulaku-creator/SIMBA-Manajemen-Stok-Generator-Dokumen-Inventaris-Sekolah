import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table synced with Firebase Authentication UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 1. Tabel Kategori & Kode Rekening Belanja (Single Source of Truth)
export const kategoriRekening = pgTable('kategori_rekening', {
  id: serial('id').primaryKey(),
  clientId: text('client_id').unique(),
  kodeRekening: varchar('kode_rekening', { length: 50 }).notNull().unique(),
  namaKategori: varchar('nama_kategori', { length: 150 }).notNull(),
  jenisBelanja: varchar('jenis_belanja', { length: 20 }).notNull().default('BHP'),
  prefixKode: varchar('prefix_kode', { length: 50 }),
  deskripsi: text('deskripsi'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Tabel Master Barang Inventaris & NUSP
export const masterBarang = pgTable(
  'master_barang',
  {
    id: serial('id').primaryKey(),
    clientId: text('client_id').unique(),
    kodeBarang: varchar('kode_barang', { length: 50 }).notNull(),
    nusp: varchar('nusp', { length: 50 }),
    namaBarang: varchar('nama_barang', { length: 200 }).notNull(),
    spesifikasi: text('spesifikasi'),
    satuan: varchar('satuan', { length: 30 }).notNull(),
    hargaSatuan: numeric('harga_satuan', { precision: 15, scale: 2 }).notNull().default('0.00'),
    stokAwal: integer('stok_awal').notNull().default(0),
    stokSaatIni: integer('stok_saat_ini').notNull().default(0),
    lokasiGudang: varchar('lokasi_gudang', { length: 100 }),
    kategoriId: integer('kategori_id').references(() => kategoriRekening.id, {
      onDelete: 'set null',
    }),
    kodeRekening: varchar('kode_rekening', { length: 50 }),
    namaRekening: varchar('nama_rekening', { length: 200 }),
    kategoriLabel: varchar('kategori_label', { length: 150 }),
    jenisAset: varchar('jenis_aset', { length: 20 }).notNull().default('BHP'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_dedup_key').on(table.namaBarang, table.kodeRekening, table.hargaSatuan),
  ]
);

// 3. Tabel Pejabat & Penandatangan (Beserta Path TTD & Stempel PNG)
export const pejabatPenandatangan = pgTable('pejabat_penandatangan', {
  id: serial('id').primaryKey(),
  clientId: text('client_id').unique(),
  peran: varchar('peran', { length: 40 }).notNull().default('PENGURUS_BARANG'),
  namaLengkap: varchar('nama_lengkap', { length: 150 }).notNull(),
  nip: varchar('nip', { length: 50 }),
  pangkatGolongan: varchar('pangkat_golongan', { length: 100 }),
  jabatanLabel: varchar('jabatan_label', { length: 150 }),
  unitKerja: varchar('unit_kerja', { length: 150 }),
  statusJabatan: varchar('status_jabatan', { length: 20 }).default('Definitif'),
  ttdPngPath: text('ttd_png_path'),
  stempelPngPath: text('stempel_png_path'),
  aktif: boolean('aktif').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. Tabel Transaksi Penerimaan Barang (Dana BOS)
export const transaksiPenerimaan = pgTable('transaksi_penerimaan', {
  id: serial('id').primaryKey(),
  clientId: text('client_id').unique(),
  noBukti: varchar('no_bukti', { length: 100 }).notNull(),
  tanggal: varchar('tanggal', { length: 20 }).notNull(),
  sumberDana: varchar('sumber_dana', { length: 80 }).notNull().default('BOS Reguler'),
  penyedia: varchar('penyedia', { length: 150 }).notNull().default(''),
  totalNilai: numeric('total_nilai', { precision: 15, scale: 2 }).notNull().default('0.00'),
  penerimaId: text('penerima_id'),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Tabel Detail Item Penerimaan
export const detailPenerimaan = pgTable('detail_penerimaan', {
  id: serial('id').primaryKey(),
  penerimaanId: integer('penerimaan_id')
    .notNull()
    .references(() => transaksiPenerimaan.id, { onDelete: 'cascade' }),
  barangId: integer('barang_id')
    .notNull()
    .references(() => masterBarang.id, { onDelete: 'restrict' }),
  barangClientId: text('barang_client_id'),
  namaBarangSnapshot: varchar('nama_barang_snapshot', { length: 200 }),
  kodeBarangSnapshot: varchar('kode_barang_snapshot', { length: 50 }),
  nuspSnapshot: varchar('nusp_snapshot', { length: 50 }),
  kodeRekeningSnapshot: varchar('kode_rekening_snapshot', { length: 50 }),
  namaRekeningSnapshot: varchar('nama_rekening_snapshot', { length: 200 }),
  spesifikasiSnapshot: text('spesifikasi_snapshot'),
  satuanSnapshot: varchar('satuan_snapshot', { length: 30 }),
  jumlah: integer('jumlah').notNull(),
  hargaSatuan: numeric('harga_satuan', { precision: 15, scale: 2 }).notNull(),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull(),
});

// 6. Tabel Transaksi Pengeluaran / Penyaluran (NPB/SPB/SPPB/BAST)
export const transaksiPenyaluran = pgTable('transaksi_penyaluran', {
  id: serial('id').primaryKey(),
  clientId: text('client_id').unique(),
  nomorUrut: integer('nomor_urut').notNull().default(1),
  noSpb: varchar('no_spb', { length: 100 }).notNull(),
  noNpb: varchar('no_npb', { length: 100 }),
  noSppb: varchar('no_sppb', { length: 100 }),
  noBast: varchar('no_bast', { length: 100 }),
  tanggal: varchar('tanggal', { length: 20 }).notNull(),
  unitPemohon: varchar('unit_pemohon', { length: 150 }).notNull(),
  keperluanUmum: text('keperluan_umum'),
  pemohonId: text('pemohon_id'),
  pemohonNama: varchar('pemohon_nama', { length: 150 }),
  pemohonNip: varchar('pemohon_nip', { length: 50 }),
  sarprasId: text('sarpras_id'),
  pengurusBarangId: text('pengurus_barang_id'),
  kepsekId: text('kepsek_id'),
  catatan: text('catatan'),
  status: varchar('status', { length: 30 }).notNull().default('disalurkan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Tabel Detail Item Pengeluaran / Penyaluran
export const detailPenyaluran = pgTable('detail_penyaluran', {
  id: serial('id').primaryKey(),
  penyaluranId: integer('penyaluran_id')
    .notNull()
    .references(() => transaksiPenyaluran.id, { onDelete: 'cascade' }),
  barangId: integer('barang_id')
    .notNull()
    .references(() => masterBarang.id, { onDelete: 'restrict' }),
  barangClientId: text('barang_client_id'),
  itemClientId: text('item_client_id'),
  namaBarangSnapshot: varchar('nama_barang_snapshot', { length: 200 }),
  kodeBarangSnapshot: varchar('kode_barang_snapshot', { length: 50 }),
  nuspSnapshot: varchar('nusp_snapshot', { length: 50 }),
  kodeRekeningSnapshot: varchar('kode_rekening_snapshot', { length: 50 }),
  namaRekeningSnapshot: varchar('nama_rekening_snapshot', { length: 200 }),
  spesifikasiSnapshot: text('spesifikasi_snapshot'),
  satuanSnapshot: varchar('satuan_snapshot', { length: 30 }),
  sisaBarangSnapshot: integer('sisa_barang_snapshot').default(0),
  jumlah: integer('jumlah').notNull(),
  hargaSatuan: numeric('harga_satuan', { precision: 15, scale: 2 }).notNull(),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull(),
  keperluan: text('keperluan'),
});

// 8. Tabel Log Audit & Sinkronisasi Sistem
export const logAktivitas = pgTable('log_aktivitas', {
  id: serial('id').primaryKey(),
  aksi: varchar('aksi', { length: 100 }).notNull(),
  modul: varchar('modul', { length: 50 }).notNull(),
  deskripsi: text('deskripsi'),
  actorEmail: varchar('actor_email', { length: 150 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. Pengaturan Instansi (Kop Surat, Pola Nomor Dokumen, Stempel, Daftar Akun App)
export const pengaturanInstansi = pgTable('pengaturan_instansi', {
  id: serial('id').primaryKey(),
  configKey: varchar('config_key', { length: 50 }).notNull().unique(),
  payload: jsonb('payload').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Drizzle Relations
export const kategoriRekeningRelations = relations(kategoriRekening, ({ many }) => ({
  barangList: many(masterBarang),
}));

export const masterBarangRelations = relations(masterBarang, ({ one, many }) => ({
  kategori: one(kategoriRekening, {
    fields: [masterBarang.kategoriId],
    references: [kategoriRekening.id],
  }),
  detailPenerimaan: many(detailPenerimaan),
  detailPenyaluran: many(detailPenyaluran),
}));

export const transaksiPenerimaanRelations = relations(transaksiPenerimaan, ({ many }) => ({
  details: many(detailPenerimaan),
}));

export const detailPenerimaanRelations = relations(detailPenerimaan, ({ one }) => ({
  penerimaan: one(transaksiPenerimaan, {
    fields: [detailPenerimaan.penerimaanId],
    references: [transaksiPenerimaan.id],
  }),
  barang: one(masterBarang, {
    fields: [detailPenerimaan.barangId],
    references: [masterBarang.id],
  }),
}));

export const transaksiPenyaluranRelations = relations(transaksiPenyaluran, ({ many }) => ({
  details: many(detailPenyaluran),
}));

export const detailPenyaluranRelations = relations(detailPenyaluran, ({ one }) => ({
  penyaluran: one(transaksiPenyaluran, {
    fields: [detailPenyaluran.penyaluranId],
    references: [transaksiPenyaluran.id],
  }),
  barang: one(masterBarang, {
    fields: [detailPenyaluran.barangId],
    references: [masterBarang.id],
  }),
}));
