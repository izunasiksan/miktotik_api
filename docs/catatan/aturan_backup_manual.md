# ATURAN MUTLAK BACKUP MANUAL (STRICT RULES)

**Status: STRICT MODE AKTIF**
**Lokasi: /docs/aturan_backup_manual.md**

---

## 1. KEAMANAN & ENKRIPSI (SECURITY)
1.  **DILARANG** menyimpan file backup dalam format teks terbuka (Plain SQL) di media penyimpanan publik (Cloud Storage tanpa enkripsi).
2.  **WAJIB** membungkus (Archive) file backup dengan enkripsi AES-256 menggunakan password yang kuat.
3.  **DILARANG** menyertakan password enkripsi backup di dalam file yang sama dengan file backup.

## 2. LOKASI PENYIMPANAN (STORAGE LOCATION)
1.  **DILARANG** hanya menyimpan backup di server yang sama dengan database (Single Point of Failure).
2.  **WAJIB** menerapkan prinsip **3-2-1**:
    *   **3** Salinan data (Asli, Backup 1, Backup 2).
    *   **2** Media berbeda (Disk lokal, Cloud/Flashdisk).
    *   **1** Salinan di lokasi luar (Offsite).

## 3. INTEGRITAS DATA (DATA INTEGRITY)
1.  **WAJIB** melakukan verifikasi hash (`SHA256`) segera setelah file backup dibuat.
2.  **DILARANG** menganggap backup berhasil tanpa melakukan pengecekan ukuran file (Zero-byte check).
3.  **WAJIB** melakukan uji restorasi (Restore Test) minimal 1 kali per bulan secara acak untuk memastikan file backup valid.

## 4. PENAMAAN FILE (NAMING CONVENTION)
1.  **WAJIB** mengikuti format: `backup_[DBNAME]_[YYYYMMDD]_[HHMM].sql`.
    *   Contoh: `backup_db_master_mikrotik_20260301_1000.sql`.
2.  **DILARANG** menggunakan spasi atau karakter khusus selain underscore (`_`) dan tanda hubung (`-`).

## 5. DOKUMENTASI & AUDIT (AUDIT TRAIL)
1.  **WAJIB** mencatat setiap aktivitas backup manual (Siapa, Kapan, Apa alasannya).
2.  **DILARANG** menghapus file backup lama sebelum memastikan file backup baru telah terverifikasi dan tersimpan di lokasi offsite.

## 6. PENANGANAN KUNCI (.env)
1.  **DILARANG** kehilangan file `.env` (berisi kunci AES dan JWT).
2.  **WAJIB** menyimpan salinan `.env` secara terpisah dari file database backup untuk menghindari kebocoran kunci enkripsi secara massal.

---
**Sanksi:** Pelanggaran terhadap aturan ini dapat mengakibatkan kegagalan pemulihan sistem dan kehilangan data yang bersifat KRITIS.

**Dokumen Terkait:**
*   [Alur Kerja Backup Manual](file:///e:/mikrotik_api/docs/alur_backup_manual.md)
*   [Panduan Backup Manual](file:///e:/mikrotik_api/docs/backup_restore/Manual_Backup_Guide.md)
