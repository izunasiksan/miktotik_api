# PANDUAN BACKUP MANUAL: API MIKROTIK SYSTEM

| Versi | Tanggal | Deskripsi | Penulis | Status |
| :--- | :--- | :--- | :--- | :--- |
| 1.0 | 2026-03-01 | Panduan Backup Manual | AI Assistant | DRAFT |

---

## 1. PENDAHULUAN
Panduan ini ditujukan bagi Administrator Sistem untuk melakukan backup secara manual di luar jadwal otomatis, terutama sebelum melakukan pembaruan sistem (update), migrasi, atau maintenance besar.

## 2. KOMPONEN YANG WAJIB DIBACKUP
Untuk memastikan sistem dapat dipulihkan sepenuhnya, komponen berikut wajib diamankan:
1.  **Database PostgreSQL:** Seluruh data router, user, dan log.
2.  **Environment Configuration (`.env`):** Kunci enkripsi (AES, JWT) dan kredensial database.
3.  **Media & Logs:** Jika terdapat file ekspor atau log audit penting.

---

## 3. PROSEDUR BACKUP DATABASE (PostgreSQL)

### 3.1 Menggunakan `pg_dump` (Direkomendasikan)
Jalankan perintah berikut di terminal (pastikan PostgreSQL tools terinstal):

```bash
# Format: pg_dump -h [HOST] -U [USER] -d [DB_NAME] > [FILENAME].sql
pg_dump -h localhost -U postgres -d db_master_mikrotik > backup_manual_$(date +%Y%m%d_%H%M).sql
```

### 3.2 Menggunakan Docker (Jika menggunakan Docker Compose)
Jika database berjalan di dalam container (Service: `db`):

```bash
# Backup dari container 'db'
docker-compose exec -t db pg_dump -U postgres db_master_mikrotik > full_backup_$(date +%Y%m%d).sql
```

---

## 4. BACKUP KONFIGURASI & KUNCI KRITIS
File `.env` di root direktori mengandung kunci enkripsi untuk password Mikrotik. **KEHILANGAN FILE INI BERARTI KEHILANGAN AKSES KE PASSWORD ROUTER YANG TERSIMPAN.**

### 4.1 Langkah Backup:
1.  Salin file `.env` ke lokasi aman.
2.  Gunakan kompresi terenkripsi (opsional):
    ```bash
    # Menggunakan zip dengan password
    zip --encrypt config_backup_$(date +%Y%m%d).zip .env
    ```

---

## 5. PROSEDUR RESTORE (PEMULIHAN) MANUAL

### 5.1 Restore ke Database Lokal
```bash
# 1. Hapus DB lama (Opsional/Hati-hati!)
# dropdb -h localhost -U postgres db_master_mikrotik
# 2. Buat DB baru
# createdb -h localhost -U postgres db_master_mikrotik
# 3. Restore dari file .sql
psql -h localhost -U postgres -d db_master_mikrotik < backup_manual_20260301_1000.sql
```

### 5.2 Restore via Docker
```bash
# Salin file sql ke container atau pipe langsung
cat backup_manual.sql | docker-compose exec -T db psql -U postgres -d db_master_mikrotik
```

---

## 6. PROSEDUR VERIFIKASI (WAJIB)
Setelah backup selesai, lakukan pengecekan berikut:
1.  **Ukuran File:** Pastikan file `.sql` tidak berukuran 0 KB.
2.  **Integrasi Hash:** Buat checksum untuk memastikan file tidak korup saat dipindahkan.
    ```bash
    sha256sum backup_manual_20260301.sql > backup_manual_20260301.sql.sha256
    ```
3.  **Spot Check:** Buka file `.sql` menggunakan text editor dan pastikan terdapat struktur tabel (CREATE TABLE) dan data (INSERT INTO).

---

## 6. PENYIMPANAN AMAN
*   **DILARANG** menyimpan file backup hanya di server yang sama.
*   **WAJIB** memindahkan salinan backup ke media eksternal (Flashdisk/External HDD) atau Cloud Storage terenkripsi segera setelah proses selesai.

---
*Dokumen ini merupakan bagian dari standar operasional prosedur keamanan data.*

**Dokumen Terkait:**
*   [Alur Kerja Backup Manual](file:///e:/mikrotik_api/docs/alur_backup_manual.md)
*   [Aturan Mutlak Backup Manual](file:///e:/mikrotik_api/docs/aturan_backup_manual.md)
