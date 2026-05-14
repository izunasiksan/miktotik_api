# Alur Kerja Monitoring Historis

Dokumen ini menjelaskan alur kerja sistem monitoring historis yang mengumpulkan, menyimpan, dan menyajikan data statistik dari router Mikrotik secara berkala.

## 1. Definisi & Tujuan
Monitoring Historis bertujuan untuk merekam kinerja perangkat dari waktu ke waktu guna keperluan audit, analisis tren, dan pemecahan masalah jangka panjang. Data ini **TIDAK** diambil secara real-time saat user membuka dashboard, melainkan diambil oleh *background worker* dan disimpan di database.

## 2. Komponen Terlibat
1.  **Polling Worker (`polling_worker.py`)**: Layanan latar belakang yang berjalan terus-menerus.
2.  **Database PostgreSQL**: Tempat penyimpanan data permanen (`mikrotik_api` DB).
3.  **Tabel Terkait**:
    -   `board_resource_stats` (CPU, Memory, HDD, Uptime)
    -   `board_interface_usages` (Traffic In/Out per Interface)
    -   `board_pppoe_usages` (Jumlah user aktif)
    -   `board_hotspot_usages` (Jumlah user aktif)
4.  **API Backend**: Menyajikan data tersimpan via endpoint statistik.
5.  **Frontend**: Menampilkan grafik dan ringkasan status terakhir.

## 3. Alur Kerja (Workflow)

### A. Pengumpulan Data (Data Ingestion)
1.  **Inisiasi**: Worker bangun setiap interval tertentu (default: 60 detik).
2.  **Seleksi Target**: Worker mengambil daftar router yang aktif (`is_monitor=True` dan `is_maintenance=False`).
3.  **Koneksi**: Worker membuka koneksi API ke setiap router secara asynchronous.
4.  **Fetching**: Worker mengambil data:
    -   `/system/resource/print`
    -   `/interface/print` (byte counters)
    -   `/ppp/active/print count-only`
    -   `/ip/hotspot/active/print count-only`
5.  **Parsing & Validasi**: Data mentah divalidasi dan dikonversi ke tipe data yang sesuai.

### B. Penyimpanan Data (Storage)
1.  **Insert**: Data baru dimasukkan ke tabel statistik masing-masing dengan timestamp saat pengambilan (`log_time`).
2.  **Update State**: Status terakhir router di tabel `mikrotik_boards` diperbarui (misal: `last_seen`, `is_online`).
3.  **Alerting**: Jika data melebihi ambang batas (threshold), sistem memicu notifikasi (misal: CPU > 90%).

### C. Penyajian Data (Consumption)
1.  **Request**: Frontend meminta data statistik via API (misal: `GET /boards/{id}/stats/`).
2.  **Query**: Backend melakukan query `SELECT` ke database dengan batasan limit (misal: `LIMIT 10`) atau range waktu.
3.  **Response**: Data dikirim ke frontend dalam format JSON.
4.  **Display**: Frontend merender grafik atau widget statistik.

## 4. Tab & Fitur Terkait
Fitur berikut di Dashboard menggunakan data Monitoring Historis:
*   **Overview Tab**: Grafik CPU, Memory, HDD.
*   **Logs Tab**: Riwayat log sistem router yang tersimpan.
*   **Reports Page**: Laporan bulanan/mingguan penggunaan bandwidth.
*   **Device List Status**: Status Online/Offline di daftar perangkat (berdasarkan `last_ping` dari worker).

## 5. Retensi Data
*   Data detail disimpan selama 30 hari (dapat dikonfigurasi).
*   Data agregasi (rata-rata per jam/hari) disimpan untuk jangka waktu lebih lama (misal: 1 tahun).
*   Mekanisme pembersihan (`cleanup_job`) berjalan setiap malam untuk menghapus data usang.
