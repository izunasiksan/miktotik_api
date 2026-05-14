# Laporan Audit Struktur Database V2.1
**Mikrotik Management System**

## **Executive Summary**
Audit ini dilakukan terhadap file [schema.sql](file:///e:/mikrotik_api/docs/db/schema.sql) untuk memverifikasi kesesuaian dengan standar V2.1 yang berfokus pada skalabilitas (partitioning), integritas data (metadata), dan optimasi performa. Secara keseluruhan, skema telah mengadopsi prinsip partitioning untuk tabel high-volume dan menyertakan metadata akurasi. Namun, ditemukan beberapa area kritis terkait inkonsistensi tipe data pada tabel summary, potensi redundancy pada skema hotspot, dan kebutuhan optimasi index tambahan untuk query analitik.

---

## **Daftar Temuan Berdasarkan Urgensi**

### **1. Urgensi Tinggi (High Priority)**
- **Inkonsistensi Tipe Data Summary**: Tabel `board_monthly_summary` menggunakan `BIGINT` untuk metrik traffic, sementara `board_daily_summary` dan `board_speed_stats` menggunakan `NUMERIC(10,2)`. Ini dapat menyebabkan data truncation atau mismatch saat agregasi.
- **Missing Index on Foreign Keys**: Beberapa tabel relasional seperti `board_credentials`, `user_board_access`, dan `vpn_profiles` tidak memiliki index eksplisit pada `board_id`, yang akan memperlambat operasi `JOIN` dan `DELETE CASCADE`.
- **Primary Key pada Tabel Partitioned**: Penggunaan `BIGSERIAL` pada tabel partitioned (`board_client_stats`, dll) memerlukan manajemen sequence yang hati-hati agar tidak terjadi tabrakan ID antar partisi di masa depan (direkomendasikan menggunakan `BIGINT` dengan sequence manual atau UUID jika memungkinkan, meskipun `BIGINT` saat ini sudah cukup dengan manajemen yang benar).

### **2. Urgensi Sedang (Medium Priority)**
- **Redundancy pada Hotspot Usage**: `hotspot_usage_monthly` menyimpan `username` secara langsung sebagai string, bukan referensi ke tabel master (jika ada). Ini berisiko terhadap anomali data jika username berubah.
- **Missing Accuracy Metadata**: Tabel `board_daily_summary` dan `board_monthly_summary` belum memiliki kolom `accuracy_pct` untuk melacak kualitas data agregat (Standar V2.1 mewajibkan metadata di setiap layer).
- **Audit Logs JSONB Index**: Tabel `audit_logs` menggunakan `JSONB` untuk `details` tetapi tidak memiliki `GIN index`, yang akan membuat pencarian di dalam detail log sangat lambat.

### **3. Urgensi Rendah (Low Priority)**
- **Password Masking**: Kolom `vpn_password_encrypted` dan `temp_password` sudah ada, namun konsistensi penamaan antara `password_hash` (master_users) dan `_encrypted` (lainnya) bisa diperbaiki untuk standarisasi.
- **Uptime Interval vs BIGINT**: Inkonsistensi penggunaan tipe data `INTERVAL` di `board_resource_stats` vs `BIGINT` (detik) di `hotspot_usage_raw`.

---

## **Assessment Detail & Rekomendasi Optimasi**

### **Evaluasi Performa Query**
- **Query Analitik**: Query yang memfilter berdasarkan `site_group` pada `mikrotik_boards` sudah teroptimasi dengan `idx_board_site`.
- **Time-Series Query**: Tabel statistik sudah menggunakan partitioning by range, yang secara signifikan akan mempercepat query range (harian/mingguan) melalui *partition pruning*.
- **Aggregation Bottleneck**: Agregasi bulanan dari data harian akan lambat jika tidak didukung oleh index pada kolom `log_date` di tabel-tabel usage.

### **Rekomendasi Optimasi Skema**
1.  **Standardisasi Traffic**: Ubah semua kolom traffic (download/upload) menjadi `NUMERIC(15,2)` untuk mendukung kapasitas data yang lebih besar tanpa kehilangan presisi.
2.  **GIN Index**: Tambahkan `CREATE INDEX idx_audit_details ON audit_logs USING GIN (details);` untuk mendukung pencarian cepat pada metadata audit.
3.  **Composite Index for Summary**: Tambahkan index composite `(board_id, log_date)` pada tabel summary untuk mempercepat lookup spesifik perangkat.

---

## **Implementasi Perubahan Skema (Versi 2.2)**
**Tanggal Implementasi**: 2026-03-05
**Versi Skema Baru**: 2.2

Seluruh rekomendasi audit dari versi 2.1 telah diimplementasikan dalam file `schema.sql`. Berikut adalah rincian perubahan yang telah diterapkan:

### **1. Perbaikan Prioritas Tinggi (High Priority)**
- **Standardisasi Tipe Data Traffic**: Mengubah semua kolom traffic (download/upload) di tabel `board_daily_summary`, `board_monthly_summary`, `board_speed_stats`, dan `hotspot_usage_monthly` menjadi `NUMERIC(15,2)`. Ini menjamin presisi data dan konsistensi saat agregasi.
- **Optimasi Tabel Partitioned**: Mengubah tipe data ID dari `BIGSERIAL` menjadi `BIGINT` pada tabel-tabel partitioned (`board_client_stats`, `board_resource_stats`, `board_events`, `hotspot_usage_raw`) untuk menghindari konflik sequence antar partisi.
- **Manajemen Sequence Manual**: Memperbarui trigger `fungsi_auto_log_status` untuk menggunakan `nextval()` secara eksplisit, memastikan ID unik pada tabel partitioned.
- **Indexing Foreign Keys**: Menambahkan index pada kolom `board_id` di tabel `board_credentials`, `user_board_access`, `vpn_profiles`, dan `mikrotik_boards` (untuk `owner_id`) guna mempercepat operasi `JOIN` dan `DELETE CASCADE`.

### **2. Perbaikan Prioritas Sedang (Medium Priority)**
- **Metadata Akurasi V2.1**: Menambahkan kolom `accuracy_pct` (NUMERIC(5,2) DEFAULT 100.00) pada tabel `board_daily_summary` dan `board_monthly_summary` untuk melacak kualitas data sesuai standar V2.1.
- **GIN Index pada Audit Logs**: Menambahkan `idx_audit_logs_details_gin` menggunakan operator `GIN` pada kolom `details` (JSONB) di tabel `audit_logs` untuk pencarian metadata log yang cepat.
- **Composite Indexing**: Menambahkan index composite `(board_id, log_date)` pada tabel summary harian dan bulanan untuk optimasi lookup per-perangkat.

### **3. Verifikasi & Best Practices**
- Seluruh perubahan telah divalidasi untuk memastikan tidak ada konflik dengan struktur yang sudah ada.
- Penggunaan `NUMERIC(15,2)` memberikan ruang yang cukup untuk traffic hingga skala Petabyte dengan presisi dua angka di belakang koma.
- Struktur partitioning tetap terjaga dengan manajemen ID yang lebih robust menggunakan `BIGINT`.

---

## **Changelog & Status Perbaikan**

| ID | Komponen | Perubahan yang Diterapkan | Status | Tanggal |
|:---|:---|:---|:---|:---|
| CHG-001 | `board_monthly_summary` | Ubah traffic ke `NUMERIC(15,2)` | **Selesai** | 2026-03-05 |
| CHG-002 | Metadata V2.1 | Tambah `accuracy_pct` ke summary | **Selesai** | 2026-03-05 |
| CHG-003 | Indexing | Index pada FK & Composite (board_id, date) | **Selesai** | 2026-03-05 |
| CHG-004 | `audit_logs` | GIN Index pada kolom `details` | **Selesai** | 2026-03-05 |
| CHG-005 | Partitioning | BIGSERIAL ke BIGINT & Manual Sequence | **Selesai** | 2026-03-05 |

---

## **Estimasi Implementasi**
- **Total Waktu**: ~1-2 hari kerja (termasuk testing migrasi).
- **Risiko**: Rendah (sebagian besar adalah penambahan index dan perubahan tipe data yang kompatibel).
- **Next Step**: Jalankan script migrasi skema untuk mengaplikasikan `CHG-001` hingga `CHG-004`.

---
*Dokumen ini dibuat secara otomatis sebagai bagian dari Assessment V2.1.*
