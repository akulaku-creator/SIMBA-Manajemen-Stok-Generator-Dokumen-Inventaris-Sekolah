import { asc, desc, eq } from 'drizzle-orm';
import {
  db,
  kategoriRekening,
  masterBarang,
  pejabatPenandatangan,
  transaksiPenerimaan,
  detailPenerimaan,
  transaksiPenyaluran,
  detailPenyaluran,
  logAktivitas,
  pengaturanInstansi,
} from './index.ts';

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
      settingRows.length > 0;

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
      tandaTanganUrl: p.ttdPngPath || undefined,
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
      settingsByKey.set(s.configKey, s.payload);
    }

    return {
      isEmpty: !hasExistingData,
      kategoriList,
      masterBarang: masterBarangList,
      pejabatList,
      penerimaanList,
      transaksiList,
      kopConfig: settingsByKey.get('kop_surat') || null,
      numberingConfig: settingsByKey.get('numbering') || null,
      userList: settingsByKey.get('app_users') || null,
      recentLogs: logRows,
    };
  } catch (error) {
    throw new Error('Failed to load SIMBA data from database.', { cause: error });
  }
}

export async function syncFullState(
  payload: SimbaSnapshotPayload,
  actorEmail: string,
  actionLabel = 'SYNC_STATE'
) {
  try {
    await db.transaction(async (tx) => {
      // Clear transaction detail & parent tables in FK-safe order before syncing normalized snapshot
      await tx.delete(detailPenerimaan);
      await tx.delete(transaksiPenerimaan);
      await tx.delete(detailPenyaluran);
      await tx.delete(transaksiPenyaluran);
      await tx.delete(masterBarang);
      await tx.delete(kategoriRekening);
      await tx.delete(pejabatPenandatangan);

      // 1. Kategori Rekening
      const katCodeToId = new Map<string, number>();
      const katNameToId = new Map<string, number>();
      const kategoriList = Array.isArray(payload.kategoriList) ? payload.kategoriList : [];
      const seenCodes = new Set<string>();

      for (let i = 0; i < kategoriList.length; i++) {
        const k = kategoriList[i];
        const kode = String(k.kodeRekening || `5.1.02.99.99.${String(i + 1).padStart(4, '0')}`).trim().slice(0, 50);
        if (seenCodes.has(kode)) continue;
        seenCodes.add(kode);

        const [inserted] = await tx
          .insert(kategoriRekening)
          .values({
            clientId: k.id ? String(k.id) : `kat-${i + 1}`,
            kodeRekening: kode,
            namaKategori: String(k.nama || k.namaRekening || 'Kategori').slice(0, 150),
            jenisBelanja: k.jenisDefault === 'Belanja Modal' ? 'MODAL' : 'BHP',
            prefixKode: k.prefixKode ? String(k.prefixKode).slice(0, 50) : null,
            deskripsi: k.deskripsi ? String(k.deskripsi) : null,
          })
          .returning();

        katCodeToId.set(kode, inserted.id);
        katNameToId.set(inserted.namaKategori.toLowerCase(), inserted.id);
      }

      // 2. Master Barang
      const barangClientIdToDbId = new Map<string, number>();
      const barangList = Array.isArray(payload.masterBarang) ? payload.masterBarang : [];

      for (let i = 0; i < barangList.length; i++) {
        const b = barangList[i];
        const clientId = b.id ? String(b.id) : `brg-${i + 1}`;
        const kodeRek = String(b.kodeRekening || '').trim().slice(0, 50);
        const katId =
          katCodeToId.get(kodeRek) ??
          katNameToId.get(String(b.kategori || b.namaRekening || '').trim().toLowerCase()) ??
          null;

        const harga = Math.max(0, Number(b.hargaSatuan || 0));
        const stokAwal = Math.max(0, Math.round(Number(b.stokAwal || 0)));
        const stokSekarang = Math.max(0, Math.round(Number(b.stokSekarang || 0)));

        const [inserted] = await tx
          .insert(masterBarang)
          .values({
            clientId,
            kodeBarang: String(b.kodeBarang || '-').slice(0, 50),
            nusp: b.nusp ? String(b.nusp).slice(0, 50) : null,
            namaBarang: String(b.namaBarang || 'Barang').slice(0, 200),
            spesifikasi: b.spesifikasi ? String(b.spesifikasi) : null,
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

      // Helper to auto-provision placeholder barang if historical transaction references a deleted item
      const ensureBarangDbId = async (item: any): Promise<number> => {
        const cid = String(item.barangId || '');
        const found = barangClientIdToDbId.get(cid);
        if (found) return found;

        const [fallback] = await tx
          .insert(masterBarang)
          .values({
            clientId: cid || `brg-orphan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            kodeBarang: String(item.kodeBarang || '-').slice(0, 50),
            nusp: item.nusp ? String(item.nusp).slice(0, 50) : null,
            namaBarang: String(item.namaBarang || 'Barang Arsip').slice(0, 200),
            spesifikasi: item.spesifikasi ? String(item.spesifikasi) : null,
            satuan: String(item.satuan || 'Buah').slice(0, 30),
            hargaSatuan: Math.max(0, Number(item.hargaSatuan || 0)).toFixed(2),
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

      // 3. Pejabat Penandatangan
      const pejabatList = Array.isArray(payload.pejabatList) ? payload.pejabatList : [];
      const stempelFromKop = payload.kopConfig?.stempelUrl ? String(payload.kopConfig.stempelUrl) : null;

      for (let i = 0; i < pejabatList.length; i++) {
        const p = pejabatList[i];
        await tx.insert(pejabatPenandatangan).values({
          clientId: p.id ? String(p.id) : `pej-${i + 1}`,
          peran: p.peran ? String(p.peran).slice(0, 40) : mapPeranToDb(p.role, p.jabatan),
          namaLengkap: String(p.nama || '-').slice(0, 150),
          nip: p.nip ? String(p.nip).slice(0, 50) : null,
          pangkatGolongan: p.pangkatGolongan ? String(p.pangkatGolongan).slice(0, 100) : null,
          jabatanLabel: p.jabatan ? String(p.jabatan).slice(0, 150) : null,
          unitKerja: p.unitKerja ? String(p.unitKerja).slice(0, 150) : null,
          statusJabatan: p.statusJabatan ? String(p.statusJabatan).slice(0, 20) : 'Definitif',
          ttdPngPath: p.tandaTanganUrl ? String(p.tandaTanganUrl) : null,
          stempelPngPath: stempelFromKop,
          aktif: true,
        });
      }

      // 4. Transaksi Penerimaan + Detail
      const penerimaanList = Array.isArray(payload.penerimaanList) ? payload.penerimaanList : [];
      for (let i = 0; i < penerimaanList.length; i++) {
        const r = penerimaanList[i];
        const totalNilai = Math.max(0, Number(r.totalNilai || 0));
        const [insertedRcv] = await tx
          .insert(transaksiPenerimaan)
          .values({
            clientId: r.id ? String(r.id) : `rcv-${i + 1}`,
            noBukti: String(r.noBukti || `BUKTI-${i + 1}`).slice(0, 100),
            tanggal: String(r.tanggal || new Date().toISOString().slice(0, 10)).slice(0, 20),
            sumberDana: String(r.sumberDana || 'BOS Reguler').slice(0, 80),
            penyedia: String(r.penyedia || '').slice(0, 150),
            totalNilai: totalNilai.toFixed(2),
            penerimaId: r.penerimaId ? String(r.penerimaId) : null,
            keterangan: r.keterangan ? String(r.keterangan) : null,
          })
          .returning();

        const items = Array.isArray(r.items) ? r.items : [];
        for (const it of items) {
          const barangDbId = await ensureBarangDbId(it);
          const qty = Math.max(0, Math.round(Number(it.jumlahMasuk || 0)));
          const harga = Math.max(0, Number(it.hargaSatuan || 0));
          const sub = Math.max(0, Number(it.subtotal ?? qty * harga));

          await tx.insert(detailPenerimaan).values({
            penerimaanId: insertedRcv.id,
            barangId: barangDbId,
            barangClientId: it.barangId ? String(it.barangId) : null,
            namaBarangSnapshot: it.namaBarang ? String(it.namaBarang).slice(0, 200) : null,
            kodeBarangSnapshot: it.kodeBarang ? String(it.kodeBarang).slice(0, 50) : null,
            nuspSnapshot: it.nusp ? String(it.nusp).slice(0, 50) : null,
            kodeRekeningSnapshot: it.kodeRekening ? String(it.kodeRekening).slice(0, 50) : null,
            namaRekeningSnapshot: it.namaRekening ? String(it.namaRekening).slice(0, 200) : null,
            spesifikasiSnapshot: it.spesifikasi ? String(it.spesifikasi) : null,
            satuanSnapshot: it.satuan ? String(it.satuan).slice(0, 30) : null,
            jumlah: qty,
            hargaSatuan: harga.toFixed(2),
            subtotal: sub.toFixed(2),
          });
        }
      }

      // 5. Transaksi Penyaluran + Detail
      const transaksiList = Array.isArray(payload.transaksiList) ? payload.transaksiList : [];
      for (let i = 0; i < transaksiList.length; i++) {
        const t = transaksiList[i];
        const [insertedTrx] = await tx
          .insert(transaksiPenyaluran)
          .values({
            clientId: t.id ? String(t.id) : `trx-${i + 1}`,
            nomorUrut: Math.max(1, Math.round(Number(t.nomorUrut || i + 1))),
            noSpb: String(t.noSPB || `SPB-${i + 1}`).slice(0, 100),
            noNpb: t.noNPB ? String(t.noNPB).slice(0, 100) : null,
            noSppb: t.noSPPB ? String(t.noSPPB).slice(0, 100) : null,
            noBast: t.noBAST ? String(t.noBAST).slice(0, 100) : null,
            tanggal: String(t.tanggal || new Date().toISOString().slice(0, 10)).slice(0, 20),
            unitPemohon: String(t.unitPemohon || '-').slice(0, 150),
            keperluanUmum: t.keperluanUmum ? String(t.keperluanUmum) : null,
            pemohonId: t.pemohonId ? String(t.pemohonId) : null,
            pemohonNama: t.pemohonNama ? String(t.pemohonNama).slice(0, 150) : null,
            pemohonNip: t.pemohonNip ? String(t.pemohonNip).slice(0, 50) : null,
            sarprasId: t.sarprasId ? String(t.sarprasId) : null,
            pengurusBarangId: t.pengurusBarangId ? String(t.pengurusBarangId) : null,
            kepsekId: t.kepsekId ? String(t.kepsekId) : null,
            catatan: t.catatan ? String(t.catatan) : null,
            status: t.status ? String(t.status).slice(0, 30) : 'disalurkan',
          })
          .returning();

        const items = Array.isArray(t.items) ? t.items : [];
        for (const it of items) {
          const barangDbId = await ensureBarangDbId(it);
          const qty = Math.max(0, Math.round(Number(it.usulanJumlah || 0)));
          const harga = Math.max(0, Number(it.hargaSatuan || 0));
          const sub = qty * harga;

          await tx.insert(detailPenyaluran).values({
            penyaluranId: insertedTrx.id,
            barangId: barangDbId,
            barangClientId: it.barangId ? String(it.barangId) : null,
            itemClientId: it.id ? String(it.id) : null,
            namaBarangSnapshot: it.namaBarang ? String(it.namaBarang).slice(0, 200) : null,
            kodeBarangSnapshot: it.kodeBarang ? String(it.kodeBarang).slice(0, 50) : null,
            nuspSnapshot: it.nusp ? String(it.nusp).slice(0, 50) : null,
            kodeRekeningSnapshot: it.kodeRekening ? String(it.kodeRekening).slice(0, 50) : null,
            namaRekeningSnapshot: it.namaRekening ? String(it.namaRekening).slice(0, 200) : null,
            spesifikasiSnapshot: it.spesifikasi ? String(it.spesifikasi) : null,
            satuanSnapshot: it.satuan ? String(it.satuan).slice(0, 30) : null,
            sisaBarangSnapshot: Math.max(0, Math.round(Number(it.sisaBarang || 0))),
            jumlah: qty,
            hargaSatuan: harga.toFixed(2),
            subtotal: sub.toFixed(2),
            keperluan: it.keperluan ? String(it.keperluan) : null,
          });
        }
      }

      // 6. Pengaturan Instansi (Kop Surat, Pola Nomor, Users App)
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

      await upsertSetting('kop_surat', payload.kopConfig);
      await upsertSetting('numbering', payload.numberingConfig);
      await upsertSetting('app_users', payload.userList);

      // 7. Log Aktivitas
      await tx.insert(logAktivitas).values({
        aksi: actionLabel.slice(0, 100),
        modul: 'SIMBA_SYNC',
        deskripsi: `Sinkronisasi data: ${barangList.length} barang, ${penerimaanList.length} penerimaan, ${transaksiList.length} penyaluran.`,
        actorEmail: actorEmail.slice(0, 150),
      });
    });

    return { ok: true };
  } catch (error) {
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
        deskripsi,
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
