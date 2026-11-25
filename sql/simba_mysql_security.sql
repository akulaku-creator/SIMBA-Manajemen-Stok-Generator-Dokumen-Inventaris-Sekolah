-- ==============================================================================
-- SKRIP PENGAMANAN BASIS DATA SIMBA (MYSQL 8.0+ / MARIADB - XAMPP / LARAGON)
-- Fitur Keamanan:
--   1. Tabel Audit Permanen (db_audit_logs) + Trigger Append-Only
--   2. Trigger Anti-Manipulasi Stok Manual (trg_guard_manual_stok_update)
--   3. Stored Procedure Transaksi Penerimaan & Penyaluran Barang (Atomic & Lock)
--   4. Audit Trigger Otomatis pada Tabel Utama (INSERT / UPDATE / DELETE)
-- ==============================================================================

-- 1. TABEL AUDIT LEVEL DATABASE (APPEND-ONLY)
CREATE TABLE IF NOT EXISTS db_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(80) NOT NULL,
    operation ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    record_pk VARCHAR(100) NULL,
    old_data JSON NULL,
    new_data JSON NULL,
    db_user VARCHAR(100) NOT NULL,
    app_actor VARCHAR(150) NULL,
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_table_time (table_name, executed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$

-- Proteksi Append-Only: Tolak UPDATE & DELETE pada db_audit_logs
DROP TRIGGER IF EXISTS trg_protect_db_audit_logs_upd$$
CREATE TRIGGER trg_protect_db_audit_logs_upd
BEFORE UPDATE ON db_audit_logs
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'AKSES DITOLAK: Catatan audit database bersifat permanen dan tidak boleh diubah.';
END$$

DROP TRIGGER IF EXISTS trg_protect_db_audit_logs_del$$
CREATE TRIGGER trg_protect_db_audit_logs_del
BEFORE DELETE ON db_audit_logs
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'AKSES DITOLAK: Catatan audit database bersifat permanen dan tidak boleh dihapus.';
END$$

-- ==============================================================================
-- 2. TRIGGER ANTI-MANIPULASI STOK MANUAL PADA MASTER BARANG
--    Memblokir UPDATE stok_sekarang / stok_awal langsung oleh user.
--    Hanya mengizinkan mutasi stok saat @simba_allow_stock_mutation = 1
--    yang diaktifkan oleh Stored Procedure resmi.
-- ==============================================================================
DROP TRIGGER IF EXISTS trg_guard_manual_stok_insert$$
CREATE TRIGGER trg_guard_manual_stok_insert
BEFORE INSERT ON master_barang
FOR EACH ROW
BEGIN
    IF NEW.stok_awal < 0 OR NEW.stok_sekarang < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'VALIDASI GAGAL: Stok awal maupun stok sekarang tidak boleh bernilai negatif.';
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_guard_manual_stok_update$$
CREATE TRIGGER trg_guard_manual_stok_update
BEFORE UPDATE ON master_barang
FOR EACH ROW
BEGIN
    IF NEW.stok_awal < 0 OR NEW.stok_sekarang < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'VALIDASI GAGAL: Nilai stok tidak boleh negatif.';
    END IF;

    IF (NEW.stok_sekarang <> OLD.stok_sekarang OR NEW.stok_awal <> OLD.stok_awal) THEN
        IF IFNULL(@simba_allow_stock_mutation, 0) <> 1 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'AKSES DITOLAK: Manipulasi stok secara manual dilarang. Gunakan Stored Procedure sp_proses_penerimaan_barang atau sp_proses_penyaluran_barang.';
        END IF;
    END IF;

    SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$

-- ==============================================================================
-- 3. STORED PROCEDURE: PENERIMAAN BARANG MASUK (BOS / HIBAH)
--    Parameter p_items berbentuk JSON array:
--    '[{"barang_id":"brg-1","jumlah_masuk":10,"harga_satuan":45000}]'
-- ==============================================================================
DROP PROCEDURE IF EXISTS sp_proses_penerimaan_barang$$
CREATE PROCEDURE sp_proses_penerimaan_barang(
    IN p_id VARCHAR(36),
    IN p_tanggal DATE,
    IN p_no_bukti VARCHAR(100),
    IN p_sumber_dana VARCHAR(80),
    IN p_penyedia VARCHAR(150),
    IN p_penerima_id VARCHAR(36),
    IN p_keterangan TEXT,
    IN p_actor_email VARCHAR(150),
    IN p_items JSON
)
BEGIN
    DECLARE v_done INT DEFAULT 0;
    DECLARE v_barang_id VARCHAR(36);
    DECLARE v_qty INT;
    DECLARE v_harga DECIMAL(15, 2);
    DECLARE v_current_stok INT;
    DECLARE v_total_nilai DECIMAL(15, 2) DEFAULT 0.00;
    DECLARE v_penerimaan_id VARCHAR(36);

    DECLARE cur_items CURSOR FOR
        SELECT jt.barang_id, jt.jumlah_masuk, jt.harga_satuan
        FROM JSON_TABLE(
            p_items,
            '$[*]' COLUMNS (
                barang_id VARCHAR(36) PATH '$.barang_id',
                jumlah_masuk INT PATH '$.jumlah_masuk',
                harga_satuan DECIMAL(15, 2) PATH '$.harga_satuan'
            )
        ) AS jt
        ORDER BY jt.barang_id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET @simba_allow_stock_mutation = 0;
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_no_bukti IS NULL OR CHAR_LENGTH(TRIM(p_no_bukti)) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VALIDASI GAGAL: Nomor bukti penerimaan wajib diisi.';
    END IF;

    IF p_items IS NULL OR JSON_LENGTH(p_items) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VALIDASI GAGAL: Daftar item penerimaan tidak boleh kosong.';
    END IF;

    SET v_penerimaan_id = COALESCE(NULLIF(TRIM(p_id), ''), UUID());
    SET @simba_tx_actor = COALESCE(NULLIF(TRIM(p_actor_email), ''), CURRENT_USER());

    START TRANSACTION;

    INSERT INTO transaksi_penerimaan (
        id, tanggal, no_bukti, sumber_dana, penyedia, penerima_id, total_nilai, keterangan
    ) VALUES (
        v_penerimaan_id, p_tanggal, TRIM(p_no_bukti), p_sumber_dana, p_penyedia, p_penerima_id, 0.00, p_keterangan
    );

    SET @simba_allow_stock_mutation = 1;

    OPEN cur_items;
    read_loop: LOOP
        FETCH cur_items INTO v_barang_id, v_qty, v_harga;
        IF v_done = 1 THEN
            LEAVE read_loop;
        END IF;

        IF v_qty IS NULL OR v_qty <= 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VALIDASI GAGAL: Jumlah masuk harus lebih dari 0.';
        END IF;

        IF v_harga IS NULL OR v_harga < 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VALIDASI GAGAL: Harga satuan tidak boleh negatif.';
        END IF;

        -- Kunci baris master_barang agar transaksi bersamaan tetap aman
        SELECT stok_sekarang INTO v_current_stok
        FROM master_barang
        WHERE id = v_barang_id
        FOR UPDATE;

        IF v_current_stok IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DATA TIDAK DITEMUKAN: ID barang pada detail penerimaan tidak valid.';
        END IF;

        INSERT INTO transaksi_penerimaan_detail (
            id, penerimaan_id, barang_id, jumlah_masuk, harga_satuan
        ) VALUES (
            UUID(), v_penerimaan_id, v_barang_id, v_qty, v_harga
        );

        UPDATE master_barang
        SET stok_sekarang = stok_sekarang + v_qty,
            harga_satuan = CASE WHEN v_harga > 0 THEN v_harga ELSE harga_satuan END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_barang_id;

        SET v_total_nilai = v_total_nilai + (v_qty * v_harga);
    END LOOP;
    CLOSE cur_items;

    UPDATE transaksi_penerimaan
    SET total_nilai = v_total_nilai
    WHERE id = v_penerimaan_id;

    SET @simba_allow_stock_mutation = 0;
    COMMIT;
END$$

-- ==============================================================================
-- 4. STORED PROCEDURE: PENYALURAN / PENGELUARAN BARANG (NPB -> SPB -> SPPB -> BAST)
--    Parameter p_items berbentuk JSON array:
--    '[{"barang_id":"brg-1","usulan_jumlah":5,"keperluan":"Ujian Sekolah"}]'
-- ==============================================================================
DROP PROCEDURE IF EXISTS sp_proses_penyaluran_barang$$
CREATE PROCEDURE sp_proses_penyaluran_barang(
    IN p_id VARCHAR(36),
    IN p_nomor_urut INT,
    IN p_tanggal DATE,
    IN p_unit_pemohon VARCHAR(150),
    IN p_keperluan_umum TEXT,
    IN p_no_npb VARCHAR(80),
    IN p_no_spb VARCHAR(80),
    IN p_no_sppb VARCHAR(80),
    IN p_no_bast VARCHAR(80),
    IN p_pemohon_id VARCHAR(36),
    IN p_sarpras_id VARCHAR(36),
    IN p_pengurus_barang_id VARCHAR(36),
    IN p_kepsek_id VARCHAR(36),
    IN p_catatan TEXT,
    IN p_actor_email VARCHAR(150),
    IN p_items JSON
)
BEGIN
    DECLARE v_done INT DEFAULT 0;
    DECLARE v_barang_id VARCHAR(36);
    DECLARE v_qty INT;
    DECLARE v_keperluan VARCHAR(255);
    DECLARE v_current_stok INT;
    DECLARE v_harga DECIMAL(15, 2);
    DECLARE v_trx_id VARCHAR(36);

    DECLARE cur_items CURSOR FOR
        SELECT jt.barang_id, jt.usulan_jumlah, jt.keperluan
        FROM JSON_TABLE(
            p_items,
            '$[*]' COLUMNS (
                barang_id VARCHAR(36) PATH '$.barang_id',
                usulan_jumlah INT PATH '$.usulan_jumlah',
                keperluan VARCHAR(255) PATH '$.keperluan'
            )
        ) AS jt
        ORDER BY jt.barang_id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET @simba_allow_stock_mutation = 0;
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_no_spb IS NULL OR CHAR_LENGTH(TRIM(p_no_spb)) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VALIDASI GAGAL: Nomor SPB wajib diisi.';
    END IF;

    IF p_items IS NULL OR JSON_LENGTH(p_items) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VALIDASI GAGAL: Daftar item penyaluran tidak boleh kosong.';
    END IF;

    SET v_trx_id = COALESCE(NULLIF(TRIM(p_id), ''), UUID());
    SET @simba_tx_actor = COALESCE(NULLIF(TRIM(p_actor_email), ''), CURRENT_USER());

    START TRANSACTION;

    INSERT INTO transaksi_pengeluaran (
        id, nomor_urut, tanggal, unit_pemohon, keperluan_umum,
        no_npb, no_spb, no_sppb, no_bast,
        pemohon_id, sarpras_id, pengurus_barang_id, kepsek_id, catatan
    ) VALUES (
        v_trx_id, GREATEST(1, IFNULL(p_nomor_urut, 1)), p_tanggal, p_unit_pemohon, p_keperluan_umum,
        p_no_npb, TRIM(p_no_spb), p_no_sppb, p_no_bast,
        p_pemohon_id, p_sarpras_id, p_pengurus_barang_id, p_kepsek_id, p_catatan
    );

    SET @simba_allow_stock_mutation = 1;

    OPEN cur_items;
    read_loop: LOOP
        FETCH cur_items INTO v_barang_id, v_qty, v_keperluan;
        IF v_done = 1 THEN
            LEAVE read_loop;
        END IF;

        IF v_qty IS NULL OR v_qty <= 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VALIDASI GAGAL: Jumlah penyaluran harus lebih dari 0.';
        END IF;

        SELECT stok_sekarang, harga_satuan INTO v_current_stok, v_harga
        FROM master_barang
        WHERE id = v_barang_id
        FOR UPDATE;

        IF v_current_stok IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DATA TIDAK DITEMUKAN: ID barang penyaluran tidak valid.';
        END IF;

        IF v_current_stok < v_qty THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'STOK TIDAK MENCUKUPI: Sisa stok di gudang lebih kecil dari jumlah permintaan.';
        END IF;

        INSERT INTO transaksi_pengeluaran_detail (
            id, transaksi_id, barang_id, sisa_stok_saat_pengajuan, usulan_jumlah, harga_satuan, keperluan_spesifik
        ) VALUES (
            UUID(), v_trx_id, v_barang_id, v_current_stok, v_qty, IFNULL(v_harga, 0.00), v_keperluan
        );

        UPDATE master_barang
        SET stok_sekarang = stok_sekarang - v_qty,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_barang_id;
    END LOOP;
    CLOSE cur_items;

    SET @simba_allow_stock_mutation = 0;
    COMMIT;
END$$

-- ==============================================================================
-- 5. AUDIT TRIGGER LEVEL DATABASE (MASTER BARANG & TRANSAKSI UTAMA)
-- ==============================================================================
DROP TRIGGER IF EXISTS trg_audit_master_barang_ins$$
CREATE TRIGGER trg_audit_master_barang_ins
AFTER INSERT ON master_barang
FOR EACH ROW
BEGIN
    INSERT INTO db_audit_logs (table_name, operation, record_pk, old_data, new_data, db_user, app_actor)
    VALUES (
        'master_barang', 'INSERT', NEW.id, NULL,
        JSON_OBJECT('id', NEW.id, 'kode_barang', NEW.kode_barang, 'nusp', NEW.nusp, 'nama_barang', NEW.nama_barang, 'stok_awal', NEW.stok_awal, 'stok_sekarang', NEW.stok_sekarang, 'harga_satuan', NEW.harga_satuan),
        CURRENT_USER(), IFNULL(@simba_tx_actor, CURRENT_USER())
    );
END$$

DROP TRIGGER IF EXISTS trg_audit_master_barang_upd$$
CREATE TRIGGER trg_audit_master_barang_upd
AFTER UPDATE ON master_barang
FOR EACH ROW
BEGIN
    INSERT INTO db_audit_logs (table_name, operation, record_pk, old_data, new_data, db_user, app_actor)
    VALUES (
        'master_barang', 'UPDATE', NEW.id,
        JSON_OBJECT('id', OLD.id, 'nama_barang', OLD.nama_barang, 'stok_awal', OLD.stok_awal, 'stok_sekarang', OLD.stok_sekarang, 'harga_satuan', OLD.harga_satuan),
        JSON_OBJECT('id', NEW.id, 'nama_barang', NEW.nama_barang, 'stok_awal', NEW.stok_awal, 'stok_sekarang', NEW.stok_sekarang, 'harga_satuan', NEW.harga_satuan),
        CURRENT_USER(), IFNULL(@simba_tx_actor, CURRENT_USER())
    );
END$$

DROP TRIGGER IF EXISTS trg_audit_master_barang_del$$
CREATE TRIGGER trg_audit_master_barang_del
AFTER DELETE ON master_barang
FOR EACH ROW
BEGIN
    INSERT INTO db_audit_logs (table_name, operation, record_pk, old_data, new_data, db_user, app_actor)
    VALUES (
        'master_barang', 'DELETE', OLD.id,
        JSON_OBJECT('id', OLD.id, 'kode_barang', OLD.kode_barang, 'nama_barang', OLD.nama_barang, 'stok_sekarang', OLD.stok_sekarang),
        NULL,
        CURRENT_USER(), IFNULL(@simba_tx_actor, CURRENT_USER())
    );
END$$

DROP TRIGGER IF EXISTS trg_audit_trx_penerimaan_ins$$
CREATE TRIGGER trg_audit_trx_penerimaan_ins
AFTER INSERT ON transaksi_penerimaan
FOR EACH ROW
BEGIN
    INSERT INTO db_audit_logs (table_name, operation, record_pk, old_data, new_data, db_user, app_actor)
    VALUES (
        'transaksi_penerimaan', 'INSERT', NEW.id, NULL,
        JSON_OBJECT('id', NEW.id, 'no_bukti', NEW.no_bukti, 'tanggal', NEW.tanggal, 'sumber_dana', NEW.sumber_dana, 'penyedia', NEW.penyedia, 'total_nilai', NEW.total_nilai),
        CURRENT_USER(), IFNULL(@simba_tx_actor, CURRENT_USER())
    );
END$$

DROP TRIGGER IF EXISTS trg_audit_trx_penerimaan_del$$
CREATE TRIGGER trg_audit_trx_penerimaan_del
AFTER DELETE ON transaksi_penerimaan
FOR EACH ROW
BEGIN
    INSERT INTO db_audit_logs (table_name, operation, record_pk, old_data, new_data, db_user, app_actor)
    VALUES (
        'transaksi_penerimaan', 'DELETE', OLD.id,
        JSON_OBJECT('id', OLD.id, 'no_bukti', OLD.no_bukti, 'tanggal', OLD.tanggal, 'total_nilai', OLD.total_nilai),
        NULL,
        CURRENT_USER(), IFNULL(@simba_tx_actor, CURRENT_USER())
    );
END$$

DROP TRIGGER IF EXISTS trg_audit_trx_pengeluaran_ins$$
CREATE TRIGGER trg_audit_trx_pengeluaran_ins
AFTER INSERT ON transaksi_pengeluaran
FOR EACH ROW
BEGIN
    INSERT INTO db_audit_logs (table_name, operation, record_pk, old_data, new_data, db_user, app_actor)
    VALUES (
        'transaksi_pengeluaran', 'INSERT', NEW.id, NULL,
        JSON_OBJECT('id', NEW.id, 'nomor_urut', NEW.nomor_urut, 'tanggal', NEW.tanggal, 'unit_pemohon', NEW.unit_pemohon, 'no_spb', NEW.no_spb, 'no_bast', NEW.no_bast),
        CURRENT_USER(), IFNULL(@simba_tx_actor, CURRENT_USER())
    );
END$$

DROP TRIGGER IF EXISTS trg_audit_trx_pengeluaran_del$$
CREATE TRIGGER trg_audit_trx_pengeluaran_del
AFTER DELETE ON transaksi_pengeluaran
FOR EACH ROW
BEGIN
    INSERT INTO db_audit_logs (table_name, operation, record_pk, old_data, new_data, db_user, app_actor)
    VALUES (
        'transaksi_pengeluaran', 'DELETE', OLD.id,
        JSON_OBJECT('id', OLD.id, 'nomor_urut', OLD.nomor_urut, 'no_spb', OLD.no_spb, 'no_bast', OLD.no_bast),
        NULL,
        CURRENT_USER(), IFNULL(@simba_tx_actor, CURRENT_USER())
    );
END$$

DELIMITER ;
