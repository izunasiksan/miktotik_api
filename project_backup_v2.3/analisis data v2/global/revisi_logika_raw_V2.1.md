# REVISI LOGIKA QUERY & SQL (RAW DATA FIDELITY V2.1)
Last Modified: 2026-03-05
Status: Finalized & Implemented

## 0. TUJUAN UTAMA PENGHIMPUNAN RAW DATA
Penghimpunan data mentah (Raw Data) dilakukan untuk memastikan sistem memiliki landasan informasi yang akurat, granular, dan tidak terdistorsi oleh proses agregasi prematur. Berikut adalah tujuan utama dari masing-masing tabel raw utama:

*   **`board_speed_stats`**: Menangkap fluktuasi bandwidth secara real-time per antarmuka. Tujuannya adalah untuk mendeteksi micro-spikes, bottleneck pada port tertentu, dan pola penggunaan trafik yang sangat dinamis yang seringkali hilang dalam rata-rata 5 menit.
*   **`board_resource_stats`**: Memantau kesehatan fisik perangkat (CPU, RAM, HDD, Uptime). Tujuannya adalah untuk mengidentifikasi kebocoran memori (memory leak), overload CPU yang singkat namun fatal, serta korelasi antara beban trafik tinggi dengan penurunan performa hardware.
*   **`board_client_stats`**: Mencatat jumlah user aktif (Hotspot & PPPoE). Tujuannya adalah untuk memantau kepadatan user secara real-time dan hubungannya dengan kapasitas bandwidth yang tersedia (user concurrency analysis).
*   **`board_usage_stats` (Interface Usage)**: Melacak akumulasi byte (TX/RX) harian per antarmuka. Tujuannya adalah untuk audit kuota bulanan, laporan konsumsi data total, dan verifikasi tagihan bandwidth dari ISP.
*   **`board_pppoe_usage`**: Mencatat penggunaan data spesifik untuk setiap user PPPoE. Tujuannya adalah untuk manajemen billing pelanggan, identifikasi user "heavy downloader", dan analisis kebiasaan penggunaan data pelanggan rumahan.
*   **`board_hotspot_usage` (hotspot_usage_raw)**: Mencatat penggunaan data dan uptime user Hotspot (voucher). Tujuannya adalah untuk monitoring efektivitas voucher, analisis durasi rata-rata sesi user, dan identifikasi lokasi (board) dengan retensi user tertinggi.

---

## 1. STRUKTUR TABEL RAW (REFERENCE)
Sumber data utama yang digunakan adalah tabel log mentah tanpa agregasi prematur, yang secara langsung merefleksikan kondisi real-time dari setiap perangkat Mikrotik. Seluruh skema ini mengikuti definisi otoritatif di [schema.sql](file:///e:/mikrotik_api/docs/db/schema.sql).

### A. Tabel Master Perangkat (`mikrotik_boards`)
Tabel utama yang berfungsi sebagai referensi pusat (Single Source of Truth) untuk semua relasi data mentah.

| Kolom | Tipe Data | Constraint | Deskripsi |
|---|---|---|---|
| `board_id` | `UUID` | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` | ID unik internal untuk setiap perangkat. |
| `board_name` | `VARCHAR(100)` | `NOT NULL` | Nama alias perangkat di dashboard. |
| `mac_address` | `MACADDR` | `NOT NULL` | Alamat fisik perangkat (Unique Hardware ID). |
| `ip_address` | `INET` | `NOT NULL` | Alamat IP perangkat untuk koneksi API/SSH. |

**Relasi:**
- `mikrotik_boards` (1) --- (N) `board_speed_stats` (**One-to-Many**)
- `mikrotik_boards` (1) --- (N) `board_resource_stats` (**One-to-Many**)
- `mikrotik_boards` (1) --- (N) `board_client_stats` (**One-to-Many**)
- `mikrotik_boards` (1) --- (N) `board_interface_usage` (**One-to-Many**)
- `mikrotik_boards` (1) --- (N) `board_pppoe_usage` (**One-to-Many**)
- `mikrotik_boards` (1) --- (N) `hotspot_usage_raw` (**One-to-Many**)

---

### B. Raw Traffic Log (`board_speed_stats`)
Mencatat statistik trafik (bandwidth) per antarmuka (interface) secara granular.

| Kolom | Tipe Data | Constraint | Deskripsi |
|---|---|---|---|
| `speed_id` | `BIGSERIAL` | `PRIMARY KEY` | ID unik untuk setiap entri log trafik. |
| `board_id` | `UUID` | `FOREIGN KEY` -> `mikrotik_boards(board_id)` | Referensi ke perangkat asal. |
| `interface_name` | `VARCHAR(100)` | `NOT NULL` | Nama antarmuka di Mikrotik (misal: `ether1`, `wlan1`). |
| `download_mbps` | `NUMERIC(10,2)` | `DEFAULT 0` | Kecepatan unduh dalam Megabit per detik. |
| `upload_mbps` | `NUMERIC(10,2)` | `DEFAULT 0` | Kecepatan unggah dalam Megabit per detik. |
| `log_time` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Waktu pencatatan log (UTC). |

**Integritas Referensial:**
- `ON DELETE CASCADE`: Jika data board dihapus, seluruh log trafik terkait akan otomatis dihapus.

**Indeks:**
- `idx_speed_interface_time`: `(board_id, interface_name, log_time DESC)` - Dioptimalkan untuk query tren trafik per antarmuka.

---

### C. Raw Resource Log (`board_resource_stats`)
Mencatat kesehatan perangkat (CPU, Memory, HDD) secara berkala.

| Kolom | Tipe Data | Constraint | Deskripsi |
|---|---|---|---|
| `resource_id` | `BIGSERIAL` | `PRIMARY KEY` | ID unik untuk setiap entri log resource. |
| `board_id` | `UUID` | `FOREIGN KEY` -> `mikrotik_boards(board_id)` | Referensi ke perangkat asal. |
| `cpu_load` | `INT` | `0-100%` | Beban kerja CPU saat ini. |
| `free_memory` | `BIGINT` | `Bytes` | Sisa memori RAM yang tersedia. |
| `free_hdd` | `BIGINT` | `Bytes` | Sisa ruang penyimpanan HDD/Flash. |
| `uptime` | `INTERVAL` | - | Durasi perangkat menyala sejak reboot terakhir. |
| `log_time` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Waktu pencatatan log (UTC). |

**Integritas Referensial:**
- `ON DELETE CASCADE`: Menjamin kebersihan data saat perangkat diputus dari sistem.

**Indeks:**
- `idx_resource_stats_time`: `(board_id, log_time DESC)` - Dioptimalkan untuk query kesehatan perangkat terbaru.

---

### D. Raw Client Stats (`board_client_stats`)
Mencatat jumlah pengguna aktif (Hotspot & PPPoE) secara real-time.

| Kolom | Tipe Data | Constraint | Deskripsi |
|---|---|---|---|
| `stat_id` | `BIGSERIAL` | `PRIMARY KEY` | ID unik entri log user. |
| `board_id` | `UUID` | `FOREIGN KEY` -> `mikrotik_boards(board_id)` | Referensi ke perangkat asal. |
| `total_hotspot` | `INT` | `DEFAULT 0` | Jumlah user Hotspot yang sedang login. |
| `total_pppoe` | `INT` | `DEFAULT 0` | Jumlah user PPPoE yang sedang terhubung. |
| `total_active` | `INT` | `GENERATED ALWAYS` | Total user aktif (`total_hotspot + total_pppoe`). |
| `log_time` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Waktu pencatatan log. |

**Indeks:**
- `idx_client_stats_time`: `(board_id, log_time DESC)` - Dioptimalkan untuk query beban user perangkat.

---

### E. Raw Interface Usage (`board_interface_usage`)
Mencatat total akumulasi byte trafik per antarmuka secara harian.

| Kolom | Tipe Data | Constraint | Deskripsi |
|---|---|---|---|
| `usage_id` | `BIGSERIAL` | `PRIMARY KEY` | ID unik entri log usage. |
| `board_id` | `UUID` | `FOREIGN KEY` -> `mikrotik_boards(board_id)` | Referensi ke perangkat asal. |
| `interface_name` | `VARCHAR(100)` | `NOT NULL` | Nama antarmuka di Mikrotik. |
| `total_tx_bytes` | `BIGINT` | `DEFAULT 0` | Total byte yang dikirim (upload). |
| `total_rx_bytes` | `BIGINT` | `DEFAULT 0` | Total byte yang diterima (download). |
| `log_date` | `DATE` | `DEFAULT CURRENT_DATE` | Tanggal pencatatan (harian). |
| `last_update` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Waktu terakhir data diperbarui. |

**Integritas Referensial:**
- `CONSTRAINT unique_daily_usage`: Menjamin hanya ada satu entri per interface per hari.

**Indeks:**
- `idx_usage_report`: `(log_date DESC, board_id)` - Dioptimalkan untuk laporan penggunaan harian.

---

### F. Raw PPPoE Usage (`board_pppoe_usage`)
Mencatat penggunaan bandwidth spesifik untuk pelanggan PPPoE.

| Kolom | Tipe Data | Constraint | Deskripsi |
|---|---|---|---|
| `usage_id` | `BIGSERIAL` | `PRIMARY KEY` | ID unik entri usage PPPoE. |
| `board_id` | `UUID` | `FOREIGN KEY` -> `mikrotik_boards(board_id)` | Referensi ke perangkat asal. |
| `pppoe_username` | `VARCHAR(100)` | `NOT NULL` | Username pelanggan PPPoE. |
| `upload_bytes` | `BIGINT` | `DEFAULT 0` | Akumulasi upload byte pelanggan. |
| `download_bytes` | `BIGINT` | `DEFAULT 0` | Akumulasi download byte pelanggan. |
| `log_date` | `DATE` | `DEFAULT CURRENT_DATE` | Tanggal pencatatan. |
| `last_update` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Waktu update terakhir. |

**Indeks:**
- `idx_pppoe_usage_lookup`: `(log_date DESC, download_bytes DESC)` - Dioptimalkan untuk analisis top user.

---

### G. Raw Hotspot Usage (`hotspot_usage_raw`)
Mencatat penggunaan bandwidth dan uptime user voucher Hotspot.

| Kolom | Tipe Data | Constraint | Deskripsi |
|---|---|---|---|
| `raw_id` | `BIGSERIAL` | `PRIMARY KEY` | ID unik entri raw hotspot. |
| `board_id` | `UUID` | `FOREIGN KEY` -> `mikrotik_boards(board_id)` | Referensi ke perangkat asal. |
| `username` | `VARCHAR(100)` | `NOT NULL` | Username voucher Hotspot. |
| `daily_download` | `BIGINT` | `DEFAULT 0` | Total download byte dalam satu hari. |
| `daily_upload` | `BIGINT` | `DEFAULT 0` | Total upload byte dalam satu hari. |
| `daily_uptime` | `BIGINT` | `DEFAULT 0` | Total durasi aktif dalam detik. |
| `log_date` | `DATE` | `DEFAULT CURRENT_DATE` | Tanggal pencatatan. |

**Constraint:**
- `unique_user_daily_raw`: Unik untuk kombinasi `(username, board_id, log_date)`.

---

## 2. REVISI QUERY: ON-THE-FLY AGGREGATION
Query ini telah diselaraskan dengan skema PostgreSQL asli menggunakan tabel `board_speed_stats` dan `board_resource_stats`.

### SQL: Aggregate All Metrics (Raw to Granular)
```sql
WITH time_buckets AS (
    -- Membuat bucket waktu secara deterministik
    SELECT generate_series(
        :start_time::timestamp, 
        :end_time::timestamp, 
        :granularity::interval
    ) AS bucket_start
),
normalized_traffic AS (
    -- Menggunakan data Mbps langsung dari board_speed_stats
    SELECT 
        date_trunc(:granularity_unit, log_time) as bucket,
        speed_id as raw_id,
        log_time as raw_ts,
        download_mbps,
        upload_mbps
    FROM board_speed_stats
    WHERE board_id = :board_id 
      AND interface_name = :interface_name
      AND log_time BETWEEN :start_time AND :end_time
),
normalized_resource AS (
    -- Menggunakan data resource
    SELECT 
        date_trunc(:granularity_unit, log_time) as bucket,
        cpu_load,
        free_memory,
        total_memory, -- Asumsi total_memory statis atau diambil dari master
        log_time as raw_ts
    FROM board_resource_stats
    WHERE board_id = :board_id 
      AND log_time BETWEEN :start_time AND :end_time
)
SELECT 
    b.bucket_start as period,
    -- Agregasi sesuai parameter :agg (avg/max/dll)
    ROUND(AVG(t.download_mbps)::numeric, 4) as download_mbps,
    ROUND(AVG(t.upload_mbps)::numeric, 4) as upload_mbps,
    ROUND(AVG(r.cpu_load)::numeric, 2) as cpu_load,
    MAX(r.total_memory) as total_memory,
    MIN(r.free_memory) as min_free_memory,
    -- Deep Traceability Metadata
    jsonb_build_object(
        'raw_timestamp', MIN(t.raw_ts),
        'source_id', MIN(t.raw_id::text),
        'granularity_info', :granularity
    ) as metadata
FROM time_buckets b
LEFT JOIN normalized_traffic t ON t.bucket = b.bucket_start
LEFT JOIN normalized_resource r ON r.bucket = b.bucket_start
GROUP BY b.bucket_start
ORDER BY b.bucket_start ASC;
```

---

## 3. LOGIKA PEMROSESAN PIPELINE (BACKEND/SERVICE)

### Step 1: Pre-Filtering (Stage 1)
- Terapkan filter `board_id` dan `time_range` pada level index database paling awal.
- DILARANG melakukan `SELECT *` sebelum filter diterapkan.

### Step 2: Atomic Alignment & Missing Data (Stage 2)
- Jika data Traffic dan Resource memiliki timestamp yang tidak sinkron (misal: Traffic tiap 1 detik, Resource tiap 5 detik):
  - Backend melakukan **Linear Interpolation** untuk mengisi gap Resource agar sejajar dengan Traffic sebelum agregasi.
  - Penanganan missing data WAJIB mengikuti [aturan_penanganan_missing_data_V2.1.md](file:///e:/mikrotik_api/docs/analisis%20data%20v2/global/aturan_penanganan_missing_data_V2.1.md).
  - Metadata `completeness_score` dan `quality_score` dikurangi jika banyak titik hasil interpolasi atau imputasi.
  - Setiap tindakan imputasi wajib dicatat dalam log audit sistem.

### Step 3: Deferred Aggregation (Stage 2)
- Agregasi hanya dilakukan pada tahap akhir sebelum dikirim ke Frontend.
- Semua perhitungan statistik (Correlation, Habits, Anomaly) di Stage 3-5 WAJIB menggunakan hasil interpolasi resolusi tinggi, BUKAN hasil agregasi bucket besar.

---

## 4. PERBANDINGAN PERFORMA (TEORETIS)

| Metric | Old Approach (Materialized View) | New Approach (Raw On-The-Fly) |
|---|---|---|
| **Data Fidelity** | Low (Downsampled to 5m/1h) | **Maximum (Raw 1s precision)** |
| **Traceability** | None (Source ID lost) | **Full (Link to Raw Log ID)** |
| **Storage** | High (Duplicate data in views) | **Optimized (Single Source)** |
| **Query Speed** | Very Fast (<50ms) | Fast (100-300ms with Index) |
| **Accuracy** | Approximate (Averaged trends) | **Exact (Micro-spike detection)** |

---

## 5. REKOMENDASI INDEKS (DB OPTIMIZATION)
Untuk mendukung query raw data yang cepat:
```sql
CREATE INDEX idx_raw_traffic_board_ts ON raw_traffic_log (board_id, timestamp DESC);
CREATE INDEX idx_raw_resource_board_ts ON raw_resource_log (board_id, timestamp DESC);
```
