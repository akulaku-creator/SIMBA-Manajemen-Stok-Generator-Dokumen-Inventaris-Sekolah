import { asc, desc, eq, sql } from 'drizzle-orm';
import {
  db,
  getPool,
  kategoriRekening,
  masterBarang,
  pejabatPenandatangan,
  transaksiPenerimaan,
  detailPenerimaan,
  transaksiPenyaluran,
  detailPenyaluran,
  logAktivitas,
  pengaturanInstansi,
  dbAuditLogs,
} from './index.ts';
import { sanitizeImageUrl, stripPrototypePollution } from '../utils/urlSanitizer.ts';
import {
  hashServerCredential,
  verifyEnvPasscode,
  verifyServerCredential,
} from '../lib/localSessionToken.ts';
import { DEFAULT_USERS } from '../data/defaultUsers.ts';

const SIMBA_TX_LOCK_ID = 73696261; // Deterministic advisory lock ID for SIMBA database writes
const MAX_COLLECTION_ITEMS = 10000;
const APP_USERS_KEY = 'app_users';
const APP_USER_SECRETS_KEY = 'app_users_secrets';

export class ForbiddenError extends Error {
  status = 403;
}

export class ValidationError extends Error {
  status = 400;
}

export interface SimbaSnapshotPayload {
  kategoriList?: any[];
  masterBarang?: any[];
  pejabatList?: any[];
  penerimaanList?: any[];
  transaksiList?: any[];
  kopConfig?: any;
  numberingConfig?: any;
  userList?: any[];
}

export interface SyncActorContext {
  email: string;
  role: 'admin' | 'operator' | 'user';
  uid: string;
}

function safeNonNegNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return num;
}

function safeNonNegInt(value: unknown, fallback = 0): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.round(num);
}

function sanitizeClientUsersList(rawUsers: any[]): any[] {
  if (!Array.isArray(rawUsers)) return [];
  return rawUsers.slice(0, 500).map((raw, idx) => {
    const clean = stripPrototypePollution(raw || {});
    const roleVal =
      clean.role === 'admin' || clean.role === 'operator' || clean.role === 'pengguna'
        ? clean.role
        : 'pengguna';
    return {
      id: String(clean.id || `user-${idx + 1}`).slice(0, 100),
      sekolah_id: clean.sekolah_id ? String(clean.sekolah_id).slice(0, 100) : undefined,
      nama: String(clean.nama || 'Pengguna').slice(0, 150),
      username: String(clean.username || `user${idx + 1}`).slice(0, 80),
      role: roleVal,
      // Never persist or emit plaintext password/pin
      passwordHash: typeof clean.passwordHash === 'string' && clean.passwordHash.startsWith('sha256$')
        ? clean.passwordHash.slice(0, 160)
        : undefined,
      requiresPasswordSetup: Boolean(clean.requiresPasswordSetup ?? !clean.passwordHash),
      nip: clean.nip ? String(clean.nip).slice(0, 50) : undefined,
      jabatan: clean.jabatan ? String(clean.jabatan).slice(0, 150) : undefined,
      unitKerja: clean.unitKerja ? String(clean.unitKerja).slice(0, 150) : undefined,
      email: clean.email ? String(clean.email).slice(0, 150) : undefined,
      avatarColor: clean.avatarColor ? String(clean.avatarColor).slice(0, 50) : undefined,
    };
  });
}

function stripSecretsForBootstrapResponse(rawUsers: any[] | null): any[] | null {
  if (!Array.isArray(rawUsers)) return null;
  return rawUsers.map((u) => ({
    id: u.id,
    sekolah_id: u.sekolah_id,
    nama: u.nama,
    username: u.username,
    role: u.role,
    requiresPasswordSetup: Boolean(u.requiresPasswordSetup),
    nip: u.nip,
    jabatan: u.jabatan,
    unitKerja: u.unitKerja,
    email: u.email,
    avatarColor: u.avatarColor,
  }));
}

function sanitizeKopConfig(rawKop: unknown): Record<string, any> | null {
  if (!rawKop || typeof rawKop !== 'object') return null;
  const clean = stripPrototypePollution(rawKop as Record<string, any>);
  return {
    ...clean,
    logoUrl: sanitizeImageUrl(clean.logoUrl),
    logoProvinsiUrl: sanitizeImageUrl(clean.logoProvinsiUrl),
    logoSekolahUrl: sanitizeImageUrl(clean.logoSekolahUrl),
    stempelUrl: sanitizeImageUrl(clean.stempelUrl),
  };
}

function mapPeranToDb(role?: string, jabatan?: string): string {
  const r = (role || '').toLowerCase();
  const j = (jabatan || '').toLowerCase();
  if (r.includes('kepala') || j.includes('kepala sekolah')) return 'KEPALA_SEKOLAH';
  if (r.includes('bendahara') || j.includes('bendahara')) return 'BENDAHARA_BOS';
  if (r.includes('pengurus') || j.includes('pengurus barang')) return 'PENGURUS_BARANG';
  if (r.includes('sarpras') || j.includes('sarpras') || j.includes('wakasek')) return 'SARPRAS';
  return 'LAINNYA';
}

function mapPeranToRole(peran: string): string {
  switch (peran) {
    case 'KEPALA_SEKOLAH':
      return 'kepala_sekolah';
    case 'BENDAHARA_BOS':
      return 'bendahara_bos';
    case 'PENGURUS_BARANG':
      return 'pengurus_barang';
    case 'SARPRAS':
      return 'sarpras';
    default:
      return '';
  }
}

export async function getBootstrapData() {
  try {
    const [
      katRows,
      barangRows,
      pejabatRows,
      rcvRows,
      rcvDetailRows,
      outRows,
      outDetailRows,
      settingRows,
      logRows,
    ] = await Promise.all([
      db.select().from(kategoriRekening).orderBy(asc(kategoriRekening.id)),
      db.select().from(masterBarang).orderBy(asc(masterBarang.id)),
      db.select().from(pejabatPenandatangan).orderBy(asc(pejabatPenandatangan.id)),
      db.select().from(transaksiPenerimaan).orderBy(desc(transaksiPenerimaan.tanggal), desc(transaksiPenerimaan.id)),
      db.select().from(detailPenerimaan).orderBy(asc(detailPenerimaan.id)),
      db.select().from(transaksiPenyaluran).orderBy(desc(transaksiPenyaluran.nomorUrut), desc(transaksiPenyaluran.id)),
      db.select().from(detailPenyaluran).orderBy(asc(detailPenyaluran.id)),
      db.select().from(pengaturanInstansi),
      db.select().from(logAktivitas).orderBy(desc(logAktivitas.createdAt)).limit(50),
    ]);

    const hasExistingData =
      katRows.length > 0 ||
      barangRows.length > 0 ||
      pejabatRows.length > 0 ||
      rcvRows.length > 0 ||
      outRows.length > 0 ||
      settingRows.some((s) => s.configKey !== APP_USER_SECRETS_KEY);

    const kategoriList = katRows.map((k) => ({
      id: k.clientId || `kat-db-${k.id}`,
      nama: k.namaKategori,
      kodeRekening: k.kodeRekening,
      namaRekening: k.namaKategori,
      jenisDefault: k.jenisBelanja === 'MODAL' ? 'Belanja Modal' : 'BHP',
      prefixKode: k.prefixKode || undefined,
      deskripsi: k.deskripsi || undefined,
    }));

    const barangIdToClientId = new Map<number, string>();
    const masterBarangList = barangRows.map((b) => {
      const cid = b.clientId || `brg-db-${b.id}`;
      barangIdToClientId.set(b.id, cid);
      return {
        id: cid,
        kodeBarang: b.kodeBarang,
        nusp: b.nusp || '',
        namaBarang: b.namaBarang,
        spesifikasi: b.spesifikasi || '',
        kodeRekening: b.kodeRekening || '',
        namaRekening: b.namaRekening || b.kategoriLabel || '',
        kategori: b.kategoriLabel || b.namaRekening || '',
        satuan: b.satuan,
        hargaSatuan: Number(b.hargaSatuan || 0),
        stokAwal: b.stokAwal,
        stokSekarang: b.stokSaatIni,
        lokasiGudang: b.lokasiGudang || '',
        jenisBarang: b.jenisAset === 'MODAL' ? 'Belanja Modal' : 'BHP',
      };
    });

    const pejabatList = pejabatRows.map((p) => ({
      id: p.clientId || `pej-db-${p.id}`,
      nama: p.namaLengkap,
      nip: p.nip || '',
      pangkatGolongan: p.pangkatGolongan || '',
      jabatan: p.jabatanLabel || '',
      unitKerja: p.unitKerja || '',
      role: mapPeranToRole(p.peran) || undefined,
      peran: p.peran,
      statusJabatan: (p.statusJabatan as any) || 'Definitif',
      tandaTanganUrl: sanitizeImageUrl(p.ttdPngPath) || undefined,
    }));

    const rcvDetailsMap = new Map<number, typeof rcvDetailRows>();
    for (const d of rcvDetailRows) {
      const arr = rcvDetailsMap.get(d.penerimaanId) || [];
      arr.push(d);
      rcvDetailsMap.set(d.penerimaanId, arr);
    }

    const penerimaanList = rcvRows.map((r) => {
      const details = rcvDetailsMap.get(r.id) || [];
      return {
        id: r.clientId || `rcv-db-${r.id}`,
        tanggal: r.tanggal,
        noBukti: r.noBukti,
        sumberDana: r.sumberDana,
        penyedia: r.penyedia,
        totalNilai: Number(r.totalNilai || 0),
        penerimaId: r.penerimaId || '',
        keterangan: r.keterangan || '',
        items: details.map((d) => ({
          barangId: d.barangClientId || barangIdToClientId.get(d.barangId) || `brg-db-${d.barangId}`,
          namaBarang: d.namaBarangSnapshot || '',
          kodeBarang: d.kodeBarangSnapshot || '',
          nusp: d.nuspSnapshot || '',
          kodeRekening: d.kodeRekeningSnapshot || '',
          namaRekening: d.namaRekeningSnapshot || '',
          spesifikasi: d.spesifikasiSnapshot || '',
          satuan: d.satuanSnapshot || '',
          jumlahMasuk: d.jumlah,
          hargaSatuan: Number(d.hargaSatuan || 0),
          subtotal: Number(d.subtotal || 0),
        })),
      };
    });

    const outDetailsMap = new Map<number, typeof outDetailRows>();
    for (const d of outDetailRows) {
      const arr = outDetailsMap.get(d.penyaluranId) || [];
      arr.push(d);
      outDetailsMap.set(d.penyaluranId, arr);
    }

    const transaksiList = outRows.map((t) => {
      const details = outDetailsMap.get(t.id) || [];
      return {
        id: t.clientId || `trx-db-${t.id}`,
        nomorUrut: t.nomorUrut,
        tanggal: t.tanggal,
        unitPemohon: t.unitPemohon,
        keperluanUmum: t.keperluanUmum || '',
        noNPB: t.noNpb || '',
        noSPB: t.noSpb,
        noSPPB: t.noSppb || '',
        noBAST: t.noBast || '',
        pemohonId: t.pemohonId || '',
        pemohonNama: t.pemohonNama || undefined,
        pemohonNip: t.pemohonNip || undefined,
        sarprasId: t.sarprasId || '',
        pengurusBarangId: t.pengurusBarangId || '',
        kepsekId: t.kepsekId || '',
        catatan: t.catatan || '',
        status: (t.status as any) || 'disalurkan',
        createdAt: t.createdAt.toISOString(),
        items: details.map((d, idx) => ({
          id: d.itemClientId || `item-db-${d.id}-${idx}`,
          barangId: d.barangClientId || barangIdToClientId.get(d.barangId) || `brg-db-${d.barangId}`,
          kodeBarang: d.kodeBarangSnapshot || '',
          nusp: d.nuspSnapshot || '',
          kodeRekening: d.kodeRekeningSnapshot || '',
          namaRekening: d.namaRekeningSnapshot || '',
          namaBarang: d.namaBarangSnapshot || '',
          spesifikasi: d.spesifikasiSnapshot || '',
          satuan: d.satuanSnapshot || '',
          sisaBarang: d.sisaBarangSnapshot ?? 0,
          usulanJumlah: d.jumlah,
          hargaSatuan: Number(d.hargaSatuan || 0),
          keperluan: d.keperluan || '',
        })),
      };
    });

    const settingsByKey = new Map<string, any>();
    for (const s of settingRows) {
      if (s.configKey === APP_USER_SECRETS_KEY) continue; // Never expose server credential hashes
      settingsByKey.set(s.configKey, s.payload);
    }

    return {
      isEmpty: !hasExistingData,
      kategoriList,
      masterBarang: masterBarangList,
      pejabatList,
      penerimaanList,
      transaksiList,
      kopConfig: sanitizeKopConfig(settingsByKey.get('kop_surat')),
      numberingConfig: settingsByKey.get('numbering') || null,
      userList: stripSecretsForBootstrapResponse(settingsByKey.get(APP_USERS_KEY) || null),
      recentLogs: logRows,
    };
  } catch (error) {
    throw new Error('Failed to load SIMBA data from database.', { cause: error });
  }
}

export async function syncFullState(
  payload: SimbaSnapshotPayload,
  actor: SyncActorContext,
  actionLabel = 'SYNC_STATE'
) {
  if (actor.role !== 'admin' && actor.role !== 'operator') {
    throw new ForbiddenError('Akses ditolak: Peran pengguna tidak memiliki hak ubah basis data.');
  }

  const kategoriInput = Array.isArray(payload.kategoriList) ? payload.kategoriList : [];
  const barangInput = Array.isArray(payload.masterBarang) ? payload.masterBarang : [];
  const pejabatInput = Array.isArray(payload.pejabatList) ? payload.pejabatList : [];
  const penerimaanInput = Array.isArray(payload.penerimaanList) ? payload.penerimaanList : [];
  const transaksiInput = Array.isArray(payload.transaksiList) ? payload.transaksiList : [];

  if (
    kategoriInput.length > MAX_COLLECTION_ITEMS ||
    barangInput.length > MAX_COLLECTION_ITEMS ||
    pejabatInput.length > MAX_COLLECTION_ITEMS ||
    penerimaanInput.length > MAX_COLLECTION_ITEMS ||
    transaksiInput.length > MAX_COLLECTION_ITEMS
  ) {
    throw new ValidationError('Payload exceeds maximum allowed record count per request.');
  }

  const isAdmin = actor.role === 'admin';

  try {
    await db.transaction(async (tx) => {
      // Acquire transaction-scoped PostgreSQL advisory lock so concurrent writes serialize safely
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${SIMBA_TX_LOCK_ID})`);
      await tx.execute(sql`SELECT set_config('simba.tx_actor', ${actor.email.slice(0, 150)}, true)`);
      await tx.execute(sql`SELECT set_config('simba.allow_stock_mutation', 'on', true)`);

      // Guard against accidental or unauthorized full-database wipe by non-admin or non-reset sync
      if (!isAdmin) {
        const existingBarangCount = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(masterBarang);
        if ((existingBarangCount[0]?.count || 0) > 0 && barangInput.length === 0) {
          throw new ForbiddenError('Operator tidak diizinkan mengosongkan seluruh Master Barang.');
        }
      }

      // Clear transaction & inventory tables in FK-safe order
      await tx.delete(detailPenerimaan);
      await tx.delete(transaksiPenerimaan);
      await tx.delete(detailPenyaluran);
      await tx.delete(transaksiPenyaluran);
      await tx.delete(masterBarang);
      await tx.delete(kategoriRekening);
      if (isAdmin) {
        await tx.delete(pejabatPenandatangan);
      }

      // 1. Kategori Rekening
      const katCodeToId = new Map<string, number>();
      const katNameToId = new Map<string, number>();
      const seenCodes = new Set<string>();

      for (let i = 0; i < kategoriInput.length; i++) {
        const k = stripPrototypePollution(kategoriInput[i] || {});
        const kode = String(k.kodeRekening || `5.1.02.99.99.${String(i + 1).padStart(4, '0')}`).trim().slice(0, 50);
        if (seenCodes.has(kode)) continue;
        seenCodes.add(kode);

        const [inserted] = await tx
          .insert(kategoriRekening)
          .values({
            clientId: k.id ? String(k.id).slice(0, 100) : `kat-${i + 1}`,
            kodeRekening: kode,
            namaKategori: String(k.nama || k.namaRekening || 'Kategori').slice(0, 150),
            jenisBelanja: k.jenisDefault === 'Belanja Modal' ? 'MODAL' : 'BHP',
            prefixKode: k.prefixKode ? String(k.prefixKode).slice(0, 50) : null,
            deskripsi: k.deskripsi ? String(k.deskripsi).slice(0, 500) : null,
          })
          .returning();

        katCodeToId.set(kode, inserted.id);
        katNameToId.set(inserted.namaKategori.toLowerCase(), inserted.id);
      }

      // 2. Master Barang
      const barangClientIdToDbId = new Map<string, number>();

      for (let i = 0; i < barangInput.length; i++) {
        const b = stripPrototypePollution(barangInput[i] || {});
        const clientId = b.id ? String(b.id).slice(0, 100) : `brg-${i + 1}`;
        const kodeRek = String(b.kodeRekening || '').trim().slice(0, 50);
        const katId =
          katCodeToId.get(kodeRek) ??
          katNameToId.get(String(b.kategori || b.namaRekening || '').trim().toLowerCase()) ??
          null;

        const harga = safeNonNegNumber(b.hargaSatuan, 0);
        const stokAwal = safeNonNegInt(b.stokAwal, 0);
        const stokSekarang = safeNonNegInt(b.stokSekarang, 0);

        const [inserted] = await tx
          .insert(masterBarang)
          .values({
            clientId,
            kodeBarang: String(b.kodeBarang || '-').slice(0, 50),
            nusp: b.nusp ? String(b.nusp).slice(0, 50) : null,
            namaBarang: String(b.namaBarang || 'Barang').slice(0, 200),
            spesifikasi: b.spesifikasi ? String(b.spesifikasi).slice(0, 2000) : null,
            satuan: String(b.satuan || 'Buah').slice(0, 30),
            hargaSatuan: harga.toFixed(2),
            stokAwal,
            stokSaatIni: stokSekarang,
            lokasiGudang: b.lokasiGudang ? String(b.lokasiGudang).slice(0, 100) : null,
            kategoriId: katId,
            kodeRekening: kodeRek || null,
            namaRekening: b.namaRekening ? String(b.namaRekening).slice(0, 200) : null,
            kategoriLabel: b.kategori ? String(b.kategori).slice(0, 150) : null,
            jenisAset: b.jenisBarang === 'Belanja Modal' ? 'MODAL' : 'BHP',
          })
          .returning();

        barangClientIdToDbId.set(clientId, inserted.id);
      }

      const ensureBarangDbId = async (item: any): Promise<number> => {
        const cid = String(item.barangId || '').slice(0, 100);
        const found = barangClientIdToDbId.get(cid);
        if (found) return found;

        const [fallback] = await tx
          .insert(masterBarang)
          .values({
            clientId: cid || `brg-orphan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            kodeBarang: String(item.kodeBarang || '-').slice(0, 50),
            nusp: item.nusp ? String(item.nusp).slice(0, 50) : null,
            namaBarang: String(item.namaBarang || 'Barang Arsip').slice(0, 200),
            spesifikasi: item.spesifikasi ? String(item.spesifikasi).slice(0, 2000) : null,
            satuan: String(item.satuan || 'Buah').slice(0, 30),
            hargaSatuan: safeNonNegNumber(item.hargaSatuan, 0).toFixed(2),
            stokAwal: 0,
            stokSaatIni: 0,
            kodeRekening: item.kodeRekening ? String(item.kodeRekening).slice(0, 50) : null,
            namaRekening: item.namaRekening ? String(item.namaRekening).slice(0, 200) : null,
            jenisAset: 'BHP',
          })
          .returning();

        if (cid) barangClientIdToDbId.set(cid, fallback.id);
        return fallback.id;
      };

      // 3. Pejabat Penandatangan (Admin-only write; operators cannot replace officials/signatures)
      if (isAdmin) {
        const stempelFromKop = sanitizeImageUrl(payload.kopConfig?.stempelUrl) || null;
        for (let i = 0; i < pejabatInput.length; i++) {
          const p = stripPrototypePollution(pejabatInput[i] || {});
          await tx.insert(pejabatPenandatangan).values({
            clientId: p.id ? String(p.id).slice(0, 100) : `pej-${i + 1}`,
            peran: p.peran ? String(p.peran).slice(0, 40) : mapPeranToDb(p.role, p.jabatan),
            namaLengkap: String(p.nama || '-').slice(0, 150),
            nip: p.nip ? String(p.nip).slice(0, 50) : null,
            pangkatGolongan: p.pangkatGolongan ? String(p.pangkatGolongan).slice(0, 100) : null,
            jabatanLabel: p.jabatan ? String(p.jabatan).slice(0, 150) : null,
            unitKerja: p.unitKerja ? String(p.unitKerja).slice(0, 150) : null,
            statusJabatan: p.statusJabatan ? String(p.statusJabatan).slice(0, 20) : 'Definitif',
            ttdPngPath: sanitizeImageUrl(p.tandaTanganUrl) || null,
            stempelPngPath: stempelFromKop,
            aktif: true,
          });
        }
      }

      // 4. Transaksi Penerimaan + Detail
      for (let i = 0; i < penerimaanInput.length; i++) {
        const r = stripPrototypePollution(penerimaanInput[i] || {});
        const totalNilai = safeNonNegNumber(r.totalNilai, 0);
        const [insertedRcv] = await tx
          .insert(transaksiPenerimaan)
          .values({
            clientId: r.id ? String(r.id).slice(0, 100) : `rcv-${i + 1}`,
            noBukti: String(r.noBukti || `BUKTI-${i + 1}`).slice(0, 100),
            tanggal: String(r.tanggal || new Date().toISOString().slice(0, 10)).slice(0, 20),
            sumberDana: String(r.sumberDana || 'BOS Reguler').slice(0, 80),
            penyedia: String(r.penyedia || '').slice(0, 150),
            totalNilai: totalNilai.toFixed(2),
            penerimaId: r.penerimaId ? String(r.penerimaId).slice(0, 100) : null,
            keterangan: r.keterangan ? String(r.keterangan).slice(0, 2000) : null,
          })
          .returning();

        const items = Array.isArray(r.items) ? r.items : [];
        for (const rawItem of items) {
          const it = stripPrototypePollution(rawItem || {});
          const barangDbId = await ensureBarangDbId(it);
          const qty = safeNonNegInt(it.jumlahMasuk, 0);
          const harga = safeNonNegNumber(it.hargaSatuan, 0);
          const sub = safeNonNegNumber(it.subtotal ?? qty * harga, qty * harga);

          await tx.insert(detailPenerimaan).values({
            penerimaanId: insertedRcv.id,
            barangId: barangDbId,
            barangClientId: it.barangId ? String(it.barangId).slice(0, 100) : null,
            namaBarangSnapshot: it.namaBarang ? String(it.namaBarang).slice(0, 200) : null,
            kodeBarangSnapshot: it.kodeBarang ? String(it.kodeBarang).slice(0, 50) : null,
            nuspSnapshot: it.nusp ? String(it.nusp).slice(0, 50) : null,
            kodeRekeningSnapshot: it.kodeRekening ? String(it.kodeRekening).slice(0, 50) : null,
            namaRekeningSnapshot: it.namaRekening ? String(it.namaRekening).slice(0, 200) : null,
            spesifikasiSnapshot: it.spesifikasi ? String(it.spesifikasi).slice(0, 2000) : null,
            satuanSnapshot: it.satuan ? String(it.satuan).slice(0, 30) : null,
            jumlah: qty,
            hargaSatuan: harga.toFixed(2),
            subtotal: sub.toFixed(2),
          });
        }
      }

      // 5. Transaksi Penyaluran + Detail
      for (let i = 0; i < transaksiInput.length; i++) {
        const t = stripPrototypePollution(transaksiInput[i] || {});
        const [insertedTrx] = await tx
          .insert(transaksiPenyaluran)
          .values({
            clientId: t.id ? String(t.id).slice(0, 100) : `trx-${i + 1}`,
            nomorUrut: Math.max(1, safeNonNegInt(t.nomorUrut, i + 1)),
            noSpb: String(t.noSPB || `SPB-${i + 1}`).slice(0, 100),
            noNpb: t.noNPB ? String(t.noNPB).slice(0, 100) : null,
            noSppb: t.noSPPB ? String(t.noSPPB).slice(0, 100) : null,
            noBast: t.noBAST ? String(t.noBAST).slice(0, 100) : null,
            tanggal: String(t.tanggal || new Date().toISOString().slice(0, 10)).slice(0, 20),
            unitPemohon: String(t.unitPemohon || '-').slice(0, 150),
            keperluanUmum: t.keperluanUmum ? String(t.keperluanUmum).slice(0, 2000) : null,
            pemohonId: t.pemohonId ? String(t.pemohonId).slice(0, 100) : null,
            pemohonNama: t.pemohonNama ? String(t.pemohonNama).slice(0, 150) : null,
            pemohonNip: t.pemohonNip ? String(t.pemohonNip).slice(0, 50) : null,
            sarprasId: t.sarprasId ? String(t.sarprasId).slice(0, 100) : null,
            pengurusBarangId: t.pengurusBarangId ? String(t.pengurusBarangId).slice(0, 100) : null,
            kepsekId: t.kepsekId ? String(t.kepsekId).slice(0, 100) : null,
            catatan: t.catatan ? String(t.catatan).slice(0, 2000) : null,
            status: t.status ? String(t.status).slice(0, 30) : 'disalurkan',
          })
          .returning();

        const items = Array.isArray(t.items) ? t.items : [];
        for (const rawItem of items) {
          const it = stripPrototypePollution(rawItem || {});
          const barangDbId = await ensureBarangDbId(it);
          const qty = safeNonNegInt(it.usulanJumlah, 0);
          const harga = safeNonNegNumber(it.hargaSatuan, 0);
          const sub = qty * harga;

          await tx.insert(detailPenyaluran).values({
            penyaluranId: insertedTrx.id,
            barangId: barangDbId,
            barangClientId: it.barangId ? String(it.barangId).slice(0, 100) : null,
            itemClientId: it.id ? String(it.id).slice(0, 100) : null,
            namaBarangSnapshot: it.namaBarang ? String(it.namaBarang).slice(0, 200) : null,
            kodeBarangSnapshot: it.kodeBarang ? String(it.kodeBarang).slice(0, 50) : null,
            nuspSnapshot: it.nusp ? String(it.nusp).slice(0, 50) : null,
            kodeRekeningSnapshot: it.kodeRekening ? String(it.kodeRekening).slice(0, 50) : null,
            namaRekeningSnapshot: it.namaRekening ? String(it.namaRekening).slice(0, 200) : null,
            spesifikasiSnapshot: it.spesifikasi ? String(it.spesifikasi).slice(0, 2000) : null,
            satuanSnapshot: it.satuan ? String(it.satuan).slice(0, 30) : null,
            sisaBarangSnapshot: safeNonNegInt(it.sisaBarang, 0),
            jumlah: qty,
            hargaSatuan: harga.toFixed(2),
            subtotal: sub.toFixed(2),
            keperluan: it.keperluan ? String(it.keperluan).slice(0, 2000) : null,
          });
        }
      }

      // 6. Pengaturan Instansi (Admin-only for settings & app_users; plaintext secrets stripped)
      if (isAdmin) {
        const upsertSetting = async (key: string, val: unknown) => {
          if (!val) return;
          await tx
            .insert(pengaturanInstansi)
            .values({
              configKey: key,
              payload: val,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: pengaturanInstansi.configKey,
              set: { payload: val, updatedAt: new Date() },
            });
        };

        const cleanKop = sanitizeKopConfig(payload.kopConfig);
        if (cleanKop) {
          await upsertSetting('kop_surat', cleanKop);
        }
        if (payload.numberingConfig && typeof payload.numberingConfig === 'object') {
          await upsertSetting('numbering', stripPrototypePollution(payload.numberingConfig));
        }
        if (Array.isArray(payload.userList)) {
          await upsertSetting(APP_USERS_KEY, sanitizeClientUsersList(payload.userList));
        }
      }

      // 7. Log Aktivitas
      await tx.insert(logAktivitas).values({
        aksi: String(actionLabel || 'SYNC_STATE').slice(0, 100),
        modul: 'SIMBA_SYNC',
        deskripsi: `Sinkronisasi data (${actor.role}): ${barangInput.length} barang, ${penerimaanInput.length} penerimaan, ${transaksiInput.length} penyaluran.`,
        actorEmail: actor.email.slice(0, 150),
      });

      await tx.execute(sql`SELECT set_config('simba.allow_stock_mutation', 'off', true)`);
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof ValidationError) {
      throw error;
    }
    throw new Error('Failed to synchronize SIMBA dataset to database.', { cause: error });
  }
}

export async function recordActivityLog(aksi: string, modul: string, deskripsi: string, actorEmail?: string) {
  try {
    const [row] = await db
      .insert(logAktivitas)
      .values({
        aksi: aksi.slice(0, 100),
        modul: modul.slice(0, 50),
        deskripsi: deskripsi.slice(0, 4000),
        actorEmail: actorEmail ? actorEmail.slice(0, 150) : null,
      })
      .returning();
    return row;
  } catch (error) {
    throw new Error('Failed to write activity log.', { cause: error });
  }
}

export async function getSettingByKey(key: string) {
  try {
    const [row] = await db
      .select()
      .from(pengaturanInstansi)
      .where(eq(pengaturanInstansi.configKey, key))
      .limit(1);
    return row?.payload ?? null;
  } catch (error) {
    throw new Error('Failed to load configuration setting.', { cause: error });
  }
}

async function getStoredAppUsers(): Promise<any[]> {
  const existing = await getSettingByKey(APP_USERS_KEY);
  if (Array.isArray(existing) && existing.length > 0) {
    return existing;
  }
  return DEFAULT_USERS.map((u) => ({ ...u }));
}

async function getStoredUserSecretsMap(): Promise<Record<string, string>> {
  const existing = await getSettingByKey(APP_USER_SECRETS_KEY);
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    return existing as Record<string, string>;
  }
  return {};
}

export async function getLocalAuthSetupStatus() {
  const [usersList, secretsMap] = await Promise.all([
    getStoredAppUsers(),
    getStoredUserSecretsMap(),
  ]);
  const adminUsers = usersList.filter((u) => u.role === 'admin');
  const hasConfiguredLocalAdmin = adminUsers.some(
    (u) => Boolean(secretsMap[u.id]) || Boolean(u.passwordHash)
  );
  const hasEnvPasscode = Boolean((process.env.SIMBA_ADMIN_PASSCODE || '').trim());
  return { hasConfiguredLocalAdmin, hasEnvPasscode };
}

export async function verifyLocalLoginOnServer(identifier: string, secret: string) {
  const cleanId = identifier.trim().toLowerCase();
  const cleanDigits = identifier.replace(/\s+/g, '');
  const cleanSecret = secret.trim();

  const [usersList, secretsMap] = await Promise.all([
    getStoredAppUsers(),
    getStoredUserSecretsMap(),
  ]);

  const matched = usersList.find((u) => {
    const mUser = String(u.username || '').toLowerCase() === cleanId;
    const mEmail = u.email ? String(u.email).toLowerCase() === cleanId : false;
    const mNip = u.nip ? String(u.nip).replace(/\s+/g, '') === cleanDigits : false;
    return mUser || mEmail || mNip;
  });

  if (!matched) {
    return { authenticated: false as const, needsSetup: false as const };
  }

  const serverHash = secretsMap[matched.id];
  const hasEnvPass = matched.role === 'admin' && verifyEnvPasscode(cleanSecret);
  if (!serverHash && !hasEnvPass) {
    return {
      authenticated: false as const,
      needsSetup: true as const,
      user: stripSecretsForBootstrapResponse([matched])[0],
    };
  }

  const valid = hasEnvPass || verifyServerCredential(cleanSecret, serverHash);
  if (!valid) {
    return { authenticated: false as const, needsSetup: false as const };
  }

  return {
    authenticated: true as const,
    needsSetup: false as const,
    user: stripSecretsForBootstrapResponse([matched])[0],
  };
}

export async function setupFirstRunLocalCredential(identifier: string, newSecret: string) {
  const cleanId = identifier.trim().toLowerCase();
  const cleanDigits = identifier.replace(/\s+/g, '');

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${SIMBA_TX_LOCK_ID})`);

    const [usersRow] = await tx
      .select()
      .from(pengaturanInstansi)
      .where(eq(pengaturanInstansi.configKey, APP_USERS_KEY))
      .limit(1);
    const [secretsRow] = await tx
      .select()
      .from(pengaturanInstansi)
      .where(eq(pengaturanInstansi.configKey, APP_USER_SECRETS_KEY))
      .limit(1);

    const usersList: any[] =
      Array.isArray(usersRow?.payload) && usersRow.payload.length > 0
        ? usersRow.payload
        : DEFAULT_USERS.map((u) => ({ ...u }));

    const secretsMap: Record<string, string> =
      secretsRow?.payload && typeof secretsRow.payload === 'object' && !Array.isArray(secretsRow.payload)
        ? { ...(secretsRow.payload as Record<string, string>) }
        : {};

    const idx = usersList.findIndex((u) => {
      const mUser = String(u.username || '').toLowerCase() === cleanId;
      const mEmail = u.email ? String(u.email).toLowerCase() === cleanId : false;
      const mNip = u.nip ? String(u.nip).replace(/\s+/g, '') === cleanDigits : false;
      return mUser || mEmail || mNip;
    });

    if (idx === -1) {
      throw new ValidationError('Akun pengguna tidak ditemukan.');
    }

    const target = usersList[idx];
    if (secretsMap[target.id]) {
      throw new ForbiddenError('Akun ini sudah memiliki kredensial aktif. Hubungi Administrator untuk reset.');
    }

    secretsMap[target.id] = hashServerCredential(newSecret);
    usersList[idx] = {
      ...target,
      requiresPasswordSetup: false,
    };

    const sanitizedUsers = sanitizeClientUsersList(usersList);

    await tx
      .insert(pengaturanInstansi)
      .values({ configKey: APP_USERS_KEY, payload: sanitizedUsers, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: pengaturanInstansi.configKey,
        set: { payload: sanitizedUsers, updatedAt: new Date() },
      });

    await tx
      .insert(pengaturanInstansi)
      .values({ configKey: APP_USER_SECRETS_KEY, payload: secretsMap, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: pengaturanInstansi.configKey,
        set: { payload: secretsMap, updatedAt: new Date() },
      });

    return stripSecretsForBootstrapResponse([sanitizedUsers[idx]])[0];
  });
}

export async function verifyAdminCredentialOnServer(
  actor: { uid: string; email?: string; role: string },
  candidate: string
): Promise<{ valid: boolean; hasConfiguredCredential: boolean }> {
  if (actor.role !== 'admin') {
    throw new ForbiddenError('Hanya Administrator yang berwenang melakukan verifikasi ini.');
  }

  if (verifyEnvPasscode(candidate)) {
    return { valid: true, hasConfiguredCredential: true };
  }

  const [usersList, secretsMap] = await Promise.all([
    getStoredAppUsers(),
    getStoredUserSecretsMap(),
  ]);

  // Match by local:<id> or email, or any configured admin account secret
  const localId = actor.uid.startsWith('local:') ? actor.uid.slice(6) : '';
  const adminUsers = usersList.filter((u) => u.role === 'admin');
  const matchingSecretUser =
    adminUsers.find((u) => u.id === localId) ||
    adminUsers.find((u) => actor.email && u.email && String(u.email).toLowerCase() === actor.email.toLowerCase()) ||
    adminUsers.find((u) => Boolean(secretsMap[u.id]));

  const storedHash = matchingSecretUser ? secretsMap[matchingSecretUser.id] : undefined;
  const hasEnvPass = Boolean((process.env.SIMBA_ADMIN_PASSCODE || '').trim());

  if (!storedHash && !hasEnvPass) {
    return { valid: false, hasConfiguredCredential: false };
  }

  return {
    valid: verifyServerCredential(candidate, storedHash),
    hasConfiguredCredential: true,
  };
}

export interface StoredProcPenerimaanInput {
  id?: string;
  noBukti: string;
  tanggal: string;
  sumberDana?: string;
  penyedia?: string;
  penerimaId?: string;
  keterangan?: string;
  items: Array<{
    barangId?: string;
    barangDbId?: number;
    jumlahMasuk: number;
    hargaSatuan: number;
  }>;
}

export async function executePenerimaanViaStoredProcedure(
  input: StoredProcPenerimaanInput,
  actor: SyncActorContext
): Promise<{ penerimaanId: number }> {
  if (actor.role !== 'admin' && actor.role !== 'operator') {
    throw new ForbiddenError('Akses ditolak: Peran pengguna tidak memiliki hak transaksi penerimaan.');
  }
  const cleanInput = stripPrototypePollution(input || ({} as StoredProcPenerimaanInput)) as StoredProcPenerimaanInput;
  if (!cleanInput.noBukti || !Array.isArray(cleanInput.items) || cleanInput.items.length === 0) {
    throw new ValidationError('Nomor bukti dan daftar item penerimaan wajib diisi.');
  }
  if (cleanInput.items.length > MAX_COLLECTION_ITEMS) {
    throw new ValidationError('Jumlah item penerimaan melebihi batas maksimum.');
  }

  const normalizedItems = cleanInput.items.map((it) => {
    const qty = safeNonNegInt(it.jumlahMasuk, 0);
    const harga = safeNonNegNumber(it.hargaSatuan, 0);
    if (qty <= 0) {
      throw new ValidationError('Jumlah barang masuk harus lebih dari 0.');
    }
    return {
      barang_id: typeof it.barangDbId === 'number' && Number.isInteger(it.barangDbId) ? it.barangDbId : null,
      barang_client_id: it.barangId ? String(it.barangId).slice(0, 100) : null,
      jumlah: qty,
      harga_satuan: harga,
    };
  });

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `CALL sp_proses_penerimaan_barang($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NULL)`,
      [
        cleanInput.id ? String(cleanInput.id).slice(0, 100) : null,
        String(cleanInput.noBukti).trim().slice(0, 100),
        String(cleanInput.tanggal || new Date().toISOString().slice(0, 10)).slice(0, 20),
        String(cleanInput.sumberDana || 'BOS Reguler').slice(0, 80),
        String(cleanInput.penyedia || '').slice(0, 150),
        cleanInput.penerimaId ? String(cleanInput.penerimaId).slice(0, 100) : null,
        cleanInput.keterangan ? String(cleanInput.keterangan).slice(0, 2000) : null,
        actor.email.slice(0, 150),
        JSON.stringify(normalizedItems),
      ]
    );
    await client.query('COMMIT');
    const penerimaanId = Number(result.rows?.[0]?.p_penerimaan_id || 0);
    return { penerimaanId };
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    const msg = typeof err?.message === 'string' ? err.message : '';
    if (msg.includes('VALIDASI GAGAL') || msg.includes('DATA TIDAK DITEMUKAN')) {
      throw new ValidationError(msg);
    }
    throw new Error('Gagal memproses transaksi penerimaan melalui Stored Procedure.', { cause: err });
  } finally {
    client.release();
  }
}

export interface StoredProcPenyaluranInput {
  id?: string;
  nomorUrut?: number;
  noSPB: string;
  noNPB?: string;
  noSPPB?: string;
  noBAST?: string;
  tanggal: string;
  unitPemohon: string;
  keperluanUmum?: string;
  pemohonId?: string;
  pemohonNama?: string;
  pemohonNip?: string;
  sarprasId?: string;
  pengurusBarangId?: string;
  kepsekId?: string;
  catatan?: string;
  items: Array<{
    id?: string;
    barangId?: string;
    barangDbId?: number;
    usulanJumlah: number;
    hargaSatuan?: number;
    keperluan?: string;
  }>;
}

export async function executePenyaluranViaStoredProcedure(
  input: StoredProcPenyaluranInput,
  actor: SyncActorContext
): Promise<{ penyaluranId: number }> {
  if (actor.role !== 'admin' && actor.role !== 'operator') {
    throw new ForbiddenError('Akses ditolak: Peran pengguna tidak memiliki hak transaksi penyaluran.');
  }
  const cleanInput = stripPrototypePollution(input || ({} as StoredProcPenyaluranInput)) as StoredProcPenyaluranInput;
  if (!cleanInput.noSPB || !cleanInput.unitPemohon || !Array.isArray(cleanInput.items) || cleanInput.items.length === 0) {
    throw new ValidationError('Nomor SPB, unit pemohon, dan daftar item penyaluran wajib diisi.');
  }
  if (cleanInput.items.length > MAX_COLLECTION_ITEMS) {
    throw new ValidationError('Jumlah item penyaluran melebihi batas maksimum.');
  }

  const normalizedItems = cleanInput.items.map((it) => {
    const qty = safeNonNegInt(it.usulanJumlah, 0);
    const harga = safeNonNegNumber(it.hargaSatuan, 0);
    if (qty <= 0) {
      throw new ValidationError('Jumlah penyaluran barang harus lebih dari 0.');
    }
    return {
      id: it.id ? String(it.id).slice(0, 100) : null,
      barang_id: typeof it.barangDbId === 'number' && Number.isInteger(it.barangDbId) ? it.barangDbId : null,
      barang_client_id: it.barangId ? String(it.barangId).slice(0, 100) : null,
      jumlah: qty,
      harga_satuan: harga,
      keperluan: it.keperluan ? String(it.keperluan).slice(0, 2000) : null,
    };
  });

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `CALL sp_proses_penyaluran_barang($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb, NULL)`,
      [
        cleanInput.id ? String(cleanInput.id).slice(0, 100) : null,
        Math.max(1, safeNonNegInt(cleanInput.nomorUrut, 1)),
        String(cleanInput.noSPB).trim().slice(0, 100),
        cleanInput.noNPB ? String(cleanInput.noNPB).slice(0, 100) : null,
        cleanInput.noSPPB ? String(cleanInput.noSPPB).slice(0, 100) : null,
        cleanInput.noBAST ? String(cleanInput.noBAST).slice(0, 100) : null,
        String(cleanInput.tanggal || new Date().toISOString().slice(0, 10)).slice(0, 20),
        String(cleanInput.unitPemohon).trim().slice(0, 150),
        cleanInput.keperluanUmum ? String(cleanInput.keperluanUmum).slice(0, 2000) : null,
        cleanInput.pemohonId ? String(cleanInput.pemohonId).slice(0, 100) : null,
        cleanInput.pemohonNama ? String(cleanInput.pemohonNama).slice(0, 150) : null,
        cleanInput.pemohonNip ? String(cleanInput.pemohonNip).slice(0, 50) : null,
        cleanInput.sarprasId ? String(cleanInput.sarprasId).slice(0, 100) : null,
        cleanInput.pengurusBarangId ? String(cleanInput.pengurusBarangId).slice(0, 100) : null,
        cleanInput.kepsekId ? String(cleanInput.kepsekId).slice(0, 100) : null,
        cleanInput.catatan ? String(cleanInput.catatan).slice(0, 2000) : null,
        actor.email.slice(0, 150),
        JSON.stringify(normalizedItems),
      ]
    );
    await client.query('COMMIT');
    const penyaluranId = Number(result.rows?.[0]?.p_penyaluran_id || 0);
    return { penyaluranId };
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    const msg = typeof err?.message === 'string' ? err.message : '';
    if (
      msg.includes('VALIDASI GAGAL') ||
      msg.includes('DATA TIDAK DITEMUKAN') ||
      msg.includes('STOK TIDAK MENCUKUPI')
    ) {
      throw new ValidationError(msg);
    }
    throw new Error('Gagal memproses transaksi penyaluran melalui Stored Procedure.', { cause: err });
  } finally {
    client.release();
  }
}

export async function getDbAuditLogs(limit = 100) {
  const safeLimit = Math.min(Math.max(1, Math.round(limit)), 500);
  try {
    return await db
      .select()
      .from(dbAuditLogs)
      .orderBy(desc(dbAuditLogs.id))
      .limit(safeLimit);
  } catch (error) {
    throw new Error('Failed to fetch database audit logs.', { cause: error });
  }
}
