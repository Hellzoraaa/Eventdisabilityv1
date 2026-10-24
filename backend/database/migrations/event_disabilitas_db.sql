-- ==========================================================================
-- event_disabilitas_db  —  SQL GABUNGAN (struktur + upgrade + data awal)
-- MySQL 8.x / HeidiSQL (Laragon)
--
-- Menggantikan 8 file lama:
--   schema.sql, seed.sql, yangbner.sql, add_event_photo_column.sql,
--   add_event_schedule.sql, create_tpq_programs.sql,
--   add_tpq_duration_wa_documentation.sql, add_tpq_publication_permission.sql
-- ditambah kolom fitur link WA (add_wa_link.sql).
--
-- AMAN DIJALANKAN BERULANG KALI (idempoten):
--   * tidak ada DROP TABLE / DELETE -> data lama tidak hilang
--   * tabel dibuat hanya jika belum ada
--   * kolom baru ditambahkan hanya jika belum ada (database lama otomatis di-upgrade)
--   * data awal memakai INSERT IGNORE (tidak menimpa data yang sudah ada)
--
-- CARA PAKAI: HeidiSQL -> File -> Run SQL file... (atau tab Query, F9).
-- Jika memakai tab Query, jalankan seluruh isi sekaligus.
-- ==========================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `event_disabilitas_db`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `event_disabilitas_db`;

-- ==========================================================================
-- 1. STRUKTUR TABEL (versi terbaru)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id_string` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('superadmin','mitra') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'mitra',
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_logo` longtext COLLATE utf8mb4_unicode_ci,
  `province` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `avatar` longtext COLLATE utf8mb4_unicode_ci,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id_string` (`user_id_string`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `disabilities` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `disability_id_string` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kode` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kategori_utama` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci,
  `metode_pembelajaran` text COLLATE utf8mb4_unicode_ci,
  `fasilitas_rekomendasi` json DEFAULT NULL,
  `warna_hex` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '#005a71',
  `icon` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'visibility',
  `is_aktif` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `disability_id_string` (`disability_id_string`),
  UNIQUE KEY `kode` (`kode`),
  KEY `idx_disabilities_is_aktif` (`is_aktif`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `event_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `category_id_string` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kode` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci,
  `icon` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'event',
  `warna_hex` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '#005a71',
  `is_aktif` tinyint(1) NOT NULL DEFAULT '1',
  `urutan` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_id_string` (`category_id_string`),
  UNIQUE KEY `kode` (`kode`),
  KEY `idx_event_categories_is_aktif` (`is_aktif`),
  KEY `idx_event_categories_urutan` (`urutan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `application_settings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'global_config',
  `application_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Alquran Disabilitas',
  `logo` longtext COLLATE utf8mb4_unicode_ci,
  `favicon` longtext COLLATE utf8mb4_unicode_ci,
  `topbar_color` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT '#005a71',
  `primary_color` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT '#005a71',
  `secondary_color` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT '#ab3425',
  `accent_color` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT '#d97706',
  `public_role_label` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Peserta',
  `institution_subtitle` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'Kementerian Agama Republik Indonesia',
  `logo_size` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'large',
  `header_bg_image` longtext COLLATE utf8mb4_unicode_ci,
  `about_bg_image` longtext COLLATE utf8mb4_unicode_ci,
  `header_bg_overlay` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'dark',
  `logo_container_bg` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'white',
  `updated_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'Super Administrator',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quran_communities` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `community_id_string` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `nama_lembaga` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logo` longtext COLLATE utf8mb4_unicode_ci,
  `kategori_disabilitas` json NOT NULL COMMENT 'Array kategori disabilitas binaan',
  `provinsi` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kota` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alamat_lengkap` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `kontak_wa` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kontak_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jumlah_santri` int unsigned NOT NULL DEFAULT '0',
  `fasilitas_tersedia` json NOT NULL,
  `program_unggulan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `community_id_string` (`community_id_string`),
  KEY `idx_communities_provinsi` (`provinsi`),
  KEY `idx_communities_kota` (`kota`),
  KEY `fk_community_user` (`user_id`),
  CONSTRAINT `fk_community_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `training_proposals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `proposal_id_string` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mitra_id` bigint unsigned DEFAULT NULL,
  `mitra_id_string` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nama_kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenis_event` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_category_id_string` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `disability_id_string` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deskripsi_pelatihan` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `benefit` text COLLATE utf8mb4_unicode_ci,
  `persyaratan` text COLLATE utf8mb4_unicode_ci,
  `batas_pendaftaran` date DEFAULT NULL,
  `lokasi_dan_alamat` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `provinsi` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kota` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `tanggal_kegiatan` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `waktu_mulai` time DEFAULT NULL,
  `waktu_selesai` time DEFAULT NULL,
  `target_dan_kuota_peserta` int unsigned NOT NULL,
  `kuota_disetujui` int unsigned DEFAULT NULL,
  `kebutuhan_peserta` json NOT NULL,
  `foto_dokumentasi` longtext COLLATE utf8mb4_unicode_ci,
  `status` enum('menunggu_persetujuan','disetujui','ditolak') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'menunggu_persetujuan',
  `alasan_penolakan` text COLLATE utf8mb4_unicode_ci,
  `tanggal_persetujuan` timestamp NULL DEFAULT NULL,
  `link_pendaftaran` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `link_grup_wa` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_aktif` tinyint(1) NOT NULL DEFAULT '0',
  `jumlah_pendaftar` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `proposal_id_string` (`proposal_id_string`),
  KEY `idx_proposals_status` (`status`),
  KEY `idx_proposals_is_aktif` (`is_aktif`),
  KEY `fk_proposal_mitra` (`mitra_id`),
  KEY `idx_training_event_category` (`event_category_id_string`),
  KEY `idx_training_disability` (`disability_id_string`),
  KEY `idx_proposal_status_aktif` (`status`,`is_aktif`),
  KEY `idx_proposal_koordinat` (`latitude`,`longitude`),
  CONSTRAINT `fk_proposal_mitra` FOREIGN KEY (`mitra_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `participants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `participant_id_string` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `training_proposal_id` bigint unsigned DEFAULT NULL,
  `event_id_string` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_lengkap` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_wa` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usia` int unsigned NOT NULL,
  `kategori_disabilitas` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kebutuhan_fasilitas` json NOT NULL,
  `catatan_khusus` text COLLATE utf8mb4_unicode_ci,
  `status_kehadiran` enum('terdaftar','hadir','batal') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'terdaftar',
  `link_sent` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `participant_id_string` (`participant_id_string`),
  KEY `idx_participants_event` (`event_id_string`),
  KEY `idx_participants_status` (`status_kehadiran`),
  KEY `fk_participant_proposal` (`training_proposal_id`),
  CONSTRAINT `fk_participant_proposal` FOREIGN KEY (`training_proposal_id`) REFERENCES `training_proposals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tpq_programs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `program_id_string` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mitra_id` bigint unsigned DEFAULT NULL,
  `mitra_id_string` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nama_program` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenis_tpq` enum('isyarat','braille') COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi_program` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tujuan_pembelajaran` text COLLATE utf8mb4_unicode_ci,
  `target_peserta` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kuota_peserta` int unsigned NOT NULL DEFAULT '0',
  `materi_pembelajaran` text COLLATE utf8mb4_unicode_ci,
  `metode_pembelajaran` text COLLATE utf8mb4_unicode_ci,
  `kebutuhan_fasilitas` text COLLATE utf8mb4_unicode_ci,
  `frekuensi_pertemuan` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `durasi_program` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `foto_dokumentasi` json DEFAULT NULL,
  `link_grup_wa` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hari_pertemuan` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jam_mulai` time DEFAULT NULL,
  `jam_selesai` time DEFAULT NULL,
  `tanggal_mulai` date DEFAULT NULL,
  `tanggal_selesai` date DEFAULT NULL,
  `batas_pendaftaran` date DEFAULT NULL,
  `benefit_program` text COLLATE utf8mb4_unicode_ci,
  `provinsi` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kota` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lokasi_dan_alamat` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `status` enum('menunggu_persetujuan','disetujui','ditolak') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'menunggu_persetujuan',
  `alasan_penolakan` text COLLATE utf8mb4_unicode_ci,
  `is_aktif` tinyint(1) NOT NULL DEFAULT '0',
  `izinkan_publikasi` tinyint(1) NOT NULL DEFAULT '0',
  `jumlah_pendaftar` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tpq_program_id` (`program_id_string`),
  KEY `idx_tpq_mitra` (`mitra_id_string`),
  KEY `idx_tpq_jenis` (`jenis_tpq`),
  KEY `idx_tpq_status` (`status`),
  KEY `idx_tpq_kota` (`kota`),
  KEY `idx_tpq_status_aktif` (`status`,`is_aktif`),
  KEY `idx_tpq_koordinat` (`latitude`,`longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tpq_registrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `registration_id_string` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `program_id_string` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_lengkap` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_wa` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usia` int unsigned NOT NULL,
  `kategori_disabilitas` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `catatan_khusus` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tpq_registration_id` (`registration_id_string`),
  KEY `idx_tpq_registration_program` (`program_id_string`),
  CONSTRAINT `fk_tpq_registration_program` FOREIGN KEY (`program_id_string`) REFERENCES `tpq_programs` (`program_id_string`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `log_id_string` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `user` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('success','info','warning','error') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  PRIMARY KEY (`id`),
  UNIQUE KEY `log_id_string` (`log_id_string`),
  KEY `idx_logs_timestamp` (`timestamp`),
  KEY `idx_logs_module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================================
-- 2. UPGRADE DATABASE LAMA: tambah kolom hanya jika belum ada
--    (menggantikan semua file ALTER TABLE; aman dijalankan ulang)
-- ==========================================================================

DROP PROCEDURE IF EXISTS `sp_add_column_if_missing`;
DELIMITER $$
CREATE PROCEDURE `sp_add_column_if_missing`(
  IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

-- training_proposals
CALL sp_add_column_if_missing('training_proposals', 'waktu_mulai',       'TIME NULL AFTER `tanggal_kegiatan`');
CALL sp_add_column_if_missing('training_proposals', 'waktu_selesai',     'TIME NULL AFTER `waktu_mulai`');
CALL sp_add_column_if_missing('training_proposals', 'foto_dokumentasi',  'LONGTEXT NULL AFTER `kebutuhan_peserta`');
CALL sp_add_column_if_missing('training_proposals', 'link_grup_wa',      'VARCHAR(255) NULL AFTER `link_pendaftaran`');

-- participants
CALL sp_add_column_if_missing('participants', 'link_sent', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `status_kehadiran`');

-- tpq_programs
CALL sp_add_column_if_missing('tpq_programs', 'durasi_program',     'VARCHAR(100) NULL AFTER `frekuensi_pertemuan`');
CALL sp_add_column_if_missing('tpq_programs', 'foto_dokumentasi',  'JSON NULL AFTER `durasi_program`');
CALL sp_add_column_if_missing('tpq_programs', 'link_grup_wa',      'VARCHAR(500) NULL AFTER `foto_dokumentasi`');
-- Data lama TIDAK ditayangkan otomatis; superadmin harus mengizinkan publikasi.
CALL sp_add_column_if_missing('tpq_programs', 'izinkan_publikasi', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_aktif`');

-- application_settings / quran_communities (untuk database yang lebih lama)
CALL sp_add_column_if_missing('application_settings', 'about_bg_image', 'LONGTEXT NULL AFTER `header_bg_image`');
CALL sp_add_column_if_missing('quran_communities',    'logo',           'LONGTEXT NULL AFTER `nama_lembaga`');

DROP PROCEDURE IF EXISTS `sp_add_column_if_missing`;

-- ==========================================================================
-- 3. DATA AWAL (INSERT IGNORE: tidak menimpa data yang sudah ada)
-- ==========================================================================

-- USERS. PENTING: nilai password di bawah hanyalah PENANDA (placeholder), bukan hash asli.
-- Saat server.ts dijalankan, ensureInitialPasswords() mengisinya dengan hash bcrypt dari
-- kata sandi awal 'password123'. WAJIB diganti sebelum website online.
INSERT IGNORE INTO `users`
(`user_id_string`, `name`, `email`, `password`, `role`, `organization_name`) VALUES
('usr_superadmin', 'Ustadz Ahmad Fauzi', 'admin@quran.id',   '$2b$10$REPLACE_WITH_YOUR_BCRYPT_HASH', 'superadmin', 'Kementerian Agama Republik Indonesia'),
('usr_mitra_1',    'Nurul Hidayah',      'mitra1@quran.id',  '$2b$10$REPLACE_WITH_YOUR_BCRYPT_HASH', 'mitra',      'Yayasan Sahabat Netra Mengaji'),
('usr_mitra_2',    'Budi Prasetyo',      'mitra2@quran.id',  '$2b$10$REPLACE_WITH_YOUR_BCRYPT_HASH', 'mitra',      'Komunitas Tuli Mengaji Nusantara');

-- MASTER DISABILITAS
INSERT IGNORE INTO `disabilities`
(`disability_id_string`, `kode`, `nama`, `kategori_utama`, `deskripsi`,
 `metode_pembelajaran`, `fasilitas_rekomendasi`, `warna_hex`, `icon`, `is_aktif`) VALUES
('dis_tunanetra', 'tunanetra', 'Tunanetra', 'Sensorik',
 'Peserta didik dengan hambatan penglihatan.',
 'Al-Quran Braille, audio, dan pendampingan membaca.',
 '["Al-Quran Braille","Audio Al-Quran","Pendamping"]', '#005a71', 'visibility', 1),
('dis_tunarungu', 'tunarungu', 'Tunarungu', 'Sensorik',
 'Peserta didik dengan hambatan pendengaran.',
 'Bahasa isyarat, visual, dan materi tertulis.',
 '["Penerjemah Bahasa Isyarat","Materi Visual","Materi Tertulis"]', '#2563eb', 'ear-off', 1),
('dis_tunadaksa', 'tunadaksa', 'Tunadaksa', 'Fisik',
 'Peserta didik dengan hambatan mobilitas atau gerak.',
 'Pembelajaran aksesibel dan penyesuaian posisi belajar.',
 '["Ruang Aksesibel","Ramp","Meja Kursi Adaptif"]', '#16a34a', 'accessibility', 1),
('dis_intelektual_autisme', 'intelektual_autisme', 'Intelektual / Autisme', 'Intelektual',
 'Peserta didik dengan kebutuhan dukungan intelektual atau spektrum autisme.',
 'Pembelajaran bertahap, terstruktur, berulang, dan visual.',
 '["Media Visual","Pendamping Khusus","Ruang Tenang"]', '#d97706', 'brain', 1);

-- KATEGORI EVENT (sama dengan data bawaan di backend/database/mockDb.ts)
INSERT IGNORE INTO `event_categories`
(`category_id_string`, `kode`, `nama`, `deskripsi`, `icon`, `warna_hex`, `is_aktif`, `urutan`) VALUES
('cat_teknologi',  'Teknologi',   'Teknologi & Digital',
 'Pelatihan adaptasi perangkat digital, screen reader, dan aplikasi Al-Quran cerdas.', 'devices',       '#0284c7', 1, 1),
('cat_tahfidz',    'Tahfidz',     'Tahfidz & Quran',
 'Program tahfidz dan tahsin Al-Quran Braille, Isyarat, serta stimulasi sensori.',     'menu_book',     '#16a34a', 1, 2),
('cat_vokasional', 'Vokasional',  'Kriya & Vokasional',
 'Keterampilan kemandirian santri, kriya mushaf, kaligrafi taktil, dan wirausaha.',    'handyman',      '#d97706', 1, 3),
('cat_bahasa',     'Bahasa',      'Bahasa & Isyarat',
 'Penguasaan bahasa isyarat Quran (BISINDO/SIBI) dan kaidah linguistik hijaiyah.',     'sign_language', '#9333ea', 1, 4),
('cat_umum',       'Orang Umum',  'Orang Umum / Publik',
 'Pelatihan terbuka untuk relawan, ustadz/ustadzah, dan masyarakat umum non-disabilitas.', 'groups',    '#475569', 1, 5);

-- KONFIGURASI APLIKASI
INSERT IGNORE INTO `application_settings`
(`setting_key`, `application_name`, `logo`, `favicon`, `topbar_color`, `primary_color`,
 `secondary_color`, `accent_color`, `public_role_label`, `institution_subtitle`,
 `logo_size`, `header_bg_overlay`, `logo_container_bg`, `updated_by`) VALUES
('global_config', 'Al-Quran Disabilitas', '/logo-quran.svg', '/favicon.svg', '#005a71', '#005a71',
 '#ab3425', '#d97706', 'Peserta', 'Kementerian Agama Republik Indonesia',
 'large', 'dark', 'white', 'Super Administrator');

SET FOREIGN_KEY_CHECKS = 1;

-- TABEL KUNJUNGAN WEBSITE (statistik 'Total Pengunjung' di landing page)
CREATE TABLE IF NOT EXISTS `site_visits` (
  `id`         bigint unsigned NOT NULL AUTO_INCREMENT,
  `visitor_id` varchar(64)  COLLATE utf8mb4_unicode_ci NOT NULL,
  `halaman`    varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sv_visitor` (`visitor_id`, `created_at`),
  KEY `idx_sv_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================================
-- 4. VERIFIKASI (jumlah baris tiap tabel)
-- ==========================================================================
SELECT 'users' AS tabel, COUNT(*) AS jumlah FROM `users`
UNION ALL SELECT 'disabilities',        COUNT(*) FROM `disabilities`
UNION ALL SELECT 'event_categories',    COUNT(*) FROM `event_categories`
UNION ALL SELECT 'quran_communities',   COUNT(*) FROM `quran_communities`
UNION ALL SELECT 'training_proposals',  COUNT(*) FROM `training_proposals`
UNION ALL SELECT 'participants',        COUNT(*) FROM `participants`
UNION ALL SELECT 'tpq_programs',        COUNT(*) FROM `tpq_programs`
UNION ALL SELECT 'application_settings',COUNT(*) FROM `application_settings`
UNION ALL SELECT 'system_logs',         COUNT(*) FROM `system_logs`
UNION ALL SELECT 'site_visits',         COUNT(*) FROM `site_visits`;
