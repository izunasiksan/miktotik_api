# ALUR KERJA BACKUP MANUAL (WORKFLOW)

**Status: AKTIF**
**Lokasi: /docs/alur_backup_manual.md**

---

## 1. TAHAP PERSIAPAN (PREPARATION)
1.  **Cek Konektivitas:** Pastikan koneksi ke database PostgreSQL dan storage tujuan dalam kondisi stabil.
2.  **Cek Kapasitas:** Pastikan media penyimpanan (Flashdisk/Cloud/Server Backup) memiliki ruang yang cukup (minimal 2x ukuran database saat ini).
3.  **Identifikasi Versi:** Catat versi aplikasi saat ini sebelum melakukan backup.

## 2. TAHAP EKSEKUSI (EXECUTION)
1.  **Backup Database:**
    *   Gunakan perintah `pg_dump` untuk melakukan export database ke file `.sql`.
    *   Berikan nama file sesuai standar: `backup_[DBNAME]_[YYYYMMDD]_[HHMM].sql`.
2.  **Backup Konfigurasi (.env):**
    *   Salin file `.env` dari root direktori.
    *   **PENTING:** Jangan mengubah isi file `.env` selama proses penyalinan.

## 3. TAHAP VERIFIKASI (VERIFICATION)
1.  **Integritas File:**
    *   Cek ukuran file backup (tidak boleh 0 KB).
    *   Lakukan `sha256sum` untuk menghasilkan sidik jari digital (checksum).
2.  **Uji Coba (Sampling):**
    *   Jika memungkinkan, lakukan restore ke database staging untuk memastikan data dapat dibaca.

## 4. TAHAP PENYIMPANAN (STORAGE & OFFSITE)
1.  **Enkripsi:** Bungkus file `.sql` dan `.env` ke dalam archive terenkripsi (ZIP/7z dengan password).
2.  **Transfer:** Pindahkan file ke media penyimpanan luar (Flashdisk atau Cloud Storage).
3.  **Pembersihan:** Hapus file backup sementara yang ada di server utama untuk menghemat ruang.

## 5. TAHAP PELAPORAN (REPORTING)
1.  **Update Log:** Catat aktivitas backup ke dalam [logchat_YYYYMMDD-HHMM.md](file:///e:/mikrotik_api/docs/logchat/) atau buku log manual.
2.  **Informasi:** Beritahukan tim terkait jika backup dilakukan untuk keperluan maintenance besar.

---
*Alur ini wajib diikuti untuk setiap proses backup di luar jadwal otomatis.*

**Dokumen Terkait:**
*   [Aturan Mutlak Backup Manual](file:///e:/mikrotik_api/docs/aturan_backup_manual.md)
*   [Panduan Backup Manual](file:///e:/mikrotik_api/docs/backup_restore/Manual_Backup_Guide.md)
