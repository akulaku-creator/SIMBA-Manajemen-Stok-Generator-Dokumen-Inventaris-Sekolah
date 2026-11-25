-- ==============================================================================
-- SKRIP PENGAMANAN BASIS DATA SIMBA (POSTGRESQL 14+ / CLOUD SQL)
-- Fitur Keamanan:
--   1. Tabel Audit Permanen (db_audit_logs) + Proteksi Append-Only
--   2. Trigger Anti-Manipulasi Stok Manual pada master_barang
--   3. Stored Procedure Transaksi Penerimaan & Penyaluran Barang (Atomic & Locking)
--   4. Stored Procedure Koreksi Stok Opname Terkendali (Khusus Admin)
--   5. Audit Trigger Otomatis pada Seluruh Tabel Utama (INSERT / UPDATE / DELETE)
-- ==============================================================================

-- 1. TABEL AUDIT LEVEL DATABASE (APPEND-ONLY)
CREATE TABLE IF NOT EXISTS db_audit_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(80) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    record_pk TEXT,
    old_data JSONB,
    new_data JSONB,
    changed_fields JSONB,
    db_user VARCHAR(100) NOT NULL DEFAULT current_user,
    app_actor VARCHAR(150),
    client_addr TEXT,
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_db_audit_logs_table_time
    ON db_audit_logs (table_name, executed_at DESC);

-- Proteksi Append-Only: Blokir UPDATE dan DELETE terhadap tabel db_audit_logs
CREATE OR REPLACE FUNCTION fn_protect_db_audit_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'AKSES DITOLAK: Catatan audit database (db_audit_logs) bersifat permanen dan tidak boleh diubah atau dihapus.';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_db_audit_logs ON db_audit_logs;
CREATE TRIGGER trg_protect_db_audit_logs
BEFORE UPDATE OR DELETE ON db_audit_logs
FOR EACH ROW
EXECUTE FUNCTION fn_protect_db_audit_logs();

-- ==============================================================================
-- 2. TRIGGER ANTI-MANIPULASI STOK MANUAL PADA MASTER BARANG
--    Mencegah user/query langsung menjalankan UPDATE master_barang SET stok_saat_ini = ...
--    Perubahan stok hanya diizinkan melalui Stored Procedure resmi SIMBA.
-- ==============================================================================
CREATE OR REPLACE FUNCTION fn_guard_manual_stok_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_allow_mutation TEXT;
BEGIN
    -- Validasi dasar: stok awal dan stok saat ini tidak boleh negatif
    IF NEW.stok_awal < 0 OR NEW.stok_saat_ini < 0 THEN
        RAISE EXCEPTION 'VALIDASI GAGAL: Nilai stok barang (%) tidak boleh negatif.', NEW.nama_barang;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.stok_saat_ini IS DISTINCT FROM OLD.stok_saat_ini
           OR NEW.stok_awal IS DISTINCT FROM OLD.stok_awal THEN
            v_allow_mutation := COALESCE(current_setting('simba.allow_stock_mutation', true), 'off');
            IF v_allow_mutation <> 'on' THEN
                RAISE EXCEPTION 'AKSES DITOLAK: Manipulasi stok secara manual pada master_barang (%) dilarang. Gunakan Stored Procedure transaksi resmi (sp_proses_penerimaan_barang / sp_proses_penyaluran_barang).', OLD.nama_barang;
            END IF;
        END IF;

        NEW.updated_at := CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_manual_stok_mutation ON master_barang;
CREATE TRIGGER trg_guard_manual_stok_mutation
BEFORE INSERT OR UPDATE ON master_barang
FOR EACH ROW
EXECUTE FUNCTION fn_guard_manual_stok_mutation();

-- ==============================================================================
-- 3. STORED PROCEDURE: PENERIMAAN BARANG MASUK (PENGADAAN BOS / HIBAH)
--    Atomik, menggunakan row-level lock (FOR UPDATE), menghitung subtotal/total di server,
--    dan membuka izin mutasi stok secara terkendali hanya dalam blok transaksi prosedur.
-- ==============================================================================
CREATE OR REPLACE PROCEDURE sp_proses_penerimaan_barang(
    p_client_id TEXT,
    p_no_bukti VARCHAR,
    p_tanggal VARCHAR,
    p_sumber_dana VARCHAR,
    p_penyedia VARCHAR,
    p_penerima_id TEXT,
    p_keterangan TEXT,
    p_actor_email VARCHAR,
    p_items JSONB,
    INOUT p_penerimaan_id INT DEFAULT NULL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_item JSONB;
    v_barang RECORD;
    v_barang_id INT;
    v_barang_cid TEXT;
    v_qty INT;
    v_harga NUMERIC(15, 2);
    v_subtotal NUMERIC(15, 2);
    v_total_nilai NUMERIC(15, 2) := 0.00;
    v_actor VARCHAR(150);
    v_item_count INT := 0;
BEGIN
    IF p_no_bukti IS NULL OR LENGTH(TRIM(p_no_bukti)) = 0 THEN
        RAISE EXCEPTION 'VALIDASI GAGAL: Nomor bukti penerimaan wajib diisi.';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'VALIDASI GAGAL: Daftar item penerimaan tidak boleh kosong.';
    END IF;

    v_actor := LEFT(COALESCE(NULLIF(TRIM(p_actor_email), ''), current_user), 150);
    PERFORM set_config('simba.tx_actor', v_actor, true);

    INSERT INTO transaksi_penerimaan (
        client_id, no_bukti, tanggal, sumber_dana, penyedia, total_nilai, penerima_id, keterangan
    ) VALUES (
        COALESCE(NULLIF(TRIM(p_client_id), ''), 'rcv-sp-' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISSMS')),
        LEFT(TRIM(p_no_bukti), 100),
        LEFT(COALESCE(NULLIF(TRIM(p_tanggal), ''), to_char(CURRENT_DATE, 'YYYY-MM-DD')), 20),
        LEFT(COALESCE(NULLIF(TRIM(p_sumber_dana), ''), 'BOS Reguler'), 80),
        LEFT(COALESCE(p_penyedia, ''), 150),
        0.00,
        NULLIF(TRIM(COALESCE(p_penerima_id, '')), ''),
        p_keterangan
    )
    RETURNING id INTO p_penerimaan_id;

    -- Buka izin mutasi stok khusus untuk transaksi prosedur ini
    PERFORM set_config('simba.allow_stock_mutation', 'on', true);

    BEGIN
        FOR v_item IN
            SELECT elem
            FROM jsonb_array_elements(p_items) AS elem
            ORDER BY COALESCE((elem->>'barang_id')::INT, 0), COALESCE(elem->>'barang_client_id', elem->>'barangId', '')
        LOOP
            v_item_count := v_item_count + 1;
            v_barang_id := NULLIF(TRIM(COALESCE(v_item->>'barang_id', '')), '')::INT;
            v_barang_cid := NULLIF(TRIM(COALESCE(v_item->>'barang_client_id', v_item->>'barangId', '')), '');
            v_qty := COALESCE((v_item->>'jumlah')::INT, (v_item->>'jumlahMasuk')::INT, 0);
            v_harga := COALESCE((v_item->>'harga_satuan')::NUMERIC, (v_item->>'hargaSatuan')::NUMERIC, 0);

            IF v_qty <= 0 THEN
                RAISE EXCEPTION 'VALIDASI GAGAL: Jumlah masuk pada item ke-% harus lebih dari 0.', v_item_count;
            END IF;

            IF v_harga < 0 THEN
                RAISE EXCEPTION 'VALIDASI GAGAL: Harga satuan pada item ke-% tidak boleh negatif.', v_item_count;
            END IF;

            -- Kunci baris master_barang (FOR UPDATE) agar bebas race condition
            SELECT * INTO v_barang
            FROM master_barang
            WHERE (v_barang_id IS NOT NULL AND id = v_barang_id)
               OR (v_barang_cid IS NOT NULL AND client_id = v_barang_cid)
            LIMIT 1
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'DATA TIDAK DITEMUKAN: Barang referensi pada item ke-% tidak terdaftar di master_barang.', v_item_count;
            END IF;

            v_subtotal := ROUND(v_qty * v_harga, 2);
            v_total_nilai := v_total_nilai + v_subtotal;

            INSERT INTO detail_penerimaan (
                penerimaan_id, barang_id, barang_client_id,
                nama_barang_snapshot, kode_barang_snapshot, nusp_snapshot,
                kode_rekening_snapshot, nama_rekening_snapshot,
                spesifikasi_snapshot, satuan_snapshot,
                jumlah, harga_satuan, subtotal
            ) VALUES (
                p_penerimaan_id, v_barang.id, COALESCE(v_barang.client_id, v_barang_cid),
                v_barang.nama_barang, v_barang.kode_barang, v_barang.nusp,
                v_barang.kode_rekening, v_barang.nama_rekening,
                v_barang.spesifikasi, v_barang.satuan,
                v_qty, v_harga, v_subtotal
            );

            UPDATE master_barang
            SET stok_saat_ini = stok_saat_ini + v_qty,
                harga_satuan = CASE WHEN v_harga > 0 THEN v_harga ELSE harga_satuan END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_barang.id;
        END LOOP;

        UPDATE transaksi_penerimaan
        SET total_nilai = v_total_nilai
        WHERE id = p_penerimaan_id;

        INSERT INTO log_aktivitas (aksi, modul, deskripsi, actor_email)
        VALUES (
            'SP_PENERIMAAN_BARANG',
            'STORED_PROCEDURE',
            format('Penerimaan %s (%s item, total Rp %s) diproses atomik oleh Stored Procedure.', p_no_bukti, v_item_count, v_total_nilai),
            v_actor
        );
    EXCEPTION WHEN OTHERS THEN
        PERFORM set_config('simba.allow_stock_mutation', 'off', true);
        RAISE;
    END;

    PERFORM set_config('simba.allow_stock_mutation', 'off', true);
END;
$$;

-- ==============================================================================
-- 4. STORED PROCEDURE: PENYALURAN / PENGELUARAN BARANG (NPB -> SPB -> SPPB -> BAST)
--    Memvalidasi ketersediaan stok sebelum pengurangan, mengunci baris master_barang,
--    mencatat snapshot sisa barang, dan mencegah stok minus.
-- ==============================================================================
CREATE OR REPLACE PROCEDURE sp_proses_penyaluran_barang(
    p_client_id TEXT,
    p_nomor_urut INT,
    p_no_spb VARCHAR,
    p_no_npb VARCHAR,
    p_no_sppb VARCHAR,
    p_no_bast VARCHAR,
    p_tanggal VARCHAR,
    p_unit_pemohon VARCHAR,
    p_keperluan_umum TEXT,
    p_pemohon_id TEXT,
    p_pemohon_nama VARCHAR,
    p_pemohon_nip VARCHAR,
    p_sarpras_id TEXT,
    p_pengurus_barang_id TEXT,
    p_kepsek_id TEXT,
    p_catatan TEXT,
    p_actor_email VARCHAR,
    p_items JSONB,
    INOUT p_penyaluran_id INT DEFAULT NULL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_item JSONB;
    v_barang RECORD;
    v_barang_id INT;
    v_barang_cid TEXT;
    v_qty INT;
    v_harga NUMERIC(15, 2);
    v_subtotal NUMERIC(15, 2);
    v_actor VARCHAR(150);
    v_item_count INT := 0;
BEGIN
    IF p_no_spb IS NULL OR LENGTH(TRIM(p_no_spb)) = 0 THEN
        RAISE EXCEPTION 'VALIDASI GAGAL: Nomor SPB penyaluran wajib diisi.';
    END IF;

    IF p_unit_pemohon IS NULL OR LENGTH(TRIM(p_unit_pemohon)) = 0 THEN
        RAISE EXCEPTION 'VALIDASI GAGAL: Unit pemohon wajib diisi.';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'VALIDASI GAGAL: Daftar item penyaluran tidak boleh kosong.';
    END IF;

    v_actor := LEFT(COALESCE(NULLIF(TRIM(p_actor_email), ''), current_user), 150);
    PERFORM set_config('simba.tx_actor', v_actor, true);

    INSERT INTO transaksi_penyaluran (
        client_id, nomor_urut, no_spb, no_npb, no_sppb, no_bast, tanggal,
        unit_pemohon, keperluan_umum, pemohon_id, pemohon_nama, pemohon_nip,
        sarpras_id, pengurus_barang_id, kepsek_id, catatan, status
    ) VALUES (
        COALESCE(NULLIF(TRIM(p_client_id), ''), 'trx-sp-' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISSMS')),
        GREATEST(1, COALESCE(p_nomor_urut, 1)),
        LEFT(TRIM(p_no_spb), 100),
        NULLIF(LEFT(TRIM(COALESCE(p_no_npb, '')), 100), ''),
        NULLIF(LEFT(TRIM(COALESCE(p_no_sppb, '')), 100), ''),
        NULLIF(LEFT(TRIM(COALESCE(p_no_bast, '')), 100), ''),
        LEFT(COALESCE(NULLIF(TRIM(p_tanggal), ''), to_char(CURRENT_DATE, 'YYYY-MM-DD')), 20),
        LEFT(TRIM(p_unit_pemohon), 150),
        p_keperluan_umum,
        NULLIF(TRIM(COALESCE(p_pemohon_id, '')), ''),
        NULLIF(LEFT(TRIM(COALESCE(p_pemohon_nama, '')), 150), ''),
        NULLIF(LEFT(TRIM(COALESCE(p_pemohon_nip, '')), 50), ''),
        NULLIF(TRIM(COALESCE(p_sarpras_id, '')), ''),
        NULLIF(TRIM(COALESCE(p_pengurus_barang_id, '')), ''),
        NULLIF(TRIM(COALESCE(p_kepsek_id, '')), ''),
        p_catatan,
        'disalurkan'
    )
    RETURNING id INTO p_penyaluran_id;

    -- Buka izin mutasi stok khusus untuk transaksi prosedur ini
    PERFORM set_config('simba.allow_stock_mutation', 'on', true);

    BEGIN
        FOR v_item IN
            SELECT elem
            FROM jsonb_array_elements(p_items) AS elem
            ORDER BY COALESCE((elem->>'barang_id')::INT, 0), COALESCE(elem->>'barang_client_id', elem->>'barangId', '')
        LOOP
            v_item_count := v_item_count + 1;
            v_barang_id := NULLIF(TRIM(COALESCE(v_item->>'barang_id', '')), '')::INT;
            v_barang_cid := NULLIF(TRIM(COALESCE(v_item->>'barang_client_id', v_item->>'barangId', '')), '');
            v_qty := COALESCE((v_item->>'jumlah')::INT, (v_item->>'usulanJumlah')::INT, 0);

            IF v_qty <= 0 THEN
                RAISE EXCEPTION 'VALIDASI GAGAL: Jumlah penyaluran pada item ke-% harus lebih dari 0.', v_item_count;
            END IF;

            -- Kunci baris master_barang (FOR UPDATE) secara deterministik
            SELECT * INTO v_barang
            FROM master_barang
            WHERE (v_barang_id IS NOT NULL AND id = v_barang_id)
               OR (v_barang_cid IS NOT NULL AND client_id = v_barang_cid)
            LIMIT 1
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'DATA TIDAK DITEMUKAN: Barang referensi pada item ke-% tidak terdaftar di master_barang.', v_item_count;
            END IF;

            IF v_barang.stok_saat_ini < v_qty THEN
                RAISE EXCEPTION 'STOK TIDAK MENCUKUPI: Barang "%" hanya tersedia % % (diminta % %).',
                    v_barang.nama_barang, v_barang.stok_saat_ini, v_barang.satuan, v_qty, v_barang.satuan;
            END IF;

            v_harga := COALESCE(
                NULLIF((v_item->>'harga_satuan')::NUMERIC, 0),
                NULLIF((v_item->>'hargaSatuan')::NUMERIC, 0),
                v_barang.harga_satuan,
                0
            );
            v_subtotal := ROUND(v_qty * v_harga, 2);

            INSERT INTO detail_penyaluran (
                penyaluran_id, barang_id, barang_client_id, item_client_id,
                nama_barang_snapshot, kode_barang_snapshot, nusp_snapshot,
                kode_rekening_snapshot, nama_rekening_snapshot,
                spesifikasi_snapshot, satuan_snapshot,
                sisa_barang_snapshot, jumlah, harga_satuan, subtotal, keperluan
            ) VALUES (
                p_penyaluran_id, v_barang.id, COALESCE(v_barang.client_id, v_barang_cid),
                NULLIF(TRIM(COALESCE(v_item->>'id', '')), ''),
                v_barang.nama_barang, v_barang.kode_barang, v_barang.nusp,
                v_barang.kode_rekening, v_barang.nama_rekening,
                v_barang.spesifikasi, v_barang.satuan,
                v_barang.stok_saat_ini, v_qty, v_harga, v_subtotal,
                NULLIF(TRIM(COALESCE(v_item->>'keperluan', '')), '')
            );

            UPDATE master_barang
            SET stok_saat_ini = stok_saat_ini - v_qty,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_barang.id;
        END LOOP;

        INSERT INTO log_aktivitas (aksi, modul, deskripsi, actor_email)
        VALUES (
            'SP_PENYALURAN_BARANG',
            'STORED_PROCEDURE',
            format('Penyaluran %s untuk %s (%s item) diproses atomik oleh Stored Procedure.', p_no_spb, p_unit_pemohon, v_item_count),
            v_actor
        );
    EXCEPTION WHEN OTHERS THEN
        PERFORM set_config('simba.allow_stock_mutation', 'off', true);
        RAISE;
    END;

    PERFORM set_config('simba.allow_stock_mutation', 'off', true);
END;
$$;

-- ==============================================================================
-- 5. STORED PROCEDURE: KOREKSI STOK OPNAME TERKENDALI (KHUSUS ADMIN)
--    Satu-satunya jalur resmi penyesuaian stok fisik hasil stock opname,
--    wajib menyertakan alasan koreksi dan identitas aktor.
-- ==============================================================================
CREATE OR REPLACE PROCEDURE sp_koreksi_stok_opname(
    p_barang_id INT,
    p_stok_baru INT,
    p_alasan TEXT,
    p_actor_email VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_barang RECORD;
    v_actor VARCHAR(150);
BEGIN
    IF p_stok_baru IS NULL OR p_stok_baru < 0 THEN
        RAISE EXCEPTION 'VALIDASI GAGAL: Stok baru hasil opname tidak boleh negatif.';
    END IF;

    IF p_alasan IS NULL OR LENGTH(TRIM(p_alasan)) < 5 THEN
        RAISE EXCEPTION 'VALIDASI GAGAL: Alasan koreksi stok opname wajib diisi minimal 5 karakter.';
    END IF;

    v_actor := LEFT(COALESCE(NULLIF(TRIM(p_actor_email), ''), current_user), 150);
    PERFORM set_config('simba.tx_actor', v_actor, true);

    SELECT * INTO v_barang FROM master_barang WHERE id = p_barang_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'DATA TIDAK DITEMUKAN: Barang dengan ID % tidak ada.', p_barang_id;
    END IF;

    PERFORM set_config('simba.allow_stock_mutation', 'on', true);

    BEGIN
        UPDATE master_barang
        SET stok_saat_ini = p_stok_baru,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_barang_id;

        INSERT INTO log_aktivitas (aksi, modul, deskripsi, actor_email)
        VALUES (
            'SP_KOREKSI_OPNAME',
            'STORED_PROCEDURE',
            format('Koreksi opname "%s": %s -> %s (%s). Alasan: %s', v_barang.nama_barang, v_barang.stok_saat_ini, p_stok_baru, v_barang.satuan, TRIM(p_alasan)),
            v_actor
        );
    EXCEPTION WHEN OTHERS THEN
        PERFORM set_config('simba.allow_stock_mutation', 'off', true);
        RAISE;
    END;

    PERFORM set_config('simba.allow_stock_mutation', 'off', true);
END;
$$;

-- ==============================================================================
-- 6. AUDIT TRIGGER LEVEL DATABASE UNTUK MENCATAT SETIAP PERUBAHAN DATA
--    Merekam INSERT, UPDATE, dan DELETE lengkap dengan JSON sebelum & sesudah,
--    kolom yang berubah, user PostgreSQL, aktor aplikasi, dan IP klien.
--    Kolom rahasia (app_users_secrets) otomatis disamarkan (redacted).
-- ==============================================================================
CREATE OR REPLACE FUNCTION fn_simba_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old JSONB := NULL;
    v_new JSONB := NULL;
    v_changed JSONB := NULL;
    v_pk TEXT := NULL;
    v_actor VARCHAR(150);
BEGIN
    v_actor := LEFT(COALESCE(NULLIF(current_setting('simba.tx_actor', true), ''), current_user), 150);

    IF TG_OP = 'INSERT' THEN
        v_new := to_jsonb(NEW);
        v_pk := COALESCE(v_new->>'id', v_new->>'client_id', v_new->>'config_key');
    ELSIF TG_OP = 'UPDATE' THEN
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
        v_pk := COALESCE(v_new->>'id', v_old->>'id', v_new->>'config_key');

        SELECT COALESCE(jsonb_agg(key), '[]'::jsonb)
        INTO v_changed
        FROM jsonb_each(v_new) AS n(key, val)
        WHERE v_old -> key IS DISTINCT FROM val;
    ELSIF TG_OP = 'DELETE' THEN
        v_old := to_jsonb(OLD);
        v_pk := COALESCE(v_old->>'id', v_old->>'client_id', v_old->>'config_key');
    END IF;

    -- Samarkan hash kredensial pengguna agar tidak pernah bocor ke tabel audit
    IF TG_TABLE_NAME = 'pengaturan_instansi' THEN
        IF v_old IS NOT NULL AND v_old->>'config_key' = 'app_users_secrets' THEN
            v_old := jsonb_set(v_old, '{payload}', '{"redacted": true}'::jsonb);
        END IF;
        IF v_new IS NOT NULL AND v_new->>'config_key' = 'app_users_secrets' THEN
            v_new := jsonb_set(v_new, '{payload}', '{"redacted": true}'::jsonb);
        END IF;
    END IF;

    INSERT INTO db_audit_logs (
        table_name, operation, record_pk, old_data, new_data, changed_fields,
        db_user, app_actor, client_addr, executed_at
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        v_pk,
        v_old,
        v_new,
        v_changed,
        current_user,
        v_actor,
        COALESCE(host(inet_client_addr()), 'local'),
        CURRENT_TIMESTAMP
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

-- Pasang Audit Trigger pada seluruh tabel inti SIMBA
DROP TRIGGER IF EXISTS trg_audit_master_barang ON master_barang;
CREATE TRIGGER trg_audit_master_barang
AFTER INSERT OR UPDATE OR DELETE ON master_barang
FOR EACH ROW EXECUTE FUNCTION fn_simba_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_kategori_rekening ON kategori_rekening;
CREATE TRIGGER trg_audit_kategori_rekening
AFTER INSERT OR UPDATE OR DELETE ON kategori_rekening
FOR EACH ROW EXECUTE FUNCTION fn_simba_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_pejabat_penandatangan ON pejabat_penandatangan;
CREATE TRIGGER trg_audit_pejabat_penandatangan
AFTER INSERT OR UPDATE OR DELETE ON pejabat_penandatangan
FOR EACH ROW EXECUTE FUNCTION fn_simba_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_transaksi_penerimaan ON transaksi_penerimaan;
CREATE TRIGGER trg_audit_transaksi_penerimaan
AFTER INSERT OR UPDATE OR DELETE ON transaksi_penerimaan
FOR EACH ROW EXECUTE FUNCTION fn_simba_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_detail_penerimaan ON detail_penerimaan;
CREATE TRIGGER trg_audit_detail_penerimaan
AFTER INSERT OR UPDATE OR DELETE ON detail_penerimaan
FOR EACH ROW EXECUTE FUNCTION fn_simba_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_transaksi_penyaluran ON transaksi_penyaluran;
CREATE TRIGGER trg_audit_transaksi_penyaluran
AFTER INSERT OR UPDATE OR DELETE ON transaksi_penyaluran
FOR EACH ROW EXECUTE FUNCTION fn_simba_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_detail_penyaluran ON detail_penyaluran;
CREATE TRIGGER trg_audit_detail_penyaluran
AFTER INSERT OR UPDATE OR DELETE ON detail_penyaluran
FOR EACH ROW EXECUTE FUNCTION fn_simba_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_pengaturan_instansi ON pengaturan_instansi;
CREATE TRIGGER trg_audit_pengaturan_instansi
AFTER INSERT OR UPDATE OR DELETE ON pengaturan_instansi
FOR EACH ROW EXECUTE FUNCTION fn_simba_audit_trigger();

-- ==============================================================================
-- 7. REKOMENDASI PEMBATASAN HAK AKSES ROLE NON-ADMIN (OPSIONAL UNTUK DBA)
-- ==============================================================================
-- REVOKE UPDATE (stok_awal, stok_saat_ini) ON master_barang FROM simba_app_user;
-- REVOKE UPDATE, DELETE ON db_audit_logs FROM PUBLIC;
-- GRANT EXECUTE ON PROCEDURE sp_proses_penerimaan_barang TO simba_app_user;
-- GRANT EXECUTE ON PROCEDURE sp_proses_penyaluran_barang TO simba_app_user;
